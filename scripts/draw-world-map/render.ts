import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import sharp from "sharp";

import type { ByteGrid } from "./grid.js";
import { REGULAR_TILE_SIZE } from "./tilesets.js";

export function* renderRgbRows(
  worldMap: ByteGrid,
  regularTiles: Uint8Array,
): Generator<Uint8Array> {
  const bytesPerTileRow = REGULAR_TILE_SIZE * 3;
  const pixelsPerTile = REGULAR_TILE_SIZE * REGULAR_TILE_SIZE;

  for (let mapRow = 0; mapRow < worldMap.rows; mapRow += 1) {
    for (let pixelRow = 0; pixelRow < REGULAR_TILE_SIZE; pixelRow += 1) {
      const outputRow = new Uint8Array(
        worldMap.columns * REGULAR_TILE_SIZE * 3,
      );
      for (let mapColumn = 0; mapColumn < worldMap.columns; mapColumn += 1) {
        const tile = worldMap.data[mapRow * worldMap.columns + mapColumn]!;
        const sourceStart =
          (tile * pixelsPerTile + pixelRow * REGULAR_TILE_SIZE) * 3;
        outputRow.set(
          regularTiles.subarray(sourceStart, sourceStart + bytesPerTileRow),
          mapColumn * bytesPerTileRow,
        );
      }
      yield outputRow;
    }
  }
}

export async function writeWorldMapPng(
  path: string,
  worldMap: ByteGrid,
  regularTiles: Uint8Array,
): Promise<void> {
  const encoder = sharp({
    raw: {
      width: worldMap.columns * REGULAR_TILE_SIZE,
      height: worldMap.rows * REGULAR_TILE_SIZE,
      channels: 3,
    },
  }).png();

  await pipeline(
    Readable.from(renderRgbRows(worldMap, regularTiles)),
    encoder,
    createWriteStream(path),
  );
}
