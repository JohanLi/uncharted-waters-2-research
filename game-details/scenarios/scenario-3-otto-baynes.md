# Scenario 3: Otto Baynes

Scenario 3 (`SNR3`) is Otto's character story. After a London opening and the
theft of Spain's newest galleon from Seville, it advances through Piracy Fame
milestones at 5,000, 15,000/20,000, and 30,000. Each milestone opens another
chain of building, voyage-day, or battle events; reaching a later Fame value
does not skip the active chain.

This document describes the scenario from the player's point of view. It is
based on the decoded `SNR3.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine.

Evidence labels have the meanings defined in [the scenario README](./README.md).

## Story and threshold map

| Section |      Piracy Fame gate | Player-visible story                                                        |
| ------: | --------------------: | --------------------------------------------------------------------------- |
|       0 |                     — | Henry VIII's commission, Matthew's duel, and the stolen Spanish galleon     |
|       1 |                     — | The Spanish counterattack                                                   |
|       2 |                 5,000 | The ghost in the sack and meeting Catalina                                  |
|       3 | 15,000 (skip: 20,000) | Optional: Pietro sells the story of the gold ship from Veracruz             |
|       4 |                30,000 | The Armada campaign: Nantes, Santo Domingo, the Amazon, and Catalina's plea |
|       5 |                30,000 | Ezequiel's challenge, the Bordeaux appointment, and the return to London    |

The thresholds compare **Piracy Fame**, the word at `+0x02` of Otto's 14-byte
Fame record, not total Fame. Every comparison after section 2 is preceded by
an affiliation test: the low nibble of Otto's sailor-record byte `+0x29` must
be `3` (England).

The gate is only one part of each trigger:

- 5,000 is tested when Otto enters a **Pub** in any regular port. Other
  ordinary buildings test it too, but only to have Matthew suggest a drink.
- 15,000 is tested by the **London Pub** and opens the optional Pietro scene.
- 20,000 is tested by any other regular-port building and ends section 3
  silently, skipping the Pietro scene if it has not happened.
- 30,000 is tested on entering a **Harbor** in any regular port, once to start
  section 4 and again, silently, to arm section 5.

The scenario adds fixed Piracy Fame of its own: 300 when the stolen galleon
leaves Seville, 500 after the Spanish counterattack, 500 for keeping the
appointment with Catalina, and 1,000 after each of two Armada battles. Only the
last two awards are capped at 50,000.

Scenario services which are not mentioned below normally retain their ordinary
game behavior. The tables describe the extra story behavior layered onto them.

## Section 0: the commission and the stolen galleon

### London preparation

Otto begins in London with no ship. Only the Palace, Pub, Market, Guild,
Harbor, and Shipyard have opening routes; the other London buildings behave
normally.

1. Visit the **Palace**. Sir Gilbert sneers at Otto's lateness, and Henry VIII
   appoints him Head of the Royal Navy with orders to gain experience at sea.
   The scene:
   - raises Otto's rank by one, making a new character a **Page**;
   - places the Short Sword, Leather Armor, and English Letter of Marque
     (`Marque (E)`) in the first three inventory slots; and
   - pays 300 gold, after Gilbert refuses anything more generous.[^palace]
2. Visit the **Shipyard**. The shipwright hands over a Caravela Latina whose
   name Gilbert has chosen: _Idiot_. The ship starts with 20 crew, 20 Water, and
   20 Food.[^idiot]
3. Visit the **Harbor**. Matthew introduces himself and challenges Otto to meet
   him at the Pub. The Harbor then ejects Otto.
4. Visit the **Pub**. Matthew starts a brawl: the scenario runs a sword duel
   against Matthew Loy, sailor 75 (`E8 4B` at `SNR3.DAT 0x0284`; see
   [Dueling](../dueling.md#scripted-duels)). The result only selects Matthew's
   comment. He joins Otto's crew and becomes First Mate whether Otto wins,
   draws, or loses. The route advances the opening substage.
5. Visit the **Harbor** and set sail. On voyage day 1, Matthew proposes spying
   on the Spanish in Seville.

| Building | Story behavior                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Palace   | The first visit plays the commission. Later visits say the King is out and eject Otto.                                                                                                                        |
| Pub      | Before the Palace, Otto chats with the owner about whiskey and is ejected. After the Palace, the Pub is normal until Matthew's Harbor challenge; the next visit is the duel. The Pub remains usable after it. |
| Market   | Before the Palace, a stranger (Gilbert) has left word to report to the Palace; Otto is ejected. Normal afterward.                                                                                             |
| Guild    | Until Otto has his ship, the clerk says work requires a ship and ejects him. Normal afterward.                                                                                                                |
| Shipyard | Before the Palace, the shipwright is busy with Palace work and ejects Otto. After the ship is collected, it says the ship is at the docks and then opens normally.                                            |
| Harbor   | Always ejects before the duel: first a pointer to the Shipyard, then Matthew's challenge, then “Matthew is waiting for you at the pub.”                                                                       |

The duel reads the final duel balance (system selector 6). Values of 120 or
more give Matthew's “Say, you're pretty tough!” lines, 80 or less give his
“you're not that tough” lines, and 81–119 give the short “You're not too bad.”
exchange. All three branches then execute `FB 4B`, which adds Matthew to the
mate roster, set his duty byte to 3 (First Mate), and execute `F0`.

[^palace]:
    `SNR3.DAT 0x012B–0x01EC`. The rank increment reads the protagonist
    ID from the group-2 block (save `0x0611`) and adds one to byte `+0x0D` of
    that protagonist's Fame record. The items are written as raw IDs 1, 16, and
    32 to the inventory at save `0x1DC1`. The script also ORs `0x10` into byte
    `+0x15` of item definitions 1 and 16. [Buildings](../buildings.md) calls
    that byte the type/equipped flags, so the sword and armor are **Likely**
    already marked as equipped, despite the King's reminder to equip them.

[^idiot]:
    `SNR3.DAT 0x03F3–0x0415`: `F9 05` starts a pending ship of raw type 5
    (Caravela Latina), and `FA 05 0055` commissions it with message 86,
    “Idiot”. The script then writes crew word 20 to fleet slot 0 and 200
    tenths of Water and of Food to supply record 0. It sets flag 1.

### Seville and the galleon theft

After voyage day 1, Seville's buildings form the next stage, and Seville's
port record is marked discovered (`+0x13 |= 0x10`; Seville is already visited
in a new game). Flags 0–2 are cleared.

The key sequence is short:

1. Enter the **Seville Pub** at any time it is open. Matthew is already
   drinking. After two time-skip captions he recruits a crowd of sailors, too
   many for the _Idiot_, and leads them off to steal the new Spanish galleon.
   Otto is ejected; flags 0, 1, and 2 are set.
2. Visit the **Seville Harbor**. Matthew shows Otto the stolen ship. The scene
   replaces the _Idiot_ with a Galleon named _Fools_ and sets it up for the
   crowd, then advances the subsection.[^fools] Otto can sail at once.
3. On voyage day 1, Matthew wakes up with a hangover. Otto has found 10,000
   gold pieces in the captain's cabin. The scene then advances to section 1.[^wakeup]

The other Seville buildings stage the launching ceremony in the background.
Most of them first record the day of the month (flag 3 and variable 0) and
play their ceremony dialogue only on that same day:

| Building                                        | Story behavior                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market                                          | Explains that the town has gone to the launching ceremony (sets flag 0), then asks whether Otto has seen the ship. The Market stays usable. After the Pub scene, it says a group of crazy sailors went toward the Harbor and ejects Otto.                                                                                     |
| Shipyard                                        | On the recorded day, reports the rowdy ceremony, sets flags 0 and 1, and announces that the galleon is coming into the Harbor; Otto is ejected. After the Pub scene: “Matthew! You gluttonous fool! Where are you?” and ejection.                                                                                             |
| Harbor                                          | Ejects Otto until the Pub scene. From 00:00 to 03:40 on the first visit it suggests sleeping at the Lodge (and forgets the recorded day); otherwise it says to look around town first, then comments on the ceremony. On a later day it guesses that Matthew is at the Pub. From 20:00 it says to resume the search tomorrow. |
| Lodge, Palace, Meet Ruler, Church, special site | No story routes; ordinary behavior. The Lodge can be used to wait.                                                                                                                                                                                                                                                            |
| Other buildings                                 | Guild, Bank, Item Shop, and House of Fortune share one route. Before 20:00 on the recorded day a townsperson invites Otto to the ceremony, or praises it once flag 1 is set; after the Pub scene they deny seeing a tipsy Englishman. Each of these scenes ejects Otto; otherwise the building behaves normally.              |

The Pub has no day or time check. Its dialogue varies only with flags 1 and 3:
whether Otto saw the ceremony from the Shipyard, and whether he has recorded a
day in another building.

#### Skipping the theft

The Seville stage is optional. Its section-entry table also contains a
regular-port **Harbor** route (`0xA303`) for every port other than Seville:

- The first such Harbor visit has Matthew remind Otto that they were going to
  gather information on the enemy. It sets flag 10 and does not eject him.
- A second non-Seville Harbor visit sets variable 9 to 1 and advances the
  subsection without any scene.

The following voyage-day-1 route then tests variable 9 and advances directly
to section 1. This skips the galleon, the 10,000 gold, the Fame, and the
diplomatic changes described in the footnote. With variable 9 still set to 1,
section 1 also skips its pursuit story (below).

[^fools]:
    `SNR3.DAT 0x07B3–0x087D`. The scene plays `CA 13`, shows `EVENT3.DAT`
    record 4, and then clears the active bit `0x10` of fleet slot 0 and writes
    `0xFF` to byte `+0x11` of ship instance 0. `F9 0A` and `FA 0A 00A6` create
    raw type 10, a Galleon, named with message 167, “Fools”. In an ordinary game
    the _Idiot_ is Otto's only ship, so slot 0 and instance 0 are the ones
    reused. The slot receives 150 crew, 70 guns, and durability 100/100 (bytes
    `+0x00`, `+0x06`, `+0x02`, and `+0x03`). ORing `0x04` into status byte
    `+0x08` sets the gun type in its low three bits to 4, the Culverin; the
    freshly commissioned ship otherwise has gun type 0, which cannot fire
    ([Guns](../naval-battle.md#guns)). Supply record 0 receives 2,000 tenths
    of Water and Food (200 each) and 50 Shot. Music then changes to `CA 0A`,
    the European-port theme.

[^wakeup]:
    `SNR3.DAT 0x08F3–0x097A`. `E6` adds 10,000 gold. The script then ORs
    `0x10`, the blockade flag, into Spain's status byte toward England
    (nation record 1, `+0x15`) and England's toward Spain (nation record 3,
    `+0x13`); see [Friendship](../friendship.md). It adds 300 to Otto's Piracy
    Fame without a cap and sets his stored Friendship with Spain (Fame-record
    byte `+0x07`) to 20, a displayed −80. The record is addressed as
    protagonist 2 directly.

## Section 1: the Spanish counterattack

The section contains three one-route stages:

1. Enter any regular-port building other than the Palace. Matthew warns that
   a ship has been tailing them since Seville and suggests strengthening the
   fleet. The scene reactivates **Bernal Loyola's Spanish Voyaging Fleet**,
   fleet ID 18. It moves the fleet to Otto's current position and sets it to
   pursue Otto.[^pursuit]
2. The next battle against fleet 18 plays a before-battle scene: “Commodore,
   it's the Spanish alright. They must want their ship back.” It sets
   variable 63, suppressing the ordinary Fight/Flee/Surrender prompt
   (`MAIN.EXE 0x15121–0x15137`). Battles against other fleets do not advance
   the stage.
3. After that battle, the after-battle route clears fleet 18's flags byte to 0,
   deactivating the fleet, and adds 500 Piracy Fame without a cap. The
   scenario advances to section 2.

The after-battle route does not test whether Otto won. The executable
dispatches it after every battle other than a defeat
([Reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md#mainexe-scenario-vm)).

If the Seville stage was skipped (variable 9 is 1), each of the three routes
simply advances: one building visit, then any battle, finishes the section
without dialogue, fleet changes, or Fame.

[^pursuit]:
    `SNR3.DAT 0x09E9–0x0A1D` copies the position words of fleet 30, Otto's
    fleet, to fleet 18, sets objective 7 with target sailor 2 (Otto), writes
    flags `0x41`, and invokes `D1`. The before-battle check at `0x0A30–0x0A38`
    compares the fleet byte of the opposing captain (variable 60) with 18. The
    after-battle route at `0x0A77–0x0A86` computes `flags & 0xBF` but writes a
    literal 0.

## Section 2: the ghost in the sack and Catalina (5,000 Fame)

### Arming the section

With at least 5,000 Piracy Fame, enter a **Pub** in any regular port. Matthew
says, “Commodore, let's have a drink!” The subsection advances and the Pub
remains usable. Other ordinary buildings with at least 5,000 Fame only play
Matthew's “Shall we be off to the pub?” exchange; they do not advance anything.
The Palace, Meet Ruler, Church, and special-site routes do nothing.

The rest of the section takes place in the port where the Pub was entered,
because that port's **Harbor** now ejects Otto until the section ends.

### The sack and the appointment

| Stage                | Required action                                        | What changes                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hear the rumor       | Optional: visit the **Harbor**.                        | A townsperson says ghosts haunt the trader's place. Otto is ejected.                                                                                                                    |
| Open the sack        | Visit the **Market** (04:00–19:40, its normal hours).  | Otto and Matthew free Emilio and Andreas, and Catalina arrives. She agrees to meet at the Pub “in about two hours”. Variable 15 = entry time + 5 ticks; flag 0 is set; Otto is ejected. |
| Wait                 | Other buildings.                                       | Matthew's comments track the clock. The Harbor still ejects Otto. The Lodge and other buildings remain usable.                                                                          |
| Keep the appointment | Enter the **Pub** 2:00–3:40 after entering the Market. | Catalina explains her revenge on the Franco family. Flag 1 is set, 500 Piracy Fame is added (no cap), and the scenario advances to section 3.                                           |

The Pub compares only the time of day, in 20-minute ticks, with variable 15
(`SNR3.DAT 0x0D11–0x0E81`):

- at or before variable 15, “That girl's still not here.” The Pub remains
  usable;
- from variable 15 + 1 through variable 15 + 6, the meeting; and
- at variable 15 + 7 or later, Otto learns that Catalina waited about two
  hours and left. The scenario still advances to section 3, but without the
  500 Fame.

Because no date is stored, a Pub visit on a later day falls into the same
three bands. The Pub opens at 08:00, so a sack scene entered at 04:00 (tick 12)
leaves no usable meeting time that day: the window ends at 07:40, and an 08:00
visit is already “late”. Entering the Market at 04:20 leaves exactly the 08:00
tick. A Market entry at 19:40, the latest possible, puts the window at
21:40–23:20; later visits roll over midnight into the “still not here” band.

## Section 3: Pietro's story (15,000 Fame, optional)

### The London Pub scene

The section's first subsection has only two routes: the **London Pub** and a
wildcard for every other regular-port building. The London Pub scene requires
all of the following (`SNR3.DAT 0x1042–0x1075`):

- English affiliation;
- at least **15,000** Piracy Fame; and
- fleet ID 11, **Esteban Ortega's Spanish merchant fleet**, has its active bit
  (flags bit 0) set.

At the Pub, Pietro Conti offers Otto and Matthew a story in exchange for his
10,000-gold debt to a Turkish merchant:

1. If Otto has less than 10,000 gold on hand (no Gold Ingots), he cannot pay;
   Pietro leaves to tell João instead.
2. Otherwise a Yes/No choice follows. **No** sends Pietro away.
3. **Yes** starts the gold ship before Pietro says another word. Fleet 11 is
   moved near Veracruz, loaded with 120 Gold, and set to sail home to
   Seville.[^gold-fleet] Pietro reveals that a Spanish ship full of New World
   gold is bound for Seville, then presents a forced menu:

| Choice    | Cost        | Result                                                                                                    |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| Pay       | 10,000 gold | Pietro says the ship is leaving Veracruz and names its captain ($r04 $r03, read from fleet 11's captain). |
| Bargain   | 5,000 gold  | Pietro grumbles and names the captain.                                                                    |
| Don't Pay | —           | Pietro calls Otto a cheapster. Otto's first name is replaced with “Chintzy”.                              |

Every outcome advances the subsection. In an unedited game fleet 11's captain
is Esteban Ortega, so the fleet has his ordinary merchant ships, not a real
Frigate. The dispatch happens as soon as Otto chooses Yes, so the ship sails
even if he then refuses to pay.

[^gold-fleet]:
    `SNR3.DAT 0x1177–0x11B2`: fleet 11's position becomes `(1736, 529)`, its
    objective 0 (return home) with argument port 1 (Seville), and its flags
    `0x41`. `D1` recomputes its course. Byte `+0x21` receives goods ID 31
    (Gold) and word `+0x22` the amount 120; these are the cargo fields that
    [naval-battle spoils](../naval-battle.md) read. Pietro's name for the
    captain comes from fleet byte `+0x2A`, the captain sailor ID (15, Esteban
    Ortega, in `raw/KOUKAI2.DAT`), through that sailor's two name fields.

### Leaving section 3

- **After the Pietro scene**, the scene stores a date one month ahead in
  variable 24. From then on, any regular-port building visit on or after that
  date advances to section 4. The month gives Otto time to intercept the gold
  ship.
- **Without the Pietro scene**, any regular-port building other than the
  London Pub advances to section 4 once Otto has 20,000 Piracy Fame.
- The “cannot pay” and **No** branches do not set variable 24. SNR3 writes
  that variable only in this scene and in section 5, so in an ordinary game it
  is **Likely** still 0, and the next building visit ends section 3.

The scene is therefore optional and easy to miss. It must happen in the London
Pub between 15,000 Piracy Fame and the first other building entered at 20,000.
It is not a prerequisite for the Armada campaign.

The date is a 30-day-per-month code:

```text
date code = (years since 1501 × 12 + zero-based month) × 30 + zero-based day
target    = current date code + 30
```

## Section 4: the Armada campaign (30,000 Fame)

### The summons

1. With at least 30,000 Piracy Fame, visit a **Harbor** in any regular port. A
   townsperson says Henry VIII is looking for Otto. The subsection advances;
   the Harbor is not closed.
2. In London, every building other than the Palace and Guild ejects Otto,
   including the Harbor. Otto cannot leave London by sea until the Guild
   briefing.
3. Visit the **London Palace**. Gilbert mocks Otto. If Otto is a Viscount or
   higher (rank byte at least 6), Otto objects to his tone; otherwise he merely
   calls Gilbert bitter. Henry VIII reports that half the Royal Navy has been
   lost and orders Otto to destroy the Spanish Fleet. Flag 0 is set; Otto is
   ejected. Later Palace visits say “Bring honor to the homeland.”
4. Visit the **London Guild**. Before the Palace audience, the Guild only says
   the King is waiting. Afterward it supplies intelligence: the Invincible
   Fleet under Commander Ezequiel is resupplying at Nantes, Bordeaux, and
   Seville before meeting near South America. Otto decides to destroy the
   fleets one by one before they converge. The Guild remains usable.

The Guild scene moves every Spanish fleet with ID 15–19 to a fixed point near
Nantes, `(163, 296)`, with objective 3 and argument 28 (Nantes' port ID), and
makes it active with the story flag (`0x41`).[^armada-fleets]

| Fleet ID | Captain        | Normal role    |
| -------: | -------------- | -------------- |
|       15 | Tonio Burciaga | Convoy         |
|       16 | Hugo Montoya   | Convoy         |
|       17 | Xavier Navarro | Voyaging Fleet |
|       18 | Bernal Loyola  | Voyaging Fleet |
|       19 | Hernan Chavez  | Voyaging Fleet |

Fleet 18 is reactivated even though section 1 deactivated it.

### Stage sequence

| Stage                 | Required action                                                                 | What changes                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nantes battle         | Fight any fleet with ID 15–19.                                                  | The before-battle hook advances the subsection. Harbors meanwhile say “let's get to Nantes Harbor”.                                                                        |
| The fleet slips away  | The same battle ends in anything but a defeat.                                  | Matthew reports the other ships sailed west. All five fleets move to `(1894, 542)` with objective 3 and argument 48 (Santo Domingo). +1,000 Piracy Fame, capped at 50,000. |
| South American report | Enter any building in port IDs 42–56 **except Santo Domingo** (48).             | A townsperson says the fleet left toward the Amazon but one late division may still be at Santo Domingo.                                                                   |
| Santo Domingo battle  | Fight any fleet with ID 15–19.                                                  | The before-battle hook advances. Harbors meanwhile point to Santo Domingo.                                                                                                 |
| The fleet slips again | The same battle ends in anything but a defeat.                                  | The five fleets move to `(1977, 678)`, near the Amazon, and are set to pursue Otto (objective 7). +1,000 Piracy Fame, capped at 50,000.                                    |
| Catalina's plea       | Encounter any fleet with ID 15–19 again. Harbors meanwhile point to the Amazon. | Otto finds wreckage of a great battle; Catalina arrives and asks him to spare Ezequiel. The battle is cancelled and the five fleets are sent home to Seville.              |
| End of section        | Reach **voyage day 5**.                                                         | The scenario advances to section 5.                                                                                                                                        |

The battle hooks accept any of the five fleet IDs and do not test the
location. A battle against one of them away from Nantes therefore counts as
the Nantes battle. The after-battle scenes follow the same battle, because the
before-battle hook has already armed them. They do not test victory, but a
defeat skips them.

The report stage uses the wildcard route, so the Pub or Harbor of a qualifying
port also works. Santo Domingo is explicitly excluded.

[^armada-fleets]:
    Each of the three setup blocks scans all 120 sailor records and
    uses a record's fleet byte `+0x24` when it is 15–19 (`SNR3.DAT
