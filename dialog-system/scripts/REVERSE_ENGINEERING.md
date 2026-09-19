# SNR reverse-engineering notes

This document records the evidence behind the structural SNR disassembler in
`snr.ts`. Keep confirmed behavior separate from hypotheses: the output is
useful now, but it is not yet a complete scenario-language decompiler.

## Inputs and responsibilities

- `SNR0` through `SNR6` each have a `.DAT` and `.MES` file.
- `.MES` holds null-terminated dialogue strings behind an offset table.
- `.DAT` holds the scenario program that selects messages, speakers, locations,
  conditions, effects, and branches.
- `SNR0` is shared quest content. Protagonist dialogue and player IDs establish
  `SNR1` as João, `SNR2` as Catalina, `SNR3` as Otto, `SNR4` as Ernst, `SNR5`
  as Pietro, and `SNR6` as Ali.
- `MAIN.EXE` loads and interprets the scenario program.

See the maintained [scenario guides](../../game-details/scenarios/README.md) for the
evidence-graded storyline maps built from these programs and runtime
observations.

Known input fingerprints for the English DOS data used during this research:

```text
575afe977111c10f66d444219d2e032a8b1e009c445f013b44d70c90570df28b  SNR1.DAT
0ad7f6ed42c9e22956d4b3973aacceffacb58e42880788019b7e74930d5562b1  SNR1.MES
6a02745af59b9a95918b42c2e5f8fe249a05f2d48bb33a6d54599536cb1a3eeb  MAIN.EXE
```

## Confirmed container formats

Multibyte values described below are big-endian, despite the game running on
little-endian x86.

### MES files

The first `u32` is both the first string offset and four times the message
count. It is followed by one `u32` offset per message. Each offset points to a
null-terminated string. Stored message indices are zero-based; public JSON IDs
are one-based.

For `SNR1.MES`:

- First string offset: `0x1294` (4,756)
- Message count: 1,189
- `$n` means the player's first name.
- `$s` means the player's last name.
- Some strings begin with `|Speaker label|\n`. This label is metadata and is
  removed from the displayed body.

### DAT files

Every parsed DAT begins with ASCII `SNDT`. Starting at file offset `0x10` is a
list of absolute `u32` section offsets terminated by `0xFFFFFFFF`.

`SNR1.DAT` has six sections:

| Section |    Start |      End | Parsed code start |
| ------: | -------: | -------: | ----------------: |
|       0 | `0x002C` | `0x0961` |          `0x005E` |
|       1 | `0x0961` | `0x12F7` |          `0x0979` |
|       2 | `0x12F7` | `0x1D4B` |          `0x131D` |
|       3 | `0x1D4B` | `0x2C4C` |          `0x1D7B` |
|       4 | `0x2C4C` | `0x2ED4` |          `0x2C62` |
|       5 | `0x2ED4` | `0x3CCE` |          `0x2EF6` |

### Scenario 0: shared quests and royal missions

`SNR0` is shared content rather than a protagonist-specific storyline. Its 272
messages divide into ordinary Guild/Bank contracts followed by missions offered
by rulers:

| Messages | Content                                                                       |
| -------: | ----------------------------------------------------------------------------- |
|    1–142 | Cargo transport, purchasing, letters, pirate suppression, and loan collection |
|  143–154 | Royal trading test                                                            |
|  155–185 | Deliver documents between rulers                                              |
|  186–216 | Negotiate a treaty                                                            |
|  217–227 | Establish allied ports                                                        |
|  228–237 | Make discoveries for the ruler                                                |
|  238–244 | Special search mission                                                        |
|  245–272 | Defeat a national fleet or pirates                                            |

The royal mission dialogue repeatedly promises and awards a new title. Section
0 selects the largest individual Trade, Piracy, or Adventure Fame value; ties
prefer Adventure, then Piracy, then Trade. Eligibility compares that value
with `500 × (current rank + 1)²`. Pirates are ineligible, and Duke is the
highest title. These rules are decoded and supported by controlled tests.

`DATA1/DATA1.016` and `.017` both contain the same nine fixed-width title names:

| Stored rank | Title                                                |
| ----------: | ---------------------------------------------------- |
|           0 | No Rank (implicit; absent from the title-name files) |
|           1 | Page                                                 |
|           2 | Squire                                               |
|           3 | Knight                                               |
|           4 | Baronet                                              |
|           5 | Baron                                                |
|           6 | Viscount                                             |
|           7 | Earl                                                 |
|           8 | Marquis                                              |
|           9 | Duke                                                 |

The executable contains a related title table. At `MAIN.EXE` file offset
`0x474B8` is this contiguous ten-entry little-endian `u16` table:

```text
0, 500, 2000, 4500, 8000, 12500, 18000, 24500, 32000, 40000
```

This table ends with 40,000, but it is not the royal-mission eligibility rule.
`SNR0` computes the next threshold directly from the next rank. Controlled
Marquis tests reject 40,000 and accept 40,500 for promotion to Duke.

Each section begins with two tables:

1. A `u16` byte length followed by section-relative entry offsets and a
   `0xFFFF` terminator.
2. Pairs of `u16 route key, u16 table-relative destination`, terminated by
   `0xFFFF, 0xFFFF`.

The second table begins immediately after the first and establishes the VM's
destination base. Adding a route destination to that table's start produces its
absolute file offset. In João section 0, the base is `0x0032`: route key `1`
reaches the pub code at `0x02CC`, and route key `7` reaches the special-building
code at `0x005E`.

Each entry offset from the first table points to another route table. Those
nested tables establish their own destination bases. Branches within code
reached through a nested table use that nested base. This was confirmed from the
interpreter and resolves the earlier apparent destinations inside dialogue
operands.

The route key is two independent bytes, not one opaque `u16`: a selector byte
followed by a qualifier byte. The runtime matcher compares both bytes. A
qualifier of `0xFF` is a wildcard. For protagonist scripts, selectors
`0x00`–`0x63` are the 100 regular port IDs, and selector `0xA3` is the fallback
for any regular port. In port routes, the qualifier is the building/context ID.
For example, `0xA301` means any regular port's Pub and `0xA303` means any
regular port's Harbor. The shared-SNR matcher accepts 130 port selectors
(`0x00`–`0x81`) before its `0xA3` fallback.

## MAIN.EXE scenario VM

The following `MAIN.EXE` offsets are absolute file offsets for the fingerprint
listed above:

- `0x3854F` selects the protagonist digit in `SNR*.DAT` and `SNR*.MES`, opens
  those files, and separately opens the shared `SNR0` pair.
- `0x38593` reads a section offset, loads the selected section into an allocated
  buffer, resets the VM instruction offset, and initializes interpretation.
- `0x382B7` and `0x382CB` read a big-endian byte and `u16` respectively from the
  current scenario stream.
- `0x38F4F` is the interpreter loop. It dispatches on the top two opcode bits.
- `0x38C07` handles `0xC0`–`0xFF` through a 64-entry jump table beginning at
  `0x38C2B`.
