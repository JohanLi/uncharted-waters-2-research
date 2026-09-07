import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expandTileMap, type ByteGrid } from "./grid.js";
import { readLargeTiles } from "./tilesets.js";
import { readWorldMapBlocks } from "./world-map-blocks.js";
import {
  applyManualCorrections,
  createProcessingContext,
  fillDeserts,
  replaceCoasts,
  replaceDesertCoasts,
  updateClimateTerrain,
} from "./world-map-processing.js";

export async function generateWorldMaps(
  rawDirectory: string,
): Promise<ByteGrid[]> {
  const [largeTiles, coastalMap] = await Promise.all([
    readLargeTiles(join(rawDirectory, "DATA1", "DATA1.018")),
    readFile(join(rawDirectory, "DATA1", "DATA1.010")),
  ]);
  const context = createProcessingContext();
  const maps: ByteGrid[] = [];

  for (let part = 0; part < 3; part += 1) {
    const blocks = await readWorldMapBlocks(
      join(rawDirectory, "WORLDMAP", `WORLDMAP.00${part}`),
    );
    const worldMap = expandTileMap(blocks, largeTiles, 2, 2);
    fillDeserts(worldMap);
    replaceCoasts(worldMap, coastalMap, context);
    replaceDesertCoasts(worldMap, context);
    updateClimateTerrain(worldMap);
    applyManualCorrections(worldMap, part);
    maps.push(worldMap);
  }

  return maps;
}

export function combineWorldMaps(parts: readonly ByteGrid[]): ByteGrid {
  if (parts.length !== 3) {
    throw new Error(`Expected 3 world-map parts, received ${parts.length}`);
  }
  const [europeAfrica, asia, americas] = parts;
  if (
    europeAfrica === undefined ||
    asia === undefined ||
    americas === undefined
  ) {
    throw new Error("All three world-map parts are required");
  }
  if (
    europeAfrica.rows !== asia.rows ||
    europeAfrica.rows !== americas.rows ||
    europeAfrica.columns !== asia.columns ||
    europeAfrica.columns !== americas.columns
  ) {
    throw new Error("World-map parts must have matching dimensions");
  }

  const columns = europeAfrica.columns * 3;
  const data = new Uint8Array(europeAfrica.rows * columns);
  for (let row = 0; row < europeAfrica.rows; row += 1) {
    const destination = row * columns;
    const source = row * europeAfrica.columns;
    data.set(
      americas.data.subarray(source, source + americas.columns),
      destination,
    );
    data.set(
      europeAfrica.data.subarray(source, source + europeAfrica.columns),
      destination + americas.columns,
    );
    data.set(
      asia.data.subarray(source, source + asia.columns),
      destination + americas.columns + europeAfrica.columns,
    );
  }

  return { rows: europeAfrica.rows, columns, data };
}
