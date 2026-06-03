import { getJSON, postJSON, esc, flag, teamLabel, fmtDateTime } from "./common.js";
import { ROUNDS, CHAMPION_POINTS, SCORERS } from "./rounds.js";

const app = document.getElementById("app");

const state = {
  sel: Object.fromEntries(ROUNDS.map((r) => [r.key, new Set()])),
  champion: null,
  scorers: [null, null, null],
};
let TEAMS = [];
let SQUADS = [];

init();

async function init() {
  let status;
  try {
    status = await getJSON("/api/status");
  } catch (e) {
    app.innerHTML = `<div class="msg err">Could not load the pool: ${esc(e.message)}</div>`;
    return;
  }

  if (status.published) {
    app.innerHTML = `
      <div class="card center">
        <h2>Betting is closed</h2>
        <p class="sub">The deadline (${esc(fmtDateTime(status.deadline))}) has passed.</p>
        <p>See everyone's picks and the live table:</p>
        <div class="row-between">
          <a class="link" href="/bets">All bets →</a>
          <a class="link" href="/leaderboard">Leaderboard →</a>
        </div>
      </div>`;
    return;
  }

  [TEAMS, SQUADS] = await Promise.all([getJSON("/data/teams.json"), getJSON("/data/squads.json")]);
  render(status);
}

function render(status) {
  app.innerHTML = `
    <h2>Fill in your bet</h2>
    <p class="sub">One submission per access key — you can't edit afterwards. Deadline: <strong>${esc(fmtDateTime(status.deadline))}</strong>. Picks stay hidden until then.</p>

    <div class="card">
      <label class="field"><span>Your name (shown to everyone)</span>
        <input type="text" id="name" maxlength="80" placeholder="e.g. Heikki" autocomplete="off"></label>
      <label class="field"><span>Access key</span>
        <input type="text" id="key" placeholder="The key you were given" autocomplete="off"></label>
    </div>

    <div id="funnel"></div>
    <div id="scorers"></div>

    <div id="msg"></div>
    <button class="btn" id="submit" disabled>Submit my bet</button>
    <div class="spacer"></div>
    <p class="muted center" style="font-size:.8rem">Tip: pick 32 teams, then narrow them down round by round.</p>
  `;
  renderFunnel();
  renderScorers();
  document.getElementById("name").addEventListener("input", updateSubmit);
  document.getElementById("key").addEventListener("input", updateSubmit);
  document.getElementById("submit").addEventListener("click", submit);
}

function candidatesFor(idx) {
  if (idx === 0) return TEAMS;
  return [...state.sel[ROUNDS[idx - 1].key]];
}

function renderFunnel() {
  const host = document.getElementById("funnel");
  host.innerHTML = "";

  ROUNDS.forEach((round, idx) => {
    const prevDone = idx === 0 || state.sel[ROUNDS[idx - 1].key].size === ROUNDS[idx - 1].count;
    const chosen = state.sel[round.key];
    const cands = candidatesFor(idx);

    const card = document.createElement("div");
    card.className = "card" + (prevDone ? "" : " locked");
    const done = chosen.size === round.count;
    card.innerHTML = `
      <div class="stage-head">
        <h3>${esc(round.label)}</h3>
        <span class="pts">${round.points} pts each</span>
        <span class="counter ${done ? "done" : ""}">${chosen.size} / ${round.count}</span>
      </div>
      <div class="grid"></div>`;
    const grid = card.querySelector(".grid");

    for (const team of cands) {
      const sel = chosen.has(team);
      const full = chosen.size >= round.count && !sel;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (sel ? " sel" : "") + (full ? " disabled" : "");
      chip.innerHTML = `<span class="fl">${flag(team)}</span><span class="nm">${esc(team)}</span>`;
      chip.addEventListener("click", () => toggleTeam(round.key, idx, team));
      grid.appendChild(chip);
    }
    host.appendChild(card);
  });

  // Champion stage
  const finalSet = state.sel.final;
  const finalDone = finalSet.size === ROUNDS[ROUNDS.length - 1].count;
  const champCard = document.createElement("div");
  champCard.className = "card" + (finalDone ? "" : " locked");
  champCard.innerHTML = `
    <div class="stage-head">
      <h3>World Champion</h3>
      <span class="pts">${CHAMPION_POINTS} pts</span>
      <span class="counter ${state.champion ? "done" : ""}">${state.champion ? 1 : 0} / 1</span>
    </div>
    <div class="grid"></div>`;
  const cgrid = champCard.querySelector(".grid");
  for (const team of finalSet) {
    const sel = state.champion === team;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (sel ? " sel champ" : "");
    chip.innerHTML = `<span class="fl">${flag(team)}</span><span class="nm">${esc(team)}</span>`;
    chip.addEventListener("click", () => {
      state.champion = state.champion === team ? null : team;
      renderFunnel();
      updateSubmit();
    });
    cgrid.appendChild(chip);
  }
  host.appendChild(champCard);
}

