#!/usr/bin/env node
// Converts wc2026_squads.csv into the two static JSON files the frontend loads:
//   public/data/teams.json  -> ["Algeria", "Argentina", ...] (48 teams, alphabetical)
//   public/data/squads.json -> [{ country, player, pos }, ...] (every player, for search)
//
// Run from the repo root: `node scripts/prepare-data.mjs`

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = join(root, "wc2026_squads.csv");
const outDir = join(root, "public", "data");

const raw = readFileSync(csvPath, "utf8").trim();
const lines = raw.split(/\r?\n/);
const header = lines.shift().split(",").map((h) => h.trim());
const idx = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`CSV missing column "${name}" (have: ${header.join(", ")})`);
  return i;
};
const cCountry = idx("country");
const cPos = idx("position");
const cPlayer = idx("player");

const players = [];
const teamSet = new Set();
for (const line of lines) {
  if (!line.trim()) continue;
  const cols = line.split(",");
  if (cols.length !== header.length) {
    throw new Error(`Unexpected column count in row: ${line}`);
  }
  const country = cols[cCountry].trim();
  const player = cols[cPlayer].trim();
  const pos = cols[cPos].trim();
  teamSet.add(country);
  players.push({ country, player, pos });
}

const teams = [...teamSet].sort((a, b) => a.localeCompare(b));
players.sort(
  (a, b) => a.country.localeCompare(b.country) || a.player.localeCompare(b.player)
);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "teams.json"), JSON.stringify(teams) + "\n");
writeFileSync(join(outDir, "squads.json"), JSON.stringify(players) + "\n");

console.log(`Wrote ${teams.length} teams and ${players.length} players to public/data/`);
if (teams.length !== 48) {
  console.warn(`WARNING: expected 48 teams, got ${teams.length}`);
}
