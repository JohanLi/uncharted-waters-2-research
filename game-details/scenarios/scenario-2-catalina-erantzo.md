# Scenario 2: Catalina Erantzo

Catalina's story is driven by Piracy Fame, staged naval encounters, and
location-specific searches. Reaching a later Fame threshold never skips the
active story section: its preceding building, voyage-day, and battle events
must already be complete.

This guide is decoded from `SNR2.DAT` and `SNR2.MES`. Literal comparisons,
route keys, state changes, and random ranges are exact. Runtime evidence is
still useful where an executable dispatcher or an unnamed state field acts
outside the scenario bytecode.

## Story and threshold map

| Section | Piracy Fame gate | Story                                                       |
| ------: | ---------------: | ----------------------------------------------------------- |
|       0 |                — | Michael's death, Catalina's mutiny, and the Rebel           |
|       1 |                1 | The Spanish pursuit fleets and Andreas's recruitment        |
|       2 |  1,500 and 2,000 | Learning that João has left Lisbon and beginning the search |
|       3 |            2,000 | Finding João and confronting him at a Shipyard              |
|       4 |            8,000 | Bret Perot's randomized search for João                     |
|       5 |                — | Lucia's abduction and the Perot/Antonio Khan battle         |
|       6 |           15,000 | The captured informant, Massawa, and the Turkish fleet      |
|       7 |           30,000 | Raul's evidence, Lucia, Ezequiel, and Neo-Atlantis          |

There is no 4,000 comparison in Catalina's scenario. The commonly reported
4,000 tier appears to conflate the consecutive 1,500- and 2,000-Fame stages.

The scenario itself adds no fixed Piracy Fame. Catalina must obtain Fame
through ordinary naval victories or shared quests.

## Section 0: Michael's death and the mutiny

### Learn what happened to Michael

The opening sequence takes place in Seville:

1. Visit the **Naval headquarters**, represented by Seville's special
   building. Commander Ezequiel reports that Michael and Hernan disappeared
   near Santo Domingo and shows Catalina Michael's flag.
2. Return to the **Pub**. Catalina and Emilio overhear sailors blaming a
   Portuguese fleet bearing the Franco family's red-cross emblem.
3. Return to **Naval headquarters**. Ezequiel refuses Catalina's request for a
   ship and troops because attacking the Francos could start a war with
   Portugal.

After learning of Michael's death but before hearing the Pub rumor, Catalina
can revisit headquarters to receive **Michael's Saber**. A one-time flag
prevents a duplicate award.

### Steal the Galleon

After Ezequiel rejects the revenge mission:

1. Visit the **Seville Pub**. Catalina decides to resign from the Navy and asks
   Emilio for help.
2. Visit the **Seville Harbor**. Catalina plans to seize Emilio's
   gold-carrying Galleon. Emilio ultimately joins voluntarily.

The Harbor scene:

- recruits Emilio;
- transfers control of the ship to Catalina;
- names the flagship **Rebel**;
- configures the opening fleet and its cargo; and
- advances the subsection.

Begin a voyage. On voyage day 1, Catalina's personal Friendship with Spain is
set to its minimum displayed value, −100, and the scenario advances to section 1.

## Section 1: The Spanish pursuit and Andreas

### Arm the pursuit at 1 Piracy Fame

The first Fame comparison is the literal value **1**, not 1,000. Catalina must
also:

- have Pirate affiliation—the affiliation established by the mutiny; and
- enter a regular-port building outside Seville that reaches the wildcard
  route. Palace interactions have their own routes and do not perform the
  check.

At 1 or more Piracy Fame, the route stages five Spanish pursuit fleets, fleet
IDs 15–19, together at a fixed point immediately outside Seville and advances
the subsection. All five receive pursuit objective 7 with Catalina as their
target, so they begin following her after being placed; they are not initially
positioned around her current location.

A controlled runtime comparison confirms that the boundary is exact. Entering
the Harbor at 0 Piracy Fame produces no story dialogue; entering it at 1 makes
Emilio say, “Commodore Catalina, I heard a bad rumor in the harbor.” This also
confirms that ordinary Harbor dispatch reaches the route without imposing an
additional practical prerequisite.

