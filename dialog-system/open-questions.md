# Dialog-system open questions

This file tracks only gaps that still prevent a complete answer to:

> Given a player state, a port, and an interaction, exactly what conversation
> and post-conversation behavior will occur?

Resolved investigations belong in the [dialog-system guide](./README.md), the
[reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md), and the relevant
game-detail page rather than remaining as full sections here. Runtime evidence
is most useful for field lifecycles, presentation, and executable behavior that
code and data cannot settle; decoded threshold comparisons do not need boundary
testing.

## Current priorities

1. **Identify the time-dependent general-RNG consumer** (Section 3).
2. **Name the remaining record fields** (Section 2).
3. **Extend the query past one command per visit** (Section 1).

All ordinary building command groups have save-aware resolvers, every
reachable scenario opcode is decoded, and every prediction that was checked in
play matched. Completed building mechanics are documented in
[buildings](../game-details/buildings.md) and [ships](../game-details/ships.md).

## 1. Ordinary `MESSAGE.DAT` and `MESSAGE2.DAT` dialogue

### Known

`MESSAGE.DAT` (1,000 strings) and `MESSAGE2.DAT` (423) form one zero-based
namespace, 0–1422. They hold vendor greetings, access responses, menus,
command dialogue, rumors, townsperson lines, and other executable-driven text.
The entry greeting or access response and the main menu of all twelve building
types are mapped, as is every ordinary command handler through its prompts,
branches, and return path.

The save-aware query reports this ordinary dialogue separately from story
dialogue. It applies building hours, admission and hostile-country gates, story
routes that suppress entry or the greeting, and the Lodge's `F8` exception. It
resolves every command of every building type from supplied inputs. It reports
executable-side random outcomes as probabilities with their exact draws,
because the general RNG cannot be recovered from a save (Section 3). The query
is read-only.

### Resolved

- **Substitutions** match the executable's format calls, including the
  cartographer and collector greetings, collector discovery lines, the Pub
  Treat Fame label, the Market specialty line, and Guild Country Info.
- **Speakers** follow the executable. Rulers come from the named-character
  records, crew lines from the Bookkeeper-first or First-Mate-first roster
  choice, and some lines from the protagonist. Named speakers use a lower
  panel of their own. Lines spoken over the Palace image are labelled
  `Palace guard`.
- **Cartographer Locate** reproduces the full sequence and location phrase. The
  Old Map, which cannot be obtained in normal play, always reports
  discovery 0.
- **Guild Job Assignment** reports an active job, the royal-invitation
  reminder, and the royal special search's hint port and coordinates.
- **Mission patrons**: during the royal special search the named Pub patron
  sells the treasure's map, and during Collect Debt the patron is the debtor;
  Treat, Gossip, and Hire all lead there.
- **Market purchases** refuse only below half the price, and Buy Goods stops
  at once without gold.
- **Menu graying** at entry covers Moor, Used Ship, and the cartographer and
  collector commands.
- **The Pub attendant table** starts at `0x1BA2` with 30 records, record 0
  being Carlotta.

Screenshots and saves confirmed each of these that was checked: Carlotta's
Pub greeting, the `|Henry VIII|`, `|Old Guild Worker|`, and `|Head Trader|`
plates, the Bookkeeper's gold lines, the separate named-speaker panel, Used
Ship graying, the Market half-price rule, the Guild's “You'll find Venice
around 45°N 13°E.”, both Locate results and its gold check, the map-selling
patron, and the night-time townspeople. The query reproduces all of them.

### Remaining query coverage

- **Multi-command visits.** The query resolves one command per visit.
  Per-visit state, such as the cartographer's single Report, is reported as a
  note.
- **Interactive controls** such as crew assignment, investigation, gambling,
  and ship design are identified at their handoff rather than simulated.
- **Supply-port prices** for Food, Lumber, and Shot reuse the last regular
  port's metadata pointer held by the running program, which the save does not
  contain. Water and every Dump operation remain exactly predictable.
- **Pub attendant quirk.** With protagonist bit `0x10` set, the attendant
  check reads the previously stored attendant, which the save does not hold.

## 2. Scenario-VM state and effects

### Known

