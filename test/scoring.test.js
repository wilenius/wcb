import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreBet } from "../public/js/scoring.js";

// A bet where we control exactly what is correct.
const bet = {
  name: "Tester",
  r32: ["A", "B", "C", "D"],   // 2 correct
  r16: ["A", "B"],             // 1 correct
  qf: ["A"],                   // 1 correct
  sf: ["A"],                   // 0 correct
  final: ["A", "X"],           // 1 correct
  champion: "A",               // correct
  scorers: [
    { country: "A", player: "Striker" },  // 3 goals
    { country: "B", player: "Winger" },   // 0 goals (not in results)
    { country: "C", player: "Mid" },      // 1 goal
  ],
};

const results = {
  r32: ["A", "B", "Z"],
  r16: ["A", "Q"],
  qf: ["A"],
  sf: ["Q"],
  final: ["A", "Q"],
  champion: "A",
  goals: { "A|Striker": 3, "C|Mid": 1 },
};

test("scoreBet totals each category correctly", () => {
  const { total, breakdown } = scoreBet(bet, results);
  const by = Object.fromEntries(breakdown.map((b) => [b.key, b]));

  assert.equal(by.r32.points, 2 * 4);   // A,B
  assert.equal(by.r16.points, 1 * 8);   // A
  assert.equal(by.qf.points, 1 * 15);   // A
  assert.equal(by.sf.points, 0);        // none
  assert.equal(by.final.points, 1 * 35); // A
  assert.equal(by.champion.points, 50);
  assert.equal(by.scorers.points, (3 + 1) * 6); // Striker 3 + Mid 1

  const expected = 8 + 8 + 15 + 0 + 35 + 50 + 24;
  assert.equal(total, expected);
});

test("empty results give zero", () => {
  const { total } = scoreBet(bet, { r32: [], r16: [], qf: [], sf: [], final: [], champion: "", goals: {} });
  assert.equal(total, 0);
});

test("wrong champion scores nothing for champion", () => {
  const { breakdown } = scoreBet({ ...bet, champion: "X" }, results);
  const champ = breakdown.find((b) => b.key === "champion");
  assert.equal(champ.points, 0);
});
