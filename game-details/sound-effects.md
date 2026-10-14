# Sound effects

The game's few sound effects are single FM notes played by the resident sound
driver `FMDRV.COM` (“OPL-II Sound Driver Version 3.11”), which `MAIN.EXE`
calls through interrupt `0x66`. This page covers the driver interface, the
voice format, the driver's software LFO, and the effects the game plays.
`MAIN.EXE` addresses are file offsets; `FMDRV.COM` addresses are its offsets
in memory (the file is loaded at `0x100`).

## Calling the driver

`MAIN.EXE` reaches the driver through a few small far routines. Each returns
at once when the driver is absent (word `DS:0x05E6` is 0):

| Routine  | Driver call                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------- |
| `0xEC26` | function 5 with `AL` = 0 and `DS:BX` → the voice: load the voice into effect channel 0           |
| `0xEC62` | function 5 twice: `AX` → effect channel 0, `BX` → effect channel 1                               |
| `0xECC2` | function 6 with `AL` = 0 and `DL` = the note in `AL`: play the note on effect channel 0          |
| `0xECF4` | function 6 on effect channels 0 and 1                                                            |
| `0xED46` | function 5 with a null voice on channel 0, then function 7 on channels 0 and 1: silence both     |

`0xECC2` and `0xECF4` also return unless bit `0x08` of `DS:0x0E28` (save-slot
byte `0x00`) is set. A new game writes `0xFF` to that byte (`0x1B1DF`), and
the Options screen (`0x26B59`) toggles only bits `0x01` and `0x04`
(`0x26B69`, `0x26B7E`), so the effects play.

The handler at `0x161` takes the function in `AH` (0–9 from the table at
`0x245`, `0x80`–`0x83` from `0x259`). Functions 5–7 work on the two effect
channels, driver channels 4 and 5 (`AL` 0 or 1, `0x317`); the music uses
channels 0–3 and the rhythm section.

- **Function 5** (`0x398`) takes the voice at the caller's `DS:DX`. A null
  pointer resets the channel and sets both operators' total level to `0x3F`.
  Otherwise `0x6AE` first keys the channel off and silences it (F-number 0,
  release rate 15, total level `0x3F`), then `0x9FF` loads the voice.
  Channel volume (`+0x05`) is set to 0, the loudest.
- **Function 6** (`0x3DA`) plays note `DL` (at most `0x5F`) through `0xBD2`.
  The note plus the voice's transpose (byte `0x0B`) and the channel's
  transpose (`+0x2D`, 0) gives octave `n / 12` (at most 7) as the block and
  `n mod 12` as an index into the F-number table at `0x620`: `0x157 0x16B
0x181 0x198 0x1B0 0x1CA 0x1E5 0x202 0x220 0x241 0x263 0x287`. A channel
  that is still keyed on is keyed off first; then `0x7CA` writes registers
  `0xA0`/`0xB0` and `0x670` sets the key-on bit. The note is never released:
  it lasts as long as its envelope, until the next function 5, or until
  `0xED46`.
- **Function 7** (`0x3F5`) keys the channel off (`0x692`).

At start-up (`0x1267`) the driver writes `0x20` to register `0x01` (waveform
select on), `0x40` to register `0x08` (note select: the key scale uses
F-number bit 8), and 0 to `0xBD`.

## The voice format

A voice is 22 bytes (`0x9FF`, `0x73E`). Channel 4's operators are at
register offsets 9 and 12, channel 5's at 10 and 13 (`0x56A`, `0x598`).

| Byte | Meaning                                                                                         |
| ---: | ----------------------------------------------------------------------------------------------- |
| 0, 1 | registers `0x20` (modulator) and `0x23` (carrier): AM, vibrato, sustain, key scale, multiple     |
|    2 | register `0xC0`: feedback and connection                                                         |
| 3, 4 | registers `0xE0`, `0xE3`: waveforms                                                              |
| 5, 6 | registers `0x40`, `0x43`: key scale level and total level                                        |
| 7, 8 | registers `0x60`, `0x63`: attack and decay                                                       |
| 9, A | registers `0x80`, `0x83`: sustain level and release                                              |
|    B | transpose in semitones, signed                                                                   |
|  C–D | LFO speed (word)                                                                                 |
|    E | LFO waveform, 0–4 (others count as 0)                                                            |
|    F | pitch depth, signed, out of 127                                                                  |
|   10 | pitch range: index into the word table at `0x600`                                                |
|   11 | level depth, signed, out of 127                                                                  |
|   12 | level share of the modulator, out of 15                                                          |
|   13 | level share of the carrier, out of 15                                                            |
|   14 | LFO start: 0 keeps the free-running tick count, 1 restarts it, `n` ≥ 2 waits `4n + 1` ticks      |
|   15 | LFO on when non-zero                                                                             |

The total levels are adjusted by the channel volume (`0x96A`): the carrier,
and the modulator too with additive connection, gets `volume / 2` added.

## The LFO

