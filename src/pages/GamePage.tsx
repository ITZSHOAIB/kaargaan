import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Copy } from "lucide-react";
import {
  beginVoting,
  createGame,
  currentRound,
  nextRound,
  recordVote,
  reveal,
  skip,
  standings,
  voteOrder
} from "../lib/gameEngine";
import { clearCurrentGame, currentGameKey, loadCurrentGameState, saveCurrentGame } from "../lib/gamePersistence";
import QRCode from "qrcode";
import { createRoomInvite, encodeRoomInvite, ENCRYPTED_SLIP_PREFIX, importEncryptedSongSlip, importSongSlip } from "../lib/songSlip";
import { normalizeYouTubeLink } from "../lib/youtube";
import type { Game, Player, Submission } from "../lib/types";
import { Select } from "../components/ui/Select";

const qrScannerWorkerPath = new URL("qr-scanner/qr-scanner-worker.min.js", import.meta.url).toString();
QrScanner.WORKER_PATH = qrScannerWorkerPath;

type SetupPlayer = { id: string; name: string; links: string[] };
type SetupScreen = "roster" | "invite" | "private" | "handoff" | "ready";

const starter: SetupPlayer[] = [
  {
    id: "p-asha",
    name: "Asha",
    links: [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=9bZkp7q19f0",
      "https://www.youtube.com/watch?v=kJQP7kiw5Fk"
    ]
  },
  {
    id: "p-biren",
    name: "Biren",
    links: [
      "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",
      "https://www.youtube.com/watch?v=L_jWHffIx5E",
      "https://www.youtube.com/watch?v=hTWKbfoikeg"
    ]
  },
  {
    id: "p-chitra",
    name: "Chitra",
    links: [
      "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
      "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
      "https://www.youtube.com/watch?v=2Vv-BfVoq4g"
    ]
  }
];

export function GamePage() {
  const [loaded] = useState(() => loadCurrentGameState());
  const [game, setGame] = useState<Game | null>(loaded.game);
  const [recoveryCleared, setRecoveryCleared] = useState(false);

  if (game) {
    return <Playing game={game} setGame={setGame} />;
  }

  if (loaded.error && !recoveryCleared) {
    return <Recovery error={loaded.error} onReset={() => {
      clearCurrentGame();
      setRecoveryCleared(true);
      setGame(null);
    }} />;
  }

  return <Setup onStart={setGame} />;
}

