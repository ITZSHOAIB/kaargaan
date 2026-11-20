import { useState } from "react";
import { plural } from "../../lib/card";
import { readSlots } from "../../lib/slots";
import { SongSlots } from "../../ui/SongSlots";

/** The host's own card, built on the stage phone. It's sealed into the lobby like anyone else's. */
export function HostSongs({ songs, onSeal, onCancel }: { songs: number; onSeal: (videoIds: string[]) => void; onCancel: () => void }) {
  const [links, setLinks] = useState(() => Array.from({ length: songs }, () => ""));
  const slots = readSlots(links);

  return <>
    <div>
      <p className="kg-eyebrow">Host's card</p>
      <h1 className="kg-title">Your songs</h1>
      <p className="kg-lede">Pick them while nobody's peeking. Once sealed they stay hidden on this phone until the reveal.</p>
    </div>
    <section className="kg-panel" aria-label="Your songs">
      <SongSlots links={links} slots={slots} onChange={setLinks} />
    </section>
    <button type="button" className="kg-btn kg-btn--pink kg-btn--big kg-btn--wide" disabled={!slots.complete} onClick={() => onSeal(slots.videoIds as string[])}>Seal my songs</button>
    {!slots.complete ? <p className="kg-small">Add {plural(songs, "different song")} to seal them.</p> : null}
    <button type="button" className="kg-btn kg-btn--quiet" onClick={onCancel}>Back to the lobby</button>
  </>;
}
