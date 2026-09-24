# Piracy Fame

Piracy Fame measures success in naval combat and privateering. It is used by
the piracy-oriented protagonist stories and has a maximum of 50,000.

The repeatable sources are:

- naval victories, including victories in which the opposing captain flees;
- timely Defeat Pirates Guild assignments; and
- timely Collect Debt Guild assignments.

The protagonist scenarios can also award fixed amounts directly.

## Save storage

Each protagonist has a 14-byte Fame/Friendship record. Relative to the save
slot:

```text
record         = slot base + 0x05B6 + protagonist × 14
Trade Fame     = u16le(record + 0)
Piracy Fame    = u16le(record + 2)
Adventure Fame = u16le(record + 4)
```

The value is capped at 50,000 whenever Fame is awarded.

## Naval victories

A qualifying naval victory awards a fixed base of 200 plus a Battle-Level term:

```text
Piracy Fame = 200
            + battle-result factor
            × diplomatic factor
            × min(enemy Battle Level, 15)
            × min(enemy Battle Level, 30)
```

The Battle-Level term stops growing after level 30. The number or value of
captured ships does not enter the formula.

The battle-result factor is:

| Result                                                          | Factor |
| --------------------------------------------------------------- | -----: |
| Victory: the enemy flagship lost its crew, sank, or lost a duel |     ×3 |
| The enemy flagship fled during combat                           |     ×1 |
| Pre-combat Merchant surrender                                   |     ×1 |

