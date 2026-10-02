# Optimal trading start (João)

This page plans João Franco's first months of trading, from the new game in
Lisbon to a fleet of Venetian Galeasses running Gold out of Madeira. Unlike the
pages in [game-details](../game-details/), its conclusions come from a model:
the mechanics it uses are documented and cited there, but the plans below also
rest on the assumptions listed at the end. Treat the numbers as estimates.

The page has two plans. [Part 1](#part-1-trading-without-price-steering)
buys and sells each ship's cargo in one transaction, as most players do; every
such transaction still moves the port's price indices, and the plan accounts
for it. [Part 2](#part-2-trading-with-price-steering) splits sales and
purchases into many small transactions on purpose, to push the indices where
they pay most. Both share the opening, the ships, and the permits.

Prices come from the goods exporter's new-game data
(`scripts/goods/output/port-markets.json`): a Market sells its listed goods
at their own purchase base prices, which are much higher than the sale prices
of the same goods ([Market](../game-details/buildings.md#market-command-dialogue)).

## Summary

Both plans:

1. **First trades.** Carry Olive Oil from Lisbon to Madeira and Sugar back,
   to Lisbon or to Santa Cruz. Buy Rocco the Balsa Lisbon offers at the start
   and trade both ships for Light Galleys in Madeira.
2. **Hulls.** Every captain should reach a Venetian Galeass (890 cargo after
   remodelling) by late June. A loaded ship with more than 327 units aboard
   sails at nearly full speed ([below](#ships-and-captains)).
3. **Madeira.** Invest 48,000 in Madeira's Market before a month change to
   unlock its Gold.
4. **Captains.** Rocco and Domingo are enough to run three Galeasses. Further
   captains add about 10%.

Without steering:

5. **Spread the Gold.** Each Galeass that sells Gold in a port lowers the
   price for the next by about 13%, so sell in the ports paying 1,100–1,133
   and carry filler back to Madeira.
6. **Permit.** Portugal's Tax Free Permit, bought for 10,000 from Salonika's
   Item Shop by the end of May, cuts Madeira's Gold from 805 to 671 and raised
   the 90-day result from 4.0–4.4 to 5.9–8.6 million.

With steering:

5. **Depress and pump.** Sell cargo in Madeira in many small sales to push
   Gold's category to 0 (Gold costs 399), and buy the return cargo in Lisbon in
   many small purchases to push it to 100 (Gold sells for 1,500). The 90-day
   result is 17.6–28.8 million.
6. **Permit.** It lowers steered Gold to 332, about 6% more.

## Starting position

| Item       | Value                                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date       | 17 May 1522, from the new-game data (`DATA1.015`); the model starts trading at 04:00 on 18 May, after the opening in Lisbon                                                              |
| Gold       | 8,779, or 8,099 after 10 crew (44 each) and remodelling the _Hermes II_ (240) ([below](#starting-gold))                                                                                  |
| Ship       | _Hermes II_, Caravela Latina: capacity 120, minimum crew 10                                                                                                                              |
| João       | Navigation and Battle Level 1, Seamanship 75, Knowledge 73, Charm 89, Negotiation, No Rank                                                                                               |
| Mates      | Rocco (Navigation Level 30, Seamanship 82) and Enrico (Seamanship 48); Domingo (Seamanship 68) joins on voyage day 3 ([Scenario 1](../game-details/scenarios/scenario-1-joao-franco.md)) |
| Used ships | Lisbon always offers Balsa, Xebec, and Galleon at the start ([Ships](../game-details/ships.md#used-ship-purchase-state))                                                                 |

### Starting gold

João starts with no gold. Collecting the 1,000 each offered by the Pub, the
Church (**Accept**), and the Bank, and then selling the Rapier and the Aqua
Tiara at the Item Shop's better counteroffer price, gives 8,779 gold.

## Mechanics that decide the plan

- **Prices.** A purchase costs `floor((rate + 50) × B / 100)` plus a 20%
  markup, where `B` is the listed good's purchase base price or the port's
  specialty base price. A sale pays `floor((rate + 50) × B / 100)` with the
  region's sale base price, which for listed goods is far lower
  ([Market](../game-details/buildings.md#market-command-dialogue)). Lisbon
  sells Olive Oil for 33 and buys it back for 10. Each port keeps its own rate
  for each of ten categories.
- **Haggling.** João has Negotiation. Offering less than the asking price
  makes the seller drop to `floor(price × 19 / 20)`, 5% off, for any good
  costing more than 40; cheaper goods save 1 gold. A title takes off another
  5% per rank in its own nation's ports
  ([Bookkeeper](../game-details/sailors.md#bookkeeper)). The prices on this
  page include it.
- **Every transaction moves rates.** A sale worth `V` lowers its category by
  `min(10, floor(V / (Economy + 500)))` and all ten categories by
  `min(3, floor((V mod 65536) / 1000))`; a purchase raises them by the same
  amounts computed from `V mod 65536`. Buying and selling choose one ship at a
  time, so each ship's cargo is at least one transaction.
- **Quiet purchases.** A purchase whose value lies above a multiple of
  65,536 by less than both 1,000 and `Economy + 500` moves no rate. A Galeass
  buying Gold at 805 in Madeira (Economy 400) can load 815 lots this way.
- **Recovery.** Rates move back toward 50 by only 1–5 points per month
  ([Invest](../game-details/buildings.md#market-command-dialogue)).
- **Investment.** Economy rises by `floor(investment / 300)` at each month
  change, up to 50,000 of investment per month. Madeira starts at Economy 240;
  its Gold needs 400, so 48,000 unlocks it after one month change.
- **Load and speed.** A ship's speed is multiplied by
  `min(150, 180 − floor(100 × load / capacity))`, where the load counts crew,
  provisions, and cargo. The game computes `−100 × load` in 16 bits, so a ship
  with more than 327 units aboard gets an unrelated factor, almost always 150
  ([Fleet speed](../game-details/at-sea.md#fleet-speed)). A loaded Caravela
  Latina sails at about half its empty speed; a loaded Venetian Galeass loses
  nothing.
- **Fleet speed.** The fleet moves at its slowest ship, and each ship's speed
  grows with its captain's Navigation Level (capped) and Seamanship. Rocco
  never slows the fleet; Enrico's ship would.
- **Crew.** Treat raises the Pub's enthusiasm to 100, so a port supplies
  `min(100, floor(Economy / 5))` sailors per visit: 100 in Lisbon, 48 in
  Madeira ([Pub](../game-details/buildings.md#pub-command-dialogue)).

## First trade

One Caravela Latina with 106 cargo after provisions, 8,099 gold, May winds,
new-game prices:

| Round trip from Lisbon | Days (out + back) | Out               | Back                | Profit | Per day |
| ---------------------- | ----------------- | ----------------- | ------------------- | -----: | ------: |
| Madeira                | 1.8 + 2.5         | Olive Oil 32 → 57 | Sugar 13 → 45       |  6,000 |  ~1,350 |
| Seville                | 1.9 + 1.9         | Rock Salt 42 → 64 | Porcelain 108 → 121 |  3,600 |    ~900 |
| London                 | 5.5 + 5.3         | Rock Salt 42 → 61 | Iron Ore 122 → 191  |  7,700 |    ~700 |
| Amsterdam              | 6.7 + 6.7         | Rock Salt 42 → 66 | Iron Ore 127 → 191  |  7,900 |    ~580 |
| Nantes                 | 4.3 + 3.5         | Rock Salt 42 → 64 | Grain 21 → 32       |  3,500 |    ~440 |

Most of Lisbon's listed goods sell for less than their price everywhere
nearby; Olive Oil to the Madeira region and Lisbon's specialty, Rock Salt, are
the exceptions. Madeira's specialty, Sugar, costs 13 and sells for 45–61
across Europe and West Africa.

## Building up (May–June)

Almost every run of the model opens the same way:

1. Buy the Balsa for Rocco at Lisbon (986 at the lowest accepted offer) and
   remodel it. Both ships carry Olive Oil to Madeira.
2. In Madeira, trade the Balsa and the _Hermes II_ for Light Galleys when they
   are offered: Madeira's shipyard row holds only Light Galley and Caravela
   Redonda, so at least one is offered 91% of the time. A Light Galley carries
   115 and needs 5 crew.
3. Carry Sugar to Lisbon (45), Seville, or Santa Cruz (61, 0.9 days from
   Madeira), and Olive Oil back. A loaded fleet leaving Madeira in the evening
   for Lisbon crosses three midnights, so Domingo joins on that voyage.
4. Trade up hulls at each Lisbon and Seville visit ([below](#ships-and-captains)).

Rock Salt from Lisbon to Seville (42 → 64) and Glass Beads from Genoa to the
Madeira region (2 → 46–52) are the other fillers the model uses. Some runs
also send the fleet from Madeira to San Jorge with Sugar (59) and bring back
San Jorge's specialty, Ivory, which costs 84–115 and sells for 250–294 in
Lisbon and Seville. The voyage takes 7–12 days each way, so it pays best with
large ships; the round trip also lifts João to Navigation Level 3.

By mid-June the fleet has about 50,000–90,000 gold and two or three ships of
450–900 cargo.

## Ships and captains

**Hulls.** The model's fleets climb Light Galley → Brigantine, Sloop, Nao,
Flemish Galleon, or Carrack → Venetian Galeass within about a month, trading
each hull in where a larger one is offered. A used ship's trade-in value equals
its listed price, while the shipyard accepts an offer of 411/500 of that price
at João's Charm of 89
([Shipyard prices](../game-details/ships.md#shipyard-prices-and-negotiation)),
so each trade-in recovers more than the hull cost. Remodel every ship to
minimum crew and no guns (one tenth of its base price).

The Venetian Galeass is the best hull for these plans. It carries 890 after
remodelling, needs 60 crew, is oared (it always counts at least wind speed 3),
and with more than 327 units aboard sails as fast loaded as empty. It appears
in the shipyard rows of the Italian ports with Industry 600 or more and the
Ottoman ports with Industry 500 or more, and in the two shared slots of any
port with Economy 440 or more. A Galeass costs 52,600 at the lowest accepted
offer in Lisbon.

**Captains.** Each ship needs a captain. The three-ship fleet of João, Rocco,
and Domingo is the model's base plan; Enrico would slow it.

| Sailor         | Where            | João needs          | Seamanship | Navigation Level |
| -------------- | ---------------- | ------------------- | ---------: | ---------------: |
| Rocco          | mate             | —                   |         82 |               30 |
| Domingo        | mate             | a 3-midnight voyage |         68 |                1 |
| Alonzo Oreida  | Lisbon Lodge     | Navigation Level 2  |         65 |                1 |
| George Eggel   | Hamburg Pub      | Navigation Level 2  |         87 |                1 |
| Dante Peleira  | Naples Pub       | Navigation Level 2  |         79 |                1 |
| Afmet Glanie   | Alexandria Lodge | Navigation Level 2  |         79 |                1 |
| Anthony Morgan | Bristol Pub      | Navigation Level 3  |         87 |                2 |
| Luka Ullman    | Barcelona Lodge  | Navigation Level 3  |         87 |                1 |
| Antoine Fitch  | London Pub       | Navigation Level 3  |         76 |                2 |
| Fritz Ramsey   | Pisa Pub         | Navigation Level 4  |         71 |                2 |

“João needs” is the level at which the hire always succeeds
([hiring](../game-details/buildings.md#pub-command-dialogue)). Pub sailors
start with Loyalty 0 and need Treats before they accept; Lodge sailors do not.
The next sailors with useful levels (Diego Fagundes, Miguel Solis, Nicolo
Montagna, Lawrence Edwards) need João at Navigation Level 12–14. Port Call
awards João `2 × D²` experience for `D` midnights at sea, and Levels 2 and 3
need 30 and 120 more
([Navigation experience](../game-details/levels.md#navigation-experience)):
one voyage across four midnights reaches Level 2, and one across eight more
reaches Level 3.

Without steering, allowing every recruitable sailor raised the model's 90-day
net worth by about 10% (3.6–5.2 million). Every run hired Alonzo first, then
one to three of George Eggel, Dante Peleira, Afmet Glanie, Fritz Ramsey,
Anthony Morgan, and Antoine Fitch. Extra captains pay less than their cargo
suggests because each extra ship sells into a market the previous ship has
just lowered.

## Tax Free Permits

A permit removes the 20% markup in the ports of the nation that issues it, a
saving of a sixth of the price. Portugal's covers Lisbon, Ceuta, Madeira, San
Jorge, Luanda, and Argin. Every permit is removed at the end of March and of
September, when the wind tables are swapped
([Palace](../game-details/buildings.md#palace-command-dialogue)), so one
bought in May or June lasts until 30 September. A character can carry one
permit per nation.

There are two sources:

- **Item Shops.** Salonika's secret item is Tax Permit (P), sold for 10,000
  between 2:00 and 3:00 AM
  ([Item Shop](../game-details/buildings.md#item-shop-command-dialogue),
  [Ports](../game-details/ports.md)); no title is needed. Tripoli sells Tax
  Permit (O), Syracuse (I), Azov (S), Antwerp (H), and Danzig (E) the same
  way.
- **Palaces.** The permit costs `10,000 × (7 − rank)` in the protagonist's
  capital, but an untitled character is admitted only while a royal invitation
  is armed, and that audience offers the mission instead of the ruler's menu
  ([Palace](../game-details/buildings.md#palace-command-dialogue)). João needs
  at least the title of Page: 500 Fame in one category and a royal mission
  ([Royal missions](../game-details/scenarios/scenario-0-common-quests-and-royal-missions.md)).

Salonika is 12–19 days from Lisbon or Madeira but only 6–7 days from Ceuta for
a fleet of two empty Light Galleys, and Tripoli is about 7 days from Madeira.
The model's permit plans make the trip at once, while the fleet is small and
its purchases are worth little:

1. One or two Olive Oil and Sugar trades between Lisbon, Madeira, and Santa
   Cruz, trading both ships for Light Galleys in Madeira.
2. Sail nearly empty from Ceuta to Salonika (about 6.5 days; Domingo joins on
   the way) and buy the permit at 2:00 AM. This was done by 30 May.
3. Build the fleet on short hops in the western Mediterranean (Grain and Rock
   Salt between Barcelona, Palma, Valencia, and Marseille; Glass Beads from
   Genoa), then invest in Madeira before 1 July.

Later, a month away from Madeira Gold costs far more than the permit saves.
Runs that only picked the permit up in passing, while trading around Athens,
gained nothing from it.

## Part 1: Trading without price steering

In this plan each ship's cargo is bought in one transaction and sold in one
transaction. That still moves the indices, and the model accounts for every
movement.

### What full loads do to prices

- **Selling.** A full Galeass of Gold is worth far more than
  `10 × (Economy + 500)`, so its sale lowers category 6 by 10 and all ten
  categories by 3 (unless its value lies just above a multiple of 65,536).
  The next Galeass selling Gold there gets about 13% less, and a third about
  26% less: three loads of Gold in Bordeaux sell for 1,133, 990, and 847.
- **Buying.** A full purchase raises its category by up to 13 and makes the
  next ship's identical purchase dearer. Quiet quantities avoid that; the
  model chose them for Gold.
- **Lasting effects.** Rates recover only 1–5 points a month, so a port sold
  into stays cheap for weeks. The model rotates Gold among several ports.
- **Side effects that help.** Every full sale also lowers the port's other
  nine categories by 3. Filler sold in Madeira lowers its Gold price, and
  selling Sugar in Lisbon lowers Lisbon's Olive Oil (32 falls to 19–25).
  Buying Sugar in Madeira raises what Madeira pays for Olive Oil (57 rises to
  up to 67). Same-category pairs such as Olive Oil ⇄ Sugar therefore keep
  restoring their own prices.

### Madeira Gold without steering

| Gold in Madeira (Economy 400) | Price | Quiet lots (890 cargo) |
| ----------------------------- | ----: | ---------------------: |
| Without a permit              |   805 |                    815 |
| With a Tax Free Permit        |   671 |                    880 |

| Sells Gold for | Ports                                                |
| -------------: | ---------------------------------------------------- |
|          1,133 | Bordeaux, London                                     |
|    1,089–1,100 | Nantes, Bristol, Dublin, Antwerp, Amsterdam, Hamburg |
|    1,020–1,040 | Lisbon, Seville, Marseille                           |

A round trip to Bordeaux, Nantes, or London takes about 9–10 days; to Lisbon or
Seville, 3–4 days. The model sells the first ship's Gold at full price and the
others at 13% and 26% less, then carries Grain, Olive Oil, or Cotton Cloth back
to Madeira. Each filler sale there lowers all of Madeira's categories by up to
3, against a monthly recovery of 1–5. Without a permit Madeira's Gold stayed
between about 660 and 770 in July and August; with one it fell from about 620
to 400.

### Athens and Istanbul without steering

Athens's specialty, Art, sells for 412 in Istanbul at new-game prices, and
Istanbul's specialty, Carpet, for about 300 in Athens; the ports are 1.5–2.5
days apart. Both goods are in category 8, so each full sale lowers the price
of the other port's specialty, and each full purchase raises what its port
pays for the incoming good. With three Galeasses the model bought Art at
210–290 and sold it for 360–480, and bought Carpet at 150–210 and sold it for
255–350, every two days.

Two permits remove the markup on both goods: Tax Permit (O) from Tripoli
covers Istanbul, and Tax Permit (P) from Salonika covers Athens once it is
Portuguese. Athens starts with no Support for any nation, and a port allies
with a nation at 75% Support
([Sphere of influence](../game-details/sphere-of-influence.md)). Market Invest
adds `floor(amount / Economy)` Support at once
([Invest](../game-details/buildings.md#market-command-dialogue)), so 48,000
gold, just under the 50,000 monthly limit, makes Athens Portuguese. The
alliance also awards 1,180 Trade Fame
([Trade Fame](../game-details/fame/trade-fame.md#making-an-allied-port)).

All four runs with this option bought both permits. The best one sailed from
Madeira to Tripoli nearly empty (Tax Permit (O) on 30 May), went on through
Alexandria and Candia to Salonika (Tax Permit (P) on 7 June), traded up to
three Galeasses at Istanbul by late June, and invested in Athens on 1 July. It
made no Madeira investment. The model does not simulate other nations' fleets,
which can invest in Athens and take it back.

### Results without steering

The range over four random seeds (the seed decides the used-ship lists),
90-day horizon:

| Plan                                               | Net worth after 90 days |
| -------------------------------------------------- | ----------------------: |
| Madeira Gold, Salonika permit by late May          |         5.9–8.6 million |
| Athens ⇄ Istanbul, both permits, Athens allied     |         5.0–7.5 million |
| Athens ⇄ Istanbul, Turkish permit only             |         4.4–6.8 million |
| Madeira Gold, no permit                            |         4.0–4.4 million |
| Madeira Gold, no permit, every recruitable captain |         3.6–5.2 million |
| No Madeira investment, no permit                   |         3.1–4.1 million |
| Madeira Gold, Palace permit as a Page from 15 June |         4.7–6.0 million |

At about 66–70 days the Salonika-permit plan stood at 2.6–3.0 million and the
no-permit plan at 1.6–1.9 million; after 20 trades, 60–85 days in, the
no-permit plan stood at 1.4–2.0 million. Differences of about 15% are within
the variation between seeds.

## Part 2: Trading with price steering

This plan splits sales and purchases into many transactions. Extra
transactions within one Market visit take no game time
([Visit duration](../game-details/buildings.md#visit-duration)), but they take
the player's patience: the steered Gold loop needs about 17 purchases in Lisbon
per visit.

### How steering works

Every sale whose value modulo 65,536 is at least 3,000 lowers all ten
categories by 3, and every such purchase raises them by 3. A good of the same
category moves its own category by up to 10 more, for 13 per transaction worth
`10 × (Economy + 500)`. Selling or buying one load in many such transactions
multiplies the effect, so any cargo can steer any category, and the rate caps
at 0 and 100.

- **Depress** before buying: sell the incoming cargo in small transactions
  until the category of the good to be bought reaches 0.
- **Pump** before selling: buy the next leg's cargo in small transactions into
  holds that are already empty, until the category being sold reaches 100.

### Madeira Gold with steering

Gold and Silver form category 6. Its rate in Madeira decides what Madeira
charges for Gold, and its rate in the selling port decides what that port
pays:

| Category 6 rate | Madeira buys at | Without permit | With permit | Lisbon pays |
| --------------: | --------------: | -------------: | ----------: | ----------: |
|               0 |      50% of 700 |            399 |         332 |         500 |
|              51 |     101% of 700 |            805 |         671 |       1,010 |
|             100 |     150% of 700 |              — |           — |       1,500 |

Madeira's rate starts at 51 and Lisbon's at 52. The plan holds Madeira's at 0
and the selling port's at 100. In Bordeaux, London, and the other ports with a
Gold sale base of 1,100 the cap is 1,650.

**Depressing Madeira.** Sell the cargo brought to Madeira in transactions of
about 3,000 gold each, 60–100 lots of Olive Oil. Each lowers all ten
categories by 3, so about 17 such sales take Madeira's category 6 from 51 to 0;
one Galeass of Olive Oil is enough. Selling Silver instead lowers category 6 by
13 per sale of about 9,000 (50 lots), but Silver is sold only in Genoa, and in
Lubeck once its Economy reaches 500. Once at 0 the rate stays low: the monthly
recovery adds only 1–5, each later filler sale takes 3 off again, and quiet
Gold purchases (822 lots per Galeass at 399) move nothing.

**Pumping the selling port.** In Lisbon, sell the first Galeass, then buy the
return cargo of Olive Oil into its hold in transactions of about 3,000 gold,
each raising all categories by 3, until category 6 reaches 100; sell the next
Galeass, which lowers it by 13, and pump again with four or five more
purchases. Genoa can be pumped faster with its Silver, 13 points per purchase
of about 12,500 (50 lots), but it is 9–10 days from Madeira against Lisbon's
1–2.

The model's best runs settle into a Lisbon ⇄ Madeira loop from early July:

| Leg              | Cargo                                | Price                       |
| ---------------- | ------------------------------------ | --------------------------- |
| Madeira → Lisbon | 3 × 822 Gold, bought at 399          | sold at 1,370, 1,500, 1,500 |
| Lisbon → Madeira | Olive Oil from the pumping, about 46 | sold at about 30            |

Each round trip takes about 3½ days and nets about 2.5 million. The first
Galeass sells below the cap because the fleet arrives with no empty hold to
pump into. The Olive Oil loses about 16 per lot, which is the cost of the
steering.

Steering also helps with lesser cargo: Ivory from San Jorge sold in Lisbon
after pumping brought 277, 333, and 406 for three Galeasses, where a full-load
sale would have fallen with each ship.

### Athens and Istanbul with steering

The two specialties share a category, so buying Carpet in Istanbul in
transactions of about 13,000 raises category 8 by 13 each, and the Art
unloaded next sells at up to 150%. With steering and both permits the eastern
plan reached 8.8–23.0 million in 90 days. Gold stays ahead because Madeira's
price can be held at the floor, while Art and Carpet are bought back at the
raised rate they were just sold at.

### Permits with steering

With steering, Madeira's Gold costs 399 without a permit and 332 with one:
about 165,000 more per round trip of three Galeasses, or 6%. The model was not
rerun with steering and a permit; an early Salonika trip probably still pays,
but it is no longer decisive.

### Results with steering

The range over four random seeds, 90-day horizon:

| Plan                            | Net worth after 90 days |
| ------------------------------- | ----------------------: |
| Madeira Gold, no permit         |       17.6–28.8 million |
| Athens ⇄ Istanbul, both permits |        8.8–23.0 million |

## Other routes

- **Timbuktu Gold.** Timbuktu already has Economy 430 and sells Gold for 798
  without any investment, but it is 11–20 days from Lisbon up the river.

## Ideas that did not help

These were tested without steering.

- **A permit without Gold.** Without the Madeira investment, a Portuguese
  permit changed nothing (2.7 against 2.8 million in 90 days).
- **A Turkish permit from the Istanbul Palace** (110,000, title needed) was
  never worth its price in the model; Tripoli sells the same permit for
  10,000.
- **Many small captains early.** Giving every hired sailor a ship as soon as
  possible filled the fleet with Light Galleys: 2.1–3.4 million in 90 days
  against 3.0–3.8 million for three ships, at the same search width.
- **Ship flipping.** Buying used ships at the lowest accepted offer and
  selling them back at the listed price earns about 18% of each hull's price.
  It added 110,000–270,000 over 90 days, little against the trade, and needs
  an idle mate and many Shipyard visits.

## The model

- **Prices and rates** follow the Market formulas above from the new-game
  data, including haggling and the rate shifts of every transaction. Without
  steering, each ship buys a full load or the largest quiet quantity in one
  transaction and sells everything at the destination in one transaction.
  With steering, the planner may also, at each port, sell in transactions of
  about 3,000 (or `10 × (Economy + 500)` for the same category) until the
  category of the port's most valuable good reaches 0, or, before each ship's
  sale, buy goods for the next leg into empty holds in such transactions until
  the category being sold reaches 100.
- **Sailing times** come from a shortest-time search over the world map
  (`scripts/draw-world-map/output/world-map.bin`) with 2 × 2 fleet blocks on
  water, the seasonal winds and currents from `raw/WINDCUR.DAT` averaged over
  the four-hour re-roll, and the fleet-speed formula with each ship's load,
  crew, and captain.
- **The clock** starts at 04:00 on 18 May, adds 1 hour per building visit,
  waits for the Market and Shipyard (04:00–20:00), Pub (from 08:00), and Item
  Shop secret hour (02:00–03:00), and applies wages, investment, and a 3-point
  rate recovery at each month change.
- **Experience** follows the Port Call award; each level-up adds 2 Seamanship.
- **Used ships** are drawn with the game's list rules and three-port cache. A
  fixed policy trades a hull in for a larger one when the purchase costs at
  most 60% of gold and raises cargo × speed.
- **Search.** A beam search over the 51 ports of Europe, the Mediterranean,
  the Black Sea, and West Africa, scored by net-worth gain per day: width 400
  and legs of at most 12 days for most unsteered figures, 150 for the 20-trade
  figures, and width 200 with legs of up to 20 days for the steered and
  eastern figures. The Salonika runs valued the permit highly enough that the
  search fetched it.

### Assumptions

- The opening in Lisbon takes until 04:00 on 18 May.
- Every used ship and the _Hermes II_ have a Beech hull, as the ship templates
  do.
- Building visits take 1 hour, crew can always be hired with Treat, and
  captains are hired as soon as the hire is guaranteed.
- Domingo joins after any voyage crossing three midnights.
- Sailors stay in their starting ports.
- Food is bought for each voyage; water is free.

### Not modelled

- Pirates, storms, battles, repairs, and the Balm.
- Becoming a Page, other Fame, and royal missions; the Palace-permit row
  assumes the title.
- Other nations' fleets investing in the ports used.
- Selling one load across several ports, more than one good per ship, and
  buying goods only to steer a rate (the steering goods are always the next
  leg's cargo).
- Guild jobs and story events.
- Randomness in visit length, wind, and monthly recovery (averages are used).

The planner scripts are not part of this repository.
