# Waitresses

The game defines 29 named Pub-attendant records used by the **Waitress**
command, each attached to one Pub. Most ports do not have one. Selecting
**Waitress** at a Pub with such an attendant and paying the 10-gold tip opens
four commands: **Tell Stories**, **Give Gift**, **Investigation**, and **Ask
Info**.

Each waitress has her own favor value. All 29 values start at **0**, are stored
independently, and are capped at **100**. Raising one waitress's favor does not
affect another.

|  ID | Name      | Port           | Preference  | Investigation threshold | House of Fortune |
| --: | --------- | -------------- | ----------- | ----------------------: | :--------------: |
| 100 | Lucia     | Lisbon         | Everything  |                      40 |        No        |
| 101 | Ladia     | Istanbul       | Everything  |                      40 |       Yes        |
| 102 | Leticia   | Barcelona      | Treasure    |                      40 |        No        |
| 103 | Mathilde  | Marseille      | Accessories |                      80 |       Yes        |
| 104 | Theresa   | Genoa          | Treasure    |                      40 |       Yes        |
| 105 | Francesca | Venice         | Accessories |                      80 |       Yes        |
| 106 | Helen     | Athens         | Stories     |                      40 |       Yes        |
| 107 | Layla     | Alexandria     | Everything  |                      40 |       Yes        |
| 108 | Jamila    | Ceuta          | Treasure    |                      80 |        No        |
| 109 | Elaine    | Bordeaux       | Treasure    |                      80 |        No        |
| 110 | Lillian   | London         | Treasure    |                      40 |       Yes        |
| 111 | Johanna   | Antwerp        | Stories     |                      80 |       Yes        |
| 112 | Melanie   | Amsterdam      | Everything  |                      40 |        No        |
| 113 | Claudia   | Hamburg        | Stories     |                      40 |        No        |
| 114 | Viveka    | Stockholm      | Everything  |                      40 |       Yes        |
| 115 | Natasha   | Riga           | Accessories |                      40 |       Yes        |
| 116 | Isabella  | Havana         | Treasure    |                      80 |       Yes        |
| 117 | Lupe      | Margarita      | Everything  |                      40 |        No        |
| 118 | Silvia    | Rio de Janeiro | Treasure    |                      40 |       Yes        |
| 119 | Tobia     | San Jorge      | Everything  |                      80 |        No        |
| 120 | Tisa      | Argin          | Treasure    |                      40 |        No        |
| 121 | Shani     | Sofala         | Everything  |                      40 |       Yes        |
| 122 | Hadi      | Cairo          | Stories     |                      40 |       Yes        |
| 123 | Salma     | Mecca          | Accessories |                      80 |       Yes        |
| 124 | Aruna     | Goa            | Stories     |                      40 |        No        |
| 125 | Rukia     | Malacca        | Treasure    |                      80 |       Yes        |
| 126 | Titis     | Banda          | Accessories |                      80 |       Yes        |
| 127 | Mei-Yi    | Changan        | Everything  |                      40 |       Yes        |
| 128 | Onatsu    | Nagasaki       | Stories     |                      40 |        No        |

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

Once accepted, the investigation completes after a few days. The resulting
report is assembled from the fleet's current objective and can describe
returning home, investing, trading, waylaying or attacking fleets, pursuing a
captain, guarding a fleet, or guarding a port. If the fleet has cargo, the
report appends that fact. See [NPC fleet objectives](npc/fleet-objectives.md)
for the objective values and their exact waitress wording.

The favor gate is at `MAIN.EXE 0x2CCD7–0x2CD37`. An executable state bit can
bypass this ordinary threshold, so the table gives the normal favor requirement
rather than claiming it is the only possible access route.

### Ask Info

Request an immediate rumor. The useful choices are:

- **Job Info**: provides a hint for the current search or quest. It can point
  toward a Guild, Pub, cartographer, or other next lead, but is a hint rather
  than a replacement for the required quest interaction.
- **Port Info**: gives local trivia about the current port. It is flavorful but
  generally has no mechanical benefit.

## House of Fortune Love reading

The House of Fortune's **Love** command looks for an eligible waitress record
at the current port and reads its favor byte directly. Eligibility requires a
matching port, bit `0x08` set in record byte `+0x0F`, and bit `0x40` clear in
that byte. Hadi is the sole initialized attendant without `0x08`, so Cairo's
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
