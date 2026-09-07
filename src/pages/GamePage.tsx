import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { ArrowRight, Check, Disc3, ScanLine, Trophy, Copy } from "lucide-react";
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
import { RoomSubheader } from "../components/RoomBadge";
import type { Game, Player, Round, Submission } from "../lib/types";
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
  const [importError, setImportError] = useState("");
  const [importState, setImportState] = useState<"idle" | "scanning" | "blocked">("idle");
  const importVideoRef = useRef<HTMLVideoElement | null>(null);
  const importScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h2");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [screen, currentPlayerIndex, importedPlayerId]);

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
      setMessage(`Saved ${players[currentPlayerIndex].name}. Ask ${players[nextIndex].name} to show their entry.`);
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
    stopImportScanner();
    setImportPayload("");
    setImportedPlayerId(players[currentPlayerIndex].id);
    setImportError("");
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
        submissions,
        Math.random,
        roomId
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
      <>
      <RoomSubheader roomId={roomId} />
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
      </>
    );
  }

  if (screen === "handoff" && nextPlayer) {
    return (
      <>
      <RoomSubheader roomId={roomId} />
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
      </>
    );
  }

  if (screen === "ready") {
    const completion = players.map((player) => ({
      name: player.name.trim(),
      ready: player.links.slice(0, songCount).every((link) => normalizeYouTubeLink(link).ok)
    }));

    return (
      <>
      <RoomSubheader roomId={roomId} />
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
      </>
    );
  }

  if (screen === "private") {
    const received = !isHostSlot && importedPlayerId === currentPlayer.id;
    return <>
      <RoomSubheader roomId={roomId} />
      <section className="collection-screen">
        <div className="collection-heading">
          <p className="round-marker">Player {currentPlayerIndex + 1} of {players.length}</p>
          <h2 tabIndex={-1}>{isHostSlot ? "Your turn to pick." : received ? `${currentPlayer.name} is in.` : `Collect songs from ${currentPlayer.name}`}</h2>
          <p>{isHostSlot ? "You play too. Add your own YouTube links here." : received ? "Check the name, then lock in this entry." : "Scan their submission QR, or paste the entry they shared."}</p>
        </div>
        <div className="sheet collection-panel">
          {isHostSlot ? <div className="collection-fields">
            {Array.from({ length: songCount }, (_, songIndex) => <label key={songIndex}>
              <span>Song {songIndex + 1}</span>
              <input aria-label={`${currentPlayer.name} song ${songIndex + 1}`} value={currentPlayer.links[songIndex] ?? ""}
                onChange={(event) => updateLink(currentPlayerIndex, songIndex, event.target.value)} placeholder="Paste a YouTube link" className="control" />
            </label>)}
            <button type="button" onClick={lockCurrentPlayer} className="button primary">Save my songs <ArrowRight size={18} aria-hidden="true" /></button>
          </div> : received ? <div className="entry-confirmation">
            <span className="confirmation-seal" aria-hidden="true"><Check size={32} /></span>
            <h3>{songCount} {songCount === 1 ? "song" : "songs"} received</h3>
            <p>Saved privately for <strong>{currentPlayer.name}</strong>. Ready for the next player?</p>
            <button type="button" onClick={lockCurrentPlayer} className="button primary">Confirm player submission <Check size={18} aria-hidden="true" /></button>
            <button type="button" className="button" onClick={() => {
              stopImportScanner();
              setPlayers((current) => current.map((player, index) => index === currentPlayerIndex ? { ...player, name: `Player ${index + 1}`, links: Array.from({ length: songCount }, () => "") } : player));
              setImportedPlayerId(null); setImportPayload(""); setImportError(""); setError("");
            }}>Discard and scan again</button>
          </div> : <div className="collection-scanner">
            <div className="scan-prompt" aria-hidden="true"><ScanLine size={48} /><span>Their phone. Your scanner.</span></div>
            <video ref={importVideoRef} className={`qr-camera ${importState === "scanning" ? "" : "qr-camera-idle"}`} muted playsInline />
            <button type="button" onClick={() => void startImportScanner()} className="button primary"><ScanLine size={20} aria-hidden="true" />Scan {currentPlayer.name} QR</button>
            {importState === "scanning" ? <button type="button" onClick={stopImportScanner} className="button">Stop scan</button> : null}
            <details className="entry-paste">
              <summary>Paste encrypted entry instead</summary>
              <textarea aria-label="Paste the encrypted entry from Discord" value={importPayload} onChange={(event) => setImportPayload(event.target.value)} placeholder="Paste the encrypted entry from Discord" className="control" />
              <button type="button" onClick={() => { if (importPayload.startsWith(ENCRYPTED_SLIP_PREFIX)) void applyEncryptedSlip(importPayload); else applyImportedSlip(importPayload); }} className="button primary">Import entry</button>
            </details>
            {importError ? <p role="alert" className="game-error">{importError}</p> : null}
            {importState === "scanning" ? <p role="status">Hold the QR inside the square.</p> : null}
          </div>}
          {error ? <p role="alert" className="game-error">{error}</p> : null}
        </div>
        <div className="collection-footer">
          <button type="button" onClick={() => { stopImportScanner(); setScreen("roster"); }} className="button">Back to roster</button>
          <span>{currentPlayerIndex} of {players.length} players locked in</span>
        </div>
      </section>
    </>;
  }

  return (
    <>
    <RoomSubheader roomId={roomId} />
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
    </>
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

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h2");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [round?.id, round?.phase, game.status]);

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
    return <>
      {game.roomId ? <RoomSubheader roomId={game.roomId} /> : null}
      <FinalStandings game={game} scores={scores} onNew={() => { clearCurrentGame(); setGame(null); }} />
    </>;
  }

  if (!round || !submission) {
    return null;
  }

  const owner = game.players.find((player) => player.id === submission.ownerId);
  const voteCount = game.players.filter((player) => round.votes[player.id]).length;
  const allVoted = voteCount === game.players.length;
  const phaseLabel = round.phase === "listening" ? "Listen first" : round.phase === "voting" ? "Voting open" : round.phase === "revealed" ? "Owner revealed" : "Round skipped";

  const endGame = () => commit({ ...game, status: "completed", endedEarly: true }, "Game ended. Final standings are ready.");

  if (round.phase === "listening") {
    return <>
      {game.roomId ? <RoomSubheader roomId={game.roomId} /> : null}
      <ListeningScreen game={game} submission={submission} message={message} persistenceError={persistenceError} scores={scores} phaseLabel={phaseLabel} onOpenVoting={() => {
        try { commit(beginVoting(game), "Voting is open. Record one guess per player."); }
        catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to open voting."); }
      }} onSkip={() => commit(skip(game), "Round skipped.")} onEnd={endGame} confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd} />
    </>;
  }

  if (round.phase === "voting") {
    return <>
      {game.roomId ? <RoomSubheader roomId={game.roomId} /> : null}
      <GameFeedback error={persistenceError} message={message} /><VotingScreen game={game} round={round} scores={scores} voteCount={voteCount} allVoted={allVoted} onVote={(voterId, ownerId) => {
        try { commit(recordVote(game, voterId, ownerId), "Vote recorded."); }
        catch (caught) { setMessage(caught instanceof Error ? caught.message : "Vote rejected."); }
      }} onReveal={() => {
        try { commit(reveal(game), `Reveal: ${owner?.name ?? "Unknown"} owns this song.`); }
        catch (caught) { setMessage(caught instanceof Error ? caught.message : "Reveal unavailable."); }
      }} onEnd={endGame} confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd} />
    </>;
  }

  return <>
    {game.roomId ? <RoomSubheader roomId={game.roomId} /> : null}
    <GameFeedback error={persistenceError} message={message} /><ResultScreen game={game} round={round} owner={owner} scores={scores} onNext={() => commit(nextRound(game), game.activeRoundIndex + 1 === game.rounds.length ? "Game complete." : "Next round ready.")} onEnd={endGame} confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd} />
  </>;

}

