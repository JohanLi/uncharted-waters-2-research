# Dialog-system open questions

This file tracks gaps that prevent a complete answer to:

> Given a player state, a port, and a building, exactly what conversation and
> post-conversation behavior will occur?

When one is resolved, update this file together with the relevant extractor,
regression test, and [dialog-system guide](./README.md).

## Current priorities

The literal threshold comparisons themselves no longer need routine boundary
testing. Repeated controlled tests have confirmed the decoded inclusive lower
bounds. New runtime evidence is most useful when it identifies dispatch, field
lifecycle, or presentation behavior that is not contained in the scenario
bytecode.

### Highest-value executable investigations

1. Complete shared-`SNR0` message invocation so royal missions and ordinary
   shared quests produce transcripts rather than only matched routes.
2. Trace complete building-entry precedence, including the point at which an
   SNR route suppresses ordinary dialogue or the building menu.
3. Map ordinary `MESSAGE.DAT`/`MESSAGE2.DAT` callers and speaker selection.
4. Decode the remaining VM record groups and action opcodes that occur on
   reachable story paths.

### Highest-value runtime tests

| Priority | Test                      | Save immediately before…                                                | Evidence to record                                                          |
| -------: | ------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
|        1 | Voyage-day lifecycle      | Midnight at sea and the corresponding port-entry/departure alternatives | Voyage-day byte before and after midnight, port entry, and departure        |
|        2 | Ordinary random greetings | Repeated entry into the same Bank or Lodge without advancing time       | Dialogue across repeated entries, reloads, and the next time/day transition |

## 1. Building-entry dispatch and precedence

**Unknown:** What is the exact execution order among ordinary access checks,
hostile-country encounters, protagonist SNR routes, shared `SNR0` routes,
ordinary greetings, and opening the building menu?

Known routines prove that these systems coexist, but the repository does not
yet have one call graph showing their complete precedence and short-circuit
behavior. It is also unclear whether all building types share the same order.

**Why it matters:** Without this, two individually decoded handlers cannot
always be combined into one guaranteed player-visible outcome.

**Next evidence:** Trace the building-entry dispatcher from
`MAIN.EXE 0x20930` through scenario dispatch and the individual building
routines. Validate representative saves for a normal visit, a protagonist
event, an `SNR0` quest, an access rejection, and a hostile-port encounter.

## 2. Forced exit and menu suppression

**Decoded:** Scenario action `F8` clears a caller-provided interaction-control
word. In controlled Pietro routes, `F8 F2` suppresses the normal building menu
and returns the player outside, while otherwise comparable routes ending in
`F2` alone leave the building usable.

**Remaining unknown:** Whether the caller always implements this result by
changing the saved town position, and what `F8` means in non-building scenario
contexts. Dialog wording alone is still not reliable evidence.

**Why it matters:** Predicting the spoken lines is incomplete if the caller
cannot also know whether the building remains usable.

**Evidence:** Pietro's ejecting Genoa Pub, Church, and wildcard debt encounters
all end in `F8 F2`. His non-ejecting Lodge reassurance ends in `F2` without
`F8`. The `MAIN.EXE 0x38EE3` handler writes zero through the interaction-state
pointer supplied to the interpreter.

## 3. `MESSAGE.DAT` versus `MESSAGE2.DAT`

**Decoded:** Both are big-endian `u16` string-offset tables containing 1,000
and 423 strings respectively.

**Unknown:** What is the precise semantic division between the banks, and
which executable helpers select each one? Which call sites use a raw zero-based
index, add a bank-specific base, or expose one-based numbering in research
notes?

**Why it matters:** A complete ordinary-building predictor must associate a
branch with the correct text and runtime substitutions without off-by-one or
wrong-bank errors.

**Next evidence:** Identify the load handles and central print/format
helpers in `MAIN.EXE`, enumerate their cross-references, and record message
bank plus raw index at each building-related caller. Add a small extractor that
publishes both `rawIndex` and `entryNumber` explicitly.

## 4. Complete `SNR0` message invocation

**Partly decoded:** The extractor previously missed the shared scenario's
dynamic portrait form:

```text
C0 <position> CD <variable> C8 <message> C7
```

