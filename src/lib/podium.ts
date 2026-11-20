export type PodiumStep = { place: 1 | 2 | 3; score: number; names: string[] };

/** The top three distinct scores above zero, highest first. Players on the same score share a step. */
export function podium(table: { name: string; score: number }[]): PodiumStep[] {
  const scores = [...new Set(table.map((p) => p.score).filter((score) => score > 0))].sort((a, b) => b - a).slice(0, 3);
  return scores.map((score, i) => ({ place: (i + 1) as 1 | 2 | 3, score, names: table.filter((p) => p.score === score).map((p) => p.name) }));
}
