import { ROUNDS } from "./rounds.js";
import teams from "../../public/data/teams.json";

const TEAM_SET = new Set(teams);

// Validates a submitted picks object. Returns { ok, error?, picks? } where the
// returned picks are normalized (trimmed). Enforces exact counts, uniqueness,
// known team names, the round funnel (each round is a subset of the previous),
// and champion being one of the two finalists.
export function validatePicks(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Missing picks." };

  const picks = {};
  let prev = null; // previous (shallower) round's set, for nesting checks

  for (const round of ROUNDS) {
    const arr = input[round.key];
    if (!Array.isArray(arr)) return { ok: false, error: `${round.label}: missing selection.` };
    const cleaned = arr.map((t) => (typeof t === "string" ? t.trim() : ""));

    if (cleaned.some((t) => !t)) return { ok: false, error: `${round.label}: blank team.` };
    if (cleaned.length !== round.count) {
      return { ok: false, error: `${round.label}: pick exactly ${round.count}.` };
    }
    const set = new Set(cleaned);
    if (set.size !== cleaned.length) return { ok: false, error: `${round.label}: duplicate team.` };
    for (const t of cleaned) {
      if (!TEAM_SET.has(t)) return { ok: false, error: `${round.label}: unknown team "${t}".` };
    }
    if (prev) {
      for (const t of cleaned) {
        if (!prev.has(t)) {
          return { ok: false, error: `${round.label}: "${t}" must also be picked in the previous round.` };
        }
      }
    }
    picks[round.key] = cleaned;
    prev = set;
  }

  const champion = typeof input.champion === "string" ? input.champion.trim() : "";
  if (!champion) return { ok: false, error: "Champion: missing selection." };
  if (!picks.final.includes(champion)) {
    return { ok: false, error: "Champion must be one of your two finalists." };
  }
  picks.champion = champion;

  const scorersIn = Array.isArray(input.scorers) ? input.scorers : [];
  if (scorersIn.length !== 3) return { ok: false, error: "Pick exactly 3 goalscorers." };
  const scorers = [];
  const seen = new Set();
  for (const s of scorersIn) {
    const country = s && typeof s.country === "string" ? s.country.trim() : "";
    const player = s && typeof s.player === "string" ? s.player.trim() : "";
    if (!country || !player) return { ok: false, error: "Each goalscorer needs a player." };
    const id = `${country}|${player}`;
    if (seen.has(id)) return { ok: false, error: "Duplicate goalscorer." };
    seen.add(id);
    scorers.push({ country, player });
  }
  picks.scorers = scorers;

  return { ok: true, picks };
}