- `0x39085`/`0x39129` match and dispatch shared-SNR routes;
  `0x391C6`/`0x3927C` do the same for protagonist routes.
- `0x2052F` dispatches protagonist route selector `0xA0` while at sea and
  supplies `DS:0x2BAA` as its qualifier. Controlled saves identify that value
  as the current voyage-day counter.
- `0x150E5`/`0x15107` dispatch selector `0xA1` immediately before protagonist
  and shared naval-battle handling. `0x16191`/`0x1619C` dispatch `0xA2` after
  that handling. The protagonist qualifier comes from `DS:0x0EDA`; the shared
  qualifier comes from `DS:0x0F64`.
- At `0x163F2`, battle setup compares the two participant IDs with
  `DS:0x1439`, the current protagonist's zero-based sailor ID, and stores the
  other participant in both qualifier fields. Thus the `0xA1`/`0xA2`
  qualifier is the opposing captain's sailor ID.

The four opcode families are now structurally decoded:

| Range         | Interpreter handler | Role                                       |
| ------------- | ------------------: | ------------------------------------------ |
| `0x00`–`0x3F` |           `0x3873E` | assignment, including scenario flag writes |
| `0x40`–`0x7F` |           `0x3893E` | arithmetic and bit operations              |
| `0x80`–`0xBF` |           `0x38A78` | comparisons with conditional destinations  |
| `0xC0`–`0xFF` |           `0x38C07` | presentation/game actions and VM control   |

Relevant VM globals include current section at `DS:0x060E`, subsection at
`DS:0x060F`, scenario-flag pointer at `DS:0x0610`, variable-array pointer at
`DS:0x0612`, instruction offset at `DS:0x0614`, and the current DAT/MES handles
at `DS:0x0616`/`DS:0x0618`.

Runtime comparison also establishes an executable-level restriction on
after-battle selector `0xA2`. Catalina's armed section-6 wildcard route
`0xA2FF` runs after a normal naval victory but not after a successful escape.
The route itself contains no general battle-result comparison; the distinction
is made before the scenario interpreter is called. From one controlled
pre-battle state, escape left the story at section 6/subsection 1 and produced
only the opponent captain's ordinary retreat line, whereas victory ran the
informant scene and advanced to subsection 2.

Assignment source selector 4 reads `DS:0x0736`, the zero-based current day of
the month, through the handler at `MAIN.EXE` file offset `0x3884C`. Selector 5
reads `DS:0x0E32`, the current port ID, at `0x38851`. Selector 7 reads
`DS:0x0737`, the time-of-day value in 20-minute ticks, at `0x3885B`. The query
tool can therefore resolve comparisons using all three values directly from a
save.

Catalina's Lucia sequence confirms selector 4's lifecycle. Its Lisbon Pub
agreement copies selector 4 to persistent scenario variable 0. Later Pub and
Lodge routes compare the current selector-4 value with that stored day and use
scenario variable 16 as an independent interaction counter. Pub or early
Lodge visits increment the counter; elapsed time alone does not. A different
day selects the late dialogue. Controlled saves remain on stored day 8 from
18:40 through 23:20 and select the same-day branches, while the 00:00 save has
day 9 and selects Lucia's late branch.

The 64-word VM variable array is persisted in each save slot beginning at
relative offset `0x3A`. This is confirmed directly by the 8,000-fame Pub route:
its final `0F 00 05` stores the current port ID in variable 0, and
The post-Pub capture contains `0x0001` there while João is in Seville (port 1).

Action opcode `EB <variable> <u16-bound>` assigns a random value in the range
zero through `bound - 1`. Its handler at `MAIN.EXE` file offset `0x38E87` reads
the variable and bound, calls `0x37F4F`, divides a generated non-negative value
by the bound, and stores the remainder in the selected VM variable.

Before each protagonist-scenario dispatch, the routine beginning at
`MAIN.EXE 0x3914B` reconstructs the 32-bit RNG seed as follows, using the date
bytes in their saved zero-based form:

```text
seed = ((year - 1501)
        * (month - 1)
        * (navigation level + navigation experience)
        + time-of-day ticks
        + (day - 1)) << 8
```

Arithmetic wraps to 32 bits. Each `EB` call then advances and reduces the
state:

```text
state = state * 0x5D588B65 + 1       # modulo 2^32
value = (state >> 8) & 0x7FFF
result = value % bound
```

The seed is rebuilt for each protagonist dispatch, so a fixed save state gives
a deterministic `EB` result. This resembles the shared-`SNR0` seed, except
that the protagonist-scenario formula includes the saved time-of-day. The
query tool reproduces both the seed and successive `EB` draws.

Action opcode `EA <variable>` stores the displayed Gold Ingots component in
the selected VM variable. Its handler begins at `MAIN.EXE 0x38E7C`, reads
the destination operand, and calls `0x37F26`. That callee divides the 32-bit
combined on-hand gold value at `DS:0x1432`/`0x1434` by 10,000 and stores the
quotient in the VM variable. The gold address corresponds to save-slot relative
`0x60A`. Thus a stored value of 25,000 is displayed as 2 Gold Ingots and 5,000
Gold Coins: the ingot count is `floor(value / 10,000)` and the coin count is
`value % 10,000`.

Pietro's section-1 Pub route uses `EA 01`, rejects values below 1, rejects port
IDs below 42, and then scans twenty item records for the empty marker `0xFF`.
The indexed field pattern is `D0 04 06 02 3F`, followed by indirect read
`05 03 04`; variable 2 is incremented from 0 through 19. This resolves the
Golden Medallion activation as at least 10,000 combined on-hand gold, a port ID
of at least 42, and one empty item slot—not 1,000 Adventure Fame plus 2,000
gold.
The resolved reference retains variable 2 as a live index rather than capturing
its value when `D0` runs: the loop jumps back to the indirect `05` read, not to
`D0`, and advances through two occupied slots before finding slot 2 in the
controlled Pietro saves.

Controlled Madeira captures at 9,999 and 10,000 gold hold Adventure Fame at
zero and keep the story, time, port, and inventory conditions equivalent across
the boundary. Runtime testing confirms that 9,999 falls through to the ordinary
Pub, while 10,000 triggers message 109 and the Golden Medallion scene. The
`EA >= 1` interpretation is therefore both executable-decoded and
runtime-confirmed.

Ali's section-3 and section-4 Harbor gates use a different indexed pattern.
`D0 01 0C 00 13` selects byte `+0x13` from the regular-port record indexed
by live variable 0. The script scans all 100 records, masks the byte with
`7`, and counts values equal to `2`, the Ottoman/Turkish control value.
This is the same cached controller field used by the Palace economic-power
calculation. The loop covers port IDs 0 through 99 with no capital exclusion,
so Istanbul contributes to the count. The respective thresholds are exactly
30 and 50 ports.

Both sections place Istanbul's specific Harbor route `0x0203` before the
any-regular-port Harbor route `0xA303`. The counting route must therefore be
triggered at a non-Istanbul Harbor. On success it sets the scenario flag
immediately without dialogue; later Istanbul routes expose the result through
Radino's transfer or the Palace summons.

