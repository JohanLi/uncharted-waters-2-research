# SNR reverse-engineering notes

This document records the evidence behind the structural SNR disassembler in
`snr.ts`. Keep confirmed behavior separate from hypotheses: the output is
useful now, but it is not yet a complete scenario-language decompiler.

## Inputs and responsibilities

- `SNR0` through `SNR6` each have a `.DAT` and `.MES` file.
- `.MES` holds null-terminated dialogue strings behind an offset table.
- `.DAT` holds the scenario program that selects messages, speakers, locations,
  conditions, effects, and branches.
- `SNR0` is shared quest content. Protagonist dialogue and player IDs establish
  `SNR1` as João, `SNR2` as Catalina, `SNR3` as Otto, `SNR4` as Ernst, `SNR5`
  as Pietro, and `SNR6` as Ali.
- `MAIN.EXE` loads and interprets the scenario program.

See the maintained [scenario guides](../../game-details/scenarios/README.md) for
the evidence-graded storyline maps built from these programs and runtime
observations.

Known input fingerprints for the English DOS data used during this research:

```text
575afe977111c10f66d444219d2e032a8b1e009c445f013b44d70c90570df28b  SNR1.DAT
0ad7f6ed42c9e22956d4b3973aacceffacb58e42880788019b7e74930d5562b1  SNR1.MES
6a02745af59b9a95918b42c2e5f8fe249a05f2d48bb33a6d54599536cb1a3eeb  MAIN.EXE
```

## Confirmed container formats

Multibyte values described below are big-endian, despite the game running on
little-endian x86.

### MES files

The first `u32` is both the first string offset and four times the message
count. It is followed by one `u32` offset per message. Each offset points to a
null-terminated string. Stored message indices are zero-based; public JSON IDs
are one-based.

For `SNR1.MES`:

- First string offset: `0x1294` (4,756)
- Message count: 1,189
- `$n` means the player's first name.
- `$s` means the player's last name.
- `$dNN` inserts scenario variable `NN` (two decimal digits) as a decimal
  number, and `$rNN` inserts the string referenced by variable `NN`. The
  expander at `MAIN.EXE 0x383E4` handles all four forms.
- Some strings begin with `|Speaker label|\n`. This label is metadata and is
  removed from the displayed body.

### DAT files

Every parsed DAT begins with ASCII `SNDT`. Starting at file offset `0x10` is a
list of absolute `u32` section offsets terminated by `0xFFFFFFFF`.

`SNR1.DAT` has six sections:

| Section |    Start |      End | Parsed code start |
| ------: | -------: | -------: | ----------------: |
|       0 | `0x002C` | `0x0961` |          `0x005E` |
|       1 | `0x0961` | `0x12F7` |          `0x0979` |
|       2 | `0x12F7` | `0x1D4B` |          `0x131D` |
|       3 | `0x1D4B` | `0x2C4C` |          `0x1D7B` |
|       4 | `0x2C4C` | `0x2ED4` |          `0x2C62` |
|       5 | `0x2ED4` | `0x3CCE` |          `0x2EF6` |

### Scenario 0: shared quests and royal missions

`SNR0` is shared content rather than a protagonist-specific storyline. Its 272
messages divide into ordinary Guild/Bank contracts followed by missions offered
by rulers:

| Messages | Content                                                                       |
| -------: | ----------------------------------------------------------------------------- |
|    1–142 | Cargo transport, purchasing, letters, pirate suppression, and loan collection |
|  143–154 | Royal trading test                                                            |
|  155–185 | Deliver documents between rulers                                              |
|  186–216 | Negotiate a treaty                                                            |
|  217–227 | Establish allied ports                                                        |
|  228–237 | Make discoveries for the ruler                                                |
|  238–244 | Special search mission                                                        |
|  245–272 | Defeat a national fleet or pirates                                            |

The royal mission dialogue repeatedly promises and awards a new title. Section
0 selects the largest individual Trade, Piracy, or Adventure Fame value; ties
prefer Adventure, then Piracy, then Trade. Eligibility compares that value
with `500 × (current rank + 1)²`. Pirates are ineligible, and Duke is the
highest title.

The ordinary assignment dialogue uses a distinct compound presentation form:

```text
C0 00 C8 <speaker-label-message:u16be> C8 <body-message:u16be> C7
```

The first MES entry contains only a role label and the second contains the
spoken body. `E9 <flag>` replaces `C7` for a choice prompt.

The extractor propagates pending position, character, and message selections
through the control-flow graph until `C7` or `E9`. This recovers both
branch-dependent paired lines and branch-dependent indirect-character lines.
The result accounts for all 272 `SNR0.MES` entries: 71 paired lines consume
142 entries, 129 indirect-character lines consume 129 entries, and one
ordinary position-0 line consumes the last entry. Noncontiguous sequences
publish their contributing VM offsets as `presentationInstructionOffsets`.

The save-aware query uses the same presentation state while executing the
selected `SNR0` route. Its shared environment currently supplies saved
scenario flags and variables, nation records and directed Relations, the
player fleet record and cargo, inventory, gold, calendar fields, and the
shared-scenario RNG seed. `E9` forks explicit Yes and No outcomes. The Palace
invitation path is a two-stage dispatch. At the protagonist's own capital with
shared flag 17 set, `Meet Ruler` copies the cached mission section from shared
variable 30 into the shared section byte and resets the subsection
(`MAIN.EXE 0x30472–0x3047D`). That mission section's Palace route (`0xA305`,
for example `SNR0.DAT 0x160D–0x1619`) tests and clears flag 17, sets flag 18,
and executes `F0` and `F8`, advancing to subsection 1; context `0x15` then runs
the visible audience offer. The model selects the offer, destination-delivery,
and return transcripts from the mission state.

`DATA1/DATA1.016` and `.017` both contain the same nine fixed-width title names:

| Stored rank | Title                                                |
| ----------: | ---------------------------------------------------- |
|           0 | No Rank (implicit; absent from the title-name files) |
|           1 | Page                                                 |
|           2 | Squire                                               |
|           3 | Knight                                               |
|           4 | Baronet                                              |
|           5 | Baron                                                |
|           6 | Viscount                                             |
|           7 | Earl                                                 |
|           8 | Marquis                                              |
|           9 | Duke                                                 |

The executable contains a related title table. At `MAIN.EXE` file offset
`0x474B8` is this contiguous ten-entry little-endian `u16` table:

```text
0, 500, 2000, 4500, 8000, 12500, 18000, 24500, 32000, 40000
```

This table ends with 40,000, but it is not the royal-mission eligibility rule.
`SNR0` computes the next threshold directly from the next rank, producing
40,500 for promotion from Marquis to Duke.

Each section begins with two tables:

1. A `u16` byte length followed by section-relative entry offsets and a
   `0xFFFF` terminator.
2. Pairs of `u16 route key, u16 table-relative destination`, terminated by
   `0xFFFF, 0xFFFF`.

The second table begins immediately after the first and establishes the VM's
destination base. Adding a route destination to that table's start produces its
absolute file offset. In João section 0, the base is `0x0032`: route key `1`
reaches the pub code at `0x02CC`, and route key `7` reaches the special-building
code at `0x005E`.

Each entry offset from the first table points to another route table. Those
nested tables establish their own destination bases. Branches within code
reached through a nested table use that nested base. This was confirmed from the
interpreter and resolves the earlier apparent destinations inside dialogue
operands.

The route key is two independent bytes, not one opaque `u16`: a selector byte
followed by a qualifier byte. The runtime matcher compares both bytes. A
qualifier of `0xFF` is a wildcard. For protagonist scripts, selectors
`0x00`–`0x63` are the 100 regular port IDs, and selector `0xA3` is the fallback
for any regular port. In port routes, the qualifier is the building/context ID.
For example, `0xA301` means any regular port's Pub and `0xA303` means any
regular port's Harbor. The shared-SNR matcher accepts 130 port selectors
(`0x00`–`0x81`) before its `0xA3` fallback.

## MAIN.EXE scenario VM

The following `MAIN.EXE` offsets are absolute file offsets for the fingerprint
listed above:

- `0x3854F` selects the protagonist digit in `SNR*.DAT` and `SNR*.MES`, opens
  those files, and separately opens the shared `SNR0` pair.
- `0x38593` reads a section offset, loads the selected section into an allocated
  buffer, resets the VM instruction offset, and initializes interpretation.
- `0x382B7` and `0x382CB` read a big-endian byte and `u16` respectively from the
  current scenario stream.
- `0x38F4F` is the interpreter loop. It dispatches on the top two opcode bits.
- `0x38C07` handles `0xC0`–`0xFF` through a 64-entry jump table beginning at
  `0x38C2B`.
- `0x39085`/`0x39129` match and dispatch shared-SNR routes;
  `0x391C6`/`0x3927C` do the same for protagonist routes.
- The ordinary building dispatcher invokes its shared and protagonist entry
  hooks at `0x20A1B–0x20A4C`, tests their returned interaction-control words at
  `0x20A53–0x20A6D`, and only then enters the general hostile-building path at
  `0x20A70`. A zero written by `F8` normally short-circuits before that path;
  the explicit Lodge branch at `0x20A61` bypasses that short-circuit.
- `Job Assignment` sets the selected-job state and invokes the shared matcher
  at `0x32F72` with the current port and qualifier `0x06`. It reuses the Guild
  context rather than introducing a command-only context.
- The `Treat` handler at `0x2BAFA–0x2BC8C` contains no call to either scenario
  matcher or dispatcher. Its royal-invitation branch writes shared flag 17
  directly at `0x2BBCD`.
- `Meet Ruler` begins at `0x3044A` and makes three scenario dispatches using
  the current port: shared context `0x05` at `0x30482`, protagonist context
  `0x15` at `0x3048C`, and shared context `0x15` at `0x3049D`.
- All town call sites pass a concrete port and context. Selector `0xA3` and
  qualifier `0xFF` are fallbacks tested by the matcher, not values supplied by
  a building or menu-command caller.
