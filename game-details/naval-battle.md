# Naval battle

This page covers how a naval battle is fought and how it ends: the battle map
and movement, the two ship attacks, the ways a battle can end, and what the
winner takes.

The two attacks are **cannon fire** and **boarding**, the crew-against-crew
fight between adjacent ships. Both are made with the battle menu's
**Attack** command: an attack on a ship in range fires the guns, and an attack
on an adjacent ship boards it. When the protagonist's flagship attacks the
enemy flagship, the game first asks, “Will you challenge the enemy commodore
to a duel?”; answering No boards the ship instead. Sword duels between
commodores are documented separately in [Dueling](dueling.md).

## Battle units

When a battle starts (`MAIN.EXE 0x1477C–0x148F5`, with extra setup at
`0x145F3`), each ship gets a 24-byte unit record. The fields that matter for
damage are:

| Unit field | Meaning                                                                                                                                                                           |
| ---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    `+0x00` | The ship's captain's sailor record                                                                                                                                                |
|    `+0x02` | The ship's fleet slot: crew (`+0`), durability (`+2`), maximum durability (`+3`), Tacking (`+4`), Power (`+5`), guns (`+6`), gun type (low 3 bits of `+8`)                        |
|    `+0x0D` | Battle role (below), side number (bits 4–5), and slot number (bits 0–3)                                                                                                           |
|    `+0x0E` | Shots remaining                                                                                                                                                                   |
|    `+0x10` | Firepower at each distance (below)                                                                                                                                                |
|    `+0x15` | Gun range                                                                                                                                                                         |
|    `+0x16` | Boarding factor (below)                                                                                                                                                           |
|    `+0x17` | Combat share of the crew, in percent: for the player's ships `100 −` the lookout and navigation shares ([Fleet info](fleet-info.md)); for other fleets 25, or 50 on an oared ship |

A player ship's shots are its supply of Shot, written back when the battle
ends (`0x1466A`, `0x1607E`). A computer ship starts with
`r + random(r)` shots, where `r` is a fifth of its model's maximum guns, or
with only `random(r)` if it is an oared ship or belongs to a merchant fleet
(fleet ID ending in 1–4) (`0x14677–0x146E3`). Each volley uses one shot, however many guns fire
(`0x13CBD`).

### Battle roles

Up to four fleets can take part, one per side number. Bits 6–7 of unit byte
`+0x0D` give each ship's role (`0x1479B–0x1481D`):

| Bits 6–7 | Role                                                        |
| -------: | ----------------------------------------------------------- |
|   `0x80` | The player's own fleet                                      |
|   `0xC0` | Another fleet fighting on the player's side                 |
|   `0x00` | The main enemy fleet                                        |
|   `0x40` | An assisting enemy fleet, fighting alongside the main enemy |

### Fleets that join a battle

When a battle involving the player starts (`0x163E8`), `0x162CA` offers each side one supporting
fleet from the active, undocked fleets within 2 tiles of the player's fleet on
both axes (`0x1843A`, `0x183EC`), excluding the two fleets already fighting. A
candidate must be a convoy or voyaging fleet (position 5–9 of its block,
`0x16351`); merchant fleets and protagonist fleets never join. The first
candidate of the defender's nation supports the defender (message 779,
“%s %s will support the defending side.”), and the first of the attacker's
nation supports the attacker (message 780). The only test is the fleet's
nation (`0x16368`, `0x163A2`): Relations and the alliance flag are not read,
so an allied nation's fleet never joins either side. If the player's
affiliation is Piracy, no fleet joins at all (`0x1630C–0x16320`). Pirate
corsairs and privateers can support a pirate fleet the player attacks.

### Flagship

