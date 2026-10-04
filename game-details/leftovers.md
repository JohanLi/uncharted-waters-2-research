# Leftovers

Features, art, text, and data that are in the game's files but that the
game never uses or that cannot be reached: cut or scrapped content, unused
duplicates, and placeholders. Every entry is settled from the executable,
the data files, or the scenario bytecode; entries marked "already
documented" link to the page that covers them in full.

## At a glance

| What                                                                                       | Where                                                 | Status                                              |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| Three vendor-sized pictures: a woman in a pink gown, a craftsman, a nobleman before armour | `GRAPH.DAT` records 18, 19, 21                        | No code can draw them                               |
| Japanese at-sea and in-port screen frames                                                  | `GRAPH.DAT` records 4, 5                              | Only the English records 2 and 3 are drawn          |
| **Duel** in the Pub and Lodge sailor menus                                                 | `MENU.DAT` entries 12, 3                              | Cut off by the menus' item counts; no handler       |
| **Secret Call** in the Palace menu                                                         | `MENU.DAT` entry 16                                   | Cut off; the Duke event runs another way            |
| Nine menus, including two settings screens and older Guild menus                           | `MENU.DAT` entries 18, 19, 21, 30, 37, 38, 49, 59, 60 | Never loaded                                        |
| Placeholder lines "this is number N (line N+1)"                                            | `MESSAGE2.DAT` 22, 33, 46, 66                         | No code refers to them                              |
| Three hair tonics for Count Morie                                                          | Items 70–72                                           | No source gives them; likely a cut collector errand |
| Expiation, Pardon, a second Balm, and `null`/`Reserve` records                             | Items 28, 45–49, 79                                   | Never obtainable; no handler                        |
| Shield and Protector item types                                                            | Item types 4, 5                                       | No item has them                                    |
| Second Telescope, Old Map, Treasure Chest                                                  | Items 27, 89, 99                                      | No effect or no source (already documented)         |
| Unreachable greeting and story lines, unused routines and data                             | Various                                               | Already documented                                  |

## Graphics and menus nothing uses

### Summary

- **Three vendor-sized pictures are never shown**: `GRAPH.DAT` records 18, 19,
  and 21 (136 × 112, the size of the building vendors): a well-dressed woman
  in a pink gown, a craftsman at a workbench, and a nobleman before a rack of
  armour. No code path can draw them.
- **The Japanese sea and port screens are still in the data**: `GRAPH.DAT`
  records 4 and 5 are the 640 × 400 at-sea and in-port frames with Japanese
  labels (旋回力, 推進力, 商業価値, 名声, 所持金 …). The game draws only
  records 2 and 3, the English versions of the same frames.
- **Menu items that are cut off**: the Pub patron menu's **Duel**, the Lodge
  sailor menu's **Duel**, and the Palace's **Secret Call** are stored in
  `MENU.DAT` but the menus are shown with one item fewer, so they never
  appear.
- **Menus never loaded**: nine `MENU.DAT` entries are read by no code: an
  extra copy of the fleet-kind menu, a Trade/Piracy/Adventure list, a
  Water/Food/Lumber/Shot menu, two settings menus (one with colour sliders,
  one with event-graphics, layout, mouse, and scroll options), two older
  Guild menus (`Transfer Goods / Buy Goods`, `Job Info / Country Info`), a
  one-item `Environment`, and an entry in garbled half-width katakana.

### Evidence: `GRAPH.DAT`

The game opens `GRAPH.DAT` (the `C:GRAPH.DAT` string at `DS:0x0C10`) into
the handle at `DS:0x05D8` (`0x1B1A0`, `0x1C693`, `0x1C6E2`, `0x379DA`). Only
two routines read that handle: a byte-stream reader (`0xAE69`) and the record
drawer `0xAEB7` (`0000:58B7`), which takes `ax` = x, `dx` = y, and `bx` =
record. All 32 calls to `0xAEB7` were traced:

