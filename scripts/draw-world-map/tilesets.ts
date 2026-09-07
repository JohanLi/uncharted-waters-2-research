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

const DAY_PALETTE: Readonly<Record<number, readonly [number, number, number]>> =
  {
    0: [0x00, 0x00, 0x00],
    1: [0x71, 0x71, 0x92],
    3: [0x00, 0x82, 0xf3],
    4: [0xd3, 0x41, 0x00],
    5: [0xa2, 0x61, 0x00],
    6: [0xf3, 0xa2, 0x61],
    7: [0x00, 0xb2, 0x61],
    8: [0x00, 0x41, 0xd3],
    9: [0x00, 0x41, 0xc3],
    10: [0x00, 0xa2, 0xf3],
    11: [0x00, 0x71, 0x61],
    13: [0xe3, 0xb2, 0x51],
    14: [0xf3, 0xe3, 0xd3],
    15: [0xf3, 0xe3, 0xd3],
  };

function getBit(bytes: Uint8Array, bitIndex: number): number {
  const byte = bytes[Math.floor(bitIndex / 8)];
  if (byte === undefined) {
    throw new Error(`Unexpected end of regular tileset at bit ${bitIndex}`);
  }
  return (byte >> (7 - (bitIndex % 8))) & 1;
}

export async function readRegularTiles(path: string): Promise<Uint8Array> {
  const file = await readFile(path);
  const bytes = file.subarray(0, Math.floor(file.length / 2));
  const bitsPerTile = REGULAR_TILE_SIZE * REGULAR_TILE_SIZE * 4;
  const tileCount = Math.floor((bytes.length * 8) / bitsPerTile);
  const pixelsPerTile = REGULAR_TILE_SIZE * REGULAR_TILE_SIZE;
  const output = new Uint8Array(tileCount * pixelsPerTile * 3);

  for (let tile = 0; tile < tileCount; tile += 1) {
    const tileBitOffset = tile * bitsPerTile;
    for (let pixel = 0; pixel < pixelsPerTile; pixel += 1) {
      let paletteIndex = 0;
      for (let plane = 0; plane < 4; plane += 1) {
        paletteIndex =
          (paletteIndex << 1) |
          getBit(bytes, tileBitOffset + pixel + plane * pixelsPerTile);
      }

      const color = DAY_PALETTE[paletteIndex];
      if (color === undefined) {
        throw new Error(`Missing day palette color ${paletteIndex}`);
      }
      output.set(color, (tile * pixelsPerTile + pixel) * 3);
    }
  }

  return output;
}
