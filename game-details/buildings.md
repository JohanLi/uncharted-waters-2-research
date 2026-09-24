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
|   4 | Harbor                           | "Ahoy there, matey, will ye be shoving off?"                                                                                             | Sail; Supply; Moor (enabled at national capitals)               |
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

| Building or branch            | Message raw index (entry) | Message-call offset | Selection and substitutions                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------: | ------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market                        |            0 (1) or 1 (2) |           `0x2B023` | Below 1,000 Trade Fame it uses “How may I help you?”; otherwise “Hello, %s %s!” with the protagonist's first and last names.                                                                                                                              |
| Pub, Carlotta                 |                   17 (18) |           `0x2D472` | “Hello %s, would you like some %s?” with the protagonist's first name and the Pub specialty. Carlotta speaks it when protagonist byte `+0x29` bit `0x10` is clear and a waitress record at this port has flags `0x08` and `0x40` (only Carlotta, Lisbon). |
| Pub                           |                   18 (19) |           `0x2D499` | `%s` is the port's Pub specialty. With protagonist byte `+0x29` bit `0x10` set, the attendant then adds raw 308 “Welcome!” or, after a finished investigation, raw 307.                                                                                   |
| Shipyard                      |                   77 (78) |           `0x329EE` | Fixed.                                                                                                                                                                                                                                                    |
| Harbor                        |                   56 (57) |           `0x2DD5E` | Fixed; other Harbor modes contain equivalent call sites.                                                                                                                                                                                                  |
| Lodge                         |                   66 (67) |           `0x2EB5D` | Fixed.                                                                                                                                                                                                                                                    |
| Palace, titled admission      |                 444 (445) |           `0x30A9C` | `%s %s` is the protagonist's title and last name.                                                                                                                                                                                                         |
| Palace, invited commoner      |                 576 (577) |           `0x30AAA` | Fixed Palace Guard line.                                                                                                                                                                                                                                  |
| Palace, rejected commoner     |                   84 (85) |           `0x30A60` | Acknowledged, then returns outside without a menu.                                                                                                                                                                                                        |
| Palace, hostile reception     |                 443 (444) |           `0x30A08` | Uses the protagonist's names and diverts into the hostile Palace path.                                                                                                                                                                                    |
| Guild                         |                   85 (86) |           `0x332FC` | Fixed.                                                                                                                                                                                                                                                    |
| Bank, Amsterdam               |                   97 (98) |           `0x2F166` | Selected when current port ID is 13.                                                                                                                                                                                                                      |
| Bank, regional branch         |                   98 (99) |           `0x2F17D` | Selected at every other Bank.                                                                                                                                                                                                                             |
| Item Shop, daytime            |                 235 (236) |           `0x2FCC6` | Used during the 8:00 AM–8:00 PM opening.                                                                                                                                                                                                                  |
| Item Shop, secret hour        |                 764 (765) |           `0x2FCB9` | Used during the 2:00–3:00 AM opening: “For a limited time only...”                                                                                                                                                                                        |
| Church                        |                   91 (92) |           `0x32C67` | Computed as `91 + 712 × mosque`; Church uses zero.                                                                                                                                                                                                        |
| Mosque                        |                 803 (804) |           `0x32C67` | The same computation uses one for a Mosque.                                                                                                                                                                                                               |
| House of Fortune              |                 298 (299) |           `0x33534` | Fixed.                                                                                                                                                                                                                                                    |
| Collector, no contract        |                 477 (478) |           `0x339F2` | “May I help you?”                                                                                                                                                                                                                                         |
| Collector, active contract    |                 478 (479) |           `0x339E4` | “Oh, %s %s. I was waiting for you!” with “Ms.” for Catalina (protagonist 1), otherwise “Sir”, and the last name.                                                                                                                                          |
| Cartographer, no contract     |                 493 (494) |           `0x33F7A` | “May I help you?”                                                                                                                                                                                                                                         |
| Cartographer, active contract |                 494 (495) |           `0x33F7A` | “Oh, %s %s. I was waiting for you.” with the same honorific and last name.                                                                                                                                                                                |

Religious rejection uses the same upper-panel helper but does not enter the
menu. A Muslim entering a Church receives raw index 90 (entry 91), while a
Christian entering a Mosque receives raw index 802 (entry 803). The executable
computes the normal Church/Mosque greeting dynamically, which is why neither
greeting appears as a literal direct-reference row in the generated call-site
inventory.

### House of Fortune command dialogue

The House of Fortune handler begins at `MAIN.EXE 0x3351B`. **Life**,
**Career**, **Love**, and **Mates** all use the same payment sequence. The
fortune teller asks for 50 gold pieces with raw index 299 (entry 300). Refusing
returns to the main menu. If the player cannot pay, raw index 300 says, “You
don't seem to have enough,” and the visit ends. Otherwise the game deducts 50
gold, displays raw index 301, “Very well. Take a seat,” and performs the
selected reading before returning to the main menu.