- Palace handling begins at `0x309A4`. Its hostile-reception branch precedes
  the commoner-admission predicate at `0x30A1B`: an untitled, non-Pirate
  character is rejected at a foreign capital unless shared flag 17 or 18 is
  set. The religious-building handler begins at `0x32CD0` and applies its
  Church/Mosque affiliation gate at `0x32CE9`.
- `0x2052F` dispatches protagonist route selector `0xA0` while at sea and
  supplies the current voyage-day counter at `DS:0x2BAA` as its qualifier.
- `0x150E5`/`0x15107` dispatch selector `0xA1` immediately before protagonist
  and shared naval-battle handling. `0x16191`/`0x1619C` dispatch `0xA2` after
  that handling. The protagonist qualifier comes from `DS:0x0EDA`; the shared
  qualifier comes from `DS:0x0F64`.
- At `0x163F2`, battle setup compares the two participant IDs with
  `DS:0x1439`, the current protagonist's zero-based sailor ID, and stores the
  other participant in both qualifier fields. Thus the `0xA1`/`0xA2`
  qualifier is the opposing captain's sailor ID.

### General message-bank lookup

The startup loader at `MAIN.EXE 0x1B173–0x1B19F` opens the two general message
banks. `MESSAGE.DAT` is stored at `DS:0x05DC`; `MESSAGE2.DAT` is stored at
`DS:0x05DE`. Their filename pointers are `DS:0x0B3E` and `DS:0x0B2E`.

The bank-specific readers at `0x3929E` and `0x392EA` multiply the supplied raw
index by two, read a big-endian table offset from the selected handle, swap its
bytes, and read the null-terminated string. The wrapper at `0x39336` exposes a
single combined namespace: values below 1,000 use `MESSAGE.DAT`; values at or
above 1,000 have 1,000 subtracted and use `MESSAGE2.DAT`. Valid combined
indices therefore run from 0 through 1,422.

The generated `general-message-call-sites.json` scans calls to `0000:8D95`
and `FF2D:5D46` and resolves literal `mov ax, id; push ax` and `push id`
operands through that namespace. There are 554 occurrences of the two call
signatures and 487 currently have a directly recoverable literal ID. The
remainder compute the index in registers and require local data-flow analysis.

The following ordinary-building command groups are now traced:

- The Bank main handler is at `0x2F146`; Deposit, Withdraw, Borrow, and Repay
  begin at `0x2EBF2`, `0x2ED63`, `0x2EE8F`, and `0x2EFF9`. All operate on one
  signed account balance and return to the main Bank menu. Exiting that menu
  prints `MESSAGE.DAT` raw index 164.
- The Item Shop main handler is at `0x2FC9A`; Buy begins at `0x2F9CC` and Sell
  at `0x2FB03`. Each command owns a repeatable item-selection loop and returns
  to the main menu on cancellation. The sell path uses protagonist Luck at
  sailor-record offset `+0x1B` when an initial offer is rejected.
- The religious-building menu is at `0x32C3C`; Pray begins at `0x32AA8` and
  Donate at `0x32AF0`. It derives Mosque messages by adding 712 to the Church
  raw index. Pray's Luck update is guarded to the first Pray command of that
  visit. Donate evaluates its Luck formula only when
  `floor(gold / donation)` is at most 10; a larger ratio shows raw message 94
  and skips the update (`0x32B7A–0x32BDF`).
- The Market main handler is at `0x2AFD1`; Buy Goods, Sell Goods, Invest, and
  Market Rate begin at `0x2A6DB`, `0x2A8C4`, `0x2ABC7`, and `0x2AFA5`.
  Buy Goods delegates its larger selection and transaction loop to `0x2A336`;
  selling rebuilds the cargo list after each transaction, and investment
  selects raw messages 14, 15, or 16 at the 500- and 10,000-gold boundaries.
  Investment raises the port's accumulated commercial-investment word, capped
  at 50,000 (`0x2ABF9`, `0x2AC33`, `0x2ACA5`), and then calls the
  recalculation helpers; it does not add directly to Economy.
  `DATA1.015 0x67DC` (the same slot-relative offset in a save) holds 13
  `0x80`-byte regional definitions: 46 little-endian base-price words, nine
  unnamed words, nine goods IDs at `+0x6E`, and their nine minimum-Economy
  bytes at `+0x77`. Port-metadata offsets in this document are relative to the
  save table framed at slot-relative `0x5966`, as used by the query code; the
  executable's current-port pointer (`DS:0x6790 + port × 0x25`, save
  `0x5968`) makes its own record offsets two smaller. In the save framing,
  `+0x04` is the accumulated commercial investment, `+0x08` the accumulated
  industrial investment, `+0x10..+0x19` the ten saved category rates, `+0x1A`
  the specialty's base-price word, `+0x1C` the specialty good, `+0x1D` its
  requirement, `+0x23` the regional definition ID, `+0x24` the Shipyard
  availability row, and `+0x26` the Pub specialty.
- The Pub main handler is at `0x2D410`. Recruit Crew begins at `0x2B68A`,
  Dismiss Crew at `0x2B739`, Treat at `0x2BC8D`, the Meet patron loop at
  `0x2C6E2`, Waitress at `0x2D102`, and Gamble at `0x2D249`. The Treat command
  calls its Fame/invitation core at `0x2BAFA–0x2BC8C`. Meet and Waitress each
  dispatch their own character-dependent submenu; Gamble transfers to separate
  Black Jack and Dice engines. Current-port metadata byte `+0x26` (executable
  record offset `+0x24`) indexes the 14-entry specialty-name table at
  `DS:0x09A4` and price table at `DS:0x09C0`. A selected Pub patron's Treat
  handler at `0x2C116–0x2C282` charges one local specialty. If the shared
  section is active, shared variable 6 is 11 or 5, shared variable 17 names the
  patron, and shared variable 18 is nonzero, it then transfers to `0x2BF2A` or
  `0x2C021` instead of the ordinary response. Otherwise it adds
  `6 × (patron +0x27 bit 0x40 ? 2 : 1) × (matching low two personality bits
? 3 : 1)` Loyalty, capped at 100. A hostile fleet captain (`DS:0xB4E0 = 1`)
  answers with raw message 861 instead of 44 or 45.
- Per-visit command state lives in data-segment variables that are never
  saved. Pub entry stores `floor(Charm / 3)` in the enthusiasm byte
  `DS:0xB4D8` (`0x2D417–0x2D424`); Treat writes it (`0x2BDAD`), Recruit Crew
  reads it (`0x2B1BE`, `0x2B25F`), and an empty Meet list compares it with 50
  (`0x2C687`): at 50 or more raw message 38 appears under a random patron
  portrait (`0:7B36`), otherwise raw 39. Religious-building entry sets the Pray
  guard `DS:0xC76C` to 1 (`0x32CD0`); Pray adds `random(2)` Luck, capped at
  100, only while it is set and then clears it (`0x32AB9–0x32AE4`). Buy Goods
  loads into the first of the ship's five cargo slots that is empty or already
  holds the same goods, and with neither buys nothing (`0x2A056–0x2A0B4`); Sell
  Goods marks a slot sold down to zero lots empty (`0x2AA39–0x2AA44`). Item
  Shop Sell caps gold at 600,000,000 and empties the first inventory slot
  holding the item without compacting the list (`0x2FC1A–0x2FC6D`).
- The Shipyard main handler is at `0x329B0`. New Ship begins at `0x31D16`; its
  model-selection and order routine at `0x31B2E` calls the hull-material
  selector at `0x31A70` and writes the construction-day count. Used Ship begins
  at `0x31DE9`, Repair at `0x31EE4`, Sell at `0x31FF1`, Remodel at `0x3263D`,
  and Invest at `0x328A4`. Invest raises the accumulated industrial-investment
  word, capped at 50,000 (`0x328D6`), rather than Industry directly. Its
  investment recalculation helpers at `0x3269F` and `0x327C3` are not menu
  commands. Construction completion is an entry-time path distinct from ordering
  a ship. The 11 new-ship availability rows are eight bytes each at
  `MAIN.EXE 0x47270`, with `0xFF` padding; the port metadata's `+0x24` byte
  selects a row and Industry filters the models. Repair charges
  `20 × (missing durability + tacking deficit + power deficit)`, where each
  deficit is the model-table value minus the ship's current value.
- The House of Fortune main handler is at `0x3351B`; Life, Career, Love, and
  Mates occupy `0x33354–0x3351A`. Every reading costs 50 gold. Life classifies
  protagonist Luck, while Mates classifies both the selected sailor's Luck and
  Loyalty in five 25-point bands. Career reads the protagonist's two level/XP
  pairs and greatest Fame value, and Love reads the eligible local waitress's
  favor.
- The Lodge main handler is at `0x2EB43`; its Check In, Gossip, and Port Info
  paths occupy `0x2E846–0x2EB42`. Check In advances to 8:00 AM the next day,
  Gossip reuses the sailor hire/duel interactions, and Port Info renders the
  current port's six national-Support fields. The low-Loyalty conversation in
  which a mate asks to remain in town is not a Lodge command: it is Harbor
  preprocessing at `0x2E55F–0x2E766`, before the Harbor menu loop at
  `0x2E767–0x2E844`.
- The regular Harbor menu dispatches Sail at `0x2D7FD`, Supply at `0x2DC3F`,
  and Moor at `0x2E2E6`. Its entry preprocessing calls the shared national-
  capital helper (`0x0FC4:B44C`, file offset `0x2068C–0x206BF`) at
  `0x2E7E2–0x2E7EF`; when the current regular port is not any of the six
  nation-record capital IDs, it sets the third-entry disabled bit, leaving
  Moor visible but grayed out. Sail rejects a ship with zero navigation crew
  and otherwise classifies projected fleet endurance at 0, 1–9, 10–180, and
  more than 180 days before changing to the at-sea state. Supply loads or dumps
  four provision types subject to cargo space, gold, and port price modifiers.
  Moor dispatches Store, Commission, and Exchange at `0x2DF09`, `0x2E048`, and
  `0x2E18A`; stored ships occupy a shared reserve-record pool and remain local
  to their port. Supply ports instead use `0x2E4E8` and replace Moor with the
  Rename Port handler at `0x2E411`.
