# National Friendship

The game has two distinct diplomatic values:

- **Friendship** is the current player's personal standing with each nation or
  group.
- **Relations** are directed values describing how one nation or group regards
  another. Relations are stored as a complete matrix, including the diagonal
  values such as Portugal→Portugal.

The two systems use different save records and different display biases.
Alliance and blockade flags are stored alongside the Relations matrix.

## Save storage

### Nation-to-nation Relations

Each save slot contains seven 32-byte nation/group records. Relative to the
beginning of a save slot:

```text
nation record       = slot base + 0x04D6 + nation × 0x20
stored relation     = nation record[0x0B + other nation]
displayed relation  = stored relation − 30
```

The nation indices are Portugal 0, Spain 1, Turkey 2, England 3, Italy 4,
Holland 5, and Piracy 6. The directed matrix occupies bytes `+0x0B` through
`+0x11` in each record. The two reciprocal cells are normally kept in sync by
the known update paths, but they are separate bytes in the save.

The status matrix occupies bytes `+0x12` through `+0x18` in each record:

```text
alliance flag   = status byte & 0x20
blockade flag   = status byte & 0x10
```

Nation-record byte `+2` stores a selected strategic target nation. Its broader
selection logic and exact gameplay name remain unresolved.

The diagonal is a valid, active matrix cell. It is not a foreign-policy
relationship in the ordinary sense, but the game updates it when the player
attacks fleets belonging to the player's own nation.

### Player Friendship

Each protagonist has a 14-byte Fame/Friendship record. Relative to the save
slot:

```text
record                 = slot base + 0x05B6 + protagonist × 14
Trade Fame             = u16le(record + 0)
Piracy Fame            = u16le(record + 2)
Adventure Fame         = u16le(record + 4)
stored friendship[n]   = u8(record + 6 + n)
displayed friendship   = stored friendship − 100
```

The seven Friendship bytes use the same Portugal-through-Piracy indices. The
record belongs to the current protagonist, so its absolute location depends
on the save slot and protagonist index.

## Royal missions

Royal missions change directed national Relations through the scenario
relation accessor. The known mission effects are:

| Mission action     | Relation change |
| ------------------ | --------------: |
| Deliver documents  |              +5 |
| Negotiate a treaty |             +10 |

The result is clamped at stored relation `100`. The mission code updates both
directions of the two participating nations.

The shared royal-mission scenario contains separate mission families for
document delivery (messages 155–185) and treaty negotiation (messages
186–216). The document branch contains `4C 0B 05` twice; the treaty branch
contains `4C 0B 0A` twice.

## Naval-victory rules

For a normal national-fleet battle, the reciprocal home↔target Relation cells
are each reduced independently by:

```text
random(5) + 3       # 3–7 points
```

The values are clamped at stored zero, corresponding to displayed Relation
−30. This Relation deduction occurs before the personal-Friendship class is
selected, but after the Fame diplomatic class is selected.

### Diplomatic class

Let `home` be the current player's nation, `target` the defeated fleet's
nation, and `relationRaw` the stored home→target Relation at the start of the
battle. The class starts at zero. A matching national Letter of Marque
(`0x1D + home`) changes the initial class to one. The following tests then
overwrite it in order:

```text
if relationRaw <= 40:                         class = 2
if target→home status has blockade bit 0x10: class = 3
if home nation record[2] == target:          class = 4
if relationRaw >= 60:                         class = 5
if home→target status has alliance bit 0x20: class = 6
```

Stored Relations have a +30 display bias, so the thresholds correspond to
displayed Relations +10 and +30. Later tests have priority. The class is used
separately by the Piracy Fame calculation and the personal-Friendship update;
the Fame calculation sees the battle-start Relation, while the Friendship
calculation sees the Relation after the naval penalty.

### Personal-Friendship parameters

For different home and target nations, the class selects these parameters:

| Class | Condition                            | Home multiplier | Target scale |
| ----: | ------------------------------------ | --------------: | -----------: |
|     0 | No matching Marque                   |              +1 |           30 |
|     1 | Marque, no later condition           |              +1 |           30 |
|     2 | Stored Relation ≤40                  |              +2 |           10 |
|     3 | Target→home is blockaded             |              +3 |            6 |
|     4 | Target is the selected strategic foe |              +4 |            3 |
|     5 | Stored Relation ≥60                  |              −1 |           90 |
|     6 | Home→target is allied                |              −1 |           60 |

The ordinary different-nation update is:

```text
home Friendship change   = home multiplier × random integer 5..9
target Friendship loss    = floor(target scale × random integer 10..14 / 30)
Relation loss             = random integer 3..7
```

Positive Friendship is capped at stored 200 (displayed +100). Negative
Friendship is floored at stored zero (displayed −100). Pirate-group targets
use a separate path and do not receive the ordinary target-Friendship loss.

### Same-nation targets

When the target fleet belongs to the current player's own nation, the
class-based different-nation formulas are bypassed. The battle-finalization
branch applies:

```text
same-nation Friendship loss = random(5) + 10       # 10–14
same-nation Relation loss   = random(5) + 3        # 3–7
```

The Letter of Marque is not consulted while applying this same-nation
Friendship decrement. The complete observed same-nation Friendship change can
be larger than 10–14, which indicates an additional same-nation effect outside
this finalization branch; its source and exact formula remain unresolved.

Battle-result state controls whether the naval update runs. A forced flee uses
the reduced Fame battle-result factor described in `fame/piracy-fame.md`, while the
same-nation Friendship behavior remains separate from that Fame factor.

## What is established about inputs

Enemy Battle Level, player rank, and existing personal Friendship do not select
the ordinary Friendship amounts. Personal Friendship is an output of the
naval update, not an input to the Piracy Fame diplomatic multiplier.

## Executable evidence

- `MAIN.EXE` `0x15240–0x152FB`: Marque scan and diplomatic classifier.
- `MAIN.EXE` `0x15DE5–0x1603F`: Relation and personal-Friendship updates.
- `MAIN.EXE` `0x0A198–0x0A1B1`: `random(n)`, returning `0..n−1`.
- Scenario bytecode `0x1C92–0x1CD1`: document-delivery Relation update.
- Scenario bytecode `0x20B7–0x20F6`: treaty Relation update.

## Still unresolved

- The gameplay name, selection rules, and lifecycle of nation-record byte `+2`.
- The source of the additional same-nation Friendship effect.
- The exact behavior of every alternate battle-result state.
- The meanings of the lower bits in the Alliance/Blockade status bytes.
- Whether personal Friendship affects port access, national-fleet behavior, or
  other systems outside this naval update.
