# Scenario 0 royal mission catalog

This is the player-facing catalog for the seven royal-mission sections in
`SNR0`. All seven begin with the ruler greeting the protagonist, asking whether
they accept, and promising a new title on success.

See [the Scenario 0 overview](./scenario-0-common-quests-and-royal-missions.md)
for eligibility, Fame selection, invitations, the audience, promotion, and
refusal penalties. Evidence labels have the meanings defined in
[the scenario README](./README.md); message numbers are one-based `SNR0.MES`
IDs unless a `MESSAGE.DAT` raw index is named.

## Common structure

Every mission section has the same three stages:

| Stage | Route                                                | What happens                                                                                                                                  |
| ----: | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
|     0 | Palace context `0x05` from an armed **Meet Ruler**   | Requires the current port to be the player fleet's home port (fleet byte `+0x26`) and flag 17; clears flag 17, sets flag 18, `F0`, `F8`       |
|     1 | Audience context `0x15` at the home port             | The ruler (variable 50) makes the offer. Refusing halves all three Fame values and ends the mission; accepting advances to stage 2            |
|     2 | Audience context `0x15`, plus mission-specific hooks | Progress check on each **Meet Ruler** at the home port: completion (+1 title), an incomplete report, or a give-up choice that halves all Fame |

Every audience line ends with `F8`, so the ordinary ruler menu does not follow
a scenario audience. The ruler portrait comes from variable 50
([below](#dynamic-ruler-portraits)). None of the missions has a deadline or pays
Fame. Completion ends with `F1`, clearing flags 16–18 and returning the shared
scenario to idle.

The rank band used below is variable 23, `floor(min(rank, 6) / 3)`, computed from
the stored rank at Fame-record `+0x0D` by section 0's Guild and Palace entry
routes (`SNR0 0x01D9–0x01E8` and `0x021F–0x022E`):

| Rank band          | Variable 23 |
| ------------------ | ----------: |
| No Rank–Squire     |           0 |
| Knight–Baron       |           1 |
| Viscount and above |           2 |

## Royal trading test (section 6)

The ruler says, “I will test your ability as a trader. Please bring me … lots of
…” (message 145). The offer (`SNR0 0x16A5–0x16FB`) picks the commodity and a
target sum by rank band and computes the quantity from the capital's own
regional Market definition: the current port's Market ID (port metadata
`+0x23`), then the commodity's little-endian **sale base price** `B` from the
goods-indexed word array at the start of the record (see
[Market definitions](../buildings.md#market-command-dialogue)):

```text
lots = min(floor(target / B), 250)
```

| Rank band          | Target | Goods IDs (random)                                                                          |
| ------------------ | -----: | ------------------------------------------------------------------------------------------- |
| No Rank–Squire     |  1,000 | `32 + random(6)`: Silver, Copper Ore, Tin Ore, Iron Ore, Art, Carpet                        |
| Knight–Baron       |  5,000 | `26 + random(6)`: Coral, Amber, Ivory, Pearl, Tortoise Shell, Gold                          |
| Viscount and above | 20,000 | `random(10)`: Clove, Cinnamon, Pepper, Nutmeg, Pimento, Ginger, Tobacco, Tea, Coffee, Cacao |

It uses the regional base price, not the port's current category-adjusted
price. For example, Lisbon's regional Market lists Gold at `B = 1,000`, so a
Knight asked for Gold must bring 5 lots.

Once the mission is accepted, the capital's own **Market** refuses service
with “The marketplace is closed temporarily, while the head trader recovers
from the plague” (message 154) and ejects the player (`0x18C7`). The goods must
therefore be bought elsewhere.

On each later audience (`0x1794`), the ruler takes up to the requested
quantity of that commodity from the fleet (`E3`):

- all remaining lots: “Oh, nice work! As a reward, let me endow you with this
  title” (message 150) and the new title;
- some lots: they are kept by the ruler, and “you still need to get … more”
  (message 153); or
- none: “You haven't got … lots of … yet. You're not going to quit, are you?”
  (message 151), with a give-up choice.

The goods are not paid for.

## Deliver documents (section 7)

The home ruler chooses a destination nation with `random(6)`, redrawing while
that nation's capital (nation record `+0x0A`) equals the home port
(`SNR0 0x19DF–0x19F4`), and asks the protagonist to carry documents to its
ruler (messages 157–162).

1. **Destination capital.** The protagonist uses **Meet Ruler** at the
   destination Palace (`0x1C05`). The destination ruler (variable 51) accepts
   the documents and sends regards (messages 174–179). This first visit sets
   shared flag 1 and raises the directed national Relations in **both
   directions by 5**, each capped at stored 100 (displayed 70). Later visits
   only say “Hurry back …” (messages 180–185).
2. **Home capital.** Before delivery the ruler urges the protagonist on
   (messages 167–172) with a give-up choice. After delivery (flag 1) the ruler
   awards the title (message 166).

The promotion is awarded only on the return visit to the commissioning ruler.

## Negotiate a treaty (section 8)

Structurally identical to document delivery, with its own dialogue: the offer
(messages 188–193), the destination ruler's acceptance (205–210), the
destination's “Please go” reminder (211–216), the home reminders (198–203), and
the reward (197). The Relation increase is **10** in both directions, capped at
stored 100.

The Relation updates are also listed in
[friendship.md](../friendship.md#royal-missions).

### Dynamic ruler portraits

The two diplomatic missions select ruler portraits dynamically, but this is
separate from the ordinary Palace presentation that selects the ruler of the
capital being visited.

For royal-mission dialogue, the script recomputes variable 50 from the current
player's sailor record: it reads the affiliation byte at `+0x29`, masks it to
the low three bits, and maps the resulting nation to its ruler's character
index (`0x14`, `0x18`, `0x1D`, `0x1B`, `0x25`, `0x1C` for Portugal, Spain,
Ottoman Turkey, England, Italy, and Holland). Variable 50 is therefore the
**current allegiance ruler**, not a ruler inferred from the Palace location or
a permanently stored commissioning-ruler portrait.

Variable 51 is built separately from the diplomatic mission's stored
destination-nation value, variable 18, with the same mapping. Both variables
are passed through `CD` and shown in the upper story panel. Offer, reminder,
and completion dialogue uses variable 50; the destination's acceptance and
reminder dialogue uses variable 51.

The Palace menu prevents a mid-mission allegiance change: **Defect** is
disabled while flag 17 or 18 is set and while a royal mission section is
active (`MAIN.EXE 0x30AE1–0x30AFD`), so the current-allegiance ruler is also the
commissioning ruler under the ordinary menu flow.

## Establish allied ports (section 9)

The ruler requires the nation to gain a number of new allied ports. The
requested number `N` is:

| Rank band          | `N` |
| ------------------ | --: |
| No Rank–Squire     |   2 |
| Knight–Baron       |   5 |
| Viscount and above |  10 |

The requirement is relative to the ports already allied when the mission is
offered (`SNR0 0x2244–0x2299`). The script scans the 100 regular ports' nation
bits (port display byte `+0x13`, low three bits), counting ports of the
protagonist's nation (variable 13) and all other ports (variable 14). It asks
for `min(N, variable 14)` new alliances (message 219, “$d14 ports”) and stores
the target `variable 13 + min(N, variable 14)` in variable 19 (message 226,
“$d19 allied ports”).

The scenario recounts on each later audience (`0x23A8–0x2449`). If the count
has reached the target, or equals exactly 95, the ruler reports the current
alliance count (message 224 or 225) and awards the title. Otherwise the ruler
reports that more allied ports are needed and offers the give-up choice
(message 226).

Investment can turn a port into an ally. The takeover itself also awards Trade
Fame equal to the port's Economy plus Industry; see
[Trade Fame](../fame/trade-fame.md#making-an-allied-port).

## Discoveries for the ruler (section 10)

The ruler says:

> I've heard you're quite an adventurer.

The protagonist is asked to find rare things and reserve those discoveries for
the ruler rather than reporting them elsewhere (message 231).

On acceptance, variable 19 is set to `(variable 23 + 1) × 50`, so the rank bands
require 50, 100, or 150 points (`SNR0 0x2577–0x257D`). Each later audience
(`0x268C–0x2706`) scans the 100 seven-byte discovery records in order and takes
the first one whose flag byte `+0x06` satisfies `flags & 0xB0 == 0x20`: found
(`0x20`), not yet reported (`0x10` clear), and selected for this game (`0x80`
clear; see [Discovery flags](../at-sea.md#discovery-flags)). It sets `0x10` on
that record and compares the record's difficulty byte `+0x05` with variable 19:

- difficulty at least the remaining requirement: `D9` selector 7
  (`MESSAGE.DAT` raw 950, “You discovered …?! That's fantastic! Please accept
  this title.”) and the new title;
- smaller difficulty: it is subtracted from variable 19, and `D9` selector 8
  (raw 955, “You discovered …? Nice work!”) is followed by “Go and find me
  something else” (message 235);
- no qualifying record: “You still haven't brought me anything …” (message
  number 236) with the give-up choice.

Only one discovery is consumed per audience. Collector turn-in in `MAIN.EXE`
(`0x33675–0x33687` and `0x33840`) lists discoveries with the same flag test and
sets the same `0x10` bit, so a discovery given to the ruler cannot later be
sold, and a sold discovery cannot be given to the ruler. The ruler pays no gold
or Fame for it.

## Special search (section 11)

This is a treasure hunt for one particular hidden artifact. A complete mission
has the following stages:

1. The ruler names the artifact (`D9` selector 1, `MESSAGE.DAT` raw 942) and
   the protagonist accepts the mission.
2. **Job Assignment** at any Guild reveals which port's Guild has more
   information.
3. That Guild names a sailor who knows about the treasure. The sailor may be
   anywhere; a Pub's **Treat** can report the sailor's current port.
4. Gossiping with or Treating the named sailor in a Pub offers the artifact's
   map for **1,000 gold pieces**.
5. After obtaining the map, going ashore at the treasure's site and choosing
   **Search** recovers the artifact. Reaching the site without the map is
   insufficient.
6. Returning the artifact to the commissioning ruler consumes it and awards
   **100,000 gold pieces (10 gold bars)** and the next title.

### What is selected and when

Three scenario variables carry the hunt:

| Variable | Meaning              | Set by                          |
| -------- | -------------------- | ------------------------------- |
| 16       | Guild clue port      | Guild clue handler (executable) |
| 17       | Informant sailor     | Guild clue handler (executable) |
| 18       | Target artifact item | The offer (`SNR0`)              |

The target artifact is selected when the mission is offered
(`SNR0 0x2830–0x2867`). The section scans the discovery table from record 0 and
takes the first record whose flags satisfy `flags & 0xF0 == 0x80` (not selected
as an ordinary discovery, and not yet sighted, found, or dug up) and whose
content byte `+0x04` is an item ID from 90 through 96. The item ID is stored in
variable 18. The record index is only a temporary loop value; completion finds
the record again by its content byte.

Those seven possible artifacts and their corresponding maps are:

| Artifact ID | Artifact       | Map ID | Map            |
| ----------: | -------------- | -----: | -------------- |
|          90 | Gold Mask      |     80 | Map of Mask    |
|          91 | Jade Table     |     81 | Map of Table   |
|          92 | Statue of Eyes |     82 | Map of Statue  |
|          93 | Obsidian Plate |     83 | Map of Plate   |
|          94 | Dark Crystal   |     84 | Map of Crystal |
|          95 | Pot of Fire    |     85 | Map of Pot     |
|          96 | Sword of Fate  |     86 | Map of Sword   |

No individual artifact is hard-coded as the objective. The selected artifact is
whichever eligible record occurs first in the current world's discovery table.
A new game hides the ten treasures, items 90–99, in ten randomly chosen
unselected discovery records and links each treasure map, items 80–89, to its
record (`MAIN.EXE 0x1B9ED–0x1BA30`; see
[Discovery flags](../at-sea.md#discovery-flags)). Section 11 does not generate
new coordinates or shuffle them later.

The clue contacts are deliberately left unselected at acceptance: variables 16
and 17 are both set to `255`, meaning "not selected yet" (`0x28DF`, `0x28E3`).
The Guild clue handler (`MAIN.EXE 0x32D25–0x32E68`) runs from **Job
Assignment** during section 11 while neither the artifact nor its map is
carried; otherwise it answers “Aren't you on a royal mission?”
(`MESSAGE.DAT` raw 595). On its first use it stores `random(42)`, a port ID
0–41, in variable 16. Away from that port the Guild names it and its rough
coordinates (raw 598 and 600). The clue port is chosen by the executable's
general random generator and has no fixed association with the artifact.

At the clue port, the handler chooses the informant once:

- with probability `1 / (variable 23 + 1)` (always at No Rank–Squire), a sailor
  whose current port byte `+0x25` is 0–41; otherwise one whose port is 42–96;
- the candidate is `79 + random(41)`, sailors 79–119, the
  [vagabond](../sailors.md#permanent-vagabonds) range, redrawn until the port
  test passes.

The Guild then names the sailor (raw 596 and 597). Both IDs remain in the
scenario variables, so asking again does not reroll them. The informant's
identity and port are generated independently of the artifact.

### Map and discovery state

The map sale (`MAIN.EXE 0x2BF2A–0x2C020`) derives the map directly from the
target item:

```text
map item ID = target artifact item ID - 10
```

It checks for an empty inventory slot, deducts exactly 1,000 gold pieces, adds
the derived map, and sets bit `0x20` on the discovery record linked from the
map's item byte `+0x14`. If Treat was used to reach the transaction, the pub's
ordinary Treat charge is separate from this fixed map price. A full inventory
or insufficient money prevents the sale, and owning the map prevents buying it
again. The Pub details are in
[Pub command dialogue](../buildings.md#pub-command-dialogue).

The target coordinates already reside in the persistent discovery record. The
map purchase adds the record's `0x20` bit, and successful searching later adds
its `0x10` bit, without changing the coordinates or the target item. The `0x20`
state is the discovery prerequisite: Search at the site finds the treasure only
once its map has been bought ([Finding water](../at-sea.md#finding-water)).

Carrying a treasure map also enables **Locate** at a Cartographer
(`MAIN.EXE 0x33D59`). It begins with, “Hmm, so you want me to analyze a treasure
map!”, requires more than 20,000 gold, scans the twenty inventory slots for
item IDs 80–88 (asking which one when several are carried), charges 20,000,
and reports the linked discovery's position rounded to 5° with a random
offset; see [Collector and cartographer dialogue](../buildings.md#collector-and-cartographer-dialogue).
It does not set or advance any section-11 variable, so it is not required to
recover the artifact.

### Waitress Job Info

The waitress is not required to advance the special search. Her **Job Info**
response (`MAIN.EXE 0x2CD38–0x2D06B`) reflects the current stage:

- Before the map or artifact is carried, she says, “Why don't you ask at the
  guild” while variable 17 is still `255`. After the Guild selects the
  informant, this changes to “Someone in the pub might have an idea.”
- While the map is carried, she identifies it and suggests asking a
  cartographer what area it depicts.
- While the recovered artifact is carried, she reacts to the discovery. If the
  shared `0x40` waitress-interaction flag is clear, this reaction also raises
  her relationship value by 10, capped at 100, and sets the flag.

None of these responses changes the special-search variables or completes a
mission stage.

### Fixed completion reward

The completion script (`SNR0 0x297B–0x2A07`) scans the twenty inventory slots
for the item ID stored in variable 18:

- found: `D9` selector 2 (`MESSAGE.DAT` raw 943, “… I present you with 10 gold
  bars and this title”). The script clears that inventory slot, loads 20,000,
  and executes the add-money operation five times for a fixed 100,000 gold
  pieces. It increments variable 40, the completed-special-search counter used
  by the [mission-family selector](./scenario-0-common-quests-and-royal-missions.md#how-the-mission-family-is-chosen),
  awards the title, and sets `0x10` on the discovery record whose content byte
  equals variable 18;
- not found: `D9` selector 3 (raw 944, “You still haven't found the …. Are you
  giving up the search?”) with the give-up choice.

### Code evidence

| File and offset                | Behavior                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `SNR0.DAT 0x2830–0x2867`       | Scans special discovery records and stores the target item                                        |
| `SNR0.DAT 0x28DF` and `0x28E3` | Initializes the clue-port and informant variables to `255`                                        |
| `MAIN.EXE 0x32D25–0x32E68`     | Handles Guild clues and randomly selects the port and informant                                   |
| `MAIN.EXE 0x2B979–0x2BAC3`     | Pub Treat: reports the informant's port when `informant mod 3 = port mod 3`                       |
| `MAIN.EXE 0x2CD38–0x2D06B`     | Handles waitress Job Info, including its section-11 hints and artifact-reaction relationship gain |
| `MAIN.EXE 0x2BF2A–0x2C020`     | Handles the fixed-price map sale, derives `map = artifact - 10`, and marks the map known          |
| `MAIN.EXE 0x33D59` onward      | Handles Cartographer Locate and scans carried items for treasure-map IDs `80–88`                  |
| `SNR0.DAT 0x29A9–0x29BA`       | Clears the slot, adds 20,000 five times, and increments variable 40                               |

The scenario chooses the artifact, clue port, and informant through three
separate mechanisms. There is no fixed artifact-to-port or
artifact-to-informant association in the data.

## Defeat a fleet (section 12)

The target is not random. The offer (`SNR0 0x2B31–0x2B3A`) reads the
protagonist's nation record byte `+0x02`, the nation that this nation is
currently targeting (the value the Guild's Country Info reports as “It seems
%s is out to get %s”; see [Guild intelligence](../friendship.md#guild-intelligence)),
and stores it in variable 18. The ruler then explains that the chosen fleet has
attacked the ruler's merchant shipping and asks for an attack:

| Variable 18 | Target           | Offer   | Reminder |
| ----------: | ---------------- | ------- | -------: |
|           0 | Portuguese fleet | 247–248 |      264 |
|           1 | Spanish fleet    | 249–250 |      265 |
|           2 | Turkish fleet    | 251–252 |      266 |
|           3 | English fleet    | 253–254 |      267 |
|           4 | Italian fleet    | 255–256 |      268 |
|           5 | Dutch fleet      | 257–258 |      269 |
|           6 | Pirates          | 259–260 |      270 |

Accepting clears shared flags 2 and 3. Two battle hooks then follow the same
pattern as the Guild's Defeat Pirates assignment:

1. **Before a battle** (`0xA1FF`, `0x2C51`): flag 3 is set only when the
   opposing captain's fleet ID divided by 10 equals variable 18, that is, any
   fleet in the target's block of ten fleet IDs (pirates: 60–69).
2. **After the battle** (`0xA2FF`, `0x2C6C`): if flag 3 is set and that captain's
   fleet byte is now `0xFF`, flag 2 records success. A battle in which the
   enemy flagship fled does not clear the fleet byte and does not count
   ([After the battle](../naval-battle.md#after-the-battle)).

On the next audience (`0x2D07`), flag 2 produces:

> You did a marvelous job defeating the enemy fleet. Please accept this title
> as a reward for your services.

Otherwise the ruler asks whether the protagonist is giving up (messages
264–270). An unrelated victory does not satisfy the mission. The ordinary
naval-victory rules can still award Piracy Fame for any battle; that Fame is
separate from the royal mission's title reward.

## Shared lifecycle

```text
eligible (flag 16, refreshed on building entry)
    → Harbor in an own-nation port, or Pub Treat → armed (flag 17)
        → Meet Ruler at the home-port Palace → flag 18, ruler offers mission
        → accept → mission-specific progress → return to ruler → +1 title (F1)
        → refuse                                     → halve all Fame (F1)

active mission (flag 18)
    → incomplete → continue
    → give up    → halve all Fame (F1)
```

`F1` clears flags 16–18 and the mission section, so a success condition cannot
award the title twice.

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **The player fleet's home port** (fleet byte `+0x26`) is written only by
  the new-game data and **Defect** (`MAIN.EXE 0x305C3`); scenario scripts only
  read it. The mission gate therefore sees the capital of the protagonist's
  current nation.
- **The Defeat-a-fleet target is never the protagonist's own nation.** The
  monthly update that writes nation byte `+0x02` (`MAIN.EXE 0x1CD7F`) skips the
  nation's own index, and stores 7 (“the player”) only for nations other than
  the protagonist's affiliation; **Defect** turns a 7 on the new nation into 6
  (`0x305D5–0x305E2`). Section 12 therefore always reads a value from 0 to 6
  that is not the protagonist's nation. See
  [Guild intelligence](../friendship.md#guild-intelligence) for the rule.
- **An exhausted special-search table hangs the game.** The target scan at
  `SNR0 0x2834–0x2864` has no upper bound. `D0` passes only the low byte of
  the index variable (`MAIN.EXE 0x38DAB`), and the discovery group multiplies
  that byte by 7 (`0x37B67`), so past record 99 the scan reads records
  100–255, which overlap the item definitions and the data after them, and
  then wraps to record 0. If no record with flags `0x80` only and content
  90–96 remains, the loop never ends and the game hangs at **Meet Ruler**,
  before the artifact is named. Ordinary play can reach this state. The
  mission selector diverts Adventure rolls away from section 11 only when
  variable 40 is exactly 7
  ([How the mission family is chosen](./scenario-0-common-quests-and-royal-missions.md#how-the-mission-family-is-chosen)),
  but an artifact dug up during a search that is then abandoned leaves its
  record out of the scan without incrementing variable 40. After all seven
  artifacts have been dug up with at least one search abandoned, the next
  special-search audience hangs.

## Open questions

None remain; the last one is answered in [Engine notes](#engine-notes).