**Life** reads the protagonist's Luck and selects `raw index = 302 +
floor(Luck / 25)`:

|  Luck | Reading                                                                                      |
| ----: | -------------------------------------------------------------------------------------------- |
|  0–24 | “Ohh, I see an ominous shadow across your face. You may be doomed to have a difficult life.” |
| 25–49 | “Your future doesn't look very bright. Be careful, and watch out for accidents.”             |
| 50–74 | “You have an average fortune. But remember, you are the one who carves out your destiny.”    |
| 75–99 | “You have a good fortune. Have more self-confidence.”                                        |
|   100 | “What a strong fortune! You have nothing to fear in this life.”                              |

**Career** reports how much Navigation and Battle experience the current
protagonist still needs for the next level. The exact formula is documented in
[levels.md](levels.md). It then takes the greatest of the protagonist's three
Fame values and compares it with the next title's requirement. If more Fame is
needed, raw index 547 reports the difference. If the requirement is already
met, raw index 754 says that a noble person is searching for the protagonist.
The title portion is omitted for a Pirate. This reading uses the executable's
ten-value title table, whose Marquis-to-Duke entry is 40,000; it does not use
the royal-mission eligibility formula's 40,500 boundary.

**Love** reads the local waitress's favor, when an eligible one exists. Its
exact eligibility test and favor ranges are documented in
[waitresses.md](waitresses.md#house-of-fortune-love-reading).

**Mates** first asks whose fortune to tell and lets the player select an
employed mate. It gives two readings. The first uses the mate's Luck:

|  Luck | Reading                                                                |
| ----: | ---------------------------------------------------------------------- |
|  0–24 | “It seems that your mate is destined to have a series of misfortunes.” |
| 25–49 | “Your mate doesn't have very good luck.”                               |
| 50–74 | “Let's just say that your mate's luck is pretty mediocre.”             |
| 75–99 | “Your mate is one lucky sea dog!”                                      |
|   100 | “What good fortune... His luck will help you as well.”                 |

The second uses the mate's Loyalty:

| Loyalty | Reading                                          |
| ------: | ------------------------------------------------ |
|    0–24 | “He'll leave you soon if you're not careful.”    |
|   25–49 | “He doesn't have very good feelings toward you.” |
|   50–74 | “He is beginning to trust you.”                  |
|   75–99 | “He is beginning to feel loyal to you.”          |
|     100 | “He's very loyal to you.”                        |

Both tables use unsigned division by 25, with a distinct fifth entry for the
maximum value 100. Loyalty itself and the consequences of low Loyalty are
documented in [sailors.md](sailors.md#mate-loyalty). The four reading routines
occupy `MAIN.EXE 0x33354–0x3351A`.

### Lodge command dialogue

The Lodge handler begins at `MAIN.EXE 0x2EB43` and opens **Check In**,
**Gossip**, and **Port Info**.

**Check In** is free and has no confirmation prompt. It starts the overnight
rest transition and resumes play at 8:00 AM the next day. Internally, the
command marks an overnight rest, moves the clock to the end of the current
day, and schedules another 24 20-minute ticks, or eight hours.

**Gossip** is the Lodge's sailor-interaction command. It builds a list of the
sailors currently available there and lets the player choose one. When no
useful navigator is present, raw index 67 says, “I don't see anyone who would
be much help”; another empty-result branch uses raw index 68, “I heard that a
good navigator was at the pub.”

Sailor-record status bit `0x20` marks records eligible for these ordinary
encounters. Bit `0x40` divides them between the two buildings: set records
belong to the Pub list and clear records to the Lodge list. The executable
then includes the protagonist's employed mates, unemployed sailors whose
saved port is the current port, and active captains whose fleet is presently
at that port. The protagonist is excluded.

Selecting one of the player's own mates produces one of three ordinary lines
about returning to dry land, going to bed, or leaving port. Other sailors
introduce themselves as a Commodore, ship's officer, or vagabond and expose
the shared **Hire** and **Duel** interactions also used by the Pub's **Meet**
command. Hostile fleet captains instead use one of two threats. Cancelling the
sailor selection returns to the Lodge menu.

**Port Info** draws the current port's six national Support values and marks
the nation that presently controls it. These are the same Support fields used
to determine [sphere of influence](sphere-of-influence.md); it is a generated
status display rather than a fixed `MESSAGE.DAT` transcript.

The command routines occupy `MAIN.EXE 0x2E846–0x2EB42`.

### Mate departure on Harbor entry

The conversation in which an unhappy mate asks to remain in town belongs to
ordinary **Harbor entry**, not to the Lodge. It is checked before the Harbor's
normal greeting and menu, and only when all of these conditions hold:

- the current port is a regular port rather than a supply port;
- it is no later than 6:00 AM or at least 6:00 PM;
- an initial one-in-three random gate succeeds;
- a nation, rather than Piracy, controls the port;
- that nation is blockading the protagonist's current nation; and
- an employed mate has Loyalty below 30 and a current monthly wage below 190
  gold, so it can still be raised by one stored wage step.

Each eligible mate then has a personality-dependent chance to trigger. Using
the mate's low two personality bits `P`, the game requires `random(4 − P) =
0`, giving probabilities of 1/4, 1/3, 1/2, or 1.

The mate says, “Commodore, I'm not very happy working for you. I think I'll
stay in this town.” Declining to intervene, or refusing the requested raise,
removes that mate from the fleet and leaves them in the current port. If the
player agrees to intervene and accepts the raise, the monthly wage rises by
10 gold and Loyalty is set to exactly 30.

The regular Harbor handler begins at `MAIN.EXE 0x2E55F`; its entry
preprocessing occupies `0x2E55F–0x2E766`, before the menu loop at
`0x2E767–0x2E844`. The blockade bit is documented with the nation-to-nation
status matrix in [friendship.md](friendship.md#nation-to-nation-relations).

### Harbor command dialogue

At a regular port, the Harbor constructs **Sail**, **Supply**, and **Moor** in
that order. The three command handlers begin at `MAIN.EXE 0x2D7FD`, `0x2DC3F`,
and `0x2E2E6`. **Moor is enabled only at one of the six national capitals**;
at every other regular port its label remains in the menu but is grayed out.
The entry preprocessing at `0x2E7E2–0x2E7EF` calls the shared capital helper
(`0x0FC4:B44C`, file offset `0x2068C–0x206BF`), which compares the current port
with all six nation-record capital IDs, and sets the third-entry disabled bit
when there is no match. This is an any-capital check, not a check for the
protagonist's own nation. Cancelling Supply or Moor returns to the Harbor menu
and restores its ordinary greeting. Sail returns there only when departure is
declined or refused; a confirmed departure changes the player to the at-sea
state.

#### Sail

Sail first rebuilds the active-fleet list and displays every ship's crew
assignments and provisions. For each ship, the number of sailors assigned to
navigation is:

```text
navigation crew = floor(current crew × navigation allocation / 100)
```

If this is zero on any ship, raw index 57 (entry 58) refuses departure:
“Some ships have no crew assigned for navigation. We won't get anywhere.”
Otherwise the projected endurance is calculated across the fleet:

```text
voyage days = floor(min(total stored water, total stored food) / total crew)
```

Water and food are stored in tenths of a barrel, so this division directly
produces days at the game's crew-consumption rate. The result selects one of
four messages:

| Condition                 | Raw index (entry) | Result                                                                 |
| ------------------------- | ----------------: | ---------------------------------------------------------------------- |
| Projected days are zero   |           59 (60) | Refuses departure with the “no provisions” response.                   |
| Projected days are 1–9    |           60 (61) | Warns that the fleet cannot sail for long and asks for confirmation.   |
| Projected days are 10–180 |           61 (62) | Displays the exact number of days and asks for confirmation.           |
| Projected days exceed 180 |           58 (59) | Says the fleet can sail for more than six months and asks to cast off. |

Accepting a permitted departure resets the current-voyage midnight counter
to zero, changes the protagonist's fleet state to at sea, initializes the
departure position, and returns success to the town loop. As described under
[Visit duration](#visit-duration), Sail itself adds no clock tick; the pending
40-, 60-, or 80-minute Harbor-visit duration is still applied afterward.

#### Supply

Supply presents a fleet-wide grid with one row per active ship and columns for
Water, Food, Lumber, and Shot. A control at the end of the grid switches
between loading and dumping. Cancelling the grid returns to the Harbor menu.

For one ship, occupied cargo space is:

```text
water / 10 + food / 10 + lumber + shot + all five carried-goods quantities
```

The maximum load offered is the lesser of the ship's remaining cargo capacity
and, for a priced resource, the quantity affordable with the protagonist's
on-hand gold. Water is free. At a regular port, the other per-unit prices are
integer formulas using two bytes in the port's saved 37-byte metadata record:

```text
food price   = floor( 20 × (port byte +0x12 + 50) / 100)
lumber price = floor( 90 × (port byte +0x19 + 50) / 100)
shot price   = floor(120 × (port byte +0x12 + 50) / 100)
```

The corresponding prompts are raw indices 62–65 (entries 63–66). If not even
one unit is affordable, raw index 28 says, “Commodore, we have no gold!” A
positive purchase immediately adds the selected resource and deducts its
price; water and food quantities are multiplied by ten when stored. Dumping
uses `MESSAGE2.DAT` raw index 392 (combined index 1,392), asks for a quantity
from zero through the amount aboard, and removes it without payment.

Supply ports have no 37-byte regular-port metadata record. Town setup refreshes
the executable's metadata pointer only when the current port ID is below 100,
so priced supplies at a supply port use the pointer retained from the last
regular port processed by that running game. This history is not stored in the
save. Water loading and every Dump operation remain independent of that
pointer.

#### Moor and docked ships

The Moor submenu is reachable through the ordinary Harbor menu only at a
national capital. The location restriction is separate from the docked-ship
capacity and active-crew checks below; those checks run after the player has
entered Moor.

Moor opens **Store**, **Commission**, and **Exchange**. It first reports the
number of ships currently kept at this port and the capacity available there.
The displayed maximum is:

```text
min(5, ships already docked here + unused reserve ship records)
```

The game allows up to 30 reserve ships in total, separate from the ships
sailing in the active fleet. These non-fleet records are shared across ports,
so a port normally holds up to five ships, but its displayed capacity can be
lower when ships stored elsewhere consume those records. Only ships whose
stored location matches the current port appear in this Moor screen.

**Store** (`0x2DF09`) excludes the protagonist's flagship. If no secondary
ship can be selected, raw index 279 says that only the flagship remains. A
full local dock uses raw index 288. Otherwise the player selects a ship and,
if it has crew, confirms that all of them will be dismissed. The ship is moved
to a reserve record at the current port, its captain becomes an unassigned
mate, and raw index 282 confirms that the dock will watch it. Provisions and
cargo remain attached to the stored ship; its crew does not.

**Commission** (`0x2E048`) refuses with raw index 283 when no ship is stored at
this port. It also refuses with raw index 285 when every employed sailor who
can command a ship is already doing so, up to the ten-ship active-fleet limit.
After the player selects and confirms a stored ship, the game moves it into
the first free active-fleet slot and assigns the first available mate in
roster order as captain. The ship returns with its stored provisions and
cargo but no crew. Raw index 286 confirms completion.

**Exchange** (`0x2E18A`) replaces a selected non-flagship active ship with a
selected ship stored at this port. The active captain and crew transfer to the
commissioned ship. If that crew exceeds the commissioned ship's configured
maximum, raw index 281 asks permission to dismiss the excess; otherwise the
generic ship confirmation at raw index 201 is used. The outgoing hull becomes
the locally stored ship, and each physical ship retains its own provisions
and cargo. Raw index 287 confirms the exchange.

All three commands return to the Moor submenu. Leaving that submenu returns to
the Harbor menu. Its list construction and dispatch loop occupy
`MAIN.EXE 0x2DE10–0x2E3C2`.

#### Supply-port Harbor

Supply ports use the separate handler at `MAIN.EXE 0x2E4E8`. Their three
commands are **Sail**, **Supply**, and **Rename Port**: they reuse the ordinary
Sail and Supply handlers but do not offer Moor.

Rename Port begins at `0x2E411` and accepts at most eight characters.
Cancelling restores the previous name. A proposed name is compared with all
other 129 port names; raw index 927 rejects a duplicate, while raw index 928
confirms a unique name and includes it in the response. Selecting the existing
name is allowed because the current port is excluded from the duplicate scan.

### Item Shop command dialogue

The Item Shop handler begins at `MAIN.EXE 0x2FC9A`. **Buy** dispatches to
`0x2F9CC`, and **Sell** dispatches to `0x2FB03`. Both commands contain an
internal item-selection loop. Cancelling that loop returns to the Item Shop's
two-command menu; leaving the main menu returns outside without an additional
farewell.

During the daytime opening, the Buy list comes from the three regular item IDs
at saved port-metadata offsets `+0x1F..+0x21`. During the 2:00–3:00 AM opening,
it contains only the secret item at `+0x22`; `0xFF` means that no item occupies
that position. Item IDs are zero-based.

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
| Item is not accepted by shops |         929 (930) | “Sorry, but I can't buy this item.” Its stored byte `+0x14` is zero, or its initial offer (below) is zero.                 |
| Initial offer                 |         245 (246) | Supplies the item name and the base sale price. Accepting sells immediately.                                               |
| Successful counteroffer       |         246 (247) | Rejecting the initial offer performs a Luck-based roll. Success produces a higher offer; failure returns to the item list. |

Raw index 247 (“I'll take it for %ld gold pieces.”) is adjacent to the sale
messages but is not referenced by this Item Shop sell routine. A confirmed
sale adds the agreed price, subject to the on-hand-gold cap, removes the item,
and repeats the selection loop.

The 22-byte saved item definition supplies all of these values: its name is at
`+0x00..+0x10`, the listed-price unit is a little-endian `u16` at `+0x12`,
the appeal rating is at `+0x14`, and the type/equipped flags are at `+0x15`.
The listed price is `100 × price unit`. The initial sale offer is
`100 × floor(price unit / 2)`, so odd hundreds are rounded down rather than
divided exactly in half.

Rejecting that offer draws `random(100)`. The counteroffer succeeds when the
protagonist's Luck is greater than or equal to the result, giving a success
probability of `(min(Luck, 99) + 1) / 100`. Its price is:

```text
initial offer + floor(initial offer × Charm / 200)
```

The general gameplay RNG state is not stored in the save, so the exact result
of that roll cannot be predicted from a save alone.

### Bank command dialogue

The four Bank commands are separate routines: **Deposit** at `0x2EBF2`,
**Withdraw** at `0x2ED63`, **Borrow** at `0x2EE8F`, and **Repay** at
`0x2EFF9`. The main handler begins at `0x2F146`. Each command returns to the
Bank menu. Leaving that menu displays raw index 164 (entry 165), “Thank you for
choosing Marco Polo Bank,” and waits for acknowledgement before returning
outside.

The account is treated as one signed balance: positive values are savings,
zero is an empty account, and negative values are debt.

The save stores that balance at slot-relative `0x060E` as a signed 16-bit
count of hundreds, followed by an unsigned remainder byte at `0x0610`:

```text
account balance = signed_word(0x060E) × 100 + byte(0x0610)
```

The maximum savings balance is 1,000,000 gold. A loan's available credit is:

```text
credit line = 10,000 × rank² + signed account balance + 1,000
```

A nonpositive result fails the credit test. The loan is recorded by subtracting
the borrowed amount from the signed balance.

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

A Deposit that passes the three refusals always shows raw 103 or 104 before
the raw 105 amount prompt, including when the entered amount is zero.

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

Attempting **Donate** with no gold instead clears to a system-message layout and
displays raw index 28 (entry 29), “Commodore, we have no gold!” A zero donation
simply returns to the menu. A positive donation is deducted immediately. Luck
can change only in the large-donation branch, when
`floor(gold before donation / donation) <= 10` selects raw index 95 (mosque
807); the smaller-donation branch shows raw index 94 (mosque 806) and skips the
Luck calculation (`0x32B7A–0x32BDF`). In the large-donation branch, if the
donation is also at least `(random(5) + 1) × 100` gold, the routine sets Luck to
`Luck − floor(gold before donation / donation) + 11`, capped at 100. Unlike
Pray's one-roll-per-visit guard, this calculation is performed for each
qualifying donation.

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

| Stage or condition               |   Raw index (entry) | Continuation                                                                              |
| -------------------------------- | ------------------: | ----------------------------------------------------------------------------------------- |
| Commodity is unavailable         |               4 (5) | Supplies the goods name and returns to the list.                                          |
| Commodity is the local specialty |               5 (6) | “%s %s the local specialty.” with the name and “are” for Glass Beads and Arms, else “is”. |
| Quantity prompt                  |              9 (10) | Supplies the goods name; the input is limited by stock, cargo room, and available gold.   |
| Ordinary price confirmation      |           150 (151) | Supplies the goods name and per-lot price.                                                |
| Mate's price assessment          |       23–25 (24–26) | Classifies the price as a bargain, expensive, or acceptable.                              |
| Gold below half the price        |             22 (23) | Spoken by the crew spokesman; the purchase is not performed.                              |
| Counteroffer prompt              |               6 (7) | Supplies the highest permitted offer.                                                     |
| Offer is much too low            |             11 (12) | Rejects the offer.                                                                        |
| Seller makes a counteroffer      |             12 (13) | Supplies the revised unit price.                                                          |
| Unprofitable attempted trick     |           851 (852) | Rejects the offer and supplies the lowest still-profitable price.                         |
| Successful negotiated price      | 10 or 852 (11, 853) | Accepts directly or yields with a revised price.                                          |

Before the list opens, a pre-check at `0x29E0F` refuses the command: raw
index 26 or 27 from the First-Mate-first spokesman when the fleet has no
room, and raw index 28 (“Commodore, we have no gold!”) from the
Bookkeeper-first spokesman when no gold is carried. Raw index 22 appears only
when the carried gold is below half the per-lot price (`0x2A5E9`). With at
least half the price but less than the full price, the quantity input opens
with a maximum of 0; entering 0 returns to the goods list, which repeats the
specialty line.

The negotiation is part of the same commodity-selection loop. A completed
purchase deducts the total price, adds the lots to the selected fleet's cargo,
raises the selected category rate and the smaller market-wide rate adjustment,
and returns to the goods list.

The 13 regional Market definitions begin at `DATA1.015 0x67DC`, in `0x80`-byte
records:

| Record offset  |     Size | Contents                                                           |
| -------------- | -------: | ------------------------------------------------------------------ |
| `+0x00..+0x5B` | 46 words | little-endian sale base prices, indexed by goods ID                |
| `+0x5C..+0x6D` |  9 words | little-endian purchase base prices, one per listed-goods slot      |
| `+0x6E..+0x76` |  9 bytes | listed goods IDs; `0xFF` marks an unused slot                      |
| `+0x77..+0x7F` |  9 bytes | minimum Economy for each listed-goods slot, in units of 10 Economy |

A listed good becomes available when `minimum Economy × 10 <= port Economy`.
The port's separately stored specialty at metadata `+0x1C` uses the
little-endian base-price word at `+0x1A` and the minimum-Economy byte at
`+0x1D`; it appears in the Buy list only while its saved rate is below 90. The
46 goods are divided among ten saved price-index categories at metadata
`+0x10..+0x19`. For base price `B` and the saved category byte `R`, the
ordinary per-lot value is:

```text
ordinary price = floor((R + 50) × B / 100)
```

For a purchase, `B` is the listed slot's purchase base price, or the
specialty base price. For a sale, `B` is the goods-indexed sale base price, and
the Market pays that ordinary value. Selling a port its own specialty instead
uses the specialty base price and yields half the ordinary value, rounded down.
The purchase price is 120% of the ordinary value, rounded down, unless the
inventory contains the Tax Free Permit for the nation controlling the port; the
permit removes that markup.

For transaction value `V` and port Economy `E`, buying first raises the
selected category by `min(10, floor(V / (E + 500)))`, then raises all ten
categories by `min(3, floor(V / 1000))`; every byte is capped at 100. Selling
performs the same two calculations as decreases, flooring each category at 0.
The selected category therefore receives both adjustments.

**Sell Goods** first compacts the fleet's cargo list and displays raw indices
407 and 408 (entries 408–409) as its `Goods / Load / Rate` table and row
format. If no saleable goods remain, raw index 21 (entry 22) ends the command.
Otherwise, the selected quantity is removed, its proceeds are added to
on-hand gold, the selected category rate and the smaller market-wide adjustment
are lowered, and the revised list is shown again. Cancelling the cargo list
returns to the Market menu.

**Invest** adds to an accumulated-investment word in the port's saved 37-byte
metadata record: metadata `+0x04` for the Market and `+0x08` for the Shipyard.
It does not raise Economy or Industry directly. Both commands share the same
dialogue and reward thresholds:

| Condition or amount                | Raw index (entry) | Result                                                         |
| ---------------------------------- | ----------------: | -------------------------------------------------------------- |
| Current port is a national capital |             2 (3) | Supplies the port and nation names; investment is unavailable. |
| Accumulated investment is 50,000   |             7 (8) | Refuses further investment.                                    |
| Investment is available            |             8 (9) | Opens the amount input.                                        |
| No gold is available               |           28 (29) | Ends the command.                                              |
| Zero entered                       |           13 (14) | “Come back again.”                                             |
| 1–499 gold                         |           14 (15) | “What? Is this all?! Thanks for nothing!”                      |
| 500–9,999 gold                     |           15 (16) | “Thank you very much.”                                         |
| At least 10,000 gold               |           16 (17) | “I won't forget your generosity.”                              |

The entered amount is capped by the remaining room below 50,000 in the
accumulated-investment word. A positive investment deducts the gold, adds the
amount to that word, and changes the port's Support distribution. Let `E` be
Economy for Market Invest (helper `0x2AAA5`) or Industry for Shipyard Invest
(helper `0x3269F`). The protagonist's nation gains
`min(100 − its current Support, floor(amount / E))` Support; a Pirate instead
computes `min(100, floor(amount / E))` without adding it anywhere. That amount
is then removed as evenly as possible from the other nations with nonzero
Support. The helper at `0x327C3` then refreshes the port's cached controller.

The accumulated words are converted later by the world-update routine at
`0x1CB4E`, which visits the 100 regular ports and sets:

```text
Economy  = min(1000, Economy  + floor(Market investment   / 300))
Industry = min(1000, Industry + floor(Shipyard investment / 300))
```

It then clears both accumulated words. The schedule on which this routine runs
has not been traced here.

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

**Recruit Crew** begins at `0x2B68A` and delegates its checks and prompts to
`0x2B16D–0x2B3C5`. It refuses when the fleet already has enough
sailors (raw index 29, entry 30) or when fewer than 10 gold pieces are available
(raw index 30, entry 31). Otherwise it may warn that drinks are needed to
attract recruits (raw 31), ask whether to recruit (raw 32), and call for sailors
(raw 33). The result is one of:

- raw index 121 (entry 122), with the full number rounded up;
- raw index 122 (entry 123), with only part of the requested number; or
- raw index 123 (entry 124), when nobody comes forward.

Raw 33 is spoken by the protagonist; raws 29–32 and 121–123 by the First Mate
(see [Crew spokesmen](#crew-spokesmen)). The amount and cost prompt is
`MESSAGE2.DAT` raw 374 (combined 1374), “It'll cost you %d gold per sailor. How
many will you hire (0-%d)?”, spoken from the Pub portrait (`0x2B308–0x2B371`);
raw indices 124 and 125 have no direct caller. Let
`E` be the visit's current Pub enthusiasm, initialized on entry to
`floor(protagonist Charm / 3)` (`0x2D417–0x2D424`); `P` the port's Economy
(metadata `+0x02`); and `R` the protagonist's rank number. The available pool
is:

```text
available = min(floor(E × P / 500), (R + 1) × E)
price per sailor = floor(P / 20) + 5
maximum purchase = min(available, fleet free-crew capacity,
                       floor(on-hand gold / price per sailor))
