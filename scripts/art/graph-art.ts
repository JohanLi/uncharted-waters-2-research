import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { prepareOutput, repoRoot, writePng } from "../shared.js";
import { writeContactSheet, type SheetImage } from "./contact-sheet.js";
import { decodeGraphRecord, readGraphOffsets } from "./graph-format.js";

interface GraphSource {
  readonly label: string;
  readonly path: string;
}

async function graphSources(): Promise<GraphSource[]> {
  const opgraphDirectory = join(repoRoot, "raw/OPGRAPH");
  const opgraph = (await readdir(opgraphDirectory))
    .filter((name) => /^OPGRAPH\.\d{3}$/.test(name))
    .sort()
    .map((name) => ({
      label: name.toLowerCase().replace(".", "-"),
      path: join(opgraphDirectory, name),
    }));
  return [
    ...opgraph,
    ...["ENDGRP.DAT", "GRAPH.DAT", "GRAPH2.DAT"].map((name) => ({
      label: basename(name, extname(name)).toLowerCase(),
      path: join(repoRoot, "raw", name),
    })),
  ];
}

export async function runGraphArt(): Promise<void> {
  const artOutput = await prepareOutput("art");
  const output = join(artOutput, "graph-art");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const images: SheetImage[] = [];

  for (const source of await graphSources()) {
    const data = await readFile(source.path);
    const offsets = readGraphOffsets(data);
    if (!offsets) continue;

    for (let recordIndex = 0; recordIndex < offsets.length - 1; recordIndex++) {
      const record = data.subarray(
        offsets[recordIndex]!,
        offsets[recordIndex + 1],
      );
      if (record.length < 24) continue;

      try {
        const decoded = decodeGraphRecord(record);
        if (decoded.width < 100 || decoded.height < 40) continue;
        const filename = `${source.label}-${recordIndex
          .toString()
          .padStart(3, "0")}-${decoded.width}x${decoded.height}.png`;
        const path = join(output, filename);
        await writePng(path, decoded.pixels, decoded.width, decoded.height, 3);
        images.push({ path, width: decoded.width, height: decoded.height });
      } catch {
        // Some OPGRAPH table entries are not GRAPH-format image records.
      }
    }
  }

  const largeImages = images.filter(
    (image) => image.width >= 200 && image.height >= 120,
  );
  await writeContactSheet(
    join(output, "large-contact-sheet.png"),
    largeImages,
    {
      thumbnailWidth: 120,
      thumbnailHeight: 90,
      columns: 6,
      gap: 6,
      fit: true,
    },
  );
  console.log(`Wrote ${images.length} GRAPH-style art records to ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await runGraphArt();
