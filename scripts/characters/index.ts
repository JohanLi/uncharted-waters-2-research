import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  decodeCString,
  decodePlanar,
  prepareOutput,
  repoRoot,
  saveSlotBase,
  writeJson,
  writePng,
} from "../shared.js";
import { palette } from "../temporary-sailors/index.js";

// Named characters who are not sailors: collectors, cartographers, rulers,
// skill teachers, Paula and Sapha, Carlotta, and the Pub waitresses, as they
// are when a new game starts (raw/KOUKAI2.DAT, save slot 1). See
// game-details/buildings.md (Palace, Special NPC residences) and
// game-details/waitresses.md.

const NAMED_TABLE = 0x19c2; // slot-relative, 24-byte records
const NAMED_COUNT = 21;
const WAITRESS_TABLE = 0x1ba2; // slot-relative, 16-byte records
const WAITRESS_COUNT = 30;

const nations = [
  "Portugal",
  "Spain",
  "Turkey",
  "England",
  "Italy",
  "Holland",
] as const;
const preferences = [
  "Accessories",
  "Treasure",
  "Stories",
  "Everything",
] as const;

/** What a named record is, by its position in the table. */
function namedRole(id: number): Record<string, unknown> {
  if (id < 5) return { role: "collector" };
  if (id < 10) return { role: "cartographer" };
  // The Palace shows record 10 + the controlling nation (MAIN.EXE 0x309B0).
  if (id < 16) return { role: "ruler", nation: nations[id - 10] };
  if (id < 18) return { role: "story character" };
  // Professor Juliano's handler (0x34030) and Dr. Wolf's (0x3418C).
  if (id === 18)
    return { role: "skill teacher", skill: "Celestial Navigation" };
  if (id === 19) return { role: "skill teacher", skill: "Gunnery" };
  return { role: "Pub owner" };
}

/** Writes fixed portrait KAO.nnn (raw/KAO) as a 64×80 PNG. */
export async function writeFixedPortrait(
  kao: number,
  file: string,
): Promise<void> {
  const raw = await readFile(
    join(repoRoot, "raw/KAO", `KAO.${String(kao).padStart(3, "0")}`),
  );
  await writePng(file, decodePlanar(raw, 8, 3, palette).data, 64, 80, 3);
}

export async function run(): Promise<void> {
  const koukai = await readFile(join(repoRoot, "raw/KOUKAI2.DAT"));
  const ports = JSON.parse(
    await readFile(join(repoRoot, "scripts/ports/output/ports.json"), "utf8"),
  ) as { name: string }[];
  const output = await prepareOutput("characters");
  const portraits = join(output, "portraits");
  await mkdir(portraits, { recursive: true });

  const written = new Set<number>();
  async function portrait(kao: number): Promise<string> {
    const file = `portraits/${kao}.png`;
    if (!written.has(kao)) {
      await writeFixedPortrait(kao, join(output, file));
      written.add(kao);
    }
    return file;
  }

  const slot = saveSlotBase(1);
  const named = [];
  for (let id = 0; id < NAMED_COUNT; id++) {
    const r = slot + NAMED_TABLE + id * 24;
    const kao = koukai[r + 0x14]!;
    const flags = koukai[r + 0x16]!;
    const port = koukai[r + 0x17]!;
    const role = namedRole(id);
    named.push({
      id,
      name: decodeCString(koukai.subarray(r, r + 0x14)),
      ...role,
      // Collectors and cartographers sit at a fixed port; the others are
      // placed by the Palace or by story scripts.
      port: id < 10 || id === 18 || id === 19 ? port : null,
      portName:
        id < 10 || id === 18 || id === 19 ? (ports[port]?.name ?? null) : null,
      // The low two bits scale what a collector pays for discoveries
      // (100%, 80%, 60%) and a cartographer per charted cell (20 × (5 − n)).
      ...(role.role === "collector"
        ? { goldPercent: 100 - 20 * (flags & 3) }
        : {}),
      ...(role.role === "cartographer"
        ? { goldPerCell: 20 * (5 - (flags & 3)) }
        : {}),
      portrait: await portrait(kao),
    });
  }

  const waitresses = [];
  for (let id = 0; id < WAITRESS_COUNT; id++) {
    const r = slot + WAITRESS_TABLE + id * 16;
    const flags = koukai[r + 0x0f]!;
    const port = koukai[r + 0x0b]!;
    waitresses.push({
      id,
      name: decodeCString(koukai.subarray(r, r + 0x0b)),
      port,
      portName: ports[port]!.name,
      // Record 0 is Carlotta, the Lisbon Pub's owner (flag 0x40); the
      // Waitress command needs flag 0x08 and not 0x40.
      waitress: (flags & 0x08) !== 0 && (flags & 0x40) === 0,
      preference: preferences[(flags >> 4) & 3],
      investigationFavor: flags & 0x01 ? 40 : 80,
      flags: `0x${flags.toString(16).toUpperCase().padStart(2, "0")}`,
      portrait: await portrait(0x61 + id),
    });
  }

  await writeJson(join(output, "named-characters.json"), named);
  await writeJson(join(output, "waitresses.json"), waitresses);
  console.log(
    `Wrote ${named.length} named characters, ${waitresses.length} Pub records and ${written.size} portraits to ${output}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
