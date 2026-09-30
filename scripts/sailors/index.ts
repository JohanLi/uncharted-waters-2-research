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
import { composePortrait, palette, toRgb } from "../temporary-sailors/index.js";

// The 120 sailors and 70 fleets as they are when a new game starts
// (raw/KOUKAI2.DAT). IDs match the tables in game-details: sailors 0–119,
// fleets 0–69, ports are indices into scripts/ports/output/ports.json, and
// ships are keys of scripts/ships/output/ships.json.
// See game-details/sailors.md and game-details/fleets.md.

const SAILOR_TABLE = 0x06a9;
const SAILOR_SIZE = 0x2a;
const SAILOR_COUNT = 120;
const FLEET_TABLE = 0x1e77;
const FLEET_SIZE = 0x85;
const FLEET_COUNT = 70;
const SHIP_INSTANCE_TABLE = 0x4893;
const SHIP_INSTANCE_SIZE = 0x18;

const nations = [
  "Portugal",
  "Spain",
  "Turkey",
  "England",
  "Italy",
  "Holland",
  "Piracy",
] as const;
const attributeNames = [
  "leadership",
  "seamanship",
  "knowledge",
  "intuition",
  "courage",
  "swordsmanship",
  "charm",
  "luck",
] as const;
const skillNames = [
  [0x01, "Negotiation"],
  [0x02, "Accounting"],
  [0x04, "Gunnery"],
  [0x08, "Cartography"],
  [0x10, "Celestial Navigation"],
] as const;
// Fleet IDs 10n + 1–4 are merchant fleets, 5–6 convoys, 7–9 voyaging fleets;
// 10n is a main character's fleet (60: Antonio Khan's story fleet).
const fleetClasses = [
  "main",
  "merchant",
  "merchant",
  "merchant",
  "merchant",
  "convoy",
  "convoy",
  "voyaging",
  "voyaging",
  "voyaging",
] as const;

/** A sailor's role when a new game starts; decides where the wiki lists them. */
function role(id: number, fleet: number): string {
  if (id < 6) return "main character";
  if (fleet === 0xfe) return "story";
  if (fleet === 0xff) return "vagabond";
  return fleet % 10 === 0 ? "story fleet" : "fleet captain";
}

function fleetShips(koukai: Uint8Array, fleet: number): number[] {
  const record = FLEET_TABLE + fleet * FLEET_SIZE;
  const ships: number[] = [];
  for (let slot = 0; slot < 10; slot++) {
    const offset = record + 0x2b + slot * 9;
    if ((koukai[offset + 8]! & 0x30) !== 0x10) continue;
    const instance =
      SHIP_INSTANCE_TABLE + koukai[offset + 7]! * SHIP_INSTANCE_SIZE;
    ships.push(koukai[instance + 0x11]! + 1);
  }
  return ships;
}

export async function run(): Promise<void> {
  const koukai = await readFile(join(repoRoot, "raw/KOUKAI2.DAT"));
  const kao = await readFile(join(repoRoot, "raw/KAO.LZW"));
  const ports = JSON.parse(
    await readFile(join(repoRoot, "scripts/ports/output/ports.json"), "utf8"),
  ) as { name: string }[];
  const ships = JSON.parse(
    await readFile(join(repoRoot, "scripts/ships/output/ships.json"), "utf8"),
  ) as Record<string, { name: string }>;
  const output = await prepareOutput("sailors");
  const portraitDirectory = join(output, "portraits");
  await mkdir(portraitDirectory, { recursive: true });

  const sailors = [];
  for (let id = 0; id < SAILOR_COUNT; id++) {
    const r = SAILOR_TABLE + id * SAILOR_SIZE;
    const firstName = decodeCString(koukai.subarray(r, r + 9));
    const lastName = decodeCString(koukai.subarray(r + 9, r + 18));
    const selector = koukai.readUInt16LE(r + 0x12);
    const status = koukai[r + 0x29]!;
    const fleet = koukai[r + 0x24]!;
    const port = koukai[r + 0x25]!;
    const nation = status & 0x0f;
    const generated = (selector & 0xc000) !== 0;

    // Generated portraits are composed from the KAO.LZW parts bank of the
    // sailor's nation; the others are fixed pictures KAO.000–KAO.127.
    const rgb = generated
      ? toRgb(composePortrait(kao, nation, selector), 1)
      : decodePlanar(
          await readFile(
            join(
              repoRoot,
              "raw/KAO",
              `KAO.${String(selector & 0xff).padStart(3, "0")}`,
            ),
          ),
          8,
          3,
          palette,
        ).data;
    await writePng(join(portraitDirectory, `${id}.png`), rgb, 64, 80, 3);

    const skillMask = koukai[r + 0x28]!;
    const personality = koukai[r + 0x27]!;
    sailors.push({
      id,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      nation: nations[nation],
      role: role(id, fleet),
      // A generated-portrait sailor's record can be reused for a new sailor
      // after losing a fleet (game-details/sailors.md, Temporary vagabonds).
      canVanish: generated,
      age: koukai[r + 0x22]!,
      attributes: Object.fromEntries(
        attributeNames.map((name, index) => [name, koukai[r + 0x14 + index]!]),
      ),
      navigationLevel: koukai[r + 0x1c]!,
      battleLevel: koukai[r + 0x1d]!,
      skills: skillNames
        .filter(([bit]) => skillMask & bit)
        .map(([, name]) => name),
      loyalty: koukai[r + 0x23]!,
      fleet: fleet < FLEET_COUNT ? fleet : null,
      port: port < ports.length ? port : null,
      portName: port < ports.length ? ports[port]!.name : null,
      // Personality bit 0x10 decides which building lists an unemployed
      // sailor; status bit 0x40 keeps them from drifting between ports.
      foundIn: personality & 0x10 ? "Pub" : "Lodge",
      staysInPort: (status & 0x40) !== 0,
      pirateCommander: (personality & 3) >= 2,
      portrait: generated
        ? {
            kind: "generated",
            selector: `0x${selector.toString(16).toUpperCase()}`,
          }
        : { kind: "fixed", kao: selector & 0xff },
      portraitFile: `portraits/${id}.png`,
    });
  }

  const captains = new Map(
    sailors
      .filter((sailor) => sailor.fleet !== null)
      .map((sailor) => [sailor.fleet, sailor.id]),
  );
  const fleets = [];
  for (let id = 0; id < FLEET_COUNT; id++) {
    const record = FLEET_TABLE + id * FLEET_SIZE;
    const shipIds = fleetShips(koukai, id);
    fleets.push({
      id,
      nation: nations[Math.floor(id / 10)],
      class: fleetClasses[id % 10],
      captain: captains.get(id) ?? null,
      active: (koukai[record + 0x29]! & 0x01) !== 0,
      ships: shipIds.map((ship) => ({ ship, name: ships[ship]!.name })),
    });
  }

  await writeJson(join(output, "sailors.json"), sailors);
  await writeJson(join(output, "fleets.json"), fleets);
  console.log(
    `Wrote ${sailors.length} sailors, ${fleets.length} fleets and portraits to ${output}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
