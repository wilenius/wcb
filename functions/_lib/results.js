// Results are entered manually by the admin (no live API on the available API
// tiers). This module normalizes the stored object and reports whether any
// results have been recorded yet.

export const ROUND_FIELDS = ["r32", "r16", "qf", "sf", "final"];

export function emptyResults() {
  return { r32: [], r16: [], qf: [], sf: [], final: [], champion: "", goals: {} };
}

export function normalizeResults(stored) {
  const out = emptyResults();
  if (stored) {
    for (const f of ROUND_FIELDS) if (Array.isArray(stored[f])) out[f] = stored[f];
    if (typeof stored.champion === "string") out.champion = stored.champion;
    if (stored.goals && typeof stored.goals === "object") out.goals = stored.goals;
  }
  out.updatedAt = (stored && stored.updatedAt) || null;
  out.hasResults =
    ROUND_FIELDS.some((f) => out[f].length) || !!out.champion || Object.keys(out.goals).length > 0;
  return out;
}

// Validates/cleans a results object coming from the admin form.
export function cleanResults(input) {
  const r = input || {};
  const out = {};
  for (const f of ROUND_FIELDS) {
    out[f] = Array.isArray(r[f]) ? r[f].map((s) => String(s).trim()).filter(Boolean) : [];
  }
  out.champion = typeof r.champion === "string" ? r.champion.trim() : "";
  out.goals = {};
  if (r.goals && typeof r.goals === "object") {
    for (const [k, v] of Object.entries(r.goals)) {
      const n = Number(v);
      if (k && !Number.isNaN(n)) out.goals[k.trim()] = n;
    }
  }
  out.updatedAt = new Date().toISOString();
  return out;
}
