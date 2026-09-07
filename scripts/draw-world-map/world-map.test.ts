import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createGrid, getCell, setCell } from "./grid.js";
import { renderRgbRows } from "./render.js";
import { readRegularTiles } from "./tilesets.js";
import { combineWorldMaps, generateWorldMaps } from "./world-map.js";
import { createBlockTemplate } from "./world-map-blocks.js";
import { applyManualCorrections } from "./world-map-processing.js";

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

test("manual corrections update only their intended map parts", () => {
  const partZero = createGrid(1080, 720);
  const partOne = createGrid(1080, 720);
  const partTwo = createGrid(1080, 720);
  applyManualCorrections(partZero, 0);
  applyManualCorrections(partOne, 1);
  applyManualCorrections(partTwo, 2);

  assert.equal(getCell(partZero, 444, 366), 28);
  assert.equal(getCell(partOne, 444, 366), 0);
  assert.equal(getCell(partTwo, 1061, 435), 12);
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

test("world maps and rendered pixels match the Python reference", async () => {
  const expectedBinHashes = [
    "bb875112b123ecc9001c3d54a939fb4572a68b6fa042d81bcd00c1095e8013e1",
    "74af4929d8e336b42309798e1e7fe7531bd36cc62b19d76f13754cdc12050c68",
    "4e56a71aecc19922d07ad7a3f97b63800aab9ceac9f23e4e91c2945494650ce6",
  ];
  const expectedRgbHashes = [
    "9901430fec2cd0414c79f8236cf6f2ecb17ac0f2e73fd5f52843bdae5705b9bc",
    "fd6aa0c8534c5006849648229bc0a8d4b97ec2f48b4b8217bf44f8c8f54b86ba",
    "c6de05cca23b5557b30d4342395729609b21d4d9cad415514d46a5a0174288f9",
  ];
  const maps = await generateWorldMaps(rawDirectory);
  const regularTiles = await readRegularTiles(
    join(rawDirectory, "DATA1", "DATA1.011"),
  );

  for (const [part, map] of maps.entries()) {
    assert.equal(map.rows, 1080);
    assert.equal(map.columns, 720);
    assert.equal(hash([map.data]), expectedBinHashes[part]);
    assert.equal(
      hash(renderRgbRows(map, regularTiles)),
      expectedRgbHashes[part],
    );
  }

  const combined = combineWorldMaps(maps);
  assert.equal(combined.rows, 1080);
  assert.equal(combined.columns, 2160);
  assert.equal(combined.data.length, 2_332_800);
  assert.equal(
    hash([combined.data]),
    "5cba4d932859f4ee76c26181abe1de89487b716c253127dfa9372f125dd8131d",
  );
});
