# Leftovers

Features, art, text, and data that are in the game's files but that the
game never uses or that cannot be reached: cut or scrapped content, unused
duplicates, and placeholders. Every entry is settled from the executable,
the data files, or the scenario bytecode; entries marked "already
documented" link to the page that covers them in full.

## At a glance

| What                                                                                       | Where                                                 | Status                                                               |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------- |
| Three vendor-sized pictures: a woman in a pink gown, a craftsman, a nobleman before armour | `GRAPH.DAT` records 18, 19, 21                        | No code can draw them                                                |
| Japanese at-sea and in-port screen frames                                                  | `GRAPH.DAT` records 4, 5                              | Only the English records 2 and 3 are drawn                           |
| **Duel** in the Pub and Lodge sailor menus                                                 | `MENU.DAT` entries 12, 3                              | Cut off by the menus' item counts; no handler                        |
| **Secret Call** in the Palace menu                                                         | `MENU.DAT` entry 16                                   | Cut off; the Duke event runs another way                             |
| Nine menus, including two settings screens and older Guild menus                           | `MENU.DAT` entries 18, 19, 21, 30, 37, 38, 49, 59, 60 | Never loaded                                                         |
| Placeholder lines "this is number N (line N+1)"                                            | `MESSAGE2.DAT` 22, 33, 46, 66                         | No code refers to them                                               |
| An empty Item Shop line, and an older two-line version of the Transfer Cargo warning       | `MESSAGE.DAT` 241; `MESSAGE2.DAT` 28–29               | No code shows them                                                   |
| Three hair tonics for Count Morie                                                          | Items 70–72                                           | No source gives them; likely a cut collector errand                  |
| Expiation, Pardon, a second Balm, and `null`/`Reserve` records                             | Items 28, 45–49, 79                                   | Never obtainable; no handler                                         |
| Shield and Protector item types                                                            | Item types 4, 5                                       | Equipment and shops handle them; duels ignore them; no item has them |
| Second Telescope, Old Map, Treasure Chest                                                  | Items 27, 89, 99                                      | No effect or no source (already documented)                          |
| Two alternate frames of opening scenes, a twinkling star, and a spare © line               | `OPGRAPH.LZW` parts 0, 1, 3, 13                       | The opening never draws them                                         |
| Unreachable greeting and story lines, unused routines and data                             | Various                                               | Already documented                                                   |

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

