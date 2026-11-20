import type { CSSProperties } from "react";
import { Crown } from "lucide-react";
import type { PodiumStep } from "../../lib/podium";
import { listNames } from "../../lib/words";

/**
 * A picture of the standings: second, first and third step, with a crown on top. It's hidden from screen
 * readers because the Standings list says the same thing. It only rises and counts up right after the game ends.
 */
export function Podium({ steps, fresh }: { steps: PodiumStep[]; fresh: boolean }) {
  const order = [steps[1], steps[0], steps[2]].filter((step): step is PodiumStep => Boolean(step));
  return <div className="kg-podium" aria-hidden="true" data-fresh={fresh || undefined}>
    {order.map((step) => <div key={step.place} className="kg-podium-step" data-place={step.place}>
      <div className="kg-podium-people">
        {step.place === 1 ? <Crown className="kg-podium-crown" size={34} /> : null}
        <div className="kg-podium-avatars">
          {step.names.map((name, i) => <span key={i} className="kg-avatar">{name.slice(0, 1).toUpperCase()}</span>)}
        </div>
        <span className="kg-podium-names">{listNames(step.names)}</span>
      </div>
      <div className="kg-podium-block">
        <span className="kg-podium-place">{step.place}</span>
        <span className="kg-podium-score" style={{ "--kg-score": step.score } as CSSProperties} />
      </div>
    </div>)}
  </div>;
}
