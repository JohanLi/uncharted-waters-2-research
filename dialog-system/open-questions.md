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
3. Map ordinary `MESSAGE.DAT`/`MESSAGE2.DAT` callers and speaker/portrait
   selection.
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

**Unknown:** Why does the current compound-signature extractor find far fewer
direct dialog calls in `SNR0.DAT` than there are strings in `SNR0.MES`?

Possibilities include another message-selection action, indirect indices,
message IDs passed to executable quest handlers, or direct `MAIN.EXE` access to
the shared MES handle.

**Why it matters:** The query can now report shared state and the matching
route, but it cannot reproduce the shared conversation generally.

**Next evidence:** Trace reads from the shared SNR MES handle and compare
runtime breakpoints for a Guild contract offer, Treat rumor, Palace mission
offer, mission completion, and rejection path.

## 5. Remaining scenario actions

**Decoded since this list was started:** `DC` resolves a game-state field
reference into a VM variable. Combined with indirect assignment modes, it can
read and write structured save records. Group-1 and group-3 references resolve
protagonist Fame/state and sailor fields, while the Ernst routes use group 4
for the active cartographer-contract byte. `F8` returns the forced-building-
exit/menu-suppression result. `EA <variable>` stores the displayed gold-ingot
count in a VM variable.

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

## 6. Dialog-slot and portrait lifetime

**Decoded:** `C0` selects positions 0, 1, or 2; `CC` selects a character;
position 0 is used by lines without an explicit portrait selection.

**Unknown:** Are positions 1 and 2 always fixed screen sides? Do they instead
select reusable actor slots? When are an earlier portrait, nameplate, or
background cleared? What happens if a line changes position without another
`CC`?

**Why it matters:** The current output can state the encoded slot and character
but cannot promise the exact on-screen composition in every sequence.

**Next evidence:** Build a corpus of short sequences covering slot
changes, repeated characters, `C4`, position 0, and dialog-run boundaries.
Capture frames or trace the presentation globals written by the `C0`, `CC`,
and `C7` handlers.

## 7. Music selection outside `CA`

**Unknown:** Which executable or scenario paths change music without an
adjacent `CA <track>` instruction? Does building entry choose a default theme
before scenario execution, and can other presentation actions override it?

The battle theme heard before João's initial 2,000-fame Pub scene has no nearby
`CA 10` in the decoded route.

**Why it matters:** A conversation transcript should report all audible music
changes, not only explicit SNR cues.

**Next evidence:** Break on the central music-selection routine and log
callers during ordinary entry, explicit `CA` scenes, and the known implicit
battle-theme scene.

## 8. Complete route-context mapping

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

## 9. Remaining VM inputs and save fields

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

## 10. Ordinary vendor portrait and speaker selection

**Unknown:** How does ordinary building code select the visible vendor,
portrait, and speaker name? Is it fixed by building type, port tileset, occupant
data, executable constants, or another resource table?

Special residences demonstrate that one building slot can represent a
collector, cartographer, teacher, or story residence. General message text
alone does not identify the complete presentation.

**Why it matters:** A complete conversation result should distinguish the
speaking vendor from a portraitless system message and a scenario-selected
character.

**Next evidence:** Trace the portrait-selection call before ordinary
greetings in several instances of each building type, especially special
residences and Church/Mosque variants.

## 11. Randomness and cached outcomes

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

## 12. Voyage-day lifecycle

**Decoded:** Protagonist selector `0xA0` receives the current voyage-day
counter, and known João routes respond to specific values.

**Unknown:** Does entering a port reset, pause, or preserve that counter, and
exactly when is it incremented relative to midnight and scenario dispatch?

**Why it matters:** Some building conversations become available only after an
at-sea transition has advanced the scenario subsection.

**Next evidence:** Use otherwise identical saves to enter a port, remain
at sea, or depart again around midnight, and compare both the counter and the
selected `0xA0` route.
