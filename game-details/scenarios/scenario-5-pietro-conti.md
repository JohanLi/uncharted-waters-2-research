# Scenario 5: Pietro Conti

Pietro's story uses Adventure Fame, money and item checks, and randomized
destinations. The first major gate is still partly decoded; the later 10,000
and 40,000 Adventure Fame comparisons are exact.

## Story and threshold map

| Section | Gate                                           | Story                                    |
| ------: | ---------------------------------------------- | ---------------------------------------- |
|       0 | —                                              | Camillo and Duchess Franco's sponsorship |
|       1 | Candidate 1,000 Adventure Fame plus 2,000 gold | Golden Medallion and El Dorado           |
|       2 | 10,000 Adventure Fame                          | Poseidon's Staff                         |
|       3 | 40,000 Adventure Fame                          | Zipangu, Raul Franco, and El Dorado      |

## Section guide

### 0: Genoa and Lisbon

The opening routes cover Genoa, Camillo, Duchess Franco's Lisbon sponsorship,
equipment and money rewards, and Pietro's departure.

### 1: Golden Medallion

African-port and resource comparisons lead to the map offer. Harbor possession
checks later advance the section. The dialog and constants support a combined
1,000-Adventure-Fame and 2,000-gold requirement, but the relevant VM source
operands are not fully named, so this remains a **Candidate** rather than a
decoded general rule.

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

| If the story appears stuck at… | Check…                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Opening                        | Complete Genoa and Lisbon sponsor/equipment stages before departure                   |
| Golden Medallion               | Try the African Pub/Harbor sequence with at least 1,000 Adventure Fame and 2,000 gold |
| Poseidon's Staff               | Reach 10,000 only after finishing the Medallion section; follow the randomized lead   |
| Return destination differs     | This is expected: the scenario stores randomized port values                          |
| Finale                         | Reach 40,000 and follow both Japanese-port and South American stages                  |

## Highest-value validation

- Four saves testing 999/1,000 Adventure Fame independently of 1,999/2,000
  gold before the first African Pub offer.
- A mapping from each randomized destination value to its port.
- Controlled item-presence boundaries in the Harbor handoff.
