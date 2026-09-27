import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  colourWorldMap,
  MAP_HEIGHT,
  MAP_WIDTH,
  mapX,
  writeOverlayPng,
} from "../draw-world-map/overlay.js";
import { loadGraph, NO_NEIGHBOR, wrappedDx } from "./graph.js";
import { findRoute } from "./route.js";

// Draws the 622-node NPC navigation graph over the world map, with the two
// worked routes from game-details/npc/fleet-navigation.md highlighted.
// Requires scripts/draw-world-map/output/world-map.bin (pnpm draw-world-map).

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

function tileColour(tile: number): [number, number, number] {
  if (tile < 0x34) return [22, 52, 110]; // sea and coast
  if (tile >= 0x74 && tile <= 0x7b) return [230, 230, 230]; // ports
  return [70, 100, 70]; // other land, rivers and villages
}

// A link drawn as one or two segments, split where it crosses the map edge.
function linkPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): [number, number, number, number][] {
  const sx1 = mapX(x1);
  const sx2 = sx1 + wrappedDx(x1, x2);
  if (sx2 >= 0 && sx2 < MAP_WIDTH) return [[sx1, y1, sx2, y2]];
  const shift = sx2 < 0 ? MAP_WIDTH : -MAP_WIDTH;
  return [
    [sx1, y1, sx2, y2],
    [sx1 + shift, y1, sx2 + shift, y2],
  ];
}

export async function run(): Promise<void> {
  const pixels = await colourWorldMap(tileColour);

  const graph = loadGraph();
  const active = graph.nodes.slice(0, graph.count);
  let svg = `<svg width="${MAP_WIDTH}" height="${MAP_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;

  for (const node of active) {
    node.neighbors.forEach((neighbor) => {
      if (neighbor === NO_NEIGHBOR || neighbor < node.id) return;
      const other = graph.nodes[neighbor]!;
      for (const [a, b, c, d] of linkPath(node.x, node.y, other.x, other.y)) {
        svg += `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#ffd21f" stroke-width="1.5" stroke-opacity="0.8"/>`;
      }
    });
  }

  const LISBON = { x: 120, y: 358 };
  const examples = [
    {
      to: { x: 2064, y: 722 },
      colour: "#ff4136",
      label: "Lisbon → Pernambuco",
    },
    { to: { x: 1736, y: 532 }, colour: "#2ecc40", label: "Lisbon → Veracruz" },
  ];
  for (const example of examples) {
    const route = findRoute(graph, LISBON, example.to)!;
    for (let step = 1; step < route.nodes.length; step += 1) {
      const a = graph.nodes[route.nodes[step - 1]!]!;
      const b = graph.nodes[route.nodes[step]!]!;
      for (const [x1, y1, x2, y2] of linkPath(a.x, a.y, b.x, b.y)) {
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${example.colour}" stroke-width="5"/>`;
      }
    }
  }

  for (const node of active) {
    svg += `<circle cx="${mapX(node.x)}" cy="${node.y}" r="2.5" fill="#ffffff"/>`;
  }

  svg += `<rect x="20" y="${MAP_HEIGHT - 150}" width="360" height="130" fill="rgba(0,0,0,0.7)" rx="10"/>`;
  svg += `<line x1="40" y1="${MAP_HEIGHT - 115}" x2="80" y2="${MAP_HEIGHT - 115}" stroke="#ffd21f" stroke-width="3"/><text x="92" y="${MAP_HEIGHT - 107}" font-family="Helvetica,Arial" font-size="22" fill="white">Graph link (622 nodes)</text>`;
  examples.forEach((example, index) => {
    const y = MAP_HEIGHT - 80 + index * 36;
    svg += `<line x1="40" y1="${y}" x2="80" y2="${y}" stroke="${example.colour}" stroke-width="5"/><text x="92" y="${y + 8}" font-family="Helvetica,Arial" font-size="22" fill="white">${example.label}</text>`;
  });
  svg += `<text x="20" y="40" font-family="Helvetica,Arial" font-size="30" font-weight="bold" fill="white" stroke="black" stroke-width="5" paint-order="stroke">NPC navigation graph (DATA1.004)</text>`;
  svg += "</svg>";

  const outputDirectory = join(scriptDirectory, "output");
  await mkdir(outputDirectory, { recursive: true });
  const output = join(outputDirectory, "navigation-graph.png");
  await writeOverlayPng(output, pixels, svg);
  console.log(`Wrote ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
