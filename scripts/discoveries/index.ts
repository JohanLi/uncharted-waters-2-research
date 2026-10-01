import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  decodeCString,
  decodePlanar,
  prepareOutput,
  repoRoot,
  writeJson,
  writePng,
} from "../shared.js";
import { palette } from "../temporary-sailors/index.js";

// The 98 village discoveries as defined for a new game. A new game makes only
// 50 of them available; see game-details/fame/adventure-fame.md and
// game-details/at-sea.md#discovery-flags.

const DISCOVERY_TABLE = 0x6e74; // raw/DATA1/DATA1.015, 7-byte records
const DISCOVERY_COUNT = 98; // records 98 and 99 are placeholders
const COLONY_RECORD = 293; // raw/COLONY.DAT: name, picture, description
const DS_BASE = 0x3bb70; // MAIN.EXE file offset of the data segment
const TYPE_NAMES = 0xac2; // DS: near pointers indexed by record byte +6 & 7
const FIRST_PICTURE = 128; // KAO.128–KAO.226 are the discovery pictures

function nearString(executable: Uint8Array, pointer: number): string {
  const start = DS_BASE + pointer;
  return decodeCString(executable.subarray(start, start + 32));
}

/** The game's latitude and longitude, unrounded (buildings.md, Locate). */
export function position(x: number, y: number) {
  let longitude = (x + 1981) % 2160;
  const west = longitude > 1080;
  if (west) longitude = 2160 - longitude;
  const d = 640 - y;
  return {
    latitude: `${Math.trunc((Math.abs(d) * 8) / 57)}${d >= 0 ? "N" : "S"}`,
    longitude: `${Math.trunc(longitude / 6)}${west ? "W" : "E"}`,
  };
}

export async function run(): Promise<void> {
  const data1 = await readFile(join(repoRoot, "raw/DATA1/DATA1.015"));
  const colony = await readFile(join(repoRoot, "raw/COLONY.DAT"));
  const executable = await readFile(join(repoRoot, "raw/MAIN.EXE"));
  const output = await prepareOutput("discoveries");
  const pictures = join(output, "pictures");
  await mkdir(pictures, { recursive: true });

  const types = Array.from({ length: 7 }, (_, type) =>
    nearString(
      executable,
      executable.readUInt16LE(DS_BASE + TYPE_NAMES + type * 2),
    ),
  );

  const discoveries = [];
  for (let id = 0; id < DISCOVERY_COUNT; id++) {
    const record = DISCOVERY_TABLE + id * 7;
    const x = data1.readUInt16LE(record);
    const y = data1.readUInt16LE(record + 2);
    const difficulty = data1[record + 5]!;
    const text = colony.subarray(id * COLONY_RECORD, (id + 1) * COLONY_RECORD);
    const picture = text[25]!;
    // Difficulty 100 is special-cased: 1,500 Fame and 100,000 gold.
    const starred = difficulty === 100;

    const kao = await readFile(
      join(
        repoRoot,
        "raw/KAO",
        `KAO.${String(FIRST_PICTURE + picture).padStart(3, "0")}`,
      ),
    );
    await writePng(
      join(pictures, `${id}.png`),
      decodePlanar(kao, 8, 3, palette).data,
      48,
      48,
      3,
    );

    discoveries.push({
      id,
      name: decodeCString(text.subarray(0, 25)),
      type: types[data1[record + 6]! & 7],
      description: decodeCString(text.subarray(26)),
      x,
      y,
      ...position(x, y),
      difficulty,
      starred,
      adventureFame: starred ? 1500 : difficulty * 8,
      gold: starred ? 100_000 : difficulty * 250,
      picture: `pictures/${id}.png`,
    });
  }

  await writeJson(join(output, "discoveries.json"), discoveries);
  console.log(`Wrote ${discoveries.length} discoveries to ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
