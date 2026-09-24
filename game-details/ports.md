# Ports

The game has 130 port records: 100 regular ports assigned to one of eight
regions, followed by 30 supply ports. Port IDs are zero-based and match the
order in the extracted port table. Region IDs are one-based.

For regular ports, the tables include the displayed location, economy,
industry, support by nation, shop items, Market ID, and Industry ID. Regular
and secret shop columns contain item names decoded from the game's item table.

## Europe

| #ID |  Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items                    | Secret Shop Item | Market ID | Industry ID |
| --: | ---------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------------------------- | ---------------- | --------: | ----------: |
|   0 |     Lisbon |   39N 9W |     780 |      770 |      100 |     0 |      0 |     0 |       0 |       0 | Quadrant, Telescope, Rapier           | —                |         1 |           1 |
|   1 |    Seville |   37N 6W |     770 |      810 |        0 |   100 |      0 |     0 |       0 |       0 | Telescope, Short Saber, Rapier        | Basterd Sword    |         1 |           1 |
|   2 |   Istanbul |  41N 28E |     810 |      720 |        0 |     0 |    100 |     0 |       0 |       0 | Telescope, Leather Armor, Quadrant    | Scimitar         |         5 |           6 |
|   3 |  Barcelona |   41N 2E |     590 |      540 |        0 |   100 |      0 |     0 |       0 |       0 | Dagger, Leather Armor, Balm           | —                |         1 |           1 |
|   4 |    Algiers |   37N 3E |     160 |      180 |        0 |     0 |     20 |     0 |       0 |       0 | Cutlass, Lime Juice                   | —                |         4 |           6 |
|   5 |      Tunis |  37N 10E |     130 |      160 |        0 |     0 |     15 |     0 |       0 |       0 | —                                     | —                |         4 |           6 |
|   6 |   Valencia |   39N 0W |     320 |      300 |        0 |   100 |      0 |     0 |       0 |       0 | Lime Juice, Short Sword               | —                |         1 |           1 |
|   7 |  Marseille |   44N 5E |     350 |      290 |        0 |     0 |      0 |     0 |       0 |       0 | Epee, Candleholder                    | Estock           |         3 |           4 |
|   8 |      Genoa |   44N 8E |     750 |      760 |        0 |     0 |      0 |   100 |       0 |       0 | Cutlass, Quadrant, Velvet Coat        | —                |         3 |           5 |
|   9 |       Pisa |  43N 10E |     620 |      540 |        0 |     0 |      0 |   100 |       0 |       0 | Rapier, Candleholder, Broad Sword     | —                |         3 |           5 |
|  10 |     Naples |  40N 13E |     630 |      640 |        0 |     0 |      0 |   100 |       0 |       0 | Epee, Leather Armor, Rat Poison       | Crusader Armor   |         3 |           5 |
|  11 |   Syracuse |  37N 15E |     240 |      220 |        0 |     0 |      0 |   100 |       0 |       0 | Short Sword, Lime Juice               | Tax Permit (I)   |         3 |           5 |
|  12 |      Palma |   39N 2E |     290 |      285 |        0 |    98 |      0 |     0 |       0 |       0 | —                                     | —                |         3 |           1 |
|  13 |     Venice |  45N 13E |     740 |      730 |        0 |     0 |      0 |   100 |       0 |       0 | Chain Mail, Sextant, Epee             | Garnet Brooch    |         3 |           5 |
|  14 |     Ragusa |  42N 18E |     150 |      140 |        0 |     0 |      0 |   100 |       0 |       0 | Quadrant, Dagger                      | —                |         3 |           5 |
|  15 |     Candia |  35N 25E |     180 |      160 |        0 |     0 |      0 |     0 |       0 |       0 | —                                     | —                |         3 |           5 |
|  16 |     Athens |  38N 24E |     640 |      540 |        0 |     0 |      0 |     0 |       0 |       0 | Saber, Lime Juice, Circlet            | Theodolite       |         3 |           5 |
|  17 |   Salonika |  41N 22E |     110 |      120 |        0 |     0 |      0 |     0 |       0 |       0 | Cutlass                               | Tax Permit (P)   |         5 |           5 |
|  18 | Alexandria |  31N 29E |     720 |      700 |        0 |     0 |    100 |     0 |       0 |       0 | Half Plate, Sextant, Rat Poison       | Scimitar         |         5 |           6 |
|  19 |      Jaffa |  32N 35E |     140 |      150 |        0 |     0 |     95 |     0 |       0 |       0 | —                                     | —                |         5 |           6 |
|  20 |     Beirut |  33N 35E |     270 |      250 |        0 |     0 |    100 |     0 |       0 |       0 | Short Saber, Balm                     | —                |         5 |           6 |
|  21 |    Nicosia |  35N 33E |     150 |      160 |        0 |     0 |     98 |     0 |       0 |       0 | —                                     | —                |         3 |           6 |
|  22 |    Tripoli |  32N 13E |     420 |      400 |        0 |     0 |     90 |     0 |       0 |       0 | Short Saber, Leather Armor, Telescope | Tax Permit (O)   |         4 |           6 |
|  23 |      Kaffa |  45N 34E |     340 |      350 |        0 |     0 |     35 |     0 |       0 |       0 | —                                     | —                |         5 |           6 |
|  24 |       Azov |  47N 38E |     110 |      115 |        0 |     0 |     20 |     0 |       0 |       0 | Dagger                                | Tax Permit (S)   |         5 |           6 |
|  25 |  Trebizond |  41N 39E |     360 |      370 |        0 |     0 |    100 |     0 |       0 |       0 | Saber, Velvet Coat                    | —                |         5 |           6 |
|  26 |      Ceuta |   35N 5W |      85 |       90 |      100 |     0 |      0 |     0 |       0 |       0 | —                                     | —                |         4 |           1 |
|  27 |   Bordeaux |   45N 1W |     600 |      580 |        0 |     0 |      0 |     0 |      80 |       0 | Short Sword, Balm, Rapier             | —                |         2 |           4 |
|  28 |     Nantes |   48N 2W |     560 |      570 |        0 |     0 |      0 |     0 |      80 |       0 | Epee, Chain Mail, Candleholder        | —                |         2 |           4 |
|  29 |     London |   53N 0E |     720 |      740 |        0 |     0 |      0 |     0 |     100 |       0 | Cutlass, Telescope, Velvet Coat       | Sextant          |         2 |           2 |
|  30 |    Bristol |   52N 3W |     320 |      380 |        0 |     0 |      0 |     0 |     100 |       0 | Broad Sword, Leather Armor            | Claymore         |         2 |           2 |
|  31 |     Dublin |   54N 7W |     370 |      350 |        0 |     0 |      0 |     0 |      93 |       0 | Dagger, Broad Sword                   | Claymore         |         2 |           2 |
|  32 |    Antwerp |   53N 5E |     660 |      670 |        0 |     0 |      0 |     0 |       0 |     100 | Long Sword, Rat Poison, Aqua Tiara    | Tax Permit (H)   |         2 |           3 |
|  33 |  Amsterdam |   55N 6E |     700 |      730 |        0 |     0 |      0 |     0 |       0 |     100 | Telescope, Sextant, Theodolite        | Pocket Watch     |         2 |           3 |
|  34 | Copenhagen |  57N 12E |     530 |      510 |        0 |     0 |      0 |     0 |       0 |      98 | Chain Mail, Half Plate, Plate Mail    | Errol’s Plate    |         2 |           4 |
|  35 |    Hamburg |  55N 10E |     600 |      620 |        0 |     0 |      0 |     0 |       0 |      95 | Quadrant, Leather Armor, Circlet      | —                |         2 |           3 |
|  36 |       Oslo |  63N 10E |     190 |      185 |        0 |     0 |      0 |     0 |      80 |       0 | —                                     | —                |         2 |           4 |
|  37 |  Stockholm |  62N 19E |     480 |      470 |        0 |     0 |      0 |     0 |      85 |       0 | Dagger, Short Sword                   | Basterd Sword    |         2 |           4 |
|  38 |     Lubeck |  55N 10E |     320 |      300 |        0 |     0 |      0 |     0 |       0 |      85 | Saber, Long Sword, Estock             | Flamberge        |         2 |           4 |
|  39 |     Danzig |  56N 18E |     370 |      280 |        0 |     0 |      0 |     0 |       0 |      90 | Leather Armor, Platinum Comb          | Tax Permit (E)   |         2 |           4 |
|  40 |       Riga |  59N 23E |     150 |      160 |        0 |     0 |      0 |     0 |       0 |      85 | —                                     | —                |         2 |           4 |
|  41 |     Bergen |   62N 5E |     145 |      150 |        0 |     0 |      0 |     0 |       0 |      80 | —                                     | —                |         2 |           4 |

