# Adventure Fame

Adventure Fame measures progress made by exploring the world. It is used by
João, Ernst, and Pietro's stories, although any protagonist can earn it. The
maximum is 50,000.

The repeatable sources are:

- discovering a village for the first time;
- finding the discovery associated with that village and reporting it to a
  collector;
- discovering ports and supply ports; and
- signing a contract with a cartographer, charting new parts of the world, and
  reporting the updated chart.

João and Pietro also receive a few one-time Adventure Fame awards from their
stories. Royal requests involving discoveries or treasure award a new title,
not Adventure Fame.

## Villages and discoveries

There are 98 possible villages and discoveries, but a new game randomly makes
only 50 of them available. The other 48 do not exist in that playthrough. A
different new game can select a different set, so the total Fame and gold
available from discoveries varies from game to game.

Finding one of the selected villages awards 50 Adventure Fame immediately.
Finding its discovery does not award the discovery's listed Fame immediately;
that Fame is awarded when the discovery is reported to a collector.

For ordinary discoveries, the executable calculates:

```text
Adventure Fame = difficulty × 8
Base gold reward = difficulty × 250
```

Every difficulty-100 discovery is star-ranked. The six are Dodo, Giant Ground
Sloth, Moa, Mammoth, Saber-toothed Tiger, and Moai. The executable handles
difficulty 100 as a special case: each awards 1,500 Adventure Fame and has a
base gold reward of 100,000.

### Collectors and gold percentages

Discoveries can be reported to collectors in five ports:

| Port       | Gold paid | Adventure Fame paid |
| ---------- | --------: | ------------------: |
| Bordeaux   |      100% |                100% |
| Lisbon     |      100% |                100% |
| Copenhagen |       80% |                100% |
| Alexandria |       80% |                100% |
| Pisa       |       60% |                100% |

The `Reward` column below is the base, 100% gold value paid in Bordeaux or
Lisbon. For example, a discovery with a listed reward of 10,000 pays 8,000 in
Copenhagen or Alexandria and 6,000 in Pisa. The collector's location never
changes the Adventure Fame award.