```

Buying Treat during the same visit can raise `E` before Recruit Crew is
selected. The three response strings distinguish a pool of at least 20,
1–19, or zero; they are not a random success/failure roll. After the amount is
chosen, crew is distributed through the fleet-wide assignment screen.

**Dismiss Crew** begins at `0x2B739` and delegates assignment to `0x2B50E`. It
enumerates the fleet's ships and captains, using `MESSAGE2.DAT` raw indices
396–400 (combined indices 1396–1400) for the captain, Navigation, Lookout,
Combat, and minimum-crew display. Raw index 857 (entry 858) asks how many
sailors to assign to each ship. If this leaves sailors unassigned, raw index
858 (entry 859) asks whether to discharge them; raw index 231 (entry 232) is
the direct dismissal confirmation. Rejecting a confirmation resumes assignment
rather than leaving the Pub.

**Treat** begins at `0x2BC8D`; its Fame and invitation logic occupies
`0x2BAFA–0x2BC8C`. Below 1,000 highest Fame the patrons answer with raw 36;
below 5,000 with raw 132, “What? You are the famous %s %s %s?”, whose first
`%s` is `Merchant`, `Pirate`, or `Adventurer` (`MENU.DAT` entry 10) for the
first strictly highest Fame in the order Trade, Piracy, Adventure, followed by
the first and last names; otherwise raw 133. Its Fame-dependent thanks and the possible royal-invitation
side effect are described under the shared scenario and royal mission
mechanics. This command has no scenario-dispatch call: the invitation test is
executable code, and the command returns to the Pub menu afterward.

The port's Pub drink byte selects one of 14 specialties and its price. It is
metadata `+0x26`, the last byte of the executable's natural `0x25`-byte port
record; in this page's `0x5966` framing it is stored as the next record's
`+0x01`. For example, Athens serves beer and Sakai serves sake:

| Specialty | Price | Specialty   | Price |
| --------- | ----: | ----------- | ----: |
| Rum       |     3 | Tequila     |     2 |
| Wine      |     4 | Mango juice |     1 |
| Whiskey   |     5 | Palm wine   |     1 |
| Brandy    |     6 | Mint tea    |     3 |
| Gin       |     3 | Fenny       |     2 |
| Beer      |     3 | Plum wine   |     3 |
| Vodka     |     2 | Sake        |     2 |

The player may buy up to 50 bottles, further limited by available gold. The
cost is simply bottle count times the listed price. If `B` bottles are bought,
the visit's enthusiasm changes by:

```text
treat strength = floor(B × 200 / P)
enthusiasm gain = floor(treat strength × protagonist Charm / 10)
new enthusiasm = min(100, old enthusiasm + enthusiasm gain)
```

Here `P` is the same port Economy used by Recruit Crew. The new
enthusiasm feeds Recruit Crew if it is selected later during the same visit.

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

The Pub and Lodge share the same hiring core. Let `A` be the candidate's
highest ability from Leadership through Charm, excluding Luck, and let `i` be
that ability's index:

```text
candidate score = (candidate Navigation Level + candidate Battle Level) × A
player score    = (player Navigation Level + player Battle Level)
                  × player ability i