The timer interrupt runs at 1193182 / 4096 ≈ 291.3 Hz (`0x12B4`) and chains
to the old one every 16 ticks. Each tick adds `0x36` to a byte (`0x1E3`); each
carry counts one LFO tick, about 61.4 Hz, and `0x11A6` then steps every
channel's LFO (`0x1110`) and increments the free-running count `0x5CE`.

While the note is keyed on, each step loads the range word from `0x600` and
the speed. The first step after the key-on applies byte `0x14`; the waveform
then runs (`0x1016`), giving a value from −32767 to 32767:

| Waveform | Routine  | Shape                                                                                         |
| -------: | -------- | --------------------------------------------------------------------------------------------- |
|        0 | `0xF7F`  | a sawtooth: the value grows by speed per tick and wraps                                       |
|        1 | `0xFC1`  | a square wave: the count divided by `0x7FFF / speed`, `0x7FFF` when even, `−0x7FFF` when odd   |
|        2 | `0xF88`  | a triangle: 2 × speed per tick, turning back where it would overflow                           |
|        3 | `0xFAC`  | a single rise to `0x7FFF`, then held                                                          |
|        4 | `0xFE2`  | random steps                                                                                  |

`0x1030` turns the value into a pitch offset `p = value × depth / 127`.
For `p ≥ 0` the F-number grows by `F × p / 0x7FFF × range / 0x7FFF`, moving
up a block while it passes `0x3FF`; for `p < 0` it becomes
`F × 0x7FFF / (0x7FFF + (−p) × range / 0x7FFF)` in the same block. The
range table is in semitone steps: `0x3FC8` is a fifth up, `0x7FFF` an
octave. `0x7CA` writes `0xA0`/`0xB0` when the result changes.

`0x10A5` does the same to the total levels: the value, by the waveform's rule,
times the level depth, scaled by bytes `0x12` and `0x13` for the two
operators.

## The effects in battle

| Voice       | Note   | Played at                                                                                                                    |
| ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `DS:0x0D70` | `0x24` | cannon fire: the start of the ball's flight (`0x11CEB`), and again as the explosions start (`0x12227`)                        |
| `DS:0x0D86` | `0x30` | boarding: before the first frame (`0x126A5`); `0xED46` silences it after the last (`0x1278B`)                                 |

The cannon voice (file `0x3C8E0`) is `20 00 0E 00 00 07 00 F0 F0 08 05`, then
`E8 40 1F 02 CE 0A F1 00 00 01 01`. Both operators have multiple 0 (half the
note frequency); the carrier is attenuated 0 and the modulator 7 (×0.75 dB),
with feedback 7 and FM connection, which makes noise. Both attack instantly.
The carrier is not sustained and has sustain level 0, so it moves straight to
its release rate 5. After the transpose of −24 the note is C in block 1,
F-number `0x157`. The LFO is a triangle at speed `0x1F40`, restarted on
key-on, so it changes by 16000 a tick and repeats every 10 ticks (about
6.1 Hz). With pitch depth −50 and range `0x3FC8` it moves between
F-numbers 287 and 408, about three semitones either way, starting downwards.
It has no level change.

Both plays use the same voice and note. The second (`0x12227`) comes right
after the flight, before the first explosion frame. Its function 5 silences
the first note, and the sound starts again.

The boarding voice (file `0x3C8F6`) is `23 21 0D 03 01 85 45 5F 53 0F 0F`,
then `00 50 46 01 64 0B 8D 00 00 00 01`. It has a modulator with multiple 3,
waveform 3 and feedback 6, and a carrier with multiple 1 and waveform 1, in
additive connection. Both are sustained, with attack rate 5 and release 15.
The note is C in block 4. The LFO is a square wave at speed `0x4650`, so
`0x7FFF / speed` is 1 and the pitch alternates every tick. With depth 100 and
range `0x4B2F` it moves between F-numbers 501 and 234 of the base 343. The
LFO starts from the free-running count, so which of the two pitches comes
first is arbitrary. The note holds until `0xED46` cuts it after the third
pass of frames.

## Duels

The exchange animation (`0x175C0`) plays one effect after drawing its fourth
frame (frame index 3, `0x17726`): voice `DS:0x0D5A` when the hit does damage,
`DS:0x0D44` when it is negated (`0x1772B–0x17737`), both with note `0x30`
(`0x1773B–0x17742`). Nothing cuts the note off; the next effect replaces it.

## Other effects

| Voice       | Note   | Calls                                                    |
| ----------- | ------ | -------------------------------------------------------- |
| `DS:0x0D5A` | `0x30` | `0x1773B` (or `DS:0x0D44`, chosen just before), [duels](#duels) |
| `DS:0x0D9C` | `0x3C` | `0x3A6CC`, `0x3A6F2`: discoveries ([At sea](at-sea.md))   |
| `DS:0x0DB2` | `0x3C` | `0x20F51`                                                |
| `DS:0x0DC8` | `0x30` | `0x369DE`, `0x36A03`                                     |
| `DS:0x0DDE` | `0x30` | `0xD9C2`, `0x1BDD2`, `0x1EC83`, `0x26B97` (Options)      |
