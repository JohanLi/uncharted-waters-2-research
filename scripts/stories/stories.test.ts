import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "../shared.js";
import { run } from "./index.js";

test("stories list recruits, characters, ports, and event art by section", async () => {
  await run();
  const stories = JSON.parse(
    await readFile(
      join(repoRoot, "scripts/stories/output/stories.json"),
      "utf8",
    ),
  );
  assert.equal(stories.length, 6);
  // Section counts follow the research's story maps.
  assert.deepEqual(
    stories.map((story: { sections: number }) => story.sections),
    [6, 8, 6, 5, 4, 6],
  );

  const joao = stories[0];
  assert.deepEqual(
    joao.recruits.map((r: { sailor: number; section: number }) => [
      r.sailor,
      r.section,
    ]),
    [
      [69, 0],
      [70, 0],
      [71, 0],
    ],
  );
  // Catalina's Andreas joins in section 1, not at the start.
  assert.deepEqual(stories[1].recruits[1], {
    sailor: 73,
    name: "Andreas Paella",
    section: 1,
  });

  // Ernst's story scenes are in Amsterdam (Mercator) and Changan (Paula).
  assert.deepEqual(
    stories[3].ports.map((port: { name: string }) => port.name),
    ["Amsterdam", "Changan"],
  );
  // Hand-written names fill portraits that match no record.
  assert.deepEqual(
    joao.characters.find(
      (character: { portrait: number }) => character.portrait === 18,
    ),
    {
      portrait: 18,
      firstSection: 0,
      name: "Duke Leon",
      kind: "story character",
    },
  );
  // The main character's own portrait is not listed among their characters.
  assert.ok(
    !joao.characters.some(
      (character: { portrait: number }) => character.portrait === 0,
    ),
  );
});
