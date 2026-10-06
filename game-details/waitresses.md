# Waitresses

The game defines 29 named Pub-attendant records used by the **Waitress**
command, each attached to one Pub. Most ports do not have one. They share a
30-record table with Carlotta, the owner of the Lisbon Pub. Selecting
**Waitress** at a Pub with such an attendant and paying the 10-gold tip opens
four commands: **Tell Stories**, **Give Gift**, **Investigation**, and **Ask
Info**.

Each waitress has her own favor value. All 29 values start at **0**, are stored
independently, and are capped at **100**. Raising one waitress's favor does not
affect another.

The saved table begins at slot-relative `0x1BA2` (`MAIN.EXE 0:5972` returns
`DS:0x29CA + index × 16`) and contains 30 records of 16 bytes. Each record
stores the name at `+0x00`, port ID at `+0x0B`, favor at `+0x0C`, and
preference/eligibility flags at `+0x0F`. A record's portrait code is
`0x61 + record index`, the same code scenario dialogue uses.

Record 0 is Carlotta (Lisbon, flags `0x6F`). Her flag `0x40` excludes her from
the Waitress command and the Love reading; instead, while protagonist byte
`+0x29` bit `0x10` is clear, entering a Pub whose port has a record with flags
`0x08` and `0x40` shows raw 17, “Hello [first name], would you like some
[drink]?”, spoken by Carlotta (`MAIN.EXE 0x2D332`, `0x2D443`). Records 1–29 are
the waitresses below.

No protagonist ever has byte `+0x29` bit `0x10` set: it is clear in the
starting data, and neither the executable nor any scenario script sets it. The
branches that depend on it are therefore unreachable in normal play: Carlotta
always greets in Lisbon, the attendant never adds raw 307 or 308, and the
attendant lookup never consults the previous Pub's attendant record
(`0x2D3A6–0x2D3B8`).

| Record | Portrait | Name      | Port           | Preference  | Investigation threshold | House of Fortune |
| -----: | -------: | --------- | -------------- | ----------- | ----------------------: | :--------------: |
|      1 |   `0x62` | Lucia     | Lisbon         | Everything  |                      40 |        No        |
|      2 |   `0x63` | Ladia     | Istanbul       | Everything  |                      40 |       Yes        |
|      3 |   `0x64` | Leticia   | Barcelona      | Treasure    |                      40 |        No        |
|      4 |   `0x65` | Mathilde  | Marseille      | Accessories |                      80 |       Yes        |
|      5 |   `0x66` | Theresa   | Genoa          | Treasure    |                      40 |       Yes        |
|      6 |   `0x67` | Francesca | Venice         | Accessories |                      80 |       Yes        |
|      7 |   `0x68` | Helen     | Athens         | Stories     |                      40 |       Yes        |
|      8 |   `0x69` | Layla     | Alexandria     | Everything  |                      40 |       Yes        |
|      9 |   `0x6A` | Jamila    | Ceuta          | Treasure    |                      80 |        No        |
|     10 |   `0x6B` | Elaine    | Bordeaux       | Treasure    |                      80 |        No        |
|     11 |   `0x6C` | Lillian   | London         | Treasure    |                      40 |       Yes        |
|     12 |   `0x6D` | Johanna   | Antwerp        | Stories     |                      80 |       Yes        |
|     13 |   `0x6E` | Melanie   | Amsterdam      | Everything  |                      40 |        No        |
|     14 |   `0x6F` | Claudia   | Hamburg        | Stories     |                      40 |        No        |
|     15 |   `0x70` | Viveka    | Stockholm      | Everything  |                      40 |       Yes        |
|     16 |   `0x71` | Natasha   | Riga           | Accessories |                      40 |       Yes        |
|     17 |   `0x72` | Isabella  | Havana         | Treasure    |                      80 |       Yes        |
|     18 |   `0x73` | Lupe      | Margarita      | Everything  |                      40 |        No        |
|     19 |   `0x74` | Silvia    | Rio de Janeiro | Treasure    |                      40 |       Yes        |
|     20 |   `0x75` | Tobia     | San Jorge      | Everything  |                      80 |        No        |
|     21 |   `0x76` | Tisa      | Argin          | Treasure    |                      40 |        No        |
|     22 |   `0x77` | Shani     | Sofala         | Everything  |                      40 |       Yes        |
|     23 |   `0x78` | Hadi      | Cairo          | Stories     |                      40 |       Yes        |
|     24 |   `0x79` | Salma     | Mecca          | Accessories |                      80 |       Yes        |
|     25 |   `0x7A` | Aruna     | Goa            | Stories     |                      40 |        No        |
|     26 |   `0x7B` | Rukia     | Malacca        | Treasure    |                      80 |       Yes        |
|     27 |   `0x7C` | Titis     | Banda          | Accessories |                      80 |       Yes        |
|     28 |   `0x7D` | Mei-Yi    | Changan        | Everything  |                      40 |       Yes        |
|     29 |   `0x7E` | Onatsu    | Nagasaki       | Stories     |                      40 |        No        |

