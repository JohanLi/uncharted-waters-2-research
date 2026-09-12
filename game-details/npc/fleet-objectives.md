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
port ID, sailor ID, or region ID. The two navigation-target words are derived
movement state rather than the authoritative assignment: objectives aimed at a
port copy that port's coordinates, while objectives aimed at a fleet follow
the target fleet's changing coordinates.

See [fleet-navigation.md](fleet-navigation.md) for the separate route and
waypoint investigation.

## Objective values

The ordinary autonomous objective enum contains values 0–9. Value 10 is used
by scripted pursuit, and value 11 is a dialogue-only substitution rather than
a distinct autonomous assignment.

| Value | Meaning | Argument | Captain's statement | Waitress's report |
| ----: | ------- | -------- | ------------------- | ------------------ |
| 0 | Return home | home-port ID | “We're on our way home.” | heading toward the port |
| 1 | Invest | destination port ID | heading there to invest | heading toward the port |
| 2 | Trade | destination port ID | off to trade goods there | heading toward the port |
| 3 | Waylay fleets | region ID | a hostile encounter statement | waylaying fleets in the region |
| 4 | Attack merchant fleets | target sailor ID | a hostile encounter statement | attacking merchant fleets indiscriminately |
| 5 | Pursue a fleet | target sailor ID | looking for that captain | targeting that captain's fleet |
| 6 | Pursue a fleet | target sailor ID | looking for that captain | targeting that captain's fleet |
| 7 | Pursue a fleet | target sailor ID | looking for that captain | targeting that captain's fleet |
| 8 | Guard a fleet | target sailor ID | sailing in a convoy | guarding that captain's fleet |
| 9 | Guard a port | port ID | on the lookout for pirates | guarding the port |
| 10 | Scripted pursuit | target sailor ID | “I have some business with you.” | not handled by the ordinary report table |

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

| Strategic mode | Merchant/Buccaneer | Convoy/Corsair | Voyaging/Privateer |
| -------------: | ------------------: | -------------: | ------------------: |
| 0 | 1 — invest | 9 — guard port | 8 — guard fleet |
| 1 | 1 — invest | 9 — guard port | 8 — guard fleet |
| 2 | 2 — trade | 9 — guard port | 8 — guard fleet |
| 3 | 1 — invest | 6 — pursue fleet | 6 — pursue fleet |
| 4 | 1 — invest | 5 — pursue fleet | 6 — pursue fleet |
| 5 | 1 — invest | 5 — pursue fleet | 6 — pursue fleet |
| 6 | 1 — invest | 5 — pursue fleet | 6 — pursue fleet |
| 7 | 6 — pursue fleet | 9 — guard port | 6 — pursue fleet |
| 8 | 6 — pursue fleet | 4 — attack merchants | 6 — pursue fleet |

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

The pirate record uses mode 7 when it has no national target and mode 8 when it
does. Modes 3 and 6 exist in the objective table and in the target-selection
code, but the ordinary monthly path does not leave a normal nation in either
mode; they are available to special or scripted state changes.

## How the argument is selected

After selecting an objective, `MAIN.EXE` `0x396DB–0x397FE` chooses its argument
and initializes the navigation target:

| Objective | Argument rule |
| --------: | ------------- |
| 0 | The fleet's own home port. |
| 1–2 | The nation's cached merchant-fleet destination at nation byte `+0x04`. |
| 3 | The existing region argument is retained. |
| 4 | The current player's fleet is tracked. |
| 5–7, mode 3 | The current player's fleet is targeted. |
| 5–7, mode 4 | A random position 0–4 in the target nation's fleet block is targeted. |
| 5–7, mode 5 | One of positions 5–6—the target nation's convoy fleets—is targeted. |
| 5–7, mode 6 | One of pirate fleet IDs 61–69 is targeted. |
| 5–7, mode 7 | The current player's fleet is targeted. |
| 5–7, mode 8 | A random position 0–4 in the target nation's fleet block is targeted. |
| 8 | One of the nation's own four merchant fleets is guarded. |
| 9 | The fleet's own home port is guarded. |

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
    → choose its port/fleet/region argument
    → copy or continually follow the destination coordinates
    → perform the assignment
    → return home
```

Investment and trade handlers explicitly reset the objective to 0 after doing
their port work. Combat, destruction, scenario events, and target validity can
also retarget a fleet or send it home.

### Arrival-action delay

`fleet[0x27]` is the timer behind the apparent turnaround wait. Whenever the
game converts an objective into a new navigation target, it assigns
`8 + random(8)`, so the saved value is 8 through 15. The handlers for Return
Home, Invest, and Trade decrement it and take no action until it reaches zero.
Thus it delays the action on arrival at a port, not just a fleet's departure
from home. The timer remains present but is not consumed while a fleet is
following another fleet or waylaying a region.

Two assignment helpers can instead redirect a fleet to its home port with a
fixed delay of 5. This happens when the fleet lacks flag `0x40` and the
category guard finds enough fleets in its national block without flag `0x10`:
at least two merchant/buccaneer positions (1–4), or at least one
convoy/corsair (5–6) or voyaging/privateer (7–9) position. The semantic names
of those two flag bits still need decoding, but the redirect and its five-tick
delay are direct code behavior.

The code decrements this value once per invocation of the relevant port-action
handler. The scheduler's exact conversion of those invocations into game time
has not yet been identified, so the value should be described as ticks rather
than days or turns.

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

This gives a concrete explanation to test for the short privateer sorties from
Tunis: in pirate strategic mode 8, privateers receive objective 6 and a random
captain from positions 0–4 of the target nation. It is not yet established that
this is the sole cause of every observed short privateer sortie.

Objective 4, Attack Merchant Fleets, is also fleet-targeted: its ordinary
argument selector records the current player's captain, and its movement code
continually follows that fleet. Exact coordinate overlap with the player then
changes objective 4 to objective 5 as the contact/encounter transition. It is
not the beginning of the chase. Objectives 5–7 whose target fleet becomes
inactive receive a homeward course. Objective 7 then differs as described above
by resisting the normal encounter withdrawals.

### Corsairs and the player's rank

Corsairs explain a distinct pirate encounter path. In pirate strategic mode 8,
their ordinary assignment is objective 4, Attack Merchant Fleets, whose
argument is the current player's captain. Objective 4 therefore follows the
player even before the fleets share a coordinate. Exact coordinate overlap
changes it to objective 5 and begins the encounter path.

Before starting that battle, the encounter routine makes a rank/status gate for
the player. For a fleet without flag `0x40`, it reads the current
protagonist's entry in a 14-byte status table at runtime address
`0x13EB + protagonist ID × 14`. A zero entry sends the fleet home; a nonzero
entry permits the encounter to continue. The Commoner-to-Page observation
matches this branch: Commoner has the zero state, while Page has a nonzero
state. The exact save field and the values for later ranks remain to be mapped.

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
fleet-count limit. The observed link between economic power and the number or
frequency of fleets at sea may therefore be indirect, but it is not yet a
decoded activation formula.

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
- `MAIN.EXE` `0x1F3E3–0x1F456`: convert an objective into a navigation target.
- `MAIN.EXE` `0x1F71B–0x1F94D`, `0x1F94E–0x1F9CF`, and
  `0x1FA1E–0x1FCEE`: pursuit, target validation, and encounter transitions.