Ali's section-2 `EA >= 100` boundary is also runtime-confirmed. With 99
displayed Gold Ingots, the voyage-day-1 route does not advance the story and
the Istanbul Harbor retains its post-Palace dialogue about the Sultan
preparing for war. With 100 ingots, the building check arms the transition,
the voyage-day-1 route advances the subsection, and the following Harbor visit
uses the João/Ladia story route.

Ali's final Venice Bank sequence also demonstrates persistent price state. On
the first visit, it stores
`min(current displayed Gold Ingots + 500, 10,000)` in scenario variable 21.
Later visits compare `EA` with that cached target. The successful branch does
not subtract the target amount: Howell reveals that the Istanbul house is a
gift.

`AC <flag> <destination>` falls through when the flag is clear and jumps when
it is set. `AD` has the opposite polarity: it jumps when the flag is clear.
`FE <destination>` is unconditional. `F2` stops the interpreter. `F0` and `F1`
request subsection and section advancement after the interpreter returns. The
`F1` path increments the section byte, resets the subsection, clears four flag
bytes, and loads the new section. This independently corroborates the observed
save-state transition at `0x00C7`–`0x00CA`.

`F8` returns the forced-building-exit/menu-suppression result. Its handler at
`MAIN.EXE` file offset `0x38EE3` writes zero through the caller-provided control
pointer held in the interpreter frame. Controlled Pietro routes isolate its
visible effect: messages 97–98 at `SNR5.DAT 0x0489` end in `F8 F2` and eject
Pietro from the Genoa Church, while messages 99–100 at `0x049A` end in `F2`
alone and leave the Lodge usable. Ejecting Pub messages 90–91 and wildcard
messages 101–102 likewise end in `F8 F2`.

Executable tracing and live tests establish these João opening contexts:

