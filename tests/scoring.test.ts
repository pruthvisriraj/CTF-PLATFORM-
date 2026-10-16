import { describe, it, expect } from "vitest";
import {
  pointsForCorrect,
  hintPenalty,
  canSubmit,
  applyDelta,
  rankTeams,
  formatDuration,
  SUBMIT_COOLDOWN_MS,
} from "@/lib/scoring";

describe("pointsForCorrect", () => {
  it("returns inject points, never negative", () => {
    expect(pointsForCorrect(150)).toBe(150);
    expect(pointsForCorrect(-5)).toBe(0);
  });
});

describe("hintPenalty", () => {
  it("charges the penalty once", () => {
    expect(hintPenalty("i1", 20, [])).toBe(-20);
    expect(hintPenalty("i1", 20, ["i1"])).toBe(0);
    expect(hintPenalty("i2", 40, ["i1"])).toBe(-40);
  });
});

describe("canSubmit", () => {
  const now = new Date("2026-01-01T00:00:10Z");
  it("allows first submission", () => {
    expect(canSubmit(null, now)).toBe(true);
  });
  it("enforces the 3 second cooldown", () => {
    expect(canSubmit(new Date(now.getTime() - 1000), now)).toBe(false);
    expect(canSubmit(new Date(now.getTime() - SUBMIT_COOLDOWN_MS), now)).toBe(true);
    expect(canSubmit(new Date(now.getTime() - 5000), now)).toBe(true);
  });
});

describe("applyDelta", () => {
  it("adds and floors at zero", () => {
    expect(applyDelta(100, 50)).toBe(150);
    expect(applyDelta(10, -20)).toBe(0);
  });
});

describe("rankTeams", () => {
  it("ranks by score, then progress, then finish time, then name", () => {
    const ranked = rankTeams([
      { teamId: "a", name: "Bravo", score: 100, currentInjectOrder: 2, completedAt: null },
      { teamId: "b", name: "Alpha", score: 100, currentInjectOrder: 2, completedAt: null },
      { teamId: "c", name: "Zulu", score: 250, currentInjectOrder: 3, completedAt: null },
      { teamId: "d", name: "Echo", score: 250, currentInjectOrder: 5, completedAt: "2026-01-01T01:00:00Z" },
      { teamId: "e", name: "Delta", score: 250, currentInjectOrder: 5, completedAt: "2026-01-01T00:50:00Z" },
    ]);
    expect(ranked.map((t) => t.teamId)).toEqual(["e", "d", "c", "b", "a"]);
  });
});

describe("formatDuration", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });
});
