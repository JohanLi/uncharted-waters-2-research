import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { run as extractArt } from "./art/index.js";
import { run as extractDueling } from "./dueling/index.js";
import { run as extractPortraits } from "./portraits-items-discoveries/index.js";
import { run as extractPorts } from "./ports/index.js";
import { run as extractShips } from "./ships/index.js";
import { run as drawTilesets } from "./tilesets/index.js";
import { run as drawWinds } from "./winds-current-anomalies/index.js";
import { repoRoot } from "./shared.js";

const output = (domain: string, file: string) =>
  join(repoRoot, "scripts", domain, "output", file);
const digest = (data: Uint8Array | string) =>
  createHash("sha256").update(data).digest("hex");
async function jsonDigest(domain: string, file: string) {
  return digest(
    JSON.stringify(JSON.parse(await readFile(output(domain, file), "utf8"))),
  );
}
async function pixelDigest(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of sharp(path).raw()) hash.update(chunk);
  return hash.digest("hex");
}

test("all migrated domain extractors produce compatible artifacts", async () => {
  await drawTilesets();
  await drawWinds();
  await extractPorts();
  await extractShips();
  await extractArt();
  await extractPortraits();
  await extractDueling();

  assert.equal(
    await pixelDigest(output("tilesets", "regular-tileset.png")),
    "4ca5d4dc91d90b936bbfa13b79370206a726d81ed8b75c04659d22b0691862b5",
  );
  assert.equal(
    await pixelDigest(output("tilesets", "large-tileset.png")),
    "45f1b9d9f8aec496b7b71d2095422389d137ec2a037b2986189d7cc7ddcf2cad",
  );
  assert.equal(
    await pixelDigest(output("tilesets", "ship-tileset.png")),
    "1d783156ecf77ff6cef767f85a67c3ec3327513181c1385cd22aafe455de9928",
  );
  assert.equal(
    await pixelDigest(output("ships", "ships.png")),
    "3a1ad5c1679a10964acc4507a3cbe89c437b2164e8e019617d9b13b108336bad",
  );
  assert.equal(
    await pixelDigest(output("art", "graph-art/large-contact-sheet.png")),
    "42f26446482497b49a79360d2f29e3871ec6ff656fa220ff13d4a5967250627d",
  );
  assert.equal(
    await pixelDigest(output("art", "graph-art/graph-006-136x112.png")),
    "d48e7fbf62051586b05ad5fda56a4555154157a2fce69635ee1d89dd168122bc",
  );
  assert.equal((await readdir(output("art", "event-art"))).length, 32);
  assert.equal((await readdir(output("art", "graph-art"))).length, 141);
  const expectedJson: ReadonlyArray<[string, string, string]> = [
    [
      "ports",
      "ports.json",
      "f1fb72c8514b7699877a88474e990e25804ef456cdb1aca8c3bfc3b780348646",
    ],
    [
      "ships",
      "ships.json",
      "b47f1e74c438d9661398de4b97764f53e23950c0584704ba68624f23481866c2",
    ],
    [
      "ships",
      "portToShipyard.json",
      "8b6a2150179eb117b2cd78e0567cd845ad68ab14f13ca132fedd112f5938a4ad",
    ],
    [
      "ships",
      "shipyardToShips.json",
      "b6ee34087f7c8e2d43e69e803ce6dbd744c7ed7da50a36b6d9627ac5db62a6ac",
    ],
    [
      "portraits-items-discoveries",
      "items.json",
      "32507b996b19f02698c1a1cbed85d2104611b5e3d36a575613dd36b861651fdc",
    ],
    [
      "portraits-items-discoveries",
      "itemTypes.json",
      "5ede03b79bf103ca3491bcd4e051fc623dbabc71028441db505ea92e356e82a4",
    ],
  ];
  for (const [domain, file, expected] of expectedJson)
    assert.equal(await jsonDigest(domain, file), expected, `${domain}/${file}`);
  assert.equal(
    (await readdir(join(repoRoot, "scripts/dueling/output"))).length,
    875,
  );
  assert.equal(
    (
      await readdir(
        join(repoRoot, "scripts/portraits-items-discoveries/output"),
      )
    ).length,
    12,
  );
});