The waitress records and `ZA_DAT.DAT` building coordinates disprove a simple
one-to-one relationship with the House of Fortune. Every waitress port has a
Pub, but only 18 of the 29 have a House of Fortune. Conversely, many ports have
a House without having a named waitress. Only 17 waitress ports can produce a
named Love reading, because Hadi's record is excluded by the Love command's
eligibility flag.

## Waitress menu

### Tell Stories

Choose one of your discoveries and recount it. The discovery remains available
afterward. A waitress who prefers **Stories** or **Everything** receives twice
the ordinary increase and always applies it; a nonpreferred story is also able
to raise favor while the shared gate described below is clear.

The executable uses the discovery's difficulty value:

```text
base gain = floor(discovery difficulty / 10) + 1

if preference is Stories or Everything:
    gain = 2 * base gain
else:
    gain = base gain

new favor = min(100, old favor + gain)
```

Discovery difficulties run from 10 through 100, so an ordinary story adds
2–11 favor and a preferred story adds 4–22. A preferred story always performs
this update. A nonpreferred story performs it only while shared waitress flag
`0x40` is clear. A successful story sets that flag; the preferred path first
clears it, which is why the preferred interaction remains repeatable.

This calculation is at `MAIN.EXE 0x2C7D8–0x2C845`. The preference class is
read from bits 4–5 of the waitress record's byte `+0x0F`, and favor is byte
`+0x0C`.

### Give Gift

Choose an eligible item from the inventory. Accessories match a waitress whose
preference is **Accessories**, treasures match **Treasure**, and
**Everything** matches either category. A waitress who prefers Stories has no
matching gift category.

Preference is a multiplier, not an all-or-nothing gate. A nonmatching gift can
still add favor:

```text
base gain = min(item appeal rating, 10)

if the item's category matches the preference,
or the preference is Everything:
    gain = 2 * base gain
else:
    gain = base gain

new favor = min(100, old favor + gain)
```

The item is consumed. Its shop price is not part of this calculation; only its
stored appeal rating and category matter. The rating contribution is capped at
10 before the preference multiplier, so one gift adds at most 20 favor.

#### Stored appeal ratings

These are the values read by the favor calculation. Ratings above 10 all
produce the same base gain of 10 because the executable applies the cap first.

| Item           | Category  | Stored appeal rating |
| -------------- | --------- | -------------------: |
| Royal Crown    | Accessory |                    1 |
| Silk Scarf     | Accessory |                    2 |
| Peacock Fan    | Accessory |                    3 |
| Silk Shawl     | Accessory |                    3 |
| Circlet        | Accessory |                    4 |
| Aqua Tiara     | Accessory |                    5 |
| Velvet Coat    | Accessory |                    5 |
| China Dress    | Accessory |                    8 |
| Platinum Comb  | Accessory |                   10 |
| Ermine Coat    | Accessory |                   12 |
| Candleholder   | Treasure  |                    3 |
| Malachite Box  | Treasure  |                   10 |
| Mermaid Bangle | Treasure  |                   10 |
| Gold Bracelet  | Treasure  |                   15 |
| Garnet Brooch  | Treasure  |                   20 |
| Jade Jewelbox  | Treasure  |                   20 |
| Sapphire Ring  | Treasure  |                   20 |
| Ruby Ring      | Treasure  |                   25 |
| Ruby Scepter   | Treasure  |                   50 |
| Crown of Glory | Treasure  |                   60 |
| Diamond Crown  | Treasure  |                  100 |

This calculation is at `MAIN.EXE 0x2C928–0x2C9A7`.

### Investigation

Ask the waitress to investigate a named captain or fleet. The ordinary access
test requires either **40** or **80** favor, depending on bit 0 of her record's
flags byte; the exact threshold for each waitress is listed above. The check is
implemented as:

```text
required favor = floor(80 / (1 + low-threshold flag))
```

The waitress first asks for a nation (raw 534): one of Portugal through
Holland, or Piracy (names at `DS:0xA2C`). She then asks for a class (raw 535)
from `MENU.DAT` entry 44, “Merchant fleet / Convoy / Voyaging Fleet”, or for
Piracy entry 45, “Buccaneers / Corsairs / Privateer”. Cancelling the class
leaves no request. Record byte `+0x0D` keeps the nation in its low four bits
and the class in its high four. Byte `+0x0E` is the number of days, announced
with raw 536:

```text
days = random(3) + floor((110 − favor) / (5 × (1 + protagonist +0x29 bit 0x10)))
```

As the bit is never set, an investigation takes 14–16 days at 40 favor and
2–4 days at 100 (`0x2C9CD–0x2CAA4`). Each day `0x1E936` lowers `+0x0E` for
every record where it is neither 0 nor `0xFF`. Asking again before it reaches
0 gives raw 537.

