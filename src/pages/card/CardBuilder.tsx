import { useState } from "react";
import { cleanName, MAX_NAME_LENGTH, plural, sealCard } from "../../lib/card";
import type { CardDraft } from "../../lib/cardDraft";
import { readSlots } from "../../lib/slots";
import { SongSlots } from "../../ui/SongSlots";

export function CardBuilder({ draft, onChange }: { draft: CardDraft; onChange: (draft: CardDraft) => void }) {
  const { invite } = draft;
  const [sealing, setSealing] = useState(false);
  const slots = readSlots(draft.links);
  const name = cleanName(draft.name);
  const ready = Boolean(name) && slots.complete;

  async function seal() {
    setSealing(true);
    try {
      const sealed = await sealCard({ v: 2, roomId: invite.roomId, playerKey: draft.playerKey, name, videoIds: slots.videoIds as string[] }, invite);
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
      <SongSlots links={draft.links} slots={slots} onChange={(links) => onChange({ ...draft, links })} />
    </section>
    <button type="button" className="kg-btn kg-btn--pink kg-btn--big kg-btn--wide" disabled={!ready || sealing} onClick={() => void seal()}>{sealing ? "Sealing…" : "Seal my card"}</button>
    {!ready ? <p className="kg-small">Add your name and {plural(invite.songs, "different song")} to seal your card.</p> : null}
  </>;
}
