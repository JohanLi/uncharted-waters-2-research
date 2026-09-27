# NPC fleet objectives

NPC fleets retain an objective and an objective argument in the save. The
objective controls both their movement and the description given by a captain
or waitress. A fleet generally keeps its assignment until it reaches its
destination or another game event retargets it; changing a nation's strategic
state does not immediately rewrite every fleet already at sea.

## Fleet groups

The six national rosters use blocks of ten fleet IDs. Position zero belongs to
that nation's protagonist, while positions 1–9 are the autonomous fleets:

| Positions | National category | Pirate category |
| --------: | ----------------- | --------------- |
|       1–4 | Merchant fleet    | Buccaneers      |
|       5–6 | Convoy            | Corsairs        |
|       7–9 | Voyaging fleet    | Privateer       |

The national blocks begin at fleet IDs 0, 10, 20, 30, 40, and 50. The pirate
block begins at 60, so its nine autonomous fleets are IDs 61–69.

## Saved state

The complete 0x85-byte fleet record begins at slot-relative offset `0x1DE0`:

```text
fleet = slot base + 0x1DE0 + fleet ID × 0x85

fleet[0x00]  current world X                         u16 little-endian
fleet[0x02]  current world Y                         u16 little-endian
fleet[0x04]  current navigation-target X             u16 little-endian
fleet[0x06]  current navigation-target Y             u16 little-endian
fleet[0x1B]  objective                               u8
fleet[0x1C]  objective argument                      u8
fleet[0x1D]  item carried, taken by a victor; 0xFF none  u8
fleet[0x1E]  three more item bytes, written but unused 3 × u8
fleet[0x21]  carried-good ID; 0xFF means no cargo    u8
fleet[0x26]  home-port ID                            u8
fleet[0x27]  arrival-action delay                    u8
fleet[0x29]  fleet flags; bit 0 marks an active fleet
```

Because the file header is `0x97` bytes, slot 1's fleet table begins at
absolute file offset `0x1E77`. That absolute address must not be added to the
slot base again.

The captain's fleet ID is stored at captain-record byte `+0x24`. Consequently,
an NPC's assignment must be found through the same captain-to-fleet link used
for its ships; fleet IDs should not be inferred from a captain's name.

The objective argument is interpreted according to the objective. It can be a
port ID or sailor ID. The two navigation-target words are derived
movement state rather than the authoritative assignment: objectives aimed at a
port copy that port's coordinates, while objectives aimed at a fleet follow
the target fleet's changing coordinates.

See [fleet-navigation.md](fleet-navigation.md) for the separate route and
waypoint investigation.

## Objective values

The ordinary autonomous objective enum contains values 0–9. Value 10 is used
by scripted pursuit, and value 11 is a dialogue-only substitution rather than
a distinct autonomous assignment.

| Value | Meaning                | Argument            | Captain's statement              | Waitress's report                          |
| ----: | ---------------------- | ------------------- | -------------------------------- | ------------------------------------------ |
|     0 | Return home            | home-port ID        | “We're on our way home.”         | heading toward the port                    |
|     1 | Invest                 | destination port ID | heading there to invest          | heading toward the port                    |
|     2 | Trade                  | destination port ID | off to trade goods there         | heading toward the port                    |
|     3 | Waylay fleets          | port ID             | a hostile encounter statement    | waylaying fleets in the region             |
|     4 | Attack merchant fleets | target sailor ID    | a hostile encounter statement    | attacking merchant fleets indiscriminately |
|     5 | Pursue a fleet         | target sailor ID    | looking for that captain         | targeting that captain's fleet             |
|     6 | Pursue a fleet         | target sailor ID    | looking for that captain         | targeting that captain's fleet             |
|     7 | Pursue a fleet         | target sailor ID    | looking for that captain         | targeting that captain's fleet             |
|     8 | Guard a fleet          | target sailor ID    | sailing in a convoy              | guarding that captain's fleet              |
|     9 | Guard a port           | port ID             | on the lookout for pirates       | guarding the port                          |
|    10 | Scripted pursuit       | target sailor ID    | “I have some business with you.” | not handled by the ordinary report table   |

