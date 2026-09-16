# Scenario 0: Common quests and royal missions

Scenario 0 (`SNR0`) is shared by all six protagonists. It is not a seventh
character story. Its first six sections implement ordinary Guild assignments;
its last seven sections implement missions offered by a ruler.

## Section map

| Section | Purpose                                           | Messages |
| ------: | ------------------------------------------------- | -------: |
|       0 | Idle state and assignment/royal-mission selection |     1–12 |
|       1 | Transport Goods                                   |    13–38 |
|       2 | Buy Goods                                         |    39–66 |
|       3 | Deliver Letter                                    |    67–90 |
|       4 | Defeat Pirates                                    |   91–117 |
|       5 | Collect Debt                                      |  118–142 |
|       6 | Royal trading test                                |  143–154 |
|       7 | Deliver documents between rulers                  |  155–185 |
|       8 | Negotiate a treaty                                |  186–216 |
|       9 | Establish allied ports                            |  217–227 |
|      10 | Make discoveries for the ruler                    |  228–237 |
|      11 | Special search mission                            |  238–244 |
|      12 | Defeat a national fleet or pirates                |  245–272 |

The ordinary assignments and their rewards are documented with the Fame they
affect:

- [Trade Fame](../fame/trade-fame.md#guild-assignments)
- [Piracy Fame](../fame/piracy-fame.md#guild-assignments)

## Becoming eligible for a royal mission

The following rule is **decoded** from Scenario 0 section 0:

1. Read the protagonist's Trade, Piracy, and Adventure Fame.
2. Select the largest of the three individual values.
3. Calculate the threshold for the next title.
4. Make a royal mission available when the largest Fame is at least that
   threshold.

Fame is therefore **not added together** for this check. For example, three
Fame values of 400 do not qualify a character with no title for a 500-point
threshold merely because their sum is 1,200. Any one of the values being 500
does qualify.

The threshold formula is:

```text
required Fame = 500 × next stored rank²
```

For a character whose current stored rank is `r`, this is equivalently
`500 × (r + 1)²`.

| Current title | Current rank | Next title | Required highest Fame |
| ------------- | -----------: | ---------- | --------------------: |
| No Rank       |            0 | Page       |                   500 |
| Page          |            1 | Squire     |                 2,000 |
| Squire        |            2 | Knight     |                 4,500 |
| Knight        |            3 | Baronet    |                 8,000 |
| Baronet       |            4 | Baron      |                12,500 |
| Baron         |            5 | Viscount   |                18,000 |
| Viscount      |            6 | Earl       |                24,500 |
| Earl          |            7 | Marquis    |                32,000 |
| Marquis       |            8 | Duke       |                40,500 |

The executable also contains a `40,000` value in its title table, but that value
does not govern royal-mission eligibility. Live testing confirms the square
formula used by Scenario 0: at Marquis rank, neither Harbor nor Treat announces
the ruler's invitation at 40,000 highest Fame, while both do at **40,500**.
Therefore 40,500 is the effective requirement for promotion to Duke.

The decoded gate also rejects stored rank 9, so Duke is the highest title and
there is no further promotion. It rejects the pirate nation/group (`6`) as
well. Live testing confirms that a protagonist belonging to the Pirates never
receives the ruler-is-looking-for-you message. Pirates therefore cannot become
eligible for a royal mission, regardless of Fame.

### Ties between Fame types

The maximum-finding loop replaces the current winner when the next Fame value
is equal, not only when it is greater. Because it scans Trade, then Piracy,
then Adventure, the priority is **Adventure, then Piracy, then Trade**. This is
both decoded and confirmed in live play: equal values in all three Fame fields
produce the Adventure mission family.

Examples:

- Trade 2,000, Piracy 1,000, Adventure 1,500: Trade wins.
- Trade 2,000, Piracy 2,000, Adventure 1,500: Piracy wins.
- All three at 2,000: Adventure wins.

## The invitation

The general message file contains six nation-specific Harbor/Pub rumors:

> Did you know that King Manuel of Portugal is looking for you?

Equivalent strings exist for Spain, the Ottoman Empire, England, Italy, and
Holland. The Palace guard has a separate message:

> Commoners are usually not admitted here, but the King is interested in
> meeting with you.

The invitation and the actual mission use two separate saved flags. The save
comparison described below establishes this flow:

1. Reach the required Fame for the next title.
2. The shared scenario evaluates the Fame/rank conditions and sets **flag 16**.
   The character is now eligible, but the royal mission is not yet armed.
3. Either visit the **Harbor**, or enter a Pub and use **Treat**. The game
   announces that the character's ruler is looking for them and sets **flag
   17**, arming the mission.
4. Visit the Palace in the character's national capital. The selected royal
   mission section checks flag 17 before proceeding to the ruler's offer.

Merely entering a Pub does **not** arm the mission. The player must select
**Treat** and complete the treat interaction. A random patron first responds
with dialogue such as:

> Wow, you, [name], will buy me the pub's specialty? I'm delighted!

The patron then reports that the ruler "is looking for you." Runtime testing
confirms that this sequence arms the royal mission just like a Harbor visit.

#### Behind the scenes: Treat arming

The Treat handler is `MAIN.EXE` `0x02BAFA`–`0x02BC8C`. It first finds the
largest of the current character's three Fame values, but this calculation is
only used to choose the patron's reaction:

|  Highest Fame | Treat response                          |
| ------------: | --------------------------------------- |
|   Below 1,000 | MESSAGE.DAT 36                          |
|   1,000–4,999 | MESSAGE.DAT 132                         |
| 5,000 or more | MESSAGE.DAT 133, the delighted response |

All three response branches converge at `0x02BBA4`. The royal-invitation check
therefore runs after Treat regardless of which patron response was selected;
message 133 is not itself the eligibility test. Treat also does not recompute
the title-dependent Fame requirement. It consumes the eligibility state that
Scenario 0 prepared earlier.

For the royal path, the handler checks the shared scenario state as follows:

```asm
02BBA9  cmp  byte ptr [0x0EE2], 0     ; shared section must be 0
02BBBB  test byte ptr [0x0EE6], 0x03  ; flag 16 or flag 17 set?
02BBC0  je   0x02BBD5                 ; no eligibility/invitation: skip
02BBC2  test byte ptr [0x0EE6], 0x04  ; flag 18 set?
02BBC7  jne  0x02BBD5                 ; mission offer already started: skip
02BBC9  call 0x02BACB                 ; print ruler-is-looking-for-you message
02BBCD  or   byte ptr [0x0EE6], 0x02  ; set flag 17
```

The helper at `0x02BACB` reads the current character's nationality, adds 410,
and prints the corresponding nation-specific ruler message from MESSAGE.DAT
410–415. The instruction that actually arms the mission is:

```asm
02BBCD  or byte ptr [0x0EE6], 0x02
```

The scenario interpreter setup at `0x0390B9` points its 32-bit flag field at
`DS:0x0EE4`. Address `0x0EE6` is therefore the byte containing flags 16–23;
mask `0x01` is flag 16, `0x02` is flag 17, and `0x04` is flag 18. Consequently,
the final `or` changes the saved shared flags from `0x00010000` to
`0x00030000`. Flag 16 remains set, flag 17 becomes set, and a later Palace
visit can enter the chosen mission's offer section. Once flag 18 is set, Treat
no longer repeats this arming path.

The shared SNR0 route table contains a wildcard regular-port handler which
evaluates the underlying eligibility state. That evaluation is distinct from
the interaction-specific Harbor/Treat arming transition performed outside the
currently decoded SNR0 flag writes.

Only Amsterdam, Genoa, Istanbul, Lisbon, London, and Seville contain a Palace.
See [buildings](../buildings.md#port-availability).

### Controlled save-state evidence

A controlled comparison captured Otto in London immediately before and after
visiting the Harbor:

| Field                |           Before Harbor |            After Harbor |
| -------------------- | ----------------------: | ----------------------: |
| Trade Fame           |                   8,000 |                   8,000 |
| Piracy Fame          |                       0 |                       0 |
| Adventure Fame       |                       0 |                       0 |
| Character scenario   | section 0, subsection 1 | section 0, subsection 1 |
| Shared SNR0 scenario | section 0, subsection 0 | section 0, subsection 0 |
| Shared SNR0 flags    |            `0x00010000` |            `0x00030000` |

The shared scenario state starts at slot-relative offset `0x00BA`; its flags
are the little-endian 32-bit value at `0x00BC`. Therefore:

- the pre-Harbor state has flag 16 set and flag 17 clear;
- the post-Harbor state retains flag 16 and adds flag 17; and
- none of Otto's Fame values changes.

The protagonist-specific scenario state at `0x0030` is byte-for-byte unchanged.
Two shared VM work variables also change as the Harbor handler runs. The
remaining differences are the expected clock, town-position, and moving
fleet/NPC changes caused by forty minutes of play. The persistent SNR0 control
change is the addition of shared flag 17; neither scenario's section or
subsection advances yet.

A second controlled comparison around Pub Treat produced the identical shared
flag transition, `0x00010000 → 0x00030000`. Otto's Fame and both scenario
section/subsection pairs remained unchanged. This confirms that completing
Treat adds flag 17 just as visiting the Harbor does.

Every royal mission section (6–12) begins with the same Palace gate: it checks
flag 17, clears it, sets flag 18, and advances to the mission-offer subsection.
That repeated check connects the save change directly to royal-mission arming.

## How the mission family is chosen

Arming the royal invitation and selecting its mission are separate state
changes. The mission family is calculated by either of section 0's two
eligibility paths: the specific Guild route (`A306`) or the wildcard route for
regular ports (`A3FF`). Both contain the same Fame, rank, eligibility, and
mission selection logic. They cache the resulting section number in scenario
variable 30; variable 31 records the corresponding random-state checkpoint.

The candidate is not continuously recalculated merely because the protagonist
remains eligible. The general town dispatcher supplies the current port and
building/context ID to SNR0. A Guild visit uses `A306`; Harbor, Pub/Treat,
Lodge, Market, Shipyard, and other ordinary contexts fall through to `A3FF`.
Both routes recalculate flag 16 and the candidate. The Palace's specific
context-5 route does neither before consuming an armed mission.

Advancing the day is not itself a special mission-roll operation. It changes
the seed, and the following applicable town/building dispatch caches the new
result. A same-day refresh normally appears to do nothing because rebuilding
the same seed produces the same numeric rolls. It becomes visible if another
input—such as the highest Fame category—has been edited or otherwise changed.

An armed Palace visit is different. `MAIN.EXE` reads cached variable 30 from
`DS:0x0F28`, writes it directly to the shared scenario's current-section byte,
resets the subsection, and dispatches that mission's Palace route. It does not
reread Fame or rerun the family selector first. Consequently, editing Fame and
going straight to the Palace preserves the previously cached mission. A
subsequent Harbor, Treat, or applicable day/town update refreshes variable 30
from the edited Fame and may change the offer.

For a character who already has a title, section 0 first calls `random(3)`:

| First roll | Highest Trade                      | Highest Piracy              | Highest Adventure                      |
| ---------: | ---------------------------------- | --------------------------- | -------------------------------------- |
|          0 | Common diplomatic sub-roll         | Common diplomatic sub-roll  | Common diplomatic sub-roll             |
|          1 | Royal trading test (section 6)     | Defeat a fleet (section 12) | Discoveries for the ruler (section 10) |
|          2 | Establish allied ports (section 9) | Defeat a fleet (section 12) | Special search (section 11)            |

On a first roll of zero, the game calls `random(2)`. Result zero selects
Deliver Documents (section 7), while result one selects Negotiate a Treaty
(section 8). Rank adds two important exceptions:

- At **No Rank**, the diplomatic sub-roll is fed back into the Fame-specialized
  selector. Highest Trade therefore gives sections 6 and 9 with equal
  probability, highest Piracy always gives section 12, and highest Adventure
  always gives section 10. No Rank receives no diplomatic or special-search
  mission.
- At **Page**, the diplomatic roll works normally, but both nonzero Adventure
  rolls select section 10. Special search is unavailable.
- At **Squire or higher**, the table above applies without a rank override.

The resulting base probabilities are:

| Rank band        | Highest Fame | Section 6 | Section 7 | Section 8 | Section 9 | Section 10 | Section 11 | Section 12 |
| ---------------- | ------------ | --------: | --------: | --------: | --------: | ---------: | ---------: | ---------: |
| No Rank          | Trade        |       1/2 |         — |         — |       1/2 |          — |          — |          — |
| No Rank          | Piracy       |         — |         — |         — |         — |          — |          — |          1 |
| No Rank          | Adventure    |         — |         — |         — |         — |          1 |          — |          — |
| Page or higher   | Trade        |       1/3 |       1/6 |       1/6 |       1/3 |          — |          — |          — |
| Page or higher   | Piracy       |         — |       1/6 |       1/6 |         — |          — |          — |        2/3 |
| Page             | Adventure    |         — |       1/6 |       1/6 |         — |        2/3 |          — |          — |
| Squire or higher | Adventure    |         — |       1/6 |       1/6 |         — |        1/3 |        1/3 |          — |

These are the base probabilities when the relevant search families remain
usable. The Adventure branch also compares the special-search completion
counter with seven and the qualifying-discovery count with 50. At Squire or
higher, seven completed special searches redirect a non-diplomatic Adventure
roll to section 7; 50 qualifying discoveries redirect it to section 8. If both
limits have been reached, section 8 wins. At No Rank or Page, reaching either
single limit redirects that branch to section 7; reaching both produces the
otherwise unusual section-6 fallback. Some of these low-rank exhaustion states
cannot arise through ordinary promotion play, but this is the bytecode's exact
behavior.

### Why the calendar day predicts the mission

Scenario 0 does not consume an unpredictable, continuously evolving random
stream for this choice. Immediately before dispatching a shared scenario
route, `MAIN.EXE` reconstructs its 32-bit seed from saved character and date
fields:

```text
date seed = ((year - 1501)
             * (month - 1)
             * (navigation level + navigation experience)
             + (day - 1)) << 8
```

The arithmetic wraps to 32 bits. The multiplication uses the date bytes in
their saved, zero-based form and the current protagonist's navigation level
and two-byte navigation-experience field. The shared-scenario seed does
**not** include the time of day.

Each random call then performs:

```text
state = state * 0x5D588B65 + 1       # modulo 2^32
value = (state >> 8) & 0x7FFF
result = value % bound
```

Because the seed is rebuilt when the shared route is dispatched, unrelated
random events do not make the royal selection drift. With the same date,
navigation level, navigation experience, Fame winner, rank, and discovery
state, a candidate refresh is deterministic. Changing the day normally
changes the next refreshed result; changing navigation level or experience can
change it too. Merely visiting the Palace at a different time on the same day
does not refresh or alter the cached candidate.

A controlled Adventure-tie sequence illustrates the calculation:

| Date         |         Seed |                       Random value(s) | Resulting section              |
| ------------ | -----------: | ------------------------------------: | ------------------------------ |
| May 19, 1522 | `0x00484200` |                       `22538 % 3 = 2` | Special search (11)            |
| May 20, 1522 | `0x00484300` | `25455 % 3 = 0`, then `22614 % 2 = 0` | Deliver Documents (7)          |
| May 21, 1522 | `0x00484400` |                       `28372 % 3 = 1` | Discoveries for the ruler (10) |

These were the candidates cached by section 0 on the listed dates and later
consumed by the Palace. This explains why repeating the sequence from the same
state on the same in-game day produces the same mission. The date is part of
the seed, rather than a direct calendar-to-quest lookup.

## Acceptance, completion, and refusal

Every royal mission promises a new title. The success paths invoke the same
title-award operation and the dialogue announces the new title. The supported
player-facing rule is therefore:

- **Confirmed/decoded:** completing a royal mission raises the stored rank by
  one title.
- **Decoded:** royal missions do not award ordinary Fame; their principal
  reward is the promotion. Diplomatic missions can separately change national
  Relations.
- **Confirmed/decoded:** rejecting an offered mission, or later telling the
  ruler that you are giving up, divides each of Trade, Piracy, and Adventure
  Fame by two. This is a much more serious consequence than simply losing the
  invitation.
- **Likely:** there is no calendar deadline. The royal mission dialogue and
  decoded paths contain progress checks and an explicit give-up choice, but no
  Guild-style deadline text or identified deadline comparison.

The halving operation applies independently to all three Fame fields and
discards any remainder. Fame therefore rounds down for positive odd values:
49,999 becomes 24,999 in each category.

## Evidence locations

- `SNR0.DAT` section 0 (`0x0306` onward): maximum-Fame scan, next-rank square
  calculation, eligibility gate, random/category selection, and royal section
  choice.
- `SNR0.DAT` `0x00CF`–`0x00E3`: flag-16 calculation in the Guild route;
  `0x036F`–`0x0383` is the same calculation in the `A3FF` route.
- `SNR0.DAT` `0x0388`: the primary `random(3)` mission-family draw;
  `0x0391` is the `random(2)` diplomatic sub-roll.
- `SNR0.DAT` `0x042D`–`0x0432`: save the random-state checkpoint, convert the
  result to a royal section number, and end the `A3FF` refresh handler.
- `MAIN.EXE` `0x038FF3`–`0x03904D`: shared-scenario date/navigation seed
  construction.
- `MAIN.EXE` `0x037F4F`–`0x037FA1`: scenario random-number step and bounded
  remainder.
- `MAIN.EXE` `0x020A1B`–`0x020A31`: general town-context matching and
  dispatch into the shared scenario.
- `MAIN.EXE` `0x03046B`–`0x030487`: on an armed Palace visit, copy cached
  variable 30 (`DS:0x0F28`) into the current shared section (`DS:0x0EE2`),
  reset its subsection, and dispatch the mission.
- `SNR0.DAT` sections 6–12: offers, progress checks, refusal penalties,
  completion, and title awards.
- `MAIN.EXE` file offset `0x474B8`: the ten-value title threshold table.
- `MAIN.EXE` file offsets `0x02BAFA`–`0x02BC8C`: Treat logic; the ruler-message
  helper call is at `0x02BBC9` and the flag-17 write is at `0x02BBCD`.
- `MAIN.EXE` file offset `0x0390B9`: scenario-interpreter flag-base setup,
  identifying `DS:0x0EE4` as flag 0.
- `MESSAGE.DAT` messages 410–415: ruler-specific "looking for you" rumors.
- `MESSAGE.DAT` message 133: the delighted patron response during Treat.
- `MESSAGE.DAT` message 932: the generic "[ruler] is looking for you" report.
- `MESSAGE.DAT` message 576: commoner Palace admission for a royal audience.
- `DATA1.016` and `DATA1.017`: the nine displayed title names.
- Controlled Harbor and Pub Treat save comparisons: both change the shared
  flags from `0x00010000` to `0x00030000` without changing Fame or scenario
  progression.
