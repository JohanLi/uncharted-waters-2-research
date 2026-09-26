# Scenario 6: Ali Vezas

Scenario 6 (`SNR6`) is Ali's character story. It has six sections. Unlike the
other protagonists, Ali advances mainly through money, rank, Ottoman control of
ports, and earlier choices; **Trade Fame** becomes a direct story gate only in
the final section. A Fame-only progression model is therefore especially
misleading for Ali.

This document describes the scenario from the player's point of view. It is
based on the decoded `SNR6.DAT` route tables and dialogue and on the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md).
Where a condition is evaluated by `MAIN.EXE` rather than by the scenario
bytecode, the text cites the executable routine.

Evidence labels have the meanings defined in [the scenario README](./README.md).

## Story and threshold map

| Section | Main gate                           | Player-visible story                                               |
| ------: | ----------------------------------- | ------------------------------------------------------------------ |
|       0 | Obtain the _Savahni_                | Salim's wrecked ship, the first investors, and the repaired ship   |
|       1 | Four repayments and a title         | Repay Ladia, the Harbor Master, Radino, and the shipwright; Pietro |
|       2 | 100 Gold Ingots                     | João's decoy sail, Catalina, and finding Sapha in Basra            |
|       3 | 30 Ottoman-controlled ports         | Radino's transfer, Howell, and collecting Pietro's debt            |
|       4 | — (50 ports only changes reminders) | The Sultan's 100-ingot reward                                      |
|       5 | 40,000 Trade Fame, then the house   | Sapha, Rustem, Howell's house, and Ali's ending                    |

Only section 5 compares a Fame value, and it compares **Trade Fame**, not
total Fame. Gold Coins and Gold Ingots are separate displayed components of one
stored amount: every 10,000 coins is one ingot, so the 100-ingot gate means
1,000,000 gold.[^ingots]

The gates are tested in these places:

- Section 0 ends on **voyage day 1** after the _Savahni_ has been commissioned.
- The section-1 repayments are tested in four Istanbul buildings; the title
  reactions in the Istanbul **Lodge** and other ordinary Istanbul businesses.
  The section ends at the Istanbul **Palace** (**Meet Ruler**).
- 100 Gold Ingots is tested on entering most Istanbul buildings or **any
  building in another regular port**; voyage day 1 then advances.
- 30 and 50 Ottoman-controlled ports are counted on entering a **Harbor
  outside Istanbul**.
- 40,000 Trade Fame is tested first at a **Harbor outside Istanbul**, then at
  a **Pub** in an Ottoman-controlled port other than Istanbul and Basra.

Several gates also require Ali still to be affiliated with the Ottoman Empire
(protagonist sailor-record byte `+0x29`, low nibble `2`).[^affiliation] A
defection at a foreign Palace therefore stalls those routes.

Scenario services which are not mentioned below normally retain their ordinary
game behavior. The tables describe the extra story behavior layered onto them.
Where a table says a building **ejects** Ali, its route ends in `F8`, which
closes the scene without opening the building's menu.

## Section 0: Salim's debt and the Savahni

Section 0 has routes only for Istanbul. Ali cannot leave the port during it
because he has no ship.

### Stage sequence

| Stage             | Required action                                                     | What changes                                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salim's news      | Visit the Istanbul **Shipyard**.                                    | Salim's father's ship has drifted into port as a wreck. Repairs cost 1,000 gold; the shipwright agrees to wait for payment but will then want 10,000. Salim joins as First Mate and a pending ship is created.[^opening-ship] The subsection advances.                                      |
| Raise the capital | Visit the Istanbul **Pub**, **Harbor**, and **Bank**, in any order. | Each sets one flag and adds carried gold: Ladia invests 1,000 (Pub, flag 0); the Harbor Master invests 1,000 (Harbor, flag 1); the banker Radino hands over Ali's 1,000 savings and adds a personal 1,000 (Bank, flag 2). The visit that completes all three flags advances the subsection. |
| Receive the ship  | Return to the Istanbul **Shipyard**.                                | The repaired ship is commissioned; Salim names it _Savahni_ (“Friends”). Flag 3 is set.                                                                                                                                                                                                     |
| Leave Istanbul    | Recruit a crew at the **Pub** and set sail.                         | Voyage day 1 advances to section 1 when flag 3 is set.                                                                                                                                                                                                                                      |

The first-stage investors total 4,000 gold. The Bank withdrawal is scripted:
the route adds 1,000 to carried gold (`E6`) without reading or changing Ali's
Bank balance. Ladia's investment also sets her waitress favor (byte `+0x0C` of
Pub-attendant record 2) to 50.[^opening-flags]