margin          = floor(player score × rank / 10)
```

The offer is reached when `random(20) < margin`, so the exact probability is
`min(20, margin) / 20`. Failure uses raw index 145. The candidate score does
not affect that probability after the comparison simplifies, but it determines
the requested wage:

```text
monthly wage = 10 × min(20, floor(candidate score / 400) + random(3) + 1)
```

Thus the wage is selected from up to three adjacent multiples of 10 and is
capped at 200 gold per month. Before either random draw, hiring refuses a
sailor with a nonzero duty field and refuses when all 30 mate slots are full.
The Pub has one additional restriction: an unemployed sailor with Loyalty 30
or below says, “Your ship? No thanks.” The Lodge does not make that Loyalty
check.

Accepting the quoted wage puts the sailor in the first empty mate slot, stores
the wage in tens of gold, clears the sailor's port, assigns the protagonist's
fleet and duty 6, and adds 10 Loyalty capped at 100. Refusing returns to the
selected sailor's submenu. **Gossip** chooses its reported port and navigator
with the general gameplay RNG. **Duel** transfers directly into the duel
engine; its result is not decided by the building handler.

The selected patron's **Treat** command buys one bottle of the same local
specialty. Loyalty rises by `6 × P × M`, capped at 100, where `P` is 2 when
bit `0x40` of the patron's personality byte (`+0x27`) is set and 1 otherwise,
and `M` is 3 when the patron's and protagonist's low two personality bits match
and 1 otherwise (`0x2C1F1–0x2C221`); see
[sailors.md](sailors.md#mate-loyalty). The matching branch uses raw index 44
and the other branch raw 45. When
the patron is the captain of a hostile fleet (fleet IDs `0x3C–0x45`), the
meeting code at `0x2BE43` sets a flag that replaces either line with raw index
861, “You can't buy me with drinks.” (`0x2C1C7–0x2C1E8`); the Loyalty
calculation that follows is not skipped. If the resulting Loyalty is above 30
and the patron's greatest ability from Leadership through Courage is above 75,
raw indices 46 and 139 also name that specialty. This “specialty” means the
patron's strongest ability and is unrelated to the Pub's drink specialty.

During two shared missions the patron named by shared variable 17 does not
answer **Treat**, **Gossip**, or **Hire** normally (`0x2C116`, `0x2C283`,
`0x2C4EE`); Treat still charges for the drink first.

- In the royal special search (shared variable 6 = 11), the patron sells the
  treasure's map (`0x2BF2A`). Raw index 604 names the treasure (shared variable 18) and raw index 605 asks 1,000 gold. Accepting with less than 1,000 gold
  gives raw index 607; otherwise raw index 606 hands over the map, item ID
  treasure − 10, into the first empty inventory slot, sets flag `0x20` on the
  discovery linked from the map's byte `+0x14`, and deducts 1,000 gold. With a
  full inventory raw index 880 follows 606 and nothing changes. Once the map is
  carried, every command gives raw index 879, “Aren't you done with your
  business? Good luck.” Treat makes the offer only while shared variable 18 is
  nonzero.
- In Collect Debt (shared variable 6 = 5, shared variable 18 nonzero), the
  patron is the debtor (`0x2C021`). The protagonist opens with raw index 608.
  The debtor escapes when `random(100)` exceeds the protagonist's Luck and
  `random(3)` is 0: raw indices 610 and 613, and the debtor moves to a random
  port in the same half of the world (IDs 0–41 or 42–99). Otherwise the debtor
  pays with raw indices 609 and 614, which add shared variable 19 × 50,000 gold
  (announced as five Gold Ingots per unit) and clear shared variable 18.

**Waitress** begins at `0x2D102`. On Pub entry `0x2D372` picks the first
waitress record at this port with flag `0x08` set and `0x40` clear; without one
the Waitress command is grayed out (`0x2D4C6`), so Cairo's Hadi and Lisbon's
Carlotta never serve it. Raw index 146 (entry 147) names the port's
waitress and requests a 10-gold tip; raw index 147, spoken by the Bookkeeper,
refuses the interaction if the protagonist cannot pay. Once paid, it opens `Tell Stories / Give Gift /
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
and menu, it checks the saved same-day ejection flag and can instead display raw
index 249 (entry 250) and eject the protagonist. The six ordinary commands are
**New Ship**, **Used Ship**, **Repair**, **Sell**, **Remodel**, and **Invest**.
Used Ship is grayed out when all five bytes of the current-port used-ship cache
at slot `0x6E5C` are `0xFF` (`0x32A03–0x32A2E`).

