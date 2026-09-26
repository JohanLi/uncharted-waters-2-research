# Dialog system

This document describes how the English DOS version of _Uncharted Waters 2_
chooses and presents dialog. The practical goal is to answer this question:

> Given a player state, a port, and a building, which conversation will occur,
> what will it do, and will the normal building menu remain available?

The repository can already answer much of that question. Building-entry
precedence and ordinary command dispatch are decoded and modeled by the
save-aware query, but outcomes driven by the unsaved general gameplay RNG and
some transient presentation state remain conditional. The boundary between
established behavior and inference is therefore important.

## Evidence labels

- **Confirmed**: observed in play or controlled saves and consistent with the
  program.
- **Decoded**: directly represented by a known route, branch, state operation,
  or dialog instruction.
- **Likely**: supported by program structure or text, but at least one relevant
  operation is unnamed or lacks a runtime test.
- **Unknown**: not established by the current research.

## The two dialog systems

Building conversations come from two cooperating systems.

1. **Ordinary game logic** is implemented in `MAIN.EXE`. It performs such work
   as opening-hours and access checks, hostile-country encounters, standard
   vendor greetings, menus, and many reusable interactions. Most of its text
   comes from `MESSAGE.DAT` and `MESSAGE2.DAT`. The lines shown when walking
   into a townsperson belong here too (see
   [Townspeople](../game-details/townspeople.md#talking-to-townspeople)).
2. **Scenario logic** is interpreted from `SNR*.DAT`. It can replace or augment
   the ordinary interaction with story dialog from the matching `SNR*.MES`,
   change music or presentation, update story state, start a duel, and
   sometimes prevent normal use of the building.

This distinction explains why a Pub can usually show its vendor greeting but,
in a particular story state, show a named character conversation instead.
The vendor greeting is not simply another branch in the protagonist's SNR
program.

Building-entry and menu-command scenario order is now decoded. Scenario
dispatch occurs at more than one interaction layer, and building-specific
handlers can add their own gates. The resulting model is:

```text
player enters a building coordinate
        |
        v
opening-hours and preliminary access checks in MAIN.EXE
        |
        +--> closed or access denied
        |
        v
dispatch shared scenario entry hook
        |
        +--> nonzero shared variable 63 skips the protagonist hook
        |
        v
dispatch protagonist scenario entry hook
        |
        +--> `F8` can stop the interaction and return outside
             (Lodge entry is an explicit exception)
        |
        v
ordinary-building hostile-country check, where eligible
        |
        +--> confrontation can suppress the menu and return outside
        |
        v
ordinary greeting (skipped if either variable 63 is nonzero)
and building menu, if still allowed
        |
        +--> player selects a command such as Job Assignment,
        |    Treat, or Meet Ruler
        |
        v
dispatch command-specific executable and scenario hooks
        |
        +--> dialog, state changes, return to a menu level,
             or forced exit
```

Transport Goods delivery is an entry hook at the destination Market and
runs before its ordinary menu. Guild assignment dialogue begins after
`Job Assignment` and a listed job have been selected; progress checks for
Deliver Letter and Defeat Pirates also run on Guild entry. Royal-mission dialogue
uses the Palace's `Meet Ruler` audience hook, while a random hostile Palace
encounter is tested on entry and can suppress the menu before that command is
available.

`MAIN.EXE 0x20A1B–0x20A4C` dispatches the shared and protagonist entry routes
before the hostile-building path beginning at `0x20A70`. Story dispatch
therefore has earlier order, but a non-ejecting story continues into the
hostile check. If the shared route leaves shared variable 63 nonzero, the
protagonist route is not matched or dispatched at all (`0x20A32`).

Variable 63 of each scenario's 64-word variable array is a
greeting-suppression word. The dispatchers zero it before each run, and a
route sets it with `0C 3F 0001`. The ordinary building main handlers test the
shared and protagonist words and skip the ordinary vendor greeting when either
is nonzero, while still offering the menu. The save-aware query models both
this suppression and the shared-to-protagonist gate. Details are in the
[reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md#mainexe-scenario-vm).

The Lodge is a caller-side exception to the usual `F8` behavior. Its branch at
`MAIN.EXE 0x20A61` proceeds into hostile-port handling even when an entry story
cleared an interaction-control word. Ejecting routes in other eligible
buildings stop before hostile processing.

Other dialog-system gaps are tracked in
[open-questions.md](./open-questions.md).

## Files involved

| File or output                                | Role                                                                                                                                | Current status                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `raw/MAIN.EXE`                                | Loads message banks and scenario pairs; implements ordinary building behavior and the SNR virtual machine                           | Partly decoded                                                 |
| `raw/MESSAGE.DAT`                             | 1,000 general strings, including ordinary vendor greetings, access responses, menu interactions, rumors, and reusable gameplay text | Container and combined lookup decoded; callers partly mapped   |
| `raw/MESSAGE2.DAT`                            | 423 additional general strings, including UI, interaction, and character-specific text                                              | Container and combined lookup decoded; callers partly mapped   |
| `raw/SNR0.DAT` / `SNR0.MES`                   | Shared Guild jobs and royal missions                                                                                                | Structurally decoded; all 272 message references accounted for |
| `raw/SNR1` through `SNR6`                     | Protagonist-specific programs and text                                                                                              | Structurally decoded                                           |
| `raw/KOUKAI2.DAT`                             | Save slots containing active scenario state and other inputs used by dialog conditions                                              | Relevant fields partly decoded                                 |
| `raw/MENU.DAT`                                | Building and command-menu labels                                                                                                    | Decoded where used by the building research                    |
| `raw/ZA_DAT.DAT`                              | Port maps and the presence/coordinates of building slots                                                                            | Decoded by the port extractor                                  |
| `dialog-system/scripts/output/scenarios.json` | Machine-readable disassembly of all SNR pairs                                                                                       | Generated research output                                      |
| `dialog-system/scripts/output/readable/`      | Searchable transcripts, routes, instructions, control-flow edges, and dialog occurrences                                            | Generated research output                                      |

`SNR1` is João, `SNR2` Catalina, `SNR3` Otto, `SNR4` Ernst, `SNR5`
Pietro, and `SNR6` Ali. `SNR0` is shared rather than belonging to a seventh
protagonist.

### `MESSAGE.DAT` and `MESSAGE2.DAT`

Both files begin with a big-endian `u16` offset table. The first offset is also
the byte length of the table, so dividing it by two gives the number of
entries:

| File           | First offset | Entries |    File size |
| -------------- | -----------: | ------: | -----------: |
| `MESSAGE.DAT`  |     `0x07D0` |   1,000 | 48,151 bytes |
| `MESSAGE2.DAT` |     `0x034E` |     423 | 25,024 bytes |

Each table entry points to a null-terminated string. The strings use `printf`-
style placeholders such as `%s`, `%d`, and `%ld`; `MAIN.EXE` supplies their
runtime values.

Executable references are normally zero-based, while prose inventories often
number entries for humans. Any citation should say whether it is a **raw
index** or a **one-based entry number**. This avoids an easy off-by-one error.

`MAIN.EXE` loads `MESSAGE.DAT` into the handle at `DS:0x05DC` and
`MESSAGE2.DAT` into the handle at `DS:0x05DE`. The loader is at file offsets
`0x1B173–0x1B19F`; its filename pointers are `DS:0x0B3E` and `DS:0x0B2E`.
The offset-table readers begin at `0x3929E` and `0x392EA` respectively. Each
multiplies a raw index by two, reads and byte-swaps the big-endian offset, then
reads the selected null-terminated string.

Callers see the pair as one continuous zero-based namespace:

| Combined index | Source                     |
| -------------: | -------------------------- |
|        `0–999` | `MESSAGE.DAT`, same index  |
|    `1000–1422` | `MESSAGE2.DAT`, index−1000 |

The dispatcher at `0x39336` performs the `1000` comparison (at `0x39339`) and
subtraction.
Consequently, an executable operand of `1047` means raw index `47` (one-based
entry 48) in `MESSAGE2.DAT`; it is not an out-of-range `MESSAGE.DAT` index.

Two recurring presentation call families use this namespace: far calls to
`0000:8D95`, used by the ordinary upper building panel, and calls to
`FF2D:5D46`, used broadly for general formatted messages. The extractor emits
`general-message-call-sites.json` for direct `mov ax, id; push ax` and
`push id` references. It currently resolves 487 direct sites; computed indices
remain visible only in their surrounding executable routines.

These files are not scenario programs: they contain strings, not the complete
conditions that select them. Determining why a particular general message was
shown requires tracing its `MAIN.EXE` caller.

### `SNR*.MES`

An MES file begins with a big-endian `u32` offset table. As with the general
message files, the first string offset is the size of the table; dividing it by
four gives the message count. Each offset points to a null-terminated string.

Scenario bytecode stores zero-based message indices. The extractor exposes
one-based `messageId` values in JSON and readable transcripts.

Some strings begin with a label such as:

```text
|Palace Guard|
Commoners are usually not admitted here ...
```

The extractor exposes the label as `speakerLabel` and removes it from the
display body. A label is useful evidence, but portrait selection still comes
from bytecode and should not be inferred from the label alone.

The game interprets `$n` and `$s` as the player's first and last names when it
renders the text. Two further placeholders read the active scenario's VM
variables: `$dNN` inserts variable `NN` (two decimal digits) as a decimal
number, and `$rNN` inserts the string referenced by variable `NN`, such as a
port name in a Guild contract. The executable expander at `MAIN.EXE 0x383E4`
handles all four forms. Generated output preserves the placeholders.

### `SNR*.DAT`

Each DAT begins with `SNDT`. Starting at offset `0x10`, it contains absolute
big-endian section offsets terminated by `0xFFFFFFFF`. A section contains:

- an entry-offset table;
- one or more route tables;
- bytecode containing assignments, calculations, comparisons, branches, and
  presentation/game actions.

Route and branch destinations are relative to the base established by their
containing route table. They are not necessarily relative to the beginning of
the file or section.

## From a building to a scenario route

A building event is dispatched using a two-byte route key:

```text
<selector> <qualifier>
```

For protagonist scenarios:

- selectors `0x00` through `0x63` are the 100 regular port IDs;
- selector `0xA3` means any regular port;
- the qualifier is usually the building/context ID;
- qualifier `0xFF` is a wildcard context;
- selector `0xA0` is an at-sea voyage-day hook;
- selectors `0xA1` and `0xA2` are before- and after-naval-battle hooks.

The known building qualifiers use zero-based values compared with the
one-based building IDs documented in [Buildings](../game-details/buildings.md):

| Qualifier | Building/context                                        |
| --------: | ------------------------------------------------------- |
|    `0x00` | Market                                                  |
|    `0x01` | Pub                                                     |
|    `0x02` | Shipyard                                                |
|    `0x03` | Harbor                                                  |
|    `0x04` | Lodge                                                   |
|    `0x05` | Palace                                                  |
|    `0x06` | Guild                                                   |
|    `0x07` | Special NPC residence                                   |
|    `0x08` | Bank                                                    |
|    `0x09` | Item Shop                                               |
|    `0x0A` | Church or Mosque                                        |
|    `0x0B` | House of Fortune                                        |
|    `0xFF` | Wildcard; may cover several otherwise unmapped contexts |

Even when a building has a distinct qualifier, a route table may expose only a
wildcard handler. João's opening, for example, uses one wildcard route shared
by several building types. Route keys are therefore dispatch contexts, not a
guarantee that every table lists all twelve building qualifiers.

Only one menu action introduces a distinct scenario context. `Meet Ruler`
dispatches shared Palace context `0x05` when the Palace belongs to the
protagonist's nation and shared flag 17 is set (`MAIN.EXE 0x30451–0x30482`),
then protagonist and shared audience context `0x15`. `Job Assignment` reuses Guild qualifier `0x06` after the
executable records the selected job. `Treat` makes no scenario-dispatch call;
its royal-invitation path is executable logic. The route matcher
(`MAIN.EXE 0x390D9` shared, `0x3922E` protagonist) makes a single pass in table
order and takes the first entry that matches. A `0xA3` selector matches any
regular port and a `0xFF` qualifier matches any context wherever that entry
occurs in the table, so a wildcard placed before a specific entry wins.
Callers never pass those wildcard values themselves.

The active section and subsection determine which route table is eligible.
After a route is chosen, its bytecode may branch on scenario flags, VM
variables, current calendar day, port, time, fame, random values, inventory, and
other partly decoded inputs.

## How a scenario expresses dialog

### Portrait dialog

The confirmed compound form for a portrait line is:

```text
C0 <position> CC <character-index:u16be> C8 <message-index:u16be> C7
```

The operations are:

| Bytes            | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| `C0 <position>`  | Select the dialog presentation position            |
| `CC <character>` | Select a zero-based portrait/character record      |
| `C8 <message>`   | Select a zero-based entry in the active `SNR*.MES` |
| `C7`             | Present the selected dialog                        |

Position `1` is the upper dialogue panel and position `2` is the lower panel.
They do not identify the speaker: `CC` does that. Either panel may continue
across several consecutive lines; dialogue does not necessarily alternate
between them. Ordinary building vendors appear only in the upper panel. A
scenario character can visually cover the vendor there, while other scenario
characters can use the lower panel. When the player dismisses a line, its text
is erased but the panel and portrait remain. The other panel can therefore
stay visible with its previous portrait and an empty text area while the next
line is presented.

For example:

```text
C0 02 CC 0000 C8 0016 C7
```

selects slot 2, character index 0, and raw message index `0x16`; the generated
transcript reports character 1 and public message 23.

### Indirect portrait dialog

Shared royal missions use a dynamic variant:

```text
C0 <position> CD <variable:u8> C8 <message-index:u16be> C7
```

`CD` reads a character index from the named 16-bit scenario VM variable and
passes the resolved value to the same portrait-selection routine used by
`CC`. It is therefore an indirect character selection, not a different kind of
panel. In `SNR0`, variable 50 selects the ruler of the protagonist's current
allegiance, while variable 51 selects the ruler of the diplomatic mission's
stored destination nation. This is separate from ordinary Palace dialogue,
whose ruler follows the capital being visited.

The mapping covers all six nations. The upper-panel sequence uses the
current-allegiance ruler at the offer, the destination ruler at delivery or
negotiation, and the current-allegiance ruler again on completion.

### Text without an explicit portrait

One confirmed form is:

```text
C0 00 C8 <message-index:u16be> C7
```

Position 0 does not select a scenario portrait. In an ordinary Pub, runtime
observation shows it writing into the already established vendor's upper
panel: the bartender portrait remains visible while the position-0 text is
shown. A lower scenario panel and its portrait remain present, with their text
cleared, while the bartender replies. This establishes position 0 as reuse of
the building-supplied speaker presentation in this context, not as a
portraitless full-screen message. Whether every non-building use has the same
presentation still requires a caller-by-caller check.

Shared Guild assignments also use a paired-message form:

```text
C0 00 C8 <speaker-label-message:u16be> C8 <body-message:u16be> C7
```

The first selected MES entry contains only the speaker's role label, such as
`Old Guild Worker` or `Head Trader`; the second contains the displayed body.
`E9 <flag>` can replace `C7` when the body is followed by a choice. The two
entries therefore make one visible line, not two successive lines.

Ordinary vendor portraits are selected separately from scenario `CC`
characters. Zero-based `GRAPH.DAT` records 6–17 map in order to building IDs
1–12, with record 20 replacing the Church portrait in Mosque ports. Special
residences always retain record 13 even when a named collector, cartographer,
teacher, or story character supplies the dialogue. See
[Buildings](../game-details/buildings.md#vendor-portraits-and-dialogue-panels).

### Runs and conversations

The extractor groups consecutive compound dialog instructions into a
`dialogueRun`. An intervening action, branch, or unknown instruction ends a
run. Several runs can therefore still belong to one player-visible
conversation.

It also propagates pending position, speaker, and message selections through
control-flow branches until a later `C7` or `E9`. This accounts for every
`SNR0.MES` entry, including branch-dependent deadline and royal-mission text.
For these noncontiguous presentations, `presentationInstructionOffsets` lists
the contributing instructions and `rawHex` concatenates those presentation
instructions in execution order.

An extractor run boundary is not necessarily a visual boundary. In João's
opening Pub funding scene, the 1,000-coin grant separates two extracted runs,
but both dialogue panels and their portraits remain in place. The gold display
updates when the following Rocco line appears; there is no intervening clear.

A complete conversation must be reconstructed from control flow, not merely
by taking adjacent MES strings or adjacent runs in file order. Generated
Markdown explicitly warns that file order is not necessarily runtime order.

### Choices

`E9 <flag>` replaces the usual final `C7` presentation with a choice prompt.
The result is stored in the named scenario flag and can control later branches.
For example, João's message 310 uses `E9 10` and records the answer in flag 16.

## Presentation, state, and game actions

The following operations matter when describing what the player experiences:

| Form                          | Status        | Effect                                                             |
| ----------------------------- | ------------- | ------------------------------------------------------------------ |
| `C4`                          | **Confirmed** | Clear both scenario dialogue panels with a horizontal closing wipe |
| `CA <track>`                  | **Confirmed** | Select background-music track                                      |
| `CB <x:u16> <y:u16> <index>`  | **Decoded**   | Draw a zero-based record from the protagonist's `EVENTn.DAT` file  |
| `E8 <sailor ID>`              | **Decoded**   | Start a duel against the specified sailor                          |
| `E9 <flag>`                   | **Confirmed** | Present a choice and store its result in a scenario flag           |
| `EB <variable> <bound:u16be>` | **Decoded**   | Store a random value from zero through `bound - 1`                 |
| `2C <flag> <value>`           | **Confirmed** | Write a persistent scenario flag                                   |
| `AC` / `AD`                   | **Decoded**   | Branch according to whether a scenario flag is set/clear           |
| `FE <destination>`            | **Decoded**   | Unconditional jump                                                 |
| `F0`                          | **Decoded**   | Advance subsection after the interpreter returns                   |
| `F1`                          | **Decoded**   | Advance section, reset subsection, and clear scenario flags        |
| `F2`                          | **Decoded**   | Stop scenario interpretation                                       |
| `F8`                          | **Confirmed** | Suppress the normal building menu and force the player outside     |
| `C9 <variable> <message>`     | **Decoded**   | Show a forced menu built from the lines of an MES entry            |
| `D9 00 <selector>`            | **Confirmed** | Show a formatted Guild or royal-mission line from `MESSAGE.DAT`    |
| `D1 <variable>`               | **Decoded**   | Send a story fleet after a sailor or to a port                     |
| `E4 <variable>`               | **Decoded**   | Set carried gold                                                   |
| `F9` / `FA`                   | **Decoded**   | Start a pending ship, then commission and name it                  |
| `FB <sailor>`                 | **Decoded**   | Add a sailor to the party as an unassigned mate                    |
| `F4 <ending>`                 | **Decoded**   | Play the protagonist's ending and exit to `END.EXE`                |

### Music and clearing example

João's initial Pub introduction contains:

```text
message 66
C4
CA 04
message 67
```

A brief screen clear follows message 66, and João's theme begins with
message 67. Elsewhere, raw `CA 10` selects the battle theme, `CA 05` selects
Catalina's theme, `CA 06` selects Otto's theme, and `CA 13` selects the Pub
theme (“Fiddler's Green”). Track operands in byte dumps are hexadecimal;
generated JSON writes their numeric value in decimal.

The exhaustive PC range is `CA 00` through `CA 15`. The endpoints and early
IDs are Opening (`00`), Ending A / Duke
promotion (`01`), Ending B (`02`), Initial Setup (`03`), and naval-victory
Fanfare (`15`). The decoder's `KNOWN_MUSIC_TRACKS` table names the complete
range.
In the naval-victory sequence, `15` accompanies the brief initial victory
report; acknowledging that report switches to Post-Battle (`11`) for the
random gold and item rewards.

A later João Pub scene shows the operation in detail. After João says
“Lucia!”, `C4` closes the lower and upper scenario panels in turn, briefly
revealing the ordinary Pub vendor presentation underneath. Lucia's subsequent
“I'm back.” line then constructs a new upper scenario panel. Thus `C4` clears
both scenario-panel states; it does not merely insert a timing pause or clear
the text in the currently active panel.

Ordinary music outside scenario bytecode is selected by the executable: port
entry chooses a regional track, while building entry overrides it only for a
Pub (`0x13`) or Palace (`0x12`). Other building types retain the regional port
track. Battle/result, game-over, and music-option resume paths also call the
same central player directly. No second SNR music opcode is currently known.

### Event art

Event art is requested explicitly by scenario bytecode; it is not inferred
from message text, speaker, or location. Every reachable call uses this form:

```text
C0 03 CB 0070 0018 <record-index>
```

`CB` reads two big-endian words and one byte. Its executable handler at
`MAIN.EXE 0x38D2A` passes them to the graphics routine as x coordinate 112,
y coordinate 24, and a zero-based image index. The active protagonist selects
the resource family: `SNR1` uses `EVENT1.DAT`, through `SNR6` using
`EVENT6.DAT`. Thus Catalina's `CB ... 04`, for example, displays zero-based
record 4 from `EVENT2.DAT`, extracted as
`event2-04-192x144.png`.

The usual sequence is `C4` to clear the prior scenario panels, the position-3
art command above, and then position-2 dialogue. The event art is therefore
drawn before the first line that accompanies it and remains behind the
following lower panel while that part of the scene runs. It is not attached to
an individual MES entry. Repeated calls can intentionally reuse one image;
Ali's four payment variants all select `EVENT6.DAT` record 1.

Not every extracted record has a reachable scenario-VM reference. `EVENT0`
has no `CB` caller in `SNR0`; records 2, 3, 0, 2, 5, and 0 are likewise absent
from the reachable `CB` calls for `EVENT1` through `EVENT6`, respectively.
They may be invoked directly by executable code, belong to unreachable paths,
or be unused content; the `CB` inventory alone cannot distinguish those cases.

### Leaving or being ejected from a building

Action `F8` supplies the scenario's forced-exit result. Its executable handler
clears a caller-provided interaction-control word. Routes ending in `F8 F2`
force the player outside before the normal building menu can be used. Routes
ending in `F2` without `F8` leave the player inside and allow the menu. Pietro's
Genoa Church warning uses the former, while his nearby Lodge reminder uses the
latter, which leaves the Lodge usable. Other confirmed ejecting debt
conversations use the same `F8 F2` ending.

Dialog wording alone remains insufficient evidence; the encoded `F8` is what
distinguishes an ejecting conversation from a visually similar reminder.

## State that selects a conversation

The scenario save state includes at least:

- active section and subsection;
- persistent scenario flags;
- 64 persistent VM variables;
- current port and building/context supplied during dispatch;
- time of day in 20-minute ticks;
- a voyage-day counter for at-sea routes;
- protagonist-specific Adventure, Trade, or Piracy fame;
- other game state read through still-unnamed VM sources.

Conditions can also depend on money, rank, items, allied ports, date, choices,
battle opponents/results, and randomness. Some of these are well understood
for individual quests without yet having a complete general VM name.

The voyage-day counter is the number of midnights crossed during the current
voyage. It increments at midnight while at sea. Entering a port takes one
20-minute tick and leaves the stored value intact while ashore; choosing Sail
clears it to zero before the next voyage begins.

The scenario state is progressive rather than a simple “quest completed”
number. A section can contain several flag-controlled building stages. Entering
the correct building may set a flag without showing dialog, causing a later
visit elsewhere to produce the visible scene.

## Determining a building conversation

Use this procedure for a particular save and building:

1. **Identify the ordinary building.** Resolve the port's building slot from
   `ZA_DAT.DAT`/the generated port data, its opening hours, and special type
   such as Church versus Mosque or the occupant of a special residence.
2. **Check non-scenario gates.** Account for time, palace/religious access,
   hostile-country behavior, and any other executable-driven gate known for
   that building.
3. **Read story context.** From the save, obtain protagonist, section,
   subsection, scenario flags, VM variables, current port, clock, fame, and
   relevant inventory or quest fields.
4. **Select the active SNR pair.** Check the protagonist's `SNR1`–`SNR6` and
   applicable shared `SNR0` handling.
5. **Match a route.** Scan the active route table in order and take the first
   entry whose selector and qualifier match, treating `0xA3` and `0xFF` as
   wildcards wherever they occur. Do not invent a general precedence when
   several engine dispatches may be involved.
6. **Execute reachable branches.** Follow comparisons, flags, known variable
   values, jumps, and explicit random branches from the selected destination.
7. **Collect presentation and effects.** Record dialog in execution order,
   speaker slot, portrait, choices, music, scene breaks, state writes, section
   changes, duels/event art, and whether exit/menu behavior is known.
8. **Apply ordinary fallback.** If no scenario route produces an overriding
   interaction—or after a non-blocking story interaction—use the appropriate
   `MAIN.EXE` building routine and general message bank. The query automates
   the ordinary entry greeting or access response and main menu; individual
   menu commands are available where listed below.

### Current query support

The existing tool predicts protagonist-story and shared-scenario paths without
modifying a save:

```sh
pnpm run query-dialog -- FILE SLOT pub
pnpm run query-dialog -- FILE SLOT special-building
pnpm run query-dialog -- FILE SLOT item-shop:buy:1:yes
```

`FILE` must be a save made in port; the tracked `raw/KOUKAI2.DAT` template is
at sea and supports only the `at-sea` action. See the
[query usage notes](./scripts/README.md#query-a-save) for more actions.

It reads the selected slot's scenario state, calendar, clock, port,
protagonist, fame, mission variables, nation records, fleet cargo, inventory,
and gold, applies the decoded building schedule, then reports outcomes as
`confirmed`, `decoded`, `ambiguous`, or `none`. It reconstructs the distinct
protagonist and shared-scenario RNG seeds, so explicit `EB` draws resolve to
the same branch the game will select.

For shared `SNR0`, it reports the section, flags, highest-Fame eligibility,
next-title threshold, cached mission family, matching route, state-specific
dialogue, choices, and decoded effects. It follows cached royal invitations
through the Palace initializer into the visible `Meet Ruler` offer and resolves
dynamic home- and destination-ruler lines from the mission state. A `palace`
query models that scenario audience after admission. For every ordinary
building action, the query also reports the decoded entry greeting or access
response and visible main menu after applying story suppression. It identifies
when a hostile reception may preempt that result, but cannot select the random
outcome until the general gameplay RNG lifecycle is known.

Colon-separated paths currently execute every Harbor command, including
Supply and Moor submenus and supply-port Rename Port; Item Shop Buy/Sell; all
four Bank commands; Lodge Check In and Port Info; Church/Mosque Pray and
Donate; all four House of Fortune readings; both Guild commands; and collector,
cartographer, and skill-teacher interactions. Palace paths cover Sphere of
Influence, Letter of Marque, Tax Free Permit, Defect, Gold aid, and Ship aid,
including their availability checks and nested confirmations. Selecting a
Guild assignment row also executes the corresponding shared SNR0 offer
transcript. Pub queries resolve its port specialty, crew recruitment limits,
Treat, local patrons, waitress interactions, and gambling handoff; Pub Meet
and Lodge Gossip reconstruct local sailors and resolve their shared Gossip,
Hire, and Duel paths. Interactive crew distribution, investigations, and the
gambling engines are identified at their handoff rather than simulated.
Market paths reconstruct local goods, rates, prices, fleet cargo limits,
purchases, sales, and commercial investment. Shipyard paths resolve New Ship
ordering, negotiation, capacity allocation, and delivery; Used Ship purchase,
exchange, negotiation, and naming; repairs; sales; Remodel; and industrial
investment. Low-offer refusal versus same-day ejection, the presence of rare
Figurehead or Gun selections, and other RNG-dependent Shipyard branches remain
conditional. The tool validates selections and reports effects without
changing the save. Item Shop counteroffers, sailor rumors and hiring,
collector Rumor, and other branches driven by the unsaved general RNG remain
probabilistic.

### Multi-command visits

Further arguments after the action are later commands in the same building
visit. A later command may repeat the building name:

```sh
pnpm run query-dialog -- FILE SLOT pub:treat:10 treat:10 recruit-crew:20
pnpm run query-dialog -- FILE SLOT church:pray@success pray donate:500
pnpm run query-dialog -- FILE SLOT market:buy-goods:1:1:20:yes sell-goods:1
pnpm run query-dialog -- FILE SLOT special-building:report report
```

The first command is resolved exactly as a single command path, including the
story routes and ordinary entry. The query then copies the save and applies
the earlier commands' writes before resolving each later command against the
copy. The save file itself is never changed. Modeled writes include on-hand
gold, Bank balance, Luck, the Cartography, Celestial Navigation, and Gunnery
skill bits, Adventure Fame, the unreported-chart counter, consumed
discoveries, item inventory, Market cargo slots and rates, investment totals, a
patron's Loyalty after Treat, repaired ship condition, the invitation flag set
by a Pub Treat, and the same-day Shipyard ejection flag.

The executable also keeps some state only while the player is inside a building.
The query carries this state between commands:

- **Pub enthusiasm.** Entry sets it to `floor(Charm / 3)`. Each Treat raises it,
  and Recruit Crew sizes its pool from the current value. If Meet finds nobody
  worth recruiting, it shows raw message 38 instead of 39 when enthusiasm is at
  least 50.
- **Pray's Luck roll.** Only the first Pray in a visit can add Luck.
- **Cartographer Report.** After one Report, Report is grayed out for the rest
  of the visit.
- **The end of the visit.** Sailing, being ejected from the Shipyard, and
  failing to pay the fortune teller end the visit. No later command can be
  selected.

A command can depend on the general gameplay RNG, which a save cannot
reproduce. The query still reports it as a probability. In a sequence, append
`@success` or `@failure` to that command to choose the outcome that later
commands see. Otherwise later commands assume the roll failed and changed
nothing. Each later command notes this dependency and its probability, and the
overall confidence becomes `ambiguous`. This covers Pray's `random(2)` Luck,
Donate's `(random(5) + 1) × 100` threshold for 100–499 gold, and the Item Shop
counteroffer. Rolls that the path already selects are unchanged, such as a
Shipyard low offer's `ejected` or `refused`.

Some effects are not written to the copy. Each later command lists them as not
applied, for example crew distribution, sailor hiring, waitress favor,
collector and cartographer contracts, Lodge Check In's clock change, Supply,
Moor, ship purchases, sales, remodeling, Palace commands, a Pub Treat's patron
rumors, and the Support redistribution after an investment. An incomplete
selection is treated as backing out to the building menu. Programmatic
callers use `parseQueryVisit` and `queryVisit`; a one-command visit returns
the same result as `queryScenario`.

## Worked João examples

These examples show why port and building alone are insufficient.

### Opening Pub

In João section 0, Lisbon Pub route `0x0001` reaches bytecode at `0x02CC`.
Flags decide whether the full Carlotta/Lucia introduction, a shorter reminder,
or no story replacement is selected. The full introduction alternates portrait
slots and later performs the `C4`/`CA 04` clear-and-music sequence described
above. It finally sets a one-shot scenario flag so the scene does not replay.

### A silent activation followed by later dialog

At 8,000 Adventure Fame, an ordinary building visit can silently arm João's
next subsection. A later Pub visit sets more state and remembers the port. A
subsequent eligible building visit performs an explicit one-in-two random roll
for Catalina's appearance. The visible conversation can therefore depend on
earlier visits that displayed no story text.

### Reminder versus forced exit

During João's 2,000-fame departure sequence, entering some non-Harbor buildings
can show Alberto's “Let me walk you to the port” reminder without ejecting the
player. Other forced stages show context-specific warnings and return the
player outside. The scenario query now reports the decoded `F8` exit effect on
those paths instead of inferring behavior from their wording.

## Research sources

- [SNR and VM reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md)
- [Scenario guides](../game-details/scenarios/README.md)
- [Building IDs, availability, and ordinary greetings](../game-details/buildings.md)
- [Hostile-country building behavior](../game-details/friendship.md)
- [Open dialog-system questions](./open-questions.md)
