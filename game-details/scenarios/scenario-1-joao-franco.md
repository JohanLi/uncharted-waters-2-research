# Scenario 1: João Franco

Scenario 1 (`SNR1`) is João's character story. It begins with a comparatively
free-form departure from Lisbon, then advances through five Adventure Fame
milestones. Each milestone opens another chain of building, voyage-day, or
battle events; reaching a later Fame value does not skip the active chain.

This document describes the scenario from the player's point of view. It is
based on the decoded route tables and dialogue, the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md), and
controlled-save observations.

Evidence labels have the meanings defined in [the scenario README](./README.md).
Sections 1 and 2 have the strongest runtime coverage. Most of sections 3–5 is
**decoded**, but its finer conditions still need controlled playthroughs.

## Story and threshold map

| Section | Adventure Fame gate | Player-visible story                                             |
| ------: | ------------------: | ---------------------------------------------------------------- |
|       0 |                   — | Prepare in Lisbon, depart, and meet the stowaway Domingo         |
|       1 |               2,000 | Rescue Domingo/Prince Alberto and clear Duke Franco at his trial |
|       2 |               8,000 | Catalina's pursuit, the search for Lucia, and finding Sapha      |
|       3 |              16,000 | Massawa, Poseidon's Staff, and the Turkish invasion              |
|       4 |              30,000 | Take Enrico to Nagasaki                                          |
|       5 |              40,000 | Enrico's letter, Lucia, Neo-Atlantis, and the finale             |

The thresholds compare **Adventure Fame**, not total Fame.

The gate is only one part of each trigger:

- 2,000 is tested when João visits a **Harbor**.
- 8,000 is tested by the wildcard route for an ordinary port building.
- 16,000 is first tested on **voyage day 5**, then again on a later building
  visit which reaches the regular-port wildcard handler.
- 30,000 is tested on entering a **Pub outside Lisbon**.
- 40,000 is tested on a building visit which reaches the regular-port wildcard
  handler.

Scenario services which are not mentioned below normally retain their ordinary
game behavior. The tables describe the extra story behavior layered onto them.

## Section 0: leaving Lisbon

The opening is not a single forced corridor. One-shot flags allow João to visit
several Lisbon buildings in different orders, although the dialogue continually
points toward the intended sequence.

### Departure preparation

1. Visit the **Franco home**. Duke Leon permits João to sail, orders him to
   investigate Atlantis, and puts Rocco in charge of his education.
2. Visit the **Pub after Duke Leon's briefing**. A single post-briefing visit is
   sufficient: it supplies 1,000 gold pieces and has Lucia arrange a secret
   meeting with João's mother. Visiting the Pub before the briefing only plays
   the earlier Carlotta/Lucia introduction and is optional.
3. Visit the **Franco home from 22:00 until midnight**. Duchess Christiana gives
   João her aquamarine tiara to sell. The Harbor does not directly require this
   flag and the tiara need not be sold. In ordinary unedited play, however, the
   scene is indirectly necessary: until it occurs, the Pub ejects João instead
   of offering its normal crew-recruitment service, and a crew is an engine
   requirement for setting sail. The program reads the 20-minute game clock and
   rejects times before 22:00; the clock's reset at midnight ends the window.
4. Visit the **Church** to meet and recruit Brother Enrico. Father Felippe asks
   João to take him to Zipangu. This is strictly required: without Enrico, the
   Harbor says that Father Felippe was looking for João and ejects him before
   he can use the Harbor menu.
5. Visit the **Shipyard** to receive the newly built _Hermes II_.
6. Return to the **Pub** and recruit enough sailors to put a crew aboard the
   _Hermes II_. This is a normal engine requirement, not a João-scenario flag.
7. Visit the **Harbor**. Its checks do not all behave alike. Without a ship,
   Rocco says, “We can't sail the seas without a ship, now can we? Let's go to
   the shipyard.” João remains inside the Harbor and can open its menu, but
   **Sail** and **Supply** are disabled. Without Enrico, the Father Felippe
   reminder instead ejects João from the building before he can use the menu.
   After the missing-money reminder, João remains in the Harbor and can still
   attempt to depart. Actual departure is subject to the game's normal
   ship-and-crew requirements. If the full tutorial plays, Rocco explains
   sailing costs and Enrico explains Lisbon/Seville trade; João may decline to
   make Enrico bookkeeper without blocking progression.
8. Set sail. Voyage day 1 advances the opening substage. On voyage day 3,
   Rocco discovers the stowaway who calls himself Domingo; the scene advances
   the scenario to section 1.