## New World

| #ID |      Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items        | Secret Shop Item | Market ID | Industry ID |
| --: | -------------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------------- | ---------------- | --------: | ----------: |
|  42 |        Caracas |   7N 72W |     220 |      210 |        0 |    95 |      0 |     0 |       0 |       0 | Lime Juice, Chain Mail    | —                |         8 |          11 |
|  43 |      Cartegena |   6N 81W |     190 |      130 |        0 |     0 |      0 |     0 |       0 |       0 | Lime Juice, Long Sword    | —                |         8 |          11 |
|  44 |         Havana |  19N 87W |     210 |      220 |        0 |    93 |      0 |     0 |       0 |       0 | —                         | —                |         7 |          11 |
|  45 |      Margarita |   7N 69W |      40 |       45 |        0 |     0 |      0 |     0 |       0 |       0 | Dagger                    | Sapphire Ring    |         8 |          11 |
|  46 |         Panama |   5N 85W |     160 |      190 |        0 |     0 |      0 |     0 |       0 |       0 | Lime Juice, Garnet Brooch | —                |         7 |          11 |
|  47 |    Porto Velho |   6N 85W |      60 |       75 |        0 |    95 |      0 |     0 |       0 |       0 | —                         | —                |         7 |          11 |
|  48 |  Santo Domingo |  14N 74W |     150 |      160 |        0 |    98 |      0 |     0 |       0 |       0 | Balm, Rat Poison          | —                |         7 |          11 |
|  49 |       Veracruz | 15N 100W |      80 |       75 |        0 |     0 |      0 |     0 |       0 |       0 | —                         | —                |         7 |          11 |
|  50 |        Jamaica |  13N 81W |      60 |       80 |        0 |    90 |      0 |     0 |       0 |       0 | Mermaid Bangle            | —                |         7 |          11 |
|  51 |      Guatemala |  10N 95W |      70 |       65 |        0 |    97 |      0 |     0 |       0 |       0 | —                         | —                |         7 |          11 |
|  52 |     Pernambuco |  11S 45W |     215 |      240 |      100 |     0 |      0 |     0 |       0 |       0 | Dagger, Plate Mail        | Rune Blade       |         8 |          11 |
|  53 | Rio de Janeiro |  25S 50W |      45 |       50 |       90 |     0 |      0 |     0 |       0 |       0 | Circlet                   | Gold Bracelet    |         8 |          11 |
|  54 |      Maracaibo |   7N 77W |     120 |      105 |        0 |    95 |      0 |     0 |       0 |       0 | —                         | —                |         8 |          11 |
|  55 |       Santiago |  16N 81W |      80 |      105 |        0 |     0 |      0 |     0 |       0 |       0 | Lime Juice                | —                |         7 |          11 |
|  56 |        Cayenne |   0S 57W |      70 |       65 |        0 |     0 |      0 |     0 |       0 |       0 | —                         | —                |         8 |          11 |

