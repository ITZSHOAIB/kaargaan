import { useEffect, useRef, type CSSProperties } from "react";
import * as m from "motion/react-m";
import { Check, Flame, Sparkles, X } from "lucide-react";
import { guessesForRound } from "../../lib/awards";
import { celebrate } from "../../lib/celebrate";
import { revealMoment } from "../../lib/revealMoment";
import { buzz, cue } from "../../lib/sfx";
import { guessStreaks } from "../../lib/streaks";
import type { Game, Round } from "../../lib/types";
import { useVideoChecks } from "../../lib/useVideoChecks";

/** `fresh` is true only right after this phone revealed the round, so a reload doesn't celebrate again. */
type Props = { game: Game; round: Round; videoId: string; isLast: boolean; fresh?: boolean; onNext: () => void };

function NextButton({ isLast, onNext }: { isLast: boolean; onNext: () => void }) {
  return <button type="button" className="kg-btn kg-btn--yellow kg-btn--big kg-btn--wide" onClick={onNext}>{isLast ? "See final scores" : "Next song"}</button>;
}

export function RevealPanel({ game, round, videoId, isLast, fresh = false, onNext }: Props) {
  const checks = useVideoChecks([videoId]);
  const check = checks.get(videoId);
  const heading = useRef<HTMLHeadingElement>(null);
  const moment = revealMoment(game, round);
  useEffect(() => {
    if (!fresh) return;
    heading.current?.focus();
    const bluff = moment === "perfect-bluff";
    cue(bluff ? "bluff" : "reveal");
    buzz(bluff ? [80, 60, 160] : [40, 60, 40]);
    celebrate(bluff ? "bluff" : "reveal");
  }, [fresh, moment]);
  if (round.result?.kind !== "revealed") return null;
  const { ownerId, awards, absentIds = [] } = round.result;
  const byId = new Map(game.players.map((p) => [p.id, p]));
  const owner = byId.get(ownerId)!;
  const guesses = guessesForRound(game, round);
  const streaks = guessStreaks(game, game.rounds.indexOf(round));
  const right = guesses.filter((g) => g.correct);
  const badge = moment === "perfect-bluff" ? "Perfect bluff! Nobody guessed it."
    : moment === "solo-guess" ? `Only ${right[0]?.voter.name} got it.`
    : `The room read ${owner.name} like a book.`;

  return <>
    <m.section className={`kg-reveal${moment === "perfect-bluff" ? " kg-reveal--bluff" : ""}`} aria-labelledby="reveal-title"
      initial={fresh ? { scale: 0.6, rotate: -5 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
      <span className="kg-reveal-rays" aria-hidden="true" />
      <span className="kg-avatar kg-avatar--big" aria-hidden="true">{owner.name.slice(0, 1).toUpperCase()}</span>
      <h1 id="reveal-title" ref={heading} tabIndex={-1} className="kg-title">It was <em>{owner.name}</em>'s song!</h1>
      {check?.status === "ok" ? <p className="kg-reveal-song">{check.title}</p> : null}
      <p className="kg-badge"><Sparkles size={16} aria-hidden="true" />{badge}</p>
    </m.section>
    <section className={`kg-panel${fresh ? " kg-fresh" : ""}`} aria-labelledby="guesses-title">
      <h2 id="guesses-title" className="kg-panel-title">Who guessed what</h2>
      <ul className="kg-guesses" aria-label="Guesses">
        {moment === "perfect-bluff" ? <li><span><strong>{owner.name}</strong> fooled everyone</span><span className="kg-points">+{awards[ownerId] ?? 0}</span></li> : null}
        {guesses.map(({ voter, guess, correct, isOwner }, i) => <li key={voter.id} style={{ "--kg-i": i } as CSSProperties}>
          {isOwner
            ? <span><strong>{voter.name}</strong> bluffed: {guess.name}</span>
            : <span>{correct ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}<strong>{voter.name}</strong> guessed {guess.name}
                {streaks[voter.id] ? <span className="kg-streak"><Flame size={14} aria-hidden="true" />{streaks[voter.id]} in a row</span> : null}</span>}
          {correct ? <span className="kg-points">+{awards[voter.id] ?? 0}</span> : null}
        </li>)}
        {absentIds.map((id) => <li key={id} className="kg-muted"><span><strong>{byId.get(id)?.name}</strong> stepped out</span></li>)}
      </ul>
    </section>
    <NextButton isLast={isLast} onNext={onNext} />
  </>;
}

export function SkippedPanel({ unplayable, isLast, onNext }: { unplayable: boolean; isLast: boolean; onNext: () => void }) {
  return <>
    <div>
      <h1 className="kg-title">Song skipped</h1>
      <p className="kg-lede">{unplayable ? "This song wouldn't play here, so it's skipped. Nobody scores." : "Nobody scores this round."}</p>
    </div>
    <NextButton isLast={isLast} onNext={onNext} />
  </>;
}