A minimal live run confirmed that João can depart with the Item Shop's rapier
unclaimed, the tiara still unsold, and Enrico's bookkeeping offer declined;
Domingo still appears normally on voyage day 3.

### Lisbon building behavior during preparation

| Building               | Story behavior                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Franco home            | Starts Duke Leon's briefing. Before the night meeting is ready, Marco refuses entry. After Lucia carries the message, the 22:00–midnight visit gives the tiara.                                                                      |
| Pub                    | Before the briefing, the first visit plays the full Carlotta/Lucia introduction and ends with Rocco's message that Duke Leon is calling for João; subsequent pre-briefing visits use only Carlotta's shorter reminder to go home. After the briefing, one visit supplies the money and has Lucia arrange the night meeting. Until that meeting occurs, later visits eject João with Lucia's 22:00–midnight reminder; afterward, normal Pub services, including crew recruitment, become available. |
| Palace                 | Before the briefing, the attendant says Duke Leon was looking for João. After the briefing, João is refused entry because the Duke has ordered everyone to treat him as a commoner.                                                  |
| Church                 | Before the briefing, Father Felippe supplies another hint to go home. During preparation, he introduces Enrico and asks João to take him east. A later visit can offer João money; the dialogue has accept/refuse branches.          |
| Shipyard               | Before the ship is collected, the shipwright mentions the vessel being built for Duke Leon. The main scene supplies the Latin-rigged _Hermes II_.                                                                                    |
| Harbor                 | Acts as a preparation checklist with branch-specific behavior. Without a ship, Rocco directs João to the Shipyard, but João remains inside and can open the Harbor menu; Sail and Supply are disabled. Without Enrico, the Father Felippe reminder ejects João before the menu. The missing-money reminder does not eject him; Set Sail remains available, subject to the engine's ship-and-crew checks. Once all checklist flags are satisfied, the trading/crew tutorial plays. |
| Market                 | Gives early Lisbon/Seville trade advice; without a ship, the trader points out that João has nowhere to store goods.                                                                                                                 |
| Item Shop              | Marco has prepaid for a rapier. It is a one-time pickup, and the shopkeeper reminds João to equip it. This appears optional to story progression.                                                                                    |
| Guild, Bank, and Lodge | All use the same wildcard building route rather than building-specific dialogue. On each visit before the briefing, the script randomly selects one of three runs: a greeting followed by the news that Rocco was looking for João; advice to visit Carlotta's Pub; or the generic “Are you avoiding something?” exchange. After the briefing, it randomly selects one of three other runs: João asking to be treated like a regular sailor; encouragement about finding Atlantis; or a remark that João will be leaving soon. None advances the opening sequence. |

## Section 1: Alberto and Duke Franco (2,000 Fame)

### Stage sequence

| Stage             | Required action                                                                                   | What changes                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arm the event     | With at least 2,000 Adventure Fame, visit any regular port's **Harbor**.                          | **Confirmed:** subsection 0 advances silently. Fame is latched; lowering it afterward does not cancel the event.                                                  |
| Hear the rumor    | Enter a **Pub** from 08:00 through 17:00 in a port other than Lisbon, Seville, or Istanbul.       | Rocco reports Prince Alberto's disappearance, notices Domingo is missing, and suggests the Lodge. Flag 0 is set.                                                  |
| Look for Domingo  | Optionally visit the **Lodge**, then visit the **Shipyard** in the same or another eligible port. | The Lodge clue sets flag 8 but is not required. The Shipyard confrontation, duel, and Catalina's intervention set flag 1 and clear flag 0.                        |
| Learn the truth   | Visit the **Harbor**.                                                                             | Rocco identifies Catalina; Domingo reveals that he is Prince Alberto and explains the plot against Duke Franco. The story advances to the Lisbon-return substage. |
| Rescue the Duke   | Return to Lisbon, visit the **Franco home**, then the **Palace**.                                 | The home visit includes another pirate duel and sets flag 5. The Palace trial clears Duke Franco and sets flag 2.                                                 |
| Close the episode | Return to the **Franco home**, then visit the **Harbor** and go to sea.                           | Duke Leon asks whether João will quit sailing; either answer continues the story. Alberto leaves at the Harbor. Voyage day 1 advances to section 2.               |

### Buildings while the event is forced

- Before the Shipyard confrontation, the **Lodge** gives the direct clue.
  Other ordinary buildings warn João about danger. After the Lodge clue,
  their reminder changes to "We'd better get to the shipyard."
