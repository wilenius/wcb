import { validatePicks } from "../_lib/validate.js";
import { getJSON, putJSON, KEY_PREFIX, BET_PREFIX } from "../_lib/kv.js";
import { json, error, isPublished } from "../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (isPublished(env)) return error("Submissions are closed — the deadline has passed.", 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body.");
  }

  const key = String(body.key || "").trim();
  const name = String(body.name || "").trim().slice(0, 80);
  if (!key) return error("Access key is required.");
  if (!name) return error("Please enter your name.");

  const keyRec = await getJSON(env, KEY_PREFIX + key);
  if (!keyRec) return error("Invalid access key.", 403);
  if (keyRec.used) return error("This access key has already been used to submit a bet.", 409);

  const v = validatePicks(body.picks);
  if (!v.ok) return error(v.error);

  const submittedAt = new Date().toISOString();
  const bet = { key, name, submittedAt, ...v.picks };
  await putJSON(env, BET_PREFIX + key, bet);
  await putJSON(env, KEY_PREFIX + key, { ...keyRec, used: true, usedBy: name, usedAt: submittedAt });

  return json({ ok: true, name });
}
