import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { clearVote, currentRound, nextRound, recordVote, reveal, skip, standings } from "../../lib/gameEngine";
import { clearCurrentGame, loadCurrentGameState, saveCurrentGame } from "../../lib/gamePersistence";
import { plural } from "../../lib/card";
import type { Game } from "../../lib/types";
import { cue } from "../../lib/sfx";
import { useWakeLock } from "../../lib/useWakeLock";
import { KgScreen } from "../../ui/KgScreen";
import { Sheet } from "../../ui/Sheet";
import { Drumroll } from "./Drumroll";
import { FinalScreen } from "./FinalScreen";
import { PlayerDock } from "./PlayerDock";
import { RevealPanel, SkippedPanel } from "./RoundResultPanels";
import { VotingPanel } from "./VotingPanel";

type Ask = "scores" | "skip" | "end" | null;

export function PlayPage() {
  const navigate = useNavigate();
  const [loaded] = useState(loadCurrentGameState);
  const [game, setGame] = useState<Game | null>(loaded.game);
  const [error, setError] = useState("");
  const [unplayableRound, setUnplayableRound] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  // The round whose reveal is drumming, and the round whose reveal just landed (so it celebrates once).
  const [drumFor, setDrumFor] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  // True once the game ends on this visit, so final scores celebrate once.
  const [finished, setFinished] = useState(false);
  const reduceMotion = useReducedMotion();
  useWakeLock(game?.status === "playing");

  /** Saves before showing, and keeps the revision the save hands back so the next save isn't seen as stale. */
  function commit(next: Game): boolean {
    try {
      setGame(saveCurrentGame(next));
      setError("");
      return true;
    } catch (caught) {
      setError(caught instanceof Error && caught.message.includes("another tab")
        ? "This game changed in another tab. Reload this page to carry on from there."
        : "This phone couldn't save the game. Free up some space, or keep this page open until the end.");
      return false;
    }
  }

  function leave(to: string) {
    clearCurrentGame();
    navigate(to);
  }

  if (!game) {
    return <KgScreen>
      {loaded.error
        ? <>
            <h1 className="kg-title">This game couldn't be restored</h1>
            <p className="kg-lede">The save on this phone is damaged.</p>
            <button type="button" className="kg-btn kg-btn--yellow kg-btn--wide" onClick={() => leave("/stage")}>Clear it and set up a new game</button>
          </>
        : <>
            <h1 className="kg-title">No game on this phone yet</h1>
            <p className="kg-lede">Games run on the host's phone. Set one up and collect everyone's song cards first.</p>
            <Link className="kg-btn kg-btn--yellow kg-btn--wide" to="/stage">Set up a game</Link>
          </>}
    </KgScreen>;
  }

  const errorNote = error ? <p role="alert" className="kg-notice kg-notice--warn">{error}</p> : null;
  if (game.status === "completed") {
    return <KgScreen>{errorNote}<FinalScreen game={game} fresh={finished} onPlayAgain={() => leave("/stage")} onDone={() => leave("/")} /></KgScreen>;
  }

  const round = currentRound(game);
  const videoId = game.submissions.find((s) => s.id === round.submissionId)!.videoId;
  const isLast = game.activeRoundIndex === game.rounds.length - 1;
  const next = () => { cue("whoosh"); if (commit(nextRound(game)) && isLast) setFinished(true); };
  const revealNow = (withoutMissing: boolean) => {
    if (!commit(reveal(game, { withoutMissing }))) return;
    if (reduceMotion) setLanded(round.id);
    else setDrumFor(round.id);
  };

  return <KgScreen calm={round.phase === "voting"}>
    {errorNote}
    <div className="kg-round-head" key={round.id}>
      <div className="kg-round-track" aria-hidden="true">
        {game.rounds.map((r, i) => <span key={r.id} data-state={i < game.activeRoundIndex ? (r.phase === "skipped" ? "skipped" : "done") : i === game.activeRoundIndex ? "now" : "todo"} />)}
      </div>
      <p className="kg-eyebrow"><span className="kg-round-stamp">Round {game.activeRoundIndex + 1}</span> of {game.rounds.length} · {game.theme}</p>
      {round.phase === "voting" ? <h1 className="kg-title">Who picked this song?</h1> : null}
    </div>
    <PlayerDock videoId={videoId} hidden={round.phase === "skipped"} onSkip={() => commit(skip(game))}
      onUnplayable={(failed) => {
        if (round.phase !== "voting" || failed !== videoId) return;
        setUnplayableRound(round.id);
        commit(skip(game));
      }} />
    {round.phase === "voting"
      ? <VotingPanel game={game} round={round}
          onVote={(voter, owner) => commit(recordVote(game, voter, owner))}
          onClearVote={(voter) => commit(clearVote(game, voter))}
          onReveal={revealNow} />
      : round.phase === "revealed" && drumFor === round.id && round.result?.kind === "revealed"
        ? <Drumroll players={game.players} ownerId={round.result.ownerId} onDone={() => { setDrumFor(null); setLanded(round.id); }} />
      : round.phase === "revealed"
        ? <RevealPanel game={game} round={round} videoId={videoId} isLast={isLast} fresh={landed === round.id} onNext={next} />
        : <SkippedPanel unplayable={unplayableRound === round.id} isLast={isLast} onNext={next} />}

    <div className="kg-row kg-host-tools">
      <button type="button" className="kg-btn kg-btn--small" onClick={() => setAsk("scores")}>Scores</button>
      {round.phase === "voting" ? <button type="button" className="kg-btn kg-btn--small" onClick={() => setAsk("skip")}>Skip this song</button> : null}
      <button type="button" className="kg-btn kg-btn--small" onClick={() => setAsk("end")}>End game</button>
    </div>

    {ask === "scores"
      ? <Sheet title="Scores" onClose={() => setAsk(null)}>
          <ol className="kg-standings">
            {standings(game).map((p) => <li key={p.id}><span className="kg-standings-name">{p.name}</span><span className="kg-points">{plural(p.score, "pt")}</span></li>)}
          </ol>
          <button type="button" className="kg-btn kg-btn--wide" onClick={() => setAsk(null)}>Close</button>
        </Sheet>
      : null}
    {ask === "skip"
      ? <Sheet title="Skip this song?" onClose={() => setAsk(null)}>
          <p>Nobody scores this round, and the song's owner stays a secret.</p>
          <div className="kg-row">
            <button type="button" className="kg-btn kg-btn--pink" onClick={() => { setAsk(null); commit(skip(game)); }}>Skip it</button>
            <button type="button" className="kg-btn" onClick={() => setAsk(null)}>Keep playing</button>
          </div>
        </Sheet>
      : null}
    {ask === "end"
      ? <Sheet title="End the game now?" onClose={() => setAsk(null)}>
          <p>Final scores count only the rounds revealed so far.</p>
          <div className="kg-row">
            <button type="button" className="kg-btn kg-btn--pink" onClick={() => { setAsk(null); if (commit({ ...game, status: "completed", endedEarly: true })) setFinished(true); }}>End it</button>
            <button type="button" className="kg-btn" onClick={() => setAsk(null)}>Keep playing</button>
          </div>
        </Sheet>
      : null}
  </KgScreen>;
}
