# TRADING PAINT — Design Doc

*A stock-car deckbuilder. Working title. Real NASCAR marks are trademarked, so a
shippable version uses generic stock-car theming with real-feel systems.*

**Version:** v0.2 (playtest numbers — round & deliberately un-tuned)
**Changelog:** v0.2 — moved to a full **40-car field** so the finish-points curve runs all
the way to 1 and **DNFs actually sting** (was a 20-car ladder in v0.1).
**Medium:** physical tabletop
**Players:** solo (vs AI rivals) **and** 2–4 competitive, one ruleset
**Points model:** the real **2026 NASCAR Cup** system (see §7)

---

## 1. Concept

A deckbuilding season-racing game. Your **play area is your race team** — a
permanent tableau of Driver, Car, Crew Chief, Pit Crew and Sponsor. You **also**
build a shuffle-and-draw **tactic deck** you draw a hand from each race. Each turn
is a **race at a track**; your team + the cards you play determine your finish and
the points you score. A set number of races is a **season**; most points at the
end wins.

### The three pillars (design intent)
1. **Team drafting is the engine.** ~70% of a race result comes from your permanent
   tableau. A well-built team reliably **floors around P7–10 of 40**.
2. **The deck is the swing.** A hot hand can leap you a position band or two, or
   sabotage a rival — but a hard **pit-energy cap** stops the deck from carrying a
   weak team.
3. **Chaos can always wreck you.** The incident deck delivers graded bad luck, up
   to catastrophic DNFs, gated on stats you *can* invest in but never fully immunize.
   The favorite can always be knocked out.

---

## 2. The two card systems

### A. Team Tableau (permanent)

| Slot | Contributes | Notes |
|------|-------------|-------|
| **Driver** | SPD, HAN + a signature ability | Archetypes: Charger / Wheelman / Ironman / Closer / Restrictor ace |
| **Car** | SPD, HAN, DUR | Accepts **Part** upgrades bolted on permanently |
| **Crew Chief** | a bonus / re-roll / strategy bender | Bends one rule per race |
| **Pit Crew** | PIT (matters during cautions) | Fast stops = track position |
| **Sponsor** | prize money + a passive perk | Your economy engine |

### B. Tactic Deck (the deckbuilder)
Start with ~10 basic cards; draw a **hand of 5** each race. Buy better cards from the
shared **Garage** market between races. Subtypes: **Strategy, Pit, Draft, Aggression,
Setup.** Deck-thinning available (trash a filler card for $1).

---

## 3. Core stats

**SPD · HAN · DUR** (track-weighted pace stats) + **PIT** (matters only during
cautions). Card values stay single-digit so team totals land ~10–20 and the math is
head-math.

---

## 4. Resolution math

**Team base pace (counted once per race):**

