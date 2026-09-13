# National Friendship

The game has two distinct diplomatic values:

- **Friendship** is the current player's personal standing with each nation or group.
- **Relations** are directed values describing how one nation or group regards another. Relations are stored as a
  complete matrix, including the diagonal values such as Portugal→Portugal.

The two systems use different save records and different display biases. Alliance and blockade flags are stored
alongside the Relations matrix.

## Save storage

### Nation-to-nation Relations

Each save slot contains seven 32-byte nation/group records. Relative to the beginning of a save slot:

```text
nation record       = slot base + 0x04D6 + nation × 0x20
stored relation     = nation record[0x0B + other nation]
displayed relation  = stored relation − 30
```

The nation indices are Portugal 0, Spain 1, Turkey 2, England 3, Italy 4, Holland 5, and Piracy 6. The directed matrix
occupies bytes `+0x0B` through
`+0x11` in each record. The two reciprocal cells are normally kept in sync by the known update paths, but they are
separate bytes in the save.

### Starting Relations

The starting displayed Relation matrix is:

| From / toward | Portugal | Spain | Turkey | England | Italy | Holland | Piracy |
|---------------|---------:|------:|-------:|--------:|------:|--------:|-------:|
| Portugal      |       70 |  55 A |      0 |      20 |    40 |      20 |     10 |
| Spain         |     55 A |    70 |      5 |      15 |    35 |      20 |    -10 |
| Turkey        |        0 |     5 |     70 |      25 |  -5 B |      20 |     40 |
| England       |       20 |    15 |     25 |      70 |    20 |      30 |     30 |
| Italy         |       40 |    35 |   -5 B |      20 |    70 |      20 |      0 |
| Holland       |       20 |    20 |     20 |      30 |    20 |      70 |     30 |
| Piracy        |       10 |   -10 |     40 |      30 |     0 |      30 |     70 |

`A` marks an alliance and `B` marks a blockade. The marks are directional status flags, so they appear in both cells
when the starting status is reciprocal.

The diagonal values are included because they are active cells in the stored matrix, even though they do not represent
foreign-policy relations in the ordinary sense.

The status matrix occupies bytes `+0x12` through `+0x18` in each record:

```text
alliance flag   = status byte & 0x20
blockade flag   = status byte & 0x10
```

### Guild intelligence

The Guild's national-intelligence report reads two fields from each nation record:

```text
target nation             = nation record[0x02]  # Portugal-through-Piracy index
merchant-fleet destination = nation record[0x04]  # port ID; 0xFF means none
```

The target nation supplies the two country names in the report's national action sentence, including Piracy when a
nation is targeting pirates. The destination is resolved through the normal port table for the merchant-fleet sentence.

The national-state update refreshes these intelligence fields at the beginning of each month. The merchant-fleet
destination is selected by `MAIN.EXE`
0x1D051–0x1D131, and the monthly dispatcher at 0x1DC53–0x1DC63 runs it alongside the Guild Profit calculation. The
fields remain cached between month boundaries; their exact destination and target-selection rules are not yet fully
decoded.

`MESSAGE.DAT` contains the corresponding English templates at file offsets
`0x1864` (`It seems %s is out to get %s.`) and `0x1882` (`A merchant fleet is
going to %s.`).

### Confirmed status-flag effects

The flags are not merely descriptive save data. Outside the naval-battle classifier, the national-Relations display
renders separate markers for an alliance and a blockade. The blockade bit also selects a special port-NPC setup path for
a port belonging to the blockading nation; that path initializes the harbor actors used for hostile-port guards.

Both flags are also inputs to a national-state update routine. Its exact gameplay consequence remains unresolved, so the
flags should not yet be assumed to determine every aspect of port access or fleet behavior.

The diagonal is a valid, active matrix cell. It is not a foreign-policy relationship in the ordinary sense, but the game
updates it when the player attacks fleets belonging to the player's own nation.

### Player Friendship

Each protagonist has a 14-byte Fame/Friendship record. Relative to the save slot:

```text
record                 = slot base + 0x05B6 + protagonist × 14
Trade Fame             = u16le(record + 0)
Piracy Fame            = u16le(record + 2)
Adventure Fame         = u16le(record + 4)
stored friendship[n]   = u8(record + 6 + n)
displayed friendship   = stored friendship − 100
```

The seven Friendship bytes use the same Portugal-through-Piracy indices. The record belongs to the current protagonist,
so its absolute location depends on the save slot and protagonist index.

## Royal missions

Royal missions change directed national Relations through the scenario relation accessor. The known mission effects are:

| Mission action     | Relation change |
|--------------------|----------------:|
| Deliver documents  |              +5 |
| Negotiate a treaty |             +10 |

The result is clamped at stored relation `100`. The mission code updates both directions of the two participating
nations.