- The first post-Shipyard **Harbor** visit is the important one; it contains
  Alberto's revelation. Trying other buildings instead produces warnings to
  leave.
- On returning to Lisbon, unrelated buildings point first to the **Franco
  home**, then to the **Palace**. The Palace cannot clear the accusation until
  the home duel is complete.
- After the trial, the **Franco home** gives the message 310 choice. The two
  answers change João's words, but both send him back to sea to seek Atlantis.
  Duke Leon also offers a rare sword.
- If Alberto is still captain of one of João's ships, he asks João to appoint
  a replacement or sell that ship before the departure can finish.
- Once the departure stage is set, non-Harbor buildings show Alberto's "Let me
  walk you to the port" reminder without ejecting João. The **Harbor** plays
  his actual farewell and sets the flag required by the voyage-day-1 handoff.

The home also contains a side mechanic during this section: an at-sea-day-3
route clears a flag, allowing Marco to deliver another 1,000 gold pieces from
João's mother on a later home visit. This is separate from the 2,000-Fame story
trigger.

## Section 2: Catalina, Lucia, and Sapha (8,000 Fame)

### Catalina's pursuit

1. With at least 8,000 Adventure Fame, enter an ordinary building in any
   regular port. **Confirmed:** this silently advances subsection 0 to 1. If
   the triggering building is a Pub, another Pub visit is needed for the next
   scene.
2. Enter any **Pub**. A patron warns João that Catalina is searching for him,
   and the scenario remembers that Pub's port.
3. Enter another eligible building. The warning differs depending on whether
   João is still in the remembered port. The code then rolls `random(2)`;
   Catalina appears on zero, a 50% chance. Her appearance sets flag 1.
4. Visit the **Harbor**. Rocco returns after restraining Catalina, flags 0 and
   1 are cleared, and flag 2 is set. Voyage day 1 clears flag 2 and advances
   the substage.
5. The Pub/wildcard-building/Harbor cycle occurs a second time with variant
   dialogue.
6. A later **Harbor** scene features a sailor admiring Catalina. The next
   encounter with Catalina's fleet invokes the scenario's before- and
   after-battle routes. The battle moves the story from comic pursuit to
   Lucia's disappearance.[^catalina-fleet]

The opening Pub warning has no special time test and does not exclude Lisbon,
Seville, or Istanbul; only normal Pub hours apply. Catalina's 50% roll is made
on an eligible building visit, not necessarily another Pub visit.

[^catalina-fleet]: Catalina's ten La Reales are not created by this scenario
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
    that index as a nibble shift. The exact gameplay name of this final record
    byte is not yet established. In the lower band (index 0), Catalina's `BC`
    entry supplies low nibble `C`. Adding the routine's base instance ID
    `0x31` selects ship-instance template `0x3D`. That template begins at
    `KOUKAI2.DAT` offset `0x4E4B`; its raw ship type at template offset `+0x11`
    is `0x15`, the zero-based form of display ship ID 22, **La Reale**.
    `0x1D3AE` copies the template's model values into the fleet slot,
    initializes its crew and condition, and marks the slot active. Repeated
    month-boundary passes can consequently grow Catalina's fleet from zero to
    ten La Reales before the story encounter.

    The Harbor setup in `SNR1.DAT` at `0x17E1-0x1814` only copies and offsets
    João's position for fleet `0x0A`, sets Catalina's objective to 7 with João
    as its target, writes active flags `0x41`, and invokes the navigation action
    `D1`. It never touches the ship slots. The encounter therefore uses
    whatever the monthly routine has already placed there. A normal, lengthy
    climb to 8,000 Adventure Fame can leave Catalina with ten La Reales; a
    fame-edited or unusually accelerated game that reaches the event before a
    relevant monthly pass can launch the same encounter with an empty or only
    partially filled fleet. A fleet emptied after maintenance likewise remains
    so until another month-boundary refill.

### Finding Sapha

| Stage                  | Building or event                                                     | Result                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| News of Lucia          | Enter any **Pub** after the Catalina naval encounter.                 | Ali and Salim report that Lucia has disappeared. Ali asks João to look for his sister Sapha.                                                |
| Confirm the kidnapping | Visit the **Lisbon Pub**.                                             | Carlotta says Catalina's was the only ship to leave when Lucia vanished.                                                                    |
| Search the Middle East | Ask at **Pubs** with port IDs 72–80.                                  | Some give no information; one clue calls Sapha's home a desolate Middle Eastern port. The actual destination is fixed: **Basra** (port 76). |
| Meet Sapha             | Enter the **Basra Pub**.                                              | João learns that Sapha is an orphan but cannot persuade her to leave. The clue is not required if the player goes directly to Basra.        |
| Report to Ali          | Go to Istanbul. The **Pub** points to the Lodge; visit the **Lodge**. | João tells Ali where Sapha is. Ali leaves to meet her, and the scenario advances to section 3.                                              |

