import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { loadGraph, NO_NEIGHBOR, WORLD_WIDTH } from "./graph.js";
import { findRoute } from "./route.js";

// Draws the 622-node NPC navigation graph over the world map, with the two
// worked routes from game-details/npc/fleet-navigation.md highlighted.
// Requires scripts/draw-world-map/output/world-map.bin (pnpm draw-world-map).

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, "..", "..");
const WIDTH = 2160;
const HEIGHT = 1080;
// Save coordinates start at a different longitude from the drawn map.
const X_OFFSET = 720;

const screenX = (x: number) => (x + X_OFFSET) % WIDTH;

function tileColour(tile: number): [number, number, number] {
  if (tile < 0x34) return [22, 52, 110];
  if (tile >= 0x74 && tile <= 0x7b) return [230, 230, 230];
  return [70, 100, 70];
}

// A link drawn as one or two segments, split where it crosses the map edge.
function linkPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): [number, number, number, number][] {
  let dx = x2 - x1;
  if (dx > WORLD_WIDTH / 2) dx -= WORLD_WIDTH;
  else if (dx < -WORLD_WIDTH / 2) dx += WORLD_WIDTH;
  const sx1 = screenX(x1);
  const sx2 = sx1 + dx;
  if (sx2 >= 0 && sx2 < WIDTH) return [[sx1, y1, sx2, y2]];
  const shift = sx2 < 0 ? WIDTH : -WIDTH;
  return [
    [sx1, y1, sx2, y2],
    [sx1 + shift, y1, sx2 + shift, y2],
  ];
}

const worldMap = await readFile(
  join(repositoryRoot, "scripts", "draw-world-map", "output", "world-map.bin"),
);
const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
  pixels.set(tileColour(worldMap[index]!), index * 3);
}

const graph = loadGraph();
const active = graph.nodes.slice(0, graph.count);
let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;

for (const node of active) {
  node.neighbors.forEach((neighbor) => {
    if (neighbor === NO_NEIGHBOR || neighbor < node.id) return;
    const other = graph.nodes[neighbor]!;
    for (const [a, b, c, d] of linkPath(node.x, node.y, other.x, other.y)) {
      svg += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#ffd21f" stroke-width="1.5" stroke-opacity="0.8"/>`;
    }
  });
}

const examples = [
  { to: { x: 2064, y: 722 }, colour: "#ff4136", label: "Lisbon → Pernambuco" },
  { to: { x: 1736, y: 532 }, colour: "#2ecc40", label: "Lisbon → Veracruz" },
];
for (const example of examples) {
  const route = findRoute(graph, { x: 120, y: 358 }, example.to)!;
  for (let step = 1; step < route.nodes.length; step += 1) {
    const a = graph.nodes[route.nodes[step - 1]!]!;
    const b = graph.nodes[route.nodes[step]!]!;
    for (const [x1, y1, x2, y2] of linkPath(a.x, a.y, b.x, b.y)) {
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${example.colour}" stroke-width="5"/>`;
    }
  }
}

for (const node of active) {
  svg += `<circle cx="${screenX(node.x)}" cy="${node.y}" r="2.5" fill="#ffffff"/>`;
}

svg += `<rect x="20" y="${HEIGHT - 150}" width="360" height="130" fill="rgba(0,0,0,0.7)" rx="10"/>`;
svg += `<line x1="40" y1="${HEIGHT - 115}" x2="80" y2="${HEIGHT - 115}" stroke="#ffd21f" stroke-width="3"/><text x="92" y="${HEIGHT - 107}" font-family="Helvetica,Arial" font-size="22" fill="white">Graph link (622 nodes)</text>`;
examples.forEach((example, index) => {
  const y = HEIGHT - 80 + index * 36;
  svg += `<line x1="40" y1="${y}" x2="80" y2="${y}" stroke="${example.colour}" stroke-width="5"/><text x="92" y="${y + 8}" font-family="Helvetica,Arial" font-size="22" fill="white">${example.label}</text>`;
});
svg += `<text x="20" y="40" font-family="Helvetica,Arial" font-size="30" font-weight="bold" fill="white" stroke="black" stroke-width="5" paint-order="stroke">NPC navigation graph (DATA1.004)</text>`;
svg += "</svg>";

const outputDirectory = join(scriptDirectory, "output");
await mkdir(outputDirectory, { recursive: true });
const output = join(outputDirectory, "navigation-graph.png");
await sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .composite([{ input: Buffer.from(svg) }])
  .png()
  .toFile(output);
console.log(`Wrote ${output}`);
