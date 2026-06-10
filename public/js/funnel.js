// The tournament funnel picker, shared by the bet form (predict who advances) and the
// admin Results panel (record who actually advanced). It walks Round of 32 → … → Final
// → Champion: the Round of 32 is laid out by group and capped at 3 per group (the bottom
// team can't advance), and each later round only offers the teams chosen in the round
// before it. Holds its own selection state and calls onChange after every edit.

import { esc, flag } from "./common.js";
import { ROUNDS, CHAMPION_POINTS } from "./rounds.js";
import { GROUPS } from "./tournament.js";

// team -> group name, so the Round of 32 picker can be laid out and capped per group.
const TEAM_GROUP = {};
for (const g of GROUPS) for (const t of g.teams) TEAM_GROUP[t] = g.name;

export class Funnel {
  constructor(host, onChange) {
    this.host = host;
    this.onChange = onChange || (() => {});
    this.sel = Object.fromEntries(ROUNDS.map((r) => [r.key, new Set()]));
    this.champion = null;
  }

  // Load existing picks (per-round arrays + champion string) into the state.
  setPicks(picks) {
    for (const r of ROUNDS) this.sel[r.key] = new Set((picks && picks[r.key]) || []);
    this.champion = (picks && picks.champion) || null;
  }

  // Current selection as plain per-round arrays + champion (string or null).
  getPicks() {
    const out = { champion: this.champion };
    for (const r of ROUNDS) out[r.key] = [...this.sel[r.key]];
    return out;
  }

  // Per-group tally of the Round of 32 picks.
  r32GroupCounts() {
    const counts = Object.fromEntries(GROUPS.map((g) => [g.name, 0]));
    for (const t of this.sel.r32) counts[TEAM_GROUP[t]]++;
    return counts;
  }

  // A valid Round of 32 has all 32 picks and 2 or 3 from every group: a group's bottom
  // team never advances, and its top two always do, so each group sends 2 or 3.
  r32Valid() {
    if (this.sel.r32.size !== ROUNDS[0].count) return false;
    const counts = this.r32GroupCounts();
    return GROUPS.every((g) => counts[g.name] >= 2 && counts[g.name] <= 3);
  }

  isComplete() {
    return (
      this.r32Valid() &&
      ROUNDS.slice(1).every((r) => this.sel[r.key].size === r.count) &&
      !!this.champion
    );
  }

  changed() {
    this.render();
    this.onChange();
  }

  toggleTeam(roundKey, idx, team) {
    const round = ROUNDS[idx];
    const set = this.sel[roundKey];
    if (set.has(team)) {
      set.delete(team);
      // cascade: remove from all deeper rounds + champion
      for (let j = idx + 1; j < ROUNDS.length; j++) this.sel[ROUNDS[j].key].delete(team);
      if (this.champion === team) this.champion = null;
    } else {
      if (set.size >= round.count) return;
      // Round of 32: never more than 3 teams from one group (the 4th can't advance).
      if (idx === 0 && this.r32GroupCounts()[TEAM_GROUP[team]] >= 3) return;
      set.add(team);
    }
    this.changed();
  }

  render() {
    this.host.innerHTML = "";
    this.host.appendChild(this.buildR32Card());

    ROUNDS.slice(1).forEach((round, i) => {
      const idx = i + 1;
      const prev = ROUNDS[idx - 1];
      const prevDone = idx === 1 ? this.r32Valid() : this.sel[prev.key].size === prev.count;
      const chosen = this.sel[round.key];
      const cands = [...this.sel[prev.key]];

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
        chip.addEventListener("click", () => this.toggleTeam(round.key, idx, team));
        grid.appendChild(chip);
      }
      this.host.appendChild(card);
    });

    this.host.appendChild(this.buildChampionCard());
  }

  // The Round of 32 stage is laid out by group (like the bracket's group divisions) so
  // it's clear which teams compete with each other, and impossible sets are blocked:
  // at most 3 picks per group, and the stage isn't complete until every group has 2–3.
  buildR32Card() {
    const round = ROUNDS[0];
    const chosen = this.sel.r32;
    const counts = this.r32GroupCounts();
    const valid = this.r32Valid();

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="stage-head">
        <h3>${esc(round.label)}</h3>
        <span class="pts">${round.points} pts each</span>
        <span class="counter ${valid ? "done" : ""}">${chosen.size} / ${round.count}</span>
      </div>
      <p class="muted hint">Pick who survives the groups — 2 or 3 teams from each group (the bottom team is out; the top two always go through).</p>
      <div class="groups"></div>`;
    const wrap = card.querySelector(".groups");

    for (const g of GROUPS) {
      const n = counts[g.name];
      const gcard = document.createElement("div");
      gcard.className = "grp";
      gcard.innerHTML = `<div class="grp-h">Group ${esc(g.name)}<span class="grp-n ${n >= 2 ? "ok" : "low"}">${n}/3</span></div>`;
      for (const team of g.teams) {
        const sel = chosen.has(team);
        const blocked = !sel && (chosen.size >= round.count || n >= 3);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip" + (sel ? " sel" : "") + (blocked ? " disabled" : "");
        chip.innerHTML = `<span class="fl">${flag(team)}</span><span class="nm">${esc(team)}</span>`;
        if (sel || !blocked) chip.addEventListener("click", () => this.toggleTeam("r32", 0, team));
        gcard.appendChild(chip);
      }
      wrap.appendChild(gcard);
    }
    return card;
  }

  buildChampionCard() {
    const finalSet = this.sel.final;
    const finalDone = finalSet.size === ROUNDS[ROUNDS.length - 1].count;
    const card = document.createElement("div");
    card.className = "card" + (finalDone ? "" : " locked");
    card.innerHTML = `
      <div class="stage-head">
        <h3>World Champion</h3>
        <span class="pts">${CHAMPION_POINTS} pts</span>
        <span class="counter ${this.champion ? "done" : ""}">${this.champion ? 1 : 0} / 1</span>
      </div>
      <div class="grid"></div>`;
    const cgrid = card.querySelector(".grid");
    for (const team of finalSet) {
      const sel = this.champion === team;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (sel ? " sel champ" : "");
      chip.innerHTML = `<span class="fl">${flag(team)}</span><span class="nm">${esc(team)}</span>`;
      chip.addEventListener("click", () => {
        this.champion = this.champion === team ? null : team;
        this.changed();
      });
      cgrid.appendChild(chip);
    }
    return card;
  }
}
