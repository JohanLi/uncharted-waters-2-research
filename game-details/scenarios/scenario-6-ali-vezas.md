# Scenario 6: Ali Vezas

Ali's scenario is driven mainly by money, rank, Ottoman control of ports, and
earlier choices. Trade Fame becomes a direct story gate only in the final
section. This makes a Fame-only progression model especially misleading for
Ali.

The details below are decoded from `SNR6.DAT`. Building and dialogue behavior
is therefore exact unless a note explicitly calls for runtime confirmation.

## Story and threshold map

| Section | Gate                                       | Story                                       |
| ------: | ------------------------------------------ | ------------------------------------------- |
|       0 | Obtain the Savahni                         | Salim's debt and Ali's first investors      |
|       1 | Four repayments and two title reactions    | Pietro, Howell, and the Sultan's commission |
|       2 | 100 Gold Ingots                            | João, Catalina, and Sapha                   |
|       3 | 30 Ottoman-controlled ports                | Radino, Howell, and Pietro's debt           |
|       4 | 50 Ottoman-controlled ports                | The Sultan's 100-ingot reward               |
|       5 | 40,000 Trade Fame, then the house sequence | Sapha, Rustem, and Ali's ending             |

Gold Coins and Gold Ingots are separate displayed components. Every 10,000
coins becomes one ingot, so the 100-ingot comparison in section 2 means
1,000,000 total gold.

## Section 0: Salim's debt and the Savahni

### Opening Shipyard scene

Enter the **Istanbul Shipyard**. The shipwright explains that Salim's father
died when his ship was wrecked. Repairs would cost 1,000 Gold Coins now, but
Ali and Salim have no money. The shipwright offers to defer payment until they
can pay 10,000 instead.

Ali accepts. He and Salim decide to become merchants and search for Salim's
missing sister, Sapha. This advances the opening subsection.

### Gather the first 4,000 Gold Coins

Three Istanbul visits are required. Each contributes 1,000 Gold Coins and sets
one story flag:

| Building | Event                                                                       |
| -------- | --------------------------------------------------------------------------- |
| Pub      | Ladia invests 1,000 Gold Coins in Ali.                                      |
| Harbor   | An acquaintance invests 1,000 Gold Coins in Ali.                            |
| Bank     | Ali withdraws his own 1,000; Radino adds another 1,000 to complete the sum. |

After all three flags are set, the scenario advances automatically. Until
then, most other Istanbul buildings only remind Ali to raise the money and
then eject him back outside.

### Optional Lodge choice

The **Istanbul Lodge** has an optional one-time event during this stage. Ali
may accept 500 Gold Coins or refuse them and receive a cat instead. This sets a
separate flag and is not required for the story.

### Receive the ship

Return to the **Istanbul Shipyard**. The shipwright supplies the repaired ship,
which Ali names the Savahni. The event sets the ship-obtained flag.

Begin a voyage. On voyage day 1, the scenario sees that flag and advances to
section 1.

## Section 1: Repayments and the first Palace summons

### Repay the four debts

Four Istanbul buildings each resolve one debt and set one required flag:

| Building | Requirement       | Result                                                                                         |
| -------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Pub      | At least 1 ingot  | Pays Ladia 10,000 Gold Coins. Ladia agrees to help search for Sapha.                           |
| Harbor   | More than 1 ingot | Pays the original investor 10,000. Pietro is introduced, followed by a choice described below. |
| Bank     | More than 1 ingot | Pays Radino 10,000. Radino introduces Ali to Howell.                                           |
| Shipyard | At least 1 ingot  | Pays the deferred 10,000 repair debt and receives the investment/alliance tutorial.            |

The Harbor and Bank use a stricter comparison than the other two: Ali must
have more than one displayed Gold Ingot when entering.

At the Harbor, Pietro asks for a further 10,000 Gold Coins. Lending it records
one branch; refusing records the other. The story advances either way, but the
choice changes Pietro's later repayment and Ali's Trade Fame award in section 3.

### Gain a title and receive both reactions

Ali must have a nonzero rank/title. Two Istanbul reactions then set the final
pair of flags:

| Place                          | Event                       |
| ------------------------------ | --------------------------- |
| Any eligible ordinary business | A former critic apologizes. |
| Lodge                          | Ali is congratulated.       |

With all four debt flags and both title-reaction flags set, the subsection
advances to the Palace-summons stage.

There is one decoded shortcut: the voyage-day-1 transition tests the four debt
flags and the critic's apology, but not the Lodge congratulation. Taking that
route can therefore advance without seeing the Lodge reaction.

### Exact trigger for the Harbor messenger

Once the Palace-summons stage has begun, enter the **Istanbul Harbor**. The
Harbor Master says:

> A messenger from the palace was just here looking for you, sir.

