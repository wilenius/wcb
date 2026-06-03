import { getJSON, esc, fmtDateTime } from "./common.js";
import { ROUNDS } from "./rounds.js";

const app = document.getElementById("app");
const KEYHDR = "x-admin-key";
let adminKey = sessionStorage.getItem("wcb_admin") || "";

start();

function start() {
  if (adminKey) showPanel();
  else showLogin();
}

function showLogin(errMsg) {
  app.innerHTML = `
    <div class="card">
      <h2>Admin sign in</h2>
      ${errMsg ? `<div class="msg err">${esc(errMsg)}</div>` : ""}
      <label class="field"><span>Admin key</span>
        <input type="password" id="ak" autocomplete="off"></label>
      <button class="btn" id="go">Enter</button>
    </div>`;
  document.getElementById("go").addEventListener("click", async () => {
    adminKey = document.getElementById("ak").value.trim();
    try {
      await api("GET", "/api/admin/keys");
      sessionStorage.setItem("wcb_admin", adminKey);
      showPanel();
    } catch (e) {
      adminKey = "";
      showLogin(e.message);
    }
  });
}

async function api(method, url, body) {
  const opts = { method, headers: { [KEYHDR]: adminKey } };
  if (body !== undefined) {
    opts.headers["content-type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function showPanel() {
  app.innerHTML = `
    <div class="row-between">
      <h2 style="flex:1">Admin</h2>
      <button class="btn secondary inline" id="logout" style="flex:0">Sign out</button>
    </div>
    <div id="keys"></div>
    <div id="results"></div>`;
  document.getElementById("logout").addEventListener("click", () => {
    sessionStorage.removeItem("wcb_admin");
    adminKey = "";
    showLogin();
  });
  await renderKeys();
  await renderResults();
}

/* ---------------- Access keys ---------------- */

async function renderKeys() {
  const host = document.getElementById("keys");
  let data;
  try { data = await api("GET", "/api/admin/keys"); }
  catch (e) { host.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; return; }

  const rows = data.keys.map((k) =>
    `<tr><td><code>${esc(k.key)}</code></td><td>${esc(k.label || "")}</td>
     <td>${k.used ? "✅ " + esc(k.usedBy || "") : "—"}</td></tr>`).join("");

  host.innerHTML = `
    <div class="card">
      <h3>Access keys (${data.keys.length})</h3>
      <p class="muted" style="font-size:.85rem">Enter one name per line, then generate. Hand each person their key.</p>
      <label class="field"><span>Names / labels (one per line)</span>
        <textarea id="labels" rows="4" placeholder="Heikki&#10;Matti&#10;Liisa"></textarea></label>
      <button class="btn inline" id="gen">Generate keys</button>
      <div id="gen-out"></div>
      <div class="spacer"></div>
      <table class="board"><thead><tr><th>Key</th><th>Label</th><th>Used by</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="3" class="muted">No keys yet.</td></tr>`}</tbody></table>
    </div>`;

  document.getElementById("gen").addEventListener("click", async () => {
    const labels = document.getElementById("labels").value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!labels.length) return;
    try {
      const res = await api("POST", "/api/admin/keys", { labels });
      const out = res.created.map((c) => `${c.label || "(no label)"}\t${c.key}`).join("\n");
      document.getElementById("gen-out").innerHTML =
        `<div class="msg ok">Generated ${res.created.length} keys — copy and hand them out:</div>
         <textarea rows="${Math.min(10, res.created.length + 1)}" readonly>${esc(out)}</textarea>`;
      await renderKeys();
    } catch (e) {
      document.getElementById("gen-out").innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
    }
  });
}

/* ---------------- Results ---------------- */

async function renderResults() {
  const host = document.getElementById("results");
  let m;
  try { m = (await api("GET", "/api/admin/results")).results; }
  catch (e) { host.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; return; }

  const goalsText = Object.entries(m.goals || {}).map(([k, v]) => `${k} = ${v}`).join("\n");
  const roundFields = ROUNDS.map((r) =>
    `<label class="field"><span>${esc(r.label)} — ${r.count} teams (one per line)</span>
      <textarea id="rf-${r.key}" rows="4">${esc((m[r.key] || []).join("\n"))}</textarea></label>`).join("");

  host.innerHTML = `
    <div class="card">
      <h3>Results</h3>
      <p class="muted" style="font-size:.85rem">
        Enter the real outcome after each round; the leaderboard recomputes from this.
        ${m.updatedAt ? "Last updated " + esc(fmtDateTime(m.updatedAt)) + "." : "Nothing recorded yet."}
      </p>
      <div id="res-msg"></div>
      ${roundFields}
      <label class="field"><span>World Champion</span>
        <input type="text" id="rf-champion" value="${esc(m.champion || "")}"></label>
      <label class="field"><span>Goals — one per line as <code>Country|Player = goals</code>
        (use the exact names from the player list)</span>
        <textarea id="rf-goals" rows="6" placeholder="Brazil|Vinicius Junior = 3">${esc(goalsText)}</textarea></label>
      <div class="row-between">
        <button class="btn inline" id="save">Save results</button>
        <button class="btn secondary inline" id="clear">Clear all results</button>
      </div>
    </div>`;

  document.getElementById("save").addEventListener("click", () => saveResults(collectResults()));

  document.getElementById("clear").addEventListener("click", () => {
    if (!confirm("Clear all recorded results?")) return;
    saveResults({ r32: [], r16: [], qf: [], sf: [], final: [], champion: "", goals: {} });
  });
}

function collectResults() {
  const results = { champion: document.getElementById("rf-champion").value.trim(), goals: {} };
  for (const r of ROUNDS) {
    results[r.key] = document.getElementById("rf-" + r.key).value
      .split("\n").map((s) => s.trim()).filter(Boolean);
  }
  for (const line of document.getElementById("rf-goals").value.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.lastIndexOf("=");
    if (i < 0) continue;
    const id = t.slice(0, i).trim();
    const n = Number(t.slice(i + 1).trim());
    if (id && !Number.isNaN(n)) results.goals[id] = n;
  }
  return results;
}

async function saveResults(results) {
  try {
    await api("POST", "/api/admin/results", { results });
    await renderResults();
  } catch (e) {
    document.getElementById("res-msg").innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
}