`ENDGRP.DAT` and `OPGRAPH.LZW` belong to `END.EXE` and `OPEN.EXE`; see
[The opening and the endings](#the-opening-and-the-endings).

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
them either, and the trace of every message call site below, computed ones
included, can produce none of the four
([Every message call site](#every-message-call-site)).

### Messages 241, 1,028, and 1,029

- **Message 241 is never shown.** It is an empty entry in the middle of the
  Item Shop's block (236–248). The Buy command shows 238 or 242, 240, 239,
  and 332, and nothing for a completed purchase; no code produces 241.
- **Messages 1,028 and 1,029 are an older version of a line the game does
  use.** They read “There are items left in the unloading area!” and “Is it
  okay to leave items unloaded?”. The Fleet menu's **Transfer Cargo** screen
  asks the same thing on exit with the single line 1,373, “There are items
  left in the unloading area! Is it still okay to end the transfer
  process?”, or 219, “Is this OK?”, when nothing is left. No code refers to
  1,028 or 1,029.

#### Every message call site

`MAIN.EXE` is the only program that opens `MESSAGE.DAT` and `MESSAGE2.DAT`
(`OPEN.EXE`, `END.EXE`, and the installer contain neither file name). All
general text goes through the combined lookup `0x39336` (`2DFF:5D46`), which
is also called by three wrappers that take the message as their first stack
argument: `0xD2C9` (`0000:7CC9`), `0xD357` (`0000:7D57`), and `0xE395`
(`0000:8D95`). The bank readers `0x3929E` and `0x392EA` are called only from
these four routines.

There are 729 calls to the four entry points (439, 192, 78, and 20). In 667
the message is a constant, and none of those constants is 241, 1,028, or
1,029. The other 62 compute it, and every one is bounded:

| Kind of computation                | Sites                                                                                                                                                                                                                                                                                                                                                                           | Messages reached                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| One of two constants by a flag     | `0x2B023` (0/1), `0x2AC0A`/`0x328E7` (7/8), `0x318A9` (194/256), `0x25414` (211/219), `0x25354`/`0x25414` (219/1,373), `0x2F9F0` (238/242), `0x2FB30` (244/248), `0x2C8A4` (330/331), `0x1EA71` (336/337), `0x1F0CB` (360/361), `0x1F14A` (362/363), `0x1E73F` (442/577), `0x33F7A` (493/494), `0x2A6F3` (762/763), `0x14D63` (810/811), `0x1623A` (831/835)                    | as listed                                                                       |
| Church message + 712 for a Mosque  | `0x32AB3`–`0x32CBB`                                                                                                                                                                                                                                                                                                                                                             | 91–96, 803–808                                                                  |
| Base + a byte or a small value     | `0x14CAD` (787 + 0–3), `0x23AA8` (410 + nation), `0x2E7B2` (410 + 0–15), `0x2B902`/`0x2CEDC`/`0x2D000`/`0xDC77` (385 + a byte), `0x2BAEB` (410 + a byte), `0x2FE92`/`0x2FECB`/`0x300CF` (465 + a byte), `0x33367`/`0x334F3`/`0x3350D`/`0x337AB`/`0x337CD` (302, 78, 793, 486, 1,081 + a byte ÷ 25), `0x2BE35`/`0x2E93A` (859 + `random(2)`), `0x2C1D2`/`0x2C1E8` (44/45 or 861) | 44–45, 78–88, 302–312, 385–720, 486–496, 787–790, 793–803, 859–861, 1,081–1,091 |
| Local tables filled with constants | `0x2C80F` (314–319), `0x2D8B3`/`0x2D95F` (62–65), `0x2E90E` (69–71), `0x1F020`/`0x1EFB0` (358)                                                                                                                                                                                                                                                                                  | as listed                                                                       |
| Data-segment tables                | `0x1B5E1` (`DS:0xA75C`, by protagonist: 50–55), `0x31BB9`/`0x31E83` (`DS:0xB758`: 168–179), townspeople `0xB946`–`0xB9BF` (bases `DS:0x8EF8–0x8F09`: 578, 616–624, 640–643, 1,264–1,294)                                                                                                                                                                                        | as listed                                                                       |
| Values set by the caller           | `0x1C992`/`0x1C9E7` (1,013–1,016), `0x1E139` (572/574), `0x1EC3D` (340–351, from callers passing 340, 344, 348), `0x1F21F` (350–381), `0x2B0F5`/`0x2F89D`/`0x33EF8` (128/129), `0x33EE8` (126/127)                                                                                                                                                                              | as listed                                                                       |
| Generated lists                    | `0x36A51` (`(selector + 255) × 2 + 0 or 1`, selector a byte: 510–1,021); list renderer 20 of the chooser table at `DS:0xA5E0` (`0x19DF7`: 465 + region)                                                                                                                                                                                                                         | 465–472, 510–1,021                                                              |

None of these can produce 241, 1,028, or 1,029. Scenario scripts show general
messages only through `D9`, whose nine formatters use 941–957
([`D9`](../dialog-system/scripts/REVERSE_ENGINEERING.md)).

#### Message 241

The Buy command (`0x2F9CC`) shows `238 + 4 × (not the first selection)`
(`0x2F9E3–0x2F9EC`), 332 for a duplicate weapon or armour (`0x2FA54`), 240
for the price (`0x2FA83`), and 239 for too little gold (`0x2FAAC`). A
completed purchase shows no message: it stores the item and refreshes the
screen (`0x2FAB1–0x2FAE8`). Entry 241 is an empty string.

#### Messages 1,028 and 1,029

The Fleet menu (`MENU.DAT` entry 26, loaded at `0x26377`) is shown with all
seven items (`0x2639B–0x263A5`), and its seventh, **Transfer Cargo**, runs
`0x23BF6` and `0x252FE` (jump table at `0x263B5`). On exit, `0x252FE` adds up
the nine slots of the transfer screen's holding area (`0x2532F–0x25342`,
`0x253DF–0x253EF`) and asks 1,373 if any goods are left in it, or 219 if not
(`0x25348–0x25354`, `0x253FB–0x25414`). 1,373 is 1,028 and 1,029 joined into
one question. `MENU.DAT` entry 37, `Transfer Goods / Buy Goods`, which is
never loaded ([Graphics and menus nothing uses](#evidence-menudat)), may
belong to the same earlier design.

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

### Shield and Protector

No item record has type 4 (**Shield**) or 5 (**Protector**), but the code
still carries a small amount of support for them:

- **Equipping.** Equip treats the equipment types as three slots: a sword
  (types 0–3), a shield or protector (4–5, one shared slot), and armour (6).
  Equipping an item takes off whatever else is in its slot and keeps the
  other two. A shield could therefore have been worn alongside a sword and
  armour.
- **Using.** Trying to use a shield in the field has its own refusal, “Shield
  cannot be used here.”, next to the ones for arms and armour. Protector
  shares the arms line.
- **Shops and item info.** The Item Shop's “You already have one.” check and
  the item-information screen handle types 4 and 5 like any other
  equipment: the information screen shows their type name but no Attack or
  Defense grade, which it gives only to swords and armour.
- **Duels.** The duel setup reads only equipped swords and armour. An
  equipped shield or protector would contribute nothing: there is no shield
  field in a combatant's duel record and no defence term for it in the
  damage formula ([Dueling](dueling.md#executable-formula)).

So shields and protectors were wired into equipping and item handling but
never into combat, and no item of either type exists.

#### Evidence

- **Type names.** The fourteen names are stored in order from `DS:0x051E`
  (`Straight Sword`, `Fencing Sword`, `Curved Sword`, `Heavy Sword`,
  `Shield`, `Protector`, `Armor`, …), with a pointer table at `DS:0x0AD2`
  that the item-information screen indexes by the low type nibble of item
  byte `+0x15` (`0x2F24B–0x2F25C`).
- **Equip** (`0x2F385`). Types 7 and above are refused with message 148,
  “You cannot equip yourself with this item.” (`0x2F395–0x2F3A6`); an
  equipped item is taken off with message 339 (`0x2F3B9–0x2F3D7`); otherwise
  message 378, “Will you put it on?”, asks for confirmation. The routine then
  clears the equipped flag (`0x10` of byte `+0x15`) on every carried item,
  remembering one item per slot in a three-byte array: types 0–3 go to the
  first slot, 4–5 to the second, and 6 to the third (the case ladder at
  `0x2F441–0x2F473`). The chosen item replaces its slot's entry by the same
  ladder (`0x2F47F–0x2F4B1`), and the three remembered items get the flag
  back (`0x2F4B4–0x2F4D9`).
- **Use refusals** (`0x2F4E4`). For types 0–6 a jump table at `0x2F4FE`
  selects message 1385 “Arms cannot be used here.” for types 0–3 and 5,
  1386 “Shield cannot be used here.” for type 4, and 1387 “Armor cannot be
  used here.” for type 6; anything else gets 1388, “This item cannot be used
  here.” It is called for equipment from the item menu (`0x2F8E6`) and the
  emergency-item handler (`0x2F6D4`).
- **Item Shop.** Buying an item already carried is refused with message 332,
  “You already have one.”, when its type nibble is below 7, which includes 4
  and 5 (`0x2FA28–0x2FA58`).
- **Item information** (`0x2F2A7–0x2F308`). Types 0–3 get an Attack grade
  (message 1371, the rating banded into `MENU.DAT` entry 34's `D / C / B / A
/ ^`); type 6 gets a Defense grade (message 1372). Types 4 and 5 get
  neither.
- **Duel setup** (`0x178CC`). For each of the 20 carried items with the
  equipped flag, a type below 4 fills the combatant's weapon ID, family, and
  rating, and type 6 fills the armour ID and adds the rating
  (`0x17936–0x17981`). Types 4 and 5 fall through both tests. The combatant
  record is seven bytes from `DS:0xA482` (weapon ID, armour ID, weapon
  family, weapon rating word, armour rating word) and has no other equipment
  field. NPC captains' equipment, generated in the same routine
  (`0x1798F–0x17A44`), is likewise only a sword and armour.
- **No items.** Every item record's type is 0–3, 6, or 7–13; none is 4 or 5
  (records from file offset `0x43AC8`, 22 bytes each, type in the last byte).

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

## The opening and the endings

The opening (`OPEN.EXE`) and the endings (`END.EXE`) are separate programs
with their own art files.

- **Every ending picture is used.** `ENDGRP.DAT` holds 59 records and
  `END.EXE` draws all of them: seven shared pictures, the ending pictures
  of each main character, and the closing screens. Only one, record 7 (a
  640 × 300 panorama), depends on the state passed in from `MAIN.EXE`.
- **The opening leaves four pieces of art unused**, all in
  `OPGRAPH.LZW`:
  - a second frame of the opening's first sea panorama (part 3, record 1)
    and of the boarding scene (part 13, record 1): near-copies of the
    frames that are drawn, with the sails, flags, and distant ships moved
    slightly, as if each scene was meant to alternate two frames;
  - a five-frame twinkling star, 32 × 32 (part 1, records 4–8);
  - a cream-coloured "© 1994 KOEI Corporation" line (part 0, record 5);
    the title screen draws the blue copy in part 2 instead.

### Evidence: `END.EXE`

`END.EXE` has a 0x200-byte header and its data segment at paragraph
`0x968` (file offset `0x9880`). It opens `A:ENDGRP.DAT` (`DS:0x02E2`),
`B:EVENT*.DAT` (`DS:0x02FE`, the digit patched at `DS:0x0305`), and
`A:END_PUT.DAT` (`DS:0x02F0`) through `0xEAA`. The first two share the
handle `DS:0x007E`; `END_PUT.DAT` is read whole into a buffer
(`0xE37–0xE5E`) and has no record table.

Two routines read records through `DS:0x007E`: `0x29A7` draws record `bx`
at (`ax`, `dx`), and `0x2A57` decodes record `dx` into a buffer for later
blitting. The main routine `0x3A8` takes the protagonist from `MAIN.EXE`
(`int 65h`, function `0x301`, stored at `DS:0x37D0`), loads that story's
sprites from its `EVENTn.DAT` (`0x200`), then opens `ENDGRP.DAT`
(`0x49E`) for the whole ending sequence `0x996` and closes it (`0x4AF`).
Inside `0x996`, only `0xF93` switches the handle to an `EVENT` file to
draw one picture (`0x1442–0x146C`) and switches back.

Every `ENDGRP.DAT` record is reached:

| Records | Size                | Drawn or loaded by                                                     |
| ------- | ------------------- | ---------------------------------------------------------------------- |
| 0–6     | 224 × 160           | `0x872`, a loop over records 0–6 at (`0x1A0`, 0) (`0x87D–0x8B0`)       |
| 7       | 640 × 300           | `0x72E` (`0x733`), called at `0xA34` only while `DS:0x0044` is nonzero |
| 8, 9    | 160 × 104           | `0x6E4`, loaded into buffers (`0x6EC`, `0x6FC`)                        |
| 10–52   | by character        | per-character tables below                                             |
| 53      | 192 × 80            | `0x955` (`0x959`)                                                      |
| 54, 55  | 240 × 328           | `0x8CF` (`0x8D3`, `0x914`)                                             |
| 56      | 640 × 400           | `0x16BC` (`0x16CF`), called at `0x9DD`                                 |
| 57, 58  | 208 × 112, 320 × 40 | `0x996` (`0xD3A`, `0xD48`)                                             |

The per-character records come from four selections on `DS:0x37D0`
(0 João, 1 Catalina, 2 Otto, 3 Ernst, 4 Pietro, 5 Ali):

| Character | Main picture (`0x5D0`, table `CS:0x3E0`) | Second picture (`0x7D4`) | Sprites (`0x66F`, table `CS:0x47F`) | More sprites (`0x704`) |
| --------- | ---------------------------------------: | -----------------------: | ----------------------------------: | ---------------------: |
| João      |                                       10 |                       11 |                               12–14 |                      — |
| Catalina  |                                       15 |                       16 |                               17–19 |                  20–22 |
| Otto      |                                       23 |                        — |                               24–26 |                  27–29 |
| Ernst     |                           37 (304 × 384) |                       38 |                               39–41 |                  42–44 |
| Pietro    |                                       30 |                        — |                               31–33 |                  34–36 |
| Ali       |                                       45 |                       46 |                               47–49 |                  50–52 |

The sprite routines `0x631` and `0x6A6` load three consecutive records
from the given first record into buffers `DS:0x37FA` and `DS:0x37F4`.
`DS:0x0044` starts at 1 and is cleared at `0x479` when the high byte of the
value `MAIN.EXE` passes (`DS:0x37D1`) is nonzero, so record 7 is skipped
only in that case. `0x996` also contains the story texts for each ending;
their references were not traced.

### Evidence: `OPEN.EXE`

`OPEN.EXE` has a 0x200-byte header and its data segment at paragraph
`0xA3E` (file offset `0xA5E0`). It opens `C:OPGRAPH.LZW` (`DS:0x0060`) into
the handle `DS:0x0048` (`0x80E3`). The file is an `LS11` archive of 16
parts, `OPGRAPH.000`–`015` (the names in `OPGRAPH.ls11`), each a GRAPH-style
record table. `0x872B` decompresses part _n_, its stack argument (the
12-byte directory entry at `0x110 + 12n`, `0x874F`), into one of three
buffers (`DS:0x004E`, `0x0050`, `0x0052`). `0x5108` returns the offset of
record `ax` in the buffer `dx`, and `0x48C7` decodes it; all 61 calls to
`0x5108` are paired with `0x48C7`, so these calls are the only way a record
is shown.

The main routine `0x7FC9` loads part 15 into `DS:0x0052` once
(`0x7FF3–0x800C`), then plays the thirteen scenes in the far-pointer table
at `DS:0x0774` in order (`0x8015–0x8040`), repeating until a key is
pressed. Each scene loads its parts and draws:

| Scene (`DS:0x0774` + 4n) | Parts loaded | Records drawn                                                      |
| ------------------------ | ------------ | ------------------------------------------------------------------ |
| 0 `0x5402`               | 0            | 0–4 (`0x5436`–`0x55B7`)                                            |
| 1 `0x5619`               | 1            | 0–3 (`0x565A`–`0x57DC`)                                            |
| 2 `0x584A`               | 3, 4         | 3: 0 (`0x58F8`); 4: 0, 1 (`0x598F`, `0x59BD`); 15: 0               |
| 3 `0x5A90`               | 5, 12        | 5: 0–4 (loop at `0x5AF4`); 12: 1–3 (loop at `0x5B5B`), 0, 4; 15: 8 |
| 4 `0x5F32`               | 6            | 0–7; 15: 2                                                         |
| 5 `0x6409`               | 5            | 0–10; 15: 1                                                        |
| 6 `0x68B3`               | 7            | 0–7; 15: 3                                                         |
| 7 `0x6C90`               | 8            | 0–7; 15: 4                                                         |
| 8 `0x70F8`               | 9            | 0–7; 15: 5                                                         |
| 9 `0x7567`               | 10           | 0–14; 15: 6                                                        |
| 10 `0x7980`              | 11           | 0–10; 15: 7                                                        |
| 11 `0x7BC2`              | 13, 14       | 13: 0 (`0x7C17`); 14: 0, 1; 15: 9                                  |
| 12 `0x7DEF`              | 2            | 0–2 (the title, its copyright line, and "Hit Any Button")          |

Part 15's ten records (0–9) are all drawn from `DS:0x0052`. No call
requests part 0 record 5, part 1 records 4–8, part 3 record 1, or part 13
record 1, and each of those parts is loaded only once, so the four pieces
of art listed above are never shown. Part 1's records 4–8 are under the
100 × 40 size the art exporter keeps, so they are not among the exported
pictures.