type ScoreEntry = Player & { score: number };

function RoundStepper({ active }: { active: "listening" | "voting" | "result" }) {
  const steps = [["listening", "Listen"], ["voting", "Vote"], ["result", "Reveal"]] as const;
  return <ol className="round-stepper" aria-label="Round steps">
    {steps.map(([key, label], index) => <li key={key} aria-current={key === active ? "step" : undefined} className={key === active ? "active" : ""}>
      <span>{index + 1}</span>{label}
    </li>)}
  </ol>;
}

function ScoreStrip({ scores }: { scores: ScoreEntry[] }) {
  return <section className="score-strip" aria-label="Current scores">
    <div className="score-strip-heading"><span>Scoreboard</span><small>After revealed rounds</small></div>
    <div className="score-strip-list">
      {scores.map((player) => <div key={player.id} className={player.score > 0 && player.score === scores[0].score ? "leader" : ""}>
        <span className="score-rank">{scores.findIndex((entry) => entry.score === player.score) + 1}</span><span className="score-name" title={player.name}>{player.name}</span><strong>{player.score}</strong>
      </div>)}
    </div>
  </section>;
}

function GameEndControl({ onEnd, confirmEnd, setConfirmEnd }: { onEnd: () => void; confirmEnd: boolean; setConfirmEnd: (value: boolean) => void }) {
  return <details className="game-end-control">
    <summary>Game controls</summary>
    {confirmEnd ? <div className="mt-3 space-y-3">
      <p className="text-sm text-[#922c22]">End this game and show the current standings?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEnd} className="button primary">End game</button>
        <button type="button" onClick={() => setConfirmEnd(false)} className="button">Keep playing</button>
      </div>
    </div> : <button type="button" onClick={() => setConfirmEnd(true)} className="mt-3 button">End game</button>}
  </details>;
}

