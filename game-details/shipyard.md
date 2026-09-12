# Shipyard construction

## Hull materials

The ship table stores Beech-base durability. Building a ship applies a hull
material multiplier:

| Material | Multiplier |
| -------- | ---------: |
| Teak     |        80% |
| Cedar    |        90% |
| Beech    |       100% |
| Oak      |       110% |
| Copper   |       120% |
| Steel    |       140% |

Steel is automatically selected for a newly built Tekkousen and is unavailable
for other ship types.

## Durability calculation and cap

New-ship durability is calculated from the Beech-base durability and material
multiplier, then capped at 100:

```text
material_factor = material_index + 8
adjusted         = base_durability * material_factor / 10
durability       = min(adjusted, 100)
```

For the five normally selectable materials, indices `0..4` yield factors
`8..12`, corresponding to 80% through 120%. Steel uses factor 14 (140%).

Examples:

```text
Full-rigged Ship with Copper = min(90 * 12 / 10, 100) = 100
Tekkousen with Steel         = min(90 * 14 / 10, 100) = 100
```

### Evidence from `MAIN.EXE`

The shipyard preview performs the adjusted-durability calculation at file
offsets `0x31af1..0x31b09`. The important instructions are:

```asm
mov  cl, byte ptr [bx + 1] ; Beech-base durability
sub  ch, ch
sub  ah, ah
add  ax, 8                ; selected material index -> factor 8..14
imul cx                   ; base durability * material factor
mov  cx, 10
cdq
idiv cx                   ; divide by 10
mov  dx, 100
call 0x4b54               ; min(calculated durability, 100)
```

The final ship-construction path independently repeats the calculation at file
offsets `0x31c7f..0x31ca1`, then writes the capped value into both durability
bytes of the new fleet ship slot:

```asm
sub  ah, ah
add  ax, 8
mov  cx, ax
mov  al, byte ptr [si + 1] ; Beech-base durability
sub  ah, ah
imul cx
mov  cx, 10
cdq
idiv cx
mov  dx, 100
call 0x4b54                ; min(calculated durability, 100)
mov  bx, word ptr [bp - 0xc]
mov  byte ptr [bx + 3], al ; maximum durability
mov  byte ptr [bx + 2], al ; current durability
```

The fleet slot offsets agree with the `KOUKAI2.DAT` layout: slot `+0x02` is current
durability and slot `+0x03` is maximum durability. The cap is therefore applied
while previewing and constructing a ship, rather than being imposed by the
one-byte save fields themselves.
