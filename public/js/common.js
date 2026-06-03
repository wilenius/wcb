// Shared browser helpers: fetch wrappers, escaping, and flag emoji.

export async function getJSON(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function postJSON(url, body, extraHeaders = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Country (as used in wc2026_squads.csv) -> ISO-3166 alpha-2.
const ISO2 = {
  Algeria: "DZ", Argentina: "AR", Australia: "AU", Austria: "AT", Belgium: "BE",
  "Bosnia and Herzegovina": "BA", Brazil: "BR", Canada: "CA", "Cape Verde": "CV",
  Colombia: "CO", Croatia: "HR", Curacao: "CW", Czechia: "CZ", "DR Congo": "CD",
  Ecuador: "EC", Egypt: "EG", France: "FR", Germany: "DE", Ghana: "GH", Haiti: "HT",
  Iran: "IR", Iraq: "IQ", "Ivory Coast": "CI", Japan: "JP", Jordan: "JO", Mexico: "MX",
  Morocco: "MA", Netherlands: "NL", "New Zealand": "NZ", Norway: "NO", Panama: "PA",
  Paraguay: "PY", Portugal: "PT", Qatar: "QA", "Saudi Arabia": "SA", Senegal: "SN",
  "South Africa": "ZA", "South Korea": "KR", Spain: "ES", Sweden: "SE", Switzerland: "CH",
  Tunisia: "TN", Turkiye: "TR", Uruguay: "UY", USA: "US", Uzbekistan: "UZ",
};
// Subdivision flags that have no alpha-2 code.
const SPECIAL = { England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" };

export function flag(country) {
  if (SPECIAL[country]) return SPECIAL[country];
  const code = ISO2[country];
  if (!code) return "🏳️";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// "Algeria" -> "🇩🇿 Algeria"
export function teamLabel(country) {
  return `${flag(country)} ${country}`;
}

export function fmtDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Helsinki",
    }) + " (Helsinki)";
  } catch {
    return iso;
  }
}