Lisbon's home and Pub supply stage-appropriate reminders throughout the
search. They do not replace the Basra and Istanbul interactions.

## Section 3: Massawa and Poseidon's Staff (16,000 Fame)

This is the longest section in the scenario. Its main path is **decoded**, and
the calendar delay has been tested across a normal month boundary.

### From Ali's clue to Pietro's search

| Stage             | Required building/event                                                                                    | Result                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Arm the milestone | Reach 16,000 Adventure Fame and remain at sea until **voyage day 5**.                                      | The first 16,000 comparison advances the subsection.                                                 |
| Meet Ali          | Enter a later port building which reaches the wildcard handler while still meeting the 16,000 requirement. | The second comparison starts Ali's scene. He directs João to Massawa for information about Atlantis. |
| Ask in Massawa    | Visit the **Massawa Pub**, then the **Church/Mosque**.                                                     | The Pub directs João to the mosque. The imam directs him to the building southwest of town.          |
| Meet Taphali      | Visit Massawa's **special building**.                                                                      | Lord Taphali explains the Atlantean refugees, the Turkish threat, and Poseidon's Staff.              |
| Decide on Pietro  | Enter another **Massawa building**.                                                                        | Enrico and Rocco suggest Pietro Conti; João decides to return to Lisbon.                             |
| Hire Pietro       | Visit the **Franco home**.                                                                                 | Duchess Christiana summons Pietro, who agrees to find the Staff and deliver it in Massawa.           |

### Delay, invasion, and battle stages

After Pietro accepts, Massawa and Lisbon gain repeated progress dialogue:

- The **Franco home** says Pietro sends no reports while searching.
- The **Lisbon Pub** continues the Lucia reminders.
- João must first visit Massawa's **special building**. Taphali asks whether he
  has found the Staff, and Meconbe warns that the Turks are getting closer to
  attacking. This visit initializes the Massawa waiting state.
- Only after that special-building visit do other **Massawa buildings** produce
  Rocco's “I wonder if he's found Poseidon's Staff yet?” and João's “All we can
  do is wait, I'm afraid.” dialogue.

That first post-Pietro visit to Massawa's special building sets the waiting flag
and saves a target month of `current year * 12 + current month + 1`. A later
visit to the special building advances the story only when both of these are
true:

- the current combined year/month is at least the saved target month; and
- the internal zero-based day is at least `10`, meaning the displayed date is
  the **11th or later**.

The earliest possible progression is therefore the **11th of the following
calendar month**. This is not a wait of one month plus ten days. For example, a
timer initialized on January 10 still rejected the special-building visit on
February 10, then advanced subsection 6 to subsection 7 on February 11. The
before/after saves retained the same target-month value throughout this test.
The combined year/month calculation also handles a December-to-January rollover
without a special case: December's saved target and the following January both
evaluate to `(year + 1) * 12`.

When that calendar gate has passed, the remaining route is:

1. Return to Massawa's **special building**. Taphali and Meconbe believe the
   Staff will arrive too late; João commits his fleet to delaying the Turkish
   navy.
2. In ordinary ports with IDs 72–80, building visits can report that the Turks
   have moved against Massawa. This is reminder dialogue; the required
   progression remains at Massawa.
3. Visit the **Massawa Harbor**. Catalina appears, admits her part in Lucia's
   kidnapping, and postpones her duel with João while he fights the Turks.
4. Fight two of the five pursuing Turkish military fleets. The first
   before-battle hook begins the defense; the second brings Catalina's fleet to
   help. The after-battle hook following the second encounter ends the pursuit
   and advances again. Losing either battle results in **game over**; there is
   no recoverable defeat route.
5. Return to Massawa. The **special building** can report that the defenders
   are still holding, but that visit is not a prerequisite. Entering another
   Massawa context—including the **Harbor**—can trigger Pietro's arrival with
   Poseidon's Staff directly.
6. Take the Staff to Massawa's **special building**. Taphali accepts it and
   rewards João with an ancient Atlantean crown.
7. Visit the **Massawa Harbor**. Catalina states the evidence behind her grudge;
   Pietro and João show that the Franco family could not have destroyed her
   brother's fleet. The scenario advances to section 4.

