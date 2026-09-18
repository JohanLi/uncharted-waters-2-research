# Dialog system

This document describes how the English DOS version of _Uncharted Waters 2_
chooses and presents dialog. The practical goal is to answer this question:

> Given a player state, a port, and a building, which conversation will occur,
> what will it do, and will the normal building menu remain available?

The repository can already answer much of that question for protagonist story
events. It cannot yet reproduce the complete building-entry dispatcher. The
boundary between established behavior and inference is therefore important.

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
   comes from `MESSAGE.DAT` and `MESSAGE2.DAT`.
2. **Scenario logic** is interpreted from `SNR*.DAT`. It can replace or augment
   the ordinary interaction with story dialog from the matching `SNR*.MES`,
   change music or presentation, update story state, start a duel, and
   sometimes prevent normal use of the building.

This distinction explains why a Pub can usually show its vendor greeting but,
in a particular story state, show a named character conversation instead.
The vendor greeting is not simply another branch in the protagonist's SNR
program.

The exact order in which all ordinary, shared-scenario, and protagonist-
scenario checks run is not completely decoded. The following is a useful
working model, not a claim that every step has a single linear precedence:

```text
player enters a building coordinate
        |
        v
opening-hours and building/access checks in MAIN.EXE
        |
        +--> closed, religious restriction, palace restriction,
        |    or hostile-country encounter
        |
        v
dispatch current port + building/context to scenario logic
        |
        +--> active protagonist SNR route and state branches
        |
        +--> shared SNR0 quest/royal-mission handling
        |
        v
story dialog and side effects, if selected
        |
        +--> stop/eject/suppress menu, where required
        |
        v
ordinary greeting and building menu, if still allowed
```

The unresolved precedence and menu/ejection step is tracked in
[open-questions.md](./open-questions.md).

## Files involved

| File or output                                | Role                                                                                                                                | Current status                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `raw/MAIN.EXE`                                | Loads message banks and scenario pairs; implements ordinary building behavior and the SNR virtual machine                           | Partly decoded                                                   |
| `raw/MESSAGE.DAT`                             | 1,000 general strings, including ordinary vendor greetings, access responses, menu interactions, rumors, and reusable gameplay text | Container decoded; call sites only partly mapped                 |
| `raw/MESSAGE2.DAT`                            | 423 additional general strings, including UI, interaction, and character-specific text                                              | Container decoded; exact division from `MESSAGE.DAT` unknown     |
| `raw/SNR0.DAT` / `SNR0.MES`                   | Shared Guild jobs and royal missions                                                                                                | Structurally decoded; some message references remain unexplained |
| `raw/SNR1` through `SNR6`                     | Protagonist-specific programs and text                                                                                              | Structurally decoded                                             |
| `raw/KOUKAI2.DAT`                             | Save slots containing active scenario state and other inputs used by dialog conditions                                              | Relevant fields partly decoded                                   |
| `raw/MENU.DAT`                                | Building and command-menu labels                                                                                                    | Decoded where used by the building research                      |
| `raw/ZA_DAT.DAT`                              | Port maps and the presence/coordinates of building slots                                                                            | Decoded by the port extractor                                    |
| `dialog-system/scripts/output/scenarios.json` | Machine-readable disassembly of all SNR pairs                                                                                       | Generated research output                                        |
| `dialog-system/scripts/output/readable/`      | Searchable transcripts, routes, instructions, control-flow edges, and dialog occurrences                                            | Generated research output                                        |

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
renders the text. Generated output represents these placeholders as `$n` and
`$s`.

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

The active section and subsection determine which route table is eligible.
After a route is chosen, its bytecode may branch on scenario flags, VM
variables, current calendar day, port, time, fame, random values, inventory, and other
partly decoded inputs.

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

The mapping covers all six nations. Runtime validation confirms the general
upper-panel sequence: the current-allegiance ruler at the offer, the
destination ruler at delivery or negotiation, and the current-allegiance ruler
again on completion.

### Text without an explicit portrait

The confirmed form is:

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

| Form                          | Status              | Effect                                                             |
| ----------------------------- | ------------------- | ------------------------------------------------------------------ |
| `C4`                          | **Confirmed**       | Clear both scenario dialogue panels with a horizontal closing wipe |
| `CA <track>`                  | **Confirmed**       | Select background-music track                                      |
| `CB <x:u16> <y:u16> <index>`  | **Decoded**         | Draw a zero-based record from the protagonist's `EVENTn.DAT` file  |
| `E8 <operand>`                | **Likely/observed** | Start a duel; operand meaning is not fully decoded                 |
| `E9 <flag>`                   | **Confirmed**       | Present a choice and store its result in a scenario flag           |
| `EB <variable> <bound:u16be>` | **Decoded**         | Store a random value from zero through `bound - 1`                 |
| `2C <flag> <value>`           | **Confirmed**       | Write a persistent scenario flag                                   |
| `AC` / `AD`                   | **Decoded**         | Branch according to whether a scenario flag is set/clear           |
| `FE <destination>`            | **Decoded**         | Unconditional jump                                                 |
| `F0`                          | **Decoded**         | Advance subsection after the interpreter returns                   |
| `F1`                          | **Decoded**         | Advance section, reset subsection, and clear scenario flags        |
| `F2`                          | **Decoded**         | Stop scenario interpretation                                       |
| `F8`                          | **Confirmed**       | Suppress the normal building menu and force the player outside     |

