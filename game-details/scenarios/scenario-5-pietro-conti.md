# Scenario 5: Pietro Conti

Pietro's story uses Adventure Fame, money and item checks, and randomized
destinations. The Golden Medallion activation is a money, port-ID, and
inventory-space check; the later 10,000 and 40,000 Adventure Fame comparisons
are exact.

## Story and threshold map

| Section | Gate                                                               | Story                                    |
| ------: | ------------------------------------------------------------------ | ---------------------------------------- |
|       0 | —                                                                  | Camillo and Duchess Franco's sponsorship |
|       1 | 1 Gold Ingot (10,000 combined gold), port ID ≥ 42, empty item slot | Golden Medallion and El Dorado           |
|       2 | 10,000 Adventure Fame                                              | Poseidon's Staff                         |
|       3 | 40,000 Adventure Fame                                              | Zipangu, Raul Franco, and El Dorado      |

## Section guide

### 0: Genoa and Lisbon

The opening routes cover Genoa, Camillo, Duchess Franco's Lisbon sponsorship,
equipment and money rewards, and Pietro's departure.

### 1: Golden Medallion

The any-port Pub route reads the displayed Gold Ingots count and requires at
least one ingot. It separately requires a port ID of at least 42 and
scans all twenty item slots for `0xFF`, rejecting the event if the inventory is
full. Madeira is port 57 and therefore passes the port test. Adventure Fame is
not read by this route.

The seller initially asks 2,000 gold. Refusing produces a 1,000-gold
counteroffer, so 2,000 is neither an activation threshold nor necessarily the
final price. Harbor possession checks later advance the section.

At 9,999 gold the Pub behaves normally; at 10,000 it reaches message 109,
“Ye’re $n, the adventurer, right?”, and begins the Golden Medallion dialogue.

### 2: Poseidon's Staff

An exact 10,000 Adventure Fame check starts a chain with randomized Ottoman and
Middle Eastern leads. Item-possession checks stage recovery of Poseidon's
Staff and its delivery to João in Massawa.

Because destinations are selected explicitly at random, the fortune teller and
return port can differ between playthroughs. The complete value-to-port lists
are not yet mapped.

### 3: El Dorado finale

At exactly 40,000 Adventure Fame, the scenario routes through both Japanese
ports, South America, Raul Franco, and the Lisbon ending.

## Practical progression guide

| If the story appears stuck at… | Check…                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Opening                        | Complete Genoa and Lisbon sponsor/equipment stages before departure                 |
| Golden Medallion               | Carry at least 10,000 gold, leave an item slot empty, and try a Pub in port ID 42+  |
| Poseidon's Staff               | Reach 10,000 only after finishing the Medallion section; follow the randomized lead |
| Return destination differs     | This is expected: the scenario stores randomized port values                        |
| Finale                         | Reach 40,000 and follow both Japanese-port and South American stages                |

## Highest-value validation

- A mapping from each randomized destination value to its port.
- Controlled item-presence boundaries in the Harbor handoff.
