import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import sharp from "sharp";

import {
  createGrid,
  expandTileMap,
  getCell,
  setCell,
  type ByteGrid,
} from "./grid.js";
import { encodeWorldMap, writeWorldMapPng } from "./render.js";
import {
  readLargeTiles,
  readRegularTileIndices,
  readSeaPalettes,
  SEA_PALETTE_NAMES,
} from "./tilesets.js";
import { combineWorldMaps, generateWorldMaps } from "./world-map.js";
import { createBlockTemplate, readWorldMapBlocks } from "./world-map-blocks.js";
import {
  applyCoastTable,
  climateOffset,
  keepLandTiles,
  restoreFixedLargeTiles,
} from "./world-map-processing.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rawDirectory = resolve(scriptDirectory, "../../raw");

function hash(chunks: Iterable<Uint8Array>): string {
  const digest = createHash("sha256");
  for (const chunk of chunks) {
    digest.update(chunk);
  }
  return digest.digest("hex");
}

test("block templates retain the legacy land quadrants", () => {
  assert.equal(
    createBlockTemplate(0).filter((value) => value === 15).length,
    72,
  );
  assert.equal(
    createBlockTemplate(1).filter((value) => value === 15).length,
    72,
  );
  assert.equal(
    createBlockTemplate(2).filter((value) => value === 15).length,
    72,
  );
  assert.equal(
    createBlockTemplate(3).filter((value) => value === 15).length,
    72,
  );
  assert.equal(
    createBlockTemplate(4).filter((value) => value === 15).length,
    144,
  );
  assert.equal(
    createBlockTemplate(5).filter((value) => value === 15).length,
    0,
  );
});

test("climate bands follow 24-row blocks", () => {
  assert.equal(climateOffset(0), 0x10);
  assert.equal(climateOffset(24), 8);
  assert.equal(climateOffset(24 * 14), 0);
  assert.equal(climateOffset(24 * 31 - 1), 0);
  assert.equal(climateOffset(24 * 31), 8);
  assert.equal(climateOffset(24 * 44 - 1), 8);
  assert.equal(climateOffset(24 * 44), 0x10);
});

test("the Antarctic coast south of Cape Town is temperate", async () => {
  const [europeAfrica] = await generateWorldMaps(rawDirectory);
  // Row 1055 is the last row of block row 43, so its coast is 0x07 + 8.
  assert.equal(getCell(europeAfrica!, 1055, 266), 0x0f);
  assert.equal(getCell(europeAfrica!, 1055, 267), 0x0f);
  assert.equal(getCell(europeAfrica!, 1056, 266), 0x51);
});

function crop(
  grid: ByteGrid,
  row: number,
  column: number,
  rows: number,
  columns: number,
): ByteGrid {
  const data = new Uint8Array(rows * columns);
  for (let offset = 0; offset < rows; offset += 1) {
    const start = (row + offset) * grid.columns + column;
    data.set(grid.data.subarray(start, start + columns), offset * columns);
  }
  return { rows, columns, data };
}

test("whole parts match every tile the sea view can show", async () => {
  // MAIN.EXE builds a 72 × 72 window of blocks around the fleet's block and
  // shows a 24 × 24 view starting 11 tiles left of and above the fleet, so
  // the view stays at least 12 tiles inside the window.
  const [largeTiles, coastTable] = await Promise.all([
    readLargeTiles(join(rawDirectory, "DATA1", "DATA1.018")),
    readFile(join(rawDirectory, "DATA1", "DATA1.010")),
  ]);
  const maps = await generateWorldMaps(rawDirectory);
  for (const [part, map] of maps.entries()) {
    const largeMap = await readWorldMapBlocks(
      join(rawDirectory, "WORLDMAP", `WORLDMAP.00${part}`),
    );
    const expanded = expandTileMap(largeMap, largeTiles, 2, 2);
    const kept = keepLandTiles(expanded, largeMap);
    for (let blockRow = 0; blockRow <= 42; blockRow += 1) {
      for (let blockColumn = 0; blockColumn <= 27; blockColumn += 1) {
        const [row, column] = [blockRow * 24, blockColumn * 24];
        const window = restoreFixedLargeTiles(
          applyCoastTable(crop(kept, row, column, 72, 72), coastTable, row),
          crop(expanded, row, column, 72, 72),
          crop(largeMap, row / 2, column / 2, 36, 36),
        );
        for (let r = 12; r < 60; r += 1) {
          for (let c = 12; c < 60; c += 1) {
            assert.equal(
              window.data[r * 72 + c],
              getCell(map, row + r, column + c),
              `part ${part} tile ${row + r},${column + c}`,
            );
          }
        }
      }
    }
  }
});

