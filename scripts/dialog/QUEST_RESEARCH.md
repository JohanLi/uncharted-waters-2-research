# Protagonist quest research

This document maps the six protagonist scenarios using the decoded `SNR*.DAT`
programs, their `SNR*.MES` dialogue, save-state evidence, and runtime
observations.

Evidence labels used below:

- **Confirmed**: observed in controlled saves or live play and matched to the
  bytecode.
- **Decoded**: directly expressed by a known route, comparison, flag write,
  random operation, or dialogue call.
- **Candidate**: dialogue and constants support the interpretation, but one or
  more VM inputs still lack gameplay names.

## How protagonist quests are represented

Each protagonist has one SNR program divided into numbered sections. A save
stores the current section, subsection, scenario flags, and 64 VM variables.
Building entry, time at sea, and naval battles dispatch route keys into the
active section.

- `F0` advances the subsection.
- `F1` advances the section, resets its subsection, and clears scenario flags.
- `AC`/`AD` branch on scenario flags.
- Selectors `0x00`–`0x63` mean a particular port; `0xA3` means any regular
  port; `0xA0` is a voyage-day event; `0xA1`/`0xA2` are before/after-battle
  hooks.
- `EB <variable> <bound>` stores a random value from `0` through `bound - 1`.
  This proves that several observed variable outcomes are genuine randomness.

## Threshold overview

| Protagonist | Decoded progression thresholds                                           | Current interpretation                                                                                         |
| ----------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| João        | Adventure 2,000; 8,000; 16,000; 30,000; 40,000                           | The duplicated 16,000 comparison is internal staging, not evidence for two fame tiers.                         |
| Catalina    | Piracy 1; staged 1,500/2,000; 8,000; 15,000; 30,000                      | There is no 4,000 constant in `SNR2.DAT`; controlled boundary testing is still needed for the earliest checks. |
| Otto        | Piracy 5,000; optional 20,000; 30,000                                    | The 20,000-fame Pietro/gold-frigate scene is completely optional and skippable.                                |
| Ernst       | Adventure 1,000; 5,000; 20,000; 40,000                                   | All four values occur as exact comparisons in the scenario program.                                            |
| Pietro      | Candidate 1,000 adventure plus money condition; adventure 10,000; 40,000 | The first combined fame/money condition needs more VM naming.                                                  |
| Ali         | 100 gold ingots; candidate 15 allied ports; trade fame 40,000            | The alliance-count source is not yet named.                                                                    |

## João Franco (`SNR1`)

| Section | Decoded role                                                  | Key mechanics                                                                                                                                                                                                                                                                                                                                 |
| ------: | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|       0 | Lisbon departure and Domingo introduction                     | Location flags make the opening scenes one-shot. An at-sea day-1 route advances the opening subsection.                                                                                                                                                                                                                                       |
|       1 | Prince Alberto and Duke Franco at 2,000 adventure fame        | **Confirmed:** Harbor entry arms the event; the Pub scene excludes port IDs 0–2 and is effectively available 08:00–17:00. The Lodge clue is optional. Shipyard, duel, Port, Lisbon home/Palace, choice, and Alberto's Harbor farewell are flag stages.                                                                                        |
|       2 | Catalina pursuit at 8,000                                     | **Confirmed:** any ordinary building can silently arm subsection 1. The next Pub sets flag 0 and remembers its port. Later eligible building visits roll `EB 00 00 02`; Catalina therefore appears 50% of the time. Her appearance sets flag 1; Harbor messages 429–437 clear flags 0/1 and set flag 2; voyage day 1 advances the subsection. |
|       3 | Massawa, Poseidon's Staff, and the Turkish invasion at 16,000 | Ali supplies the Massawa lead; routes cover Lord Taphali, Pietro, the delayed invasion, Turkish battle hooks, Staff delivery, and Catalina's aftermath. Date/month variables and flags, rather than a second fame tier, stage the invasion.                                                                                                   |
|       4 | Enrico's voyage to Zipangu at 30,000                          | Pub dialogue asks João to take Enrico to Nagasaki.                                                                                                                                                                                                                                                                                            |
|       5 | Neo-Atlantis finale at 40,000                                 | Guild letter, Sakai, South America, Lucia, Ezequiel, Amazon battle hooks, and the Lisbon ending. `EB 03 00 0A` makes each eligible South American building entry a one-in-ten roll; the branch also requires an internal 04:20–17:00 clock window.                                                                                            |

Runtime corrections and clarifications:

- The 2,000-fame Pub scene is not the initial trigger; Harbor entry first arms
  it.
- The Lodge clue before the Shipyard is optional.
- The 8,000-fame section is armed by an ordinary building visit, then the Pub
  warning occurs on a later visit.
- Catalina's next appearance is a 50% roll on an eligible building visit, not
  specifically a requirement to re-enter the Pub.
