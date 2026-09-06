import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";
import { Download, Video } from "lucide-react";
import { createSongSlip, decodeRoomInvite, encodeSongSlip } from "../lib/songSlip";
import { normalizeYouTubeLink } from "../lib/youtube";
import type { RoomInvite } from "../lib/types";

type LinkRow = { value: string };
const qrScannerWorkerPath = new URL("qr-scanner/qr-scanner-worker.min.js", import.meta.url).toString();
QrScanner.WORKER_PATH = qrScannerWorkerPath;

export function PreparePage() {
  const [playerName, setPlayerName] = useState("");
  const [theme, setTheme] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [invitePayload, setInvitePayload] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "scanning">("idle");
  const [generatedSlip, setGeneratedSlip] = useState<string>("");
  const [message, setMessage] = useState("Enter songs, then generate a local song slip.");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const normalizedLinks = useMemo(
    () =>
      links.map(({ value }) => {
        const check = normalizeYouTubeLink(value);
        return check.ok ? check : null;
      }),
    [links]
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
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  function acceptInvite(payload: string) {
    const result = decodeRoomInvite(payload);
    if (!result.ok) {
      setInviteError(result.error);
      return false;
    }
    setInvite(result.invite);
    setTheme(result.invite.theme);
    setLinks(Array.from({ length: result.invite.songsPerPlayer }, () => ({ value: "" })));
    setInvitePayload("");
    setInviteError("");
    setMessage(`Room ready: add ${result.invite.songsPerPlayer} songs, then show the QR to the host.`);
    return true;
  }

  if (!invite) {
    return (
      <section className="mx-auto max-w-2xl sheet">
        <p className="round-marker">Player · Step 1 of 2</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#18211f]">Scan the host&apos;s room QR</h2>
        <p className="mt-3 text-sm leading-7 text-[#18211f]">
          Ask the host to show the room QR. Scan it here on your own phone. It will fill in the theme and song count for you.
        </p>
        <video ref={videoRef} className="mt-6 aspect-video w-full rounded-md border border-[#7b846f] bg-black" muted playsInline />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => void startInviteScanner()} className="rounded-md bg-[#ef7657] action px-4 py-3 text-sm font-semibold text-[#18211f]">
            Scan host QR
          </button>
          <button type="button" onClick={() => stopInviteScanner()} className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm text-[#18211f]">
            Stop camera
          </button>
        </div>
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-[#18211f]">Can&apos;t use the camera? Paste the invite</summary>
          <textarea value={invitePayload} onChange={(event) => setInvitePayload(event.target.value)} placeholder="Paste the room invite payload" className="mt-3 min-h-28 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 text-sm text-[#18211f]" />
          <button type="button" onClick={() => acceptInvite(invitePayload)} className="mt-3 rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f]">Use invite</button>
        </details>
        {inviteState === "scanning" ? <p className="mt-3 text-sm text-[#536056]">Scanning…</p> : null}
        {inviteError ? <p className="mt-3 text-sm text-[#922c22]">{inviteError}</p> : null}
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="sheet">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="round-marker">Player · Step 2 of 2</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#18211f]">Prepare songs for the host</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#18211f]">
              Add your songs, then show the generated QR to the host.
            </p>
          </div>
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-[#18211f]">
            <Video className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Your name" value={playerName} onChange={setPlayerName} />
          <Field label="Room theme" value={theme} onChange={setTheme} disabled />
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-normal text-[#18211f]">Song links</h3>
            <button
              type="button"
              onClick={() => setLinks((current) => current.length >= invite.songsPerPlayer ? current : [...current, { value: "" }])}
              disabled={links.length >= invite.songsPerPlayer}
              className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-3 py-1.5 text-xs text-[#18211f] transition hover:brightness-95"
            >
              Add song
            </button>
          </div>
          <div className="space-y-3">
            {links.map((link, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 sm:flex-row sm:items-center">
                <input
                  value={link.value}
                  onChange={(event) =>
                    setLinks((current) => current.map((item, itemIndex) => (itemIndex === index ? { value: event.target.value } : item)))
                  }
                  placeholder="https://music.youtube.com/watch?v=..."
                  className="min-w-0 flex-1 rounded-xl border border-[#7b846f] bg-[#faf8f0] px-3 py-2 text-sm text-[#18211f] outline-none placeholder:text-slate-500 focus:border-amber-300/50"
                />
                <div className="flex items-center gap-2 text-xs text-[#536056]">
                  {normalizedLinks[index] ? (
                    <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[#18211f]">
                      {normalizedLinks[index].videoId}
                    </span>
                  ) : (
                    <span>Waiting for a valid link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const result = createSongSlip({
                playerName,
                theme,
                links: links.map((item) => item.value),
                roomId: invite.roomId,
                roomToken: invite.roomToken,
                songsPerPlayer: invite.songsPerPlayer
              });
              if (!result.ok) {
                setMessage(result.error);
                setGeneratedSlip("");
                return;
              }
              const encoded = encodeSongSlip(result.slip);
              setGeneratedSlip(encoded);
              setQrDataUrl("");
              setMessage(`Created a ${result.slip.videoIds.length}-song slip for ${result.slip.playerName}.`);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-[#ef7657] action px-5 py-3 text-sm font-medium text-[#18211f] transition hover:brightness-95"
          >
            <Download className="h-4 w-4" />
            Generate submission QR
          </button>
          <span className="self-center text-sm text-[#18211f]">{message}</span>
        </div>

        {generatedSlip ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="rounded-[1.5rem] border border-[#7b846f] bg-[#faf8f0] p-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Generated song slip QR code"
                  className="h-56 w-56 rounded-md bg-white"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-md bg-slate-100 text-[#536056]">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="rounded-[1.5rem] border border-[#7b846f] bg-[#faf8f0] p-4">
              <h3 className="text-base font-semibold text-[#18211f]">Show this QR to the host</h3>
              <p className="mt-2 text-sm leading-6 text-[#18211f]">
                Keep this screen open. The host scans this QR from the host phone when it is your turn.
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-[#536056]">Need a paste fallback?</summary>
                <pre className="mt-3 overflow-x-auto rounded-md bg-[#faf8f0] p-4 text-xs leading-6 text-[#18211f]">
                  {generatedSlip}
                </pre>
              </details>
            </div>
          </div>
        ) : null}
      </div>
    </section>
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
      }, { highlightScanRegion: true, preferredCamera: "environment" });
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
