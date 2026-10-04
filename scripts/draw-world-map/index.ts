import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { encodeWorldMap, writeWorldMapPng } from "./render.js";
import {
  readRegularTileIndices,
  readSeaPalettes,
  SEA_PALETTE_NAMES,
} from "./tilesets.js";
import { combineWorldMaps, generateWorldMaps } from "./world-map.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const rawDirectory = join(repositoryRoot, "raw");
const outputDirectory = join(scriptDirectory, "output");

export async function run(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const [worldMaps, tileIndices, palettes] = await Promise.all([
    generateWorldMaps(rawDirectory),
    readRegularTileIndices(join(rawDirectory, "DATA1", "DATA1.011")),
    readSeaPalettes(join(rawDirectory, "MAIN.EXE")),
  ]);
  for (const [part, worldMap] of worldMaps.entries()) {
    const basename = `world-map${part}`;
    await writeFile(join(outputDirectory, `${basename}.bin`), worldMap.data);
    // The day map keeps the plain name; the other palettes get a suffix.
    const image = encodeWorldMap(worldMap, tileIndices);
    await Promise.all(
      SEA_PALETTE_NAMES.map((name) =>
        writeWorldMapPng(
          join(
            outputDirectory,
            `${basename}${name === "day" ? "" : `-${name}`}.png`,
          ),
          image,
          palettes[name],
        ),
      ),
    );
  }
  await writeFile(
    join(outputDirectory, "world-map.bin"),
    combineWorldMaps(worldMaps).data,
  );
  // For drawing the map elsewhere (the wiki's map): each tile's pixels as
  // palette indices, 16 × 16 bytes per tile, and the five sea palettes.
  await writeFile(join(outputDirectory, "world-tiles.bin"), tileIndices);
  await writeFile(
    join(outputDirectory, "sea-palettes.json"),
    JSON.stringify(palettes, null, 2),
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
