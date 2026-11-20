import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Mic2 } from "lucide-react";
import { loadCurrentGameState } from "../lib/gamePersistence";
import { HeroArt } from "../ui/art/HeroArt";
import { KgScreen } from "../ui/KgScreen";

export function HomePage() {
  const [game] = useState(() => loadCurrentGameState().game);

  return <KgScreen>
    <div className="kg-hero">
      <HeroArt />
      <h1 className="kg-title kg-title--hero">Whose song <em>is it?</em></h1>
      <p className="kg-lede">Everyone secretly picks songs. One phone plays them. Guess whose each one is, and keep a straight face when it's yours.</p>
    </div>
    {game?.status === "playing"
      ? <div className="kg-notice">
          <p><strong>Game in progress</strong> · {game.theme} · Round {game.activeRoundIndex + 1} of {game.rounds.length}</p>
          <Link className="kg-btn kg-btn--small kg-btn--yellow" to="/play">Back to the game</Link>
        </div>
      : null}
    <div className="kg-stack">
      <Link className="kg-btn kg-btn--yellow kg-btn--big kg-btn--wide" to="/stage"><Mic2 size={22} aria-hidden="true" />Host a game</Link>
      <Link className="kg-btn kg-btn--wide" to="/card"><Mail size={20} aria-hidden="true" />I got an invite</Link>
    </div>
    <section className="kg-panel" aria-labelledby="how-heading">
      <h2 id="how-heading" className="kg-panel-title">How to play</h2>
      <ol className="kg-steps">
        <li>The host opens a game on their phone and drops the invite in the group chat.</li>
        <li>Everyone makes a sealed song card on their own phone and sends it to the host. Nobody can peek, not even the host.</li>
        <li>The host's phone plays each song. Anyone can vote on it and change their mind until the reveal.</li>
        <li>One right guess scores 10, a shared right guess 5 each. Fool the whole room and your song scores you 10.</li>
      </ol>
    </section>
    <p className="kg-small kg-center">One phone plays the songs · 3–10 players · YouTube links</p>
  </KgScreen>;
}