function Setup({ onStart }: { onStart: (game: Game) => void }) {
  const [theme, setTheme] = useState("Monsoon night");
  const [songCount, setSongCount] = useState(3);
  const [hostName, setHostName] = useState("Host");
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<SetupPlayer[]>(starter);
  const [screen, setScreen] = useState<SetupScreen>("roster");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [pendingNextPlayerIndex, setPendingNextPlayerIndex] = useState<number | null>(null);
  const [roomId, setRoomId] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [roomQrDataUrl, setRoomQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Set the roster, then hand the phone around one player at a time.");
  const [importPayload, setImportPayload] = useState("");
  const [importedPlayerId, setImportedPlayerId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState("Scan or paste a slip to fill the current player's songs.");
  const [importError, setImportError] = useState("");
  const [importState, setImportState] = useState<"idle" | "scanning" | "blocked">("idle");
  const importVideoRef = useRef<HTMLVideoElement | null>(null);
  const importScannerRef = useRef<QrScanner | null>(null);

  const roomInvite = roomId && roomToken
    ? createRoomInvite({ roomId, roomToken, theme, songsPerPlayer: songCount, playerCount })
    : null;
  const roomPayload = roomInvite ? encodeRoomInvite(roomInvite) : "";

  function updateSongCount(nextCount: number) {
    setSongCount(nextCount);
    setPlayers((current) =>
      current.map((player) => ({
        ...player,
        links: Array.from({ length: nextCount }, (_, index) => player.links[index] ?? "")
      }))
    );
  }

  function updateLink(playerIndex: number, linkIndex: number, value: string) {
    setPlayers((current) =>
      current.map((player, i) =>
        i === playerIndex
          ? {
              ...player,
              links: Array.from({ length: Math.max(player.links.length, linkIndex + 1) }, (_, j) =>
                j === linkIndex ? value : player.links[j] ?? ""
              )
            }
          : player
      )
    );
  }

  function validateRoster() {
    const themeValue = theme.trim();
    if (!themeValue) {
      return "Enter a theme before starting private handoff.";
    }

    if (players.length < 3 || players.length > 10) {
      return "Use between 3 and 10 players.";
    }

    const names = players.map((player) => player.name.trim());
    if (names.some((name) => name.length < 1)) {
      return "Give every player a display name.";
    }

    return "";
  }

  function validatePlayerLinks(playerIndex: number) {
    const player = players[playerIndex];
    const seen = new Set<string>();
    const normalized = player.links.slice(0, songCount).map((link, songIndex) => {
      const check = normalizeYouTubeLink(link);
      if (!check.ok) {
        throw new Error(`${player.name || `Player ${playerIndex + 1}`}, song ${songIndex + 1}: ${check.error}`);
      }

      if (seen.has(check.videoId)) {
        throw new Error(`Use different songs for ${player.name || `Player ${playerIndex + 1}`}.`);
      }

      seen.add(check.videoId);
      return check.videoId;
    });

    const priorIds = new Set(
      players
        .slice(0, playerIndex)
        .flatMap((priorPlayer) => priorPlayer.links.slice(0, songCount))
        .map((link) => {
          const check = normalizeYouTubeLink(link);
          return check.ok ? check.videoId : "";
        })
        .filter(Boolean)
    );

    const duplicate = normalized.find((videoId) => priorIds.has(videoId));
    if (duplicate) {
      throw new Error("One of these songs duplicates an earlier submission. Replace it with a different link.");
    }

    return normalized;
  }

  function lockCurrentPlayer() {
    try {
      validatePlayerLinks(currentPlayerIndex);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check the links before saving.");
      return;
    }

    const nextIndex = currentPlayerIndex + 1;
    if (nextIndex < players.length) {
      setPendingNextPlayerIndex(nextIndex);
      setImportedPlayerId(null);
      setScreen("handoff");
      setMessage(`Saved ${players[currentPlayerIndex].name}. Pass the phone to ${players[nextIndex].name}.`);
      setError("");
      return;
    }

    setScreen("ready");
    setMessage("Everyone is locked in. Start the game when the room is ready.");
    setError("");
  }

  function buildSubmissions() {
    const submissions: Submission[] = [];
    const seen = new Set<string>();

    for (const [playerIndex, player] of players.entries()) {
      for (let songIndex = 0; songIndex < songCount; songIndex += 1) {
        const check = normalizeYouTubeLink(player.links[songIndex] ?? "");
        if (!check.ok) {
          throw new Error(`${player.name || `Player ${playerIndex + 1}`}, song ${songIndex + 1}: ${check.error}`);
        }

        if (seen.has(check.videoId)) {
          throw new Error("Replace duplicate songs before starting.");
        }

        seen.add(check.videoId);
        submissions.push({
          id: `submission-${player.id}-${songIndex + 1}`,
          ownerId: player.id,
          videoId: check.videoId
        });
      }
    }

    return submissions;
  }

  function applyImportedSlip(payload: string) {
    const result = importSongSlip(payload, songCount);
    return applyImportedResult(result);
  }

  async function copyRoomInvite() {
    try {
      await navigator.clipboard.writeText(roomPayload);
      setMessage("Room invite copied. Send it to remote players in Discord.");
    } catch {
      setMessage("Copy is unavailable here. Open the invite text below and copy it manually.");
    }
  }

  async function applyEncryptedSlip(payload: string) {
    const result = await importEncryptedSongSlip(payload, `${roomId}:${roomToken}`, songCount);
    return applyImportedResult(result);
  }

  function applyImportedResult(result: ReturnType<typeof importSongSlip>) {
    if (!result.ok) {
      setImportError(result.error);
      return false;
    }

    if ((result.roomId || result.roomToken) && (result.roomId !== roomId || result.roomToken !== roomToken)) {
      setImportError("This submission belongs to a different room. Ask the player to scan this room's QR first.");
      return false;
    }

    const priorIds = new Set(
      players
        .slice(0, currentPlayerIndex)
        .flatMap((player) => player.links)
        .map((link) => normalizeYouTubeLink(link))
        .filter((check): check is { ok: true; videoId: string; canonicalUrl: string; sourceUrl: string } => check.ok)
        .map((check) => check.videoId)
    );
    const repeated = result.links.find((link) => {
      const check = normalizeYouTubeLink(link);
      return check.ok && priorIds.has(check.videoId);
    });
    if (repeated) {
      setImportError("That submission repeats a song already used in this room. Ask the player to replace it, then show a new QR.");
      return false;
    }

    setPlayers((current) =>
      current.map((player, index) => (index === currentPlayerIndex ? { ...player, name: index === 0 ? player.name : result.playerName, links: result.links } : player))
    );
    setImportPayload("");
    setImportedPlayerId(players[currentPlayerIndex].id);
    setImportError("");
    setImportMessage(`Imported ${result.links.length} songs for ${result.playerName}.`);
    setMessage(`Imported ${result.links.length} songs for ${result.playerName}.`);
    return true;
  }

  function startGame() {
    const rosterError = validateRoster();
    if (rosterError) {
      setError(rosterError);
      setScreen("roster");
      return;
    }

    try {
      const submissions = buildSubmissions();
      const game = createGame(
        theme,
        players.map(({ id, name }): Player => ({ id, name: name.trim() })),
        submissions
      );
      onStart(saveCurrentGame(game));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start the game.");
      setScreen("private");
    }
  }

  const currentPlayer = players[currentPlayerIndex];
  const nextPlayer = pendingNextPlayerIndex !== null ? players[pendingNextPlayerIndex] : null;
  const isHostSlot = currentPlayerIndex === 0;

  useEffect(() => {
    return () => {
      importScannerRef.current?.destroy();
      importScannerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (screen !== "invite" || !roomPayload) return;
    QRCode.toDataURL(roomPayload, { errorCorrectionLevel: "M", margin: 1, scale: 8 })
      .then((dataUrl: string) => { if (active) setRoomQrDataUrl(dataUrl); })
      .catch(() => { if (active) setRoomQrDataUrl(""); });
    return () => { active = false; };
  }, [roomPayload, screen]);

  if (screen === "invite") {
    return (
      <section className="mx-auto max-w-3xl sheet">
        <p className="round-marker">Host · Step 2 of 4</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Everyone: scan this room QR</h2>
        <p className="mt-3 text-sm leading-7 text-[#18211f]">
          Keep this screen open while every player scans it on their own phone. It shares the theme and songs-per-player setting.
        </p>
        {roomQrDataUrl ? <img src={roomQrDataUrl} alt="Room invite QR code" className="mx-auto mt-6 h-64 w-64 rounded-md bg-white p-3" /> : <div className="mx-auto mt-6 flex h-64 w-64 items-center justify-center rounded-md bg-[#e2e9bb] text-sm text-[#536056]">Generating room QR…</div>}
        <p className="mt-5 text-center text-sm text-[#536056]">Players should scan this QR from the Player setup screen.</p>
        <div className="mt-5 rounded-md border border-[#7b846f] bg-[#c7d2ed] p-4">
          <p className="text-sm font-semibold text-[#18211f]">Playing through Discord?</p>
          <p className="mt-1 text-sm leading-6 text-[#536056]">Copy the room invite and send it to remote players. They can paste it on the Player screen.</p>
          <button type="button" onClick={() => void copyRoomInvite()} className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#faf8f0] action px-4 py-2 text-sm font-semibold text-[#18211f]">
            <Copy size={15} aria-hidden="true" />
            Copy room invite
          </button>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-[#536056]">Show invite text</summary>
            <textarea readOnly value={roomPayload} aria-label="Room invite payload" className="mt-2 min-h-24 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 text-xs leading-5 text-[#18211f]" />
          </details>
        </div>
        <button type="button" onClick={() => { setCurrentPlayerIndex(0); setScreen("private"); setMessage(`Add your own songs, ${hostName}.`); }} className="mt-6 rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-semibold text-[#18211f]">Everyone has scanned — add my songs</button>
      </section>
    );
  }

  if (screen === "handoff" && nextPlayer) {
    return (
      <section className="mx-auto max-w-3xl sheet">
        <p className="round-marker">Host · Step 2 of 3</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Collect Player {pendingNextPlayerIndex! + 1}</h2>
        <p className="mt-3 text-sm leading-7 text-[#18211f]">
          {message} Keep the host phone with you. Ask that player to show their submission QR, then scan it on this phone.
        </p>
        <div className="mt-6 rounded-md border border-[#7b846f] bg-[#e2e9bb] p-4">
          <p className="text-sm text-[#18211f]">Everyone can prepare at the same time. The host collects submissions one at a time.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (pendingNextPlayerIndex !== null) {
              setCurrentPlayerIndex(pendingNextPlayerIndex);
            }
            setImportedPlayerId(null);
            setPendingNextPlayerIndex(null);
            setScreen("private");
            setError("");
          }}
          className="mt-6 rounded-md bg-[#d5e467] action px-5 py-3 text-sm font-semibold text-[#18211f]"
        >
          Scan Player {pendingNextPlayerIndex! + 1} submission
        </button>
      </section>
    );
  }

  if (screen === "ready") {
    const completion = players.map((player) => ({
      name: player.name.trim(),
      ready: player.links.slice(0, songCount).every((link) => normalizeYouTubeLink(link).ok)
    }));

    return (
      <section className="mx-auto max-w-3xl sheet">
        <p className="round-marker">Host · Step 3 of 3</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Start the game when everyone is ready</h2>
        <p className="mt-3 text-sm leading-7 text-[#18211f]">
          All song links are locked in. The shuffled round order will stay fixed after the game starts.
        </p>
        <div className="mt-6 space-y-2">
          {completion.map((player) => (
            <div key={player.name} className="flex items-center justify-between rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3">
              <span className="text-[#18211f]">{player.name}</span>
              <span className="text-sm text-[#536056]">{player.ready ? "Locked" : "Missing link"}</span>
            </div>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-[#922c22]">{error}</p> : null}
        <button
          type="button"
          onClick={startGame}
          className="mt-6 rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-semibold text-[#18211f]"
        >
          Start game
        </button>
        <button
          type="button"
          onClick={() => {
            setScreen("private");
            setError("");
            setMessage("Review the locked songs, then start the game.");
          }}
          className="mt-3 ml-3 rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm text-[#18211f]"
        >
          Review links
        </button>
      </section>
    );
  }

  if (screen === "private") {
    return (
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="sheet">
          <p className="round-marker">Host · Step 2 of 3</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Collect songs from {currentPlayer.name}</h2>
          <p className="mt-3 text-sm leading-7 text-[#18211f]">
            Ask {currentPlayer.name} to prepare songs on their own phone. Scan their QR in the room, or paste their encrypted entry if they are joining through Discord.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Theme" value={theme} onChange={setTheme} disabled />
            <label className="space-y-2">
              <span className="block text-xs uppercase tracking-normal text-[#536056]">Songs per player</span>
              <Select
                value={String(songCount)}
                onValueChange={() => undefined}
                disabled
                options={[1, 2, 3, 4, 5].map((count) => ({ value: String(count), label: `${count} ${count === 1 ? "song" : "songs"}` }))}
                aria-label="Songs per player"
              />
            </label>
          </div>
          {isHostSlot ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-[#18211f]">Your songs</p>
              <p className="text-sm text-[#536056]">You are the host and a player. Enter your songs directly on this phone.</p>
              {Array.from({ length: songCount }, (_, songIndex) => (
                <input
                  key={songIndex}
                  aria-label={`${currentPlayer.name} song ${songIndex + 1}`}
                  value={currentPlayer.links[songIndex] ?? ""}
                  onChange={(event) => updateLink(currentPlayerIndex, songIndex, event.target.value)}
                  placeholder={`Song ${songIndex + 1} YouTube link`}
                  className="w-full rounded-md border border-[#7b846f] bg-[#faf8f0] px-3 py-3 text-sm text-[#18211f] outline-none"
                />
              ))}
            </div>
          ) : importedPlayerId === currentPlayer.id ? (
            <div className="mt-6 rounded-md border border-[#7b846f] bg-[#e2e9bb] p-4">
              <p className="font-semibold text-[#18211f]">{songCount} songs received</p>
              <p className="mt-1 text-sm text-[#536056]">The links are hidden on this phone until the game reveals each owner.</p>
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-[#7b846f] bg-[#c7d2ed] p-4">
              <p className="font-semibold text-[#18211f]">Waiting for {currentPlayer.name}&apos;s submission QR</p>
              <p className="mt-1 text-sm text-[#536056]">Keep this host phone here. Scan the player&apos;s QR in the panel beside this step.</p>
            </div>
          )}
          {error ? <p className="mt-4 text-sm text-[#922c22]">{error}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {isHostSlot ? <button
              type="button"
              onClick={lockCurrentPlayer}
              className="rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-semibold text-[#18211f]"
            >
              Save my songs
            </button> : null}
            {!isHostSlot && importedPlayerId === currentPlayer.id ? <button
              type="button"
              onClick={lockCurrentPlayer}
              className="rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-semibold text-[#18211f]"
            >
              Confirm player submission
            </button> : null}
            <button
              type="button"
              onClick={() => setScreen("roster")}
              className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm text-[#18211f]"
            >
              Back to roster
            </button>
          </div>
          <p className="mt-4 text-sm text-[#536056]">{message}</p>
        </div>

        <aside className="sheet ledger">
          <h3 className="text-base font-semibold text-[#18211f]">Handoff order</h3>
          <p className="mt-2 text-sm text-[#536056]">Each player sees only their own songs. The rest stay hidden.</p>
          {!isHostSlot ? <details className="mt-5 rounded-md border border-[#7b846f] bg-[#faf8f0] p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-[#18211f]">Receive this player&apos;s entry</summary>
                <div className="pt-3">
                  <p className="text-sm text-[#536056]">
                In the room, scan the QR from the player&apos;s phone. For Discord, paste the encrypted entry they shared below.
              </p>
            <video
              ref={importVideoRef}
              className="qr-camera mt-3 rounded-md border border-[#7b846f] bg-black"
              muted
              playsInline
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startImportScanner()}
                className="rounded-md bg-[#c7d2ed] action px-4 py-2 text-sm font-medium text-[#18211f]"
              >
                Start camera scan on host phone
              </button>
              <button
                type="button"
                onClick={() => stopImportScanner()}
                className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f]"
              >
                Stop scan
              </button>
            </div>
            <textarea
              value={importPayload}
              onChange={(event) => setImportPayload(event.target.value)}
              placeholder="Paste the encrypted entry from Discord"
              className="mt-3 min-h-28 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 text-sm text-[#18211f] outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (importPayload.startsWith(ENCRYPTED_SLIP_PREFIX)) {
                    void applyEncryptedSlip(importPayload);
                  } else {
                    applyImportedSlip(importPayload);
                  }
                }}
                className="rounded-md bg-[#ef7657] action px-4 py-2 text-sm font-semibold text-[#18211f]"
              >
                Import entry
              </button>
            </div>
              <p className="mt-3 text-xs uppercase tracking-normal text-[#536056]">Status: {importState}</p>
              <p className="mt-2 text-sm text-[#536056]">{importMessage}</p>
              {importError ? <p className="mt-2 text-sm text-[#922c22]">{importError}</p> : null}
            </div>
          </details> : null}
          <div className="mt-5 space-y-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={`rounded-md border px-4 py-3 text-sm ${
                  index === currentPlayerIndex
                    ? "border-[#18211f] bg-[#faf8f0] text-[#18211f]"
                    : index < currentPlayerIndex
                      ? "border-[#7b846f] bg-[#faf8f0] text-[#536056]"
                      : "border-[#7b846f] bg-white text-[#536056]"
                }`}
              >
                {index + 1}. {player.name}
                <span className="ml-2 text-xs uppercase tracking-normal">
                  {index < currentPlayerIndex ? "Locked" : index === currentPlayerIndex ? "Current" : "Waiting"}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl sheet">
      <p className="round-marker">Host · Step 1 of 4</p>
      <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Set up the room</h2>
      <p className="mt-3 text-sm leading-7 text-[#18211f]">
        Set the room rules once. Everyone else will receive them by scanning the room QR.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" value={hostName} onChange={setHostName} />
        <Field label="Theme" value={theme} onChange={setTheme} />
        <label className="space-y-2">
          <span className="block text-xs uppercase tracking-normal text-[#536056]">Songs per player</span>
          <Select
            value={String(songCount)}
            onValueChange={(value) => updateSongCount(Number(value))}
            options={[1, 2, 3, 4, 5].map((count) => ({ value: String(count), label: `${count} ${count === 1 ? "song" : "songs"}` }))}
            aria-label="Songs per player"
          />
        </label>
      </div>

      <label className="mt-6 block max-w-xs space-y-2">
        <span className="block text-xs uppercase tracking-normal text-[#536056]">Total players, including you</span>
        <Select
          value={String(playerCount)}
          onValueChange={(value) => setPlayerCount(Number(value))}
          options={Array.from({ length: 8 }, (_, index) => ({ value: String(index + 3), label: `${index + 3} players` }))}
          aria-label="Total players, including you"
        />
      </label>

      {error ? <p className="mt-4 text-sm text-[#922c22]">{error}</p> : null}

      <button
        type="button"
        onClick={() => {
          if (!hostName.trim() || !theme.trim()) {
            setError("Add your name and a theme before sharing the room.");
            return;
          }
          const nextPlayers: SetupPlayer[] = Array.from({ length: playerCount }, (_, index) => ({
            id: index === 0 ? "host" : `p-${crypto.randomUUID()}`,
            name: index === 0 ? hostName.trim() : `Player ${index + 1}`,
            links: Array.from({ length: songCount }, () => "")
          }));
          setPlayers(nextPlayers);
          setRoomId(crypto.randomUUID());
          setRoomToken(crypto.randomUUID());
          setCurrentPlayerIndex(0);
          setPendingNextPlayerIndex(playerCount > 1 ? 1 : null);
          setScreen("invite");
          setError("");
          setMessage("Share the room QR, then add your own songs.");
        }}
        className="mt-6 rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-semibold text-[#18211f]"
      >
        Generate room QR
      </button>
      <p className="mt-4 text-sm text-[#536056]">{message}</p>
    </section>
  );

  async function startImportScanner() {
    if (!importVideoRef.current) {
      setImportError("Camera preview is not ready yet.");
      return;
    }

    setImportError("");
    setImportState("scanning");
    importScannerRef.current?.destroy();

    try {
        const scanner = new QrScanner(
        importVideoRef.current,
        (result) => {
          const imported = result.data.startsWith(ENCRYPTED_SLIP_PREFIX)
            ? applyEncryptedSlip(result.data)
            : Promise.resolve(applyImportedSlip(result.data));
          void imported.then((accepted) => {
            setImportState("idle");
            if (accepted) stopImportScanner();
          });
        },
        {
          highlightScanRegion: true,
          preferredCamera: "environment"
        }
      );
      importScannerRef.current = scanner;
      await scanner.start();
    } catch (caught) {
      setImportState("blocked");
      setImportError(caught instanceof Error ? caught.message : "Camera access is unavailable.");
    }
  }

  function stopImportScanner() {
    importScannerRef.current?.stop();
    importScannerRef.current?.destroy();
    importScannerRef.current = null;
    setImportState("idle");
  }
}

function Playing({ game, setGame }: { game: Game; setGame: (game: Game | null) => void }) {
  const [message, setMessage] = useState("Start playback, discuss, then open voting.");
  const [persistenceError, setPersistenceError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const round = currentRound(game);
  const submission = game.submissions.find((candidate) => candidate.id === round?.submissionId);
  const scores = standings(game);
  const orderedVoters = voteOrder(game);

  function commit(next: Game, status?: string) {
    try {
      const saved = saveCurrentGame(next);
      setPersistenceError("");
      setGame(saved);
      if (status) {
        setMessage(status);
      }
    } catch (caught) {
      setPersistenceError(caught instanceof Error ? caught.message : "Unable to save the current game.");
    }
  }

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== currentGameKey()) {
        return;
      }

      const latest = loadCurrentGameState().game;
      if (!latest || latest.id !== game.id || latest.saveRevision === game.saveRevision) {
        return;
      }

      setPersistenceError("This game changed in another tab. Reload before making more moves.");
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [game.id, game.saveRevision]);

  if (game.status === "completed") {
    const topScore = scores[0]?.score ?? 0;
    const winners = topScore > 0 ? scores.filter((player) => player.score === topScore) : [];

    return (
      <section className="mx-auto max-w-3xl sheet">
        <p className="text-xs uppercase tracking-normal text-[#18211f]">Game complete</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Final standings</h2>
        <p className="mt-3 text-sm leading-7 text-[#18211f]">
          {topScore === 0
            ? "No scored rounds."
            : winners.length === 1
              ? `${winners[0].name} wins with ${topScore} points.`
              : `Tied winners: ${winners.map((player) => player.name).join(", ")} with ${topScore} points.`}
        </p>
        <div className="mt-6 space-y-2">
          {scores.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3"
            >
              <span className="text-[#18211f]">
                {index + 1}. {player.name}
              </span>
              <span className="text-[#18211f]">{player.score} pts</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            clearCurrentGame();
            setGame(null);
          }}
          className="mt-6 rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f]"
        >
          New game
        </button>
      </section>
    );
  }

  if (!round || !submission) {
    return null;
  }

  const owner = game.players.find((player) => player.id === submission.ownerId);
  const voteCount = game.players.filter((player) => round.votes[player.id]).length;
  const allVoted = voteCount === game.players.length;

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="sheet">
        {persistenceError ? <p className="mb-4 rounded-md border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-[#922c22]">{persistenceError}</p> : null}
        <p className="round-marker">
          Round {game.activeRoundIndex + 1} of {game.rounds.length}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Whose song is playing?</h2>
        <div className="playback mt-5 aspect-video">
          <iframe
            title="Current song"
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${submission.videoId}`}
            allow="autoplay; encrypted-media"
          />
        </div>
        <p role="status" className={round.phase === "revealed" ? "reveal" : "mt-4 text-sm"}>
          {round.phase === "revealed"
            ? `${owner?.name} brought this song!`
            : round.phase === "skipped"
              ? "Skipped. No points this round."
              : message}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {round.phase === "listening" ? (
            <>
              <a
                href={`https://www.youtube.com/watch?v=${submission.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-[#ef7657] action px-4 py-2 text-sm font-semibold text-[#18211f]"
              >
                Open playback
              </a>
              <button
                type="button"
                onClick={() => {
                  try {
                    commit(beginVoting(game), "Voting is open. Record one guess per player.");
                  } catch (caught) {
                    setMessage(caught instanceof Error ? caught.message : "Unable to open voting.");
                  }
                }}
                className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f]"
              >
                Open voting
              </button>
            </>
          ) : null}
          {round.phase !== "revealed" && round.phase !== "skipped" ? (
            <button
              type="button"
              onClick={() => commit(skip(game), "Round skipped.")}
              className="rounded-md border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm text-[#922c22]"
            >
              Skip round
            </button>
          ) : null}
        </div>
      </div>

      <aside className="sheet ledger">
        <h3 className="text-base font-semibold text-[#18211f]">Votes</h3>
        <p className="mt-2 text-sm text-[#536056]">
          Everyone votes now. Change your choice anytime before reveal.
        </p>
        <p className="mt-2 text-xs uppercase tracking-normal text-[#536056]" role="status">
          {voteCount} of {game.players.length} votes recorded
        </p>
        <div className="mt-5 space-y-3">
          {orderedVoters.map((voter) => (
            <fieldset key={voter.id} className="vote-row" data-voter-id={voter.id}>
              <legend className="text-xs uppercase tracking-normal text-[#536056]">{voter.name}'s guess</legend>
              <div className="vote-options mt-2">
                {game.players.filter((player) => player.id !== voter.id).map((candidate) => {
                  const selected = round.votes[voter.id] === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`vote-option${selected ? " selected" : ""}`}
                      aria-label={`${voter.name} votes for ${candidate.name}`}
                      aria-pressed={selected}
                      disabled={round.phase !== "voting"}
                      onClick={() => {
                        try {
                          commit(recordVote(game, voter.id, candidate.id), "Vote recorded.");
                        } catch (caught) {
                          setMessage(caught instanceof Error ? caught.message : "Vote rejected.");
                        }
                      }}
                    >
                      {candidate.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        {round.phase === "voting" ? (
          <button
            type="button"
            disabled={!allVoted}
            onClick={() => {
              try {
                commit(reveal(game), `Reveal: ${owner?.name ?? "Unknown"} owns this song.`);
              } catch (caught) {
                setMessage(caught instanceof Error ? caught.message : "Reveal unavailable.");
              }
            }}
            className="mt-5 w-full rounded-md bg-[#d5e467] action px-4 py-3 text-sm font-semibold text-[#18211f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reveal song owner
          </button>
        ) : null}
        {round.phase === "revealed" || round.phase === "skipped" ? (
          <button
            type="button"
            onClick={() => commit(nextRound(game), game.activeRoundIndex + 1 === game.rounds.length ? "Game complete." : "Next round ready.")}
            className="mt-5 w-full rounded-md bg-[#c7d2ed] action px-4 py-3 text-sm font-semibold text-[#18211f]"
          >
            {game.activeRoundIndex + 1 === game.rounds.length ? "Show standings" : "Next round"}
          </button>
        ) : null}
        <div className="mt-6 border-t border-[#7b846f] pt-5">
          <h3 className="text-sm font-semibold text-[#18211f]">Live scores</h3>
          <div className="mt-3 space-y-2">
            {scores.map((player) => (
              <div key={player.id} className="flex justify-between text-sm">
                <span className="text-[#18211f]">{player.name}</span>
                <span className="text-[#18211f]">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 border-t border-[#7b846f] pt-5">
          {confirmEnd ? (
            <div className="space-y-3">
              <p className="text-sm text-[#922c22]">End this game and discard its current progress?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { clearCurrentGame(); setGame(null); }} className="rounded-md bg-[#ef7657] action px-3 py-2 text-sm font-semibold text-[#18211f]">End game</button>
                <button type="button" onClick={() => setConfirmEnd(false)} className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-3 py-2 text-sm text-[#18211f]">Keep playing</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmEnd(true)} className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-3 py-2 text-sm text-[#536056]">End game</button>
          )}
        </div>
      </aside>
    </section>
  );
}

function Recovery({ error, onReset }: { error: string; onReset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl sheet">
      <p className="round-marker">Recovery needed</p>
      <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">A saved game could not be restored</h2>
      <p className="mt-3 text-sm leading-7 text-[#18211f]">{error}</p>
      <p className="mt-3 text-sm leading-7 text-[#536056]">
        Clear the saved game and start a fresh room. No other state is changed.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-semibold text-[#18211f]"
      >
        Clear saved game
      </button>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs uppercase tracking-normal text-[#536056]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm text-[#18211f] outline-none"
      />
    </label>
  );
}