## West Africa

| #ID |  Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items                          | Secret Shop Item | Market ID | Industry ID |
| --: | ---------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------------------------------- | ---------------- | --------: | ----------: |
|  57 |    Madeira |  33N 17W |     240 |      230 |      100 |     0 |      0 |     0 |       0 |       0 | —                                           | —                |         6 |           8 |
|  58 | Santa Cruz |  28N 17W |      90 |       80 |        0 |     0 |      0 |     0 |       0 |       0 | —                                           | —                |         6 |           8 |
|  59 |  San Jorge |    6N 2W |     210 |      190 |      100 |     0 |      0 |     0 |       0 |       0 | Dagger, Telescope                           | Ruby Ring        |         6 |           8 |
|  60 |     Bissau |  13N 17W |      85 |      100 |        0 |     0 |      0 |     0 |       0 |       0 | —                                           | —                |         6 |           8 |
|  61 |     Luanda |   8S 12E |      90 |       75 |       96 |     0 |      0 |     0 |       0 |       0 | —                                           | —                |         6 |           8 |
|  62 |      Argin |  20N 18W |     200 |      185 |      100 |     0 |      0 |     0 |       0 |       0 | Rat Poison, Platinum Comb                   | —                |         6 |           8 |
|  63 |   Bathurst |  14N 17W |      75 |       60 |        0 |     0 |      0 |     0 |       0 |       0 | —                                           | —                |         6 |           8 |
|  64 |   Timbuktu |   15N 4W |     430 |       35 |        0 |     0 |      0 |     0 |       0 |       0 | Crown of Glory, Gold Bracelet, Ruby Scepter | Crusader Sword   |         6 |           8 |
|  65 |    Abidjan |    6N 5W |      90 |       75 |        0 |     0 |      0 |     0 |       0 |       0 | —                                           | —                |         6 |           8 |

