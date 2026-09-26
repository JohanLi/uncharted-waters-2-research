# Scenario 5: Pietro Conti

Scenario 5 (`SNR5`) is Pietro's character story. It opens in Genoa, where
Pietro is hounded by the creditors of his father's debts until his friend Camillo
arrives with a ship and news of a sponsor: Duchess Franco of Lisbon. After the
sponsorship, the story has three further sections. The first is gated by
carried gold rather than Fame: a Pub patron sells Pietro the map to the Gold
Medallion. The last two are gated by Adventure Fame: João Franco asks Pietro to
find Poseidon's Staff, and later Ali brings the clue that leads through
Zipangu to South America, Raul Franco, and the ending in Lisbon. The story has
no scripted naval battles, duels, voyage-day events, or clock and calendar
gates. Its one recurring penalty is Butler Marco's reaction when Pietro holds
another collector's contract.

This document describes the scenario from the player's point of view. It is
based on the decoded `SNR5.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine.

Evidence labels have the meanings defined in [the scenario README](./README.md).
Unless a statement is labeled otherwise, it is **decoded**.

## Story and threshold map

| Section | Gate                                                           | Player-visible story                                                             |
| ------: | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
|       0 | —                                                              | Genoa debts, Camillo and the _Falcon_, Duchess Franco's sponsorship in Lisbon    |
|       1 | 1 Gold Ingot (10,000 gold on hand), port ID 42+, an empty slot | Buy the Medallion Map, dig up the Gold Medallion, and resolve to find El Dorado  |
|       2 | 10,000 Adventure Fame                                          | João's request, the legend trail through the Middle East, and Poseidon's Staff   |
|       3 | 40,000 Adventure Fame                                          | Ali's Zipangu clue, Ernst's advice, Raul Franco in South America, and the ending |

The two Fame thresholds compare **Adventure Fame**, not total Fame. Both read
the word at `+0x04` of protagonist 4's 14-byte Fame record (`DC 00 01 04 00`,
pointer `+4`, word read) and are inclusive: a value equal to the threshold
passes. The section-1 gate reads no Fame at all.

The gate is only one part of each trigger:

- The Gold Medallion offer is tested when Pietro enters a **Pub** in any
  regular port whose ID is 42 or higher (`SNR5.DAT 0x058A`).
- 10,000 Adventure Fame is tested only at the **Franco home** in Lisbon (the
  special building, `0x08F9`).
- 40,000 Adventure Fame is tested at the **Harbor** of any regular port
  (`0x1053`), Lisbon included.

No route in `SNR5.DAT` uses the at-sea selector `0xA0` or the before- and
after-battle selectors `0xA1`/`0xA2`. Scenario services which are not
mentioned below normally retain their ordinary game behavior. The tables
describe the extra story behavior layered onto them.

Routes in each table are tried in file order and the first match wins
(`MAIN.EXE 0x3922E–0x39268`), so a port-specific route such as Massawa's
wildcard `0x4AFF` takes precedence over the any-port Harbor route `0xA303`
listed after it.

Randomized destinations use the scenario `EB` roll. As described in the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md),
its seed is rebuilt before every protagonist dispatch from the date, the
time of day, and Pietro's Navigation level and experience, so a given game
state always produces the same draw. Different visits generally produce
different destinations.

## The Duchess's collector contract

The Duchess's sponsorship is implemented as the ordinary collector contract
with **Butler Marco**, the collector in the Franco home in Lisbon. He is
collector record 0 (`D0/DC` group `0x04`, index 0), and the contract is bit
`0x10` of that record's byte `+0x16`. The sponsorship scene sets it
(`SNR5.DAT 0x03A3–0x03AE`); Pietro's discoveries are then reported to the
Duchess through Marco's ordinary **Discovery** command.

The ordinary **Contract** command of another collector (Count Morie in
Copenhagen, Ranajame in Alexandria, the Duke of Modena in Pisa, or Professor
Mordes in Bordeaux) clears Marco's bit. In every story subsection of
sections 1–3, the Franco home's first route reads that bit. If it is clear:

1. Marco asks whether Pietro holds other contracts and insists that he renew
   the one with the Duchess (messages 104–108 and their later copies).
2. The route sets Marco's contract bit again and clears bit `0x10` on
   collector records 1–4.
3. It halves all three of Pietro's Fame values, Trade, Piracy, and Adventure,
   with integer division (`/ 2` on each word).
4. The route then stops. Nothing else happens on that visit, including the
   10,000-Fame scene of section 2, which needs another visit.

Because the halving includes Adventure Fame, signing with another collector
can push Pietro back below a section-2 or section-3 threshold. Only a visit to
the Franco home applies the penalty. The check is repeated verbatim at
`0x04DC`, `0x0702`, `0x0847`, `0x0A1A`, `0x0D0F`, `0x0FA5`, `0x10C6`, and
`0x124B`. The final subsection's Franco-home route plays the ending instead
and has no check.

## Section 0: Genoa and the Duchess's sponsorship

Pietro starts in Genoa (port 8) without a ship. The opening is a short, strict
sequence: several buildings eject him, and only the Harbor and Pub advance
the story.

### Leaving Genoa

1. Visit the **Genoa Harbor**. The harbormaster demands the money that
   Pietro's father owed and mentions that Camillo is in town and walking
   toward the Pub (messages 26–34). The scene writes `-10` to the Bank's
   signed hundreds word (save `0x060E`), putting Pietro **1,000 gold** in debt
   at the Bank, sets flag 0, and ejects him. Later Harbor visits ask, “Have ye
   run into Camillo?” and eject him again.
2. Visit the **Genoa Pub**. Before the Harbor scene, the barkeeper only jokes
   about Pietro's unpaid tab and ejects him (messages 1–2). Afterward, the Pub
   plays Pietro's theme and Camillo's offer (messages 3–21): the Duchess will
   sponsor Pietro and take care of his debts, and Camillo hands him command
   of a ship, which Pietro names the _Falcon_.
3. The scene then sets up the voyage (`0x0120–0x0157`):
   - Camillo (sailor 76) joins the mate roster (`FB 4C`) and becomes First
     Mate (duty byte `+0x26 = 3`).
   - A **Caravela Latina** (ship model 5) is created in the player fleet and
     commissioned as the _Falcon_ (`F9 05`, `FA` with message 22), with
     Pietro as captain.
   - Fleet slot 0 receives 10 crew, and its supply record receives 100
     tenths each of water and food, that is, 10 barrels of each.
   - Lisbon (port 0) is marked discovered (`status |= 0x10` in the port
     record's byte `+0x13`).
   - Flag 0 is cleared, the subsection advances, and Pietro is ejected.
4. Sail to Lisbon. Camillo suggests rounding the Iberian peninsula or using
   Auto Sail.

The crew and supply writes address player-fleet slot 0 directly rather than
the slot `F9` chose. They agree because Pietro has no ship before this scene:
in the untouched `raw/KOUKAI2.DAT`, all ten slots of his fleet (fleet ID
`0x28`) hold the empty pattern `ff00ffffffffffff00`, so `F9` also selects
slot 0.

### Genoa building behavior

| Building                           | Before the Camillo scene                                                         | After the Camillo scene                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Harbor                             | The debt scene, then “Have ye run into Camillo?”; both eject Pietro.             | Camillo's reminder that provisions are low (message 92). Pietro is not ejected. |
| Pub                                | The barkeeper's joke (messages 1–2), ejecting Pietro; then the Camillo scene.    | Another joke about Pietro's tab (messages 90–91), ejecting him.                 |
| Bank                               | The banker asks about repayment (messages 35–38) and ejects Pietro.              | Similar exchange (messages 93–96), also ejecting.                               |
| Church                             | The priest asks for a donation or repayment (messages 39–40); Pietro is ejected. | Similar exchange (messages 97–98), also ejecting.                               |
| Lodge                              | The keeper offers to hide Pietro (messages 41–42). The Lodge stays usable.       | Similar offer (messages 99–100); the Lodge stays usable.                        |
| Palace and House of Fortune        | Explicit empty routes: ordinary behavior.                                        | Explicit empty routes: ordinary behavior.                                       |
| Market, Shipyard, Item Shop, Guild | The Genoa wildcard: “$n, you dirty crook!” (messages 43–44), ejecting Pietro.    | The same creditor (messages 101–102), ejecting Pietro.                          |

The Palace entry includes context `0x15`, the Meet Ruler dispatch; it also has
an explicit empty route.

### Meeting the Duchess in Lisbon

After the Camillo scene, the section's nested table (`0x022A`) adds Lisbon
routes and an any-port Harbor reminder:

| Building                 | Before the Duchess                                                                                      | After the Duchess                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Franco home              | Marco shows Pietro and Camillo in. The Duchess's scene plays (below) and ejects Pietro.                 | No story route: Marco's ordinary collector menu.                   |
| Lisbon Harbor            | Camillo says they have not met the sponsor yet and that she lives in the biggest house in town; ejects. | The departure conversation, then section 1 (below).                |
| Other Lisbon buildings   | Camillo: “$n, we had better hurry up and see the Duchess.” The building stays usable.                   | No story route.                                                    |
| Any other regular Harbor | Camillo's reminder to head for Lisbon because provisions are low (message 103).                         | Same reminder until the Lisbon departure. Pietro is never ejected. |

The Duchess's scene (messages 45–75) makes the following changes
(`0x033E–0x03B4`):

- Pietro's carried gold is **set** to 5,000 (`E4`). This replaces the amount
  he was carrying rather than adding to it.
- The Bank's hundreds word is set to 0, clearing the Genoa debt. The same
  write also erases any positive savings stored in whole hundreds; the
  remainder byte at `0x0610` is not touched.
- The first two inventory slots are written directly with the **Sextant**
  (item 21) and the **Telescope** (item 24). Whatever those slots held before,
  such as an item bought in another port on the way from Genoa, is
  overwritten and lost.
- Marco's collector contract is activated, as described
  [above](#the-duchesss-collector-contract).
- Flag 0 is set and Pietro is ejected.

The Duchess also asks Pietro to report on her son João. Nothing in the
bytecode checks such a report; it is story motivation for sections 2 and 3.

Returning to the **Lisbon Harbor** then plays Camillo's reaction to Pietro's
bluntness and Pietro's choice to begin with the Nile and Alexandria (messages
79–88). The route clears flag 0 and advances to section 1. It does not eject
Pietro, so the Harbor menu remains available for departure.

## Section 1: the Gold Medallion (1 Gold Ingot)

### Buying the map

The primary Pub route `0xA301` (`0x058A`) starts the offer only when all of the
following are true:

- `EA` reports at least **1 Gold Ingot**, meaning at least 10,000 gold on hand.
  Bank savings do not count. At 9,999 gold the Pub behaves normally; at 10,000
  it reaches message 109, “Ye’re $n, the adventurer, right?”
- The current port ID is **42 or higher**. This excludes Europe and the
  Mediterranean, including Lisbon, Genoa, and Alexandria, and admits the New
  World (42–56), Madeira (57), and every port farther east or south. Adventure
  Fame is not read.
- One of the twenty inventory slots is empty (`0xFF`). The scan stops at the
  first empty slot and remembers it; a full inventory silently rejects the
  event.

The patron explains the Gold Medallion and El Dorado and offers a map for
**2,000 gold** (`E9 0A`):

- **Yes**: Pietro calls him a liar but pays **2,000**. The patron then repeats
  the story of the pirates and the Portuguese adventurer (messages 131–139).
- **No**: Pietro says the tale “Sounds like bunk to me,” and the patron drops
  the price to **1,000**. There is no second prompt: Pietro pays 1,000 and
  hears the same story in another wording (messages 120–130).

Refusing is therefore cheaper. Neither branch can fail for lack of money,
because the route has already required 10,000 gold.

The scene then prepares the treasure (`0x06B1–0x06F4`):

1. It scans the discovery table for the record whose content byte `+4` is item
   97, the **Gold Medallion**, and whose flag nibble (`+6 & 0xF0`) is exactly
   `0x80`: a hidden, unselected site with no other flags set.[^treasure-scan]
2. It sets flag `0x20` on that record, the same “map bought” mark used by the
   royal special search (see [discovery flags](../at-sea.md#discovery-flags)).
3. It writes the **Medallion Map** (item 87) into the empty inventory slot
   found earlier.
4. It advances the subsection. The Pub menu remains usable.

### Finding the Medallion

The Gold Medallion is one of the ten treasures hidden at new-game
initialization. Treasure `k` is placed in a randomly chosen unselected
discovery record and map item `80 + k` stores that record's index in its item
byte `+0x14` (`MAIN.EXE 0x1B9ED–0x1BA30`). The Medallion is `k = 7`, so the
Medallion Map already points to its site before the Pub scene. The scene only
sets the map-bought flag and hands over the map. The site is therefore
different in every game.

Go to the site, choose **Go Ashore**, then **Search**. The open-land Search
path at `0x3A311` accepts the current tile's record only when its flag nibble
is exactly `0xA0` (hidden plus map bought). It then announces the find with
“We discovered %s %s!” (general message 431), replaces the first inventory
item equal to `treasure − 10`, which is the Medallion Map, with the Gold
Medallion (`0x3A2E1–0x3A308`), and sets the site's dug-up flag `0x10`
(`0x3A332`).[^dig-without-map]

The Medallion Map is an ordinary treasure map (items 80–88 share item category
`0x0C`). The cartographer's **Locate** command, which scans the inventory for
items 80–88, and the map's own use can reveal the site, as in the
[royal special search](./scenario-0-royal-missions.md#special-search-section-11).

### Showing Camillo

After the purchase, section 1's nested table (`0x06F6`) contains only the Franco
home's contract check and the any-port Harbor route `0xA303`:

1. Enter the **Harbor** of any regular port while carrying the Gold
   Medallion (item 97) in any of the twenty inventory slots (`0x07B0`).
2. Pietro's theme plays over event art: Camillo admires the medallion and
   they resolve to search for El Dorado (messages 145–149).
3. The route adds **1,000 Adventure Fame**, capped at 50,000, and advances to
   section 2. The Medallion stays in the inventory.

Without the Medallion in any slot, the Harbor behaves normally. Carrying the
map alone does nothing.

## Section 2: Poseidon's Staff (10,000 Fame)

### João's request

| Stage              | Required action                                                                                   | What changes                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Meet João          | With at least 10,000 Adventure Fame and the Duchess's contract intact, visit the **Franco home**. | Marco asks Pietro to wait; the Duchess introduces João, who asks Pietro to find Poseidon's Staff and bring it to Massawa (messages 155–175). Flag 0 is set; Pietro is ejected. |
| Doubts at the pier | Visit the **Lisbon Harbor**.                                                                      | Camillo doubts the job; Pietro decides to head for Arabia (messages 176–180). Flag 0 is cleared; the subsection advances.                                                      |

Only these two Lisbon routes exist in this subsection. Reaching 10,000 Fame
anywhere else changes nothing until the Franco home is visited.

### The legend trail

The next subsection (table `0x0A06`) uses three scenario variables:

| Variable | Meaning                                   | Possible values                                                                                       |
| -------: | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
|       17 | Port of the Pub which gave the first lead | Any Pub with port ID 72–80                                                                            |
|       16 | Fortune teller's port                     | `18 + random(3)`: Alexandria (18), Jaffa (19), or Beirut (20)                                         |
|       18 | Port of the fortune teller's brother      | `75 + random(6)`, rerolled while equal to variable 17: Cairo, Basra, Mecca, Quatar, Shiraz, or Muscat |

The route sequence is:

1. Enter a **Pub** in a port with ID **72–80**: Aden, Hormuz, Massawa, Cairo,
   Basra, Mecca, Quatar, Shiraz, or Muscat. Pietro asks about the legend
   (messages 195–197). On the first such visit, the bartender says the
   fortune teller in the port of variable 16 may know (message 198). Variable
   17 records this Pub's port and flag 0 is set. Pubs outside 72–80 have no
   story route in this subsection.
2. Visit the **House of Fortune** in the named port (variable 16). The fortune
   teller tells the Staff's legend and sends Pietro to the Pub in the port of
   variable 18, where her family will say more (messages 184–194). Flag 1 is
   set and Pietro is ejected before the ordinary House of Fortune menu, so no
   reading fee is charged. A House of Fortune in any other port behaves
   normally.
3. Enter the **Pub** in the brother's port (variable 18). After the ordinary
   legend exchange and message 200, Pietro repeats the fortune teller's
   message; the brother explains his family's oath to the Atlanteans and
   gives Pietro the map (messages 201–213).

The Pub questioning contains a roll, `random(200)`, meant to be compared with
Pietro's Luck, with message 200, “You said it yourself - it’s only a legend,”
as the failure. As encoded, the roll can never fail.[^luck-address] Once flag 0
is set, other 72–80 Pubs play message 200 and Pietro's “Thanks.” The Pub that
gave the lead repeats the same fortune-teller port.

The brother's port is rolled each time the fortune teller's scene plays. That
scene has no flag guard, so revisiting the House of Fortune in the
fortune teller's port replays it and may name a different brother's port.
The last named port is the one that counts.

### The Map of Staff

The brother's handoff (`0x0C05–0x0C74`) needs an empty inventory slot:

- With all twenty slots occupied, he says, “Say, you’re stowing quite a bit of
  luggage there. Why don’t you come back after you’ve unloaded something,”
  and sets flag 2. A later visit to the same Pub jumps directly to the
  handoff line, “This is the map which shows where the staff is buried.”
- With an empty slot, the scene finds the discovery record whose content is
  item 98, **Poseidon's Staff**, with a flag nibble of exactly `0x80`, sets its
  `0x20` flag, writes the **Map of Staff** (item 88) into the empty slot, and
  also writes the record index into the map's item byte `+0x14`.[^treasure-scan]
  It then clears flags 0–2 and advances the subsection.

The Staff is recovered exactly as the Medallion was: **Go Ashore** at the
map's site and **Search**. The Map of Staff is replaced by Poseidon's Staff.

### Other buildings during the trail

| Building                            | Story behavior                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Harbor in the brother's port        | After the fortune teller's scene: “We’re supposed to ask at the pub in this port.”                        |
| Harbor in the fortune teller's port | After the first lead: “Do you think the fortune teller in this town really knows about Poseidon’s Staff?” |
| Any other Harbor with port ID 72–80 | Camillo suggests asking at the Pub (messages 218–219).                                                    |
| Any other regular Harbor            | “$n, let’s get on our way to Arabia.”                                                                     |

None of these Harbor lines ejects Pietro. The checks are made in the order
shown, so the brother's-port line takes precedence once flag 1 is set.

### Delivering the Staff

After the map is handed over, the subsection's table (`0x0CEF`) adds Massawa
(port 74) routes:

| Building                                      | Story behavior                                                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Massawa Pub                                   | With Poseidon's Staff in any slot: the slot is emptied, event art shows the Staff, and Pietro gives it to João, asking about El Dorado (messages 224–228). **+5,000 Adventure Fame**, capped at 50,000; section 3 begins. Without it: ordinary Pub. |
| Massawa special building                      | With the Staff: Meconbe says João is probably in the Pub, and Pietro is ejected (messages 229–231). Without it: ordinary behavior.                                                                                                                  |
| Other Massawa buildings, Harbor included      | With the Staff: “Joao is over in the pub.” The building stays usable. Without it: ordinary behavior.                                                                                                                                                |
| House of Fortune in the fortune teller's port | “Did you find Poseidon’s Staff?” With the Staff: Pietro shows it and she urges him to Massawa. Without it: “You haven’t found it yet?” The House of Fortune stays usable.                                                                           |
| Pub in the brother's port                     | The brother asks the same question, with equivalent answers (messages 238–241).                                                                                                                                                                     |
| Any other regular Harbor                      | With the Staff: “Let’s take the staff to Joao in Massawa. Hoist those sails!” Without it: ordinary behavior.                                                                                                                                        |

## Section 3: El Dorado and Raul Franco (40,000 Fame)

### Ali's message and Zipangu

| Stage                | Required action                                                                | What changes                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ali's message        | With at least 40,000 Adventure Fame, visit the **Harbor** of any regular port. | Ali Vezas relays João's message: the golden country of Zipangu lies near 35°N 135°E (messages 248–256). The subsection advances; the Harbor menu remains usable. |
| First Japanese port  | Visit the **Harbor** in Sakai (98) or Nagasaki (99).                           | Camillo: this is Zipangu, but not El Dorado (messages 260–261). Flag 0 records Sakai; flag 1 records Nagasaki.                                                   |
| Second Japanese port | Visit the **Harbor** in the other Japanese port.                               | Ernst von Bohr suggests South America, near the equator, 50–70°W (messages 262–272). The Raul threshold is rolled and the subsection advances.                   |

Revisiting the first Japanese Harbor does nothing. Both ports are required, in
either order. The scenario does not change either port's discovery status, so
Sakai and Nagasaki are discovered normally.

The Ernst scene rolls variable 16 as `42 + random(15)` and rerolls while the
result is 46 (Panama). The result is therefore one of the South American and
Caribbean port IDs 42–56 except 46.

### Raul Franco

1. Visit the **Harbor** of a port with ID 42–56. Camillo remarks that South
   America is big (message 276).
2. If the current port ID is **at least** variable 16, Pietro and Camillo find
   the injured Raul Franco. Over event art, Raul tells of El Dorado, the
   medallion he gave to the villagers, his imprisonment by the renegade
   Portuguese army, and his son Leon. Pietro realizes that Raul is Duke Leon's
   father and decides to take him home (messages 277–336). The subsection
   advances.
3. Otherwise Pietro says the search will be tough and suggests asking in port
   (messages 337–338).

The comparison is `port < variable 16 → fail`, not an equality test
(`0x1302`). Every port from the rolled ID through 56 works, and Cayenne (56)
always does. Panama can succeed whenever the roll is 46 or lower. Pietro shows
Raul the medallion in the dialogue, but the route does not check for the item.

While the search is active, other buildings in ports 42–56 play a local's “Just
a legend, my friend” exchange about El Dorado (messages 339–342) without
ejecting Pietro. The Palace, Church, Bank, and House of Fortune have explicit
empty routes and behave normally.

### The ending

In the final subsection (table `0x157D`):

| Building               | Story behavior                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Franco home            | Executes the ending operation `F4 04`, then advances the section (`0x158D`).                                                                             |
| Other Lisbon buildings | Camillo: “Hey $n, we’d better go straight to Duke Leon’s.” The Lisbon Harbor is included because the Lisbon wildcard precedes the any-port Harbor route. |
| Any other Harbor       | Camillo: “Come on men! We’ve got to get Raul back to Lisbon!”                                                                                            |

`F4` blacks out the palette, plays Pietro's ending, and exits to `END.EXE`.
The section advance after it is never reached, because `F4` exits the program.

[^treasure-scan]:
    Both scans, `0x06B1–0x06DE` for the Medallion and `0x0C1A–0x0C47` for the
    Staff, loop over discovery records with `D0 xx 10 <index> 06` and
    `D0 xx 10 <index> 04` and have **no upper bound**: the loop only ends
    when it finds a matching record. New-game initialization places treasures
    90–99 in records that still have flag `0x80`, and the royal special search
    only ever selects treasures 90–96, so in ordinary play both records are
    still in the `0x80` state when Pietro's scenes run. The Staff scene also
    writes the found index into item 88's byte `+0x14`
    (`DC 08 11 58 14`, `11 08 00`), which repeats the new-game mapping. The
    Medallion scene does not write item 87's byte.

[^dig-without-map]:
    The inventory replacement at `0x3A2E1–0x3A308` searches for the item
    whose ID is 10 below the treasure's. If the map is not in the inventory,
    no slot is written, but `0x3A332` still sets the dug-up flag `0x10`. The
    site then no longer passes the `0xA0` test, so Searching without the map
    in hand would lose the treasure permanently. In the story the map is always
    written into the inventory, so this only matters if the map has been
    discarded or sold.

[^luck-address]:
    At `0x0B40–0x0B48` the route executes `DC 01 03 04 14` and `4C 01 07`,
    which make variable 1 a reference to byte `+0x1B`, Luck, of sailor 4,
    Pietro. It then draws `EB 02 00C8`, `random(200)`, into variable 2. The
    test at `0x0B70` is `82 01 02`, a variable-to-variable comparison that
    jumps to the “only a legend” failure when variable 1 is less than
    variable 2. It never reads through the reference with opcode `05`. The
    `DC` handler (`MAIN.EXE 0x38D76`) stores the near address returned by
    `0x37A24`, and group 3 is the sailor table at `DS:0x143A`. Variable 1
    therefore holds `0x143A + 4 × 42 + 0x1B = 0x14FD` (5,373), and the
    comparison handler (`0x38B94–0x38BCB`) compares that address with a draw
    of 0–199. The failure branch cannot be taken because of the roll. It is
    reached only through the separate flag 0 test at `0x0B75`.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Genoa                        | Harbor first, then Pub. Other buildings eject Pietro.                                                                                        |
| Lisbon arrival               | Franco home for the Duchess, then Harbor.                                                                                                    |
| Gold Medallion offer         | Carry at least 10,000 gold, keep an inventory slot empty, and enter a Pub in a port with ID 42 or higher. Answer **No** to pay only 1,000.   |
| Medallion Map in hand        | Go ashore at the map's site with the map in the inventory and Search; then enter any Harbor.                                                 |
| 10,000 Fame                  | Franco home, then Lisbon Harbor. If Marco complains about another contract, the Fame was halved; rebuild it and visit again.                 |
| Poseidon's Staff lead        | Pub in ports 72–80 → House of Fortune in Alexandria, Jaffa, or Beirut as named → Pub in the named brother's port with a free inventory slot. |
| Map of Staff in hand         | Go ashore at the site with the map and Search; then the Massawa Pub.                                                                         |
| 40,000 Fame                  | Any Harbor, then the Harbors of both Sakai and Nagasaki.                                                                                     |
| South America                | Harbors of ports 42–56; Cayenne (56) always qualifies.                                                                                       |
| Raul rescued                 | Lisbon Franco home.                                                                                                                          |

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **The discovery scans cannot fail in unedited play, and hang otherwise.**
  The Medallion and Staff scans have no upper bound.[^treasure-scan] A match
  always exists in unedited play: new-game initialization gives both treasures
  a record in the exact `0x80` state, the lookout skips any record with `0x80`
  or `0x40` set (`MAIN.EXE 0x36C5B`), and the royal special search only selects
  treasures 90–96. Without a match the loop never ends. `D0` passes only the
  low byte of the index variable (`0x38DAB`), and the discovery group
  multiplies that byte by 7 (`0x37B67`). Past record 99 the scan therefore
  reads records 100–255, which overlap the item definitions at save `0x7130`
  and the data after them, and then wraps to record 0. Nothing in that range
  can hold item 97 or 98 in the `0x80` state, so the game hangs after the
  patron's story and payment, before the map is written.

## Open questions

None remain; the last one is answered in [Engine notes](#engine-notes).

[^treasure-scan] In unedited play a match always exists: new-game
initialization gives both treasures a record in the exact `0x80` state, the
lookout skips any record with `0x80` or `0x40` set (`MAIN.EXE 0x36C5B`), and
the royal special search only selects treasures 90–96. What the executable
would do with no matching record, as in an edited save, is unknown: the
loop would run past record 99 into the item definitions at save `0x7130`
and beyond.
