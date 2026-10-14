# Ports

The game has 130 port records: 100 regular ports assigned to one of eight
regions, followed by 30 supply ports. Port IDs are zero-based and match the
order in the extracted port table. Region, Market, and Industry IDs are
zero-based as well.

For regular ports, the tables include the displayed location, economy,
industry, support by nation, shop items, Market ID, and Industry ID. Regular
and secret shop columns contain item names decoded from the game's item table.

## Europe

| #ID |  Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items                    | Secret Shop Item | Market ID | Industry ID |
| --: | ---------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------------------------- | ---------------- | --------: | ----------: |
|   0 |     Lisbon |   39N 9W |     780 |      770 |      100 |     0 |      0 |       0 |     0 |       0 | Quadrant, Telescope, Rapier           | —                |         0 |           0 |
|   1 |    Seville |   37N 6W |     770 |      810 |        0 |   100 |      0 |       0 |     0 |       0 | Telescope, Short Saber, Rapier        | Basterd Sword    |         0 |           0 |
|   2 |   Istanbul |  41N 28E |     810 |      720 |        0 |     0 |    100 |       0 |     0 |       0 | Telescope, Leather Armor, Quadrant    | Scimitar         |         4 |           5 |
|   3 |  Barcelona |   41N 2E |     590 |      540 |        0 |   100 |      0 |       0 |     0 |       0 | Dagger, Leather Armor, Balm           | —                |         0 |           0 |
|   4 |    Algiers |   37N 3E |     160 |      180 |        0 |     0 |     20 |       0 |     0 |       0 | Cutlass, Lime Juice                   | —                |         3 |           5 |
|   5 |      Tunis |  37N 10E |     130 |      160 |        0 |     0 |     15 |       0 |     0 |       0 | —                                     | —                |         3 |           5 |
|   6 |   Valencia |   39N 0W |     320 |      300 |        0 |   100 |      0 |       0 |     0 |       0 | Lime Juice, Short Sword               | —                |         0 |           0 |
|   7 |  Marseille |   44N 5E |     350 |      290 |        0 |     0 |      0 |       0 |     0 |       0 | Epee, Candleholder                    | Estock           |         2 |           3 |
|   8 |      Genoa |   44N 8E |     750 |      760 |        0 |     0 |      0 |       0 |   100 |       0 | Cutlass, Quadrant, Velvet Coat        | —                |         2 |           4 |
|   9 |       Pisa |  43N 10E |     620 |      540 |        0 |     0 |      0 |       0 |   100 |       0 | Rapier, Candleholder, Broad Sword     | —                |         2 |           4 |
|  10 |     Naples |  40N 13E |     630 |      640 |        0 |     0 |      0 |       0 |   100 |       0 | Epee, Leather Armor, Rat Poison       | Crusader Armor   |         2 |           4 |
|  11 |   Syracuse |  37N 15E |     240 |      220 |        0 |     0 |      0 |       0 |   100 |       0 | Short Sword, Lime Juice               | Tax Permit (I)   |         2 |           4 |
|  12 |      Palma |   39N 2E |     290 |      285 |        0 |    98 |      0 |       0 |     0 |       0 | —                                     | —                |         2 |           0 |
|  13 |     Venice |  45N 13E |     740 |      730 |        0 |     0 |      0 |       0 |   100 |       0 | Chain Mail, Sextant, Epee             | Garnet Brooch    |         2 |           4 |
|  14 |     Ragusa |  42N 18E |     150 |      140 |        0 |     0 |      0 |       0 |   100 |       0 | Quadrant, Dagger                      | —                |         2 |           4 |
|  15 |     Candia |  35N 25E |     180 |      160 |        0 |     0 |      0 |       0 |     0 |       0 | —                                     | —                |         2 |           4 |
|  16 |     Athens |  38N 24E |     640 |      540 |        0 |     0 |      0 |       0 |     0 |       0 | Saber, Lime Juice, Circlet            | Theodolite       |         2 |           4 |
|  17 |   Salonika |  41N 22E |     110 |      120 |        0 |     0 |      0 |       0 |     0 |       0 | Cutlass                               | Tax Permit (P)   |         4 |           4 |
|  18 | Alexandria |  31N 29E |     720 |      700 |        0 |     0 |    100 |       0 |     0 |       0 | Half Plate, Sextant, Rat Poison       | Scimitar         |         4 |           5 |
|  19 |      Jaffa |  32N 35E |     140 |      150 |        0 |     0 |     95 |       0 |     0 |       0 | —                                     | —                |         4 |           5 |
|  20 |     Beirut |  33N 35E |     270 |      250 |        0 |     0 |    100 |       0 |     0 |       0 | Short Saber, Balm                     | —                |         4 |           5 |
|  21 |    Nicosia |  35N 33E |     150 |      160 |        0 |     0 |     98 |       0 |     0 |       0 | —                                     | —                |         2 |           5 |
|  22 |    Tripoli |  32N 13E |     420 |      400 |        0 |     0 |     90 |       0 |     0 |       0 | Short Saber, Leather Armor, Telescope | Tax Permit (O)   |         3 |           5 |
|  23 |      Kaffa |  45N 34E |     340 |      350 |        0 |     0 |     35 |       0 |     0 |       0 | —                                     | —                |         4 |           5 |
|  24 |       Azov |  47N 38E |     110 |      115 |        0 |     0 |     20 |       0 |     0 |       0 | Dagger                                | Tax Permit (S)   |         4 |           5 |
|  25 |  Trebizond |  41N 39E |     360 |      370 |        0 |     0 |    100 |       0 |     0 |       0 | Saber, Velvet Coat                    | —                |         4 |           5 |
|  26 |      Ceuta |   35N 5W |      85 |       90 |      100 |     0 |      0 |       0 |     0 |       0 | —                                     | —                |         3 |           0 |
|  27 |   Bordeaux |   45N 1W |     600 |      580 |        0 |     0 |      0 |      80 |     0 |       0 | Short Sword, Balm, Rapier             | —                |         1 |           3 |
|  28 |     Nantes |   48N 2W |     560 |      570 |        0 |     0 |      0 |      80 |     0 |       0 | Epee, Chain Mail, Candleholder        | —                |         1 |           3 |
|  29 |     London |   53N 0E |     720 |      740 |        0 |     0 |      0 |     100 |     0 |       0 | Cutlass, Telescope, Velvet Coat       | Sextant          |         1 |           1 |
|  30 |    Bristol |   52N 3W |     320 |      380 |        0 |     0 |      0 |     100 |     0 |       0 | Broad Sword, Leather Armor            | Claymore         |         1 |           1 |
|  31 |     Dublin |   54N 7W |     370 |      350 |        0 |     0 |      0 |      93 |     0 |       0 | Dagger, Broad Sword                   | Claymore         |         1 |           1 |
|  32 |    Antwerp |   53N 5E |     660 |      670 |        0 |     0 |      0 |       0 |     0 |     100 | Long Sword, Rat Poison, Aqua Tiara    | Tax Permit (H)   |         1 |           2 |
|  33 |  Amsterdam |   55N 6E |     700 |      730 |        0 |     0 |      0 |       0 |     0 |     100 | Telescope, Sextant, Theodolite        | Pocket Watch     |         1 |           2 |
|  34 | Copenhagen |  57N 12E |     530 |      510 |        0 |     0 |      0 |       0 |     0 |      98 | Chain Mail, Half Plate, Plate Mail    | Errol’s Plate    |         1 |           3 |
|  35 |    Hamburg |  55N 10E |     600 |      620 |        0 |     0 |      0 |       0 |     0 |      95 | Quadrant, Leather Armor, Circlet      | —                |         1 |           2 |
|  36 |       Oslo |  63N 10E |     190 |      185 |        0 |     0 |      0 |      80 |     0 |       0 | —                                     | —                |         1 |           3 |
|  37 |  Stockholm |  62N 19E |     480 |      470 |        0 |     0 |      0 |      85 |     0 |       0 | Dagger, Short Sword                   | Basterd Sword    |         1 |           3 |
|  38 |     Lubeck |  55N 10E |     320 |      300 |        0 |     0 |      0 |       0 |     0 |      85 | Saber, Long Sword, Estock             | Flamberge        |         1 |           3 |
|  39 |     Danzig |  56N 18E |     370 |      280 |        0 |     0 |      0 |       0 |     0 |      90 | Leather Armor, Platinum Comb          | Tax Permit (E)   |         1 |           3 |
|  40 |       Riga |  59N 23E |     150 |      160 |        0 |     0 |      0 |       0 |     0 |      85 | —                                     | —                |         1 |           3 |
|  41 |     Bergen |   62N 5E |     145 |      150 |        0 |     0 |      0 |       0 |     0 |      80 | —                                     | —                |         1 |           3 |

