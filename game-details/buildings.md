# Buildings

Every regular port stores twelve building-coordinate slots in
`raw/ZA_DAT.DAT`. A missing building is encoded as either `(0, 0)` or
`(255, 255)`. The names and order below come from the twelve-entry building
list in `raw/MENU.DAT`; this is the meaning of the numeric keys emitted in each
port's `buildings` object by `scripts/ports/index.ts`.

The game clock advances in 20-minute ticks. Closing times in this table are
exclusive endpoints: a building that closes at 8:00 PM can still be entered at
7:40 PM, and one that closes at 4:00 AM can still be entered at 3:40 AM.

|  ID | Building              | Opening hours                       |
| --: | --------------------- | ----------------------------------- |
|   1 | Market                | 4:00 AM-8:00 PM                     |
|   2 | Pub                   | 8:00 AM-4:00 AM                     |
|   3 | Shipyard              | 4:00 AM-8:00 PM                     |
|   4 | Harbor                | 24 hours                            |
|   5 | Lodge                 | 24 hours                            |
|   6 | Palace                | 4:00 AM-8:00 PM                     |
|   7 | Guild                 | 4:00 AM-8:00 PM                     |
|   8 | Special NPC residence | 24 hours                            |
|   9 | Bank                  | 4:00 AM-8:00 PM                     |
|  10 | Item Shop             | 2:00 AM-3:00 AM and 8:00 AM-8:00 PM |
|  11 | Church or Mosque      | 4:00 AM-midnight                    |
|  12 | House of Fortune      | 4:00 PM-midnight                    |

IDs 1-5 and 7 occur in all 100 regular ports. Supply ports use their own
shared map and have only a Harbor as an interactive facility.

## Greetings and menus

The following are the ordinary greetings in the English DOS data. A story
event, hostile-port state, prior relationship, or access check can replace
one of them. Menu spelling and capitalization are copied from `raw/MENU.DAT`.

|  ID | Building                         | Ordinary opening dialogue                                                                                                                | Main menu                                                       |
| --: | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
|   1 | Market                           | "How may I help you?"                                                                                                                    | Buy Goods; Sell Goods; Invest; Market Rate                      |
|   2 | Pub                              | "Hey sailor, you'll like our [specialty]!"                                                                                               | Recruit Crew; Dismiss Crew; Treat; Meet; Waitress; Gamble       |
|   3 | Shipyard                         | "What brings you to this shipyard?"                                                                                                      | New Ship; Used Ship; Repair; Sell; Remodel; Invest              |
|   4 | Harbor                           | "Ahoy there, matey, will ye be shoving off?"                                                                                             | Sail; Supply; Moor                                              |
|   5 | Lodge                            | "Welcome. You must be tired. Please make yourself at home."                                                                              | Check In; Gossip; Port Info                                     |
|   6 | Palace                           | Access-dependent; a commoner is told, "Commoners are not permitted to enter the palace. Remove yourself from the premises."              | Meet Ruler; Defect; Gold; Ship; Secret Call (event-only)        |
|   7 | Guild                            | "What do you want?"                                                                                                                      | Job Assignment; Country Info                                    |
|   8 | Collector                        | "May I help you?"                                                                                                                        | Contract; Discovery; Rumor                                      |
|   8 | Cartographer                     | "May I help you?"                                                                                                                        | Contract; Learn Skills; Report; Locate                          |
|   8 | Skill teacher or story residence | Person- and event-dependent                                                                                                              | Usually a dialogue or Yes/No prompt rather than a standing menu |
|   9 | Bank                             | "Welcome to the central office of the Marco Polo Bank." in Amsterdam; "Welcome to our regional branch of the Marco Polo Bank." elsewhere | Deposit; Withdraw; Borrow; Repay                                |
|  10 | Item Shop                        | "May I help you?"                                                                                                                        | Buy; Sell                                                       |
|  11 | Church                           | "Welcome to our church."                                                                                                                 | Pray; Donate                                                    |
|  11 | Mosque                           | "Welcome to our mosque."                                                                                                                 | Pray; Donate                                                    |
|  12 | House of Fortune                 | "Welcome to the House of Fortune. What do you want to know?"                                                                             | Life; Career; Love; Mates                                       |

### Executable entry-message mapping

Market, Pub, Shipyard, Harbor, Lodge, Guild, Bank, Item Shop, Church, and House
of Fortune all enter with the vendor image and message in the upper panel while
the main menu is already selectable. Their handlers call the message helper
and then proceed directly to the menu loop; they do not call the acknowledge
helper between those operations.

The Palace is different. Its greeting is displayed alone and passed through
the acknowledge helper at `MAIN.EXE 0x30AB0`; only afterward does the handler
construct and show the Palace menu. The greeting remains visible behind the
menu.

The entry messages map to `MESSAGE.DAT` as follows. Indices are raw,
zero-based indices; entry numbers are included to make prose citations
unambiguous.