## East Africa

| #ID |  Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items                    | Secret Shop Item | Market ID | Industry ID |
| --: | ---------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------------------------- | ---------------- | --------: | ----------: |
|  66 |     Sofala |  17S 34E |     390 |      400 |       85 |     0 |      0 |     0 |       0 |       0 | —                                     | —                |         9 |           8 |
|  67 |    Malindi |   3S 39E |     370 |      360 |       95 |     0 |      0 |     0 |       0 |       0 | —                                     | —                |         9 |           8 |
|  68 |  Mogadishu |   3N 45E |      90 |       70 |        0 |     0 |      0 |     0 |       0 |       0 | —                                     | —                |         9 |           8 |
|  69 |    Mombasa |   4S 39E |     380 |      390 |       90 |     0 |      0 |     0 |       0 |       0 | Malachite Box, Silk Shawl, Aqua Tiara | Ermine Coat      |         9 |           8 |
|  70 | Mozambique |  13S 40E |     180 |      160 |        0 |     0 |      0 |     0 |       0 |       0 | Rat Poison, Gold Bracelet             | Jade Jewelbox    |         9 |           8 |
|  71 |  Quelimane |  15S 36E |      60 |       60 |        0 |     0 |      0 |     0 |       0 |       0 | —                                     | —                |         9 |           8 |

## Middle East

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items               | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | -------------------------------- | ---------------- | --------: | ----------: |
|  72 |      Aden |  14N 46E |     210 |      260 |       90 |     0 |      0 |     0 |       0 |       0 | —                                | —                |        10 |           7 |
|  73 |    Hormuz |  26N 56E |     100 |       90 |       95 |     0 |      0 |     0 |       0 |       0 | —                                | —                |        10 |           7 |
|  74 |   Massawa |  15N 41E |      90 |       85 |        0 |     0 |      0 |     0 |       0 |       0 | Malachite Box                    | —                |        10 |           7 |
|  75 |     Cairo |  29N 32E |     510 |      480 |        0 |     0 |    100 |     0 |       0 |       0 | Scimitar, Silk Scarf, Chain Mail | —                |        10 |           6 |
|  76 |     Basra |  30N 48E |     480 |      500 |        0 |     0 |    100 |     0 |       0 |       0 | —                                | —                |        10 |           7 |
|  77 |     Mecca |  21N 39E |     500 |       80 |        0 |     0 |    100 |     0 |       0 |       0 | Cat, Silk Scarf, Theodolite      | —                |        10 |           7 |
|  78 |    Quatar |  25N 52E |     130 |      160 |        0 |     0 |    100 |     0 |       0 |       0 | —                                | —                |        10 |           7 |
|  79 |    Shiraz |  26N 53E |      70 |       80 |        0 |     0 |    100 |     0 |       0 |       0 | —                                | —                |        10 |           7 |
|  80 |    Muscat |  24N 58E |     180 |      230 |        0 |     0 |     95 |     0 |       0 |       0 | —                                | —                |        10 |           7 |

## India

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items                   | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------------------------ | ---------------- | --------: | ----------: |
|  81 |       Diu |  25N 66E |      75 |       80 |       87 |     0 |      0 |     0 |       0 |       0 | —                                    | —                |        11 |           7 |
|  82 |    Cochin |  10N 75E |     130 |      120 |       90 |     0 |      0 |     0 |       0 |       0 | —                                    | —                |        11 |           7 |
|  83 |    Ceylon |   8N 80E |     180 |      210 |        0 |     0 |      0 |     0 |       0 |       0 | Peacock Fan, Saber                   | —                |        11 |           7 |
|  85 |       Goa |  14N 73E |     540 |      560 |       85 |     0 |      0 |     0 |       0 |       0 | Balm, Short Sword, Ermine Coat       | —                |        11 |           7 |
|  92 |   Calicut |  12N 74E |     530 |      560 |        0 |     0 |      0 |     0 |       0 |       0 | Peacock Fan, Rat Poison, Short Saber | Siva’s Sword     |        11 |           7 |