- Rocco's Harbor aftermath can happen in the same port; no extra port call is
  required.

## Catalina Erantzo (`SNR2`)

| Section | Decoded role                            | Key mechanics                                                                                                                                                   |
| ------: | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|       0 | Spanish Navy break and stolen Galleon   | Seville-specific opening routes progress through HQ, Pub, and Harbor flags before the day-at-sea handoff.                                                       |
|       1 | Spanish pursuit and Andreas             | The first piracy gate compares against literal `1`, not 1,000. Four battle-hook substages cover encounters with the pursuing Spanish fleets and Andreas.        |
|       2 | First search for João                   | The regular-port branch compares piracy fame with 1,500; later code compares against 2,000 before section advancement. No 4,000 comparison is present.          |
|       3 | Five-day search and Shipyard encounter  | Continued 2,000-fame progression uses voyage-day and building subsections, then reaches João in the Shipyard.                                                   |
|       4 | Bret Perot's randomized hunt at 8,000   | `EB 10 00 14` selects among 20 destination values. A later `EB 00 00 04` creates a one-in-four town-search branch.                                              |
|       5 | Lucia kidnapping and Bret Perot         | Explicit selectors identify Ceuta and Alexandria. The final battle hooks target Antonio Khan, sailor ID `0x3C`.                                                 |
|       6 | Massawa and the Turks at 15,000         | An after-battle informant route begins the lead to Massawa; later substates cover João, the Turkish fleets, and Lord Taphali.                                   |
|       7 | Franco truth and Neo-Atlantis at 30,000 | Ali, Pietro, Raul Franco, South America, João, Ezequiel, and the Amazon finale. `EB 01 00 0A` supplies a one-in-ten random branch in the South American search. |

Piracy fame 1 passes the first bytecode comparison. A controlled `0/1` save
pair would confirm whether another external system delays dispatch despite
that literal comparison.

## Otto Baynes (`SNR3`)

| Section | Decoded role                             | Key mechanics                                                                                                                                                                                |
| ------: | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|       0 | Royal commission and stolen Galleon      | London and Seville selectors, Matthew duel, ship theft, midnight reward, and opening Spanish attack.                                                                                         |
|       1 | Spanish counterattack                    | Before/after-battle hooks complete the early pursuit. No new fame threshold is present.                                                                                                      |
|       2 | Ghosts and Catalina at 5,000 piracy fame | Two 5,000 comparisons gate the Trader encounter and later Pub meeting.                                                                                                                       |
|       3 | Pietro's gold-frigate rumor at 20,000    | **Confirmed optional:** Pietro describes a gold-laden Spanish frigate leaving Veracruz. The event is completely skippable and easy to miss.                                                  |
|       4 | Spanish Armada campaign at 30,000        | London summons, Guild intelligence, Nantes battle, South American report, Santo Domingo, Amazon, and Catalina.                                                                               |
|       5 | Ezequiel and the ending                  | Another 30,000 comparison guards the Pub meeting, 30-day Bordeaux appointment, Ezequiel battle, and return to London. `EB 00 00 05` also creates a five-way/randomized branch in this phase. |

The scenario uses narrow subsections and distinct before/after-battle routes,
so a battle outside the expected subsection cannot perform the required
advance.

## Ernst von Bohr (`SNR4`)

| Section | Decoded role                                  | Key mechanics                                                                                                                                        |
| ------: | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
|       0 | Mercator's expedition                         | Amsterdam-specific opening and Harbor introduction.                                                                                                  |
|       1 | Paula joins at 1,000 adventure fame           | Exact 1,000 comparison plus additional map-progress calculations before Paula's scene.                                                               |
|       2 | 5,000-fame travel dialogue                    | Exact threshold and a three-way random dialogue selector.                                                                                            |
|       3 | 20,000-fame travel dialogue                   | Exact threshold and another three-way random dialogue selector.                                                                                      |
|       4 | Zipangu, Huang He, and Paula's home at 40,000 | Far East progression explicitly addresses Changan, Sakai, and Nagasaki. Flags stage first Far East port, Japan, town clue, Huang He, and the ending. |

The three recurring dialogue families align with `EB 01 00 03`: each fame tier
can select one of three variants. The separate Mercator map-completion quest
uses the game's persistent chart bitmap and counters.

Runtime observations establish the map-drawing prerequisites and broad reward
behavior:

- The active character must have Cartography, bit `0x08` in the sailor skill
  mask.
- The character must also sign a contract with a cartographer. The known
  cartographers are Mercator in Amsterdam, Gerard de Jode in Antwerp, Diogo
  Ribeiro in Barcelona, Olives in Palma, and Giovanni Verrazano in Venice;
  each can teach Cartography or accept a contract.
- Exploration outside Europe's initially revealed, non-fogged area contributes
  to the map report after the contract is signed.
