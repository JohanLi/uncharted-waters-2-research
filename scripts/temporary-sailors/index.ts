import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  decodeCString,
  prepareOutput,
  repoRoot,
  writeJson,
  writePng,
} from "../shared.js";

// Generated ("generic") sailor portraits and names, as built by MAIN.EXE.
// See game-details/sailors.md#generated-portraits-and-names.

const nations = [
  "Portugal",
  "Spain",
  "Turkey",
  "England",
  "Italy",
  "Holland",
  "Piracy",
] as const;

export const palette = [
  "000000",
  "00A060",
  "D04000",
  "F0A060",
  "0040D0",
  "00A0F0",
  "D060A0",
  "F0E0D0",
].map((hex) => [...Buffer.from(hex, "hex")] as const);

const width = 64;
const height = 80;
const rowBytes = 24; // 64 pixels × 3 bitplanes / 8
const partsStart = 0x49f01; // end of the KAO.LZW archive entries
const nationBytes = 0x60c0; // 1032 rows

// Rows within a nation's block, part heights, and where each part is drawn.
// `or` parts are ORed onto the palette indices already there (0x78D6).
const parts = {
  upper: { base: 0, height: 33, y: 0, or: false },
  lower: { base: 264, height: 47, y: 33, or: false },
  eyes: { base: 640, height: 18, y: 21, or: true },
  nose: { base: 784, height: 24, y: 29, or: true },
  mouth: { base: 880, height: 19, y: 45, or: true },
} as const;
type Part = keyof typeof parts;

/** Selector word `+0x12` → part indices (0x78D6). */
function decodeSelector(selector: number): Record<Part, number> {
  return {
    upper: selector & 7,
    lower: (selector >> 3) & 7,
    nose: (selector >> 6) & 3,
    eyes: (selector >> 8) & 7,
    mouth: (selector >> 11) & 7,
  };
}

function pixelIndex(kao: Uint8Array, row: number, x: number): number {
  const group = partsStart + row * rowBytes + Math.floor(x / 8) * 3;
  const shift = 7 - (x % 8);
  return (
    (((kao[group]! >> shift) & 1) << 2) |
    (((kao[group + 1]! >> shift) & 1) << 1) |
    ((kao[group + 2]! >> shift) & 1)
  );
}

export function composePortrait(
  kao: Uint8Array,
  nation: number,
  selector: number,
): Uint8Array {
  const indices = new Uint8Array(width * height);
  const nationRow = (nation * nationBytes) / rowBytes;
  const choice = decodeSelector(selector);
  for (const part of Object.keys(parts) as Part[]) {
    const { base, height: partHeight, y, or } = parts[part];
    const sourceRow = nationRow + base + choice[part] * partHeight;
    for (let row = 0; row < partHeight; row++)
      for (let x = 0; x < width; x++) {
        const value = pixelIndex(kao, sourceRow + row, x);
        const target = (y + row) * width + x;
        indices[target] = or ? indices[target]! | value : value;
      }
  }
  return indices;
}

export function toRgb(indices: Uint8Array, scale: number): Uint8Array {
  const rgb = new Uint8Array(indices.length * scale * scale * 3);
  for (let y = 0; y < height * scale; y++)
    for (let x = 0; x < width * scale; x++)
      rgb.set(
        palette[
          indices[Math.floor(y / scale) * width + Math.floor(x / scale)]!
        ]!,
        (y * width * scale + x) * 3,
      );
  return rgb;
}

/** NAME.TBL: 16 first/last name pairs per nation (Portugal to Holland), 9 + 9 bytes each. */
function readNames(table: Uint8Array): { first: string; last: string }[][] {
  return Array.from({ length: 6 }, (_, nation) =>
    Array.from({ length: 16 }, (_, index) => {
      const offset = (nation * 16 + index) * 18;
      return {
        first: decodeCString(table.subarray(offset, offset + 9)),
        last: decodeCString(table.subarray(offset + 9, offset + 18)),
      };
    }),
  );
}

/**
 * What the wiki's sailor generator needs: the seven nations' portrait part
 * banks exactly as stored (3 bitplanes per 64-pixel row; see composePortrait
 * for the layout) in generated-faces.bin, and the name table in
 * generated-names.json.
 */
export async function exportFaceData(): Promise<void> {
  const kao = await readFile(join(repoRoot, "raw/KAO.LZW"));
  if (kao.length !== partsStart + nations.length * nationBytes)
    throw new Error(`Unexpected KAO.LZW size ${kao.length}`);
  const names = readNames(await readFile(join(repoRoot, "raw/NAME.TBL")));
  const output = await prepareOutput("temporary-sailors");
  await writeFile(
    join(output, "generated-faces.bin"),
    kao.subarray(partsStart),
  );
  await writeJson(join(output, "generated-names.json"), {
    nations: nations.slice(0, 6),
    names,
  });
}

// mulberry32, so a run can be repeated with --seed.
function createRandom(seed: number): (n: number) => number {
  let state = seed >>> 0;
  return (n) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 2 ** 32) * n);
  };
}

export async function run(): Promise<void> {
  const seedArgument = process.argv.indexOf("--seed");
  const seed =
    seedArgument >= 0
      ? Number(process.argv[seedArgument + 1])
      : Math.floor(Math.random() * 2 ** 32);
  const random = createRandom(seed);
  const perNation = 10;
  const scale = 2;

  const kao = await readFile(join(repoRoot, "raw/KAO.LZW"));
  if (kao.length !== partsStart + nations.length * nationBytes)
    throw new Error(`Unexpected KAO.LZW size ${kao.length}`);
  const names = readNames(await readFile(join(repoRoot, "raw/NAME.TBL")));
  const output = await prepareOutput("temporary-sailors");

  const taken = new Set<string>();
  const sailors = [];
  const tileWidth = width * scale;
  const tileHeight = height * scale;
  const sheet = new Uint8Array(
    perNation * tileWidth * nations.length * tileHeight * 3,
  );

  for (let nation = 0; nation < nations.length; nation++)
    for (let index = 0; index < perNation; index++) {
      // 0x1D71D: first and last name drawn independently from the nation's
      // 16 entries, redrawn while another sailor has the same full name. The
      // game only creates sailors of nations 0–5; pirates here borrow a
      // random nation's names, as new pirate commanders do.
      const nameNation = nation < 6 ? nation : random(6);
      let name: string;
      do
        name = `${names[nameNation]![random(16)]!.first} ${names[nameNation]![random(16)]!.last}`;
      while (taken.has(name));
      taken.add(name);

      const selector = random(0x3fff) | 0xc000;
      const indices = composePortrait(kao, nation, selector);
      const rgb = toRgb(indices, scale);

      for (let row = 0; row < tileHeight; row++)
        sheet.set(
          rgb.subarray(row * tileWidth * 3, (row + 1) * tileWidth * 3),
          ((nation * tileHeight + row) * perNation * tileWidth +
            index * tileWidth) *
            3,
        );
      sailors.push({
        nation: nations[nation],
        name,
        ...(nameNation !== nation && { namesFrom: nations[nameNation] }),
        selector: `0x${selector.toString(16).toUpperCase()}`,
        parts: decodeSelector(selector),
        row: nation + 1,
        column: index + 1,
      });
    }

  await writePng(
    join(output, "sailors.png"),
    sheet,
    perNation * tileWidth,
    nations.length * tileHeight,
    3,
  );
  await writeJson(join(output, "sailors.json"), { seed, sailors });
  console.log(`Wrote ${sailors.length} sailors to ${output} (seed ${seed})`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
