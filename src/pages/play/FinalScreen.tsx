import { useEffect, useRef, type CSSProperties } from "react";
import { Crown, Ear, ExternalLink, Eye, RotateCcw, VenetianMask, type LucideIcon } from "lucide-react";
import { gameAwards, type AwardId } from "../../lib/awards";
import { plural } from "../../lib/card";
import { celebrate } from "../../lib/celebrate";
import { standings } from "../../lib/gameEngine";
import { podium } from "../../lib/podium";
import { buzz, cue } from "../../lib/sfx";
import type { Game } from "../../lib/types";
import { useVideoChecks } from "../../lib/useVideoChecks";
import { listNames } from "../../lib/words";
import { playlistUrl } from "../../lib/youtube";
import { Podium } from "./Podium";

const AWARD_TITLES: Record<AwardId, string> = { "sharpest-ear": "Sharpest ear", "master-bluffer": "Master bluffer", "most-suspected": "Most suspected" };
const AWARD_ICONS: Record<AwardId, LucideIcon> = { "sharpest-ear": Ear, "master-bluffer": VenetianMask, "most-suspected": Eye };

function awardDetail(id: AwardId, count: number): string {
  if (id === "sharpest-ear") return `${count} right ${count === 1 ? "guess" : "guesses"}`;
  if (id === "master-bluffer") return `fooled the room ${plural(count, "time")}`;
  return plural(count, "vote");
}

function winnerLine(game: Game): string {
  const table = standings(game);
  const top = table[0]?.score ?? 0;
  if (top === 0) return "Nobody scored tonight.";
  const leaders = table.filter((p) => p.score === top);
  return leaders.length > 1 ? `Share the crown. ${top} points.` : `${leaders[0].name} wins with ${top} points!`;
}

/** `fresh` is true only when the game ended on this visit, so the celebration never replays on reload. */
export function FinalScreen({ game, fresh = false, onPlayAgain, onDone }: { game: Game; fresh?: boolean; onPlayAgain: () => void; onDone: () => void }) {
  const table = standings(game);
  const top = table[0]?.score ?? 0;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!fresh) return;
    heading.current?.focus();
    if (top === 0) { cue("bluff"); return; }
    cue("win");
    buzz([60, 80, 60, 80, 200]);
    // Confetti waits for the crown, so it never lands on the same frame as this screen's first render.
    const id = setTimeout(() => celebrate("win"), 900);
    return () => clearTimeout(id);
  }, [fresh, top]);
  const awards = gameAwards(game);
  const names = new Map(game.players.map((p) => [p.id, p.name]));
  const songs = game.rounds.map((round) => {
    const submission = game.submissions.find((s) => s.id === round.submissionId)!;
    // Owners of skipped or unplayed songs stay secret, even after the game.
    return { round, videoId: submission.videoId, owner: names.get(submission.ownerId) ?? "" };
  });
  const checks = useVideoChecks(songs.map((s) => s.videoId));

  return <>
    <div>
      <p className="kg-eyebrow">{game.theme} · {game.endedEarly ? "Called it a night" : "That's a wrap"}</p>
      <h1 ref={heading} tabIndex={-1} className="kg-title">Final scores</h1>
      <p className="kg-lede kg-winner"><Crown size={22} aria-hidden="true" />{winnerLine(game)}</p>
      {game.endedEarly ? <p className="kg-small">Game ended early. Only revealed rounds count.</p> : null}
    </div>
    {top > 0 ? <Podium steps={podium(table)} fresh={fresh} /> : null}
    <section className="kg-panel" aria-labelledby="standings-title">
      <h2 id="standings-title" className="kg-panel-title">Standings</h2>
      <ol className="kg-standings" aria-label="Standings">
        {table.map((p) => <li key={p.id} className={top > 0 && p.score === top ? "kg-standings-top" : undefined}>
          <span className="kg-standings-name">{p.name}</span><span className="kg-points">{plural(p.score, "pt")}</span>
        </li>)}
      </ol>
    </section>
    {awards.length
      ? <section className={`kg-panel kg-panel--yellow kg-on-yellow${fresh ? " kg-fresh" : ""}`} aria-labelledby="awards-title">
          <h2 id="awards-title" className="kg-panel-title">Awards</h2>
          <ul className="kg-awards">
            {awards.map((a, i) => { const Icon = AWARD_ICONS[a.id]; return <li key={a.id} style={{ "--kg-i": i } as CSSProperties}><span className="kg-award-icon" aria-hidden="true"><Icon size={22} /></span><strong>{AWARD_TITLES[a.id]}</strong><span>{listNames(a.playerIds.map((id) => names.get(id) ?? ""))} · {awardDetail(a.id, a.count)}</span></li>; })}
          </ul>
        </section>
      : null}
    <section className="kg-panel" aria-labelledby="picks-title">
      <h2 id="picks-title" className="kg-panel-title">Who picked what</h2>
      <ol className="kg-picks">
        {songs.map(({ round, videoId, owner }, i) => {
          const check = checks.get(videoId);
          return <li key={round.id}>
            <span>{check?.status === "ok" ? check.title : `Song ${i + 1}`}</span>
            {round.result?.kind === "revealed" ? <strong>{owner}</strong> : <span className="kg-muted">{round.phase === "skipped" ? "Skipped" : "Not played"}</span>}
          </li>;
        })}
      </ol>
      <a className="kg-btn kg-btn--small" href={playlistUrl(songs.map((s) => s.videoId))} target="_blank" rel="noreferrer">Open tonight's playlist<ExternalLink size={16} aria-hidden="true" /><span className="sr-only"> (opens YouTube)</span></a>
    </section>
    <button type="button" className="kg-btn kg-btn--pink kg-btn--big kg-btn--wide" onClick={onPlayAgain}><RotateCcw size={22} aria-hidden="true" />Play again</button>
    <button type="button" className="kg-btn kg-btn--quiet" onClick={onDone}>Done for tonight</button>
  </>;
}