- The chart bitmap has 90 usable columns and 45 rows. Its 4,050 cells correspond
  to 24 × 24-pixel areas in `world-map.png`, or 6 × 6 pixels in the map viewport
  framed by `graph-025-640x400.png`.
- New-game initialization marks a 13 × 10 rectangle as known Europe: 130 cells.
  That leaves 3,920 chartable cells, and `40,000 / 3,920` is approximately
  `10.204`.
- The executable increments an unreported-cell counter only when a previously
  clear chart bit is set. Reporting multiplies that counter by 5 before adding
  adventure fame, then resets the counter. The maximum map-report fame outside
  the initial rectangle is therefore 19,600, subject to the overall 50,000-fame
  cap.
- The paired screenshots `initial-map.png` and `initial-map2.png` confirm this
  at runtime. After aligning their differently cropped viewports, the second
  contains exactly three additional 6 × 6-pixel chart cells immediately north
  of Europe. The reported reward of 15 adventure fame is exactly `3 × 5`.
- The gold calculation is `new cells × 20 × (5 − cartographer modifier)`, where
  the modifier is the low two bits of cartographer-record byte `+0x16`. All five
  known cartographers store `0x09` there and therefore have modifier 1. The
  observed 240 gold for three cells is the universal 80-gold-per-cell rate.
- The Mercator completion check uses 3,300 known cells, including the initial 130. It therefore requires 3,170 of the remaining 3,920 cells, approximately
  80.87% of the initially hidden chart grid.

The observed roughly 40,000 adventure fame for a near-complete voyage cannot
come from the cartographer's map-report award alone. It likely includes fame
earned while sailing and making discoveries. The remaining cartography
questions are the contract field and the broader gameplay meaning of record
byte `+0x16`; it does not vary among the five cartographers.

## Pietro Conti (`SNR5`)

| Section | Decoded role                              | Key mechanics                                                                                                                                                                                                               |
| ------: | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|       0 | Camillo and Duchess Franco                | Genoa opening, Lisbon sponsor, equipment/money rewards, and departure.                                                                                                                                                      |
|       1 | Golden Medallion and El Dorado            | African-port and resource comparisons lead to the map offer; Harbor possession checks then advance the section. The 1,000-adventure-fame and 2,000-gold interpretation is a strong candidate, not yet a fully decoded fact. |
|       2 | Poseidon's Staff at 10,000 adventure fame | Exact threshold, random Ottoman/Middle Eastern destination variables, Staff possession checks, and delivery to João in Massawa.                                                                                             |
|       3 | Zipangu, Raul, and El Dorado at 40,000    | Exact threshold, both Japanese ports, South America, Raul Franco, and Lisbon ending.                                                                                                                                        |

Random destination selection is explicit: this is why the fortune teller and
return port differ between playthroughs. Further decoding is needed to assign
the random variables to complete port lists.

## Ali Vezas (`SNR6`)

| Section | Decoded role                                      | Key mechanics                                                                                                                                                                 |
| ------: | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|       0 | Debt repayment and Page rank                      | Istanbul-specific one-shot building flags, loan repayment, royal mission/rank state, and Sultan handoff.                                                                      |
|       1 | Sultan's expansion commission                     | Palace summons, investment/alliance instruction, and rewards. This is rank/progression-gated, not a fame tier.                                                                |
|       2 | João, Catalina, and Sapha                         | `EA 00` is compared with literal 100 before activation, supporting the 100-ingot requirement. Subsequences cover João's decoy sail, Catalina, voyage day 5, Basra, and Sapha. |
|       3 | Radino and Howell's Pietro debt                   | Venice, Lisbon, Sakai, and Nagasaki selectors establish the route. The 15-allied-port prerequisite remains a candidate until its source operand is named.                     |
|       4 | Sultan reward                                     | Short Palace transition awarding 100 ingots and advancing the story.                                                                                                          |
|       5 | Sapha and the Istanbul house at 40,000 trade fame | Two exact 40,000 comparisons gate the allied-port criticism and final family/house sequence through Basra and Venice.                                                         |

Ali's story relies much more on money, rank, alliance, and choice state than on
fame. A fame-only query cannot accurately predict his early sections until
those save fields and VM source selectors are named.

## Highest-value validation saves

1. Catalina immediately before and after the first piracy-fame dispatch at
   fame 0 and 1, then around 1,499/1,500 and 1,999/2,000.
2. Pietro before the first African Pub offer with independent combinations of
   999/1,000 adventure fame and 1,999/2,000 gold.
3. Ali with 14 and 15 allied ports before entering Istanbul Harbor.
4. Ernst immediately before and after signing a cartographer contract to locate
   the contract field.

See [REVERSE_ENGINEERING.md](./REVERSE_ENGINEERING.md) for opcode-level evidence
and unresolved VM details. Generated route tables and dialogue transcripts are
under [`output/readable`](./output/readable/).