0x14EA–0x1557`, `0x15C4–0x1630`, `0x16E7–0x173B`). A captain who has lost
    his fleet link is therefore skipped. The Nantes and Santo Domingo blocks
    write both the current position and the navigation target (`+0x00/+0x02`
    and `+0x04/+0x06`) and set the word at `+0x0C` to `0x4000` (bit `0x40` of
    byte `+0x0D`). They do not invoke `D1`. The Amazon block writes only the
    position, sets objective 7 with target sailor 2, and invokes `D1` for each
    fleet. None of them writes ship slots, so the fleets keep whatever ships
    they currently have.

### Catalina's plea and the punishment

Catalina's scene is a before-battle route (`SNR3.DAT 0x1775–0x1886`). She
explains that she, João, and Ezequiel have destroyed the Marquis Martinez, and
that Ezequiel's fleets are badly damaged. Matthew mutters that this should be
an easy victory, but Otto orders a retreat. The route then:

- gives fleets 15–19 objective 0 (return home) with argument 1 (Seville) and
  flags `0x01`, clearing their story bit;
- executes `F8`, which cancels the pending battle (end code 8,
  `MAIN.EXE 0x150F0–0x150FD`; see
  [Cancelled battles](../naval-battle.md#cancelled-battles)); and
- advances the subsection and resets variable 8 to 0.

Until voyage day 5, a new before-battle route watches for Otto attacking one
of those retreating fleets (`SNR3.DAT 0x1898–0x18F8`):

- On each of the first four attempts, Catalina says, “$n, please don't break
  your promise to me.” Variable 8 is incremented and the battle is cancelled.
- On the fifth attempt Catalina calls Otto a bully and announces the
  punishment. Matthew adds that with abilities this low they will never make
  it back to London and suggests restarting the game. The route sets variable
  63, suppressing the Fight/Flee/Surrender prompt, and the battle proceeds.

The punishment is a loop at `SNR3.DAT 0x18CE–0x18E4` over Otto's sailor
record (sailor 2), hard-coded rather than read from the protagonist ID. It sets
**Leadership, Seamanship, Knowledge, Intuition, Courage, and Swordsmanship**
(`+0x14..+0x19`) to 10. Charm, Luck, Navigation Level, and Battle Level are
not changed. Unlike João's ally-attack branch, it does not end the story: the
section still advances on voyage day 5, and every later attack on those fleets
before then repeats the punishment without a further warning.

Voyage day 5 is the counter for the current voyage. If the plea occurs after
day 5 of that voyage, Otto must set sail again and reach day 5.

## Section 5: Ezequiel and the Bordeaux appointment (30,000 Fame)

### Meeting Ezequiel

1. Visit any **Harbor** with at least 30,000 Piracy Fame. The subsection
   advances silently.
2. Optionally enter any other building first. Once, Matthew asks why Otto
   spared Ezequiel; Otto proposes following him home (flag 1).
3. Enter a **Pub** in a non-capital port of the Europe region: port IDs 3–41
   except Genoa (8), London (29), and Amsterdam (33). Lisbon, Seville, and
   Istanbul (0–2) and every port from 42 up are also excluded. A distinguished
   stranger from Seville asks to share the table, buys rum, and learns that
   the two sailors are English. He introduces himself as Ezequiel, commander
   of the Spanish Fleet. He asks why Otto did not attack his exhausted fleet;
   Otto answers, “honor”.
4. Ezequiel proposes a battle one month from now in Bordeaux Bay, midway
   between Seville and London. He will move from there toward Seville, and
   Otto may attack him at any time in that period. The **Yes/No** answer sets
   flag 3.

Either answer sets flag 2, advances the subsection, and ejects Otto.

**Accepting** stores the appointment date (today's date code + 30) in variable
24 and converts sailor 60 into Ezequiel.[^ezequiel-record]

**Declining** makes Ezequiel call Otto a coward. Matthew agrees. Flag 3 stays
clear.

[^ezequiel-record]:
    `SNR3.DAT 0x1B31–0x1BA3`, repeated at `0x1D65–0x1DD7` for the
    second chance. `D4` and the selector-0 string copy write message 466,
    “Ezequiel”, to the last-name field `+0x09` of sailor 60 (normally Antonio
    Khan) and message 467, “Roberto”, to the first-name field `+0x00`. A word
    write of 25 sets portrait byte `+0x12` to Ezequiel's portrait and also
    zeroes byte `+0x13`. The attributes at `+0x14..+0x1B` become Leadership
    98, Seamanship 96, Knowledge 97, Intuition 97, Courage 98, Swordsmanship
    90, Charm 96, and Luck 100. Navigation Level `+0x1C` becomes 42 and Battle
    Level `+0x1D` 44. The low nibble of affiliation byte `+0x29` becomes 1
    (Spain), preserving the high nibble.

### If Otto declined

Declining produces a coward stage with these routes:

| Building                            | Story behavior                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| London Palace                       | The first visit: Gilbert reports that everyone calls Otto “$s the Loser”. Otto's first name becomes **Loser** and variable 6 is set to 1. Henry VIII orders Otto to accept Ezequiel's challenge in Seville. The same visit and all later ones end with Gilbert's “His majesty does not want to meet with losers.” No ejection. |
| London Pub                          | `EB 00 00 05` rolls `random(5)`. On 0 the Pub is normal; on 1–4 the owner refuses to serve a coward and ejects Otto.                                                                                                                                                                                                           |
| Other London buildings              | Townspeople say Gilbert is happily spreading the news. No ejection.                                                                                                                                                                                                                                                            |
| Seville special site (Command Room) | Ezequiel grants one more chance: the same place, one month from now.                                                                                                                                                                                                                                                           |
| Other Seville buildings             | A townsperson directs Otto to the Command Room to the right of the palace. If Otto is already “Loser”, the townsperson laughs at the strange name. No ejection.                                                                                                                                                                |
| Pub in any other regular port       | “You're the coward, aren't you? I've no room for the likes of you!” and ejection. Crew cannot be recruited there.                                                                                                                                                                                                              |
| Other buildings elsewhere           | Matthew and Otto agree to return to London.                                                                                                                                                                                                                                                                                    |

The London visit is not required. The Seville Command Room route has no flag
or variable test, so Otto can go there directly. Its scene stores a new
appointment date, sets flag 3, repeats the sailor-60 conversion, advances the
subsection, and ejects Otto. The five-way random roll uses the deterministic
protagonist-scenario seed described in the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).

### The appointment

After accepting, in either place, the next visit to a building other than a
Pub or Palace, in a port other than London or Seville, advances to the appointment stage and reports the countdown.
The same subsection's Seville Command Room route has no guard. Revisiting it
after accepting replays the “Coward of England” scene and moves the
appointment a month later.

| Route                                                   | Story behavior                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Harbor**                                              | Clears flag 4, re-arming the countdown reminder.                                                                                                                                                                                                                                                              |
| Other buildings (while flag 4 is clear)                 | Matthew reports “Only $d12 more days”, “our big battle is today”, or that the rendezvous has been missed. Flag 4 is then set, so the reminder appears once per Harbor visit.                                                                                                                                  |
| At sea (every midnight, selector `0xA0`, any day count) | On the appointment date Matthew says it is the day for battle. On or after that date, Ezequiel's fleet is activated once (flag 5).                                                                                                                                                                            |
| Before a battle with sailor 60                          | Otto and Ezequiel exchange challenges; the Fight/Flee/Surrender prompt is suppressed.                                                                                                                                                                                                                         |
| After a battle with sailor 60                           | If Ezequiel no longer commands a fleet (his fleet byte is `0xFF`), he concedes. Otto sends him to a friendly ship and declares the Invincible Fleet destroyed. If Otto had been named “Loser”, Ezequiel renames him **Winner**. The subsection advances. Otherwise nothing happens, and Otto may fight again. |

The at-sea check runs at 0:00 of each day with that day's date: the calendar
loop calls the day routine `MAIN.EXE 0x2052F` and only then advances the day
counter for the next day (`0x1B2D7–0x1B2E9`). The appointment message
therefore appears the moment the appointment day begins at sea.

The “Ezequiel” fleet is fleet ID 60, the pirate fleet record normally
captained by Antonio Khan. On activation it is placed at `(170, 312)` near
Bordeaux, given pursuit objective 7 against Otto, flagged `0x41`, and routed
with `D1` (`SNR3.DAT 0x1F12–0x1F40`). The scenario writes no ship slots.
Ezequiel therefore commands whatever ships fleet 60 currently holds, and his
new attributes come from the sailor-60 conversion above.

#### Missing the appointment

The “missed” reminder has a hard limit (`SNR3.DAT 0x1F81–0x1FC1`). If a
non-Harbor building visit finds the current date code at least 30 past the
appointment, Matthew says they can no longer fight Ezequiel. The script clears
fleet 60's flags and advances the section past Otto's last one. This ends his
story-specific routes without the ending, as in João's failure branch. Until
that limit, Ezequiel's fleet remains active and the battle can still be won.

### Return to London

After Ezequiel is defeated, visit the **London Palace**. The route executes
`F4 02`, Otto's ending (`SNR3.DAT 0x20E8`). Other London buildings and every
Harbor have explicit no-op routes at this stage.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| London opening               | Palace → Shipyard → Harbor → Pub (duel) → Harbor, then sail                                                |
| Seville                      | Seville Pub, then Seville Harbor; or visit two Harbors outside Seville to skip the theft                   |
| Spanish pursuit              | Enter a building, then fight Bernal Loyola's fleet 18                                                      |
| 5,000 Fame                   | Pub → Market in the same port → Pub 2:00–3:40 after the Market visit                                       |
| Harbor keeps ejecting Otto   | Section 2: finish the Market and Pub stages in that port. Section 4: complete the London Palace and Guild. |
| Pietro's gold ship           | London Pub at 15,000 while fleet 11 is active, before visiting other buildings at 20,000                   |
| 30,000 Fame                  | Any Harbor → London Palace → London Guild                                                                  |
| Nantes battle                | Fight any fleet with ID 15–19                                                                              |
| South America                | A building in port IDs 42–56 except Santo Domingo, then fight a fleet with ID 15–19 again                  |
| Amazon                       | Meet a fleet with ID 15–19 again, do not attack it, and reach voyage day 5                                 |
| Section 5 start              | Any Harbor, then a Pub in a non-capital European port                                                      |
| Declined Ezequiel            | Seville special site (Command Room)                                                                        |
| Appointment                  | A building outside London and Seville, then sail on or after the date and defeat fleet 60                  |
| After defeating Ezequiel     | London Palace                                                                                              |

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **Route word `0x4000`.** Writing exactly `0x4000` to fleet word `+0x0C`
  clears the cached route and waypoint and marks the route as needing a
  rebuild, so the fleet plans a fresh route to its new target; the game writes
  the same value whenever it gives a fleet a new destination
  ([Route state](../npc/fleet-navigation.md#route-state)).
- **Fleet 11's active bit** (fleet byte `+0x29` bit `0x01`) is cleared only
  when the fleet loses its captain (`MAIN.EXE 0x1531F`, `0x1F9D5`) or its last
  ship (`0x1D44C`). Docking does not clear it: a docked fleet keeps the bit
  alongside its docked bits `0x30`.
- **Item flag `0x10`** at `+0x15` is the equipped flag: Equip sets it
  (`MAIN.EXE 0x2F4D5`) and unequipping clears it (`0x2F3D7`, `0x2F43D`).
- **Sailor byte `+0x13`** holds the generic-portrait bits `0xC0`. Writing
  Ezequiel's portrait as a word zeroes them, so sailor 60 is afterwards
  treated as a named character, whose record is never recycled.
- **Variable 24** is 0 in a new game (all 64 protagonist variables are zero
  in the new-game data), and `MAIN.EXE` writes only variables 60 and 63.
- **31st-of-month dates.** The 30-day date code gives the 31st the same value
  as the 1st of the next month, so an invitation on the 31st counts as the 1st
  and falls due on the 1st of the month after next.

## Open questions

None remain; the last ones are answered in [Engine notes](#engine-notes).
