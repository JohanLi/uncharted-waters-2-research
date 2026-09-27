import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The NPC world-navigation graph (game-details/npc/fleet-navigation.md):
// DATA1.005 holds the active node count and DATA1.004 768 16-byte records.

export const WORLD_WIDTH = 0x870;
export const NO_NEIGHBOR = 0xffff;
const NODE_SIZE = 16;
const NODE_CAPACITY = 768;

export interface GraphNode {
  id: number;
  x: number;
  y: number;
  /** Bit 15 of the stored X, used by the player's auto-sail search. */
  marked: boolean;
  /** Up to four neighbour IDs, `NO_NEIGHBOR` for an empty slot. */
  neighbors: readonly number[];
  /** Cost byte of each link, in the same slot order. */
  costs: readonly number[];
}

export interface NavigationGraph {
  /** Active node count from DATA1.005 (622). */
  count: number;
  /** All 768 stored records; the search also scans record `count`. */
  nodes: readonly GraphNode[];
}

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export function parseGraph(
  nodeData: Uint8Array,
  countData: Uint8Array,
): NavigationGraph {
  const nodes = new DataView(
    nodeData.buffer,
    nodeData.byteOffset,
    nodeData.byteLength,
  );
  const count = new DataView(
    countData.buffer,
    countData.byteOffset,
    countData.byteLength,
  ).getUint16(0, true);
  const records: GraphNode[] = [];
  for (let id = 0; id < NODE_CAPACITY; id += 1) {
    const base = id * NODE_SIZE;
    const rawX = nodes.getUint16(base, true);
    records.push({
      id,
      x: rawX & 0x7fff,
      y: nodes.getUint16(base + 2, true),
      marked: (rawX & 0x8000) !== 0,
      neighbors: [0, 1, 2, 3].map((slot) =>
        nodes.getUint16(base + 4 + slot * 2, true),
      ),
      costs: [0, 1, 2, 3].map((slot) => nodes.getUint8(base + 12 + slot)),
    });
  }
  return { count, nodes: records };
}

export function loadGraph(
  rawDirectory = join(repositoryRoot, "raw"),
): NavigationGraph {
  return parseGraph(
    readFileSync(join(rawDirectory, "DATA1", "DATA1.004")),
    readFileSync(join(rawDirectory, "DATA1", "DATA1.005")),
  );
}