He then tells Ali that the message sounded urgent and suggests going to the
castle. The scene ends with the dialogue/ejection sequence, so the normal
Harbor menu does not open.

The Istanbul Pub and ordinary businesses also point Ali toward the Palace,
with their own wording. This message is therefore not triggered directly by a
Fame or gold comparison: it is active after the repayment/title stage has
advanced and before the Palace audience.

### Palace audience

Use the story-specific **Palace audience**. The Sultan commissions Ali to
expand Ottoman influence and:

- gives Ali 50 Gold Ingots;
- attempts to give a tax-free permit, if there is room for it; and
- comments on the number of Ottoman-controlled ports already present.

The audience advances to section 2.

## Section 2: João, Catalina, and Sapha

### Hold 100 Gold Ingots

While in Istanbul, enter an eligible ordinary building with at least **100
Gold Ingots**. The check sets an internal story flag but does not itself
advance the section.

Begin a voyage. On voyage day 1, that flag is cleared and the scenario advances
to the next subsection.

### João's decoy sail

Back in Istanbul, most buildings report that João and Ladia have been injured.
Visit the **Pub** to meet João. Ali agrees to alter his sail and serve as a
decoy.

Then visit the **Harbor**. If Ali has not met João yet, the Harbor only repeats
the rumor and ejects him. After the Pub scene it clears the meeting flag and
advances the story.

### Avoid the battle with Catalina

The next event occurs immediately before a battle against opposing captain 1,
Catalina. Ali recognizes her and talks his way out of the fight. This advances
the scenario without requiring the battle to be fought.

### Wait for news

The João scene initializes a counter. Every voyage-day-5 event increments it;
the sixth such event arms the next Pub scene. This is not simply six calendar
days—the counter advances on the recurring day-5 voyage event.

Return to the **Istanbul Pub** once it is armed. João reports that Sapha has
been found in Basra, and the story advances.

### Find Sapha

Go to the **Basra Pub**. Ali reunites with Sapha and gains **1,000 Trade
Fame**.

Return to the **Istanbul Pub** and tell Ladia what happened. This closes the
João/Sapha chapter and advances to section 3. Harbor dialogue points Ali
toward the relevant Pub during both halves of this sequence.

## Section 3: Ottoman expansion and Pietro's debt

### Control 30 ports

On entering a non-Istanbul ordinary Harbor, the scenario scans all 100 regular
port records, masks each port's control/status value to its low three bits, and
counts ports whose value is 2—Ottoman/Turkish control. This is the same cached
controller field used by the Palace economic-power calculation.

The loop includes port IDs 0 through 99 without excluding capitals, so
Istanbul counts toward Ali's total. Foreign capitals also remain in the loop,
although their fixed controllers do not become Ottoman through investment.
Non-port special locations are outside the 100-record table.

The threshold is exactly **30 Ottoman-controlled ports**. Below 30, the story
does not advance. At 30 or more, the Harbor immediately and silently sets the
completion flag.

Istanbul has its own specific Harbor route, which takes precedence over the
any-regular-port counting route; Istanbul Harbor therefore cannot arm this
flag. After arming it elsewhere, Istanbul dialogue says that Radino has been
looking for Ali. Visit the **Istanbul Bank** to hear about Radino's transfer to
Venice and advance the scenario.

### Meet Howell in Venice

Visit the **Venice Bank**. Radino introduces Howell, who asks Ali to collect a
debt from Pietro.

- **Accept:** the collection route continues. Leave through the Venice Harbor,
  which directs Ali to Lisbon.
- **Refuse:** the scenario skips the entire collection route and advances
  directly to section 4.

### Follow Pietro to Japan

If Ali accepted:

1. Visit the special building at Lisbon—João Franco's home. Ali receives 10
   Gold Ingots and learns that Pietro went in search of Zipangu.
2. Visit the Lisbon Harbor to advance the route.
3. The Nagasaki Pub supplies an optional clue.
4. Visit the Sakai Pub to find Pietro. The Nagasaki clue is not required.

The earlier Harbor choice now matters:

| Earlier choice           | Gold received from Pietro | Trade Fame |
| ------------------------ | ------------------------: | ---------: |
| Lent Pietro 10,000       |           210 Gold Ingots |      1,000 |
| Refused Pietro's request |            40 Gold Ingots |        500 |

The 210-ingot result consists of 10 ingots as Pietro's personal repayment plus
200 for Howell. The refusal branch receives only Howell's 40-ingot amount.

Return to the **Venice Bank** with at least 40 Gold Ingots. Howell takes
exactly 40, and the scenario advances to section 4. Thus the generous branch
retains 170 of Pietro's 210 ingots after settlement.

## Section 4: Fifty Ottoman ports and the Sultan's reward

