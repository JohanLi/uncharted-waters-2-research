# Buildings

Every regular port stores twelve building-coordinate slots in
`raw/ZA_DAT.DAT`. A missing building is encoded as either `(0, 0)` or
`(255, 255)`. The names and order below come from the twelve-entry building
list in `raw/MENU.DAT`; this is the meaning of the numeric keys emitted in each
port's `buildings` object by `scripts/ports/index.ts`.

The game clock advances in 20-minute ticks. Closing times in this table are
exclusive endpoints: a building that closes at 8:00 PM can still be entered at
7:40 PM, and one that closes at 4:00 AM can still be entered at 3:40 AM.

|  ID | Building              | Opening hours                       |
| --: | --------------------- | ----------------------------------- |
|   1 | Market                | 4:00 AM-8:00 PM                     |
|   2 | Pub                   | 8:00 AM-4:00 AM                     |
|   3 | Shipyard              | 4:00 AM-8:00 PM                     |
|   4 | Harbor                | 24 hours                            |
|   5 | Lodge                 | 24 hours                            |
|   6 | Palace                | 4:00 AM-8:00 PM                     |
|   7 | Guild                 | 4:00 AM-8:00 PM                     |
|   8 | Special NPC residence | 24 hours                            |
|   9 | Bank                  | 4:00 AM-8:00 PM                     |
|  10 | Item Shop             | 2:00 AM-3:00 AM and 8:00 AM-8:00 PM |
|  11 | Church or Mosque      | 4:00 AM-midnight                    |
|  12 | House of Fortune      | 4:00 PM-midnight                    |

IDs 1-5 and 7 occur in all 100 regular ports. Supply ports use their own
shared map and have only a Harbor as an interactive facility.

## Greetings and menus

The following are the ordinary greetings in the English DOS data. A story
event, hostile-port state, prior relationship, or access check can replace
one of them. Menu spelling and capitalization are copied from `raw/MENU.DAT`.

|  ID | Building                         | Ordinary opening dialogue                                                                                                                | Main menu                                                       |
| --: | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
|   1 | Market                           | "How may I help you?"                                                                                                                    | Buy Goods; Sell Goods; Invest; Market Rate                      |
|   2 | Pub                              | "Hey sailor, you'll like our [specialty]!"                                                                                               | Recruit Crew; Dismiss Crew; Treat; Meet; Waitress; Gamble       |
|   3 | Shipyard                         | "What brings you to this shipyard?"                                                                                                      | New Ship; Used Ship; Repair; Sell; Remodel; Invest              |
|   4 | Harbor                           | "Ahoy there, matey, will ye be shoving off?"                                                                                             | Sail; Supply; Moor                                              |
|   5 | Lodge                            | "Welcome. You must be tired. Please make yourself at home."                                                                              | Check In; Gossip; Port Info                                     |
|   6 | Palace                           | Access-dependent; a commoner is told, "Commoners are not permitted to enter the palace. Remove yourself from the premises."              | Meet Ruler; Defect; Gold; Ship; Secret Call (event-only)        |
|   7 | Guild                            | "What do you want?"                                                                                                                      | Job Assignment; Country Info                                    |
|   8 | Collector                        | "May I help you?"                                                                                                                        | Contract; Discovery; Rumor                                      |
|   8 | Cartographer                     | "May I help you?"                                                                                                                        | Contract; Learn Skills; Report; Locate                          |
|   8 | Skill teacher or story residence | Person- and event-dependent                                                                                                              | Usually a dialogue or Yes/No prompt rather than a standing menu |
|   9 | Bank                             | "Welcome to the central office of the Marco Polo Bank." in Amsterdam; "Welcome to our regional branch of the Marco Polo Bank." elsewhere | Deposit; Withdraw; Borrow; Repay                                |
|  10 | Item Shop                        | "May I help you?"                                                                                                                        | Buy; Sell                                                       |
|  11 | Church                           | "Welcome to our church."                                                                                                                 | Pray; Donate                                                    |
|  11 | Mosque                           | "Welcome to our mosque."                                                                                                                 | Pray; Donate                                                    |
|  12 | House of Fortune                 | "Welcome to the House of Fortune. What do you want to know?"                                                                             | Life; Career; Love; Mates                                       |