| Route key | Selector and qualifier meaning                                          |
| --------: | ----------------------------------------------------------------------- |
|  `0x0000` | Port 0, Market                                                          |
|  `0x0001` | Port 0, Pub                                                             |
|  `0x0002` | Port 0, Shipyard                                                        |
|  `0x0003` | Port 0, Harbor                                                          |
|  `0x0005` | Port 0, Palace                                                          |
|  `0x0007` | Port 0, special building (João's home in Lisbon)                        |
|  `0x0009` | Port 0, Item Shop                                                       |
|  `0x000A` | Port 0, Church                                                          |
|  `0x00FF` | Port 0, wildcard context; reaches shared Bank/Lodge/Guild handling here |
|  `0xA001` | At sea on voyage day 1; silently advances João's opening subsection     |
|  `0xA003` | At sea on voyage day 3; nested route that introduces and names Domingo  |
|  `0xA303` | Any regular port, Harbor                                                |
|  `0xA3FF` | Any regular port, wildcard context                                      |

Across all scenarios, `0xA1xx` destinations contain fleet challenges and
other pre-battle dialogue, while `0xA2xx` destinations contain surrender,
search, and other aftermath dialogue. Together with their placement around
the executable's naval-combat path, this identifies selector `0xA1` as
before-naval-battle and `0xA2` as after-naval-battle. Qualifier `0xFF` remains
the wildcard. The two specific qualifiers present in the supplied scenario
files resolve through the save's 120-record sailor table:

| Qualifier | Zero-based sailor ID | Captain          |
| --------: | -------------------: | ---------------- |
|    `0x01` |                    1 | Catalina Erantzo |
|    `0x3C` |                   60 | Antonio Khan     |

The ID names the captain used by the naval-combat system. It need not be the
portrait speaking every line in the surrounding story scene; for example,
other plot characters can introduce or react to that battle.

João section 0 first matches the primary `0xA001` route at DAT `0x08A2`. Its
entire program is `F0 F2`: advance the subsection, then stop. The resulting
nested table at `0x08A4` contains `0xA003`, whose destination `0x08B0` begins
the Domingo dialogue. Thus the third-midnight event is not the meaning of
`0xA001`; day 1 arms the next subsection and day 3 triggers it.

The earlier Sunday interpretation was also disproved by controlled date tests:
setting sail on May 18 triggers the event on May 21 at 00:00, while setting sail
on May 19 triggers it on May 22 at 00:00.

Controlled port-entry and midnight captures complete the counter lifecycle.
At sea, crossing midnight increments `DS:0x2BAA`; the corresponding handler at
`MAIN.EXE 0x1E979` executes `FE 06 AA 2B`. Entering Lisbon preserved the saved
value of 3 while advancing the clock from 06:40 to 07:00, exactly one 20-minute
tick. The value remained present while ashore. Choosing Sail then cleared it
to 0 at `MAIN.EXE 0x2D7B4` (`C6 06 AA 2B 00`), before the next voyage began.
The Harbor uses the ordinary building-duration roll of `2 + random(3)`
20-minute ticks. Its entry routine returns that duration, and the town loop
adds it to `DS:0x0737` at `MAIN.EXE 0x204A7` even if the Harbor interaction has
just changed the player's state to at sea. The Sail path itself does not add a
separate tick. The captured 07:00-to-08:00 Harbor/departure interaction
therefore rolled three ticks, or 60 minutes.

A separate uninterrupted at-sea pair moved from April 20 at 23:20 with counter
0 to April 21 at 00:00 with counter 1. Thus `0xA0` receives the number of
midnights crossed during the current voyage: it increments at midnight while
at sea and is reset when the player sets sail, not when the saved state first
changes from sea to port. Arrival's separate one-tick clock increment is at
`MAIN.EXE 0x2051E`; it is not a departure cost.

`0x0862` is a DAT dialogue-instruction offset, not another route key. Message
190 at that offset ("Well this is a surprise...") can appear in both the Bank
and Lodge, while message 188 at `0x0851` ("Just a little advice...") can appear
at the Guild. These are branches of João's wildcard scenario handler, not
building-specific ordinary greetings. They are selected by `EB 00 0003` using
the deterministic protagonist-scenario seed described above. Route keys are
therefore not always one-to-one universal building identifiers.

## Confirmed dialogue instructions

Portrait dialogue has this fixed form:

```text
C0 <position> CC <character-index:u16be> C8 <message-index:u16be> C7
```

`position` is currently observed as `1` or `2`. Character and message indices
are stored zero-based and converted to one-based JSON IDs.

Runtime captures resolve the positions spatially: position 1 is the upper
dialogue panel and position 2 is the lower panel. Multiple consecutive lines
may reuse either position. The ordinary vendor image is restricted to the
upper panel; scenario characters can visually cover it there or appear below.
Dismissing a line clears its text while retaining the panel and portrait. The
other panel therefore remains visible, with its previous portrait and an empty
text area, when the next line moves between positions.

Ordinary vendor artwork comes from `GRAPH.DAT`, separately from the scenario
character selected by `CC`. Zero-based records 6–17 correspond to building IDs
1–12 in order. Church/Mosque is the one variant: Church uses record 16 and
Mosque uses record 20. Special residences retain record 13 regardless of
whether their current speaker is a collector, cartographer, teacher, or story
occupant.

Text without a portrait uses:

```text
C0 00 C8 <message-index:u16be> C7
```

Runtime observation of Catalina questioning a Pub bartender establishes the
building-context behavior of position 0. It writes the selected message into
the existing upper vendor panel without a scenario `CC`; the bartender remains
visible while the lower Andreas panel persists with cleared text. Position 0
should therefore be described as using the surrounding building speaker, not
as displaying portraitless text. Its behavior outside building interactions
is not yet generalized.

The same captures distinguish presentation lifetime from the extractor's
structural `dialogueRun` grouping. João's 1,000-coin reward splits two runs but
does not clear either panel. The gold display changes and Rocco replaces the
upper portrait while João remains below. A later `C4`, immediately after João
says “Lucia!”, visibly closes both scenario panels with horizontal wipes,
reveals the ordinary Pub vendor underneath, and allows the following line to
construct a new upper panel.

`SNR1.DAT`–`SNR6.DAT` use `CC` after nonzero dialogue positions. `SNR0.DAT`
instead uses the indirect form:

```text
C0 <position> CD <variable:u8> C8 <message-index:u16be> C7
```

The `CD` handler at `MAIN.EXE` file offset `0x38D5C` reads the one-byte
operand, doubles it to index the VM's 16-bit variable table, loads that word,
and calls the same portrait-selection routine as the `CC` handler at
`0x38D52`.

In the royal-mission sections, variable 50 is recomputed from the protagonist's
current affiliation. The script obtains the player fleet's commander through a
group-2 record, follows the resulting group-3 sailor record to byte `+0x29`,
and masks that affiliation value with `0x07`. It then maps the nation to its
ruler's zero-based character index. Variable 51 is mapped separately from the
diplomatic mission's stored destination-nation variable. Neither selection is
derived merely from the capital building currently on screen.

The six values assigned according to nation are `0x14`, `0x18`, `0x1D`,
`0x1B`, `0x25`, and `0x1C` for Portugal, Spain, Ottoman Turkey, England,
Italy, and Holland respectively. A Holland-to-England document mission
runtime-confirms variable 50 selecting the Dutch Governor-General for the
offer, variable 51 selecting King Henry at the destination, and variable 50
selecting the Dutch Governor-General again on return. Every line remains in
position 1, the upper scenario panel. Ordinary Palace dialogue still selects
the ruler belonging to the capital being visited through a separate
location-driven path.

The extractor now recognizes this compound form and records
`characterVariable` separately from a fixed `characterId`. This recovers 83
indirect-character dialogue occurrences in `SNR0`: 59 through variable 50 and
24 through variable 51.

Consecutive instructions are emitted as a `dialogueRun`. An action, condition,
or unknown instruction between two lines causes a new run even if the player
would regard both runs as one conversation.

## João opening evidence

All offsets below point to the leading `C0`, not the following position byte.

| Event               | First public message |     DAT offset | Completion candidate         |
| ------------------- | -------------------: | -------------: | ---------------------------- |
| Mother at night     |                    2 | `0x0082` (130) | `2C 01 01` at `0x0123` (291) |
| Father introduction |                   23 | `0x0160` (352) | `2C 00 01` at `0x02C4` (708) |
| Initial pub scene   |                   63 | `0x02E1` (737) | `2C 04 01` at `0x0323` (803) |

Examples:

```text
C0 02 CC 0000 C8 0016 C7  João, position 2, public message 23
C0 01 CC 0013 C8 0001 C7  Duchess, position 1, public message 2
C0 01 CC 0061 C8 003E C7  Carlotta, position 1, public message 63
```

The repeated three-byte form `2C <small index> <0|1>` occurs where one-shot
conversations complete. It is therefore classified as a likely Boolean
scenario-state write. Its placement and the save-game comparison below both
support that interpretation.

Live testing confirms that after João sees the initial pub introduction, a
later visit displays message 62 at `0x02D4` ("Master ... you’d better be heading
home now") instead of replaying message 63 at `0x02E1`. The introduction writes
`2C 04 01` at `0x0323`, while nearby candidate branches reference flag 4 at
`0x02D0` and `0x02DD`. This strongly associates Boolean flag 4 with whether the
opening pub scene has already played.

### Save-game scenario state

The game stores all ten save slots in its shared save file.
Three controlled scene pairs establish that file offset `0x00C9` is the first
scenario-flag byte in the captured save slot:

| Scene               | DAT command | Save change at `0x00C9` |
| ------------------- | ----------- | ----------------------- |
| Father introduction | `2C 00 01`  | `00 → 01`               |
| Mother at night     | `2C 01 01`  | `21 → 23`               |
| Initial pub scene   | `2C 04 01`  | `00 → 10`               |

The masks are exactly `1 << flag`, confirming that `2C <flag> 01` sets the
corresponding persistent bit. Offset `0x00C9` therefore stores flags 0–7;
`0x00CA` is the strong candidate for flags 8–15.

The Domingo save pair reveals section-level state. Before the event, offsets
`0x00C7`–`0x00CA` contain `00 01 3F 0F`; afterward they contain `01 00 00 00`.
The `0x00C7` transition from 0 to 1 aligns exactly with advancing from SNR1
section 0 to section 1, while the flag bytes are cleared for the new section.
The voyage was continuous and no port was entered. `0x00C8` is therefore a
candidate for intermediate progression state, but its exact role remains
unknown. Separately, the same pair changes slot-1 file offset `0x1E19` from 2
to 3. That offset corresponds to runtime `DS:0x2BAA`, which `MAIN.EXE` passes
as the qualifier for the at-sea `0xA0` route. This independently connects the
save byte, executable dispatcher, and nested `0xA003` route.

### Save-game clock

Three dated captures decode the following fields in the captured save slot:

| File offset | Meaning | Encoding                                               |
| ----------: | ------- | ------------------------------------------------------ |
|    `0x009D` | Year    | Zero-based within the 1500s; 21 is 1522 and 22 is 1523 |
|    `0x009E` | Month   | Zero-based; value 4 is May                             |
|    `0x009F` | Day     | Zero-based; 16 is May 17 and 17 is May 18              |
|    `0x00A0` | Time    | Number of 20-minute ticks since midnight               |

The time encoding is confirmed by values 24 at 08:00, 28 at 09:20, and 39 at
13:00. A January 1, 1523 capture contains `16 00 00 00` at `0x009D`–`0x00A0`,
confirming the simultaneous year, month, day, and time rollover. The
human-readable save label beginning at file offset `0x0001` also contains the
displayed date but is not the gameplay clock field.

The mother's time window is now decoded sequentially at DAT `0x007A`:

```text
0F 01 07       read system value 7 (time-of-day ticks) into VM variable 1
8E 01 42 00F7  jump to table-relative 0x00F7 when variable 1 < 0x42
```

`0x42` is 66 decimal, or 22:00 in 20-minute ticks. The branch skips the scene
before 22:00; after midnight the clock returns to zero and also takes the skip.
This statically explains the runtime-confirmed inclusive 22:00–00:00 window.

`AC <flag> <table-relative destination>` and
`AD <flag> <table-relative destination>` repeatedly guard these blocks. The
interpreter confirms that `AC` jumps when the flag is set, while `AD` jumps when
the flag is clear.

## Music evidence

The initial pub introduction contains two commands between dialogue runs:

```text
0x02FC  message 66: "Oh, don’t worry, Lucia and I have been friends forever!"
0x0305  C4
0x0306  CA 04
0x0308  message 67: "By the way, ... Rocco came by here looking for you."
```

Live testing observes a brief pause and screen clear after message 66. The
João theme then starts when message 67 appears, replacing the ordinary Pub
music. Later observations prove that these are independent instructions:
`C4` causes a scene break or screen clear, while `CA <track ID>` selects music.

The supplied transition captures account for every audible change with an
adjacent `CA` instruction:

| Bytes   | PC track                      | Confirmed transitions |
| ------- | ----------------------------- | --------------------: |
| `CA 04` | João / “Caprice for the Lute” |                     2 |
| `CA 05` | Catalina                      |                     3 |
| `CA 06` | Otto                          |                     1 |
| `CA 10` | Battle / “The Chase”          |                     4 |
| `CA 13` | Pub / “Fiddler's Green”       |                     2 |

An additional controlled audition of the previously unnamed bounds established
`00` as Opening / “Wind Ahead,” `01` as Ending A and the Duke-promotion music,
`02` as Ending B / “Close to Home,” `03` as Initial Setup, and `15` as the
naval-victory Fanfare. Together with the executable's environmental and result
selectors, this completes the PC range `00`–`15`.

The operands are the PC executable's internal hexadecimal track IDs. The
disassembler writes the same values in decimal in generated JSON.

`CA`'s handler at `MAIN.EXE 0x38D20` reads its byte operand and calls the
wrapper at `0x37980`. That wrapper passes the ID to the central music driver at
`0000:952E`. Non-scenario systems call the same driver directly:

- port entry derives `0x0A` through `0x0F` from the port's music-region field
  and calls the driver at `0x20682`;
- ordinary building entry plays `0x13` for a Pub or `0x12` for a Palace at
  `0x20A0E`; other building types make no music call and retain the port track;
- after a naval victory, `0x15B4A` selects `15` for the brief initial victory
  report; after the player acknowledges it, `0x15BB3` selects `11` for the
  post-battle gold/item reward sequence. The defeat path selects `14` at
  `0x15D6E`, and the game-over path does the same at `0x1C8C9`. Another
  non-scenario presentation flow selects raw track `03` at `0x1C2B8`, but that
  flow's exact role remains unnamed;
- the music-option path resumes the saved current track from `DS:0x903A` at
  `0x26BA6` when music is re-enabled.

The disassembler emits all `CA` instructions as `musicCueCandidates` and all
observed `C4` instructions as `sceneBreakCandidates`. No other SNR presentation
opcode has been found to select music. In particular, `C3` calls the dialogue-
panel cleanup routine at `0x37850`; it is not an alternate music command.

## Duel and event-art evidence

The sequence `E8 3C` occurs at `0x0CA6` immediately after the shipyard
confrontation and before the win/loss branches. It occurs again at `0x0FFF`
immediately before the second duel in João's home, plus two other scenario
locations. It is therefore emitted as a `duelStartCandidate`; its operands and
the following result-branch instructions remain unresolved.

Immediately before message 293, the scenario executes:

```text
0x0D3B  C0 03 CB 0070 0018 00
```

This fixed form occurs 39 times on reachable paths across the protagonist
scenarios and is emitted as an `eventArtCandidate`. There are no reachable
`CB` instructions in `SNR0`. Every call has coordinates `0x0070,0x0018`; only
the final byte varies from 0 through 5.

The `CB` handler at `MAIN.EXE` file offset `0x38D2A` reads two big-endian words
and one byte, then calls the graphics routine through `0x3799A` with the words
as x/y coordinates and the byte as the zero-based record index. The resulting
destination is `(112, 24)`. `MAIN.EXE` keeps an event-art data handle opened
from the `C:EVENT*.DAT` pattern; runtime captures establish that protagonist
scenario `n` resolves to `EVENTn.DAT`.

The visible captures match both family and index: Catalina uses `EVENT2`
records 4 and 0, Pietro uses `EVENT5` records 0 and 2, and Ali uses `EVENT6`
records 1 and 3. Ali's four payment branches contain four separate `CB` calls
that all select record 1. The event art is therefore a bytecode presentation
action, not metadata attached to the selected message.

The conventional sequence is `C4`, `C0 03`, `CB`, followed by a position-2
portrait/message line. The renderer runs before that first line is presented,
so the event art becomes the upper scene image while subsequent dialogue uses
the lower panel. A few branches enter the same art form without an immediately
adjacent `C4`, showing that clearing and drawing are separate operations.

The reachable VM calls do not reference `EVENT0` record 0 or records 2, 3, 0,
2, 5, and 0 in `EVENT1` through `EVENT6`, respectively. This does not prove
that the images are unused: executable-side callers and unreachable bytecode
remain possible.

## Fame evidence

The following nine-byte pattern surrounds explicit storyline fame values:

```text
0C 02 <threshold:u16be> 82 01 02 <unknown:u16be>
```

The final operand is deliberately exposed as `trailingOperand`; it must not be
treated as a branch destination until opcode `0x82` is understood.

João's recognized checks are:

| DAT offset | Threshold |
| ---------: | --------: |
|   `0x09E9` |     2,000 |
|   `0x13C3` |     8,000 |
|   `0x1DDB` |    16,000 |
|   `0x1E60` |    16,000 |
|   `0x2CCA` |    30,000 |
|   `0x2F5F` |    40,000 |

Live testing identifies which fame category drives each protagonist's scenario:

| Scenario            | Fame category  |
| ------------------- | -------------- |
| João, Pietro, Ernst | Adventure fame |
| Otto, Catalina      | Piracy fame    |
| Ali                 | Trade fame     |

A controlled runtime comparison confirms that Catalina's first comparison is
also the practical boundary. Entering the Harbor at Piracy Fame 0 produces no
story dialogue, while entering it at Piracy Fame 1 selects message 173,
Emilio's warning about a harbor rumor. The ordinary Harbor dispatcher therefore
adds no higher effective Fame requirement to the explicit scenario comparison.

The same route does not place the five Spanish fleets around Catalina's current
position. At `SNR2.DAT 0x0892–0x08E8`, it loads the literal coordinates
`(0x008E, 0x0176)`, or `(142, 374)`, and writes them to fleet IDs 15–19. It then
sets objective 7, target sailor 1 (Catalina), and flags `0x41`. Seville's raw
port coordinate is `(142, 372)`. In the post-departure runtime capture,
Catalina is at `(146, 383)` while all five pursuers remain together at
`(142, 374)`; their navigation targets have updated to Catalina's position.
Thus the fleets spawn immediately outside Seville and pursue Catalina from
there.

Controlled section-2 comparisons confirm the later Catalina boundaries and
their less obvious lifecycle. At 1,499 Piracy Fame, an eligible ordinary
building in Ceuta produces no story event; at 1,500 it selects messages
230–239 and advances the subsection. This also corrects the port comparison:
the route continues only when the current port ID is **below 42**, not at least 42.

At 1,999 Fame, the section-2 Pub questioning repeats indefinitely. At 2,000,
the same visible questioning runs once but `F1` advances to section 3. The next
Pub visit in section 3/subsection 0 deliberately has no story dialogue and uses
`F0` to advance the subsection. A third Pub visit then selects messages
257–259, beginning with Andreas's reminder that they still have not found João.

Catalina's section-4 search contains a similar-looking but structurally
different transition. After the first Pub questioning at Perot's selected
port, the next subsection's table gives the Pub, Palace, and context `0x15`
explicit stop routes. Messages 372–375—the decision to wait for João—are on
the `0xA3FF` route and run only when the current port still equals Perot's
stored destination. Runtime testing confirms that entering the Guild selects
this route, after which returning to the Pub produces messages 377–388. Thus
the correct sequence is Pub → wildcard-routed non-Pub building → Pub, not
three consecutive Pub visits.

The query now resolves this directly. `DC 00 01 <protagonist> 00` obtains the
14-byte protagonist Fame-record reference, `4C` advances that reference to the
required Fame word, and assignment opcode `04` reads the little-endian word.
The analogous group-3 reference and byte read resolve the sailor affiliation
check. These reads remove the formerly ambiguous branches from the Catalina
1,500- and 2,000-Fame queries.

### Cartography and Ernst's map reports

Runtime observation establishes that drawing a map requires both the
Cartography skill and a signed cartographer contract. Cartography is bit
`0x08` in the sailor skill mask. Known cartographers are Mercator in Amsterdam,
Gerard de Jode in Antwerp, Diogo Ribeiro in Barcelona, Olives in Palma, and
Giovanni Verrazano in Venice; each can teach the skill or accept a contract.

The chart bitmap begins at runtime `DS:0x0F6C`, which is save-slot-relative
offset `0x0144`. It occupies 540 bytes: 45 rows with a 12-byte stride. Each row
contains 90 usable chart bits and 6 padding bits, giving 4,050 cells. This is a
finer grid than `world-map-grid.png`, whose 30 × 15 cells describe wind and
weather regions. A chart cell corresponds to 24 × 24 pixels in the 2160 × 1080
`world-map.png`, or 6 × 6 pixels in the 540 × 270 world-map viewport framed by
`graph-025-640x400.png`.

New-game initialization at `MAIN.EXE` file offset `0x1B90A` clears the bitmap,
then sets columns 4–16 and rows 8–17: a 13 × 10 rectangle containing 130 cells.
It also increments the total-known counter at `DS:0x1192` to 130. The fresh
played save confirms exactly those 130 bits and that counter value. A later
save contains 142 bits and counter value 142.

The chart-update paths around file offsets `0x0BF20` and `0x0C100` increment
both `DS:0x1192` and the unreported-cell counter at `DS:0x1194` only when a
previously clear bit is set. At `0x33D10`, the report routine multiplies the
unreported count by 5, limits the addition so total adventure fame does not
exceed 50,000, adds it to the protagonist's adventure-fame field, and resets
`DS:0x1194` at `0x33D4D`.

The supplied `initial-map.png` and `initial-map2.png` screenshots independently
confirm the unit. Their viewports have different screen offsets, but align on
the same 540 × 270 map. The first contains the 130-cell starting rectangle; the
second reveals exactly three additional 6 × 6-pixel cells at displayed grid
columns 37–39, row 7. Reporting those cells awarded 15 adventure fame, exactly
`3 × 5`.

The preceding calculation at `0x33CA0` computes the gold reward as:

```text
new chart cells × 20 × (5 − (cartographer[0x16] & 0x03))
```

The observed 240-gold reward for three cells is 80 per cell and therefore
corresponds to modifier 1. The five 24-byte cartographer records are consecutive
save-state records for Giovanni Verrazano, Gerard de Jode, Diogo Ribeiro,
Olives, and Mercator. Every record contains `0x09` at `+0x16`, so every known
cartographer has modifier 1 and pays the same 80 gold per cell. The field's
broader gameplay meaning remains unknown, but it does not distinguish these
cartographers' rewards.

The five-record table begins at save-slot-relative offset `0x1A3A`; each
record is 24 bytes, with its port ID at `+0x17`. The active-contract flag is
bit `0x10` at `+0x16`, in the same byte as the two-bit reward modifier. A
controlled intermediate save proves that Mercator's record changes from
`0x09` to `0x19` during Ernst's first Mercator scene, before the required
Harbor visit, while the other four records remain unchanged. The Harbor visit
advances the story from section 0/subsection 1 to section 1; it does not grant
the contract. That transition stops the Mercator reminder from ejecting Ernst
and allows the ordinary cartographer menu, including Report, to remain open.
Ernst therefore receives Mercator's contract automatically rather than
explicitly choosing Contract.

The executable independently confirms the interpretation. The ordinary
contract handlers at file offsets `0x33600` and `0x33A70` clear bit `0x10`
from the other records and set it on the selected cartographer. The menu path
tests the same bit at `0x339C3` and `0x33A07`; the report-reward calculation at
`0x33CB9` masks the same byte with `0x03`, leaving contract status separate
from the reward modifier.

Scenario action `DC` resolves a game-state field reference and stores it in a
VM variable; its handler is at `MAIN.EXE 0x38D76`. In the cartographer pattern,
`DC 00 04 <record> 16` makes variable 0 refer to byte `+0x16` of cartographer
record selector `0x05`–`0x09`, in the order Giovanni, Gerard, Diogo, Olives,
and Mercator. Assignment opcode `05` reads through the reference and `11`
writes through it.

Ernst section 1 uses this mechanism at `SNR4.DAT 0x035F`. It reads Mercator's
byte, masks it with `0x10`, and selects message 77 when Mercator is active. A
controlled Gerard save and screenshot confirm that a clear Mercator bit selects
messages 78–81, accusing Ernst of holding another cartographer's contract. The
following writes reactivate Mercator and clear the other four records. Thus
merely visiting Mercator during this story section forcibly renews his contract.

There are therefore 3,920 cells outside the initial rectangle. Dividing 40,000
by 3,920 gives approximately 10.204, but the executable establishes an actual
map-report reward of 5 adventure fame per new cell, for a theoretical maximum
of 19,600 from those cells. A roughly 40,000-fame total after charting most of
the world must also include fame obtained while sailing or making discoveries.

The map-completion branch at `0x33C2C` compares the total-known counter with
3,300. Because 130 cells begin revealed, this requires 3,170 of the 3,920
initially hidden cells, approximately 80.87%. The threshold is independent of
which cartographer has the active contract.

Repeated controlled boundary tests now confirm the decoded comparison
semantics: lower bounds are inclusive and upper bounds are exclusive. Further
runtime pairs are useful when dispatch, field meaning, or an external
precondition is uncertain, but are not needed merely to reconfirm an explicit
literal threshold.

For João, the 2,000 adventure-fame lower bound is confirmed inclusive. The
event's primary `0xA303` arrival/Harbor route decides whether to advance the
subsection when its fame check passes. Three controlled captures establish the
surrounding lifecycle:

| Capture                               | Position | Time  | Section/subsection | Voyage day | Navigation level/XP |
| ------------------------------------- | -------- | ----- | ------------------ | ---------- | ------------------- |
| After Domingo, before first port call | At sea   | 04:20 | `1 / 0`            | 3          | `1 / 0`             |
| After first port call                 | Ceuta    | 04:40 | `1 / 0`            | 3          | `1 / 18`            |
| After sailing and second port call    | Ceuta    | 08:40 | `1 / 1`            | 0          | `1 / 18`            |

The at-sea capture is already in section 1/subsection 0, so Domingo's
introduction has completed the preceding scenario section before either port
call. The first Ceuta call does not change any known scenario field and
therefore provides no evidence that it "completes" the Domingo quest.

The trigger is now identified as visiting the Harbor, not calling at port or
arriving at a particular time. The apparent time dependency came from the
player's route through Ceuta: after arriving at 06:40, the Harbor was visited to
pass time before the Pub opened; after arriving at 11:40, the Pub was entered
directly.

Three captures isolate the transition:

| Capture                                     | Position | Time  | Subsection |
| ------------------------------------------- | -------- | ----- | ---------: |
| After the unsuccessful direct Pub visit     | Ceuta    | 13:00 |          0 |
| After subsequently entering Harbor/set sail | At sea   | 14:20 |          1 |
| After returning to Ceuta                    | Ceuta    | 14:40 |          1 |

The final save routes the next Pub visit to message 227. All three retain clear
scenario flag 0, confirming that the Pub conversation has not yet played; the
Harbor visit only makes it available. Entering Harbor to set sail explains why
an earlier experiment made a second port call appear necessary.

This matches the SNR exactly. The primary `0xA303` route is the regular-port
Harbor context. It checks João's identity and adventure fame against 2,000,
then executes `F0`, requesting a subsection advance when the interpreter
returns. No time or port-call-counter test exists in the block.

Eligibility is latched by that Harbor-triggered subsection transition. In a
live test, lowering adventure fame from 2,000 to 1,000 afterward did not stop
the Pub dialogue. This agrees with the bytecode: the fame comparison is in the
primary `0xA303` route, while the subsection-1 Pub handler never checks fame.

After the Harbor visit qualifies, advancing time inside the port by checking
into the Lodge still permits the Pub scene.

The route's decoded SNR instructions do not themselves test navigation level or
a port-call counter. Before the fame comparison they dereference João's sailor
record byte `+0x29`, mask its low nibble, and require zero. The protagonists'
low nibbles identify their nation/character values; zero is João. It then reads
João's adventure-fame field and compares it with 2,000. If navigation level or
port-call count matters, it governs whether the engine invokes the route rather
than appearing as another condition inside this SNR block.

The resulting Pub handler at `0x0A23` reads system value 5, now statically
identified as the current port ID, and rejects IDs 0, 1, and 2: Lisbon, Seville,
and Istanbul. Barcelona (3), Valencia (6), and Bordeaux (27) are confirmed or
reported to work. It also accepts time ticks `0x0D` through `0x33` inclusive
(04:20–17:00) before starting message 227 at `0x0A9F`. Since the Pub itself
does not open until 08:00, the effective player-observed window is 08:00–17:00.
Checking into the Lodge and advancing time while remaining in port still allows
the event as long as the Pub is entered by 17:00.

The supplied before/after Pub capture is in Bordeaux (port 27), at exactly
2,000 adventure fame, section 1/subsection 1. It confirms the dialogue sets
flag 0. A subsequent Lodge capture confirms that the first Lodge visit shows
messages 270–271 and sets flag 8; revisiting then shows message 269. The Lodge
is optional: flag 0 alone permits the Shipyard confrontation beginning with
message 274. Before visiting the Lodge, other buildings give reminders about
the Lodge; afterward, their reminder text changes to direct João to the
Shipyard.

Four later captures now confirm the remainder of this 2,000-fame sequence:

| Capture                              | Port     | Time  | Section/subsection | Flags set    |
| ------------------------------------ | -------- | ----- | ------------------ | ------------ |
| After Shipyard, before Port          | Bordeaux | 13:20 | `1 / 1`            | `1, 8`       |
| After Port, before sailing to Lisbon | Bordeaux | 14:40 | `1 / 2`            | `1, 8`       |
| In Lisbon, before the home duel      | Lisbon   | 08:40 | `1 / 2`            | `1, 8`       |
| After the Palace trial               | Lisbon   | 11:00 | `1 / 2`            | `1, 2, 5, 8` |

The first pair confirms that the Port revelation beginning at message 240
advances subsection 1 to 2 without changing the flags. The Shipyard sequence
has already set flag 1 and cleared the Pub's flag 0; flag 8 remains because the
optional Lodge clue was visited in this playthrough.

Between the latter pair, the home confrontation and successful duel set flag 5
at `0x10D8`, and the Palace trial sets flag 2 at `0x126C`. These offsets match
the static writes exactly. Section 1/subsection 2 remains active after the
trial.

Returning to João's father after the trial presents message 310 and its player
choice, then sets flag 3 at `0x0F60`. During this departure stage, entering a
building other than the Harbor makes Prince Alberto say messages 394–395—
“$n, it was certainly fun, but we both have things that we must do” and
“Let me walk you to the port. Let’s go.”—without ejecting João from that
building. The reminder can therefore recur while the player continues using
town buildings.

Visiting the Harbor selects a different scene, messages 361–362: Alberto says
he must return to the Palace, and João says farewell. The route then sets flag
4 at `0x1159`. The supplied post-Harbor capture, saved after leaving the
building, is still section 1/subsection 2 and has flags 1, 2, 3, 4, 5, and 16
set (`0x0001003E`). Flag 3 therefore remains a historical departure-stage marker
after Alberto has left; it is not simply “Prince currently present.” Flag 4 is
the more precise “Harbor farewell completed” marker and suppresses subsequent
reminders.

The final section-1 route is `0xA001`, the first day at sea. It advances to
section 2 only when flag 4 is set. Thus the complete transition is father-house
aftermath → optional building detours → Harbor farewell → set sail → at-sea day
1 → section 2. This live result supersedes the earlier query-only interpretation
of message 370 for this point in the story.

Three controlled saves confirm this handoff:

| Capture                   | Position | Voyage day | Section/subsection | Flags               |
| ------------------------- | -------- | ---------: | ------------------ | ------------------- |
| Before sailing            | Lisbon   |          3 | `1 / 2`            | `1, 2, 3, 4, 5, 16` |
| Immediately after sailing | At sea   |          0 | `1 / 2`            | `1, 2, 3, 4, 5, 16` |
| After two days at sea     | At sea   |          2 | `2 / 0`            | none                |

All three have exactly 8,000 adventure fame. Merely setting sail does not
advance the section. The transition happens between voyage days 0 and 2;
together with the decoded `0xA001` route, this confirms it occurs on voyage day

1. The `F1` transition also clears all four scenario-flag bytes as expected.

The father-house aftermath presents message 310 as a player choice:
“Hmm... I wonder. $n, what do you want to do? Are you going to quit sea
travel?” Unlike ordinary lines, its selected-message instruction is followed by
`E9 10` rather than `C7`. Live observation identifies `E9` as a choice prompt;
operand 16 is immediately tested as a flag. The set branch leads to messages
311–317, where João offers to stay and help his father. The clear branch leads
to messages 318–320, where he chooses to continue seeking Atlantis. This choice
controls dialogue within the scene; both branches eventually continue the
scenario.

Ceuta (port 26) is confirmed to work after visiting its Harbor. The Pub bytecode
does not test a 13-region identifier.

The event then continues through the Shipyard confrontation and duel,
Catalina's intervention, Port explanation, and the return to Lisbon for Duke
Franco's trial. Entering the wrong building at intermediate stages produces
context-specific warning dialogue and often forces the player back outside.

## João's 8,000-fame trigger

The next section contains an inclusive 8,000 adventure-fame check at `0x13C3`.
It cannot run until the preceding 2,000-fame story has finished and João's save
has advanced to section 2/subsection 0; reaching 8,000 early does not bypass the
current story section.

Unlike the 2,000 event, the primary trigger is `0xA3FF`: the wildcard context
for any regular port. It checks João's identity and adventure fame and executes
`F0` when fame is at least 8,000. It does not require a Harbor visit. The
specific João-home route `0x0007` takes precedence.

A controlled pair confirms this activation at runtime. Both captures are in
Seville with exactly 8,000 adventure fame and story flag 6 set:

| Capture      | Time  | Section/subsection | Flags set |
| ------------ | ----- | ------------------ | --------- |
| Before Lodge | 10:00 | `2 / 0`            | 6         |
| After Lodge  | 11:20 | `2 / 1`            | 6         |

The Lodge visit produced no story dialogue and changed no story flag. This
confirms that an ordinary building can activate the wildcard route and that the
activation is not Harbor-specific. If the triggering action is itself a Pub
visit, the bytecode predicts that this first visit only advances the
subsection; entering a Pub again should show the story warning.

In subsection 1, the first regular-port Pub visit with clear flags begins:

| Message | Speaker   | Text                                                                                                              |
| ------: | --------- | ----------------------------------------------------------------------------------------------------------------- |
|     425 | Narration | Say, aren’t you that famous mariner, $n?                                                                          |
|     426 | João      | I don’t know whether I’m famous or not, but I’m $n for sure.                                                      |
|     427 | Narration | Hey, you’d better be careful. That Portuguese hunting red-haired pirate has been asking the whole town about you. |
|     428 | Rocco     | Ye needs to learn to keep ye big trap shut! We’d better get out of here.                                          |

That warning sets flag 0. Its path contains no clock or current-port-ID check,
so the bytecode does not exclude Lisbon, Seville, or Istanbul as the 2,000-fame
Pub handler does. Normal building opening hours still constrain when the player
can enter. The post-Pub capture confirms the full four-line warning in Seville: the
save remains in section 2/subsection 1, changes flags from `0x40` to `0x41`, and
stores Seville's port ID (`1`) in scenario variable 0.

Subsequent Pub or other-building visits can produce port-dependent warnings.
The handler reads the current port into variable 1 and compares it with the Pub
port retained in variable 0. Continuing in Seville and entering the Lodge shows
messages 440–441. It then executes `EB 00 00 02`, selecting either 0 or 1, and
Catalina appears only when the result is zero. This establishes a 50% chance on
an eligible visit. The observed Catalina branch shows messages 444–447, plays
music track 16, and statically sets flag 1. The following Harbor scene clears
flags 0 and 1, sets flag 2, and prepares an at-sea-day-1 transition. This begins
a longer multi-subsection Catalina pursuit that ultimately includes a naval
encounter with her.

The post-meeting Harbor capture, captured after that Harbor
scene in Seville, confirms the transition. It remains in section 2/subsection 1
and contains flags `0x44`: flags 2 and 6 are set, while flags 0 and 1 are clear.
The Harbor handler at `0x14B5` exits without changing anything unless flag 1 is
already set, so reaching this result also confirms that Catalina's appearance
set flag 1 even though no save was taken in the brief intermediate state.

The Harbor scene is messages 429–437. João asks whether Rocco is all right;
Rocco returns and says he tied Catalina up in the merchant's storage room, then
urges João to leave. The following `0xA001` voyage-day-1 route requires flag 2,
clears it, and executes `F0`, advancing the story to subsection 2.

The two-day-at-sea capture confirms the player reaches section
2/subsection 0 at exactly 8,000 fame. The Lodge pair confirms the predicted
`A3FF` activation after returning to port, and the post-Pub capture confirms the
subsequent warning and its state write.

## Current disassembler limitations

- Reachable code is now decoded sequentially from primary and nested route
  tables. All seven scenarios decode without reaching an invalid action opcode,
  and every extracted protagonist dialogue is on a reachable instruction
  boundary.
- Assignment, arithmetic, and comparison operand modes have structural names,
  and indirect protagonist Fame/sailor reads are resolved, but many other
  record groups, variable indices, and action opcodes do not yet have gameplay
  names.
- Dialogue runs are still assembled by their confirmed compound signatures,
  though their component instructions are also present in the sequential decode.
- Fame comparisons now resolve through the `DC` record reference, pointer
  adjustment, and indirect little-endian word read used by the scripts.
- `rawHex` retains every section byte so unknown commands are not lost.
- `SNR0` yields far fewer direct dialogue calls than messages. Its strings may
  be referenced by a different mechanism or directly from `MAIN.EXE`.

## Next investigation steps

1. Trace the action-handler callees at `0x377F4`–`0x3828F` and assign gameplay
   names to the remaining valid `0xC0`–`0xFC` opcodes.
2. Map the remaining VM sources and record groups by correlating handler memory
   accesses with the known save layout, especially party membership and
   duel/battle aftermath.
3. Correlate any newly encountered non-wildcard naval-battle qualifier with
   its zero-based sailor record; the currently observed `0x01` and `0x3C`
   values are resolved.
4. Group instructions and edges into named basic blocks for a compact control-
   flow graph rather than exposing only the instruction-level CSV.
5. Optionally validate uncertain operations in a debugger-enabled DOSBox-X by
   comparing memory before and after a one-shot conversation.

Ghidra is not required to run the extractor. It remains useful for naming the
larger gameplay functions called by individual action handlers.

## Verification

`snr.test.ts` locks down the João evidence above. Run:

```sh
pnpm test
pnpm run typecheck
```

When a hypothesis becomes confirmed, update this document, the output field
name, and the corresponding regression test together.
