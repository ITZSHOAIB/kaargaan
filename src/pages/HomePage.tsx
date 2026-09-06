import { ArrowUpRight, Disc3 } from "lucide-react";
import { Link } from "react-router-dom";

export function HomePage() {
  return <div className="home-layout">
    <section className="invitation">
      <h2>Your songs.<br/>Their guesses.<br/><em>Keep a straight face.</em></h2>
      <p>Someone in this room picked that song. Listen together, talk it out, and guess whose playlist it came from.</p>
      <div className="actions"><Link className="button primary" to="/game">Gather the room <ArrowUpRight size={20}/></Link><Link className="button" to="/prepare">Prepare songs</Link></div>
      <p className="small-note">One shared phone · 3–10 friends · YouTube links</p>
    </section>
    <aside className="rule-sheet">
      <Disc3 className="record-mark" size={100} strokeWidth={1} aria-hidden="true"/>
      <h2>The house rules</h2>
      <ol><li><strong>Bring your songs.</strong><span>Choose a theme and contribute the same number each.</span></li><li><strong>Hear everyone out.</strong><span>The song owner joins the discussion and bluffs too.</span></li><li><strong>Make your call.</strong><span>The host records everyone's guess. No self-votes.</span></li></ol>
      <div className="scoring-note"><strong>10 or 5?</strong><p>One correct guess earns 10. Two or more earn 5 each. Fool everyone and the owner gets 10.</p></div>
    </aside>
  </div>;
}
