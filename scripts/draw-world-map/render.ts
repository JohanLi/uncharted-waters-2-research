import { writeFile } from "node:fs/promises";
import { crc32, deflateSync } from "node:zlib";

import type { ByteGrid } from "./grid.js";
import { REGULAR_TILE_SIZE, type Rgb } from "./tilesets.js";

// The map uses at most 16 colours, so it is written as a 4-bit palette PNG
// straight from the tiles' palette indices. The compressed pixels do not
// depend on the palette, so one encoding serves every sea palette.

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BIT_DEPTH = 4;
const COLOUR_TYPE_PALETTE = 3;

function chunk(type: string, data: Uint8Array): Buffer {
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  output.write(type, 4, "ascii");
  output.set(data, 8);
  output.writeUInt32BE(
    crc32(output.subarray(4, 8 + data.length)),
    8 + data.length,
  );
  return output;
}

export interface IndexedWorldMap {
  readonly width: number;
  readonly height: number;
  /** zlib-compressed scanlines, each a filter byte and two pixels per byte. */
  readonly compressed: Buffer;
}

/** Packs the map's pixels as 4-bit palette indices, two per byte. */
export function renderIndexRows(
  worldMap: ByteGrid,
  tileIndices: Uint8Array,
): Buffer {
  const width = worldMap.columns * REGULAR_TILE_SIZE;
  const stride = 1 + width / 2;
  const rows = Buffer.alloc(stride * worldMap.rows * REGULAR_TILE_SIZE);

  let offset = 0;
  for (let mapRow = 0; mapRow < worldMap.rows; mapRow += 1) {
    for (let pixelRow = 0; pixelRow < REGULAR_TILE_SIZE; pixelRow += 1) {
      offset += 1; // filter type 0
      for (let mapColumn = 0; mapColumn < worldMap.columns; mapColumn += 1) {
        const tile = worldMap.data[mapRow * worldMap.columns + mapColumn]!;
        const source =
          (tile * REGULAR_TILE_SIZE + pixelRow) * REGULAR_TILE_SIZE;
        for (let pixel = 0; pixel < REGULAR_TILE_SIZE; pixel += 2) {
          rows[offset++] =
            (tileIndices[source + pixel]! << 4) |
            tileIndices[source + pixel + 1]!;
        }
      }
    }
  }
  return rows;
}

export function encodeWorldMap(
  worldMap: ByteGrid,
  tileIndices: Uint8Array,
): IndexedWorldMap {
  return {
    width: worldMap.columns * REGULAR_TILE_SIZE,
    height: worldMap.rows * REGULAR_TILE_SIZE,
    compressed: deflateSync(renderIndexRows(worldMap, tileIndices), {
      level: 9,
      memLevel: 9,
    }),
  };
}

export async function writeWorldMapPng(
  path: string,
  image: IndexedWorldMap,
  palette: readonly Rgb[],
): Promise<void> {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = BIT_DEPTH;
  header[9] = COLOUR_TYPE_PALETTE;
  await writeFile(
    path,
    Buffer.concat([
      PNG_SIGNATURE,
      chunk("IHDR", header),
      chunk("PLTE", Uint8Array.from(palette.flat())),
      chunk("IDAT", image.compressed),
      chunk("IEND", new Uint8Array()),
    ]),
  );
}
