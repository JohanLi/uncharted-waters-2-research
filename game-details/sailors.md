# Sailors

## Verified record layout

`KOUKAI2.DAT` contains 120 42-byte sailor records beginning at file offset `0x06a9`.

`record = 0x06a9 + sailor_id × 0x2a`

| Field                                |       Offset |
| ------------------------------------ | -----------: |
| Attributes (Leadership through Luck) | +0x14..+0x1b |
| Navigation Level                     |        +0x1c |
| Battle Level                         |        +0x1d |
| Navigation experience                | +0x1e..+0x1f |
| Battle experience                    | +0x20..+0x21 |
| Age                                  |        +0x22 |
| Loyalty                              |        +0x23 |
| Duty                                 |        +0x26 |
| Skill mask                           |        +0x28 |

Skill-mask bits are `0x01` Negotiation, `0x02` Accounting, `0x04` Gunnery, `0x08` Cartography, and `0x10` Celestial Navigation. Nationality is taken from the record country/status byte.

The experience thresholds, voyage and combat awards, and attribute increases
are documented in [levels.md](levels.md).

## Duties

The duty byte `+0x26` holds the sailor's role in the player's fleet. The role
names are read from the table at `DS:0x0A1E`.

| Duty | Role            | Held by                                    |
| ---: | --------------- | ------------------------------------------ |
|    0 | none            | a sailor outside the player's service      |
|    1 | Commodore       | the protagonist                            |
|    2 | Captain         | the commander of one of the player's ships |
|    3 | First Mate      | at most one mate                           |
|    4 | Bookkeeper      | at most one mate                           |
|    5 | Chief Navigator | at most one mate                           |
|    6 | Navigator       | every other hired mate (no assigned role)  |

### First Mate

