import { readFile } from "node:fs/promises";

import { createGrid, type ByteGrid } from "./grid.js";

const BLOCK_ROWS = 45;
const BLOCK_COLUMNS = 30;
const BLOCK_HEIGHT = 12;
const BLOCK_WIDTH = 12;
const BLOCK_SIZE = BLOCK_HEIGHT * BLOCK_WIDTH;

export function createBlockTemplate(number: number): Uint8Array {
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
        template[row * BLOCK_WIDTH + column] = 15;
      }
    }
  }

  return template;
}

function getBit(bytes: Uint8Array, bitIndex: number): number {
  const byte = bytes[Math.floor(bitIndex / 8)];
  if (byte === undefined) {
    throw new Error(`Unexpected end of world-map data at bit ${bitIndex}`);
  }

  return (byte >> (7 - (bitIndex % 8))) & 1;
}

function readByteAtBit(bytes: Uint8Array, bitIndex: number): number {
  let value = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value << 1) | getBit(bytes, bitIndex + bit);
  }
  return value;
}

export async function readWorldMapBlocks(path: string): Promise<ByteGrid> {
  const bytes = await readFile(path);
  let bitCursor = 2700 * 8;
  const output = createGrid(
    BLOCK_ROWS * BLOCK_HEIGHT,
    BLOCK_COLUMNS * BLOCK_WIDTH,
  );

  for (
    let blockIndex = 0;
    blockIndex < BLOCK_ROWS * BLOCK_COLUMNS;
    blockIndex += 1
  ) {
    const hasDifferences = getBit(bytes, bitCursor) === 0;
    let templateNumber = 0;
    for (let bit = 5; bit < 8; bit += 1) {
      templateNumber = (templateNumber << 1) | getBit(bytes, bitCursor + bit);
    }
    bitCursor += 8;

    const block = createBlockTemplate(templateNumber);
    if (hasDifferences) {
      const corrections: number[] = [];
      for (let index = 0; index < BLOCK_SIZE; index += 1) {
        if (getBit(bytes, bitCursor) === 1) {
          corrections.push(index);
        }
        bitCursor += 1;
      }

      for (const correction of corrections) {
        block[correction] = readByteAtBit(bytes, bitCursor);
        bitCursor += 8;
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
