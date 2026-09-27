import { readFileSync } from "node:fs";
import { join } from "node:path";

import { repoRoot, saveSlotBase } from "../shared.js";
import { loadGraph } from "./graph.js";
import { findRoute } from "./route.js";

// Prints the node route an NPC fleet would follow between two points.
//   pnpm navigation-route <from> <to>
// Each point is either a port ID (its position in the port table of
// raw/KOUKAI2.DAT save slot 1) or save/game world coordinates written as "x,y"
// (not the drawn map's, which are shifted 720 tiles east).

const PORT_TABLE = 0x4f40;
const PORT_SIZE = 20;
const PORT_NAME = 0x04;
const PORT_NAME_SIZE = 15;

function portPoint(port: number): { x: number; y: number; name: string } {
  const save = readFileSync(join(repoRoot, "raw", "KOUKAI2.DAT"));
  const base = saveSlotBase(1) + PORT_TABLE + port * PORT_SIZE;
  const nameBytes = save.subarray(
    base + PORT_NAME,
    base + PORT_NAME + PORT_NAME_SIZE,
  );
  const end = nameBytes.indexOf(0);
  return {
    x: save.readUInt16LE(base),
    y: save.readUInt16LE(base + 2),
    name: nameBytes.subarray(0, end < 0 ? undefined : end).toString("latin1"),
  };
}

function parsePoint(argument: string | undefined) {
  if (argument === undefined) {
    throw new Error("Usage: navigation-route <port|x,y> <port|x,y>");
  }
  if (argument.includes(",")) {
    const [x, y] = argument.split(",").map(Number);
    return { x: x!, y: y!, name: argument };
  }
  return portPoint(Number(argument));
}

const from = parsePoint(process.argv[2]);
const to = parsePoint(process.argv[3]);
const graph = loadGraph();
const route = findRoute(graph, from, to);
if (!route) {
  console.log(`No route from ${from.name} to ${to.name}.`);
} else {
  console.log(
    `${from.name} (${from.x},${from.y}) -> ${to.name} (${to.x},${to.y})`,
  );
  console.log(
    `nodes ${route.start.id} -> ${route.destination.id}: ` +
      `${route.nodes.length - 1} links, cost ${route.cost}`,
  );
  console.log(route.nodes.join(", "));
}
