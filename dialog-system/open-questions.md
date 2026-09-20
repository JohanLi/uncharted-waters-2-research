# Dialog-system open questions

This file tracks only gaps that still prevent a complete answer to:

> Given a player state, a port, and an interaction, exactly what conversation
> and post-conversation behavior will occur?

Resolved investigations belong in the [dialog-system guide](./README.md), the
[reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md), and the relevant
game-detail page rather than remaining as full sections here.

Literal threshold comparisons no longer need routine boundary testing.
Repeated controlled tests have confirmed the decoded inclusive lower bounds.
New runtime evidence is most useful for field lifecycle, presentation, or
executable behavior that cannot be settled from code and data.

## Current priorities

1. **Complete ordinary executable dialogue.** Finish the remaining building
   command handlers, then add command and submenu selections to the save-aware
   query.
2. **Complete reachable VM state and effect coverage.** Name the remaining
   action opcodes and game-record groups that can alter a selected route's
   result.
3. **Trace the general gameplay RNG lifecycle.** Determine initialization,
   save/load persistence, and intervening draws so executable-side random
   results can be predicted from a save when possible.

The first item remains the largest gap between the save-aware query and the
complete interaction the player sees. Ordinary entry greetings, access
responses, and menus are now integrated. The recommended next research task is
the House of Fortune and Lodge command handlers. This phase is static and does
not require new saves or recordings.

## 1. Ordinary `MESSAGE.DAT` and `MESSAGE2.DAT` dialogue

### Known

Both files are big-endian `u16` string-offset tables. `MESSAGE.DAT` contains
1,000 strings and `MESSAGE2.DAT` contains 423. Their text includes ordinary
vendor greetings, access denials, menus, rumors, reusable interactions, and
other executable-driven dialogue.

Scenario dialogue is already handled separately through `SNR*.MES`. The
save-aware query selects protagonist and shared-scenario transcripts and now
reports the ordinary building entry separately. Consequently, “no story
dialogue” can still be followed by an ordinary greeting and menu.

The loading and lookup layer is now decoded. `MESSAGE.DAT` and `MESSAGE2.DAT`
use handles `DS:0x05DC` and `DS:0x05DE`, with readers at `MAIN.EXE 0x3929D`
and `0x392EF`. Callers address one combined namespace: `0–999` selects
`MESSAGE.DAT`, while `1000–1422` selects `MESSAGE2.DAT` after subtracting
1,000. A generated inventory resolves 487 direct call sites to their bank,
raw index, entry number, and text.

The entry greetings and access responses for all twelve building types are
also mapped. Non-Palace greetings share the upper vendor panel with the menu.
The Palace alone acknowledges its initial greeting before showing its menu.
Church/Mosque and Market greetings demonstrate that some handlers compute the
message index instead of embedding a literal operand.

The Item Shop, Bank, Church/Mosque, Market, Pub, and Shipyard command handlers
are mapped through their nested prompts and return behavior. This includes
goods and ship trading, both investment paths, Pub crew and character
interactions, waitress and gambling submenus, construction delivery, repairs,
ship sales, and all four Remodel branches. The remaining uncertainty in these
handlers is concentrated in dynamically assembled reports and in helper calls
whose speaker or screen transition is not encoded in the message text.

The unmapped ordinary command groups are Harbor, Lodge, Guild, House of
Fortune, Palace, and special residences. The Palace admission and Defect paths,
Guild Job Assignment dispatch, hostile-building precedence, collector rewards,
and cartographer contracts/reports are already documented separately; they do
not need to be rediscovered while the surrounding command handlers are traced.

For building actions, the save-aware query now selects the decoded ordinary
greeting or access response and lists the visible main menu. It respects
building hours and availability, Church/Mosque and Palace admission, story
routes that certainly suppress ordinary entry, and the Lodge's caller-side
`F8` exception. It also reports hostile-country interception as unresolved
when the continuously advancing general RNG prevents an exact result.

### Unknown

- The query interaction model names a building but not an ordinary menu command
  or nested submenu selection. Command-level prediction will eventually need
  those optional inputs.
- The port-specialty substitution in the ordinary Pub greeting is not yet
  resolved by the query.
- Special residences are selected exactly for cartographers, but collector,
  teacher, and story-residence occupants and menus still require executable
  dispatch mapping.
- Which arguments supply names, ports, goods, nations, prices, and other text
  substitutions in the still-unmapped building handlers and composite reports.
- How each caller selects an ordinary vendor, ruler, patron, guard, or other
  executable-side speaker outside the mapped handlers.
- Which messages in the remaining handlers return to a menu level, suppress a
  menu, or end the interaction.

The semantic distinction between the two banks may not be one clean content
category. The useful result is therefore a caller-level mapping, not merely a
label for each file.

### Next work

1. Resume static command tracing in increasing order of scope:
   - House of Fortune and Lodge;
   - Guild;
   - Palace and special residences; then
   - Harbor, whose Sail, Supply, Moor, docked-ship, and departure paths form the
     largest remaining building handler.
2. Classify computed message indices, substitutions, speaker selection, and
   continuation behavior as each handler is traced rather than as a separate
   bank-wide pass.
3. Resolve the Pub-specialty and non-cartographer residence selectors needed
   to remove the remaining uncertainty from ordinary entry.
4. Once those handlers are mapped, extend the query request with optional
   command and submenu selections.

