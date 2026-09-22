# Dialog-system open questions

This file tracks only gaps that still prevent a complete answer to:

> Given a player state, a port, and an interaction, exactly what conversation
> and post-conversation behavior will occur?

Resolved investigations belong in the [dialog-system guide](./README.md), the
[reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md), and the relevant
game-detail page rather than remaining as full sections here.

Literal threshold comparisons no longer need routine boundary testing; their
inclusive lower bounds are decoded. New runtime evidence is most useful for
field lifecycle, presentation, or
executable behavior that cannot be settled from code and data.

## Current priorities

1. **Audit command-level save queries.** Every ordinary building group now has
   a resolver; remaining gaps are interactive controls, transient process
   state, computed presentation, and random outcomes.
2. **Complete reachable VM state and effect coverage.** Name the remaining
   action opcodes and game-record groups that can alter a selected route's
   result.
3. **Trace the general gameplay RNG lifecycle.** Determine initialization,
   save/load persistence, and intervening draws so executable-side random
   results can be predicted from a save when possible.

The first item is now a refinement phase. Entry greetings and menus,
every regular-Harbor, Bank, Church/Mosque, and House of Fortune command, and
Lodge Check In and Port Info are queryable. Supply-port Rename Port now accepts
and validates a proposed name, and Item Shop Buy/Sell resolves local stock,
inventory, prices, equipment, and the probabilistic counteroffer. The
Guild now resolves prepared assignment rows and Country Info, and selecting a
job executes its shared SNR0 offer. Collector, cartographer, and skill-teacher
commands are also queryable. Palace queries now cover the ordinary ruler
submenu, Defect availability, national documents, and royal Gold and Ship aid.
Lodge Gossip and Pub Meet reconstruct the local sailor list and their shared
Treat, Gossip, Hire, and Duel paths. The remaining Pub commands are also
queryable: crew recruitment, Treat, waitress actions, and gambling resolve
through their deterministic dialogue and stop explicitly at interactive
crew-assignment, investigation, or minigame handoffs. Market queries now
resolve local stock, prices, cargo limits, deterministic purchases and sales,
price tables, and commercial investment. Shipyard queries resolve available
new models and materials, repairs, ship-sale guards, Remodel routing and
renaming, and industrial investment. Used-ship stock, price negotiations, and
interactive ship-design or remodeling controls stop at explicit handoffs.

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

The Item Shop, Bank, Church/Mosque, Market, Pub, Shipyard, House of Fortune,
Lodge, and Guild command handlers are mapped through their nested prompts and
return behavior. This includes goods and ship trading, both investment paths,
Pub crew and character interactions, waitress and gambling submenus,
construction delivery, repairs, ship sales, all four Remodel branches, every
fortune reading, Lodge rest and sailor interactions, the Lodge's
national-Support display, Guild assignment selection, and the complete
Country Info report. The remaining uncertainty in these handlers is
concentrated in dynamically assembled reports and in helper calls whose
speaker or screen transition is not encoded in the message text.

The Palace and special-residence command handlers are mapped. This covers
the ordinary ruler audience and its Sphere of Influence, Letter of Marque, and
Tax Free Permit submenu; Defect; royal Gold and Ship aid; collector contracts,
discoveries, and rumors; all four cartographer commands; both skill teachers;
and locked story residences. The Harbor is now mapped as well: Sail's fleet
checks and departure transition, Supply's load/dump grid and price formulas,
Moor's Store/Commission/Exchange record movement, local dock capacity, and the
separate supply-port Rename Port path are decoded.

For building actions, the save-aware query now selects the decoded ordinary
greeting or access response and lists the visible main menu. It respects
building hours and availability, Church/Mosque and Palace admission, story
routes that certainly suppress ordinary entry, and the Lodge's caller-side
`F8` exception. It also reports hostile-country interception as unresolved
when the continuously advancing general RNG prevents an exact result.

