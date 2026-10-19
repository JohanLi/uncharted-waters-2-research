# Pictures

How `GRAPH.DAT` pictures are stored and how `MAIN.EXE` draws them. The same
record format is used by `GRAPH2.DAT`, `ENDGRP.DAT` and the parts of
`OPGRAPH.LZW`; [Leftovers](leftovers.md#evidence-graphdat) lists which records
are drawn. All addresses are `MAIN.EXE` file offsets; `0:0x…` is the same code
as a segment-0 address. The extractor is
[`scripts/art/graph-format.ts`](../scripts/art/graph-format.ts).

## File layout

A file opens with a table of big-endian 32-bit record offsets. The first
offset divided by four is the number of records: 65 in `GRAPH.DAT`, 2 in
`GRAPH2.DAT`, 59 in `ENDGRP.DAT`. The record drawer `0xAEB7` (`0:0x58B7`;
`ax` = x, `dx` = y, `bx` = record) reads the four bytes at record × 4 from the
file handle `DS:0x05D8` and builds the offset high byte first
(`0xAEC0–0xAF17`, stored at `DS:0xBF36`). It then calls the screen decoder
through `0x6588` (`0:0xF88`) with the byte reader `0xAE69` (`0:0x5869`), which
reads the record from the file a byte at a time while it is drawn.

A record is a 20-byte header followed by commands:

| Bytes | Contents                                                                                                |
| ----: | ------------------------------------------------------------------------------------------------------- |
|   0–1 | Width in pixels, little-endian                                                                          |
|   2–3 | Height in pixels, little-endian                                                                         |
|  4–19 | Eight 16-bit table values, little-endian, copied to `CS:0x0B8C` (`0x622C–0x6255`, when `DS:0x8844` ≠ 0) |
|   20– | Commands, row by row                                                                                    |

`0x6588` sets `DS:0x8844` to 1 and the fill handler `DS:0x8846` to
`0:0xE46`. A second entry, `0x659C` (`0:0xF9C`), sets 0 and `0:0xE18`: a
variant without the table whose fills are read differently. Its callers are
not traced here.

## Units

The decoder writes **units**: 16 bits holding 4 pixels side by side, one
4-bit group per bit plane. Bits 0–3 are plane 0, 4–7 plane 1, 8–11 plane 2
and 12–15 plane 3; within each group the highest bit is the leftmost pixel.
A row of a picture is `(width + 3) / 4` units (`0x621B–0x6220`). Every
picture's width is a multiple of 4; ships are 128 × 96 pixels, 32 units by 96
rows.

## Commands

Each command starts with one byte. A row ends when its units are written;
no command crosses a row.

| Byte          | Meaning                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `1 0 dd cccc` | Copy `cccc` + 1 units (1–16) from `dd` + 1 units (1–4) to the left (`0x626E–0x6288`)                |
| `1 1 dd cccc` | Copy `cccc` + 1 units from `dd` + 1 rows (1–4) above, same columns (`0x6353`)                       |
| `0 1 ttt ccc` | Fill `ccc` + 1 units (1–8) with table value `ttt` (`0x6456`)                                        |
| `0 0 000 ccc` | Fill with 0 (`0x644D`)                                                                              |
| `0 0 111 ccc` | Fill with the next two bytes as a 16-bit value, high byte first (`0x6469–0x647D`)                   |
| `0 0 mmm ccc` | Modes 1–6: fill with the next byte spread over two planes (jump table `CS:0x0E3A`, `0x6481–0x6490`) |

A spread puts the byte's low four bits in the lower plane of a pair and its
high four bits in the higher one; the other two planes are 0. Modes 1–6 are
the six pairs in order:

| Mode | Planes | Handler          |
| ---: | ------ | ---------------- |
|    1 | 0, 1   | `0x64DA` (as is) |
|    2 | 0, 2   | `0x6495`         |
|    3 | 0, 3   | `0x64AA`         |
|    4 | 1, 2   | `0x64B7`         |
|    5 | 1, 3   | `0x64C1`         |
|    6 | 2, 3   | `0x64D6`         |

## Drawing straight to the screen

The screen decoder `0x619C` (`0:0xB9C`) has no picture buffer: it writes into
VGA memory as it reads commands.

- **Bounds.** It refuses (returns `0xFFFF`) a width outside 1–640, a height
  outside 1–400, or a position that would not fit on a 640 × 400 screen
  (`0x61B3–0x620B`).
- **Start.** It sets the graphics controller (`0x5718`, `0:0x118`), points
  `ES` at segment `0xA000`, and starts at unit `x / 4 + y × 160`
  (`0x61E7–0x6219`, `0x6227`).
- **Stride.** After each row it moves to the row's start plus `0xA0`, 160
  units, one 640-pixel screen row (`0x6574–0x6578`). The unit directly above
  is therefore 160 units back, and a copy from `d` rows above starts
  `d × 160` units back (`0x6353–0x6362`).
- **Video memory.** A unit's VGA byte is `0x0C80 + unit / 2`: each byte of a
  plane covers 8 pixels, so a unit is one half of it, and the screen starts 40
  rows (40 × 80 bytes) into video memory (`0x6501–0x6505`). An even unit is
  the left half, written with bit mask `F0`; an odd unit the right half, with
  `0F`. Each write first reads the byte to load the VGA latches, so the other
  half keeps its pixels, then writes planes 0–3 through the map mask (1, 2, 4, 8) (`0x650D–0x6566`).
- **Copies read the screen.** A copy reads its source's four planes back from
  video memory one at a time (read map select, `0x637D–0x639D`) and writes
  them to the destination. When a copy from the left moves an odd number of
  units, source and destination are opposite halves, and the decoder first
  sets the VGA data rotate to 4 bits (`0x62A5–0x62AB`); it resets it after the
  copy (`0x6349–0x634F`).

Everything outside the picture's rectangle is left as it was on the screen.

The ship routine `0xD3E5` (`0:0x7DE5`) draws record ship type + 28 at
x = `ax` × 8 and y = `dx`, so a ship always starts on a whole VGA byte. The
Pub's crew card puts it at column 16, y 160, pixel (128, 160)
([Crew assignment](buildings.md#crew-assignment)); the ship card after a
capture at (120, 160) ([The ship card](naval-battle.md#the-ship-card)).

### The buffer decoder

`0x65C4` (`0:0xFC4`) decodes the same commands from a record in memory (byte
reader `0x65AF`) into a buffer at offset 0 of the segment it is given. Its
stride is the picture's own width: a copy from `d` rows above goes back `d` ×
`(width + 3) / 4` units (`0x6726–0x672B`). Each pair of units takes four
bytes, the unit's low bit picking the high or low half of each
(`0x664F–0x665E`). Its callers are not traced here.

### The same code in END.EXE and OPEN.EXE

`END.EXE` and `OPEN.EXE` carry both decoders, byte for byte except for
addresses. The offsets below are each program's own file offsets.

| Routine        | `MAIN.EXE`        | `END.EXE` | `OPEN.EXE` | Bytes that differ     |
| -------------- | ----------------- | --------- | ---------- | --------------------- |
| Screen decoder | `0x619C`, 1,004 B | `0x4D5E`  | `0x0F7A`   | 23 in END, 24 in OPEN |
| Buffer decoder | `0x65C4`, 828 B   | `0x5186`  | `0x13A2`   | 18 in each            |

Every differing byte is an address that depends on where the routine sits:
the copy of the table (`CS:0x0B8C` in `MAIN.EXE`, `CS:0x4B4E` in `END.EXE`,
`CS:0x0D6A` in `OPEN.EXE`), the spread jump table and the jumps through it, the
control words (`DS:0x8844` and `DS:0x8846` in `MAIN.EXE`, `DS:0x342E` and
`DS:0x3430` in `END.EXE`, `DS:0x00CE` and `DS:0x00D0` in `OPEN.EXE`), and the
call to the graphics
controller setup. The routines that read records in the two programs are in
[Leftovers](leftovers.md#evidence-endexe); how they reach this code is not
traced here.

## Stride does not change the picture

No command reads outside its picture: across all 126 records in `GRAPH.DAT`,
`GRAPH2.DAT` and `ENDGRP.DAT`, no copy from the left starts before column 0,
no copy from above reaches above row 0, and every row ends exactly on the
picture's width. Decoding each record with a stride of 160 units and with a
stride of its own width gives identical pictures. The stride belongs to the
destination, the screen or a buffer, not to the file.
