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

The ordinary victory path uses battle-result factor 3. A successful surrender
before combat and a forced captain flee use factor 1. Other scripted or
nonstandard battle endings must be treated separately until their result
states are decoded.

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
| Defeat Pirates | Commoner–Squire |  30 days |         300 |
|                | Knight–Baron    |  60 days |         700 |
|                | Viscount–Duke   |  90 days |       1,500 |
| Collect Debt   | Commoner–Squire |  30 days |         150 |
|                | Knight–Duke     |  90 days |         500 |

Collect Debt awards the same amount to Trade Fame and Piracy Fame.

The Defeat Pirates gold rewards are 10,000, 20,000, and 30,000 for the three
rank bands. Collect Debt pays 5,000 at the lower tier and 20,000 at the higher
tier.

### Deadlines and failure

The full Fame award is made only when the assignment is completed on time.
Completing Defeat Pirates or Collect Debt after the deadline pays half the
promised gold but awards no Fame.

Forfeiting a Defeat Pirates assignment before its deadline reduces the player's
existing Piracy Fame to 90%, rounded down to a multiple of ten:

```text
new Piracy Fame = floor(old Piracy Fame × 90 / 100 / 10) × 10
```

When an assignment expires, visiting the Guild reduces existing Fame to 80%,
rounded down to a multiple of ten:

```text
new Fame = floor(old Fame × 80 / 100 / 10) × 10
```

For Collect Debt, the forfeiture or expiry reduction applies to both Trade Fame
and Piracy Fame.

## Story awards

The Prince Alberto and Duke Franco scenario sequence awards a fixed 1,000
Piracy Fame and 1,000 Adventure Fame. This is the direct fixed Piracy Fame
award present in the protagonist scenario bytecode.

Catalina and Otto receive Piracy Fame through the ordinary naval-victory
calculation during their combat-focused stories; their scenario bytecode does
not contain an additional fixed Piracy Fame award.

## Story thresholds

Piracy Fame gates these decoded protagonist events:

| Protagonist |                             Thresholds |
| ----------- | -------------------------------------: |
| Catalina    | 1; 1,500; 2,000; 8,000; 15,000; 30,000 |
| Otto        |         5,000; optional 20,000; 30,000 |

## Code evidence

The relevant calculations are located at:

- `MAIN.EXE` `0x15AC5–0x15DE4`, especially `0x15BE5–0x15C5C`: naval-victory
  state, Battle-Level calculation, diplomatic modifier, and capped Fame award;
- `MAIN.EXE` `0x15240–0x152FB`: matching-national-Marque scan and diplomatic
  class selection;
- Scenario bytecode section 4 (`0x110D–0x12B8`): Defeat Pirates;
- Scenario bytecode section 5 (`0x12B8–0x15CB`): Collect Debt, including equal
  Trade and Piracy awards;
- Protagonist scenario bytecode around `0x0F19`: paired 1,000-point Piracy and
  Adventure award; and
- `MAIN.EXE` `0x0AF42`: resolution of a protagonist's 14-byte Fame record.

The Fame words at offsets `+0`, `+2`, and `+4` are Trade, Piracy, and
Adventure, respectively.
