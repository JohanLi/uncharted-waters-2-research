# Navigation and Battle Levels

Every sailor has separate Navigation and Battle Levels and a separate
experience counter for each. The two levels use the same experience threshold,
but gain experience at different times and improve different attributes.

## Experience needed for the next level

For a current level `L`, the threshold is:

```text
experience needed = 30 × min(L, 18)²
```

The experience field stores progress toward the next level, not lifetime
experience. When it reaches the threshold, the game subtracts that threshold,
increments the level, and repeats the test. A single large award can therefore
produce more than one level.

| Current level | Experience needed |
| ------------: | ----------------: |
|             1 |                30 |
|             2 |               120 |
|             3 |               270 |
|             5 |               750 |
|            10 |             3,000 |
|            15 |             6,750 |
|            17 |             8,670 |
|        18–100 |             9,720 |

The threshold caps at **9,720**. The maximum level is 100. If enough experience is accumulated to pass another threshold while
already at level 100, the experience counter is cleared instead of advancing
to level 101.

The House of Fortune's **Career** reading applies the same formula to the
current protagonist. Its two messages are:

> You need [number] more experience points to advance your navigation skill
> level.

> And you need [number] more experience points to advance your combat skill
> level.

The substituted numbers are:

```text
navigation experience remaining = threshold(Navigation Level) - Navigation XP
battle experience remaining     = threshold(Battle Level) - Battle XP
```

## Navigation experience

Navigation experience is awarded after the player accepts the **Port Call**
prompt:

> Commodore, we're going to stop in [port]. Is this OK?

The award uses the current voyage-day counter. This is the number of midnights
crossed since the fleet most recently chose **Sail**; it is reset when the new
voyage begins and increments at midnight while at sea.

Let `D` be that counter. Two award formulas are used:

```text
ordinary sailor             = min(D, 100)²
Commodore, Captain, or
First Mate                  = 2 × min(D, 70)²
```

The current protagonist receives the doubled award as Commodore. Among the
sailors in the fleet's mate list, a sailor assigned as a ship's Captain or as
First Mate also receives the doubled award; other listed sailors receive the
ordinary award.

For voyages of at most 70 days, the role bonus is exactly double. The formulas
also explain the two different single-voyage limits:

- an ordinary sailor can receive at most 10,000 experience, reached at 100
  voyage days;
- the Commodore, a Captain, or the First Mate can receive at most 9,800
  experience, reached at 70 voyage days.

Entering a port without having crossed midnight uses `D = 0` and awards no
Navigation experience.

### Navigation attribute increases

When one Port Call award gains at least one Navigation Level, the shared
level-up routine independently adds `random(3)` to each of these attributes,
capped at 100:

- Leadership
- Seamanship
- Knowledge
- Intuition

Here `random(3)` means 0, 1, or 2.

The subsequent Navigation level-up presentation makes one additional
independent `random(3)` increase to Leadership, Seamanship, and Knowledge.
Both sets of rolls occur once per Port Call award that advances at least one
level, not once per level gained. The dialogue names only the attributes whose
additional roll was nonzero.

Leadership, Seamanship, and Knowledge can consequently rise by 0–4 each from
one Port Call award. Intuition rises by 0–2 and is not included in the list of
attributes assembled by the level-up dialogue. These limits remain the same
even if that award crosses several levels.

## Battle experience

Battle experience is awarded to the sailor captaining the attacking ship when
an attack successfully damages an opposing ship. There is no separate flat
award merely for winning the naval battle.

```text
target survives the attack             = 10 experience
target durability reaches 0            = 10 × target maximum durability
target crew reaches 0                   = 10 × target maximum durability
```

The multiplier uses the target fleet slot's stored maximum-durability byte,
including the effect of its hull material. It does not use the ship's price.
For an unmodified ship, a Nao has maximum durability 50 and is therefore worth
500 experience when defeated; a Galleon has maximum durability 80 and is worth 800.

The finishing award replaces the ordinary 10 experience for that attack; it
is not added on top of it. Both sinking a ship and eliminating its crew use
the same formula.

### Battle attribute increases

Battle advancement has two layers. It first calls the same shared level-up
routine used by Navigation Levels. If one attack's experience award gains at
least one Battle Level, that routine independently adds `random(3)` to:

- Leadership
- Seamanship
- Knowledge
- Intuition

The battle-specific wrapper then applies the following once for every Battle
Level gained by that award:

```text
Courage         += random(3)  # 0–2
Swordsmanship   += random(2)  # 0–1
```

All six increases are capped at 100. Thus an award that gains one Battle Level
can increase Leadership, Seamanship, Knowledge, Intuition, and Courage by 0–2
each, and Swordsmanship by 0–1. Charm and Luck are not changed. If one large
award crosses several Battle Levels, the Leadership-through-Intuition rolls
still occur only once, while the Courage and Swordsmanship rolls repeat for
each level gained.

Unlike a Navigation level-up, a Battle level-up does not run the additional
presentation-time Leadership, Seamanship, and Knowledge rolls. Consequently,
those three attributes can rise by at most 2 from one Battle Level, rather than
the possible 4 from one Navigation Level.

## Save fields

Each sailor uses a 42-byte record. The level and experience fields are:

| Field                 | Record offset | Encoding |
| --------------------- | ------------: | -------- |
| Navigation Level      |         +0x1c | `u8`     |
| Battle Level          |         +0x1d | `u8`     |
| Navigation experience |         +0x1e | `u16le`  |
| Battle experience     |         +0x20 | `u16le`  |

The full sailor-record location and initial character values are documented
in [sailors.md](sailors.md).

## Uses elsewhere

These levels also participate in systems that do not award experience:

- [Royal-mission selection](scenarios/scenario-0-common-quests-and-royal-missions.md)
  includes the protagonist's Navigation Level and Navigation experience in its
  deterministic random seed.
- [Piracy Fame](fame/piracy-fame.md) uses the defeated enemy captain's Battle
  Level in the victory award.
- [Hostile-country building encounters](friendship.md#hostile-country-building-encounters)
  use the protagonist's Battle Level together with Swordsmanship when testing
  an attempted escape.

## Code evidence

- `MAIN.EXE 0x20DFC–0x20E13`: computes
  `30 × min(current level, 18)²`.
- `MAIN.EXE 0x20E14–0x20E89`: shared level advancement used for both level
  types; it adds experience, advances through one or more levels, enforces
  level 100, and performs one set of Leadership-through-Intuition rolls when
  at least one level was gained.
- `MAIN.EXE 0x139C8–0x139D6`: passes the Battle Level and Battle experience
  fields to that shared routine through its relocated `FC4:BBD4` entry.
- `MAIN.EXE 0x20E8C–0x20F8A`: presents a Navigation level increase and performs
  the additional Leadership, Seamanship, and Knowledge rolls.
- `MAIN.EXE 0x20FB0–0x21064`: calculates both voyage-day awards and assigns
  them according to the Commodore, Captain, First Mate, and ordinary roles.
- `MAIN.EXE 0x212DB–0x21301`: accepts the Port Call, dispatches the port-entry
  scenario hook, and then processes Navigation experience.
- `MAIN.EXE 0x139BE–0x13A20`: calls the shared advancement routine for Battle
  experience, then performs the additional Courage and Swordsmanship rolls.
- `MAIN.EXE 0x13A21–0x13AD9` and `0x13C72–0x13DD9`: award Battle experience
  for ordinary damaging attacks, durability defeat, and crew defeat.
- `MAIN.EXE 0x33373–0x333C2`: implements the House of Fortune's Navigation and
  Battle experience-remaining readings.