| Record(s) | How the record is chosen                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–3       | Constants (`0x18F5A`; `0xA5AB`, `0x1B6B9`; `0xD97D`, `0xD988`, `0x22F25`, `0x23041`; `0xE1F7`, `0xE202`, `0x22F13`, `0x23002`, `0x2D31A`, `0x37EAE`, `0x37EBE`) |
| 6–17, 20  | The vendor routine `0xE34E`: `bx = building + 6`, or 20 for building 10 when the Mosque test passes (`0xE362–0xE37B`)                                           |
| 22–27     | Constants (`0x207DB`, `0x17A84`, `0x17A99`, `0x22D1C`, `0x11974`, `0x2D2C7`)                                                                                    |
| 28–52     | The ship routine `0xD3E5`: `bx = ship model + 28`; its five callers pass a ship record's model byte `+0x11` (0–24)                                              |
| 53–56     | `0x15A56`, called with 53–56 only (`0x15B56`, `0x15BBD`, `0x15C76`, `0x15CCD`, `0x15D73`)                                                                       |
| 57–64     | Constants (`0x1E55F`, `0x1F1E6`, `0x1E625`, `0x1C6FC`, `0x1C936`, `0x1C70A`, `0x33C50`, `0x3A6C3`)                                                              |

The vendor routine's building index comes from the building-entry routine
(`0x209F5`, the building under the player, 0–11; the dispatcher rejects
anything above 11 at `0x20965`), from fixed values in building handlers
(`0x2D322` and others), and from `DS:0xBC7A`, which the scenario route
matchers set to the current building (`0x39096`, `0x3912F`, `0x391D7`,
`0x39282`). It can therefore produce only 6–17 and 20. The remaining draw at
`0x379C6` reads the `EVENTn.DAT` files (`C:EVENT*.DAT` at `DS:0x0C02`), not
`GRAPH.DAT`.

No routine produces records **4, 5, 18, 19, or 21**.

### Evidence: `GRAPH2.DAT`

`GRAPH2.DAT` (`DS:0x0B14`) is opened into the same handle only in the
start-menu routine (`0x1C2FB`) and closed again at `0x1C316`. Its two records
(the YES/NO box and the 640 × 400 character-selection screen) are drawn by the
ordinary record-0 and record-1 calls while it is the open file, during the
`Load Game / New Game / Quit Game / Save Game` menu (`MENU.DAT` 56, loaded at
`0x1C181`).

`ENDGRP.DAT` and `OPGRAPH` belong to `END.EXE` and `OPEN.EXE` and are not
covered here.

### Evidence: `MENU.DAT`

Every read of `MENU.DAT` (handle `DS:0x05E0`) goes through `0x39360`, called
by the loader `0x3940A` (`2DFF:5E1A`) and once directly (`2DFF:5D70`, entry
47 at `0x1A437`). Each call site passes a constant entry, except `0x266CC`
(29 or 46, the sea menu with **Anchor** or **Sail**, chosen by bit `0x2000`
of `DS:0x1188`) and `0x2CA20`/`0x2CACA` (44 or 45, nation or pirate fleet
kinds). Menus are shown by `FC4:B4A4` with `bl` = number of items.

**Items cut off by the item count:**

| Entry | Stored items                                    | Shown with | At        | Hidden item |
| ----: | ----------------------------------------------- | ---------: | --------- | ----------- |
|     3 | Meet / Hire / Duel                              |          2 | `0x2EA14` | Duel        |
|    12 | Treat / Gossip / Hire / Duel                    |          3 | `0x2C637` | Duel        |
|    16 | Meet Ruler / Defect / Gold / Ship / Secret Call |          4 | `0x30B2A` | Secret Call |

The dispatch tables behind these menus (`DS:0xB62C`, `DS:0xB54C`, and the
Palace's at `DS:0xB6F0`) hold only the shown items' handlers. The Palace's
Duke event (`0x30B54–0x30B6E`: rank byte `+0x0D` = 9 and bit 1 of `DS:0xE28`
call event 15) runs after any Palace command; it is not reached through the
menu.

**Entries never loaded:**

| Entry | Items                                                                     |
| ----: | ------------------------------------------------------------------------- |
|    18 | Fleet / Merchant Fleet / Battle Fleet (entries 2, 11, 39 are used)        |
|    19 | Trade / Piracy / Adventure (entry 42 is used)                             |
|    21 | Water / Food / Lumber / Shot                                              |
|    30 | BGM / Message Speed / Movement Speed / Blue / Red / Green                 |
|    37 | Transfer Goods / Buy Goods                                                |
|    38 | Job Info / Country Info (entry 1, Job Assignment / Country Info, is used) |
|    49 | Environment                                                               |
|    59 | two strings of half-width katakana in a Japanese encoding                 |
|    60 | Event Graphics / BGM / Layout / Mouse Speed / Scroll Range / Sail Speed   |

## Text, items, and data

In short:

- **Four placeholder lines** in `MESSAGE2.DAT` read "this is number N (line
  N+1)." They sit between tables of real lines, and no code refers to them.
