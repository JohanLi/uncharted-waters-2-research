# Scenario 0 royal mission catalog

This is the player-facing catalog for the seven royal-mission sections in
`SNR0`. All seven begin with the ruler greeting the protagonist, asking whether
they accept, and promising a new title on success.

See [the Scenario 0 overview](./scenario-0-common-quests-and-royal-missions.md)
for eligibility, Fame selection, invitations, promotion, and refusal penalties.

## Royal trading test (section 6)

The ruler orders the protagonist to bring a generated quantity of a selected
commodity. The selection code uses target values of 1,000, 5,000, and 20,000
for the three rank bands described under
[Establish allied ports](#establish-allied-ports-section-9) when calculating
the cargo requirement. The final quantity is capped at 250 lots.

On a later Palace visit:

- having the full requested cargo completes the mission and awards a title;
- having only part of it produces a message stating how many lots remain; or
- the player may give up, losing half of all three Fame values.

One failure/progress path can temporarily close the relevant Marketplace while
its head trader recovers from plague (message 154).

The exact relationship between the 1,000/5,000/20,000 values, local price, and
the generated number of lots still needs a worked runtime example.

## Deliver documents (section 7)

The home ruler selects one of the other five rulers and asks the protagonist to
carry documents there. The destination ruler accepts the documents and sends
regards; the protagonist must then return to the home ruler to receive the
title.

Successful delivery increases the directed national Relation in **both
directions by 5**, capped at the maximum stored Relation value. The promotion
is awarded only on the return visit to the commissioning ruler.

## Negotiate a treaty (section 8)

The home ruler sends the protagonist to one of the other five rulers as an
envoy. The destination ruler accepts the treaty proposal; the protagonist then
returns home for the new title.

Successful negotiation increases the directed national Relation in **both
directions by 10**, capped at the maximum stored Relation value. Structurally
this mission resembles document delivery, but its Relation effect is twice as
large.

### Dynamic ruler portraits

The two diplomatic missions select ruler portraits dynamically, but this is
separate from the ordinary Palace presentation that selects the ruler of the
capital being visited. Visiting Lisbon outside the diplomatic mission route,
for example, displays King Manuel through the ordinary location-driven Palace
path.

For royal-mission dialogue, the script recomputes variable 50 from the current
player fleet's commander: it follows that sailor's record, reads the
affiliation byte at `+0x29`, masks it to the low three bits, and maps the
resulting nation to its ruler's character index. Variable 50 is therefore the
**current allegiance ruler**, not a ruler inferred from the Palace location or
a permanently stored commissioning-ruler portrait.

Variable 51 is built separately from the diplomatic mission's stored
destination-nation value. It selects the destination ruler. Both variables are
passed through `CD` and shown in the upper story panel. Under the normal
mission flow, the current allegiance ruler is also the ruler who commissioned
the mission, but those descriptions should not be treated as the variable's
underlying source.

The Palace menu prevents a natural mid-mission allegiance change: **Defect**
is disabled while a royal invitation/offer is armed and throughout accepted
royal-mission sections 6–12. The hypothetical case in which variable 50's
current-allegiance portrait differs from the commissioning ruler therefore
requires an artificial save edit; it is not reachable through the ordinary
Palace menu during the mission.

This selection rule applies to every national pair in both diplomatic mission
types. Offer and completion dialogue use the ruler mapped from variable 50,
while delivery or negotiation dialogue uses the ruler mapped from variable 51.
The script contains mappings for all six nations.

## Establish allied ports (section 9)

The ruler requires the nation to gain a number of new allied ports. Variable 23
selects the rank band as `floor(min(rank, 6) / 3)`, using the stored rank at
Fame-record `+0x0D` (`SNR0` `0x01D9–0x01E8` and `0x021F–0x022E`). The
requested number of new alliances `N` is:

| Rank band          | Variable 23 | `N` |
| ------------------ | ----------: | --: |
| No Rank–Squire     |           0 |   2 |
| Knight–Baron       |           1 |   5 |
| Viscount and above |           2 |  10 |

The requirement is relative to the ports already allied when the mission is
offered (`SNR0` `0x226B–0x2299`). The script scans the 100 regular ports'
cached controllers, counting ports controlled by the protagonist's nation
(variable 13) and all other ports (variable 14). It asks for
`min(N, variable 14)` new alliances (message 219, “$d14 ports”) and stores the
target `variable 13 + min(N, variable 14)` in variable 19 (message 226,
“$d19 allied ports”).

The scenario recounts the allied ports when the Palace is revisited. If the
count has reached the target, or equals 95, the ruler reports the current
alliance count and awards the title. Otherwise the ruler reports that more
allied ports are needed and lets the protagonist continue or give up.

Investment can turn a port into an ally. The takeover itself also awards Trade
Fame equal to the port's Economy plus Industry; see
[Trade Fame](../fame/trade-fame.md#making-an-allied-port).

## Discoveries for the ruler (section 10)

The ruler says:

> I've heard you're quite an adventurer.

The protagonist is asked to find rare things and reserve those discoveries for
the ruler rather than reporting them elsewhere. Later Palace visits scan the
discovery state:

- a qualifying new discovery can satisfy the request and award the title;
- a non-qualifying or insufficient result prompts the protagonist to keep
  searching; or
- the protagonist can give up and lose half of all Fame.

The decoded rule in `SNR0` section 10 (`0x2609–0x2706`) is as follows. On
acceptance, variable 19 is set to `(variable 23 + 1) × 50`, so the rank bands
above require 50, 100, or 150 points. Each later Palace visit scans the 100
seven-byte village/discovery records in order and takes the first one whose
flag byte `+0x06` satisfies `flags & 0xB0 == 0x20`: found, not yet reported
(`0x10` clear), and selected for this game (`0x80` clear). It sets `0x10` on that
record and compares the record's difficulty byte `+0x05` with variable 19. A
difficulty at least equal to the remaining requirement completes the mission;
otherwise the difficulty is subtracted from variable 19 and the ruler asks for
something else. Only one discovery is consumed per visit. If no record
qualifies, the ruler asks whether the protagonist wants to give up.

Collector turn-in in `MAIN.EXE` (`0x33675–0x33687` and `0x33840`) lists
discoveries with the same flag test and sets the same `0x10` bit, so a
discovery given to the ruler cannot later be sold, and a sold discovery cannot
be given to the ruler.

## Special search (section 11)

This is a treasure hunt for one particular hidden artifact. A complete mission
has the following stages:

1. The ruler names the artifact and the protagonist accepts the mission.
2. Visiting any Guild reveals which port's Guild has more information.
3. That Guild names a sailor or vagabond and directs the protagonist to the
   pub. The NPC may have moved, so further pub inquiries can be necessary.
4. Gossiping with or Treating the named NPC offers the artifact's map for
   **1,000 gold pieces**.
5. Using the map displays the treasure's already-recorded world coordinates.
6. After obtaining the map, going to those coordinates and choosing **Go
   Ashore** and **Search** recovers the artifact. Knowing the coordinates
   without obtaining the map is insufficient.
7. Returning the artifact to the commissioning ruler consumes it and awards
   **100,000 gold pieces (10 Gold Ingots)** and the next title.

### Waitress Job Info

The waitress is not required to advance the special search. Her **Job Info**
response reflects the current stage:

- Before the map or artifact is carried, she says, "Why don't you ask at the
  guild" while the informant variable is still `255`. After the Guild selects
  the informant, this changes to "Someone in the pub might have an idea."
- While the map is carried, she identifies it and suggests asking a
  cartographer what area it depicts.
- While the recovered artifact is carried, she reacts to the discovery. If the
  shared `0x40` waitress-interaction flag is clear, this reaction also raises
  her relationship value by 10, capped at 100, and sets the flag. Repeating the
  interaction cannot raise it again until the flag is reset.

None of these responses changes the special-search variables, selects the clue
port or informant, reveals the informant's identity or current port, or
completes a mission stage. The Guild interactions and the eventual Gossip or
Treat interaction with the selected informant perform the meaningful quest
progression. The artifact must still be returned to the ruler.

### What is selected and when

Four scenario variables carry the hunt:

| Variable | Meaning                       |
| -------- | ----------------------------- |
| 9        | Target discovery-record index |
| 16       | Guild clue port               |
| 17       | Informant sailor/NPC          |
| 18       | Target artifact item          |

The target artifact is selected when the mission is offered. The section scans
the discovery table from the beginning and takes the first still-eligible
special-treasure record: its discovery flags must match the special hidden
class (`flags & 0xF0 == 0x80`), and its item ID must be from 90 through 96.
The record index is saved in variable 9 and its item ID in variable 18.

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

No individual artifact is hard-coded as the section-11 objective. The selected
artifact is whichever eligible special-treasure record occurs first in the
current world's discovery table. The seven artifacts each occur once among
the world's hidden-discovery records, at different locations. Their assignment
to locations appears to be established when the world is created; section 11
does not generate new coordinates or shuffle them when the map is bought or
used.

The clue contacts are deliberately left unselected at acceptance: variables 16
and 17 are both initialized to `255`, meaning "not selected yet." The first
relevant Guild inquiry sees that value, calls the random-number routine with a
range of 42, and stores a port ID from 0 through 41 in variable 16. If the
player is elsewhere, the Guild names that port. The clue Guild is therefore
randomly selected and has no fixed association with the target artifact.

At the selected Guild, the game then chooses the informant. It draws candidates
only from sailor/NPC IDs 79 through 119: the recruitable vagabond pool. Active
NPC fleet captains occupy IDs 6 through 68 and can never be drawn by this
routine. A candidate is also rejected if their current-location byte is `255`
or is not a regular eligible port ID from 0 through 96. The selection has
separate branches for ports below 42 and ports from 42 through 96, then retries
until it finds a matching NPC.

The informant is therefore purposefully a currently port-resident vagabond,
not someone commanding an active fleet. The Guild's use of "sailor" is
ordinary dialogue, not the executable's character class. The informant's
identity and current port are generated independently of the artifact. Once
selected, both the clue-port and NPC IDs remain in the scenario variables, so
reloading or asking again does not reroll them.

### Map and discovery state

The map-sale code derives the map directly from the target item:

```text
map item ID = target artifact item ID - 10
```

It checks for an empty inventory slot, deducts exactly 1,000 gold pieces, adds
the derived map, and sets bit `0x20` in the target discovery record. If Treat
was used to reach the transaction, the pub's ordinary Treat charge is separate
from this fixed map price. A full inventory or insufficient money prevents the
sale, and owning the map prevents buying it again.

The target coordinates already reside in the persistent discovery record.
Map purchase adds the record's `0x20` map-known bit, and successful searching
later adds its `0x10` discovered bit, without changing the coordinates or
target item. The carried map is replaced by the artifact when the search
succeeds.

The `0x20` state is a discovery prerequisite, not merely a way to reveal the
coordinates to the player. Sailing directly to the predetermined location
before obtaining the map does not make the artifact available to **Search**.
Using the map's **View** command is what shows its location; the unlock itself
is established when the map is obtained from the informant.

Carrying a treasure map also makes **Locate** available when visiting a
Cartographer. Selecting it begins with, "Hmm, so you want me to analyze a
treasure map!" The handler scans the player's twenty inventory slots for map
item IDs `80` through `88`; the seven maps used by section 11 occupy IDs `80`
through `86`. If more than one qualifying map is carried, the Cartographer
asks which one to analyze. This service interprets a carried map but does not
set or advance any section-11 quest variable, so it is not required to recover
the artifact.

### Fixed completion reward

The completion script verifies that the inventory contains the item ID stored
in variable 18. Its money award is not selected from a table: it loads 20,000
and executes the add-money operation five times, for a fixed total of 100,000
gold pieces. The ruler describes this as **10 Gold Ingots**. The script then
removes the artifact, advances the protagonist by one title, and clears the
active royal-mission state.

### Code evidence

The principal file offsets behind these rules are:

| File and offset                | Behavior                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `SNR0.DAT 0x2830` onward       | Scans special discovery records and stores the target record and item                             |
| `SNR0.DAT 0x28DF` and `0x28E3` | Initializes the clue-port and informant variables to `255`                                        |
| `MAIN.EXE 0x32D25–0x32E68`     | Handles Guild clues and randomly selects the port and informant                                   |
| `MAIN.EXE 0x2CD38–0x2D06B`     | Handles waitress Job Info, including its section-11 hints and artifact-reaction relationship gain |
| `MAIN.EXE 0x2BF2A–0x2C020`     | Handles the fixed-price map sale, derives `map = artifact - 10`, and marks the map known          |
| `MAIN.EXE 0x33D59` onward      | Handles Cartographer Locate and scans carried items for treasure-map IDs `80–88`                  |
| `SNR0.DAT 0x29A9–0x29B8`       | Loads 20,000 and invokes the money-add operation five times                                       |

These offsets also explain why the apparent story association is misleading:
the scenario chooses the artifact, clue port, and informant through three
separate mechanisms. There is no fixed artifact-to-port or
artifact-to-informant association in the data.

## Defeat a fleet (section 12)

The ruler asks the protagonist to defeat one of these targets:

- the Portuguese, Spanish, Ottoman, English, Italian, or Dutch national fleet;
  or
- pirates.

The offer dialogue explains that the chosen fleet has attacked the ruler's
merchant shipping. Scenario routes run both before and after naval battles.
They compare the battle target with the commissioned enemy and record success
only for the matching encounter.

After the required victory, returning to the Palace produces:

> You did a marvelous job defeating the enemy fleet. Please accept this title
> as a reward for your services.

An unrelated victory does not satisfy the mission. The ordinary naval-victory
rules can still award Piracy Fame for the battle itself; that Fame is separate
from the royal mission's title reward.

## Shared lifecycle

The seven families use the same basic state machine:

```text
eligible (flag 16)
    → visit Harbor OR use Pub Treat → armed (flag 17)
        → visit Palace → ruler offers mission
        → accept → mission-specific progress → return to ruler → +1 title
        → refuse                                     → halve all Fame

active mission
    → incomplete → continue
    → give up   → halve all Fame
```

The mission-specific state prevents a success condition from awarding the
title twice. Completion clears/advances the shared scenario state after the
title operation.