The shared royal-mission scenario contains separate mission families for document delivery (messages 155–185) and treaty
negotiation (messages 186–216). The document branch contains `4C 0B 05` twice; the treaty branch contains `4C 0B 0A`
twice.

## Investment and port control

When investment changes a port's cached controlling nation, the displaced nation loses 5 points of personal Friendship
with the player. This penalty applies when the former controller is a non-Pirate nation different from the player's
current nation:

```text
former controller Friendship -= 5
```

If the new controller is the player's current nation and the former controller was another nation, personal Friendship
with the player's nation also increases by 5. Friendship gains are capped at displayed `+100`, and losses are floored at
displayed `-100`.

These are player-Friendship changes. Port Support determines which nation controls the port, but the controller change
does not modify the nation-to-nation Relations matrix.

## Defection

Defecting at a Palace changes the protagonist's current affiliation to the destination nation. It reduces personal
Friendship with the former affiliation by 30, provided that its stored value is at least `30`, and increases personal
Friendship with the destination nation by 10:

```text
if former-affiliation Friendship >= stored 30:
    former-affiliation Friendship -= 30

destination-nation Friendship += 10
```

Stored `30` corresponds to displayed `-70`. When the former affiliation's stored Friendship is below `30`, the handler
leaves it unchanged rather than reducing it below zero. The destination gain is capped at stored `200`, or displayed
`+100`. The defection handler does not change the nation-to-nation Relations matrix.

## Hostile-country building encounters

Poor personal Friendship with the nation controlling a port can interrupt building visits. These encounters use the
current protagonist's Friendship byte for the port's nation. They do not use or change the nation-to-nation Relations
matrix.

Both the Palace and ordinary-building handlers calculate the same escape score:

```text
escape score = Swordsmanship
             + floor(Swordsmanship × Battle Level / 100)

escape succeeds when escape score >= random(150)
```

Here `random(150)` returns an integer from 0 through 149. A score of at least 149 therefore guarantees escape; lower
scores give a proportionate chance, including the zero roll as a success.

### Palace

The Palace checks for a hostile reception when personal Friendship with its nation is stored `80` or lower, corresponding
to displayed Friendship `-20` or lower. It rolls `random(100)` and begins the hostile sequence only when the roll is
greater than the stored Friendship value. Thus worsening Friendship both enables the check and makes the encounter more
likely.

The hostile greeting begins, "You have some nerve to show your face here!" A successful escape ends with "Whew, that
was a narrow escape!" and applies no decoded penalty. If the escape check fails, the ruler threatens imprisonment but
instead seizes four fifths of the player's carried gold. The handler then sets personal Friendship with that nation to
stored `100`, or displayed `0`. It does not restore the nation-to-nation Relation cell.

### Other buildings

The general port-building check applies to the Market, Pub, Shipyard, Lodge, Guild, Bank, Item Shop, and House of
Fortune. It excludes the Harbor, Palace, special NPC residence, Church or Mosque, and ports controlled by Piracy.

It is considered only when stored Friendship is below `80`, or displayed Friendship below `-20`. There are two random
gates before the confrontation:

```text
random(3) must equal 0
random(100) must be greater than stored Friendship + 20
```

The second condition becomes increasingly likely as Friendship worsens. When it triggers, the player is warned that
"some gruff-looking men are approaching." The same Swordsmanship-and-Battle-Level escape check is then used. If the
player is caught, three quarters of their carried gold is seized and personal Friendship with the port's nation
increases by 20 stored points, equivalent to a 20-point displayed improvement. Unlike the Palace punishment, this does
not reset Friendship to neutral.

The arrival warning, "Commodore, be careful. This is a %s port," is associated with the same hostile-port state, but is
separate from the random confrontation inside an eligible building.

## Catalina's opening Spain-Friendship event

On Catalina's first day at sea, her section-0 `0xA001` story route sets her personal Friendship with Spain to stored `0`,
or displayed `-100`, and advances the story section. Her current affiliation is unchanged. This remains true if she has
defected back to Spain before the event. Affiliation changes to Piracy only when the naval-victory exile condition is
met.

## Naval-victory rules

For a normal national-fleet battle, the reciprocal home↔target Relation cells are each reduced independently by:

```text
random(5) + 3       # 3–7 points
```

The values are clamped at stored zero, corresponding to displayed Relation −30. This Relation deduction occurs before
the personal-Friendship class is selected, but after the Fame diplomatic class is selected.

### Diplomatic class

Let `home` be the current player's nation, `target` the defeated fleet's nation, and `relationRaw` the stored
home→target Relation at the start of the battle. The class starts at zero. A matching national Letter of Marque
(`0x1D + home`) changes the initial class to one. The following tests then overwrite it in order:

```text
if relationRaw <= 40:                         class = 2
if target→home status has blockade bit 0x10: class = 3
if home nation record[2] == target:          class = 4
if relationRaw >= 60:                         class = 5
if home→target status has alliance bit 0x20: class = 6
```

