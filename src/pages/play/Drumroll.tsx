import { useEffect, useMemo, useRef, useState } from "react";
import { DRUMROLL_DELAYS, drumrollPath } from "../../lib/drumroll";
import { cue } from "../../lib/sfx";
import type { Player } from "../../lib/types";

type Props = { players: Player[]; ownerId: string; onDone: () => void };

/**
 * A spotlight runs round the room and slows onto the owner. It's only shown after the reveal is saved,
 * and every reveal takes the same steps and time. The wheel is hidden from screen readers; the reveal
 * heading takes focus when it lands.
 */
export function Drumroll({ players, ownerId, onDone }: Props) {
  const path = useMemo(() => drumrollPath(players.length, players.findIndex((p) => p.id === ownerId)), [players, ownerId]);
  const [step, setStep] = useState(0);
  const skip = useRef<HTMLButtonElement>(null);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => { skip.current?.focus(); }, []);
  useEffect(() => {
    const last = step === path.length - 1;
    const id = setTimeout(() => {
      if (last) { done.current(); return; }
      cue("tick");
      setStep(step + 1);
    }, DRUMROLL_DELAYS[step] + (last ? 380 : 0));
    return () => clearTimeout(id);
  }, [step, path.length]);

  const seat = players[path[step]];
  return <section className="kg-drumroll" aria-label="Drumroll">
    <div className="kg-drumroll-wheel" aria-hidden="true">
      <p className="kg-drumroll-label">Whose song is it…</p>
      <div className="kg-drumroll-card" key={step} data-landed={step === path.length - 1 || undefined}>
        <span className="kg-avatar kg-avatar--big">{seat.name.slice(0, 1).toUpperCase()}</span>
        <span className="kg-drumroll-name">{seat.name}</span>
      </div>
      <div className="kg-drumroll-seats">
        {players.map((p, i) => <span key={p.id} data-on={i === path[step] || undefined} />)}
      </div>
    </div>
    <button ref={skip} type="button" className="kg-btn kg-btn--quiet" onClick={() => done.current()}>Skip the drumroll</button>
  </section>;
}
