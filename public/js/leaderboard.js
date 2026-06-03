import { getJSON, esc, flag, fmtDateTime } from "./common.js";
import { scoreBet } from "./scoring.js";

const app = document.getElementById("app");
let timer = null;

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
    renderLocked(status);
    return;
  }

  let bets, results;
  try {
    [bets, { results }] = await Promise.all([
      getJSON("/api/bets").then((d) => d.bets),
      getJSON("/api/results"),
    ]);
  } catch (e) {
    app.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
    return;
  }

  renderTable(bets, results);
  if (!timer) timer = setInterval(load, 180000); // refresh every 3 min
}

function renderLocked(status) {
  const remaining = Date.parse(status.deadline) - Date.now();
  app.innerHTML = `
    <div class="card center">
      <h2>The table opens after the deadline</h2>
      <p class="sub">Everyone's bets and the live standings appear once submissions close.</p>
      <div class="countdown" id="cd"></div>
      <p class="muted">Deadline: ${esc(fmtDateTime(status.deadline))}</p>
      <p>${status.submittedCount} bet${status.submittedCount === 1 ? "" : "s"} in so far.</p>
    </div>`;
  const cd = document.getElementById("cd");
  function tick() {
    const ms = Date.parse(status.deadline) - Date.now();
    if (ms <= 0) { cd.textContent = "Closing…"; load(); return; }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    cd.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }
  tick();
  if (remaining > 0) setInterval(tick, 1000);
}

function renderTable(bets, results) {
  const scored = bets
    .map((bet) => ({ bet, ...scoreBet(bet, results) }))
    .sort((a, b) => b.total - a.total || a.bet.name.localeCompare(b.bet.name));

  const noResults = !results.hasResults;
  const updated = results.updatedAt ? `Results updated ${esc(fmtDateTime(results.updatedAt))}` : "";

  let html = `<h2>Live table</h2>
    <p class="sub">${scored.length} players. ${noResults ? "No results recorded yet — everyone's on 0." : esc(updated)}</p>
    <div class="card" style="padding:6px 10px">
    <table class="board"><thead><tr><th class="rank">#</th><th>Player</th><th class="total">Points</th></tr></thead><tbody>`;

  scored.forEach((row, i) => {
    const rank = i + 1;
    html += `<tr class="row medal-${rank}" data-i="${i}">
      <td class="rank">${rank}</td>
      <td>${esc(row.bet.name)}</td>
      <td class="total">${row.total}</td></tr>
      <tr class="breakdown" id="bd-${i}" style="display:none"><td></td><td colspan="2">${breakdownHtml(row)}</td></tr>`;
  });
  html += `</tbody></table></div>
    <p class="muted center" style="font-size:.8rem">Tap a player to see their points breakdown. Auto-refreshes every few minutes.</p>`;
  app.innerHTML = html;

  app.querySelectorAll("tr.row").forEach((tr) => {
    tr.addEventListener("click", () => {
      const bd = document.getElementById("bd-" + tr.dataset.i);
      bd.style.display = bd.style.display === "none" ? "table-row" : "none";
    });
  });
}

function breakdownHtml(row) {
  const lines = row.breakdown.map((b) => {
    let detail = "";
    if (b.key === "scorers" && b.detail) {
      detail = b.detail
        .map((d) => `<div class="bd-line"><span>${flag(d.country)} ${esc(d.player)}</span>` +
          `<span class="b-pts">${d.goals} ⚽ → ${d.points}</span></div>`)
        .join("");
    }
    const head = b.key === "scorers"
      ? `${b.correct} scoring`
      : `${b.correct} correct${b.count > 1 ? ` / ${b.count}` : ""}`;
    return `<div class="bd-line"><span>${esc(b.label)} <span class="muted">(${head})</span></span>` +
      `<span class="b-pts">${b.points}</span></div>${detail}`;
  });
  return lines.join("");
}
