import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "../shared.js";
import { decodeArchive, encodeArchive, readArchive } from "./index.js";

const raw = join(repoRoot, "raw");

async function extracted(name: string): Promise<Buffer[]> {
  const parts = (await readdir(join(raw, name)))
    .filter((file) => /\.\d{3}$/.test(file))
    .sort();
  return Promise.all(parts.map((file) => readFile(join(raw, name, file))));
}

test("every .LZW archive decodes to its extracted parts", async () => {
  const archives = (await readdir(raw)).filter((file) => file.endsWith(".LZW"));
  assert.equal(archives.length, 14);
  for (const file of archives) {
    const name = file.slice(0, -4);
    const decoded = decodeArchive(await readFile(join(raw, file)));
    const expected = await extracted(name);
    assert.equal(decoded.length, expected.length, name);
    decoded.forEach((part, index) =>
      assert.deepEqual(Buffer.from(part), expected[index], `${name} ${index}`),
    );
  }
});

test("an encoded archive decodes back and is smaller than KOEI's", async () => {
  const data = await readFile(join(raw, "KAO.LZW"));
  const koei = readArchive(data);
  const files = (await extracted("KAO")).slice(0, 20);
  const encoded = encodeArchive(files);
  assert.equal(readArchive(encoded).magic, "LS11");
  assert.deepEqual(
    decodeArchive(encoded).map((part) => Buffer.from(part)),
    files,
  );
  const ours = readArchive(encoded).entries;
  const size = (entries: typeof ours) =>
    entries.reduce((total, entry) => total + entry.compressedSize, 0);
  assert.ok(size(ours) < size(koei.entries.slice(0, 20)));
});
