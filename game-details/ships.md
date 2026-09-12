# Ships

The game contains 25 ship types. Ship IDs are one-based and match the order in
the extracted ship table. The catalog below presents the decoded ship data
first; the storage layout appears later.

## Ship catalog

`Sail Type` uses the extractor's one-based display value. The raw data stores
this value minus one.

|  ID | Ship             | Used Crew | Used Guns | Industry Req. | Durability | Tacking | Power | Max Crew | Min Crew | Capacity | Max Guns | Sail Type | Base Price |
| --: | ---------------- | --------: | --------: | ------------: | ---------: | ------: | ----: | -------: | -------: | -------: | -------: | --------: | ---------: |
|   1 | Balsa            |        15 |         5 |           100 |         30 |      70 |    80 |       20 |        5 |       50 |       10 |         5 |      1,200 |
|   2 | Hansa Cog        |        20 |         5 |           100 |         20 |      65 |    85 |       20 |        5 |       60 |       10 |         5 |      1,300 |
|   3 | Dhow             |        15 |         5 |           300 |         30 |      90 |    75 |       20 |        5 |       70 |       15 |         5 |      1,800 |
|   4 | Buss             |       150 |        30 |           700 |         70 |      50 |    60 |      200 |       50 |      500 |       40 |         1 |     20,000 |
|   5 | Tallette         |        15 |        10 |           200 |         20 |      70 |    95 |       20 |        5 |       80 |       15 |         5 |      1,400 |
|   6 | Caravela Latina  |        30 |        10 |           200 |         30 |      90 |    75 |       40 |       10 |      120 |       20 |         6 |      2,400 |
|   7 | Caravela Redonda |        30 |        10 |           200 |         30 |      70 |    90 |       40 |       10 |      120 |       20 |         5 |      2,400 |
|   8 | Brigantine       |        45 |        15 |           400 |         40 |      90 |    70 |       60 |       15 |      180 |       20 |         6 |     10,000 |
|   9 | Nao              |        80 |        30 |           500 |         50 |      65 |    85 |      120 |       25 |      450 |       40 |         3 |     30,000 |
|  10 | Carrack          |       100 |        30 |           600 |         50 |      60 |    80 |      160 |       30 |      600 |       50 |         3 |     40,000 |
|  11 | Galleon          |       180 |        70 |           800 |         80 |      60 |    65 |      200 |       45 |      800 |       70 |         1 |     60,000 |
|  12 | Xebec            |       120 |        30 |           500 |         70 |      80 |    70 |      300 |       25 |      600 |       40 |         4 |     44,000 |
|  13 | Pinnace          |        40 |        15 |           550 |         40 |      95 |    85 |       60 |        5 |      150 |       20 |         6 |      6,000 |
|  14 | Sloop            |        40 |        15 |           850 |         50 |      95 |    85 |       60 |        5 |      250 |       40 |         6 |     16,000 |
|  15 | Frigate          |       180 |        65 |          1000 |         80 |      60 |    85 |      300 |       20 |      650 |       70 |         5 |    224,000 |
|  16 | Barge            |       270 |       120 |          1000 |         90 |      50 |    65 |      450 |       40 |     1000 |      120 |         3 |    300,000 |
|  17 | Full-rigged Ship |       300 |       120 |          1000 |         90 |      50 |    65 |      500 |       45 |     1200 |      150 |         3 |    320,000 |
|  18 | Junk             |        75 |        30 |           300 |         80 |      80 |    70 |      100 |       25 |      500 |       40 |         4 |     16,000 |
|  19 | Light Galley     |        30 |        10 |           100 |         40 |     100 |    85 |       20 |        5 |      120 |       10 |         6 |      1,400 |
|  20 | Flemish Galleon  |       180 |        30 |           400 |         80 |      75 |    80 |      200 |       40 |      500 |       30 |         2 |     34,000 |
|  21 | Venetian Galeass |       320 |        50 |           500 |         90 |      70 |    70 |      400 |       60 |      950 |       50 |         2 |     64,000 |
|  22 | La Reale         |       160 |        30 |           600 |         60 |      95 |   100 |      250 |       30 |      450 |       40 |         4 |     40,000 |
|  23 | Tekkousen        |       360 |        80 |          1000 |         90 |      80 |    85 |      300 |       45 |     1100 |      100 |         3 |    140,000 |
|  24 | Atakabune        |       160 |        30 |           400 |         60 |      95 |    95 |      200 |       20 |      500 |       40 |         3 |     14,000 |
|  25 | Kansen           |        60 |        15 |           200 |         30 |     100 |   100 |       60 |       10 |      250 |       20 |         6 |      2,000 |

