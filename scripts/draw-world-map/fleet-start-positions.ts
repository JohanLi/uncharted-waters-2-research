import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

// Draws where every autonomous fleet starts in a new game (raw/KOUKAI2.DAT,
// save slot 1) on top of the decoded world map. Requires
// scripts/draw-world-map/output/world-map.bin (run `pnpm draw-world-map`).

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, "..", "..");

const WIDTH = 2160;
const HEIGHT = 1080;
// Save coordinates start at a different longitude from the drawn map.
const X_OFFSET = 720;

const SLOT_BASE = 0x97;
const FLEET_TABLE = 0x1de0;
const FLEET_SIZE = 0x85;
const FLEET_FLAGS = 0x29;

const NATIONS = [
  ["Portugal", "#2e7dff"],
  ["Spain", "#ffd21f"],
  ["Turkey", "#2ecc40"],
  ["England", "#ff4136"],
  ["Italy", "#b10dc9"],
  ["Holland", "#ff851b"],
  ["Pirates", "#111111"],
] as const;

function tileColour(tile: number): [number, number, number] {
  if (tile < 0x34) return [30, 70, 140]; // sea and coast
  if (tile >= 0x74 && tile <= 0x7b) return [250, 250, 250]; // ports
  if (tile === 0x59) return [200, 180, 120]; // desert
  if (tile <= 0x3f) return [120, 110, 100]; // mountains
  return [70, 120, 70];
}

const worldMap = await readFile(
  join(scriptDirectory, "output", "world-map.bin"),
);
const save = await readFile(join(repositoryRoot, "raw", "KOUKAI2.DAT"));

const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
  pixels.set(tileColour(worldMap[index]!), index * 3);
}

let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
for (let fleet = 0; fleet < 70; fleet += 1) {
  const record = SLOT_BASE + FLEET_TABLE + fleet * FLEET_SIZE;
  if ((save[record + FLEET_FLAGS]! & 0x01) === 0) continue; // inactive
  const x = (save.readUInt16LE(record) + X_OFFSET) % WIDTH;
  const y = save.readUInt16LE(record + 2);
  const colour = NATIONS[Math.floor(fleet / 10)]![1];
  svg += `<circle cx="${x}" cy="${y}" r="9" fill="${colour}" stroke="white" stroke-width="3"/>`;
  svg += `<text x="${x + 12}" y="${y + 6}" font-family="Helvetica,Arial" font-size="18" font-weight="bold" fill="white" stroke="black" stroke-width="4" paint-order="stroke">${fleet}</text>`;
}
svg += `<rect x="20" y="${HEIGHT - 300}" width="230" height="280" fill="rgba(0,0,0,0.65)" rx="10"/>`;
NATIONS.forEach(([name, colour], index) => {
  const y = HEIGHT - 265 + index * 36;
  svg += `<circle cx="50" cy="${y}" r="11" fill="${colour}" stroke="white" stroke-width="3"/>`;
  svg += `<text x="72" y="${y + 8}" font-family="Helvetica,Arial" font-size="24" fill="white">${name}</text>`;
});
svg += `<text x="20" y="40" font-family="Helvetica,Arial" font-size="30" font-weight="bold" fill="white" stroke="black" stroke-width="5" paint-order="stroke">Fleet starting positions in a new game; labels are fleet IDs</text>`;
svg += "</svg>";

const output = join(scriptDirectory, "output", "fleet-start-positions.png");
await sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .composite([{ input: Buffer.from(svg) }])
  .png()
  .toFile(output);
console.log(`Wrote ${output}`);
