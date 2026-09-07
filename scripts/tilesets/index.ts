import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expandTileMap, type ByteGrid } from "../draw-world-map/grid.js";
import {
  readLargeTiles,
  readRegularTiles,
} from "../draw-world-map/tilesets.js";
import { decodePlanar, prepareOutput, repoRoot, writePng } from "../shared.js";

const rgba = (hex: string): readonly number[] =>
  hex === "transparent" ? [0, 0, 0, 0] : [...Buffer.from(hex, "hex"), 255];
const shipPalette = [
  "000000",
  "00a261",
  "d34100",
  "f3a261",
  "0041d3",
  "00a2f3",
  "d361a2",
  "f3e3d3",
  "transparent",
].map(rgba);

function montage(
  tiles: Uint8Array,
  count: number,
  tileWidth: number,
  tileHeight: number,
  columns: number,
  channels: number,
): Uint8Array {
  const rows = Math.ceil(count / columns);
  const output = new Uint8Array(
    columns * tileWidth * rows * tileHeight * channels,
  );
  for (let tile = 0; tile < count; tile++) {
    const targetRow = Math.floor(tile / columns);
    const targetColumn = tile % columns;
    for (let row = 0; row < tileHeight; row++) {
      const source =
        (tile * tileWidth * tileHeight + row * tileWidth) * channels;
      const target =
        ((targetRow * tileHeight + row) * columns * tileWidth +
          targetColumn * tileWidth) *
        channels;
      output.set(tiles.subarray(source, source + tileWidth * channels), target);
    }
  }
  return output;
}

export async function run(): Promise<void> {
  const output = await prepareOutput("tilesets");
  const dataFile = join(repoRoot, "raw/DATA1/DATA1.011");
  const regular = await readRegularTiles(dataFile);
  await writePng(
    join(output, "regular-tileset.png"),
    montage(regular, 128, 16, 16, 16, 3),
    256,
    128,
    3,
  );

  const large = await readLargeTiles(join(repoRoot, "raw/DATA1/DATA1.018"));
  const tileMap: ByteGrid = {
    rows: 16,
    columns: 16,
    data: Uint8Array.from({ length: 256 }, (_, index) => index),
  };
  const regularIndices = expandTileMap(tileMap, large, 2, 2);
  const pixels = new Uint8Array(512 * 512 * 3);
  for (let row = 0; row < regularIndices.rows; row++)
    for (let col = 0; col < regularIndices.columns; col++) {
      const tile = regularIndices.data[row * regularIndices.columns + col]!;
      for (let y = 0; y < 16; y++) {
        const src = (tile * 256 + y * 16) * 3;
        const dst = ((row * 16 + y) * 512 + col * 16) * 3;
        pixels.set(regular.subarray(src, src + 48), dst);
      }
    }
  await writePng(join(output, "large-tileset.png"), pixels, 512, 512, 3);

  const raw = await readFile(dataFile);
  const ship = decodePlanar(raw.subarray(raw.length / 2), 16, 4, shipPalette);
  await writePng(
    join(output, "ship-tileset.png"),
    montage(ship.data, 32, 32, 32, 8, 4),
    256,
    128,
    4,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