The query now accepts colon-separated command paths. It predicts Harbor Sail
through its Yes/No departure choice; resolves Supply load/dump limits and
quantities; follows Moor Store, Commission, and Exchange selections; selects
and validates supply-port names; executes Item Shop purchases and deterministic
sales; executes every Bank transaction and House of Fortune reading; executes
Lodge Check In and Port Info; and resolves Church/Mosque Pray and Donate
amounts. It reports the Item Shop counteroffer as probabilistic because the
general gameplay RNG state is not saved. Unsupported commands are identified
explicitly in the result. The query remains read-only: reported effects
describe what the game would do and do not modify the supplied save.

Guild queries reconstruct the three persistent assignment rows, including
duplicates, and route a selected row through the corresponding SNR0 offer
table. Country Info renders the cached Profit, Friendship, Relations,
alliance/blockade markers, target, and merchant-fleet destination. Special
residence queries cover collector contracts, discovery turn-ins and Rumor;
cartographer contracts, lessons, reports and treasure-map analysis; and both
skill teachers. Collector Rumor remains probabilistic because it uses the
general gameplay RNG.

### Remaining query coverage

All ordinary building command groups now have save-aware resolvers. The
remaining gaps are narrower interactive or process-state boundaries:

- arguments for names, ports, goods, nations, prices, and other computed text;
- executable-side speaker selection for rulers, patrons, guards, sailors, and
  residence occupants where the caller, rather than the message, chooses it;
- panel placement and menu continuation for helper-rendered screens; and
- the random branches that use the unsaved or not-yet-located general RNG.

The cartographer Locate result includes an executable-assembled location
phrase after its ordinary messages. The query identifies the selected map,
payment, and persistence effect, but does not yet reproduce that rendered
phrase.

Food, Lumber, and Shot prices at supply ports are a special process-state
limitation. These ports reuse the last regular-port metadata pointer retained
by the running executable. That previous pointer is not in the save; Water and
every Dump operation remain exactly predictable.

### Next work

1. Audit computed substitutions, speakers, panel placement, and menu
   continuation across the completed command resolvers.
2. Trace the general gameplay RNG and transient executable state needed for
   used-ship stock, negotiations, rumors, and other probabilistic paths.
3. Extend the query past interactive handoffs only where the following screen
   is deterministic from explicit user inputs.

This phase is primarily static. Runtime captures are useful only when speaker
placement, menu continuation, or a conditional branch remains ambiguous after
tracing. Save pairs are not needed merely to revalidate decoded thresholds.

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
- `EB` performs a bounded scenario-RNG draw;
- `EC` restores the scenario RNG state from a scenario-variable checkpoint;
  and
- `EE` reads fleet free-cargo capacity.

`EC <variable>` reads that 16-bit scenario variable, shifts it left by eight,
and writes the resulting 32-bit value to the scenario RNG state. All six
reachable occurrences are `EC 08` in shared Guild-assignment setup routes.

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

Ten reachable action opcodes still lack gameplay names:

| Opcode | Reachable occurrences | Initial lead                                 |
| -----: | --------------------: | -------------------------------------------- |
|   `C9` |                     3 | presentation or named-character setup        |
|   `D1` |                    22 | game-record or roster operation              |
|   `D4` |                    18 | persistent state mutation                    |
|   `D9` |                    16 | shared-mission/national state                |
|   `E4` |                     2 | item or contract operation                   |
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
- static entry greetings and command-dialogue maps for all twelve building
  types, including regular- and supply-port Harbor variants;
- building-entry precedence, the Lodge `F8` exception, and access gates;
- menu-command selectors for `Job Assignment`, `Treat`, and `Meet Ruler`;
- ordinary building, voyage-day, battle, and Palace-audience route contexts;
- shared `SNR0` message invocation and save-aware transcript selection;
- ordinary-building dialogue-panel positions, portrait lifetime, and `C4`;
- music IDs and selection through scenario action `CA`; and
- event-art selection through scenario action `CB`.

Their evidence and implementation details remain in the dialog-system guide,
reverse-engineering notes, generated analysis, and relevant game-detail pages.
