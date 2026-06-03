// Tournament stages and their scoring. Kept in sync with public/js/rounds.js
// (small intentional duplication so there is no build step and the browser and
// the Functions runtime each get a plain module).

export const ROUNDS = [
  { key: "r32", label: "Round of 32", count: 32, points: 4 },
  { key: "r16", label: "Round of 16", count: 16, points: 8 },
  { key: "qf", label: "Quarter-finals", count: 8, points: 15 },
  { key: "sf", label: "Semi-finals", count: 4, points: 25 },
  { key: "final", label: "Final", count: 2, points: 35 },
];

// Champion is a single team, scored separately (and chosen from the two finalists).
export const CHAMPION_POINTS = 50;

export const SCORERS = { count: 3, pointsPerGoal: 6 };
