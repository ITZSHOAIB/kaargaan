import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { canRevealWithoutMissing } from "../../lib/gameEngine";
import type { Game, Player, Round } from "../../lib/types";
import { warmCelebrate } from "../../lib/celebrate";
import { buzz, cue } from "../../lib/sfx";
import { listNames } from "../../lib/words";
import { Sheet } from "../../ui/Sheet";

type Props = {
  game: Game;
  round: Round;
  onVote: (voterId: string, ownerId: string) => void;
  onClearVote: (voterId: string) => void;
  onReveal: (withoutMissing: boolean) => void;
};

/**
 * Anyone taps their own name and picks whose song it is, any time until the reveal. Tiles look the same
 * for every player, owner included, and the sheet never shows a current pick, so nobody can read a vote
 * over someone's shoulder.
 */
export function VotingPanel({ game, round, onVote, onClearVote, onReveal }: Props) {
  const [voter, setVoter] = useState<Player | null>(null);
  const [askMissing, setAskMissing] = useState(false);
  const voted = game.players.filter((p) => round.votes[p.id]).length;
  const missing = game.players.filter((p) => !round.votes[p.id]);
  const everyone = missing.length === 0;
  useEffect(warmCelebrate, []);

  return <>
    <section className="kg-votes" aria-label="Votes">
      <div className="kg-votes-head">
        <h2 className="kg-panel-title">Tap your name to vote</h2>
        <p role="status" className="kg-small">{voted} of {game.players.length} voted</p>
      </div>
      <div className="kg-meter" aria-hidden="true"><span style={{ transform: `scaleX(${voted / game.players.length})` }} /></div>
      <ul className="kg-tiles">
        {game.players.map((player) => {
          const hasVoted = Boolean(round.votes[player.id]);
          return <li key={player.id}>
            <button type="button" className={`kg-tile${hasVoted ? " kg-tile--voted" : ""}`} onClick={() => setVoter(player)}>
              <span className="kg-avatar" aria-hidden="true">{player.name.slice(0, 1).toUpperCase()}</span>
              <span className="kg-tile-name">{player.name}</span>
              <span className="kg-tile-state">{hasVoted ? <><Check size={14} aria-hidden="true" />Voted</> : "Not voted"}</span>
            </button>
          </li>;
        })}
      </ul>
    </section>

    <button type="button" className={`kg-btn kg-btn--pink kg-btn--big kg-btn--wide${everyone ? " kg-btn--ready" : ""}`} disabled={!everyone} onClick={() => onReveal(false)}>Reveal!</button>
    {!everyone && canRevealWithoutMissing(game)
      ? <button type="button" className="kg-btn kg-btn--quiet" onClick={() => setAskMissing(true)}>Someone stepped out? Reveal without them</button>
      : null}

    {voter
      ? <Sheet title={`${voter.name}, whose song is it?`} onClose={() => setVoter(null)}>
          <div className="kg-choices">
            {game.players.filter((p) => p.id !== voter.id).map((p) => (
              <button key={p.id} type="button" className="kg-btn kg-btn--wide" onClick={() => { cue("vote"); buzz([25]); onVote(voter.id, p.id); setVoter(null); }}>{p.name}</button>
            ))}
          </div>
          {round.votes[voter.id]
            ? <button type="button" className="kg-btn kg-btn--quiet" onClick={() => { cue("tap"); onClearVote(voter.id); setVoter(null); }}>Take back my vote</button>
            : null}
          <button type="button" className="kg-btn kg-btn--quiet" onClick={() => setVoter(null)}>Cancel</button>
        </Sheet>
      : null}

    {askMissing
      ? <Sheet title={`Reveal without ${listNames(missing.map((p) => p.name))}?`} onClose={() => setAskMissing(false)}>
          <p>{listNames(missing.map((p) => p.name))} {missing.length === 1 ? "scores" : "score"} nothing this round.</p>
          <div className="kg-row">
            <button type="button" className="kg-btn kg-btn--pink" onClick={() => { setAskMissing(false); onReveal(true); }}>Reveal now</button>
            <button type="button" className="kg-btn" onClick={() => setAskMissing(false)}>Wait for them</button>
          </div>
        </Sheet>
      : null}
  </>;
}
