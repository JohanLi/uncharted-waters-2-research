# Optimal trading start (João)

This page plans João Franco's first trades, from the new game in Lisbon to a
fleet that runs Gold out of Madeira. Unlike the pages in
[game-details](../game-details/), its conclusions come from a model: the
mechanics it uses are documented and cited there, but the plans below also
rest on the assumptions listed at the end. Treat the numbers as estimates.

## Summary

1. **First trade.** Buy Olive Oil in Lisbon and sell it in Madeira, then carry
   Sugar back. Lisbon's Rock Salt to Seville is profitable but weak.
2. **First five trades.** Shuttle across the Strait of Gibraltar between
   Seville and Ceuta, about half a day apart: Dye south, Flax north.
3. **Fleet.** Remodel every ship to minimum crew and no guns. Give Rocco a
   second ship at once and keep trading his hull up. Trade the _Hermes II_ in
   for a Light Galley when one is offered. Never give Enrico a ship.
4. **Madeira Gold.** Invest 48,000 in Madeira's Market before a month change.
   At the next month change Madeira reaches Economy 400 and sells Gold for
   about 363, worth 1,020–1,130 in Lisbon, Seville, Bordeaux, and London.
5. **Captains.** Each extra large hull more than repays the speed it costs.
   Hire Alonzo Oreida (Lisbon Lodge) once João reaches Navigation Level 2, and
   Anthony Morgan (Bristol Pub) or Antoine Fitch (London Pub) at level 3.

Over 20 trades the model reaches about 85,000 gold per day and about 7 million
gold of net worth in about 86 days, almost all of it from Gold.

## Starting position