## Ship descriptions

These descriptions are the game's item text associated with each ship type.

|  ID | Ship             | Description                                                                                                                        |
| --: | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Balsa            | This one was popular in Lisbon - about 100 years ago! However, it’s very easy to maneuver.                                         |
|   2 | Hansa Cog        | This classic vessel was first built about two centuries ago. Unfortunately, it doesn’t stack up to today’s ships.                  |
|   3 | Dhow             | This durable craft’s shallow hull makes it easy to maneuver, but its cargo capacity is limited.                                    |
|   4 | Buss             | It’s large and durable, but I wouldn’t use it on the open seas.                                                                    |
|   5 | Tallette         | It used to be popular in Venice, as even the smallest crew can navigate it with ease.                                              |
|   6 | Caravela Latina  | This is a well-balanced lateen ship. It’s perfect for a novice sailor.                                                             |
|   7 | Caravela Redonda | This one is easy to handle and makes for smooth sailing over the ocean.                                                            |
|   8 | Brigantine       | This may be a bit expensive, but it’s worth the cost when trading around coastal seas.                                             |
|   9 | Nao              | This is a mid-size ship with a large cargo space. It’s easy to maneuver and suitable for adventurous voyages.                      |
|  10 | Carrack          | This large trading ship is for the experienced navigator.                                                                          |
|  11 | Galleon          | This is a battleship, but it’s also useful for trading if its payload is kept low. Not for the unseasoned sailor.                  |
|  12 | Xebec            | For such a large ship, this is quite easy to maneuver. I highly recommend it.                                                      |
|  13 | Pinnace          | It’s quite durable for its size. Ye can even use it when fighting pirates if ye manuever it carefully.                             |
|  14 | Sloop            | A small, high-performance sailing ship. It has the capacity to carry guns for battles.                                             |
|  15 | Frigate          | We are proud of this great ship. It combines the storage capacity of a galleon with the mobility of a caravel. A true work of art! |
|  16 | Barge            | Only a few shipyards have the ability to build this ship. Ye’ll never regret buying it.                                            |
|  17 | Full-rigged Ship | This is the ultimate ship, but it’s only for highly skilled navigators.                                                            |
|  18 | Junk             | Well, this is the only type of ship built in China.                                                                                |
|  19 | Light Galley     | This small ship can’t withstand rough waves, so it’s pretty useless on the high seas.                                              |
|  20 | Flemish Galleon  | This ship isn’t bad. Just remember the payload is high...                                                                          |
|  21 | Venetian Galeass | No other ship can overcome this floating bastion in close combat.                                                                  |
|  22 | La Reale         | Galleys are normally battleships, but this one is fast enough to be used for trading, as well.                                     |
|  23 | Tekkousen        | This huge rowing ship is armored with steel, and has space for lots of guns.                                                       |
|  24 | Atakabune        | This ship was made for many Japanese warlords. Ye may want to own one, too.                                                        |
|  25 | Kansen           | This is only a mid-sized ship. I don’t think ye can make it home in this one.                                                      |

## Shipyards

The game groups ports into 11 shipyards. The requirement in parentheses is
the shipyard's Industry requirement for that ship.

