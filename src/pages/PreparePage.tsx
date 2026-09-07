import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";
import { qrScanRegion } from "../lib/qrScanRegion";
import { AlertCircle, Check, Copy, Download, ScanLine, Video } from "lucide-react";
import { createSongSlip, decodeRoomInvite, encodeEncryptedSongSlip } from "../lib/songSlip";
import { normalizeYouTubeLink } from "../lib/youtube";
import { RoomSubheader } from "../components/RoomBadge";
import { loadPlayerDraft, PLAYER_DRAFT_KEY, saveDraft, useDraftStatus } from "../lib/setupDraft";
import type { RoomInvite } from "../lib/types";

type LinkRow = { value: string };
const qrScannerWorkerPath = new URL("qr-scanner/qr-scanner-worker.min.js", import.meta.url).toString();
QrScanner.WORKER_PATH = qrScannerWorkerPath;

export function PreparePage() {
  const [restored] = useState(loadPlayerDraft);
  const [playerName, setPlayerName] = useState(restored?.playerName ?? "");
  const [theme, setTheme] = useState(restored?.invite.theme ?? "");
  const [links, setLinks] = useState<LinkRow[]>(restored?.links ?? []);
  const [invite, setInvite] = useState<RoomInvite | null>(restored?.invite ?? null);
  const [invitePayload, setInvitePayload] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "scanning">("idle");
  const [generatedSlip, setGeneratedSlip] = useState<string>("");
  const [message, setMessage] = useState(restored ? "Songs restored. Generate a fresh QR or code when ready." : "Scan the room QR to get the song count.");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const generation = useRef(0);
  const [generating, setGenerating] = useState(false);
  const [changingRoom, setChangingRoom] = useState(false);
  const saveError = useDraftStatus(PLAYER_DRAFT_KEY);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    if (invite) saveDraft(PLAYER_DRAFT_KEY, { version: 1, invite, playerName, links });
  }, [invite, playerName, links]);

  function invalidateEntry() {
    generation.current += 1;
    setGeneratedSlip("");
    setQrDataUrl("");
    setGenerating(false);
    setMessage("Entry changed. Generate a fresh QR or code before sharing.");
  }

  const normalizedLinks = useMemo(
    () =>
      links.map(({ value }) => {
        const check = normalizeYouTubeLink(value);
        return check.ok ? check : null;
      }),
    [links]
  );
  const duplicateOf = useMemo(() => {
    const firstByVideoId = new Map<string, number>();
    const duplicates = new Map<number, number>();
    normalizedLinks.forEach((check, index) => {
      if (!check) return;
      const firstIndex = firstByVideoId.get(check.videoId);
      if (firstIndex !== undefined) {
        duplicates.set(index, firstIndex);
        duplicates.set(firstIndex, index);
      } else {
        firstByVideoId.set(check.videoId, index);
      }
    });
    return duplicates;
  }, [normalizedLinks]);

  const canGenerate = Boolean(
    playerName.trim() &&
    links.length === invite?.songsPerPlayer &&
    normalizedLinks.every(Boolean) &&
    duplicateOf.size === 0
  );

  useEffect(() => {
    let active = true;
    if (!generatedSlip) {
      return;
    }
    QRCode.toDataURL(generatedSlip, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 8,
      color: {
        dark: "#0f172a",
        light: "#f8fafc"
      }
    })
      .then((dataUrl: string) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Unable to generate QR code.");
        }
      });

    return () => {
      active = false;
    };
  }, [generatedSlip]);

  useEffect(() => () => {
    generation.current += 1;
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  function acceptInvite(payload: string) {
    const result = decodeRoomInvite(payload);
    if (!result.ok) {
      setInviteError(result.error);
      return false;
    }
    invalidateEntry();
    const sameRoom = invite?.roomId === result.invite.roomId && invite?.roomToken === result.invite.roomToken && invite?.songsPerPlayer === result.invite.songsPerPlayer;
    setChangingRoom(false);
    setInvite(result.invite);
    setTheme(result.invite.theme);
    if (!sameRoom) setLinks(Array.from({ length: result.invite.songsPerPlayer }, () => ({ value: "" })));
    setInvitePayload("");
    setInviteError("");
    setMessage(`Room ready. Add ${result.invite.songsPerPlayer} different songs, then show your QR to the host.`);
    return true;
  }

  async function copyGeneratedSlip() {
    try {
      await navigator.clipboard.writeText(generatedSlip);
      setMessage("Encrypted entry copied. Paste it into Discord or send it to the host.");
    } catch {
      setMessage("Copy is unavailable here. Open the text below and copy it manually.");
    }
  }

  if (!invite || changingRoom) {
    return (
      <>
      {invite ? <RoomSubheader roomId={invite.roomId} /> : null}
      <section className="mx-auto max-w-xl sheet player-join">
        <p className="round-marker">Player · Step 1 of 2</p>
        <div className="mt-2 flex items-start gap-4">
          <div>
            <h2 className="text-3xl font-semibold text-[#18211f]">Join the room</h2>
            <p className="mt-3 text-sm leading-7 text-[#18211f]">
              Scan the QR on the host&apos;s phone. It only shares the room theme and how many songs to add.
            </p>
          </div>
          <div className="scan-icon" aria-hidden="true"><ScanLine size={26} /></div>
        </div>
        <div className="join-instruction mt-6">
          <span className="join-step-number">1</span>
          <div><strong>Ask the host to show the room QR</strong><span>Keep your phone on this screen.</span></div>
        </div>
        <div className={`qr-scan-panel mt-5${inviteState !== "scanning" ? " qr-scan-panel-hidden" : ""}`}>
            <div className="qr-scan-frame">
              <video ref={videoRef} className="qr-camera" muted playsInline />
            </div>
            <p className="mt-3 text-center text-sm text-[#536056]">Hold the QR inside the square. Move closer until it fills most of the frame.</p>
            {inviteState === "scanning" ? <button type="button" onClick={stopInviteScanner} className="mt-4 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm font-semibold text-[#18211f]">
              Stop scanning
            </button> : null}
        </div>
        {inviteState !== "scanning" ? (
          <button type="button" onClick={() => void startInviteScanner()} className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-[#ef7657] action px-4 py-3 text-sm font-semibold text-[#18211f]">
            <ScanLine size={19} aria-hidden="true" />
            Scan host QR
          </button>
        ) : null}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-[#18211f]">Can&apos;t use the camera? Paste the invite</summary>
          <textarea value={invitePayload} onChange={(event) => setInvitePayload(event.target.value)} placeholder="Paste the room invite payload" className="mt-3 min-h-28 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 text-sm text-[#18211f]" />
          <button type="button" onClick={() => acceptInvite(invitePayload)} className="mt-3 rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f]">Use invite</button>
        </details>
        {inviteError ? <p role="alert" className="mt-3 text-sm text-[#922c22]">{inviteError}</p> : null}
        {invite ? <button type="button" className="button mt-4" onClick={() => { stopInviteScanner(); setChangingRoom(false); }}>Back to my songs</button> : null}
      </section>
      </>
    );
  }

  return (
    <>
    <RoomSubheader roomId={invite.roomId} />
    <section className="mx-auto max-w-2xl">
      <div className="sheet">
        {saveError ? <p role="alert" className="game-error">{saveError}</p> : null}
        <div className="player-room-tools"><span>{restored ? "Your songs are restored on this phone." : "Your progress stays on this phone."}</span><button type="button" className="button" onClick={() => setChangingRoom(true)}>Join another room</button></div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="round-marker">Player · Step 2 of 2</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#18211f]">Prepare songs for the host</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#18211f]">Add exactly {invite.songsPerPlayer} different songs, then show one QR to the host.</p>
          </div>
          <div className="rounded-md border border-[#7b846f] bg-[#c7d2ed] p-3 text-[#18211f]">
            <Video className="h-5 w-5" />
          </div>
        </div>

        <div className="room-summary mt-6" aria-label="Room settings">
          <div><span>Theme</span><strong>{theme}</strong></div>
          <div><span>Your songs</span><strong>{invite.songsPerPlayer}</strong></div>
          <div><span>Players</span><strong>{invite.playerCount}</strong></div>
        </div>

        <div className="mt-7 space-y-3">
          <Field label="Your name" value={playerName} onChange={(value) => { invalidateEntry(); setPlayerName(value); }} />
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-normal text-[#18211f]">Your songs</h3>
            <span className="text-xs text-[#536056]">{normalizedLinks.filter(Boolean).length}/{invite.songsPerPlayer} ready</span>
          </div>
          <div className="space-y-3">
            {links.map((link, index) => (
              <div key={index} className={`song-entry${duplicateOf.has(index) ? " has-error" : normalizedLinks[index] ? " is-valid" : ""}`}>
                <label className="song-entry-label" htmlFor={`song-${index}`}>
                  <span>Song {index + 1}</span>
                  {normalizedLinks[index] && !duplicateOf.has(index) ? <Check size={15} aria-hidden="true" /> : null}
                </label>
                <input
                  id={`song-${index}`}
                  value={link.value}
                  onChange={(event) => {
                    invalidateEntry();
                    setLinks((current) => current.map((item, itemIndex) => (itemIndex === index ? { value: event.target.value } : item)));
                  }}
                  placeholder="Paste a YouTube or YouTube Music link"
                  className="control"
                />
                <div className="song-entry-status" role="status">
                  {duplicateOf.has(index) ? <><AlertCircle size={14} aria-hidden="true" /> Same as Song {(duplicateOf.get(index) ?? 0) + 1}. Replace one of these links.</> : normalizedLinks[index] ? <><Check size={14} aria-hidden="true" /> Link looks good</> : link.value ? "Use a valid YouTube link" : "Add a link"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              invalidateEntry();
              const request = generation.current;
              setGenerating(true);
              const result = createSongSlip({
                playerName,
                theme,
                links: links.map((item) => item.value),
                roomId: invite.roomId,
                roomToken: invite.roomToken,
                songsPerPlayer: invite.songsPerPlayer
              });
              if (!result.ok) {
                setGenerating(false);
                setMessage(result.error);
                setGeneratedSlip("");
                return;
              }
              try {
                const encoded = await encodeEncryptedSongSlip(result.slip, `${invite.roomId}:${invite.roomToken}`);
                if (request !== generation.current) return;
                setGeneratedSlip(encoded);
                setQrDataUrl("");
                setMessage(`Created an encrypted ${result.slip.videoIds.length}-song entry for ${result.slip.playerName}.`);
              } catch (caught) {
                if (request !== generation.current) return;
                setGeneratedSlip("");
                setMessage(caught instanceof Error ? caught.message : "Unable to encrypt the song entry.");
              } finally {
                if (request === generation.current) setGenerating(false);
              }
            }}
            disabled={!canGenerate || generating}
            className="inline-flex items-center gap-2 rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-medium text-[#18211f] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download className="h-4 w-4" />
            {generating ? "Generating fresh entry…" : "Generate submission QR"}
          </button>
          <span role="status" className="self-center text-sm text-[#536056]">{message}</span>
        </div>
        {!canGenerate ? <p className="mt-3 text-xs text-[#536056]">Add your name and {invite.songsPerPlayer} different YouTube links to continue.</p> : null}

        {generatedSlip ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="rounded-[1.5rem] border border-[#7b846f] bg-[#faf8f0] p-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Generated encrypted song entry QR code"
                  className="h-56 w-56 rounded-md bg-white"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-md bg-slate-100 text-[#536056]">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="rounded-[1.5rem] border border-[#7b846f] bg-[#faf8f0] p-4">
              <h3 className="text-base font-semibold text-[#18211f]">Show QR or share the encrypted entry</h3>
              <p className="mt-2 text-sm leading-6 text-[#18211f]">
                In the room, the host scans this QR. On Discord, copy the encrypted entry and send it in the chat; the host pastes it into the import box.
              </p>
              <button type="button" onClick={() => void copyGeneratedSlip()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#c7d2ed] action px-4 py-2 text-sm font-semibold text-[#18211f]">
                <Copy size={15} aria-hidden="true" />
                Copy encrypted entry
              </button>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-[#536056]">Show the encrypted text</summary>
                <textarea readOnly value={generatedSlip} aria-label="Encrypted song entry" className="mt-3 min-h-28 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 text-xs leading-5 text-[#18211f]" />
              </details>
            </div>
          </div>
        ) : null}
      </div>
    </section>
    </>
  );

  async function startInviteScanner() {
    if (!videoRef.current) {
      setInviteError("Camera preview is not ready yet.");
      return;
    }
    setInviteError("");
    setInviteState("scanning");
    scannerRef.current?.destroy();
    try {
      const scanner = new QrScanner(videoRef.current, (result) => {
        if (acceptInvite(result.data)) stopInviteScanner();
      }, { highlightScanRegion: true, calculateScanRegion: qrScanRegion, preferredCamera: "environment" });
      scannerRef.current = scanner;
      await scanner.start();
    } catch (caught) {
      setInviteState("idle");
      setInviteError(caught instanceof Error ? caught.message : "Camera access is unavailable.");
    }
  }

  function stopInviteScanner() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setInviteState("idle");
  }
}

function Field({
  label,
  value,
  onChange,
  disabled
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
        className="w-full rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm text-[#18211f] outline-none placeholder:text-slate-500 focus:border-amber-300/50"
      />
    </label>
  );
}
