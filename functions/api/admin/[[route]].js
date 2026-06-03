import { json, error, isAdmin } from "../../_lib/http.js";
import { getJSON, putJSON, listAccessKeys, listBets, KEY_PREFIX, RESULTS_KEY } from "../../_lib/kv.js";
import { normalizeResults, cleanResults } from "../../_lib/results.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I/L)

function makeKey(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

export async function onRequest({ request, env, params }) {
  if (!isAdmin(request, env)) return error("Forbidden.", 403);

  const seg = Array.isArray(params.route) ? params.route : params.route ? [params.route] : [];
  const resource = seg[0] || "";
  const method = request.method.toUpperCase();

  // GET /api/admin/keys  -> list keys + usage
  if (resource === "keys" && method === "GET") {
    return json({ keys: await listAccessKeys(env) });
  }

  // POST /api/admin/keys  { count, labels?: string[] }  -> generate keys
  if (resource === "keys" && method === "POST") {
    const body = await readJson(request);
    const labels = Array.isArray(body.labels) ? body.labels.map((l) => String(l).trim()) : [];
    const count = Math.max(0, Math.min(200, Number(body.count) || labels.length || 0));
    if (!count) return error("Specify a count or a list of labels.");
    const created = [];
    for (let i = 0; i < count; i++) {
      let key;
      do {
        key = makeKey();
      } while (await env.WCB.get(KEY_PREFIX + key));
      const label = labels[i] || "";
      await putJSON(env, KEY_PREFIX + key, { label, used: false, createdAt: new Date().toISOString() });
      created.push({ key, label });
    }
    return json({ created });
  }

  // GET /api/admin/results  -> current results for editing
  if (resource === "results" && method === "GET") {
    const stored = await getJSON(env, RESULTS_KEY);
    return json({ results: normalizeResults(stored) });
  }

  // POST /api/admin/results  { results: { r32, r16, qf, sf, final, champion, goals } }
  if (resource === "results" && method === "POST") {
    const body = await readJson(request);
    const clean = cleanResults(body.results);
    await putJSON(env, RESULTS_KEY, clean);
    return json({ ok: true, results: normalizeResults(clean) });
  }

  // GET /api/admin/bets  -> all bets with names + keys (admin tracking)
  if (resource === "bets" && method === "GET") {
    return json({ bets: await listBets(env) });
  }

  return error("Unknown admin endpoint.", 404);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
