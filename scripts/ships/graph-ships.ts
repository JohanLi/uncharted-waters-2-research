import { readFile } from "node:fs/promises";

import {
  decodeGraphRecord,
  readGraphRecords,
  type DecodedGraphImage,
} from "../art/graph-format.js";
import { writePng } from "../shared.js";

const SHIP_COUNT = 25;
const FIRST_SHIP_RECORD = 28;

export async function extractGraphShips(
  path: string,
): Promise<DecodedGraphImage[]> {
  const records = readGraphRecords(await readFile(path));
  return Array.from({ length: SHIP_COUNT }, (_, index) => {
    const record = records[FIRST_SHIP_RECORD + index];
    if (!record)
      throw new Error(`Missing GRAPH record ${FIRST_SHIP_RECORD + index}`);
    return decodeGraphRecord(record);
  });
}

export async function writeShipsPng(
  graphPath: string,
  outputPath: string,
): Promise<void> {
  const ships = await extractGraphShips(graphPath);
  const { width, height } = ships[0]!;
  if (ships.some((ship) => ship.width !== width || ship.height !== height))
    throw new Error("Ship GRAPH records have inconsistent dimensions");

  const output = new Uint8Array(width * ships.length * height * 3);
  for (let row = 0; row < height; row++) {
    for (const [index, ship] of ships.entries()) {
      const source = row * width * 3;
      const target = (row * width * ships.length + index * width) * 3;
      output.set(ship.pixels.subarray(source, source + width * 3), target);
    }
  }
  await writePng(outputPath, output, width * ships.length, height, 3);
}