| Building or branch                    | Message raw index (entry) | Message-call offset | Selection and substitutions                                                                                                  |
| ------------------------------------- | ------------------------: | ------------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| Market                                |            0 (1) or 1 (2) |           `0x2B023` | Below 1,000 Trade Fame it uses “How may I help you?”; otherwise “Hello, %s %s!” with the protagonist's first and last names. |
| Pub                                   |                   18 (19) |           `0x2D499` | `%s` is the port's Pub specialty.                                                                                            |
| Shipyard                              |                   77 (78) |           `0x329EE` | Fixed.                                                                                                                       |
| Harbor                                |                   56 (57) |           `0x2DD5E` | Fixed; other Harbor modes contain equivalent call sites.                                                                     |
| Lodge                                 |                   66 (67) |           `0x2EB5D` | Fixed.                                                                                                                       |
| Palace, titled admission              |                 444 (445) |           `0x30A9C` | `%s %s` is the protagonist's title and last name.                                                                            |
| Palace, invited commoner              |                 576 (577) |           `0x30AAA` | Fixed Palace Guard line.                                                                                                     |
| Palace, rejected commoner             |                   84 (85) |           `0x30A60` | Acknowledged, then returns outside without a menu.                                                                           |
| Palace, hostile reception             |                 443 (444) |           `0x30A08` | Uses the protagonist's names and diverts into the hostile Palace path.                                                       |
| Guild                                 |                   85 (86) |           `0x332FC` | Fixed.                                                                                                                       |
| Bank, Amsterdam                       |                   97 (98) |           `0x2F166` | Selected when current port ID is 13.                                                                                         |
| Bank, regional branch                 |                   98 (99) |           `0x2F17D` | Selected at every other Bank.                                                                                                |
| Item Shop                             |                 235 (236) |           `0x2FCC6` | Fixed on every reachable open-hours entry.                                                                                   |
| Church                                |                   91 (92) |           `0x32C67` | Computed as `91 + 712 × mosque`; Church uses zero.                                                                           |
| Mosque                                |                 803 (804) |           `0x32C67` | The same computation uses one for a Mosque.                                                                                  |
| House of Fortune                      |                 298 (299) |           `0x33534` | Fixed.                                                                                                                       |
| Special residence, generic            |                 477 (478) |           `0x339F2` | “May I help you?”                                                                                                            |
| Special residence, recognized visitor |                 478 (479) |           `0x339E4` | Uses the protagonist's first and last names.                                                                                 |

The House of Fortune's **Career** command reports the current protagonist's
remaining Navigation and Battle experience. Its exact threshold formula and
the two experience systems are documented in [levels.md](levels.md).

Religious rejection uses the same upper-panel helper but does not enter the
menu. A Muslim entering a Church receives raw index 90 (entry 91), while a
Christian entering a Mosque receives raw index 802 (entry 803). The executable
computes the normal Church/Mosque greeting dynamically, which is why neither
greeting appears as a literal direct-reference row in the generated call-site
inventory.

### Item Shop command dialogue

The Item Shop handler begins at `MAIN.EXE 0x2FC9A`. **Buy** dispatches to
`0x2F9CC`, and **Sell** dispatches to `0x2FB03`. Both commands contain an
internal item-selection loop. Cancelling that loop returns to the Item Shop's
two-command menu; leaving the main menu returns outside without an additional
farewell.

**Buy** uses these `MESSAGE.DAT` raw indices:

| Condition or stage              | Raw index (entry) | Result                                                                                                                                     |
| ------------------------------- | ----------------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| No gold                         |         236 (237) | “It seems you have no gold.” The command ends.                                                                                             |
| All 20 inventory slots occupied |         237 (238) | The command ends.                                                                                                                          |
| First item selection            |         238 (239) | “I'm sure you'll find something you like.”                                                                                                 |
| Later item selections           |         242 (243) | “Are you interested in anything else?”                                                                                                     |
| Duplicate restricted item       |         332 (333) | “You already have one.” The executable applies this only to item types whose low type nibble is below 7.                                   |
| Selected item                   |         240 (241) | Supplies the item name and its price in gold, then asks for confirmation.                                                                  |
| Insufficient gold               |         239 (240) | The purchase is not performed.                                                                                                             |
| Confirmed purchase              |                 — | Deducts the price, puts the item in the first empty inventory slot, then repeats with the “interested in anything else?” selection prompt. |

**Sell** uses this sequence:

| Condition or stage            | Raw index (entry) | Result                                                                                                                     |
| ----------------------------- | ----------------: | -------------------------------------------------------------------------------------------------------------------------- |
| No carried items              |         243 (244) | “You don't have any items.” The command ends.                                                                              |
| First item selection          |         244 (245) | “What would you like to sell?”                                                                                             |
| Later item selections         |         248 (249) | “What else can you sell me?”                                                                                               |
| Item is currently equipped    |         333 (334) | It cannot be sold.                                                                                                         |
| Item is not accepted by shops |         929 (930) | “Sorry, but I can't buy this item.”                                                                                        |
| Initial offer                 |         245 (246) | Supplies the item name and the base sale price. Accepting sells immediately.                                               |
| Successful counteroffer       |         246 (247) | Rejecting the initial offer performs a Luck-based roll. Success produces a higher offer; failure returns to the item list. |