The placement is confirmed both by the scenario instructions and by the saved
fleet records immediately after departure. The route writes world coordinates
`(142, 374)` directly to every pursuit fleet. Seville's raw port coordinate is
`(142, 372)`, while Catalina's fleet in the observed save is already at
`(146, 383)`. All five pursuers still share `(142, 374)` and have Catalina's
current position as their navigation target.

### Fight two pursuit encounters

The next four subsections alternate before- and after-battle hooks:

1. Encounter any one of pursuit fleets 15–19. The before-battle scene calls it
   a preliminary skirmish and advances the battle stage.
2. Complete that battle. The after-battle scene reports that Ezequiel's Santa
   Cruz is approaching and advances again.
3. Encounter one of fleets 15–19 a second time. Catalina refuses to surrender.
4. Complete the second battle. Andreas burns the tightly grouped Spanish
   battle line, allowing Catalina to escape, and asks to join her.

The final after-battle scene recruits **Andreas Paella**, changes the pursuit
fleet state, and advances to section 2. A battle against an unrelated fleet
cannot satisfy these fleet-ID checks.

## Section 2: The first search for João

### The 1,500-Fame rumor

The first section-2 transition requires:

- Pirate affiliation;
- at least **1,500 Piracy Fame**;
- a port whose ID is below 42; and
- a building interaction routed through the regular wildcard path.

The explicit Pub and Palace routes do not perform this check. A Harbor,
Market, Shipyard, Lodge, Guild, Bank, shop, Church, or similar ordinary
building in a qualifying port is the cleanest trigger.

Catalina learns that Duke Franco has disowned João and that João is now sailing
the world. This advances to the Pub-search subsection.

### The 2,000-Fame Pub

Enter an ordinary **Pub** with at least **2,000 Piracy Fame**.

- At port IDs 0–41, Catalina and Andreas question the bartender about João.
  The aggressive or polite wording is selected by a two-way random roll.
- At port IDs 42 and above, the dialogue is skipped, but the same 2,000-Fame
  comparison still runs.

Passing the comparison advances directly to section 3 after the questioning
dialogue. At 1,999 Fame, repeated Pub visits repeat the questioning instead.

## Section 3: Finding João

### Arm the European search

An ordinary building visit first rechecks Pirate affiliation and **2,000
Piracy Fame**, then silently advances the subsection. This is a separate visit
after the Pub conversation that advanced section 2. For example, when the
2,000-Fame Pub scene occurs in Ceuta, the observed sequence is:

1. First Pub visit: Catalina and Andreas question the bartender; section 2
   advances to section 3.
2. Second Pub visit: no story dialogue; section 3 advances from subsection 0
   to subsection 1.
3. Third Pub visit: Andreas says, “Commodore, we still haven't found that Joao
   kid,” beginning the visible European-search reminder.

The following search uses ports 2–41: Istanbul through Bergen, excluding
Lisbon and Seville.

1. Visit an eligible building in that port range. Catalina says that João is
   proving difficult to find and sets a flag.
2. Begin a voyage. Voyage day 1 consumes the flag and advances.
3. Visit another eligible building in the same port range. Emilio reports a
   rumor that Portugal's prince is missing and that Duke Franco may be
   involved.
4. Begin another voyage. Voyage day 1 consumes the second flag and advances.

### Follow the crowd to the Shipyard

At a port in the same 2–41 range, visit an ordinary building other than the
Harbor, Shipyard, or Palace between **04:20 and 17:00**. The practical window
also depends on that building's normal opening hours.

Catalina sees a crowd running toward the Shipyard. Go promptly to the
**Shipyard in that port**. The intended route then:

- has Catalina save João and his companion from Manuel Melgoza's pirates;
- reveals João's identity;
- begins Catalina's attempted confrontation;
- has Ezequiel interrupt before they can fight; and
- advances to section 4.

The bytecode contains alternate Harbor and other-building responses based on
the stored port and elapsed time, but the direct progression route is to visit
the indicated Shipyard immediately.

## Section 4: Bret Perot's randomized hunt

### Wait for voyage day 3

After the Shipyard encounter, remain at sea until the voyage-day-3 route
advances the subsection.

### Reach 8,000 Piracy Fame

At **8,000 Piracy Fame**, enter a building that reaches the regular wildcard
route while Catalina still has Pirate affiliation. A Pub and the Franco home
have explicit routes that take precedence, so a Market, Harbor, Shipyard,
Lodge, Guild, or similar building is a better trigger.

