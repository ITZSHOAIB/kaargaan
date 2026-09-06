import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";
import { Download, Link2, ScanSearch, Upload, Video } from "lucide-react";
import { createSongSlip, decodeSongSlip, encodeSongSlip } from "../lib/songSlip";
import { canonicalEmbedUrl, normalizeYouTubeLink } from "../lib/youtube";

type LinkRow = { value: string };
const qrScannerWorkerPath = new URL("qr-scanner/qr-scanner-worker.min.js", import.meta.url).toString();
QrScanner.WORKER_PATH = qrScannerWorkerPath;

export function PreparePage() {
  const [playerName, setPlayerName] = useState("Asha");
  const [theme, setTheme] = useState("Monsoon night");
  const [links, setLinks] = useState<LinkRow[]>([{ value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }]);
  const [generatedSlip, setGeneratedSlip] = useState<string>("");
  const [message, setMessage] = useState("Enter songs, then generate a local song slip.");
  const [scanResult, setScanResult] = useState<string>("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "blocked">("idle");
  const [scanError, setScanError] = useState<string>("");
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

  useEffect(() => {
    return () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  const slip = useMemo(() => {
    const result = createSongSlip({
      playerName,
      theme,
      links: links.map((item) => item.value)
    });
    return result.ok ? result.slip : null;
  }, [links, playerName, theme]);

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="sheet">
        <div className="flex items-start justify-between gap-4">
          <div>
            
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#18211f]">Create a local song slip</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#18211f]">
              Keep this on the personal phone, then hand the game phone to the player for import.
              The payload stays local and compact.
            </p>
          </div>
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-[#18211f]">
            <Video className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Player name" value={playerName} onChange={setPlayerName} />
          <Field label="Theme" value={theme} onChange={setTheme} />
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-normal text-[#18211f]">Song links</h3>
            <button
              type="button"
              onClick={() => setLinks((current) => [...current, { value: "" }])}
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
                links: links.map((item) => item.value)
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
            Generate QR payload
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
              <h3 className="text-sm font-semibold uppercase tracking-normal text-[#18211f]">
                QR payload
              </h3>
              <pre className="mt-3 overflow-x-auto rounded-md bg-[#faf8f0] p-4 text-xs leading-6 text-[#18211f]">
                {generatedSlip}
              </pre>
              <p className="mt-3 text-sm text-[#18211f]">
                The payload stays local. Use the shared phone to scan it directly, or import it with
                the text field below.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="space-y-5">
        <Panel title="Scan or import a slip" icon={ScanSearch}>
          <div className="space-y-3">
            <video
              ref={videoRef}
              className="aspect-video w-full rounded-md border border-[#7b846f] bg-black"
              muted
              playsInline
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startScanner()}
                className="rounded-md bg-[#c7d2ed] action px-4 py-2 text-sm font-medium text-[#18211f] transition hover:brightness-95"
              >
                Start camera scan
              </button>
              <button
                type="button"
                onClick={() => stopScanner()}
                className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f] transition hover:brightness-95"
              >
                Stop scan
              </button>
            </div>
            <textarea
              value={scanResult}
              onChange={(event) => setScanResult(event.target.value)}
              placeholder="Paste a QR payload here if camera access is denied."
              className="min-h-28 w-full rounded-md border border-[#7b846f] bg-[#faf8f0] p-3 text-sm text-[#18211f] outline-none placeholder:text-slate-500 focus:border-amber-300/50"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const decoded = decodeSongSlip(scanResult);
                  if (!decoded.ok) {
                    setScanError(decoded.error);
                    return;
                  }
                  setScanError("");
                  setMessage(`Imported ${decoded.slip.videoIds.length} songs for ${decoded.slip.playerName}.`);
                  setScanResult(JSON.stringify(decoded.slip, null, 2));
                }}
                className="rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-2 text-sm text-[#18211f] transition hover:brightness-95"
              >
                Import payload
              </button>
            </div>
            {scanState === "blocked" ? (
              <p className="text-sm text-[#18211f]">{scanError || "Camera permission denied. Use paste import."}</p>
            ) : null}
            {scanError ? <p className="text-sm text-[#922c22]">{scanError}</p> : null}
          </div>
        </Panel>

        <Panel title="Playback check" icon={Link2}>
          <div className="space-y-3 text-sm text-[#18211f]">
            {slip ? (
              <>
                <p>
                  The first submission can be played with a visible YouTube embed URL. The app keeps
                  the explicit play action on the page instead of trying to autoplay.
                </p>
                <a
                  href={canonicalEmbedUrl(slip.videoIds[0])}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#ef7657] action px-4 py-2 text-sm font-medium text-[#18211f] transition hover:brightness-95"
                >
                  Open embed URL
                  <Upload className="h-4 w-4" />
                </a>
              </>
            ) : (
              <p>Add at least one valid YouTube link to unlock the playback check.</p>
            )}
          </div>
        </Panel>
      </aside>
    </section>
  );

  async function startScanner() {
    if (!videoRef.current) {
      setScanError("Camera preview is not ready yet.");
      return;
    }

    setScanError("");
    setScanState("scanning");
    scannerRef.current?.destroy();
    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          setScanResult(result.data);
          const decoded = decodeSongSlip(result.data);
          setScanState("idle");
          if (decoded.ok) {
            setMessage(`Scanned slip for ${decoded.slip.playerName}.`);
            setScanError("");
          } else {
            setScanError(decoded.error);
          }
          scanner.stop();
        },
        {
          highlightScanRegion: true,
          preferredCamera: "environment"
        }
      );
      scannerRef.current = scanner;
      await scanner.start();
    } catch (error) {
      setScanState("blocked");
      setScanError(error instanceof Error ? error.message : "Camera access is unavailable.");
    }
  }

  function stopScanner() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setScanState("idle");
  }
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs uppercase tracking-normal text-[#536056]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[#7b846f] bg-[#faf8f0] px-4 py-3 text-sm text-[#18211f] outline-none placeholder:text-slate-500 focus:border-amber-300/50"
      />
    </label>
  );
}

function Panel({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="sheet">
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-[#7b846f] bg-[#faf8f0] p-2">
          <Icon className="h-4 w-4 text-[#18211f]" />
        </div>
        <h3 className="text-base font-semibold text-[#18211f]">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