Raw index 247 (“I'll take it for %ld gold pieces.”) is adjacent to the sale
messages but is not referenced by this Item Shop sell routine. A confirmed
sale adds the agreed price, subject to the on-hand-gold cap, removes the item,
and repeats the selection loop.

### Bank command dialogue

The four Bank commands are separate routines: **Deposit** at `0x2EBF2`,
**Withdraw** at `0x2ED63`, **Borrow** at `0x2EE8F`, and **Repay** at
`0x2EFF9`. The main handler begins at `0x2F146`. Each command returns to the
Bank menu. Leaving that menu displays raw index 164 (entry 165), “Thank you for
choosing Marco Polo Bank,” and waits for acknowledgement before returning
outside.

The account is treated as one signed balance: positive values are savings,
zero is an empty account, and negative values are debt.

| Command  | Branch or stage                         |        Raw index (entry) | Substitution or continuation                                             |
| -------- | --------------------------------------- | -----------------------: | ------------------------------------------------------------------------ |
| Deposit  | On-hand gold is at most 1,000           |                100 (101) | Refuses the deposit.                                                     |
| Deposit  | Savings have reached 1,000,000          |                101 (102) | Refuses the deposit.                                                     |
| Deposit  | Account is in debt                      |                102 (103) | Requires repayment first.                                                |
| Deposit  | Existing positive savings               |                103 (104) | Supplies the current balance.                                            |
| Deposit  | Empty account                           |                104 (105) | “You don't have any gold in your account.”                               |
| Deposit  | Amount prompt                           |                105 (106) | Maximum is limited by on-hand gold and remaining account capacity.       |
| Deposit  | Positive amount entered                 |                106 (107) | Supplies the deposited amount, then raw index 103 shows the new balance. |
| Withdraw | Account is empty or in debt             |                104 (105) | The command ends.                                                        |
| Withdraw | Less than 100 gold of carrying room     |                107 (108) | Refuses because the protagonist already has enough gold.                 |
| Withdraw | Amount prompt                           |                108 (109) | Maximum is the positive savings balance.                                 |
| Withdraw | Result would exceed 600,000,000 on hand |                109 (110) | Refuses the withdrawal.                                                  |
| Withdraw | Valid amount                            |                110 (111) | Supplies the amount, then raw index 103 shows the remaining savings.     |
| Borrow   | Account contains savings                |                111 (112) | Refuses a loan while savings remain.                                     |
| Borrow   | Rank/debt credit test fails             |                113 (114) | “With your poor credit history...”                                       |
| Borrow   | At least 1,000,000 gold already on hand |                112 (113) | Refuses because the loan is unnecessary.                                 |
| Borrow   | Eligible                                |                114 (115) | Shows the calculated credit line.                                        |
| Borrow   | Amount prompt                           |                115 (116) | Maximum is the calculated credit line.                                   |
| Borrow   | Positive amount entered                 |  116, then 117 (117–118) | Shows the loan amount and the 10% monthly-interest warning.              |
| Repay    | Account is not in debt                  |                118 (119) | “You don't owe us any money.”                                            |
| Repay    | Existing debt                           |                149 (150) | Supplies the current debt as a positive amount.                          |
| Repay    | Amount prompt                           |                119 (120) | Maximum is limited by the debt and on-hand gold.                         |
| Repay    | Positive amount entered                 |                120 (121) | Confirms payment.                                                        |
| Repay    | Debt remains                            | 149, then 117 (150, 118) | Shows the remainder and repeats the interest warning.                    |
| Repay    | Debt cleared                            |                382 (383) | Confirms that the debt is fully paid.                                    |

### Church and Mosque command dialogue

The shared religious-building menu begins at `MAIN.EXE 0x32C3C`. Its message
indices are computed as `church index + 712 × mosque`, allowing the same code
to select the paired Christian and Muslim text. **Pray** begins at `0x32AA8`;
**Donate** begins at `0x32AF0`. Both return to the Pray/Donate menu.

| Stage                  | Church raw index (entry) | Mosque raw index (entry) | Continuation or effect                                                                                       |
| ---------------------- | -----------------------: | -----------------------: | ------------------------------------------------------------------------------------------------------------ |
| Pray                   |                  92 (93) |                804 (805) | Displays the prayer. The first Pray command during a visit also adds a random 0 or 1 to Luck, capped at 100. |
| Donation amount prompt |                  93 (94) |                805 (806) | Accepts an amount up to all on-hand gold.                                                                    |
| Smaller donation       |                  94 (95) |                806 (807) | Selected when `floor(gold before donation / donation) > 10`.                                                 |
| Large donation         |                  95 (96) |                807 (808) | Selected when `floor(gold before donation / donation) <= 10`.                                                |
| Leave the building     |                  96 (97) |                808 (809) | Displays a farewell, waits for acknowledgement, then returns outside.                                        |

Attempting **Donate** with no gold instead clears to a system-message layout
and displays raw index 28 (entry 29), “We have no gold!” A zero donation simply
returns to the menu. A positive donation is deducted immediately. If it is at
least `(random(5) + 1) × 100` gold, the routine also calculates
`Luck − floor(gold before donation / donation) + 11`, capped at 100. Unlike
Pray's one-roll-per-visit guard, this calculation is performed for each
positive donation.

### Market command dialogue

The Market main handler begins at `MAIN.EXE 0x2AFD1`. **Buy Goods** begins at
`0x2A6DB`, **Sell Goods** at `0x2A8C4`, **Invest** at `0x2ABC7`, and
**Market Rate** at `0x2AFA5`. Buy Goods delegates its selection and transaction
work to the larger routine at `0x2A336`. Cancelling a command returns to the
four-command Market menu; leaving that menu returns outside without a farewell.

**Buy Goods** constructs its selection list from the current port's stock.
The first screen uses raw index 3 (entry 4), “What are you looking for today?”,
and raw index 406 (entry 407) as the goods/rate heading. Selecting a commodity
then follows this dialogue:

| Stage or condition               |   Raw index (entry) | Continuation                                                                            |
| -------------------------------- | ------------------: | --------------------------------------------------------------------------------------- |
| Commodity is unavailable         |               4 (5) | Supplies the goods name and returns to the list.                                        |
| Commodity is the local specialty |               5 (6) | Supplies its name and identifies it as the specialty.                                   |
| Quantity prompt                  |              9 (10) | Supplies the goods name; the input is limited by stock, cargo room, and available gold. |
| Ordinary price confirmation      |           150 (151) | Supplies the goods name and per-lot price.                                              |
| Mate's price assessment          |       23–25 (24–26) | Classifies the price as a bargain, expensive, or acceptable.                            |
| Insufficient gold                |             22 (23) | The purchase is not performed.                                                          |
| Counteroffer prompt              |               6 (7) | Supplies the highest permitted offer.                                                   |
| Offer is much too low            |             11 (12) | Rejects the offer.                                                                      |
| Seller makes a counteroffer      |             12 (13) | Supplies the revised unit price.                                                        |
| Unprofitable attempted trick     |           851 (852) | Rejects the offer and supplies the lowest still-profitable price.                       |
| Successful negotiated price      | 10 or 852 (11, 853) | Accepts directly or yields with a revised price.                                        |

The negotiation is part of the same commodity-selection loop. A completed
purchase deducts the total price, adds the lots to the selected fleet's cargo,
updates the port's remaining stock, and returns to the goods list.

**Sell Goods** first compacts the fleet's cargo list and displays raw indices
407 and 408 (entries 408–409) as its `Goods / Load / Rate` table and row
format. If no saleable goods remain, raw index 21 (entry 22) ends the command.
Otherwise, the selected quantity is removed, its proceeds are added to
on-hand gold, the port's stock and rate are updated, and the revised list is
shown again. Cancelling the cargo list returns to the Market menu.

**Invest** distinguishes the Market's commercial power from the Shipyard's
industrial power, but shares the same dialogue and reward thresholds with the
Shipyard command:

| Condition or amount                | Raw index (entry) | Result                                                         |
| ---------------------------------- | ----------------: | -------------------------------------------------------------- |
| Current port is a national capital |             2 (3) | Supplies the port and nation names; investment is unavailable. |
| Relevant power has reached 50,000  |             7 (8) | Refuses further investment.                                    |
| Investment is available            |             8 (9) | Opens the amount input.                                        |
| No gold is available               |           28 (29) | Ends the command.                                              |
| Zero entered                       |           13 (14) | “Come back again.”                                             |
| 1–499 gold                         |           14 (15) | “What? Is this all?! Thanks for nothing!”                      |
| 500–9,999 gold                     |           15 (16) | “Thank you very much.”                                         |
| At least 10,000 gold               |           16 (17) | “I won't forget your generosity.”                              |

The entered amount is capped by the remaining room below 50,000. A positive
investment deducts the gold, changes the port's relevant power and
sphere-of-influence distribution, and refreshes the associated market or
shipyard state.

**Market Rate** builds a ten-goods working list, then displays the present
port's commodity information in successive tables. Raw index 151 (entry 152)
supplies a commodity category and its price index; raw index 379 (entry 380)
is the repeated `Goods / Sells at / Buys at` heading. Acknowledging the last
table returns to the Market menu.

### Pub command dialogue

The Pub main handler begins at `MAIN.EXE 0x2D410`. Its six commands are
**Recruit Crew**, **Dismiss Crew**, **Treat**, **Meet**, **Waitress**, and
**Gamble**. The executable initializes the available patrons and waitress
before displaying the menu, so several commands operate on a port-dependent
character list rather than on fixed text alone.

**Recruit Crew** begins at `0x2B68A` and delegates its prompts and random
recruitment result to `0x2B16D`. It refuses when the fleet already has enough
sailors (raw index 29, entry 30) or when fewer than 10 gold pieces are available
(raw index 30, entry 31). Otherwise it may warn that drinks are needed to
attract recruits (raw 31), ask whether to recruit (raw 32), and call for sailors
(raw 33). The result is one of:

- raw index 121 (entry 122), with the full number rounded up;
- raw index 122 (entry 123), with only part of the requested number; or
- raw index 123 (entry 124), when nobody comes forward.

The amount and cost prompts use raw indices 124 and 125 (entries 125–126).
The number who respond is calculated from the port and protagonist state; it
is not a fixed textual choice.

**Dismiss Crew** begins at `0x2B739` and delegates assignment to `0x2B50E`. It
enumerates the fleet's ships and captains, using `MESSAGE2.DAT` raw indices
396–400 (combined indices 1396–1400) for the captain, Navigation, Lookout,
Combat, and minimum-crew display. Raw index 857 (entry 858) asks how many
sailors to assign to each ship. If this leaves sailors unassigned, raw index
858 (entry 859) asks whether to discharge them; raw index 231 (entry 232) is
the direct dismissal confirmation. Rejecting a confirmation resumes assignment
rather than leaving the Pub.

**Treat** begins at `0x2BC8D`; its Fame and invitation logic occupies
`0x2BAFA–0x2BC8C`. Its Fame-dependent thanks and the possible royal-invitation
side effect are described under the shared scenario and royal mission
mechanics. This command has no scenario-dispatch call: the invitation test is
executable code, and the command returns to the Pub menu afterward.

**Meet** uses the patron-selection loop rooted at `0x2C6E2`. Selecting a
patron opens the character menu `Treat / Gossip / Hire / Duel`. Its dialogue
depends on whether the patron is a mate, an employed captain, a wandering
navigator, or an ordinary sailor.

| Interaction or condition                  |      Raw indices | Meaning                                                                               |
| ----------------------------------------- | ---------------: | ------------------------------------------------------------------------------------- |
| Ordinary introduction                     |            41–43 | Sailor, named captain, or vagabond introduction.                                      |
| Personal specialty                        |          46, 139 | Introduces a skill possessed by the navigator.                                        |
| Navigator rumor                           |          570–571 | Names a navigator and port, or reports that the port has no capable sailors.          |
| Recruitment invitation and wage           |          48, 142 | Offers a place, then supplies the requested monthly wage.                             |
| Role-, ship-, or experience-based refusal | 49, 140–141, 145 | Rejects employment.                                                                   |
| Accepted or declined offer                |          143–144 | Ends the hire attempt and returns to the selected patron's menu.                      |
| No useful recruit                         |               39 | Ends the selection when no eligible navigator is present.                             |
| Map owner or Bank debt collector          |          604–614 | Runs the map sale or debt-collection interaction instead of the ordinary patron menu. |

The same patron can therefore expose different dialogue and submenu commands;
`Meet` is not merely a random-greeting command.

**Waitress** begins at `0x2D102`. Raw index 146 (entry 147) names the port's
waitress and requests a 10-gold tip; raw index 147 refuses the interaction if
the protagonist cannot pay. Once paid, it opens `Tell Stories / Give Gift /
Investigation / Ask Info`:

- **Tell Stories** selects a discovery and uses raw indices 312–320 for the
  waitress's subject-dependent reaction.
- **Give Gift** selects an eligible item and uses raw indices 321–325 for her
  reaction or reward. Raw indices 330–331 cover having no acceptable gift.
- **Investigation** and **Ask Info** assemble answers from the requested
  captain, fleet objective, port, commodity, discovery, or mission state.
  Their sentences are composed from reusable fragments such as raw indices
  398–403 and 540–553 rather than from one fixed transcript.

The tip is charged before the four-command waitress menu. Leaving a nested
selection returns through that menu and then to the main Pub menu.

**Gamble** begins at `0x2D249`. With no gold it displays `MESSAGE2.DAT` raw
index 10 (combined index 1010), “I don't deal with paupers.” Otherwise it
opens the Black Jack/Dice game selector and hands control to the two gambling
engines. `MESSAGE2.DAT` raw indices 0–9 contain the gambler's invitations,
win/loss reactions, replay prompts, and responses to quitting. Those messages
belong to the gambling engine rather than to the ordinary Pub speaker loop.

### Shipyard command dialogue

The Shipyard main handler begins at `MAIN.EXE 0x329B0`. Before its greeting
and menu, it checks the hostile-building state and can instead display raw
index 249 (entry 250) and eject the protagonist. The six ordinary commands are
**New Ship**, **Used Ship**, **Repair**, **Sell**, **Remodel**, and **Invest**.

**New Ship** begins at `0x31D15`; its design-and-order routine begins at
`0x31A70`. The preliminary path may refuse because this port builds no new
ships (raw index 251, entry 252) or the protagonist already has the maximum
number of owned ships (raw 377). Raw index 252 opens the eligible ordering
path. Its construction sequence is:

| Stage                          | Raw index (entry) | Continuation                           |
| ------------------------------ | ----------------: | -------------------------------------- |
| Select model                   |         253 (254) | Confirms the chosen model.             |
| Select hull material           |         254 (255) | Opens the material list.               |
| Confirm current design         |         255 (256) | Follows the displayed ship statistics. |
| Configure crew bunks           |         258 (259) | Numerical capacity input.              |
| Configure gun space            |         259 (260) | Numerical capacity input.              |
| Confirm capacity configuration |         260 (261) | Accepts or returns to configuration.   |
| Confirm calculated price       |         256 (257) | Supplies the complete ship price.      |
| Place order                    |         257 (258) | Begins construction.                   |
| Construction time              |         262 (263) | Supplies the required number of days.  |

Construction completion is building-entry preprocessing, not another New Ship
menu selection. Before the due date raw index 261 reports the days remaining.
Once ready, raw index 250 announces the ship, raw index 263 asks whether to add
it to the fleet, and raw indices 264–265 cover leaving it in the dock. Fleet
and dock capacity can instead invoke the ship-limit and swap-ship paths.

**Used Ship** begins at `0x31DE9`; its price-negotiation helper begins at
`0x317FD`. Raw indices 193–194 select a ship and show its price. Rejecting the
listed price opens raw index 195's offer prompt; a mate may supply raw 196's
estimated minimum. Raw indices 197–198 reject unacceptable offers, while raw
863 accepts a negotiated price. A completed purchase uses raw index 199 and
immediately asks for the ship's name.

**Repair** begins at `0x31EE4`. Raw index 204 reports that the selected ship
already needs no work. Otherwise raw index 205 supplies the repair cost and
asks for confirmation; raw 206 follows a refusal, and raw 207 reports
insufficient gold. Completion uses `MESSAGE2.DAT` raw index 47 (combined index
1047), “This ship is in tiptop shape.”

**Sell** begins at `0x31FF1` and uses this guarded sequence:

| Condition or stage            | Raw index (entry) | Continuation                                                   |
| ----------------------------- | ----------------: | -------------------------------------------------------------- |
| Only the flagship exists      |         208 (209) | Refuses the command.                                           |
| Ship selection                | 200–201 (201–202) | Selects and confirms the ship.                                 |
| Selected ship is the flagship | 209–210 (210–211) | Requires confirmation and selection of a replacement flagship. |
| Cargo remains aboard          |         211 (212) | Requires confirmation before discarding it.                    |
| Crew remains aboard           |         212 (213) | Requires confirmation before dismissing them.                  |
| Sale offer                    |         213 (214) | Supplies the price and asks for final confirmation.            |
| Sale declined                 |         214 (215) | Returns to ship selection.                                     |

**Remodel** begins at `0x3263D` and opens `Figurehead / Guns / Load Capacity /
Rename`. Figurehead and Guns begin at `0x32344` and `0x32410`; Load Capacity
and Rename begin at `0x324C9` and `0x3259B`.

| Subcommand       | Principal messages | Behavior                                                                                                   |
| ---------------- | -----------------: | ---------------------------------------------------------------------------------------------------------- |
| Figurehead       |            266–269 | Announces the selection, chooses a ship and figurehead, then supplies the installed price.                 |
| Guns             |  266, 270–272, 334 | Chooses a ship and gun type, reports remaining capacity, accepts a quantity, and supplies the total price. |
| Guns unavailable |   `MESSAGE2` 20–21 | Distinguishes a full gun allocation from a ship model that cannot carry guns.                              |
| Load Capacity    |            273–274 | Chooses a ship, previews the cargo-capacity change, and supplies its price.                                |
| Rename           |           273, 275 | Chooses a ship and opens the name-entry control.                                                           |

Paid remodels use raw index 207 when on-hand gold is insufficient. Each
subcommand owns its ship-selection loop; cancelling it returns to the Remodel
menu, and cancelling Remodel returns to the main Shipyard menu.

**Invest** begins at `0x328A3`. It applies the same 50,000 cap and message
thresholds as Market Invest, but tests and changes the port's industrial power.
Its internal recalculation helpers begin at `0x3269F` and `0x327C3`; those are
not separately selectable commands.

Some commands lead to another menu. `Moor`, for example, opens `Store`,
`Commission`, and `Exchange`; `Remodel` opens `Figurehead`, `Guns`,
`Load Capacity`, and `Rename`. The Pub's `Meet` and `Waitress` commands likewise
open character-specific submenus.

Building entry and menu commands are separate dispatch points. Controlled
shared-quest captures establish the following examples:

- Transport Goods delivery runs as the destination Market is entered, before
  the ordinary menu. Complete delivery then exposes the menu; partial delivery
  suppresses it and returns the player outside.
- A Guild first shows its ordinary greeting and main menu. Assignment dialogue
  begins only after `Job Assignment` and a listed job are selected. Accepting
  returns to the main menu, whereas rejecting returns to the job list.
- Royal-mission progress at a Palace is evaluated through `Meet Ruler`, not by
  entry alone. A hostile Palace reception is an earlier entry check and can
  eject the player before the menu or audience action becomes available.

The command-to-scenario mapping is narrower than the visible menus suggest.
After a job is chosen, `Job Assignment` invokes shared scenario context
`current port + 0x06`, reusing the Guild qualifier. `Treat` invokes no scenario
route; its invitation behavior is implemented directly in the executable.
`Meet Ruler` dispatches shared Palace context `0x05`, followed by protagonist
and shared audience context `0x15`. No other menu command has a scenario
matcher or dispatcher call site.

For the ordinary buildings eligible for hostile-country encounters, scenario
entry hooks run first. The dispatcher calls shared and protagonist scenario
matching at `MAIN.EXE 0x20A1B–0x20A4C`, evaluates their returned menu-control
values, and reaches the hostile path at `0x20A70` only if interaction may
continue. An `F8` result therefore normally prevents the later hostile check.
A non-ejecting story route does not: it can be followed by either a hostile
confrontation or the ordinary greeting and menu, depending on the random
gates. The Lodge is an explicit exception: its branch at `0x20A61` continues
into hostile processing even after `F8`. A controlled Trebizond visit therefore
showed João's `F8`-ending story conversation, the hostile-port warning, and the
ordinary Lodge menu in sequence after the confrontation roll missed. At the
same story stage, ejecting routes in other eligible buildings stop before the
hostile check.

The Palace's **Defect** entry is enabled only at a foreign capital and only
when no royal invitation, offer, or accepted royal mission is active. Its
complete predicate is documented under
[Defection](friendship.md#when-the-command-is-available).

The Palace's initial admission check is separate from its menu mask. After the
Palace-specific hostile-reception check, an untitled character is rejected
only if all four conditions hold: the Palace is foreign, the character is not
affiliated with the Pirates, shared flag 17 is clear, and shared flag 18 is
clear. A title, one's own capital, Pirate affiliation, an armed royal
invitation, or an offer already in progress therefore passes this gate. The
check occupies `MAIN.EXE 0x30A1B–0x30A68`; rejection begins at `0x30A5B`.

### Vendor portraits and dialogue panels

Ordinary building greetings use a fixed 136×112 vendor image from
`GRAPH.DAT`. Zero-based records 6–17 correspond directly to displayed building
IDs 1–12: the portrait record is normally `building ID + 5`. The
religious-building routine substitutes record 20 for a Mosque.

|  ID | Building              | `GRAPH.DAT` record | Extracted filename      |
| --: | --------------------- | -----------------: | ----------------------- |
|   1 | Market                |                  6 | `graph-006-136x112.png` |
|   2 | Pub                   |                  7 | `graph-007-136x112.png` |
|   3 | Shipyard              |                  8 | `graph-008-136x112.png` |
|   4 | Harbor                |                  9 | `graph-009-136x112.png` |
|   5 | Lodge                 |                 10 | `graph-010-136x112.png` |
|   6 | Palace                |                 11 | `graph-011-136x112.png` |
|   7 | Guild                 |                 12 | `graph-012-136x112.png` |
|   8 | Special NPC residence |                 13 | `graph-013-136x112.png` |
|   9 | Bank                  |                 14 | `graph-014-136x112.png` |
|  10 | Item Shop             |                 15 | `graph-015-136x112.png` |
|  11 | Church                |                 16 | `graph-016-136x112.png` |
|  11 | Mosque                |                 20 | `graph-020-136x112.png` |
|  12 | House of Fortune      |                 17 | `graph-017-136x112.png` |

The vendor image occupies the upper dialogue panel. A story character can
visually cover that presentation with an upper scenario panel, but the vendor
and story portrait are not displayed there simultaneously. The lower dialogue
panel is used by story characters, not by an ordinary vendor. Dialogue does
not need to alternate between the panels; several consecutive lines can remain
in the lower panel.

Scenario position 0 reuses the building-supplied speaker rather than selecting
a portrait through the scenario's `CC` instruction. In a Pub search scene, for
example, the bartender's replies appear in the existing upper vendor panel
while Andreas remains visible in a lower scenario panel. Advancing a line
clears its text but leaves its panel and portrait in place. The `C4` scenario
action is stronger: it closes both scenario panels and exposes the ordinary
vendor presentation underneath.

Portrait artwork and speaker identity are separate for ID 8. Collectors,
cartographers, teachers, and named story occupants all retain residence image 13. The current occupant—Mercator, Gerard de Jode, Olives, Dr. Wolf, or another
character—determines who is speaking and which text or menu is used; it does
not select a different ordinary vendor image.

Poor personal Friendship with the nation controlling a port can replace normal entry with a hostile encounter. The
Palace and ordinary buildings use different encounter probabilities and confiscation rules, documented under
[Hostile-country building encounters](friendship.md#hostile-country-building-encounters). The escape score uses
Swordsmanship and Battle Level.

### Opening-hours implementation

The dispatcher at `MAIN.EXE` file offsets `0x20930-0x209D5` selects one time
predicate from a twelve-entry jump table using the zero-based building index.
With `time` measured in 20-minute ticks since midnight, its complete schedule
is:

|           IDs | Buildings                             | Open predicate                                 |
| ------------: | ------------------------------------- | ---------------------------------------------- |
| 1, 3, 6, 7, 9 | Market, Shipyard, Palace, Guild, Bank | `time >= 0x0C && time < 0x3C`                  |
|             2 | Pub                                   | `time < 0x0C` or `time >= 0x18`                |
|       4, 5, 8 | Harbor, Lodge, Special NPC residence  | Always                                         |
|            10 | Item Shop                             | `0x06 <= time < 0x09` or `0x18 <= time < 0x3C` |
|            11 | Church or Mosque                      | `time >= 0x0C`                                 |
|            12 | House of Fortune                      | `time >= 0x30`                                 |

The schedule dispatch reads only the building index and time. There are no
per-port, inventory, protagonist, or story-state opening-hour overrides in
this routine. Palace rank restrictions, Church/Mosque religious restrictions,
hostile-port behavior, and story events are separate access or dialogue checks;
they do not alter these hours.

### Visit duration

A successful building visit consumes 40, 60, or 80 minutes. After confirming
that the building is open, the entry routine calculates:

```text
duration = 2 + random(3)    # 20-minute ticks
```

The result is therefore 2, 3, or 4 ticks. The routine returns that value to
the surrounding town loop, which applies it after the interaction. Thus the
clock shown during a greeting is the entry time; the randomly selected cost
affects the time shown on the following visit.

The Harbor follows the same rule. If the player chooses Sail, the town loop
still applies the Harbor visit's returned duration after the interaction; the
Sail action does not add another tick. Going ashore is separate and advances
the clock by one 20-minute tick.

This uses the executable's general gameplay RNG at `MAIN.EXE 0x0A198`, not the
scenario RNG used by `EB`. The general generator advances a persistent
in-memory state whenever gameplay calls it:

```text
state = state * 0x41C64E6D + 0x3039    # modulo 2^32
value = (state >> 16) & 0x7FFF
result = value % bound
```

The `random(3) + 2` call is at `MAIN.EXE 0x209E9-0x209F5`; the entry routine
returns the resulting tick count at `0x20B36`.

### Item Shop late opening

Every Item Shop opens for an additional hour from 2:00 AM through 3:00 AM,
whether or not its port has a Secret Shop Item. Because time advances in
20-minute ticks, the shop accepts visits at 2:00, 2:20, and 2:40 AM and is
closed again at 3:00 AM.

The building-entry dispatcher begins at `MAIN.EXE` file offset `0x20930`. Its
jump-table entry for zero-based building index `9` (displayed as ID 10) leads
to the Item Shop time test at `0x209A8-0x209C3`. The byte at `DS:0x0737` is the
time of day in 20-minute ticks. In pseudocode, the check is:

```text
open = (time >= 0x06 && time < 0x09) ||
       (time >= 0x18 && time < 0x3C)
```

The constants convert as follows:

|   Tick | Time    |
| -----: | ------- |
| `0x06` | 2:00 AM |
| `0x09` | 3:00 AM |
| `0x18` | 8:00 AM |
| `0x3C` | 8:00 PM |

This branch reads only the building index and time. It does not inspect the
port's item records, so the extra opening is not conditional on a Secret Shop
Item. Secret inventory is stored separately in the regular-port metadata in
`DATA1.015`: the byte at record offset `+0x22` is the zero-based secret item
ID, with `0xFF` meaning that the port has none.

### Churches and mosques

Religious buildings share ID 11, but they do not all use the Church interior.
The game uses the port's visual tileset to choose the variant: if an ID 11
building's port has tileset `2`, it is a Mosque; in every other tileset it is a
Church. The tileset byte comes from `raw/CHIP_NO.DAT` and is exposed as
`tileset` by `scripts/ports/index.ts`.

A character who fails the Mosque access check is told, "I respect your
interest, but Christians are not allowed in the house of Allah." Conversely, a
Muslim character trying to enter a Church is told, "I respect you for your
beliefs, but Muslims just aren't welcome here."

This check is not hard-coded to the Ali protagonist. The routine at
`MAIN.EXE` file offsets `0x32CE9-0x32D14` masks the low nibble of the current
player's country/status byte and compares it with `2`, the Turkish value. Ali
starts with that value, so he can use Mosques and is rejected by Churches. The
immediate check is therefore based on the player record's current affiliation
rather than on Ali's protagonist ID.

## Special NPC residences (ID 8)

ID 8 is not one uniform business. The same coordinate slot represents a
collector, a cartographer, a skill teacher, or a story residence according to
the port.

| Kind                  | Port and occupant                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cartographer          | Amsterdam - Mercator; Antwerp - Gerard de Jode; Barcelona - Diogo Ribeiro; Palma - Olives; Venice - Giovanni Verrazano |
| Collector             | Alexandria; Bordeaux; Copenhagen; Lisbon; Pisa                                                                         |
| Skill teacher         | Hamburg - Dr. Wolf teaches Gunnery; Naples - Professor Juliano teaches Celestial Navigation                            |
| Other story residence | Cairo; Calicut; Changan; Goa; Istanbul; Massawa; Mecca; Nagasaki; Sakai; Seville; Timbuktu                             |

Thus Amsterdam has a cartographer, while Naples has the astronomer Professor
Juliano rather than a cartographer. The screenshots show the shared residence
interior, which is why these otherwise different places look alike.

## Port availability

The lists below are derived from `scripts/ports/output/ports.json`, which in
turn is extracted from `raw/ZA_DAT.DAT`. They describe the English DOS data in
this repository.

|     ID | Building                                    | Ports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -----: | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-5, 7 | Market, Pub, Shipyard, Harbor, Lodge, Guild | Every regular port                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|      6 | Palace                                      | Amsterdam, Genoa, Istanbul, Lisbon, London, Seville                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|      8 | Special NPC residence                       | Alexandria, Amsterdam, Antwerp, Barcelona, Bordeaux, Cairo, Calicut, Changan, Copenhagen, Goa, Hamburg, Istanbul, Lisbon, Massawa, Mecca, Nagasaki, Naples, Palma, Pisa, Sakai, Seville, Timbuktu, Venice                                                                                                                                                                                                                                                                                                                                                                                    |
|      9 | Bank                                        | Aden, Alexandria, Amsterdam, Antwerp, Argin, Athens, Azov, Barcelona, Beirut, Bordeaux, Cairo, Calicut, Caracas, Ceylon, Changan, Cochin, Copenhagen, Danzig, Genoa, Goa, Hamburg, Havana, Istanbul, Jamaica, Lisbon, London, Lubeck, Macao, Marseille, Mecca, Mombasa, Mozambique, Naples, Panama, Pernambuco, Pisa, Sakai, San Jorge, Santo Domingo, Seville, Shiraz, Stockholm, Valencia, Venice, Zeiton                                                                                                                                                                                  |
|     10 | Item Shop                                   | Alexandria, Algiers, Amsterdam, Antwerp, Argin, Athens, Azov, Barcelona, Beirut, Bordeaux, Bristol, Cairo, Calicut, Caracas, Cartegena, Ceylon, Changan, Copenhagen, Danzig, Dublin, Genoa, Goa, Hamburg, Hanoi, Istanbul, Jamaica, Lisbon, London, Lubeck, Macao, Margarita, Marseille, Massawa, Mecca, Mombasa, Mozambique, Nagasaki, Nantes, Naples, Panama, Pernambuco, Pisa, Ragusa, Rio de Janeiro, Sakai, Salonika, San Jorge, Santiago, Santo Domingo, Seville, Stockholm, Syracuse, Timbuktu, Trebizond, Tripoli, Valencia, Venice, Zeiton                                          |
|     11 | Church or Mosque                            | Alexandria, Amsterdam, Antwerp, Argin, Athens, Barcelona, Basra, Beirut, Bordeaux, Bristol, Cairo, Calicut, Candia, Cartegena, Ceylon, Cochin, Copenhagen, Danzig, Dublin, Genoa, Goa, Guatemala, Hamburg, Hormuz, Istanbul, Jamaica, Kaffa, Lisbon, London, Luanda, Lubeck, Macao, Madeira, Margarita, Marseille, Massawa, Mecca, Mombasa, Mozambique, Muscat, Nantes, Naples, Pernambuco, Pisa, Quatar, Ragusa, Riga, Rio de Janeiro, San Jorge, Santa Cruz, Santiago, Santo Domingo, Seville, Shiraz, Sofala, Stockholm, Syracuse, Trebizond, Tripoli, Valencia, Venice, Veracruz, Zeiton |
|     12 | House of Fortune                            | Abidjan, Alexandria, Algiers, Amboa, Antwerp, Athens, Azov, Banda, Bankao, Basra, Bathurst, Beirut, Bergen, Bissau, Cairo, Cartegena, Ceylon, Changan, Cochin, Copenhagen, Danzig, Dublin, Genoa, Guatemala, Havana, Hormuz, Istanbul, Jaffa, Jamaica, Kaffa, London, Luanda, Macao, Madeira, Malacca, Malindi, Maracaibo, Marseille, Massawa, Mecca, Mombasa, Muscat, Nantes, Palma, Pisa, Porto Velho, Quelimane, Riga, Rio de Janeiro, Santa Cruz, Santiago, Santo Domingo, Seville, Shiraz, Sofala, Stockholm, Sunda, Syracuse, Ternate, Timbuktu, Trebizond, Valencia, Venice, Zeiton   |

Of the ID 11 ports, the following thirteen contain a Mosque rather than a
Church: Alexandria, Basra, Beirut, Cairo, Hormuz, Istanbul, Massawa, Mecca,
Muscat, Quatar, Shiraz, Trebizond, and Tripoli.

## Data evidence

- `raw/MENU.DAT` record 59 contains the twelve building names in ID order.
- `raw/MENU.DAT` records 1, 2, 5-10, 16-18, 23, 25, and 26 contain the menus
  transcribed above.
- `raw/MESSAGE.DAT` contains the greetings, including message 804, "Welcome to
  our mosque."
- `raw/GRAPH.DAT` records 6–17 contain the twelve ordinary building-vendor
  images in building-ID order; record 20 contains the Mosque vendor.
- `MAIN.EXE` file offsets `0x32BFA-0x32C39` load the current port's
  `CHIP_NO.DAT` byte and classify tileset `2` as the Mosque variant.
- `MAIN.EXE` file offsets `0x209A8-0x209C3` hard-code the Item Shop's two
  opening ranges without consulting its inventory.
- `raw/ZA_DAT.DAT` contains 101 maps of twelve coordinate pairs: 100 regular
  ports followed by the shared supply-port map.