Stored Relations have a +30 display bias, so the thresholds correspond to displayed Relations +10 and +30. Later tests
have priority. The class is used separately by the Piracy Fame calculation and the personal-Friendship update; the Fame
calculation sees the battle-start Relation, while the Friendship calculation sees the Relation after the naval penalty.

### Personal-Friendship parameters

For different home and target nations, the class selects these parameters:

| Class | Condition                            | Home multiplier | Target scale |
|------:|--------------------------------------|----------------:|-------------:|
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

Positive Friendship is capped at stored 200 (displayed +100). Negative Friendship is floored at stored zero (displayed
−100). Pirate-group targets use a separate path and do not receive the ordinary target-Friendship loss.

### Same-nation targets

The class-based target-Friendship deduction is applied before the code branches on whether `home == target`, so a fleet
belonging to the player's current nation receives that deduction too. The same-nation branch then skips the ordinary
home-Friendship adjustment and applies an additional deduction:

```text
class-based target loss      = floor(target scale × random(10..14) / 30)
additional same-nation loss  = random(10..14)
same-nation Relation loss    = random(3..7)
```

With a high diagonal Relation, class 5 supplies target scale 90, making the first loss 30–42 and the complete same-nation
Friendship loss 40–56. The additional same-nation decrement does not consult the Letter of Marque. A Marque can affect
the earlier classifier, but the high-Relation class on a same-nation diagonal takes priority over it.

After both Friendship deductions, the same-nation branch applies two punishment thresholds:

```text
stored Friendship <= 40  (displayed <= -60)
    exile: remove rank and change current affiliation to Piracy

stored Friendship 41..70 (displayed -59..-30), while ranked
    shame: remove rank but retain current affiliation
```

Exile retains the post-deduction Friendship value, subject to the normal stored-zero floor; it does not assign `-100`.
The messages for these branches are "You have been exiled from your mother country" and "Your name has been shamed, and
your title has been stripped away," respectively.

Battle-result state controls whether the naval update runs. An accepted pre-combat Merchant surrender uses the reduced
Fame battle-result factor described in `fame/piracy-fame.md`; a fleet made to flee during combat receives the full
award. The same-nation Friendship behavior remains separate from that Fame factor.

## What is established about inputs

Enemy Battle Level, player rank, and existing personal Friendship do not select the random Friendship deductions.
Existing Friendship does determine whether the resulting same-nation value triggers shame or exile, and rank determines
whether the shame-only branch has a title to remove. Personal Friendship is not an input to the Piracy Fame diplomatic
multiplier.

## Executable evidence

- `MAIN.EXE` `0x15240–0x152FB`: Marque scan and diplomatic classifier.
- `MAIN.EXE` `0x15DE5–0x1603F`: Relation and personal-Friendship updates.
- `MAIN.EXE` `0x20835–0x2092F`: ordinary-building confrontation, escape check, gold seizure, and Friendship increase.
- `MAIN.EXE` `0x20A70–0x20B2F`: ordinary-building eligibility and encounter rolls.
- `MAIN.EXE` `0x3080B–0x309A4`: Palace escape check, gold seizure, and Friendship reset.
- `MAIN.EXE` `0x309A5–0x30A1A`: Palace Friendship threshold and hostile-reception roll.
- `MAIN.EXE` `0x3051A–0x30632`: defection, affiliation change, former-affiliation Friendship loss, and destination-nation
  Friendship increase.
- `MAIN.EXE` `0x327C5–0x328A2`: port-controller selection and the personal-Friendship effects of a controller change.
- `MAIN.EXE` `0x0E074–0x0E100` and `0x2E55F–0x2E643`: blockade-dependent hostile-port actor setup.
- `MAIN.EXE` `0x1D13F–0x1D245`: national-state update that branches on both status flags.
- `MAIN.EXE` `0x33178–0x331C4`: Relations-screen alliance and blockade markers.
- `MAIN.EXE` `0x0A198–0x0A1B1`: `random(n)`, returning `0..n−1`.
- `SNR2.DAT` `0x07C3–0x07D7`: Catalina's section-0 day-one-at-sea route, Spain-Friendship write, and section advance.
- Scenario bytecode `0x1C92–0x1CD1`: document-delivery Relation update.
- Scenario bytecode `0x20B7–0x20F6`: treaty Relation update.

## Still unresolved

- The gameplay meaning and broader lifecycle of nation-record byte `+2`; its use as the class-4 strategic-foe selector
  is established.
- The exact behavior of every alternate battle-result state.
- The meanings of the lower bits in the Alliance/Blockade status bytes.
- Whether personal Friendship affects systems outside the decoded naval, hostile-building, and sphere-of-influence
  calculations. The blockade-controlled hostile-port NPC setup is a Relations effect, not evidence of another
  Friendship effect.