- The Guild main handler is at `0x332E3`. Job Assignment begins at `0x32E70`;
  it consumes the three job selectors prepared by idle SNR0. For the chosen
  row, `0x32F5C–0x32F61` writes selector + 1 to the shared subsection byte
  `DS:0x0EE3`, leaving section 0 active, so selectors 0–4 choose section 0's
  entry route tables 1–5. `0x32F66` copies shared variable `3 + row` to
  variable 8 before the dispatch with Guild qualifier `0x06`; this is the
  checkpoint that `EC 08` restores. After a matched dispatch, `0x32F80` sets
  the shared section to variable 6, and the subsection is reset to 0. Country
  Info begins at `0x331DE`, charges 100 gold, and calls the report renderer at
  `0x32F9D`. The report combines cached nation Profit,
  player Friendship, directed Relations, alliance/blockade status, target,
  and merchant-fleet destination.
- The Palace main handler is at `0x309A4`. Meet Ruler begins at `0x3044A` and,
  after scenario dispatch, opens the Sphere of Influence, Letter of Marque,
  and Tax Free Permit submenu. Defect begins at `0x3051D`; Gold and Ship aid
  begin at `0x3063A` and `0x306C2`. Gold consumes nation-record byte `+0x05`
  as thousands of gold. Ship reads the cached ship type at byte `+0x07` and
  decrements its remaining count at byte `+0x08`. The Palace menu's pointer
  table has only four handlers; the fifth `Secret Call` label has no ordinary
  command entry. A separate post-command hook tests Duke rank and a global
  event bit.
- Collector commands occupy `0x335FC–0x339A9`: Contract, Discovery, and Rumor
  begin at `0x335FC`, `0x3365A`, and `0x3384A`, with the menu loop at `0x339AA`.
  The cartographer menu loop is at `0x33F17`; Contract, Learn Skills, Report,
  and Locate begin at `0x33A70`, `0x33B02`, `0x33BFA`, and `0x33D59`.
  Professor Juliano's Celestial Navigation handler starts at `0x34030`, Dr.
  Wolf's Gunnery handler at `0x3418C`, and the residence dispatcher at
  `0x342C7`. The five 24-byte collector records immediately precede the five
  cartographer records in save state and use the same `+0x16` active-contract
  bit; their table begins at save-slot-relative `0x19C2`.

The save-aware query accepts colon-separated ordinary command paths in addition
to building entry. Every ordinary menu command is dispatched: Market,
Shipyard, Pub, Palace, Guild, Harbor, Bank, Item Shop, Lodge, Church/Mosque,
House of Fortune, and the special residences. Supply resolves ship, resource,
load/dump, and quantity selections. Moor reconstructs local dock membership and
capacity and resolves Store, Commission, and Exchange selections. Rename Port
enforces the eight-character and duplicate-name checks. Item Shop reconstructs
daytime or secret-hour stock, item definitions, inventory, equipment, prices,
and deterministic transactions; rejecting a sale offer remains probabilistic
because it uses the unsaved general RNG. Bank reconstructs its signed
hundreds-plus-remainder balance. Career resolves both experience thresholds and
the title table; Love reads the local waitress record; Mates reads the selected
employed sailor's Luck and Loyalty. These resolvers report effects without
mutating the save. The regular-port Supply price modifiers are saved metadata
bytes `+0x12` and `+0x19` (executable record offsets `+0x10` and `+0x17`). At a
supply port, the executable retains its previous regular-port metadata pointer,
which is process state absent from the save; the query therefore leaves priced
loading there unresolved while still resolving Water and all dumping.

Palace paths derive the visited nation from the capital stored in the six
nation records rather than assuming that nation-record order matches the
port-controller order. They resolve the three Meet Ruler choices, inventory
and Fame gates for national documents, both permit confirmations and its
rank-based price, all Defect menu predicates and Friendship effects, and the
cached Gold- and Ship-aid records. The ordinary fifth label, Secret Call, is
reported as unavailable because the Palace dispatch table contains only four
handlers.

Pub Meet and Lodge Gossip share the sailor records and interaction helpers.
The query selects employed mates, locally unemployed sailors, and captains of
fleets currently at the port, while status bit `0x40` selects Pub versus Lodge.
It resolves the duty, roster-capacity, and Pub-only Loyalty gates for Hire.
The experience roll compares `random(20)` with the protagonist's corresponding
ability and combined levels scaled by rank; the candidate's combined levels
and best non-Luck ability determine the three-result wage range. Navigator
Gossip and the exact hiring result remain probabilistic because both consume
the unsaved general RNG. Duel is resolved up to its transfer into the separate
combat engine.

Guild command queries read the three saved job selectors from shared variables
0–2; choosing a row selects the corresponding one of section 0's five entry
route tables, so the shared interpreter returns the actual Old Guild Worker
offer. Country Info reads the cached nation records directly. Special-residence
queries read collector and cartographer contract records, the 100 seven-byte
discovery records at slot-relative `0x6E74`, chart counters at `0x036A` and
`0x036C`, carried treasure maps, protagonist skills and abilities, and the
teacher lesson-price formula. The ordinary discovery list requires flags
`!0x80`, `0x20`, and `!0x10`; selling the discovery sets `0x10`.

Scenario action `EC` is a scenario-RNG checkpoint restore. Its handler at
`0x38E9E` reads a scenario-variable index and calls `0x37FA3`, which loads that
16-bit variable, shifts it left by eight, and stores it as the 32-bit scenario
RNG state. All six reachable uses are `EC 08` in SNR0's Guild-assignment setup
routes.

Scenario action `ED` is the inverse checkpoint save. Its handler at `0x38EA9`
reads a scenario-variable index and calls `0x37FC1`, which shifts the 32-bit
scenario RNG state at `DS:0xBC94`/`DS:0xBC96` right by eight and stores the
low word in that variable. All five reachable uses are in SNR0's idle
Guild-preparation code: `ED 1F`, `ED 03`, `ED 04`, and `ED 05` at
`SNR0.DAT 0x018D–0x01C6`, and `ED 1F` at `0x042D`. Variables 3–5 are the
per-row checkpoints that Job Assignment copies to variable 8 before `EC 08`
restores one of them.

Low-Loyalty battle withdrawal has a separate persistent effect. The setup path
beginning at `0x14C3E` removes a secondary ship from the battle when its
captain's Loyalty is below 40. A later setup pass calls `0000:E8E5` (file
offset `0x13EE5`) for that captain. This helper removes the sailor from the
mate roster, clears fleet and duty, and sets the sailor's port to
`random(54) + 3`. Battle cleanup also empties the commanded ship's active
fleet slot and ship-instance record, permanently removing the vessel and its
cargo. The effect occurs before the battle result and is therefore independent
of whether the protagonist later wins or escapes. Rehiring the sailor does not
restore the removed ship.

The four opcode families are now structurally decoded:

| Range         | Interpreter handler | Role                                       |
| ------------- | ------------------: | ------------------------------------------ |
| `0x00`–`0x3F` |           `0x3873E` | assignment, including scenario flag writes |
| `0x40`–`0x7F` |           `0x3893E` | arithmetic and bit operations              |
| `0x80`–`0xBF` |           `0x38A78` | comparisons with conditional destinations  |
| `0xC0`–`0xFF` |           `0x38C07` | presentation/game actions and VM control   |

Relevant VM globals include current section at `DS:0x060E`, subsection at
`DS:0x060F`, scenario-flag pointer at `DS:0x0610`, variable-array pointer at
`DS:0x0612`, instruction offset at `DS:0x0614`, and the current DAT/MES handles
at `DS:0x0616`/`DS:0x0618`.

The protagonist state occupies `DS:0x0E58` onward: section, subsection, four
flag bytes at `DS:0x0E5A`, and the 64-word variable array at `DS:0x0E62`. The
shared state has the same layout at `DS:0x0EE2`, with variables at
`DS:0x0EEC`. Two variables in each array have executable-side meaning.
Variable 60 (`DS:0x0EDA` and `DS:0x0F64`) receives the `0xA1`/`0xA2` battle
qualifier described above. Variable 63 (`DS:0x0EE0` and `DS:0x0F6A`) is a
greeting-suppression word: the dispatch routines zero it before interpreting
(`0x3914B`, `0x391CF`, `0x38FFB`, and `0x3908E`), and a script sets it with
`0C 3F 0001`. There are 231 such reachable writes across all seven
scenarios: 11 in SNR0, 38 in SNR1, 20 in SNR2, 10 in SNR3, 20 in SNR4, 22 in
SNR5, and 110 in SNR6. The ordinary building main handlers test both words after entry
dispatch and skip their ordinary greeting when either is nonzero, testing the
shared word first: `0x2AFF2` (Market), `0x2D435` (Pub), `0x2E502` (supply-port
Harbor), `0x2E7C8` (regular Harbor), `0x2EB4B` (Lodge), `0x2F14D` (Bank),
`0x2FCA1` (Item Shop), `0x32C52` (Church/Mosque), `0x332EA` (Guild),
`0x33522` (House of Fortune), `0x339B1` (collector), and `0x33F44`
(cartographer). No such test was found in the Shipyard or Palace handlers.
A nonzero shared variable 63 also prevents the
building-entry dispatcher from matching and dispatching the protagonist route
at all (`0x20A32`). The before- and after-battle paths test the same pair at
`0x15121` and `0x161A7`. The save-aware query models this suppression.

The executable dispatches after-battle selector `0xA2` after every battle
except a defeat: battle-result codes 5 and 7 play the defeat music and set game
mode `0x1A` (`0x15D6C`, `0x15DD0`), which skips the dispatch at `0x16101`.
Scripts distinguish a victory from an escape themselves. Catalina's armed
section-6 wildcard route `0xA2FF` begins with `D0 00 03 3C 24`, a reference to
the fleet byte of the sailor in variable 60, the opposing captain, and plays
the informant scene only when that byte is `0xFF`. After an escape the
opponent still commands a fleet, so the route ends silently and the
subsection stays armed. The save-aware query sets variable 60 for battle
actions and treats the opponent's post-battle fleet byte as unknown.

