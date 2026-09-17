# Trade Fame

Trade Fame measures commercial and political success. It drives Ali's story,
although any protagonist can earn it. The maximum is 50,000.

The repeatable sources in the DOS version are:

- causing a port to become allied with the protagonist's nation; and
- completing Trade Fame Guild assignments before their deadlines.

Ordinary buying and selling does not itself award Trade Fame. Investment is
useful because it changes national support, but Fame is awarded only when that
support change makes the port an ally.

## Making an allied port

After an investment changes a port's controlling nation, the executable checks
whether the port has just become allied with the protagonist's nation. If so,
it awards:

```text
Trade Fame = current Economy + current Industry
```

Economy and Industry each range from 0 to 1,000, so one alliance change can
award at most 2,000 Trade Fame. The calculation uses the port's ratings after
the investment.

There is no award merely for raising Economy or Industry while the port remains
allied. Conversely, the code tests for a transition from another nation to the
protagonist's nation, so a port which is lost and later reclaimed can award
Fame again.

Either Market or Shipyard investment can produce the alliance change. Market
investment raises Economy, while Shipyard investment raises Industry; both
ratings contribute to the Fame award regardless of which investment completes
the takeover.

## Guild assignments

Four Guild assignments can award Trade Fame. The values below come from the
shared `SNR0` scenario bytecode.

| Assignment      | Rank band       | Deadline | Trade Fame |
| --------------- | --------------- | -------: | ---------: |
| Deliver Letter  | Any             |  30 days |         50 |
| Transport Goods | Commoner–Squire |  30 days |        200 |
|                 | Knight–Baron    |  60 days |        700 |
|                 | Viscount–Duke   |  90 days |      1,500 |
| Buy Goods       | Commoner–Squire |  30 days |        200 |
|                 | Knight–Baron    |  60 days |        700 |
|                 | Viscount–Duke   |  90 days |      1,500 |
| Collect Debt    | Commoner–Squire |  30 days |        150 |
|                 | Knight–Duke     |  90 days |        500 |

Collect Debt is unusual: timely completion adds the same 150 or 500 points to
both Trade Fame and Piracy Fame. It does not award Adventure Fame. Some guides
incorrectly list 300 or 1,000 Adventure Fame; those figures are the combined
Trade and Piracy increases.

The fixed gold payment for Deliver Letter is 700. The other assignments use
rank-dependent payments, and Buy Goods also calculates an advance from the
goods, quantity, and local price. Gold therefore should not be inferred from
the Fame column.

### Deadlines and failure

The full Fame award is made only on timely completion. A late completion can
pay half the promised gold but adds no Fame.

Giving up before the deadline generally leaves approximately 90% of the
affected Fame, rounded down to a multiple of ten. Letting an assignment expire
generally leaves approximately 80%. For Collect Debt, both Trade and Piracy
Fame are reduced. The bytecode also contains mission-specific failure paths,
so intentionally failing a Guild assignment is not a precise way to set Fame.

## Story awards

Ali receives the following one-time Trade Fame awards from his scenario:

| Story event                                     |   Trade Fame |
| ----------------------------------------------- | -----------: |
| First reunion with Sapha                        |        1,000 |
| Pietro and the Marco Polo Bank loan sequence    | 500 or 1,000 |
| Sultan's allied-port and 100-ingot reward scene |        1,000 |

The Pietro sequence depends on Ali's earlier choice at the Istanbul Harbor.
Lending Pietro 10,000 Gold Coins selects the 1,000-Fame route; refusing him
selects the 500-Fame route.

Every repeatable and story award is limited so that Trade Fame cannot exceed
50,000.

## Story threshold

Ali's final Sapha and Istanbul-house sequence contains two exact checks for
40,000 Trade Fame. First, an ordinary Harbor scene sets a story flag. An
ordinary Pub in an Ottoman-controlled port then consumes that flag and
advances the story. His earlier chapters are driven mainly by money, rank, and
the number of Ottoman-controlled ports rather than by additional Trade Fame
thresholds.

## Code evidence

The relevant calculations are located at:

- `MAIN.EXE` file offsets `0x327C3–0x328A3`: detect a new alliance and add the
  port's Economy plus Industry to Trade Fame;
- `SNR0.DAT` sections 1–3: Transport Goods, Buy Goods, and Deliver Letter;
- `SNR0.DAT` section 5 (`0x12B8–0x15CB`): Collect Debt, including equal Trade
  and Piracy awards;
- `SNR6.DAT` around `0x18EC`, `0x22B2`, and `0x24E1`: Ali's direct Trade Fame
  writes; and
- `MAIN.EXE` file offset `0x0AF42`: resolve one protagonist's 14-byte Fame
  record. Its words at `+0`, `+2`, and `+4` are Trade, Piracy, and Adventure.