## New World

| #ID |      Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items        | Secret Shop Item | Market ID | Industry ID |
| --: | -------------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------------- | ---------------- | --------: | ----------: |
|  42 |        Caracas |   7N 72W |     220 |      210 |        0 |    95 |      0 |       0 |     0 |       0 | Lime Juice, Chain Mail    | —                |         7 |          10 |
|  43 |      Cartegena |   6N 81W |     190 |      130 |        0 |     0 |      0 |       0 |     0 |       0 | Lime Juice, Long Sword    | —                |         7 |          10 |
|  44 |         Havana |  19N 87W |     210 |      220 |        0 |    93 |      0 |       0 |     0 |       0 | —                         | —                |         6 |          10 |
|  45 |      Margarita |   7N 69W |      40 |       45 |        0 |     0 |      0 |       0 |     0 |       0 | Dagger                    | Sapphire Ring    |         7 |          10 |
|  46 |         Panama |   5N 85W |     160 |      190 |        0 |     0 |      0 |       0 |     0 |       0 | Lime Juice, Garnet Brooch | —                |         6 |          10 |
|  47 |    Porto Velho |   6N 85W |      60 |       75 |        0 |    95 |      0 |       0 |     0 |       0 | —                         | —                |         6 |          10 |
|  48 |  Santo Domingo |  14N 74W |     150 |      160 |        0 |    98 |      0 |       0 |     0 |       0 | Balm, Rat Poison          | —                |         6 |          10 |
|  49 |       Veracruz | 15N 100W |      80 |       75 |        0 |     0 |      0 |       0 |     0 |       0 | —                         | —                |         6 |          10 |
|  50 |        Jamaica |  13N 81W |      60 |       80 |        0 |    90 |      0 |       0 |     0 |       0 | Mermaid Bangle            | —                |         6 |          10 |
|  51 |      Guatemala |  10N 95W |      70 |       65 |        0 |    97 |      0 |       0 |     0 |       0 | —                         | —                |         6 |          10 |
|  52 |     Pernambuco |  11S 45W |     215 |      240 |      100 |     0 |      0 |       0 |     0 |       0 | Dagger, Plate Mail        | Rune Blade       |         7 |          10 |
|  53 | Rio de Janeiro |  25S 50W |      45 |       50 |       90 |     0 |      0 |       0 |     0 |       0 | Circlet                   | Gold Bracelet    |         7 |          10 |
|  54 |      Maracaibo |   7N 77W |     120 |      105 |        0 |    95 |      0 |       0 |     0 |       0 | —                         | —                |         7 |          10 |
|  55 |       Santiago |  16N 81W |      80 |      105 |        0 |     0 |      0 |       0 |     0 |       0 | Lime Juice                | —                |         6 |          10 |
|  56 |        Cayenne |   0S 57W |      70 |       65 |        0 |     0 |      0 |       0 |     0 |       0 | —                         | —                |         7 |          10 |

## West Africa

| #ID |  Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items                          | Secret Shop Item | Market ID | Industry ID |
| --: | ---------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------------------------------- | ---------------- | --------: | ----------: |
|  57 |    Madeira |  33N 17W |     240 |      230 |      100 |     0 |      0 |       0 |     0 |       0 | —                                           | —                |         5 |           7 |
|  58 | Santa Cruz |  28N 17W |      90 |       80 |        0 |     0 |      0 |       0 |     0 |       0 | —                                           | —                |         5 |           7 |
|  59 |  San Jorge |    6N 2W |     210 |      190 |      100 |     0 |      0 |       0 |     0 |       0 | Dagger, Telescope                           | Ruby Ring        |         5 |           7 |
|  60 |     Bissau |  13N 17W |      85 |      100 |        0 |     0 |      0 |       0 |     0 |       0 | —                                           | —                |         5 |           7 |
|  61 |     Luanda |   8S 12E |      90 |       75 |       96 |     0 |      0 |       0 |     0 |       0 | —                                           | —                |         5 |           7 |
|  62 |      Argin |  20N 18W |     200 |      185 |      100 |     0 |      0 |       0 |     0 |       0 | Rat Poison, Platinum Comb                   | —                |         5 |           7 |
|  63 |   Bathurst |  14N 17W |      75 |       60 |        0 |     0 |      0 |       0 |     0 |       0 | —                                           | —                |         5 |           7 |
|  64 |   Timbuktu |   15N 4W |     430 |       35 |        0 |     0 |      0 |       0 |     0 |       0 | Crown of Glory, Gold Bracelet, Ruby Scepter | Crusader Sword   |         5 |           7 |
|  65 |    Abidjan |    6N 5W |      90 |       75 |        0 |     0 |      0 |       0 |     0 |       0 | —                                           | —                |         5 |           7 |

## East Africa

| #ID |  Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items                    | Secret Shop Item | Market ID | Industry ID |
| --: | ---------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------------------------- | ---------------- | --------: | ----------: |
|  66 |     Sofala |  17S 34E |     390 |      400 |       85 |     0 |      0 |       0 |     0 |       0 | —                                     | —                |         8 |           7 |
|  67 |    Malindi |   3S 39E |     370 |      360 |       95 |     0 |      0 |       0 |     0 |       0 | —                                     | —                |         8 |           7 |
|  68 |  Mogadishu |   3N 45E |      90 |       70 |        0 |     0 |      0 |       0 |     0 |       0 | —                                     | —                |         8 |           7 |
|  69 |    Mombasa |   4S 39E |     380 |      390 |       90 |     0 |      0 |       0 |     0 |       0 | Malachite Box, Silk Shawl, Aqua Tiara | Ermine Coat      |         8 |           7 |
|  70 | Mozambique |  13S 40E |     180 |      160 |        0 |     0 |      0 |       0 |     0 |       0 | Rat Poison, Gold Bracelet             | Jade Jewelbox    |         8 |           7 |
|  71 |  Quelimane |  15S 36E |      60 |       60 |        0 |     0 |      0 |       0 |     0 |       0 | —                                     | —                |         8 |           7 |

## Middle East

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items               | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | -------------------------------- | ---------------- | --------: | ----------: |
|  72 |      Aden |  14N 46E |     210 |      260 |       90 |     0 |      0 |       0 |     0 |       0 | —                                | —                |         9 |           6 |
|  73 |    Hormuz |  26N 56E |     100 |       90 |       95 |     0 |      0 |       0 |     0 |       0 | —                                | —                |         9 |           6 |
|  74 |   Massawa |  15N 41E |      90 |       85 |        0 |     0 |      0 |       0 |     0 |       0 | Malachite Box                    | —                |         9 |           6 |
|  75 |     Cairo |  29N 32E |     510 |      480 |        0 |     0 |    100 |       0 |     0 |       0 | Scimitar, Silk Scarf, Chain Mail | —                |         9 |           5 |
|  76 |     Basra |  30N 48E |     480 |      500 |        0 |     0 |    100 |       0 |     0 |       0 | —                                | —                |         9 |           6 |
|  77 |     Mecca |  21N 39E |     500 |       80 |        0 |     0 |    100 |       0 |     0 |       0 | Cat, Silk Scarf, Theodolite      | —                |         9 |           6 |
|  78 |    Quatar |  25N 52E |     130 |      160 |        0 |     0 |    100 |       0 |     0 |       0 | —                                | —                |         9 |           6 |
|  79 |    Shiraz |  26N 53E |      70 |       80 |        0 |     0 |    100 |       0 |     0 |       0 | —                                | —                |         9 |           6 |
|  80 |    Muscat |  24N 58E |     180 |      230 |        0 |     0 |     95 |       0 |     0 |       0 | —                                | —                |         9 |           6 |

## India

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items                   | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------------------------ | ---------------- | --------: | ----------: |
|  81 |       Diu |  25N 66E |      75 |       80 |       87 |     0 |      0 |       0 |     0 |       0 | —                                    | —                |        10 |           6 |
|  82 |    Cochin |  10N 75E |     130 |      120 |       90 |     0 |      0 |       0 |     0 |       0 | —                                    | —                |        10 |           6 |
|  83 |    Ceylon |   8N 80E |     180 |      210 |        0 |     0 |      0 |       0 |     0 |       0 | Peacock Fan, Saber                   | —                |        10 |           6 |
|  85 |       Goa |  14N 73E |     540 |      560 |       85 |     0 |      0 |       0 |     0 |       0 | Balm, Short Sword, Ermine Coat       | —                |        10 |           6 |
|  92 |   Calicut |  12N 74E |     530 |      560 |        0 |     0 |      0 |       0 |     0 |       0 | Peacock Fan, Rat Poison, Short Saber | Siva’s Sword     |        10 |           6 |

