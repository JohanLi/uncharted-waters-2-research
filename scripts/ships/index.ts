import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  decodeCString,
  prepareOutput,
  repoRoot,
  writeJson,
} from "../shared.js";
import { extractPortMetadata } from "../ports/index.js";

type Ship = Record<string, unknown> & { name: string };
async function ships(): Promise<Record<string, Ship>> {
  const data = await readFile(join(repoRoot, "raw/DATA1/DATA1.015"));
  const result: Record<string, Ship> = {};
  let cursor = 19388;
  for (let id = 1; id <= 25; id++, cursor += 24)
    result[id] = {
      name: decodeCString(data.subarray(cursor, cursor + 16)),
      usedGuns: data[cursor + 19]!,
      usedCrew: data.readUInt16LE(cursor + 20),
    };
  cursor = 19988;
  for (let id = 1; id <= 25; id++, cursor += 12)
    Object.assign(result[id]!, {
      industryRequirement: data[cursor]! * 10,
      durability: data[cursor + 1]!,
      tacking: data[cursor + 2]!,
      power: data[cursor + 3]!,
      maximumCrew: data[cursor + 4]! * 10,
      minimumCrew: data[cursor + 5]!,
      capacity: data.readUInt16LE(cursor + 6),
      maximumGuns: data[cursor + 8]!,
      sailType: data[cursor + 9]! + 1,
      basePrice: data.readUInt16LE(cursor + 10) * 10,
    });
  const messages = await readFile(join(repoRoot, "raw/MESSAGE.DAT"));
  cursor = 9683;
  for (let id = 1; id <= 25; id++) {
    const end = messages.indexOf(0, cursor);
    result[id]!.description = new TextDecoder()
      .decode(messages.subarray(cursor, end))
      .replaceAll("'", "’");
    cursor = end + 1;
  }
  return result;
}
async function shipyards(allShips: Record<string, Ship>) {
  const ports = await extractPortMetadata();
  const lines = (
    await readFile(join(repoRoot, "scripts/ships/shipyard_data.txt"), "utf8")
  ).split(/(?<=\n)/);
  const portToShipyard: Record<string, string> = {},
    shipyardToShips: Record<string, unknown[]> = {};
  let yard = 0;
  for (const [lineIndex, line] of lines.entries()) {
    if (lineIndex === 0) continue;
    if (line === "\n") {
      yard++;
      shipyardToShips[yard] = [];
    }
    const port = line.slice(1, 15).trim(),
      ship = line.slice(35, 51).trim(),
      requirement = line.slice(52, 56).trim();
    if (port) {
      const id = ports.findIndex((value) => value.name === port);
      if (id >= 0) portToShipyard[id] = String(yard);
      else console.warn(`"${port}" was not found in the list of ports`);
    }
    if (ship) {
      const entry = Object.entries(allShips).find(
        ([, value]) => value.name === ship,
      );
      if (entry)
        shipyardToShips[yard]!.push({
          shipId: entry[0],
          industryRequirement: Number(requirement),
        });
      else console.warn(`"${ship}" was not found in the list of ships`);
    }
  }
  return {
    portToShipyard: Object.fromEntries(
      Object.entries(portToShipyard).sort(([a], [b]) => Number(a) - Number(b)),
    ),
    shipyardToShips,
  };
}
const shipNames = [
  "Balsa",
  "Hansa Cog",
  "Dhow",
  "Buss",
  "Tallette",
  "Caravela Latina",
  "Caravela Redonda",
  "Brigantine",
  "Nao",
  "Carrack",
  "Galleon",
  "Xebec",
  "Pinnace",
  "Sloop",
  "Frigate",
  "Barge",
  "Full-rigged Ship",
  "Junk",
  "Light Galley",
  "Flemish Galleon",
  "Venetian Galeass",
  "La Reale",
  "Tekkousen",
  "Atakabune",
  "Kansen",
];
export async function run(): Promise<void> {
  const output = await prepareOutput("ships"),
    allShips = await ships();
  await writeJson(join(output, "ships.json"), allShips);
  const yards = await shipyards(allShips);
  await writeJson(join(output, "portToShipyard.json"), yards.portToShipyard);
  await writeJson(join(output, "shipyardToShips.json"), yards.shipyardToShips);
  await sharp({
    create: {
      width: 128 * shipNames.length,
      height: 96,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite(
      shipNames.map((name, index) => ({
        input: join(
          repoRoot,
          "scripts/ships/img",
          `${name.replaceAll(" ", "-").toLowerCase()}.png`,
        ),
        left: index * 128,
        top: 0,
      })),
    )
    .png()
    .toFile(join(output, "combined-ships.png"));
}
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