### Istanbul building behavior

| Building                 | Before Salim's news                                          | While raising capital                                                               | After the capital, before the ship                                          |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Pub                      | Ladia's regulars mock Ali; Salim is looking for him. Ejects. | Ladia's investment scene once; afterward her reminder. Ejects either way.           | Ladia's farewell; ejects until the ship is received.                        |
| Harbor                   | Points to the Shipyard. Ejects.                              | The investment once; afterward sailing advice. Ejects either way.                   | Advice to recruit sailors and load food; ejects until the ship is received. |
| Bank                     | Points to the Shipyard. Ejects.                              | Radino's withdrawal and investment once; afterward his reminder. Ejects either way. | Radino's encouragement; ejects until the ship is received.                  |
| Shipyard                 | Salim's news.                                                | “There's no one here.” Ejects.                                                      | The _Savahni_ scene; later, sailing advice without ejection.                |
| Lodge                    | The keeper's greeting; the Lodge remains usable.             | The optional money-or-cat offer below.                                              | Encouragement; the Lodge remains usable.                                    |
| Palace                   | Ali is sent home. Ejects.                                    | Ali is sent home. Ejects.                                                           | Ali is sent home. Ejects.                                                   |
| Special building (house) | “It must be abandoned.” Ejects.                              | Salim notes that the house is for sale. Ejects.                                     | The same. Ejects.                                                           |
| Other ordinary buildings | Salim is looking for Ali. Ejects.                            | The owner refuses Ali's “deal.” Ejects.                                             | The owner wants Ali to apologize to his investors; ejects until the ship.   |

The Church, House of Fortune, and Palace audience context have explicit no-op
routes and keep their ordinary behavior. In the last stage (after the capital
is raised) the Market also has an explicit no-op route, so it no longer ejects
Ali.

### Optional Lodge offer

While Ali is raising capital, the Istanbul **Lodge** keeper offers money
outright. The choice uses the forced menu `C9 01 007B` (message 124,
“Accept” / “Refuse”), which cannot be cancelled:

- **Accept** adds 500 gold.
- **Refuse** gives Ali a cat instead.

Either answer sets flag 4, so the offer appears once. It is not required for
the story, and the Lodge remains usable afterward.[^lodge-cat]

## Section 1: Repayments, a title, and the first audience

Section 1 has routes only for Istanbul; every other port behaves normally.

### Repay the four debts

Each creditor asks for 10,000 gold. The repayment is a Yes/No prompt (`E9`
into flag 10); declining leaves the debt open for a later visit.

| Building | Money required when entering | Result of paying                                                                 | Flag |
| -------- | ---------------------------: | -------------------------------------------------------------------------------- | ---: |
| Pub      |             At least 1 ingot | Ladia is repaid, sets her favor to 100, and promises to ask sailors about Sapha. |    0 |
| Harbor   |            At least 2 ingots | The Harbor Master is repaid. Pietro then asks to borrow 10,000; see below.       |    1 |
| Bank     |            At least 2 ingots | Radino is repaid and introduces Howell, head of the Marco Polo Bank.             |    2 |
| Shipyard |             At least 1 ingot | The shipwright is repaid and explains alliances and Market/Shipyard investment.  |    3 |

Each repayment deducts 10,000 gold and adds **500 Trade Fame**, capped at
50,000.[^debt-code] With too little money, the creditor notes that Ali has not
made enough yet and Ali asks for more time. After a debt is paid, the building
switches to small talk that changes once Ali holds a title.

### Pietro's loan

After the Harbor repayment, Pietro appears (with his theme music) and asks to
borrow the 10,000. Salim recalls that the Duchess of Lisbon sponsors him. The
answer is another Yes/No prompt:

| Answer | Effect                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------- |
| Lend   | Deducts another 10,000 gold, adds a further **500 Trade Fame**, and stores `1` in scenario variable 20. |
| Refuse | Pietro calls Ali a skinflint. Variable 20 is set to `0`; no gold or Fame changes.                       |

Either answer sets the Harbor flag. Variable 20 persists across sections and
changes dialogue, Pietro's repayment, and Trade Fame in section 3. The four
repayments therefore award 2,000 Trade Fame, or 2,500 if Ali lends to Pietro.

### Gain a title and hear the reactions

Two further flags require a nonzero rank (byte `+0x0D` of Ali's 14-byte Fame
record) and Ottoman affiliation:

