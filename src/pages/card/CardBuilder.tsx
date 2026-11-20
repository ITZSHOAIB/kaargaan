import { useState } from "react";
import { AlertCircle, Check, ClipboardPaste, Loader } from "lucide-react";
import { cleanName, MAX_NAME_LENGTH, plural, sealCard } from "../../lib/card";
import type { CardDraft } from "../../lib/cardDraft";
import { useVideoChecks } from "../../lib/useVideoChecks";
import { normalizeYouTubeLink, type VideoCheck } from "../../lib/youtube";

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

export function CardBuilder({ draft, onChange }: { draft: CardDraft; onChange: (draft: CardDraft) => void }) {
  const { invite } = draft;
  const [sealing, setSealing] = useState(false);
  const videoIds = draft.links.map((link) => { const r = normalizeYouTubeLink(link); return r.ok ? r.videoId : null; });
  const checks = useVideoChecks(videoIds.filter((id): id is string => Boolean(id)));
  // For each slot, the earlier slot holding the same song, or -1.
  const firstCopy = videoIds.map((id, i) => { const first = id ? videoIds.indexOf(id) : -1; return first < i ? first : -1; });
  const name = cleanName(draft.name);
  const ready = Boolean(name) && videoIds.every(Boolean) && firstCopy.every((f) => f < 0);
  const canPaste = typeof navigator.clipboard?.readText === "function";

  const setLink = (index: number, value: string) => onChange({ ...draft, links: draft.links.map((link, i) => (i === index ? value : link)) });

  async function paste(index: number) {
    try { setLink(index, (await navigator.clipboard.readText()).trim()); } catch { /* the player can still paste by hand */ }
  }

  async function seal() {
    setSealing(true);
    try {
      const sealed = await sealCard({ v: 2, roomId: invite.roomId, playerKey: draft.playerKey, name, videoIds: videoIds as string[] }, invite);
      onChange({ ...draft, name, sealed });
    } finally {
      setSealing(false);
    }
  }

  return <>
    <div>
      <p className="kg-eyebrow">{invite.theme}</p>
      <h1 className="kg-title">Make your song card</h1>
      <p className="kg-lede">{invite.host}'s game · {plural(invite.songs, "song")} each</p>
    </div>
    <section className="kg-panel" aria-label="Your card">
      <label className="kg-field">
        <span className="kg-label">Your name</span>
        <input className="kg-input" value={draft.name} maxLength={MAX_NAME_LENGTH + 10} autoComplete="given-name" onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="What the room calls you" />
      </label>
      <p className="kg-small">Pick songs that say something about you, or throw everyone off. Only you see them.</p>
      {draft.links.map((link, i) => {
        const status = slotStatus(link, videoIds[i], firstCopy[i], videoIds[i] ? checks.get(videoIds[i]!) : undefined);
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
      })}
    </section>
    <button type="button" className="kg-btn kg-btn--pink kg-btn--big kg-btn--wide" disabled={!ready || sealing} onClick={() => void seal()}>{sealing ? "Sealing…" : "Seal my card"}</button>
    {!ready ? <p className="kg-small">Add your name and {plural(invite.songs, "different song")} to seal your card.</p> : null}
  </>;
}
