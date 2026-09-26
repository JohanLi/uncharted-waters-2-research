# Scenario 2: Catalina Erantzo

Scenario 2 (`SNR2`) is Catalina's character story. It opens with a fixed
sequence in Seville that ends in her mutiny, then advances through seven further
sections. Six of them are gated by **Piracy Fame** milestones; section 5 follows
directly from the end of section 4's search. Each milestone opens another chain
of building, voyage-day, or battle events; reaching a later Fame value does not
skip the active chain.

This document describes the scenario from the player's point of view. It is
based on the decoded `SNR2.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine.

Evidence labels have the meanings defined in [the scenario README](./README.md).

## Story and threshold map

| Section | Piracy Fame gate | Player-visible story                                               |
| ------: | ---------------: | ------------------------------------------------------------------ |
|       0 |                — | Michael's death, Ezequiel's refusal, and the theft of the _Rebel_  |
|       1 |                1 | The Spanish pursuit fleets and Andreas's recruitment               |
|       2 |  1,500 and 2,000 | News that João has left Lisbon and the first Pub questioning       |
|       3 |            2,000 | The European search and the first confrontation with João          |
|       4 |            8,000 | Bret Perot's lead and the randomized town search                   |
|       5 |                — | Lucia's abduction, Otto's warning, and the battle with Perot       |
|       6 |           15,000 | The captured navigator, Massawa, and the Turkish fleet             |
|       7 |           30,000 | Raul Franco, Lucia's rescue, Ezequiel's alliance, and Neo-Atlantis |

The thresholds compare **Piracy Fame**, the word at `+2` of Catalina's 14-byte
Fame/Friendship record, not total Fame. Every gate except the 2,000 Pub
comparison in section 2 also requires Pirate affiliation: the low nibble of
Catalina's sailor byte `+0x29` must be `6`, the value written by the mutiny.
There is no 4,000 comparison. The scenario itself awards no Piracy Fame;
Catalina must earn it through ordinary naval victories or shared quests.

The gate is only one part of each trigger:

- 1 is tested by the wildcard route for an ordinary building in any regular port
  except Seville.
- 1,500 is tested by the wildcard route for an ordinary building in a port with
  ID below 42. The Pub, Palace, and Meet Ruler routes do not test it.
- 2,000 is tested first on entering any **Pub**, then again on a later
  ordinary-building visit that reaches the wildcard route.
- 8,000 is tested by the wildcard route, but only after **voyage day 3** has
  armed the section. Pubs have their own route and do not test it.
- 15,000 is tested by the wildcard route for any regular-port building other
  than Lisbon's Franco home and Pub.
- 30,000 is tested on **voyage day 5**.

Scenario services which are not mentioned below normally retain their ordinary
game behavior. The tables describe the extra story behavior layered onto them.
In most stages after the mutiny, Lisbon's special building, the Franco home, has
an explicit route in which Emilio or Andreas warns Catalina away and ejects her.
Stages with a different Franco-home scene are described below.

## Section 0: Michael's death and the mutiny

The opening takes place entirely in Seville. Seville's special building is the
**Naval headquarters** (“to the right of the palace”). The Palace and Meet Ruler
contexts have explicit empty routes, so they keep their ordinary behavior.

### Learn what happened to Michael

| Stage              | Required action                                   | What changes                                                                                                                                                                            |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hear the news      | Visit **Naval headquarters**.                     | Emilio fetches Catalina and Commander Ezequiel reports that Michael's fleet was lost off Santo Domingo, showing her Michael's flag. Flag 0 is set; Catalina is ejected.                 |
| Overhear the rumor | Visit the **Pub**.                                | Catalina and Emilio overhear two sailors say the attackers flew the red cross of the Malta Knights, Duke Franco's emblem. Flags 3 and 4 are set; Catalina is ejected.                   |
| Ask for revenge    | Return to **Naval headquarters**.                 | Ezequiel refuses a battleship and troops because attacking the Francos would start a war with Portugal. The subsection advances.                                                        |
| Optional saber     | Revisit headquarters between the first two steps. | “$n, don't be so down.” The first such visit also gives **Commodore Michael's saber** and sets one-time flag 6.[^saber] Later visits repeat only the consolation line; each ejects her. |

Before the headquarters news, the other Seville buildings only point Catalina
toward headquarters:

| Building              | Behavior before the news                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Harbor                | Suppresses the greeting and says Emilio was looking for her; the Harbor remains usable.                                        |
| Pub                   | Suppresses the greeting and says Emilio went to headquarters; the Pub remains usable.                                          |
| Shipyard              | A one-time explanation that a fleet has returned from the New World (flag 1), then a shorter reminder. Always ejects Catalina. |
| Guild                 | A one-time version of the same news (flag 2), then a shorter reminder. Always ejects her.                                      |
| Other Seville context | `random(2)` selects one of two “Lieutenant Sanude was looking for you” runs; either ejects her.                                |

After the news but before the Pub rumor, the Shipyard and Guild tell the visitor
not to mention Michael and eject her. Other ordinary buildings play Emilio's
suggestion to go to the Pub: the first such visit adds Emilio's longer “I should
take you home” exchange and sets flag 3. They do not eject her.

After the Pub rumor, the Shipyard says it is closing and ejects her, and the
Guild gives gossip that a Portuguese attacked the Spanish fleet and ejects her.
Other ordinary buildings and the Harbor keep their ordinary behavior.

The `random(2)` roll uses the scenario RNG described in
[João's scenario](./scenario-1-joao-franco.md#lisbon-building-behavior-during-preparation):
the selection is deterministic for the saved state and time of day.

[^saber]:
    The award at `SNR2.DAT 0x0239–0x024C` plays the fanfare, resolves group-6
    field `+0x3F` (the first of the twenty inventory slots, as João's Poseidon's
    Staff scan shows), and writes item ID `0x0F`, the zero-based Saber, directly
    into it. It does not look for an empty slot: whatever item occupied the
    first inventory slot is overwritten. Flag 6 prevents a second award.

### Steal the Galleon

After Ezequiel's refusal, the subsection-1 table replaces every Seville route:

| Building              | Story behavior                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pub                   | First visit: Catalina resolves to quit the Navy, a stranger (Andreas, not yet named) taunts her, and she asks Emilio for help. Flag 5 is set and she is ejected. Later visits repeat the request.            |
| Harbor                | Before the Pub scene, Emilio suggests talking it over at the Pub. After it, Catalina takes Emilio's gold-carrying Galleon; Emilio joins voluntarily and names the flagship _Rebel_. The subsection advances. |
| Naval headquarters    | Emilio says Ezequiel makes sense; ejects Catalina.                                                                                                                                                           |
| Shipyard              | “Sorry, but we're closed today.” Ejects her.                                                                                                                                                                 |
| Guild                 | Before the Pub scene, Emilio urges her to calm down. After it, Catalina hints at betrayal and ejects herself.                                                                                                |
| Other Seville context | Before the Pub scene, alternates two short exchanges with Emilio (flag 7). After it, Catalina asks Emilio to come to the Harbor and is ejected.                                                              |

The Harbor scene sets up Catalina's new career:[^rebel]

- Emilio Sanude (sailor 72) joins the mate roster and becomes First Mate.
- A Galleon is commissioned in the first free fleet slot and named _Rebel_.
- The _Rebel_ receives 120 crew and 50 guns, and its provision record holds 100
  barrels each of water and food, 50 shot, and 10 lots of Gold.
- Catalina's affiliation becomes Pirate.
- The subsection advances.

Set sail. On **voyage day 1**, Catalina's personal Friendship with Spain is set
to its minimum, displayed as −100, and the scenario advances to section 1. No
building route exists in this last subsection.

[^rebel]:
    `SNR2.DAT 0x06C4–0x0735`: `FB 48` adds sailor 72 and `DC 00 03 48 26` /
    `1D 00 03` sets his duty to 3. `F9 0A 05` creates a pending ship of type
    `0x0A` (display ship 11, Galleon) and `FA 0A 009E` names it from message
    159, “Rebel”. The script then writes slot 0's crew word `+0x00 = 120`, gun
    byte `+0x06 = 50`, and ORs status byte `+0x08` with `0x04`, which sets the
    gun type in its low three bits to 4, the Culverin
    ([Guns](../naval-battle.md#guns)). In supply record
    0 it writes water `+0x00 = 1000` and food `+0x02 = 1000` (tenths of a
    barrel), shot `+0x06 = 50`, goods quantity `+0x0C = 10`, and goods ID
    `+0x16 = 0x1F`, which is Gold in `MAIN.EXE`'s zero-based goods-name list. At
    `0x0720` it reads Catalina's sailor byte `+0x29`, keeps the high nibble
    (`& 0xF0`), sets the nation nibble to `6`, and writes the byte back. The
    voyage-day-1 route at `0x07CB` writes 0 to Fame-record byte `+0x07`, the
    Spain Friendship byte (displayed Friendship = stored − 100), then `F1`.

## Section 1: the Spanish pursuit and Andreas (1 Fame)

### Stage sequence

| Stage                   | Required action                                                                                     | What changes                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arm the pursuit         | With at least **1** Piracy Fame and Pirate affiliation, enter an ordinary building outside Seville. | Emilio: “Commodore $n, I heard a bad rumor in the harbor.” Ezequiel has orders to arrest her. Fleets 15–19 are placed outside Seville and the subsection advances. |
| First skirmish          | Encounter any of fleets 15–19.                                                                      | Before-battle scene: “So this is just a preliminary skirmish.” The Fight/Flee/Surrender prompt is skipped and the subsection advances.                             |
| Ezequiel's ultimatum    | Finish that battle without being defeated.                                                          | After-battle scene: the _Santa Cruz_ signals an offer of pardon; Emilio urges flight. The subsection advances.                                                     |
| Second battle           | Encounter any of fleets 15–19 again.                                                                | Catalina refuses to give in. The prompt is again skipped and the subsection advances.                                                                              |
| Andreas saves the fleet | Finish that battle without being defeated.                                                          | Andreas sets fire to the Spanish line, is pulled from the water, and joins. The pursuit fleets are sent home and the scenario advances to section 2.               |

The 1-Fame comparison is literally `1`, not 1,000. At 0 Fame the route ends
silently. Seville is excluded by an explicit port test, and the Palace and Meet
Ruler contexts have empty routes, so neither can arm the pursuit. The route has
no `F8`, so after Emilio's warning the building continues with its ordinary
behavior.

The route writes the fixed world coordinates `(142, 374)` directly to the
current position of every fleet whose ID is 15–19. Seville's raw port coordinate
is `(142, 372)`, so the fleets appear immediately outside Seville and then
pursue Catalina with objective 7; they are not placed around her current
position.[^pursuit-fleets]

| Fleet ID | Captain        | Normal role    |
| -------: | -------------- | -------------- |
|       15 | Tonio Burciaga | Convoy         |
|       16 | Hugo Montoya   | Convoy         |
|       17 | Xavier Navarro | Voyaging Fleet |
|       18 | Bernal Loyola  | Voyaging Fleet |
|       19 | Hernan Chavez  | Voyaging Fleet |

Both before-battle routes use wildcard selector `0xA1FF` but read the opposing
captain's fleet byte and reject anything outside 15–19, so an unrelated battle
cannot advance either stage. Neither after-battle route checks the opponent.
Each is only armed by the preceding before-battle scene, however, so it
runs after that same battle. `MAIN.EXE` dispatches after-battle routes after
every ending except a defeat, so a victory, an enemy retreat, nightfall, or
Catalina's own flight all advance the story; a defeat ends the
game.[^battle-hooks]

Andreas Paella (sailor 73) joins the mate roster with no assigned duty. The
closing loop then gives fleets 15–19 a navigation target of Seville's
coordinates `(142, 372)`, objective 0 (return home) with port 1 (Seville), and
flags `0x01`, clearing the special `0x40` state. Their current positions are
left alone.

[^pursuit-fleets]:
    The arming route is `SNR2.DAT 0x0805–0x08E8`. It reads sailor 1's byte
    `+0x29 & 0x0F` and Piracy Fame, stops at port 1, and requires affiliation
    `6` and Fame ≥ 1 (`82 02 03` against the literal 1). The loop at
    `0x0892–0x08E8` walks sailors 0–119, takes each sailor's fleet byte `+0x24`,
    and for fleet IDs `0x0F–0x13` writes position words
    `+0x00/+0x02 = (0x008E, 0x0176)`, objective `+0x1B = 7`, target `+0x1C = 1`
    (Catalina), and flags `+0x29 = 0x41`, then runs `D1` to recompute the
    course. Because the loop starts from captains, a fleet whose captain link is
    gone is not redeployed; no ship slot or durability is written. The release
    loop at `0x0AF1–0x0B50` writes target `+0x04/+0x06 = (142, 372)`, route word
    `+0x0C = 0x4000`, objective 0, argument 1, and flags 1 without calling `D1`.

[^battle-hooks]:
    Protagonist before-battle routes are dispatched at `MAIN.EXE 0x150E5`. If a
    route matched and its interaction-control word comes back zero (the effect
    of `F8`), `0x150FD` records battle code 8, a cancelled battle. When either
    scenario's variable 63 is nonzero (`0x15121–0x1512D`), the call to
    `0x1507B`, which offers Fight, Flee, or Surrender, is skipped. Scripts set
    variable 63 with `0C 3F 0001`. After-battle routes are dispatched at
    `0x16191–0x161A2`; the path is skipped only when a defeat has set game mode
    `0x1A` (`0x16101`).

## Section 2: news of João (1,500 and 2,000 Fame)

| Stage                | Required action                                                                                                             | What changes                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The 1,500-Fame rumor | With at least **1,500** Piracy Fame and Pirate affiliation, enter an ordinary non-Pub, non-Palace building at port ID 0–41. | Emilio and Andreas report that Duke Franco has disowned João, who is now at sea. Catalina vows that no one will interfere. The subsection advances. |
| Question a bartender | Enter any **Pub**.                                                                                                          | At ports 0–41, `random(2)` selects Andreas's rough questioning or Catalina's polite one. With at least **2,000** Fame, the section advances.        |

The 1,500 route has no `F8`, so the building continues into its ordinary
behavior, including the hostile-building check, after the subsection advances. A
Pub cannot deliver the 1,500 rumor: its explicit subsection-0 route is empty.

The subsection-1 Pub route performs the 2,000 comparison in every regular port,
without an affiliation check. At port IDs 42 and above it skips the questioning
dialogue but still compares Fame. At 1,999 Fame the questioning repeats on every
Pub visit; at 2,000 the same questioning runs once more and `F1` advances to
section 3. Other buildings have no route in this subsection.

## Section 3: finding João (2,000 Fame)

### The European search

| Stage            | Required action                                                          | What changes                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Re-arm           | Enter any building that reaches the wildcard route.                      | Silently rechecks Pirate affiliation and **2,000** Fame and advances the subsection.                                         |
| First reminder   | Enter an ordinary building at port ID 2–41.                              | Andreas: “Commodore, we still haven't found that Joao kid.” Flag 0 is set.                                                   |
| Sail             | Reach **voyage day 1**.                                                  | Flag 0 is cleared and the subsection advances.                                                                               |
| The prince rumor | Enter an ordinary building at port ID 2–41.                              | Emilio reports that Portugal's prince is missing and that Duke Franco may be involved. Flag 0 is set.                        |
| Sail             | Reach **voyage day 1**.                                                  | Flag 0 is cleared and the subsection advances.                                                                               |
| The crowd        | Enter an ordinary building at port ID 2–41 from **04:20 through 17:00**. | Emilio sees people running into the Shipyard. The day and time are stored, the subsection advances, and Catalina is ejected. |

The re-arm route is the only route in the section's first table apart from the
Franco home, so any building—including a Pub or the Palace—can supply it. It is
always a separate visit after the Pub scene that ended section 2. A sequence of
three Pub visits therefore reads: questioning (section 2 → 3), silence
(subsection 0 → 1), then Andreas's “still haven't found” reminder.

Ports 2–41 are Istanbul through Bergen; Lisbon and Seville are excluded. In both
reminder subsections the Palace and Meet Ruler contexts are empty. The first
reminder replays on every eligible visit until voyage day 1; the prince rumor
plays once, and later visits while flag 0 is set do nothing. The crowd route
excludes the Harbor, Shipyard, Palace, and Meet Ruler contexts; the building's
own opening hours still apply.

### The Shipyard confrontation

After the crowd scene the script stores the calendar day in variable 0 and the
20-minute time tick in variable 1. The next stage compares only the day of the
month (system value 4); it does not store or test the port.

| Building | Same calendar day                                                                                                                                                                              | Later calendar day                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Shipyard | Catalina rescues João and his companion from a gang of pirates, learns who he is, and draws her sword; Ezequiel's arrest order interrupts. She is ejected and the story advances to section 4. | Sets flag 0. The Shipyard is then “closed today” after a big fight and ejects her on every later visit.                                     |
| Harbor   | Within two hours of the crowd: “Did you hear a scream?”; later: “Commodore, this is the harbor, not the shipyard.” Ejects her.                                                                 | Catalina meets João at the Harbor, where his fleet flies the Franco emblem. The same confrontation and interruption follow, then section 4. |
| Other    | Within two hours: “Did you hear a scream?”; later: “I thought we were going to the shipyard.” Ejects her.                                                                                      | “Commodore, we didn't go to the shipyard, after all.” Sets flag 0 and ejects her.                                                           |

The direct route is to go to the Shipyard on the same day, normally in the same
port. Missing it is recoverable: on any later day, a visit to any **Harbor**
plays the alternate confrontation. The pirate leader at the Shipyard speaks as
character 88 of the transcript, the portrait selected by sailor 60's untouched
selector `0x57` (Antonio Khan). Neither scene starts a duel.[^day-compare]

[^day-compare]:
    The crowd route at `SNR2.DAT 0x0E3C–0x0E76` stores `0F 01 07` (time tick) in
    variable 1 and, after `F0`, `0F 00 04` (zero-based day of the month) in
    variable 0. The Shipyard route at `0x0E91` compares a fresh day value with
    variable 0 and sets flag 0 when they differ; the Harbor route at `0x0F9C`
    and the wildcard route at `0x1068` do the same comparison and use
    `variable 1 + 6` for the two-hour test. Because only the day of the month is
    stored, a return on the same day number of a later month is treated as the
    same day.

## Section 4: Bret Perot's hunt (8,000 Fame)

### Perot's lead

| Stage        | Required action                                                                          | What changes                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wait at sea  | Reach **voyage day 3**.                                                                  | The subsection advances. Until then, no building has a story route.                                                                                            |
| Arm the lead | With at least **8,000** Fame and Pirate affiliation, enter an ordinary non-Pub building. | Andreas has quarreled with a pirate called Bret Perot, who knows where João is and waits at the Pub. The subsection advances; the building continues normally. |
| Hear Perot   | Enter any **Pub**.                                                                       | Perot says Rocco told him João's fleet was heading for a port chosen by `random(20) + 3`. The port ID is stored in variable 16 and the subsection advances.    |

Between the second and third stages, every other ordinary building ejects
Catalina with “Commodore, Perot is waiting for you. Let's hurry to the pub.” The
Palace and Meet Ruler contexts are empty. Any Pub in any port hears Perot.

Perot's destination is one of these twenty port IDs, each with probability 1/20:

| IDs   | Possible destination ports                     |
| ----- | ---------------------------------------------- |
| 3–7   | Barcelona, Algiers, Tunis, Valencia, Marseille |
| 8–12  | Genoa, Pisa, Naples, Syracuse, Palma           |
| 13–17 | Venice, Ragusa, Candia, Athens, Salonika       |
| 18–22 | Alexandria, Jaffa, Beirut, Nicosia, Tripoli    |

The dialogue inserts the port's name through a group-`0x0C` reference to the
stored ID (`$r17`).

### Searching Perot's port

All of the following routes test that the current port equals variable 16;
elsewhere they do nothing and the buildings behave normally.

| Stage             | Required action at Perot's port                                                                     | What changes                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ask the bartender | Visit the **Pub**. Other buildings say to ask at the Pub first and eject Catalina.                  | Andreas roughs up the bartender, who denies seeing João. The subsection advances.                                                           |
| Decide to wait    | Visit a building that reaches the wildcard route. The Pub, Palace, and Meet Ruler routes are empty. | Catalina vows to punish Perot; they decide to wait. The subsection advances and she is ejected.                                             |
| Ask again         | Return to the **Pub**. Other buildings have no route in this subsection.                            | The bartender admits he warned João about Catalina. The subsection advances and she is ejected.                                             |
| Search the town   | Visit any building except the Market and Palace—the Pub included. The Market says “He's not here.”  | “He's not here, either.” Catalina is ejected, then `random(4)` is rolled; a 0 advances the subsection silently, a **25% chance per visit**. |
| Find Emilio       | Visit the **Market**. Other buildings now say “No Joao here.”                                       | Catalina finds Emilio and Andreas tied up: Rocco stopped them, and João has gone to the Harbor. The subsection advances.                    |
| Miss João         | Visit the **Harbor**. Other buildings have no route.                                                | João's fleet has just left. The story advances to section 5.                                                                                |

The successful search visit looks exactly like a failed one. The change is
visible on the next visit: the other buildings' reply becomes “No Joao here,”
and the Market plays the rescue scene instead of “He's not here.”

The intervening non-Pub visit in the second stage is mandatory. Re-entering the
Pub immediately after the first questioning plays nothing and does not advance
the subsection.

### The Franco home and Marco's reward

From the time Perot names the port until the first Pub questioning there, the
Lisbon **Franco home** route plays a side scene instead of ejecting a
trespasser. The first visit has Marco ask for news of João; Catalina names
Perot's port and Marco rewards her with **1,000 gold pieces** (`E6`), setting
flag 10. Later visits in that window play only a joking exchange about “one of
those rare hidden events.” Both eject Catalina. Flag 10 is cleared when section
4 ends, but the scene is not offered again.

## Section 5: Lucia and Bret Perot (no Fame gate)

### Perot's second offer

Enter a **Pub** in a European port, ID 2–41, other than Ceuta (26) and other
than the port Perot chose in section 4. Perot mocks Catalina, then offers a new
lead from an unnamed Portuguese nobleman if she brings the girl Lucia from the
Lisbon Pub to the Ceuta Lodge. The subsection advances. Other buildings have no
route in this subsection.

### Meet Lucia in Lisbon

Visit the **Lisbon Pub** at any time up to and including **21:00**. Catalina
mistakes Lucia's mother, Carlotta, for Lucia, then meets Lucia and asks her to
wait at the Lodge in two hours. The script stores the calendar day in variable
0, sets an interaction counter, variable 16, to 0, advances the subsection, and
ejects Catalina. From 21:20 onward the Pub shows “-Closed Due To Remodeling-”
and Emilio suggests returning tomorrow. Other Lisbon buildings say only
“Commodore, let's finish our work as soon as possible,” and the Lisbon Palace
and Meet Ruler routes are empty.

The next subsection does not measure elapsed time. It compares the current day
of the month with variable 0 and counts building visits in variable 16:

| Lisbon building                | Same day, counter 0 / 1                                                         | Same day, counter 2                                  | Same day, counter 3 or more                             | Later day                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| Lodge                          | Emilio: “We'll meet her here in two hours” / “Well, only one more hour now”; +1 | Lucia arrives: “It's almost time.” She comes aboard. | Lucia: “You're late!!” She comes aboard.                | Lucia: “You're late!! … I thought you had left already.” Aboard. |
| Pub                            | “Lucia, are you ready yet?” +1                                                  | “Where is Lucia?” She went to the Lodge. +1          | Same as counter 2. +1                                   | “Lucia went to the lodge a long time ago.”                       |
| Other ordinary Lisbon building | Short reminder about meeting her in two hours / one more hour; +1               | “It's time to meet Lucia.” +1                        | “We shouldn't keep her waiting.” The counter becomes 4. | “Lucia must be upset, waiting for us for so long.”               |

Every row ejects Catalina. The Lodge's “comes aboard” outcomes advance the
subsection. The shortest sequence is therefore three consecutive Lodge visits on
the same day. Pub and other-building visits can be mixed in, and crossing
midnight still lets Lucia join, with the late-arrival dialogue. Lucia is not
added to the mate roster; she travels only in the story.

### Deliver Lucia to Ceuta

| Stage           | Required action                   | What changes                                                                                                                                                                   |
| --------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hand her over   | Visit the **Ceuta Lodge**.        | The keeper says the young nobleman is waiting and relays Perot's message to meet at the Pub. Lucia thanks Catalina. Other Ceuta buildings urge her to the Lodge and eject her. |
| Collect the tip | Visit the **Ceuta Pub**.          | Perot says João is in **Alexandria**. Other Ceuta buildings send Catalina to the Pub and eject her.                                                                            |
| Otto's warning  | Enter any building in Alexandria. | Otto Baynes and Matthew reveal that Perot works for Marquis Martinez, who wanted Lucia abducted, and that Perot is heading for the Black Sea.                                  |

The Otto scene also turns sailor 60's record into Bret Perot and launches his
fleet:[^perot-record]

- The name becomes “Bret Perot” and the portrait selector becomes 96, which is
  character 97 of the transcripts, the portrait of every earlier Perot line.
- The attributes become Leadership 78, Seamanship 75, Knowledge 48, Intuition
  95, Courage 84, Swordsmanship 73, Charm 31, and Luck 100, with Navigation
  level 14 and Battle level 18.
- Sailor 60's nation nibble becomes 6, Pirate.
- Fleet 60, normally Antonio Khan's, is placed at `(352, 342)`, two units north
  of Istanbul's raw coordinate `(352, 344)`, and pursues Catalina with
  objective 7.

### The battle with Perot

While this subsection is active, the Lisbon Pub ejects Catalina and the Franco
home tells her to chase Perot.

| Event                        | Route                                         | Result                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encounter Perot's fleet      | Before-battle route keyed to sailor 60        | Catalina accuses Perot of lying; he says he meant to get rid of her. The Fight/Flee/Surrender prompt is skipped. After an earlier escape he only laughs, “You're finished now!” |
| Perot's fleet destroyed      | After-battle, sailor 60 no longer has a fleet | The crew cannot find Lucia; Perot says Catalina can never stop the Atlantean armies. The story advances to section 6.                                                           |
| Any other outcome with Perot | After-battle, sailor 60 still has a fleet     | Perot: “I guess this means I'll have to take care of you myself.” Flag 0 is set; the next encounter uses the short before-battle line.                                          |

Both after-battle branches set variable 63, which also makes `MAIN.EXE` skip its
post-battle block at `0x161BB`.

[^perot-record]:
    `SNR2.DAT 0x1CAB–0x1D4B`. `D4 0247` expands message 584, “Perot”, and
    `1F 00 00` copies it to sailor 60's second name field `+0x09`; `D4 0248`
    copies message 585, “Bret”, to `+0x00`. `1C` writes the word `0x0060` to
    `+0x12/+0x13`. The eight attribute bytes are written from `0x1CCA` to
    `+0x14..+0x1B` as `78, 75, 48, 95, 84, 73, 31, 100`, and levels
    `+0x1C = 14`, `+0x1D = 18`. Byte `+0x29` is rewritten as
    `(value & 0xF0) | 0x26`; the untouched `KOUKAI2.DAT` value is `0x20`, so the
    result is `0x26`. Fleet `0x3C` receives position `(0x0160, 0x0156)`,
    objective 7, target 1, and flags `0x41`, then `D1 03` with variable 3 = 60.
    The before-battle route at `0x1D77` has key `0xA13C`; the after-battle route
    at `0x1DAC` has key `0xA23C` and tests sailor 60's fleet byte `+0x24`
    against `0xFF`.

## Section 6: Massawa and the Turkish fleet (15,000 Fame)

Throughout this section the Lisbon Franco home and the Lisbon Pub eject Catalina
with Andreas's misgivings.

### The captured navigator

| Stage             | Required action                                                                              | What changes                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arm the informant | With at least **15,000** Fame and Pirate affiliation, enter any other regular-port building. | Silently advances the subsection. The Pub and Palace have no explicit route and can supply this visit.                                                                       |
| Win a battle      | Destroy any fleet in a naval battle.                                                         | A navigator hidden in the enemy hold says João is defending **Massawa** against the Turks. Catalina spares him and sets course for the Middle East. The subsection advances. |

The after-battle route does not test for a particular opponent. It reads the
fleet byte of the opposing captain, whom `MAIN.EXE` stores in variable 60
(`D0 00 03 3C 24` at `SNR2.DAT 0x1E9B`), and plays the scene only when that
captain no longer commands a fleet (`0xFF`). After an escape the opponent still
has a fleet, so the route ends without dialogue and the armed subsection stays
active. The 15,000 check therefore does not reveal Massawa by itself; it arms
the next qualifying battle.

### Meeting João at Massawa

Massawa is port 74. Its special building is the residence that João's story
assigns to Lord Taphali.

| Stage             | Required action                                                        | What changes                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ask about João    | Enter any Massawa building other than the Harbor and special building. | A resident calls João the city's savior. Flag 0 is set. Later visits say he went to the Harbor.                                                                         |
| Find João         | Visit the **Massawa Harbor** after flag 0 is set.                      | Catalina corners João; he asks to fight the Turks first and she lets him go. The subsection advances. Before flag 0, the Harbor says to find João first and ejects her. |
| Join the battle   | Enter any Massawa building, including the Harbor or special building.  | Catalina decides to help. Turkish fleets 25–29 are placed at `(458, 548)`, just south of Aden's raw coordinate `(458, 540)`, and pursue her. The subsection advances.   |
| Fight             | Encounter any of fleets 25–29.                                         | Catalina finds João already engaged and takes one fleet while he goes for the flagship. The Fight/Flee/Surrender prompt is skipped and the subsection advances.         |
| End the pursuit   | Finish that battle without being defeated.                             | Fleets 25–29 are released to objective 0 with port 2 (Istanbul) and flags `0x01`. The subsection advances.                                                              |
| Settle the grudge | Visit Massawa's **special building**.                                  | Catalina meets João alone. Pietro Conti and João show that the Francos had no private fleet in 1522. Catalina lets João go and the story advances to section 7.         |

While Catalina is looking for João, Massawa's special building plays a comic
exchange with Mecombe and ejects her. In the last stage the other Massawa
buildings are locked (“he's at the palace, but we're still hiding from the
Turks”) and eject her; buildings in other ports say, “Let's go back to Massawa.”

The Turkish setup uses the same captain loop as the Spanish pursuit: it
repositions the existing fleet records and does not rebuild ships. The final
after-battle route has no opponent test, so it runs after the battle whose
before-battle hook advanced the subsection.

| Fleet ID | Class          | Captain        |
| -------: | -------------- | -------------- |
|       25 | Convoy         | Rashid Jabbar  |
|       26 | Convoy         | Walid Kemal    |
|       27 | Voyaging Fleet | Afmed Muhiddin |
|       28 | Voyaging Fleet | Sallah Iskal   |
|       29 | Voyaging Fleet | Siddarth Kebin |

## Section 7: Raul, Lucia, and Neo-Atlantis (30,000 Fame)

Until the New World search succeeds, the Lisbon Pub ejects Catalina, except in
the stage in which Pietro waits at the Franco home. In the first two stages the
Franco home has no story route.

### Ali, Pietro, and Raul

| Stage          | Required action                                                               | What changes                                                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arm the finale | With at least **30,000** Fame and Pirate affiliation, reach **voyage day 5**. | The subsection advances.                                                                                                                                                                                      |
| Meet Ali       | Visit a **Lodge** outside Lisbon.                                             | Ali Vezas says Pietro wants to see Catalina in Lisbon. The subsection advances. Other ordinary buildings outside Lisbon say that a Turkish trader is looking for her at the Lodge and eject her.              |
| Hear the truth | Visit the **Franco home** in Lisbon.                                          | Duchess Christiana thanks Catalina for saving João; Pietro and Raul Franco name Marquis Martinez as Michael's killer and explain Neo-Atlantis. The Spanish fleets are redeployed and the subsection advances. |

In the Lisbon stage the **Pub** plays an optional scene in which Carlotta begs
Catalina to return Lucia, and other ordinary Lisbon buildings direct her to the
Franco home. Both eject her. The Palace and Meet Ruler routes are empty.

The Franco-home scene gives fleets 15–19 the fixed position `(70, 500)`, six
units south of Arguin's raw coordinate `(70, 494)`, objective 7 targeting
Catalina, and flags `0x41`.

### Lucia in the New World

| Stage        | Required action                                                                | What changes                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search       | Enter an ordinary **non-Pub** building at port ID 42–56 from **08:20** onward. | `random(10)`: 0 shows someone chased into the Pub, ejects Catalina, and advances; 8–9 give Emilio's hint to sail from port to port; 1–7 do nothing. The port is kept in variable 0. |
| Rescue Lucia | Visit the **Pub** in that port.                                                | João and Rocco are fighting pirates; Lucia is taken hostage. Catalina duels Pirate Rudolph so that João can escape with Lucia. The subsection advances and she is ejected.          |
| Meet João    | Visit a **Harbor** at any port ID 42–56.                                       | Catalina tells João about Martinez; they agree to seek Ezequiel's help. The Spanish fleets and João's fleet are moved to Catalina. The subsection advances.                         |

Ports 42–56 are Caracas through Cayenne. Each eligible search visit has a **10%
chance** of success. The subsection's Pub route is explicitly empty, so Pubs
never roll; the search must use other buildings. In the following subsection,
other buildings in the chosen port say “Commodore, let's go to the pub now” and
eject Catalina; buildings elsewhere behave normally.

The Pub duel is against sailor 60 once again. The scene renames the record
“Pirate Rudolph” and changes its portrait selector to 59, but writes no
attributes, so Rudolph fights with the stats written for Perot in section 5 (or
whatever sailor 60 has since).[^rudolph] After the duel, a balance of 100 or
more plays Catalina's “he wasn't nearly as good as he claimed”; below 100,
Andreas strikes Rudolph from behind. Both branches continue identically, so the
duel's outcome does not affect progression.

[^rudolph]:
    `SNR2.DAT 0x2947–0x2965`: `1D 00 3B` writes byte `+0x12`, then
    `D4 0340`/`D4 0341` copy messages 833, “Pirate”, and 834, “Rudolph”, to
    `+0x00` and `+0x09`. `E8 3C` at `0x2965` starts the duel. `0F 02 06` then
    reads the duel balance and branches at `0x296A` (`< 100`) and `0x2978`
    (`> 99`). The only writes to attributes `+0x14..+0x1D` in `SNR2.DAT` are the
    section-5 block beginning at `0x1CCA`.

### Ezequiel and Martinez

| Stage             | Event                          | Result                                                                                                                                                                |
| ----------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recruit Ezequiel  | Encounter any of fleets 15–19. | Catalina surrenders so that João can explain Neo-Atlantis; Ezequiel agrees to join. The battle is cancelled, the forces are reorganized, and the subsection advances. |
| Confront Martinez | Encounter any of fleets 61–69. | Martinez taunts the allies; Catalina claims the right to face him while João and Ezequiel take the rest. The prompt is skipped and flags 0 and 2 are set.             |
| Win               | Destroy that fleet.            | Martinez's ambition collapses and Ezequiel destroys the fortress. The forces are dispersed, the ending plays (`F4 01`), and the section advances beyond the last one. |

The João Harbor scene reads Catalina's own fleet position (fleet 10) and moves
every fleet 15–19 there with objective 7 targeting her. João's fleet, fleet 0,
is placed at the same point with objective 10, following her. The next encounter
with a Spanish fleet is therefore nearly immediate.

The Ezequiel scene has no variable-63 write and ends in `F8`, so the battle is
cancelled (code 8).[^battle-hooks] Before it ends, the scene:

- places the nine regular pirate fleets, IDs 61–69, at the fixed point
  `(1922, 656)`—south of Margarita `(1922, 584)` and west of Cayenne
  `(1996, 642)`—with objective 7 targeting Catalina;
- moves fleets 15–19 to Catalina's position with objective 10, following her;
- moves João's fleet to her position and recomputes its course.

The pirate fleets are:

| Fleet ID | Captain          |
| -------: | ---------------- |
|       61 | Hamid Lal        |
|       62 | Pierre Lugulan   |
|       63 | Louis Scott      |
|       64 | John Davis       |
|       65 | Khayr ad-Din     |
|       66 | Idin Leis        |
|       67 | Mohommed Syarook |
|       68 | Ulgu Ali         |
|       69 | Jack Raccam      |

No record is renamed Martinez. The Martinez dialogue plays for whichever of
fleets 61–69 Catalina engages, and after that first encounter the scene's
follow-up lines (“How long are you going to try to escape from me?”) replace the
confrontation. The after-battle route tests only flag 2, which the first pirate
encounter sets and nothing clears, and that the current opponent's captain no
longer has a fleet. It does not recheck the fleet ID.[^finale-fleet-code]

The ending block detaches the pirate captains, sends fleets 15–19 and João's
fleet 0 home, deactivates fleet 60, plays Catalina's ending with `F4 01`, and
executes `F1`.

[^finale-fleet-code]:
    João's Harbor scene is `SNR2.DAT 0x29C8–0x2B0C`; it copies fleet 10's
    position words to fleets `0x0F–0x13` (objective 7, target 1, flags `0x41`,
    `D1`) and to fleet 0 (objective 10, target 1, flags `0x41`). The Ezequiel
    route at `0x2B15–0x2CB3` writes `(0x0782, 0x0290)` and objective 7 to fleets
    `0x3D–0x45`, gives fleets `0x0F–0x13` objective 10 at fleet 10's position,
    moves fleet 0, runs `D1 0A` with variable 10 = 0, then `F8 F0`. The Martinez
    route at `0x2F3A` sets flag 2 at `0x2F9D`; the after-battle route at
    `0x2FA1` requires flag 2 and fleet byte `0xFF`. The ending loop at
    `0x3048–0x30C7` writes sailor `+0x24 = 0xFF`, duty `+0x26 = 0`, and location
    `+0x25 = random(42)` for each pirate captain, and fleet `+0x29 = 0`,
    `+0x28 = 0`, `+0x2A = 0xFF`. Fleets `0x0F–0x13` and fleet 0 receive route
    word `0x4000`, objective 0, argument 1, and flags 1; fleet `0x3C` receives
    flags 0. `F4 01` at `0x30F6` precedes `F1`.

### Attacking the allies

Once the alliance is formed, the before-battle route checks for two deliberate
mistakes:

| Target                 | Warning                                                           | Consequence of **Yes**                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| João, fleet 0          | “Commodore, it's Joao. Are you really going to attack him?”       | Emilio advises, “Reset the game, or else we'll never be able to see the ending!” The battle is fought and the story ends without its ending. |
| Ezequiel, fleets 15–19 | Emilio warns that this is the “Invincible Fleet” led by Ezequiel. | “It's too bad. This way, I don't get to see the ending.” The same failure follows.                                                           |

Choosing **No** plays “What a relief” (or, after the Martinez meeting, “You're
targeting the wrong ship!”) and cancels the battle with `F8`. Choosing **Yes**
suppresses the Fight/Flee/Surrender prompt and runs a failure
block:[^ally-attack-failure]

- the pirate captains of fleets 61–69 lose their fleets and are relocated to a
  random port 0–41, exactly as in the ending;
- fleets 15–19 are sent home with objective 0 and port 1;
- the same home-bound writes are applied to fleet 10, Catalina's own fleet;
- fleet 60 is deactivated; and
- `F1` advances past section 7.

`SNR2.DAT` has no section 8: its section table holds `FFFF FFFF` in that slot.
The section loader at `MAIN.EXE 0x385DF` therefore stores section `0xFF`, and
the protagonist dispatcher at `0x391DA` ignores every Catalina route from then
on. Unlike João's version of this branch, Catalina's attributes and name are not
changed, and João's fleet keeps objective 10.

[^ally-attack-failure]:
    The João block is at `SNR2.DAT 0x2CC0–0x2DC8` (`E9 10` at `0x2CDA`, flag 16
    set for Yes); the Ezequiel block is at `0x2E03–0x2EFF` (`E9 10` at
    `0x2E1A`). Each sets variable 9 to 1, repeats the pirate-detach loop, writes
    route word `0x4000`, objective 0, argument 1, and flags 1 to fleets
    `0x0F–0x13` and `0x0A`, writes flags 0 to fleet `0x3C`, and ends in `F1`.
    The No branches end in `F8` at `0x2E02` and `0x2F39`.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Seville opening              | Headquarters → Pub → Headquarters → Pub → Harbor, then sail to voyage day 1                                                      |
| Spanish pursuit              | 1+ Fame, any building outside Seville; fight fleets 15–19 twice without being defeated                                           |
| First João rumor             | 1,500 Fame and a non-Pub, non-Palace building at port ID 0–41                                                                    |
| 2,000 handoff                | Any Pub with 2,000 Fame, then any other building visit                                                                           |
| European search              | Building at ports 2–41 → voyage day 1, twice; then a building from 04:20 to 17:00 → that day's Shipyard                          |
| Missed the Shipyard          | Any Harbor on a later day                                                                                                        |
| 8,000 Fame                   | Voyage day 3 → non-Pub building → any Pub for Perot                                                                              |
| Perot's port                 | Pub → other building → Pub → search non-Market buildings (25% each) → Market → Harbor                                            |
| Lucia                        | European Pub (not Ceuta or Perot's port) → Lisbon Pub by 21:00 → Lisbon Lodge three times → Ceuta Lodge → Ceuta Pub → Alexandria |
| Perot's fleet                | Destroy fleet 60, which starts just north of Istanbul                                                                            |
| 15,000 Fame                  | Any building to arm, then destroy an enemy fleet                                                                                 |
| Massawa                      | Another Massawa building → Harbor → any building → fight fleets 25–29 → special building                                         |
| 30,000 Fame                  | Voyage day 5 → Lodge outside Lisbon → Lisbon Franco home                                                                         |
| New World                    | Non-Pub buildings at ports 42–56 after 08:20 → that port's Pub → any Harbor at ports 42–56 → meet fleets 15–19                   |
| Neo-Atlantis                 | Destroy one of fleets 61–69 near `(1922, 656)`; never answer Yes to attacking João or Ezequiel                                   |

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **Route word `0x4000`.** Writing exactly `0x4000` to fleet word `+0x0C`
  clears the cached route and waypoint and marks the route as needing a
  rebuild, so the fleet plans a fresh route to its new target; the game writes
  the same value whenever it gives a fleet a new destination
  ([Route state](../npc/fleet-navigation.md#route-state)).
- **Writes to Catalina's own fleet** have no visible effect. When Catalina is
  the protagonist, fleet 10 is the player's fleet, which every computer-fleet
  update skips (`MAIN.EXE 0x1FEBE`, `0x202B3`, `0xBE04`). Objective 0,
  argument 1, and flags `0x01` are the values the player's fleet already
  holds, and the route word is rewritten whenever auto-sail starts
  (`0x36DAC`, `0x36E4F`).
- **Sailor byte `+0x29` bit `0x20`** marks a sailor record as in use. New
  sailors are created with it (`MAIN.EXE 0x1D8CF`). It is cleared when a
  generic-portrait captain loses his fleet in battle (`0x1533A`) or is lost at
  sea (`0x1EAC0`); each month a record without it has a 1-in-3 chance of being
  reused for a new generic sailor (`0x1DC64`), and after a battle a captain
  without it always loses his fleet ([After the battle](../naval-battle.md#after-the-battle)).
  Bit `0x10` is never set on a protagonist
  ([Waitresses](../waitresses.md)), and no executable path sets bit `0x08`.
- **Duel direction.** A scripted duel (`E8`, `MAIN.EXE 0x37E8E`) makes the
  protagonist the first combatant, whose damage moves the balance toward 200
  (`0x17F8A`); a balance of 100 or more therefore favors Catalina.
- **Variable 9** is written by both failure branches but read by no
  `SNR2.DAT` instruction and by no executable routine: `MAIN.EXE` writes only
  protagonist variables 60 and 63.
- **Losing Pirate affiliation is possible.** A Pirate is always admitted to a
  Palace, and **Defect** is available at any foreign capital, so Catalina can
  defect. Defecting rewrites her nation nibble to the capital's nation
  (`MAIN.EXE 0x305A8–0x305B9`), after which every Pirate-gated story step no
  longer matches and the story stalls. This is possible from the very start:
  defecting to Spain at the Seville Palace before sailing means the first
  gate, a building outside Seville with Pirate affiliation, never fires.

## Open questions

None remain; the last ones are answered in [Engine notes](#engine-notes).