function StageFrame({ submission }: { submission: Submission }) {
  return <div className="stage-frame mt-5">
    <div className="stage-frame-bar"><span>Now playing</span><span>Mystery track</span></div>
    <div className="playback aspect-video">
      <iframe title="Current song" className="h-full w-full" src={`https://www.youtube.com/embed/${submission.videoId}`} allow="autoplay; encrypted-media" />
    </div>
  </div>;
}

function ListeningScreen({ game, submission, message, persistenceError, scores, phaseLabel, onOpenVoting, onSkip, onEnd, confirmEnd, setConfirmEnd }: {
  game: Game; submission: Submission; message: string; persistenceError: string; scores: ScoreEntry[]; phaseLabel: string;
  onOpenVoting: () => void; onSkip: () => void; onEnd: () => void; confirmEnd: boolean; setConfirmEnd: (value: boolean) => void;
}) {
  return <section className="game-screen listening-screen">
    <div className="sheet stage-sheet">
      {persistenceError ? <p role="alert" className="game-error">{persistenceError}</p> : null}
      <RoundStepper active="listening" />
      <div className="stage-topline"><p className="round-marker">Round {game.activeRoundIndex + 1} <span>of {game.rounds.length}</span></p><span className="phase-chip phase-listening">{phaseLabel}</span></div>
      <div className="listen-heading"><h2 className="stage-title">Press play.<br /><em>Keep a straight face.</em></h2><Disc3 className="record-emblem" size={64} aria-hidden="true" /></div>
      <p className="stage-lede">One song. One secret owner. Let everyone listen before opening the vote.</p>
      <StageFrame submission={submission} />
      <p role="status" className="stage-status-copy">{message}</p>
      <div className="stage-actions"><a href={`https://www.youtube.com/watch?v=${submission.videoId}`} target="_blank" rel="noreferrer" className="button">Open playback</a><button type="button" onClick={onOpenVoting} className="button primary">Open voting <ArrowRight size={18} aria-hidden="true" /></button><button type="button" onClick={onSkip} className="button danger-button">Skip round</button></div>
    </div>
    <ScoreStrip scores={scores} />
    <GameEndControl onEnd={onEnd} confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd} />
  </section>;
}

function VotingScreen({ game, round, scores, voteCount, allVoted, onVote, onReveal, onEnd, confirmEnd, setConfirmEnd }: {
  game: Game; round: Round; scores: ScoreEntry[]; voteCount: number; allVoted: boolean;
  onVote: (voterId: string, ownerId: string) => void; onReveal: () => void; onEnd: () => void; confirmEnd: boolean; setConfirmEnd: (value: boolean) => void;
}) {
  const orderedVoters = voteOrder(game);
  return <section className="game-screen voting-screen">
    <div className="sheet vote-sheet">
      <RoundStepper active="voting" />
      <p className="round-number">Round {game.activeRoundIndex + 1} / {game.rounds.length}</p><h2 className="screen-title">Who picked<br /><em>the song?</em></h2>
      <p className="screen-lede">Record everyone’s guess. Change any choice until the reveal.</p>
      <div className="vote-meter" role="status" aria-label={`${voteCount} of ${game.players.length} votes recorded`}><strong>{voteCount}<span>/{game.players.length}</span></strong><div><span>Votes recorded</span><div className="vote-dots" aria-hidden="true">{game.players.map((player) => <i key={player.id} className={round.votes[player.id] ? "filled" : ""} />)}</div></div></div>
      <div className="vote-board">
        {orderedVoters.map((voter) => <fieldset key={voter.id} className="vote-row" data-voter-id={voter.id}>
          <legend><span>{voter.name}&apos;s guess</span><span className="vote-choice-state">{round.votes[voter.id] ? "Selected" : "Choose one"}</span></legend>
          <div className="vote-options mt-2">{game.players.filter((player) => player.id !== voter.id).map((candidate) => <button key={candidate.id} type="button" className={`vote-option${round.votes[voter.id] === candidate.id ? " selected" : ""}`} aria-label={`${voter.name} votes for ${candidate.name}`} aria-pressed={round.votes[voter.id] === candidate.id} onClick={() => onVote(voter.id, candidate.id)}>{candidate.name}{round.votes[voter.id] === candidate.id ? <Check size={16} aria-hidden="true" /> : null}</button>)}</div>
        </fieldset>)}
      </div>
      <button type="button" disabled={!allVoted} onClick={onReveal} aria-describedby="reveal-help" className="button primary reveal-button">Reveal song owner <ArrowRight size={18} aria-hidden="true" /></button>
      <p id="reveal-help" className="reveal-help">{allVoted ? "All guesses are in. Ready for the truth?" : `${game.players.length - voteCount} more ${game.players.length - voteCount === 1 ? "guess" : "guesses"} before the reveal.`}</p>
    </div>
    <ScoreStrip scores={scores} />
    <GameEndControl onEnd={onEnd} confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd} />
  </section>;
}