The same port-control scan is repeated at non-Istanbul ordinary Harbors, now
with a threshold of exactly **50 Ottoman-controlled ports**.

At 50 or more, the flag is set. The **Istanbul Harbor** and **Istanbul
Shipyard** then tell Ali that he has been summoned to the Palace.

Use the story-specific **Palace audience**. The Sultan:

- gives Ali 100 Gold Ingots;
- awards **1,000 Trade Fame**; and
- advances the scenario to section 5.

This is a later summons than the Harbor message quoted in section 1. Its
Harbor dialogue is different and requires the 50-port flag.

## Section 5: Sapha, Rustem, and the house

### Reach 40,000 Trade Fame

This gate has two ordered steps:

1. Enter a non-Istanbul ordinary **Harbor** with at least **40,000 Trade
   Fame**. Ali hears criticism of his success, and a story flag is set.
2. Enter an ordinary **Pub** in an Ottoman-controlled port while still holding
   at least 40,000 Trade Fame. The follow-up scene clears the flag and advances
   the subsection.

The Pub must be in a port whose control/status value identifies it as Ottoman.
The Harbor scene therefore comes first; visiting only Pubs will not trigger
the transition.

The Harbor route also checks that Ali's protagonist-state byte has low-nibble
value 2. That is the normal Ottoman state used by Ali, but the broader meaning
of this field is not yet named. It is distinct from the current-port control
check used by the Pub.

### Sapha and Rustem

Visit the **Basra Pub**. Sapha accepts Ali as her big brother and introduces
the orphan Rustem. Ali begins planning a home for them and other orphans.

### Introduce the family in Istanbul

Return to Istanbul:

- The special house tells Ali to ask Ladia.
- The **Pub** introduces Sapha and Rustem and reveals that Howell owns the
  house. This sets the flag required for the Venice negotiation.
- The Harbor, Shipyard, Lodge, and an ordinary-business route contain optional
  introduction scenes. They set separate flags but are not prerequisites for
  the house.

### Howell's price

Visit the **Venice Bank** after the Istanbul Pub scene. Howell's asking price,
in Gold Ingots, is recorded as:

`min(Ali's current Gold Ingots + 500, 10,000)`

Because the price is deliberately set above Ali's current holdings on the
first visit, Ali normally cannot buy the house immediately. The recorded price
persists; Harbor reminders can report the amount or say that Ali still lacks
enough.

Raise Ali's holdings to the recorded target and return to Howell. Refusing his
prompt leaves the route available. Accepting reveals that Howell is giving the
house to Ali for free and advances the story. The bytecode does **not** deduct
the recorded price.

### Ending

Return to the **Istanbul Pub**. The family gathers, Ali proposes to Ladia, and
the scenario ending plays.

## Key bytecode evidence

| Finding               | Scenario evidence                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| First Harbor summons  | Messages 296–298 at `SNR6.DAT 0x0E31`; the route ends in `F8 F2`, suppressing the Harbor menu                       |
| First Palace audience | Story interaction key `0x0215`; awards 50 ingots and advances to section 2                                          |
| Money gate            | `EA` reads displayed Gold Ingots; section 2 compares the result with literal 100                                    |
| Port-control gates    | `D0 01 0C 00 13` scans all 100 port records; low three bits equal to 2 are counted against 30 and 50                |
| Final Fame order      | Harbor key `0xA303` sets the flag at 40,000; Pub key `0xA301` consumes it in an Ottoman-controlled port             |
| House price           | Scenario variable 21 stores current ingots + 500, capped at 10,000; the success branch contains no gold subtraction |

## Practical progression guide

| If the story appears stuck at… | Check…                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Opening                        | Visit Istanbul Shipyard, Pub, Harbor, and Bank; then return to Shipyard        |
| First Palace summons           | Repay all four 10,000 debts, gain a title, and see the reaction scenes         |
| João/Catalina/Sapha            | Hold 100 ingots, start a voyage, follow Istanbul Pub → Harbor, then wait       |
| Radino's transfer              | Bring Ottoman control to at least 30 ports, then visit Istanbul Bank           |
| Pietro's collection            | Follow Venice → Lisbon → Sakai; Nagasaki is only an optional clue              |
| Second Palace summons          | Bring Ottoman control to at least 50 ports and enter a non-Istanbul Harbor     |
| Final Fame gate                | At 40,000 Trade Fame, enter a non-Istanbul Harbor, then an Ottoman Pub         |
| House purchase                 | Trigger Istanbul Pub, visit Venice Bank, then raise ingots to the quoted price |

## Remaining high-value validation

- Confirm how many voyage departures are needed for the recurring day-5
  counter under different sailing patterns.
- Confirm the exact inventory-full behavior when the Sultan awards the
  tax-free permit.