## Southeast Asia

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------ | ---------------- | --------: | ----------: |
|  84 |     Amboa |  1S 125E |      50 |       50 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  86 |   Malacca |  4N 101E |      90 |       95 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  87 |   Ternate |  2N 125E |      80 |       85 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  88 |     Banda |  2S 128E |      45 |       40 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  89 |      Dili |  6S 125E |      40 |       45 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  90 |     Pasei |   5N 96E |      35 |       40 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  91 |     Sunda |  3S 106E |      40 |       55 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |
|  93 |    Bankao |  1N 105E |      50 |       45 |        0 |     0 |      0 |       0 |     0 |       0 | —                  | —                |        11 |           6 |

## Far East

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | England | Italy | Holland | Regular Shop Items                   | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ------: | ----: | ------: | ------------------------------------ | ---------------- | --------: | ----------: |
|  94 |    Zeiton | 26N 119E |     520 |      570 |        0 |     0 |      0 |       0 |     0 |       0 | Cat, Lime Juice, Balm                | Blue Crescent    |        12 |           8 |
|  95 |     Macao | 23N 113E |     480 |      490 |        0 |     0 |      0 |       0 |     0 |       0 | Silk Scarf, Peacock Fan, China Dress | Mermaid Bangle   |        12 |           8 |
|  96 |     Hanoi | 22N 105E |     300 |      340 |        0 |     0 |      0 |       0 |     0 |       0 | Silk Shawl, Golden Dragon            | —                |        12 |           6 |
|  97 |   Changan | 35N 110E |     580 |      280 |        0 |     0 |      0 |       0 |     0 |       0 | Silk Scarf, Silk Shawl, China Dress  | Blue Crescent    |        12 |           8 |
|  98 |     Sakai | 35N 136E |     420 |      410 |        0 |     0 |      0 |       0 |     0 |       0 | Mermaid Bangle, Cat, Japanese Sword  | Magic Muramasa   |        12 |           9 |
|  99 |  Nagasaki | 33N 129E |     210 |      220 |        0 |     0 |      0 |       0 |     0 |       0 | Cat, Japanese Sword, Aqua Tiara      | —                |        12 |           9 |

## Supply ports

Supply ports are not assigned a regular region ID in the port metadata and do
not have the regular-port economy, industry, or nation-support metadata.

| Port ID | Port          |
| ------: | ------------- |
|     100 | Hekla         |
|     101 | Narvik        |
|     102 | Cape Town     |
|     103 | Belgrade      |
|     104 | Tamatave      |
|     105 | Dikson        |
|     106 | Lushun        |
|     107 | Leveque       |
|     108 | Mindanao      |
|     109 | Tiksi         |
|     110 | Ezo           |
|     111 | Geelong       |
|     112 | Guam          |
|     113 | Moresby       |
|     114 | Korf          |
|     115 | Wanganui      |
|     116 | Suva          |
|     117 | Nome          |
|     118 | Naalehu       |
|     119 | Tahiti        |
|     120 | Juneau        |
|     121 | Coppermine    |
|     122 | Santa Barbara |
|     123 | Churchill     |
|     124 | Callao        |
|     125 | Valparaiso    |
|     126 | Mollendo      |
|     127 | Cape Cod      |
|     128 | Montevideo    |
|     129 | Forel         |

### Supply-port town

All 30 supply ports load the same town. Every input to the town's setup is
either fixed or clamped to 100, so the towns differ only in the port name.

- **Map: `PORTMAP` entry 100.** The town loader at `MAIN.EXE 0xDD96` checks
  the current port ID (`DS:0x0E32`) at `0xDD9F`. A regular port loads the
  `PORTMAP` entry with its own ID at `0xDEB3–0xDED0`. A port ID of 100 or more
  jumps to `0xDED3`, and that path loads entry 100 at `0xDFA7–0xDFC2`.
- **Tileset: `PORTCHIP` entries 6 and 7 (tileset 3).** A regular port reads
  `CHIP_NO.DAT` (100 bytes, one per regular port) at `0xDDA9–0xDDCB`. It then
  loads `PORTCHIP` entries `2 × byte` (the 0x7800-byte tile graphics) and
  `2 × byte + 1` (`0xDDE0–0xDE32`). The supply-port path never opens
  `CHIP_NO.DAT`. It loads the fixed entries 6 and 7 (`0xDEE7–0xDF26`), which
  make up tileset 3. Tileset 3 is also the one that `CHIP_NO.DAT` gives to the New World, the
  African ports and Southeast Asia.
- **Walkable tiles.** On both paths, the 4-byte second entry is copied to
  `DS:0xC1BC` (`0xDE40–0xDE59` and `0xDF34–0xDF4D`). For supply ports it is
  `PORTCHIP.007` = `00 16 1A 1F`. The player's test at `0xB3C9` (see [Walking in port](port-walking.md)) and the
  walkers' test at `0xB453` read the two tiles in the row below a position,
  at x and x + 1. A step is allowed when the left tile is below `0x1A` and the
  right tile is below `0x16` or from `0x1A` to `0x1E`. Under this rule the
  highest row that can be stood on in map 100 is y = 14. All 4,242 such
  positions form one area that includes the Harbor arrival tile (62, 55).
- **Building entrances: `ZA_DAT.DAT` record 100.** `0xDD54` clamps the port
  ID to 100 at `0xDD66` and copies that 24-byte record to `DS:0x0A60`. The
  record holds only the Harbor (building 3) at tile (62, 54).
- **Townspeople: spawned, but never seen or met.** Arriving from sea
  (`DS:0x0E33` = `0xFF`, set at `0x2D7E6`) runs the spawn routine at
  `0xDFE2` (called at `0xE18F`). Night frames run it too (`0xB5B8`). The
  routine has no port-ID test and places actors relative to the Market, Pub,
  Shipyard and Lodge entrances. In record 100 all four entrances are (0, 0):
  - The waving man, the dog and the old man (fixed slots 4, 5 and 7) are all
    on tile (2, 1).
  - The Shipyard walker (slot 2) starts on (0, 0).
  - The other three walkers start at x = 254 (0 − 2 as a byte), y = 1.

  All of these tiles are forest (`0xE4`), and none of them can be met:
  - **Bumping:** the townsperson check at `0xB4AF` needs the player's
    attempted position to be within one tile of the actor. The player can
    never stand above row 14, so the closest attempted position is row 13.
  - **Walkers stay put:** the three walkers at x = 254 fail the x < `0x5E`
    bound at `0xB6FA` in every direction. The walker at (0, 0) has no
    walkable neighbour. No walker ever moves.
  - **Nothing is drawn:** `0xB57E` draws an actor only inside the 23 × 23
    view at (`DS:0x0E38`, `DS:0x0E3A`). The view starts at y = 54 − 13 = 41
    (`0xE12C`). It scrolls up only while the player is fewer than 4 rows from
    its top (`0xBCC1–0xBCFC`), so with the player at row 14 or lower the view
    never starts above row 10. Its x start is at most `0x48` (`0xBCB8`), far
    short of x = 254.

  So the player never sees or talks to a townsperson at a supply port. The
  waving man's supply-port line, message 578 (`0xB8F7–0xB906`), is
  therefore never shown.

- **No hostile-port guards.** The guards are added at `0xE070–0xE0FC` only
  when the port's nation, the low 3 bits of display-record byte `+0x13`
  (`0xAFEE`), is below 6. `DATA1.015` gives all 30 supply ports the value
  `0x06`. The executable rewrites these bits in three places, and none of
  them reaches a supply port:
  - The midnight refresh at `0x1E88F` loops over ports 0–99 only
    (`0x1E927`).
  - The routine at `0x1D246` scans ports 99 down to 0.
  - The controller refresh at `0x327C3` is called only from Market Invest
    (`0x2ACBA`) and Shipyard Invest (`0x32989`), and supply ports have
    neither building.

  The documented scenario-script writes touch ports 97–99, or loop over
  ports 0–99.

