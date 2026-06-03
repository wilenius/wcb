import { getJSON, esc, flag, fmtDateTime } from "./common.js";
import { ROUNDS } from "./rounds.js";

const app = document.getElementById("app");

load();

async function load() {
  let status;
  try {
    status = await getJSON("/api/status");
  } catch (e) {
    app.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
    return;
  }

  if (!status.published) {
    app.innerHTML = `
      <div class="card center">
        <h2>Bets are hidden until the deadline</h2>
        <p class="sub">All picks are revealed at ${esc(fmtDateTime(status.deadline))}.</p>
        <p>${status.submittedCount} bet${status.submittedCount === 1 ? "" : "s"} submitted so far.</p>
      </div>`;
    return;
  }

  let bets, results;
  try {
    [{ bets }, { results }] = await Promise.all([getJSON("/api/bets"), getJSON("/api/results")]);
  } catch (e) {
    app.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
    return;
  }

  render(bets, results);
}

function render(bets, results) {
  let html = `<h2>All bets</h2><p class="sub">${bets.length} player${bets.length === 1 ? "" : "s"}. Tap a name to see their full card. ✓ marks picks that have come true.</p>`;
  bets.forEach((bet, i) => {
    html += `
      <div class="card" style="padding:0">
        <button type="button" class="chip" style="width:100%;border:none;border-radius:12px;justify-content:space-between" data-i="${i}">
          <span class="nm">${esc(bet.name)}</span><span class="muted">view ▾</span>
        </button>
        <div id="b-${i}" style="display:none;padding:0 16px 16px">${betCard(bet, results)}</div>
      </div>`;
  });
  app.innerHTML = html;
  app.querySelectorAll("button[data-i]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = document.getElementById("b-" + btn.dataset.i);
      const open = box.style.display !== "none";
      box.style.display = open ? "none" : "block";
      btn.querySelector(".muted").textContent = open ? "view ▾" : "hide ▴";
    });
  });
}

function tags(teams, actualSet, championPick, championActual) {
  return teams
    .map((t) => {
      const hit = actualSet && actualSet.has(t);
      const isChamp = t === championPick;
      const cls = isChamp ? "tag gold" : hit ? "tag hit" : "tag";
      const mark = hit || (isChamp && t === championActual) ? " ✓" : "";
      return `<span class="${cls}">${flag(t)} ${esc(t)}${mark}</span>`;
    })
    .join("");
}

function betCard(bet, results) {
  let html = "";
  for (const r of ROUNDS) {
    const actual = new Set(results[r.key] || []);
    html += `<div class="pick-group"><h4>${esc(r.label)} (${r.points} pts each)</h4>
      <div class="tags">${tags(bet[r.key] || [], actual)}</div></div>`;
  }
  // Champion
  const champHit = bet.champion && bet.champion === results.champion;
  html += `<div class="pick-group"><h4>Champion (50 pts)</h4>
    <div class="tags"><span class="tag gold">${flag(bet.champion)} ${esc(bet.champion)}${champHit ? " ✓" : ""}</span></div></div>`;
  // Scorers
  const goals = results.goals || {};
  html += `<div class="pick-group"><h4>Goalscorers (6 pts / goal)</h4><div class="tags">` +
    (bet.scorers || [])
      .map((s) => {
        const g = Number(goals[`${s.country}|${s.player}`]) || 0;
        const cls = g > 0 ? "tag hit" : "tag";
        return `<span class="${cls}">${flag(s.country)} ${esc(s.player)}${g > 0 ? ` ✓ ${g}⚽` : ""}</span>`;
      })
      .join("") +
    `</div></div>`;
  return html;
}
