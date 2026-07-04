# Trading Paint — playable prototype

A browser implementation of the stock-car deckbuilder in
[`trading-paint-design.md`](trading-paint-design.md). A **4-team season** — you vs
**3 AI teams** that all start from the *identical* mid-pack car and deck, then draft
up through the Garage between races. **Sprint season** format. No build step, no dependencies.

## Play

Open **`index.html`** in any browser (double-click it, or `file://…/index.html`).

## The loop (one race)

1. **Track reveals** — its key stat counts twice toward your BaseP.
2. **Crew chief** places its bonus (load the doubled stat).
3. **Draw a hand of 5.** Play a *Setup Sheet* first to fight for the pole.
4. **Flip the incident** — the shared chaos card hits every contender by its gate
   (a caution opens up Pit cards; the Big One asks everyone for DUR ≥7 or a DNF).
5. **Fire tactics** under the **3-energy cap** — you draw 5 but can only afford ~2–3,
   so pick your best (only *Setup Sheet*, played in qualifying, is free), then **roll 1d6**.
6. **Take your finish** on the 40-car field, score the **2026 Cup** points (win = 55).
7. **Garage** — thin your deck ($1), buy tactics, bolt on Parts, sign Free-Agency
   drivers/cars/chiefs/crews/sponsors. Then line up for the next race.

Most points after 5 races is champion.

## What's implemented from the design doc

- Full **team tableau** (Driver / Car / Chief / Pit Crew / Sponsor) with coded
  signature abilities, bolt-on **Parts**, and sponsor economy.
- **Tactic deck** with the pit-energy cap, deck-thinning, and the Garage market.
- **Resolution math** exactly per §4: `BaseP = SPD+HAN+DUR + key-stat×2`
  (intermediate doubles your own highest), Race Score → the front-compressed
  **40-car finish bands**, unique position assignment.
- The **shared incident deck** (§8.4) with DUR-gated catastrophes, cautions,
  Lucky Dog, Rain Delay, Engine Failure (punishes the leader), and extra Big Ones
  on superspeedways.
- The real **2026 points curve** (P1=55, P(n)=35−(n−2)…1) + fastest-lap +1.
- **Symmetric AI teams** (§11's hand-piloted rivals): each AI is a full team with its
  own tableau, deck, cash and Garage. They start dead even with you and draft toward
  distinct archetypes — a **Charger** (speed/aggression), an **Ironman** (durability),
  and a **Balanced** all-rounder — drawing and playing a real hand under the same energy
  cap. A do-nothing player finishes last ~100% of the time; a good drafter takes its
  fair share of titles (≈25% of a 4-team field).

## Not yet built (future, per §6/§11)

Full-Season format (3 stages, stage points, The Chase), the deeper 20-card Garage, and a
selectable 2–3 team count. The engine is structured so these slot in.

## Dev note

`game.js` is pure client-side and self-testing-friendly: a headless harness (DOM stubs +
direct-eval) can auto-play hundreds of seasons to check position uniqueness, the points
curve, and win-rate balance — a passive player wins ~0% of titles, an active drafter ~25%
(its fair share of the 4-team field).