The assignment-source selector table has eight entries, `0`–`7`, dispatched
through `MAIN.EXE 0x387E8`. Selector 0 (`0x387FD`) copies the null-terminated
string buffer at `DS:0x0620` through the reference held in the destination
variable. Action `D4 <message:u16be>` fills that buffer: its handler at
`0x38DD5` calls `0x383A5`, which reads the selected MES entry and expands its
`$d`, `$n`, `$r`, and `$s` placeholders into `DS:0x0620`. The reachable
pattern `D4 <message>; DC 00 03 <sailor> 00|09; 1F 00 00` renames a sailor:
for example, `SNR1.DAT 0x10C2` gives sailor `0x47` the names “Prince” and
“Alberto”, and `0x32AF` gives sailor `0x3C` the names “Pirate” and
“Rudolph”. All 18 reachable `D4` instructions and all 18 reachable
`1F xx 00` selector-0 reads occur in SNR1–SNR3; 17 use this sailor pattern,
while `SNR1.DAT 0x2B35` writes through an unnamed group-`0x0C` reference
(`DC 00 0C 4A 04`). Selector 1 (`0x38821`) returns
the chart-cell index of the current position,
`floor(x / 24) + 90 × floor(y / 24)`; no reachable script uses it.
Selectors 2, 3, and 4 read the stored year offset from 1501, zero-based month,
and zero-based day from `DS:0x0734` through `DS:0x0736`. Selector 5 reads the
current port ID from `DS:0x0E32`. Selector 6 reads the transient duel
balance/result byte at `DS:0xA0A4`; the duel engine keeps it in the range 0–200
and treats the endpoints as terminal outcomes. Selector 7 reads the time of day
in 20-minute ticks from `DS:0x0737`. Their handlers occupy `MAIN.EXE
0x38842–0x3885B`.

Catalina's Lucia sequence confirms selector 4's lifecycle. Its Lisbon Pub
agreement copies selector 4 to persistent scenario variable 0. Later Pub and
Lodge routes compare the current selector-4 value with that stored day and use
scenario variable 16 as an independent interaction counter. Pub or early
Lodge visits increment the counter; elapsed time alone does not. A different
day selects the late dialogue.

The 64-word VM variable array is persisted in each save slot beginning at
relative offset `0x3A`. This is confirmed directly by the 8,000-fame Pub route:
its final `0F 00 05` stores the current port ID in variable 0.

Action opcode `EB <variable> <u16-bound>` assigns a random value in the range
zero through `bound - 1`. Its handler at `MAIN.EXE` file offset `0x38E87` reads
the variable and bound, calls `0x37F4F`, divides a generated non-negative value
by the bound, and stores the remainder in the selected VM variable.

Before each protagonist-scenario dispatch, the routine beginning at
`MAIN.EXE 0x3914A` reconstructs the 32-bit RNG seed from the raw saved date
bytes. `yearByte` is the calendar year minus 1501, while `monthByte` and
`dayByte` are zero-based:

```text
seed = (yearByte
        * monthByte
        * (navigation level + navigation experience)
        + time-of-day ticks
        + dayByte) << 8
```

The shared-`SNR0` routine at `0x38FF4` uses the same formula without the
time-of-day ticks.

Arithmetic wraps to 32 bits. Each `EB` call then advances and reduces the
state:

```text
state = state * 0x5D588B65 + 1       # modulo 2^32
value = (state >> 8) & 0x7FFF
result = value % bound
```

The seed is rebuilt for each protagonist dispatch, so a fixed save state gives
a deterministic `EB` result. The query tool reproduces both the seed and
successive `EB` draws.

Action opcode `EA <variable>` stores the displayed Gold Ingots component in
the selected VM variable. Its handler begins at `MAIN.EXE 0x38E7C`, reads
the destination operand, and calls `0x37F25`. That callee divides the 32-bit
combined on-hand gold value at `DS:0x1432`/`0x1434` by 10,000 and stores the
quotient in the VM variable. The gold address corresponds to save-slot relative
`0x60A`. Thus a stored value of 25,000 is displayed as 2 Gold Ingots and 5,000
Gold Coins: the ingot count is `floor(value / 10,000)` and the coin count is
`value % 10,000`.

Action opcode `EE <variable>` stores the current fleet's free cargo capacity
in the selected VM variable. Its handler begins at `MAIN.EXE 0x38EB4` and
calls the fleet-capacity routine at `0x37FE6`. Transport Goods invokes
`EE 0A`, multiplies variable 10 by 8, divides it by 10, and caps the randomly
generated lot count at that result. The adaptive offer can therefore be as
small as one lot when the capacity routine reports only two free units.

Action opcodes `E6 <variable>` and `E7 <variable>` add and deduct the gold
amount stored in the selected VM variable. Their handlers at `0x38E50` and
`0x38E5B` call the paired money helpers. The repeated `E7` operations in Ali's
debt scenes and the corresponding save changes confirm the subtraction side.

Pietro's section-1 Pub route uses `EA 01`, rejects values below 1, rejects port
IDs below 42, and then scans twenty item records for the empty marker `0xFF`.
The indexed field pattern is `D0 04 06 02 3F`, followed by indirect read
`05 03 04`; variable 2 is incremented from 0 through 19. This resolves the
Golden Medallion activation as at least 10,000 combined on-hand gold, a port ID
of at least 42, and one empty item slot—not 1,000 Adventure Fame plus 2,000
gold.
The resolved reference retains variable 2 as a live index rather than capturing
its value when `D0` runs: the loop jumps back to the indirect `05` read, not to
`D0`, so it advances through occupied inventory slots until it finds `0xFF`.

Ali's section-3 and section-4 Harbor gates use a different indexed pattern.
`D0 01 0C 00 13` selects byte `+0x13` from the regular-port record indexed
by live variable 0. The script scans all 100 records, masks the byte with
`7`, and counts values equal to `2`, the Ottoman/Turkish control value.
This is the same cached controller field used by the Palace economic-power
calculation. The loop covers port IDs 0 through 99 with no capital exclusion,
so Istanbul contributes to the count. The respective thresholds are exactly
30 and 50 ports.

Both sections place Istanbul's specific Harbor route `0x0203` before the
any-regular-port Harbor route `0xA303`. The counting route must therefore be
triggered at a non-Istanbul Harbor. On success it sets the scenario flag
immediately without dialogue; later Istanbul routes expose the result through
Radino's transfer or the Palace summons.

Ali's section-2 building route uses `EA >= 100` to arm the voyage-day-1
transition.

Ali's final Venice Bank sequence also demonstrates persistent price state. On
the first visit, it stores
`min(current displayed Gold Ingots + 500, 10,000)` in scenario variable 21.
Later visits compare `EA` with that cached target. The successful branch does
not subtract the target amount: Howell reveals that the Istanbul house is a
gift.

`AC <flag> <destination>` falls through when the flag is clear and jumps when
it is set. `AD` has the opposite polarity: it jumps when the flag is clear.
`FE <destination>` is unconditional. `F2` stops the interpreter. `F0` and `F1`
request subsection and section advancement after the interpreter returns. The
`F1` path increments the section byte, resets the subsection, clears four flag
bytes, and loads the new section. This independently corroborates the observed
save-state transition at slot-1 file offsets `0x00C7`–`0x00CC` (slot-relative
`0x30`–`0x35`: section, subsection, and the four flag bytes).

The shared-`SNR0` runner post-processes these transitions. After the
interpreter returns, `0x39055–0x3906D` copies the section and subsection back
to `DS:0x0EE2`/`DS:0x0EE3` and resets both to 0 whenever the section changed.
An `F1` in a shared mission or assignment section therefore returns the
shared scenario to idle section 0/subsection 0 rather than to the next
numbered section. Nonzero shared sections are instead selected by executable
writes: after a matched offer, Job Assignment sets the section from shared
variable 6 at `0x32F80`, and `Meet Ruler` copies shared variable 30 into the
section byte at `0x30475`.

`F8` returns the forced-building-exit/menu-suppression result. Its handler at
`MAIN.EXE` file offset `0x38EE3` writes zero through the caller-provided control
pointer held in the interpreter frame. Messages 97–98 at `SNR5.DAT 0x0489` end
in `F8 F2` and eject Pietro from the Genoa Church, while messages 99–100 at
`0x049A` end in `F2` alone and leave the Lodge usable. Ejecting Pub messages
90–91 and wildcard messages 101–102 likewise end in `F8 F2`.

Executable tracing establishes these João route contexts. The first eleven
entries belong to section 0, with `0xA003` reached through its nested table;
the final two, `0xA303` and `0xA3FF`, first appear in section 1:

