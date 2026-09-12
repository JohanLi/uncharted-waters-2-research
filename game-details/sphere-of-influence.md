# Sphere of Influence

## Economic power rating / profit

The Palace calls this value an **economic power rating**. The Guild's
**Profit** field is a cached sum of the active regional ratings. It is
recalculated at the beginning of each month rather than whenever the Guild is
visited, so the Palace can reflect a daily allegiance change while Guild Profit
continues to show the previous month's value.

Only ports allied to the current player's home nation contribute. A port becomes
an ally when that nation's Support reaches 75% (`MAIN.EXE`
0x3280D–0x32813). Support is an eligibility threshold; it does not scale the
contribution after the port becomes allied.

```text
regional power = floor(sum of allied-port Economy / region divisor)
```

Support is the home-nation entry in the port's six-country Support record, not
the player's personal Friendship. Industry does not enter the displayed rating;
it activates the regional supply line described below.

### Cached allegiance

The Palace does not select allied ports directly from their six Support values.
It uses the nation index cached in the low three bits of saved port-record byte
`+0x13`. The game normally refreshes that index from Support as time advances.

At the beginning of a new game, some ports already have at least 75% Support for
a nation while this cached index still names their old controller. They are
omitted from the Palace report until the first daily update synchronizes the
cache. England therefore begins with only London, Bristol, and Dublin in its
Palace report. The first daily update adds Bordeaux, Nantes, Oslo, and Stockholm,
raising England's European rating from 352 to 810 without changing the ports'
Support, Industry, or Economy values.

### Regional activation

A region contributes only when the required allied-port Industry totals reach
300. The Palace routine builds Economy and Industry totals for each nation and
region by iterating over all 100 regular ports (`MAIN.EXE` 0x2FF24–0x2FF78).
It then applies these supply-line checks:

| Requested region | Required allied-port Industry totals |
| ---------------- | ------------------------------------ |
| Europe           | Europe >=300                         |
| New World        | New World >=300                      |
| West Africa      | West Africa >=300                    |
| East Africa      | East Africa >=300 and either West Africa >=300 or Middle East >=300 |
| Middle East      | Middle East >=300                    |
| India            | Middle East >=300 and India >=300    |
| Southeast Asia   | Middle East, India, and Southeast Asia each >=300 |
| Far East         | Middle East, India, Southeast Asia, and Far East each >=300 |

The direct checks for Europe, the New World, and West Africa are at `MAIN.EXE`
0x2FFB7–0x2FFDC. The East Africa branch is at 0x30019–0x30071, and the eastern
supply-chain loop is at 0x30074–0x300B3. A failed check selects the “No one has
sailed to %s recently” response.

### Monthly Guild refresh

Guild Profit is stored as a little-endian word at nation record `+0x00`. The
monthly routine at `MAIN.EXE` 0x1CBE6–0x1CD7E rebuilds the same Economy and
Industry totals used by the Palace, applies the regional activation rules, and
writes the sum of the resulting regional ratings to this field.

The same monthly national-state update also refreshes the Guild's merchant-fleet
destination at nation record `+0x04` (`MAIN.EXE` 0x1D051–0x1D131). The dispatcher
at 0x1DC53–0x1DC63 invokes both calculations together. Thus the reported Profit
and “A merchant fleet is going to %s” destination remain cached between month
boundaries.

| Region ID | Region         | Weight |
| --------: | -------------- | -----: |
|         1 | Europe         |    1/4 |
|         2 | New World      |    1/3 |
|         3 | West Africa    |    1/3 |
|         4 | East Africa    |    1/2 |
|         5 | Middle East    |    1/3 |
|         6 | India          |      1 |
|         7 | Southeast Asia |      1 |
|         8 | Far East       |      1 |

Portugal's initialized starting sphere demonstrates both the calculation and
the supply-line checks:

| Region | Allied ports | Industry | Economy | Result |
| ------ | ------------ | -------: | ------: | -----: |
| Europe | Lisbon, Ceuta | 860 | 865 | `floor(865 / 4) = 216` |
| New World | Pernambuco, Rio de Janeiro | 290 | 260 | inactive: Industry is below 300 |
| West Africa | Madeira, San Jorge, Luanda, Argin | 680 | 740 | `floor(740 / 3) = 246` |
| East Africa | Sofala, Malindi, Mombasa | 1,150 | 1,140 | `floor(1,140 / 2) = 570` |
| Middle East | Aden, Hormuz | 350 | 310 | `floor(310 / 3) = 103` |
| India | Diu, Cochin, Goa | 760 | 745 | `745` |

East Africa is active because its own Industry exceeds 300 and West Africa or
the Middle East can supply it. India is active because both the Middle East and
India exceed 300. The New World has two allied ports, but they contribute no
economic power because their combined Industry is only 290.

## Regional maxima

If every investable port in a region reaches 1,000 Economy and becomes allied,
the maximum achievable ratings are:

| Region         |       Maximum |
| -------------- | ------------: |
| Europe         | 9,175–9,202\* |
| New World      |         5,000 |
| West Africa    |         3,000 |
| East Africa    |         3,000 |
| Middle East    |         3,000 |
| India          |         3,000 |
| Southeast Asia |         8,000 |
| Far East       |         6,000 |

Integer division floors the final regional total.

### Capital limitation

Europe differs because the six national capitals cannot have their national
Support changed or their Economy and Industry raised through investment. The
game therefore excludes foreign capitals from a player nation's achievable
sphere of influence, while the player's own capital contributes only its fixed
values.

| Nation   | Capital port | Port ID |
| -------- | ------------ | ------: |
| Portugal | Lisbon       |       0 |
| Spain    | Seville      |       1 |
| Turkey   | Istanbul     |       2 |
| England  | London       |      29 |
| Italy    | Genoa        |       8 |
| Holland  | Amsterdam    |      33 |

\* Europe's maximum depends on the player's home nation. The 36 investable
European non-capitals can contribute 36,000 Economy, while the home capital
adds its fixed Economy before the total is divided by four. This gives:

| Home nation | Fixed capital Economy | European maximum |
| ----------- | ---------------------: | ---------------: |
| Portugal    |                    780 |            9,195 |
| Spain       |                    770 |            9,192 |
| Turkey      |                    810 |            9,202 |
| England     |                    720 |            9,180 |
| Italy       |                    750 |            9,187 |
| Holland     |                    700 |            9,175 |

The capital is stored on the nation record, not the port record:

```text
capital port ID = nation record[0x0A]
```

The helper at `MAIN.EXE` 0x2068C–0x206BF (logical address
`0x0FC4:B44C`) loops over the six nations and compares each capital port ID with
the current port ID. It returns a flagged nation index when one matches and zero
otherwise. Both investment entry points call this helper (`MAIN.EXE` 0x2ABC9
and 0x328A6) before accepting an amount. A match selects message `0x0002`:
`You can't invest in %s as it's the capital of %s.`

## Text evidence

`MESSAGE.DAT` message `0x1C8` supplies “No one has sailed to,” message `0x1C9`
supplies “Our economic power rating in,” and messages `0x1D1` through `0x1D8`
contain the eight region names. `MESSAGE2.DAT` supplies the sentence fragments
needed for the alternate region-name grammar and “recently.”
