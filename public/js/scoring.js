// Pure scoring used by the leaderboard, the individual-bet view, and the node test.
import { ROUNDS, CHAMPION_POINTS, SCORERS } from "./rounds.js";

// Score one bet against the actual results.
// Returns { total, breakdown: [...] }.
export function scoreBet(bet, results) {
  const breakdown = [];
  let total = 0;

  for (const round of ROUNDS) {
    const picks = bet[round.key] || [];
    const actual = new Set(results[round.key] || []);
    let correct = 0;
    for (const team of picks) if (actual.has(team)) correct++;
    const points = correct * round.points;
    total += points;
    breakdown.push({
      key: round.key,
      label: round.label,
      correct,
      count: round.count,
      perItem: round.points,
      points,
    });
  }

  const champOk = !!bet.champion && bet.champion === results.champion;
  const champPoints = champOk ? CHAMPION_POINTS : 0;
  total += champPoints;
  breakdown.push({
    key: "champion",
    label: "Champion",
    correct: champOk ? 1 : 0,
    count: 1,
    perItem: CHAMPION_POINTS,
    points: champPoints,
  });

  const goals = results.goals || {};
  let scorerPoints = 0;
  const scorerDetail = [];
  for (const s of bet.scorers || []) {
    const g = Number(goals[`${s.country}|${s.player}`]) || 0;
    const points = g * SCORERS.pointsPerGoal;
    scorerPoints += points;
    scorerDetail.push({ ...s, goals: g, points });
  }
  total += scorerPoints;
  breakdown.push({
    key: "scorers",
    label: "Goalscorers",
    correct: scorerDetail.filter((d) => d.goals > 0).length,
    count: SCORERS.count,
    perItem: SCORERS.pointsPerGoal,
    points: scorerPoints,
    detail: scorerDetail,
  });

  return { total, breakdown };
}
