/* ==========================================================================
   TRADING PAINT — a stock-car deckbuilder (Sprint season, solo vs AI rivals)
   Implements the systems from trading-paint-design.md v0.2:
   team tableau, tactic deck + pit-energy cap, Race Score -> 40-car finish
   bands, the shared incident deck, the real 2026 NASCAR Cup points curve,
   and a Garage between races. Pure client-side, no dependencies.
   ========================================================================== */
'use strict';

/* ---------- tiny utils ---------- */
const $  = (sel, el = document) => el.querySelector(sel);
const rand  = n => Math.floor(Math.random() * n);
const d6    = () => rand(6) + 1;
const pick  = arr => arr[rand(arr.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clone = o => JSON.parse(JSON.stringify(o));
const esc   = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ==========================================================================
   STATIC DATA (from §8 of the design doc)
   ========================================================================== */

// --- Team pools ---
const DRIVERS = {
  freshman:  { name: 'Rookie "Freshman"', SPD: 3, HAN: 3, abil: 'Reroll one natural 1 each race', tag: 'Rookie' },
  kyle:      { name: 'Kyle Ace',        SPD: 5, HAN: 3, abil: 'Aggression tactics cost 0 energy', tag: 'Charger',      cost: 8, hook: 'kyle' },
  dale:      { name: 'Dale Steady',     SPD: 3, HAN: 4, abil: 'Ignore the first −DUR incident each race', tag: 'Ironman', cost: 8, hook: 'dale' },
  rico:      { name: 'Rico Turns',      SPD: 3, HAN: 5, abil: '+2 Score on road & short tracks', tag: 'Wheelman',      cost: 8, hook: 'rico' },
  lopez:     { name: 'Lightning Lopez', SPD: 4, HAN: 4, abil: '+3 Score in the final stage', tag: 'Closer',           cost: 9, hook: 'lopez' },
  buddy:     { name: 'Buddy Draft',     SPD: 5, HAN: 2, abil: 'Your Draft tactics give +2 extra', tag: 'Restrictor ace', cost: 8, hook: 'buddy' },
  rook:      { name: 'Rook Sparks',     SPD: 4, HAN: 3, abil: '—', tag: 'Budget',                                     cost: 6 },
};
const CARS = {
  base:        { name: 'Base Chassis', SPD: 3, HAN: 3, DUR: 3 },
  apex:        { name: 'Apex GT',      SPD: 4, HAN: 4, DUR: 3, cost: 7 },
  ironhide:    { name: 'Ironhide',     SPD: 3, HAN: 3, DUR: 5, cost: 7 },
  slipstream:  { name: 'Slipstream',   SPD: 5, HAN: 3, DUR: 2, cost: 6 },
  cornerhugger:{ name: 'Cornerhugger', SPD: 3, HAN: 5, DUR: 3, cost: 6 },
};
const CHIEFS = {
  veteran: { name: 'Veteran Hand',  abil: '+1 to any one stat (chosen after track reveal)', hook: 'bonus1' },
  sam:     { name: 'Strategist Sam',abil: 'Reroll your race die if it comes up 1–2', hook: 'reroll', cost: 6 },
  nia:     { name: 'Numbers Nia',   abil: '+2 to any one stat (chosen after track reveal)', hook: 'bonus2', cost: 7 },
  gary:    { name: 'Gutcall Gary',  abil: '+1 pit-energy after an incident is flipped', hook: 'gutcall', cost: 6 },
};
const CREWS = {
  volunteer: { name: 'Volunteer Crew', PIT: 3 },
  aces:      { name: 'Pit Aces',       PIT: 6, cost: 6 },
  steady:    { name: 'Steady Stops',   PIT: 4, DUR: 1, cost: 5 },
  misers:    { name: 'Fuel Misers',    PIT: 4, fuelImmune: true, cost: 5 },
};
const SPONSORS = {
  diner:  { name: 'Local Diner',       money: 2 },
  energy: { name: 'Energy Drink Co',   money: 4, cost: 6 },
  tire:   { name: 'Tire Brand',        money: 3, PIT: 1, cost: 5 },
  parts:  { name: 'Auto Parts Chain',  money: 3, discount: 1, cost: 5 },
};
const PARTS = {
  turbo:  { name: 'Turbo Kit',     mod: { SPD: 2, DUR: -1 }, cost: 4 },
  cage:   { name: 'Roll Cage',     mod: { DUR: 2 },          cost: 4 },
  aero:   { name: 'Aero Package',  mod: { SPD: 1, HAN: 1 },  cost: 4 },
  soft:   { name: 'Soft Tires',    mod: { HAN: 2, DUR: -1 }, cost: 4 },
};

// --- Tactic cards (§8.3). effect(ctx) -> { self, target, note }.
//     ctx = { stats, track, caution, incidentFired, projLeaderRival, hook(name) }
const TACTICS = {
  steady:  { name: 'Steady Lap', type: 'Strategy',   energy: 1, cost: 0, text: '+1 to your Race Score. (Cheap filler — thin it.)',
             effect: () => ({ self: 1 }) },
  push:    { name: 'Push It', type: 'Aggression',    energy: 1, cost: 0, text: '+2 to your Race Score.',
             effect: () => ({ self: 2 }) },
  pit:     { name: 'Pit Stop', type: 'Pit',          energy: 1, cost: 0, text: 'During a caution only: +PIT to your Score.',
             caution: true, effect: c => ({ self: c.stats.PIT, note: `+PIT (${c.stats.PIT})` }) },
  sling:   { name: 'Slingshot Draft', type: 'Draft', energy: 2, cost: 4, text: '+3 (+5 on a superspeedway).',
             effect: c => ({ self: c.track.type === 'super' ? 5 : 3 }) },
  trade:   { name: 'Trade Paint', type: 'Aggression',energy: 2, cost: 4, text: 'Target rival: DUR ≥6 or −4 to their Score.',
             aggression: true, effect: c => ({ target: -4, note: 'rival DUR≥6 or −4' }) },
  ppit:    { name: 'Perfect Pit Stop', type: 'Pit',  energy: 2, cost: 4, text: '+6 if your PIT ≥5, else +2.',
             effect: c => ({ self: c.stats.PIT >= 5 ? 6 : 2 }) },
  gwc:     { name: 'Green-White-Checkered', type:'Strategy', energy:2, cost:4, text:'+4 (final stage — always, in Sprint).',
             effect: () => ({ self: 4 }) },
  fresh:   { name: 'Fresh Tires', type: 'Pit',       energy: 1, cost: 3, text: 'During a caution: +PIT this stage.',
             caution: true, effect: c => ({ self: c.stats.PIT, note: `+PIT (${c.stats.PIT})` }) },
  clean:   { name: 'Clean Air', type: 'Strategy',    energy: 1, cost: 3, text: '+3 if you’re projected P1–3 this stage.',
             effect: c => ({ self: c.projTop3 ? 3 : 0, note: c.projTop3 ? '+3 (in clean air)' : 'no clean air' }) },
  dirty:   { name: 'Dirty Air', type: 'Aggression',  energy: 1, cost: 3, text: 'A rival ahead of you: −2.',
             aggression: true, effect: () => ({ target: -2 }) },
  spot:    { name: 'Spotter’s Call', type: 'Strategy',energy: 1, cost: 3, text: '+2 — only after an incident is flipped.',
             effect: c => ({ self: c.incidentFired ? 2 : 0, note: c.incidentFired ? '+2' : 'no incident yet' }) },
  setup:   { name: 'Setup Sheet', type: 'Setup',     energy: 0, cost: 3, text: '+3 to qualifying (helps you win the pole).',
             qualifying: true, effect: () => ({ quali: 3 }) },
};

// --- Sample tracks (§8.5) ---
const TRACKS = [
  { name: 'Bristol',      kind: 'Short track',    type: 'short', key: 'HAN',  flavor: 'Aggression & contact heavy.' },
  { name: 'Watkins Glen', kind: 'Road course',    type: 'road',  key: 'HAN',  flavor: 'Rain Delay possible; driver skill rules.' },
  { name: 'Kansas',       kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'Balanced — your own highest stat doubles.' },
  { name: 'Talladega',    kind: 'Superspeedway',  type: 'super', key: 'SPD',  flavor: 'The Big One lurks. Draft hard, hold your breath.' },
  { name: 'Phoenix',      kind: 'Short track',    type: 'short', key: 'HAN',  flavor: 'Flat and tight — track position is everything.' },
  { name: 'Richmond',     kind: 'Short track',    type: 'short', key: 'HAN',  flavor: 'The action track — a tight D-shape; restarts get rowdy.' },
  { name: 'Daytona',      kind: 'Superspeedway',  type: 'super', key: 'SPD',  flavor: 'Pack racing at 200mph. Draft up and pray the Big One waits.' },
  { name: 'Indianapolis', kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'The Brickyard — flat corners, long straights, track position is gold.' },
  { name: 'Darlington',   kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'Too Tough to Tame — the egg-shaped track eats tires and nerves.' },
  { name: 'Sonoma',       kind: 'Road course',    type: 'road',  key: 'HAN',  flavor: 'Wine-country road course — brakes, patience, and driver skill.' },
  // --- more real 2026 NASCAR Cup Series venues ---
  { name: 'Atlanta',        kind: 'Superspeedway',  type: 'super', key: 'SPD',  flavor: 'Reconfigured into a 200mph pack-racing draftfest — Big One country.' },
  { name: 'Las Vegas',      kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'Fast 1.5-mile intermediate — a momentum and downforce game.' },
  { name: 'Homestead-Miami',kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'Worn, treacherous corners — run the wall to find speed.' },
  { name: 'Martinsville',   kind: 'Short track',    type: 'short', key: 'HAN',  flavor: 'The paperclip — half a mile of brakes, bumpers and grudges.' },
  { name: 'Texas',          kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'Slick, high-banked 1.5-mile — handling wins the long run.' },
  { name: 'Charlotte',      kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'The 600-mile home track — a true all-rounder’s test.' },
  { name: 'Charlotte ROVAL',kind: 'Road course',    type: 'road',  key: 'HAN',  flavor: 'Infield road course meets banked oval — chaos in the chicanes.' },
  { name: 'Gateway',        kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'Flat, egg-shaped 1.25-mile at WWT Raceway — tricky and technical.' },
  { name: 'Dover',          kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'The Monster Mile — high-banked concrete that punishes mistakes.' },
  { name: 'Nashville',      kind: 'Intermediate',   type: 'inter', key: 'HIGH', flavor: 'High-speed concrete 1.33-mile — tire falloff decides it.' },
  { name: 'Pocono',         kind: 'Tricky Triangle',type: 'inter', key: 'HIGH', flavor: 'Three corners, three personalities — set up for a compromise.' },
  { name: 'Michigan',       kind: '2-mile Speedway',type: 'inter', key: 'HIGH', flavor: 'Wide, fast sweeper — top speed and clean air rule.' },
  { name: 'New Hampshire',  kind: 'Short track',    type: 'short', key: 'HAN',  flavor: 'The flat Magic Mile — handling and patience over horsepower.' },
  { name: 'Iowa',           kind: 'Short track',    type: 'short', key: 'HAN',  flavor: 'A progressively-banked bullring — momentum and grip.' },
  { name: 'COTA',           kind: 'Road course',    type: 'road',  key: 'HAN',  flavor: 'Circuit of the Americas — 20 turns of elevation and braking.' },
  { name: 'Mexico City',    kind: 'Road course',    type: 'road',  key: 'HAN',  flavor: 'Autódromo Hermanos Rodríguez — thin air, big elevation, road-course skill.' },
  { name: 'San Diego',      kind: 'Street course',  type: 'road',  key: 'HAN',  flavor: 'Coronado street circuit — concrete walls and no room for error.' },
];

// --- Incident deck (§8.4). apply(c, ctx) mutates c.delta / sets c.dnf. ---
const INCIDENTS = [
  ...times(5, () => ({ name: 'Clean Air', mood: '', icon: '🟢', text: 'Nothing happens. A clean lap for the field.', apply: () => {} })),
  ...times(2, () => ({ name: 'Debris Caution', mood: 'caution', icon: '🟡', caution: true,
      text: 'A caution flies! Everyone may pit — play a Pit card to cash in your PIT stat.',
      apply: () => {} })),
  ...times(2, () => ({ name: 'Loose Wheel', mood: 'bad', icon: '🔧', dur: true,
      text: 'Loose wheel! DUR ≥5 or −4.', apply: (c) => { if (c.stats.DUR < 5) durHit(c, 4); } })),
  { name: 'Blown Tire', mood: 'bad', icon: '💥', dur: true, text: 'Blown tire! DUR ≥6 or −6.',
      apply: (c) => { if (c.stats.DUR < 6) durHit(c, 6); } },
  { name: 'Overheating', mood: 'bad', icon: '🌡️', text: 'Engines cook. Teams with SPD ≥8 take −5 (Fuel Misers immune).',
      apply: (c) => { if (c.stats.SPD >= 8 && !c.fuelImmune) c.delta -= 5; } },
  ...times(2, () => ({ name: 'The Big One', mood: 'bad', icon: '🔥', dur: true, bigOne: true,
      text: 'THE BIG ONE! Every team: DUR ≥7 or DNF → P37–40.',
      apply: (c) => { if (c.stats.DUR < 7) durDNF(c); } })),
  { name: 'Engine Failure', mood: 'bad', icon: '⚙️', dur: true, leaderOnly: true,
      text: 'The stage leader’s motor lets go: DUR ≥7 or DNF.',
      apply: (c, ctx) => { if (c === ctx.leader && c.stats.DUR < 7) durDNF(c); } },
  { name: 'Lucky Dog', mood: 'good', icon: '🍀', text: 'The last-place contender gets the free pass: +5.',
      apply: (c, ctx) => { if (c === ctx.lastPlace) c.delta += 5; } },
  { name: 'Rain Delay', mood: 'good', icon: '🌧️', roadShort: true,
      text: 'Rain! On road/short tracks, HAN-strong teams (HAN ≥8) gain +3.',
      apply: (c) => { if (c.stats.HAN >= 8) c.delta += 3; } },
];
function times(n, fn) { return Array.from({ length: n }, fn); }
function durHit(c, amt) { if (c.dale && !c.daleUsed) { c.daleUsed = true; c.saved = amt; return; } c.delta -= amt; }
function durDNF(c)      { if (c.dale && !c.daleUsed) { c.daleUsed = true; c.saved = 'DNF'; return; } c.dnf = true; }

/* ==========================================================================
   FINISH BANDS + POINTS  (§4 and §7)
   ========================================================================== */
// Score -> [posStart, posEnd] band on the 40-car field. Widths: 1+2+3+4+6+9+9+6 = 40.
function bandFor(score) {
  if (score >= 46) return [1, 1];
  if (score >= 42) return [2, 3];
  if (score >= 38) return [4, 6];
  if (score >= 34) return [7, 10];
  if (score >= 30) return [11, 16];
  if (score >= 26) return [17, 25];
  if (score >= 22) return [26, 34];
  return [35, 40];
}
// 2026 Cup: P1=55; P(n)=35-(n-2) down to 1; P37-40 = 1.
function finishPoints(pos) { return pos === 1 ? 55 : Math.max(1, 35 - (pos - 2)); }

/* ==========================================================================
   GAME STATE
   ========================================================================== */
const RACES = 5;          // Sprint season length
const ENERGY = 3;         // Sprint pit-energy cap
const HAND = 5;
const RIVAL_COUNT = 3;    // AI teams; you + these = a 4-team game. Field cars fill the rest of 40.

// Everyone — you and every AI — begins from this identical mid-pack team + deck (§8.1).
const STARTER_TEAM = () => ({ driver: 'freshman', car: 'base', chief: 'veteran', crew: 'volunteer', sponsor: 'diner', parts: [] });
const STARTER_DECK = () => ['steady','steady','steady','steady','steady','push','push','push','pit','pit'];

let G = null;             // the whole game state
let ui = {};              // per-phase transient UI state

const DEFAULT_TEAM_NAME = 'Green Flag Racing';

function newGame() {
  const player = {
    name: DEFAULT_TEAM_NAME, isPlayer: true, cash: 6, seasonPoints: 0,
    team: STARTER_TEAM(), deck: STARTER_DECK(),
  };
  const rivals = makeAITeams([player.name]);
  G = {
    race: 0, format: 'Sprint', player, rivals,
    schedule: shuffle(TRACKS).slice(0, RACES),
    log: [],
  };
  phaseIntro();
}
// live-edit the player's team name from the intro input
function setTeamName(v) { G.player.name = v; }

const AI_LABEL = { charger: 'Charger AI', ironman: 'Ironman AI', balanced: 'Balanced AI' };

// Race-team (organization) names — stable all season even when a team swaps drivers.
const TEAM_NAMES = ['Redline Racing','Apex Motorsports','Ironwood Racing','Slipstream Racing',
  'Dixie Thunder Racing','Copperline Racing','Vanguard Motorsports','Nightshade Racing',
  'Boomtown Racing','Piston Peak Racing','Fastlane Motorsports','Sabertooth Racing'];

// The AI opponents are full teams, symmetric with the player: identical starter
// tableau + deck + cash. They diverge only through the Garage, each drafting toward
// a distinct archetype (§8.2). See aiGarage() for the per-archetype wishlists.
function makeAITeams(taken = []) {
  const archetypes = ['charger', 'ironman', 'balanced'];
  const chosen = shuffle(TEAM_NAMES.filter(n => !taken.includes(n))).slice(0, RIVAL_COUNT);
  return chosen.map((name, i) => ({
    name, isPlayer: false, cash: 6, seasonPoints: 0,
    team: STARTER_TEAM(), deck: STARTER_DECK(),
    archetype: archetypes[i % archetypes.length],
    lastBuy: null,   // most recent Garage acquisition, surfaced on the results screen
  }));
}

/* ==========================================================================
   TEAM COMPUTATION
   ========================================================================== */
function teamStats(t, chiefBonusStat) {
  const D = DRIVERS[t.driver], C = CARS[t.car], crew = CREWS[t.crew], sp = SPONSORS[t.sponsor], ch = CHIEFS[t.chief];
  const s = { SPD: D.SPD + C.SPD, HAN: D.HAN + C.HAN, DUR: C.DUR, PIT: crew.PIT };
  for (const p of t.parts) { const m = PARTS[p].mod; for (const k in m) s[k] += m[k]; }
  if (crew.DUR) s.DUR += crew.DUR;
  if (sp.PIT) s.PIT += sp.PIT;
  if (chiefBonusStat) {
    const amt = ch.hook === 'bonus2' ? 2 : 1;
    if (ch.hook === 'bonus1' || ch.hook === 'bonus2') s[chiefBonusStat] += amt;
  }
  for (const k in s) s[k] = Math.max(0, s[k]);
  return s;
}
function keyStatValue(stats, track) {
  if (track.key === 'HIGH') return Math.max(stats.SPD, stats.HAN);
  return stats[track.key];
}
function baseP(stats, track) {
  return stats.SPD + stats.HAN + stats.DUR + keyStatValue(stats, track);
}
function sponsorIncome(t) { return SPONSORS[t.sponsor].money; }
function costOf(item, t) { const disc = SPONSORS[t.sponsor].discount || 0; return Math.max(0, (item.cost || 0) - disc); }

/* ==========================================================================
   RENDER HELPERS
   ========================================================================== */
const app = () => $('#app');
function render(html) { app().innerHTML = header() + html; }
function header() {
  const r = G ? Math.min(G.race + 1, RACES) : 1;
  return `<div class="topbar">
    <div class="checker"></div>
    <div class="logo">TRADING PAINT<small>STOCK-CAR DECKBUILDER · SPRINT SEASON</small></div>
    <div class="season-meta">
      Race <b>${G ? r : 1}</b> / ${RACES}${G ? ` · <span class="wallet">$${G.player.cash}</span>` : ''}
    </div>
  </div>`;
}
function statBlock(stats, track) {
  const keyName = track && track.key === 'HIGH' ? (stats.SPD >= stats.HAN ? 'SPD' : 'HAN') : (track && track.key);
  return `<div class="statline">${['SPD','HAN','DUR','PIT'].map(k => {
    const isKey = track && k === keyName && k !== 'DUR';
    return `<div class="stat${isKey ? ' key' : ''}"><div class="k">${k}${isKey ? ' ×2' : ''}</div><div class="v">${stats[k]}</div></div>`;
  }).join('')}</div>`;
}
function tableauCard(t) {
  const D = DRIVERS[t.driver], C = CARS[t.car], ch = CHIEFS[t.chief], crew = CREWS[t.crew], sp = SPONSORS[t.sponsor];
  const partList = t.parts.map(p => PARTS[p].name).join(', ');
  const slot = (cls, role, name, abil, extra = '') =>
    `<div class="slot ${cls}"><div class="role">${role}</div><div class="name">${esc(name)}</div><div class="abil">${esc(abil)}</div>${extra}</div>`;
  return `<div class="slots">
    ${slot('k-driver', 'Driver', D.name, D.abil)}
    ${slot('k-car', 'Car', C.name, `SPD ${C.SPD} · HAN ${C.HAN} · DUR ${C.DUR}`, partList ? `<div class="parts">▲ ${esc(partList)}</div>` : '')}
    ${slot('k-chief', 'Crew Chief', ch.name, ch.abil)}
    ${slot('k-crew', 'Pit Crew', crew.name, `PIT ${crew.PIT}${crew.DUR ? ' · +1 DUR' : ''}${crew.fuelImmune ? ' · fuel-immune' : ''}`)}
    ${slot('k-sponsor', 'Sponsor', sp.name, `$${sp.money}/race${sp.PIT ? ' · +1 PIT' : ''}${sp.discount ? ' · Garage −$1' : ''}`)}
  </div>`;
}
function typeClass(type) { return 't-' + type.toLowerCase(); }
function typeLegend() {
  const types = ['Strategy', 'Pit', 'Draft', 'Aggression', 'Setup'];
  return `<div class="legend">${types.map(t =>
    `<span class="${typeClass(t)}"><i></i>${t}</span>`).join('')}</div>`;
}
function kindLegend() {
  const kinds = [['Part', 'part'], ['Driver', 'driver'], ['Car', 'car'],
                 ['Crew Chief', 'chief'], ['Pit Crew', 'crew'], ['Sponsor', 'sponsor']];
  return `<div class="legend">${kinds.map(([label, k]) =>
    `<span class="k-${k}"><i></i>${label}</span>`).join('')}</div>`;
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
}

/* ==========================================================================
   PHASE: INTRO
   ========================================================================== */
function phaseIntro() {
  const p = G.player, stats = teamStats(p.team);
  render(`
  <div class="grid cols">
    <div class="card">
      <h2>🏁 Your Race Team <span class="tag">STARTER</span></h2>
      <label class="teamname">Team name
        <input type="text" maxlength="24" value="${esc(p.name)}" oninput="setTeamName(this.value)" placeholder="${DEFAULT_TEAM_NAME}">
      </label>
      ${tableauCard(p.team)}
      ${statBlock(stats)}
      <p class="muted big" style="margin-top:14px">You and <b>${RIVAL_COUNT} AI teams</b> all roll out from this <em>identical</em> mid-pack car (~P18–26 of 40). The season is the climb into the top 10 — everyone drafts up in the Garage between races, so out-building your rivals is the whole game.</p>
    </div>
    <div class="card">
      <h2>📋 The Season</h2>
      <p class="big">A <b>${RACES}-race Sprint season</b>, <b>${RIVAL_COUNT + 1} teams</b> starting dead even, scored on a fixed <b>40-car field</b> with the real <b>2026 NASCAR Cup</b> points system (win = 55).</p>
      <div style="margin:10px 0 4px">${[G.player, ...G.rivals].map(t => `<span class="pill">${esc(t.name)}${t.isPlayer ? ' · you' : ' · ' + AI_LABEL[t.archetype]}</span>`).join('')}</div>
      <div style="margin:8px 0 12px">${G.schedule.map(t => `<span class="pill">${esc(t.name)} · ${t.key === 'HIGH' ? 'highest' : t.key} ×2</span>`).join('')}</div>
      <hr>
      <p class="muted" style="font-size:13px">Each race: reveal the track → chief bonus → draw a hand of 5 → an incident flips → play tactics under a <b>${ENERGY}-energy</b> cap → roll 1d6 → take your finish. Then hit the <b>Garage</b> to draft up — the AIs draft too.</p>
      <div class="btnrow"><button class="btn primary wide" onclick="startRace()">Take the green flag →</button></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>🃏 Starting Tactic Deck (10)</h2>
    ${deckSummary(p.deck)}
  </div>`);
}
function deckSummary(deck) {
  const counts = {};
  deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  return typeLegend() + `<div class="hand">${Object.entries(counts).map(([id, n]) => {
    const c = TACTICS[id];
    return `<div class="tcard ${typeClass(c.type)} disabled"><div class="energy${c.energy ? '' : ' free'}">${c.energy}e</div>
      <div class="tt">${c.type}</div><div class="tn">${esc(c.name)} ×${n}</div><div class="te">${esc(c.text)}</div></div>`;
  }).join('')}</div>`;
}

/* ==========================================================================
   PHASE: RACE — the interactive turn (§5)
   ========================================================================== */
function startRace() {
  if (!G.player.name || !G.player.name.trim()) G.player.name = DEFAULT_TEAM_NAME;
  const track = G.schedule[G.race];
  const ch = CHIEFS[G.player.team.chief];
  ui = { track, phase: 'chief', chiefStat: null, hand: null, played: [], quali: [], energy: ENERGY,
         incident: null, resolved: false, target: null };
  // chiefs that place a stat need a choice; others auto-continue
  if (ch.hook === 'bonus1' || ch.hook === 'bonus2') renderChief();
  else { ui.phase = 'hand'; drawHand(); renderRace(); }
}

function renderChief() {
  const { track } = ui, ch = CHIEFS[G.player.team.chief];
  const base = teamStats(G.player.team);
  render(`
  ${trackBanner(track)}
  <div class="card">
    <h2>🔧 Crew Chief — ${esc(ch.name)}</h2>
    <p class="big">Place your chief’s <b>+${ch.hook === 'bonus2' ? 2 : 1}</b> after seeing the track. On this track the key stat (${track.key === 'HIGH' ? 'your highest' : track.key}) counts twice — loading the doubled stat is often strongest.</p>
    ${statBlock(base, track)}
    <div class="btnrow">
      ${['SPD','HAN','DUR','PIT'].map(k =>
        `<button class="btn" onclick="setChief('${k}')">Put it on ${k}</button>`).join('')}
    </div>
  </div>`);
}
function setChief(k) { ui.chiefStat = k; ui.phase = 'hand'; drawHand(); renderRace(); }

function drawHand() { ui.hand = shuffle(G.player.deck).slice(0, HAND).map((id, i) => ({ id, uid: i, played: false })); }

function trackBanner(track) {
  return `<div class="card" style="margin-bottom:16px">
    <div class="rowsplit">
      <div><h2 style="margin:0"><span class="flag">🏁</span> ${esc(track.name)} <span class="tag gold">${esc(track.kind)}</span></h2>
      <div class="muted" style="margin-top:6px">${esc(track.flavor)}</div></div>
      <div class="tag blue" style="font-size:13px">KEY STAT: ${track.key === 'HIGH' ? 'YOUR HIGHEST' : track.key} ×2${track.type === 'super' ? ' · +1 Big One' : ''}</div>
    </div>
  </div>`;
}

function playerLiveStats() { return teamStats(G.player.team, ui.chiefStat); }

// projected pre-tactics score, used for Clean Air's "projected top-3" check
function projTop3() {
  return contenderProjTop3(baseP(playerLiveStats(), ui.track), G.player);
}
// How many *other* contenders out-pace this base? <3 means projected top-3.
function contenderProjTop3(myBase, self) {
  let better = 0;
  for (const r of G.rivals) {
    if (r === self) continue;
    if (rivalLiveBaseP(r) > myBase) better++;
  }
  if (self !== G.player && baseP(playerLiveStats(), ui.track) > myBase) better++;
  return better < 3;
}
// An AI team's real pre-tactic base pace this race (its own chief bonus applied).
function rivalLiveBaseP(r) {
  return baseP(teamStats(r.team, aiChiefStat(r.team, ui.track)), ui.track);
}
// AI counterpart to the interactive chief prompt: stat-placing chiefs load the
// doubled key stat (own highest on intermediates) — the same advice the UI gives you.
function aiChiefStat(team, track) {
  const ch = CHIEFS[team.chief];
  if (ch.hook !== 'bonus1' && ch.hook !== 'bonus2') return null;
  if (track.key !== 'HIGH') return track.key === 'DUR' ? 'SPD' : track.key;
  const s = teamStats(team);
  return s.SPD >= s.HAN ? 'SPD' : 'HAN';
}

function tacticCtx() {
  const stats = playerLiveStats();
  return {
    stats, track: ui.track,
    caution: ui.incident && ui.incident.caution,
    incidentFired: ui.resolved,
    projTop3: projTop3(),
  };
}

function renderRace() {
  const { track } = ui;
  const stats = playerLiveStats();
  const bp = baseP(stats, track);
  const playedScore = ui.played.reduce((s, uid) => {
    const c = TACTICS[ui.hand.find(h => h.uid === uid).id];
    const e = c.effect(tacticCtx());
    return s + (e.self || 0);
  }, 0);
  const qualiScore = ui.quali.reduce((s, uid) => {
    const c = TACTICS[ui.hand.find(h => h.uid === uid).id];
    return s + (c.effect(tacticCtx()).quali || 0);
  }, 0);

  render(`
  ${trackBanner(track)}
  <div class="grid cols">
    <div class="card">
      <h2>🏎️ Your Car <span class="tag">BaseP ${bp}</span></h2>
      ${statBlock(stats, track)}
      <p class="muted" style="font-size:12px;margin-top:10px">BaseP = SPD+HAN+DUR + ${track.key === 'HIGH' ? 'highest' : track.key}(×2 key) = <b>${bp}</b>${ui.chiefStat ? ` · chief +${CHIEFS[G.player.team.chief].hook==='bonus2'?2:1} ${ui.chiefStat}` : ''}</p>
    </div>
    <div class="card">
      <h2>⚡ Pit-Energy ${incidentTag()}</h2>
      ${energyBar()}
      <p class="muted" style="font-size:12px">You draw 5 but the ${ENERGY}-energy cap only lets you fire ~2–3. Pick your best; the rest stay in the hauler. (Only Setup, played in qualifying, is free.)</p>
      <p class="big">Running Score so far: <b>${bp + playedScore}</b>${qualiScore ? ` &nbsp;<span class="tag blue">Qualifying +${qualiScore}</span>` : ''}</p>
    </div>
  </div>
  ${ui.incident ? incidentBanner() : incidentPrompt()}
  <div class="card" style="margin-top:16px">
    <h2>🃏 Your Hand ${ui.resolved ? '' : '<span class="tag">play Setup for the pole, then race</span>'}</h2>
    ${typeLegend()}
    <div class="hand">${ui.hand.map(handCard).join('')}</div>
    ${controls()}
  </div>`);
}

function incidentTag() {
  const e = ui.energy - spentEnergy();
  return `<span class="tag ${e <= 0 ? 'red' : 'blue'}">${e} energy left</span>`;
}
function spentEnergy() {
  let sp = 0;
  for (const uid of ui.played) {
    const card = TACTICS[ui.hand.find(h => h.uid === uid).id];
    sp += energyCost(card);
  }
  return sp;
}
function energyCost(card, team = G.player.team) {
  // Kyle Ace: Aggression tactics cost 0 energy
  if (card.aggression && team.driver === 'kyle') return 0;
  return card.energy;
}
function energyBar() {
  const spent = spentEnergy();
  let pips = '';
  for (let i = 0; i < ui.energy; i++) pips += `<div class="pip ${i < spent ? 'spent' : 'on'}"></div>`;
  return `<div class="energybar">${pips}<b style="margin-left:6px">${ui.energy - spent}/${ui.energy}</b></div>`;
}

function handCard(h) {
  const c = TACTICS[h.id];
  const played = ui.played.includes(h.uid) || ui.quali.includes(h.uid);
  const cost = energyCost(c);
  const disabled = handDisabled(h, c);
  return `<div class="tcard ${typeClass(c.type)} ${played ? 'played' : ''} ${disabled && !played ? 'disabled' : ''}"
      ${disabled ? '' : `onclick="clickCard(${h.uid})"`}>
    <div class="energy${cost ? '' : ' free'}">${cost}e</div>
    <div class="tt">${c.type}${c.aggression && G.player.team.driver === 'kyle' ? ' · free' : ''}</div>
    <div class="tn">${esc(c.name)}</div>
    <div class="te">${esc(c.text)}</div>
  </div>`;
}
function handDisabled(h, c) {
  if (ui.played.includes(h.uid) || ui.quali.includes(h.uid)) return true;
  if (!ui.resolved) return !c.qualifying;            // before racing, only Setup (qualifying) cards
  if (c.qualifying) return true;                      // can't play Setup after the race starts
  if (c.caution && !(ui.incident && ui.incident.caution)) return true;  // Pit cards need a caution
  if (energyCost(c) > ui.energy - spentEnergy()) return true;
  return false;
}
function clickCard(uid) {
  const h = ui.hand.find(x => x.uid === uid), c = TACTICS[h.id];
  if (handDisabled(h, c)) return;
  if (c.qualifying) ui.quali.push(uid);
  else ui.played.push(uid);       // aggression auto-targets the strongest rival at resolve time
  renderRace();
}

function incidentPrompt() {
  return `<div class="incident">
    <div class="ih">🎲 The chaos card is face-down…</div>
    <div class="id">Flip the incident before you commit your tactics — a caution opens up Pit cards, and Spotter’s Call needs an incident to react to.</div>
  </div>`;
}
function incidentBanner() {
  const inc = ui.incident;
  const mood = inc.caution ? 'caution' : (inc.mood === 'bad' ? 'bad' : inc.mood === 'good' ? 'good' : '');
  let outcome = '';
  const c = ui.playerContender;
  if (c) {
    if (c.dnf) outcome = `<div class="tag red" style="margin-top:8px">You failed the check — <b>DNF</b>. Play out the formality; your finish is P37–40.</div>`;
    else if (c.saved) outcome = `<div class="tag green" style="margin-top:8px">Dale Steady ate the hit — ignored (${c.saved === 'DNF' ? 'a DNF!' : '−' + c.saved}).</div>`;
    else if (c.incDelta) outcome = `<div class="tag ${c.incDelta > 0 ? 'green' : 'red'}" style="margin-top:8px">Incident on you: ${c.incDelta > 0 ? '+' : ''}${c.incDelta} Score</div>`;
    else outcome = `<div class="tag" style="margin-top:8px">No effect on your car.</div>`;
  }
  return `<div class="incident ${mood}">
    <div class="ih">${inc.icon} ${esc(inc.name)}</div>
    <div class="id">${esc(inc.text)}</div>${outcome}
  </div>`;
}

function controls() {
  if (!ui.incident) {
    return `<div class="btnrow">
      <button class="btn gold" onclick="flipIncident()">Flip the incident →</button>
      <span class="muted" style="align-self:center;font-size:12px">Play any Setup cards first for the pole.</span>
    </div>`;
  }
  if (!ui.finished) {
    const c = ui.playerContender;
    if (c && c.dnf) return `<div class="btnrow"><button class="btn primary" onclick="finishRace()">See the damage →</button></div>`;
    return `<div class="btnrow">
      <button class="btn primary" onclick="finishRace()">Roll 1d6 & take the finish →</button>
      <span class="muted" style="align-self:center;font-size:12px">Fire your tactics now, then roll.</span>
    </div>`;
  }
  return '';
}

// Flip the shared incident and apply it to EVERY contender at once (§4/§8.4).
function flipIncident() {
  const track = ui.track;
  // build incident deck, add track-specific extras
  let deck = INCIDENTS.filter(inc => !(inc.roadShort) || track.type === 'road' || track.type === 'short');
  if (track.type === 'super') deck = deck.concat(INCIDENTS.filter(i => i.bigOne)); // extra Big One copies
  const inc = pick(deck);
  ui.incident = inc;
  ui.resolved = true;

  // Gutcall Gary: +1 energy after an incident
  if (CHIEFS[G.player.team.chief].hook === 'gutcall') ui.energy = ENERGY + 1;

  // assemble all contenders (player + rivals) and resolve the incident on each
  const contenders = buildContenders();
  const leader = contenders.reduce((a, b) => b.pre > a.pre ? b : a);
  const lastPlace = contenders.reduce((a, b) => b.pre < a.pre ? b : a);
  const ctx = { leader, lastPlace, track };
  for (const c of contenders) {
    const before = c.delta;
    inc.apply(c, ctx);
    c.incDelta = c.delta - before;
  }
  ui.contenders = contenders;
  ui.playerContender = contenders.find(c => c.isPlayer);
  renderRace();
}

// Snapshot every contender's pre-tactic, pre-incident state. Player and AIs are
// built the same way now — real team stats, real DUR/fuel flags — so the incident
// deck's gates (Big One, Loose Wheel, Fuel Misers…) apply to all of them uniformly.
function buildContenders() {
  // player uses the chief stat they chose interactively; AIs auto-place theirs
  const mk = (ref, chiefStat) => {
    const stats = teamStats(ref.team, chiefStat);
    const base = baseP(stats, ui.track);
    return {
      isPlayer: ref === G.player, name: ref.name, ref,
      stats, base, delta: 0, dnf: false, saved: 0,
      dale: ref.team.driver === 'dale', daleUsed: false,
      fuelImmune: !!CREWS[ref.team.crew].fuelImmune,
      pre: base,
    };
  };
  const list = [mk(G.player, ui.chiefStat)];
  for (const r of G.rivals) list.push(mk(r, aiChiefStat(r.team, ui.track)));
  return list;
}

// Per-contender tactic context (same shape as the player's tacticCtx, any team's stats).
function ctxFor(c) {
  return {
    stats: c.stats, track: ui.track,
    caution: ui.incident && ui.incident.caution,
    incidentFired: ui.resolved,
    projTop3: contenderProjTop3(c.base, c.ref),
  };
}
// The strongest OTHER contender (aggression targets it) — spans you and the other AIs.
function strongestOpponent(self, contenders) {
  const pool = (contenders || []).filter(c => c !== self && !c.dnf);
  if (!pool.length) return null;
  return pool.reduce((a, b) => (b.base + b.delta) > (a.base + a.delta) ? b : a);
}

// Sum a contender's fired cards into c.tactics (+ driver hooks); queue aggression hits.
function applyTactics(c, cardIds, ctx, hits) {
  const team = c.ref.team;
  let tactics = 0;
  const playedNotes = [];
  for (const id of cardIds) {
    const card = TACTICS[id];
    const e = card.effect(ctx);
    let self = e.self || 0;
    if (card.type === 'Draft' && team.driver === 'buddy') self += 2; // Buddy Draft
    tactics += self;
    if (e.target) {
      const tgt = strongestOpponent(c, ui.contenders);
      if (tgt) {
        const amt = (tgt.stats.DUR >= 6 && id === 'trade') ? 0 : e.target;
        if (amt) hits.push({ target: tgt, amount: amt });
      }
    }
    playedNotes.push(`${card.name}${e.note ? ' (' + e.note + ')' : self ? ' +' + self : ''}`);
  }
  let driverBonus = 0, driverNote = '';
  const drv = team.driver;
  if (drv === 'lopez') { driverBonus += 3; driverNote = 'Lopez +3 (final stage)'; }
  if (drv === 'rico' && (ctx.track.type === 'road' || ctx.track.type === 'short')) { driverBonus += 2; driverNote = 'Rico +2 (road/short)'; }
  c.tactics = tactics + driverBonus;
  c._driverNote = driverNote;
  c._playedNotes = playedNotes;
}
// Roll 1d6 (with this team's rerolls) and finalize the Race Score.
function rollAndScore(c) {
  const team = c.ref.team, drv = team.driver;
  let die = d6(), dieNote = `1d6 → ${die}`;
  if (die === 1 && drv === 'freshman') { const r = d6(); dieNote = `1d6 → 1, Rookie reroll → ${r}`; die = r; }
  if (die <= 2 && CHIEFS[team.chief].hook === 'reroll') { const r = d6(); dieNote = `1d6 → ${die}, Sam reroll → ${r}`; die = r; }
  c.die = die;
  c.dieNote = dieNote;
  c.score = c.dnf ? -999 : c.base + c.tactics + c.delta + die;
  c.notes = { playedNotes: c._playedNotes, driverNote: c._driverNote, dieNote };
}

// An AI draws a hand of 5 and greedily fires the best-value cards it can afford,
// under the same energy cap and gates you play by. Returns the card ids it fired.
function aiPlayTactics(c, ctx) {
  const team = c.ref.team;                 // tableau (drivers/chief for cost + rerolls)
  const hand = shuffle(c.ref.deck).slice(0, HAND).map((id, i) => ({ id, i, used: false }));
  let energyLeft = ENERGY;
  if (CHIEFS[team.chief].hook === 'gutcall') energyLeft += 1; // Gutcall Gary parity
  const chosen = [];
  while (true) {
    let best = null, bestVal = 0;
    for (const h of hand) {
      if (h.used) continue;
      const card = TACTICS[h.id];
      if (!aiCardAllowed(card, ctx)) continue;
      if (energyCost(card, team) > energyLeft) continue;
      const val = aiCardValue(card, team, ctx);
      if (val > bestVal) { bestVal = val; best = h; }
    }
    if (!best || bestVal <= 0) break;
    best.used = true;
    energyLeft -= energyCost(TACTICS[best.id], team);
    chosen.push(best.id);
  }
  return chosen;
}
function aiCardAllowed(card, ctx) {
  if (card.qualifying) return false;               // Setup is qualifying-only
  if (card.caution && !ctx.caution) return false;  // Pit cards need a caution
  return true;
}
function aiCardValue(card, team, ctx) {
  const e = card.effect(ctx);
  let v = e.self || 0;
  if (card.type === 'Draft' && team.driver === 'buddy') v += 2;
  if (e.target) v += Math.abs(e.target);           // hurting the leader ≈ helping yourself
  return v;
}

/* ==========================================================================
   FINISH: roll, total scores, assign the 40-car field, score points
   ========================================================================== */
function finishRace() {
  const contenders = ui.contenders;

  // Decide each contender's fired cards: you from ui.played, each AI from its own hand.
  const plans = contenders.map(c => {
    const ctx = ctxFor(c);
    const cardIds = c.isPlayer
      ? ui.played.map(uid => ui.hand.find(h => h.uid === uid).id)
      : aiPlayTactics(c, ctx);
    return { c, ctx, cardIds };
  });

  // Pass 1: self-tactics + driver hooks; queue every aggression hit (don't score yet,
  // so an AI trading paint with you actually lands on your delta before scores are set).
  const hits = [];
  for (const { c, ctx, cardIds } of plans) applyTactics(c, cardIds, ctx, hits);
  for (const h of hits) h.target.delta += h.amount;

  // Pass 2: roll the die and finalize each Race Score.
  for (const { c } of plans) rollAndScore(c);

  // ---- assign unique finishing positions on the 40-car field ----
  assignPositions(contenders);

  // ---- fastest lap (+1): highest non-DNF base score, if not a garage/DNF incident car ----
  const flap = contenders.filter(c => !c.dnf).sort((a, b) => b.score - a.score)[0];

  // ---- points ----
  for (const c of contenders) {
    c.points = finishPoints(c.position);
    if (c === flap) c.points += 1, c.flap = true;
    c.ref.seasonPoints += c.points;
  }

  ui.finished = true;
  ui.results = contenders.slice().sort((a, b) => a.position - b.position);
  ui.flap = flap;
  phaseResults();
}

// Rank by exact score; each contender takes the best open slot inside its band (§4).
// Non-DNF cars fill from their band start upward (spilling to worse slots if a band
// is crowded); DNF cars pack in from the back of the field (P40 up).
function assignPositions(contenders) {
  const taken = new Set();
  const nonDnf = contenders.filter(c => !c.dnf).sort((a, b) => b.score - a.score);
  const dnf = contenders.filter(c => c.dnf);
  const lowFrom = start => {
    for (let p = start; p <= 40; p++) if (!taken.has(p)) return p;
    for (let p = start - 1; p >= 1; p--) if (!taken.has(p)) return p;
    return 40;
  };
  for (const c of nonDnf) { const pos = lowFrom(bandFor(c.score)[0]); taken.add(pos); c.position = pos; }
  const highFree = () => { for (let p = 40; p >= 1; p--) if (!taken.has(p)) return p; return 1; };
  for (const c of dnf) { const pos = highFree(); taken.add(pos); c.position = pos; }
}

/* ==========================================================================
   PHASE: RESULTS
   ========================================================================== */
function phaseResults() {
  const pc = ui.playerContender;
  const track = ui.track;
  const finLabel = pc.dnf ? 'DNF' : 'P' + pc.position;
  const rows = ui.results.map(c => {
    const cls = c.isPlayer ? ' class="you"' : '';
    const pos = c.dnf ? `<span class="pos dnf">DNF</span>` : `<span class="pos${c.position === 1 ? ' p1' : ''}">P${c.position}</span>`;
    return `<tr${cls}>
      <td>${pos}</td>
      <td>${esc(c.name)}${c.flap ? ' <span class="tag purple">FL +1</span>' : ''}${c.saved ? ' <span class="tag green">saved</span>' : ''}</td>
      <td class="num">${c.dnf ? '—' : c.score}</td>
      <td class="num"><b>${c.points}</b></td>
    </tr>`;
  }).join('');

  const noteLines = [
    `BaseP ${pc.base}`,
    pc.notes.playedNotes.length ? 'Tactics: ' + pc.notes.playedNotes.join(', ') : 'No tactics fired',
    pc.notes.driverNote,
    pc.incDelta ? `Incident ${pc.incDelta > 0 ? '+' : ''}${pc.incDelta}` : (pc.dnf ? 'Incident: DNF' : null),
    pc.dieNote,
  ].filter(Boolean);

  render(`
  ${trackBanner(track)}
  <div class="card hero">
    ${pc.dnf
      ? `<div class="score dnf" style="color:var(--hot)">DNF</div><div class="fin">Wrecked out — finished ~P${pc.position}, worth just <b>${pc.points}</b> pt</div>`
      : `<div class="score${pc.position === 1 ? '' : ''}" style="${pc.position===1?'color:var(--gold)':''}">${pc.score}</div>
         <div class="fin">Finish: <b>${finLabel}</b> of 40 · <span style="color:var(--gold)">${pc.points} points</span>${pc.flap ? ' (incl. fastest lap)' : ''}</div>`}
    <div class="muted" style="margin-top:12px;font-size:13px">${noteLines.join(' &nbsp;·&nbsp; ')}</div>
  </div>
  <div class="grid cols" style="margin-top:16px">
    <div class="card">
      <h2>🏁 Race Result — ${esc(track.name)}</h2>
      <div style="max-height:360px;overflow:auto">
        <table><thead><tr><th>Pos</th><th>Contender</th><th class="num">Score</th><th class="num">Pts</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px">Field cars fill the other ${40 - ui.results.length} slots down to P40.</p>
    </div>
    <div class="card">
      <h2>📊 Championship Standings</h2>
      ${standingsTable()}
      <div class="btnrow">
        ${G.race + 1 < RACES
          ? `<button class="btn primary wide" onclick="phaseGarage()">Hit the Garage →</button>`
          : `<button class="btn gold wide" onclick="phaseFinale()">Season finale results →</button>`}
      </div>
    </div>
  </div>`);
}

function standingsTable() {
  const all = [G.player, ...G.rivals].slice().sort((a, b) => b.seasonPoints - a.seasonPoints);
  return `<table><thead><tr><th>#</th><th>Team</th><th class="num">Points</th></tr></thead><tbody>${
    all.map((t, i) => `<tr class="${t.isPlayer ? 'you' : ''}"><td class="pos">${i + 1}</td><td>${esc(t.name)}</td><td class="num"><b>${t.seasonPoints}</b></td></tr>`).join('')
  }</tbody></table>`;
}

/* ==========================================================================
   PHASE: GARAGE (between races) — §5.5, §10.2
   ========================================================================== */
function phaseGarage() {
  // AIs draft first (silently) using the points they just scored this race
  for (const r of G.rivals) {
    const rc = ui.contenders.find(c => c.ref === r);
    aiGarage(r, rc ? rc.points : 0);
  }
  G.race += 1;
  // payout: sponsor income + a small finish bonus already added to seasonPoints; cash from sponsor + placing
  const inc = sponsorIncome(G.player.team);
  const placeBonus = Math.max(1, Math.round(ui.playerContender.points / 8));
  G.player.cash += inc + placeBonus;
  ui.garagePaid = { inc, placeBonus };
  renderGarage();
}

function renderGarage() {
  const p = G.player, t = p.team;
  const stats = teamStats(t);
  const market = buildMarket();
  const itemCard = (m) => {
    const c = costOf(m.item, t);
    const owned = m.owned;
    const afford = p.cash >= c && !owned;
    const tcls = m.kind === 'tactic' ? ' ' + typeClass(m.item.type) : ' k-' + m.kind;
    return `<div class="item${tcls}">
      <div class="rowsplit"><span class="in">${esc(m.item.name)}</span><span class="cost">${owned ? 'owned' : '$' + c}</span></div>
      <div class="id">${esc(m.desc)}</div>
      <button class="btn buy ${afford ? '' : ''}" ${afford ? `onclick="buy('${m.kind}','${m.key}')"` : 'disabled'}>${owned ? 'Equipped' : afford ? 'Buy' : (p.cash < c ? 'Too pricey' : 'Buy')}</button>
    </div>`;
  };

  render(`
  <div class="card">
    <h2>🔧 The Garage <span class="tag gold">$${p.cash} in hand</span></h2>
    <p class="muted">Payout: sponsor <b>$${ui.garagePaid.inc}</b> + placing <b>$${ui.garagePaid.placeBonus}</b>. Draft up before Race ${G.race + 1} at <b>${esc(G.schedule[G.race].name)}</b>. ~70% of a race is your tableau — the deck is the swing.</p>
    ${tableauCard(t)}
    ${statBlock(stats)}
  </div>

  ${rivalsGaragePanel()}

  <div class="grid cols" style="margin-top:16px">
    <div class="card">
      <h2>🃏 Your Deck (${p.deck.length}) <span class="tag">thin for $1</span></h2>
      ${deckThinList()}
    </div>
    <div class="card">
      <h2>🛒 Tactic Market</h2>
      ${typeLegend()}
      <div class="market">${market.tactics.map(itemCard).join('')}</div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>🏎️ Parts & Free Agency</h2>
    ${kindLegend()}
    <div class="market">${[...market.parts, ...market.team].map(itemCard).join('')}</div>
  </div>

  <div class="btnrow" style="margin-top:16px">
    <button class="btn primary wide" onclick="startRace()">Roll out for Race ${G.race + 1} →</button>
  </div>`);
}

// Shows what the AI teams have built into — so you can watch the field draft up too.
function rivalsGaragePanel() {
  const cells = G.rivals.map(r => {
    const s = teamStats(r.team);
    const D = DRIVERS[r.team.driver], C = CARS[r.team.car];
    return `<div class="item">
      <div class="rowsplit"><span class="in">${esc(r.name)}</span><span class="cost">${AI_LABEL[r.archetype]}</span></div>
      <div class="id">${esc(D.name)} · ${esc(C.name)} — SPD ${s.SPD} · HAN ${s.HAN} · DUR ${s.DUR} · PIT ${s.PIT} · deck ${r.deck.length}</div>
      <div class="id">${r.lastBuy ? '▲ just acquired <b>' + esc(r.lastBuy) + '</b>' : 'stood pat this round'}</div>
    </div>`;
  }).join('');
  return `<div class="card" style="margin-top:16px">
    <h2>🏁 Rivals' Garage</h2>
    <p class="muted" style="font-size:12px">Your ${RIVAL_COUNT} AI rivals draft between every race too — here's where they stand going into Race ${G.race + 1}.</p>
    <div class="market">${cells}</div>
  </div>`;
}

function deckThinList() {
  const counts = {};
  G.player.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  return `<div class="hand">${Object.entries(counts).map(([id, n]) => {
    const c = TACTICS[id];
    const canThin = id === 'steady' && G.player.cash >= 1 && n > 0;
    return `<div class="tcard ${typeClass(c.type)} ${canThin ? '' : 'disabled'}" ${canThin ? `onclick="thin('${id}')"` : ''} title="${canThin ? 'Trash one for $1' : ''}">
      <div class="energy${c.energy ? '' : ' free'}">${c.energy}e</div>
      <div class="tt">${c.type}</div><div class="tn">${esc(c.name)} ×${n}</div>
      <div class="te">${esc(c.text)}${canThin ? '<br><b style="color:var(--hot)">▶ trash 1 for $1</b>' : ''}</div>
    </div>`;
  }).join('')}</div>`;
}
function thin(id) {
  const i = G.player.deck.indexOf(id);
  if (i < 0 || G.player.cash < 1) return;
  G.player.deck.splice(i, 1); G.player.cash -= 1;
  toast('Trashed a Steady Lap — deck thinned.');
  renderGarage();
}

function buildMarket() {
  const t = G.player.team;
  const tactics = ['sling','trade','ppit','gwc','fresh','clean','dirty','spot','setup'].map(k =>
    ({ kind: 'tactic', key: k, item: TACTICS[k], desc: `${TACTICS[k].type} · ${TACTICS[k].energy}e — ${TACTICS[k].text}` }));
  const parts = Object.entries(PARTS).map(([k, v]) =>
    ({ kind: 'part', key: k, item: v, desc: modText(v.mod) }));
  const team = [
    ...Object.entries(DRIVERS).filter(([k]) => k !== 'freshman').map(([k, v]) =>
      ({ kind: 'driver', key: k, item: v, owned: t.driver === k, desc: `Driver (${v.tag}) · SPD ${v.SPD} HAN ${v.HAN} — ${v.abil}` })),
    ...Object.entries(CARS).filter(([k]) => k !== 'base').map(([k, v]) =>
      ({ kind: 'car', key: k, item: v, owned: t.car === k, desc: `Car · SPD ${v.SPD} HAN ${v.HAN} DUR ${v.DUR}` })),
    ...Object.entries(CHIEFS).filter(([k]) => k !== 'veteran').map(([k, v]) =>
      ({ kind: 'chief', key: k, item: v, owned: t.chief === k, desc: `Crew Chief — ${v.abil}` })),
    ...Object.entries(CREWS).filter(([k]) => k !== 'volunteer').map(([k, v]) =>
      ({ kind: 'crew', key: k, item: v, owned: t.crew === k, desc: `Pit Crew · PIT ${v.PIT}${v.DUR ? ' +1 DUR' : ''}${v.fuelImmune ? ' · fuel-immune' : ''}` })),
    ...Object.entries(SPONSORS).filter(([k]) => k !== 'diner').map(([k, v]) =>
      ({ kind: 'sponsor', key: k, item: v, owned: t.sponsor === k, desc: `Sponsor · $${v.money}/race${v.PIT ? ' +1 PIT' : ''}${v.discount ? ' · Garage −$1' : ''}` })),
  ];
  return { tactics, parts, team };
}
function modText(mod) { return 'Bolt-on Part: ' + Object.entries(mod).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', '); }

const MARKET_TABLES = { tactic: TACTICS, part: PARTS, driver: DRIVERS, car: CARS, chief: CHIEFS, crew: CREWS, sponsor: SPONSORS };

// Pure purchase: deduct cost and apply the item to an owner (player OR an AI team).
// Returns the item on success, null if unaffordable. Shared by buy() and aiGarage().
function applyPurchase(owner, kind, key) {
  const t = owner.team;
  const item = MARKET_TABLES[kind][key];
  const cost = costOf(item, t);
  if (owner.cash < cost) return null;
  if (kind === 'tactic') owner.deck.push(key);
  else if (kind === 'part') t.parts.push(key);
  else t[kind] = key;               // driver/car/chief/crew/sponsor share their slot name
  owner.cash -= cost;
  return item;
}

function buy(kind, key) {
  const item = applyPurchase(G.player, kind, key);
  if (!item) { toast('Not enough cash.'); return; }
  toast(`Acquired ${item.name}.`);
  renderGarage();
}

// Each AI's ordered draft priorities (existing card keys). It buys down this list —
// identity driver first, then the income sponsor, chassis, parts/crew, then tactics.
const AI_WISHLISTS = {
  charger:  [['driver','kyle'], ['sponsor','energy'], ['car','slipstream'], ['part','turbo'], ['part','aero'],
             ['tactic','sling'], ['tactic','trade'], ['tactic','dirty']],
  ironman:  [['driver','dale'], ['car','ironhide'], ['sponsor','energy'], ['part','cage'], ['crew','steady'],
             ['tactic','ppit'], ['tactic','gwc'], ['tactic','spot']],
  balanced: [['driver','lopez'], ['sponsor','energy'], ['car','apex'], ['crew','aces'], ['part','aero'], ['part','soft'],
             ['tactic','sling'], ['tactic','gwc'], ['tactic','clean']],
};
function aiOwns(t, kind, key) {
  if (kind === 'tactic') return false;        // can always add another copy
  if (kind === 'part') return t.parts.includes(key);
  return t[kind] === key;                     // a filled slot
}
// Pay an AI its purse, then draft down its archetype wishlist until its cash can't
// reach the next want. Thins a filler Steady Lap early when it's flush.
function aiGarage(owner, lastPoints) {
  owner.cash += sponsorIncome(owner.team) + Math.max(1, Math.round(lastPoints / 8));
  const t = owner.team;
  if (owner.cash >= 5 && owner.deck.filter(id => id === 'steady').length > 3) {
    owner.deck.splice(owner.deck.indexOf('steady'), 1); owner.cash -= 1;
  }
  const wl = AI_WISHLISTS[owner.archetype] || AI_WISHLISTS.balanced;
  owner.lastBuy = null;
  for (let bought = true; bought; ) {
    bought = false;
    for (const [kind, key] of wl) {
      if (aiOwns(t, kind, key) || owner.cash < costOf(MARKET_TABLES[kind][key], t)) continue;
      owner.lastBuy = applyPurchase(owner, kind, key).name;
      bought = true;             // re-scan from the top so top priorities get first dibs
      break;
    }
  }
}

/* ==========================================================================
   PHASE: FINALE
   ========================================================================== */
function phaseFinale() {
  const all = [G.player, ...G.rivals].slice().sort((a, b) => b.seasonPoints - a.seasonPoints);
  const champ = all[0];
  const you = all.findIndex(t => t.isPlayer) + 1;
  const won = champ.isPlayer;
  render(`
  <div class="card hero">
    <div style="font-size:44px">${won ? '🏆' : '🏁'}</div>
    <div class="score" style="font-size:40px;${won ? 'color:var(--gold)' : ''}">${won ? 'SEASON CHAMPION' : 'P' + you + ' in the standings'}</div>
    <div class="fin">${won ? 'You took the title!' : `Champion: <b>${esc(champ.name)}</b> — ${champ.seasonPoints} pts`}</div>
    <div class="muted" style="margin-top:10px">You finished the ${RACES}-race Sprint season with <b>${G.player.seasonPoints}</b> points.</div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>🏆 Final Standings</h2>
    ${standingsTable()}
    <div class="btnrow"><button class="btn primary wide" onclick="newGame()">Run it back — new season →</button></div>
  </div>`);
}

/* ---------- boot ---------- */
window.startRace = startRace; window.setChief = setChief; window.clickCard = clickCard;
window.flipIncident = flipIncident; window.finishRace = finishRace; window.phaseGarage = phaseGarage;
window.phaseFinale = phaseFinale; window.buy = buy; window.thin = thin; window.newGame = newGame;
window.setTeamName = setTeamName;
newGame();
