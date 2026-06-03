import { json } from "../_lib/http.js";
import { getJSON, RESULTS_KEY } from "../_lib/kv.js";
import { normalizeResults } from "../_lib/results.js";

export async function onRequestGet({ env }) {
  const stored = await getJSON(env, RESULTS_KEY);
  return json({ results: normalizeResults(stored) });
}
