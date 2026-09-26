# Scenario 1: João Franco

Scenario 1 (`SNR1`) is João's character story. It begins with a comparatively
free-form departure from Lisbon, then advances through five Adventure Fame
milestones. Each milestone opens another chain of building, voyage-day, or
battle events; reaching a later Fame value does not skip the active chain.

This document describes the scenario from the player's point of view. It is
based on the decoded `SNR1.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine.

Evidence labels have the meanings defined in [the scenario README](./README.md).

## Story and threshold map

| Section | Adventure Fame gate | Player-visible story                                             |
| ------: | ------------------: | ---------------------------------------------------------------- |
|       0 |                   — | Prepare in Lisbon, depart, and meet the stowaway Domingo         |
|       1 |               2,000 | Rescue Domingo/Prince Alberto and clear Duke Franco at his trial |
|       2 |               8,000 | Catalina's pursuit, the search for Lucia, and finding Sapha      |
|       3 |              16,000 | Massawa, Poseidon's Staff, and the Turkish invasion              |
|       4 |              30,000 | Take Enrico to Nagasaki                                          |
|       5 |              40,000 | Enrico's letter, Lucia, Neo-Atlantis, and the finale             |

The thresholds compare **Adventure Fame**, not total Fame: every check reads
the word at `+0x04` of João's 14-byte Fame record (record group `01`, index
0), which is Adventure Fame.

The gate is only one part of each trigger:

- 2,000 is tested when João visits a **Harbor** in any regular port.
- 8,000 is tested by the wildcard route, which any ordinary building in a
  regular port reaches unless a more specific route exists.
- 16,000 is first tested on **voyage day 5**, then again on a later building
  visit which reaches the regular-port wildcard route.
- 30,000 is tested on entering a **Pub outside Lisbon** whose port ID is at
  most 93.
- 40,000 is tested on a building visit which reaches the regular-port wildcard
  route.

Every one of these checks first reads João's sailor-record byte `+0x29`, masks
it with `0x0F`, and stops unless the result is 0 (for example
`SNR1.DAT 0x09CA–0x09D9`). The low three bits of that byte are the
protagonist's current nation, and Portugal is nation 0
([Friendship](../friendship.md#when-the-command-is-available)). **The story
therefore cannot advance past any Fame gate while João is affiliated with a
nation other than Portugal.** (Decoded.)

Scenario services which are not mentioned below retain their ordinary game
behavior. The tables describe the extra story behavior layered onto them. A
route that ends with the VM's forced-exit operation (`F8`) ejects João from the
building; one that ends without it leaves the building's ordinary menu
available after the dialogue.

## Section 0: leaving Lisbon

The opening is not a single forced corridor. One-shot flags allow João to visit
several Lisbon buildings in different orders, although the dialogue continually
points toward the intended sequence.

### Departure preparation

1. Visit the **Franco home**. Duke Leon permits João to sail, orders him to
   investigate Atlantis, and puts Rocco in charge of his education. The
   briefing creates the ship being built for João as a pending ship (`F9 05`
   at `0x0280`), adds Rocco (sailor `0x45`) to the mate roster (`FB 45` at
   `0x02C2`), and sets flag 0. João is then ejected.
2. Visit the **Pub after Duke Leon's briefing**. A single post-briefing visit is
   sufficient: it supplies 1,000 gold pieces, has Lucia arrange a secret
   meeting with João's mother, and sets flag 5. The same scene sets the favor
   of Pub-attendant records 0 and 1 (Carlotta and Lucia) to 100
   (`0x041F–0x042C`; see [Waitresses](../waitresses.md)). Visiting the Pub
   before the briefing only plays the earlier Carlotta/Lucia introduction and
   is optional.
3. Visit the **Franco home from 22:00 until midnight**. Duchess Christiana gives
   João her aquamarine tiara to sell, and flag 1 is set. The scene reads the
   20-minute game clock (`0F 01 07` at `0x007A`) and skips itself when the
   value is below 66 ticks (22:00); the clock's reset at midnight ends the
   window. The tiara (raw item `0x34`, “Aqua Tiara”) is written directly into
   the first of João's twenty inventory slots (`0x011B–0x0120`) without testing
   that slot.[^fixed-slots] The Harbor does not directly require this flag and the tiara
   need not be sold. The scene is nevertheless indirectly necessary: until it
   occurs, the Pub ejects João instead of offering its ordinary services,
   including crew recruitment.
4. Visit the **Church** to meet and recruit Brother Enrico. Father Felippe asks
   João to take him to Zipangu. The scene adds Enrico (sailor `0x46`) to the
   roster and sets flag 2. This is strictly required: without Enrico, the
   Harbor says that Father Felippe was looking for João and ejects him before
   he can use the Harbor menu.
5. Visit the **Shipyard** to receive the newly built _Hermes II_. `FA` at
   `0x0603` commissions the pending ship under the name in message 139 and
   sets flag 3.
6. Recruit enough sailors at the **Pub** to put a crew aboard the _Hermes II_.
   This is an ordinary engine requirement, not a João-scenario flag:
   **Sail** refuses to depart while any ship has no navigation crew
   ([Buildings: Sail](../buildings.md#sail)).
7. Visit the **Harbor**. Its checks do not all behave alike. Without a ship,
   Rocco says, “We can't sail the seas without a ship, now can we? Let's go to
   the shipyard.” The route does not eject João, so the Harbor menu opens, but
   the Harbor's entry code disables **Sail** and **Supply** when the fleet has
   no active ship slot (`MAIN.EXE 0x2E7F1–0x2E7FA`, which calls the
   active-ship count at `0x180CA`). Without Enrico, the Father Felippe reminder
   instead ejects João from the building before he can use the menu. After the
   missing-money reminder (the tiara scene has not occurred), João remains in
   the Harbor and can still attempt to depart, subject to the normal Sail
   checks. Once all checklist flags are set, the full tutorial plays: Rocco
   explains sailing costs and Enrico explains Lisbon/Seville trade.
8. In the tutorial, Rocco suggests making Enrico the bookkeeper (a Yes/No
   prompt). **Yes** sets Enrico's duty byte to 4 (Bookkeeper) and, unless
   Rocco already has duty 3, makes Rocco First Mate (`0x0747–0x076A`). **No**
   leaves the duties unchanged. Either answer sets flag 10, and the tutorial
   does not replay; neither answer blocks progression.
9. Set sail. The first midnight at sea (voyage day 1) advances the opening
   subsection. On voyage day 3, Rocco discovers the stowaway who calls himself
   Domingo; Domingo (sailor `0x47`) joins the roster (`FB 47` at `0x0937`), and
   the scene advances the scenario to section 1.

### Lisbon building behavior during preparation

| Building                                 | Story behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Franco home                              | Starts Duke Leon's briefing. Afterward, Marco refuses entry until the Pub money scene has occurred, and again outside 22:00–midnight. The 22:00–midnight visit after the money scene gives the tiara; later visits play Marco's goodbye. Every visit ejects João.                                                                                                                                                                                                                                                                                       |
| Pub                                      | Before the briefing, the first visit plays the full Carlotta/Lucia introduction and ends with Carlotta relaying that Rocco came looking for João because the Duke was calling; subsequent pre-briefing visits use only Carlotta's shorter reminder to go home. After the briefing, one visit supplies the money and has Lucia arrange the night meeting. Until that meeting occurs, later visits eject João with the 22:00–midnight reminder; afterward the Pub is ordinary.                                                                            |
| Palace                                   | Before the briefing, the attendant says Duke Leon was looking for João. After the briefing, João is refused entry because the Duke has ordered everyone to treat him as a commoner. Both eject him.                                                                                                                                                                                                                                                                                                                                                     |
| Church                                   | Before the briefing, the first visit has Father Felippe wonder whether anyone in the household could take a trip and mention that Rocco was looking for João (flag 7); later pre-briefing visits only ask whether João is going home. After the briefing, Felippe introduces Enrico; the opening lines differ slightly depending on flag 7. The next visit offers gold through a forced **Accept**/**Donate**/**Refuse** menu (see below).                                                                                                              |
| Shipyard                                 | Before the briefing, the shipwright mentions the vessel being built for Duke Leon and that Rocco was looking for João. After the briefing, the main scene supplies the Latin-rigged _Hermes II_. Once it is collected, the Shipyard is ordinary.                                                                                                                                                                                                                                                                                                        |
| Harbor                                   | Before the briefing, the harbor master recommends Carlotta's Pub without ejecting João. Afterward it acts as the preparation checklist described above.                                                                                                                                                                                                                                                                                                                                                                                                 |
| Market                                   | Before the briefing, the trader says Rocco was looking for João and gives rock-salt and Lisbon/Seville trade advice. After the briefing but before the ship is collected, he points out that João has nowhere to store goods. Both eject João; once the ship exists the Market is ordinary.                                                                                                                                                                                                                                                             |
| Item Shop                                | Before the briefing, the shopkeeper says Rocco was looking for João and ejects him. Afterward, Marco's prepaid rapier (raw item `0x03`) is written directly into the second inventory slot on the first visit (`0x0816–0x0821`, flag 9). Every later visit repeats the reminder to equip it. No other route tests flag 9.                                                                                                                                                                                                                               |
| Guild, Bank, Lodge, and House of Fortune | These buildings have no specific opening route, so all use the Lisbon wildcard route. On each visit before the briefing, `EB 00 0003` selects one of three runs: a greeting followed by the news that Rocco was looking for João; advice to visit Carlotta's Pub; or the generic “Are you avoiding something?” exchange. After the briefing, it selects one of three other runs: João asking to be treated like a regular sailor; encouragement about finding Atlantis; or a remark that João will be leaving soon. None advances the opening sequence. |

The Church's gold offer (`C9` at `0x04A3`, menu text message 104) sets flag 8
whatever the answer:

| Choice     | Result                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| **Accept** | João receives 1,000 gold.                                                                              |
| **Donate** | João declines and asks Felippe to help people with it. João's Luck (`+0x1B`) is set to 100 (`0x04D8`). |
| **Refuse** | João declines. Nothing else changes.                                                                   |

Flag 8 also selects which of two missing-money reminders the Harbor uses.

The three-way wildcard selection is deterministic for the current saved state,
not a fresh unpredictable roll. Before every protagonist-scenario dispatch,
`MAIN.EXE 0x3914A` rebuilds the scenario RNG seed from the saved year, month,
and day, the protagonist's Navigation level plus Navigation experience, and
the time of day; the shared `SNR0` seed omits the time of day
(see the `EB` notes in the
[VM reference](../../dialog-system/scripts/REVERSE_ENGINEERING.md#general-message-bank-lookup)).
Entering any of these four buildings at the same saved date, time, and
Navigation state therefore selects the same run.

## Section 1: Alberto and Duke Franco (2,000 Fame)

### Stage sequence

| Stage             | Required action                                                                                                     | What changes                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arm the event     | With at least 2,000 Adventure Fame, visit any regular port's **Harbor**.                                            | Subsection 0 advances silently. Fame is latched; lowering it afterward does not cancel the event.                                                                   |
| Hear the rumor    | Enter a **Pub** in a port other than Lisbon, Seville, or Istanbul (port IDs 0–2) while the clock reads 04:20–17:00. | Rocco reports Prince Alberto's disappearance, notices Domingo is missing, and suggests the Lodge. Flag 0 is set and João is ejected.                                |
| Look for Domingo  | Optionally visit a **Lodge**, then visit a **Shipyard** in any regular port.                                        | The Lodge clue sets flag 8 but is not required. The Shipyard confrontation, duel, and Catalina's intervention set flag 1 and clear flag 0.                          |
| Learn the truth   | Visit a **Harbor** in any regular port.                                                                             | Rocco identifies Catalina; Domingo reveals that he is Prince Alberto and explains the plot against Duke Franco. The story advances to the Lisbon-return subsection. |
| Rescue the Duke   | Return to Lisbon, visit the **Franco home**, then the **Palace**.                                                   | The home visit normally includes another pirate duel and sets flag 5. The Palace trial clears Duke Franco and sets flag 2.                                          |
| Close the episode | Return to the **Franco home**, then visit the **Harbor** and go to sea.                                             | Duke Leon asks whether João will quit sailing; either answer continues the story. Alberto leaves at the Harbor. Voyage day 1 advances to section 2.                 |

The Pub's time test accepts ticks 13 through 51 (`0x0A92–0x0A9A`), or
04:20–17:00. The Pub itself opens only from 08:00
([Opening hours](../buildings.md#opening-hours-implementation)), so the
effective window is 08:00–17:00. In Lisbon, Seville, and Istanbul the Pub
remains ordinary.

### Buildings while the event is forced

- Between the rumor and the Shipyard confrontation, the **Lodge** gives the
  direct clue (messages 270–271, flag 8); a repeat visit repeats the clue.
  Other ordinary buildings ask, “Are you sure he said Domingo was at the
  lodge?” until the clue is heard, and afterward say, “We'd better get to the
  shipyard... and fast!” Both eject João. A **Harbor** visit at this point
  plays a stranger's rumor that Duke Franco plotted the Prince's kidnapping,
  and also ejects him. The Pub says only that the party is staying longer, or
  that it must hurry to the Shipyard once the clue is known.
- The Shipyard duel is against sailor 60 (Antonio Khan). Its result is read
  but does not matter: a balance of at least 100 selects João's confident
  line, a lower balance the pirate's taunt, and in both cases Catalina
  intervenes and the navy guard ends the scene.
- The first post-Shipyard **Harbor** visit is the important one; it contains
  Alberto's revelation and leaves the Harbor usable. Trying other buildings
  instead produces warnings to leave: the Pub, Shipyard, and other buildings
  eject João, while the Lodge warns without ejecting.
- On returning to Lisbon, unrelated buildings report that the Duke has been
  arrested and urge João to leave (ejecting him) until the home scene has
  played. Afterward they point to the **Palace** (“Alright then, your majesty,
  let's go to the Palace.”) and, after the trial, back to the home (“Cap'n,
  the Duke awaits you at his home.”), without ejecting João. After the trial
  the Palace also sends João home. Before the home scene, the
  Palace turns João away because it is the day of the trial; the Harbor asks
  about getting the Prince to the Palace. The Palace cannot clear the
  accusation until the home scene is complete.
- After the trial, the **Franco home** gives the message 310 Yes/No choice.
  The two answers change João's words, but both send him back to sea to seek
  Atlantis, and both add 1,000 Piracy Fame and 1,000 Adventure Fame, each
  capped at 50,000 (`0x0F19–0x0F4B`). Only **No** (João will not quit) leads
  Duke Leon to offer a rare sword: the script scans the twenty inventory slots
  and writes raw item `0x0C` (Flamberge) into the first empty one
  (`0x0E97–0x0EC6`). If João already carries a Flamberge, or no slot is empty,
  the sword line is skipped.
- If Alberto is still captain of one of João's ships, he mentions it at the
  home, and at the **Harbor** he refuses to leave, ejecting João, until João
  appoints a replacement or sells that ship.
- Once the departure stage is set, non-Harbor buildings show Alberto's “Let me
  walk you to the port” reminder without ejecting João. The **Harbor** plays
  his farewell, removes him from the mate roster, parks his record (fleet and
  location bytes `0xFE`), and sets flag 4, which the voyage-day-1 handoff
  requires. Afterward the Lisbon Palace has Alberto greet João and remind him
  to visit.

### The Franco-home duel

The home scene checks sailor 60's byte `+0x29` for bit `0x20`
(`0x0FC7–0x0FD6`). When the bit is clear, the pirates do not appear and the
scene goes straight to Alberto's “To the Palace!” line. When it is set (it is
set in the untouched `KOUKAI2.DAT`), the pirates attack and `E8 3C` starts a
duel against sailor 60. The script reads the resulting balance (100 is even;
higher favors João):

| Balance after the duel | Result                                                                                                                                                                              |
| ---------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                   ≤ 40 | The pirate turns on Alberto and Rocco strikes him from behind. The story continues.                                                                                                 |
|                  ≥ 160 | The pirate falls. João's Battle Level byte `+0x1D` is increased by 1, capped at 100 (`0x1071–0x1089`), and sailor 60's fleet and location bytes are rewritten to `0x3C` and `0xFF`. |
|                 41–159 | “This fight's not finished yet”: the duel restarts at `0x0FFF`.                                                                                                                     |

The duel engine ends a fight at balance 0 or 200 but also stops after 20
exchanges (`MAIN.EXE 0x17E1C–0x17E5A`), so the middle row is reachable when
neither side has won by then. The scene then renames sailor `0x47` “Alberto”
(`+0x00`) and “Prince” (`+0x09`), sets his portrait selector `+0x12` to
`0x15`, and sets flag 5 (`0x10B6–0x10D8`).

### Side events at the Franco home

- During subsection 0 (before the 2,000-Fame Harbor visit), a home visit on
  the 1st through 4th of a month (zero-based day at most 3) has Marco deliver
  1,000 gold pieces from João's mother and sets flag 6 (`0x0979–0x09B3`). The
  voyage-day-3 route clears flag 6 (`0x09C6`), so one gift is available per
  qualifying month after each voyage that reaches its third midnight. Visits on
  other days are refused.
- In section 2, subsection 0, voyage day 3 sets flag 6 and the next home visit
  plays a welcome-home scene with Marco, Duke Leon, and the Duchess, then clears
  it. Otherwise the Duchess only wishes João luck.

## Section 2: Catalina, Lucia, and Sapha (8,000 Fame)

### Catalina's pursuit

1. With at least 8,000 Adventure Fame, enter an ordinary building in any
   regular port (the Lisbon home has its own route). This silently advances
   subsection 0 to 1. If the triggering building is a Pub, another Pub visit
   is needed for the next scene.
2. Enter any **Pub**. A patron warns João that Catalina is searching for him,
   the scenario stores the Pub's port ID in variable 0, and flag 0 is set.
3. Enter an eligible building: any Pub, or any other building except the
   Harbor and Palace. Rocco's warning differs depending on whether João is
   still in the remembered port. The code then rolls `random(2)` (`EB 00 0002`
   at `0x1458` in the Pub, `0x156D` elsewhere); Catalina appears on zero, a 50%
   chance, and flag 1 is set and João is ejected. On a nonzero roll the
   building is ordinary. The Harbor keeps its ordinary behavior at this stage.
4. Visit a **Harbor**. Rocco returns after restraining Catalina; flags 0 and 1
   are cleared and flag 2 is set. Voyage day 1 clears flag 2 and advances the
   subsection.
5. The Pub/building/Harbor/voyage-day-1 cycle occurs a second time with
   variant dialogue (subsection 2).
6. In subsection 3, a **Harbor** visit in any regular port features a sailor
   admiring Catalina and prepares her fleet (see below). The next battle whose
   opposing captain is Catalina (sailor 1) invokes the scenario's before- and
   after-battle routes.[^catalina-fleet]
7. The after-battle route runs after any ending except João's defeat, which
   ends the game as in any battle. If Catalina no longer commands a fleet
   (her fleet byte is `0xFF`), she vows revenge for the insult and the script
   restores both links: her fleet byte becomes `0x0A` again and fleet 10's
   captain byte `+0x2A` becomes 1. Otherwise she promises to turn João into
   mincemeat next time. In both cases the script sets bit `0x20` in her byte
   `+0x29`, clears fleet 10's flags byte (making it inactive), sets her
   location byte `+0x25` to `0xFF`, and advances the story (`0x1864–0x18CB`).

The opening Pub warning has no special time test and does not exclude Lisbon,
Seville, or Istanbul; only normal Pub hours apply. Catalina's 50% roll is made
on an eligible building visit, not necessarily another Pub visit. Like the
Section 0 wildcard runs, the roll is deterministic for a given saved date,
time, and Navigation state.

The Harbor setup at `0x17E1–0x1814` copies João's current X and Y into fleet
10, sets its objective to 7 (pursue) with João (sailor 0) as the target,
writes flags `0x41`, and invokes `D1`. Catalina's fleet therefore starts at
João's exact position and pursues him once he sails. Because objective 7 is
aimed at the protagonist, using **Gossip** on her fleet starts the battle at
any hour ([Nightfall](../naval-battle.md#nightfall)).

[^catalina-fleet]:
    Catalina's ten La Reales are not created by this scenario
    event. In the untouched `raw/KOUKAI2.DAT`, Catalina points to fleet ID
    `0x0A`. Its fleet record begins at absolute file offset `0x23A9`, its ten
    ship slots begin at `0x23D4`, and every slot initially contains the empty
    pattern `FF 00 FF FF FF FF FF FF 00`. The cached fleet-strength byte at
    record offset `+0x28` and the fleet-flags byte at `+0x29` are also both
    zero.

    The ships accumulate through a monthly `MAIN.EXE` maintenance path rather
    than through `SNR1.DAT`. At a month boundary the calendar loop calls
    `0x1B305 -> 0x1E16D`. That routine runs the monthly dispatcher at
    `0x1DC53` and then the maintenance group at `0x1E15C`; the latter calls the
    other-captain fleet refill routine at `0x1DE71`. The refill routine walks
    all 120 sailor records, skips the active protagonist (`0x1DEAB-0x1DEB4`),
    and therefore processes sailor ID 1, Catalina, while João is the player.
    Catalina's sailor record supplies fleet ID `0x0A`, which is resolved at
    `0x1DEF5-0x1DEFD`.

    `0x1D40F` first recalculates fleet strength as
    `(sum of current durability for active ship slots + 4) / 5`. At
    `0x1DF06-0x1DF20`, a weaker target fleet is refilled unconditionally; if
    Catalina's fleet is not weaker than João's, it is refilled only when
    `random(3)` is nonzero, giving a two-in-three chance for that month. The
    routine selects Catalina's protagonist-fleet class 1 at
    `0x1DF23-0x1DF5C`, finds the first inactive ship slot (or, when all ten are
    active, an existing slot selected by the replacement scan) at
    `0x1DF5F-0x1DFB8`, and writes one ship template at
    `0x1DFBB-0x1DFD6`. Thus a maintenance pass adds or replaces only one ship;
    it never creates ten ships in one operation.

    The packed protagonist-fleet template table begins at `MAIN.EXE` file
    offset `0x463F6` and contains `05 BC 15 02`. For Catalina's class-1 entry,
    the routine derives a band index by dividing byte `+0x0D` of the active
    protagonist's 14-byte Fame/Friendship record by 5, then uses four times
    that index as a nibble shift. This final record byte is the protagonist's
    stored rank (No Rank 0 through Duke 9), so ranks 0–4 select index 0 and
    ranks 5–9 select index 1. In the lower band (index 0), Catalina's `BC`
    entry supplies low nibble `C`. Adding the routine's base instance ID
    `0x31` selects ship-instance template `0x3D`. That template begins at
    `KOUKAI2.DAT` offset `0x4E4B`; its raw ship type at template offset `+0x11`
    is `0x15`, the zero-based form of display ship ID 22, **La Reale**.
    `0x1D3AE` copies the template's model values into the fleet slot,
    initializes its crew and condition, and marks the slot active. Repeated
    month-boundary passes can consequently grow Catalina's fleet from zero to
    ten La Reales before the story encounter.

    The Harbor setup in `SNR1.DAT` at `0x17E1-0x1814` only copies João's
    position into fleet `0x0A`, sets Catalina's objective to 7 with João as its
    target, writes active flags `0x41`, and invokes the navigation action `D1`.
    It never touches the ship slots. The encounter therefore uses whatever the
    monthly routine has already placed there. A save that reaches 8,000
    Adventure Fame after many month boundaries can give Catalina ten La Reales;
    one that reaches the event before a relevant monthly pass (for example,
    after Fame has been edited) can launch the same encounter with an empty or
    only partially filled fleet. A fleet emptied after maintenance likewise
    remains so until another month-boundary refill.

### Finding Sapha

| Stage                  | Building or event                                           | Result                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| News of Lucia          | Enter any **Pub** outside Lisbon after the Catalina battle. | Ali and Salim report that Lucia has disappeared. Ali asks João to look for his sister Sapha. Lucia's Pub-attendant record loses flag `0x08` (`0x1A35–0x1A44`), which grays out Lisbon's **Waitress** command ([Waitresses](../waitresses.md)).               |
| Confirm the kidnapping | Visit the **Lisbon Pub**.                                   | Carlotta says Catalina's was the only ship to leave when Lucia vanished.                                                                                                                                                                                     |
| Ask about Sapha        | Optionally ask at **Pubs** outside Lisbon.                  | The patron is asked about Catalina and Sapha. Pubs whose port ID ends in 1 or 6 (`port mod 5 = 1`: Seville, Valencia, Syracuse, Athens, …) give the clue that Sapha works in a desolate Middle Eastern port, and set flag 0; others have never heard of her. |
| Narrow the search      | After the clue, ask at **Pubs** with port IDs 72–80.        | Those Middle Eastern Pubs say no one of that name is there. Pubs elsewhere become ordinary.                                                                                                                                                                  |
| Meet Sapha             | Enter the **Basra Pub** (port 76).                          | João learns that Sapha is an orphan but cannot persuade her to leave. Basra's Pub plays this scene with or without the clue.                                                                                                                                 |
| Report to Ali          | Go to Istanbul and visit the **Lodge**.                     | João tells Ali where Sapha is. Ali leaves to meet her, and the scenario advances to section 3. The Istanbul **Pub** (Salim points to the Lodge) and other Istanbul buildings are optional.                                                                   |

Lisbon's home and Pub supply stage-appropriate reminders throughout the
search. They do not replace the Basra and Istanbul interactions.

## Section 3: Massawa and Poseidon's Staff (16,000 Fame)

This is the longest section in the scenario. Its main path is **decoded**.
Throughout it, the Lisbon home and Pub give stage-appropriate reminders about
Lucia and Pietro.

### From Ali's clue to Pietro's search

| Stage             | Required building/event                                                                                  | Result                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Arm the milestone | Reach 16,000 Adventure Fame and remain at sea until **voyage day 5**.                                    | The first 16,000 comparison advances the subsection.                                                                                 |
| Meet Ali          | Enter a later port building which reaches the wildcard route while still meeting the 16,000 requirement. | The second comparison starts Ali's scene. He directs João to Massawa for information about Atlantis.                                 |
| Ask in Massawa    | Visit the **Mosque** in Massawa (port 74). The Massawa **Pub** is optional.                              | The Pub scene suggests asking a scholar at the mosque but does not advance. The imam directs João to the building southwest of town. |
| Meet Taphali      | Visit Massawa's **special building**.                                                                    | Lord Taphali explains the Atlantean refugees, the Turkish threat, and Poseidon's Staff.                                              |
| Decide on Pietro  | Enter any **Massawa building**.                                                                          | Enrico and Rocco suggest Pietro Conti; João decides to return to Lisbon.                                                             |
| Hire Pietro       | Visit the **Franco home**.                                                                               | Duchess Christiana summons Pietro, who agrees to find the Staff and deliver it in Massawa.                                           |

### Delay, invasion, and battle stages

After Pietro accepts, Massawa and Lisbon gain repeated progress dialogue:

- The **Franco home** says Pietro sends no reports while searching.
- The **Lisbon Pub** continues the Lucia reminders.
- Massawa's **special building** always plays Taphali asking whether João has
  found the Staff and Meconbe warning that the Turks are getting closer, then
  ejects João.
- Other **Massawa buildings** play Rocco's “I wonder if he's found Poseidon's
  Staff yet?” and João's “All we can do is wait, I'm afraid.” without ejecting
  him (with one exception described below).

The first Massawa visit after Pietro accepts initializes the waiting state,
whichever building it is: it sets flag 0 and saves a target month of
`current year * 12 + current month + 1` in variable 0 (`0x2452–0x2468` in the
special building, `0x2487–0x249D` elsewhere). A later visit to the special
building advances the story only when both of these are true
(`0x246B–0x2484`):

- the current combined year/month is at least the saved target month; and
- the internal zero-based day is at least `10`, meaning the displayed date is
  the **11th or later**.

The earliest possible progression is therefore the **11th of the following
calendar month**. This is not a wait of one month plus ten days. The combined
year/month calculation also handles a December-to-January rollover without a
special case: December's saved target and the following January both evaluate
to `(year + 1) * 12`.

The other-building route contains a parallel check that behaves differently.
It computes the current year/month into variable 2 but compares variable 1
with the target (`0x24A0–0x24D0`). Variable 1 is left over from earlier code:
after a special-building visit it holds that visit's year/month; after a
wildcard initialization it holds the day number stored then. Consequently:

- an other-building visit advances the story only if the most recent
  special-building visit was already in or after the target month and the
  current day is at least 10;
- the initializing other-building visit plays no dialogue, because variable 1
  then equals the current day; later visits skip the dialogue on any day whose
  number equals the stored one.

The special building is therefore the route that reliably completes the wait.
The gate-passing visit still plays the usual “have you found the Staff?”
exchange and advances silently.

When that calendar gate has passed, the remaining route is:

1. Return to Massawa's **special building**. Taphali and Meconbe believe the
   Staff will arrive too late; João commits his fleet to delaying the Turkish
   navy. This scene sets up the Turkish pursuers (below).
2. In ordinary ports with IDs 72–80 (Aden through Muscat, including Massawa's
   other buildings), building visits report that the Turks have moved against
   Massawa. This is reminder dialogue and does not eject João.
3. Visit the **Massawa Harbor**. Catalina appears, admits her part in Lucia's
   kidnapping, and postpones her duel with João while he fights the Turks. A
   battle with a Turkish fleet before this Harbor scene does not count.
4. Fight two battles whose main opposing fleet is one of the five Turkish
   pursuers. The first before-battle hook begins the defense; the second has
   Catalina arrive to help. The after-battle hook following the second
   encounter releases the pursuit and advances again. As in any battle, a
   defeat (outcome 5 or 7) ends the game; any other ending, including either
   side fleeing or nightfall, counts, because the before-battle hooks advance
   the story before the fight and the after-battle hook runs after every
   non-defeat ending.
5. Return to Massawa. The **special building** can report that the defenders
   are still holding, but that visit is not a prerequisite. Entering any other
   Massawa building, including the **Harbor**, triggers Pietro's arrival with
   Poseidon's Staff directly. Buildings in other ports say the fleet is dealt
   with and João should report at the palace.
6. Take the Staff to Massawa's **special building**. Taphali rewards João with
   an ancient Atlantean crown and João gains 5,000 Adventure Fame (capped at
   50,000, `0x2B40–0x2B5E`).
7. Visit the **Massawa Harbor**. Catalina states the evidence behind her grudge;
   Pietro and João show that the Franco family could not have destroyed her
   brother's fleet. The scenario advances to section 4.

The invasion does not create special fleets. At `SNR1.DAT 0x258A–0x25DF`, the
special-building scene that begins João's defense loops over all 120 sailor
records and selects those whose fleet byte is `25` through `29`: Turkey's two
Convoys and three Voyaging Fleets. It moves each fleet to the fixed point
`(458, 548)`, eight map units south of Aden's port coordinate `(458, 540)`,
assigns objective `7` (pursue), sets the objective argument to sailor `0`
(João), replaces the flags with `0x41` (active plus the special `0x40`
state), and invokes `D1`. The four Turkish Merchant Fleets, IDs `21`–`24`, are
not included.

The setup does **not** rebuild ship slots or restore their current durability.
Prior destruction therefore does not prevent the invasion routes from
appearing, but it produces active empty fleets rather than regenerated Turkish
ships. A fleet whose captain no longer carries its fleet ID is not selected.

The five pursuers are:

| Fleet ID | Class          | Captain        |
| -------: | -------------- | -------------- |
|       25 | Convoy         | Rashid Jabbar  |
|       26 | Convoy         | Walid Kemal    |
|       27 | Voyaging Fleet | Afmed Muhiddin |
|       28 | Voyaging Fleet | Sallah Iskal   |
|       29 | Voyaging Fleet | Siddarth Kebin |

Both before-battle routes use wildcard selector `0xA1FF`, but internal checks
at `0x2776–0x2787` and `0x27FF–0x2810` read the fleet byte of the opposing
captain (variable 60) and reject the battle unless it is from `25` through
`29`. An unrelated battle therefore cannot advance either subsection. The
scenario does not require two particular captains; whichever qualifying
fleets João meets supply the two battles, and nothing prevents the same fleet
from supplying both.

Because the five fleets start at one point and all pursue João, a battle with
one of them can draw others in. The battle setup adds nearby military fleets
(fleet IDs ending in 5–9) from the same ten-ID national block as a main
participant as assisting fleets (`MAIN.EXE 0x162CA–0x163DC`, which uses the
nearby-fleet list built at `0x1843A`). Fleets 25–29 all qualify as assisting
enemies (role `0x40`) of one another. A duel against an assisting commodore
only empties that ship's crew and does not end the battle
([How a battle ends](../naval-battle.md#how-a-battle-ends)).

Catalina's help is dialogue only. The second before-battle block
(`0x27FF–0x286F`) writes no fleet record, and her fleet 10 was left inactive
at the end of section 2. Fleet 10's ID ends in 0, so it can never be chosen as
an assisting fleet. (Decoded for the script; the engine side is the rule
above.)

After the second qualifying battle, `0x2879–0x28B9` loops over the same five
fleets and writes objective `0`, argument `2` (Istanbul), and flags `0x01`: all
five remain active but are released from special pursuit and sent home.

Pietro's handoff scans João's twenty inventory slots in order. An unused slot
contains `0xFF`; when the scan finds one, it writes raw item ID `0x62`
(Poseidon's Staff) into that slot. If all twenty slots are occupied, the scan
runs off the end with the twentieth slot's former item ID still selected. The
game uses that ID for `$r03` in “the Staff for the ...” dialogue and overwrites
the **twentieth inventory slot** with `0x62`. Equipped items are not
protected. No choice prompt, item-value test, or special-item protection is
involved.

Taphali's reward scans the inventory for `0x62` and replaces the first match
with raw item `0x2C`, the Royal Crown (`0x2B0C–0x2B32`). The scene does not
test for the Staff beforehand: if João no longer carries it, the dialogue,
Fame award, and advance still happen, but no crown is given. The same scene
also copies message 900, “Massawa”, into port 74's name field
(`0x2B35–0x2B3D`, record group `0C`, field `+0x04`).

While João carries the Staff (after Pietro's arrival and before Taphali's
reward), **every** Lisbon home visit has Marco hand over 10,000 gold pieces
(`0x29FF–0x2A1E`). The route has no flag, so the gift repeats on each visit.

## Section 4: taking Enrico to Nagasaki (30,000 Fame)

This short section is mostly a travel handoff.

1. At 30,000 Adventure Fame, enter a **Pub outside Lisbon** in a port with ID
   at most 93 (`0x2CA6`); the Pubs of Zeiton, Macao, Hanoi, Changan, Sakai, and
   Nagasaki (IDs 94–99) do not trigger it. Enrico says it is time to fulfill
   his mission in Zipangu and asks to be taken to Nagasaki.[^japanese-ports]
   This advances the subsection. Lisbon's own Pub route takes precedence and
   only plays the standing Lucia reminder.
2. Lisbon's **Franco home**, **Palace**, and **Pub** contain optional,
   repeatable farewell scenes for Marco, Prince Alberto, and Carlotta.
3. In Nagasaki, ordinary buildings play an arrival conversation. Visit the
   **Harbor** to complete Enrico's departure.
4. If Enrico is captain of a ship, he first asks João to replace him or sell
   the ship, and João is ejected. Once this is resolved, the Harbor farewell
   removes Enrico from the mate roster, parks his record (fleet and location
   bytes `0xFE`), adds 1,000 Adventure Fame (capped at 50,000), and advances
   the scenario to section 5 (`0x2E08–0x2EAD`).

The Fame check is attached to the generic Pub route, so reaching 30,000 at sea,
in another building, or in the Lisbon Pub does not by itself begin Enrico's
request.

[^japanese-ports]:
    Sakai and Nagasaki are port IDs `0x62` and `0x63`. Their
    saved 20-byte port records use byte `+0x13` as a packed field: the low
    three bits are the cached controlling nation, `0x10` means known, `0x20`
    means hidden from the lookout, and `0x40` means visited
    ([Ports](../ports.md#known-and-visited-ports)). The untouched
    `KOUKAI2.DAT` template gives both ports the value `0x06`: nation 6, not
    known, and not hidden. Enrico's Section-0 recruitment route at
    `SNR1.DAT 0x05A7–0x05C3` reads field `+0x13` through record group `0C`,
    ORs it with `0x20`, and writes it back for both ports: `0x06 | 0x20 = 0x26`.
    João cannot leave Lisbon without Enrico, so from his first departure both
    ports are hidden from the lookout.

    The port-sighting loop in `MAIN.EXE 0x36BE4–0x36C4B` scans all 130 port
    records. At `0x36BF3` it skips a record when `(status & 0x30) != 0`,
    covering both hidden (`0x20`) and already known (`0x10`) ports. After a
    port passes the proximity checks, `0x36C41` records the sighting with
    `status |= 0x10`, and the normal discovery handler then awards the
    region-based Adventure Fame. A hidden port can therefore not be sighted at
    sea; it becomes known only by entering it (`0x20F9D` sets `0x50`).

    The 30,000-Fame Pub scene reverses the hiding at
    `SNR1.DAT 0x2D36–0x2D52`. For each port it performs `status &= 0xD0`;
    normally, `0x26 & 0xD0 = 0x00`. This clears the hidden bit but does
    **not** set the known bit, so the event makes Sakai and Nagasaki sightable
    rather than discovering them for João. The mask is broader than a pure
    `0x20` clear: it also clears the low four bits, which changes the cached
    controlling nation from 6 to 0 until the executable's daily allegiance
    update rewrites it from Support
    ([Sphere of Influence](../sphere-of-influence.md#cached-allegiance)). It
    preserves `0x10`, `0x40`, and `0x80`. The normal state sequence is
    therefore `0x06 → 0x26` when Enrico joins, `0x26 → 0x00` when his
    30,000-Fame request begins, and `→ 0x10` when João sights the port.

## Section 5: Neo-Atlantis (40,000 Fame)

### The letter and Sakai

| Stage                  | Building                                                                    | Result                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Arm the finale         | A port building which reaches the wildcard route at 40,000 Adventure Fame   | Silently advances to the letter stage. Lisbon's home and Pub have specific routes which take precedence.                        |
| Learn about the letter | Lisbon **home**, **Pub**, or another ordinary Lisbon building (optional)    | Marco or Carlotta points João to the Guild; the other Lisbon buildings say a letter awaits him.                                 |
| Read the letter        | Lisbon **Guild** (context 6)                                                | Enrico asks João to meet him in Sakai.                                                                                          |
| Find Enrico            | Sakai's **special building** (port 98). Other Sakai buildings are optional. | Other Sakai buildings direct João south of town. Enrico says Ernst found a man-made Atlantis on a large river in the New World. |

After the letter is read, a Lisbon home visit has Marco send his regards and
sets flag 5; if it is set when João meets Enrico, Enrico passes on Marco's
greeting, and the next home visit after Sakai relays Enrico's reply and clears
it. None of these visits is required.

### New World search and Lucia

The search route only accepts port IDs 42–56: the Caribbean, Central
American, and South American ports from Caracas through Cayenne.

1. Enter an ordinary **non-Pub building** in one of those ports
   (`0x336E–0x33E5`). The route rolls `random(10)`. On zero, if the clock reads
   04:20–17:00 (ticks 13–51), João sees people chase someone into the Pub and
   flag 0 is set. On zero outside that window nothing is said; on any other
   roll Rocco says, “I don't have any idea, so let's just take a look around.”
   The building is not closed in any case.
2. Enter that region's **Pub** after flag 0 is set; the route requires only a
   port ID from 42 through 56, not the same port. João finds Lucia threatened
   by Rudolph, fights a duel, and is helped by Catalina.[^rudolph-stats] The
   duel balance selects one of two lines but does not change the outcome. The
   scene advances the subsection.
3. Visit a **Harbor** in any regular port. Lucia explains Neo-Atlantis and
   Martinez's plan; Catalina reveals that Martinez killed her brother. The
   group decides to seek Commander Ezequiel's help and to leave the next
   morning.

The Pub has its own specific route, so while flag 0 is clear it does not also
perform the wildcard one-in-ten search roll. The useful search attempts are
other ordinary buildings in ports 42–56; once flag 0 is set they only say,
“Cap'n, this is no pub!” The roll is deterministic for a given saved date,
time, and Navigation state, so re-entering at the same moment repeats it.

[^rudolph-stats]:
    “Pirate Rudolph” has no separate sailor record. The scene
    repurposes sailor ID `0x3C` (60), normally Antonio Khan: it writes `0x3B`
    to the record's displayed-character/portrait selector at `+0x12`, loads the
    strings “Pirate” and “Rudolph” (messages 1053 and 1054, `D4 041C` and
    `D4 041D`), and copies them into the two nine-byte name fields at `+0x00`
    and `+0x09`. It then starts the duel with `E8 3C`. The scenario does not
    write the eight attributes at `+0x14..+0x1B` or the Navigation and Battle
    levels at `+0x1C..+0x1D`, so Rudolph inherits whatever values sailor 60
    currently has in the save. In an untouched `raw/KOUKAI2.DAT`, whose 42-byte
    sailor table begins at `0x06A9`, record 60 begins at `0x1081` and has
    Leadership 81, Seamanship 78, Knowledge 89, Intuition 73, Courage 68,
    Swordsmanship 80, Charm 70, Luck 51, Navigation level 7, Battle level 16,
    age 44, and no skills. Modified sailor-60 values therefore also carry into
    this duel. The name is never restored.

### Ezequiel, Martinez, and the ending

| Stage                         | Building or event                          | Result                                                                                                                                                           |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan the attack               | **Harbor**                                 | Lucia explains Neo-Atlantis, and the scenario mobilizes Catalina and five Spanish fleets around João. João is ejected.                                           |
| Wait for the departure window | **Harbor**                                 | The Harbor stays usable only on a different calendar date from 08:20 through 14:40. Otherwise Rocco or Catalina sends João to the Lodge and ejects him.          |
| Recruit Ezequiel              | Battle with one of the five Spanish fleets | Catalina surrenders; João explains Neo-Atlantis; Ezequiel joins the attack. The scene cancels the battle and reorganizes the pursuit groups.                     |
| Attack Neo-Atlantis           | Before-battle hooks against fleets 60–69   | Martinez taunts the allies. Ezequiel attacks the fortress and Catalina handles the other fleets while João targets Martinez. Later battles bring further taunts. |
| Win                           | After-battle hook                          | Martinez is defeated, Neo-Atlantis collapses, and João decides to return home.                                                                                   |
| End the scenario              | Lisbon **Franco home**                     | The route invokes the ending operation `F4 00`. Other Lisbon buildings and every Harbor have explicit no-op routes at this final subsection.                     |

The Harbor planning scene saves the current year, month, and day in variables
4, 3, and 2 (`0x35FF–0x3605`). A Harbor visit on that same date always
produces the “tomorrow is the big day” Lodge reminder. On any other date, the
Harbor still ejects João at or before 08:00 (tick 24) and at or after 15:00
(tick 45) (`0x3617–0x365D`). The usable departure window is therefore
**08:20–14:40**; the comparison is not a simple “wait until morning” flag.

At the end of the planning scene, the scenario finds Spain's two Convoys and
three Voyaging Fleets through the sailor records' fleet bytes and moves all
five to João's exact current position. It gives them pursuit objective `7`,
targeting sailor ID `0` (João), and flags `0x41`. Catalina's fleet, ID `10`
(`0x0A`), is also placed at João's position, reactivated with flags `0x41`,
and given objective `10` (follow), targeting João. The five Spanish fleets
are:[^finale-fleet-code]

| Fleet ID | Captain        | Normal role    |
| -------- | -------------- | -------------- |
| `15`     | Tonio Burciaga | Convoy         |
| `16`     | Hugo Montoya   | Convoy         |
| `17`     | Xavier Navarro | Voyaging Fleet |
| `18`     | Bernal Loyola  | Voyaging Fleet |
| `19`     | Hernan Chavez  | Voyaging Fleet |

The first battle whose main opposing fleet is any one of fleet IDs `15–19`
invokes the Ezequiel scene. The hook checks the opposing captain's fleet
byte, so it does not depend on which of the five captains reaches João
first, and it is active whether or not the Harbor departure window has been
used. The scene ends with `F8`, which in a before-battle hook cancels the
battle before it starts (outcome code 8, `MAIN.EXE 0x150F4–0x15105`; see
[Cancelled battles](../naval-battle.md#cancelled-battles)).

After Ezequiel joins, the scenario changes all five Spanish fleets from
objective `7` to objective `10`, still targeting João. Objective 10 follows
the target fleet, and its Gossip line is message 160, “I have some business
with you.” ([NPC fleet navigation](../npc/fleet-navigation.md)); this is the
generic captain response, not new scenario dialogue.

The same reconfiguration creates the force waiting near Neo-Atlantis. Pirate
Rudolph's fleet is fleet ID `60` (`0x3C`), because Rudolph is the renamed
sailor-60 record described above.[^rudolph-stats] It is placed at the fixed
position `(1922, 656)`, near the Amazon between Porto Velho and Cayenne, given
pursuit objective `7`, and made to target João. The scenario places all nine
regular pirate fleets, IDs `61–69`, at precisely the same position with the
same objective. Rudolph therefore does not spawn alone: he is the first fleet
in a ten-fleet pirate block concentrated at one point.[^finale-fleet-code]
Each fleet's course is recomputed with `D1` after the write, so pursuit
starts toward João's position at that moment.

This is the same broad mechanism as the Turkish pursuit at Massawa: the
scenario repurposes existing fleet records and changes their position,
objective, target, and active flags. It does **not** create new ship records,
refill durability, or reconstruct destroyed fleets. Consequently “spawn” here
means reactivating and relocating Rudolph's and the regular pirates' existing
fleet records, with whatever ships those records currently contain. Fleets
65–69 are military-numbered, so a battle with one pirate fleet can draw others
from the block in as assisting enemies (see the Massawa invasion above).

The attack hook (`0x3835–0x38A3`) runs before any battle whose opposing
captain's fleet byte is 60 through 69. The first such battle plays Martinez's
confrontation and sets flag 2; the second plays “I guess you weren't destined
to beat me after all” and sets flag 3; later ones play “How long are you going
to spend running around?” Each sets flag 4 and lets the battle proceed.

The victory route (`0x3B2E–0x3C9C`) runs after the battle. It requires flag 4
and that the opposing captain no longer commands a fleet (fleet byte `0xFF`);
otherwise it only clears flag 4, and João may fight again. Any of the ten
Neo-Atlantis fleets can therefore supply the decisive battle. On success the
script:

- detaches the nine regular pirate captains: each captain's fleet byte becomes
  `0xFF`, the fleet's flags, byte `+0x28`, and captain byte `+0x2A` are
  cleared (`0`, `0`, `0xFF`), the captain's duty becomes 0, and the captain's
  location byte `+0x25` is set to `random(42)`, a port from 0 through 41;
- sends the five Spanish fleets home: navigation word `+0x0C = 0x4000`,
  objective 0, argument 1 (Seville), flags `0x01`;
- gives Catalina's fleet the same home order but flags `0`, making it
  inactive, and writes 0 to Catalina's byte `+0x29`;
- makes Rudolph's fleet 60 inactive; and
- advances to the final subsection, where the Lisbon home triggers the ending.

[^finale-fleet-code]:
    The first setup is in `raw/SNR1.DAT` around
    `0x3578–0x360A`. It reads João's fleet position dynamically, selects fleet
    IDs `0x0F–0x13` through the sailor fleet bytes, and writes current X/Y,
    objective `7`, target sailor `0`, and flags `0x41`; it separately gives
    fleet `0x0A` objective `10`. The post-Ezequiel setup around
    `0x3751–0x3828` loads the fixed position `(0x0782, 0x0290)`, applies it
    with objective `7` to fleet IDs `0x3D–0x45` and fleet `0x3C`, moves fleets
    `0x0F–0x13` to João's position with objective `10`, and moves Catalina's
    `0x0A` to João's position without rewriting her objective. None of these
    blocks writes fleet ship slots or ship-instance durability.

#### Attacking the allied fleets

The finale contains two deliberate safeguards against attacking allies. Both
are before-battle routes, checked when the opposing captain's fleet byte is not
60–69:

| Target                                      | Warning route                                                                                                             | Name imposed after choosing **Yes** |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Catalina, fleet ID `10`                     | Rocco asks, “Do ye really want to attack?” The following exchange calls João cruel and spiteful.                          | **Spiteful**                        |
| Ezequiel's Spanish force, fleet IDs `15–19` | Rocco asks whether João really means to attack Ezequiel and the Spanish fleet. The following exchange calls him a nitwit. | **Nitwit**                          |

Choosing **No** plays a short relieved exchange and ends with `F8`, which
cancels that battle before it starts (outcome 8); nothing else changes.
Choosing **Yes** lets the battle proceed but deliberately makes the scenario
unwinnable. Both routes apply the same mechanical punishment
([Stats](../stats.md)):[^ally-attack-failure]

- João's first name is replaced with message 1160 “Spiteful” or 1170
  “Nitwit”.
- Leadership, Seamanship, Knowledge, Intuition, Courage, and Swordsmanship are
  set to `10`.
- Charm is set to `50` and Luck to `0`. Navigation and Battle level are not
  changed. Because this happens in the before-battle hook, the ensuing battle
  can change an attribute again before the next save.
- Variable 9 is set to 1, which the final Lisbon-home route also treats as a
  bar to the ending.
- The scenario advances beyond João's last story section. `MAIN.EXE` finds no
  further section offset (`0x385C7–0x385DF`) and stores section `0xFF`, and
  the protagonist dispatcher skips every route while the section is `0xFF`
  (`0x391DA`). This disables the remaining João-specific routes and makes his
  ending unreachable. Lisbon's special building consequently falls through to
  the ordinary cartographer behavior used by the other characters, including
  the option to sign a discovery-reporting contract.
- Catalina and the five Spanish fleets are assigned objective `0` with
  argument 1 (Seville) and flags `0x01`. While still at sea, their Gossip
  response therefore reports that they are returning home. The fleet which
  João actually fights may instead become inactive through the normal battle
  result. Spain's four ordinary merchant fleets, IDs `11–14`, are outside this
  loop and are not changed by the failure branch.
- The Neo-Atlantis pirates are **not** sent home. Rudolph's fleet is made
  inactive, while the nine regular pirate fleets are detached from their
  captains exactly as in the victory route: the fleets become inactive and the
  captains are relocated to a random port 0–41 with duty 0. The fleets' stored
  objective `7` is left behind, but it is inert: inactive fleets no longer
  move, appear at sea, or offer Gossip.

The surviving Spanish fleets sail back to their common home port and enter the
normal docked/arrival state, removing their sprites from the sea. Their records
have not been deleted. Once João's story control is gone, the ordinary NPC
fleet lifecycle can eventually give the surviving autonomous Spanish fleets new
assignments.

[^ally-attack-failure]:
    The Catalina failure block is in `raw/SNR1.DAT` around
    `0x38AB–0x39C6`; the parallel Ezequiel/Spanish block is around
    `0x39F1–0x3B0C`. Each rewrites João's first name and attributes, sets
    variable 9, detaches fleet IDs `0x3D–0x45` from their captains, assigns
    return-home objective `0` and active flags to fleets `0x0F–0x13` and
    Catalina's `0x0A`, and clears the active flag of Rudolph's `0x3C`. Both
    finish with the section-advance operation `F1`, which from the last João
    section leaves the saved section byte at `0xFF`.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any Fame milestone           | Make sure João is still affiliated with Portugal; every gate requires it                                                                                                                      |
| Lisbon preparation           | Home → Pub once → Home at 22:00–midnight → Church → Shipyard → recruit crew at the Pub → Harbor                                                                                               |
| 2,000 Fame                   | Harbor, then a Pub outside Lisbon, Seville, and Istanbul between 08:00 and 17:00                                                                                                              |
| Missing Domingo              | A Shipyard in any regular port; the Lodge clue is optional                                                                                                                                    |
| Duke Franco's arrest         | Any Harbor → Lisbon home → Palace → home → Harbor, then sail one night                                                                                                                        |
| 8,000 Fame                   | Any building to arm, then a Pub; repeat Pub or non-Harbor, non-Palace buildings until Catalina's 50% appearance, then a Harbor; sail one night; repeat once; then a Harbor and fight Catalina |
| Missing Lucia/Sapha          | Pub outside Lisbon after Catalina battle → Lisbon Pub → Basra Pub → Istanbul Lodge                                                                                                            |
| 16,000 Fame                  | Stay at sea to voyage day 5, enter a building, then Massawa Mosque → special building → any Massawa building → Lisbon home                                                                    |
| Poseidon's Staff             | Visit Massawa's special building, wait until the 11th of the next month, revisit it twice, then Massawa Harbor and two Turkish battles                                                        |
| After the Turkish battles    | Any Massawa building → Massawa special building → Massawa Harbor                                                                                                                              |
| 30,000 Fame                  | Pub outside Lisbon with port ID ≤ 93, then Nagasaki Harbor                                                                                                                                    |
| 40,000 Fame                  | Wildcard-matched building to arm → Lisbon Guild → Sakai special building → search non-Pub buildings in ports 42–56 → Pub there → Harbor                                                       |
| Neo-Atlantis                 | Harbor on a later date between 08:20 and 14:40 → battle a Spanish fleet → defeat a pirate fleet from IDs 60–69                                                                                |
| After defeating Martinez     | Lisbon Franco home                                                                                                                                                                            |

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **Sailor byte `+0x29` bit `0x20`** marks a sailor record as in use. New
  sailors are created with it (`MAIN.EXE 0x1D8CF`). It is cleared when a
  generic-portrait captain loses his fleet in battle (`0x1533A`) or is lost at
  sea (`0x1EAC0`); each month a record without it has a 1-in-3 chance of being
  reused for a new generic sailor (`0x1DC64`), and after a battle a captain
  without it always loses his fleet ([After the battle](../naval-battle.md#after-the-battle)).
  The Franco-home duel therefore requires that sailor 60's record has not
  been recycled.
- **Fleet and location `0xFE`.** No executable routine compares these bytes
  with `0xFE`. The value matches no fleet or port, so the sailor is off the
  map, and unlike an unemployed sailor (fleet `0xFF`) the monthly pass never
  moves him to another port (`0x1DC84`).
- **Duel time-out.** After 20 exchanges (`MAIN.EXE 0x17E57`) the duel stops;
  the time-out path (`0x17E61–0x17E9D`) only plays animation and never writes
  the balance, so it is left between 1 and 199 and the home duel's retry
  branch applies.
- **Variable 63 in before-battle routes** makes `MAIN.EXE 0x15121–0x15137`
  skip `0x1507B`, the pre-combat exchange: the enemy's challenge lines, the
  Fight/Flee/Surrender menu, or a merchant's surrender offer
  ([Before the battle](../naval-battle.md#before-the-battle-fight-flee-or-surrender)).
- **Assisting fleets** are those within 2 tiles of the player's fleet on both
  axes (`0x183EC`, called with radius 2 from `0x1843A`).
- **Sailor 60's rewrite after a decisive home duel** normally changes nothing.
  The new-game record already holds fleet `0x3C` and location `0xFF`
  (`KOUKAI2.DAT` `0x1081`), the scenario duel (`E8` → `MAIN.EXE 0x17F8A`) writes
  no sailor fleet, location or `+0x29` bytes, and SNR1 only reads `+0x29`
  between the Shipyard duel and the home scene. The rewrite matters only if
  pirate fleet 60 was destroyed first. A battle loss (`0x15302`) or an
  encounter loss between computer fleets (`0x1F9D0`, 9 times in 10) leaves him
  unemployed in one of ports 0–41 (`random(42)`) with bit `0x20` kept, so the home duel still
  happens, and a decisive win puts him back in command of fleet 60 even if
  that fleet is empty. In the remaining 1 in 10 of encounter losses bit `0x20`
  is cleared and the pirates do not appear.

## Design notes

These behaviors are fully decoded; only the designers' intent is unknown.

- **Massawa's name rewrite.** Taphali's reward copies “Massawa” into port 74's
  name field, which already holds that name. The player cannot rename a
  regular port (Rename Port exists only at supply ports), so the write has no
  visible effect.
- **Massawa other-building check.** The other-building route computes the
  current month into variable 2 but compares variable 1 (`0x24A0–0x24D0`), a
  value left by an earlier visit, so it completes the wait only in the cases
  described in [Delay, invasion, and battle stages](#delay-invasion-and-battle-stages).

## Open questions

None remain; the last one is answered in [Engine notes](#engine-notes).

[^fixed-slots]:
    João's inventory is empty in the new-game data (twenty `0xFF` slots at
    save slot `0x1DC1`). The tiara always goes to slot 1 (`0x011B`) and Marco's
    rapier to slot 2 (`0x0816–0x081E`), whatever those slots hold. Because
    the Item Shop puts a purchase in the first empty slot, an item bought in
    Lisbon before the tiara scene lands in slot 1 and is overwritten by the
    tiara. With the rapier in slot 2, this happens only if João first sells the rapier and
    then buys another item, a replacement rapier included, before the night
    meeting.
