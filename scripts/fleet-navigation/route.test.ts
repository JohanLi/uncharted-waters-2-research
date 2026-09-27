import assert from "node:assert/strict";
import test from "node:test";

import { loadGraph, NO_NEIGHBOR } from "./graph.js";
import { findRoute, nearestNode } from "./route.js";

const graph = loadGraph();
const LISBON = { x: 120, y: 358 };

test("the graph has 622 active nodes with symmetric link costs", () => {
  assert.equal(graph.count, 622);
  for (const node of graph.nodes.slice(0, graph.count)) {
    node.neighbors.forEach((neighbor, slot) => {
      if (neighbor === NO_NEIGHBOR) return;
      const back = graph.nodes[neighbor]!;
      const backSlot = back.neighbors.indexOf(node.id);
      assert.notEqual(backSlot, -1, `${node.id} -> ${neighbor} is one-way`);
      assert.equal(back.costs[backSlot], node.costs[slot]);
    });
  }
});

test("Lisbon's nearest node is 184", () => {
  assert.deepEqual(nearestNode(graph, LISBON.x, LISBON.y), {
    id: 184,
    exact: false,
  });
});

test("the unused record 622 wins its tie with node 621", () => {
  const node = graph.nodes[621]!;
  assert.equal(nearestNode(graph, node.x, node.y).id, 622);
});

test("Lisbon to Pernambuco follows the southern route", () => {
  const route = findRoute(graph, LISBON, { x: 2064, y: 722 })!;
  assert.equal(route.destination.id, 463);
  assert.equal(route.nodes.length - 1, 49);
  assert.deepEqual(
    route.nodes.slice(0, 8),
    [184, 618, 617, 602, 601, 24, 25, 26],
  );
  assert.equal(route.cost, 7988);
});

test("Lisbon to Veracruz passes node 420", () => {
  const route = findRoute(graph, LISBON, { x: 1736, y: 532 })!;
  assert.equal(route.destination.id, 441);
  assert.equal(route.nodes.length - 1, 43);
  assert.ok(route.nodes.includes(420));
  assert.ok(!route.nodes.includes(421));
  assert.equal(route.cost, 6890);
});
