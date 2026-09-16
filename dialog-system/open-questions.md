# Dialog-system open questions

This file tracks gaps that prevent a complete answer to:

> Given a player state, a port, and a building, exactly what conversation and
> post-conversation behavior will occur?

Questions are ordered roughly by how much they block an end-to-end predictor.
When one is resolved, update this file together with the relevant extractor,
regression test, and [dialog-system guide](./README.md).

## 1. Building-entry dispatch and precedence

**Unknown:** What is the exact execution order among ordinary access checks,
hostile-country encounters, protagonist SNR routes, shared `SNR0` routes,
ordinary greetings, and opening the building menu?

Known routines prove that these systems coexist, but the repository does not
yet have one call graph showing their complete precedence and short-circuit
behavior. It is also unclear whether all building types share the same order.

**Why it matters:** Without this, two individually decoded handlers cannot
always be combined into one guaranteed player-visible outcome.

**Suggested evidence:** Trace the building-entry dispatcher from
`MAIN.EXE 0x20930` through scenario dispatch and the individual building
routines. Validate representative saves for a normal visit, a protagonist
event, an `SNR0` quest, an access rejection, and a hostile-port encounter.

## 2. Forced exit and menu suppression

**Unknown:** Which scenario action or executable return value ejects the player
from a building, changes the town position, or suppresses the normal menu?

Runtime tests show that visually similar reminder conversations can differ:
one leaves the player inside, while another returns the player outside. Dialog
wording alone is not reliable evidence.

**Why it matters:** Predicting the spoken lines is incomplete if the caller
cannot also know whether the building remains usable.

**Suggested evidence:** Compare instruction sequences for confirmed ejecting
and non-ejecting João routes. Trace their still-unnamed action handlers and
interpreter return state, then compare town-position/menu state immediately
before and after each scene in a debugger or controlled save.

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

**Suggested evidence:** Identify the load handles and central print/format
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

**Suggested evidence:** Trace reads from the shared SNR MES handle and compare
runtime breakpoints for a Guild contract offer, Treat rumor, Palace mission
offer, mission completion, and rejection path.

## 5. Remaining scenario actions

**Unknown:** What are the gameplay names and side effects of the remaining
valid `0xC0`–`0xFC` action opcodes?

Particular targets include operations that may control portraits, menus,
movement, rewards, party membership, combat results, and transitions back to
ordinary building code.

**Why it matters:** The bytecode is structurally traversable, but an unknown
action between two dialog runs may materially change the outcome.

**Suggested evidence:** Continue tracing the action-handler callees in the
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

**Suggested evidence:** Build a corpus of short sequences covering slot
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

**Suggested evidence:** Break on the central music-selection routine and log
callers during ordinary entry, explicit `CA` scenes, and the known implicit
battle-theme scene.

## 8. Complete route-context mapping

**Unknown:** What do all building/context qualifier values mean, including
values such as `0x04`, `0x06`, and scenario-specific values above the ordinary
building range? When does the engine pass a wildcard rather than a distinct
Lodge, Guild, or Bank context?

Known route tables show that qualifier values are not simply the one-based
twelve-building list minus one in every situation.

**Why it matters:** A predictor must construct the same selector and qualifier
that `MAIN.EXE` supplies for the current interaction.

**Suggested evidence:** Instrument both protagonist and shared route dispatch
and log selector/qualifier pairs while entering every building and invoking
sub-interactions such as Treat, Job Assignment, and Palace audiences.

## 9. Remaining VM inputs and save fields

**Decoded:** Port, time, flags, persistent VM variables, several fame checks,
random operations, and some quest-specific values are understood.

**Unknown:** What are the general meanings of the remaining assignment-source
selectors, VM variables, and comparison operands? Important candidates include
money, title/rank, inventory, allied-port count, date, party members, battle
result, and quest resources.

**Why it matters:** An unresolved comparison forces the query tool to emit
ambiguous paths even when the necessary value exists in the save.

**Suggested evidence:** Trace each source selector in the VM assignment
handler, map its runtime address to known save structures, and add boundary
saves around the conditions listed in the quest research.

Highest-value controlled saves currently include:

- Catalina at piracy fame 0/1, 1,499/1,500, and 1,999/2,000;
- Pietro around 1,000 Adventure Fame and 2,000 gold independently;
- Ali with 14 and 15 allied ports;
- Ernst immediately before and after signing a cartographer contract.

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

**Suggested evidence:** Trace the portrait-selection call before ordinary
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

**Suggested evidence:** Trace the random generator and cached state around the
ordinary handlers, repeat entries without advancing time, and compare runs
across reloads and day transitions.

## 12. Voyage-day lifecycle

**Decoded:** Protagonist selector `0xA0` receives the current voyage-day
counter, and known João routes respond to specific values.

**Unknown:** Does entering a port reset, pause, or preserve that counter, and
exactly when is it incremented relative to midnight and scenario dispatch?

**Why it matters:** Some building conversations become available only after an
at-sea transition has advanced the scenario subsection.

**Suggested evidence:** Use otherwise identical saves to enter a port, remain
at sea, or depart again around midnight, and compare both the counter and the
selected `0xA0` route.