function ResultScreen({ game, round, owner, scores, onNext, onEnd, confirmEnd, setConfirmEnd }: {
  game: Game; round: Round; owner?: Player; scores: ScoreEntry[]; onNext: () => void; onEnd: () => void; confirmEnd: boolean; setConfirmEnd: (value: boolean) => void;
}) {
  const revealed = round.phase === "revealed";
  return <section className="game-screen result-screen">
    <div className="sheet result-sheet">
      <RoundStepper active="result" />
      <p className="round-number">Round {game.activeRoundIndex + 1} / {game.rounds.length}</p>
      <div className={`result-stamp ${revealed ? "success" : "skipped"}`}>{revealed ? "REVEALED" : "SKIPPED"}</div>
      <h2 className="screen-title">{revealed ? `${owner?.name ?? "Someone"} brought this song.` : "No points this round."}</h2>
      <p className="screen-lede">{revealed ? "The room has its answer. Check the scores, then move to the next mystery track." : "Move on when the room is ready."}</p>
      {round.result?.kind === "revealed" ? <ul className="round-awards" aria-label="Points this round">{Object.entries(round.result.awards).map(([id, points]) => <li key={id}><span>{game.players.find((player) => player.id === id)?.name}</span><strong>+{points}</strong></li>)}</ul> : null}
      <button type="button" onClick={onNext} className="button primary next-round-button">{game.activeRoundIndex + 1 === game.rounds.length ? "Show final standings" : "Next round"}</button>
    </div>
    <ScoreStrip scores={scores} />
    <GameEndControl onEnd={onEnd} confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd} />
  </section>;
}

function GameFeedback({ error, message }: { error: string; message: string }) {
  return <>{error ? <p role="alert" className="game-error game-feedback">{error}</p> : null}<p role="status" className="sr-only">{message}</p></>;
}

function FinalStandings({ game, scores, onNew }: { game: Game; scores: ScoreEntry[]; onNew: () => void }) {
  const topScore = scores[0]?.score ?? 0;
  const winners = topScore > 0 ? scores.filter((player) => player.score === topScore) : [];
  const revealedCount = game.rounds.filter((round) => round.phase === "revealed").length;
  return <section className="final-screen" aria-labelledby="final-title">
    <div className="final-banner">
      {winners.length > 0 ? <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 6) * 90}ms` }} />)}</div> : null}
      <div className="trophy-seal" aria-hidden="true"><Trophy size={48} /></div>
      <h2 id="final-title">Final standings</h2>
      <p className="winner-name">{winners.length ? winners.map((player) => player.name).join(" & ") : "An encore?"}</p>
      <p className="winner-line">{winners.length ? `${winners.length === 1 ? "Takes the crown" : "Share the crown"}. ${topScore} points.` : "No points yet. The next playlist is waiting."}</p>
      <div className="final-stamp">{game.endedEarly ? "Called it a night" : "That's a wrap"}</div>
    </div>
    <div className="final-ledger">
      <div className="final-ledger-heading"><h3>The score sheet</h3><span>{revealedCount} / {game.rounds.length} rounds scored</span></div>
      {game.endedEarly ? <p className="final-note">Game ended early. Only revealed rounds count.</p> : null}
      <ol className="final-ranks">
        {scores.map((player) => <li key={player.id} className={player.score > 0 && player.score === topScore ? "winner-row" : ""}>
          <span className="final-rank" aria-label={`Rank ${scores.findIndex((entry) => entry.score === player.score) + 1}`}>{scores.findIndex((entry) => entry.score === player.score) + 1}</span>
          <span className="final-player">{player.name}</span><strong>{player.score}<small>pts</small></strong>
        </li>)}
      </ol>
      <button type="button" onClick={onNew} className="button primary">New game <ArrowRight size={20} aria-hidden="true" /></button>
    </div>
  </section>;
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
