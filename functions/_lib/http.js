// Small JSON response helpers and admin-auth gate.

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

// Constant-ish time comparison to avoid trivial timing leaks on the admin key.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Returns true if the request carries the correct admin key (header or ?admin=).
export function isAdmin(request, env) {
  const expected = env.ADMIN_KEY;
  if (!expected) return false;
  const url = new URL(request.url);
  const provided = request.headers.get("x-admin-key") || url.searchParams.get("admin") || "";
  return safeEqual(provided, expected);
}

export function deadlineMs(env) {
  const d = Date.parse(env.DEADLINE || "");
  return Number.isNaN(d) ? Infinity : d;
}

export function isPublished(env) {
  return Date.now() >= deadlineMs(env);
}
