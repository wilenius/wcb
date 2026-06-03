// Static WC2026 group divisions (the 12 groups of 4), used to lay out and constrain
// the Round of 32 picker. Hand-maintained from openfootball/worldcup (2026--usa/cup.txt).
// Team names match public/data/teams.json (the canonical names used across the app),
// e.g. "Czechia" not "Czech Republic", "Turkiye" not "Turkey".

export const GROUPS = [
  { name: "A", teams: ["Mexico", "South Africa", "South Korea", "Czechia"] },
  { name: "B", teams: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"] },
  { name: "C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  { name: "D", teams: ["USA", "Paraguay", "Australia", "Turkiye"] },
  { name: "E", teams: ["Germany", "Curacao", "Ivory Coast", "Ecuador"] },
  { name: "F", teams: ["Netherlands", "Japan", "Sweden", "Tunisia"] },
  { name: "G", teams: ["Belgium", "Egypt", "Iran", "New Zealand"] },
  { name: "H", teams: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"] },
  { name: "I", teams: ["France", "Senegal", "Iraq", "Norway"] },
  { name: "J", teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
  { name: "K", teams: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"] },
  { name: "L", teams: ["England", "Croatia", "Ghana", "Panama"] },
];