João cannot use the Lisbon collector, but can receive the full reward in
Bordeaux. A discovery reported to a collector is consumed and cannot later be
given to a ruler. Likewise, a discovery given to a ruler cannot later be sold
to a collector. Rulers use discoveries for title advancement and pay neither
gold nor Fame for them. Both paths test and set the same reported bit in the
discovery record; see
[Discoveries for the ruler](../scenarios/scenario-0-royal-missions.md#discoveries-for-the-ruler-section-10).

### Complete discovery catalog

The game contains the following 98 possibilities. Exactly 50 are selected when
a new game begins.

| Lat. | Long. | Discovery                | Diff |  Fame |  Reward | Type              |
| ---: | ----: | ------------------------ | ---: | ----: | ------: | ----------------- |
|  51N |    1W | Stonehenge               |   10 |    80 |   2,500 | Ruins             |
|  31N |   29E | Rosetta Stone            |   10 |    80 |   2,500 | Ruins             |
|  27N |   30E | Khufu Pyramid            |   30 |   240 |   7,500 | Ruins             |
|  19N |   34E | Crocodile                |   30 |   240 |   7,500 | Monster           |
|  14N |   32E | Nubia Pyramid            |   35 |   280 |   8,750 | Ruins             |
|  10N |   36E | Tessisat Falls           |   30 |   240 |   7,500 | Natural Wonder    |
|  10N |   31E | Baobab                   |   30 |   240 |   7,500 | Plant             |
|   5N |   33E | Pteranodon               |   40 |   320 |  10,000 | Monster           |
|   0N |   32E | Victoria Falls           |   20 |   160 |   5,000 | Natural Wonder    |
|   1N |    8E | Diogo's Monument         |   30 |   240 |   7,500 | Monument          |
|  12N |    2E | Ant Hill                 |   40 |   320 |  10,000 | Natural Wonder    |
|  15N |    2W | Clay Mosque              |   30 |   240 |   7,500 | Ruins             |
|   6S |   12E | Armadillo                |   25 |   200 |   6,250 | Exotic Animal     |
|   1S |   17E | Moquele Mubembe          |   70 |   560 |  17,500 | Monster           |
|   0S |   25E | Moonbow                  |   20 |   160 |   5,000 | Natural Wonder    |
|  12S |   10E | Quagga                   |   30 |   240 |   7,500 | Exotic Animal     |
|  31S |   19E | Diaz's Monument          |   40 |   320 |  10,000 | Monument          |
|  30S |   25E | Big Zimbabwe             |   40 |   320 |  10,000 | Ruins             |
|   0S |   41E | Mandrill                 |   65 |   520 |  16,250 | Exotic Animal     |
|  20S |   50E | Dodo                     |  100 | 1,500 | 100,000 | Exotic Animal     |
|  10S |   48E | Chameleon                |   10 |    80 |   2,500 | Exotic Animal     |
|  25N |   37E | Papyrus                  |   30 |   240 |   7,500 | Plant             |
|  30N |   49E | Burning Water            |   60 |   480 |  15,000 | Natural Wonder    |
|  25N |   65E | Mohenjo-Daro             |   60 |   480 |  15,000 | Ruins             |
|  18N |   73E | King Cobra               |   10 |    80 |   2,500 | Exotic Animal     |
|  14N |   93E | Inle Lake                |   35 |   280 |   8,750 | Natural Wonder    |
|  11N |   97E | Ayutthaya's Buddha       |   30 |   240 |   7,500 | Ruins             |
|   7N |   95E | Hornbill                 |   50 |   400 |  12,500 | Exotic Animal     |
|  12N |  102E | Angkor Wat               |   60 |   480 |  15,000 | Ruins             |
|  22N |  108E | Kalavinka                |   70 |   560 |  17,500 | Exotic Animal     |
|  38N |  126E | Plant Worm               |   30 |   240 |   7,500 | Plant             |
|  35N |  138E | Toro Ruins               |   40 |   320 |  10,000 | Ruins             |
|  39N |  139E | Namahage                 |   65 |   520 |  16,250 | Cultural Artifact |
|  35N |  112E | Qian Ling                |   90 |   720 |  22,500 | Ruins             |
|  41N |  110E | Great Wall               |   80 |   640 |  20,000 | Ruins             |
|  38N |  107E | Hedgehog                 |   30 |   240 |   7,500 | Exotic Animal     |
|  36N |  102E | Panda                    |   75 |   600 |  18,750 | Exotic Animal     |
|  35N |   77W | Passenger Pigeon         |   30 |   240 |   7,500 | Exotic Animal     |
|  29N |   82W | Totem Pole               |   20 |   160 |   5,000 | Monument          |
|  19N |  103W | Jade Mask                |   40 |   320 |  10,000 | Cultural Artifact |
|  12N |   90W | Guatavita Lake           |   30 |   240 |   7,500 | Natural Wonder    |
|   7N |   70W | Cactus                   |   10 |    80 |   2,500 | Plant             |
|   7N |   65W | Iguana                   |   30 |   240 |   7,500 | Exotic Animal     |
|  33N |   97W | Venus' Flytrap           |   25 |   200 |   6,250 | Plant             |
|  43N |   93W | Niagara Falls            |   80 |   640 |  20,000 | Natural Wonder    |
|   4S |   61W | Amazon Water Lily        |   30 |   240 |   7,500 | Plant             |
|   8S |   60W | Anaconda                 |   35 |   280 |   8,750 | Monster           |
|   5S |   66W | Pororoca                 |   60 |   480 |  15,000 | Natural Wonder    |
|   0N |   71W | Matamata                 |   65 |   520 |  16,250 | Exotic Animal     |
|   2S |   75W | Balsa                    |   55 |   440 |  13,750 | Cultural Artifact |
|   9S |   73W | Piranha                  |   20 |   160 |   5,000 | Monster           |
|  11S |   77W | Tarantula                |   35 |   280 |   8,750 | Exotic Animal     |
|   7S |   77W | Archaeopteryx            |   90 |   720 |  22,500 | Monster           |
|   5S |   83W | Gold Frog                |   50 |   400 |  12,500 | Exotic Animal     |
|  35S |   66W | Toucan                   |   55 |   440 |  13,750 | Exotic Animal     |
|  30S |   63W | Clay Monster             |   70 |   560 |  17,500 | Cultural Artifact |
|  25S |   60W | Giant Ground Sloth       |  100 | 1,500 | 100,000 | Monster           |
|  25S |   67W | Anteater                 |   60 |   480 |  15,000 | Exotic Animal     |
|  56S |   80W | Leon Penguin             |   25 |   200 |   6,250 | Exotic Animal     |
|  48S |   81W | Vampire Bat              |   35 |   280 |   8,750 | Exotic Animal     |
|  20S |   77W | Lake Titicaca            |   60 |   480 |  15,000 | Natural Wonder    |
|   9S |   85W | Temple of the Sun        |   70 |   560 |  17,500 | Ruins             |
|   1N |   83W | Terracotta Figure        |   35 |   280 |   8,750 | Cultural Artifact |
|   4N |   86W | Stone Ball               |   40 |   320 |  10,000 | Ruins             |
|   8N |   92W | Mural of Marnalico       |   65 |   520 |  16,250 | Cultural Artifact |
|  12N |   98W | Popol Vuh                |   70 |   560 |  17,500 | Cultural Artifact |
|  13N |  105W | Crystal Skull            |   90 |   720 |  22,500 | Cultural Artifact |
|  16N |  109W | Stone Face               |   30 |   240 |   7,500 | Ruins             |
|  20N |  111W | Monument of the Sun      |   85 |   680 |  21,250 | Monument          |
|  25N |  116W | Mexican Beaded Lizard    |   50 |   400 |  12,500 | Exotic Animal     |
|  29N |  121W | Bison                    |   30 |   240 |   7,500 | Exotic Animal     |
|  38N |  128W | Prairie Dog              |   55 |   440 |  13,750 | Exotic Animal     |
|   3S |  105E | Borobudur                |   75 |   600 |  18,750 | Ruins             |
|   5S |  111E | Python                   |   60 |   480 |  15,000 | Monster           |
|   5S |  120E | Komodo Dragon            |   85 |   680 |  21,250 | Monster           |
|  16S |  116E | Kangaroo                 |   80 |   640 |  20,000 | Exotic Animal     |
|  26S |  113E | Frilled Lizard           |   75 |   600 |  18,750 | Exotic Animal     |
|  28S |  126E | Ayers Rock               |   50 |   400 |  12,500 | Natural Wonder    |
|  37S |  144E | Tasmanian Devil          |   30 |   240 |   7,500 | Exotic Animal     |
|  30S |  148E | Koala                    |   55 |   440 |  13,750 | Exotic Animal     |
|  12S |  139E | Kiwi                     |   55 |   440 |  13,750 | Exotic Animal     |
|   3S |  137E | Greater Bird of Paradise |   80 |   640 |  20,000 | Exotic Animal     |
|   0S |  118E | Stone Buddha             |   60 |   480 |  15,000 | Ruins             |
|   3N |  108E | Pitcher Plant            |   45 |   360 |  11,250 | Plant             |
|  15N |  121E | Tree Snake               |   45 |   360 |  11,250 | Exotic Animal     |
|  13N |  126E | Durian                   |   85 |   680 |  21,250 | Plant             |
|  35S |  175E | Moa                      |  100 | 1,500 | 100,000 | Exotic Animal     |
|  66N |   28W | Great Auk                |   70 |   560 |  17,500 | Exotic Animal     |
|  89N |   87E | Aurora                   |   90 |   720 |  22,500 | Natural Wonder    |
|  76N |  178E | Stellar's Sea Cow        |   60 |   480 |  15,000 | Exotic Animal     |
|  80N |  119W | Blue Whale               |   75 |   600 |  18,750 | Exotic Animal     |
|  89N |   93W | Mammoth                  |  100 | 1,500 | 100,000 | Monster           |
|  88N |   66W | Saber-toothed Tiger      |  100 | 1,500 | 100,000 | Monster           |
|  10N |  135E | Fruit Bat                |   70 |   560 |  17,500 | Exotic Animal     |
|   6N |  151E | Indo-Pacific Cowrie      |   85 |   680 |  21,250 | Cultural Artifact |
|  12S |  177E | Nasiped                  |   10 |    80 |   2,500 | Exotic Animal     |
|   5S |   96W | Giant Tortoise           |   80 |   640 |  20,000 | Exotic Animal     |
|  34S |  127W | Moai                     |  100 | 1,500 | 100,000 | Ruins             |

Across all 98 possible discoveries, the table contains 45,000 Adventure Fame
and 1,725,000 base gold. Those totals cannot be earned in one ordinary game,
because only 50 entries are selected. The actual total for a playthrough must
be calculated from that playthrough's selected set.

## Discovering ports

The first discovery of a regular port awards Fame according to its region. The
region field is zero-based in the executable, producing these awards:

| Region                           | Fame per regular port |
| -------------------------------- | --------------------: |
| Europe                           |                     0 |
| Americas                         |                    25 |
| West Africa and Atlantic islands |                    50 |
| East Africa                      |                    75 |
| Middle East                      |                   100 |
| India                            |                   125 |
| Southeast Asia and Australia     |                   150 |
| East Asia and Japan              |                   175 |

The formula is `25 × zero-based region ID`. Discovering a supply port awards
50 Fame regardless of region. Across the game's full port table, the 100
regular ports are worth 5,050 Fame and the 30 supply ports are worth 1,500.

## Cartography

To earn Fame from charting, learn Cartography and hold an active contract with
one of these cartographers:

- Mercator in Amsterdam;
- Gerard de Jode in Antwerp;
- Diogo Ribeiro in Barcelona;
- Olives in Palma; or
- Giovanni Verrazano in Venice.

Ernst receives Mercator's contract automatically during his first Mercator
scene; he does not select the ordinary Contract command first. If he later
contracts with another cartographer, revisiting Mercator during the relevant
story section automatically switches the active contract back to Mercator.

Reporting a chart awards 5 Adventure Fame and 80 gold for each newly charted
cell. All five cartographers pay the same amount.

The persistent chart is 90 by 45 cells, for 4,050 cells in total. A new game
starts with a 13 by 10 European rectangle—130 cells—already known. That leaves
3,920 cells which can produce at most 19,600 Adventure Fame from reports. The
cartographer's map-completion message is triggered at 3,300 known cells, not at
all 4,050 cells.

## Story awards

The scenario bytecode contains the following one-time Adventure Fame awards:

| Protagonist | Story event                             | Adventure Fame |
| ----------- | --------------------------------------- | -------------: |
| João        | Prince Alberto and Duke Franco sequence |          1,000 |
| João        | Massawa and the Turkish invasion        |          5,000 |
| João        | Enrico's voyage to Zipangu              |          1,000 |
| Pietro      | Golden Medallion sequence               |          1,000 |
| Pietro      | Poseidon's Staff sequence               |          5,000 |

João's first award also adds 1,000 Piracy Fame. Each award limits the result
to the overall 50,000 Fame cap.

## Story thresholds

Adventure Fame gates these decoded protagonist events:

| Protagonist |                           Thresholds |
| ----------- | -----------------------------------: |
| João        | 2,000; 8,000; 16,000; 30,000; 40,000 |
| Ernst       |         1,000; 5,000; 20,000; 40,000 |
| Pietro      |                       10,000; 40,000 |

João's 16,000 threshold appears twice internally as part of one staged
progression. Pietro's earlier Golden Medallion activation does not check Fame;
it requires at least one Gold Ingot (10,000 combined on-hand gold), a
qualifying port, and inventory space.

## Code evidence

The main executable contains the relevant calculations at these file offsets:

- `0x3365A–0x33849`: collector turn-in, gold, and discovery Fame;
- `0x33CA0–0x33D58`: cartographer gold and Fame;
- `0x3663A–0x36707`: first-time port and village Fame; and
- `0x4380C`: the static table of 100 seven-byte village records, also present
  in `DATA1/DATA1.015` at `0x6E74–0x7130`. Records 98 and 99 are placeholders
  whose flag byte `+0x06` keeps `0x80`, the bit that marks a record as not
  selected for the current game.
