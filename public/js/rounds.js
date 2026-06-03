// Browser copy of functions/_lib/rounds.js (kept in sync; no build step).

export const ROUNDS = [
  { key: "r32", label: "Round of 32", count: 32, points: 4 },
  { key: "r16", label: "Round of 16", count: 16, points: 8 },
  { key: "qf", label: "Quarter-finals", count: 8, points: 15 },
  { key: "sf", label: "Semi-finals", count: 4, points: 25 },
  { key: "final", label: "Final", count: 2, points: 35 },
];

export const CHAMPION_POINTS = 50;

export const SCORERS = { count: 3, pointsPerGoal: 6 };