- **Navigation experience.** At a Port Call, the First Mate receives the same
  doubled award as the Commodore and ship captains, `2 × min(D, 70)²`, instead
  of the ordinary `min(D, 100)²` (roster duty checks at `MAIN.EXE
0x2101B`/`0x21021`). See
  [Navigation experience](levels.md#navigation-experience).
- **Auto Sail** (`0x36DC3`) requires a mate with duty 3 whose skill mask has
  Celestial Navigation (`0x10`). The protagonist's own skill and other
  officers' skills do not count. Otherwise the First-Mate-first spokesman
  refuses with message 855 or 856, which have the same English text; 855 is
  used for a speaker with personality bit `0x08`.
- **Naval battle, flagship only.** When a ship's captain is the protagonist,
  the battle helpers take the best value among the protagonist, the First
  Mate, and the Chief Navigator: attributes at `0x127E1`, Battle Level at
  `0x12847`, and Gunnery at `0x1289C` (held by any of the three). Other ships
  use only their own captain's values. Seamanship is not pooled, and duels use
  the protagonist's own Swordsmanship and Luck (`0x13D42`).
- **Weather anomalies.** The First Mate's Luck counts towards avoiding an
  anomaly, and their Intuition towards warning of one; see
  [Checks every four hours](at-sea.md#checks-every-four-hours).
- **Spokesman.** The First Mate speaks first for most crew lines in ports,
  such as provisioning at the Harbor; see
  [Crew spokesmen](buildings.md#crew-spokesmen).

### Bookkeeper

- **Market haggling** (`0x2A152`). When an offer is refused, a protagonist
  with Negotiation (`0x01`), or failing that a Bookkeeper with Accounting
  (`0x02`), says message 851. The seller answers with message 852 and drops the
  price to its floor `floor(P × (19 − N) / 20)`, where `P` is the asked price
  and `N` is the protagonist's rank (byte `+0x0D` of their Fame record) in a
  port of their own nation, and 0 elsewhere (`0x2A16C–0x2A190`). The routine overwrites the protagonist's record pointer with the
  Bookkeeper's, so on a later round the Negotiation test reads the
  Bookkeeper's Negotiation bit. The line is still shown with the protagonist's
  portrait.
- **Log of Goods** (Fleet menu, `0x2224E`) looks up the port with the highest
  sale price for a carried good, among the ports the player has
  [visited](ports.md#known-and-visited-ports). A protagonist with Accounting names the port (message 848). Otherwise a
  Bookkeeper with Accounting names it (849), a Bookkeeper without Accounting
  names only the good (850), and without a Bookkeeper the protagonist says
  message 1412, “I wish I had a reliable bookkeeper.”
- **Shipyard estimate** (`0x318E9`). Only a Bookkeeper gives one, and the
  protagonist's Accounting does not count. It is exact with Accounting and
  randomized without; see
  [Shipyard prices and negotiation](ships.md#shipyard-prices-and-negotiation).
- **Spokesman.** The Bookkeeper speaks first for money lines such as payroll
  and gold checks. Payroll itself does not depend on any role.

### Chief Navigator

The Chief Navigator takes part only in the flagship battle pooling and the two
weather-anomaly checks, always alongside the First Mate, and is third in both
spokesman orders. It receives the ordinary navigation experience award, even
though in-game tip 1299 says a Chief Navigator's skills improve quickly.

### Captains and other mates

- Fleet speed uses each ship's own captain's Navigation Level and Seamanship
  (`0x36FFB`, supply `+0x1B`). Officers do not affect it; see
  [Fleet speed](at-sea.md#fleet-speed).
- Lookout uses the highest Intuition among the protagonist and **all** hired
  mates, whatever their duty (`0x36BB3`).
- Measuring latitude and longitude (`0x2F75F`) does not depend on duty. A
  protagonist with Celestial Navigation measures exactly. Otherwise message 757
  lets the player choose any mate with that skill, and cancelling makes the
  protagonist guess with an error of `random(100) + 1`.

### Assigning duties

- **Change Job Duty** (`0x24301`) fills the First Mate, Bookkeeper, and Chief
  Navigator slots from the hired mates. A captain is refused (message 227).
  A mate holds only one role, so moving an officer clears their previous slot,
  and the previous holder of the chosen slot becomes duty 6.
- **Change Captain** (`0x2400D`) swaps two captains, or makes the chosen
  sailor duty 2 and the former captain duty 6. An officer made captain
  therefore loses their role. The protagonist must captain a ship (message
  226).
- **Automatic captain choice** (`0x18229`) for new, captured, and moored ships
  takes the protagonist if they command no ship, then hired mates with a duty
  above 2 in roster order. Officers are not skipped, so they can be promoted
  to Captain automatically. Captured ships are limited to the number of
  candidates (message 285).
- Hiring sets duty 6. Leaving the player's service, through the battle-start
  withdrawal or a Harbor resignation (`0x13F29`, `0x2E3FF`), clears it to 0.
- Removing a ship from the fleet (`0xB13F`) makes its captain duty 6. A
  captain whose ship sinks in battle stays in the party as an
  unassigned mate. The same applies to a named captain whose ship sinks in a
  storm, who is reported rescued. A generic captain lost with the ship in a
  storm or to the [Missing Ship](at-sea.md#missing-ship) is first taken off
  the mate roster and given no location (`+0x25 = 0xFF`, `0x1EA8F`), so the
  sailor no longer appears in any port, although the duty byte is left at 6.
  The record is then free: each month it has a 1-in-3 chance of being reused
  for a new generic sailor with a new name and fresh attributes of 60–94
  (`0x1DC64`, `0x1D71D`). No write
  of the duty byte comes from a sailor's death.

## Mate loyalty

Loyalty is an unsigned value from **0 through 100**. It belongs to the sailor,
not to a particular ship or job. The House of Fortune's **Mates** reading
exposes it in five bands:

| Loyalty | Reading                                          |
| ------: | ------------------------------------------------ |
|    0–24 | “He'll leave you soon if you're not careful.”    |
|   25–49 | “He doesn't have very good feelings toward you.” |
|   50–74 | “He is beginning to trust you.”                  |
|   75–99 | “He is beginning to feel loyal to you.”          |
|     100 | “He's very loyal to you.”                        |

Ordinary unemployed sailors generally begin at 0, whereas the protagonists
and most story recruits begin at 100.

Treating a Pub patron adds `6 × P × M` Loyalty, capped at 100, where `P` is 2
when bit `0x40` of the patron's personality byte (`+0x27`) is set and 1
otherwise, and `M` is 3 when the patron's and Commodore's low two personality
bits match and 1 otherwise (`MAIN.EXE 0x2C1F1–0x2C221`).

Hiring a sailor adds **10 Loyalty**, capped at 100. Loyalty is then
recalculated during monthly payroll. Let `W` be the mate's monthly wage in
tens of gold pieces, `A` the highest of that mate's eight attributes, and `L`
the Commodore's Leadership:

```text
monthly change = 2 × W − A + L
new Loyalty    = clamp(old Loyalty + monthly change, 0, 100)
```

A mate already at 100 bypasses this update and remains at 100. The payroll
routine also records whether wages could actually be paid, but its Loyalty
calculation uses the stored wage in either case.

The initial hiring test and requested-wage formula are documented under
[Pub command dialogue](buildings.md#pub-command-dialogue). Pub hiring uniquely
requires the unemployed sailor's Loyalty to be above 30; Lodge hiring uses the
same experience and wage calculation without that Loyalty restriction.

Loyalty has two independently decoded low-value consequences:

- At the start of a naval battle, a mate with Loyalty below **40** who
  captains one of the player's secondary ships withdraws from the battle and
  permanently leaves the player's service. This check itself is
  deterministic; the exact farewell line is selected from four variants by
  the mate's personality bits.
- A separate [Harbor-entry event](buildings.md#mate-departure-on-harbor-entry)
  can make a mate with Loyalty below **30** ask to leave the fleet. Persuading
  the mate to remain requires accepting a raise and sets Loyalty to 30.

The House reading therefore does not expose the action thresholds exactly:
its 25-point bands straddle the battle threshold of 40 and the Harbor
threshold of 30.

The four battle-withdrawal lines are:

| Personality selector | Dialogue                                                                        |
| -------------------: | ------------------------------------------------------------------------------- |
|                    0 | “Hey, Commodore, buy me some time to escape, will you!!”                        |
|                    1 | “Commodore, I must save myself first, so I'm fleeing! I hope to see you again.” |
|                    2 | “Sorry, it's not my duty to accompany you in such danger. Good luck!”           |
|                    3 | “Commodore, you've gotten yourself into a bad spot. I can't help you any more.” |

A later battle-start report can consequently say, “Commodore, I don't see
[mate]'s ship anywhere.” This is a resignation, not merely a refusal to join
that battle. During battle setup the game:

- removes the mate from the employed-mate roster;
- sets their fleet assignment to `0xFF` and clears their duty;
- assigns them to port `random(54) + 3`, or a random port ID from 3 through 56;
- removes their commanded ship from the battle; and
- permanently empties that ship's fleet slot and ship-instance record.

These changes occur before the battle result, so subsequently winning or
escaping does not reverse them. The ship consequently disappears from the
player's fleet together with its stored cargo. Rehiring the sailor later does
not reconstruct or return it. The vacated roster slot's paired wage byte is
left unchanged, but it is ignored while the roster entry is `0xFF`.

This differs from the Harbor resignation only in its trigger, destination,
and cleanup details. A Harbor refusal reaches the dismissal routine at
`MAIN.EXE 0x2E3C3`, which also clears the paired wage and stores the current
port instead of choosing a random one.

The Loyalty field is read at `MAIN.EXE 0x334A8–0x3351A`; hiring updates it at
`0x2C40E–0x2C4ED`, monthly payroll at `0x1DFF6–0x1E15B`, and the battle-start
withdrawal begins at `0x14C3E`. Its persistent dismissal helper is
`0000:E8E5`, located at file offset `0x13EE5`.

## Main characters

|  ID | Sailor           | Nationality | Leadership | Seamanship | Knowledge | Intuition | Courage | Swordsmanship | Charm | Luck | Navigation Level | Battle Level | Age | Skills                            |
| --: | ---------------- | ----------- | ---------: | ---------: | --------: | --------: | ------: | ------------: | ----: | ---: | ---------------: | -----------: | --: | --------------------------------- |
|   0 | Joao Franco      | Portugal    |         78 |         75 |        73 |        85 |      82 |            82 |    89 |   50 |                1 |            1 |  18 | Negotiation                       |
|   1 | Catalina Erantzo | Spain       |         80 |         79 |        65 |        52 |      86 |            92 |    95 |   50 |                8 |           10 |  18 | Gunnery                           |
|   2 | Otto Baynes      | England     |         92 |         72 |        61 |        43 |      88 |            86 |    82 |   50 |               10 |           12 |  39 | Gunnery                           |
|   3 | Ernst Von Bohr   | Holland     |         78 |         92 |        86 |        82 |      62 |            53 |    90 |   50 |               11 |            1 |  23 | Cartography, Celestial Navigation |
|   4 | Pietro Conti     | Italy       |         84 |         80 |        75 |        87 |      53 |            61 |    81 |   50 |                4 |            1 |  33 | Celestial Navigation              |
|   5 | Ali Vezas        | Turkey      |         80 |         86 |        84 |        65 |      53 |            42 |    80 |   50 |                1 |            1 |  19 | Negotiation, Accounting           |

## Story recruits

Edmund Gilbert is present in the game files as a sailor record, but he never
joins the player and cannot be hired. He is an antagonist during Otto’s story.

|  ID | Sailor          | Nationality | Leadership | Seamanship | Knowledge | Intuition | Courage | Swordsmanship | Charm | Luck | Navigation Level | Battle Level | Age | Skills                           |
| --: | --------------- | ----------- | ---------: | ---------: | --------: | --------: | ------: | ------------: | ----: | ---: | ---------------: | -----------: | --: | -------------------------------- |
|  69 | Rocco Alemkel   | Portugal    |         75 |         82 |        84 |        90 |      93 |            92 |    70 |   70 |               30 |           32 |  65 | Gunnery, Celestial Navigation    |
|  70 | Enrico Malione  | Portugal    |         66 |         48 |        93 |        55 |      62 |            48 |    82 |  100 |                1 |            1 |  24 | Accounting                       |
|  71 | Domingo Manana  | Portugal    |         60 |         68 |        58 |        62 |      81 |            76 |    90 |  100 |                1 |            1 |  17 | Negotiation                      |
|  72 | Emilio Sanude   | Spain       |         71 |         55 |        40 |        43 |      79 |            80 |    65 |   70 |                8 |           11 |  20 | Gunnery, Celestial Navigation    |
|  73 | Andreas Paella  | Spain       |         70 |         44 |        32 |        60 |      95 |            82 |    70 |   80 |                9 |           15 |  26 | Gunnery, Celestial Navigation    |
|  74 | Edmund Gilbert  | England     |         62 |         52 |        90 |        35 |      37 |            42 |    55 |   15 |                1 |            1 |  30 | —                                |
|  75 | Matthew Loy     | England     |         81 |         75 |        52 |        74 |      77 |            70 |    69 |   95 |                7 |           10 |  27 | Gunnery, Celestial Navigation    |
|  76 | Camillo Stefano | Italy       |         71 |         72 |        66 |        78 |      51 |            60 |    68 |   75 |                3 |            2 |  31 | Accounting, Celestial Navigation |
|  77 | Hans Starten    | Portugal    |         74 |         85 |        80 |        69 |      42 |            38 |    71 |   89 |               10 |            2 |  37 | Celestial Navigation             |
|  78 | Salim Jahan     | Turkey      |         82 |         80 |        84 |        44 |      71 |            79 |    60 |   65 |                3 |            7 |  19 | Gunnery, Celestial Navigation    |

## Permanent vagabonds

These persistent recruits are found in inns or cafés; locations can change during play.

|  ID | Sailor           | Nationality | Leadership | Seamanship | Knowledge | Intuition | Courage | Swordsmanship | Charm | Luck | Navigation Level | Battle Level | Age | Skills                                                              |
| --: | ---------------- | ----------- | ---------: | ---------: | --------: | --------: | ------: | ------------: | ----: | ---: | ---------------: | -----------: | --: | ------------------------------------------------------------------- |
|  79 | Pilly Reis       | Turkey      |         80 |        100 |       100 |       100 |      68 |            52 |    74 |  100 |               60 |           50 |  37 | Negotiation, Accounting, Gunnery, Cartography, Celestial Navigation |
|  80 | Afmet Glanie     | Turkey      |         82 |         79 |        53 |        78 |      83 |            58 |    66 |   88 |                1 |            1 |  27 | —                                                                   |
|  82 | Zaganos Bei      | Turkey      |         51 |         58 |        87 |        82 |      61 |            88 |    61 |   73 |                2 |            1 |  35 | Negotiation, Accounting                                             |
|  83 | Fernan Pinto     | Portugal    |         78 |         73 |        77 |        83 |      88 |            69 |    66 |   42 |               12 |            7 |  19 | Cartography, Celestial Navigation                                   |
|  85 | Miguel Solis     | Portugal    |         84 |         73 |        77 |        84 |      84 |            54 |    86 |   64 |                7 |            6 |  34 | Negotiation, Gunnery, Celestial Navigation                          |
|  87 | Dante Peleira    | Portugal    |         67 |         79 |        68 |        61 |      76 |            66 |    65 |   61 |                1 |            1 |  39 | Celestial Navigation                                                |
|  91 | Luka Ullman      | Spain       |         87 |         87 |        52 |        74 |      82 |            85 |    72 |   65 |                1 |            2 |  36 | —                                                                   |
|  93 | Benito Gomez     | Spain       |         83 |         70 |        80 |        71 |      65 |            88 |    83 |   77 |               14 |           12 |  25 | Accounting, Cartography, Celestial Navigation                       |
|  94 | Bernardo Sanchez | Spain       |         73 |         75 |        69 |        78 |      64 |            54 |    76 |   79 |               11 |            7 |  33 | Negotiation, Celestial Navigation                                   |
|  97 | Gus Johnson      | England     |         62 |         66 |        76 |        84 |      89 |            67 |    72 |   54 |                2 |            3 |  19 | Gunnery, Celestial Navigation                                       |
|  98 | Lawrence Edwards | England     |         51 |         88 |        84 |        66 |      62 |            52 |    79 |   60 |                7 |            9 |  31 | Negotiation, Gunnery                                                |
|  99 | Antoine Fitch    | England     |         85 |         76 |        51 |        63 |      73 |            74 |    84 |   63 |                2 |            1 |  23 | Accounting, Celestial Navigation                                    |
| 101 | Aloiji Jovanni   | Italy       |         61 |         85 |        89 |        60 |      70 |            86 |    76 |   61 |               14 |            9 |  17 | Negotiation, Celestial Navigation                                   |
| 102 | Fritz Ramsey     | Italy       |         85 |         71 |        80 |        75 |      80 |            77 |    76 |   85 |                2 |            2 |  37 | —                                                                   |
| 103 | Nicolo Montagna  | Italy       |         79 |         79 |        65 |        70 |      74 |            73 |    78 |   56 |                8 |            5 |  41 | Celestial Navigation                                                |
| 108 | Georg Scholl     | Holland     |         57 |         71 |        58 |        78 |      67 |            83 |    71 |   76 |                3 |            4 |  26 | Celestial Navigation                                                |
| 109 | Patrick Toman    | Holland     |         82 |         57 |        52 |        51 |      57 |            86 |    84 |   50 |                7 |            9 |  38 | Cartography, Celestial Navigation                                   |
| 110 | Jacob Walweik    | Holland     |         64 |         52 |        82 |        53 |      88 |            77 |    67 |   51 |                5 |            3 |  18 | Accounting                                                          |
| 114 | Hamid Lal        | Piracy      |         72 |         66 |        71 |        81 |      52 |            76 |    89 |   66 |                9 |           15 |  22 | Gunnery, Celestial Navigation                                       |
| 116 | George Eggel     | Piracy      |         69 |         87 |        73 |        59 |      81 |            72 |    76 |   72 |                1 |            1 |  29 | Gunnery                                                             |
| 118 | Robert Donahue   | Piracy      |         69 |         67 |        62 |        62 |      73 |            89 |    82 |   86 |                9 |           12 |  26 | Gunnery, Celestial Navigation                                       |

## Temporary vagabonds

These recruits disappear after being defeated and are only available while not sailing.

|  ID | Sailor           | Nationality | Leadership | Seamanship | Knowledge | Intuition | Courage | Swordsmanship | Charm | Luck | Navigation Level | Battle Level | Age | Skills                                     |
| --: | ---------------- | ----------- | ---------: | ---------: | --------: | --------: | ------: | ------------: | ----: | ---: | ---------------: | -----------: | --: | ------------------------------------------ |
|  81 | Al Fasi          | Turkey      |         73 |         67 |        89 |        81 |      63 |            86 |    89 |   74 |                2 |            3 |  19 | Accounting                                 |
|  84 | Roberto Almanzan | Portugal    |         75 |         52 |        75 |        56 |      69 |            79 |    54 |   88 |                2 |            1 |  22 | —                                          |
|  86 | Diego Fagundes   | Portugal    |         53 |         83 |        64 |        65 |      76 |            81 |    88 |   83 |                6 |            6 |  20 | —                                          |
|  88 | Manuel Melgoza   | Portugal    |         65 |         83 |        67 |        79 |      60 |            78 |    71 |   15 |                2 |            2 |  20 | —                                          |
|  89 | Cisco Alvarez    | Portugal    |         51 |         74 |        67 |        54 |      57 |            64 |    74 |   68 |                5 |            5 |  41 | Gunnery                                    |
|  90 | Louis Fareiro    | Portugal    |         58 |         55 |        62 |        64 |      58 |            53 |    63 |    5 |                1 |            1 |  22 | Celestial Navigation                       |
|  92 | Sabino Balboa    | Spain       |         87 |         77 |        60 |        62 |      85 |            87 |    71 |   43 |               13 |            8 |  30 | Negotiation, Gunnery, Celestial Navigation |
|  95 | Omar Kashani     | Spain       |         64 |         78 |        81 |        84 |      59 |            61 |    86 |   10 |                6 |            5 |  35 | Gunnery, Celestial Navigation              |
|  96 | Alonzo Oreida    | Spain       |         59 |         65 |        80 |        71 |      68 |            53 |    64 |   77 |                1 |            1 |  24 | —                                          |
| 100 | Anthony Morgan   | England     |         66 |         87 |        67 |        68 |      65 |            53 |    78 |   41 |                2 |            1 |  21 | —                                          |
| 104 | Amerigo Bassio   | Italy       |         83 |         74 |        76 |        60 |      77 |            64 |    83 |   72 |                7 |            8 |  18 | Gunnery                                    |
| 105 | Carmine Ragussa  | Italy       |         54 |         68 |        71 |        79 |      67 |            79 |    58 |    0 |                5 |            5 |  35 | —                                          |
| 106 | Klaus Shouten    | Holland     |         75 |         61 |        76 |        80 |      53 |            62 |    88 |   56 |                5 |            6 |  31 | —                                          |
| 107 | Ambroise Einger  | Holland     |         81 |         77 |        77 |        55 |      78 |            84 |    59 |   54 |                1 |            2 |  22 | —                                          |
| 111 | Ivan Soledad     | Piracy      |         54 |         75 |        43 |        54 |      78 |            84 |    75 |   29 |                1 |            3 |  24 | Gunnery                                    |
| 112 | Antonio Pintado  | Piracy      |         70 |         44 |        65 |        87 |      82 |            75 |    46 |   67 |                1 |            1 |  21 | —                                          |
| 113 | Cizzaro Fedeliti | Piracy      |         85 |         62 |        68 |        80 |      74 |            70 |    59 |   81 |                1 |            2 |  21 | Gunnery                                    |
| 115 | Henry Mancine    | Piracy      |         60 |         72 |        58 |        61 |      78 |            70 |    43 |   11 |                2 |            3 |  20 | Gunnery                                    |
| 117 | Jack Diffson     | Piracy      |         71 |         71 |        54 |        58 |      62 |            79 |    41 |   88 |                5 |            8 |  27 | Gunnery, Celestial Navigation              |
| 119 | Richard Huxley   | Piracy      |         51 |         69 |        48 |        83 |      87 |            67 |    50 |   75 |                1 |            2 |  22 | Gunnery                                    |

## Active NPC captains

Sailor IDs `6–68` are active NPC captains. Their fleet assignments and ship compositions are documented in [fleets.md](fleets.md).

|  ID | Sailor           | Nationality | Leadership | Seamanship | Knowledge | Intuition | Courage | Swordsmanship | Charm | Luck | Navigation Level | Battle Level | Age | Skills                                                     |
| --: | ---------------- | ----------- | ---------: | ---------: | --------: | --------: | ------: | ------------: | ----: | ---: | ---------------: | -----------: | --: | ---------------------------------------------------------- |
|   6 | Simon Sekeira    | Portugal    |         74 |         74 |        86 |        53 |      77 |            61 |    87 |   64 |               14 |           15 |  24 | Negotiation, Accounting, Cartography, Celestial Navigation |
|   7 | Louis Costa      | Portugal    |         80 |         51 |        86 |        89 |      52 |            89 |    59 |   89 |               17 |           17 |  32 | Accounting, Gunnery, Celestial Navigation                  |
|   8 | Lorenzo Peron    | Portugal    |         81 |         78 |        57 |        83 |      87 |            70 |    55 |   86 |               11 |           11 |  33 | Accounting                                                 |
|   9 | Ropao Feleira    | Portugal    |         50 |         82 |        68 |        59 |      63 |            80 |    84 |   59 |               11 |           12 |  20 | Negotiation, Celestial Navigation                          |
|  10 | Raphael Selran   | Portugal    |         77 |         64 |        83 |        74 |      73 |            73 |    79 |   83 |               15 |           15 |  36 | Gunnery, Celestial Navigation                              |
|  11 | Diego Souson     | Portugal    |         51 |         74 |        63 |        64 |      50 |            83 |    89 |   63 |                9 |           11 |  36 | Gunnery                                                    |
|  12 | Alfonse Andlade  | Portugal    |         59 |         82 |        75 |        84 |      52 |            78 |    85 |   58 |                9 |           11 |  31 | Celestial Navigation                                       |
|  13 | Garcia Alvarao   | Portugal    |         77 |         75 |        89 |        78 |      55 |            85 |    52 |   85 |               14 |           16 |  28 | Gunnery, Cartography, Celestial Navigation                 |
|  14 | Duarte Silveira  | Portugal    |         85 |         57 |        80 |        81 |      52 |            73 |    52 |   75 |                8 |            8 |  30 | —                                                          |
|  15 | Esteban Ortega   | Spain       |         73 |         54 |        78 |        82 |      78 |            55 |    87 |   51 |               14 |           15 |  23 | Negotiation, Accounting, Gunnery, Celestial Navigation     |
|  16 | Carlos Aragon    | Spain       |         58 |         87 |        50 |        58 |      56 |            67 |    77 |   52 |               10 |            8 |  37 | Negotiation, Celestial Navigation                          |
|  17 | Ricardo Zapata   | Spain       |         60 |         61 |        88 |        55 |      86 |            70 |    89 |   74 |                8 |           10 |  25 | Accounting                                                 |
|  18 | Juan Santana     | Spain       |         62 |         65 |        83 |        60 |      62 |            59 |    78 |   72 |               13 |           16 |  29 | Negotiation, Accounting, Gunnery, Celestial Navigation     |
|  19 | Tonio Burciaga   | Spain       |         79 |         51 |        73 |        69 |      77 |            71 |    86 |   88 |               16 |           17 |  32 | Gunnery, Cartography, Celestial Navigation                 |
|  20 | Hugo Montoya     | Spain       |         65 |         72 |        54 |        71 |      53 |            63 |    55 |   84 |               16 |           17 |  29 | Gunnery, Celestial Navigation                              |
|  21 | Xavier Navarro   | Spain       |         50 |         55 |        66 |        66 |      59 |            79 |    75 |   74 |                9 |           10 |  41 | —                                                          |
|  22 | Bernal Loyola    | Spain       |         65 |         67 |        50 |        52 |      51 |            86 |    83 |   56 |               11 |           11 |  19 | Gunnery, Celestial Navigation                              |
|  23 | Hernan Chavez    | Spain       |         88 |         63 |        75 |        83 |      71 |            65 |    89 |   87 |               16 |           16 |  29 | Gunnery, Celestial Navigation                              |
|  24 | Yazid Shabbaz    | Turkey      |         70 |         77 |        65 |        85 |      77 |            52 |    51 |   58 |               12 |           11 |  27 | Negotiation, Accounting, Celestial Navigation              |
|  25 | Malik Yasale     | Turkey      |         57 |         61 |        79 |        70 |      76 |            84 |    55 |   86 |               10 |            8 |  25 | Negotiation, Accounting                                    |
|  26 | Palah Abdul      | Turkey      |         71 |         65 |        87 |        79 |      85 |            77 |    86 |   72 |               17 |           14 |  27 | Negotiation, Accounting, Cartography, Celestial Navigation |
|  27 | Marwan Hazan     | Turkey      |         76 |         70 |        59 |        60 |      73 |            89 |    88 |   77 |               14 |           17 |  17 | Negotiation, Accounting, Celestial Navigation              |
|  28 | Rashid Jabbar    | Turkey      |         83 |         63 |        80 |        58 |      60 |            67 |    68 |   78 |               14 |           16 |  28 | Gunnery, Cartography, Celestial Navigation                 |
|  29 | Walid Kemal      | Turkey      |         67 |         72 |        68 |        52 |      53 |            58 |    77 |   62 |               15 |           17 |  36 | Gunnery, Celestial Navigation                              |
|  30 | Afmed Muhiddin   | Turkey      |         72 |         64 |        68 |        62 |      68 |            84 |    75 |   89 |               11 |           12 |  32 | Gunnery, Celestial Navigation                              |
|  31 | Sallah Iskal     | Turkey      |         73 |         65 |        69 |        89 |      66 |            58 |    81 |   60 |                9 |            8 |  42 | —                                                          |
|  32 | Siddarth Kebin   | Turkey      |         69 |         84 |        74 |        62 |      85 |            72 |    83 |   63 |               13 |           15 |  20 | Gunnery, Celestial Navigation                              |
|  33 | Joseph Eastman   | England     |         50 |         51 |        81 |        73 |      73 |            54 |    81 |   55 |               14 |           15 |  35 | Negotiation, Accounting, Cartography, Celestial Navigation |
|  34 | Thomas Grisham   | England     |         64 |         55 |        58 |        51 |      86 |            64 |    86 |   66 |                8 |           11 |  39 | Negotiation, Celestial Navigation                          |
|  35 | Colin Lowe       | England     |         89 |         85 |        70 |        88 |      72 |            67 |    83 |   78 |               17 |           13 |  18 | Accounting, Cartography, Celestial Navigation              |
|  36 | Edmund Harvey    | England     |         83 |         52 |        77 |        68 |      68 |            71 |    62 |   73 |                9 |            8 |  36 | Negotiation                                                |
|  37 | Robert Wilde     | England     |         77 |         64 |        73 |        67 |      69 |            54 |    65 |   82 |               14 |           15 |  26 | Gunnery, Cartography, Celestial Navigation                 |
|  38 | Victor Russell   | England     |         73 |         56 |        53 |        66 |      51 |            64 |    74 |   80 |               16 |           13 |  42 | Gunnery, Celestial Navigation                              |
|  39 | William Clive    | England     |         52 |         72 |        77 |        57 |      73 |            78 |    55 |   83 |               11 |           10 |  38 | Gunnery, Celestial Navigation                              |
|  40 | Walter Laurence  | England     |         66 |         64 |        67 |        51 |      50 |            66 |    85 |   53 |                8 |            8 |  35 | —                                                          |
|  41 | Charles Grafton  | England     |         82 |         64 |        58 |        50 |      59 |            56 |    68 |   58 |               11 |           10 |  32 | Gunnery, Celestial Navigation                              |
|  42 | Guido Benzo      | Italy       |         75 |         50 |        64 |        65 |      61 |            75 |    72 |   73 |               16 |           17 |  28 | Negotiation, Gunnery, Cartography, Celestial Navigation    |
|  43 | Jossepi Arleo    | Italy       |         75 |         52 |        50 |        72 |      80 |            69 |    78 |   63 |               12 |           10 |  26 | Negotiation, Celestial Navigation                          |
|  44 | Santino Amadio   | Italy       |         81 |         78 |        56 |        84 |      60 |            74 |    56 |   62 |               12 |           10 |  45 | Negotiation                                                |
|  45 | Giovanni Aldente | Italy       |         50 |         64 |        81 |        71 |      86 |            51 |    64 |   52 |               15 |           16 |  21 | Negotiation, Gunnery, Cartography, Celestial Navigation    |
|  46 | Andrea Glimani   | Italy       |         89 |         66 |        74 |        57 |      89 |            78 |    78 |   79 |                9 |           10 |  21 | Gunnery                                                    |
|  47 | Gabriel Canolli  | Italy       |         69 |         86 |        51 |        62 |      71 |            74 |    52 |   66 |               11 |           12 |  26 | Gunnery, Celestial Navigation                              |
|  48 | Luigi Mangia     | Italy       |         75 |         60 |        86 |        89 |      69 |            76 |    81 |   50 |               20 |           21 |  28 | Gunnery, Cartography, Celestial Navigation                 |
|  49 | Vittorio Doria   | Italy       |         83 |         73 |        87 |        55 |      71 |            68 |    77 |   52 |               27 |           30 |  28 | Gunnery, Cartography, Celestial Navigation                 |
|  50 | Columbo Vacca    | Italy       |         67 |         81 |        56 |        61 |      50 |            62 |    78 |   87 |                9 |            9 |  45 | —                                                          |
|  51 | Hugo Oljack      | Holland     |         64 |         82 |        85 |        73 |      62 |            56 |    54 |   52 |               13 |           15 |  31 | Negotiation, Accounting, Cartography, Celestial Navigation |
|  52 | Marion Glotis    | Holland     |         89 |         89 |        52 |        88 |      65 |            59 |    72 |   50 |               10 |           11 |  29 | Accounting, Cartography, Celestial Navigation              |
|  53 | Jules Huigen     | Holland     |         68 |         56 |        70 |        76 |      54 |            60 |    71 |   63 |                9 |           10 |  44 | Negotiation, Accounting, Celestial Navigation              |
|  54 | Maurice Laiden   | Holland     |         62 |         50 |        58 |        82 |      66 |            75 |    58 |   89 |               12 |           11 |  35 | Accounting, Cartography, Celestial Navigation              |
|  55 | Leonie Van Fuyk  | Holland     |         61 |         70 |        57 |        73 |      50 |            60 |    57 |   68 |               10 |            8 |  43 | Celestial Navigation                                       |
|  56 | Vilem Hein       | Holland     |         55 |         89 |        86 |        64 |      88 |            69 |    68 |   73 |               15 |           15 |  30 | Gunnery, Cartography, Celestial Navigation                 |
|  57 | Julian Felmer    | Holland     |         68 |         83 |        61 |        52 |      56 |            62 |    85 |   70 |               12 |            8 |  21 | Celestial Navigation                                       |
|  58 | Gordon Hendrick  | Holland     |         61 |         57 |        56 |        88 |      81 |            67 |    82 |   52 |                8 |           10 |  33 | Gunnery, Cartography, Celestial Navigation                 |
|  59 | Jacques Broom    | Holland     |         78 |         69 |        50 |        69 |      51 |            56 |    60 |   85 |               13 |           15 |  26 | Gunnery, Cartography, Celestial Navigation                 |
|  60 | Antonio Khan     | Portugal    |         81 |         78 |        89 |        73 |      68 |            80 |    70 |   51 |                7 |           16 |  44 | —                                                          |
|  61 | Pierre Lugulan   | Piracy      |         86 |         74 |        80 |        55 |      81 |            50 |    77 |   65 |                9 |           12 |  37 | Celestial Navigation                                       |
|  62 | Louis Scott      | Piracy      |         68 |         76 |        77 |        61 |      73 |            78 |    59 |   73 |               11 |           16 |  20 | Gunnery, Celestial Navigation                              |
|  63 | John Davis       | Piracy      |         85 |         56 |        71 |        54 |      86 |            60 |    79 |   71 |               10 |           14 |  42 | —                                                          |
|  64 | Khayr ad-Din     | Piracy      |         93 |         76 |        70 |        79 |      89 |            93 |    41 |   70 |               18 |           32 |  36 | Gunnery, Cartography, Celestial Navigation                 |
|  65 | Idin Leis        | Piracy      |         78 |         66 |        86 |        70 |      74 |            85 |    68 |   54 |               16 |           30 |  32 | Gunnery                                                    |
|  66 | Mohommed Syarook | Piracy      |         87 |         78 |        78 |        66 |      85 |            92 |    76 |   87 |               20 |           31 |  28 | Gunnery, Cartography, Celestial Navigation                 |
|  67 | Ulgu Ali         | Piracy      |         52 |         79 |        62 |        88 |      60 |            74 |    59 |   87 |               21 |           28 |  35 | Gunnery, Cartography, Celestial Navigation                 |
|  68 | Jack Raccam      | Piracy      |         88 |         66 |        68 |        88 |      51 |            78 |    96 |   70 |                9 |           13 |  24 | —                                                          |

## Open questions

- **Unused duty selectors.** Three helpers pick a mate by duty preference in
  the orders 3–5–4 (`0x23DE2`), 4–3–5 (`0x23E12`), and 5–3–4 (`0x23E42`), but
  no caller has been found. They may be unused.
