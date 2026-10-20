import { readFile } from "node:fs/promises";

import { createGrid, type ByteGrid } from "./grid.js";

// Block reader of MAIN.EXE 0x282AA (0x282BB–0x283CB): the game reads only the
// 3 × 3 blocks around the fleet; this reads every block of a map part.

const BLOCK_ROWS = 45;
const BLOCK_COLUMNS = 30;
const BLOCK_HEIGHT = 12;
const BLOCK_WIDTH = 12;
const BLOCK_SIZE = BLOCK_HEIGHT * BLOCK_WIDTH;
const BLOCK_DATA = BLOCK_ROWS * BLOCK_COLUMNS * 2;
const NO_CORRECTIONS = 0x80;
const FIRST_TEMPLATE = 0x78;
const LAND = 15;

/**
 * The six templates at DS:0xB014 + 144 × n: left, right, top or bottom half
 * land, all land, all sea. A block byte of 0x7E or 0x7F would index the
 * unrelated data after them; no block uses one.
 */
export const TEMPLATE_COUNT = 6;

export function createBlockTemplate(number: number): Uint8Array {
  if (!Number.isInteger(number) || number < 0 || number >= TEMPLATE_COUNT) {
    throw new RangeError(`No world-map block template ${number}`);
  }
  const template = new Uint8Array(BLOCK_SIZE);

  for (let row = 0; row < BLOCK_HEIGHT; row += 1) {
    for (let column = 0; column < BLOCK_WIDTH; column += 1) {
      const isLand =
        (number === 0 && column < 6) ||
        (number === 1 && column >= 6) ||
        (number === 2 && row < 6) ||
        (number === 3 && row >= 6) ||
        number === 4;

      if (isLand) {
        template[row * BLOCK_WIDTH + column] = LAND;
      }
    }
  }

  return template;
}

/**
 * A part opens with a little-endian offset for each block, counted from the
 * end of the offset table (0x282C0–0x282DD). A block starts with one byte:
 * bit 7 set means no corrections, and the low seven bits are 0x78 + the
 * template (0x28301–0x28317). Values below 0x78 make the game skip the block
 * (0x2830A); none occur. Without bit 7 an 18-byte mask follows, one bit per
 * large tile from the most significant, and then one byte for each set bit,
 * replacing that tile of the template (0x2833C–0x283A7).
 */
export async function readWorldMapBlocks(path: string): Promise<ByteGrid> {
  const bytes = await readFile(path);
  const output = createGrid(
    BLOCK_ROWS * BLOCK_HEIGHT,
    BLOCK_COLUMNS * BLOCK_WIDTH,
  );

  for (
    let blockIndex = 0;
    blockIndex < BLOCK_ROWS * BLOCK_COLUMNS;
    blockIndex += 1
  ) {
    let cursor = BLOCK_DATA + bytes.readUInt16LE(blockIndex * 2);
    const header = bytes[cursor++];
    if (header === undefined) {
      throw new Error(`Block ${blockIndex} starts past the end of ${path}`);
    }
    const value = header & ~NO_CORRECTIONS;
    if (value < FIRST_TEMPLATE || value >= FIRST_TEMPLATE + TEMPLATE_COUNT) {
      throw new Error(
        `Block ${blockIndex} has byte 0x${header.toString(16)}, which names no template`,
      );
    }

    const block = createBlockTemplate(value - FIRST_TEMPLATE);
    if ((header & NO_CORRECTIONS) === 0) {
      const mask = bytes.subarray(cursor, cursor + BLOCK_SIZE / 8);
      cursor += BLOCK_SIZE / 8;
      for (let index = 0; index < BLOCK_SIZE; index += 1) {
        if ((mask[index >> 3]! >> (7 - (index & 7))) & 1) {
          const tile = bytes[cursor++];
          if (tile === undefined) {
            throw new Error(`Block ${blockIndex} runs past the end of ${path}`);
          }
          block[index] = tile;
        }
      }
    }

    const blockRow = Math.floor(blockIndex / BLOCK_COLUMNS);
    const blockColumn = blockIndex % BLOCK_COLUMNS;
    for (let row = 0; row < BLOCK_HEIGHT; row += 1) {
      const sourceStart = row * BLOCK_WIDTH;
      const destinationStart =
        (blockRow * BLOCK_HEIGHT + row) * output.columns +
        blockColumn * BLOCK_WIDTH;
      output.data.set(
        block.subarray(sourceStart, sourceStart + BLOCK_WIDTH),
        destinationStart,
      );
    }
  }

  return output;
}
