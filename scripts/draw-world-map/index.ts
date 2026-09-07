import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeWorldMapPng } from "./render.js";
import { readRegularTiles } from "./tilesets.js";
import { combineWorldMaps, generateWorldMaps } from "./world-map.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const rawDirectory = join(repositoryRoot, "raw");
const outputDirectory = join(scriptDirectory, "output");

export async function run(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const [worldMaps, regularTiles] = await Promise.all([
    generateWorldMaps(rawDirectory),
    readRegularTiles(join(rawDirectory, "DATA1", "DATA1.011")),
  ]);
  for (const [part, worldMap] of worldMaps.entries()) {
    const basename = `world-map${part}`;
    await writeFile(join(outputDirectory, `${basename}.bin`), worldMap.data);
    await writeWorldMapPng(
      join(outputDirectory, `${basename}.png`),
      worldMap,
      regularTiles,
    );
  }
  await writeFile(
    join(outputDirectory, "world-map.bin"),
    combineWorldMaps(worldMaps).data,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
