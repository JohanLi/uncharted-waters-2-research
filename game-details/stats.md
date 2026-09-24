# Stats

Every sailor has eight attributes, stored as bytes `+0x14` through `+0x1B` of
the [sailor record](sailors.md#verified-record-layout), plus a Navigation
Level (`+0x1C`) and a Battle Level (`+0x1D`), which are covered in
[levels.md](levels.md). Attributes are capped at 100 wherever the game raises
them.

|  Offset | Attribute     |
| ------: | ------------- |
| `+0x14` | Leadership    |
| `+0x15` | Seamanship    |
| `+0x16` | Knowledge     |
| `+0x17` | Intuition     |
| `+0x18` | Courage       |
| `+0x19` | Swordsmanship |
| `+0x1A` | Charm         |
| `+0x1B` | Luck          |

Unless a use says otherwise, it reads the protagonist's own attribute. The
game reads attributes directly from the sailor record; no item or equipment
modifies them.

## How attributes are raised

| Attribute     | Raised by                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Leadership    | Navigation level-up (0–4); Battle level-up (0–2)                                                        |
| Seamanship    | Navigation level-up (0–4); Battle level-up (0–2)                                                        |
| Knowledge     | Navigation level-up (0–4); Battle level-up (0–2)                                                        |
| Intuition     | Navigation level-up (0–2); Battle level-up (0–2)                                                        |
| Courage       | Battle level-up (0–2 per level); a duel during a naval battle (0–2)                                     |
| Swordsmanship | Battle level-up (0–1 per level); a duel during a naval battle (0–2)                                     |
| Charm         | nothing                                                                                                 |
| Luck          | Pray (0–1, once per visit); a large donation at a Church or Mosque; one story choice in João's scenario |

### Level-ups

Gaining one or more Navigation or Battle Levels from a single award runs one
set of `random(3)` rolls on Leadership, Seamanship, Knowledge, and Intuition.
A Navigation level-up adds a second `random(3)` to Leadership, Seamanship, and
Knowledge. A Battle level-up adds `random(3)` Courage and `random(2)`
Swordsmanship for each level gained. See
[Navigation attribute increases](levels.md#navigation-attribute-increases) and
[Battle attribute increases](levels.md#battle-attribute-increases).

### Duels in a naval battle

After a duel with the enemy commodore during a naval battle (`MAIN.EXE
0x17ECF`, called from `0x18066`), the protagonist receives Battle experience
equal to 10 × the opponent's Battle Level for a win (message 83, “We
defeated the opponent.”) and 3 × the opponent's Battle Level otherwise. This
award goes through the shared level-up routine, so a new Battle Level brings
the Leadership-through-Intuition rolls above, but not the per-level Courage
and Swordsmanship rolls.

Then, if that award gained a Battle Level **or** the opponent's Swordsmanship
is at least the protagonist's, the protagonist gains:

```text
Swordsmanship += random(3)    # 0–2, capped at 100
Courage       += random(3)    # 0–2, capped at 100
```

Duels outside naval battles, in the Pub or Lodge or started by a scenario
script (`E8`), use a different entry (`0x17F8A`) that gives neither
experience nor attributes. See [Dueling](dueling.md).

### Luck

- **Pray** at a Church or Mosque adds `random(2)` Luck the first time in a
  visit.
- **Donate** raises Luck by `11 − floor(gold before donation / donation)`,
  capped at 100, when that quotient is at most 10 (the donation is more than
  an eleventh of the gold held) and the donation is at least
  `(random(5) + 1) × 100` gold. The gain is 1–10; donating all your gold gives
  +10. Smaller donations never change Luck.
  See [Church and Mosque](buildings.md#church-and-mosque-command-dialogue).
- In João's scenario, declining the gold that Father Felippe offers in
  Lisbon's church sets João's Luck to 100 (`SNR1.DAT 0x04D8`).
- A new game starts the protagonist's Luck at `random(101)`, 0–100
  (`0x1BA96`), replacing the 50 stored for every protagonist in
  `KOUKAI2.DAT`.

### Charm

No routine in the executable raises Charm, no item modifies it, and the only
scenario write is João's failure penalty, which sets it to 50. Charm therefore
stays at its starting value unless it is lowered.

## How attributes are lowered

| Attribute              | Lowered by                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Charm                  | Plundering a village: −2, or only down to 50 from 50–51; from 0–1 it wraps to 254–255 ([Villages](at-sea.md#villages))                                                                                                                     |
| Luck                   | Plundering a village (up to −2); the Ghost ship sea event (up to −30) ([Event types](at-sea.md#event-types))                                                                                                                               |
| Courage                | The Kraken sea event: the protagonist and every mate lose up to 10 ([Event types](at-sea.md#event-types))                                                                                                                                  |
| All but Charm and Luck | Story penalties set them to 10: attacking an ally in João's finale, where Charm is also set to 50 and Luck to 0 ([João](scenarios/scenario-1-joao-franco.md)), and attacking Catalina's weakened fleet in Otto's story (`SNR3.DAT 0x18CE`) |

## What each attribute does

### Leadership

- Slows the health loss of the captain's ship on short rations
  ([Health](at-sea.md#health)) and affects [supply sharing](at-sea.md#sharing-supplies-between-ships).
- The Commodore's Leadership raises every mate's monthly Loyalty
  ([Mate loyalty](sailors.md#mate-loyalty)).
- Sets cannon damage together with Battle Level
  ([Cannon fire](naval-battle.md#damage)).
- Required for the Gunnery lesson (75)
  ([lessons](buildings.md#collector-and-cartographer-dialogue)).

### Seamanship

- Each ship's movement points and turn rate in battle use its captain's
  Seamanship ([Map, turns, and movement](naval-battle.md#map-turns-and-movement)).
- Each ship's speed uses its captain's Seamanship
  ([Fleet speed](at-sea.md#fleet-speed)).
- Reduces storm damage to the captain's ship
  ([Duration and effects](at-sea.md#duration-and-effects)).
- Required for the Cartography (75) and Celestial Navigation (80) lessons.

### Knowledge

- Reduces daily crew losses from scurvy on the captain's ship
  ([Rats and scurvy](at-sea.md#rats-and-scurvy)).
- Changes the wording of anomaly warnings when below 70
  ([Checks every four hours](at-sea.md#checks-every-four-hours)).
- Required for the Cartography (75), Celestial Navigation (70), and
  Gunnery (65) lessons.

### Intuition

- The best Intuition among the protagonist and all mates sets the lookout's
  discovery chance ([Lookout and discovery](at-sea.md#lookout-and-discovery)).
- The better of the First Mate and Chief Navigator decides whether an anomaly
  is foreseen ([Checks every four hours](at-sea.md#checks-every-four-hours)).
- Contributes `floor(7 × Intuition / 20)` to a village Search
  ([Villages](at-sea.md#villages)).
- Required for the Cartography (75) and Celestial Navigation (70) lessons.

### Courage

- In battle it only decides whether a ship starts with Chase or Defend,
  which has no practical effect; it never affects damage
  ([Orders](naval-battle.md#orders)).
- Required for the Gunnery lesson (80).
- A Pub patron whose best attribute from Leadership through Courage is above
  75 names it as a specialty ([Pub](buildings.md#pub-command-dialogue)).

### Swordsmanship

- Decides duels, together with Battle Level ([Dueling](dueling.md)).
- Adds a random bonus to cannon damage and, with Battle Level, sets each
  ship's boarding strength ([Naval battle](naval-battle.md)).
- Escaping a hostile-country encounter in a building
  ([Hostile-country building encounters](friendship.md#hostile-country-building-encounters)).
- Limits crew losses to a village Monster or counterattack
  ([Villages](at-sea.md#villages)).

### Charm

- Pub enthusiasm starts at `floor(Charm / 3)`, and each Treat raises it by
  `floor(treat strength × Charm / 10)`. Enthusiasm limits how many crew can be
  recruited ([Pub](buildings.md#pub-command-dialogue)).
- The Item Shop's raised offer after a refused sale adds
  `floor(offer × Charm / 200)` ([Item Shop](buildings.md#item-shop-command-dialogue)).
- Lowers the Shipyard's minimum acceptable offer:
  `floor(price × (500 − Charm) / 500)`
  ([Shipyard prices and negotiation](ships.md#shipyard-prices-and-negotiation)).
- Lowers the price of skill lessons:
  `min(60,000, 100 × (floor(5,000 / (floor(Charm / 5) + 1)) + 200))` gold
  ([lessons](buildings.md#collector-and-cartographer-dialogue)).

### Luck

At sea:

- The best Luck among the protagonist, First Mate, and Chief Navigator helps
  avoid weather anomalies
  ([Checks every four hours](at-sea.md#checks-every-four-hours)).
- Each captain's Luck protects their ship from the
  [Missing Ship](at-sea.md#missing-ship).
- Protects against rats and scurvy ([Rats and scurvy](at-sea.md#rats-and-scurvy)).
- Gives a `min(Luck, 100)`% chance of finding water ashore, and contributes
  `floor(3 × Luck / 20)` to a village Search
  ([Going ashore](at-sea.md#going-ashore)).
- An enemy commodore's Luck helps them challenge the protagonist to a duel
  ([Enemy duel challenges](naval-battle.md#enemy-duel-challenges)).
- With Navigation Level, decides whether **Flee** escapes a battle before it
  starts: success when `Luck + Navigation Level > random(150)`
  ([Before the battle](naval-battle.md#before-the-battle-fight-flee-or-surrender)).
- Helps a duel challenge get past the enemy crew
  ([Dueling](dueling.md#starting-a-duel-during-a-naval-battle)).

In port:

- Unlocks the rare Angel and Goddess figureheads and the Carronade
  ([Figureheads and guns](ships.md#figureheads-and-guns)).
- Decides whether the Item Shop raises its offer
  ([Item Shop](buildings.md#item-shop-command-dialogue)).
- Keeps a debtor from escaping in Collect Debt
  ([Pub](buildings.md#pub-command-dialogue)).
- Shapes the Rumor coordinates a cartographer gives
  ([Collector and cartographer](buildings.md#collector-and-cartographer-dialogue)).
- Read by the House of Fortune's Life and Mates readings
  ([House of Fortune](buildings.md#house-of-fortune-command-dialogue)).

## Rival protagonists

Each month (`0x1DDD0`, from the monthly routine at `0x1E15C`), the five
protagonists not being played and Antonio Khan (sailor 60) keep pace with the
player. When the player's Navigation Level `P` exceeds a rival's `R`, the
rival's level becomes `P + 1 + random(2)`. For each level gained, the rival's
Leadership rises by `random(3)` and Seamanship, Knowledge, and Intuition by
`random(5)`, each capped at 100 (`0x1DD0F`). Battle Level follows the same
pattern: it rises by `floor((P − R) / 2) + 1 + random(2)`, and each level
gained adds `random(3)` Leadership and `random(5)` Courage and Swordsmanship.
Charm and Luck never change.