House of Fortune and Lodge are the next recommended research phase. Runtime
captures should be requested only when static tracing leaves speaker placement,
menu continuation, or a conditional branch ambiguous.

## 2. Remaining scenario-VM state and effects

### Known

The four instruction families, control flow, dialogue presentation, choices,
scenario flags, arithmetic, comparisons, route transitions, music, event art,
duels, forced exits, and several game-state operations are decoded. In
particular:

- `C3` clears the dialogue panels;
- `D0` resolves an indexed game-record reference and `DC` resolves a direct
  game-record reference;
- `E2` loads goods and `E3` counts or transfers carried goods;
- `E6` adds gold;
- `E7` deducts gold;
- `EA` reads displayed gold ingots;
- `EB` performs a bounded scenario-RNG draw; and
- `EE` reads fleet free-cargo capacity.

The system-value selector range used by reachable scripts is now complete:

| Selector | Runtime source | Meaning                            |
| -------: | -------------- | ---------------------------------- |
|        2 | `DS:0x0734`    | stored year offset from 1501       |
|        3 | `DS:0x0735`    | zero-based current month           |
|        4 | `DS:0x0736`    | zero-based current day of month    |
|        5 | `DS:0x0E32`    | current port ID                    |
|        6 | `DS:0xA0A4`    | post-duel balance/result meter     |
|        7 | `DS:0x0737`    | time of day in twenty-minute ticks |

Selector 6 is transient duel state rather than a saved calendar or location
field. The duel engine keeps it in the range `0–200` and treats the endpoints as
terminal outcomes.

### Unknown

Eleven reachable action opcodes still lack gameplay names:

| Opcode | Reachable occurrences | Initial lead                                 |
| -----: | --------------------: | -------------------------------------------- |
|   `C9` |                     3 | presentation or named-character setup        |
|   `D1` |                    22 | game-record or roster operation              |
|   `D4` |                    18 | persistent state mutation                    |
|   `D9` |                    16 | shared-mission/national state                |
|   `E4` |                     2 | item or contract operation                   |
|   `EC` |                     6 | shared Guild-assignment setup                |
|   `ED` |                     5 | shared eligibility or title state            |
|   `F4` |                     6 | one protagonist-specific use per scenario    |
|   `F9` |                     7 | paired story-entity setup                    |
|   `FA` |                     7 | paired story-entity setup                    |
|   `FB` |                     9 | party, roster, or story-character transition |

Several `D0`/`DC` record groups are only partly named. Known groups cover
nations, Fame, sailors, cartographer contracts, inventory, fleets, and ports;
remaining references appear around discoveries, party membership, rewards,
and story-fleet setup. Until those groups are mapped, the query must discard
some indirect values and may branch ambiguously at a later comparison.

### Next work

Trace `D1`, `D4`, and `D9` first. They account for 56 reachable instructions
and are the most likely to change persistent quest state. Then treat
`F9`/`FA`/`FB` as one cluster because they occur together in protagonist setup
and recruitment sequences. For each decoded operation:

1. name its operands and side effects in the disassembler;
2. map its runtime addresses to save structures where applicable;
3. implement the effect in the save-aware query; and
4. add a regression drawn from a naturally reachable scenario path.

Before/after saves are useful only if a handler's writes cannot be mapped
statically. Broad opcode-audition recordings are not needed.

## 3. General gameplay RNG lifecycle

### Known

The scenario `EB` generator is separate and already reproducible. Before each
protagonist-scenario dispatch, its seed is reconstructed from saved calendar,
clock, navigation-level, and navigation-experience fields.

Executable-side choices use a different continuously advancing 32-bit state at
`DS:0xC1CC`/`DS:0xC1CE`:

```text
state = state * 0x41C64E6D + 0x3039    # modulo 2^32
value = (state >> 16) & 0x7FFF
result = value % bound
```

Every successful building visit uses this generator for
`2 + random(3)` twenty-minute ticks, producing a duration of 40, 60, or 80
minutes. Hostile-building encounters and other ordinary handlers consume the
same general generator.

### Unknown

- How the state is initialized at program startup.
- Whether it is serialized in a save or reconstructed when a save is loaded.
- Which loading, town, and transition paths consume draws before the next
  player-visible result.
- Whether exact executable-side randomness can be predicted from a save alone
  or requires process-history state.

### Next work

Trace every write to `DS:0xC1CC`/`DS:0xC1CE`, especially startup and load-game
paths. If static analysis does not settle persistence, compare the first
building duration under three controlled conditions:

1. repeatedly reload one save without restarting the program;
2. restart the program before each load; and
3. perform one known random-consuming action before entering the building.

This runtime test is not yet needed; loader tracing should come first.

## Closed investigations

The following no longer need entries in this tracker:

- general-message bank loading, combined indices, and direct-call inventory;
- entry greetings and command dialogue for Bank, Item Shop, Church/Mosque,
  Market, Pub, and Shipyard;
- building-entry precedence, the Lodge `F8` exception, and access gates;
- menu-command selectors for `Job Assignment`, `Treat`, and `Meet Ruler`;
- ordinary building, voyage-day, battle, and Palace-audience route contexts;
- shared `SNR0` message invocation and save-aware transcript selection;
- ordinary-building dialogue-panel positions, portrait lifetime, and `C4`;
- music IDs and selection through scenario action `CA`; and
- event-art selection through scenario action `CB`.

Their evidence and implementation details remain in the dialog-system guide,
reverse-engineering notes, generated analysis, and relevant game-detail pages.
