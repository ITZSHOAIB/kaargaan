import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SoundToggle } from "./SoundToggle";
import { StageBackdrop } from "./StageBackdrop";

/** The Buzzer Night page frame: stage backdrop, brand bar, optional action on the right, one main column. */
export function KgScreen({ children, aside, calm = false }: { children: ReactNode; aside?: ReactNode; calm?: boolean }) {
  return <div className="kg-app">
    <StageBackdrop calm={calm} />
    <a className="kg-skip" href="#kg-main">Skip to game</a>
    <header className="kg-top">
      <Link className="kg-brand" to="/">KaarGaan<span lang="bn">কার গান?</span></Link>
      <div className="kg-top-actions">{aside}<SoundToggle /></div>
    </header>
    <main id="kg-main" className="kg-main kg-enter" tabIndex={-1}>{children}</main>
  </div>;
}