function toggleTeam(roundKey, idx, team) {
  const round = ROUNDS[idx];
  const set = state.sel[roundKey];
  if (set.has(team)) {
    set.delete(team);
    // cascade: remove from all deeper rounds + champion
    for (let j = idx + 1; j < ROUNDS.length; j++) state.sel[ROUNDS[j].key].delete(team);
    if (state.champion === team) state.champion = null;
  } else {
    if (set.size >= round.count) return;
    set.add(team);
  }
  renderFunnel();
  updateSubmit();
}

/* ---------- Goalscorers ---------- */

function renderScorers() {
  const host = document.getElementById("scorers");
  host.innerHTML = `
    <div class="card">
      <div class="stage-head"><h3>Three goalscorers</h3>
        <span class="pts">${SCORERS.pointsPerGoal} pts per goal scored</span></div>
      <p class="muted" style="font-size:.85rem;margin-top:0">Search any player from any squad. Penalty-shootout goals don't count.</p>
      <div id="scorer-slots"></div>
    </div>`;
  const slots = host.querySelector("#scorer-slots");
  for (let i = 0; i < SCORERS.count; i++) slots.appendChild(scorerSlot(i));
}

function scorerSlot(i) {
  const wrap = document.createElement("div");
  wrap.className = "scorer-slot";
  const chosen = state.scorers[i];
  if (chosen) {
    wrap.innerHTML = `<div class="chosen">
      <span class="fl">${flag(chosen.country)}</span>
      <span class="nm">${esc(chosen.player)} <span class="meta muted">· ${esc(chosen.country)}</span></span>
      <span class="x" title="Remove">✕</span></div>`;
    wrap.querySelector(".x").addEventListener("click", () => {
      state.scorers[i] = null;
      renderScorers();
      updateSubmit();
    });
    return wrap;
  }

  const input = document.createElement("input");
  input.type = "search";
  input.name = `scorer${i + 1}`;
  input.placeholder = `Goalscorer ${i + 1} — type a name`;
  input.autocomplete = "off";
  const list = document.createElement("div");
  list.className = "results-list";
  list.style.display = "none";
  wrap.appendChild(input);
  wrap.appendChild(list);

  const chosenIds = new Set(state.scorers.filter(Boolean).map((s) => `${s.country}|${s.player}`));

  function update() {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.style.display = "none"; return; }
    const matches = [];
    for (const p of SQUADS) {
      const id = `${p.country}|${p.player}`;
      if (chosenIds.has(id)) continue;
      if (p.player.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)) {
        matches.push(p);
        if (matches.length >= 40) break;
      }
    }
    if (!matches.length) {
      list.innerHTML = `<div class="meta">No players found</div>`;
    } else {
      list.innerHTML = matches
        .map((p, idx) => `<div data-idx="${idx}">${flag(p.country)} ${esc(p.player)}
          <span class="meta">${esc(p.pos)} · ${esc(p.country)}</span></div>`)
        .join("");
      [...list.children].forEach((el, idx) => {
        if (matches[idx]) el.addEventListener("click", () => {
          state.scorers[i] = { country: matches[idx].country, player: matches[idx].player };
          renderScorers();
          updateSubmit();
        });
      });
    }
    list.style.display = "block";
  }
  input.addEventListener("input", update);
  input.addEventListener("focus", update);
  input.addEventListener("blur", () => setTimeout(() => (list.style.display = "none"), 150));
  return wrap;
}

/* ---------- Submit ---------- */

function isComplete() {
  const name = (document.getElementById("name")?.value || "").trim();
  const key = (document.getElementById("key")?.value || "").trim();
  const roundsOk = ROUNDS.every((r) => state.sel[r.key].size === r.count);
  const scorersOk = state.scorers.every(Boolean);
  return name && key && roundsOk && state.champion && scorersOk;
}

function updateSubmit() {
  const btn = document.getElementById("submit");
  if (btn) btn.disabled = !isComplete();
}

async function submit() {
  const btn = document.getElementById("submit");
  const msg = document.getElementById("msg");
  msg.innerHTML = "";
  btn.disabled = true;

  const picks = { champion: state.champion, scorers: state.scorers };
  for (const r of ROUNDS) picks[r.key] = [...state.sel[r.key]];

  const body = {
    key: document.getElementById("key").value.trim(),
    name: document.getElementById("name").value.trim(),
    picks,
  };

  try {
    const res = await postJSON("/api/submit", body);
    app.innerHTML = `
      <div class="card center">
        <h2>✅ Bet locked in</h2>
        <p class="sub">Thanks, ${esc(res.name)}. Your picks are saved and stay hidden until the deadline.</p>
        <p>Come back after the deadline for the <a class="link" href="/leaderboard">live table</a>.</p>
      </div>`;
    window.scrollTo(0, 0);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
    btn.disabled = false;
  }
}