Andreas reports that Bret Perot knows where João is and is waiting at the Pub.

### Receive one of twenty destinations

Visit an ordinary **Pub**. Perot selects a destination with:

`random(20) + 3`

The result is one of these port IDs:

| IDs   | Possible destination ports                     |
| ----- | ---------------------------------------------- |
| 3–7   | Barcelona, Algiers, Tunis, Valencia, Marseille |
| 8–12  | Genoa, Pisa, Naples, Syracuse, Palma           |
| 13–17 | Venice, Ragusa, Candia, Athens, Salonika       |
| 18–22 | Alexandria, Jaffa, Beirut, Nicosia, Tripoli    |

The chosen port is saved in scenario variable 16 and inserted into Perot's
dialogue.

After receiving the destination, visiting João's home in Lisbon produces an
optional Marco scene and a one-time **1,000-Gold-Coin** reward.

### Search the selected port

At Perot's selected port:

1. Visit the **Pub**. Andreas questions the bartender, and the subsection
   advances.
2. Visit a different building that reaches the wildcard route. The **Guild** is
   confirmed to work; a Market, Harbor, Shipyard, Lodge, Bank, shop, Church, or
   House of Fortune should use the same route. The Pub, Palace, and context
   `0x15` have explicit no-op routes at this stage. In the wildcard scene, the
   group decides to wait for João.
3. Return to the **Pub**. The bartender admits that João was warned about
   Catalina.
4. Search wildcard-routed buildings other than the Market or Palace in the
   same port. Every eligible visit rolls `random(4)`; result 0 silently
   advances the search, giving a **25% chance per visit**.
5. After the successful roll, visit the **Market**. Catalina finds Emilio and
   Andreas tied up; Rocco overpowered them, and João has gone to the Harbor.
6. Visit the **Harbor**. João has already departed, and the scenario advances
   to section 5.

Because the successful one-in-four search visit uses the same visible “not
here” response as a failure, the player may need to alternate additional
building searches with Market visits to discover that the hidden subsection
has advanced.

The intervening non-Pub visit is mandatory. Re-entering the Pub immediately
after the first questioning does not run the waiting scene or advance the
subsection.

## Section 5: Lucia and Bret Perot

### Receive Perot's second offer

Visit an ordinary **Pub** at a European port with ID 2–41, subject to two
exclusions:

- not Ceuta, port 26; and
- not the destination Perot selected in section 4.

Perot offers another lead on João in exchange for bringing Lucia from Lisbon
to an unnamed Portuguese nobleman at the Ceuta Lodge.

### Meet Lucia in Lisbon

Visit the **Lisbon Pub** no later than 21:00. Catalina meets Lucia and asks her
to meet at the Lodge in two hours. This stores the current calendar day and
starts a separate interaction counter; the script does not measure two hours
of elapsed clock time.

While it is still the same calendar day, the counter produces these Lodge
stages:

1. At 0, Emilio says, “We'll meet her here in two hours.” The counter becomes 1.
2. At 1, Emilio says, “Well, only one more hour now.” The counter becomes 2.
3. At 2, Emilio says, “It's almost time.” Lucia then appears, joins Catalina,
   and the subsection advances.

If the counter has already risen above 2 on the same day, the Lodge instead
uses a shorter late-arrival exchange beginning with Lucia's “You're late!!”
and still advances. This can happen because every same-day Pub check increments
the counter, including the “Where is Lucia?” stage.

The Lisbon Pub advances the same counter. At 0 or 1 it begins, “Lucia, are you
ready yet?”; at 2 or more it begins, “Where is Lucia?” and directs Catalina to
the Lodge. Consequently, Pub and Lodge visits can be mixed, and merely letting
the clock advance does not change the stage.

Crossing midnight changes the result. A Lodge visit on the following calendar
day begins with Lucia's “You're late!!” but still lets her join and advances
the story. A Pub visit then says that she went to the Lodge a long time ago.
Controlled saves at 18:40, 19:40, 20:40, 22:00, 23:20, and 00:00 confirm that
the decisive rollover is the calendar day, not an elapsed-hour threshold.

### Deliver Lucia to Ceuta