The `CD` handler reads a one-byte VM-variable number, loads the 16-bit
character index stored in that variable, and calls the same portrait-selection
routine as `CC`. `SNR0` derives variable 50 from the protagonist's current
sailor affiliation and variable 51 from the diplomatic mission's stored
destination nation. Runtime observation confirms the general
current-allegiance ruler → destination ruler → current-allegiance ruler
sequence in the upper panel; the mapping covers all six nations and does not
depend on the visited Palace. Ordinary capital Palace dialogue selects its
ruler through a separate, location-driven path.

The decoder now recognizes 83 such indirect-character lines: 59 using variable
50 and 24 using variable 51. Together with one position-0 line, this accounts
for 84 of the 272 `SNR0.MES` messages.

**Still unknown:** The remaining messages may be selected after intervening
branches rather than in one compound signature, passed to executable quest
handlers, or read directly through the shared MES handle.

**Why it matters:** The query can now report shared state and the matching
route, but it cannot reproduce the shared conversation generally.

**Next evidence:** Make dialogue extraction stateful across branches and trace
reads from the shared SNR MES handle for a Guild contract offer, Treat rumor,
mission progress, and rejection paths.

## 5. Remaining scenario actions

**Decoded since this list was started:** `DC` resolves a game-state field
reference into a VM variable. Combined with indirect assignment modes, it can
read and write structured save records. Group-1 and group-3 references resolve
protagonist Fame/state and sailor fields, while the Ernst routes use group 4
for the active cartographer-contract byte. `CD <variable>` selects a character
indirectly through a VM variable. `F8` returns the forced-building-exit/menu-
suppression result. `EA <variable>` stores the displayed gold-ingot count in a
VM variable. `CB <x:u16> <y:u16> <index>` draws the indexed record from the
current protagonist's `EVENTn.DAT` resource; all 39 reachable calls use
position `(112, 24)` and are prefixed by `C0 03`.

**Unknown:** What are the gameplay names and side effects of the remaining
valid `0xC0`–`0xFC` action opcodes?

Particular targets include operations that may control portraits, menus,
movement, rewards, party membership, combat results, and transitions back to
ordinary building code.

**Why it matters:** The bytecode is structurally traversable, but an unknown
action between two dialog runs may materially change the outcome.

**Next evidence:** Continue tracing the action-handler callees in the
range recorded in the
[reverse-engineering notes](./scripts/REVERSE_ENGINEERING.md).
Correlate each handler's memory writes and calls with controlled before/after
saves and runtime observations.

## 6. Dialog-slot and portrait lifetime — mostly resolved

**Decoded and runtime-confirmed:** `C0` position 1 selects the upper scenario
panel and position 2 the lower; `CC` supplies that panel's character. Dialogue
need not alternate. Dismissing a line clears its text but retains the panel and
portrait, so the inactive panel may remain on screen with an empty text area.
Selecting the same panel with another `CC` replaces its portrait.

In an ordinary Pub, position 0 reuses the building-supplied bartender in the
upper panel. It does not select a scenario portrait, and a lower scenario
portrait remains visible while the bartender answers. Leaving and re-entering
the building reconstructs the ordinary vendor presentation rather than
carrying scenario-panel contents across visits.

`C4` closes and removes both scenario panels with a horizontal wipe, briefly
revealing the ordinary vendor underneath; the next portrait line constructs a
new panel. By contrast, a state-changing action that splits the extractor's
`dialogueRun`—the 1,000-coin grant in João's Pub scene—does not clear either
panel. The display updates and the conversation continues in place.

`SNR0`'s alternate character selector is also resolved: `CD 32` and `CD 33`
read character indices from VM variables 50 and 51. Royal-mission captures
confirm that the resolved ruler is displayed in the same upper panel selected
by position 1.

**Still unknown:** Is position 0 always a request to use the surrounding
executable's current speaker presentation, including outside ordinary
buildings?

**Why it matters:** The exact composition can now be described for ordinary
building conversations, but position 0 may be context-sensitive.

**Next evidence:** Trace the presentation globals used by the position-0 path
in a non-building event. The broad capture corpus originally requested is no
longer needed.

## 7. Complete route-context mapping

**Decoded:** Ordinary building qualifiers `0x00` through `0x0B` map in order
to Market, Pub, Shipyard, Harbor, Lodge, Palace, Guild, special residence,
Bank, Item Shop, Church/Mosque, and House of Fortune. `0xFF` is a wildcard.
Selectors `0xA0`, `0xA1`, and `0xA2` cover voyage-day, before-battle, and
after-battle dispatch respectively.

