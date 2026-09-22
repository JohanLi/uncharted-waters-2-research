# Dueling

A duel is a turn-based fight between two captains. The duel begins with its
balance meter at 100. Damage dealt by one side moves the meter toward 200,
while damage dealt by the other moves it toward 0; reaching either endpoint
ends the fight.

The combatants alternate attacking. On each exchange, the attacker chooses
**Thrust**, **Slash**, or **Strike**, and the defender chooses **Parry**,
**Block**, or **Dodge**. The game offers advice on which moves to use against
each attack and defense.
Swordsmanship, Battle Level, the equipped weapon and armor, random rolls, and
the combatants' preceding moves all affect the damage actually applied.

Duels can begin in three ways:

- during a naval battle, when the flagships are adjacent;
- through the ordinary **Duel** command when meeting a sailor in a Pub or
  Lodge; and
- at five fixed points in the protagonist scenarios.

## Starting a duel during a naval battle

When the player's flagship is next to the enemy flagship, the game offers
"Will you challenge the enemy commodore to a duel?" Accepting does not always
start the duel. The executable evaluates:

```text
player flagship's current crew + random(player Luck) >= enemy flagship's current crew
```

`random(Luck)` is uniformly distributed from 0 through `Luck - 1`. If Luck is
zero, it returns zero. Failure displays "The enemy's crew has blocked your
attempt."

Let `P` be the player's current flagship crew, `E` the enemy's current
flagship crew, and `L` the protagonist's Luck. The exact success chance is:

```text
100%                    if P >= E
0%                      if P + L <= E
(L - (E - P)) / L       otherwise
```

Thus the check uses total current crew aboard the two flagships, not crew
assigned to Combat, and Luck supplies a bonus of at most `Luck - 1`.

The check is at `MAIN.EXE` `0x10098–0x100C9`. The current-crew words are read
through the two flagship records, and the protagonist's Luck is sailor-record
byte `+0x1B`.

## Scripted duels

The protagonist scenario bytecode contains exactly five `E8 <sailor ID>` duel
instructions. No scripted duel occurs in Ernst's, Pietro's, or Ali's story, or
in the shared quest script.

| Protagonist | Trigger                                                                | Opponent used by the duel engine                             | Scenario instruction |
| ----------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------: |
| João        | The Shipyard confrontation while looking for Domingo                   | Antonio Khan, sailor 60                                      |    `SNR1.DAT 0x0CA6` |
| João        | The confrontation at the Franco home before Duke Franco's trial        | sailor 60, although the scene presents Khan's pirate men     |    `SNR1.DAT 0x0FFF` |
| João        | The South American Pub rescue of Lucia                                 | sailor 60, temporarily renamed and redrawn as Pirate Rudolph |    `SNR1.DAT 0x32F4` |
| Catalina    | Returning to the successful South American Pub while looking for Lucia | Antonio Khan, sailor 60                                      |    `SNR2.DAT 0x2965` |
| Otto        | Meeting Matthew in the London Pub near the beginning of the story      | Matthew Loy, sailor 75                                       |    `SNR3.DAT 0x0284` |

João's Rudolph encounter changes sailor 60's displayed name and portrait but
does not replace his attributes or levels. Rudolph therefore inherits the
current saved stats of sailor 60. The Franco-home duel similarly calls the
engine with sailor 60 even though the dialogue shows generic pirate attackers.

The operand is the sailor ID: the four Khan/Rudolph-family calls are `E8 3C`,
whereas Matthew's is `E8 4B`. Looking only for `E8 3C` therefore misses Otto's
duel.

## How damage is calculated

### Attack effectiveness

The table below summarizes the game's recommended counters and uses `½` for
the remaining pairings:

| Attack \ Defense | Parry | Block | Dodge |
| ---------------- | ----: | ----: | ----: |
| **Thrust**       |     0 |     1 |     ½ |
| **Slash**        |     ½ |     0 |     1 |
| **Strike**       |     1 |     ½ |     0 |

Here `1`, `½`, and `0` are a concise description of favored, partial, and
countered matchups. They are **not literal multipliers in the DOS executable's
damage routine**. In particular, the routine does not contain a lookup table
that multiplies damage by 1, ½, or 0 according to the current attack/defense
pair. Attack and defense choices instead enter separate terms in the formula
below, and the preceding choices affect both attack strength and the chance to
negate a hit.

This distinction also appears in the game's own text. `MESSAGE2.DAT` says to
use Parry against Thrust, Block against Slash, and Dodge against Strike, and
to use Strike against Parry, Slash against Dodge, and Thrust against Block; it
does not state numeric damage multipliers.

### Equipment ratings

The executable uses each item's stored rating. Weapon family determines which
attack receives the weapon's additional specialization bonus.

Straight swords (no favored attack; comparatively balanced):

| Rating | Weapon        |
| -----: | ------------- |
|      5 | Dagger        |
|     10 | Short Sword   |
|     20 | Long Sword    |
|     25 | Basterd Sword |
|     40 | Rune Blade    |

Fencing swords (favor Thrust):

| Rating | Weapon         |
| -----: | -------------- |
|     10 | Epee           |
|     15 | Rapier         |
|     20 | Estock         |
|     25 | Flamberge      |
|     40 | Crusader Sword |

Curved swords (favor Slash):

| Rating | Weapon         |
| -----: | -------------- |
|     10 | Short Saber    |
|     15 | Saber          |
|     20 | Scimitar       |
|     25 | Japanese Sword |
|     30 | Siva's Sword   |
|     40 | Magic Muramasa |