1. Sail to Ceuta and visit the **Lodge**. Catalina leaves Lucia with the
   supposed nobleman.
2. Visit the **Ceuta Pub**. Perot says João is in Alexandria.
3. Go to Alexandria and enter an eligible ordinary building.

Otto Baynes intercepts Catalina and explains that Perot and Marquis Martinez
used her to abduct Lucia. The scene stages the hostile fleet connected to the
next encounter and advances the subsection.

### Fight the Perot/Antonio Khan fleet

Perot appears in the before-battle dialogue, but the scenario's battle hook is
keyed to opposing captain **Antonio Khan**, sailor ID 60.

After the required battle, Catalina searches the ship but cannot find Lucia.
Perot mentions the Atlantean armies, and the scenario advances to section 6.

## Section 6: Massawa and the Turkish fleet

### Arm the informant at 15,000 Fame

At **15,000 Piracy Fame**, an eligible regular building visit with Pirate
affiliation silently advances the subsection. The Lisbon Pub and Franco home
have explicit routes and do not perform this check.

The next **normal naval victory** invokes the informant scene. A captured
navigator says that João is defending Massawa against the Turks. Catalina
spares him and orders a course for Massawa.

The wildcard route does not compare a general victory/defeat value or require
a particular new opponent. It checks that Antonio Khan's sailor record no
longer has an active fleet link—normally already true after the preceding Perot
battle. The executable only dispatches this route after victory. A controlled
escape from the same ordinary encounter produced only the fleeing captain's
standard one-line response: the informant did not appear, and the armed
subsection remained active. Winning from the same baseline played the
informant scene and advanced the subsection.

Thus the 15,000-Fame check does not immediately reveal Massawa: it first arms
the next qualifying after-battle event.

### Meet João at Massawa

Go to the **Massawa Harbor**. João says that he must fight the Turkish force
before settling matters with Catalina. Catalina lets him pass.

Enter another eligible Massawa building. Catalina decides to participate, and
the scenario deploys five Turkish fleets, IDs 25–29.

### Join the Turkish battle

Encounter any one of fleets 25–29. The before-battle scene has Catalina and
João divide the enemy forces. Completing the corresponding battle advances the
story and releases the scripted fleet state.

Return to Massawa and enter its **special building**. Catalina confronts João,
but Pietro explains that the Franco family did not possess a private fleet
when Michael was killed. Catalina allows João to leave and advances to section 7.

## Section 7: Neo-Atlantis

### Reach 30,000 Piracy Fame

The final Fame gate is evaluated at sea. On voyage day 5, Catalina must have:

- Pirate affiliation; and
- at least **30,000 Piracy Fame**.

Passing the comparison advances to Ali's messenger stage.

### Meet Ali, Pietro, and Raul

1. Visit a **Lodge outside Lisbon**. Ali says that Pietro wants to see
   Catalina in Lisbon.
2. Visit **João Franco's home in Lisbon**. Pietro introduces Raul Franco, who
   identifies Marquis Martinez as the man behind Michael's death and explains
   Neo-Atlantis. The scene also deploys five Spanish pursuit fleets, IDs
   15–19.

The Lisbon Pub contains an optional conversation with Lucia's mother but is
not the progression route.

### Find Lucia in the New World

Search Pubs at port IDs **42–56**, Caracas through Cayenne, after 08:00. Each
eligible visit rolls `random(10)`:

- result 0 triggers the story event—a **10% chance**;
- results 1–7 produce no story event; and
- results 8–9 give the hint that South America is vast and the group should
  search from port to port.

The successful Pub's port is retained as the encounter location.

Return to that same **Pub**. Catalina finds João and Rocco trying to rescue
Lucia and duels Antonio Khan. After Catalina wins, João takes Lucia toward the
Harbor.

### Form the alliance

Visit the **Harbor in the same port**. Catalina and João decide that they need
Ezequiel's Spanish fleet to attack Neo-Atlantis. The scenario positions João
and the five Spanish fleets for the next encounter.

Encounter one of Spanish fleets 15–19. Catalina surrenders long enough for João
to explain Neo-Atlantis to Ezequiel. Ezequiel agrees to join the attack, and
the scenario deploys the Neo-Atlantis fleets.