| Route key | Selector and qualifier meaning                                          |
| --------: | ----------------------------------------------------------------------- |
|  `0x0000` | Port 0, Market                                                          |
|  `0x0001` | Port 0, Pub                                                             |
|  `0x0002` | Port 0, Shipyard                                                        |
|  `0x0003` | Port 0, Harbor                                                          |
|  `0x0005` | Port 0, Palace                                                          |
|  `0x0007` | Port 0, special building (João's home in Lisbon)                        |
|  `0x0009` | Port 0, Item Shop                                                       |
|  `0x000A` | Port 0, Church                                                          |
|  `0x00FF` | Port 0, wildcard context; reaches shared Bank/Lodge/Guild handling here |
|  `0xA001` | At sea on voyage day 1; silently advances João's opening subsection     |
|  `0xA003` | At sea on voyage day 3; nested route that introduces and names Domingo  |
|  `0xA303` | Any regular port, Harbor                                                |
|  `0xA3FF` | Any regular port, wildcard context                                      |

Across all scenarios, `0xA1xx` destinations contain fleet challenges and
other pre-battle dialogue, while `0xA2xx` destinations contain surrender,
search, and other aftermath dialogue. Together with their placement around
the executable's naval-combat path, this identifies selector `0xA1` as
before-naval-battle and `0xA2` as after-naval-battle. Qualifier `0xFF` remains
the wildcard. The two specific qualifiers present in the supplied scenario
files resolve through the save's 120-record sailor table:

| Qualifier | Zero-based sailor ID | Captain          |
| --------: | -------------------: | ---------------- |
|    `0x01` |                    1 | Catalina Erantzo |
|    `0x3C` |                   60 | Antonio Khan     |

The ID names the captain used by the naval-combat system. It need not be the
portrait speaking every line in the surrounding story scene; for example,
other plot characters can introduce or react to that battle.

João section 0 first matches the primary `0xA001` route at DAT `0x08A2`. Its
entire program is `F0 F2`: advance the subsection, then stop. The resulting
nested table at `0x08A4` contains `0xA003`, whose destination `0x08B0` begins
the Domingo dialogue. Thus the third-midnight event is not the meaning of
`0xA001`; day 1 arms the next subsection and day 3 triggers it.

At sea, crossing midnight increments `DS:0x2BAA`; the corresponding handler at
`MAIN.EXE 0x1E979` executes `FE 06 AA 2B`. Going ashore leaves the counter
unchanged; choosing Sail clears it to 0 at `MAIN.EXE 0x2D7B4`
(`C6 06 AA 2B 00`) before the next voyage begins.
The Harbor uses the ordinary building-duration roll of `2 + random(3)`
20-minute ticks. Its entry routine returns that duration, and the town loop
adds it to `DS:0x0737` at `MAIN.EXE 0x204A5` even if the Harbor interaction has
just changed the player's state to at sea. The Sail path itself does not add a
separate tick. The captured 07:00-to-08:00 Harbor/departure interaction
therefore rolled three ticks, or 60 minutes.

A separate uninterrupted at-sea pair moved from April 20 at 23:20 with counter
0 to April 21 at 00:00 with counter 1. Thus `0xA0` receives the number of
midnights crossed during the current voyage: it increments at midnight while
at sea and is reset when the player sets sail, not when the saved state first
changes from sea to port. Arrival's separate one-tick clock increment is at
`MAIN.EXE 0x20521`; it is not a departure cost.

`0x0862` is a DAT dialogue-instruction offset, not another route key. Message
190 at that offset ("Well this is a surprise...") can appear in both the Bank
and Lodge, while message 188 at `0x0851` ("Just a little advice...") can appear
at the Guild. These are branches of João's wildcard scenario handler, not
building-specific ordinary greetings. They are selected by `EB 00 0003` using
the deterministic protagonist-scenario seed described above. Route keys are
therefore not always one-to-one universal building identifiers.

## Confirmed dialogue instructions

Portrait dialogue has this fixed form:

```text
C0 <position> CC <character-index:u16be> C8 <message-index:u16be> C7
```

`position` is currently observed as `1` or `2`. Character and message indices
are stored zero-based and converted to one-based JSON IDs.

Runtime captures resolve the positions spatially: position 1 is the upper
dialogue panel and position 2 is the lower panel. Multiple consecutive lines
may reuse either position. The ordinary vendor image is restricted to the
upper panel; scenario characters can visually cover it there or appear below.
Dismissing a line clears its text while retaining the panel and portrait. The
other panel therefore remains visible, with its previous portrait and an empty
text area, when the next line moves between positions.

Ordinary vendor artwork comes from `GRAPH.DAT`, separately from the scenario
character selected by `CC`. Zero-based records 6–17 correspond to building IDs
1–12 in order. Church/Mosque is the one variant: Church uses record 16 and
Mosque uses record 20. Special residences retain record 13 regardless of
whether their current speaker is a collector, cartographer, teacher, or story
occupant.

Text without a portrait uses:

```text
C0 00 C8 <message-index:u16be> C7
```

Runtime observation of Catalina questioning a Pub bartender establishes the
building-context behavior of position 0. It writes the selected message into
the existing upper vendor panel without a scenario `CC`; the bartender remains
visible while the lower Andreas panel persists with cleared text. Position 0
should therefore be described as using the surrounding building speaker, not
as displaying portraitless text. Its behavior outside building interactions
is not yet generalized.

The same captures distinguish presentation lifetime from the extractor's
structural `dialogueRun` grouping. João's 1,000-coin reward splits two runs but
does not clear either panel. The gold display changes and Rocco replaces the
upper portrait while João remains below. A later `C4`, immediately after João
says “Lucia!”, visibly closes both scenario panels with horizontal wipes,
reveals the ordinary Pub vendor underneath, and allows the following line to
construct a new upper panel.

`SNR1.DAT`–`SNR6.DAT` use `CC` after nonzero dialogue positions. `SNR0.DAT`
instead uses the indirect form:

```text
C0 <position> CD <variable:u8> C8 <message-index:u16be> C7
```

The `CD` handler at `MAIN.EXE` file offset `0x38D5C` reads the one-byte
operand, doubles it to index the VM's 16-bit variable table, loads that word,
and calls the same portrait-selection routine as the `CC` handler at
`0x38D52`.

In the royal-mission sections, variable 50 is recomputed from the protagonist's
current affiliation. The script obtains the player fleet's commander through a
group-2 record, follows the resulting group-3 sailor record to byte `+0x29`,
and masks that affiliation value with `0x07`. It then maps the nation to its
ruler's zero-based character index. Variable 51 is mapped separately from the
diplomatic mission's stored destination-nation variable. Neither selection is
derived merely from the capital building currently on screen.

The six values assigned according to nation are `0x14`, `0x18`, `0x1D`,
`0x1B`, `0x25`, and `0x1C` for Portugal, Spain, Ottoman Turkey, England,
Italy, and Holland respectively. Variable 50 therefore selects the home ruler
for the offer and completion, while variable 51 selects the destination ruler.
Every line remains in position 1, the upper scenario panel. Ordinary Palace
dialogue still selects the ruler belonging to the capital being visited
through a separate location-driven path.

The extractor now recognizes this compound form and records
`characterVariable` separately from a fixed `characterId`. After pending
selections are propagated through branches, 122 reachable `CD` instructions
(98 × `CD 32` and 24 × `CD 33`) produce 129 indirect-character lines in
`SNR0`: 105 through variable 50 and 24 through variable 51.

Consecutive instructions are emitted as a `dialogueRun`. An action, condition,
or unknown instruction between two lines causes a new run even if the player
would regard both runs as one conversation.

## João opening evidence

All offsets below point to the leading `C0`, not the following position byte.

| Event               | First public message |     DAT offset | Completion candidate         |
| ------------------- | -------------------: | -------------: | ---------------------------- |
| Mother at night     |                    2 | `0x0082` (130) | `2C 01 01` at `0x0123` (291) |
| Father introduction |                   23 | `0x0160` (352) | `2C 00 01` at `0x02C4` (708) |
| Initial pub scene   |                   63 | `0x02E1` (737) | `2C 04 01` at `0x0323` (803) |

Examples:

```text
C0 02 CC 0000 C8 0016 C7  João, position 2, public message 23
C0 01 CC 0013 C8 0001 C7  Duchess, position 1, public message 2
C0 01 CC 0061 C8 003E C7  Carlotta, position 1, public message 63
```

The repeated three-byte form `2C <small index> <0|1>` occurs where one-shot
conversations complete. It is therefore classified as a likely Boolean
scenario-state write. Its placement and the save-game comparison below both
support that interpretation.

After João sees the initial Pub introduction, a later visit displays message 62
at `0x02D4` instead of replaying message 63 at `0x02E1`. The introduction writes
`2C 04 01` at `0x0323`, while nearby branches reference flag 4 at `0x02D0` and
`0x02DD`. Boolean flag 4 therefore records whether the opening Pub scene has
already played.

### Save-game scenario state

The game stores all ten save slots in its shared save file; slot 1 begins at
file offset `0x0097`, and each slot is `0x7CC8` bytes. Slot-relative offset
`0x30` (slot-1 file offset `0x00C7`) stores the protagonist scenario section,
and `0x31` (`0x00C8`) stores its subsection; `MAIN.EXE` copies the VM
subsection from `DS:0x060F` to its saved location `DS:0x0E59` at `0x391AE`.
Slot-relative `0x32`–`0x35` (`0x00C9`–`0x00CC`) hold the scenario flags as a
32-bit little-endian bit array: flag `n` is bit `n & 7` of byte `n >> 3`.
`2C <flag> 01` sets the corresponding persistent bit, and both the `E9`
choice writer at `0x37EDE` and the flag comparisons at `0x38AE5` use the same
indexing. The flag bytes are cleared when a section advances. Slot-1 file
offset `0x1E19` corresponds to runtime `DS:0x2BAA`, which `MAIN.EXE` passes as
the qualifier for the at-sea `0xA0` route.

### Save-game clock

The save slot stores the gameplay clock at slot-relative offsets `0x06`–`0x09`.
The offsets below are slot-1 file offsets:

| File offset | Meaning | Encoding                                    |
| ----------: | ------- | ------------------------------------------- |
|    `0x009D` | Year    | Years since 1501; 21 is 1522 and 22 is 1523 |
|    `0x009E` | Month   | Zero-based; value 4 is May                  |
|    `0x009F` | Day     | Zero-based; 16 is May 17 and 17 is May 18   |
|    `0x00A0` | Time    | Number of 20-minute ticks since midnight    |

The human-readable save label beginning at file offset `0x0001` also contains
the displayed date but is not the gameplay clock field.

The mother's time window is now decoded sequentially at DAT `0x007A`:

```text
0F 01 07       read system value 7 (time-of-day ticks) into VM variable 1
8E 01 42 00F7  jump to table-relative 0x00F7 when variable 1 < 0x42
```

`0x42` is 66 decimal, or 22:00 in 20-minute ticks. The branch skips the scene
before 22:00; after midnight the clock returns to zero and also takes the skip.
This gives an inclusive 22:00–00:00 window.

`AC <flag> <table-relative destination>` and
`AD <flag> <table-relative destination>` repeatedly guard these blocks. The
interpreter confirms that `AC` jumps when the flag is set, while `AD` jumps when
the flag is clear.

## Music evidence

The initial pub introduction contains two commands between dialogue runs:

```text
0x02FC  message 66: "Oh, don’t worry, Lucia and I have been friends forever!"
0x0305  C4
0x0306  CA 04
0x0308  message 67: "By the way, ... Rocco came by here looking for you."
```

There is a brief pause and screen clear after message 66. The João theme then
starts when message 67 appears, replacing the ordinary Pub music. These are
independent instructions: `C4` closes every open dialogue panel, while
`CA <track ID>` selects music.

The relevant mappings are `CA 04` for João / “Caprice for the Lute,” `CA 05`
for Catalina, `CA 06` for Otto, `CA 10` for Battle / “The Chase,” and `CA 13`
for Pub / “Fiddler's Green.” The remaining mapped bounds include `00` as
Opening / “Wind Ahead,” `01` as Ending A and the Duke-promotion music,
`02` as Ending B / “Close to Home,” `03` as Initial Setup, and `15` as the
naval-victory Fanfare. Together with the executable's environmental and result
selectors, this completes the PC range `00`–`15`.

The operands are the PC executable's internal hexadecimal track IDs. The
disassembler writes the same values in decimal in generated JSON.

`CA`'s handler at `MAIN.EXE 0x38D20` reads its byte operand and calls the
wrapper at `0x37980`. That wrapper passes the ID to the central music driver at
`0000:952E`. Non-scenario systems call the same driver directly:

- port entry derives `0x0A` through `0x0F` from the port's music-region field
  and calls the driver at `0x20682`;
- ordinary building entry plays `0x13` for a Pub or `0x12` for a Palace at
  `0x20A0E`; other building types make no music call and retain the port track;
- after a naval victory, `0x15B4A` selects `15` for the brief initial victory
  report; after the player acknowledges it, `0x15BB3` selects `11` for the
  post-battle gold/item reward sequence. The defeat path selects `14` at
  `0x15D6E`, and the game-over path does the same at `0x1C8C9`. Another
  non-scenario presentation flow selects raw track `03` at `0x1C2B8`, but that
  flow's exact role remains unnamed;
- the music-option path resumes the saved current track from `DS:0x903A` at
  `0x26BA6` when music is re-enabled.

The disassembler emits all `CA` instructions as `musicCueCandidates` and all
observed `C4` instructions as `sceneBreakCandidates`. No other SNR presentation
opcode has been found to select music. `C3` calls `0x37850`, which closes
only the most recently opened dialogue panel; it is not an alternate music
command. `C4` calls `0x378AD`, which closes every open panel. The interpreter
also calls `0x378AD` on every exit at `0x38FA1`, and `D9` calls it before its
own dispatch.

## Executable palette-blackout evidence

The successful hostile-Palace escape uses an executable presentation sequence,
not an SNR opcode or event-art record. After the protagonist says, "I'm not
about to let myself be captured by the likes of you!", the branch at
`MAIN.EXE 0x3095C–0x309A4` performs dialogue cleanup and calls runtime routine
`0000:98B1`. That routine allocates and zeroes a 48-byte palette—16 colors with
three components each—and sends it through the palette-transition helper.

The caller then passes `20` to runtime delay routine `0000:57D5`. The delay
multiplies its input by six before waiting, giving approximately 120 refresh
intervals, or two seconds at 60 Hz. Runtime routine `0000:98A7` subsequently
passes the normal palette at `DS:0x9052` through the same transition helper.
Only after that restoration does the game show "Whew, that was a narrow
escape!"

Frame measurements confirm the visible result: a roughly 0.27-second fade to
black, about two seconds fully black, and a roughly 0.35-second fade back. This
is distinct from scenario `C4`, which closes dialogue panels without producing
the timed all-black interval.

## Duel and event-art evidence

`E8 <sailor ID>` starts a duel against the specified sailor. The VM handler at
`MAIN.EXE 0x38E66` reads the operand and passes it to the duel setup routine.
Five reachable protagonist-scenario instructions use it:

| Scenario | Duel                            |              Instruction |
| -------- | ------------------------------- | -----------------------: |
| João     | Shipyard confrontation          | `SNR1.DAT 0x0CA6: E8 3C` |
| João     | Franco-home confrontation       | `SNR1.DAT 0x0FFF: E8 3C` |
| João     | South American Pub rescue       | `SNR1.DAT 0x32F4: E8 3C` |
| Catalina | South American Pub rescue       | `SNR2.DAT 0x2965: E8 3C` |
| Otto     | London Pub meeting with Matthew | `SNR3.DAT 0x0284: E8 4B` |

The four `3C` operands select sailor 60, Antonio Khan's record; João's later
Pub scene presents that same record as Pirate Rudolph. `4B` selects sailor 75,
Matthew Loy. After `E8` returns, the scripts read system-value selector 6,
the duel balance at `DS:0xA0A4`, and compare it with thresholds to choose
subsequent dialogue. The balance starts at 100, remains in the range 0–200,
and ends the duel at either endpoint. The extractor records all five calls as
`duelStartCandidates`. Combat rules and the circumstances of each encounter
are documented in [Dueling](../../game-details/dueling.md).

Immediately before message 293, the scenario executes:

```text
0x0D3B  C0 03 CB 0070 0018 00
```

This fixed form occurs 39 times on reachable paths across the protagonist
scenarios and is emitted as an `eventArtCandidate`. There are no reachable
`CB` instructions in `SNR0`. Every call has coordinates `0x0070,0x0018`; only
the final byte varies from 0 through 5.

The `CB` handler at `MAIN.EXE` file offset `0x38D2A` reads two big-endian words
and one byte, then calls the graphics routine through `0x3799A` with the words
as x/y coordinates and the byte as the zero-based record index. The resulting
destination is `(112, 24)`. `MAIN.EXE` keeps an event-art data handle opened
from the `C:EVENT*.DAT` pattern; protagonist scenario `n` uses `EVENTn.DAT`.
Ali's four payment branches contain four separate `CB` calls that all select
record 1. Event art is therefore a bytecode presentation action, not metadata
attached to the selected message.

The conventional sequence is `C4`, `C0 03`, `CB`, followed by a position-2
portrait/message line. The renderer runs before that first line is presented,
so the event art becomes the upper scene image while subsequent dialogue uses
the lower panel. A few branches enter the same art form without an immediately
adjacent `C4`, showing that clearing and drawing are separate operations.

The reachable VM calls do not reference `EVENT0` record 0 or records 2, 3, 0,
2, 5, and 0 in `EVENT1` through `EVENT6`, respectively. This does not prove
that the images are unused: executable-side callers and unreachable bytecode
remain possible.

## Fame evidence

The following nine-byte pattern surrounds explicit storyline fame values:

```text
0C 02 <threshold:u16be> 82 01 02 <destination:u16be>
```

Opcode `0x82` belongs to the comparison family. The low two opcode bits select
the condition: 0 jumps when the operands differ, 1 when they are equal, 2 when
the left operand is less than the right, and 3 when it is greater, using
unsigned comparison. `snr.ts` decodes the family. The final operand is
therefore a table-relative branch destination, although the generated
fame-check summary still labels it `trailingOperand`. For example, the check at
`SNR1.DAT 0x09E9` has operand `0x008A`; adding the nested-table base `0x0969`
gives `0x09F3`, the `F2` path taken when Fame falls short.

João's recognized checks are:

| DAT offset | Threshold |
| ---------: | --------: |
|   `0x09E9` |     2,000 |
|   `0x13C3` |     8,000 |
|   `0x1DDB` |    16,000 |
|   `0x1E60` |    16,000 |
|   `0x2CCA` |    30,000 |
|   `0x2F5F` |    40,000 |

The scenario record references identify the Fame category used by each
protagonist:

| Scenario            | Fame category  |
| ------------------- | -------------- |
| João, Pietro, Ernst | Adventure fame |
| Otto, Catalina      | Piracy fame    |
| Ali                 | Trade fame     |

Catalina's first comparison uses Piracy Fame 1 and selects message 173,
Emilio's warning about a harbor rumor. The ordinary Harbor dispatcher adds no
higher effective Fame requirement.

The same route does not place the five Spanish fleets around Catalina's current
position. At `SNR2.DAT 0x0892–0x08E8`, it loads the literal coordinates
`(0x008E, 0x0176)`, or `(142, 374)`, and writes them to fleet IDs 15–19. It then
sets objective 7, target sailor 1 (Catalina), and flags `0x41`. Seville's raw
port coordinate is `(142, 372)`. Thus the fleets spawn immediately outside
Seville and pursue Catalina from there.

At 1,500 Piracy Fame, an eligible ordinary building selects messages 230–239
and advances the subsection. The route continues only when the current port ID
is **below 42**.

At 1,999 Fame, the section-2 Pub questioning repeats indefinitely. At 2,000,
the same visible questioning runs once but `F1` advances to section 3. The next
Pub visit in section 3/subsection 0 deliberately has no story dialogue and uses
`F0` to advance the subsection. A third Pub visit then selects messages
257–259, beginning with Andreas's reminder that they still have not found João.

Catalina's section-4 search contains a similar-looking but structurally
different transition. After the first Pub questioning at Perot's selected
port, the next subsection's table gives the Pub, Palace, and context `0x15`
explicit stop routes. Messages 372–375—the decision to wait for João—are on
the `0xA3FF` route and run only when the current port still equals Perot's
stored destination. Entering an eligible ordinary building selects this route;
returning to the Pub then produces messages 377–388. Thus the correct sequence
is Pub → wildcard-routed non-Pub building → Pub, not three consecutive Pub
visits.

The query now resolves this directly. `DC 00 01 <protagonist> 00` obtains the
14-byte protagonist Fame-record reference, `4C` advances that reference to the
required Fame word, and assignment opcode `04` reads the little-endian word.
The analogous group-3 reference and byte read resolve the sailor affiliation
check. These reads remove the formerly ambiguous branches from the Catalina
1,500- and 2,000-Fame queries.

### Cartography and Ernst's map reports

Drawing a map requires both the Cartography skill and a signed cartographer
contract. Cartography is bit
`0x08` in the sailor skill mask. Known cartographers are Mercator in Amsterdam,
Gerard de Jode in Antwerp, Diogo Ribeiro in Barcelona, Olives in Palma, and
Giovanni Verrazano in Venice; each can teach the skill or accept a contract.

The chart bitmap begins at runtime `DS:0x0F6C`, which is save-slot-relative
offset `0x0144`. It occupies 540 bytes: 45 rows with a 12-byte stride. Each row
contains 90 usable chart bits and 6 padding bits, giving 4,050 cells. This is a
finer grid than `world-map-grid.png`, whose 30 × 15 cells describe wind and
weather regions. A chart cell corresponds to 24 × 24 pixels in the 2160 × 1080
`world-map.png`, or 6 × 6 pixels in the 540 × 270 world-map viewport framed by
`graph-025-640x400.png`.

New-game initialization at `MAIN.EXE` file offset `0x1B90A` clears the bitmap,
then sets columns 4–16 and rows 8–17: a 13 × 10 rectangle containing 130 cells.
It also increments the total-known counter at `DS:0x1192` to 130.

The chart-update paths around file offsets `0x0BF20` and `0x0C100` increment
both `DS:0x1192` and the unreported-cell counter at `DS:0x1194` only when a
previously clear bit is set. At `0x33D10`, the report routine multiplies the
unreported count by 5, limits the addition so total adventure fame does not
exceed 50,000, adds it to the protagonist's adventure-fame field, and resets
`DS:0x1194` at `0x33D4D`.

The preceding calculation at `0x33CA0` computes the gold reward as:

```text
new chart cells × 20 × (5 − (cartographer[0x16] & 0x03))
```

The five 24-byte cartographer records are consecutive save-state records for
Giovanni Verrazano, Gerard de Jode, Diogo Ribeiro, Olives, and Mercator. Every
record contains `0x09` at `+0x16`, so every known cartographer has modifier 1
and pays 80 gold per cell. The field's broader gameplay meaning remains
unknown, but it does not distinguish these cartographers' rewards.

The 4,050-cell grid leaves 3,920 cells outside the initial rectangle. At the
executable's map-report reward of 5 adventure Fame per new cell, reporting all
of them yields at most 19,600 Fame. Any larger adventure-Fame total after
charting most of the world must therefore also come from sailing or making
discoveries.

The map-completion branch at `0x33C2C` compares the total-known counter with
3,300. Because 130 cells begin revealed, this requires 3,170 of the 3,920
initially hidden cells, approximately 80.87%. The threshold is independent of
which cartographer has the active contract.

The five-record table begins at save-slot-relative offset `0x1A3A`; each
record is 24 bytes, with its port ID at `+0x17`. The active-contract flag is
bit `0x10` at `+0x16`, in the same byte as the two-bit reward modifier. Ernst's
first Mercator scene changes Mercator's byte from `0x09` to `0x19`, before the
required Harbor visit. The Harbor visit advances the story from section
0/subsection 1 to section 1; it does not grant the contract. That transition
stops the Mercator reminder from ejecting Ernst and allows the ordinary
cartographer menu, including Report, to remain open. Ernst therefore receives
Mercator's contract automatically rather than explicitly choosing Contract.

The executable independently confirms the interpretation. The ordinary
contract handlers at file offsets `0x33600` and `0x33A70` clear bit `0x10`
from the other records and set it on the selected cartographer. The menu path
tests the same bit at `0x339C3` and `0x33A07`; the report-reward calculation at
`0x33CB9` masks the same byte with `0x03`, leaving contract status separate
from the reward modifier.

Scenario action `DC` resolves a game-state field reference and stores it in a
VM variable; its handler is at `MAIN.EXE 0x38D76`. In the cartographer pattern,
`DC 00 04 <record> 16` makes variable 0 refer to byte `+0x16` of cartographer
record selector `0x05`–`0x09`, in the order Giovanni, Gerard, Diogo, Olives,
and Mercator. Assignment opcode `05` reads through the reference and `11`
writes through it.

Ernst section 1 uses this mechanism at `SNR4.DAT 0x035F`. It reads Mercator's
byte, masks it with `0x10`, and selects message 77 when Mercator is active. A
clear Mercator bit selects messages 78–81, accusing Ernst of holding another
cartographer's contract. The following writes reactivate Mercator and clear the
other four records. Thus merely visiting Mercator during this story section
forcibly renews his contract.

Comparison lower bounds are inclusive and upper bounds are exclusive. João's
2,000-adventure-Fame event is armed by visiting a regular-port Harbor, not by
calling at port, advancing time, Navigation experience, or a port-call counter.
The primary `0xA303` route advances subsection 0 when its Fame check passes;
the subsequent Pub route then selects message 227.

This matches the SNR exactly. The primary `0xA303` route is the regular-port
Harbor context. It checks João's identity and adventure fame against 2,000,
then executes `F0`, requesting a subsection advance when the interpreter
returns. No time or port-call-counter test exists in the block.

Eligibility is latched by that Harbor-triggered subsection transition. The Fame
comparison is in the primary `0xA303` route, while the subsection-1 Pub handler
never checks Fame again.

After the Harbor visit qualifies, advancing time inside the port by checking
into the Lodge still permits the Pub scene.

The route's decoded SNR instructions do not themselves test navigation level or
a port-call counter. Before the fame comparison they dereference João's sailor
record byte `+0x29`, mask its low nibble, and require zero. The protagonists'
low nibbles identify their nation/character values; zero is João. It then reads
João's adventure-fame field and compares it with 2,000. If navigation level or
port-call count matters, it governs whether the engine invokes the route rather
than appearing as another condition inside this SNR block.

The resulting Pub handler at `0x0A23` reads system value 5, now statically
identified as the current port ID, and rejects IDs 0, 1, and 2: Lisbon, Seville,
and Istanbul. Barcelona (3), Valencia (6), and Bordeaux (27) are confirmed or
reported to work. It also accepts time ticks `0x0D` through `0x33` inclusive
(04:20–17:00) before starting message 227 at `0x0A9F`. Since the Pub itself
does not open until 08:00, the effective player-observed window is 08:00–17:00.
Checking into the Lodge and advancing time while remaining in port still allows
the event as long as the Pub is entered by 17:00.

The Pub dialogue sets flag 0. The optional first Lodge visit shows messages
270–271 and sets flag 8; revisiting then shows message 269. Flag 0 alone permits
the Shipyard confrontation beginning with message 274. The Shipyard sequence
sets flag 1 and clears flag 0, while the Port revelation beginning at message
240 advances subsection 1 to 2. The home confrontation and successful duel set
flag 5 at `0x10D8`, and the Palace trial sets flag 2 at `0x126C`. Section
1/subsection 2 remains active after the trial.

Returning to João's father after the trial presents message 310 and its player
choice, then sets flag 3 at `0x0F60`. During this departure stage, entering a
building other than the Harbor makes Prince Alberto say messages 394–395—
“$n, it was certainly fun, but we both have things that we must do” and
“Let me walk you to the port. Let’s go.”—without ejecting João from that
building. The reminder can therefore recur while the player continues using
town buildings.

Visiting the Harbor selects a different scene, messages 361–362: Alberto says
he must return to the Palace, and João says farewell. The route then sets flag
4 at `0x1159`. Flag 3 remains a historical departure-stage marker after
Alberto has left; it is not simply “Prince currently present.” Flag 4 is
the more precise “Harbor farewell completed” marker and suppresses subsequent
reminders.

The final section-1 route is `0xA001`, the first day at sea. It advances to
section 2 only when flag 4 is set. Thus the complete transition is father-house
aftermath → optional building detours → Harbor farewell → set sail → at-sea day
1 → section 2. Merely setting sail does not advance the section. The decoded
`0xA001` route runs on voyage day 1; its `F1` transition clears all four
scenario-flag bytes.

The father-house aftermath presents message 310 as a player choice:
“Hmm... I wonder. $n, what do you want to do? Are you going to quit sea
travel?” Unlike ordinary lines, its selected-message instruction is followed by
`E9 10` rather than `C7`. `E9` is a choice prompt; operand 16 is immediately
tested as a flag. The set branch leads to messages
311–317, where João offers to stay and help his father. The clear branch leads
to messages 318–320, where he chooses to continue seeking Atlantis. This choice
controls dialogue within the scene; both branches eventually continue the
scenario.

Ceuta (port 26) remains eligible after visiting its Harbor. The Pub bytecode
does not test a 13-region identifier.

The event then continues through the Shipyard confrontation and duel,
Catalina's intervention, Port explanation, and the return to Lisbon for Duke
Franco's trial. Entering the wrong building at intermediate stages produces
context-specific warning dialogue and often forces the player back outside.

## João's 8,000-fame trigger

The next section contains an inclusive 8,000 adventure-fame check at `0x13C3`.
It cannot run until the preceding 2,000-fame story has finished and João's save
has advanced to section 2/subsection 0; reaching 8,000 early does not bypass the
current story section.

Unlike the 2,000 event, the primary trigger is `0xA3FF`: the wildcard context
for any regular port. It checks João's identity and adventure fame and executes
`F0` when fame is at least 8,000. It does not require a Harbor visit. The
specific João-home route `0x0007` takes precedence.

An ordinary building can activate this wildcard route; it is not
Harbor-specific. If the triggering action is itself a Pub visit, that first
visit only advances the subsection, and entering a Pub again shows the story
warning.

In subsection 1, the first regular-port Pub visit with clear flags begins:

| Message | Speaker                       | Text                                                                                                              |
| ------: | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
|     425 | Building speaker (position 0) | Say, aren’t you that famous mariner, $n?                                                                          |
|     426 | João                          | I don’t know whether I’m famous or not, but I’m $n for sure.                                                      |
|     427 | Building speaker (position 0) | Hey, you’d better be careful. That Portuguese hunting red-haired pirate has been asking the whole town about you. |
|     428 | Rocco                         | Ye needs to learn to keep ye big trap shut! We’d better get out of here.                                          |

That warning sets flag 0. Its path contains no clock or current-port-ID check,
so the bytecode does not exclude Lisbon, Seville, or Istanbul as the 2,000-fame
Pub handler does. Normal building opening hours still constrain when the player
can enter. The route sets flag 0 and stores the current port ID in scenario
variable 0.

Subsequent Pub or other-building visits can produce port-dependent warnings.
The handler reads the current port into variable 1 and compares it with the Pub
port retained in variable 0. Continuing in Seville and entering the Lodge shows
messages 440–441. It then executes `EB 00 00 02`, selecting either 0 or 1, and
Catalina appears only when the result is zero, giving a 50% chance on an
eligible visit. Her branch shows messages 444–447, plays `CA 10` (the battle
theme “The Chase”), and
sets flag 1. The following Harbor scene clears flags 0 and 1, sets flag 2, and
prepares an at-sea-day-1 transition. This begins a longer multi-subsection
Catalina pursuit that ultimately includes a naval encounter with her.

The Harbor scene is messages 429–437. João asks whether Rocco is all right;
Rocco returns and says he tied Catalina up in the merchant's storage room, then
urges João to leave. The following `0xA001` voyage-day-1 route requires flag 2,
clears it, and executes `F0`, advancing the story to subsection 2.

## Remaining action opcodes

The last eight unnamed reachable action opcodes are decoded from their
handlers. File offsets are for the fingerprinted `MAIN.EXE`; the handlers are
reached through the jump table at `0x38C2B`.

| Opcode | Form                    |   Handler | Effect                                                                                                  |
| -----: | ----------------------- | --------: | ------------------------------------------------------------------------------------------------------- |
|   `C9` | `C9 <var> <mes:u16>`    | `0x38D00` | Forced menu from the `\n`-separated lines of an MES entry; the zero-based choice goes into the variable |
|   `D1` | `D1 <var>`              | `0x38DCA` | Recomputes the course of the fleet whose ID is in the variable                                          |
|   `D9` | `D9 <table> <selector>` | `0x38DE0` | Closes all panels and shows a formatted `MESSAGE.DAT` Guild or royal-mission line                       |
|   `E4` | `E4 <var>`              | `0x38E45` | Sets carried gold to the signed 16-bit variable, capped at 600,000,000                                  |
|   `F4` | `F4 <ending>`           | `0x38ECB` | Blacks out the palette, plays the protagonist's ending, and exits to `END.EXE`                          |
|   `F9` | `F9 <type> <unused>`    | `0x38EEC` | Creates a pending ship of the given model in the first free player-fleet slot                           |
|   `FA` | `FA <unused> <mes:u16>` | `0x38F01` | Commissions the pending ship, names it from the MES entry, and assigns its captain                      |
|   `FB` | `FB <sailor>`           | `0x38F14` | Adds the sailor to the mate roster as an unassigned mate                                                |

`C9` builds the menu at `0x384C9` and runs it through `0FC4:41F1` with the
cancel flag cleared, so the player must choose. João's Lisbon Church offer
(`Accept`/`Donate`/`Refuse`), Otto's informant payment (`Pay`/`Bargain`/
`Don't Pay`), and Ali's Istanbul Lodge offer (`Accept`/`Refuse`) use it.

