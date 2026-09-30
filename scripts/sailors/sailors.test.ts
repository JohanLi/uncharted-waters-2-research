import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "../shared.js";
import { run } from "./index.js";

const output = (file: string) => join(repoRoot, "scripts/sailors/output", file);

test("sailors and fleets match the new-game records", async () => {
  await run();
  const sailors = JSON.parse(await readFile(output("sailors.json"), "utf8"));
  const fleets = JSON.parse(await readFile(output("fleets.json"), "utf8"));
  assert.equal(sailors.length, 120);
  assert.equal(fleets.length, 70);

  const joao = sailors[0];
  assert.equal(joao.name, "Joao Franco");
  assert.equal(joao.role, "main character");
  assert.deepEqual(joao.skills, ["Negotiation"]);

  // Domingo's fixed portrait, before the story renames him Prince Alberto.
  assert.deepEqual(sailors[71].portrait, { kind: "fixed", kao: 0x21 });
  assert.equal(sailors[71].role, "story");
  assert.equal(sailors[77].nation, "Holland");

  const khan = sailors[60];
  assert.equal(khan.role, "story fleet");
  assert.equal(fleets[60].captain, 60);
  assert.deepEqual(
    fleets[60].ships.map((ship: { name: string }) => ship.name).sort(),
    [...Array(4).fill("Carrack"), ...Array(5).fill("Galleon"), "Nao"].sort(),
  );

  assert.equal(fleets[1].captain, 6);
  assert.equal(fleets[1].class, "merchant");
  assert.equal(fleets[61].captain, 114);
  assert.equal(sailors[114].canVanish, true);
});
