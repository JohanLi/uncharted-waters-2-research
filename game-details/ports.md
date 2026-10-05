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
  `PORTCHIP.007` = `00 16 1A 1F`. The player's test at `0xB3C9` and the
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