| Shipyard | Ports                                                                                                                                                             | Available ships                                                                                                                                |
| -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
|        1 | Lisbon, Seville, Barcelona, Valencia, Palma, Ceuta                                                                                                                | Balsa (100), Light Galley (100), Caravela Latina (200), Brigantine (400), Flemish Galleon (400), Nao (500), Carrack (600), Galleon (800)       |
|        2 | London, Bristol, Dublin                                                                                                                                           | Caravela Redonda (200), Nao (500), Carrack (600), Galleon (800), Sloop (850), Frigate (1000), Barge (1000)                                     |
|        3 | Antwerp, Amsterdam, Hamburg                                                                                                                                       | Hansa Cog (100), Caravela Latina (200), Nao (500), Carrack (600), Galleon (800), Frigate (1000), Full-rigged Ship (1000)                       |
|        4 | Marseille, Bordeaux, Nantes, Copenhagen, Oslo, Stockholm, Lubeck, Danzig, Riga, Bergen                                                                            | Hansa Cog (100), Light Galley (100), Caravela Redonda (200), Flemish Galleon (400), Nao (500), Pinnace (550), La Reale (600), Galleon (800)    |
|        5 | Genoa, Pisa, Naples, Syracuse, Venice, Ragusa, Candia, Athens, Salonika                                                                                           | Light Galley (100), Tallette (200), Caravela Latina (200), Buss (700), Flemish Galleon (400), Nao (500), Venetian Galeass (500), Carrack (600) |
|        6 | Istanbul, Algiers, Tunis, Alexandria, Jaffa, Beirut, Nicosia, Tripoli, Kaffa, Azov, Trebizond, Cairo                                                              | Light Galley (100), Caravela Latina (200), Flemish Galleon (400), Nao (500), Xebec (500), Venetian Galeass (500), Carrack (600)                |
|        7 | Aden, Hormuz, Massawa, Basra, Mecca, Quatar, Shiraz, Muscat, Diu, Cochin, Ceylon, Amboa, Goa, Malacca, Ternate, Banda, Dili, Pasei, Sunda, Calicut, Bankao, Hanoi | Light Galley (100), Dhow (300), Xebec (500)                                                                                                    |
|        8 | Madeira, Santa Cruz, San Jorge, Bissau, Luanda, Argin, Bathurst, Timbuktu, Abidjan, Sofala, Malindi, Mogadishu, Mombasa, Mozambique, Quelimane                    | Light Galley (100), Caravela Redonda (200), Nao (500), Carrack (600)                                                                           |
|        9 | Zeiton, Macao, Changan                                                                                                                                            | Junk (300)                                                                                                                                     |
|       10 | Sakai, Nagasaki                                                                                                                                                   | Kansen (200), Atakabune (400), Tekkousen (1000)                                                                                                |
|       11 | Caracas, Cartegena, Havana, Margarita, Panama, Porto Velho, Santo Domingo, Veracruz, Jamaica, Guatemala, Pernambuco, Rio de Janeiro, Maracaibo, Santiago, Cayenne | Brigantine (400), Pinnace (550), Nao (500), Carrack (600), Galleon (800)                                                                       |

## Ship construction

### Hull materials

The ship table stores Beech-base durability. Building a ship applies a hull
material multiplier:

| Material | Multiplier |
| -------- | ---------: |
| Teak     |        80% |
| Cedar    |        90% |
| Beech    |       100% |
| Oak      |       110% |
| Copper   |       120% |
| Steel    |       140% |

Steel is automatically selected for a newly built Tekkousen and is unavailable
for other ship types.

### Durability calculation and cap

New-ship durability is calculated from the Beech-base durability and material
multiplier, then capped at 100:

```text
material_factor = material_index + 8
adjusted         = base_durability * material_factor / 10
durability       = min(adjusted, 100)
```

For the five normally selectable materials, indices `0..4` yield factors
`8..12`, corresponding to 80% through 120%. Steel uses factor 14 (140%).

Examples:

```text
Full-rigged Ship with Copper = min(90 * 12 / 10, 100) = 100
Tekkousen with Steel         = min(90 * 14 / 10, 100) = 100
```

## Storage layout

Ship IDs are implicit record indices. The first ship is ID `1`, and each
subsequent record increments the ID by one. For ship ID `n`, use
`n - 1` as the zero-based record index:

```text
identity_record = 0x4BBC + (n - 1) × 0x18
stats_record    = 0x4E14 + (n - 1) × 0x0C
```

Both offsets are within `raw/DATA1/DATA1.015`. There are 25 records in each
table.

### Shipyard availability

The available ship types for each shipyard are stored directly in
`raw/MAIN.EXE` at offset `0x47270`. The table has 11 records of eight bytes:

```text
shipyard_record = 0x47270 + (shipyardId - 1) × 0x08
```