> **BaseP = SPD + HAN + DUR + (track's key stat, counted a 2nd time)**
> *Intermediate tracks double your **own highest** of SPD/HAN instead — rewards specialists.*
> DUR is never the doubled stat (it's your incident-survival stat). PIT only matters during cautions.

**Race Score = BaseP + tactics played + 1d6 ± incidents.** Convert to a finish on the
fixed **40-car field**:

| Race Score | Finish | | Race Score | Finish |
|---|---|---|---|---|
| **46+** | P1 | | 30–33 | P11–16 |
| 42–45 | P2–3 | | 26–29 | P17–25 |
| 38–41 | P4–6 | | 22–25 | P26–34 |
| 34–37 | P7–10 | | ≤21 | P35–40 |
| — | — | | **DNF** (incident) | **P37–40** |

The bands are **front-compressed, back-spread** on purpose: a well-built team's normal
score swing (~34–45) stays inside the **top 10**, so only an *incident* — not an unlucky
die — knocks it out; and once you drop below ~34 the field falls away fast toward 40th,
so a wreck or DNF costs you nearly a whole race of points. (Band widths sum to exactly 40:
1+2+3+4+6+9+9+6.)

**Assigning unique positions:** rank all contenders by exact Race Score; each takes the
best open slot inside its band (ties → pole → PIT); the abstract **field cars fill every
unclaimed position** down to P40.

**Pit-energy** caps deck output: **3 (Sprint) / 5 (Full Season)** per race. You draw 5
but energy only lets you fire ~2–3. This is the hard cap that keeps the deck a swing,
not the engine.

**Why a fixed 40-car field:** "top-10" only means something if the field is bigger than
the player count — and 40 (real Cup grid size) lets the authentic **55 → 1** points curve
breathe. You place against the whole field, so solo and multiplayer use the identical
scale and points.

---

## 5. Race turn structure

Everyone races the **same Track card** each round.

1. **Reveal Track** → key stat weight + incident flavor.
2. **Qualifying** — draw a hand of 5; optionally play Setup cards. Highest qualifying =
   **pole** (picks pit strategy first, wins ties).
3. **Race:**
   - **Sprint race:** one shot — BaseP + tactics (energy 3) + 1d6 ± **1** incident.
   - **Full-Season race:** **3 stages**; flip **1 incident per stage** (more chaos),
     play tactics from your energy-5 budget, and after **stages 1 & 2** rank
     contenders by running score for **stage points** (10-9…1).
4. **Finish** — final Race Score → ladder position → finish points.
5. **Payout & Garage** — earn $, buy tactic cards / Parts / Free-Agency team cards,
   reshuffle.

---

## 6. Two season formats (one ruleset)

| | **Sprint** (~45 min) | **Full Season** (90–120 min) |
|---|---|---|
| Races | 4–5 | 10 + The Chase |
| Stages/race | 1 (single Score) | 3 (with stage points) |
| Incidents | 1/race | 1/stage |
| Pit-energy | 3 | 5 |
| Garage depth | small | full market + Parts + Free Agency |
| Season end | straight cumulative — most points wins | **The Chase** (see §7) |
| Feel | tight, punchy | draft-an-engine epic; upsets accumulate |

---

## 7. Points — real 2026 NASCAR Cup system

The 2026 overhaul (verified): win jumped to **55**, playoff points were **eliminated**,
and the elimination playoffs were replaced by the cumulative **Chase**.

| Component | 2026 rule | In-game (40-car field) |
|---|---|---|
| **Win** | **55 pts** | P1 = **55** |
| 2nd → down | 35, 34, 33 … −1/pos to 1 | `P(n) = 35 − (n−2)` → P2=35, P10=27, P20=17, P36=1; **P37–40 = 1** |
| **Stage points** | stages 1 & 2, top 10: **10-9…1** | Full Season only |
| **Fastest lap** | **+1** (forfeited if car visits garage) | team with the single highest **stage Performance**, unless it took a garage/DNF incident |
| **Max/race** | **76** (55+10+10+1) | same |
| **Playoff points** | **eliminated** | none — no extra bookkeeping |
| **Postseason** | **The Chase**: top 16 after 26 races, **no win-and-in**, points reset with **staggered seeding** (reg-season champ 2,100; 2nd 2,075; 3rd 2,065; −5/seed after), **+25 premium** to the regular-season champ, **cumulative — no eliminations**; most points at the finale wins | reseeds the **contenders** (players + AI rivals) with a staggered head-start + reg-season-leader premium, then races the final stretch cumulatively → **Champion**. *The 40-car field is the scoring backdrop; the title is fought among the contenders — in a 4-player game all make the Chase, but seeding still rewards the season's leader.* |

**Design payoff:** the **55/35 win cliff** makes *going for the win* worth ~1.5 races
of solid running — the perfect prize for gambling your deck. No win-and-in and no
elimination resets mean **consistency (team-draft) compounds all season**, while the
big win + incident deck let a hot deck steal a Chase. The 2026 ruleset reinforces the
exact balance we want.

---

## 8. Starter card list (v0.2)

### 8.1 Starter team (everyone begins here — deliberately mid-pack, ~P18–26 of 40)

| Slot | Card | Stats |
|---|---|---|
| Driver | **Rookie "Freshman"** | SPD 3, HAN 3 — *Rookie: reroll one natural 1/race* |
| Car | **Base Chassis** | SPD 3, HAN 3, DUR 3 |
| Crew Chief | **Veteran Hand** | +1 to any one stat (chosen after track reveal) |
| Pit Crew | **Volunteer Crew** | PIT 3 |
| Sponsor | **Local Diner** | $2/race |

### 8.2 Garage / Free Agency — draftable team cards

**Drivers** (SPD, HAN, signature ability)

| Driver | SPD | HAN | Ability |
|---|---|---|---|
| **Kyle Ace** *(Charger)* | 5 | 3 | Aggression tactics cost 0 energy |
| **Dale Steady** *(Ironman)* | 3 | 4 | Ignore the first −DUR incident each race |
| **Rico Turns** *(Wheelman)* | 3 | 5 | +2 Score on road & short tracks |
| **Lightning Lopez** *(Closer)* | 4 | 4 | +3 Score in the final stage |
| **Buddy Draft** *(Restrictor ace)* | 5 | 2 | Your Draft tactics give +2 extra |
| **Rook Sparks** *(budget)* | 4 | 3 | — (cheap) |

**Cars** (SPD, HAN, DUR)

| Car | SPD | HAN | DUR |
|---|---|---|---|
| **Apex GT** | 4 | 4 | 3 |
| **Ironhide** | 3 | 3 | 5 |
| **Slipstream** | 5 | 3 | 2 |
| **Cornerhugger** | 3 | 5 | 3 |

**Crew Chiefs** — *Strategist Sam* (reroll your race die) · *Numbers Nia* (+2 to one
stat post-track) · *Gutcall Gary* (after an incident, may play 1 extra tactic, pays energy)

**Pit Crews** — *Pit Aces* (PIT 6) · *Steady Stops* (PIT 4, +1 DUR) · *Fuel Misers*
(PIT 4, immune to fuel incidents)

**Parts** (bolt permanently onto Car) — *Turbo Kit* (+2 SPD, −1 DUR) · *Roll Cage*
(+2 DUR) · *Aero Package* (+1 SPD, +1 HAN) · *Soft Tires* (+2 HAN, −1 DUR)

**Sponsors** — *Energy Drink Co* ($4) · *Tire Brand* ($3, +1 PIT) · *Auto Parts Chain*
($3, Garage cards cost $1 less)

### 8.3 Tactic deck

**Starter deck (10):** 5× *Steady Lap* (+1) · 3× *Push It* (+2, 1e) · 2× *Pit Stop*
(+PIT during a caution). *Pay $1 in the Garage to trash a Steady Lap — deck thinning.*

**Garage market:**

| Card | Type | Effect | Energy |
|---|---|---|---|
| Slingshot Draft | Draft | +3 (+5 on superspeedway) | 2 |
| Trade Paint | Aggression | Target rival: DUR ≥6 or −4 | 2 |
| Perfect Pit Stop | Pit | +6 if PIT ≥5, else +2 | 2 |
| Green-White-Checkered | Strategy | +4, final stage only | 2 |
| Fresh Tires | Pit | +PIT this stage | 1 |
| Clean Air | Strategy | +3 if you're P1–3 in the stage | 1 |
| Dirty Air | Aggression | A rival ahead of you: −2 | 1 |
| Blocking Line | Aggression | Cancel one rival's Draft/Aggression card | 1 |
| Setup Sheet | Setup | +3 to qualifying (pole/turn order) | 0 |
| Spotter's Call | Strategy | +2 after an incident flip | 1 |

### 8.4 Incident deck (shared, ~16 cards)

- **×5 Clean Air** — nothing.
- **×2 Debris Caution** — caution; everyone may pit (add PIT / play a Pit card).
- **×2 Loose Wheel** — DUR ≥5 or −4.
- **×1 Blown Tire** — DUR ≥6 or −6.
- **×1 Overheating** — teams with SPD ≥8: −5 (Fuel Misers immune).
- **×2 The Big One** *(drawn extra on superspeedways)* — **every** team DUR ≥7 or **DNF → P37–40**.
- **×1 Engine Failure** — the **current stage leader** rolls DUR ≥7 or DNF. *(punishes the favorite!)*
- **×1 Lucky Dog** — last-place contender +5 (catch-up).
- **×1 Rain Delay** *(road/short only)* — HAN-strong teams +3.

DUR-gated catastrophes are the knockout: lower the odds with Roll Cage / Ironhide /
Dale Steady, never eliminate them.

### 8.5 Sample Track cards

| Track | Key stat | Incident flavor |
|---|---|---|
| **Bristol** (short) | HAN ×2 | aggression/contact heavy |
| **Talladega** (superspeedway) | SPD ×2 | +1 Big One shuffled in |
| **Watkins Glen** (road) | HAN ×2 | Rain Delay possible; driver skill |
| **Kansas** (intermediate) | your highest ×2 | balanced |

---

## 9. Balance proof (worked example)

**Well-built mid-season team** at **Bristol (HAN ×2):**
Lightning Lopez (4/4) + Apex GT (4/4/3) + Aero Package + Roll Cage → **SPD 9, HAN 9,
DUR 5**, Pit Aces **PIT 6**. **BaseP = 9+9+5+9(HAN key) = 32.**

| Scenario | Math | Finish | Points |
|---|---|---|---|
| Average day | 32 + tactics 4 + roll 3.5 = 39.5 | **P4–6** — strong, not a gift | ~31–33 |
| Cold hand + bad roll | 32 + 1 + 1 = 34 | **P7–10** — floor holds | ~27–30 |
| Everything clicks (Slingshot +3, Push +2, roll 6, Lopez +3) | 32+5+6+3 = 46 | **P1** — reachable, needs deck *and* luck | **55** |
| Blown Tire, fail DUR | 34 − 6 = 28 | **P17–25** — chaos knocks out the favorite | ~11–19 |
| Engine Failure while leading | forced DUR 7 check | **DNF → P37–40** — a title slips away | **1** |

Note how the 40-car field does its job: a normal race keeps a good team **top-10** (27–33
pts), but a failed DUR check now drops it deep into the field and a **DNF is worth 1 point**
— a genuine season-swinging disaster, just like real NASCAR.

**Starter team, same day:** BaseP ≈ 21 → ~26–27 after tactics/roll → **P17–25.** The climb
from ~P20 into the top 10 *is* the season — driven by drafting (BaseP 21→32), with the deck
deciding whether a good day becomes a **55-point win**.

---

## 10. Worked walkthrough — a draft + a turn

A full trip through the loop: the Garage between races, then one complete
Full-Season race. *(Card **prices are illustrative** — the economy pass is still open,
§11.)*

### 10.1 Where you stand (start of Race 4 of 10)

| Slot | Card | Stats |
|---|---|---|
| Driver | Rook Sparks | SPD 4, HAN 3 |
| Car | Apex GT | SPD 4, HAN 4, DUR 3 |
| Chief | Veteran Hand | +1 to any stat |
| Pit Crew | Volunteer Crew | PIT 3 |
| Sponsor | Energy Drink Co | $4/race |

**Deck (10):** 5× Steady Lap, 3× Push It, 2× Pit Stop. **Cash on hand: $9.**

### 10.2 The draft (Garage phase)

1. **Thin the deck:** trash a *Steady Lap* for **$1**. → deck is 9 cards, $8 left.
2. **Buy a Part:** *Roll Cage* (**$4**) bolted onto Apex GT → **DUR 3 → 5**. $4 left.
3. **Buy a tactic:** *Slingshot Draft* (**$4**) shuffled into the deck. **$0 left.**

**Team after the draft:** SPD **8**, HAN **7**, DUR **5**, PIT **3**.
**Deck (10):** 4× Steady Lap, 3× Push It, 2× Pit Stop, **1× Slingshot Draft.**

### 10.3 The turn — Race 4 at **Talladega** (superspeedway, SPD ×2, +1 Big One)

**BaseP** = SPD 8 + HAN 7 + DUR 5 + **SPD 8 (key, ×2)** = **28**.
Chief *Veteran Hand* +1 → put it on SPD (the doubled stat) → **BaseP 30**.
Pit-energy this race = **5**. Draw a hand of 5:
`Steady Lap · Steady Lap · Push It · Slingshot Draft · Pit Stop`. No Setup card → you
qualify mid-pack (pole goes to a rival).

**Stage 1**
- Play **Slingshot Draft** (Draft: +3, **+5 on a superspeedway**) — energy −2 (3 left).
- Incident flip: **Clean Air** — nothing.
- Running Race Score = 30 + 5 = **35** → ladder P7 → **stage points: 4.**

**Stage 2**
- Play **Push It** (+2) — energy −1 (2 left).
- Incident flip: **Debris Caution** — a caution! Play **Pit Stop** (+PIT = **+3**).
- Running Race Score = 35 + 2 + 3 = **40** → ladder P4 → **stage points: 7.**
- *Stage points banked so far: 11.*

**Stage 3 (the finish)**
- Play both remaining **Steady Laps** (+1 each = +2, 0 energy).
- Roll the race die **1d6 → 5** (+5).
- Pre-incident score = 40 + 2 + 5 = **47** → that's **P1 territory. You're about to win.**
- Incident flip: **THE BIG ONE** (the extra Talladega copy). *Every team: DUR ≥7 or DNF.*
  Your DUR is **5**. **You fail the check → DNF → P37–40.**

### 10.4 Scoring the race

- **Finish:** DNF, placed **~P38** → finish points floor = **1 point.**
- **Stage points banked before the wreck: 11** (kept — a stage lead you already earned
  isn't undone by a later DNF).
- Fastest lap (+1): went to a rival who led a full stage clean — not you.
- **Race 4 total: 12 points** — you were seconds from a **55-point win** and walked away
  with 12. That's the Talladega gamble.

### 10.5 What the walkthrough teaches

- **The draft mattered:** Roll Cage lifted DUR 3→5 and the Slingshot was your biggest
  single swing — you were headed for a **win**.
- **Chaos still won:** at a superspeedway the Big One needs **DUR ≥7**; even a good team
  eats it. Next draft you'd chase more DUR (Ironhide / Dale Steady / a 2nd Roll Cage) —
  exactly the pull the design wants.
- **The 40-car field makes the stakes real:** the same wreck that cost only ~19 points on
  the old 20-car ladder now costs all but **1** — a DNF genuinely tanks your season, so
  the choice to *gamble for the win* vs *bank a safe top-10* has real teeth.

---

## 11. Tuning dials & open threads

**Three dials:** the 40-car Race Score → position bands (§4), pit-energy (3/5), and the
DUR gates on incidents. *(v0.2 resolved the old "flat DNF" problem by going to a full field
— see the changelog.)*

**Not yet designed:**
- **AI-rival bot cards** for solo (a fixed Rating + a per-stage bot flip, no hand to pilot).
- Full **20-card Garage** and a deeper **Free-Agency** pool.
- Exact **Chase** scaling for small contender counts (how many make it, seed gaps).
- Starting **money / card costs** economy pass.
- **Component count** for a printable box (print-and-play prototype) — note the 40-car field
  is mostly an abstract **finish-position track / points chart**, not 40 physical car cards.
- **Field-car behavior:** confirm the field is purely a positional backdrop (fixed slots the
  contenders slot into) vs. giving it light movement/variance of its own.
