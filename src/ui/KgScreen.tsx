import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** The Buzzer Night page frame: brand bar, optional action on the right, one main column. */
export function KgScreen({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className="kg-app">
    <a className="kg-skip" href="#kg-main">Skip to game</a>
    <header className="kg-top">
      <Link className="kg-brand" to="/">KaarGaan<span lang="bn">কার গান?</span></Link>
      {aside}
    </header>
    <main id="kg-main" className="kg-main" tabIndex={-1}>{children}</main>
  </div>;
}