- **Character graphics.** The `CHAR` entries loaded at `0xDE62–0xDEAC` and
  `0xDF56–0xDFA0` (`DS:0x1439`, then entry 6) are the same on both paths.
  Supply ports have no graphics of their own beyond the map and tileset above.

The Mosque test at `0x32BFA` indexes a 100-byte stack copy of `CHIP_NO.DAT` by
port ID without a range check. It is reached only through a building with ID
10, and the supply-port town has no such building.

A routine at `0xB1FD` loads the `PORTMAP` entry for `DS:0x0E32` without the
clamp to 100. Nothing calls it: there are no near or far calls to it, and its
address appears in no pointer table.

## Port screen side panel

The side panels are drawn by `MAIN.EXE 0xD9DC` in the game's font (below).
Text positions are in 8-pixel columns and pixel rows, set through `0x9ACE`;
text is drawn in colour 0 on an opaque background of colour 7
(`ESC C0 ESC B7`, `DS:0x8FA7`).

| Column, y                | Format (`DS:`)             | Value                                                                                                                       |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1, 16                    | `%s.%2d` (`0x8FB4`)        | Month abbreviation (table at `DS:0x8EA0`) and day + 1                                                                       |
| 1, 32                    | `15%2d` (`0x8FAE`)         | Year byte `DS:0x0734` + 1                                                                                                   |
| 1, 144                   | `%2d:%02d %c.M` (`0x8FBB`) | Hour `(t / 3 + 11) mod 12 + 1`, minutes `(t mod 3) × 20`, `A` below tick 36, else `P`                                       |
| 1, 256                   | `%s`                       | Fame label: Adventure for protagonists 0, 3 and 4, Piracy for 1 and 2, Trade for 5 (`0xDAA9–0xDAF2`, labels at `DS:0x8F90`) |
| 5, 272                   | `%5u`                      | That Fame                                                                                                                   |
| 5, 320                   | `%5d`                      | Gold mod 10,000                                                                                                             |
| 5, 360                   | `%5u`                      | Gold ÷ 10,000                                                                                                               |
| 70 − ⌊len / 2⌋, 8        | `%s`                       | Port name, centred (`0xDBB0–0xDBE9`)                                                                                        |
| 70 − ⌊L / 2⌋, 24         | message 385 + Market ID    | Area name; `L` is a fixed length per Market ID: 7, 15, 17, 11, 13, 11, 15, 13, 11, 11, 5, 13, 7 (`0xDC0C–0xDC49`)           |
| 65, 24                   | `Supply port` (`0x8FED`)   | Ports 100 and up                                                                                                            |
| 70, 96 / 128 / 184 / 216 | `%5d`, `%5u`, `%5d`, `%5u` | Economy, Market investment, Industry, Shipyard investment                                                                   |
| 70, 272                  | `%4d`                      | Price index (50 + the average of the ten rates, `0x206C0`)                                                                  |

“Fame in”, “Gold Coins”, “A.D.”, the “%” after the price index and the other
Gothic captions are part of the frame picture. The opaque text background
covers a stray dot in the frame picture after the month.

### Text and font

