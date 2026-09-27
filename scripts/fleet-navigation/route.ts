import { NO_NEIGHBOR, wrappedDx, type NavigationGraph } from "./graph.js";

// A transcription of MAIN.EXE's NPC route builder, 0x28A18–0x28F37, and its
// nearest-node scan, 0x28939–0x28A17. See game-details/npc/fleet-navigation.md.

export interface NearestNode {
  id: number;
  /** True when the point is exactly on the node (bit 15 of the result). */
  exact: boolean;
}

/**
 * 0x28939: the node with the smallest squared wrapped distance. The scan runs
 * from `graph.count` down to 0 with a strict `<`, so it includes the unused
 * record `graph.count` and prefers higher IDs on ties.
 */
export function nearestNode(
  graph: NavigationGraph,
  x: number,
  y: number,
): NearestNode {
  let best = Infinity;
  let bestId = -1;
  for (let id = graph.count; id >= 0; id -= 1) {
    const node = graph.nodes[id]!;
    const dx = wrappedDx(x, node.x);
    const dy = node.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < best) {
      best = distance;
      bestId = id;
    }
    if (best === 0) break;
  }
  return { id: bestId, exact: best === 0 };
}

interface QueueEntry {
  /** Neighbour slots already used, bit `8 >> slot`. */
  used: number;
  node: number;
  cost: number;
}

export interface SearchResult {
  /** Queue position of every reached node. */
  index: ReadonlyMap<number, number>;
  queue: readonly QueueEntry[];
  /** True when the start node was reached. */
  found: boolean;
}

export interface SearchOptions {
  /**
   * The player's auto-sail copy of the loop (0x28AAA–0x28C38) only follows
   * links into nodes whose X has bit 15 set.
   */
  playerFleet?: boolean;
}

/**
 * 0x28A18: search outward from `destination` until `start` is queued. Nodes
 * are expanded in discovery order; each link adds its cost byte, and a node
 * already queued keeps the smaller label (0x28B80–0x28BA9).
 */
export function searchGraph(
  graph: NavigationGraph,
  start: number,
  destination: number,
  options: SearchOptions = {},
): SearchResult {
  const index = new Map<number, number>([[destination, 0]]);
  const queue: QueueEntry[] = [{ used: 0, node: destination, cost: 0 }];
  let found = false;
  for (let head = 0; !found && head < queue.length; head += 1) {
    const entry = queue[head]!;
    if (entry.node === start) break;
    const node = graph.nodes[entry.node]!;
    for (let slot = 0; slot < 4; slot += 1) {
      const mask = 8 >> slot;
      if ((entry.used & mask) !== 0) continue;
      const neighbor = node.neighbors[slot]!;
      if (neighbor === NO_NEIGHBOR) continue;
      if (options.playerFleet && !graph.nodes[neighbor]!.marked) continue;
      const cost = entry.cost + node.costs[slot]!;
      entry.used |= mask;
      const backSlot = graph.nodes[neighbor]!.neighbors.indexOf(entry.node);
      const backMask = 8 >> backSlot;
      const existing = index.get(neighbor);
      if (existing === undefined) {
        index.set(neighbor, queue.length);
        queue.push({ used: backMask, node: neighbor, cost });
        if (neighbor === start) {
          found = true;
          break;
        }
      } else {
        const other = queue[existing]!;
        other.used |= backMask;
        if (other.cost > cost) other.cost = cost;
      }
    }
  }
  return { index, queue, found };
}

/**
 * Route reconstruction (0x28DE3–0x28E7A): from `start`, repeatedly take the
 * first used neighbour whose label plus the link cost equals the current
 * label. The game stops after four nodes (the fleet's route cache); pass
 * `Infinity` for the whole route.
 */
export function reconstructRoute(
  graph: NavigationGraph,
  search: SearchResult,
  start: number,
  destination: number,
  limit = 4,
): number[] {
  const path = [start];
  let current = start;
  while (current !== destination && path.length < limit) {
    const entry = search.queue[search.index.get(current)!]!;
    const node = graph.nodes[current]!;
    let next = -1;
    for (let slot = 0; slot < 4; slot += 1) {
      if ((entry.used & (8 >> slot)) === 0) continue;
      const neighbor = node.neighbors[slot]!;
      const position = search.index.get(neighbor);
      if (
        position !== undefined &&
        node.costs[slot]! + search.queue[position]!.cost === entry.cost
      ) {
        next = neighbor;
        break;
      }
    }
    if (next < 0) {
      throw new Error(`Route reconstruction failed at node ${current}`);
    }
    current = next;
    path.push(current);
  }
  return path;
}

export interface Route {
  start: NearestNode;
  destination: NearestNode;
  /** Node IDs from the start node to the destination node. */
  nodes: number[];
  /** Label of the start node: the route's summed cost. */
  cost: number;
}

/** The complete node route the game would follow between two world points. */
export function findRoute(
  graph: NavigationGraph,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: SearchOptions = {},
): Route | undefined {
  const start = nearestNode(graph, from.x, from.y);
  const destination = nearestNode(graph, to.x, to.y);
  if (start.exact && start.id === destination.id) {
    return { start, destination, nodes: [start.id], cost: 0 };
  }
  const search = searchGraph(graph, start.id, destination.id, options);
  if (!search.found && !search.index.has(start.id)) return undefined;
  const nodes = reconstructRoute(
    graph,
    search,
    start.id,
    destination.id,
    Infinity,
  );
  const cost = search.queue[search.index.get(start.id)!]!.cost;
  return { start, destination, nodes, cost };
}
