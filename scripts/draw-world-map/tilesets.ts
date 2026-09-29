import { readFile } from "node:fs/promises";

export const REGULAR_TILE_SIZE = 16;

export async function readLargeTiles(path: string): Promise<Uint8Array> {
  const bytes = await readFile(path);
  const tiles = new Uint8Array(256 * 2 * 2);

  for (let tile = 0; tile < 16; tile += 1) {
    for (let bit = 0; bit < 4; bit += 1) {
      tiles[tile * 4 + bit] = (tile & (1 << (3 - bit))) === 0 ? 0 : 65;
    }
  }

  let sourceOffset = 16 * 4;
  for (let tile = 16; tile < 256; tile += 1) {
    for (let index = 0; index < 4; index += 1) {
      const regularTile = bytes[sourceOffset + index];
      if (regularTile === undefined) {
        throw new Error(
          `Unexpected end of large tileset at byte ${sourceOffset + index}`,
        );
      }
      tiles[tile * 4 + index] = regularTile > 128 ? 0 : regularTile;
    }
    sourceOffset += 4;
  }

  return tiles;
}

export type Rgb = readonly [number, number, number];

export const SEA_PALETTE_NAMES = [
  "night",
  "dawn",
  "day",
  "dusk",
  "fog",
] as const;
export type SeaPaletteName = (typeof SEA_PALETTE_NAMES)[number];

// MAIN.EXE's data segment, and the five sea palettes it holds at
// DS:0xA892 + 0x30 × n (see game-details/at-sea.md#colours).
const DATA_SEGMENT = 0x3657;
const SEA_PALETTES = 0xa892;
const PALETTE_BYTES = 16 * 3;

/** A 0–15 palette channel as the VGA DAC shows it: 6 bits, scaled to 8. */
function channel(value: number): number {
  const dac = value << 2;
  return (dac << 2) | (dac >> 4);
}

/** The sea palettes, stored as blue, red, green per colour. */
export async function readSeaPalettes(
  mainExePath: string,
): Promise<Record<SeaPaletteName, Rgb[]>> {
  const exe = await readFile(mainExePath);
  const dataSegment = exe.readUInt16LE(8) * 16 + DATA_SEGMENT * 16;
  return Object.fromEntries(
    SEA_PALETTE_NAMES.map((name, index) => {
      const start = dataSegment + SEA_PALETTES + index * PALETTE_BYTES;
      const colours = Array.from({ length: 16 }, (_, colour): Rgb => {
        const [blue, red, green] = exe.subarray(
          start + colour * 3,
          start + colour * 3 + 3,
        );
        return [channel(red!), channel(green!), channel(blue!)];
      });
      return [name, colours];
    }),
  ) as Record<SeaPaletteName, Rgb[]>;
}

/**
 * Palette index of every pixel of the 128 map tiles in the first half of
 * DATA1.011: four bit-planes per tile, the first plane being bit 0.
 */
export async function readRegularTileIndices(
  path: string,
): Promise<Uint8Array> {
  const file = await readFile(path);
  const bytes = file.subarray(0, Math.floor(file.length / 2));
  const pixelsPerTile = REGULAR_TILE_SIZE * REGULAR_TILE_SIZE;
  const tileCount = Math.floor((bytes.length * 8) / (pixelsPerTile * 4));
  const output = new Uint8Array(tileCount * pixelsPerTile);

  for (let tile = 0; tile < tileCount; tile += 1) {
    for (let pixel = 0; pixel < pixelsPerTile; pixel += 1) {
      let paletteIndex = 0;
      for (let plane = 0; plane < 4; plane += 1) {
        const bit = (tile * 4 + plane) * pixelsPerTile + pixel;
        paletteIndex |= ((bytes[bit >> 3]! >> (7 - (bit & 7))) & 1) << plane;
      }
      output[tile * pixelsPerTile + pixel] = paletteIndex;
    }
  }

  return output;
}

export function colourTiles(
  indices: Uint8Array,
  palette: readonly Rgb[],
): Uint8Array {
  const output = new Uint8Array(indices.length * 3);
  indices.forEach((index, pixel) => output.set(palette[index]!, pixel * 3));
  return output;
}

export async function readRegularTiles(
  path: string,
  palette: readonly Rgb[],
): Promise<Uint8Array> {
  return colourTiles(await readRegularTileIndices(path), palette);
}