`MAIN.EXE`'s text routine (`0x97C7` → `0x9D90` → `0x9B7E`) draws every
window and panel: dialogue, menus, lists, and the side panels. It takes the
glyph for codes 0x20–0x7F from its own table, `DS:0x865A + 16 × code`
(`0x9AFB`): 96 glyphs of 8 × 16 pixels at `DS:0x885A–0x8E59` (file offset
`0x443CA`), most significant bit leftmost. Its capitals are 13 rows tall,
taller than those of the VGA font. The font draws `|` as a curled mark, which
is how the `|Name|` speaker labels of the messages appear, and `` ` `` as a
down arrow.

The style byte `DS:0x8801` is set to 1, bold, at start-up (`0x1C632`, in the
initialisation at `0x1C616`), so all text is bold: style 1 ORs each glyph row
with itself shifted one pixel left (`0x9B22`, `shl`), before the glyph is
drawn (`0x9BB0`). Only `ESC F n` changes the style (`0x9F65`). No string in
`MAIN.EXE` contains it; the message files use `ESC F4` (shadow) around a few
labels and switch back with `ESC F1`, such as `ESC C6 ESC F4 Navigation:%3d
ESC C0 ESC F1` in `MESSAGE2.DAT`. A speaker label is part of the message
text, so it wraps with the line like any other word.

A scenario message is printed with paging on (`2DFF:0x7920`): `DS:0x880E`
is set, and the text's top and bottom (`DS:0x880A`, `0x880C`) come from the
speaking window's record at `DS:0xBC18 + 24n` (+0x12 and +0x12 + +0x16). The
vendor window and both portrait panels have text 112 pixels tall. At each
line break (`0x9C4D`), when the next line would end past the bottom
(cursor y + 18 + 16 > bottom, `0x9C63–0x9C71`), the cursor moves down a line
and the message wait runs (`0x9C7A`). The text area is then cleared to
colour 7, from the left margin to two columns past the right one (`0x5F06`),
and the cursor returns to the top (`0x9CA5`). A page therefore holds six
lines, and the caret of a page break sits on the line below the sixth,
since the cursor is at the start of a line. Paging is turned off again after
the message (`0x37944`).

Words wrap against the right margin `DS:0x87FA`, which is inclusive: before
each character the text routine measures the next word (`0x9D11`) and breaks
the line when the cursor plus its length passes the margin (`0x97E8–0x97F7`),
so a line holds `right − left + 1` characters. The vendor's window
(`0:0x8D95`, `0xE39F–0xE3CF`: a frame at column 30, y 8, 30 columns by 128)
sets margins 32 and 56, 25 characters; the crew's portrait panels at `0xD0CD`
set column + 11 to column + 36, 26 characters.

#### Scenario windows

A scenario's windows are records at `DS:0xBC18 + 24n`: the frame's column,
y, width in columns and height, then the portrait's place, then the text's
column (+0x10), y (+0x12), width (+0x14) and height (+0x16). Record 0 is the
vendor's window (column 30, y 8, 30 × 128, text at column 32, y 16), record 1
the upper panel (column 13, y 16, 39 columns × 144, text at column 24, y 32),
record 2 the lower (column 20, y 176, text at column 31, y 192) and record 3
the event-art frame (column 13, y 16, 26 columns × 160). Setting a record's
margins (`2DFF:0x4178`) puts the left at +0x10 and the right at +0x10 + +0x14
− 2, so the text runs 32–56, 24–48 and 31–55: 25 characters, with the caret's
column at 44, 36 and 43. Position 0 is record 0 in every context, at sea and
in battle as well as in a building.

`C0 n` (file `0x38CBC` → `2DFF:0x4204`, `0x377F4`) first clears the current
window's text area (`0x3775B`) unless the current record is the event frame
(`0xBC60`). A position already on the open-window stack (`DS:0xBC7C`, two
entries, counted by `DS:0xBC7B`) just becomes current with its margins set
and its text cleared (`0x37778`). Otherwise, while fewer than two are open,
it is pushed and opened (`0x377A1`): positions other than 0 save the
background (`0:0x4E98`), the frame is drawn in style 0 without clearing the
screen (`0:0x707B`), and the margins are set unless it is position 3. The
event frame therefore covers the vendor's picture, while the rest of an open
vendor window, x 312–480, stays in view beside it; `CB` draws the picture in
it (`0x3799A` → `0:0x58B7`).

`C7` only waits (file `0x38CE4`, `FC4:0x4638`), so a line stays up until the
next `C0` or a closing. `C3` (file `0x38CCC` → `0x37850`) takes the top entry
off the stack: positions 1–3 restore the background (`0:0x7690`), position 0
only has its text cleared. `C4` (file `0x38CD3` → `0x378AD`) does the same
for every entry, as does the interpreter's exit (`0x38FA1`); the vendor's
window therefore stays up with its text cleared. `C9` (file `0x38D00` →
`2DFF:0x4361`, `0x37951`) opens the ordinary menu (`FC4:0x41F1`) at column
60, y 80, not cancellable, with the previous line still shown.

A message that waits for a key (`FC4:0x4638`) shows a caret: the 16 × 16
stencil at `DATA1.014` offset `0x20B0`, a hollow downward triangle, drawn in
colour 2 (red, blit mode `0x402`, `0x198D6`). Its left edge is at the text
window's centre column, `left + (right − left) / 2` from `DS:0x87F8` and
`0x87FA`, and it sits on the cursor's line when the cursor is at the start of
a line, otherwise 24 pixels lower (`0x1987E–0x198B4`; at most column 78 and
y 384). Messages do not end with a line break, so the caret normally appears
24 pixels below the top of the last line, 6 more than the 18-pixel line
spacing. It blinks until a key or click: drawn, then the saved background
restored, each for `0:0x5841(4)` (`0x198F9–0x1992E`). That routine waits
`0xADFD(6 × n)`, the timer wait that also ends on Enter, Esc, `0` or a
click, so each phase lasts 24 timer units, about 0.4 seconds.

A yes/no question (`FC4:0x4529`, `0x19769`) shows `GRAPH.DAT` record 0, the
YES and NO buttons, with hit boxes at x + 16 to x + 64 (YES) and x + 80 to
x + 128 (NO), y + 22 to y + 42 (`0x18F10–0x18F37`). While the mouse pointer is
still where start-up parked it, at (639, 399) (`0x1C61F`), the buttons go under
the question's text: x = `(left + right − 10) × 4` from the text window's
margin columns and y the cursor's line, 24 pixels lower when the cursor is not
at a line start (`0x197A1–0x197D4`). Otherwise they go at the pointer less
(40, 32), each part taken off only when the pointer is past it (x above 40,
y above 32; `0x197D9–0x197E9`). Either way x is at most 496, y at most 344,
and x is drawn on a column (`0x18F5A`).

Every picker, the ordinary menus (`0x194DE`), the popup, YES/NO, and the
grid picker `FC4:0x43B1` (`0x19631`), runs the shared picker `0x1939A`, whose
input wait `0x1921F` moves the cursor with the pointer only after a left press
and while the button stays down (`0x18698` returning `0x0D`, then `0x18800`
until `0:0x4E52` reports the release); the pointer alone never moves it. List
windows do the same in their own loop (`0x1A9B0–0x1A9F0`).

The question sets YES as the choice (`DS:0xA568` = 0, `0x1978E`) and runs the
shared picker `0x1939A` over the two hit boxes. Its cursor (`0x18704`) is
colour 7 XORed over the chosen hit box only (blit mode `0x107`), not the whole
button: inside those 48 × 20 pixels black becomes cream, green pink, orange
blue and red sky, so the chosen button's face is a pink and cream checker with
blue letters, while the other button and both outer frames stay as drawn.
Left and right (or `4` and `6`) swap the choice; up and down (`8` and `2`)
look for another row, find none, and leave it (`0x1928F`, two items in two
columns). Enter answers the choice; Esc, `0` and the right button answer NO
(`0x186BA–0x186C8`, `0x193F8–0x1942B`). The pointer alone does not move the
choice: only while the left button is held does the cursor follow it over the
buttons (`0x18800`, `0x1924A–0x1927F`), and releasing over a button answers
it. Released elsewhere it does nothing (`DS:0xA55A` = 0, `0x1919A`). Held
over the window's top 16 rows (`DS:0xC21C–0xC222`, `0x18F5F–0x18F72`), it
drags the window.

The window's place is kept in the picker record for type 2 (12 bytes from
`DS:0xA560 + 12 × 2`: x, y, the largest x and y, 496 and 344, and the draw
routine `0x18EE6`), clamped with the unsigned minimum `0:0x4B54`. The draw
routine saves the background (`0x18EBA`), draws the picture at x rounded down
to a column (`0x18F41–0x18F5A`), and sets the hit boxes from the exact x
(`0x18F10–0x18F37`), as well as the drag strip x to x + 144, y to y + 16. The
cursor (`0x18704` → `0:0x63E`) takes its hit box's x as a column too, so it
always covers the button faces.

While the left button is held and the pointer is not over a button
(`DS:0xA558` = 0 from `0x18800`), `0x1925E` calls `0x1919A`, which calls the
drag routine `0x18F7B` when the picker type (`DS:0xA55E`) is not 0 and the
pointer is in the strip. Dragging:

1. Takes the pointer's offset from the window's corner (`0x18F8C–0x18F98`)
   and restores the background, taking the window off (`0:0x7690`).
2. Until the button is released (`0:0x4E52`), reads the pointer and puts a
   1-pixel rectangle outline, 640 − 496 = 144 by 400 − 344 = 56, at the
   pointer less the offset, each part 0 when the pointer is not past the
   offset, at most (496, 344), x rounded down to a column (`0x19015–0x1906D`).
   The outline is colour 7 XORed onto the screen (`1E5F:0x3924`, four lines
   plotted by `0:0xB33`, which XORs each plane), so drawing it again at its
   old place erases it when the place changes (`0x1907A–0x190D9`).
3. On release erases the outline, reads the pointer again, and sets x and y
   to the pointer less the offset, this time leaving a part unchanged when
   the pointer is not past it, then clamps them to (496, 344)
   (`0x19118–0x19165`).
4. Redraws the window there through the record's routine and puts the cursor
   back on the current choice (`0x19169–0x1918C`).

The drag returns 0, so the release does not answer; the question waits for
the next key or click.

#### Which windows drag

The picker's drag works only for the styles that keep a place record, those
whose style number (`DS:0xA55E`) is not 0 (`0x191E2`). The entry points set
it:

| Entry                             | Style | Used for                                                 | Drags |
| --------------------------------- | ----: | -------------------------------------------------------- | ----- |
| `0x19431`, `0x194DE`, `0x19586`   |     0 | the ordinary menus (`0x19452`, `0x194FF`, `0x195A6`)     | no    |
| `FC4:0x43B1` (`0x195F1`)          |     0 | the grid picker over caller hit boxes (`0x19612`)        | no    |
| `FC4:0x4419` (`0x19659`)          |     1 | the popup menu (`0x19681`), called only in naval battles | yes   |
| `FC4:0x4529` (`0x19769`)          |     2 | the YES/NO buttons (`0x1978B`)                           | yes   |

The popup's record is filled when it opens: x and y at the pointer, and the
largest x and y, `(75 − w) × 8` and `360 − 16n` for `n` items `w` characters
long (`0x196C5–0x19714`). Its outline is therefore `(w + 5) × 8` by
`16n + 40`, one column wider and 8 pixels taller than the window. Its draw
routine (`0x18E00`) sets one hit box per item a column in from either side
(`0x18DBF–0x18DEA`) and, after them, the whole window as the drag strip
(`0x18D35–0x18D57`, copied to the next entry at `0x18E80`), so a press held
anywhere in the popup but not on an item, disabled or not, drags it. When
the menu can be cancelled (`DS:0xA55A` = 1), a press outside the window
answers Esc on the first pass (`0x191A3–0x191E0`), for the ordinary menus as
well. The loop at `0x1921F` then checks the button (`0:0x4E52`), and while
it is still held it calls `0x1919A` again with `SI` = 1, which returns 0
(`0x1919F`) and replaces the Esc. Only a release before that check, almost
at once, keeps it, so a click outside a menu or popup does nothing. List
windows are different: their press check (`0x1A6C4`) answers Esc for a
press outside them (`0x1A6FF`, `0x1A8CC`), and that answer is kept. Both records are refilled every
time their window opens, so a dragged popup or YES/NO window does not keep
its place.

Message windows that only wait for a key and the other screens have no
drag. Only two routines draw the drag outline (`1E5F:0x3924`): the picker's
(`0x18F7B`) and the list window's (`0x1A47A`). The number pad moves without
an outline (below).

### The number pad

The number pad (`0:0x5742`, file `0xAD42`) takes a minimum in `dx:ax` and a
maximum on the stack; `DS:0x8E9C` = 1 makes it cancellable and `DS:0x8E9E`
reports a cancel. It saves 17 columns × 152 rows at `DS:0x8E78/0x8E7A`,
(504, 248) at start-up, draws `GRAPH.DAT` record 1 there (`0xA5AB`) and
restores the area on exit (`0xAD9A`). It always starts at 0; no caller passes
a value.

- **Hit boxes** (`0xA5BB–0xA648`): 19 keys of 24 × 24 from (x + 8, y + 48),
  5 to a row, Enter 48 wide; the compass at (x + 18, y + 24), 24 × 16; the bar
  at (x + 21, y + 8), 100 × 8. The keys' codes (`DS:0x8E7C`) are
  `7 8 9 * ?`, `4 5 6 / >`, `1 2 3 - ,`, `0 = + Enter`: `?` is MAX, `>` AC and
  `,` ±.
- **Display** (`0xA8B4`): the shown value with “%9ld” (`DS:0x8E96`) in colour
  0 on 7 (`DS:0x8E8F`) from column x / 8 + 6, y + 24. The bar is a gauge
  (`0xA911–0xA939`): black, then colour 2 from x + 21 for
  `floor(value × 100 / max)` pixels, at most 100, none for a negative value,
  full when the maximum is 0.
- **Keys** (`0xA979`): a digit makes the entry `E × 10 ± d`, held at
  ±99,999,999, and after `=` starts a new number. MAX (also Up, Home) sets the
  entry to the maximum; AC (also Down, End) clears everything; ± negates the
  entry while nothing is pending. `*` and `/` fold the entry into a product
  and show it; `+`, `-` and `=` fold the product into a total, held at
  ±99,999,999, and show it, `=` also making the total the entry; two
  operators in a row replace the pending one (`0xACAF`, `0xAD0E`). Arithmetic
  is signed, division truncates, and dividing by 0 gives 0 (`0xA847`). A typed
  `.` is `=`; Left and Right do nothing.
- **Enter** (`0xA9D4`) returns the total when it is not 0, else the entry, so
  a pending operation is dropped (“5 + 3 Enter” gives 5). Out of range, the
  pad starts again from 0 (`0xAD5E–0xAD92`). Esc or the right button cancels
  only a cancellable pad.
- **Mouse**: a press on a key XORs colour 7 over it while held and the key
  acts on release (`0xA6DF–0xA729`); a press on the compass erases the pad and
  redraws it on release at the pointer less the press offset, x on a column,
  no further than (504, 248), and later pads open there (`0xA73A–0xA7D4`);
  holding the button on the bar sets the entry to
  `(pointer x − x − 21) × max / 100` (`0xAA08–0xAA74`).

### Window frames

Every ordinary window is drawn by `0xC67B` (column `ax`, top `dx`, width in
columns `bx`, then the height in pixels and a style on the stack) from 8 × 8
tiles in `DATA1.014`, which the game keeps in the segment at `DS:0x0E0A`:

| Tile | `DATA1.014` | Drawn |
| ---- | ----------- | ----- |
| Top-left, top-right, bottom-left, bottom-right corners | `0x2C20`, `0x2C40`, `0x2C60`, `0x2C80` | Once each (`0x59D2`) |
| Top, left, right and bottom edges | `0x2CA0 + 0x80 × style`, then `+ 0x20`, `+ 0x40`, `+ 0x60` | Repeated along each side between the corners (`0x5EA6`) |

The inside, a column in from either side and 8 pixels in from the top and
bottom, is filled with colour 7 (`0x5F06`). The corners are the same brass
ornament, mirrored. Style 0 is a striped edge: from the outside in, colours 0,
2, 6, 0, 2, 4, 2 and then 7, which matches the inside. Style 1 adds an orange
and cream checker to the outer stripe and alternates its inner stripes; style
2 has blue in its pattern. The style tiles after style 2 (`0x2E20–0x2E9F`)
are not a frame.

Three routines call it:

- `0xC67B` itself draws the window at once.
- `0:0x721A` (`0xC81A`) draws it at its full height growing sideways from
  its middle column, a column on each side per step with a wait of one unit
  (`0xADBE`: INT 66h AX=F101h, then until F100h returns 0). A unit is about
  1/60.3 second ([Tick pacing](at-sea.md#tick-pacing)), but the count starts
  between two of its decrements, so a step lasts half a unit on average, when bit 0 of `DS:0x0E28` (Graphics Delay, on by default) is
  set; otherwise it calls `0xC67B`. Step s spans columns trunc((w − 1) / 2) +
  x − 1 − s to trunc((1 − w) / 2) + w + x + s, for trunc((w − 1) / 2) steps:
  each draws the corner tiles and side edges at those two columns and the
  edge tiles and colour 7 in the columns just inside them, so the window so
  far is always whole. The routine returns after the last step, so whatever
  goes inside is drawn once the window is open.
- `0xCB6C` saves the screen under the window, a column wider and 4 pixels
  taller, and calls `0xCA9C`, which draws the window with `0xC67B` and adds a
  shadow. The shadow is ANDed into the screen (`0x58A7` mode 2, the VGA AND
  function), so every other pixel turns colour 0 in a checkerboard. It is a
  strip 4 pixels wide down the right side, from 4 pixels below the window's
  top to 4 pixels below its bottom (`DS:0x8F4C`, two rows at a time), and
  4 rows under the window from 4 pixels in from its left edge (`DS:0x8F3C`
  for the first column, `DS:0x8F44` for each further column). The second
  strip's last column is a whole column wide, so the shadow's bottom-right
  corner is 8 pixels wide.

The ordinary menus (`0x19431`) take a column, a top and an item count: the
window is four columns wider than the longest item (`0x18CD3`) and (n + 1) ×
24 pixels tall (`0x19464–0x1947A`). Each item's box starts a column in and is
two columns wider than the longest item, 16 pixels tall, from 16 pixels down
and 24 pixels apart; its text is centred by whole columns, starting two
columns in plus half the difference in length, rounded down
(`0x18D63–0x18DEA`). The building menus open at column 60, y 104 (every call
of `0x206E4` but one, at column 30), and the side-tab menus at column 74 less
the longest item (`0x262C8–0x262D2`), so they end at column 78.

Menus (the shared picker, `0x1947A`), the townsperson's window (`0xB834`),
and most fixed message windows open through `0xCB6C`. The vendor's text window
(`0xE3AF`), the scenario panels (`0xD0F9`, `0xD197`) and the ship cards
(`0x21514`, `0x219B2`, `0x21BF8`) are drawn directly, without a shadow.

Style 1 is used by the crew list (`0x23C3B`), Change Job Duty (`0x2407E`,
`0x24371`), the crew messages at (128, 160) (`0x23E83`, `0x249E7`,
`0x26672`), the question at (240, 288) (`0x2439A`), Assign Crew's panels
(`0x245CE`, `0x25E8C`), the cargo windows (`0x24B9E`), View at sea
(`0x25692`), Settings (`0x26C93`), the item card (`0x2F35C`), the name-entry
keyboard (`0x363F4`), a cartographer's Report (`0x33C42`), and all but one of
the windows between `0x1B292` and `0x1C94B` (`0x1C196` is style 0). Style 2 is used only by the gambling tables
(`0x34C08`, `0x34C2D`, `0x34ED3`, `0x34F01`, `0x34F2C`). Every other window
is style 0.

### List windows

`FC4:0x5904` shows a list of `DS:0xC172` rows of list type `ax & 0x3F`
(`DS:0xC1D8`). Flag `0x80` restores the screen afterwards (`0:0x7690`) and
flag `0x40` returns the entry of the table at `DS:0x073A` for the chosen row
(`0x1AC0B–0x1AC2F`). Each type has a 10-byte record at `DS:0x122C`: the
window's column and top, the text width in columns, the most rows shown, and
the first row shown.

| Type | Column | Top | Columns | Rows | Type | Column | Top | Columns | Rows |
| ---: | -----: | --: | ------: | ---: | ---: | -----: | --: | ------: | ---: |
|    0 |     59 |  32 |      17 |   10 |   10 |     55 |  64 |      20 |   10 |
|    1 |     54 |  32 |      22 |   10 |   11 |     49 | 112 |      27 |   10 |
|    2 |     59 | 112 |      17 |   10 |   12 |     58 | 120 |      18 |   10 |
|    3 |     58 | 120 |      18 |   10 |   13 |     53 | 112 |      19 |   10 |
|    4 |     52 | 112 |      24 |   10 |   14 |     58 |  64 |      18 |   10 |
|    5 |     60 | 120 |      16 |   10 |   15 |     69 | 128 |       7 |    6 |
|    6 |     58 |  32 |      18 |   10 |   16 |     64 | 128 |      12 |   10 |
|    7 |     49 | 112 |      27 |   10 |   17 |     62 | 128 |      14 |   10 |
|    8 |     63 | 208 |      12 |    8 |   18 |     50 | 112 |      26 |   10 |
|    9 |     45 | 176 |      31 |   10 |   19 |     71 | 112 |       5 |   10 |

The callers and their types: the title is `MENU.DAT` entry 47's item for
the type.

| Type | Title           | Callers                                                                                                         |
| ---: | --------------- | --------------------------------------------------------------------------------------------------------------- |
|    0 | Ship            | Ship Info (`0x22994`), Rearrange (`0x25D7D`), Moor's Store and Exchange, the Shipyard's lists, battle Info's ships (`0x102AD`) |
|    1 | Goods           | Log of Goods (`0x222F8`)                                                                                        |
|    2 | Ship            | Sell Goods (`0x2A8E0`)                                                                                          |
|    3 | Enemy Fleet     | the sea's Battle command (`0x16267`)                                                                            |
|    4 | Remaining Space | Buy Goods' ship choice (`0x29F87`)                                                                              |
|    5 | Port            | Auto Sail (`0x36E24`)                                                                                           |
|    6 | Mate            | Mate Info (`0x229B6`), the Pub and Lodge sailors, battle Info's mates and the other fleets' commanders (`0x10213`, `0x102C5`, `0x1032C`) |
|    7 | Ship            | the fleet-wide crew assignment (`0x2B57B`)                                                                      |
|    8 | Type of Goods   | `0x2AFC2`                                                                                                       |
|    9 | Mate            | Change Captain and Change Job Duty (`0x24049`, `0x24212`), Wages (`0x26289`), Celestial Navigation (`0x2F71A`), `0x334C9` |
|   10 | Ship            | repairs ashore (`0x39CB2`)                                                                                      |
|   11 | Water           | loading water ashore (`0x3A17D`)                                                                                |
|   12 | Commodore       | View and Gossip (`0x255E1`, `0x26224`)                                                                          |
|   13 | Item            | Item (`0x2F98C`), the Item Shop (`0x2F9FB`, `0x2FB3B`), the Pub's gift (`0x2C8B7`), Locate (`0x33DF5`)          |
|   14 | Ship Model      | New and Used Ship (`0x31B8B`, `0x31E56`), keeping captured ships (`0x157C9`)                                    |
|   15 | Material        | the hull (`0x31ADC`)                                                                                            |
|   16 | Figurehead      | `0x32101`                                                                                                       |
|   17 | Guns            | `0x321DF`                                                                                                       |
|   18 | Discovery Item  | Discovery (`0x22451`), the Pub's (`0x2C7AF`) and the Residence's (`0x336D1`) discovery lists                    |
|   20 | Region          | the Item Shop (`0x2FD75`)                                                                                       |

The window (`0x19F6C`) is (columns + 4) × 8 pixels wide and rows × 16 + 40
tall for the record's full row count, however few rows there are. It is
filled with colour 7 (`0:0x906`) and framed with 8 × 8 tiles from
`DATA1.014` (`0:0x3D2`), with `W` = columns + 2:

| Tile (`DATA1.014`) | Place (column, y from the window's corner)              |
| ------------------ | ------------------------------------------------------- |
| `0x39A0`           | (0, 0)                                                  |
| `0x39C0`           | (1 … W, 0)                                              |
| `0x39E0`           | (W + 1, 0)                                              |
| `0x3A00`           | (0, 8 … height − 16)                                    |
| `0x3A20`           | (W + 1, 8)                                              |
| `0x3A40`           | (0, 16)                                                 |
| `0x3A60`           | (1 … W, 16); (1 … W − 2, height − 8)                    |
| `0x3A80`           | (W + 1, 16)                                             |
| `0x3AA0`           | (0, 24)                                                 |
| `0x3AC0`           | (1 … W − 2, 24)                                         |
| `0x3AE0`           | (W − 1, 24)                                             |
| `0x3B00`           | (W − 1, 32 … height − 16)                               |
| `0x3B20`           | (0, height − 8)                                         |
| `0x3B40`           | (W − 1, height − 8)                                     |
| `0x3B60`, `0x3B80` | (W, 40 … height − 24) and (W + 1, …): the scroll track  |
| `0x3BA0` (16 × 16) | (W, 24): the up arrow                                   |
| `0x3C20` (16 × 16) | (W, height − 16): the down arrow                        |

That makes a title strip 16 pixels tall over a divider, the text area, and a
scroll bar two columns wide on the right. The title is `MENU.DAT` 47's entry
for the type, printed with `ESC C0 ESC B7` (`DS:0xA634`), black, at column
`column + (W + 2 − length) / 2`, 4 pixels down (`0x1A429–0x1A46D`). The text
margins are column + 1 to column + columns + 4 (`0x19FB2–0x19FBF`). Row `n`
is written at x (column + 1) × 8, y top + 32 + 16 × n, and its hit box is
columns × 8 wide from there (`0x1ABCF–0x1ABFE`).

The scroll thumb (`0x19E05`) is drawn in colour 7 from x + 5 to x + 10 of the
bar's column (`DS:0xC1D2` = (column + W) × 8), inside the track that starts
at top + 41 (`DS:0xC1D4`) and is rows × 16 − 18 pixels long (`DS:0xC1E8`),
with colour 0 above and below it. Its length (`DS:0xC1CA`) is the whole track
when every row fits, else rows × track / count, at least 1; its offset is
first shown row × (track − length) / (count − rows) (`0x19FCF–0x1A029`,
`0x19E0A–0x19E31`).

Every list window can be dragged by its title strip, with its own routine
(`0x1A4C3`, called from the list's input loop at `0x1A9C0`). A left press
from the mouse (`DS:0xA556` set, key 0x0D from `0x18698`) at x from
(column + 2) × 8 to the scroll bar's right edge (`DS:0xC1D2` + 16) and y from
top to top + 16 starts it (`0x1A4CE–0x1A52D`):

1. It takes the offsets column − pointer x / 8 and top − pointer y, and takes
   the cursor off (`0x1A532–0x1A569`). The window stays drawn.
2. While the left button is held (`0x18698` returns 0x0D), the outline's
   column is the pointer's column plus the offset, 0 when that is negative
   and 76 − columns when the right edge would pass column 80; its top is the
   pointer's y plus the offset, 0 when negative and 360 − 16 × rows when the
   bottom would pass 400 (`0x1A56F–0x1A603`). The outline (`0x1A47A`) is the
   window's size, (columns + 4) × 8 by rows × 16 + 40, in colour 15 XORed
   (`1E5F:0x3924`), redrawn only when its place changes
   (`0x1A606–0x1A623`).
3. On release it erases the outline. When the place changed, it adds the
   change to the list type's record at `DS:0x122C` (`0x1A666`), restores
   the screen (`0:0x7690`), redraws the window (`0x19F6C`), and moves every
   row's hit box by the same amount (`0x1A681–0x1A6A8`). The cursor, the rows
   and the scroll thumb are then drawn again (`0x1A6AA–0x1A6B5`).

The drag returns 0, so the release picks nothing. Because the record is
changed, every later list of that type opens at the new place.

Codes 0x80–0x9F and 0xE0–0xFC are taken as the first
byte of a two-byte character (`0x9DE8–0x9E06`), whose conversion `0x9A4C` is
a stub. Escape sequences: `ESC = x y` position, `ESC C n` text colour,
`ESC B n` background colour (0 = transparent), `ESC M n` default background,
`ESC R n` left margin, `ESC F n` style (1 bold, 4 shadow, 5 bold and shadow;
`0x9B9E–0x9BFF`), `ESC W` wait.

### Time-of-day palettes

Towns use the sea's time-of-day palettes (`DS:0xA892`, chosen by four-hour
slot through `DS:0xA88A`: night before 04:00 and from 20:00, dawn from 04:00,
day from 08:00, dusk from 16:00). Time passes in port only when a building
visit ends: the visit's `random(3) + 2` ticks are added (`0x204A5`), or the
clock is set to tick 72 when `DS:0x0E34` bit `0x80` is set (`0x204BD–0x204C9`).
So the palette can change only then. Each time the town loop is entered,
`0x20480–0x2049B` sets the target to the current slot's palette and runs the
whole fade at once (`0x98A7`: one level of 16 per channel per step, one timer
wait per step) before the street is shown. The gradual fade used at sea
([Fading between palettes](at-sea.md#fading-between-palettes)) never shows in
town.

Entering a town (`0xE101`) fades the palette to black first (`0xE112`, the
near entry of `0:0x98B1`), loads and draws the town, and fades in (`0xE232`).
The title (`0x1B6AE`) fades to black, draws its picture and sets its palette
at once (`0:0x988D`); once Load Game or New Game is chosen the screen fades to
black, is cleared (`0:0x7F7`) and the palette fades back on the empty screen
(`0x1B78B–0x1B795`) before the game starts.

### Picture palettes

`GRAPH.DAT` pictures carry palette indices and take whatever palette is up.
In a town or at sea that is the time-of-day palette above; entries 0–7 are the
same in all five slots, and 8–15 follow the clock (fog at sea). The Info
palette (`DS:0xAB6E`) differs from them at entries 3 and 6 (`F341C3`,
`F3A200` against `D361A2`, `F3A261`) and at 8–15. The battle palette
(`DS:0xA0F0`) has the Info palette's entries 0–7.

The Shipyard (`0x329B0`) and an ordinary port's Harbor (`0x2E2E6`) start by
setting the Info palette and fading to it (`0x329B8`, `0x2E2ED`: `0:0x97BC`,
`0:0x98A7`); the supply ports' Harbor (`0x2E4E8`) does not. So do the ship
card at `0x2B3C6` (parchment and ship picture, `0x2B3FA`) and the Info tab's
ship and fleet cards (`0x2295C`, `0x229FC`). The town loop sets its own palette again on return
(`0x2049B`).

| Records          | Shown                                                        | Palette                                               |
| ---------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| 0, 1, 22         | YES/NO, the number pad, the parchment (`FC4:0xB592`)          | whichever is up: town or sea, Info, battle            |
| 2, 3             | the side panels at sea and in port                           | town or sea; Info inside the Harbor and Shipyard      |
| 6–17, 20         | building vendors                                             | town time-of-day; Info in the Harbor and Shipyard     |
| 23, 24           | the duel                                                     | battle (entries 0–7 only)                             |
| 26, 53–56        | the battle panel and its ending pictures                     | battle                                                |
| 27               | gambling                                                     | town (entries 0–7 only)                               |
| 28–52            | ships: `0:0x7DE5` → `0:0x58B7` at record 28 + type            | Info in the Harbor, Shipyard and Fleet/Ship Info      |
| 57, 59           | rats and scurvy at sea                                       | sea time-of-day (use entries 10 and 8)                |
| 58, 61           | the Storm (`0x1F1D8`) and the game over (`0x1C936`)           | sea (entries 0–7 only)                                |
| 64               | a discovery ashore (`0x3A6C3`)                                | sea time-of-day (uses 10, 11 and 15)                  |

### Port music

`0x2062A` picks the port's track from a 13-byte table built on the stack at
`0x20631–0x2065E`, indexed by the port's Market ID (metadata `+0x21`,
`0x2066B–0x20672`): track = table entry + 0x0A. Ports 100 and up get 0x0F
(`0x20661`, `0x20680`). It runs on entering a town (`0xE226`) and after every
building visit (`0x20B22`), so the port track always returns after a Pub, a
Palace or a scenario `CA`.

| Track  | Market IDs    | Markets                                                        |
| ------ | ------------- | -------------------------------------------------------------- |
| `0x0A` | 0, 1, 2       | Iberia, northern Europe, the Christian Mediterranean           |
| `0x0B` | 3, 5, 6, 7, 8 | North Africa, West Africa, both New World markets, East Africa |
| `0x0C` | 4, 9          | Istanbul, the Levant and Black Sea; the Middle East            |
| `0x0D` | 10            | India                                                          |
| `0x0E` | 11, 12        | Southeast Asia, the Far East                                   |
| `0x0F` | —             | All 30 supply ports                                            |

## Storage layout

The port ID is an implicit record index. The first record is port `0`, and
each subsequent record increments the ID by one. The display records begin at
`DATA1.015` offset `0x4F3E` and are 20 bytes each. The regular-port metadata
records begin at offset `0x5966` and are 37 bytes each; there are 100 of these
records. Each save slot also contains its mutable copy of the 37-byte table at
slot-relative `0x5966`; investment and other economic changes persist there.

### 20-byte port display record

Offsets are relative to the start of a port's 20-byte record as the save and
the executable use it (save slot `0x4F40 + port × 20`, returned by
`MAIN.EXE 0:59EE`). The `DATA1.015` copy starts two bytes earlier, at
`0x4F3E`, so its offsets are two higher.

| Offset         |     Size | Field         | Encoding                                                                                                             |
| -------------- | -------: | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `+0x00`        |  2 bytes | Longitude / X | little-endian `u16`; the extractor converts the wrapped map coordinate                                               |
| `+0x02`        |  2 bytes | Latitude / Y  | little-endian `u16`                                                                                                  |
| `+0x04..+0x12` | 15 bytes | Port name     | null-terminated string                                                                                               |
| `+0x13`        |   1 byte | Flags         | low 3 bits: nation; `0x10` known; `0x20` hidden from the lookout; `0x40` visited ([below](#known-and-visited-ports)) |

### Known and visited ports

Byte `+0x13` of the saved display record carries two discovery flags:

- `0x10`, **known**: the port appears on the map and in Auto Sail's port list.
  Sighting a port at sea sets it (`0x36C41`).
- `0x40`, **visited**: entering a port sets both flags, `0x50` (`0x20F9D`).
  Log of Goods only considers visited ports.
- `0x20`: the lookout never sights a port with this bit or `0x10`
  (`0x36BF3`), so such a port becomes known only by entering it. João's and
  Ernst's scenario scripts set it on Changan, Sakai, and Nagasaki.

A new game starts with 11 ports visited: Lisbon, Seville, Istanbul, Marseille,
Genoa, Venice, Athens, Alexandria, Bordeaux, London, and Amsterdam. Barcelona,
Valencia, Pisa, Naples, Trebizond, Bristol, Antwerp, and Copenhagen start
known. Every other port must be found first. The protagonist's starting port
is also marked visited (`0x1BAC9`).

### Saved 37-byte regular-port metadata record

Offsets are relative to the start of a regular port's 37-byte metadata record
as framed from `0x5966`. The executable's own `0x25`-byte port record starts two
bytes later: `MAIN.EXE` addresses port `n` at `DS:0x6790 + n × 0x25`, which is
save offset `0x5968 + n × 0x25`. An executable field at `+N` is therefore the
field at `+N+2` in this table. The last two fields, `+0x25` and `+0x26`, are
stored in the bytes that this framing assigns to the next record's `+0x00` and
`+0x01`.

| Offset         |     Size | Field                        | Encoding                                                                        |
| -------------- | -------: | ---------------------------- | ------------------------------------------------------------------------------- |
| `+0x02`        |  2 bytes | Economy                      | little-endian `u16`                                                             |
| `+0x04`        |  2 bytes | Market investment            | little-endian `u16`; accumulated Market Invest gold, at most 50,000             |
| `+0x06`        |  2 bytes | Industry                     | little-endian `u16`                                                             |
| `+0x08`        |  2 bytes | Shipyard investment          | little-endian `u16`; accumulated Shipyard Invest gold, at most 50,000           |
| `+0x0A..+0x0F` |  6 bytes | Allegiance / support values  | one byte per nation, in order: Portugal, Spain, Turkey, England, Italy, Holland |
| `+0x10..+0x19` | 10 bytes | Market category rates        | the displayed price index is the stored byte plus 50                            |
| `+0x12`        |   1 byte | Food and Shot price modifier | category rate 2; also reused by the Harbor Supply formulas                      |
| `+0x19`        |   1 byte | Lumber price modifier        | category rate 9; also reused by the Harbor Supply formula                       |
| `+0x1A`        |  2 bytes | Specialty base price         | little-endian `u16`                                                             |
| `+0x1C`        |   1 byte | Specialty goods ID           | zero-based; `0xFF` means none                                                   |
| `+0x1D`        |   1 byte | Specialty Economy threshold  | stored in units of 10 Economy                                                   |
| `+0x1E`        |   1 byte | Region ID                    | zero-based                                                                      |
| `+0x1F..+0x21` |  3 bytes | Regular shop items           | item IDs; stored zero-based, with `0xFF` meaning unused                         |
| `+0x22`        |   1 byte | Secret shop item             | item ID; stored zero-based, with `0xFF` meaning unused                          |
| `+0x23`        |   1 byte | Market ID                    | zero-based                                                                      |
| `+0x24`        |   1 byte | Industry ID                  | zero-based; the port's shipyard                                                 |
| `+0x25`        |   1 byte | Ship-construction days       | days left on a New Ship order; `0xFF` means no order                            |
| `+0x26`        |   1 byte | Pub drink                    | index into the Pub's 14 drink specialties                                       |

The price modifiers and their exact use are documented under
[Supply](buildings.md#supply). The investment words, the Pub drink, and the
construction timer are described under
[Market command dialogue](buildings.md#market-command-dialogue),
[Pub command dialogue](buildings.md#pub-command-dialogue), and
[Construction time](ships.md#construction-time).

## Open questions

None remain.