Some commands lead to another menu. `Moor`, for example, opens `Store`,
`Commission`, and `Exchange`; `Remodel` opens `Figurehead`, `Guns`,
`Load Capacity`, and `Rename`. The Pub's `Meet` and `Waitress` commands likewise
open character-specific submenus.

The Palace's **Defect** entry is enabled only at a foreign capital and only
when no royal invitation, offer, or accepted royal mission is active. Its
complete predicate is documented under
[Defection](friendship.md#when-the-command-is-available).

### Vendor portraits and dialogue panels

Ordinary building greetings use a fixed 136×112 vendor image from
`GRAPH.DAT`. Zero-based records 6–17 correspond directly to displayed building
IDs 1–12: the portrait record is normally `building ID + 5`. The
religious-building routine substitutes record 20 for a Mosque.

|  ID | Building              | `GRAPH.DAT` record | Extracted filename      |
| --: | --------------------- | -----------------: | ----------------------- |
|   1 | Market                |                  6 | `graph-006-136x112.png` |
|   2 | Pub                   |                  7 | `graph-007-136x112.png` |
|   3 | Shipyard              |                  8 | `graph-008-136x112.png` |
|   4 | Harbor                |                  9 | `graph-009-136x112.png` |
|   5 | Lodge                 |                 10 | `graph-010-136x112.png` |
|   6 | Palace                |                 11 | `graph-011-136x112.png` |
|   7 | Guild                 |                 12 | `graph-012-136x112.png` |
|   8 | Special NPC residence |                 13 | `graph-013-136x112.png` |
|   9 | Bank                  |                 14 | `graph-014-136x112.png` |
|  10 | Item Shop             |                 15 | `graph-015-136x112.png` |
|  11 | Church                |                 16 | `graph-016-136x112.png` |
|  11 | Mosque                |                 20 | `graph-020-136x112.png` |
|  12 | House of Fortune      |                 17 | `graph-017-136x112.png` |

The vendor image occupies the upper dialogue panel. A story character can
visually cover that presentation with an upper scenario panel, but the vendor
and story portrait are not displayed there simultaneously. The lower dialogue
panel is used by story characters, not by an ordinary vendor. Dialogue does
not need to alternate between the panels; several consecutive lines can remain
in the lower panel.

Scenario position 0 reuses the building-supplied speaker rather than selecting
a portrait through the scenario's `CC` instruction. In a Pub search scene, for
example, the bartender's replies appear in the existing upper vendor panel
while Andreas remains visible in a lower scenario panel. Advancing a line
clears its text but leaves its panel and portrait in place. The `C4` scenario
action is stronger: it closes both scenario panels and exposes the ordinary
vendor presentation underneath.

Portrait artwork and speaker identity are separate for ID 8. Collectors,
cartographers, teachers, and named story occupants all retain residence image 13. The current occupant—Mercator, Gerard de Jode, Olives, Dr. Wolf, or another
character—determines who is speaking and which text or menu is used; it does
not select a different ordinary vendor image.

Poor personal Friendship with the nation controlling a port can replace normal entry with a hostile encounter. The
Palace and ordinary buildings use different encounter probabilities and confiscation rules, documented under
[Hostile-country building encounters](friendship.md#hostile-country-building-encounters). The escape score uses
Swordsmanship and Battle Level.

### Opening-hours implementation

The dispatcher at `MAIN.EXE` file offsets `0x20930-0x209D5` selects one time
predicate from a twelve-entry jump table using the zero-based building index.
With `time` measured in 20-minute ticks since midnight, its complete schedule
is:

|           IDs | Buildings                             | Open predicate                                 |
| ------------: | ------------------------------------- | ---------------------------------------------- |
| 1, 3, 6, 7, 9 | Market, Shipyard, Palace, Guild, Bank | `time >= 0x0C && time < 0x3C`                  |
|             2 | Pub                                   | `time < 0x0C` or `time >= 0x18`                |
|       4, 5, 8 | Harbor, Lodge, Special NPC residence  | Always                                         |
|            10 | Item Shop                             | `0x06 <= time < 0x09` or `0x18 <= time < 0x3C` |
|            11 | Church or Mosque                      | `time >= 0x0C`                                 |
|            12 | House of Fortune                      | `time >= 0x30`                                 |

The schedule dispatch reads only the building index and time. There are no
per-port, inventory, protagonist, or story-state opening-hour overrides in
this routine. Palace rank restrictions, Church/Mosque religious restrictions,
hostile-port behavior, and story events are separate access or dialogue checks;
they do not alter these hours.

### Item Shop late opening

Every Item Shop opens for an additional hour from 2:00 AM through 3:00 AM,
whether or not its port has a Secret Shop Item. Because time advances in
20-minute ticks, the shop accepts visits at 2:00, 2:20, and 2:40 AM and is
closed again at 3:00 AM.

The building-entry dispatcher begins at `MAIN.EXE` file offset `0x20930`. Its
jump-table entry for zero-based building index `9` (displayed as ID 10) leads
to the Item Shop time test at `0x209A8-0x209C3`. The byte at `DS:0x0737` is the
time of day in 20-minute ticks. In pseudocode, the check is:

```text
open = (time >= 0x06 && time < 0x09) ||
       (time >= 0x18 && time < 0x3C)
```

The constants convert as follows:

|   Tick | Time    |
| -----: | ------- |
| `0x06` | 2:00 AM |
| `0x09` | 3:00 AM |
| `0x18` | 8:00 AM |
| `0x3C` | 8:00 PM |

This branch reads only the building index and time. It does not inspect the
port's item records, so the extra opening is not conditional on a Secret Shop
Item. Secret inventory is stored separately in the regular-port metadata in
`DATA1.015`: the byte at record offset `+0x22` is the zero-based secret item
ID, with `0xFF` meaning that the port has none.

### Churches and mosques

Religious buildings share ID 11, but they do not all use the Church interior.
The game uses the port's visual tileset to choose the variant: if an ID 11
building's port has tileset `2`, it is a Mosque; in every other tileset it is a
Church. The tileset byte comes from `raw/CHIP_NO.DAT` and is exposed as
`tileset` by `scripts/ports/index.ts`.

A character who fails the Mosque access check is told, "I respect your
interest, but Christians are not allowed in the house of Allah." Conversely, a
Muslim character trying to enter a Church is told, "I respect you for your
beliefs, but Muslims just aren't welcome here."

This check is not hard-coded to the Ali protagonist. The routine at
`MAIN.EXE` file offsets `0x32CE9-0x32D14` masks the low nibble of the current
player's country/status byte and compares it with `2`, the Turkish value. Ali
starts with that value, so he can use Mosques and is rejected by Churches. The
immediate check is therefore based on the player record's current affiliation
rather than on Ali's protagonist ID.

## Special NPC residences (ID 8)

ID 8 is not one uniform business. The same coordinate slot represents a
collector, a cartographer, a skill teacher, or a story residence according to
the port.

| Kind                  | Port and occupant                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cartographer          | Amsterdam - Mercator; Antwerp - Gerard de Jode; Barcelona - Diogo Ribeiro; Palma - Olives; Venice - Giovanni Verrazano |
| Collector             | Alexandria; Bordeaux; Copenhagen; Lisbon; Pisa                                                                         |
| Skill teacher         | Hamburg - Dr. Wolf teaches Gunnery; Naples - Professor Juliano teaches Celestial Navigation                            |
| Other story residence | Cairo; Calicut; Changan; Goa; Istanbul; Massawa; Mecca; Nagasaki; Sakai; Seville; Timbuktu                             |

Thus Amsterdam has a cartographer, while Naples has the astronomer Professor
Juliano rather than a cartographer. The screenshots show the shared residence
interior, which is why these otherwise different places look alike.

## Port availability

The lists below are derived from `scripts/ports/output/ports.json`, which in
turn is extracted from `raw/ZA_DAT.DAT`. They describe the English DOS data in
this repository.

|     ID | Building                                    | Ports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -----: | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-5, 7 | Market, Pub, Shipyard, Harbor, Lodge, Guild | Every regular port                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|      6 | Palace                                      | Amsterdam, Genoa, Istanbul, Lisbon, London, Seville                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|      8 | Special NPC residence                       | Alexandria, Amsterdam, Antwerp, Barcelona, Bordeaux, Cairo, Calicut, Changan, Copenhagen, Goa, Hamburg, Istanbul, Lisbon, Massawa, Mecca, Nagasaki, Naples, Palma, Pisa, Sakai, Seville, Timbuktu, Venice                                                                                                                                                                                                                                                                                                                                                                                    |
|      9 | Bank                                        | Aden, Alexandria, Amsterdam, Antwerp, Argin, Athens, Azov, Barcelona, Beirut, Bordeaux, Cairo, Calicut, Caracas, Ceylon, Changan, Cochin, Copenhagen, Danzig, Genoa, Goa, Hamburg, Havana, Istanbul, Jamaica, Lisbon, London, Lubeck, Macao, Marseille, Mecca, Mombasa, Mozambique, Naples, Panama, Pernambuco, Pisa, Sakai, San Jorge, Santo Domingo, Seville, Shiraz, Stockholm, Valencia, Venice, Zeiton                                                                                                                                                                                  |
|     10 | Item Shop                                   | Alexandria, Algiers, Amsterdam, Antwerp, Argin, Athens, Azov, Barcelona, Beirut, Bordeaux, Bristol, Cairo, Calicut, Caracas, Cartegena, Ceylon, Changan, Copenhagen, Danzig, Dublin, Genoa, Goa, Hamburg, Hanoi, Istanbul, Jamaica, Lisbon, London, Lubeck, Macao, Margarita, Marseille, Massawa, Mecca, Mombasa, Mozambique, Nagasaki, Nantes, Naples, Panama, Pernambuco, Pisa, Ragusa, Rio de Janeiro, Sakai, Salonika, San Jorge, Santiago, Santo Domingo, Seville, Stockholm, Syracuse, Timbuktu, Trebizond, Tripoli, Valencia, Venice, Zeiton                                          |
|     11 | Church or Mosque                            | Alexandria, Amsterdam, Antwerp, Argin, Athens, Barcelona, Basra, Beirut, Bordeaux, Bristol, Cairo, Calicut, Candia, Cartegena, Ceylon, Cochin, Copenhagen, Danzig, Dublin, Genoa, Goa, Guatemala, Hamburg, Hormuz, Istanbul, Jamaica, Kaffa, Lisbon, London, Luanda, Lubeck, Macao, Madeira, Margarita, Marseille, Massawa, Mecca, Mombasa, Mozambique, Muscat, Nantes, Naples, Pernambuco, Pisa, Quatar, Ragusa, Riga, Rio de Janeiro, San Jorge, Santa Cruz, Santiago, Santo Domingo, Seville, Shiraz, Sofala, Stockholm, Syracuse, Trebizond, Tripoli, Valencia, Venice, Veracruz, Zeiton |
|     12 | House of Fortune                            | Abidjan, Alexandria, Algiers, Amboa, Antwerp, Athens, Azov, Banda, Bankao, Basra, Bathurst, Beirut, Bergen, Bissau, Cairo, Cartegena, Ceylon, Changan, Cochin, Copenhagen, Danzig, Dublin, Genoa, Guatemala, Havana, Hormuz, Istanbul, Jaffa, Jamaica, Kaffa, London, Luanda, Macao, Madeira, Malacca, Malindi, Maracaibo, Marseille, Massawa, Mecca, Mombasa, Muscat, Nantes, Palma, Pisa, Porto Velho, Quelimane, Riga, Rio de Janeiro, Santa Cruz, Santiago, Santo Domingo, Seville, Shiraz, Sofala, Stockholm, Sunda, Syracuse, Ternate, Timbuktu, Trebizond, Valencia, Venice, Zeiton   |

Of the ID 11 ports, the following thirteen contain a Mosque rather than a
Church: Alexandria, Basra, Beirut, Cairo, Hormuz, Istanbul, Massawa, Mecca,
Muscat, Quatar, Shiraz, Trebizond, and Tripoli.

## Data evidence

- `raw/MENU.DAT` record 59 contains the twelve building names in ID order.
- `raw/MENU.DAT` records 1, 2, 5-10, 16-18, 23, 25, and 26 contain the menus
  transcribed above.
- `raw/MESSAGE.DAT` contains the greetings, including message 804, "Welcome to
  our mosque."
- `raw/GRAPH.DAT` records 6–17 contain the twelve ordinary building-vendor
  images in building-ID order; record 20 contains the Mosque vendor.
- `MAIN.EXE` file offsets `0x32BFA-0x32C39` load the current port's
  `CHIP_NO.DAT` byte and classify tileset `2` as the Mosque variant.
- `MAIN.EXE` file offsets `0x209A8-0x209C3` hard-code the Item Shop's two
  opening ranges without consulting its inventory.
- `raw/ZA_DAT.DAT` contains 101 maps of twelve coordinate pairs: 100 regular
  ports followed by the shared supply-port map.
