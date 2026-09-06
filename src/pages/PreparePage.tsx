import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Video } from "lucide-react";
import { createSongSlip, encodeSongSlip } from "../lib/songSlip";
import { normalizeYouTubeLink } from "../lib/youtube";

type LinkRow = { value: string };

export function PreparePage() {
  const [playerName, setPlayerName] = useState("Asha");
  const [theme, setTheme] = useState("Monsoon night");
  const [links, setLinks] = useState<LinkRow[]>([{ value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }]);
  const [generatedSlip, setGeneratedSlip] = useState<string>("");
  const [message, setMessage] = useState("Enter songs, then generate a local song slip.");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="sheet">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="round-marker">Player · Step 1 of 1</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#18211f]">Prepare songs for the host</h2>
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