Each fleet's flagship is chosen afresh when a battle is set up (`0x144DC`).
The player's flagship is the ship the protagonist captains. A computer fleet's
flagship is its active ship with the highest **maximum durability**, the
earlier slot winning a tie; crew and current durability are not compared.
After a battle in which the old flagship lost maximum durability to critical
hits, another ship can therefore lead the fleet next time. A ship with no crew
can be chosen too; the side then loses as soon as its first turn comes, because
a crewless flagship counts as defeated ([How a battle ends](#how-a-battle-ends)). The flagship
becomes the side's first unit and moves first; the other ships follow in slot
order.

### Officers on the flagship

Several values below are **pooled** on the protagonist's own ship: the game
uses the best value among the protagonist, the First Mate, and the Chief
Navigator (`0x127E1` for attributes, `0x12847` for Battle Level). Gunnery
counts on the flagship if any of the three has it (`0x1289C`). On every other
ship these are simply the captain's own values. See
[Duties](sailors.md#duties).

## Map, turns, and movement

### The battle map

The battle map is 52 × 48 hexes (`0x12A8A`), arranged in vertical columns with
every odd column half a hex lower. It is drawn from the 6 × 6 world-map tiles
around the fleet (`0x141A2`): each tile becomes an 8 × 8 block of hexes, and
tiles numbered `0x34` or above become land, map bit `0x80`. Hexes where land
meets sea are made land or sea at random, the two outer columns on each side
copy their neighbours, and `0x13F74` then shapes the coastline. No ship can
enter land. Distance is counted in hexes (`0x12902`,
`0x12996`). Adjacent ships are at distance 1; they can board each other but
cannot fire on each other.

A ship faces one of six directions (unit byte `+0x0A`): 0 north, 1 northeast,
2 southeast, 3 south, 4 southwest, and 5 northwest (neighbour table
`DS:0xA080`). Every ship of a fleet starts facing the same way, the fleet's
heading at sea rounded to six directions (`0x149DC`).

### Turns

The four fleets act in the order: attacking main fleet, defending main fleet,
attacking assisting fleet, defending assisting fleet (side records
`DS:0x9C5A`, `0x9C62`, `0x9C6A`, `0x9C72`). A turn has ten rounds; in each
round every fleet moves its next ship, starting with its flagship
(`0x151D8`). Sunk ships, ships without crew, and ships that have left the
battle are skipped (`0x15158`). Each turn advances the clock by one tick of 20
minutes.

In its turn a ship can move and then attack once. The player controls only
the flagship; the player's other ships follow their **Plan** and **Order**
settings like computer-controlled ships (`0x15198–0x151AD`). The player plots
up to 10 steps and confirms the course (message 768); choosing **Move** leads
straight to the attack prompt and ends the turn, while **Attack** attacks
without moving.

### Wind and movement points

Each battle rolls its own wind once (`0x143BF`): a strength `WS` of
`1 + random(8)`, from 1 to 8, and a direction of `floor(random(8) × 5 / 7)`,
from 0 to 5. The direction uses the same numbering as the facings and is the
heading the wind blows toward.

A ship's movement points per turn come from its Power and its captain's own
Seamanship `Sea` and Navigation Level `NL`, which are not pooled
(`0x12B3F`):

```text
P  = floor(Power × WS × 8 / 150) + 20
Q  = floor(P × Sea / 100)
MP = max(10, min(25, Q + floor(NL × Q / 15)))
```

Each step costs movement points depending on the wind weight `W` of the
step's direction: 1 for the wind's own direction, 2 at 60° from it, 3 at
120°, and 4 for the opposite direction (`DS:0xA06C`). A step straight ahead costs
`floor(Power × W / 100) + 5`. A step that turns costs
`10 − floor(5 × Tacking / 100)` when `W` is 3 or 4, and 5 otherwise
(`0x12AA3`).

Sailing with the wind is therefore cheapest and against it dearest. A higher
Power raises the movement points but also the cost of each straight step,
while a higher Tacking makes turns into the wind cheaper.

### Turning

A ship can only step straight ahead or turn 60° to either side; it cannot
turn further or reverse in one step. Before each step the ship's turn rate is
added to its turn charge, up to 100. The step may turn when the result is at
least 50 (`0x12B33`; the player's plotter at `0x12EC5`, computer ships at
`0x132F6`); a turn empties the charge, and a straight step keeps the new
value. The charge carries over between turns (unit byte `+0x0B`) and starts
at 0. The turn rate is (`0x12AF2`):

```text
T         = floor(Tacking × Sea / 200)
turn rate = min(100, T + floor(NL × T / 15))
```

A ship with a turn rate of 50 or more can therefore turn on every step. A
ship cannot enter land, another ship, or a ship without crew.

## Cannon fire

### Guns

A ship's gun type sets its range `A` and strength `B` (tables at `DS:0x09EE`
and `DS:0x09FE`). The type numbers follow the Shipyard's gun list
([Figureheads and guns](ships.md#figureheads-and-guns)). Firepower at
distance `d` is `B` times a multiplier of 10, 9, 8, or 7 for distances 2, 3,
4, and 5, and 0 beyond the range (`0x14720–0x1474A`):

| Type | Gun           | Range | Strength | Firepower at distance 2 / 3 / 4 / 5 |
| ---: | ------------- | ----: | -------: | ----------------------------------- |
|    1 | Cannon        |     3 |       20 | 200 / 180 / – / –                   |
|    2 | Demicannon    |     2 |       14 | 140 / – / – / –                     |
|    3 | Canon Pedrero |     2 |       10 | 100 / – / – / –                     |
|    4 | Culverin      |     5 |       10 | 100 / 90 / 80 / 70                  |
|    5 | Demiculverin  |     5 |        4 | 40 / 36 / 32 / 28                   |
|    6 | Saker         |     2 |        4 | 40 / – / – / –                      |
|    7 | Carronade     |     5 |       20 | 200 / 180 / 160 / 140               |

A ship can fire (`0x12BB2`) when it has shots left, the target is at
distance 2 up to its range, and the target lies in one of its two
**broadside arcs**: the 60° cones on either side of the ship, square to its
keel, with their edges included. Nothing ahead of or behind the ship can be
fired on. At distance `d`, `2d + 2` of the `6d` hexes are in arc. Boarding has
no arc limit.

In these diagrams `@` is the ship, `o` the adjacent hexes it can only board,
`#` the hexes it can fire on at up to distance 4, and `.` the hexes it cannot:

```text
facing N or S        facing NE or SW      facing SE or NW
        .                    #                    #
      .   .                #   .                .   #
    .   .   .            #   #   .            .   #   #
  .   .   .   .        #   #   .   .        .   .   #   #
#   .   .   .   #    #   #   #   .   .    .   .   #   #   #
  #   .   .   #        #   #   .   .        .   .   #   #
#   #   o   #   #    .   #   o   .   .    .   .   o   #   .
  #   o   o   #        .   o   o   .        .   o   o   .
#   #   @   #   #    .   .   @   .   .    .   .   @   .   .
  #   o   o   #        .   o   o   .        .   o   o   .
#   #   o   #   #    .   .   o   #   .    .   #   o   .   .
  #   .   .   #        .   .   #   #        #   #   .   .
#   .   .   .   #    .   .   #   #   #    #   #   #   .   .
  .   .   .   .        .   .   #   #        #   #   .   .
    .   .   .            .   #   #            #   #   .
      .   .                .   #                #   .
        .                    #                    #
```

### Damage

`0x12D85` computes the damage `D` of one volley. All divisions round down.

```text
A = floor(BL × L / 100) + floor(L / 2)
G = min(floor(guns / 2), floor(floor(crew × combat % / 100) / 2))
Y = floor(G × firepower[distance] / 10)
Z = floor(ceil(Y / 20) × A / 100)      with Gunnery
Z = floor(ceil(Y / 40) × A / 100)      without Gunnery
W = floor(Z × (50 + random(floor(S / 2))) / 100)
D = max(1, min(W, 50 + random(floor(C / 2))))
```

- `L` is the pooled Leadership, `BL` the pooled Battle Level, and `S` the
  pooled Swordsmanship. The code reads Leadership twice for `A`.
- `G` is the number of guns firing: half the guns, limited by half the
  combat crew.
- Gunnery halves the divisor, which roughly doubles the damage.
- `C` is the firing captain's **own** Battle Level, not pooled. The cap
  `50 + random(floor(C / 2))` therefore ranges from 50 up to 99.
- `Z` is truncated to 16 bits (`0x12E63`).

Nothing about the target enters the formula: its captain, hull, and crew do
not reduce the damage. Courage and Seamanship are not used.

### Effect on the target

`0x13ADB` applies `D` to the target's fleet slot:

```text
durability −= min(durability, D)
crew       −= min(crew, floor(D / 2) + random(3))
```

A volley can also do extra damage. When `D` is below 10 there is a 1-in-5
chance to check for it; from 10 it is always checked. `random(19)` then
chooses:

| `random(19)` | Extra damage                   |
| -----------: | ------------------------------ |
|          0–2 | maximum durability             |
|          3–6 | Power                          |
|         7–10 | Tacking                        |
|        11–12 | maximum durability and Power   |
|        13–14 | maximum durability and Tacking |
|        15–16 | Power and Tacking              |
|        17–18 | all three                      |

From `D` 20, a second roll replaces this with at least two of them:
`random(7)` 0–1 gives maximum durability and Power, 2–3 maximum durability and
Tacking, 4–5 Power and Tacking, and 6 all three. From `D` 40, all three are
always damaged.

- **Maximum durability** drops by 1, but not below a quarter of the model's
  durability.
- **Power** and **Tacking** each drop by `floor(D / 2) + random(3)`, not below 0.

Guns are never destroyed. If the target's durability reaches 0 it sinks
(`0x13A21`); otherwise, if its crew reaches 0, it is
[left without crew](#ships-without-crew). Otherwise a player ship that fired
gains 10 Battle experience
([Battle experience](levels.md#battle-experience)).

## Boarding

When a ship attacks an adjacent ship, the boarding fight (`0x13CC5`) runs
`0x12D08` once for each side. The boarding factor `M` is set when the battle starts
(`0x1474C–0x14773`) from the captain's own Swordsmanship `Sw` and Battle Level
`BL`, which are not pooled:

```text
M = floor((floor(Sw × BL / 100) + floor(Sw / 2)) × k / 3)
```

`k` is 3 for the player's ships and for an enemy flagship, and 2 for enemy
escorts. `M` therefore ranges up to 150.

Each side's kills `K` are:

```text
F = floor((crew + random(10)) × combat % / 100)
X = floor(M × F / 100)
K = max(1, min(50, floor(((X × (50 + random(floor(S / 2)))) mod 65536) / 100)))
```

`S` is the side's pooled Swordsmanship. The attacker strikes first: the
target loses `min(crew, K)` for the attacker's `K`. The target then strikes
back with its reduced crew, and the attacker loses `min(crew, K)` for the
target's `K`.

- Each side kills between 1 and 50 crew per boarding attack.
- There is no term for the difference between the two crews. Each side's
  kills depend only on its own combat crew, boarding factor, and Swordsmanship,
  so a larger crew kills more.
- Boarding never damages durability, Power, Tacking, or guns.
- The product is taken modulo 65536 before dividing by 100 (`0x12D64`). That
  only matters when `X` exceeds about 661, which needs well over 400 combat
  crew with a high boarding factor.

If the target's crew reaches 0, it is
[left without crew](#ships-without-crew). Otherwise a player ship that
attacked gains 10 Battle experience.

Computer-controlled ships choose between the two attacks by their
[Method order](#orders).

### Enemy duel challenges

When an enemy flagship boards the player's flagship (`0x13D0E`), it
challenges the protagonist to a duel instead when both of these hold:

```text
random(15) + enemy captain's Swordsmanship >= protagonist's Swordsmanship
enemy captain's Luck                      >= random(player flagship's crew)
```

Otherwise the ordinary boarding fight follows. The protagonist's own duel challenge is
described in [Starting a duel during a naval battle](dueling.md#starting-a-duel-during-a-naval-battle).

## Ships without crew

A ship whose durability reaches 0 sinks: `0x13A21` clears its fleet slot. A
ship whose crew reaches 0 is handled by `0x13A63` instead, which marks its
square on the battle map but leaves the fleet slot intact, so the ship stays
in its fleet. From then on the turn loop skips it, as it skips a sunk ship
(`0x1517C–0x15196`), so it cannot move or attack for the rest of the battle.
A player ship left this way keeps its place in the fleet, and crew can be
moved to it afterwards.

Either way, a player attack that sinks the ship or clears its crew earns the
finishing Battle experience, 10 × the target's maximum durability.

## How a battle ends

The battle's outcome code (`DS:0xA075`) selects its ending (`0x15AC5`). A side
loses when its flagship has no crew, has durability 0, or has left the battle
(`0x128E4`, `0xF7F4`). A duel between the commodores also ends the battle
(`0x18077`), except against the commodore of an assisting fleet (role `0x40`):
the duel then only sets that ship's crew to 0, whichever side won it
(`0x1807D–0x18093`), and the battle goes on. That branch skips the code that
records a lost duel, so losing to an assisting commodore does not end the
game and costs the player nothing. With its flagship now crewless, the rest of
the assisting fleet turns to flee under the [morale rule](#morale). The protagonist can challenge either enemy flagship: the offer at
`0x1005B` accepts the flagship of the main enemy fleet or of the assisting
fleet.

| Code | Ending                                                  | Message                                                        |
| ---: | ------------------------------------------------------- | -------------------------------------------------------------- |
|    4 | The enemy flagship has no crew or has sunk: **victory** | 833, “The enemy's flagship ran up the white flag. …”           |
|    6 | The protagonist wins the duel: **victory**              | 833                                                            |
|    2 | The enemy flagship fled                                 | 565, “The battle ended as the enemy's flagship fled.”          |
|    1 | Nightfall                                               | 563, “The setting sun put an end to the day's battle.”         |
|    3 | The player's flagship fled                              | 564, “The battle ended as the flagship fled.”                  |
|    9 | The player's flagship surrendered                       | 566, “Our flagship had no choice but to surrender.”            |
|    5 | The player's flagship has no crew or has sunk: defeat   | The game ends ([Game over at sea](at-sea.md#game-over-at-sea)) |
|    7 | The protagonist loses the duel: defeat                  | The game ends                                                  |

After the ending, the battle's end sequence (`0x16040–0x16185`) treats the
codes by parity. For an even code (2, 4, 6, or 8), each of the player's
captains gains end-of-battle Battle experience (`0x160D7`), and the
diplomatic update runs: the naval [Relation loss and personal-Friendship
changes](friendship.md#naval-victory-rules) against the opposing fleet's
nation (`0x1610C` → `0x15DE5`, whose only guard is `0x15DED`, the parity
test). Odd codes skip both, so nightfall (1), fleeing (3), and surrender (9)
change neither Relations nor Friendship; 5 and 7 end the game first.

A victory (4 or 6) awards [Piracy Fame](fame/piracy-fame.md#naval-victories)
with the full battle-result factor of 3 and the [spoils](#spoils-of-victory).
When the enemy flagship flees (2), the player still gains Piracy Fame, with
factor 1, but takes no spoils (`0x15B33–0x15BBB`). The other endings give
neither.

### After the battle

Unless the game is over, `MAIN.EXE 0x16126–0x16185` then checks every computer
fleet that took part, on either side. Its captain loses the fleet (`0x15302`:
the captain's fleet byte `+0x24` becomes `0xFF` and he is moved to a random
port) when any of these holds:

- the fleet's flagship has sunk, has no crew, or has durability 0;
- the battle ended in a duel won by the protagonist (code 6); or
- the captain's sailor byte `+0x29` lacks bit `0x20`.

Losing the fleet empties all ten of its ship slots and marks the fleet
inactive (`0x15302–0x15359`); the fleet record is later given a new captain by
the ordinary fleet regeneration ([Fleets](fleets.md#fleet-regeneration)). A
captain drawn with a generic portrait (sailor byte `+0x13` bits `0xC0`) also
has bit `0x20` cleared (`0x1533A`), which frees his sailor record: each month it
has a 1-in-3 chance of being reused for a new generic sailor
([Sailors](sailors.md#temporary-vagabonds)), so such a captain can disappear
for good.

An enemy flagship that fled (code 2) or survived to nightfall (code 1) keeps its
fleet, provided its captain has that bit. Scenario scripts test “the opponent's
fleet byte is `0xFF`” to tell a real victory from an escape.

For endings 2, 4, and 6 the defeated captain then speaks a parting line
(`0x161BB–0x16239`), chosen by his fleet type and by whether he fled:

| Fleet                     | Defeated | Fled |
| ------------------------- | -------: | ---: |
| Pirate (fleet IDs 60–69)  |      830 |  834 |
| Merchant (IDs ending 1–4) |      832 |  836 |
| Any other                 |      831 |  835 |

A scenario flag set by a before- or after-battle route (`DS:0x0F6A` or
`DS:0x0EE0`) skips this line (`0x161A7–0x161B8`); nothing else is skipped.

### Leaving the battle

A ship leaves the battle from any hex on the map's edge (`0xEFBB`), with no
roll and whatever its speed (`0x139A4`). The player's flagship does so with
the **Escape** command, which asks “Are you sure you want to flee?” (message 776) and is available only on an edge hex (`0x10C20`). If a main fleet's
flagship leaves, the battle ends at once: code 3 for the player, 2 for the
enemy (`0xF7F4`).

### Nightfall

Each turn advances the clock by 20 minutes, and the battle ends in nightfall
(code 1) after the turn that reaches 21:00 or later (`0x15227–0x15232`). The
sea menu's **Battle** command works only from 5:00 to 19:40 (“You can't
attack someone at night.”, message 781, `0x16493`), so a battle started with
it lasts between 4 and 48 turns.

**Gossip** has no such limit. Gossiping with a fleet that is out to attack the
player starts the battle at once, at any hour (`0x2589B`, battle entry
`0FC4:11A8`). The fleet's order decides:

| Fleet's order                  | Gossip line                                                                     | Battle |
| ------------------------------ | ------------------------------------------------------------------------------- | ------ |
| 3                              | 155, “Ohhh, I was waiting for you to sail by. It's time to teach you a lesson.” | Yes    |
| 4                              | 156, “Unlucky fool! You don't know who I am.”                                   | Yes    |
| 5–7, targeting the protagonist | 161, “And you know what? You are my next prey.”                                 | Yes    |
| Any other                      | Where it is heading or what it is doing (152–160)                               | No     |

The nightfall check still applies. A battle started this way before 5:00 runs
until 21:00; one started at 21:00 or later ends in nightfall after its first
turn.

A fleet that attacks the player on its own does so only from 6:00 to 17:40
(`0x1FA60–0x1FA6C`).

### Before the battle: Fight, Flee, or Surrender

When an enemy fleet attacks the player, the game first offers **Fight**,
**Flee**, or **Surrender** (`0x14DFB`), unless a scenario has turned this
choice off. When the player attacks a merchant fleet, the merchant may offer
to surrender instead; see
[Pre-combat merchant surrender](fame/piracy-fame.md#pre-combat-merchant-surrender).
Accepting ends the battle with code 2, so it earns Piracy Fame with factor 1
but no spoils.

Before the choice, a mate sizes up the enemy using the same fleet strength
ratings as the [merchant surrender](fame/piracy-fame.md#pre-combat-merchant-surrender)
test: “Nothing to fear, Commodore, they're no match for us.” (message 821)
when `floor(3 × player strength / 2)` is at least the enemy's, otherwise
“Commodore, I think we're in big trouble.” (820) (`0x14EA0`).

**Flee** succeeds when the protagonist's own Luck plus Navigation Level is
greater than `random(150)` (`0x14EF6–0x14F0E`), “We managed to escape!”
(message 822); the battle is skipped and ends with code 3. Otherwise
“Commodore, there's nowhere to run! We have no choice but to fight.” (824),
and the battle begins.

**Surrender** skips the battle and ends it with code 9 (`0x14F3D–0x15066`):

- A national fleet announces, “You are wise to surrender. According to our
  law, we'll take away 2/3 of your gold and cargo.” (825). In fact the player
  keeps two thirds: gold becomes `floor(2 × gold / 3)`, and every goods load
  on every ship becomes `floor(2 × amount / 3)`.
- A pirate fleet (fleet IDs 60–69) takes all the goods (826). Gold under 1,000
  is raised by 1,000 (827), gold from 1,000 to 9,999 is left alone (828), and
  gold of 10,000 or more is set to 5,000 (829).

Water, food, lumber, and shot are never taken. After a surrender the enemy
fleet heads back to its home port, unless it is a story fleet (fleet flag
`0x40`, which scenario scripts set) or is pursuing someone (`0x15C9F`).

### After fleeing or surrendering

After code 3 or 9, each of the player's other ships whose captain has Loyalty
below 40 is lost with its captain, “Commodore, I don't see %s's ship
anywhere.” (message 791), as in the
[battle-start withdrawal](sailors.md#mate-loyalty) (`0x15D0F–0x15D5B`).

### Cancelled battles

A scenario's pre-battle route can cancel a battle before it starts (code 8,
`0x150FD`). No battle is fought (`0x16444`), and the ending shows no message
and gives no Fame or spoils (`0x15AD3`). The end sequence still runs
(`0x16467`), however, and 8 is even. The opposing captain was already
recorded when the battle was set up (`0x14BF2`), so the naval Relation loss
and personal-Friendship changes are applied against that fleet's nation as if
it had been fought, including the same-nation shame and exile checks. The
end-of-battle experience is zero, because its base is the pre-battle
routine's result, −1 for a cancelled battle, divided by 5.

### Journal entry

Every battle that is fought or fled adds an entry to the journal (`0x235E1`),
which keeps the 48 most recent entries and drops the oldest when full
(`0x23601–0x2365C`). The entry names the enemy's nation and whether it was a
merchant ship or a battle ship, and ends with one of three phrases, chosen by the ending (`0x15B30`,
`0x15C73`, `0x15CCA`):

| Ending                                    | Phrase                              |
| ----------------------------------------- | ----------------------------------- |
| Victory, or the enemy flagship fled       | “and served them a crushing defeat” |
| Nightfall                                 | “but sunset ended it in a draw”     |
| The player's flagship fled or surrendered | “but we were forced to flee”        |

The journal also records arrivals in port, restocking at the Harbor, and
newly sighted ports (`0x212FA`, `0x2D7AF`, `0x36C3C`).

## Spoils of victory

### Gold and items

After a victory (`0x15912`), the player takes `(F + 1) × 100` gold, where `F`
is the defeated fleet's treasury, the word at fleet record `+0x24`: “We managed to seize …
gold pieces” (messages 562 and 560). The fleet's item (`+0x1D`) is taken as
well when the inventory holds fewer than 20 items (`0x15950`); the item stays
in the fleet record until the fleet is relaunched.

Every fleet starts without an item (`0xFF`). Each time a computer fleet
returns home, it gets one with probability ½ if it has none: one of items
50–69, the gift and jewellery items from the Silk Shawl to the Ruby Ring
(`50 + random(20)`, `0x3990B–0x39933`). The same loop can also fill the next
three bytes, `+0x1E` to `+0x20`, with rolls of ¼, ⅙, and ⅛, each
made only when every earlier roll succeeded, but nothing reads them. A relaunch clears
all four to `0xFF` (`0x1D961`).

A fleet's treasury starts at `floor(G / 10) + 1 + random(3)`, where `G` is its
nation's Guild Profit ([Sphere of influence](sphere-of-influence.md)), each
time the fleet is created (`0x1D938–0x1D94D`). When one computer fleet
defeats another at sea, it takes a fifth of the loser's treasury, up to a
treasury of 60,000 (`0x1FBA0–0x1FBC1`). The routine also skips the
item when the defeated flagship has a player-side [role](#battle-roles), which
cannot happen when the player wins, so in practice only a full inventory
prevents it.

### Capturing ships

`0x154D8` then looks at the defeated fleet's ships. A ship is a candidate when
it has not sunk and lies inside the battle screen currently shown, which is
centered on the player's flagship (`0x11345`). Ships with no crew are
candidates too. Only the defeated fleet's own ships are considered, so ships
of another fleet that fought alongside it can never be captured.

The number that can be kept is the smallest of the number of candidates, the
number of sailors free to captain a ship ([Assigning duties](sailors.md#assigning-duties)),
and the free places in the player's fleet of ten. The game announces the
capture with message 1413, “We captured 1 enemy ship! We can add it to our
fleet.”, or 558, “We captured %d enemy %s! We can add %d of them to our
fleet.”, and the player picks the ships, names each one (message 557), and
confirms (559).

A captured ship (`0x15361`) keeps its durability, maximum durability, Tacking,
Power, guns, and gun type. Its crew is
`min(floor(crew / 10), maximum crew)`, a tenth of what it had when the
battle ended, so a ship captured with no crew joins with none. The maximum
crew is the ship instance's configured crew limit (identity-record `+0x14`,
the “Used Crew” of [Ships](ships.md#24-byte-ship-identity-record)), which is
fixed by construction, remodeling, or the Used Ship configuration. It starts with
no supplies or cargo, a 25% lookout share and a 50% navigation share, and
health 60. Its captain is chosen automatically and gets the Captain duty.

### Cargo

If there is at least one candidate, the game then offers cargo in the
goods-transfer screen. For each candidate ship, let `free` be its cargo
capacity minus its remaining shots and its share of the goods below:

```text
water  += floor(free × (30 + random(5)) / 100)
food   += floor(free × (30 + random(5)) / 100)
lumber += floor(free × (2 + random(2)) / 100)
shot   += the ship's remaining shots
```

Goods depend on the defeated fleet's cargo record (`+0x21` type, `+0x22`
amount):

- If the fleet carries goods, the amount is scaled by the share of its ships
  that are candidates: `floor(amount × candidates / total ships)`, split
  evenly among the candidates.
- If it carries none, the first four fleets of each nation's block of ten
  (fleet IDs ending in 1–4) have a 1-in-2 chance of carrying goods sized from
  the candidates' total cargo capacity `C`. With chance 9 in 10 the goods are
  Sugar, Cheese, Fish, Grain, Olive Oil, or Wine, `floor(C / 5)` of them;
  otherwise Coral, Amber, Ivory, Pearl, Tortoise Shell, Gold, or Silver,
  `floor(floor(C / 4) / 5)`.
- Other fleets yield no goods.

The supplies and goods, but not the gold, therefore scale with how many
enemy ships are on screen when the battle ends: each one adds its supplies and a share of the goods, whether or
not it is captured.

## Computer-controlled ships

### Orders

Each ship's orders are unit byte `+0x0C`, which the **Order** screen shows and
the player can change for their own ships:

| Order    | Choices                   | Bits                 |
| -------- | ------------------------- | -------------------- |
| Strategy | Flee, Fight Back, or Pack | `0x08`, `0x04`, none |
| Tactic   | Attack or Escape          | `0x02`, none         |
| Chase    | Chase or Defend           | `0x01`, none         |
| Method   | Fire or Rush              | `0x10`, none         |

At the start of a battle every ship gets (`0x14463`):

- Pack, except merchant fleets (fleet IDs ending in 1–4, outside the pirate
  block), which start with Flee;
- Attack;
- Chase when the captain's `Courage >= random(50)`, otherwise Defend;
- Fire when the ship has shot and is a sailing ship, otherwise Rush.

A computer fleet's ships all use the fleet commander as captain (side record
`+6`, `0x1480A`), so the fleet ID tested is the commander's and every ship of
a merchant fleet starts with Flee. The flagship is then chosen (`0x144DC`,
[Flagship](#flagship)) and its orders are replaced outright with `0x22`
(`0x14581`): Pack, Attack, Defend, and Rush, plus bit `0x20`. Nothing
reads that bit: every later write to the orders byte keeps it (`0x108AD`,
`0x10B19`, `0x10B42`, `0x10B51`, `0x1398B`), and the game finds a side's
flagship through the side record's first pointer (`0x1457A`) instead. So a merchant fleet's escorts flee from the first turn
whatever their strength, while its flagship stays and fights. It flees only
through the [morale check](#morale). Every computer flagship likewise starts
with Rush, even when it has shot.

The Strategy and Tactic select how a ship moves (`0xF6D2`, far-pointer table
`DS:0x90B2` indexed by `orders & 0x0F`):

| Orders              | Routine  | Movement                                                           |
| ------------------- | -------- | ------------------------------------------------------------------ |
| Flee                | `0xF265` | Leave from the edge if on it, otherwise head for an edge hex       |
| Pack + Attack       | `0xF5DF` | Close on the target ship, or the enemy flagship if it has none     |
| Pack + Escape       | `0xF618` | Move to the reachable hex least exposed to enemy fire and boarding |
| Fight Back + Attack | `0xF47F` | Close on its own flagship, the same routine as Pack + Attack       |
| Fight Back + Escape | `0xF4A2` | Move as close to its own flagship as possible, then least exposed  |

Computer fleets never use Fight Back or Escape. Their orders are set only at
the start of the battle (Attack, with Chase and Fire as above) and by the
morale check, which adds Flee (`0xF874`); every other write to `+0x0C` comes
from the player's Order screen (`0x10803–0x10B51`). The same screen is the
only place a ship is given its own target (orders bit `0x80`, unit byte
`+0x06`, `0x10B2F–0x10B3D`). A computer ship therefore always closes on the
opposing **main** fleet's flagship (`0x129DB`), even when it belongs to an
assisting fleet, or flees. The other rows apply to the player's escorts.

Chase or Defend does not change the movement. It is read only when the game
decides whether a ship looks for targets, which it does when Attack or Chase
is set (`0x131E2`). Because every ship starts with Attack, **Courage has no
practical effect in battle**, and it never enters any damage formula.

With **Fire**, a ship fires when it can and otherwise boards an adjacent ship.
With **Rush**, it boards when adjacent and otherwise fires (`0x13DDA`).

### Choosing a destination

Each computer-controlled ship's turn (`0xF857`) builds three 52 × 48 maps
(`0xF6FB`, `0x13570`), picks a destination hex (`0xF6D2`), plots a path to it
(`0x138F7`), moves (`0xF76D`), and attacks (`0xF73F`). Nothing in it is
random.

**Candidate hexes.** A depth-first search (`0x132EB`) tries every course the
ship could actually sail this turn: at each step a left turn, straight on, and
a right turn, under the real [movement point](#wind-and-movement-points) and
[turning](#turning) rules. A step must stay on the map, avoid every ship and
crewless hull, and cost no more than the points left. A hex becomes a
candidate only when the ship could take **one more** legal step from it
(`0x133CC–0x133D3`), so a hex reachable only by spending almost all its
points is never chosen; the starting hex is always a candidate (`0x135B8`).
Candidates are then removed for every living ship of the mover's own and
allied fleets, the mover included: the hex directly ahead of that ship, and
its last free neighbour when five of its six are occupied (`0x13537`,
`0x1340F`).

**Attack value.** On a ship with Attack or Chase, every hex the search enters
is scored for the facing the ship arrives with; the starting hex is scored for
its current facing and both turns (`0x135C0–0x135E9`). For each enemy ship
(`0x131C8`):

```text
if own ship has shots and the enemy is within its range and broadside arc:
    v = enemy firepower at distance d × (2 with Fire, else 1)
if d = 1:
    v = enemy boarding value (+0x16) × (2 with Rush, else 1)
if v ≥ value[hex]: value[hex] = v, and the hex records that facing
```

The firepower and boarding values are the **enemy's** (`0x13272`, `0x132AD`),
not the moving ship's own, and `v` is kept in one byte, so 256 or more wraps:
a Fire ship's value for an enemy firing 200 at distance 2 becomes 144.

**Exposure.** For each enemy ship, every hex within 5 of it that lies in its
range and **current** broadside arc adds that enemy's firepower at the
distance, and an adjacent hex adds its boarding value (`0x13131`, `0x130BD`).
The total is also one byte and wraps.

**Choosing.** The routines scan the candidates row by row from the top, left to
right within a row, and keep a running best. With `R` the ship's own gun range
(0 without guns), `D` the distance to the hex being closed on, `m` the
distance moved, and `ceil10` rounding up to a multiple of 10:

| Routine                  | Takes a hex when                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Close on (`0xF34B`)      | `max(D, R)` is lower; or equal and value > `T`; or equal, value = `T`, and `m` is larger |
| Near flagship (`0xF4A2`) | `D` is lower; or equal and exposure < `T`; or equal, exposure = `T`, and `m` is larger   |
| Least exposed (`0xF618`) | exposure is lower; or equal and `m` is larger                                            |

For closing on a ship, `T = ceil10(floor((12 − min(max(D, R), 10)) × best value / 10))`;
near the flagship, `T = ceil10(floor(min(D, 10) × best exposure / 10))`
(`0xF3E3–0xF417`, `0xF57A–0xF594`). Every hex at distance `R` or less from
the target ties on `max(D, R)`, including the hexes next to it, from which no
ship can fire. A ship therefore closes to within `R` hexes of the target and
then picks among those hexes by attack value. The threshold is taken from the
current best, so the result depends on the scan order. With `R` of 3 or 5
the factor is below 10, and a later hex (farther down, then farther right)
with about 90% or 70% of the best value replaces it. With `R` of 2 the factor
is 10, and an equal later hex does not.

A hex next to one of the player's ships ties with the firing hexes on the
first rule whenever it is no more than `R` from the target, so it competes
with them on attack value alone. Because the values are
the player's, a computer ship boards rather than fires when the player's
boarding factor beats the player's own doubled firepower, as it is kept in
one byte. With Fire, a firing hex scores `2 × firepower mod 256`:

| Player's guns | Firing hex value at distance 2 / 3 / 4 / 5 |
| ------------- | ------------------------------------------ |
| Cannon        | 144 / 104 / – / –                          |
| Demicannon    | 24 / – / – / –                             |
| Canon Pedrero | 200 / – / – / –                            |
| Culverin      | 200 / 180 / 160 / 140                      |
| Demiculverin  | 80 / 72 / 64 / 56                          |
| Saker         | 80 / – / – / –                             |
| Carronade     | 144 / 104 / 64 / 24                        |

A player captain with a boarding factor near its maximum of 150 therefore
draws boarders against every gun type except Culverin and Canon Pedrero, and
a player ship without guns can only be boarded. With Rush the boarding value
is doubled instead and can wrap too: 150 becomes 44.

**Fleeing** (`0xF265`) leaves the battle from an edge hex unless that hex is
land (`0xEFBB`, `0x139A4`). Otherwise it takes the candidate edge hex
farthest from its own starting hex, the first in scan order on ties
(`0xF2E6–0xF300`); the enemy's position plays no part. With no candidate on
an edge, it takes the candidate nearest any of 12 points on the edges, the
four corners and the two middle hexes of each side, skipping points that are
land (`0xF00D`). The land test swaps row and column: it reads map byte
`x × 52 + y` instead of `y × 52 + x`, so it checks the wrong hex, and for
the four points on the right edge it reads past the map into the unit
records:

| Point (x, y)       | Byte tested                                   | Effect                                                            |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------------- |
| (0, 0)             | hex (0, 0)                                    | correct                                                           |
| (25, 0), (26, 0)   | hexes (0, 25), (0, 26)                        | skipped when the left edge's middle is land                       |
| (0, 23), (0, 24)   | hexes (23, 0), (24, 0)                        | skipped when the top edge's middle is land                        |
| (0, 47)            | hex (47, 0)                                   | skipped when that top-edge hex is land                            |
| (25, 47), (26, 47) | hexes (47, 25), (47, 26)                      | skipped when those hexes, 4 columns from the right edge, are land |
| (51, 0)            | `DS:0x9CEA`, unit 4 `+0x10`                   | never skipped                                                     |
| (51, 23), (51, 24) | `DS:0x9D01`, `0x9D02`, unit 5 `+0x0F`/`+0x10` | never skipped                                                     |
| (51, 47)           | `DS:0x9D19`, unit 6 `+0x0F`                   | never skipped                                                     |

The unit array begins at `DS:0x9C7A`, right after the map, with ten 24-byte
records per side (`0x144ED`), so units 4–6 are slots 4–6 of the attacking
main fleet. Byte `+0x10` is the firepower at distance 1, which is 0 for every
gun type (`0x145F3`), and `+0x0F` is the high byte of the 16-bit shot count,
so neither can hold `0x80`. The right-edge points therefore always count,
even when they are land.

**Sunk and departed ships still count.** A sunk ship is never removed from
its side's unit list: sinking clears its map hex, cancels any player-set target aimed at
it, and zeroes its fleet slot (`0x13A21`, `0x11ADF`, `0x13959`), and leaving
the battle only sets orders bit `0x40` (`0x139A4`). Its position and shot
count stay in the unit record. The attack-value and exposure maps loop over
every unit in the list and test only shots, not whether the ship is still
in the battle (`0x131C8`, `0x13131`, `0x12C99`, `0x12CDB`). A computer ship
can therefore choose a hex for firing on, or boarding, a ship that has sunk,
left, or lost its crew, and avoid fire from one. The attack after the move
does check (`0x13DDA` calls `0x128E4`), so it only attacks a ship still in
the battle; if none is in reach, the ship ends its turn without attacking.

**Moving and attacking.** When the destination recorded a facing, the path
(`0x136CD`) must arrive with that facing, so the ship ends with a target in
its broadside arc. Otherwise it takes the course with the fewest turns, trying
left, straight, then right. A ship that stays in its hex only turns in place,
to the recorded facing or else toward its target (`0x137F5`); this costs no
points and does not empty the turn charge (`0xF7AD`). It then attacks once
when its hex recorded a facing: its own target if the player set one,
otherwise the first enemy it can attack in list order, starting with that
fleet's flagship (`0x13EC8`, `0x13E53`), with Fire or Rush deciding between
firing and boarding as [above](#orders). A ship with neither Attack nor Chase
never attacks.

### Morale

At the start of each computer-controlled ship's turn, the game checks its own
fleet's flagship (`0xEF6A`). If the flagship's crew has fallen to 40% or less
of its maximum crew, its durability to 40% or less of its maximum, or it has
left the battle, the ship switches to **Flee** for the rest of the battle
(`0xF870`). This applies to the player's escorts too, whenever the player's
flagship is that badly damaged.

## Open questions

None remain.
