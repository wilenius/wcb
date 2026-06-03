import { json, isPublished } from "../_lib/http.js";
import { BET_PREFIX } from "../_lib/kv.js";

export async function onRequestGet({ env }) {
  let submittedCount = 0;
  let cursor;
  do {
    const page = await env.WCB.list({ prefix: BET_PREFIX, cursor });
    submittedCount += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return json({
    deadline: env.DEADLINE || null,
    now: new Date().toISOString(),
    published: isPublished(env),
    submittedCount,
  });
}