| Place                                                   | With a title                                | Flag |
| ------------------------------------------------------- | ------------------------------------------- | ---: |
| Another ordinary Istanbul business (the wildcard route) | A former critic grovels: “M-M-M-Master $n.” |    4 |
| Lodge                                                   | The keeper congratulates Ali.               |    5 |

Without a title, the Lodge keeper encourages Ali, and the wildcard route mocks
him. The mockery is chosen by `EB 03 0002` (`random(2)`, the deterministic
scenario RNG): one result says Ali should give up; the other asks about money
and, with at least 10 ingots, predicts he will lose it all.

Title reactions in the Pub, Harbor, Bank, and Shipyard are dialogue only and
set no flags.

### Advance to the Palace summons

Every flag-setting route ends by checking the other five flags; the building
that completes flags 0–5 advances the subsection. A second path exists: the
voyage-day-1 route advances when flags 0–4 are set, without the Lodge
congratulation.[^debt-code]

### Palace summons and first audience

Once the subsection has advanced:

- the Istanbul **Pub** (Ladia) and **Harbor** (“A messenger from the palace
  was just here looking for you, sir.”) point Ali to the Palace and eject him;
- every other Istanbul building except the Palace, Church, House of Fortune,
  and house reaches the wildcard route: “A palace guard was just here looking
  for you.” It also ejects him; and
- the Palace itself opens normally.

Use **Meet Ruler** at the Istanbul Palace. `MAIN.EXE` dispatches protagonist
context `0x15` from that command unconditionally (`0x3048C`). The Sultan:

1. counts Ottoman-controlled ports and quotes the number;[^port-count]
2. commissions Ali to extend Ottoman influence and gives him **50 Gold
   Ingots** (25 additions of 20,000 gold);
3. gives a **Tax Permit (O)** if Ali does not already carry one and has an
   empty inventory slot;[^permit] and
4. advances the scenario to section 2 and ejects Ali from the Palace.

## Section 2: João, Catalina, and Sapha

### Hold 100 Gold Ingots

With at least **100 Gold Ingots**, enter one of these buildings:

- the Istanbul **Pub**, **Harbor**, **Bank**, **Shipyard**, or **Palace**, or
  another ordinary Istanbul business through the wildcard route; or
- **any building in another regular port** (route `0xA3FF`).

The check sets flag 0 silently. The Istanbul Lodge, Church, House of Fortune,
house, and Meet Ruler context do not test it. Then set sail: voyage day 1
clears flags 0 and 1 and advances the subsection. Reaching 100 ingots at sea
or in an untested building does not by itself arm the event.

### João's decoy sail

| Stage           | Required action              | What changes                                                                                                                                                                                                              |
| --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hear the rumor  | Any Istanbul building        | The Harbor, Bank, Lodge, Shipyard, and other businesses say a wounded Portuguese captain is recovering and Ladia is fond of him. The Harbor ejects Ali; the others do not.                                                |
| Meet João       | Istanbul **Pub**             | Ladia introduces João. Ali tells him Atlantis's secret lies in Massawa and offers to act as a decoy under João's emblem sail. Catalina's fleet starts pursuing Ali.[^decoy] Flag 0 is set; later Pub visits are ordinary. |
| Change the sail | Istanbul **Harbor**          | João fits his emblem sail to Ali's ship. Flag 0 is cleared and the subsection advances.                                                                                                                                   |
| Fool Catalina   | Battle with Catalina's fleet | Before the battle, Catalina takes Ali for João; Ali claims he bought the sail. She lets him go. The battle is cancelled, her fleet is withdrawn, and the subsection advances.[^decoy]                                     |

While Ali waits for Catalina, the only scenario route is the before-battle
route for opposing captain 1 (`0xA101`). Every building behaves normally, and
battles against any other captain are unaffected.