The invasion does not create two special fleets. At `SNR1.DAT 0x258A–0x25DF`,
the special-building scene that begins João's defense loops over the captain
records and selects existing fleet IDs `25` through `29`: Turkey's two Convoys
and three Voyaging Fleets. It repositions them near Massawa/João, assigns
objective `7` (persistent special pursuit), sets the objective argument to
sailor `0` (João), and replaces their flags with `0x41` (active plus the
special `0x40` state). The four Turkish Merchant Fleets, IDs `21`–`24`, are not
included.

The setup does **not** rebuild ship slots or restore their current durability.
This was tested with all five military fleets destroyed before the scene: the
script still reactivated and positioned all five fleet sprites, and they could
still pursue and catch João, but they moved extremely slowly. Their fleet-info
screens reported an anomalous speed of **124 knots**, despite the normal
20-knot cap; their actual map movement did not match that displayed value. A
battle against one of these empty fleets ended immediately after João performed
any action. Thus prior destruction does not prevent the invasion routes from
appearing, but it produces active empty fleets rather than regenerated Turkish
ships.

The five pursuers are:

| Fleet ID | Class          | Captain          |
| -------: | -------------- | ---------------- |
|       25 | Convoy         | Rashid Jabbar    |
|       26 | Convoy         | Walid Kemal      |
|       27 | Voyaging Fleet | Afmed Muhiddin   |
|       28 | Voyaging Fleet | Sallah Iskal     |
|       29 | Voyaging Fleet | Siddarth Kebin   |

Both before-battle routes still use wildcard selector `0xA1FF`, but internal
checks at `0x2776–0x2787` and `0x27FF–0x2810` resolve the opposing captain's
fleet and reject it unless its ID is from `25` through `29`. An unrelated
battle therefore cannot advance either substage. The scenario does not require
two particular captains from the group; whichever two qualifying fleets João
encounters can supply the two successive battles.

After the second qualifying battle, `0x2879–0x28B9` loops over the same five
fleets and writes objective `0`, argument `2`, and flags `0x01`: all five remain
active but are released from special pursuit and sent toward their Turkish home
port. In the supplied post-departure save, all five had objective `7`, targeted
João, and were clustered around his fleet, while the merchant fleets retained
their ordinary assignments.