`D1` calls `0x37BDC`, which selects fleet record `DS:0x2C08 + 0x85 × id` (save
`0x1DE0`) and calls `2DFF:608F`. The scripts first write the fleet's position,
order type `+0x1B`, order target `+0x1C`, and flags `+0x29 = 0x41` through
group-`0x08` references. For order types 0–3 and 9 the target is a port, whose
coordinates become the destination. Type 4 follows the player. The other types
target a sailor's fleet: type 7 pursues, as in every story interception, and
type `0x0A` follows, as in Ezequiel's escort. `D1` writes no VM state.

`D9` calls a static stub that indexes nine formatters at `DS:0xB438`. Each
formatter prints a `MESSAGE.DAT` line through `2DFF:5D46` with values taken
from shared variables 9, 12, 18, 19, and 20, the goods-name table, item and
discovery names, and the protagonist's title and surname:

| Selector | Message   | Content                                            |
| -------: | --------- | -------------------------------------------------- |
|        0 | 941       | Head Trader's delivery offer (lots, goods, months) |
|        1 | 942       | Royal treasure-quest offer                         |
|        2 | 943       | Treasure delivered                                 |
|        3 | 944       | Treasure not yet found; an `E9` prompt follows     |
|        4 | 945       | “From this day forth, you shall be known as …”     |
|        5 | 946, 957  | Old Guild Worker's pirate-extermination offer      |
|        6 | 948 / 949 | Pirate job partly done: days and pirates remaining |
|        7 | 950       | Discovery mission complete, with a title           |
|        8 | 955       | Partial discovery credit                           |

