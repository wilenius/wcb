import { esc, flag, fmtDateTime } from "./common.js";
import { SCORERS } from "./rounds.js";
import { Funnel } from "./funnel.js";

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
//
// Recording results mirrors filling in a bet: the same funnel picker chooses who actually
// advanced each round + the champion, and the goalscorer list is pre-built from every
// player anyone bet on — the admin just types how many goals each scored. The leaderboard
// recomputes from this.

let resFunnel;

async function renderResults() {
  const host = document.getElementById("results");
  let m, bets;
  try {
    [m, { bets }] = await Promise.all([
      api("GET", "/api/admin/results").then((r) => r.results),
      api("GET", "/api/admin/bets"),
    ]);
  } catch (e) { host.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; return; }

  host.innerHTML = `
    <div class="card">
      <h3>Results</h3>
      <p class="muted" style="font-size:.85rem">
        Mark who advanced each round and the champion, then record goals below — just like
        filling in a bet. The leaderboard recomputes from this; update it as the tournament
        progresses. ${m.updatedAt ? "Last updated " + esc(fmtDateTime(m.updatedAt)) + "." : "Nothing recorded yet."}
      </p>
      <div id="res-msg"></div>
    </div>
    <div id="res-funnel"></div>
    <div id="res-goals"></div>
    <div class="card">
      <div class="row-between">
        <button class="btn inline" id="save">Save results</button>
        <button class="btn secondary inline" id="clear">Clear all results</button>
      </div>
    </div>`;

  resFunnel = new Funnel(document.getElementById("res-funnel"), () => {});
  resFunnel.setPicks(m);
  resFunnel.render();
  renderGoals(bets, m.goals || {});

  document.getElementById("save").addEventListener("click", () => saveResults(collectResults()));
  document.getElementById("clear").addEventListener("click", () => {
    if (!confirm("Clear all recorded results?")) return;
    saveResults({ r32: [], r16: [], qf: [], sf: [], final: [], champion: "", goals: {} });
  });
}

// Every distinct player anyone bet on, plus any already-recorded scorer, each with a
// goal-count input. Most-backed players first so the popular picks are easy to find.
function renderGoals(bets, goals) {
  const host = document.getElementById("res-goals");
  const players = new Map(); // id -> { country, player, backers }
  for (const bet of bets) {
    for (const s of bet.scorers || []) {
      const id = `${s.country}|${s.player}`;
      const e = players.get(id) || { country: s.country, player: s.player, backers: 0 };
      e.backers++;
      players.set(id, e);
    }
  }
  for (const id of Object.keys(goals)) {
    if (players.has(id)) continue;
    const [country, player] = id.split("|");
    players.set(id, { country, player, backers: 0 });
  }

  const rows = [...players.entries()]
    .sort((a, b) => b[1].backers - a[1].backers || a[1].player.localeCompare(b[1].player))
    .map(([id, p]) => {
      const g = Number(goals[id]) || 0;
      return `<div class="goal-row${g > 0 ? " scored" : ""}">
        <span class="fl">${flag(p.country)}</span>
        <span class="nm">${esc(p.player)} <span class="meta muted">· ${esc(p.country)}</span></span>
        <span class="meta muted backers">${p.backers ? p.backers + " backed" : ""}</span>
        <input type="number" min="0" inputmode="numeric" data-goal-id="${esc(id)}" value="${g || ""}" placeholder="0">
      </div>`;
    }).join("");

  host.innerHTML = `
    <div class="card">
      <div class="stage-head"><h3>Goalscorers</h3>
        <span class="pts">${SCORERS.pointsPerGoal} pts per goal scored</span></div>
      <p class="muted" style="font-size:.85rem;margin-top:0">
        Every player anyone bet on. Enter goals scored (penalty-shootout goals excluded); leave blank for none.</p>
      ${rows || `<p class="muted">No bets yet, so no players to score.</p>`}
    </div>`;

  host.querySelectorAll("input[data-goal-id]").forEach((inp) => {
    inp.addEventListener("input", () =>
      inp.closest(".goal-row").classList.toggle("scored", Number(inp.value) > 0));
  });
}

function collectResults() {
  const results = { ...resFunnel.getPicks(), goals: {} };
  results.champion = results.champion || "";
  document.querySelectorAll("#res-goals input[data-goal-id]").forEach((inp) => {
    const n = Number(inp.value);
    if (inp.value.trim() !== "" && !Number.isNaN(n) && n > 0) results.goals[inp.dataset.goalId] = n;
  });
  return results;
}

async function saveResults(results) {
  try {
    await api("POST", "/api/admin/results", { results });
    await renderResults();
    document.getElementById("res-msg").innerHTML = `<div class="msg ok">Results saved.</div>`;
  } catch (e) {
    document.getElementById("res-msg").innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
}