A before-battle route that ends in `F8` makes `MAIN.EXE` cancel the battle
(`0x150FD`, outcome code 8): no message, Fame, or spoils follow. See
[Naval battle](../naval-battle.md#cancelled-battles).

### Wait for news

The João scene sets scenario variable 10 to zero. During the next subsection,
the voyage-day-5 route (`0xA005`) adds one to it and sets flag 0 once it
reaches 6.[^voyage-counter] Ali therefore needs **six voyages that reach
voyage day 5** after Catalina's encounter; the voyage during which the
encounter happens counts if it later reaches day 5. A voyage shorter than five
days does not count, and a longer one counts once.

| Building        | Before the news arrives                         | After the sixth qualifying voyage                                     |
| --------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Pub             | Ladia has heard nothing from João.              | Ladia relays João's news: Sapha works at the **Basra** Pub. Advances. |
| Harbor          | The Harbor Master is bored.                     | Ladia wants to speak to Ali. Ejects.                                  |
| Other buildings | Tax-permit advice, rest, repairs, and flattery. | The same.                                                             |

Ladia's lines “$n! You're alright! … Was Joao able to escape?” (messages
426–428) require flag 1. No route sets flag 1 in this subsection, and the
voyage-day-1 transition cleared it, so these lines appear unreachable.

### Find Sapha

| Stage      | Required action         | What changes                                                                                                                             |
| ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Meet Sapha | **Basra Pub** (port 76) | Sapha recognizes the name of the brother she lost, but is not yet convinced it is Ali. Ali gains **1,000 Trade Fame** and flag 0 is set. |
| Tell Ladia | Istanbul **Pub**        | Ali tells Ladia; Salim admires Sapha. The scenario advances to section 3.                                                                |

Before the meeting, the Basra Harbor sends Ali to the Pub and ejects him, and
other Harbors outside Istanbul and Basra suggest sailing to Basra. After it,
the Basra Harbor has Salim's congratulations, other Harbors suggest telling
Ladia, and later Basra Pub visits play a short “I've come to visit you again”
scene. The Istanbul Pub before the meeting urges Ali to go to Basra.

## Section 3: Ottoman expansion and Pietro's debt

### Control 30 ports

Enter a **Harbor outside Istanbul**. If Ali is still Ottoman-affiliated, the
route counts ports whose controller value is 2 (Ottoman) across port IDs
0–99. At **30 or more**, flag 0 is set silently; the Harbor otherwise behaves
normally.[^port-count] Istanbul's own Harbor route takes precedence and cannot
arm the flag.

Once flag 0 is set, the Istanbul **Pub**, **Harbor** (which ejects), and
**Lodge** say that Radino has been transferred and wants to see Ali. Visit the
Istanbul **Bank**: Radino has been posted to Venice and asks to sail with Ali.
Flag 0 is cleared and the subsection advances. Before the flag, these
buildings have small talk only.

The Basra Pub keeps its short revisit scene from here until Rustem's scene in
section 5.

### Howell's request in Venice

| Stage            | Required action                   | What changes                                                                                                                                                   |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Take Radino home | **Venice Bank** (port 13)         | Radino fetches Howell, who asks Ali to collect a loan from Pietro. His reply to Ali depends on variable 20. A Yes/No prompt follows; either answer ejects Ali. |
| Accept           | —                                 | Flag 0 is set.                                                                                                                                                 |
| Refuse           | —                                 | The scenario advances directly to **section 4**, skipping the collection.                                                                                      |
| Plan the search  | **Venice Harbor** after accepting | Salim proposes asking Pietro's sponsor in Lisbon. Flag 0 is cleared and the subsection advances.                                                               |

Until Radino has been delivered, the Venice Harbor ejects Ali with “Let's get
Radino to the bank,” and other Harbors outside Istanbul repeat the reminder.

### Follow Pietro to Zipangu

| Stage              | Required action                              | What changes                                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ask the Duchess    | Lisbon **Franco home** (special building)    | Marco admits Ali; Duchess Christiana learns that João helped find Sapha and that Catalina is after him. She gives **10 Gold Ingots** (five additions of 20,000) and says Pietro sailed for Zipangu, near 35°N, 135°E. Flag 0 is set. |
| Leave Lisbon       | Lisbon **Harbor**                            | Salim notes the distance. The subsection advances.                                                                                                                                                                                   |
| Optional clue      | **Nagasaki Pub** (port 99)                   | Pietro has been visiting but has probably gone east to Sakai. Sets flag 0.                                                                                                                                                           |
| Find Pietro        | **Sakai Pub** (port 98)                      | Pietro repays; see the table below. Flag 1 is set.                                                                                                                                                                                   |
| Settle with Howell | **Venice Bank** with at least 40 Gold Ingots | Howell's banker takes exactly 40 ingots and the scenario advances to section 4.                                                                                                                                                      |

Before the Duchess visit, the Lisbon Harbor ejects Ali (“We'd better hurry up
and go see the Duchess Franco”), and other Harbors point to Lisbon. The Venice
Bank thanks Ali prematurely during this stage.

The Japanese Harbors restrict departure until the search has progressed:

- The **Sakai Harbor** ejects Ali until Pietro has been found.
- The **Nagasaki Harbor** ejects Ali until either Pietro has been found or the
  Nagasaki Pub clue has been heard. Arriving at Nagasaki first therefore makes
  the clue necessary before Ali can use the Nagasaki Harbor menu.
- Other Sakai and Nagasaki buildings reply that they have never heard of
  Pietro.

Pietro's payment depends on the section-1 choice:

| Earlier choice           |                             Gold received from Pietro | Trade Fame at Sakai | Trade Fame at the Venice settlement |
| ------------------------ | ----------------------------------------------------: | ------------------: | ----------------------------------: |
| Lent Pietro 10,000       | 210 ingots: 10 personal repayment plus 200 for Howell |               1,000 |                      1,000 (Likely) |
| Refused Pietro's request |                         40 ingots for Howell (Likely) |                 500 |                        500 (Likely) |

The generous branch sets its amount explicitly. The refusal branch and the
Venice Fame award instead use values left in scenario variables by earlier
routes.[^stale-vars] After the settlement, the generous branch retains 170 of
Pietro's 210 ingots.

At the Venice Bank, entering with fewer than 40 ingots produces “You don't seem
to have it” and the reminder that Howell expects 40 gold ingots. Other Harbors
remind Ali to sail to Zipangu or, after Sakai, to take the money to Venice.

## Section 4: Fifty Ottoman ports and the Sultan's reward

| Place                        | Story behavior                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Harbor outside Istanbul      | With Ottoman affiliation, counts Ottoman-controlled ports and sets flag 0 at **50 or more**.[^port-count]                                                                             |
| Istanbul Harbor              | With Ottoman affiliation and flag 0: a Palace messenger has been looking for Ali. Ejects. Otherwise small talk.                                                                       |
| Istanbul Shipyard            | With Ottoman affiliation and flag 0: go to the Palace quickly. Otherwise repair talk.                                                                                                 |
| Istanbul Palace (Meet Ruler) | The Sultan quotes the Ottoman port count, gives **100 Gold Ingots** (50 additions of 20,000), awards **1,000 Trade Fame**, asks Ali to keep going, and advances to section 5. Ejects. |
| Other Istanbul buildings     | Small talk; the house remains empty.                                                                                                                                                  |

The audience route (`0x245A–0x2503`) contains **no test of flag 0** or of the
port count; the count only fills the “$d03 allied ports” text. The 50-port flag
drives only the Harbor and Shipyard reminders. Meet Ruler at the Istanbul
Palace therefore completes section 4 whenever it is used during the
section.

## Section 5: Sapha, Rustem, and the house

### Reach 40,000 Trade Fame

1. Enter a **Harbor outside Istanbul** with at least **40,000 Trade Fame**
   while still Ottoman-affiliated. A local accuses Ali of causing suffering:
   Ottoman allies are drafting their men. Flag 0 is set.
2. Enter a **Pub** in a port whose controller value is 2 (Ottoman), other than
   Istanbul and Basra, still with 40,000 Trade Fame and Ottoman affiliation.
   The patron confirms the war preparations and confiscations. Flag 0 is
   cleared and the subsection advances.[^fame-order]

The Harbor scene must come first; visiting only Pubs does not trigger the
transition. The Istanbul and Basra Pubs have their own routes, which take
precedence over the any-port Pub route.

### Sapha and Rustem

Visit the **Basra Pub** while Ottoman-affiliated. Sapha calls Ali “big brother”
for the first time and introduces Rustem, an orphan whose parents lost their
savings to war confiscations. Salim proposes buying a house in Istanbul, and
Ali decides to make it a home for orphans. The subsection advances. Without
Ottoman affiliation, the Pub plays only the short revisit scene.

### Introduce the family in Istanbul

| Building         | Before the Pub scene                                                 | After the Pub scene                      |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Pub              | Ladia meets Sapha and Rustem and says Howell owns the house. Flag 0. | Asks whether Ali has seen Howell.        |
| Harbor           | Introduces Sapha (flag 2). Ejects.                                   | Congratulations (flag 2 on first visit). |
| Shipyard         | Introduces Sapha (flag 3).                                           | Congratulations (flag 3 on first visit). |
| Other businesses | Introduces Sapha (flag 4).                                           | Congratulations (flag 4 on first visit). |
| Lodge            | Suggests telling Ladia.                                              | Ali thanks the keeper.                   |
| Special building | Salim suggests asking Ladia who is selling. Ejects.                  | Salim learns Howell owns it. Ejects.     |

Only the Pub's flag 0 is required. Flags 2–4 only switch the other buildings to
their follow-up lines.

### Howell's price

Visit the **Venice Bank** after the Istanbul Pub scene. On the first visit,
Howell sets the price in scenario variable 21:[^house-price]

```text
price = min(current Gold Ingots + 500, 10,000)
```

The price is deliberately above Ali's holdings unless he already has 10,000
ingots or more, so Howell normally sends him away to raise it. The recorded
price persists. On later visits, Howell compares the current ingots with it.
Once Ali has enough, Howell asks whether to settle; **No** leaves the offer
open. **Yes** reveals that Howell is giving the house away free, as a test of
Ali's resolve, and advances the subsection. The route contains no gold
subtraction.

The **Venice Harbor** and other Harbors outside Istanbul report whether Ali
has reached the recorded price. Before the price is set, the Venice Harbor
ejects Ali toward Howell once the Istanbul Pub scene has played.

### Ending

Return to the **Istanbul Pub**. Ali tells Sapha and Ladia that the house is
bought, and proposes to Ladia. The narrator says Ali sets out again to find
orphans in need, and `F4 05` plays Ali's ending.[^ending] Other Istanbul
buildings react to the purchase.

[^ingots]:
    Action `EA <variable>` stores `floor(carried gold / 10,000)` in the
    variable (`MAIN.EXE 0x38E7C → 0x37F25`); the carried gold is save-slot
    offset `0x60A`. Gold is added and removed by `E6` and `E7` with a 16-bit
    variable, which is why the scripts repeat 20,000-gold additions in loops.

[^affiliation]:
    The test is `DC 00 03 05 29`, a byte read, `AND 0x0F`, and a comparison
    with `2`. It occurs at `SNR6.DAT 0x0CC9` (section-1 Lodge), `0x0D3E`
    (section-1 wildcard), `0x1B18` (30-port Harbor count), `0x23D7` and
    `0x2428` (section-4 Istanbul Harbor and Shipyard reminders), `0x257B`
    (50-port count), `0x26CB` and `0x2746` (40,000-Fame Pub and Harbor), and
    `0x287E` (Rustem scene). All nine are reads; `SNR6` never writes byte
    `+0x29`. The low bits of that byte are the protagonist's current
    affiliation, compared by the Palace's Defect and Meet Ruler logic with the
    port controller ([Defection](../friendship.md#defection)); Ali's
    template value is `0x62`.

[^opening-ship]:
    The Shipyard route at `SNR6.DAT 0x0221–0x022B` executes `FB 4E`, adding
    sailor 78 (Salim Jahan) to the mate roster, writes `3` (First Mate) to his
    duty byte `+0x26`, and executes `F9 05`, creating a pending ship of raw
    model 5 (display model 6, Caravela Latina) at 90% durability. The
    subsection-2 Shipyard route commissions it at `0x0653` with `FA 05 0098`,
    naming it from message 153, “Savahni.”

[^opening-flags]:
    Section 0 routes are in three tables: the primary table (subsection 0),
    `0x025F` (subsection 1), and `0x056F` (subsection 2). The investments are
    at `0x0317` (Pub), `0x03B3` (Harbor), and `0x03F3`/`0x045C` (Bank); flags
    0, 1, and 2 are written at `0x0337`, `0x03B9`, and `0x047C`, each followed
    by `F0` when the other two are set. Ladia's favor write is
    `DC 00 05 02 0C; 1D 00 32` at `0x032F`. The voyage-day-1 route at `0x06A9`
    executes `F1` only when flag 3 is set.

[^lodge-cat]:
    `SNR6.DAT 0x04EA–0x052D`. The menu writes the zero-based choice to
    variable 1. Choice 0 adds 500 gold (`0x0502`). Choice 1 writes raw item
    `0x19` (Cat) through `DC 00 06 00 3F`, the **first** inventory slot,
    without checking whether that slot is empty; any item already in slot 1 is
    overwritten. Flag 4 is set at `0x052D`. The route sets variable 63 and
    does not end in `F8`, so the Lodge menu opens afterward.

[^debt-code]:
    Section 1's primary table routes the Pub to `0x06E9`, the Harbor to
    `0x088D`, the Bank to `0x0A77`, the Shipyard to `0x0B99`, the Lodge to
    `0x0CC9`, the wildcard to `0x0D3E`, and voyage day 1 to `0x0DE3`. The
    money tests are `EA` followed by `!= 0` (Pub `0x0779`, Shipyard `0x0C02`)
    or `> 1` (Harbor `0x0905`, Bank `0x0AB9`). The 500-Fame additions are at
    `0x085D` (Pub), `0x0951` (Harbor, unconditional), `0x0A47` (Harbor, lend
    branch only), `0x0B69` (Bank), and `0x0C81` (Shipyard); each reads word
    `+0x00` (Trade) of Fame record 5, adds, and caps at 50,000. Ladia's favor
    is set to 100 at `0x084D`. The rank test reads byte `+0x0D` of the same
    record. The voyage-day-1 route tests flags 0–4 and executes `F0`.

[^port-count]:
    `D0 01 0C 00 13` selects byte `+0x13` of the port record indexed by live
    variable 0. Each loop masks it with 7, counts values equal to 2, and runs
    for port IDs 0–99 with no capital exclusion, so Istanbul counts. The loops
    are at `SNR6.DAT 0x0E46` (first audience, count shown as `$d16`),
    `0x1B2F` (≥ 30 at `0x1B59`), `0x245A` (second audience, shown as `$d03`),
    and `0x2592` (≥ 50 at `0x25BC`). The counting Harbor routes are `0xA303`;
    Istanbul's specific `0x0203` route takes precedence.

[^permit]:
    `SNR6.DAT 0x0F14–0x0F6E` scans the twenty inventory bytes at group-6
    offset `+0x3F`. Raw item `0x25` (Tax Permit (O)) skips the gift. Otherwise
    the scan remembers the first `0xFF` slot; with one, messages 313–315 play
    and `0x25` is written there, and with a full inventory the gift and its
    messages are skipped. Both paths continue with message 316, `F8`, and `F1`.

[^decoy]:
    Ali's fleet is fleet ID 20 (`0x14`, sailor 5's fleet byte) and Catalina's
    is fleet 10 (`0x0A`). The Pub scene at `SNR6.DAT 0x1282–0x12B4` copies
    fleet 20's current X/Y into fleet 10, writes objective `7` (pursue),
    target sailor `5` (Ali), and flags `0x41`, then executes `D1`. It does not
    write ship slots, so Catalina's fleet has whatever ships `MAIN.EXE`'s
    monthly maintenance has given it (see the
    [João scenario](./scenario-1-joao-franco.md#catalinas-pursuit)). The
    before-battle route `0xA101` (table `0x13F1`, code `0x13F9`) again copies
    Ali's position into fleet 10, writes objective `0` (return home) with
    argument port `1` (Seville), clears the flags byte `+0x29` to `0`, and
    executes `D1` at `0x1491`. With the active bit clear, the fleet is removed
    from the sea. The route ends `F8 F0 F2`; `MAIN.EXE 0x150EB–0x15105` turns
    the zero control word into cancellation code 8.

[^voyage-counter]:
    Route `0xA005` at `SNR6.DAT 0x15F5–0x15FD`: `4C 0A 01`, `8E 0A 06`, then
    `2C 00 01`. The calendar loop at `MAIN.EXE 0x1B2D7–0x1B2F2` calls
    `0x2052F` once for each new day and then increments the day. `0x2052F`
    dispatches selector `0xA0` with the voyage-day counter `DS:0x2BAA` as its
    qualifier only while the current port is `0xFF` (at sea). The counter is
    incremented at midnight at `0x1E979` and cleared by Sail at `0x2D7B4`. A
    one-byte counter would need to wrap past 255 to match qualifier 5 again
    on the same voyage.

[^stale-vars]:
    On the refusal branch the Sakai Pub route (`SNR6.DAT 0x2270–0x22A3`) adds
    variable 0 twenty times without assigning it. The last route that writes
    variable 0 before it is the Duchess's gift loop, which leaves it at 20,000
    (`0x1F38`). None of the routes that can run between the two scenes writes
    variable 0 (the Venice Bank's `EA 00` at `0x20DE` runs only after Pietro
    is found), and no before- or after-battle routes exist in this section.
    The payout is therefore 400,000 gold, the 40 ingots Pietro's message 725
    describes. The Venice settlement at `0x211D–0x2139` adds variable 2 to
    Trade Fame **before** it assigns `v2 = 1000` at `0x2128`, so the award is
    the value left by the Sakai route: 1,000 (`0x226A`) or 500 (`0x22AC`).
    The settlement deducts 20 × 20,000 gold at `0x2108–0x211A`, and requires
    `EA ≥ 40`. These results are labeled Likely only because they depend on
    no executable path writing protagonist variables 0 or 2.

[^fame-order]:
    Harbor route `0xA303` at `SNR6.DAT 0x2746` tests affiliation, Trade Fame
    `≥ 40,000` (`0x2765–0x2769`), and flag 0 clear, then sets flag 0. Pub
    route `0xA301` at `0x26CB` tests affiliation, Trade Fame, the current port
    (system value 5) through `D0 01 0C 00 13` masked to controller 2, and flag
    0 set, then clears it and executes `F0`.

[^house-price]:
    `SNR6.DAT 0x2BCD–0x2CE3`. `EA 00` reads the ingots; on the first visit
    (flag 1 clear) `v21 = v0 + 500` is capped by comparison with 10,000 and
    flag 1 is set at `0x2C37`. The comparisons at `0x2C3A` and `0x2C5A` send
    Ali away while `ingots < v21`. Otherwise message 909 (first visit) or 911
    (later) is an `E9` prompt; flag 10 set leads to messages 913–923 and `F0`.
    Messages 907–912 and the Harbor reminders insert the price with `$d21`.

[^ending]:
    `SNR6.DAT 0x2DA1–0x2E3A`, table `0x2D75`. `CA 09` plays Ali's theme,
    messages 934–950 follow, then `F4 05` and `F1`.

## Compact building guide

| If the story seems stuck at… | Try…                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| The opening                  | Istanbul Shipyard → Pub, Harbor, Bank → Shipyard → recruit crew at the Pub → sail                       |
| The four debts               | Carry 20,000+ gold; pay at the Istanbul Pub, Harbor, Bank, and Shipyard                                 |
| The Palace summons           | Gain any title while Ottoman; visit the Lodge and another Istanbul business, or sail after the business |
| The first audience           | Istanbul Palace → Meet Ruler                                                                            |
| 100 ingots                   | Enter a tested building holding 1,000,000 gold, then sail                                               |
| João and Catalina            | Istanbul Pub → Istanbul Harbor → sail until Catalina's fleet intercepts                                 |
| Waiting for Sapha            | Six voyages that each reach voyage day 5, then the Istanbul Pub                                         |
| Finding Sapha                | Basra Pub → Istanbul Pub                                                                                |
| Radino's transfer            | Reach 30 Ottoman ports, enter a Harbor outside Istanbul, then the Istanbul Bank                         |
| Pietro's debt                | Venice Bank → Venice Harbor → Lisbon Franco home → Lisbon Harbor → Sakai Pub → Venice Bank (40 ingots)  |
| Stuck in Nagasaki            | Visit the Nagasaki Pub for the clue before using the Harbor                                             |
| The second audience          | Istanbul Palace → Meet Ruler (50 ports is not required)                                                 |
| 40,000 Trade Fame            | Harbor outside Istanbul, then a Pub in another Ottoman-controlled port                                  |
| Rustem                       | Basra Pub while still Ottoman-affiliated                                                                |
| The house                    | Istanbul Pub → Venice Bank → raise ingots to the quoted price → Venice Bank → Istanbul Pub              |

## Engine notes

These executable details, decoded outside the scenario program, explain behavior described above.

- **An empty Catalina fleet still meets Ali.** The script sets fleet 10's
  active flags (`0x41`) without filling its ship slots. The active bit is
  cleared only when the fleet's strength is recalculated and finds no ships
  (`MAIN.EXE 0x1D44C`), so a fleet emptied before the decoy still pursues Ali,
  can be inspected with View, and triggers the decoy scene. On the sea it is drawn
  with the oared computer-fleet sprite, because an empty slot 0 reads as an
  oared ship ([Fleet sprites](../at-sea.md#fleet-sprites)).
- **Stale variables 0 and 2.** `MAIN.EXE` writes only protagonist variables
  60 and 63, and all 64 variables are zero in the new-game data, so the
  values these scenes reuse come only from earlier `SNR6.DAT` routes.
- **Pub lines 426–428 are unreachable.** No executable routine writes the
  protagonist scenario-flag bytes (`DS:0x0E5A–0x0E61`), so the flag-1 guard
  stays clear during the waiting subsection.
- **Bit `0x08` of sailor byte `+0x29`** is never set on a protagonist. The only
  executable writers of a protagonist's byte are **Defect**, which copies a
  3-bit nation (`MAIN.EXE 0x305A8–0x305B9`), and the pirate conversion, which
  writes 6 (`0x15FCF–0x15FD7`); no `SNR6.DAT` instruction writes it.

## Open questions

None remain; the last ones are answered in [Engine notes](#engine-notes).