**Unknown:** What produces special contexts such as `0x15`, and when does the
engine deliberately pass `0xFF` instead of a building's distinct qualifier?
Sub-interactions such as Treat, Job Assignment, Palace audiences, and menu
commands may use a second dispatch layer that is not yet enumerated.

**Why it matters:** A predictor must construct the same selector and qualifier
that `MAIN.EXE` supplies for the current interaction.

**Next evidence:** Instrument both protagonist and shared route dispatch
and log selector/qualifier pairs while entering every building and invoking
sub-interactions such as Treat, Job Assignment, and Palace audiences.

## 8. Remaining VM inputs and save fields

**Decoded:** Calendar day, port, time-of-day, flags, persistent VM variables,
indirect Fame and sailor-record reads, random operations, gold-ingot counts,
item-slot scanning, cartographer contracts, and Ali's cached port-controller
scan are understood. Assignment-source selector 4 reads the zero-based current
day of the month. Catalina's Lucia sequence stores that value and uses a
separate visit counter, so crossing midnight—not the nominal two elapsed
hours—selects its late branch. `EA <variable>` stores
`floor(combined on-hand gold / 10,000)`. Controlled evidence confirms Pietro's
one-ingot gate, Ali's 100-ingot gate, and Catalina's early Fame lifecycle.

**Unknown:** What are the general meanings of the remaining assignment-source
selectors, record groups, VM variables, and comparison operands? Candidates
include party membership, duel/battle aftermath, rewards, and quest resources.

**Why it matters:** An unresolved comparison forces the query tool to emit
ambiguous paths even when the necessary value exists in the save.

**Next evidence:** Trace each source selector in the VM assignment handler,
map its runtime address to known save structures, and add boundary saves only
where field lifecycle or dispatch remains uncertain.

The highest-value controlled saves are now before/after captures for unresolved
fields or effects whose meaning cannot be established from the bytecode—not
routine confirmation of decoded literal boundaries.

Repeated controlled tests have confirmed the decoded comparison operators and
their inclusive boundaries. Explicit literal thresholds should therefore be
treated as reliable without requesting a runtime pair unless dispatch, field
semantics, or another external precondition remains uncertain.

## 9. Ordinary vendor portrait and speaker selection — resolved

Ordinary vendors use fixed `GRAPH.DAT` artwork based on building type.
Zero-based records 6–17 correspond in order to building IDs 1–12.
Church/Mosque is the only port variant: a Church uses record 16, while a Mosque
uses record 20. The port's tileset already determines which religious variant
applies.

Special residences always use record 13. Their occupant controls the speaker,
text, and available interaction—not the vendor portrait. Thus Mercator,
Gerard de Jode, Olives, Dr. Wolf, collectors, and story occupants can all speak
over the same residence artwork.

The vendor is rendered in the upper dialogue panel and never simultaneously
with a scenario portrait in that panel. Scenario dialogue can instead use an
upper character portrait or the lower panel. This functional mapping is now
documented in [Buildings](../game-details/buildings.md#vendor-portraits-and-dialogue-panels).

## 10. Randomness and cached outcomes

**Decoded:** `EB` generates explicit uniform scenario values using remainder
division, and small bounds can be represented as probability branches.

**Unknown:** Which ordinary-building choices use separate random sources, when
their results are cached, and when time/day/entry refreshes them? The observed
Bank/Lodge greeting variation in João's opening is one unresolved example.

**Why it matters:** “Given a player state” may yield a probability distribution
rather than one deterministic conversation, or may require hidden RNG/cache
state not currently read from the save.

**Next evidence:** Trace the random generator and cached state around the
ordinary handlers, repeat entries without advancing time, and compare runs
across reloads and day transitions.

## 11. Voyage-day lifecycle

**Decoded:** Protagonist selector `0xA0` receives the current voyage-day
counter, and known João routes respond to specific values.

**Unknown:** Does entering a port reset, pause, or preserve that counter, and
exactly when is it incremented relative to midnight and scenario dispatch?

**Why it matters:** Some building conversations become available only after an
at-sea transition has advanced the scenario subsection.

**Next evidence:** Use otherwise identical saves to enter a port, remain
at sea, or depart again around midnight, and compare both the counter and the
selected `0xA0` route.
