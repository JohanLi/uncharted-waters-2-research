# Fleet data

`KOUKAI2.DAT` stores a captain's fleet indirectly. The captain/officer records
are 42 bytes long and begin at file offset `0x06a9`:

```text
officer = 0x06a9 + officer_index * 0x2a
fleet_id = officer[0x24]
fleet = 0x1e77 + fleet_id * 0x85
```

Each fleet has ten 9-byte ship slots beginning at `fleet + 0x2b`. Empty slots
start with `0xff`. The ship-instance reference is slot byte `+0x07`:

```text
ship_instance_id = slot[0x07]
ship_instance = 0x4893 + ship_instance_id * 0x18
ship_type_id = ship_instance[0x11]
display_ship_id = ship_type_id + 1
```

## Current player's fleet

The player's active fleet must be located from the current save; its fleet ID
is not necessarily `0x00`. For the active protagonist record, use the slot's
relative offsets:

```text
protagonist = slot base + 0x0612 + protagonist index × 0x2A
fleet_id    = protagonist[0x24]
fleet       = 0x1E77 + fleet_id × 0x85
```

The protagonist index is the record selected for the current player's
character in that save, whether the player is João, Otto, Catalina, or another
protagonist. The ten ship slots then begin at `fleet + 0x2B`; an occupied slot
is identified by a first byte other than `0xFF`, and its ship-instance
reference is at slot byte `+0x07`:

```text
ship_instance_id = slot[0x07]
ship_instance    = 0x4893 + ship_instance_id × 0x18
ship_type_id     = ship_instance[0x11]
display_ship_id  = ship_type_id + 1
```

The remaining slot bytes contain the ship's current crew, durability, tacking,
power, gun count, and status. The ship-instance record contains the ship name
and its configured model data. Consequently, the current fleet composition,
ship names, and ship condition should always be read from the save being
examined rather than assumed from a fixed example.

Thus player and NPC fleets use the same chain:

```text
captain → fleet ID → fleet record → ship slots → ship instances
```

## NPC captain fleets

The following are the game's initial NPC fleet configurations. Counts are
grouped by ship type; these starting configurations are consistent across
new-game saves, although fleets can change during play.

