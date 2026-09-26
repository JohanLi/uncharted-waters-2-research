# Scenario 4: Ernst von Bohr

Scenario 4 (`SNR4`) is Ernst's character story. It opens in Amsterdam, where
the geographer Mercator funds Ernst's expedition and grants him a cartographer
contract. After that the story advances through four Adventure Fame
milestones: Paula joins, two sections of travel conversations follow, and the
last section is a search for Zipangu and for Paula's homeland on the Huang He,
ending in Changan. The story has no scripted naval battles, duels, voyage-day
events, or clock and calendar gates. Its only recurring penalty is Mercator's
reaction when Ernst holds another cartographer's contract.

This document describes the scenario from the player's point of view. It is
based on the decoded `SNR4.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine.

Evidence labels have the meanings defined in [the scenario README](./README.md).
Unless a statement is labeled otherwise, it is **decoded**.

## Story and threshold map

| Section | Adventure Fame gate | Player-visible story                                                    |
| ------: | ------------------: | ----------------------------------------------------------------------- |
|       0 |                   — | Mercator funds the expedition; Hans joins; the _Mercator_ sets out      |
|       1 |               1,000 | Mercator's maps become popular; Paula asks to join                      |
|       2 |               5,000 | Paula meets Mercator; the first set of travel conversations             |
|       3 |              20,000 | The second set of travel conversations                                  |
|       4 |              40,000 | Hans's dream of Zipangu, the yellow-sea clue, the Huang He, and Changan |

The thresholds compare **Adventure Fame**, not total Fame. Every comparison
reads the word at `+0x04` of protagonist 3's 14-byte Fame record
(`DC 00 01 03 00`, pointer `+4`, word read). Each comparison is inclusive: a
value equal to the threshold passes.

The gate is only one part of each trigger:

- 1,000 is tested only at the **Amsterdam Harbor** (`SNR4.DAT 0x0416`).
- 5,000 and 20,000 are tested at the **Harbor** of any regular port whose ID is
  43 or higher (`0x0627` and `0x0782`). A Paula conversation always plays
  first at such a port.
- 40,000 is tested by the same kind of Harbor route (`0x092D`), but passing it
  only arms the section. A later Harbor visit at a port with ID 93 or lower
  starts the Zipangu story.

No route in `SNR4.DAT` uses the at-sea selector `0xA0` or the before- and
after-battle selectors `0xA1`/`0xA2`. Only Mercator's shop and the Harbor have
story routes in sections 1–3. Section 4 later adds a wildcard route for the
other buildings of the East Asian ports and specific routes for Changan.
Scenario services which are not mentioned below normally retain their
ordinary game behavior. The tables describe the extra story behavior layered
onto them.

## Cartography and Mercator's contract

### Map prerequisites

Drawing and reporting map progress requires both:

- Cartography, skill-mask bit `0x08`. Ernst's starting sailor record already
  has it ([sailors](../sailors.md)); and
- an active contract with a cartographer: bit `0x10` of byte `+0x16` in that
  cartographer's 24-byte record.

Ernst does not choose **Contract** himself. His first Mercator scene sets
Mercator's contract bit directly, changing the byte from `0x09` to `0x19`
(`SNR4.DAT 0x01ED–0x01F8`). Unlike the ordinary Contract command
(`MAIN.EXE 0x33A70`), the script does not clear the other four records or
reset the unreported-cell counter. In a new game no other contract is active,
so the result is the same. Mercator's shop ejects Ernst until the following
Amsterdam Harbor scene advances the story. From section 1 on, a Mercator visit
stays in the building and the normal cartographer menu, including **Report**,
remains available.

Known cartographers are Mercator in Amsterdam, Gerard de Jode in Antwerp,
Diogo Ribeiro in Barcelona, Olives in Palma, and Giovanni Verrazano in Venice.

The chart has 90 × 45 usable cells. A new game begins with a 13 × 10 European
rectangle, or 130 cells, revealed. Each newly charted cell awards 5 Adventure
Fame when reported and 80 gold for all five known cartographers. Mercator's
completion check requires 3,300 total known cells: 3,170 of the 3,920 cells
initially hidden, about 80.87%. Map reports are the story's main scripted
source of Adventure Fame: `SNR4.DAT` itself never awards Fame. The other
sources are ordinary discoveries and port sightings
([Adventure Fame](../fame/adventure-fame.md)).

Detailed storage and executable evidence is in the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md#cartography-and-ernsts-map-reports).

### Mercator's greeting and the contract check

Every section from 1 to 4, and every subsection of section 4, has an Amsterdam
special-building route (`0x2107`) with the same structure:

1. It reads Mercator's byte `+0x16` (record selector `0x09` of group `0x04`)
   and masks it with `0x10`.
2. If the bit is set, Mercator gives a section-specific greeting and asks for
   new information. The script sets greeting-suppression variable 63, so this
   greeting replaces the ordinary “Oh, Sir Von Bohr. I was waiting for you.”
   The cartographer menu follows normally.
3. If the bit is clear, he gives a four-line accusation instead: “...is it
   true that you have contracts with other cartographers besides me?” He then
   renews his contract and warns Ernst not to “double-cross” him again.

The accusation branch has three effects:[^mercator-penalty]

- Mercator's contract bit is set again.
- The contract bit is cleared on the other four cartographer records
  (Giovanni, Gerard, Diogo, and Olives).
- **Ernst's Trade, Piracy, and Adventure Fame are all halved**, rounding down.

The test reads only Mercator's bit. It does not look at the other records.
In ordinary play, the bit becomes clear only when Ernst signs with another
cartographer, since the ordinary Contract handler clears the bit on every
other record. The penalty applies on every such return, not only the first.
Because the story gates read the current Adventure Fame, the halving can push
Ernst back below the next threshold. Sections which have already advanced are
not undone.

Signing with another cartographer and never visiting Mercator again does not
trigger the penalty. The accusation runs only when Ernst enters Mercator's shop.

The shared scenario cannot suppress this route. The protagonist dispatch is
skipped only when a shared `SNR0` route has set variable 63 first
(`MAIN.EXE 0x20A32`). The only shared route that can match Amsterdam's special
building is the idle section-0 wildcard `0xA3FF` (`SNR0.DAT 0x0306–0x0432`),
and it never writes variable 63.

[^mercator-penalty]:
    The accusation block appears at `SNR4.DAT 0x0381–0x0412` (section 1),
    `0x0592–0x0623` (section 2), `0x06ED–0x077E` (section 3), and in section 4
    at `0x0898–0x0929`, `0x0A74–0x0B05`, `0x0BA3–0x0C34`, `0x0DB6–0x0E47`, and
    `0x0F98–0x1029`. Each copy ORs Mercator's byte with `0x10`, ANDs the bytes
    of selectors `0x05`–`0x08` with `0xEF`, then resolves
    `DC 00 01 03 00` (protagonist 3's Fame record). It divides the words at
    `+0`, `+2`, and `+4` by 2 in place; these are Trade, Piracy, and Adventure
    Fame. None of the blocks ejects Ernst, so the cartographer menu follows.

## Section 0: Mercator's expedition

### Stage sequence

| Stage           | Required action                                          | What changes                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meet Mercator   | Visit Mercator's shop, Amsterdam's **special building**. | Mercator hires Ernst as his explorer, sets his gold to 5,000, introduces Hans, provides the Caravela Latina _Mercator_, and grants his cartographer contract. The subsection advances and Ernst is put outside.[^mercator-scene] |
| Leave Amsterdam | Visit the Amsterdam **Harbor**.                          | Hans and Ernst discuss the Fjords, provisions, and selling information to collectors under a contract. The story advances to section 1. Ernst remains in the Harbor, and its ordinary menu follows.                              |

Mercator's “here's the money I promised you” **sets** on-hand gold to exactly
5,000 (`0C 00 1388`, `E4 00`); it does not add 5,000 to the existing amount.
Ernst starts the game with no ship: his fleet (ID 50) has no active ship slot
in the new-game data. The _Mercator_ is therefore his first ship, and `FA`'s
captain rule makes Ernst its captain, because the protagonist comes first
when he commands no ship ([Assigning duties](../sailors.md#assigning-duties)).
Neither `F9`/`FA` nor the Harbor tutorial recruits sailors, so the
_Mercator_ starts with no crew, and Ernst must hire one at the Amsterdam
**Pub** before the ordinary departure check lets him sail. The Pub and the
other ordinary buildings work normally once Mercator's scene has played.

Before Mercator's scene an untitled Ernst cannot reach **Meet Ruler** in
Amsterdam: the Palace admits an untitled character at his own capital only
while a royal invitation or offer is active, and otherwise refuses him with
raw 84, “Commoners are not permitted to enter the palace. Remove yourself from
the premises.” (`MAIN.EXE 0x30A1E–0x30A5C`).

[^mercator-scene]:
    `SNR4.DAT 0x004A–0x0227`. After messages 1–44, `FB 4D` adds sailor
    77, Hans Starten, to the mate roster. `DC 00 03 4D 26` and `11 00 03` then
    set his duty byte to 3 (First Mate). `F9 05 05` starts a pending ship of
    model 5, whose template name is “Caravela Latina” (display ship ID 6). `FA
