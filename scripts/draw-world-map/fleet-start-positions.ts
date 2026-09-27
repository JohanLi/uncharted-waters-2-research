import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { repoRoot, saveSlotBase } from "../shared.js";
import {
  colourWorldMap,
  MAP_HEIGHT,
  MAP_WIDTH,
  mapX,
  writeOverlayPng,
} from "./overlay.js";

// Draws where every active fleet (fleet +0x29 bit 0x01) starts in a new game
// (raw/KOUKAI2.DAT, save slot 1) on top of the decoded world map. Requires
// scripts/draw-world-map/output/world-map.bin (run `pnpm draw-world-map`).

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

const FLEET_TABLE = 0x1de0;
const FLEET_SIZE = 0x85;
const FLEET_COUNT = 70;
const FLEET_FLAGS = 0x29;
const FLEET_ACTIVE = 0x01;

// Fleets 10n–10n+9 belong to nation n; 60–69 are the pirates.
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
  return [70, 120, 70]; // other land, rivers and villages
}

export async function run(): Promise<void> {
  const pixels = await colourWorldMap(tileColour);
  const save = await readFile(join(repoRoot, "raw", "KOUKAI2.DAT"));

  let svg = `<svg width="${MAP_WIDTH}" height="${MAP_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
  for (let fleet = 0; fleet < FLEET_COUNT; fleet += 1) {
    const record = saveSlotBase(1) + FLEET_TABLE + fleet * FLEET_SIZE;
    if ((save[record + FLEET_FLAGS]! & FLEET_ACTIVE) === 0) continue;
    const x = mapX(save.readUInt16LE(record));
    const y = save.readUInt16LE(record + 2);
    const colour = NATIONS[Math.floor(fleet / 10)]![1];
    svg += `<circle cx="${x}" cy="${y}" r="9" fill="${colour}" stroke="white" stroke-width="3"/>`;
    svg += `<text x="${x + 12}" y="${y + 6}" font-family="Helvetica,Arial" font-size="18" font-weight="bold" fill="white" stroke="black" stroke-width="4" paint-order="stroke">${fleet}</text>`;
  }
  svg += `<rect x="20" y="${MAP_HEIGHT - 300}" width="230" height="280" fill="rgba(0,0,0,0.65)" rx="10"/>`;
  NATIONS.forEach(([name, colour], index) => {
    const y = MAP_HEIGHT - 265 + index * 36;
    svg += `<circle cx="50" cy="${y}" r="11" fill="${colour}" stroke="white" stroke-width="3"/>`;
    svg += `<text x="72" y="${y + 8}" font-family="Helvetica,Arial" font-size="24" fill="white">${name}</text>`;
  });
  svg += `<text x="20" y="40" font-family="Helvetica,Arial" font-size="30" font-weight="bold" fill="white" stroke="black" stroke-width="5" paint-order="stroke">Fleet starting positions in a new game; labels are fleet IDs</text>`;
  svg += "</svg>";

  const output = join(scriptDirectory, "output", "fleet-start-positions.png");
  await writeOverlayPng(output, pixels, svg);
  console.log(`Wrote ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