Objective 3's argument is a port whose coordinates become the destination,
as for objectives 0–2 and 9; Otto's scenario, for example, assigns it with
port IDs 28 (Nantes) and 48 (Santo Domingo)
([Otto's scenario](../scenarios/scenario-3-otto-baynes.md)).

Objectives 5–7 deliberately share the same public wording and all follow the
target's fleet. Values 5 and 6 use the same pursuit branches in the movement,
target-validation, and encounter code. Their different values identify the
strategy/class route that selected them, rather than two distinct pursuit
algorithms: ordinary offensive modes normally assign 5 to convoys and 6 to
voyaging fleets. Fleet category can still affect the common pursuit code, so a
convoy and a voyaging fleet need not behave identically merely because their
objective handling is shared.

Value 7 is the exception. It follows the same target but suppresses three
ordinary return-home exits during an encounter: the one-in-three post-combat
withdrawal, the strength-based withdrawal, and the pre-engagement withdrawal.
The ordinary strategic selector never emits 7, so it is a persistent special or
scripted pursuit state rather than a normal national sortie.

When an objective from 5 through 7 names the current player, the gossip routine
temporarily dispatches dialogue value 11 and says “And you know what? You are
my next prey.” It does not write 11 back to the fleet record.

Cargo is reported independently of the objective. If fleet byte `+0x21` is not
`0xFF`, the waitress appends “carrying %s” after the objective description.

## How a new autonomous objective is selected

Each nation record has a strategic-mode byte at `+0x03`. The monthly national
update chooses that mode. An NPC fleet consults it later, when the fleet has
returned home and begins a new sortie. The selector at `MAIN.EXE`
`0x397FF–0x3986E` uses the following packed table at file offset `0x47818`:

| Strategic mode | Merchant/Buccaneer |       Convoy/Corsair | Voyaging/Privateer |
| -------------: | -----------------: | -------------------: | -----------------: |
|              0 |         1 — invest |       9 — guard port |    8 — guard fleet |
|              1 |         1 — invest |       9 — guard port |    8 — guard fleet |
|              2 |          2 — trade |       9 — guard port |    8 — guard fleet |
|              3 |         1 — invest |     6 — pursue fleet |   6 — pursue fleet |
|              4 |         1 — invest |     5 — pursue fleet |   6 — pursue fleet |
|              5 |         1 — invest |     5 — pursue fleet |   6 — pursue fleet |
|              6 |         1 — invest |     5 — pursue fleet |   6 — pursue fleet |
|              7 |   6 — pursue fleet |       9 — guard port |   6 — pursue fleet |
|              8 |   6 — pursue fleet | 4 — attack merchants |   6 — pursue fleet |

Modes 0–2 are the normal non-offensive modes. The monthly routine randomly
chooses among them when a nation does not begin an attack; only mode 2 changes
the class pattern, by sending merchant fleets to trade instead of invest.

When a normal nation begins an offensive action, mode 4 is selected if the
target nation's Profit exceeds its own, and mode 5 otherwise. The probability
of beginning that action also uses the nation's aggression byte at nation
record `+0x09`: it is tested against `random(120)` when the target has at least
as much Profit and against `random(90)` when the target has less. The target
nation itself is the cached nation-record byte `+0x02` used by Guild
intelligence.

The pirate record uses mode 7 when its target byte `+0x02` is 7, the player's
nation, and mode 8 otherwise (`0x1CF6A–0x1CF76`). Modes 3 and 6 exist in the objective table and in the target-selection
code, but the ordinary monthly path does not leave a normal nation in either
mode; they are available to special or scripted state changes.

### Only fleets based at the capital sortie

Before the table is consulted, the selector compares the fleet's argument,
which after a return home is its home port, with its nation's capital, nation
byte `+0x0A` (`0x39810–0x3981A`). If they differ, it returns objective 0 and
the fleet is sent “home” again. Every national fleet in the new-game data is
based at its capital, but seven of the nine pirate fleets are not: the pirate
capital is Algiers (port 4), while buccaneers 61–64 are based at Caracas,
Cartagena, Havana, and Margarita (ports 42–45) and privateers 67–69 at Tunis
(port 5). Only corsairs 65–66 therefore ever hunt; the other seven never
receive an objective other than 0, and pirates never invest or trade in any
case.

A fleet told to return to the port it is already in still leaves it. The
route builder (`0x28A18`) steers first to the world-graph node nearest the
target and only then to the exact port, and the direct shortcut applies only
when the fleet stands exactly on a node (`0x28A49–0x28A54`). For Tunis
(242, 372) that node is 136 at (242, 365), 7 tiles due north, so a Tunis
privateer sails 7 tiles north, turns back, docks, waits its arrival delay,
and repeats. The Caribbean buccaneers loop the same way at their own ports.

Relaunching a destroyed fleet sets its home port to the capital
([Fleet regeneration](../fleets.md#new-commanders)), so a replacement pirate
fleet is based at Algiers and sorties normally.

The new-game file also leaves the pirates' targets `+0x04/+0x06` at other
ports (for example Azov for fleet 67 and Alexandria for fleet 61), with
objective 0 and their home port as argument. They first sail the long graph
route to that stale target, 41–72 nodes around Africa or across the top of
the map, and only on arrival are snapped home and begin the loop above.

## How the argument is selected

After selecting an objective, `MAIN.EXE` `0x396DB–0x397FE` chooses its argument
and initializes the navigation target:

|   Objective | Argument rule                                                          |
| ----------: | ---------------------------------------------------------------------- |
|           0 | The fleet's own home port.                                             |
|         1–2 | The nation's cached merchant-fleet destination at nation byte `+0x04`. |
|           3 | The existing port argument is retained.                                |
|           4 | The current player's fleet is tracked.                                 |
| 5–7, mode 3 | The current player's fleet is targeted.                                |
| 5–7, mode 4 | A random position 0–4 in the target nation's fleet block is targeted.  |
| 5–7, mode 5 | One of positions 5–6—the target nation's convoy fleets—is targeted.    |
| 5–7, mode 6 | One of pirate fleet IDs 61–69 is targeted.                             |
| 5–7, mode 7 | The current player's fleet is targeted.                                |
| 5–7, mode 8 | A random position 0–4 in the target nation's fleet block is targeted.  |
|           8 | One of the nation's own four merchant fleets is guarded.               |
|           9 | The fleet's own home port is guarded.                                  |

For fleet-targeted objectives the stored argument is the target captain's
sailor ID, not the target fleet ID. The game resolves the sailor's current
fleet through sailor byte `+0x24`, allowing the reference to remain valid if a
scenario changes that captain's fleet.

## Assignment lifecycle

The normal lifecycle is:

```text
return home (0)
    → repair/replenish and wait for the arrival-action delay
    → choose an objective from fleet class + national strategic mode
    → choose its port or fleet argument
    → copy or continually follow the destination coordinates
    → perform the assignment
    → return home
```

Investment and trade handlers explicitly reset the objective to 0 after doing
their port work. Combat, destruction, scenario events, and target validity can
also retarget a fleet or send it home.

### Investing and trading

Only merchant fleets (positions 1–4) invest or trade, and each sortie does one
of the two: strategic mode 2 gives Trade, modes 0, 1, and 3–6 give Invest
([selection](#how-a-new-autonomous-objective-is-selected)). Both handlers run
once the arrival delay has expired, do nothing at the nation's own capital,
and then send the fleet home.

**Invest** (`0x39991–0x39B0C`), skipped when the treasury `+0x24` is below 2:

1. Half the treasury, times 100 gold, is added to the port's Market investment
   when its Industry exceeds its Economy, and to its Shipyard investment
   otherwise; if that account already holds 50,000, the other one is used.
   Each account is capped at 50,000 and converted into Economy and Industry
   at month end ([Market command dialogue](../buildings.md#market-command-dialogue)).
2. The treasury is halved.
3. The nation's support in the port (executable `+0x08 + nation`, `+0x0A + nation` in [ports.md](../ports.md))
   rises by `min(100 − support, floor(6 × treasury / 10))`, using the halved
   treasury. The same number of points, up to the other nations' total, is
   removed from the other nations' support there one point at a time,
   cycling through them in nation order.

**Trade** (`0x39B0D–0x39C39`): the fleet buys a random goods type (IDs 10–25)
at the port's current price, as much as the treasury allows up to 1,000
units, pays for it from the treasury, and raises that goods category's price
rate there by 3–5 (to at most 100).

**Back home** (`0x39886–0x39990`): if the fleet carries cargo, every price
rate at its home port falls by `random(3)`, and the cargo's category by 2
more (never below 0). The fleet is then fully repaired, its treasury is reset
to `floor(Guild Profit / 10) + 1 + random(3)`, its cargo is cleared, and a new
objective is chosen.

### Arrival-action delay

`fleet[0x27]` is the timer behind the apparent turnaround wait. Whenever the
game converts an objective into a new navigation target, it assigns
`8 + random(8)`, so the saved value is 8 through 15 days. The handlers for Return
Home, Invest, and Trade decrement it and take no action until it reaches zero.
Thus it delays the action on arrival at a port, not just a fleet's departure
from home. The timer remains present but is not consumed while a fleet is
following another fleet or waylaying near a port.

Two assignment helpers can instead keep a fleet at home with a fixed delay of
5 (`0x394F1`, `0x395B9`, guard `0x3941E`). The guard counts the fleets of the
caller's class in its block of ten that are not docked (fleet `+0x29` bit
`0x10` clear), the caller included: at least two merchant/buccaneer fleets
(positions 1–4), or at least one convoy/corsair (5–6) or voyaging/privateer
(7–9) fleet, trips it. A fleet with bit `0x40` is exempt. So a nation has at
most two merchant fleets and one fleet of each other class at sea at once,
and the others wait in port, retrying every 5. A docked fleet does not count
itself, but one at sea does: if `0x395B9` runs on a convoy or voyaging fleet
already at sea, the guard always trips and its objective becomes 0, although
its current course is kept until it arrives.

A defeated fleet counts as at sea. Only arrival (`0x1F3E6`) and relaunch
(`0x1D984`) set bit `0x10`; defeat clears only the active bit (`0x1531F`,
`0x1F9D5`), and the guard never tests the active bit. Until the fleet is
relaunched ([New commanders](../fleets.md#new-commanders)) it therefore takes
one of its class's places: a defeated convoy or voyaging fleet keeps its
siblings in port, and a defeated merchant fleet leaves room for only one more.

The delay counts days. The day loop (`0x2052F`) runs once per 20-minute tick,
72 per day, and on tick _t_ updates fleet _t_ only (`0x20595–0x205B5`), so
every fleet is updated once a day; a docked fleet's update calls the
port-action handler (`0x1FF0A` → `0x39C43`), which decrements `+0x27`. Fleets
inside the loaded sea area are moved every tick by `0x2025D`, but its port
handler runs only at tick 0 (`0x202CF`), also once a day. The arrival wait is
therefore 8–15 days, and a fleet held back by the class guard retries after
5 days.

### Pursuit and return transitions

Pursuit objectives validate their target captain before refreshing a course. A
target is usable only if sailor flag `0x20` is set and the sailor has a fleet
ID other than `0xFF`; an unusable target is redirected to the pursuer's home
port. The caller does not itself write the objective byte when it makes that
redirect; whether the common homeward helper also changes the objective remains
to be decoded. This validation is later than objective selection. At selection
time the game has already stored objective 6 and a target captain; it only
checks that captain's referenced fleet has its active bit. The stricter captain-status
check occurs during a subsequent pursuit refresh. A fleet can therefore leave
port with an explicit pursuit assignment, make a little progress toward the
selected target, and then be redirected home when that later check fails.

Pirate pursuers also give up on their own (`0x1F71B`). If the target's fleet
has a nonzero arrival delay `+0x27`, meaning it is docked and waiting, the
pursuer goes home (`0x1F7E0`, `0x1F828`). Otherwise it goes home on a roll
each daily update: 1 in 15 for positions up to 6, or 1 in 30 if the
commander's `+0x27` bit `0x20` is set; 1 in 30 or 1 in 60 for positions 7–9.
The player's fleet never sets `+0x27`, so pursuing the player never triggers
the first exit. A target in an unused protagonist slot fails the active-fleet
test at `0x395F2`, and the pursuer is sent straight home.

Objective 4, Attack Merchant Fleets, is also fleet-targeted: its ordinary
argument selector records the current player's captain, and its movement code
continually follows that fleet. Exact coordinate overlap with the player then
changes objective 4 to objective 5 as the contact/encounter transition. It is
not the beginning of the chase. Objectives 5–7 whose target fleet becomes
inactive receive a homeward course. Objective 7 then differs as described above
by resisting the normal encounter withdrawals.

### Battles between computer fleets

A fleet with objective 4–7 meets its target when both are in the same
24 × 24-tile block of the world (`0x1FCEF`). If the target is another
computer fleet, the encounter (`0x1FA1E`, called once a day off screen at
`0x1FEFD` and each tick in the loaded sea area at `0x20314`) is resolved
without a battle screen:

1. Nothing happens outside daytime, ticks 18–53 (06:00 to 18:00; `0x1FA60`).
2. Outside the loaded sea area, the target escapes when `random(150)` is below
   its captain's Seamanship (`0x1FAF4`); the pursuer then heads home unless
   its objective is 7. Inside the loaded area there is no escape roll.
3. Unless its objective is 7, the pursuer is sent home even when the fight goes
   ahead (`0x1FB0F`), so each sortie produces at most one exchange.
4. There is no fight if the target has flag `0x40`, is inactive, or is docked
   (`0x1FB29–0x1FB39`).
5. Each side deals `floor(strength / 10)` points of durability, using both
   fleets' strength ratings from before the exchange. Damage is taken from the
   last ship slot backwards: a ship whose durability is no more than what
   remains sinks and the rest carries over; otherwise the ship loses the
   remainder (`0x1FB3E–0x1FBCD`, `0x1FBF2–0x1FC29`).
6. For each target ship sunk, the attacker takes a fifth of the target's cargo
   (to at most 1,000) and a fifth of its treasury (to at most 60,000), and
   adopts the target's cargo type (`0x1FB74–0x1FBC1`).
7. Both strength ratings are recalculated (`0x1D40F`). A fleet left with no
   durability loses its commander and is marked inactive
   ([Fleet regeneration](../fleets.md#fleet-regeneration); `0x1F9D0`), and
   if the target is destroyed the attacker is sent home (`0x1FBE3`).
8. The attacking nation's Relation toward the target's nation falls by 2 or 3
   (to no less than 0), and a national target copies that value back; a
   pirate attacker instead lowers the target nation's Relation with the
   pirates by 2 or 3 (`0x1FC41–0x1FCE6`).

Strength is `floor((total durability + 4) / 5)`, so one exchange removes about
a fiftieth of the other fleet's total durability. With the escape roll, the
daylight window, and one exchange per sortie, computer fleets rarely sink one
another's ships and almost never destroy a whole fleet.

These fights never involve the player. The only battle-screen call in the
encounter (`0x263E8`, at `0x1FABE`) is reached when the target is the
protagonist (`0x1FA7E–0x1FA87`), and no message is shown for a fight between
two computer fleets, even on screen. Fleets join a battle as assisting fleets
only when a battle involving the player starts: `0x1843A` lists the active,
undocked fleets within 2 tiles of the player's fleet on both axes (`0x183EC`).

### Story flag `0x40`

No executable routine sets fleet flag `0x40`, and no fleet has it in the
new-game data. Scenario scripts give it to the fleets they direct, writing
flags `0x41` (active plus `0x40`) to Catalina's pursuers, Ezequiel's fleets,
Otto's armada, Rudolph's fleet, and similar story fleets. The flag survives
defeat (`0x1531F` and `0x1F9D5` clear only the active bit) and is removed
when a relaunch writes flags `0x31` (`0x1D984`). A fleet with it:

- ignores the class limit on departures (`0x3951E`, `0x395D0`);
- skips the pursuit refresh entirely, so it never gives up, retargets, or
  answers attacks on its nation (`0x1F740`);
- keeps its course where an ordinary fleet would be sent home by the
  steering check at `0x1F36B`;
- ignores the rank gate below and the one-in-three withdrawal after an
  encounter (`0x1FA87`, `0x1FACF`);
- is not sent home after the player surrenders to it (`0x15CA2`); and
- cannot be attacked by other computer fleets (`0x1FB29`).

### Corsairs and the player's rank

Corsairs explain a distinct pirate encounter path. In pirate strategic mode 8,
their ordinary assignment is objective 4, Attack Merchant Fleets, whose
argument is the current player's captain. Objective 4 therefore follows the
player even before the fleets share a coordinate. Exact coordinate overlap
changes it to objective 5 and begins the encounter path.

Before starting that battle, the encounter routine makes a rank/status gate for
the player. For a fleet without flag `0x40`, the check at `MAIN.EXE`
`0x1FA87–0x1FA9A` reads the byte at runtime address
`0x13EB + protagonist ID × 14`. That is `+0x0D` of the current protagonist's
14-byte Fame/Friendship record (runtime `0x13DE`, save-slot offset `0x05B6`):
the stored rank, from No Rank 0 through Duke 9. A zero rank sends the fleet
home; any nonzero rank permits the encounter to continue. Corsairs therefore
break off from a commoner but attack a protagonist holding any title, from
Page upward.

### Profit and fleet activity

Profit is read when an autonomous fleet completes its home turnaround. The
game sets fleet word `+0x24` to:

```text
floor(nation Profit / 10) + 1 + random(3)
```

That value is subsequently used to scale investments and trade cargo, so a
wealthier nation sends better-funded investment and trading sorties. Profit
also affects the monthly choice to begin an offensive national strategy.

No direct Profit test has yet been found in the active-fleet flag or in a
fleet-count limit. Profit is therefore not known to change how many fleets are
at sea or how often they sail; its decoded effects are the funding word above
and the monthly offensive-strategy choice.

## Relevant code

- `MAIN.EXE` `0x2589B–0x25A11`: captain-gossip objective dispatcher.
- `MAIN.EXE` `0x2CAA5–0x2CCD6`: waitress fleet report, objective dispatcher,
  cargo report, and position report.
- `MAIN.EXE` `0x1CD7F–0x1CF7E`: monthly target and strategic-mode update.
- `MAIN.EXE` `0x397FF–0x3986E`: class-and-strategy objective selector.
- `MAIN.EXE` file offset `0x47818`: packed objective table.
- `MAIN.EXE` `0x396DB–0x397FE`: objective-argument selector.
- `MAIN.EXE` `0x39886–0x39990`: home turnaround and new-sortie setup.
- `MAIN.EXE` `0x3986F–0x39885`: decrement arrival-action delay.
- `MAIN.EXE` `0x39991–0x39C39`: investment and trade arrival handlers.
- `MAIN.EXE` `0x3941E–0x3967E`: category guard and five-tick home redirect.
- `MAIN.EXE` `0x1F3E3–0x1F456`: arrival at a port: snap to the port, set flags `0x30` (docked), and set the arrival delay.
- `MAIN.EXE` `0x397FF–0x3981A`: home port must equal the capital, else objective 0.
- `MAIN.EXE` `0x1F71B–0x1F94D`, `0x1F94E–0x1F9CF`, and
  `0x1FA1E–0x1FCEE`: pursuit, target validation, and encounter transitions.
