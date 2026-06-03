// Thin helpers over the WCB KV namespace.

export const KEY_PREFIX = "accesskey:";
export const BET_PREFIX = "bet:";
export const RESULTS_KEY = "results";

export async function getJSON(env, key, fallback = null) {
  const raw = await env.WCB.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function putJSON(env, key, value) {
  await env.WCB.put(key, JSON.stringify(value));
}

// Returns all bets as an array of bet objects (each already includes its name).
export async function listBets(env) {
  const bets = [];
  let cursor;
  do {
    const page = await env.WCB.list({ prefix: BET_PREFIX, cursor });
    for (const k of page.keys) {
      const bet = await getJSON(env, k.name);
      if (bet) bets.push(bet);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  bets.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return bets;
}

export async function listAccessKeys(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.WCB.list({ prefix: KEY_PREFIX, cursor });
    for (const k of page.keys) {
      const rec = await getJSON(env, k.name);
      if (rec) out.push({ key: k.name.slice(KEY_PREFIX.length), ...rec });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  out.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  return out;
}
