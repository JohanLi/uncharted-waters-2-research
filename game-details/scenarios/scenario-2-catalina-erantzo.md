# Scenario 2: Catalina Erantzo

Catalina's story is a Piracy Fame progression built around naval-battle hooks,
searches for João, and the conflict with Bret Perot and Antonio Khan. Reaching
a later Fame value does not skip the active scenario section or its required
battle and building stages.

This guide is decoded primarily from `SNR2.DAT` and `SNR2.MES`. It has less
controlled-play coverage than [João's guide](./scenario-1-joao-franco.md), so
exact triggers without runtime confirmation are labeled **Decoded** rather than
**Confirmed**.

## Story and threshold map

| Section |   Piracy Fame gate | Story                                               |
| ------: | -----------------: | --------------------------------------------------- |
|       0 |                  — | Break with the Spanish Navy and steal the Galleon   |
|       1 |                  1 | Spanish pursuit and Andreas's recruitment           |
|       2 |  1,500, then 2,000 | First search for João                               |
|       3 | 2,000 continuation | Five-day search and Shipyard encounter              |
|       4 |              8,000 | Bret Perot's randomized hunt                        |
|       5 |                  — | Lucia's kidnapping and the Bret Perot confrontation |
|       6 |             15,000 | Massawa and the Turkish fleet                       |
|       7 |             30,000 | Franco truth and Neo-Atlantis finale                |

There is no 4,000 comparison in `SNR2.DAT`. The commonly reported 4,000 tier
appears to combine the staged 1,500/2,000 checks or an external gameplay
assumption.

## Section guide

### 0: Spanish Navy break

The opening uses Seville-specific routes for the Navy headquarters, Pub, and
Harbor. Scenario flags make those visits ordered one-shot stages before the
voyage-day handoff. Catalina steals the Galleon and begins the Spanish pursuit.

### 1: pursuit and Andreas

The first decoded Piracy Fame comparison is the literal value **1**, not
1,000. Four narrow before/after-battle substages handle the pursuing Spanish
fleets and Andreas's introduction. A battle in the wrong subsection cannot
perform the expected story advance.

A controlled save pair at Piracy Fame 0 and 1 is still needed to determine
whether ordinary dispatch imposes another practical gate before this bytecode
runs.

### 2–3: first search for João

Section 2 checks 1,500 Piracy Fame on the regular-port path and later checks
2,000 before handing off. Section 3 continues the 2,000-Fame storyline through
voyage-day waits and building substages, ending in a Shipyard encounter with
João and his escape. These are consecutive stages, not separate 2,000- and
4,000-Fame quests.

### 4–5: Bret Perot

At 8,000 Piracy Fame, the scenario explicitly randomizes the hunt:

- `EB 10 00 14` chooses one of 20 destination values;
- `EB 00 00 04` creates a one-in-four branch during a town search.

The following section routes through Ceuta (`0x1A`) and Alexandria (`0x12`),
covers Lucia's kidnapping, and ends with the battle hooks for Antonio Khan,
zero-based sailor ID `0x3C`.

### 6: Massawa and the Turks

An exact 15,000 Piracy Fame check leads into an after-battle informant route.
Later substages cover João, Massawa, the Turkish fleets, and Lord Taphali.

### 7: Neo-Atlantis

At 30,000 Piracy Fame, routes cover Ali, Pietro, Raul Franco, South America,
João, Ezequiel, and the Amazon finale. `EB 01 00 0A` gives the South American
search a one-in-ten random branch.

## Practical progression guide

| If the story appears stuck at… | Check…                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Opening                        | Complete the Seville headquarters, Pub, Harbor, and at-sea stages in order                      |
| Early Spanish pursuit          | Fight the expected fleet only in the active battle subsection                                   |
| Search for João                | Raise Piracy Fame through 1,500 and 2,000, then follow voyage-day/building prompts              |
| Bret Perot hunt                | Revisit the reported destinations; both destination and town search contain explicit randomness |
| Massawa                        | Reach 15,000 Piracy Fame and complete the preceding after-battle informant stage                |
| Finale                         | Reach 30,000 only after finishing the Massawa section                                           |

## Highest-value validation

- Saves immediately around Piracy Fame 0/1, 1,499/1,500, and 1,999/2,000.
- Captures before and after each early Spanish battle hook.
- Mapping the 20 randomized destination values in section 4 to port IDs.