| Fleet | Captain          | Ships                                 |
| ----: | ---------------- | ------------------------------------- |
|    01 | Simon Sekeira    | 4 Nao, 1 Brigantine, 2 Carrack        |
|    02 | Louis Costa      | 4 Nao, 2 Brigantine, 1 Carrack        |
|    03 | Lorenzo Peron    | 4 Nao, 1 Brigantine, 1 Carrack        |
|    04 | Ropao Feleira    | 3 Nao, 1 Brigantine, 2 Carrack        |
|    05 | Raphael Selran   | 5 Flemish Galleon, 2 Light Galley     |
|    06 | Diego Souson     | 4 Flemish Galleon, 2 Light Galley     |
|    07 | Alfonse Andlade  | 5 Galleon, 2 Carrack                  |
|    08 | Garcia Alvarao   | 4 Galleon, 2 Carrack                  |
|    09 | Duarte Silveira  | 5 Galleon, 1 Carrack                  |
|    0b | Esteban Ortega   | 4 Nao, 1 Brigantine, 2 Carrack        |
|    0c | Carlos Aragon    | 4 Nao, 2 Brigantine, 1 Carrack        |
|    0d | Ricardo Zapata   | 4 Nao, 1 Brigantine, 1 Carrack        |
|    0e | Juan Santana     | 3 Nao, 1 Brigantine, 2 Carrack        |
|    0f | Tonio Burciaga   | 5 Flemish Galleon, 2 Light Galley     |
|    10 | Hugo Montoya     | 4 Flemish Galleon, 2 Light Galley     |
|    11 | Xavier Navarro   | 5 Galleon, 2 Carrack                  |
|    12 | Bernal Loyola    | 4 Galleon, 2 Carrack                  |
|    13 | Hernan Chavez    | 5 Galleon, 1 Carrack                  |
|    15 | Yazid Shabbaz    | 5 Nao, 2 Carrack                      |
|    16 | Malik Yasale     | 6 Nao, 1 Carrack                      |
|    17 | Palah Abdul      | 4 Nao, 2 Carrack                      |
|    18 | Marwan Hazan     | 5 Nao, 1 Carrack                      |
|    19 | Rashid Jabbar    | 5 Flemish Galleon, 2 Venetian Galeass |
|    1a | Walid Kemal      | 4 Flemish Galleon, 2 Venetian Galeass |
|    1b | Afmed Muhiddin   | 5 Xebec, 2 Carrack                    |
|    1c | Sallah Iskal     | 5 Xebec, 1 Carrack                    |
|    1d | Siddarth Kebin   | 4 Xebec, 2 Carrack                    |
|    1f | Joseph Eastman   | 4 Nao, 2 Carrack, 1 Caravela Redonda  |
|    20 | Thomas Grisham   | 4 Nao, 1 Carrack, 2 Caravela Redonda  |
|    21 | Colin Lowe       | 3 Nao, 2 Carrack, 1 Caravela Redonda  |
|    22 | Edmund Harvey    | 4 Nao, 1 Carrack, 1 Caravela Redonda  |
|    23 | Robert Wilde     | 5 Carrack, 2 Galleon                  |
|    24 | Victor Russell   | 4 Carrack, 2 Galleon                  |
|    25 | William Clive    | 5 Galleon, 2 Carrack                  |
|    26 | Walter Laurence  | 5 Galleon, 1 Carrack                  |
|    27 | Charles Grafton  | 4 Galleon, 2 Carrack                  |
|    29 | Guido Benzo      | 6 Buss, 1 Tallette                    |
|    2a | Jossepi Arleo    | 5 Buss, 2 Tallette                    |
|    2b | Santino Amadio   | 5 Buss, 1 Tallette                    |
|    2c | Giovanni Aldente | 4 Buss, 2 Tallette                    |
|    2d | Andrea Glimani   | 5 Flemish Galleon, 2 Venetian Galeass |
|    2e | Gabriel Canolli  | 4 Flemish Galleon, 2 Venetian Galeass |
|    2f | Luigi Mangia     | 4 Buss, 2 Carrack, 1 Nao              |
|    30 | Vittorio Doria   | 3 Buss, 2 Carrack, 1 Nao              |
|    31 | Columbo Vacca    | 3 Buss, 1 Carrack, 2 Nao              |
|    33 | Hugo Oljack      | 4 Nao, 2 Carrack, 1 Caravela Latina   |
|    34 | Marion Glotis    | 4 Nao, 1 Carrack, 2 Caravela Latina   |
|    35 | Jules Huigen     | 3 Nao, 2 Carrack, 1 Caravela Latina   |
|    36 | Maurice Laiden   | 4 Nao, 1 Carrack, 1 Caravela Latina   |
|    37 | Leonie Van Fuyk  | 5 Carrack, 2 Galleon                  |
|    38 | Vilem Hein       | 4 Carrack, 2 Galleon                  |
|    39 | Julian Felmer    | 5 Galleon, 2 Carrack                  |
|    3a | Gordon Hendrick  | 5 Galleon, 1 Carrack                  |
|    3b | Jacques Broom    | 4 Galleon, 2 Carrack                  |
|    3c | Antonio Khan     | 4 Carrack, 5 Galleon, 1 Nao           |
|    3d | Hamid Lal        | 4 Carrack, 2 Galleon, 1 Nao           |
|    3e | Pierre Lugulan   | 4 Carrack, 1 Galleon, 2 Nao           |
|    3f | Louis Scott      | 3 Carrack, 2 Galleon, 1 Nao           |
|    40 | John Davis       | 4 Carrack, 1 Galleon, 1 Nao           |
|    41 | Khayr ad-Din     | 5 Venetian Galeass, 2 Flemish Galleon |
|    42 | Idin Leis        | 5 Venetian Galeass, 1 Flemish Galleon |
|    43 | Mohommed Syarook | 5 Galleon, 2 Nao                      |
|    44 | Ulgu Ali         | 5 Galleon, 1 Nao                      |
|    45 | Jack Raccam      | 4 Galleon, 2 Nao                      |

The six protagonist records in the reference layout point at fleet IDs `00`,
`0a`, `14`, `1e`, `28`, and `32`. Which of those is the current player's fleet
depends on the protagonist selected in the save; it is not correct to assume
that fleet `00` is active. The fleet ID should therefore always be read from
the selected protagonist record as described above. Other protagonist fleets
may be initialized differently by a different scenario or save state.

## Fleet regeneration

The initial ship slots are not necessarily permanent. `MAIN.EXE` contains
maintenance/refill routines that can repopulate empty NPC fleet slots based on
the fleet's nation/group, fleet-class suffix, nation development, and a random
roll. Therefore this document describes the initial file state, not every fleet
composition that can occur during play.