Each byte is a zero-based ship ID, so the displayed ship ID is `byte + 1`.
`0xFF` marks an unused slot; it is normally used to fill the remainder of a
shorter record. The eight-byte record for shipyard 4 is full, so its final
entry is the Galleon (ship ID 11). This is present in the game file even
though some external availability lists omit it.

The shipyard ID for a regular port is stored in that port's regular metadata
record in `raw/DATA1/DATA1.015`. The metadata table begins at `0x5966`, uses a
37-byte (`0x25`) stride, and stores the zero-based ID at `+0x24`:

```text
port_metadata = 0x5966 + portId × 0x25
shipyardId    = data[port_metadata + 0x24] + 1
```

This byte is also exposed as the port's `Industry ID` by the port extractor.
For the regular ports, it selects the corresponding row in the shipyard
availability table above. Supply ports have no regular-port metadata record.

### 24-byte ship identity record

The identity records begin in `raw/DATA1/DATA1.015` at offset `0x4BBC` and
use a 24-byte (`0x18`) stride. Offsets are relative to the start of one
record:

| Offset         |     Size | Field     | Encoding                            |
| -------------- | -------: | --------- | ----------------------------------- |
| `+0x00..+0x0F` | 16 bytes | Ship name | null-terminated string              |
| `+0x13`        |   1 byte | Used guns | number of guns occupied by the ship |
| `+0x14`        |  2 bytes | Used crew | little-endian `u16`                 |

### 12-byte ship statistics record

The statistics records begin in `raw/DATA1/DATA1.015` at offset `0x4E14` and
use a 12-byte (`0x0C`) stride:

| Offset         |    Size | Field                | Encoding                                   |
| -------------- | ------: | -------------------- | ------------------------------------------ |
| `+0x00`        |  1 byte | Industry requirement | stored in tens; extractor multiplies by 10 |
| `+0x01`        |  1 byte | Durability           | raw value                                  |
| `+0x02`        |  1 byte | Tacking              | raw value                                  |
| `+0x03`        |  1 byte | Power                | raw value                                  |
| `+0x04`        |  1 byte | Maximum crew         | stored in tens; extractor multiplies by 10 |
| `+0x05`        |  1 byte | Minimum crew         | raw value                                  |
| `+0x06..+0x07` | 2 bytes | Capacity             | little-endian `u16`                        |
| `+0x08`        |  1 byte | Maximum guns         | raw value                                  |
| `+0x09`        |  1 byte | Sail type            | raw zero-based value; extractor adds 1     |
| `+0x0A..+0x0B` | 2 bytes | Base price           | stored in tens; extractor multiplies by 10 |

### Ship descriptions

Descriptions are stored as 25 consecutive null-terminated strings in
`raw/MESSAGE.DAT`, starting at offset `0x25D3`. To read description `n`, begin
at the start offset and advance past the terminating zero byte once for each
prior description; description `n` is the next byte sequence through its first
zero byte.

### Construction code evidence

The shipyard preview performs the adjusted-durability calculation at file
offsets `0x31af1..0x31b09` in `raw/MAIN.EXE`. The important instructions are:

```asm
mov  cl, byte ptr [bx + 1] ; Beech-base durability
sub  ch, ch
sub  ah, ah
add  ax, 8                 ; selected material index -> factor 8..14
imul cx                    ; base durability * material factor
mov  cx, 10
cdq
idiv cx                    ; divide by 10
mov  dx, 100
call 0x4b54                ; min(calculated durability, 100)
```

The final ship-construction path independently repeats the calculation at file
offsets `0x31c7f..0x31ca1`, then writes the capped value into both durability
bytes of the new fleet ship slot:

```asm
sub  ah, ah
add  ax, 8
mov  cx, ax
mov  al, byte ptr [si + 1] ; Beech-base durability
sub  ah, ah
imul cx
mov  cx, 10
cdq
idiv cx
mov  dx, 100
call 0x4b54                ; min(calculated durability, 100)
mov  bx, word ptr [bp - 0xc]
mov  byte ptr [bx + 3], al ; maximum durability
mov  byte ptr [bx + 2], al ; current durability
```

The fleet slot offsets agree with the `KOUKAI2.DAT` layout: slot `+0x02` is
current durability and slot `+0x03` is maximum durability. The cap is therefore
applied while previewing and constructing a ship, rather than being imposed by
the one-byte save fields themselves.
