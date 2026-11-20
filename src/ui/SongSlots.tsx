import { AlertCircle, Check, ClipboardPaste, Loader } from "lucide-react";
import type { Slots } from "../lib/slots";
import { useVideoChecks } from "../lib/useVideoChecks";
import type { VideoCheck } from "../lib/youtube";

type SlotStatus = { tone: "ok" | "warn" | "info" | "none"; text: string };

function slotStatus(link: string, videoId: string | null, firstCopy: number, check: VideoCheck | undefined): SlotStatus {
  if (!link.trim()) return { tone: "none", text: "" };
  if (!videoId) return { tone: "warn", text: "That doesn't look like a YouTube link." };
  if (firstCopy >= 0) return { tone: "warn", text: `Same song as song ${firstCopy + 1}. Pick a different one.` };
  if (!check) return { tone: "info", text: "Checking it plays…" };
  if (check.status === "ok") return { tone: "ok", text: check.title };
  if (check.status === "blocked") return { tone: "warn", text: "YouTube says this one won't play inside KaarGaan. Try another upload of the song." };
  if (check.status === "missing") return { tone: "warn", text: "YouTube can't find this video. It may be private or removed." };
  return { tone: "info", text: "Link looks right. It gets one more check at game time." };
}

/** One input per song, each checked against YouTube as it's pasted. */
export function SongSlots({ links, slots, onChange }: { links: string[]; slots: Slots; onChange: (links: string[]) => void }) {
  const checks = useVideoChecks(slots.videoIds.filter((id): id is string => Boolean(id)));
  const canPaste = typeof navigator.clipboard?.readText === "function";
  const setLink = (index: number, value: string) => onChange(links.map((link, i) => (i === index ? value : link)));

  async function paste(index: number) {
    try { setLink(index, (await navigator.clipboard.readText()).trim()); } catch { /* the player can still paste by hand */ }
  }

  return links.map((link, i) => {
    const videoId = slots.videoIds[i];
    const status = slotStatus(link, videoId, slots.firstCopy[i], videoId ? checks.get(videoId) : undefined);
    const Icon = status.tone === "ok" ? Check : status.tone === "warn" ? AlertCircle : Loader;
    return <div className="kg-slot" key={i}>
      <label className="kg-label" htmlFor={`song-${i}`}>Song {i + 1}<span className="sr-only"> link</span></label>
      <div className="kg-input-row">
        <input id={`song-${i}`} className="kg-input" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={link} placeholder="Paste a YouTube link" aria-describedby={`song-${i}-status`} onChange={(e) => setLink(i, e.target.value)} />
        {canPaste ? <button type="button" className="kg-btn kg-btn--icon kg-btn--yellow" aria-label={`Paste song ${i + 1} from clipboard`} onClick={() => void paste(i)}><ClipboardPaste size={20} aria-hidden="true" /></button> : null}
      </div>
      <p id={`song-${i}-status`} className={`kg-status kg-status--${status.tone}`} aria-live="polite">
        {status.text ? <><Icon size={16} aria-hidden="true" />{status.text}</> : null}
      </p>
    </div>;
  });
}