| Item       | Value                                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date       | 17 May 1522, from the new-game data (`DATA1.015`)                                                                                                                                        |
| Gold       | 8,779 ([below](#starting-gold))                                                                                                                                                          |
| Ship       | _Hermes II_, Caravela Latina: capacity 120, minimum crew 10                                                                                                                              |
| João       | Navigation and Battle Level 1, Seamanship 75, Knowledge 73, Charm 89, No Rank                                                                                                            |
| Mates      | Rocco (Navigation Level 30, Seamanship 82) and Enrico (Seamanship 48); Domingo (Seamanship 68) joins on voyage day 3 ([Scenario 1](../game-details/scenarios/scenario-1-joao-franco.md)) |
| Used ships | Lisbon always offers Balsa, Xebec, and Galleon at the start ([Ships](../game-details/ships.md#used-ship-purchase-state))                                                                 |

### Starting gold

João starts with no gold. Collecting the 1,000 each offered by the Pub, the
Church (**Accept**), and the Bank, and then selling the Rapier and the Aqua
Tiara at the Item Shop's better counteroffer price, gives 8,779 gold.

## Mechanics that decide the plan

- **Prices.** A good's price depends on its port's category rate:
  `floor((rate + 50) × base / 100)`, with a 20% markup on purchases
  ([Market](../game-details/buildings.md#market-command-dialogue)).
- **Rate shifts.** Each transaction moves its category by up to 10 and all ten
  categories by up to 3. Purchases use only `V mod 65536`, so small purchases,
  and large ones just above a multiple of 65,536, move nothing. Sales always
  shift their own category unless worth less than `Economy + 500`.
- **Recovery.** Rates move back toward 50 by only 1–5 points per month
  ([Invest](../game-details/buildings.md#market-command-dialogue)). A market
  flooded with cargo stays depressed for weeks, so the plan rotates between
  markets.
- **Investment.** Economy rises by `floor(investment / 300)` at each month
  change, up to 50,000 of investment per month. Madeira starts at Economy 240;
  its Gold needs 400, so 48,000 unlocks it after one month change.
- **No stock.** Markets have no stock counts. Only a port's specialty
  disappears, once its rate reaches 90, and there is no per-transaction
  quantity cap.
- **Fleet speed.** The fleet moves at its slowest ship, and each ship's speed
  scales with its captain's `(1 + Navigation Level / 10) × Seamanship / 75`
  ([Fleet speed](../game-details/at-sea.md#fleet-speed)). Rocco never slows
  the fleet. Enrico's ship runs at about 64% and slows it by 30–40%. With
  exactly the minimum crew, assign 100% to navigation.
- **Crew.** Treat raises the Pub's enthusiasm to 100 in one visit (about 50
  drinks), so a large port supplies up to 100 sailors per visit.
- **Hiring.** A sailor accepts when
  `random(20) + candidate score < player score + floor(player score × rank / 10)`.
  No Rank is not a barrier. Each sailor belongs to either the Pub or the Lodge
  ([Lodge](../game-details/buildings.md#lodge-command-dialogue)).

## First trade

One Caravela Latina with 110 cargo, 8,539 gold after the remodel, May winds, new-game
prices:

| Round trip from Lisbon | Days (out + back) | Out               | Back                | Profit | Per day |
| ---------------------- | ----------------- | ----------------- | ------------------- | -----: | ------: |
| Madeira                | 1.4 + 1.9         | Olive Oil 12 → 57 | Sugar 13 → 45       |  8,000 |  ~2,400 |
| Ceuta                  | 1.6 + 1.6         | Dye 60 → 99       | Flax 10 → 40        |  7,200 |  ~2,250 |
| London                 | 4.4 + 4.2         | Dye 60 → 123      | Iron Ore 82 → 191   | 16,900 |  ~2,000 |
| Bordeaux               | 3.6 + 3.0         | Dye 60 → 131      | Cotton 24 → 50      |  9,750 |  ~1,500 |
| Seville                | 1.5 + 1.5         | Rock Salt 45 → 64 | Porcelain 114 → 121 |  2,600 |    ~870 |

Madeira is downwind in May. Lisbon and Seville share a market region, which is
why Rock Salt between them makes little.

## First five trades

Across the Strait, Seville and Ceuta are 0.35–0.55 days apart. Dye (Seville
55 → Ceuta 99) and Flax (Ceuta 10 → Seville 40) make that shuttle the best use
of short trades:

| Fleet                       | Route                                             | Gold after 5 trades | Days |
| --------------------------- | ------------------------------------------------- | ------------------: | ---: |
| João alone                  | Lisbon → Seville (Rock Salt) → Ceuta ⇄ Seville ×2 |              24,600 |  3.7 |
| João + Rocco's Lisbon Balsa | the same                                          |              26,700 |  3.7 |

Ceuta's Economy is only 85, so each sale cuts its prices by the maximum. After
four or five visits, move on.

## Ships and captains

**Used ships.** The list at each port is generated on arrival. Madeira offers
at least one Light Galley 91% of the time (its shipyard row is only Light
Galley and Caravela Redonda), against about 40% at Seville. A Light Galley
needs only 5 crew, carries 115, and is faster than the _Hermes II_: trading the
_Hermes II_ in for one gains about 12% speed and nets about 1,000 gold.

**Rocco's ladder.** In every run of the model Rocco climbs Balsa → Light
Galley or Caravela Redonda → Brigantine or Sloop → Nao or Flemish Galleon →
Venetian Galeass (890 cargo) within about two weeks. Because Rocco's
Navigation Level 30 caps his speed, even heavy hulls barely slow the fleet.

**Other captains.** The best hull for slower captains is the La Reale: oared,
Tacking 95, Power 100, 420 cargo.

| Sailor         | Where           | João needs          | Captain speed factor |
| -------------- | --------------- | ------------------- | -------------------: |
| Rocco          | mate            | —                   |     capped (fastest) |
| Anthony Morgan | Bristol Pub     | Navigation Level 3  |                 1.39 |
| Luka Ullman    | Barcelona Lodge | Navigation Level 3  |                 1.28 |
| Antoine Fitch  | London Pub      | Navigation Level 3  |                 1.22 |
| João himself   | —               | —                   |       1.1 at level 1 |
| Domingo        | mate            | a 3-midnight voyage |                 ~1.0 |
| Alonzo Oreida  | Lisbon Lodge    | Navigation Level 2  |                 0.95 |
| Enrico         | mate            | —                   |                 0.70 |

Pub sailors start with Loyalty 0 and need Treats before they accept; Lodge
sailors do not. Sailors with higher levels nearby (Miguel Solis, Lawrence
Edwards, Bernardo Sanchez, Aloiji Jovanni) need João at Navigation Level 12–28.

## Twenty trades

A typical run:

| Phase           | Dates           | What happens                                                                                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build the fleet | 17 May – 3 June | Lisbon Balsa for Rocco; Madeira, Seville, Ceuta, Santa Cruz; the _Hermes II_ traded for a Light Galley; Rocco climbs to a Venetian Galeass; Domingo and Alonzo each get a ship. |
| Invest          | early June      | 48,000 into Madeira's Market.                                                                                                                                                   |
| Bridge          | June            | Dye, Iron Ore, and Grain around Seville, London, Lisbon, and Bristol while waiting for the month change.                                                                        |
| Gold            | from 1 July     | Madeira Gold sold in Lisbon, Seville, Ceuta, Nantes, or Dublin, with cheap filler cargo back to Madeira.                                                                        |

Investing before 1 June instead of in early June unlocks Gold a month sooner.

**Why the long legs.** On fresh prices the long legs are worse per lot and
day than the Strait (Seville → Ceuta ~121, London → Lisbon ~31, Lisbon →
Bristol ~24). The fleet sails there because it exhausts the nearby markets:
four large ships unloading in Ceuta cut its Dye price by about 40%. Santa Cruz
is a second outlet in Madeira's market region; it pays 59 for Sugar, Madeira's
own specialty, for which Madeira pays only about 5.

**Captains and profit** (average of four random seeds):

| Captains                   | Gold per day | Net worth after 20 trades | Days |
| -------------------------- | -----------: | ------------------------: | ---: |
| Rocco only                 |      ~22,000 |              ~1.0 million |   45 |
| Rocco and Domingo          |      ~62,000 |              ~3.6 million |   58 |
| Rocco and Alonzo           |      ~55,000 |              ~3.6 million |   65 |
| Rocco, Domingo, and Alonzo |      ~59,000 |              ~3.8 million |   64 |
| + every recruitable sailor |      ~85,000 |              ~7.4 million |   86 |

Differences of about 10% are within the variation between seeds. Extra
captains keep paying off, but by less than their cargo: each extra ship sells
into a market the previous ship has just lowered.

## Ideas that did not help

- **Chunk-selling.** Selling in pieces worth less than `min(1000, Economy +
500)` moves no rates, but one lot of Gold is worth about 1,020, and selling
  single lots lowers every category by 1. For cheap goods, 25–100 chunks per
  visit cover only a few hundred of about 3,000 lots. Gold per day with 0, 25,
  and 100 chunks: ~85,000, ~80,000, ~83,000.
- **Splitting a load between ports.** Keeping cargo when the price falls below
  a share of a neighbouring port's price made every tested rule worse
  (~50,000–79,000 per day): the kept cargo displaces the next purchase, and the
  neighbour's price falls as soon as it is sold there.
- **Restoring a sold-into market.** Buying raises a category and selling
  lowers it, so a market you have sold into recovers by buying same-category
  goods there and selling them back in chunks. No port near the Gold outlets
  lists a good in Gold's category.
- **Levelling João early** on purpose was not pursued.

## The model

- **Prices and rates** follow the Market formulas above, starting from the
  new-game data. Purchases are assumed not to shift rates (small pieces or the
  `mod 65536` quantities); each ship's sale is one transaction and shifts its
  port's rates.
- **Sailing times** come from a shortest-time search over the world map
  (`scripts/draw-world-map/output/world-map.bin`), with 2 × 2 fleet blocks on
  water, the summer winds and currents from `raw/WINDCUR.DAT`, and the
  fleet-speed formula, recomputed for João's Navigation Level and flagship.
- **The clock** starts at 10:00 on 17 May, adds 40–80 minutes (1 hour on
  average) per building visit, waits for the Market and Shipyard (04:00–20:00)
  and Pub (from 08:00), and applies the monthly rate recovery and investment.
- **Experience** follows the Port Call award `2 × D²`; each level-up adds about
  2 Seamanship.
- **Used ships** are drawn with the game's list rules and three-port cache. A
  fixed policy trades the _Hermes II_ for a Light Galley when offered and gives
  each captain the largest hull that costs at most 60% of gold and raises
  cargo by more than it slows the fleet.
- **Search.** A beam search (width 400) over 11 ports (Lisbon, Seville, Ceuta,
  Madeira, Santa Cruz, Bordeaux, Nantes, London, Antwerp, Bristol, Dublin),
  scored by net-worth gain per day, run for several random seeds.

### Assumptions

- Madeira still has Economy 240 when the investment is made.
- The _Hermes II_ has an ordinary wooden hull for its trade-in value.
- Winds are the regional base plus the average re-roll, ignoring the rare
  direction changes.
- Building visits take 1 hour, crew can always be hired with Treat, and
  captains are hired as soon as the hire is guaranteed.
- Domingo joins after any voyage crossing three midnights.
- Sailors stay in their starting ports.

### Not modelled

- Pirates, storms, battles, repairs, and the Balm.
- Mates' wages, and food and water prices.
- Haggling on goods and ships' prices beyond the lowest accepted ship offer.
- Tax Free Permits.
- More than one good per ship and more than one sale per ship per port, except
  in the chunk and split experiments.
- Loading at supply ports and anywhere outside the 11 ports.
- Story events, Guild jobs, royal missions, and rank.
- Randomness in visit length, wind, and monthly recovery (averages are used).
- Market manipulation that restores a sold-into market.

The planner scripts are not part of this repository.