05 002C` commissions it with the name in message 45, “Mercator”, and
    assigns its captain by the handler's usual rule (`MAIN.EXE 0x38193`).
    `0x01ED–0x01F8` ORs Mercator's contract byte with `0x10`.
    `0x01FB–0x0222` ORs byte `+0x13` of port records 97, 98, and 99 (Changan,
    Sakai, and Nagasaki) with `0x20`. The block ends `F0 F8 F2`: advance the
    subsection, eject from the building, and stop.

### Amsterdam building behavior

| Building                                           | Before Mercator's scene                                                                                                                                                         | After Mercator's scene                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mercator's shop                                    | Plays the expedition scene.                                                                                                                                                     | Mercator says, “Don't forget to keep me updated on your progress!” and Ernst is put outside. |
| Harbor                                             | Ejects Ernst with the building speaker's reminder (next row).                                                                                                                   | Plays the Hans conversation and advances to section 1.                                       |
| Market, Pub, Shipyard, Lodge, Guild, and Item Shop | The wildcard route `0x21FF` has the building speaker call Ernst “Professor” and say that Mercator was looking for him and will be waiting at his shop. Ernst is ejected (`F8`). | No route; ordinary behavior.                                                                 |
| Palace, Church, Bank, and House of Fortune         | Explicit no-op routes (`0x0228–0x022B`, each a lone `F2`) keep them out of the wildcard route. Ordinary behavior.                                                               | No route; ordinary behavior.                                                                 |

The wildcard reminder also sets scenario flag 0 (`0x0250`). No section-0 route
tests that flag, and the section change clears it, so it has no effect.

Until the Harbor scene, Mercator's shop itself is not usable. Its route in the
second subsection (`0x0261`) ends with `F8`, so the Report menu is only
available from section 1.

## Section 1: Paula (1,000 Fame)

| Stage              | Required action                                                     | What changes                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build Fame         | Chart new areas and report them to Mercator; make discoveries.      | Mercator greets Ernst with “So $n, have you gotten used to sea travel yet?” and the normal menu follows.                                                                                                                                 |
| Paula asks to join | With at least 1,000 Adventure Fame, visit the **Amsterdam Harbor**. | Hans reports that Mercator's maps are popular and list both men as cartographers. Event art (`EVENT4.DAT` record 0) introduces Paula. She tells her story, and Hans persuades Ernst to take her aboard. The story advances to section 2. |

The Fame comparison is the only condition on the Harbor route
(`0x0416–0x0425`). No other port has a section-1 route, so reaching 1,000
elsewhere has no effect until Ernst returns to Amsterdam. Below 1,000, the
Amsterdam Harbor behaves normally.

Paula is a story character only. The scene contains no `FB` instruction, so
she is not added to the mate roster.

## Sections 2 and 3: Paula's travel conversations (5,000 and 20,000 Fame)

Both sections have the same structure: a Mercator route and an
any-regular-port Harbor route (`0xA303`). The Amsterdam Harbor now uses the
general route like any other port.

### Harbor conversations

1. The route reads the current port ID and draws `EB 01 0003`, a value from
   0 to 2.
2. At a port with ID below 43, the route stops there. No dialogue plays and
   Fame is not tested. Ports 0–42 are Europe, the Mediterranean, the Black
   Sea, the North Sea and Baltic, and Caracas.
3. At port IDs 43–99, exactly one of three conversations plays according to
   the draw.
4. The route then compares Adventure Fame with 5,000 (section 2) or 20,000
   (section 3). If Fame is high enough, the section advances. The
   conversation is not a prerequisite; it always precedes the test at an
   eligible port.

| Section | Draw | Conversation                                                                                      |
| ------: | ---: | ------------------------------------------------------------------------------------------------- |
|       2 |    0 | Paula says Mercator's maps have become famous; Ernst remarks that success does wonders for a man. |
|       2 |    1 | Paula says this harbor is not her homeland either; Hans and Ernst reassure her.                   |
|       2 |    2 | Ernst and Paula admire the sea; Hans warns that she has only seen it calm.                        |
|       3 |    0 | Paula says Mercator's atlas is published internationally and earns him 20,000 gold a month.       |
|       3 |    1 | Ernst regrets not finding Paula's homeland; Hans teases that the Captain would like her to stay.  |
|       3 |    2 | Paula lists the colors of the seas; Ernst asks Hans whether he has a dream.                       |

The draw uses the protagonist-scenario seed rebuilt before each dispatch
(`MAIN.EXE 0x3914A`) from the saved date, time of day, and Ernst's navigation
level and experience. It is therefore deterministic for a given saved state,
not a fresh unpredictable roll. Since each building visit advances the clock,
later Harbor visits usually select different conversations.

### Mercator in sections 2 and 3

- **Section 2**: the first visit with Mercator's contract active introduces
  Paula to Mercator (“Hey $n! Huh? Who's the girl?”). The conversation ends
  with his request for results and sets flag 0. Later visits use the short
  greeting “So Captain $n, have you got your sea legs yet?”
- **Section 3**: Mercator welcomes Ernst, Hans, and Paula and asks him to share
  his information.

In both sections, the contract check described
[above](#mercators-greeting-and-the-contract-check) takes precedence over the
greeting.

## Section 4: Zipangu and Paula's home (40,000 Fame)

Section 4 has five subsections. The primary table serves subsection 0, and
four nested tables at `0x0A3D`, `0x0B68`, `0x0D7B`, and `0x0F62` serve
subsections 1–4. Each of them repeats Mercator's contract route with a new
greeting.

### Stage sequence

| Stage            | Required action                                                                                            | What changes                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arm the finale   | With at least 40,000 Adventure Fame, visit a **Harbor** at a port with ID 43–99.                           | A random Paula/Hans conversation plays, as in sections 2–3, and flag 0 is set. There is no story announcement.                                                                                                                                  |
| Hans's dream     | Visit a **Harbor** at any regular port with ID 0–93.                                                       | Hans tells Ernst and Paula of his lifelong wish to see Zipangu, the golden country of Marco Polo. Paula suggests going. Subsection 1 begins.                                                                                                    |
| Asking the way   | Visit a **Harbor** at Zeiton, Macao, Hanoi, or Changan (IDs 94–97).                                        | Hans asks, “By any chance, is this land... Zipangu?” The harbor master says it is farther to the northeast. Sakai and Nagasaki become visible to the lookout. Subsection 2 begins.                                                              |
| Reach Zipangu    | Visit the **Harbor** in Sakai or Nagasaki (IDs 98–99).                                                     | The harbor master confirms that Zipangu is the westerners' name for his land. Event art (`EVENT4.DAT` record 4) shows it, but the country does not look golden. Changan becomes visible to the lookout. Flag 0 is set and Ernst is put outside. |
| Paula remembers  | In Sakai or Nagasaki, enter any building which has no specific route.                                      | Ernst notices that the people resemble Paula. She remembers a muddy, yellow “sea”. Flag 0 is cleared and subsection 3 begins.                                                                                                                   |
| The yellow river | In a port with ID 94–99, ask in buildings until someone names the Huang He, then visit a **Harbor** there. | A one-in-three draw supplies the Huang He clue; the Harbor conclusion shows event art (`EVENT4.DAT` record 1). Paula realizes her “sea” was a wide river. Subsection 4 begins.                                                                  |
| Paula's home     | Enter Changan's **special building**.                                                                      | Ernst's theme plays. Paula recognizes the building and event art (`EVENT4.DAT` record 3) shows it. Ernst begins, “Ah, you are Paula's...”, and the ending starts.                                                                               |

### Arming the finale

The subsection-0 Harbor route (`0x092D–0x0A3C`) is ordered as follows:

1. If flag 0 is set and the port ID is 93 or lower, Hans's Zipangu
   conversation plays and `F0` advances the subsection.
2. If flag 0 is set and the port ID is 94 or higher, nothing happens.
3. If flag 0 is clear, the route draws `EB 01 0003`. Ports below 43 stop
   there. At IDs 43–99, one of three conversations plays: Mercator's election
   to the Royal Academy; Hans teasing Ernst and Paula about a marriage oath; or
   another “we still haven't found Paula's homeland” exchange. Adventure Fame
   is then compared with 40,000; on success the route sets flag 0.

Passing 40,000 therefore takes one Harbor visit, and Hans's conversation
another. Because the test is made before the visit's own Fame comparison, the
same Harbor visit cannot do both. If Ernst is already in East Asia when the
section is armed, he must return to a Harbor west of Zeiton (ID 93 or lower)
before the Zipangu search begins.

### Harbor responses while searching for Zipangu

The Harbor route changes with the subsection and the port ID:

| Subsection | Port IDs | Harbor behavior                                                                                                                                                              |
| ---------: | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|          1 | 0–81     | Ordinary.                                                                                                                                                                    |
|          1 | 82–93    | Hans asks whether this is Zipangu; the harbor master answers, “No, it's most certainly not! Zipangu, I never heard of such a place!” No progress.                            |
|          1 | 94–97    | Hans asks; the harbor master says Zipangu is farther northeast. Sakai and Nagasaki are unhidden and the subsection advances.                                                 |
|          1 | 98–99    | Hans asks, but no answer follows and the subsection does not change.                                                                                                         |
|          2 | 0–93     | Ordinary.                                                                                                                                                                    |
|          2 | 94–97    | Hans asks; the harbor master says Zipangu is “a little farther northeast.” No progress.                                                                                      |
|          2 | 98–99    | The Zipangu arrival scene. It sets flag 0, unhides Changan, and ejects Ernst from the Harbor. Revisiting the Harbor replays the scene, since the route does not test flag 0. |

Ports 82–93 are Cochin through Bankao: India and Southeast Asia. Every Hans
question sets variable 63, so the ordinary Harbor greeting is skipped. Only the
subsection-2 arrival in Sakai or Nagasaki ejects Ernst.

The subsection-2 wildcard route (`0xA3FF`, `0x0CA8`) is the one that continues
the story. It requires flag 0 and a port ID of 98 or 99, so Ernst must first
see the arrival scene at a Sakai or Nagasaki Harbor and then enter another
building in either Japanese port. The resulting conversation does not set
variable 63 or eject Ernst; the building's ordinary greeting and menu follow.

### The yellow-sea clue

Subsection 3 is limited to ports with IDs 94–99: Zeiton, Macao, Hanoi,
Changan, Sakai, and Nagasaki.

- **Any building without a specific route** (`0x0F11`): Ernst asks about a
  yellow sea and is told, “A yellow sea? Never heard of it.” A draw of
  `EB 01 0003` equal to zero adds, “If it's a yellow river you're looking for
  though, that'd be the Huang He,” and gives its mouth as 37°N 120°E. That
  result sets flag 0.
- **Harbor with flag 0 clear** (`0x0E4B`): the same question and the same
  one-in-three draw. On a zero, the clue sets flag 0 and the conclusion follows
  in the same visit.
- **Harbor with flag 0 set**: the conclusion plays immediately. Ernst reflects
  that the yellow river is the only lead, and Hans asks whether they are near
  its mouth. Paula recalls that her “sea” always flowed one way, never had
  tides, and never smelled of salt. Ernst concludes that it was a very wide
  river, and Hans proposes going there. The route clears flag 0 and advances
  to subsection 4.

The draw is deterministic for a given saved state, as described for sections
2–3. Repeated building visits advance the clock and so usually reroll it.

### Changan and the ending

Subsection 4's table (`0x0F62`) contains four routes:

| Route    | Building                   | Behavior                                                                                                                                |
| -------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `0x2107` | Mercator's shop            | Greeting “I take it you have some new information for me.” and the contract check.                                                      |
| `0x6107` | Changan special building   | Plays music track 7 (Ernst's theme), Paula's recognition, and event art 3, then executes `F4 03`: Ernst's ending and exit to `END.EXE`. |
| `0x6103` | Changan Harbor             | `F8 F2`: ejects Ernst with no dialogue.                                                                                                 |
| `0x61FF` | Any other Changan building | `F2`: explicit no-op; ordinary behavior.                                                                                                |

The ending scene has no Fame, flag, item, or time condition. Its trailing `F1`
at `0x1067` is unreachable because `F4` never returns. In subsection 4 the
Changan Harbor cannot be used, so Ernst cannot set sail from Changan again;
the special building is always available to end the story.

Before subsection 4, Changan's special building has no `SNR4` route. It uses
the ordinary story-residence fallback, “Commodore, this building is locked.”
([buildings](../buildings.md)).

### Hidden East Asian ports

Mercator's opening scene sets bit `0x20` of port-record byte `+0x13` on
Changan, Sakai, and Nagasaki (port IDs 97–99). With that bit set, the ordinary
lookout scan never sights the port (`MAIN.EXE 0x36BF3`); it becomes known only
if Ernst enters it ([ports](../ports.md#known-and-visited-ports)). The story
clears the bit in stages:[^ernst-ports]

| Event                                                | Ports                    | Operation         |
| ---------------------------------------------------- | ------------------------ | ----------------- |
| Mercator's opening scene                             | Changan, Sakai, Nagasaki | `status \|= 0x20` |
| Section 4, subsection 1: “farther to the northeast”  | Sakai, Nagasaki          | `status &= 0xDF`  |
| Section 4, subsection 2: Zipangu arrival             | Changan                  | `status &= 0xDF`  |
| Section 4, subsection 3: the yellow-river conclusion | Changan                  | `status &= 0xD0`  |

None of these writes sets the known bit `0x10`. Each clue makes the port
eligible for ordinary sighting, but Ernst must still find it. As in João's
scenario, the final mask is broader than a pure `0x20` clear. It also clears
the low four bits, which include the cached controlling-nation index. Changan's
index then reads 0, Portugal, so anything that reads the cache counts Changan
as Portuguese: Lisbon's Palace, for example, lists it under the Far East with
0% Support. Its Support values are untouched. The next midnight, in port or at sea,
resets the index to 6, no controller, because no nation has 75% Support there
([Cached allegiance](../sphere-of-influence.md#cached-allegiance)).

[^ernst-ports]:
    The writes are at `SNR4.DAT 0x01FB–0x0222` (OR `0x20`), `0x0B47–0x0B60`
    (AND `0xDF` on records 98 and 99), `0x0C95–0x0CA0` (AND `0xDF` on record 97)
    and `0x0EFE–0x0F09` (AND `0xD0` on record 97). The untouched
    `raw/KOUKAI2.DAT` template gives all three ports status `0x06`. The normal
    sequence for Changan is therefore `0x06 → 0x26` at the start,
    `0x26 → 0x06` on arrival in Zipangu, and `0x06 → 0x00` at the yellow-river
    conclusion, unless the port has been sighted or entered in between. For
    Sakai and Nagasaki it is `0x06 → 0x26 → 0x06`.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Amsterdam ejects Ernst       | Mercator's shop (Amsterdam special building), then the Amsterdam Harbor                                                     |
| Map drawing or reports       | Ernst needs Cartography and an active cartographer contract; stay with Mercator to avoid the Fame-halving penalty           |
| 1,000 Fame                   | Report charts to Mercator, then visit the **Amsterdam** Harbor                                                              |
| 5,000 or 20,000 Fame         | Harbor at any port with ID 43 or higher (not Europe, the Mediterranean, the Black Sea, or Caracas)                          |
| 40,000 Fame                  | Harbor at a port with ID 43 or higher to arm, then a Harbor at a port with ID 93 or lower for Hans's Zipangu conversation   |
| Where is Zipangu?            | Harbor at Zeiton, Macao, Hanoi, or Changan, then the Harbor at Sakai or Nagasaki                                            |
| After arriving in Zipangu    | Any non-Harbor building in Sakai or Nagasaki                                                                                |
| The yellow sea               | Buildings in Zeiton, Macao, Hanoi, Changan, Sakai, or Nagasaki until the Huang He clue, then a Harbor in one of those ports |
| After the yellow-river clue  | Sail to Changan (up the Huang He, whose mouth is at 37°N 120°E) and enter its special building                              |

## Open questions

None remain.
