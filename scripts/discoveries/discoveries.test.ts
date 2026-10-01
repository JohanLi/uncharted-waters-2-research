import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "../shared.js";
import { position, run } from "./index.js";

test("discoveries match the new-game records", async () => {
  await run();
  const discoveries = JSON.parse(
    await readFile(
      join(repoRoot, "scripts/discoveries/output/discoveries.json"),
      "utf8",
    ),
  );
  assert.equal(discoveries.length, 98);

  const stonehenge = discoveries[0];
  assert.equal(stonehenge.name, "Stonehenge");
  assert.equal(stonehenge.type, "Ruins");
  assert.equal(stonehenge.latitude, "51N");
  assert.equal(stonehenge.longitude, "1W");
  assert.equal(stonehenge.adventureFame, 80);
  assert.equal(stonehenge.gold, 2500);

  // The game's type bits, not the name, decide the type.
  assert.equal(discoveries[50].name, "Piranha");
  assert.equal(discoveries[50].type, "Exotic Animal");

  const starred = discoveries.filter(
    (discovery: { starred: boolean }) => discovery.starred,
  );
  assert.equal(starred.length, 6);
  assert.ok(
    starred.every(
      (discovery: { adventureFame: number; gold: number }) =>
        discovery.adventureFame === 1500 && discovery.gold === 100_000,
    ),
  );
});

test("positions use the game's latitude and longitude conversion", () => {
  // Lisbon's area (buildings.md, Locate).
  assert.deepEqual(position(120, 358), { latitude: "39N", longitude: "9W" });
});