Both ×1 results are battle outcome 2, which shows “The battle ended as the
enemy's flagship fled.” and takes no spoils (`0x15B33–0x15BBB`). Nightfall,
the player fleeing or surrendering, and defeat award no Piracy Fame. See
[How a battle ends](../naval-battle.md#how-a-battle-ends).

### Pre-combat merchant surrender

Only ordinary national Merchant fleets can make the decoded pre-combat offer,
"Okay, okay, we'll give you whatever you want. Just don't hurt us!" National
fleet IDs are grouped into blocks of ten, and positions 1 through 4 in each
block are Merchant fleets. The same positions in the Pirate block are
Buccaneers and are explicitly excluded.

Before the encounter dialogue (`0x1492B`), the game recalculates each
participating fleet's strength rating and totals the ratings on each side,
including supporting fleets. A fleet's rating is fleet byte `+0x28`
(`0x1D40F`):

```text
rating = floor((sum of current durability of its active ships + 4) / 5)
```

Only durability counts: crew, guns, and the ship types do not. The rating is
stored in one byte, so a fleet whose ships total more than 1,275 durability
wraps around to a low rating. Let the side totals be `player strength` and
`merchant strength`. The merchant offers surrender exactly when:

```text
player strength > floor(3 × merchant strength / 2)
```

Equality is not enough: at exactly 150% of the merchant's strength, the
merchant refuses. There is no random roll. Damaged or lost merchant ships make surrender
more likely only by lowering the merchant's durability total.

Accepting the offer selects battle-result state 2, which is the reduced
battle-result factor used by the Piracy Fame calculation.

### Diplomatic factor

For a non-pirate player nation, the diplomatic factor is selected by the
national Letter-of-Marque classifier described in `../friendship.md`:

| Diplomatic class | Factor |
| ---------------: | -----: |
|                2 |     ×2 |
|                3 |     ×3 |
|                4 |     ×4 |
|                0 |     ×1 |
|                1 |     ×1 |
|                5 |     ×1 |
|                6 |     ×1 |

Thus an ordinary victory can produce final Battle-Level modifiers ×3, ×6,
×9, or ×12. A player whose nation/group code is Piracy takes a separate ×3
branch.

The diplomatic class used for Fame is evaluated from the Relation state at the
start of the battle, before the battle's Relation deduction. Personal
Friendship and player rank are not inputs to the Fame calculation.

## Guild assignments

Two Guild assignments award Piracy Fame:

| Assignment     | Rank band       | Deadline | Piracy Fame |
| -------------- | --------------- | -------: | ----------: |
| Defeat Pirates | Commoner–Squire |  1 month |         300 |
|                | Knight–Baron    | 2 months |         700 |
|                | Viscount–Duke   | 3 months |       1,500 |
| Collect Debt   | Commoner–Squire |  1 month |         150 |
|                | Knight–Duke     | 3 months |         500 |

Collect Debt awards the same amount to Trade Fame and Piracy Fame.

The Defeat Pirates gold rewards are 10,000, 20,000, and 30,000 for the three
rank bands. Collect Debt pays 5,000 at the lower tier and 20,000 at the higher
tier.

### Deadlines and failure

The full Fame award is made only when the assignment is completed on time.
The deadline is the same day of the month one, two, or three months after
acceptance; see
[Trade Fame](trade-fame.md#deadlines-and-failure) for the stored day serial.
Completing Defeat Pirates or Collect Debt after the deadline pays half the
promised gold but awards no Fame.

Forfeiting a Defeat Pirates assignment before its deadline reduces the player's
existing Piracy Fame to about 90%, rounded down to a multiple of ten
(`SNR0` `0x1266–0x126F`):

```text
new Piracy Fame = floor(floor(old Piracy Fame / 10) × 9 / 10) × 10
```

When an assignment expires, visiting the Guild reduces existing Fame to about
80%, rounded down to a multiple of ten:

```text
new Fame = floor(floor(old Fame / 10) × 8 / 10) × 10
```

For Collect Debt, the forfeiture or expiry reduction applies to both Trade Fame
and Piracy Fame.

## Story awards

The Prince Alberto and Duke Franco scenario sequence awards a fixed 1,000
Piracy Fame and 1,000 Adventure Fame.

Otto's Armada campaign (`SNR3` section 4) contains two fixed awards of 1,000
Piracy Fame, each capped at 50,000:

| Story event                                               | `SNR3` offsets  | Piracy Fame |
| --------------------------------------------------------- | --------------- | ----------: |
| After the Nantes battle, when the other ships have sailed | `0x1631–0x164F` |       1,000 |
| After the Santo Domingo battle, before the Amazon search  | `0x173C–0x175A` |       1,000 |

Each award runs in an after-naval-battle route (`0xA2FF`), following messages
387–389 and 395–398 respectively.

Catalina receives Piracy Fame through the ordinary naval-victory calculation
during her combat-focused story; her scenario bytecode does not contain an
additional fixed Piracy Fame award.

## Story thresholds

Piracy Fame gates these decoded protagonist events:

| Protagonist |                             Thresholds |
| ----------- | -------------------------------------: |
| Catalina    | 1; 1,500; 2,000; 8,000; 15,000; 30,000 |
| Otto        |         5,000; optional 20,000; 30,000 |

Catalina's Harbor produces no story dialogue at 0 Fame, while at 1 Emilio
reports the harbor rumor that opens the pursuit sequence. At 1,499 the later
ordinary-building route does nothing, while at 1,500 it reports that João is
at sea. The Pub questioning repeats at 1,999; at 2,000 the same dialogue is
followed by a section advance.

## Code evidence

The relevant calculations are located at:

- `MAIN.EXE` `0x15AC5–0x15DE4`, especially `0x15BE5–0x15C5C`: naval-victory
  state, Battle-Level calculation, diplomatic modifier, and capped Fame award;
- `MAIN.EXE` `0x1492C–0x149D7`: totals the cached strength ratings for the two
  participating sides;
- `MAIN.EXE` `0x14D11–0x14DFB`: identifies national Merchant fleets, compares
  the two strength totals, and selects pre-combat surrender state 2;
- `MAIN.EXE` `0x15240–0x152FB`: matching-national-Marque scan and diplomatic
  class selection;
- Scenario bytecode section 4 (`0x110D–0x12B8`): Defeat Pirates;
- Scenario bytecode section 5 (`0x12B8–0x15CB`): Collect Debt, including equal
  Trade and Piracy awards;
- Protagonist scenario bytecode around `0x0F19`: paired 1,000-point Piracy and
  Adventure award;
- `SNR3` section 4 at `0x1631–0x164F` and `0x173C–0x175A`: Otto's two fixed
  1,000-point Piracy awards; and
- `MAIN.EXE` `0x0AF42`: resolution of a protagonist's 14-byte Fame record.

The Fame words at offsets `+0`, `+2`, and `+4` are Trade, Piracy, and
Adventure, respectively.