**New Ship** begins at `0x31D16`; model selection begins at `0x31B2E` and hull
selection at `0x31A70`. The preliminary path may refuse because this port
builds no new ships (raw index 251, entry 252) or reserve storage is full
(raw 377, “Other than the ships sailing with you now, you can only have 30
ships.”); see the ship-exchange rules below. Raw index 252 opens the
eligible ordering path. Its construction sequence is:

| Stage                          | Raw index (entry) | Continuation                                                    |
| ------------------------------ | ----------------: | --------------------------------------------------------------- |
| Select model                   |         253 (254) | Confirms the chosen model.                                      |
| Select hull material           |         254 (255) | Opens the material list.                                        |
| Confirm current design         |         255 (256) | Follows the displayed ship statistics.                          |
| Confirm calculated price       |         256 (257) | Supplies the quoted ship price; declining can open negotiation. |
| Place order                    |         257 (258) | Payment and the construction order precede capacity allocation. |
| Configure crew bunks           |         258 (259) | Numerical capacity input.                                       |
| Configure gun space            |         259 (260) | Numerical capacity input.                                       |
| Confirm capacity configuration |         260 (261) | Accepts or returns to configuration.                            |
| Construction time              |         262 (263) | Supplies the required number of days.                           |

The normal hull menu starts with Teak, Cedar, and Beech. Oak appears when the
port's Industry reaches 700, and Copper at 900. A Tekkousen uses Steel alone.
The material choice changes durability. The quoted price is handled before the
crew-bunk and gun-space inputs, so those inputs do not determine that quote.
Confirming the quote or an accepted negotiated offer pays for and creates the
order before those capacity inputs. Cancelling either numeric input does not
cancel the order: it continues with the model's default bunks and gun-space
allocation. Confirming a proposed allocation stores the chosen limits instead.
The executable calculates the New Ship quote from the catalog base price, hull
material, and the port's Shipyard Price Index. Its shared negotiation routine
also determines the minimum acceptable offer from the protagonist's Charm.
An assigned Bookkeeper with Accounting reports that minimum exactly; without
Accounting, the recommendation is randomized. See
[Ships](./ships.md#shipyard-prices-and-negotiation) for the integer formulas.

Construction days are calculated from the model's base durability and the
port's Industry, independently of the selected hull and capacity allocation;
see [Ships](./ships.md#construction-time).
Only one construction order can be pending at a port. New Ship normally uses
a free reserve-ship slot, regardless of how many ships are active in the
fleet. If reserve storage is full but an active slot is free, raw message 377
refuses another order; if all ten active-fleet slots and all thirty reserve
slots are occupied, the game opens a ship-exchange route before model
selection. Raw 167 is followed directly by the shared ship-sale sequence,
starting with ship selection at raw 200; there is no separate Yes/No choice
after raw 167. Once the sale is confirmed, the freed active slot holds the
pending order and the model-selection sequence resumes. Forty is the combined
storage-slot count, not the active-fleet limit: at most ten ships can be active
in the fleet at once.

When **New Ship** is selected at a port with an order pending, raw index 261
reports the days remaining until the vessel is ready. At zero days, raw index
250 announces the ship and raw index 263 asks whether to add it to the fleet.
Declining leaves it docked (raw index 265). Accepting activates it if an active
slot and eligible captain are available. Otherwise raw index 166 identifies a
missing eligible mate when applicable, raw index 167 begins the swap path, and
the shared sale sequence frees a slot before the finished ship is activated.
The delivery capacity check counts both active and construction-pending ships
in active-fleet slots; a pending ship can therefore still occupy one of the ten
slots. The save-aware query follows both the direct-delivery and exchange
branches.

**Used Ship** begins at `0x31DE9`; its price-negotiation helper begins at
`0x317FD`. Before the stock list, the game checks whether another mate can
captain a ship and whether the fleet has fewer than ten active ships. A full
active fleet requires an exchange even if an extra eligible captain is
available; raw 166 indicates that no eligible mate can captain another ship,
and raw 167 is followed directly by raw 200's ship selector without an extra
Yes/No prompt. Its credit uses the selected ship's
catalog price, hull material, and current Shipyard Price Index, and raises
available gold for the purchase checks. After an exchange, or immediately
when no exchange is needed, the player selects a stock slot, confirms the
ship at raw 193, and sees its price at raw 194. Declining the selected ship
returns to the stock list. Rejecting the listed price opens raw 195's
offer prompt; a Bookkeeper may supply raw 196's estimated minimum. An offer
below the minimum draws `random(5)` at `0x319AE`: a zero (probability 1/5)
shows raw 197, sets save byte `0x0C` bit `0x02` (the same-day Shipyard ejection
flag), and ends the visit; any other result (4/5) shows raw 198 and returns to
the Shipyard menu. The query tool follows these as `...:<offer>:ejected` or
`...:<offer>:refused`. Raw 863 accepts a negotiated
price. Insufficient gold produces raw 239 without buying the ship.

Once a price is accepted and affordable, the game deducts gold and creates
the active-fleet ship, then displays raw 199 and asks for a name of at most
eight characters. It marks the purchased stock slot empty when that naming
step completes. Canceling the name input repeats the prompt rather than
undoing the purchase. The selected stock slot matters when the list contains
duplicates.

Used Ship feeds the selected model's unmodified catalog base price into the
same index and negotiation routine; its stored hull material does not change
the quote. The five offered slots are generated when the port enters the
three-port stock cache and are stored with that cache in the save. The first
three draw from the port's shipyard model group, and the last two from a
shared Economy-gated model pool. Thus the list need not match the models the
port can currently build. Revisiting a cached port retains its stock; entering
a fourth distinct regular port evicts the least recently visited record, so a later
return regenerates it. A month change alone does not reroll stock. Without
exchanging a ship, the purchased vessel enters the fleet with zero assigned
crew and loaded guns while receiving crew bunks from the ship template and
the model's maximum gun-space allocation. See
[Ships](./ships.md#used-ship-purchase-state).

The same negotiation helper serves New Ship and Used Ship. After the severe
low-offer response, returning to any Shipyard before the next day immediately
shows raw index 249 and ejects the protagonist before the greeting or menu.
The flag persists across saving and loading, but the day-change routine clears
it; see
[Ships](./ships.md#shipyard-prices-and-negotiation).

**Repair** begins at `0x31EE4`. Raw index 204 reports that the selected ship
already needs no work. Otherwise raw index 205 supplies the repair cost and
asks for confirmation; raw 206 follows a refusal, and raw 207 reports
insufficient gold. Completion uses `MESSAGE2.DAT` raw index 47 (combined index
1047), “This ship is in tiptop shape.”

Let `Dmax` and `Dcur` be the ship's maximum and current durability, `Tcur` and
`Pcur` its current tacking and power, and `Tbase` and `Pbase` the model-table
values. The exact quote is:

```text
repair units = Dmax - Dcur - Tcur - Pcur + Tbase + Pbase
repair cost  = 20 × repair units
```

Completion restores durability to `Dmax` and tacking and power to their model
values.

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

The save-aware query follows this sequence with colon-separated selectors:
confirm the chosen ship, confirm any flagship replacement and select the new
flagship, confirm discarding cargo and dismissing crew when present, then
accept or decline raw 213's deterministic sale offer. A `No` at any guard
returns to ship selection without selling. Accepting the final offer removes
the selected ship, adds the quoted gold, and applies the replacement flagship
choice when one was required. The quoted value uses the ship's stored hull
material and the current Shipyard Price Index; it does not depend on current
durability or crew.

**Remodel** begins at `0x3263D` and opens `Figurehead / Guns / Load Capacity /
Rename`. Figurehead and Guns begin at `0x32344` and `0x32410`; Load Capacity
and Rename begin at `0x324C9` and `0x3259B`.

| Subcommand       | Principal messages | Behavior                                                                                                          |
| ---------------- | -----------------: | ----------------------------------------------------------------------------------------------------------------- |
| Figurehead       |            266–269 | Raw 266 announces a rare selection; raw 267 normally chooses the ship, then the figurehead and price follow.      |
| Guns             |  266, 270–272, 334 | Raw 266 announces a rare selection; raw 270 normally chooses the ship, then gun type, quantity, and price follow. |
| Guns unavailable |   `MESSAGE2` 20–21 | Distinguishes a full gun allocation from a ship model that cannot carry guns.                                     |
| Load Capacity    |            273–274 | Chooses a ship and quotes a fixed capacity-remodel price before opening the capacity controls.                    |
| Rename           |           273, 275 | Chooses a ship and opens the name-entry control.                                                                  |

Paid remodels use raw index 207 when on-hand gold is insufficient. Each
subcommand owns its ship-selection loop; cancelling it returns to the Remodel
menu, and cancelling Remodel returns to the main Shipyard menu.
Load Capacity quotes one tenth of the selected model's listed base price. It
checks available gold before the capacity controls, but deducts the price only
after a completed configuration; cancelling the controls leaves the gold and
ship allocation unchanged. See [Ships](./ships.md#load-capacity-remodeling).
The controls accept crew bunks from the model's minimum through maximum crew
and gun spaces from zero through the model's maximum guns. The remaining model
capacity becomes cargo space. If carried provisions and goods exceed that
space, raw message 20 rejects the configuration and returns to the inputs.
The normal Figurehead list has up to eight choices based on port Economy, and
the normal Guns list has up to six based on both Economy and Industry. The
“great selection” line is shown only when a qualifying rare roll expands one
of these lists; it is not the ordinary Figurehead greeting. A figurehead's
price is 500 times the square of its one-based menu position;
see [Ships](./ships.md#figureheads-and-guns). The save-aware query follows
ship and type selection, gun quantity, price, affordability, and confirmation
for both Figurehead and Guns with `remodel:figurehead:SHIP:TYPE:yes` and
`remodel:guns:SHIP:TYPE:QUANTITY:yes`; selectors accept a displayed name or
one-based position. When the rare-selection conditions are met, it marks the
raw 266 message and extra menu choices ambiguous because gameplay RNG is not
stored in the save.

**Invest** begins at `0x328A4`. It applies the same 50,000 cap and message
thresholds as Market Invest, but tests and changes the Shipyard
accumulated-investment word at metadata `+0x08`.
Its internal recalculation helpers begin at `0x3269F` and `0x327C3`; those are
not separately selectable commands.

### Guild command dialogue

The Guild main handler begins at `MAIN.EXE 0x332E3`. It displays raw index 85
(entry 86), “What do you want?”, and opens **Job Assignment** and **Country
Info**. Both commands return to this menu; leaving the menu returns outside
without a farewell.

**Job Assignment** begins at `0x32E70`. When the shared scenario is idle, its
ordinary Guild-entry route prepares three selectable rows. Each row contains
one of the five common assignment families:

| Stored selector | Menu label      | Section 0 subsection |
| --------------: | --------------- | -------------------: |
|               0 | Transport Goods |                    1 |
|               1 | Buy Goods       |                    2 |
|               2 | Deliver Letter  |                    3 |
|               3 | Defeat Pirates  |                    4 |
|               4 | Collect Debt    |                    5 |

At ports 0–41, the idle shared route independently applies `random(5)` to
each row. Duplicate labels are therefore valid. At ports 42 and above, all
three rows are **Deliver Letter**. The route also prepares the corresponding
destination and offer state before the executable displays the list.

Selecting a row stores `selector + 1` as the subsection of shared section 0,
copies the row's RNG checkpoint into shared variable 8, and dispatches SNR0
with the current port and Guild qualifier `0x06`. The Old
Guild Worker then makes the mission-specific offer. Rejecting it leaves the
shared scenario idle and returns to the same three-row list. Accepting changes
the shared section and returns to the Guild's main menu. Cancelling the list
also returns to the main menu.

If a common assignment is already active (shared variable 6 below 6), **Job
Assignment** does not open a new list. At the assignment's port, stored in
shared variable 16, raw index 931 says, “Did you forget that you're on a
mission for someone in this port?” Elsewhere, raw index 338 names that port:
“Aren't you supposed to be on a mission for someone in %s?”

During a royal mission the Guild-clue handler at `0x32D25–0x32E68` answers
instead. Outside the special treasure search (shared variable 6 = 11), or when
the treasure or its map (item ID − 10) is already carried, raw index 595 asks,
“Aren't you on a royal mission?” Otherwise the handler uses a hint port in
shared variable 16, drawn once with `random(42)`:

- Away from the hint port, raw index 598 says which port's Guild may help, and
  raw index 600 adds “You'll find %s around” with the port's coordinates in
  whole degrees. The formatter at `0x2B08C` converts map coordinates like the
  cartographer's Locate but truncates instead of rounding: Venice, at map
  coordinates (258, 318), gives “You'll find Venice around 45°N 13°E.”
- At the hint port, raw indices 596 and 597 name a sailor who knows about the
  treasure. The sailor is drawn once from sailors 79–119 and stored in shared
  variable 17.

When no shared mission is active but a royal invitation is armed (shared flags
16 and 17), the Guild mentions it instead of listing jobs: raw indices 410–413
name the ruler of Portugal, Spain, the Ottoman Empire, or England, and raw
index 932 names the Governor-General of Italy or Holland.

The assignment families, deadlines, rewards, progress interactions, and
failure effects are documented in
[the shared-scenario overview](scenarios/scenario-0-common-quests-and-royal-missions.md).

**Country Info** begins at `0x331DE`. It asks which country to inspect with
raw index 162 and offers Portugal, Spain, Turkey, England, Italy, and Holland;
Piracy is not selectable. After a country is selected, raw index 86 asks for
100 gold. Refusing produces raw index 87, “Huh, you'll regret it later.” If
the player has fewer than 100 gold, raw index 163 says, “Sorry, no gold, no
information!” Otherwise exactly 100 gold is deducted.

The status screen rendered by `0x32F9D–0x331DB` contains:

- the selected nation's cached **Profit**, from nation-record word `+0x00`;
- the protagonist's displayed Friendship with that nation, stored value minus
  100;
- that nation's directed Relations with the other five selectable nations,
  each stored value minus 30; and
- alliance and blockade markers from the corresponding status bytes.

After the screen, the Guild describes the nation's cached target:

| Target field | Raw index     | Message                                                     |
| -----------: | ------------- | ----------------------------------------------------------- |
|          0–5 | 88            | “It seems [selected nation] is out to get [target nation].” |
|            6 | combined 1367 | “It seems [selected nation] is cracking down on pirates.”   |
|         7–FF | 853           | “Watch out for [selected nation]. They're out to get you.”  |

It then always resolves nation-record byte `+0x04` as a port and says (raw 89),
“A merchant
fleet is going to [port].” Profit, the target, and the merchant-fleet
destination are cached national state. Their monthly refresh is documented in
[sphere-of-influence.md](sphere-of-influence.md#monthly-guild-refresh) and
[friendship.md](friendship.md#guild-intelligence); buying the report does not
recalculate them.

### Palace command dialogue

The Palace handler begins at `MAIN.EXE 0x309A4`. After the admission greeting
has been acknowledged, it opens **Meet Ruler**, **Defect**, **Gold**, and
**Ship**. A fifth stored label, **Secret Call**, is event-only rather than an
ordinary selectable command. The ruler is selected from the nation controlling
the capital being visited; this ordinary location-based selection is separate
from the ruler variables used by diplomatic-mission dialogue. Its portrait and
name come from 24-byte named-character record `10 + controller` at slot
`0x19C2` (`0x309B0`): Manuel I, Carlos I, Suleiman II, Henry VIII, and the
Italian and Dutch Governor-Generals in the initial save. The Gold and Ship aid
lines keep the Palace image rather than the ruler portrait.

**Meet Ruler** begins at `0x3044A`. It first gives shared and protagonist story
routes an opportunity to handle the audience. If neither route consumes the
interaction, the ruler opens a second menu:

- **Sphere of Influence** (`0x3013C`) opens with combined raw 1073, “Welcome,
  %s %s.” (title and last name). If exactly one port shares the current
  port's controller it ends with combined raw 1048 (“We're not allied with any
  ports in the world, just our capital city.”); otherwise raw 453 is followed
  by raw 883 with the allied-port count and a region chooser that repeats
  until canceled, and raw 454 closes the report. It totals the visited
  nation's allied ports by region, then displays their Industry, Economy, and
  economic-power rating. A capital
  is included in the nation's worldwide count even when no overseas allied
  port exists. The underlying economic-power calculation is documented in
  [sphere-of-influence.md](sphere-of-influence.md).
- **Letter of Marque** is refused if the protagonist already carries that
  nation's letter. Otherwise it requires at least 1,000 Piracy Fame and Piracy
  Fame no lower than either Trade or Adventure Fame. Accepting the request
  grants the nation-specific letter-of-marque item.
- **Tax Free Permit** is refused if the protagonist already carries that
  nation's permit. The ruler explains that permits renew in April and October,
  warns when the current six-month period is nearly over, and asks for
  confirmation. Its price is `10,000 × permit units`. In the protagonist's
  own nation, ranks 6 and 7 pay nothing; ranks 0–5 pay `7 − rank` units. At a
  foreign Palace the unit count is `11 − rank`. A successful purchase grants
  the nation-specific permit item for the current half-year period.

The two document requests scan the twenty item slots first. An existing
nation-specific item takes precedence over an empty slot; with neither an
existing item nor an empty slot, the request cannot proceed.

**Defect** begins at `0x3051D`. It asks for confirmation, changes affiliation,
updates personal Friendship, and clears the old national fleet state used by
the protagonist. Its menu predicate and exact Friendship changes are covered
under [Defection](friendship.md#defection).

**Gold** begins at `0x3063A`. It is royal aid, not a contribution. The current
nation record holds an aid amount in thousands of gold pieces. A zero amount
produces, “His Majesty thinks you can make it on your own this time.” Otherwise
the ruler awards `1,000 × aid amount` and clears the stored amount so it cannot
be collected twice. If that award would take on-hand gold above 600,000,000,
the command refuses it instead.

**Ship** begins at `0x306C2` and likewise consumes a ship type cached in the
current nation record. It refuses when no ship aid is pending or when the fleet
and ship-instance lists cannot accept another vessel, and also requires an
eligible mate to captain it. On success it creates the specified ship, lets the
player name it, assigns it to the fleet, decrements the cached aid count, and
directs the player to the Shipyard. Repeating the command can therefore collect
only as many ships as the nation record contains.

Gold and Ship are disabled at a foreign Palace. They are benefits of the
protagonist's current nation, whereas Defect is available only at a qualifying
foreign Palace. Royal-invitation and active-royal-mission state can further
disable Defect. Although **Secret Call** is the fifth label stored in the menu
record, the ordinary Palace loop supplies only four selectable entries and its
dispatch table contains only the first four command handlers. The apparent
fifth command is therefore not an ordinary repeatable service. A separate
post-command hook invokes a special event when the protagonist is a Duke and
the corresponding global event bit is armed.

### Collector and cartographer dialogue

The special-residence dispatcher at `0x342C7` resolves the current port's
ordinary occupant before calling a collector, cartographer, or skill-teacher
handler. Story occupants are supplied by earlier scenario routes. All of them
share the same residence portrait, but their commands and state are separate.

A collector opens **Contract**, **Discovery**, and **Rumor** through the main
handler at `0x339AA`:

- **Contract** (`0x335FC`) asks the player to sell discoveries exclusively to
  that collector. Accepting clears the active bit on every other collector
  contract and activates the current one.
- **Discovery** (`0x3365A`) lists discoveries that have been found but not
  previously reported or given to a ruler. Selecting one pays gold, awards
  Adventure Fame, and marks it consumed. The exact difficulty formula and the
  five collectors' payment percentages are documented in
  [adventure-fame.md](fame/adventure-fame.md#collectors-and-gold-percentages).
  If no eligible discovery exists, the collector answers with raw 484 and
  combined raw 1078 and returns to the residence menu.
- **Rumor** (`0x3384A`) either reports that there is nothing new or gives an
  approximate latitude and longitude for an undiscovered village. The result
  is generated from the discovery state, protagonist Luck, and the general
  gameplay RNG; it does not reveal or consume the discovery.

The mutable discovery table begins at save-slot-relative `0x6E74` and contains
100 seven-byte records. The ordinary Discovery list accepts a record only when
flag bit `0x80` is clear, `0x20` is set, and consumed bit `0x10` is clear.
Completing the sale sets `0x10`. With `q = floor(difficulty / 25)`, the
collector's reaction is raw `486 + q` (`0x3374E`), whose two `%s` are an
article and the discovery name, followed by combined raw `1081 + q` with the
gold paid. The article is empty for the 19 discovery IDs listed at
`DS:0xB3B2` (0, 5, 8, 9, 16, 17, 21, 22, 23, 25, 26, 28, 33, 40, 44, 60, 72, 77,
89); otherwise it is “The ” when `q = 0` and “the ” above that. Difficulty 100
also uses its separate 1,500-Fame and 100,000-base-gold reward. Rumor instead takes
the first record with both `0x80` and `0x40` clear. The selected record is
therefore deterministic; Luck and the general RNG blur the coordinates that
are reported for it.

A cartographer opens **Contract**, **Learn Skills**, **Report**, and **Locate**
through the main handler at `0x33F17`:

- **Contract** (`0x33A70`) requires Cartography. Accepting clears the active
  bit on the other cartographer records, activates the current cartographer,
  and resets the unreported-chart-cell counter.
- **Learn Skills** (`0x33B02`) teaches Cartography only when all three required
  abilities—Seamanship, Knowledge, and Intuition—are at least 75. The lesson
  price is
  `min(60,000, 100 × (floor(5,000 / (floor(Charm / 5) + 1)) + 200))` gold.
  Payment sets Cartography skill bit `0x08`.
- **Report** (`0x33BFA`) refuses when there are no newly charted cells.
  Otherwise it pays for every unreported cell, awards Adventure Fame, resets
  that counter, and uses a special completion response once 3,300 total cells
  are known. All five cartographers pay 80 gold and 5 Fame per cell.
- **Locate** (`0x33D59`) shows raw 785 and asks raw combined 1419, “Is it
  okay?” Declining ends silently. It then requires more than 20,000 gold
  (otherwise raw 239) and scans the inventory for items 80–88. One map is used
  without a prompt; several show raw 335 and a chooser in inventory order,
  whose cancel shows combined raw 1421 without charge. The fee of 20,000 is
  then deducted, raw 786 and raw 783 are shown, and the location is appended.
  Analysis does not consume the map.

Locate's location comes from the map item's byte `+0x14`, a discovery index,
and that discovery record's signed X and Y words:

```text
lon = (X + 1981) mod 2160; east unless lon > 1080, then lon = 2160 - lon (west)
d = 640 - Y; north when d >= 0, otherwise south
lat degrees = trunc(|d| * 8 / 57); lon degrees = trunc(lon / 6)
shown lon = (trunc(lon degrees / 5) + random(2)) * 5   (first draw)
shown lat = (trunc(lat degrees / 5) + random(2)) * 5   (second draw)
```

The text is raw 126/127 (`\n%d@N`/`\n%d@S`) with the latitude, a space, raw
128/129 (`%d@E`/`%d@W`) with the longitude, another space, and `.`; for Lisbon's
area (120, 358) the unrounded values are 39°N 9°W, displayed as 35 or 40 and 5
or 10. The map's discovery link belongs to the current game state: a treasure
map sold during the royal special search points at the treasure's discovery
record. For example, a Map of Pot linked to discovery 0 at (168, 270) gives
51°N 1°W unrounded and is displayed as 50 or 55 and 0 or 5. The menu enables
Locate for items 80–89, but the handler counts only 80–88: with only the Old
Map (89) it still charges 20,000 and analyzes item `0xFF`. That item's link
byte lies at `DS:0x9556`, beyond the item table; nothing writes it and it is 0
in the executable image, so the result is always discovery 0.

The Old Map is not otherwise usable. No scenario script or executable path
places item 89 or its treasure, the Treasure Chest (99), in the inventory; the
only reference to item 89 is the menu test above. The royal special search
chooses its treasure from items 90–96 only, and the Treasure Chest's discovery
record (53) carries the `0x80` flag that excludes it from ordinary discovery.
Its `ITEM.MES` description is the placeholder “Reserve”, shared with the
Telescope, the Pardon, and several unnamed item slots.

Contract state controls the personalized greeting and command mask. An active
contract changes “May I help you?” to the honorific greeting. At a collector
(`0x33A07`) an active contract grays out Contract, and an inactive one grays
out Discovery and Rumor. At a cartographer (`0x33F98`) an active contract
grays out Contract and an inactive one Report; Learn Skills is grayed out once
Cartography is known, Locate without any item 80–89, and Report after one use
during the visit.

Professor Juliano's Naples residence (`0x34030`) offers Celestial Navigation,
and Dr. Wolf's Hamburg residence (`0x3418C`) offers Gunnery. Both handlers:

1. ask whether the protagonist wants the lesson;
2. refuse if the skill is already known;
3. test three skill-specific ability thresholds;
4. quote the same Charm-dependent lesson-price formula used for Cartography;
   and
5. deduct the price and set the corresponding skill bit when accepted.

Their exact ability requirements are:

| Teacher           | Skill taught         | Required abilities                        |
| ----------------- | -------------------- | ----------------------------------------- |
| Professor Juliano | Celestial Navigation | Seamanship 80, Knowledge 70, Intuition 70 |
| Dr. Wolf          | Gunnery              | Leadership 75, Knowledge 65, Courage 80   |

The other ID 8 locations are story residences. They do not expose a standing
business menu: an applicable scenario route supplies the named occupant's
conversation, while the ordinary fallback says, “Commodore, this building is
locked.”

Some commands lead to another menu. `Moor`, for example, opens `Store`,
`Commission`, and `Exchange`; `Remodel` opens `Figurehead`, `Guns`,
`Load Capacity`, and `Rename`. The Pub's `Meet` and `Waitress` commands likewise
open character-specific submenus.

Building entry and menu commands are separate dispatch points:

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
into hostile processing even after `F8`.

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
check occupies `MAIN.EXE 0x30A1B–0x30A68`; rejection begins at `0x30A5C`.

### Crew spokesmen

Some building lines are spoken by a mate chosen at `MAIN.EXE 0:8ED9`. It
walks a duty preference list; for each duty it scans the 30-entry mate roster
at slot `0x1D85` and takes the first mate whose sailor duty byte `+0x26`
matches. Without a match the last nonempty roster entry speaks, and an empty
roster selects no mate portrait.

| Helper   | Duty order    | Raw lines                                         |
| -------- | ------------- | ------------------------------------------------- |
| `0:8F3F` | 4, 3, 5, 2, 6 | 21–25, 28, 100, 147, 207, 864, 865, 872, 878      |
| `0:8F64` | 3, 4, 5, 2, 6 | 26, 29–32, 57–61, 121–123, 209–212, 279, 285, 933 |

Duty 3 is the First Mate, 4 the Bookkeeper, and 5 the Chief Navigator. Raw 33 and 48 are spoken by
the protagonist.

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

Named ordinary speakers use a third panel. A ruler during Meet Ruler and its
submenus (Sphere of Influence, Letter of Marque, Tax Free Permit, Defect), a
Pub attendant such as Carlotta, and the crew spokesman appear in a lower,
centered panel with their own face, while the vendor image stays in the upper
panel. Rulers and attendants carry a `|name|` plate; the crew spokesman's line
has none. This panel is drawn by the executable's named-face routine
(`0:7BCD`), not by the scenario's position 1 or 2 panels.

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

The `random(3) + 2` call is at `MAIN.EXE 0x209E8-0x209F5`; the entry routine
returns the resulting tick count at `0x20B35`.

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
ID, with `0xFF` meaning that the port has none. At those hours the shop uses
raw message 764 instead of its daytime greeting, and Buy offers that secret
item instead of the three regular items.

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

| Kind                  | Port and occupant                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Cartographer          | Amsterdam - Mercator; Antwerp - Gerard de Jode; Barcelona - Diogo Ribeiro; Palma - Olives; Venice - Giovanni Verrazano     |
| Collector             | Alexandria - Ranajame; Bordeaux - Professor Mordes; Copenhagen - Count Morie; Lisbon - Butler Marco; Pisa - Duke of Modena |
| Skill teacher         | Hamburg - Dr. Wolf teaches Gunnery; Naples - Professor Juliano teaches Celestial Navigation                                |
| Other story residence | Cairo; Calicut; Changan; Goa; Istanbul; Massawa; Mecca; Nagasaki; Sakai; Seville; Timbuktu                                 |

Thus Amsterdam has a cartographer, while Naples has the astronomer Professor
Juliano rather than a cartographer. All of these occupants use the shared
special-residence interior and vendor portrait.

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

- `raw/MENU.DAT` record numbers in this list are one-based; the zero-based
  entry in the file's big-endian offset table is the record number minus one.
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
