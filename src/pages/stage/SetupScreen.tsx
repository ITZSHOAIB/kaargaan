import { useState } from "react";
import { Link } from "react-router-dom";
import { cleanName, MAX_NAME_LENGTH, plural } from "../../lib/card";
import { loadCurrentGameState } from "../../lib/gamePersistence";
import { loadCrew, loadSetup, saveSetup, type StageSetup } from "../../lib/stageStore";

const LENGTHS = [2, 3];

function initialSetup(): StageSetup {
  const crew = loadCrew();
  return loadSetup() ?? { hostName: crew?.hostName ?? "", theme: crew?.theme ?? "Songs on repeat", songs: crew?.songs ?? 2, sameCrew: Boolean(crew?.names.length) };
}

export function SetupScreen({ onOpen }: { onOpen: (setup: StageSetup) => void }) {
  const [setup, setSetup] = useState(initialSetup);
  const [crew] = useState(loadCrew);
  const [game] = useState(() => loadCurrentGameState().game);
  const crewNames = crew?.names ?? [];
  const ready = Boolean(cleanName(setup.hostName)) && Boolean(setup.theme.trim());

  function change(next: Partial<StageSetup>) {
    const updated = { ...setup, ...next };
    setSetup(updated);
    saveSetup(updated);
  }

  return <>
    {game?.status === "playing"
      ? <div className="kg-notice">
          <p><strong>A game is in progress</strong> · {game.theme} · Round {game.activeRoundIndex + 1} of {game.rounds.length}</p>
          <Link className="kg-btn kg-btn--small kg-btn--yellow" to="/host">Back to the game</Link>
        </div>
      : null}
    <div>
      <p className="kg-eyebrow">Host on this phone</p>
      <h1 className="kg-title">Set up the game</h1>
      <p className="kg-lede">This phone plays the songs and takes the votes. You play too: your songs get sealed like everyone's.</p>
    </div>
    <form className="kg-panel" aria-label="Game setup" onSubmit={(e) => { e.preventDefault(); if (ready) onOpen({ ...setup, sameCrew: setup.sameCrew && crewNames.length > 0 }); }}>
      <label className="kg-field">
        <span className="kg-label">Your name</span>
        <input className="kg-input" value={setup.hostName} maxLength={MAX_NAME_LENGTH + 10} autoComplete="given-name" placeholder="What the room calls you" onChange={(e) => change({ hostName: e.target.value })} />
      </label>
      <label className="kg-field">
        <span className="kg-label">Theme</span>
        <input className="kg-input" value={setup.theme} maxLength={60} placeholder="Songs on repeat" onChange={(e) => change({ theme: e.target.value })} />
      </label>
      <fieldset className="kg-choice">
        <legend className="kg-label">Songs each</legend>
        <div className="kg-choice-options">
          {LENGTHS.map((count) => <label key={count} className="kg-choice-option">
            <input type="radio" name="songs" checked={setup.songs === count} onChange={() => change({ songs: count })} />
            <span>{plural(count, "song")}</span>
          </label>)}
        </div>
      </fieldset>
      {crewNames.length
        ? <label className="kg-check">
            <input type="checkbox" checked={setup.sameCrew} aria-describedby="crew-names" onChange={(e) => change({ sameCrew: e.target.checked })} />
            <span>Same crew again<span id="crew-names" className="kg-small">{crewNames.join(", ")}</span></span>
          </label>
        : null}
      <button type="submit" className="kg-btn kg-btn--pink kg-btn--big kg-btn--wide" disabled={!ready}>Open the lobby</button>
    </form>
  </>;
}