Every reachable action opcode and `D0`/`DC` record group is decoded; the
details are in the
[reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md#remaining-action-opcodes).
In brief:

- `C3` closes the most recently opened dialogue panel and `C4` closes all
  panels.
- `C9 <var> <mes>` shows a forced menu built from the lines of an MES entry and
  stores the zero-based choice in the variable.
- `D0`/`DC` resolve references into twenty record groups: nations, Fame,
  gold and bank, sailors, collectors and cartographers, Pub attendants, the
  roster and inventory block, ship slots, fleets, supplies, ship instances,
  ship models, ports, port metadata, market definitions, Used Ship stock,
  discoveries, items, `COLONY.DAT` text, and goods names.
- `D1 <var>` recomputes a fleet's course from its order fields; scripts use it
  to send story fleets after a protagonist or to a port.
- `D4 <mes>` expands an MES entry into the string buffer, and system value 0
  copies it, usually to rename a sailor.
- `D9 00 <selector>` closes all panels and shows one of nine formatted Guild or
  royal-mission messages from `MESSAGE.DAT` (941–957).
- `E2`/`E3` load, count, or transfer goods; `E4` sets gold; `E6`/`E7` add and
  deduct gold; `EA` reads Gold Ingots; `EE` reads free cargo space.
- `EB` draws from the scenario RNG, `EC` restores it from a variable, and `ED`
  saves it into one.
- `F4 <ending>` plays a protagonist's ending and exits to `END.EXE`.
- `F9 <type>` starts a pending ship, `FA <mes>` commissions and names it, and
  `FB <sailor>` adds a sailor to the party.
- Variable 63 is a control word: a nonzero value after an entry route skips
  the ordinary greeting and, for the shared route, the protagonist route.
- Variable 60 holds the opposing captain before and after a naval battle. The
  after-battle hook runs after every battle except a defeat; scripts tell a
  victory from an escape by whether that captain still commands a fleet.

The save-aware query models all of these. Record references are resolved as
save addresses with per-path writes, so later branches see earlier writes.
Play confirmed the `D9` speaker plates, `E4` setting gold, and Catalina's fleet
being sent to Seville and removed from the sea after Ali's decoy encounter.

### Unknown

Only field meanings remain, and none of them changes which dialogue is shown:

- the gameplay meaning of port-table bit `0x20`, which João's and Ernst's
  scripts set on Changan, Sakai, and Nagasaki;
- sailor duty codes 4 and 5 (probably Bookkeeper and Navigator);
- Fame-record bytes `+6` and `+7`;
- fleet fields `+0x0C`, `+0x21`, and `+0x22`, and the names of fleet order
  types other than 7 (pursue) and `0x0A` (follow).

## 3. General gameplay RNG lifecycle

Executable-side choices use a 32-bit state at `DS:0xC1CC`/`DS:0xC1CE`:

```text
state = state * 0x41C64E6D + 0x3039    # modulo 2^32
value = (state >> 16) & 0x7FFF
result = value % bound
```

### Known

- The state lies in `DS:0xBF32–0xC790`, which the C startup code clears
  (`0x89C7–0x89D1`), so it starts at 0 when the program is launched.
- Nothing reseeds it. The only direct writes are the generator itself
  (`0x0A181`) and an `srand`-style setter (`0x0A18E`) that has no caller, and
  the executable's time-of-day helper has no caller either.
- It is not stored in the save, and loading a save does not change it.
- In daytime every town frame moves the walking townspeople, which costs 8–12
  draws plus one per visible fixed townsperson, whether or not the player moves
  (see [Townspeople](../game-details/townspeople.md#general-rng-consumption)).
  At night the routine makes none.
- The clock advances only through building visits, arrival, battles, and
  loading, so town frames do not trigger time-based world updates.

Random results driven by this generator therefore cannot be predicted from a
save, and the query reports them as probabilities.

### Unknown

In play, relaunching the program, loading the same save, and entering the same
building at night gave different visit lengths. Some routine other than the
townspeople must therefore draw a number of values that depends on elapsed real
time before the building is entered, perhaps in the start-up menus or another
frame loop. A quick way to narrow it down is to relaunch and load the same
save twice, entering the building immediately the first time and after
waiting a minute on the title or load screen the second time.

## Closed investigations

The following no longer need entries in this tracker:

- general-message bank loading, combined indices, and direct-call inventory;
- entry greetings, access gates, and command dialogue for all twelve building
  types, including regular- and supply-port Harbor variants;
- building-entry precedence, the Lodge `F8` exception, and variable 63;
- menu-command selectors for `Job Assignment`, `Treat`, and `Meet Ruler`;
- ordinary building, voyage-day, battle, and Palace-audience route contexts;
- shared `SNR0` message invocation and save-aware transcript selection;
- dialogue-panel positions, portrait lifetime, and `C4`;
- music IDs and selection through scenario action `CA`;
- event-art selection through scenario action `CB`;
- every reachable scenario action opcode and `D0`/`DC` record group;
- the general RNG's initialization, persistence, and unpredictability from a
  save; and
- townsperson movement and the lines shown when walking into a townsperson.

Their evidence and implementation details remain in the dialog-system guide,
reverse-engineering notes, generated analysis, and relevant game-detail pages.
