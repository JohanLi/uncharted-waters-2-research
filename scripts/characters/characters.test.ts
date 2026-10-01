import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "../shared.js";
import { run } from "./index.js";

const read = async (file: string) =>
  JSON.parse(
    await readFile(join(repoRoot, "scripts/characters/output", file), "utf8"),
  );

test("named characters and waitresses match the new-game records", async () => {
  await run();
  const named = await read("named-characters.json");
  const waitresses = await read("waitresses.json");

  assert.equal(named.length, 21);
  assert.deepEqual(
    named
      .filter((c: { role: string }) => c.role === "collector")
      .map((c: { portName: string; goldPercent: number }) => [
        c.portName,
        c.goldPercent,
      ]),
    [
      ["Lisbon", 100],
      ["Copenhagen", 80],
      ["Alexandria", 80],
      ["Pisa", 60],
      ["Bordeaux", 100],
    ],
  );
  assert.equal(named[9].name, "Mercator");
  assert.equal(named[9].goldPerCell, 80);
  assert.equal(named[12].name, "Suleiman II");
  assert.equal(named[12].nation, "Turkey");
  assert.equal(named[19].skill, "Gunnery");
  assert.equal(named[20].name, "Carlotta");

  assert.equal(waitresses.length, 30);
  assert.equal(waitresses[0].name, "Carlotta");
  assert.equal(waitresses[0].waitress, false);
  assert.equal(waitresses[1].name, "Lucia");
  assert.equal(waitresses[1].preference, "Everything");
  // Hadi (Cairo) is the one attendant the Waitress command skips.
  assert.equal(waitresses[23].name, "Hadi");
  assert.equal(waitresses[23].waitress, false);
  assert.equal(
    waitresses.filter((w: { waitress: boolean }) => w.waitress).length,
    28,
  );
});