- **Three hair tonics** for Count Morie, the Copenhagen collector, are item
  records 70–72 with descriptions but no shop, reward, story, or code that
  ever hands them out or tests them: a cut collector errand.
- **Expiation and Pardon** (items 46–47), a duplicate **Balm** (45), and
  several `null`/`Reserve` records are never obtainable, and the emergency
  item handler has no case for them.
- **Two item types, Shield and Protector,** are named in the type table, but
  no item has either type.
- The second **Telescope**, the **Old Map**, and the **Treasure Chest** are
  in the item table but do nothing or can't be obtained (already documented).
- Several code paths and data records are present but unreachable: officer
  lookup routines nobody calls, three fleet item bytes nobody reads, two
  anomaly regions that never fire, an unlinked navigation node, residences
  with no occupant, and a handful of scenario lines and routes.

### Placeholder messages

| Combined index | Bank and raw index | Text                               |
| -------------: | ------------------ | ---------------------------------- |
|          1,022 | `MESSAGE2.DAT` 22  | “this is number 1022 (line 1023).” |
|          1,033 | `MESSAGE2.DAT` 33  | “this is number 1033 (line 1034).” |
|          1,046 | `MESSAGE2.DAT` 46  | “this is number 1046 (line 1047).” |
|          1,066 | `MESSAGE2.DAT` 66  | “this is number 1066 (line 1067).” |

The numbers are the lines' own combined indices, and "line N+1" their
one-based line in the source text the banks were built from. Each sits at
the edge of a block of related lines: after the gun-loading refusals
(1,020–1,021) and before the name prompts (1,023–1,026); before the six
per-protagonist mottos (1,034–1,039); after the six per-protagonist naming
requests (1,040–1,045); and before the Harbor's water and food quotes
(1,067–1,069).

A scan of every 16-bit immediate in `MAIN.EXE`'s code (operands of `mov`,
`push`, `add`, `sub`, `cmp`, `imul`, and `lea` from file offset `0x5600` to
the data segment at `0x3BB70`) finds 1,022, 1,033, and 1,046 nowhere. The
only 1,066 is the frame size of `sub sp, 0x42A` at `0x3B122`, not a message
argument. The direct call sites recorded in
`dialog-system/scripts/output/general-message-call-sites.json` don't include
them either. Table-driven and register-computed message indices are not all
traced, so this rests on the scan plus the lines' self-describing text.

### Unreachable message branches (already documented)

- **Pub attendant lines 307 and 308** and the non-Carlotta Lisbon greeting
  depend on protagonist byte `+0x29` bit `0x10`, which nothing sets
  (`0x2D3A6–0x2D3B8`; [Waitresses](waitresses.md)).
- **Ladia's lines 425–428** in Ali's story need scenario flag 1, which no
  route sets in that subsection and no executable routine writes
  ([Ali](scenarios/scenario-6-ali-vezas.md)).

### Items never obtained

