/** Pure scoring rules. No I/O here so the rules are unit-testable. */

export const SUBMIT_COOLDOWN_MS = 3000;

export type ScoreKind = "correct" | "hint" | "adjustment";

/** Points awarded for a correct answer. Hint penalties are charged when the hint is revealed, not here. */
export function pointsForCorrect(injectPoints: number): number {
  return Math.max(0, Math.floor(injectPoints));
}

/** Penalty charged the first time a team reveals a hint. Zero if already revealed. */
export function hintPenalty(injectId: string, hintPenalty: number, hintsUsed: string[]): number {
  if (hintsUsed.includes(injectId)) return 0;
  return -Math.max(0, Math.floor(hintPenalty));
}

/** True when a new submission is allowed given the last submission time. */
export function canSubmit(lastSubmittedAt: Date | null, now: Date, cooldownMs = SUBMIT_COOLDOWN_MS): boolean {
  if (!lastSubmittedAt) return true;
  return now.getTime() - lastSubmittedAt.getTime() >= cooldownMs;
}

/** Apply a delta to a score, never going below zero. */
export function applyDelta(score: number, delta: number): number {
  return Math.max(0, score + delta);
}

export interface TeamStanding {
  teamId: string;
  name: string;
  score: number;
  currentInjectOrder: number;
  completedAt: string | null;
}

/** Sort teams for a leaderboard: score desc, then progress desc, then earliest finish, then name. */
export function rankTeams<T extends TeamStanding>(teams: T[]): T[] {
  return [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.currentInjectOrder !== a.currentInjectOrder) return b.currentInjectOrder - a.currentInjectOrder;
    if (a.completedAt && b.completedAt) return a.completedAt.localeCompare(b.completedAt);
    if (a.completedAt) return -1;
    if (b.completedAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Format milliseconds as m:ss or h:mm:ss. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? h + ":" : ""}${mm}:${String(s).padStart(2, "0")}`;
}
