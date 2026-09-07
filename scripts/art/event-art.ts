import { readdir, readFile, rm, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";

import { prepareOutput, repoRoot, writePng } from "../shared.js";
import {
  decodeGraphRecord,
  readGraphRecords,
  type Rgb,
} from "./graph-format.js";

const EVENT_PALETTE: ReadonlyArray<Rgb> = [
  [0, 0, 0],
  [0, 65, 211],
  [211, 65, 0],
  [211, 97, 162],
  [0, 162, 97],
  [0, 162, 243],
  [243, 162, 97],
  [243, 227, 211],
  [113, 113, 146],
  [162, 162, 195],
  [211, 113, 65],
  [0, 97, 195],
  [0, 97, 97],
  [113, 81, 97],
  [162, 113, 81],
  [0, 65, 178],
];

export async function runEventArt(): Promise<void> {
  const artOutput = await prepareOutput("art");
  const output = join(artOutput, "event-art");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  const eventFiles = (await readdir(join(repoRoot, "raw")))
    .filter((name) => /^EVENT\d+\.DAT$/.test(name))
    .sort();
  let imageCount = 0;

  for (const name of eventFiles) {
    const records = readGraphRecords(
      await readFile(join(repoRoot, "raw", name)),
    );
    for (const [recordIndex, record] of records.entries()) {
      const decoded = decodeGraphRecord(record, EVENT_PALETTE);
      const filename = `${basename(name, ".DAT").toLowerCase()}-${recordIndex
        .toString()
        .padStart(2, "0")}-${decoded.width}x${decoded.height}.png`;
      const path = join(output, filename);
      await writePng(path, decoded.pixels, decoded.width, decoded.height, 3);
      imageCount++;
    }
  }

  console.log(`Wrote ${imageCount} event art records to ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await runEventArt();