Pietro's handoff scans João's twenty inventory slots in order. An unused slot
contains `0xFF`; when the scan finds one, it writes raw item ID `0x62`
(Poseidon's Staff) into that slot. If all twenty slots are occupied, the scan
runs off the end with the twentieth slot's former item ID still selected. The
game uses that ID for `$r03` in “the Staff for the ...” dialogue and overwrites
the **twentieth inventory slot** with `0x62`.

Controlled saves confirmed both paths. With only slot 20 empty, it changed from
`0xFF` to `0x62`. With a full ascending test inventory, slot 20's Chain Mail was
named and replaced; reversing the same items caused slot 20's Dagger to be named
and replaced instead. Equipped items are not protected: an equipped Dagger in
slot 20 was also exchanged for the Staff. No choice prompt, item-value test, or
special-item protection is involved.

## Section 4: taking Enrico to Nagasaki (30,000 Fame)

This short section is mostly a travel handoff.

1. At 30,000 Adventure Fame, enter a **Pub outside Lisbon**. Enrico says it is
   time to fulfill his mission in Zipangu and asks to be taken to
   Nagasaki.[^japanese-ports]
   This advances the subsection. Lisbon's own Pub route takes precedence and
   only plays the standing Lucia reminder.
2. Lisbon's **Franco home**, **Palace**, and **Pub** contain optional farewell
   scenes for Marco, Prince Alberto, and Carlotta.
3. In Nagasaki, ordinary buildings can play an arrival conversation. Visit the
   **Harbor** to complete Enrico's departure.
4. If Enrico is captain of a ship, he first asks João to replace him or sell
   the ship. Once this is resolved, the Harbor farewell advances the scenario
   to section 5.

The Fame check is attached to the generic Pub route, so reaching 30,000 at sea,
in another building, or in the Lisbon Pub does not by itself begin Enrico's
request.

[^japanese-ports]: Sakai and Nagasaki are port IDs `0x62` and `0x63`. Their
    saved 20-byte port records use byte `+0x13` as a packed status field: bit
    `0x10` means already discovered, while bit `0x20` excludes the port from
    discovery. The untouched `KOUKAI2.DAT` template gives both ports status
    `0x06`, so they are technically discoverable before João recruits Enrico.
    João cannot leave Lisbon without Enrico, however, and Enrico's Section-0
    recruitment route at `SNR1.DAT 0x05A7–0x05C3` reads field `+0x13` through
    VM table `0x0C`, ORs it with `0x20`, and writes it back for both ports:
    `0x06 | 0x20 = 0x26`. All supplied pre-30,000 João saves contain `0x26` for
    Sakai and Nagasaki. Thus, in an ordinary playthrough, both are unavailable
    for the whole period in which João is first able to sail.

    The 30,000-Fame Pub scene reverses this at `SNR1.DAT 0x2D36–0x2D52`. For
    each port it performs `status &= 0xD0`; normally, `0x26 & 0xD0 = 0x00`.
    This clears the unavailable bit but does **not** set the discovered bit, so
    the event enables Sakai and Nagasaki rather than discovering them for João.
    He must still sail close enough to find each normally. The mask is broader
    than a pure `0x20` clear: it also clears the low four status bits, while
    preserving `0x10`, `0x40`, and `0x80`.

    The ordinary port-discovery loop in `MAIN.EXE 0x36BE4–0x36C4B` scans all
    130 port records. At `0x36BF3` it skips a record when
    `(status & 0x30) != 0`, covering both unavailable (`0x20`) and already
    discovered (`0x10`) ports. After a port passes the proximity checks,
    `0x36C41` records the discovery with `status |= 0x10`; the normal discovery
    handler then awards the region-based Adventure Fame. Consequently the
    normal state sequence is `0x06 → 0x26` when Enrico joins, `0x26 → 0x00`
    when his 30,000-Fame request begins, and `0x00 → 0x10` when João physically
    discovers the port.

## Section 5: Neo-Atlantis (40,000 Fame)

### The letter and Sakai

| Stage                  | Building                                                                    | Result                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Arm the finale         | A port building which reaches the wildcard handler at 40,000 Adventure Fame | Silently advances to the letter stage. Lisbon's home and Pub have specific routes which take precedence. |
| Learn about the letter | Lisbon **home**, **Pub**, or another ordinary Lisbon building               | Marco or Carlotta points João to the Guild; the wildcard reminder says a letter awaits him.              |
| Read the letter        | Lisbon **Guild** (context 6)                                                | Enrico asks João to meet him in Sakai.                                                                   |
| Find Enrico            | Any Sakai building, then Sakai's **special building**                       | Town dialogue points south; Enrico says Ernst found a man-made Atlantis on a large South American river. |

The Lisbon home and Pub have new follow-up scenes after the letter is read, but
neither is required before sailing to Sakai.

### South American search and Lucia

The search route only accepts South American port IDs 42–56.

1. Enter an ordinary **non-Pub building** in one of those ports. The wildcard
   handler rolls `random(10)`. On zero, during its internal 04:20–17:00 window,
   João sees people chase someone into the Pub and flag 0 is set. Other rolls
   produce a generic "let's look around" response. In practice, the follow-up
   Pub cannot be used before its normal opening time.
2. Enter that port's **Pub** after flag 0 is set. João finds Lucia threatened
   by Rudolph, fights a duel, and is helped by Catalina.[^rudolph-stats] The
   scene advances the subsection.
3. Visit a **Harbor**. Lucia explains Neo-Atlantis and Martinez's plan;
   Catalina reveals that Martinez killed her brother. The group decides to
   seek Commander Ezequiel's help and to leave the next morning.

The Pub has its own specific route, so while flag 0 is clear it does not also
perform the wildcard one-in-ten search roll. The useful search attempts are
other ordinary buildings in the eligible South American ports.

[^rudolph-stats]: “Pirate Rudolph” has no separate sailor record. The scene
    repurposes sailor ID `0x3C` (60), normally Antonio Khan: it writes `0x3B`
    to the record's displayed-character/portrait selector at `+0x12`, loads the
    strings “Pirate” and “Rudolph” from message entries `0x041C` and `0x041D`,
    and copies them into the two nine-byte name fields at `+0x00` and `+0x09`.
    It then starts the duel with `E8 3C`. The scenario does not write the eight
    attributes at `+0x14..+0x1B` or the Navigation and Battle levels at
    `+0x1C..+0x1D`, so Rudolph inherits whatever values sailor 60 currently has
    in the save. In an untouched `raw/KOUKAI2.DAT`, whose 42-byte sailor table
    begins at `0x06A9`, record 60 begins at `0x1081` and has Leadership 81,
    Seamanship 78, Knowledge 89, Intuition 73, Courage 68, Swordsmanship 80,
    Charm 70, Luck 51, Navigation level 7, Battle level 16, age 44, and no
    skills. Modified sailor-60 values therefore also carry into this duel.

### Ezequiel, Martinez, and the ending

| Stage                         | Building or event                     | Result                                                                                                                        |
| ----------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Plan the attack               | **Harbor**                            | Lucia explains Neo-Atlantis, and the scenario mobilizes Catalina and five Spanish fleets around João.                         |
| Wait for the departure window | **Harbor**                            | The Harbor permits departure only on a later calendar date from 08:20 through 14:40. Otherwise Rocco or Catalina sends João to the Lodge. |
| Recruit Ezequiel              | Encounter with one of the five fleets | Catalina surrenders; João explains Neo-Atlantis; Ezequiel joins the attack. The scenario then reorganizes both pursuit groups. |
| Attack Neo-Atlantis           | Before-battle hooks                   | Martinez taunts the allies. Ezequiel attacks the fortress and Catalina handles the other fleets while João targets Martinez.  |
| Win                           | After-battle hook                     | Martinez is defeated, Neo-Atlantis collapses, and João decides to return home.                                                |
| End the scenario              | Lisbon **Franco home**                | The route invokes the ending operation. Other Lisbon buildings have explicit no-op routes at this final substage.             |

The Harbor planning scene saves the current year, month, and day. A return on
that same date always produces the "tomorrow is the big day" Lodge reminder.
On any later date, the scene still blocks João at or before 08:00 and at or
after 15:00. The usable departure window is therefore **08:20–14:40**; the
comparison is not a simple "wait until morning" flag.

At the end of the planning scene, the scenario finds Spain's two Convoys and
three Voyaging Fleets by their linked fleet IDs and moves all five to João's
exact current position. It gives them pursuit objective `7`, targeting sailor
ID `0` (João), and marks them active. Catalina's fleet, ID `10` (`0x0A`), is
also placed at João's position, but receives scripted-pursuit objective `10`.
The five Spanish fleets are:[^finale-fleet-code]

| Fleet ID | Captain         | Normal role     |
| -------- | --------------- | --------------- |
| `15`     | Tonio Burciaga  | Convoy          |
| `16`     | Hugo Montoya    | Convoy          |
| `17`     | Xavier Navarro  | Voyaging Fleet  |
| `18`     | Bernal Loyola   | Voyaging Fleet  |
| `19`     | Hernan Chavez   | Voyaging Fleet  |

The first encounter with any one of fleet IDs `15–19` invokes the Ezequiel
scene. The hook checks the opponent's linked fleet ID, so it does not depend on
which of the five displayed captains reaches João first.

After Ezequiel joins, the scenario changes all five Spanish fleets from
objective `7` to objective `10`, still targeting João. This accounts for the
post-encounter behavior in which they continue to follow him but answer
Gossip with “I have some business with you.” That sentence is the generic
captain response for objective `10`, rather than new scenario dialogue.

The same reconfiguration creates the force waiting near Neo-Atlantis. Pirate
Rudolph's fleet is fleet ID `60` (`0x3C`), because Rudolph is the renamed
sailor-60 record described above.[^rudolph-stats] It is placed at the fixed
position near the Amazon and Neo-Atlantis, given pursuit objective `7`, and
made to target João. The scenario places all nine regular pirate fleets, IDs
`61–69`, at precisely the same position with the same objective. Rudolph
therefore does not spawn alone: he is the first fleet in a ten-fleet pirate
block concentrated at one point.[^finale-fleet-code]

Save comparison confirms the transition: before the Ezequiel encounter, the
five Spanish fleets have objective `7`; afterward, they remain close to João
with objective `10`. Rudolph and fleet IDs `61–69` then occupy the same fixed
position near Neo-Atlantis with objective `7`, target sailor `0`, and active
flags. Their cached navigation target is João's position when the
post-Ezequiel reconfiguration ran.

This is the same broad mechanism as the Turkish pursuit at Massawa: the
scenario repurposes existing fleet records and changes their position,
objective, target, and active flags. It does **not** create new ship records,
refill durability, or reconstruct destroyed fleets. Consequently “spawn” here
means reactivating and relocating Rudolph's and the regular pirates' existing
fleet records, with whatever ships those records currently contain.

[^finale-fleet-code]: The first setup is in `raw/SNR1.DAT` around
    `0x3578–0x360A`. It reads João's fleet position dynamically, selects linked
    fleet IDs `0x0F–0x13`, and writes current X/Y, objective `7`, target sailor
    `0`, and flags `0x41`; it separately gives fleet `0x0A` objective `10`. The
    post-Ezequiel setup around `0x3751–0x3828` loads a fixed position near
    Neo-Atlantis, applies it with objective `7` to fleet `0x3C` and fleet IDs
    `0x3D–0x45`, and changes fleets `0x0F–0x13` plus Catalina's `0x0A` to
    objective `10` at João's position. None of these blocks writes fleet ship
    slots or ship-instance durability.

#### Attacking the allied fleets

The finale contains two deliberate safeguards against attacking allies:

| Target | Warning route | Name imposed after choosing **Yes** |
| ------ | ------------- | ----------------------------------- |
| Catalina, fleet ID `10` | Rocco asks, “Do ye really want to attack?” The following exchange calls João cruel and spiteful. | **Spiteful** |
| Ezequiel's Spanish force, fleet IDs `15–19` | Rocco asks whether João really means to attack Ezequiel and the Spanish fleet. The following exchange calls him a nitwit. | **Nitwit** |

Choosing **No** returns to the intended Martinez battle. Choosing **Yes**
allows the attack but deliberately makes the scenario unwinnable. Both routes
apply the same mechanical punishment:[^ally-attack-failure]

- Leadership, Seamanship, Knowledge, Intuition, Courage, and Swordsmanship are
  set to `10`.
- Charm is set to `50` and Luck to `0`. Navigation and Battle level are not
  changed. Because this happens in the before-battle hook, the ensuing battle
  can change an attribute again before the next save.
- The scenario advances beyond João's last story section, producing section
  marker `0xFF`. This disables the remaining João-specific routes and makes
  his ending unreachable. Lisbon's special building consequently falls
  through to the ordinary cartographer behavior used by the other characters,
  including the option to sign a discovery-reporting contract.
- Catalina and the five Spanish fleets are assigned objective `0` and sent
  home. While still at sea, their Gossip response therefore reports that they
  are returning home. The fleet which João actually fights may instead become
  inactive through the normal battle result. Spain's four ordinary merchant
  fleets, IDs `11–14`, are outside this loop and are not changed by the failure
  branch.
- The Neo-Atlantis pirates are **not** sent home. Rudolph's fleet is made
  inactive, while the nine regular pirate fleets are made inactive and have
  their captain links cleared. Their stored objective `7` is left behind, but
  it is inert: the fleets no longer move, appear at sea, or offer Gossip.

The later disappearance of the Spanish pursuers is therefore expected. The
surviving fleets sail back to their common home port and enter the normal
docked/arrival state, removing their sprites from the sea. Their records have
not been deleted. Once João's story control is gone, the ordinary NPC fleet
lifecycle can eventually give the surviving autonomous Spanish fleets new
assignments.

[^ally-attack-failure]: The Catalina failure block is in `raw/SNR1.DAT` around
    `0x38AB–0x39C7`; the parallel Ezequiel/Spanish block is around
    `0x39F1–0x3B0D`. Each rewrites João's first name and attributes, assigns
    return-home objective `0` and active flags to fleets `0x0F–0x13` and
    Catalina's `0x0A`, clears the active flag of Rudolph's `0x3C`, and disables
    fleet IDs `0x3D–0x45`. Both finish with the section-advance operation which,
    from the last João section, leaves the saved section byte at `0xFF`.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Lisbon preparation           | Home → Pub once → Home after 22:00 → Church → Shipyard → recruit crew at the Pub → Harbor                           |
| 2,000 Fame                   | Harbor, then a Pub outside Lisbon, Seville, and Istanbul before 17:00                                                |
| Missing Domingo              | Shipyard; the Lodge clue is optional                                                                                 |
| Duke Franco's arrest         | Lisbon home → Palace → home → Harbor                                                                                 |
| 8,000 Fame                   | Any building to arm, then Pub; repeat buildings until Catalina's 50% appearance, then Harbor                         |
| Missing Lucia/Sapha          | Pub after Catalina battle → Lisbon Pub → Basra Pub → Istanbul Lodge                                                  |
| 16,000 Fame                  | Stay at sea to voyage day 5, enter a building, then Massawa Pub → Mosque → special building                          |
| Poseidon's Staff             | Lisbon home for Pietro, wait through the Massawa calendar gate, then follow Massawa special-building/Harbor prompts  |
| 30,000 Fame                  | Pub outside Lisbon, then Nagasaki Harbor                                                                             |
| 40,000 Fame                  | Wildcard-matched building to arm → Lisbon Guild → Sakai special building → search non-Pub buildings in South America |
| After defeating Martinez     | Lisbon Franco home                                                                                                   |