Heavy swords (favor Strike):

| Rating | Weapon        |
| -----: | ------------- |
|     10 | Cutlass       |
|     20 | Broad Sword   |
|     25 | Claymore      |
|     25 | Golden Dragon |
|     30 | Blue Crescent |

Armor:

| Rating | Armor          |
| -----: | -------------- |
|      0 | None           |
|     10 | Leather Armor  |
|     20 | Chain Mail     |
|     30 | Half Plate     |
|     40 | Plate Mail     |
|     55 | Errol's Plate  |
|     70 | Crusader Armor |

Only items whose equipped flag is set are considered. The setup routine scans
all twenty inventory slots. A selected weapon supplies its family and rating;
equipped armor contributes its rating.

### Executable formula

The following reproduces the operations at `MAIN.EXE` `0x168C4` and
`0x17769–0x178CB`. All divisions round down. `random(n)` returns an integer
from 0 through `n - 1`, or zero when `n` is zero.

For the attacker, let:

- `S` = Swordsmanship;
- `BL` = Battle Level;
- `W` = equipped weapon rating, or 0;
- `a` = current attack (`0` Thrust, `1` Slash, `2` Strike);
- `pa` = the attacker's preceding move (`0`–`2`, initially `1`); and
- `favored` = whether a fencing sword is using Thrust, a curved sword is using
  Slash, or a heavy sword is using Strike.

```text
base power = floor(S / 2) + floor(S × BL / 50)

attack scale = 25 × a
             + (50 if a weapon is equipped, otherwise 0)
             + (W if favored, otherwise 0)

attack power = floor(
                 floor((base power + W) × (4 - pa) / 4)
                 × attack scale / 100
               )
```

For the defender, let:

- `DBL` = defender's Battle Level;
- `R` = equipped armor rating, or 0;
- `d` = current defense (`0` Parry, `1` Block, `2` Dodge); and
- `pd` = the defender's preceding move (`0`–`2`, initially `1`).

```text
defense score = R + min(DBL, 20) + 5 × (2 - d)

ordinary damage = min(
                    50,
                    floor((100 - defense score) × attack power / 100)
                  )

damage = ordinary damage + random(floor(BL / 2))

negation score = 2 × (5 + 2 × (2 - d)) × (4 - pd) - floor(R / 2)
```

The hit is reduced to zero when `negation score >= random(100)`; otherwise the
calculated damage is applied to the duel balance meter. The comparison is an
unsigned 16-bit comparison, so a negative negation score wraps around. This
can produce counterintuitive guaranteed negation with sufficiently strong
armor in some move combinations.

The executable stores up to four two-bit move values in a byte. Before adding
a new choice, it shifts the history left by two bits. On the first exchange,
both previous-move values are initialized to `1`; no earlier moves exist.
After that, because attack and defense roles alternate, `pa` is the attacker's
defense from the preceding exchange and `pd` is the defender's preceding
attack.

## AI / NPC Captains

### Equipment

NPC duel equipment is generated from the captain's levels rather than read
from an inventory.

Armor depends on Navigation Level:

| Navigation Level | Armor      | Rating |
| ---------------: | ---------- | -----: |
|              0–7 | Chain Mail |     20 |
|             8–15 | Half Plate |     30 |
|     16 or higher | Plate Mail |     40 |

Weapon depends primarily on Battle Level:

| Battle Level | Weapon        | Family   | Rating |
| -----------: | ------------- | -------- | -----: |
|          0–7 | Saber         | Curved   |     15 |
|         8–15 | Scimitar      | Curved   |     20 |
|        16–23 | Basterd Sword | Straight |     25 |
| 24 or higher | see below     | —        |      — |

At Battle Level 24 or higher, Navigation Level modulo 3 selects the weapon:

| `Navigation Level mod 3` | Weapon        | Family  | Rating |
| -----------------------: | ------------- | ------- | -----: |
|                        0 | Flamberge     | Fencing |     25 |
|                        1 | Claymore      | Heavy   |     25 |
|                        2 | Blue Crescent | Heavy   |     30 |

The level comparisons first cap the relevant level at 24. This does not alter
the modulo result for the high-level weapon selection: that branch uses the
captain's actual Navigation Level for the modulo operation.

### Move tendencies

NPCs use all three attacks and all three defenses. Every selection makes a
fresh `random(10)` roll; moves are not drawn from a finite hand and do not run
out.

Attack probabilities depend on weapon family:

| Weapon family               | Thrust | Slash | Strike |
| --------------------------- | -----: | ----: | -----: |
| Straight sword or no weapon |    30% |   40% |    30% |
| Fencing sword               |    60% |   20% |    20% |
| Curved sword                |    20% |   60% |    20% |
| Heavy sword                 |    20% |   20% |    60% |

Defense probabilities depend on armor rating:

| Armor rating | Parry | Block | Dodge |
| -----------: | ----: | ----: | ----: |
|         0–19 |   20% |   20% |   60% |
|        20–59 |   20% |   60% |   20% |
| 60 or higher |   60% |   20% |   20% |

Ordinary NPC equipment is always Chain Mail, Half Plate, or Plate Mail, with
ratings from 20 through 40. Ordinary NPC captains therefore choose **Block
60%** of the time and Parry and Dodge 20% each. Their attack bias follows the
weapon table above.

The AI selection routine is at `MAIN.EXE` `0x16709–0x167EA`, and NPC equipment
selection is at `0x178CC–0x17A4D`.