Selector 4 reads the rank after the script has incremented it, so it names the
new title. Discovery names use “the ” except for the nineteen discoveries
listed at `DS:0xB3B2`.

`F9` (`0x3804B`) takes the first player-fleet ship slot whose status is not
active or pending and the first free ship instance. It writes the model's
statistics at 90% durability, sets the slot status to `0x20` (pending), clears
the matching supply record, and sets the current port's construction timer to 0. `FA` (`0x38193`) turns the pending slot active (`0x10`), names the instance,
makes the protagonist its captain (duty 1) or else the first roster mate with
duty above 2 (duty 2), and clears the port's Shipyard order (`0xFF`).

`FB` (`0x38239`) writes the sailor into the first empty roster entry (save
`0x1D85`), sets duty `+0x26` to 6, and copies the protagonist's fleet and port.
Unlike Pub hiring, it does not change Loyalty or the wage. Scripts then often
set duty 3 (First Mate) directly.

### Record groups

`D0 <var> <group> <index-var> <field>` and `DC <var> <group> <index> <field>`
store a pointer to `base + index × size + field` in the variable
(`0x37A24`, jump table `0x37A4A`). `D0` takes the index from a variable.
Assignment source and destination mode 1 then read or write through that
pointer, and arithmetic on the variable moves it.

