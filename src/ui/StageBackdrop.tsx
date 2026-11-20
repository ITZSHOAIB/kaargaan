import { useSyncExternalStore, type CSSProperties } from "react";

const subscribe = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
};

const NOTES = [
  { x: 8, y: 18, size: 30, delay: 0 },
  { x: 84, y: 10, size: 24, delay: -3 },
  { x: 90, y: 52, size: 34, delay: -6 },
  { x: 4, y: 66, size: 26, delay: -9 },
  { x: 72, y: 84, size: 22, delay: -2 }
];
const BARS = [0.55, 0.9, 0.4, 0.75, 1, 0.5, 0.8, 0.35, 0.65, 0.95, 0.45, 0.7];

/**
 * Pure decoration behind every screen: drifting notes, twinkling sparks and a stage equalizer.
 * It animates transforms only, pauses when the phone hides the page, and quietens during a song.
 */
export function StageBackdrop({ calm = false }: { calm?: boolean }) {
  const hidden = useSyncExternalStore(subscribe, () => document.hidden, () => false);
  return <div className="kg-stage-bg" aria-hidden="true" data-calm={calm || undefined} data-paused={hidden || undefined}>
    <div className="kg-stage-spot" />
    {NOTES.map((note, i) => <svg key={i} className="kg-stage-note" viewBox="0 0 24 24" width={note.size} height={note.size}
      style={{ left: `${note.x}%`, top: `${note.y}%`, animationDelay: `${note.delay}s` }}>
      {i % 2
        ? <path d="M9 18a3 3 0 1 1-2-2.83V5l12-2v11a3 3 0 1 1-2-2.83V6.3L9 7.8z" />
        : <path d="M12 3v11.17A3 3 0 1 0 14 17V7h5V3z" />}
    </svg>)}
    {[12, 38, 62, 28, 78].map((x, i) => <span key={x} className="kg-stage-spark" style={{ left: `${x}%`, top: `${[30, 8, 40, 88, 26][i]}%`, animationDelay: `${-i * 0.7}s` }} />)}
    <div className="kg-stage-eq">
      {BARS.map((h, i) => <span key={i} style={{ "--kg-eq": h, animationDelay: `${-i * 0.23}s` } as CSSProperties} />)}
    </div>
  </div>;
}