Once it reaches 0, Investigation gives the report instead
(`0x2CAA5–0x2CCD6`): raw 538, then raw 539 with the class and nation, or raw
540 with the class for Piracy. The report covers every fleet of the class in
the nation's block of ten (fleet ID = nation × 10 + position): positions 1–4,
5–6, or 7–9 (table `1, 5, 7, 10` at `DS:0xB56A`). For each fleet:

- Destroyed (fleet `+0x29` bit `0x01` clear): raw 556 with its position
  within the class, as 1st, 2nd, 3rd (suffixes at `DS:0xB55C`).
- Otherwise raw 541 with the commodore's last name, followed by the objective
  fragment chosen by fleet `+0x1B` (dispatch table at `0x2CBED`; see
  [NPC fleet objectives](npc/fleet-objectives.md#objective-values)). Values
  above 9 add no fragment. If fleet `+0x21` is not `0xFF`, raw 544 names the
  cargo in a separate message. Raw 553 then gives the fleet's exact position
  (`0x2B08C`), unrounded and with no random element: raw 126/127 with
  `trunc(|640 − Y| × 8 / 57)` and raw 128/129 with `trunc(lon / 6)`, where
  `lon` is `(X + 1981) mod 2160`, folded to `2160 − lon` (west) above 1080.

The report then clears `+0x0D` and `+0x0E` to `0xFF`.

The favor gate is at `MAIN.EXE 0x2CCD7–0x2CD37`. It skips the threshold when
protagonist byte `+0x29` bit `0x10` is set (`0x2CD10–0x2CD14`), but no sailor
ever has that bit
([Sailor flags](fleets.md#sailor-flags-0x10-and-0x40)), so the favor
threshold in the table always applies.

### Ask Info

Request an immediate rumor. The useful choices are:

- **Job Info**: provides a hint for the current search or quest. It can point
  toward a Guild, Pub, cartographer, or other next lead, but is a hint rather
  than a replacement for the required quest interaction.
- **Port Info** (`0x2D06C`): gives local trivia about the current port, the
  same line as the Market woman's (raw 642 + port ID), but only when her
  favor is above 80; otherwise she answers raw 403, “Well, that's a secret!”.
  It is flavorful but generally has no mechanical benefit.

## House of Fortune Love reading

The House of Fortune's **Love** command looks for an eligible waitress record
at the current port and reads its favor byte directly. Eligibility requires a
matching port, bit `0x08` set in record byte `+0x0F`, and bit `0x40` clear in
that byte. The Pub's Waitress command uses the same test when the Pub is
entered (`MAIN.EXE 0x2D372`) and is grayed out when no record passes it. Hadi is the sole initialized attendant without `0x08`, so Cairo's
Love reading treats the port as having no eligible waitress despite its Pub and
House of Fortune. The four results are:

| Reading                                                              |                Favor range |
| -------------------------------------------------------------------- | -------------------------: |
| “It seems a girl called [name] is in love with you.”                 |                     80–100 |
| “Continue your effort, and your love will be accepted.”              |                      50–79 |
| “Take actions. No one gained love by just waiting for it to happen.” |                       0–49 |
| “As long as you are in this port, you won't have good luck in love.” | No eligible local waitress |

The comparisons are unsigned checks against 80 and 50 at
`MAIN.EXE 0x3342D–0x334A7`. The “in love” result is therefore a reading of the
same numeric favor field, not a separate permanent state or reward.

All waitress records initialize favor to 0, including Lucia's and Ladia's.
Scenario scripts change a few: João's opening sets Carlotta's and Lucia's favor
to 100 (`SNR1.DAT 0x041F–0x042C`) and later removes Lucia from the Waitress
command by clearing her flag `0x08` (`0x1A35–0x1A44`); Ali's story sets
Ladia's favor to 50 and later 100.
Story dialogue involving a protagonist and a waitress should not be confused
with this ordinary favor mechanic.

## Quest-related Job Info

For the common royal artifact search, **Job Info** is advisory only. Before the
Guild has chosen an informant it suggests visiting a Guild; afterward it points
generally to someone in a Pub. While carrying a map it suggests a cartographer,
and while carrying the recovered artifact it comments on that artifact. These
answers do not select the informant, reveal the exact person or port, advance
the search, or complete the mission.

The artifact reaction adds **10 favor**, capped at 100, if shared waitress flag
`0x40` is clear, then sets that flag. It therefore shares its one-time gate
with a nonpreferred story. A preferred story is different: that path explicitly
clears the flag before applying its own gain. The waitress command begins at
`MAIN.EXE 0x2D102`; the royal-mission Job Info handler and its favor update are
at `0x2CD38–0x2D06B`. See
[the royal-mission notes](scenarios/scenario-0-royal-missions.md#waitress-job-info)
for the full state flow.

## Open questions

None remain.
