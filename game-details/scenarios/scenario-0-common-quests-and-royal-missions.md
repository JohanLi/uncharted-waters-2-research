# Scenario 0: Common quests and royal missions

Scenario 0 (`SNR0`) is shared by all six protagonists. It is not a seventh
character story. Its first six sections implement the idle state and the five
ordinary Guild assignments; its last seven sections implement missions offered
by the protagonist's ruler. The royal missions are gated by the protagonist's
**highest single Fame value** (Trade, Piracy, or Adventure) against the next
title's threshold; the Guild assignments have no Fame gate.

This document describes the shared scenario from the player's point of view.
It is based on the decoded `SNR0.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine. The individual royal missions
are described in the [royal mission catalog](./scenario-0-royal-missions.md).

Evidence labels have the meanings defined in [the scenario README](./README.md).
Message numbers are one-based `SNR0.MES` IDs unless a `MESSAGE.DAT` raw index is
named.

## Section map

| Section | Purpose                                           | Messages | Where it runs                                                |
| ------: | ------------------------------------------------- | -------: | ------------------------------------------------------------ |
|       0 | Idle state and assignment/royal-mission selection |     1–12 | Guild (`0xA306`), Palace (`0xA305`), any building (`0xA3FF`) |
|       1 | Transport Goods                                   |    13–54 | Market (`0xA300`)                                            |
|       2 | Buy Goods                                         |    55–78 | Market (`0xA300`)                                            |
|       3 | Deliver Letter                                    |    79–98 | Guild (`0xA306`)                                             |
|       4 | Defeat Pirates                                    |   99–110 | Guild; before and after naval battles (`0xA1FF`, `0xA2FF`)   |
|       5 | Collect Debt                                      |  111–142 | Venice Bank (`0x0D08`)                                       |
|       6 | Royal trading test                                |  143–154 | Palace audience; the capital's Market                        |
|       7 | Deliver documents between rulers                  |  155–185 | Palace audiences at home and at the destination capital      |
|       8 | Negotiate a treaty                                |  186–216 | Palace audiences at home and at the destination capital      |
|       9 | Establish allied ports                            |  217–227 | Palace audience                                              |
|      10 | Make discoveries for the ruler                    |  228–237 | Palace audience                                              |
|      11 | Special search mission                            |  238–244 | Palace audience; Guild, Pub, and landing (executable)        |
|      12 | Defeat a national fleet or pirates                |  245–272 | Palace audience; before and after naval battles              |

The shared scenario keeps its own section and subsection bytes (`DS:0x0EE2`
and `DS:0x0EE3`, save-slot-relative `0x00BA`–`0x00BB`), a 32-bit flag word
(`DS:0x0EE4`, slot-relative `0x00BC`), and its own variables (`DS:0x0EEC`
onward, two bytes per variable). An `F1` in any section 1–12 returns the shared
scenario to idle section 0, subsection 0, and clears all shared flags
(`MAIN.EXE 0x39055–0x3906D`); the executable, not the bytecode, selects the
nonzero sections.

The Guild assignment rewards also appear with the Fame they affect:

- [Trade Fame](../fame/trade-fame.md#guild-assignments)
- [Piracy Fame](../fame/piracy-fame.md#guild-assignments)

## Guild job list

Entering a Guild while the shared scenario is idle runs section 0's Guild route
(`SNR0 0x0066`) silently. If the protagonist is not eligible for a royal
mission (flag 16 clear, [below](#becoming-eligible-for-a-royal-mission)), the
route prepares three assignment rows (`0x0195–0x01E8`):

1. At port IDs 0–41 (Europe), each row is an independent `random(5)` draw.
   Values 0–4 select Transport Goods, Buy Goods, Deliver Letter, Defeat
   Pirates, and Collect Debt respectively. Duplicate rows are possible.
2. At port IDs 42 and above, all three rows are Deliver Letter.
3. The route saves a random-state checkpoint for each row (variables 3, 4,
   and 5) and computes the rank band `min(rank, 6) / 3` in variable 23: 0 for
   No Rank–Squire, 1 for Knight–Baron, 2 for Viscount–Duke.

While flag 16 is set, the Guild route takes the royal-selection path instead
and does not refresh the rows or the rank band; **Job Assignment** then lists
the rows last prepared. If flags 16 and 17 are both set, **Job Assignment**
shows the royal invitation instead of a list ([below](#the-invitation)).

**Job Assignment** (`MAIN.EXE 0x32E70`) displays the rows. Choosing one does
not switch sections directly. The executable writes `selector + 1` into the
shared subsection byte while the shared section is still 0 (`0x32F5C–0x32F61`),
copies the row's checkpoint from variable `3 + row` into variable 8
(`0x32F66`), and dispatches Guild qualifier `0x06` (`0x32F72`). The Old Guild
Worker's offer, messages 1–12, therefore runs in section 0. The offer sets
variable 6 to 0 on rejection or to the chosen section 1–5 on acceptance; if
the dispatch reports a handled route, the executable copies variable 6 into
the shared section (`0x32F80`) and clears the subsection. Rejecting returns to
the same list; accepting returns to the Guild's main menu with the assignment
active. Because each row restores its own checkpoint, choosing the same row
again produces the same offer.

Each offer restores its checkpoint and derives two ports from the Guild's port
`p` (`0x043B–0x0512` and the equivalent blocks for the other rows). A first
hop gives port `A = p ± d1`, and a second hop gives port `B = A ± d2`; the
direction is `random(2)` unless the bounds force it:

| Rank band      |  `d1` | Forced `+` / `−` for `A` |  `d2` | Forced `+` / `−` for `B` |
| -------------- | ----: | ------------------------ | ----: | ------------------------ |
| No Rank–Squire |   1–5 | `p ≤ 4` / `p ≥ 37`       |  1–20 | `A ≤ 19` / `A ≥ 80`      |
| Knight–Baron   |  6–10 | `p ≤ 9` / `p ≥ 32`       | 16–35 | `A ≤ 34` / `A ≥ 65`      |
| Viscount–Duke  | 16–20 | `p ≤ 19` / `p ≥ 22`      | 31–50 | `A ≤ 49` / `A ≥ 50`      |

For a Guild at ports 0–41, `A` always stays within 0–41; `B` can be any port
0–99. Higher ranks therefore receive longer routes. How each assignment uses
the two ports is given below.

| Assignment      | Port stored in variable 16 (report port) | Port stored in variable 17 |
| --------------- | ---------------------------------------- | -------------------------- |
| Transport Goods | `A`, the origin Market                   | `B`, the destination       |
| Buy Goods       | `A`, the head trader's Market            | unused                     |
| Deliver Letter  | `p`, the Guild that gave the job         | `p ± d2`, the addressee    |
| Defeat Pirates  | `p`, the Guild that gave the job         | unused                     |
| Collect Debt    | 13, Venice                               | replaced by the debtor     |

While any assignment is active (variable 6 below 6), **Job Assignment** shows a
reminder instead of a list: `MESSAGE.DAT` raw 931 at the variable-16 port, or
raw 338 naming that port elsewhere (`0x32E97–0x32ECE`). The Guild command flow
is also documented in [buildings.md](../buildings.md#guild-command-dialogue).

### Deadlines, give-up choices, and penalties

Every assignment stores its deadline as a day serial in variable 24:

```text
deadline = (years since 1501 × 12 + zero-based month + months allowed) × 30 + day
```

Each check computes the same serial for today (variable 25). The assignment is
late only when `deadline < today`, so the deadline day itself is on time. The
remaining-time line uses `deadline − today`: 0 gives “a few hours”, 1 gives
“1 day”, and larger values give the day count.

Unless noted otherwise, the Fame penalties round down to a multiple of ten:

| Event                                    | New Fame                                |
| ---------------------------------------- | --------------------------------------- |
| Giving up at a progress prompt           | `floor(floor(Fame / 10) × 9 / 10) × 10` |
| Expired assignment at its checking point | `floor(floor(Fame / 10) × 8 / 10) × 10` |
| Collect Debt: money not handed over      | `floor(floor(Fame / 10) × 5 / 10) × 10` |

Every completion award is capped at 50,000. See also
[Trade Fame](../fame/trade-fame.md#deadlines-and-failure).

## Transport Goods

Transport Goods is section 1. The Old Guild Worker asks the protagonist to
carry goods “from the port of `A` to `B`” (message 2); accepting sets section 1.

### Offer at the origin Market

The origin Market's route (`0x09CA`) runs only at port `A`. The Head Trader
chooses one of the first six listed-goods slots of that port's regional Market
definition (`+0x6E + random(6)`) and a base quantity:

```text
50 + 10 × random(10) lots
```

The script then reads the fleet's free cargo capacity (`EE`), multiplies it by
8, divides by 10 with integer truncation, and caps the offer:

```text
offered lots = min(base quantity, floor(free cargo capacity × 8 / 10))
```

If the capped result is zero, the trader says there is no room (message 14)
and the route stops without ejecting the player; the assignment stays in its
offer stage, so the player can return with space.

Rank controls the deadline, payment, and Trade Fame award:

| Rank band      | Deadline |   Gold | Trade Fame |
| -------------- | -------: | -----: | ---------: |
| No Rank–Squire |  1 month |  1,000 |        200 |
| Knight–Baron   | 2 months | 10,000 |        700 |
| Viscount–Duke  | 3 months | 30,000 |      1,500 |

Accepting (message 24) loads the cargo (`E2`), stores the deadline, and
advances to the active subsection. Rejecting (message 22) ends the assignment
(`F1`). Both eject the player (`F8`).

### Progress, delivery, and payment

1. **Destination Market, before delivery** (`0x0BBC`). The route runs on entry,
   before the ordinary menu. If the assignment is late, the trader refuses
   (message 54), Trade Fame falls to 80%, and the assignment ends. Otherwise
   the trader takes up to the remaining quantity of that commodity from the
   fleet (`E3`):
   - all remaining lots: “Thank you! Go and collect your payment at the port of
     `A`” (message 38); shared flag 0 records delivery, and the ordinary Market
     menu follows;
   - some lots: the remainder and time left are reported (messages 48–52), the
     assignment stays active, and the player is ejected;
   - none: “You didn't bring me …” with the time left and a give-up choice
     (messages 40–46); giving up costs 10% of Trade Fame and ends the
     assignment. The player is ejected either way.
2. **Origin Market, before delivery** (`0x0AC7`). If the assignment has
   expired, the trader says, “Your deadline has long since passed” (message 36)
   and ends the assignment **without** a Fame penalty. Otherwise he asks
   whether the goods have been transported, reports the time left, and offers
   a give-up choice (messages 28–34; giving up costs 10% of Trade Fame). The
   player is ejected either way.
3. **Origin Market, after delivery.** The trader pays the promised gold, adds
   the Trade Fame award, and ends the assignment (message 26). There is no
   deadline check on this return trip; lateness is judged at the destination.

The destination Market route does nothing once delivery is recorded.

### Building exit behavior

The bytecode uses `F8` after accepting or rejecting the cargo offer, after the
origin-Market progress and expiry paths, and after partial, empty, or late
destination visits, returning the player to the street. The zero-capacity
response, the successful destination delivery, and the final payment do not
contain `F8`, so the ordinary Market menu follows them.

## Buy Goods

Buy Goods is section 2. The Old Guild Worker sends the protagonist to the head
trader at port `A` (message 4).

### Offer at the head trader's Market

At port `A` the trader chooses a commodity by rank band and asks for the number
of lots that a fixed target sum buys at that Market's regional **sale base
price** `B` (the goods-indexed word of the Market definition; see
[Market definitions](../buildings.md#market-command-dialogue)), capped at 250
(`0x0D15–0x0D86`):

```text
lots = min(floor(target / B), 250)
```

| Rank band      | Deadline | Goods IDs (random)                                        | Target | Payment | Trade Fame |
| -------------- | -------: | --------------------------------------------------------- | -----: | ------: | ---------: |
| No Rank–Squire |  1 month | 32–37: Silver, Copper Ore, Tin Ore, Iron Ore, Art, Carpet |  1,000 |  11,000 |        200 |
| Knight–Baron   | 2 months | 26–31: Coral, Amber, Ivory, Pearl, Tortoise Shell, Gold   |  5,000 |  15,000 |        700 |
| Viscount–Duke  | 3 months | 0–9: Clove through Cacao                                  | 20,000 |  30,000 |      1,500 |

The offer (`D9` selector 0, `MESSAGE.DAT` raw 941, then message 56) promises the
target plus an advance. The advance is computed in variable 27 as the target,
or as `B × 250` rounded up to a multiple of 100 when the quantity was capped,
and is then compared with an immediate byte: `if advance < 16, keep it;
otherwise advance = 10,000` (`0x0D99–0x0D9E`). The comparison constant is
`0x10`, the low byte of 10,000 (`0x2710`), so **every advance becomes
10,000**. The Payment column is the target plus that 10,000. (**Decoded** as
executed; the intended rule was **Likely** a 10,000 cap.)

Accepting pays the 10,000 advance (message 60) and starts the deadline;
rejecting ends the assignment (message 58). Both eject the player.

### Delivery

On each later visit to the same Market (`0x0E03`):

- late: “I'm sorry, but you missed the deadline” (message 78); Trade Fame falls
  to 80% and the assignment ends. The advance is kept;
- all remaining lots carried: they are taken, the full payment and Trade Fame
  are awarded (message 62), and the ordinary menu follows;
- some lots carried: they are taken and the remainder reported (messages
  72–76);
- none carried: a reminder with the time left and a give-up choice (messages
  64–70). Giving up costs 10% of Trade Fame, deducts the 10,000 advance, and
  ends the assignment. The deduction (`E7`, `MAIN.EXE 0x37E41`) never makes
  gold negative: when the advance is at least the gold carried, gold is set
  to 0.

## Deliver Letter

Deliver Letter is section 3 and is the only job offered at ports 42 and above.
The letter must reach the Guild at port `p ± d2` within one month (messages
6–8); the fee is 700 gold and the award 50 Trade Fame.

Both ends are Guild entry routes (`0x0F7B`):

1. **Addressee's Guild.** On time: “Oh, is this the letter from …?” and “You can
   collect your payment at …” (messages 94–96), setting shared flag 1. Late:
   “This information is completely outdated” (message 98), setting flag 2. The
   player is ejected. Later visits do nothing.
2. **Commissioning Guild.** After an on-time delivery (flag 1) the fee and Trade
   Fame are paid (message 80). After a late delivery (flag 2) half the fee, 350,
   is paid and no Fame is awarded (message 82). With no delivery yet, an expired
   assignment costs 20% of Trade Fame (message 92); otherwise a reminder with
   the time left offers a give-up choice (messages 84–90, 10% penalty). Each
   ending returns the shared scenario to idle.

## Defeat Pirates

Defeat Pirates is section 4. The Old Guild Worker's offer (`D9` selector 5,
`MESSAGE.DAT` raw 946 and 957, then message 10) asks for a number of pirate
fleets within the same number of months:

| Rank band      | Pirate fleets | Deadline |   Gold | Piracy Fame |
| -------------- | ------------: | -------: | -----: | ----------: |
| No Rank–Squire |             1 |  1 month | 10,000 |         300 |
| Knight–Baron   |             2 | 2 months | 20,000 |         700 |
| Viscount–Duke  |             3 | 3 months | 30,000 |       1,500 |

Any pirate fleet anywhere counts; the Guild's “around here” is flavor text.

1. **Before a battle** (`0xA1FF`, `0x1121`): shared flag 3 is set only when the
   opposing captain's fleet ID (sailor byte `+0x24`, variable 60) divided by 10
   is 6, the pirate fleet block 60–69.
2. **After the battle** (`0xA2FF`, `0x113C`): if flag 3 is set and that
   captain's fleet byte is now `0xFF`, one fleet is counted (variable 19 falls by
   one). Flag 2 records whether that fleet was defeated after the deadline. The
   post-battle cleanup at `MAIN.EXE 0x1611F–0x16185` clears the fleet byte
   (through `0x15302`) when the enemy flagship is no longer an active ship or
   the protagonist won a duel; a fleet whose flagship fled keeps
   its captain and does not count (**Likely** outcome mapping; see
   [How a battle ends](../naval-battle.md#how-a-battle-ends)).
3. **The commissioning Guild** (`0x117D`): with every fleet defeated, the gold
   and Piracy Fame are paid (message 102), or half the gold and no Fame if the
   last fleet was defeated late (message 100). Otherwise an expired assignment
   costs 20% of Piracy Fame (message 110), and an unexpired one shows the time
   left (messages 104–108 before any kill, `D9` selector 6 afterwards) with a
   give-up choice costing 10% of Piracy Fame.

## Collect Debt

Collect Debt is section 5. The Old Guild Worker sends the protagonist to the
Marco Polo Bank in Venice (message 12). Its route is Venice-specific (port 13,
Bank qualifier `0x08`).

### Offer at the Venice Bank

The Bank chooses a debtor among sailors 79–119 (the
[vagabond](../sailors.md#permanent-vagabonds) range) by repeated
`79 + random(41)` draws, rejecting anyone whose current port byte (`+0x25`) is
`0xFF` (`0x12C6–0x12F8`):

| Rank band        | Debtor's port | Debt           | Deadline |   Gold | Trade and Piracy Fame |
| ---------------- | ------------- | -------------- | -------: | -----: | --------------------: |
| No Rank–Squire   | 0–41          | 5 Gold Ingots  |  1 month |  5,000 |              150 each |
| Knight or higher | 42 and above  | 10 Gold Ingots | 3 months | 20,000 |              500 each |

The banker names the debtor and the reward (messages 112–118). Rejecting ends
the assignment (message 120); accepting starts the deadline. Both eject the
player.

### Collection and hand-over

The debtor is met through the Pub (`MAIN.EXE 0x2C021`, documented under
[Pub command dialogue](../buildings.md#pub-command-dialogue)). The debtor pays
`variable 19 × 50,000` gold (announced as Gold Ingots) unless `random(100)`
exceeds the protagonist's Luck and `random(3)` is 0, in which case the debtor
escapes to a random port in the same half of the world. The Pub's Treat can
also report the debtor's port ([below](#pub-treat-outside-the-idle-state)).

Back at the Venice Bank (`0x13A0`):

- not yet collected: an expired assignment costs 20% of both Trade and Piracy
  Fame (messages 140–142); otherwise the time left is shown with a give-up
  choice (messages 132–138) that costs 10% of both;
- collected, but carried Gold Ingots below 5 or 10: “It doesn't look like you
  have the money with you” (messages 128–130). Trade Fame falls to 50%, Piracy
  Fame is unchanged, and the assignment ends;
- collected and carried: the Bank takes the 50,000 or 100,000 gold (message
  number 122) and pays the reward with both Fame awards (message 124), or half
  the reward and no Fame if the deadline has passed (message 126).

### Pub Treat outside the idle state

When the shared section is not 0, the Pub's **Treat** calls `MAIN.EXE 0x2B979`
instead of the royal-invitation test. During Collect Debt, or during the royal
special search once its informant is chosen, a patron names the sought
sailor's current port (`MESSAGE.DAT` raw 599–600) when
`sailor ID mod 3 = current port mod 3`.

## Becoming eligible for a royal mission

The following rule is **decoded** from Scenario 0 section 0 (`0x0066–0x00E4` in
the Guild route and `0x0306–0x0384` in the wildcard route):

1. Read the protagonist's Trade, Piracy, and Adventure Fame (Fame record words
   `+0`, `+2`, and `+4`).
2. Select the largest of the three individual values.
3. Calculate the threshold for the next title.
4. Set **flag 16** when the largest Fame is at least that threshold, the stored
   rank is at most 8, and the protagonist's affiliation (sailor byte `+0x29`,
   low three bits) is not 6, the Pirates.

Fame is therefore **not added together** for this check. For example, three
Fame values of 400 do not qualify a character with no title for a 500-point
threshold merely because their sum is 1,200. Any one of the values being 500
does qualify.

The threshold formula is:

```text
required Fame = 500 × (stored rank + 1)²
```

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

The executable also contains a `40,000` value in its title table
(`MAIN.EXE 0x474B8`), but that value does not govern royal-mission eligibility.
The Scenario 0 square formula makes **40,500** the effective requirement for
promotion from Marquis to Duke. Stored rank 9, Duke, fails the gate, so there
is no further promotion. Pirates cannot become eligible regardless of Fame.

The test runs whenever section 0 is idle and the protagonist enters a Guild
(`0xA306`) or any other building of a regular port except the Palace
(`0xA3FF`). It is recomputed from scratch each time, so flag 16 is cleared again
if the highest Fame falls below the threshold. The Palace route (`0xA305`) only
reads flag 16.

### Ties between Fame types

The maximum-finding loop replaces the current winner when the next Fame value
is equal, not only when it is greater. Because it scans Trade, then Piracy,
then Adventure, the priority is **Adventure, then Piracy, then Trade**.

Examples:

- Trade 2,000, Piracy 1,000, Adventure 1,500: Trade wins.
- Trade 2,000, Piracy 2,000, Adventure 1,500: Piracy wins.
- All three at 2,000: Adventure wins.

## The invitation

Eligibility (flag 16) does not by itself open a royal audience. A second flag,
**flag 17**, arms the invitation. Three executable paths react to the
eligibility state; none of them dispatches `SNR0`.

| Where                     | Conditions                                                                                           | Effect                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Harbor** entry          | shared section 0; flag 16 or 17 set; flag 18 clear; the port belongs to the protagonist's own nation | ruler message, then flag 17 set; the Harbor greeting is skipped |
| **Pub**, Treat command    | shared section 0; flag 16 or 17 set; flag 18 clear                                                   | ruler message after the patron's reply, then flag 17 set        |
| **Guild**, Job Assignment | shared section 0; flags 16 and 17 both set                                                           | ruler message instead of the job list; no state change          |

The ruler messages are `MESSAGE.DAT` raw `410 + nation`, for example:

> Did you know that King Manuel of Portugal is looking for you?

The Guild uses raw 410–413 for Portugal, Spain, the Ottoman Empire, and England
and raw 932, “Did you know that %s is looking for you.”, with the Governor-
General's title for Italy and Holland (`0x32ED8–0x32F11`).

Once armed, each further Harbor visit or Treat repeats the announcement until
the audience sets flag 18. The ordinary building entry that precedes the Harbor
menu or the Treat command has already refreshed flag 16 through the `0xA3FF`
route, so eligibility and arming can happen on the same visit.

Merely entering a Pub does **not** arm the mission. The player must choose
**Treat**. The patron's reply depends on the highest Fame: below 1,000
`MESSAGE.DAT` raw 36, “Thanks for treating me.”; below 5,000 raw 132, “What? You
are the famous …?”; otherwise raw 133:

> Wow, you, [name], will buy me the pub's specialty? I'm delighted!

The reply is chosen before, and independently of, the invitation test.

### Behind the scenes: Harbor and Treat arming

The Treat handler is `MAIN.EXE 0x2BAFA–0x2BC8C`. All three reply branches
converge at `0x2BBA4`, followed by the invitation test:

```asm
02BBA9  cmp  byte ptr [0x0EE2], 0     ; shared section 0? (else 0x2B979)
02BBBB  test byte ptr [0x0EE6], 0x03  ; flag 16 or flag 17 set?
02BBC0  je   0x02BBD5                 ; no: skip
02BBC2  test byte ptr [0x0EE6], 0x04  ; flag 18 set?
02BBC7  jne  0x02BBD5                 ; audience already started: skip
02BBC9  call 0x02BACB                 ; print MESSAGE.DAT raw 410 + nation
02BBCD  or   byte ptr [0x0EE6], 0x02  ; set flag 17
```

The Harbor's menu loop (`0x2E779–0x2E7C2`) makes the same three flag tests and
additionally requires the current port's nation (port display byte `+0x13`, low
three bits) to equal the protagonist's affiliation before printing raw
`410 + nation` and setting flag 17 at `0x2E7BD`. Supply ports use a separate
Harbor handler (`0x2E4E8`) without this test.

The scenario interpreter setup at `0x0390B9` points its 32-bit flag field at
`DS:0x0EE4`. Address `0x0EE6` is therefore the byte containing flags 16–23;
mask `0x01` is flag 16, `0x02` is flag 17, and `0x04` is flag 18. Arming
changes the saved shared flags from `0x00010000` to `0x00030000`.

Once armed, the invitation persists even if a later refresh clears flag 16:
**Meet Ruler** tests only flag 17.

### The audience

Only Amsterdam, Genoa, Istanbul, Lisbon, London, and Seville contain a Palace;
see [buildings](../buildings.md#port-availability). An untitled protagonist
who is not a Pirate is admitted to a Palace only in their own nation and only
while flag 17 or 18 is set (`MAIN.EXE 0x30A1E–0x30A5A`); the guard then says
`MESSAGE.DAT` raw 576:

> Commoners are usually not admitted here, but the King is interested in
> meeting with you.

**Meet Ruler** (`0x3044A`) proceeds as follows when the current port belongs to
the protagonist's nation and flag 17 is set (`0x30451–0x30487`):

1. It copies the cached mission section from variable 30 (`DS:0x0F28`) into the
   shared section byte, resets the subsection, and dispatches shared Palace
   context `0x05`.
2. That mission section's Palace route checks that the current port is the
   player fleet's home port (fleet byte `+0x26`) and that flag 17 is set. It
   clears flag 17, sets **flag 18**, and advances to the offer subsection
   (`F0`, then `F8`). The home port is the national capital in the new-game
   data, and **Defect** rewrites it to the capital where the defection happens
   (`0x305C3`).
3. The executable then dispatches audience context `0x15`, first to the
   protagonist's scenario and, unless that route suppresses the audience, to
   `SNR0`, where the ruler makes the offer.

Arming sets flag 17 without changing Fame or advancing a scenario section.

## How the mission family is chosen

Arming the royal invitation and selecting its mission are separate state
changes. The mission family is calculated by section 0's two eligibility
paths, the Guild route (`0xA306`) and the wildcard route (`0xA3FF`). Both
contain the same Fame, rank, eligibility, and mission-selection logic. They
cache the resulting section number in variable 30; variable 31 records the
corresponding random-state checkpoint.

The candidate is not continuously recalculated merely because the protagonist
remains eligible. The town dispatcher supplies the current port and
building context to `SNR0`. Guild entry uses context `0x06`; the Harbor, Pub,
Lodge, Market, Shipyard, and other ordinary contexts fall through to `0xA3FF`.
Both routes recalculate flag 16 and the candidate. `Treat` itself does not
dispatch `SNR0`. The Palace's specific context-5 route in section 0
(`0x01EC`) copies variables 30 and 31 into variables 6 and 8 while flag 16 is
set and recomputes the rank band, but does not recalculate the candidate; a
later armed **Meet Ruler** uses variable 30 as it stands.

Advancing the day is not itself a special mission-roll operation. It changes
the seed ([below](#why-the-calendar-day-predicts-the-mission)), and the next
applicable building entry caches the new result. A same-day refresh rebuilds
the same seed and repeats the same rolls, so it can change the candidate only
if another input, such as the highest Fame category, has changed.

For an eligible character, section 0 first calls `random(3)`:

| First roll | Highest Trade                      | Highest Piracy              | Highest Adventure                      |
| ---------: | ---------------------------------- | --------------------------- | -------------------------------------- |
|          0 | Common diplomatic sub-roll         | Common diplomatic sub-roll  | Common diplomatic sub-roll             |
|          1 | Royal trading test (section 6)     | Defeat a fleet (section 12) | Discoveries for the ruler (section 10) |
|          2 | Establish allied ports (section 9) | Defeat a fleet (section 12) | Special search (section 11)            |

On a first roll of zero, the game calls `random(2)`. Result zero selects
Deliver Documents (section 7), while result one selects Negotiate a Treaty
(section 8). Rank adds two exceptions:

- At **No Rank**, the diplomatic sub-roll result (1 or 2) replaces the first
  roll and is fed into the Fame-specialized selector. Highest Trade therefore
  gives sections 6 and 9 with equal probability, highest Piracy always gives
  section 12, and highest Adventure always gives section 10. No Rank receives
  no diplomatic or special-search mission. (An untitled protagonist would also
  be refused at a foreign Palace, [above](#the-audience).)
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

These are the base probabilities while both Adventure families remain usable.
The Adventure branch also compares two counters with **exact** values
(`0x03CA–0x042A`):

- variable 40, the number of completed special searches, with 7; and
- the number of discovery records whose flags satisfy `flags & 0xB0 = 0x30`
  (selected for this game, found, and already reported to a collector or a
  ruler) with 50, the number of discoveries a game contains.

At Squire or higher, a count of exactly seven completed special searches
redirects a non-diplomatic Adventure roll to section 7, and exactly 50 reported
discoveries redirect it to section 8. If both hold, section 8 wins. At No Rank
or Page, either single condition redirects that branch to section 7, and both
together produce section 6. Some of these low-rank combinations cannot arise
through ordinary promotion, but this is the bytecode's exact behavior.

### Why the calendar day predicts the mission

Scenario 0 does not consume an unpredictable, continuously evolving random
stream for this choice. Immediately before interpreting a shared scenario
route, `MAIN.EXE` rebuilds its 32-bit seed from saved character and date
fields (`0x38FF4–0x3904B`):

```text
date seed = ((year - 1501)
             * (month - 1)
             * (navigation level + navigation experience)
             + (day - 1)) << 8