Do not attack João or Ezequiel after they become allies. The script contains
explicit warning choices and failure cleanup for attacking either fleet,
including dialogue telling the player to reset the game.

### Defeat Martinez

Encounter one of the Neo-Atlantis fleets, IDs 61–69. The before-battle hook
has Catalina claim the right to confront Martinez while João and Ezequiel
handle the remaining forces.

Win the corresponding naval battle. The after-battle scene destroys the
fortress, completes Catalina's revenge, and plays the ending.

## Exact Fame-boundary save landmarks

All three early Fame boundaries and their dispatch routes are runtime-confirmed.

| Pair          | Correct active state                                                                                      | Save immediately before…                                | Expected differentiator                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 / 1         | Section 1, subsection 0; mutiny and voyage-day-1 transition complete; Pirate affiliation; outside Seville | Entering the same eligible ordinary building            | **Confirmed:** 0 has no story dialogue; at 1 Emilio gives the harbor warning, five Spanish pursuit fleets are placed outside Seville, and the subsection advances |
| 1,499 / 1,500 | Section 2, subsection 0; Andreas recruited; port ID below 42                                              | Entering the same non-Pub, non-Palace ordinary building | **Confirmed:** 1,499 has no story event; at 1,500 the João rumor plays and the Pub-search subsection begins                                                       |
| 1,999 / 2,000 | Section 2, subsection 1; the 1,500-Fame rumor already complete                                            | Entering the same ordinary Pub                          | **Confirmed:** both play questioning dialogue; 1,999 repeats it on later visits, while 2,000 advances to section 3                                                |

The 2,000 transition is visible through the following visits: after the first
questioning scene, the next eligible building visit is silent and advances the
new section's subsection; another visit then gives the “still haven't found
that Joao kid” reminder.

## Key bytecode evidence

| Finding            | Scenario evidence                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening handoff    | Section 0 voyage-day-1 route `0xA001` sets Spain Friendship to −100 and advances the section                                                         |
| First pursuit      | Pirate affiliation plus Piracy Fame ≥1; places fleet IDs 15–19 at fixed coordinates `(142, 374)` outside Seville with objective 7 targeting Catalina |
| Early Fame gates   | Section 2 compares Piracy Fame with literals 1,500 and 2,000                                                                                         |
| European search    | Port IDs 2–41; the Shipyard clue requires encoded time 04:20–17:00                                                                                   |
| Perot destination  | `EB 10 00 14` followed by +3 selects port IDs 3–22                                                                                                   |
| Perot waiting step | After the first destination-Pub visit, an `0xA3FF` building route—not the Pub route—plays the waiting scene; the Guild is runtime-confirmed          |
| Town search        | `EB 00 00 04` gives a one-in-four successful building search                                                                                         |
| Massawa gate       | Piracy Fame ≥15,000 arms a wildcard informant route dispatched after the next naval victory; escape does not trigger it                              |
| Final gate         | Voyage-day-5 route checks Piracy Fame ≥30,000                                                                                                        |
| New World search   | Port IDs 42–56 and `EB 01 00 0A`; result 0 advances                                                                                                  |

## Practical progression guide

| If the story appears stuck at… | Check…                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Seville opening                | Headquarters → Pub → Headquarters → Pub → Harbor, then voyage day 1                                                           |
| Spanish pursuit                | Pirate affiliation, at least 1 Piracy Fame, and two encounters with fleets 15–19                                              |
| First João rumor               | At least 1,500 Fame and a non-Pub/Palace building at port ID below 42                                                         |
| 2,000 handoff                  | Enter an ordinary Pub after completing the 1,500-Fame rumor                                                                   |
| Finding João                   | Complete two port-2–41 building → voyage-day-1 cycles, then follow the crowd to the Shipyard                                  |
| Perot's first hunt             | Voyage day 3, 8,000 Fame, then destination Pub → different wildcard building → Pub → random building search → Market → Harbor |
| Lucia                          | Lisbon Pub before 21:00 → advance the visit counter to 2 → Lisbon Lodge → Ceuta Lodge → Ceuta Pub → Alexandria                |
| Massawa                        | At 15,000 Fame, enter an eligible building, win another naval battle, then go to Massawa                                      |
| Finale                         | At 30,000 Fame reach voyage day 5 → non-Lisbon Lodge → Lisbon home → search New World Pubs                                    |