test("sea palettes come from MAIN.EXE", async () => {
  const palettes = await readSeaPalettes(join(rawDirectory, "MAIN.EXE"));
  // Colours 0–7 are shared; 8–15 change with the time of day.
  for (const name of SEA_PALETTE_NAMES) {
    assert.deepEqual(palettes[name].slice(0, 8), palettes.day.slice(0, 8));
  }
  assert.deepEqual(palettes.day[12], [0x00, 0x82, 0xf3]);
  assert.deepEqual(palettes.night[12], [0x00, 0x51, 0x61]);
  assert.deepEqual(palettes.fog[15], [0x71, 0x71, 0x71]);
});

test("combining orders each row as Americas, Europe/Africa, Asia", () => {
  const europeAfrica = createGrid(2, 2);
  const asia = createGrid(2, 2);
  const americas = createGrid(2, 2);
  [1, 2, 3, 4].forEach((value, index) => (europeAfrica.data[index] = value));
  [5, 6, 7, 8].forEach((value, index) => (asia.data[index] = value));
  [9, 10, 11, 12].forEach((value, index) => (americas.data[index] = value));

  const combined = combineWorldMaps([europeAfrica, asia, americas]);
  assert.deepEqual([...combined.data], [9, 10, 1, 2, 5, 6, 11, 12, 3, 4, 7, 8]);
});

test("grid access matches NumPy negative-index behavior", () => {
  const grid = createGrid(2, 2);
  setCell(grid, -1, -1, 7);
  assert.equal(getCell(grid, 1, 1), 7);
  assert.throws(() => getCell(grid, 2, 0), RangeError);
});

test("world maps and rendered pixels are unchanged", async () => {
  const expectedBinHashes = [
    "d42e9dd2a45a5e718f7b4eae49f0c95ce7a2a519def6b951c9aa88d827c2baaa",
    "70fdba9e6cdb93f2e00eb8b6021b62be9f4b4507a422777325158c8a8f96bb5b",
    "3503280d865746a3af7c1df49743081c89be9659d8db85ee2ee8c415cb897abf",
  ];
  const expectedRgbHashes = [
    "03cc550c91033bef3f878eb1a45ae3b6be73cb0bf7bb859b2119aeec9ddf2b86",
    "1f42c76ec91aeada9a17ceb3e99c4b4791c091f3ceb27912175ec4dfcef963fc",
    "4091199826e4da87c4db6c2d04bff03c47f06cd0550428bfd58c4b6c4d26e32c",
  ];
  const maps = await generateWorldMaps(rawDirectory);
  const { day } = await readSeaPalettes(join(rawDirectory, "MAIN.EXE"));
  const tileIndices = await readRegularTileIndices(
    join(rawDirectory, "DATA1", "DATA1.011"),
  );
  const directory = await mkdtemp(join(tmpdir(), "world-map-"));

  try {
    for (const [part, map] of maps.entries()) {
      assert.equal(map.rows, 1080);
      assert.equal(map.columns, 720);
      assert.equal(hash([map.data]), expectedBinHashes[part]);
      // Decode the written palette PNG to check its pixels independently.
      const path = join(directory, `world-map${part}.png`);
      await writeWorldMapPng(path, encodeWorldMap(map, tileIndices), day);
      const pixels = await sharp(path, { limitInputPixels: false })
        .toColourspace("srgb")
        .removeAlpha()
        .raw()
        .toBuffer();
      assert.equal(hash([pixels]), expectedRgbHashes[part]);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const combined = combineWorldMaps(maps);
  assert.equal(combined.rows, 1080);
  assert.equal(combined.columns, 2160);
  assert.equal(combined.data.length, 2_332_800);
  assert.equal(
    hash([combined.data]),
    "7b59a03619df9e88b21be7bf58eb7cc70d08297251a15ba8d3db11b90f4b7554",
  );
});