## Southeast Asia

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------ | ---------------- | --------: | ----------: |
|  84 |     Amboa |  1S 125E |      50 |       50 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  86 |   Malacca |  4N 101E |      90 |       95 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  87 |   Ternate |  2N 125E |      80 |       85 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  88 |     Banda |  2S 128E |      45 |       40 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  89 |      Dili |  6S 125E |      40 |       45 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  90 |     Pasei |   5N 96E |      35 |       40 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  91 |     Sunda |  3S 106E |      40 |       55 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |
|  93 |    Bankao |  1N 105E |      50 |       45 |        0 |     0 |      0 |     0 |       0 |       0 | —                  | —                |        12 |           7 |

## Far East

| #ID | Port Name | Location | Economy | Industry | Portugal | Spain | Turkey | Italy | England | Holland | Regular Shop Items                   | Secret Shop Item | Market ID | Industry ID |
| --: | --------: | -------: | ------: | -------: | -------: | ----: | -----: | ----: | ------: | ------: | ------------------------------------ | ---------------- | --------: | ----------: |
|  94 |    Zeiton | 26N 119E |     520 |      570 |        0 |     0 |      0 |     0 |       0 |       0 | Cat, Lime Juice, Balm                | Blue Crescent    |        13 |           9 |
|  95 |     Macao | 23N 113E |     480 |      490 |        0 |     0 |      0 |     0 |       0 |       0 | Silk Scarf, Peacock Fan, China Dress | Mermaid Bangle   |        13 |           9 |
|  96 |     Hanoi | 22N 105E |     300 |      340 |        0 |     0 |      0 |     0 |       0 |       0 | Silk Shawl, Golden Dragon            | —                |        13 |           7 |
|  97 |   Changan | 35N 110E |     580 |      280 |        0 |     0 |      0 |     0 |       0 |       0 | Silk Scarf, Silk Shawl, China Dress  | Blue Crescent    |        13 |           9 |
|  98 |     Sakai | 35N 136E |     420 |      410 |        0 |     0 |      0 |     0 |       0 |       0 | Mermaid Bangle, Cat, Japanese Sword  | Magic Muramasa   |        13 |          10 |
|  99 |  Nagasaki | 33N 129E |     210 |      220 |        0 |     0 |      0 |     0 |       0 |       0 | Cat, Japanese Sword, Aqua Tiara      | —                |        13 |          10 |

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

## Storage layout

The port ID is an implicit record index. The first record is port `0`, and
each subsequent record increments the ID by one. The display records begin at
`DATA1.015` offset `0x4F3E` and are 20 bytes each. The regular-port metadata
records begin at offset `0x5966` and are 37 bytes each; there are 100 of these
records. Each save slot also contains its mutable copy of the 37-byte table at
slot-relative `0x5966`; investment and other economic changes persist there.

### 20-byte port display record

Offsets are relative to the start of a port's 20-byte record:

| Offset         |     Size | Field         | Encoding                                                                                                             |
| -------------- | -------: | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `+0x02`        |  2 bytes | Longitude / X | little-endian `u16`; the extractor converts the wrapped map coordinate                                               |
| `+0x04`        |  2 bytes | Latitude / Y  | little-endian `u16`                                                                                                  |
| `+0x06..+0x13` | 14 bytes | Port name     | null-terminated string                                                                                               |
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
| `+0x1E`        |   1 byte | Region ID                    | stored zero-based; displayed as `byte + 1`                                      |
| `+0x1F..+0x21` |  3 bytes | Regular shop items           | item IDs; stored zero-based, with `0xFF` meaning unused                         |
| `+0x22`        |   1 byte | Secret shop item             | item ID; stored zero-based, with `0xFF` meaning unused                          |
| `+0x23`        |   1 byte | Market ID                    | stored zero-based; displayed as `byte + 1`                                      |
| `+0x24`        |   1 byte | Industry ID                  | stored zero-based; displayed as `byte + 1`                                      |
| `+0x25`        |   1 byte | Ship-construction days       | days left on a New Ship order; `0xFF` means no order                            |
| `+0x26`        |   1 byte | Pub drink                    | index into the Pub's 14 drink specialties                                       |

The price modifiers and their exact use are documented under
[Supply](buildings.md#supply). The investment words, the Pub drink, and the
construction timer are described under
[Market command dialogue](buildings.md#market-command-dialogue),
[Pub command dialogue](buildings.md#pub-command-dialogue), and
[Construction time](ships.md#construction-time).