Item records are 22 bytes from file offset `277192` (`0x43AC8`): a 17-byte
name, picture slice, price ÷ 100, rating, and type. Descriptions are the
172-byte records of `ITEM.MES`. Shops stock items through each regular
port's three regular and one secret item bytes
([Port metadata](ports.md)); fleets carry items 50–69 as spoils
([Gold and items](naval-battle.md#gold-and-items)); the royal special search
uses maps 80–86 and treasures 90–96
([Royal missions](scenarios/scenario-0-common-quests-and-royal-missions.md)); the stories hand
out the Saber, the Royal Crown, the Medallion Map, the Map of Staff, the Gold
Medallion, and Poseidon's Staff.

The shop records contain items 0–26, 35–43, 50–58, 60–69, and 73–78, nothing
else. The records outside every source are:

| ID    | Name           | Type            | Description (`ITEM.MES`)                                        |
| ----- | -------------- | --------------- | --------------------------------------------------------------- |
| 27    | Telescope      | Voyager's Aid   | “Reserve”                                                       |
| 28    | `null`         | Voyager's Aid   | “Reserve”                                                       |
| 45    | Balm           | Emergency Item  | “Expiation”                                                     |
| 46    | Expiation      | Emergency Item  | “Pardon”                                                        |
| 47    | Pardon         | Emergency Item  | “Reserve”                                                       |
| 48–49 | `null`         | Emergency Item  | “Reserve”                                                       |
| 70    | `106`          | Hidden Treasure | “Hair tonic that Count Morie in Copenhagen desperately needs.”  |
| 71    | `bendadecan`   | Hidden Treasure | “Hair tonic that Count Morie in Copenhagen is rumored to need.” |
| 72    | `chakuses`     | Hidden Treasure | “Hair tonic that may help Count Morie in Copenhagen.”           |
| 79    | `Reserve`      | Straight Sword  | “Reserved”                                                      |
| 89    | Old Map        | Map             | “Reserve”                                                       |
| 99    | Treasure Chest | Hidden Treasure | (empty)                                                         |

- **Hair tonics (70–72).** Price 0, type 13 like the royal treasures, and
  the Balm's picture slice (22). No code compares an inventory slot with
  `0x46`–`0x48`, no story document grants them, and no general or scenario
  message mentions a hair tonic. Count Morie's only collector behaviour is
  the ordinary Contract, Discovery, and Rumor menu
  ([Collector and cartographer dialogue](buildings.md#collector-and-cartographer-dialogue)).
  The three graded descriptions (needs, rumored to need, may help) suggest a
  cut errand in which the player found the right tonic for him.
- **Expiation, Pardon, and the second Balm (45–49).** The names and
  descriptions are offset by one record (45 is named Balm but described
  “Expiation”, 46 is named Expiation but described “Pardon”), as if a record
  was inserted or removed while the table was edited. The emergency-item
  handler (`0x2F6C2`) has cases only for items `0x29`–`0x2B` (Rat Poison,
  Balm, Lime Juice, `0x2F6C9–0x2F6D2`); any other type-9 item gets the
  "cannot be used here" answer (`0x2F4E4`) and is then removed from the
  inventory anyway (`0x2F6EF–0x2F702`).
- **Second Telescope (27), Old Map (89), Treasure Chest (99):** documented in
  [Voyager's aids](at-sea.md#voyagers-aids) and
  [Collector and cartographer dialogue](buildings.md#collector-and-cartographer-dialogue).
  The only code that names item 89 is Locate's `0x50–0x59` range test
  (`0x33F31`).

### Item types with no items

The fourteen item-type names (from file offset `245902`) include **Shield**
(4) and **Protector** (5). No item record has type 4 or 5: swords use 0–3,
armour 6. Whether the equipment and duel code still has branches for them is
not traced.

### Code and data with no effect (already documented)

- **Officer lookups** `0x23DE2`, `0x23E12`, `0x23E42` are never called
  ([Sailors](sailors.md)).
- **Fleet item bytes `+0x1E`–`+0x20`** are filled on returning home but never
  read (`0x3990B–0x39933`; [Gold and items](naval-battle.md#gold-and-items)).
- **Anomaly regions 90 and 449** have wind bit 6 without bit 7, and the
  anomaly check tests bit 7 first (`0x1ECEF`), so nothing happens there
  ([At sea](at-sea.md)).
- **Navigation node 622** duplicates node 621's position and no node links to
  it ([Fleet navigation](npc/fleet-navigation.md)).
- **Residences without occupants.** Cairo, Mecca, Goa, Calicut, and Nagasaki
  have a residence slot but no occupant record and no residence route, so
  they only say “Commodore, this building is locked” unless a wider story
  route plays; Timbuktu's is never reached by any route
  ([Story residences](buildings.md#story-residences)).
- **Scenario leftovers.** Section 0's Palace route repeats the Transport
  Goods offer's port computation and its results are never read
  ([Design notes](scenarios/scenario-0-common-quests-and-royal-missions.md#design-notes));
  Ernst's section-0 wildcard reminder sets flag 0, which nothing tests
  ([Ernst](scenarios/scenario-4-ernst-von-bohr.md)); the section advances
  after `F4` (program exit) in Pietro's and Ernst's endings are never reached
  ([Pietro](scenarios/scenario-5-pietro-conti.md),
  [Ernst](scenarios/scenario-4-ernst-von-bohr.md)).