| Group | Save offset       | Size × count | Records                                             |
| ----: | ----------------- | -----------: | --------------------------------------------------- |
|  `00` | `0x04D6`          |       32 × 7 | Nations                                             |
|  `01` | `0x05B6`          |       14 × 6 | Protagonist Fame, Friendship, and rank              |
|  `02` | `0x060A`          |      1 block | Gold, bank balance, protagonist ID                  |
|  `03` | `0x0612`          |     42 × 120 | Sailors                                             |
|  `04` | `0x19C2`          |      24 × 10 | Collectors (0–4) and cartographers (5–9)            |
|  `05` | `0x1BA2`          |      16 × 30 | Pub attendants                                      |
|  `06` | `0x1D82`          |      1 block | Voyage day, mate roster, wages, inventory           |
|  `07` | fleet or `0x46EE` |       9 × 40 | Ship slots: 0–9 in the player's fleet, then reserve |
|  `08` | `0x1DE0`          |     133 × 70 | Fleets                                              |
|  `09` | `0x423E`          |      30 × 40 | Ship supplies and cargo                             |
|  `0A` | `0x47FC`          |      24 × 65 | Ship instances and model templates                  |
|  `0B` | `0x4E14`          |      12 × 25 | Ship model statistics                               |
|  `0C` | `0x4F40`          |     20 × 130 | Ports                                               |
|  `0D` | `0x5968`          |     37 × 100 | Port metadata                                       |
|  `0E` | `0x67DC`          |     128 × 13 | Market definitions                                  |
|  `0F` | `0x6E5C`          |        8 × 3 | Used Ship stock (not reachable)                     |
|  `10` | `0x6E74`          |      7 × 100 | Discoveries                                         |
|  `11` | `0x7130`          |     22 × 100 | Item definitions                                    |
|  `12` | none              |    293 × 100 | `COLONY.DAT` text, read into `DS:0xBF90`            |
|  `13` | none              |       2 × 46 | Goods-name pointers for `$r` text                   |

The save-aware query resolves groups `00`–`11` as save addresses and keeps each
execution path's writes, so a later read in the same route sees them.

## General gameplay RNG lifecycle

Executable-side random choices use the generator at `0x0A166`, whose 32-bit
state is at `DS:0xC1CC`. That address lies beyond the end of the executable's
data image, in the range `DS:0xBF32–0xC790` that the C startup code clears at
`0x89C7–0x89D1`, so the state is zero when the program starts. The only direct
writes are in the generator and in an unused `srand`-style setter at
`0x0A18E`. The state is not part of a save slot.

The state advances continuously while the player is in town. The townsperson
routine at `0x0B5A6` runs once per frame and makes 8–12 draws in daytime
(04:00–19:40), plus one for each visible fixed townsperson, whether or not the
player moves. At night it makes none. The clock advances only through building
visits (`0x204A5`), arrival (`0x20521`), battles (`0x15227`), and loading, so
town frames do not trigger time-based world updates. Nevertheless, relaunching
and entering the same building at night from the same save produced different
visit lengths in play, so another routine, not yet identified, makes a
real-time-dependent number of draws first. Building visit lengths,
hostile-building encounters, Used Ship stock, and the other executable-side
random outcomes therefore depend on the program's history since launch and
cannot be predicted from a save. See
[Townspeople](../../game-details/townspeople.md).

## Current disassembler limitations

- Reachable code is now decoded sequentially from primary and nested route
  tables. All seven scenarios decode without reaching an invalid action opcode,
  and every extracted protagonist dialogue is on a reachable instruction
  boundary.
- Assignment, arithmetic, and comparison operand modes, every reachable action
  opcode, and every record group have names. Some individual record fields and
  variable indices still lack gameplay names.
- Dialogue runs are still assembled by their confirmed compound signatures,
  though their component instructions are also present in the sequential decode.
- Fame comparisons now resolve through the `DC` record reference, pointer
  adjustment, and indirect little-endian word read used by the scripts. Their
  `0x82` comparison is decoded, and its final operand is a branch
  destination.
- `rawHex` retains every section byte so unknown commands are not lost.
- Stateful presentation extraction accounts for every `SNR0.MES` entry,
  including paired role-label/body messages and branch-dependent indirect
  ruler lines.

## Next investigation steps

1. Map the remaining VM variable indices used by each scenario.
2. Group instructions and edges into named basic blocks for a compact control-
   flow graph rather than exposing only the instruction-level CSV.
3. Optionally validate uncertain operations in a debugger-enabled DOSBox-X by
   comparing memory before and after a one-shot conversation.

Ghidra is not required to run the extractor. It remains useful for naming the
larger gameplay functions called by individual action handlers.

## Verification

`snr.test.ts` locks down the João evidence above. Run:

```sh
pnpm test
pnpm run typecheck
```

When a hypothesis becomes confirmed, update this document, the output field
name, and the corresponding regression test together.
