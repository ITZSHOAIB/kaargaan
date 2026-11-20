import { canApplyUpdate } from "../lib/appUpdate";
import { loadCurrentGameState } from "../lib/gamePersistence";
import { useUpdateReady } from "../lib/updateSignal";

/** Offers a waiting app version, but never while a game is in play, because updating reloads the page. */
export function UpdateBanner() {
  const apply = useUpdateReady();
  if (!apply || !canApplyUpdate(loadCurrentGameState().game?.status ?? null)) return null;
  return <div className="kg-update" role="status">
    <span>A new version of KaarGaan is ready.</span>
    <button type="button" className="kg-btn kg-btn--small kg-btn--yellow" onClick={apply}>Update now</button>
  </div>;
}
