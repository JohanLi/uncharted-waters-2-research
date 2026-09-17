# Scenario 4: Ernst von Bohr

Ernst's character story uses Adventure Fame and map progress. His recurring
Paula conversations are explicitly randomized, while Mercator's separate map
completion requirement is based on the persistent chart bitmap.

## Story and threshold map

| Section | Adventure Fame gate | Story                                 |
| ------: | ------------------: | ------------------------------------- |
|       0 |                   — | Mercator's expedition                 |
|       1 |               1,000 | Paula joins                           |
|       2 |               5,000 | First randomized Paula travel dialog  |
|       3 |              20,000 | Second randomized Paula travel dialog |
|       4 |              40,000 | Zipangu, Huang He, and Paula's home   |

All four values occur as exact scenario comparisons.

## Map prerequisites

Drawing and reporting map progress requires both:

- Cartography, skill-mask bit `0x08`; and
- an active contract with a cartographer.

Ernst does not explicitly choose Contract during his opening. His first
Mercator scene grants Mercator's contract immediately. The following Amsterdam
Harbor scene advances the story so that, on returning to Mercator, the normal
cartographer menu remains open and Report is available.

Known cartographers are Mercator in Amsterdam, Gerard de Jode in Antwerp,
Diogo Ribeiro in Barcelona, Olives in Palma, and Giovanni Verrazano in Venice.

The chart has 90 × 45 usable cells. A new game begins with a 13 × 10 European
rectangle, or 130 cells, revealed. Each newly charted cell awards 5 Adventure
Fame when reported and 80 gold for all five known cartographers. Mercator's
completion check requires 3,300 total known cells: 3,170 of the 3,920 cells
initially hidden, about 80.87%.

Detailed storage and executable evidence is in the
[reverse-engineering notes](../../dialog-system/scripts/REVERSE_ENGINEERING.md#cartography-and-ernsts-map-reports).

## Section guide

### 0–1: Mercator and Paula

Amsterdam-specific opening routes establish Mercator's expedition and the
Harbor introduction. The first Mercator visit replaces the ordinary
cartographer interaction. Revisiting before the Harbor scene gives Mercator's
short departure reminder and ejects Ernst again; after the Harbor scene, a
Mercator visit can remain in the building and open the normal menu, including
Report. At exactly 1,000 Adventure Fame the next section also evaluates
map-progress state before Paula joins; Fame alone may therefore be
insufficient.

If Ernst later signs with another cartographer, visiting Mercator triggers a
four-line accusation about the other contract. The scene automatically renews
Mercator's contract and clears the other one before returning to normal
interaction.

### 2–3: travel conversations

The 5,000- and 20,000-Fame sections each use `EB 01 00 03`, selecting one of
three dialog variants. Different lines across playthroughs are expected and do
not indicate different story progress.

### 4: Far East and ending

At 40,000 Adventure Fame, routes explicitly address Changan (`0x61`), Sakai
(`0x62`), and Nagasaki (`0x63`). Flags stage the first Far East port, Japan,
the town clue, Huang He, and Paula's home/ending.

## Practical progression guide

| If the story appears stuck at… | Check…                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Map drawing                    | Active character has Cartography and a cartographer contract                         |
| Paula at 1,000                 | Report sufficient map progress as well as reaching the Fame threshold                |
| 5,000 or 20,000                | Re-enter eligible travel/building contexts; one of three variants is chosen randomly |
| 40,000                         | Follow Changan, Sakai, and Nagasaki stages in their flag-controlled order            |

## Highest-value validation

- Boundary captures for the map-progress condition preceding Paula's joining.
- Runtime mapping of each three-way travel-dialog variant.
