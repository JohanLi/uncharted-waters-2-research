import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { run as extractArt } from "./art/index.js";
import { run as extractDialog } from "./dialog/index.js";
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
  await extractDialog();

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
      "aab4be1cf566734d7b70cfe5a469c87bccfc0a70d56e91c828666f8901035d15",
    ],
    [
      "ships",
      "ships.json",
      "86e32760e75e8a5792df0c01af40df16e13c17454c1a8bd4a872c824f948dda2",
    ],
    [
      "ships",
      "portToShipyard.json",
      "b0d272efcff599e007fa37305e2960ac0c7e511924f251f063d0ad70c71be593",
    ],
    [
      "ships",
      "shipyardToShips.json",
      "c8c565cbc690fee0067db42ba4a7647daa9d2e6f458dce92c4c7fd18db909466",
    ],
    [
      "portraits-items-discoveries",
      "items.json",
      "ab2d46ffefb0fc8fb2498b5458bbb15afa9657aee9a84b8dc6be6159d37ade0b",
    ],
    [
      "portraits-items-discoveries",
      "itemTypes.json",
      "bead6632158f1dc5d08433fadcbfb3ef3a9fc2c979a075425cfaa508138e4a1b",
    ],
    [
      "dialog",
      "messages.json",
      "433c8ee26115ba1886c89f9952d0a269a6298057c8b05afbde9f69719a8a0977",
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