### Music and clearing example

João's initial Pub introduction contains:

```text
message 66
C4
CA 04
message 67
```

Runtime observation confirms a brief screen clear after message 66, followed
by the flute theme when message 67 appears. Elsewhere, raw `CA 10` selects the
battle theme and `CA 05` selects Catalina's theme. Track operands in byte dumps
are hexadecimal; generated JSON writes their numeric value in decimal.

A later João Pub scene shows the operation in detail. After João says
“Lucia!”, `C4` closes the lower and upper scenario panels in turn, briefly
revealing the ordinary Pub vendor presentation underneath. Lucia's subsequent
“I'm back.” line then constructs a new upper scenario panel. Thus `C4` clears
both scenario-panel states; it does not merely insert a timing pause or clear
the text in the currently active panel.

Not every observed music change has a nearby `CA`. This means that another
scenario action or surrounding executable logic can also influence music.

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

The supplied runtime captures match the static selections exactly: Catalina's
fire-ship scene uses `EVENT2` record 4 and her Franco scene record 0; Pietro's
harbor decision uses `EVENT5` record 0 and his meeting record 2; Ali's payment
scene uses `EVENT6` record 1 and his palace scene record 3. The smaller x
coordinate visible in some screenshots is due to cropping the full game
screen; the encoded destination remains `(112, 24)`.

Not every extracted record has a reachable scenario-VM reference. `EVENT0`
has no `CB` caller in `SNR0`; records 2, 3, 0, 2, 5, and 0 are likewise absent
from the reachable `CB` calls for `EVENT1` through `EVENT6`, respectively.
They may be invoked directly by executable code, belong to unreachable paths,
or be unused content; the `CB` inventory alone cannot distinguish those cases.

### Leaving or being ejected from a building

Runtime tests confirm both kinds of story interruption:

- some warning conversations end and force the player outside before the
  normal building menu can be used;
- other reminders play but leave the player inside and allow the menu.

Action `F8` supplies the scenario's forced-exit result. Its executable handler
clears a caller-provided interaction-control word. Runtime-controlled Pietro
routes provide a direct comparison: the Genoa Church line “Ah! I just
remembered an important engagement. Sorry, got to run.” ends in `F8 F2` and
ejects Pietro, while the nearby Lodge line “Don't worry, sonny, you're safe
here. Just rest here quietly.” ends in `F2` without `F8` and leaves the Lodge
usable. Other confirmed ejecting debt conversations use the same `F8 F2`
ending.

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
5. **Match a route.** Try the specific port/building key, the any-port key,
   then applicable wildcard/nested routes as dictated by the actual route
   tables. Do not invent a general precedence when several engine dispatches
   may be involved.
6. **Execute reachable branches.** Follow comparisons, flags, known variable
   values, jumps, and explicit random branches from the selected destination.
7. **Collect presentation and effects.** Record dialog in execution order,
   speaker slot, portrait, choices, music, scene breaks, state writes, section
   changes, duels/event art, and whether exit/menu behavior is known.
8. **Apply ordinary fallback.** If no scenario route produces an overriding
   interaction—or after a non-blocking story interaction—use the appropriate
   `MAIN.EXE` building routine and general message bank. This final step is not
   yet automated generally.

### Current query support

The existing tool predicts protagonist-story paths without modifying a save:

```sh
pnpm run query-dialog -- save-editor/KOUKAI2-original.DAT 1 pub
pnpm run query-dialog -- save-editor/KOUKAI2-original.DAT 1 special-building
```

It reads the selected slot's scenario state, calendar, clock, port,
protagonist, and fame, applies the decoded building schedule, then reports outcomes as
`confirmed`, `decoded`, `ambiguous`, or `none`. Explicit small random ranges
become separate probability branches.

It also reports the shared `SNR0` section, flags, highest-Fame eligibility,
next-title threshold, cached mission family, and matching shared route. It does
**not** yet execute indirect `SNR0` message calls or ordinary building dialog.
“No story dialog” therefore does not mean that entering the building displays
nothing.

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