```

The arithmetic wraps to 32 bits. The multiplication uses the date bytes in
their saved, zero-based form and the current protagonist's navigation level
(sailor byte `+0x1C`) and two-byte navigation-experience field (`+0x1E`). The
seed does **not** include the time of day. In January or in 1501 the product is
zero and only the day remains.

Each random call (`0x37F4F–0x37FA1`) then performs:

```text
state = state * 0x5D588B65 + 1       # modulo 2^32
value = (state >> 8) & 0x7FFF
result = value % bound
```

Because the seed is rebuilt for every shared dispatch, unrelated random events
do not make the royal selection drift. With the same date, navigation level,
navigation experience, Fame winner, rank, and discovery state, a candidate
refresh is deterministic. Changing the day normally changes the next refreshed
result; changing navigation level or experience can change it too. Visiting a
building at a different time on the same day does not.

A worked example evaluates these formulas for a Squire-or-higher protagonist
whose highest Fame is Adventure and whose navigation level plus navigation
experience is 220:

| Date         |         Seed |                       Random value(s) | Resulting section              |
| ------------ | -----------: | ------------------------------------: | ------------------------------ |
| May 19, 1522 | `0x00484200` |                       `22538 % 3 = 2` | Special search (11)            |
| May 20, 1522 | `0x00484300` | `25455 % 3 = 0`, then `22614 % 2 = 0` | Deliver Documents (7)          |
| May 21, 1522 | `0x00484400` |                       `28372 % 3 = 1` | Discoveries for the ruler (10) |

The date is part of the seed rather than a direct calendar-to-quest lookup.

## Acceptance, completion, and refusal

Every royal mission promises a new title (“bestow upon you a royal title” at No
Rank, “give you a new title” otherwise). The rules below are **decoded** from
sections 6–12:

- Completing a royal mission raises the stored rank (Fame record byte `+0x0D`)
  by one, announces the new title (`D9` selector 4, `MESSAGE.DAT` raw 945), and
  ends the mission with `F1`, which also clears flags 16–18.
- Royal missions award no Fame. The special search pays 100,000 gold, and the
  two diplomatic missions raise national Relations; the other missions pay
  nothing besides the title.
- Rejecting an offered mission, or later telling the ruler that you are giving
  up, divides each of Trade, Piracy, and Adventure Fame by two, discarding any
  remainder (49,999 becomes 24,999), and ends the mission.
- There is no calendar deadline. Sections 6–12 read no date and make no
  deadline comparison.
- Losing one's title through the same-nation naval **shame** or **exile**
  branch resets the shared scenario to section/subsection `0/0` and clears
  shared flags 16–18 (`MAIN.EXE 0x1602F–0x16035`). This does **not** use the
  refusal/give-up penalty and leaves all three Fame totals unchanged. The
  reset is unconditional, so it cancels an active Guild assignment as well as
  a royal invitation or mission. Exile additionally changes affiliation to
  Piracy; shame retains the existing national affiliation. See
  [friendship.md](../friendship.md#same-nation-targets).

## Evidence locations

- `SNR0.DAT` `0x0066–0x01EB`: Guild-entry route; Fame scan, threshold, flag 16,
  mission family, job rows (`0x0195–0x01E8`), and rank band.
- `SNR0.DAT` `0x01EC–0x0305`: Palace-entry route; copies variables 30 and 31
  into 6 and 8 and computes the rank band.
- `SNR0.DAT` `0x0306–0x0432`: wildcard `0xA3FF` refresh. The flag-16 writes are
  at `0x036F` and `0x0381`; the primary `random(3)` draw is at `0x0388`, the
  `random(2)` diplomatic sub-roll at `0x0391`, and the checkpoint and section
  conversion at `0x042D–0x042F`.
- `SNR0.DAT` `0x043B–0x09BB`: the five Old Guild Worker offers.
- `SNR0.DAT` sections 1–5 (`0x09BC–0x15CB`): the assignments.
- `SNR0.DAT` sections 6–12 (`0x15CB–0x2DDD`): Palace gates, offers, progress
  checks, refusal penalties, completion, and title awards.
- `MAIN.EXE` `0x32E70–0x32F9C`: Job Assignment, active-job reminders, and the
  armed-invitation message.
- `MAIN.EXE` `0x38FF4–0x3904B`: shared-scenario date/navigation seed.
- `MAIN.EXE` `0x37F4F–0x37FA1`: scenario random-number step and bounded
  remainder.
- `MAIN.EXE` `0x39055–0x3906D`: return to idle after a shared section change.
- `MAIN.EXE` `0x020A1B–0x020A31`: town-context matching and dispatch into the
  shared scenario.
- `MAIN.EXE` `0x30451–0x30487`: armed `Meet Ruler`; copy variable 30 into the
  shared section, reset the subsection, and dispatch context `0x05`.
- `MAIN.EXE` `0x30A1E–0x30A5A`: untitled Palace admission.
- `MAIN.EXE` `0x02BAFA–0x02BC8C`: Treat; the ruler-message helper call is at
  `0x02BBC9` and the flag-17 write at `0x02BBCD`.
- `MAIN.EXE` `0x2E779–0x2E7C2`: Harbor arming.
- `MAIN.EXE` `0x0390B9`: scenario-interpreter flag-base setup, identifying
  `DS:0x0EE4` as flag 0.
- `MAIN.EXE` `0x474B8`: the ten-value title threshold table.
- `MESSAGE.DAT` raw 410–415 and 932: ruler “looking for you” messages; raw 576:
  commoner Palace admission; raw 36, 132, 133: Treat replies.
- `DATA1.016` and `DATA1.017`: the nine displayed title names.

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **Loading goods (`E2`, `MAIN.EXE 0x37BF7`).** The script's goods and quantity
  are spread over the fleet's ships in slot order. A ship takes part only when
  it is active (slot status `+0x08 & 0x30` equal to `0x10`) and has free space,
  meaning cargo capacity minus water/10, food/10, lumber, shot and its five
  goods amounts. On each ship, a cargo slot already holding the same goods is
  preferred; otherwise the first empty slot is used, and a ship with neither is
  skipped. The ship receives the lesser of the remaining quantity and its free
  space. Whatever the fleet cannot hold is dropped without a message. The
  Market's Buy instead
  takes the first slot that is empty or holds the same goods, in index order.
- **Unloading goods (`E3`, `MAIN.EXE 0x37CFA`).** Delivery removes the goods
  front to back: ship 0 first, and on each active ship every cargo slot
  holding that goods, until the requested amount is met. A slot that empties is
  freed. The variable then receives the amount of that goods still aboard, so
  a request of 0 only counts it.

## Design notes

These behaviors are fully decoded; only the designers' intent is unknown.

- **Unused port computation on the Palace route.** Section 0's Palace route
  (`0x0231–0x0303`) repeats the Transport Goods offer's two-hop port
  computation (`0x0440–0x0511`, same instructions and length; only the jump
  targets differ). It lacks the offer's opening instructions, so it starts
  from a stale variable 7 and draws before restoring the random state, and it
  restores the state at the end (`0x0303`, `EC 08`) just before stopping. No
  code reads the variables it writes before they are overwritten. Job
  Assignment, the Pub patrons, Treat and the Waitress's Job Info read
  variables 16 and 17 only while a shared section is active, and sections 6–12
  write them first or never read them. The restored random state is also
  discarded, because every scenario run reseeds it from the date
  (`MAIN.EXE 0x39048`). The block therefore has no visible effect and appears
  to be a leftover copy of the offer code.

## Open questions

None remain; the last ones are answered in [Engine notes](#engine-notes) and
[Design notes](#design-notes).
