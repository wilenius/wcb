import { json, error, isPublished } from "../_lib/http.js";
import { listBets } from "../_lib/kv.js";

export async function onRequestGet({ env }) {
  if (!isPublished(env)) {
    return error("Bets are revealed after the deadline.", 403);
  }
  const bets = await listBets(env);
  // Never expose the access keys.
  const publicBets = bets.map(({ key, ...rest }) => rest);
  return json({ bets: publicBets });
}
