import { ArrowUpRight, Disc3, Users, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { loadHostDraft, loadPlayerDraft } from "../lib/setupDraft";
import { roomCode } from "../lib/room";
import { loadCurrentGameState } from "../lib/gamePersistence";

export function HomePage() {
  const savedGame = loadCurrentGameState().game;
  const hostDraft = loadHostDraft();
  const playerDraft = loadPlayerDraft();
  const hasActiveGame = savedGame?.status === "playing";

  return <div className="home-layout">
    <section className="invitation">
      <h2>Your songs.<br/>Their guesses.<br/><em>Keep a straight face.</em></h2>
      <p>One person hosts the room. Everyone else adds songs privately, then the room guesses who picked each track.</p>
      {!savedGame && hostDraft ? <div className="resume-banner"><div><strong>Room setup saved</strong><span>Room {roomCode(hostDraft.roomId)} · {hostDraft.lockedPlayerIds.length}/{hostDraft.playerCount} entries collected</span></div><Link className="button" to="/host">Continue room setup</Link></div> : null}
      {playerDraft ? <div className="resume-banner"><div><strong>Your songs are saved</strong><span>Room {roomCode(playerDraft.invite.roomId)}</span></div><Link className="button" to="/player">Return to my songs</Link></div> : null}
      <div className="role-choice" aria-label="Choose your role">
        <Link className="role-option role-option-primary" to="/host">
          <span className="role-icon"><Users size={21} aria-hidden="true" /></span>
          <span><strong>Host a game</strong><small>Set the players, play songs, and record votes.</small></span>
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
        <Link className="role-option" to="/player">
          <span className="role-icon"><UserRound size={21} aria-hidden="true" /></span>
          <span><strong>Join as a player</strong><small>Prepare your songs on your own phone.</small></span>
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </div>
      <p className="small-note">One shared game phone · 3–10 players · YouTube links</p>
      {hasActiveGame ? (
        <div className="resume-banner" role="status">
          <div>
            <strong>Game in progress</strong>
            <span>{savedGame.theme} · Round {savedGame.activeRoundIndex + 1} of {savedGame.rounds.length}</span>
          </div>
          <Link className="button" to="/host">Resume game</Link>
        </div>
      ) : null}
    </section>
    <aside className="rule-sheet">
      <Disc3 className="record-mark" size={100} strokeWidth={1} aria-hidden="true"/>
      <h2>The house rules</h2>
      <ol><li><strong>Bring your songs.</strong><span>Choose a theme and contribute the same number each.</span></li><li><strong>Hear everyone out.</strong><span>The song owner joins the discussion and bluffs too.</span></li><li><strong>Make your call.</strong><span>The host records everyone's guess. No self-votes.</span></li></ol>
      <div className="scoring-note"><strong>10 or 5?</strong><p>One correct guess earns 10. Two or more earn 5 each. Fool everyone and the owner gets 10.</p></div>
    </aside>
  </div>;
}
