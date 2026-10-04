import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import sharp from "sharp";
import { repoRoot } from "../shared.js";

// Copies the exporters' output that the wiki uses into the site, which keeps
// a committed snapshot and never reads this repo. Run the exporters first
// (`pnpm extract-all`). The site defaults to ../uncharted-waters-2, next to
// this repo; pass `--site <path>` for another location.

const JSON_FILES = [
  "scripts/sailors/output/sailors.json",
  "scripts/sailors/output/fleets.json",
  "scripts/characters/output/named-characters.json",
  "scripts/characters/output/waitresses.json",
  "scripts/stories/output/stories.json",
  "scripts/ports/output/ports.json",
  "scripts/ships/output/ships.json",
  "scripts/ships/output/portToShipyard.json",
  "scripts/ships/output/shipyardToShips.json",
  "scripts/goods/output/goods.json",
  "scripts/goods/output/port-markets.json",
  "scripts/discoveries/output/discoveries.json",
  "scripts/portraits-items-discoveries/output/items.json",
  "scripts/draw-world-map/output/sea-palettes.json",
];

const siteArgument = process.argv.indexOf("--site");
const site = resolve(
  siteArgument === -1
    ? join(repoRoot, "..", "uncharted-waters-2")
    : process.argv[siteArgument + 1]!,
);

/** A file name for a name: "João Franco" → "joao-franco". */
export const slug = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A named character's file name, with the nation when the name repeats. */
export const characterSlug = (
  character: { name: string; nation?: string },
  all: { name: string }[],
): string =>
  all.filter((other) => other.name === character.name).length > 1 &&
  character.nation
    ? slug(`${character.name} ${character.nation}`)
    : slug(character.name);

const fresh = async (directory: string): Promise<string> => {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  return directory;
};

export async function run(): Promise<void> {
  // Refuse to create a stray folder when the site isn't where expected.
  const name = await readFile(join(site, "package.json"), "utf8").then(
    (json) => (JSON.parse(json) as { name?: string }).name,
    () => undefined,
  );
  if (name !== "uncharted-waters-2")
    throw new Error(
      `No uncharted-waters-2 site at ${site}; pass --site <path>`,
    );

  const data = await fresh(join(site, "src/data"));
  for (const file of JSON_FILES)
    await copyFile(join(repoRoot, file), join(data, file.split("/").pop()!));

  // Every character's portrait in one folder, by name: sailors (including
  // the generated faces of temporary vagabonds and generic captains),
  // named characters (two rulers share "Governor-General", so a repeated
  // name gets its nation added), waitresses, and the people in the stories.
  // A name used twice must be the same picture: Carlotta is both a named
  // character and the Lisbon Pub's attendant.
  const characterImages = await fresh(join(site, "public/images/characters"));
  const written = new Map<string, Buffer>();
  const addPortrait = async (name: string, source: string): Promise<void> => {
    const bytes = await readFile(source);
    const previous = written.get(name);
    if (previous && !previous.equals(bytes))
      throw new Error(`Two different portraits are named ${name}`);
    if (previous) return;
    written.set(name, bytes);
    await writeFile(join(characterImages, `${name}.png`), bytes);
  };
  // Stories refer to portraits by picture number (KAO): the file for each
  // picture number goes into src/data/portrait-files.json.
  const portraitFiles: Record<number, string> = {};
  const byPicture = (path: string) => Number(path.match(/(\d+)\.png$/)![1]);

  const sailors = JSON.parse(
    await readFile(
      join(repoRoot, "scripts/sailors/output/sailors.json"),
      "utf8",
    ),
  ) as {
    id: number;
    name: string;
    portrait: { kind: string; kao?: number };
  }[];
  for (const sailor of sailors) {
    await addPortrait(
      slug(sailor.name),
      join(repoRoot, `scripts/sailors/output/portraits/${sailor.id}.png`),
    );
    if (sailor.portrait.kind === "fixed")
      portraitFiles[sailor.portrait.kao!] = slug(sailor.name);
  }

  const characterOutput = join(repoRoot, "scripts/characters/output");
  const named = JSON.parse(
    await readFile(join(characterOutput, "named-characters.json"), "utf8"),
  ) as { name: string; nation?: string; portrait: string }[];
  for (const character of named) {
    const name = characterSlug(character, named);
    await addPortrait(name, join(characterOutput, character.portrait));
    portraitFiles[byPicture(character.portrait)] ??= name;
  }
  const waitresses = JSON.parse(
    await readFile(join(characterOutput, "waitresses.json"), "utf8"),
  ) as { name: string; portrait: string }[];
  for (const waitress of waitresses) {
    const name = slug(waitress.name);
    await addPortrait(name, join(characterOutput, waitress.portrait));
    portraitFiles[byPicture(waitress.portrait)] ??= name;
  }

  // The stories' people by the names the stories give them; a picture the
  // stories exporter wrote itself is in its own output.
  const stories = JSON.parse(
    await readFile(
      join(repoRoot, "scripts/stories/output/stories.json"),
      "utf8",
    ),
  ) as { characters: { portrait: number; name: string }[] }[];
  const storyPortraits = join(repoRoot, "scripts/stories/output/portraits");
  const storyFiles = new Set(await readdir(storyPortraits));
  for (const story of stories)
    for (const character of story.characters) {
      const name = slug(character.name);
      const file = `${character.portrait}.png`;
      const source = storyFiles.has(file)
        ? join(storyPortraits, file)
        : portraitFiles[character.portrait] !== undefined
          ? join(characterImages, `${portraitFiles[character.portrait]}.png`)
          : join(characterOutput, "portraits", file);
      await addPortrait(name, source);
      portraitFiles[character.portrait] ??= name;
    }
  await writeFile(
    join(data, "portrait-files.json"),
    JSON.stringify(portraitFiles, null, 2),
  );

  // The sailor generator's data: the portrait part banks, fetched by the
  // page, and the name table, built into it.
  const generatorData = await fresh(join(site, "public/data"));
  await copyFile(
    join(repoRoot, "scripts/temporary-sailors/output/generated-faces.bin"),
    join(generatorData, "generated-faces.bin"),
  );
  await copyFile(
    join(repoRoot, "scripts/temporary-sailors/output/generated-names.json"),
    join(data, "generated-names.json"),
  );

  const eventArt = await fresh(join(site, "public/images/event-art"));
  const eventSource = join(repoRoot, "scripts/art/output/event-art");
  for (const file of await readdir(eventSource))
    await copyFile(join(eventSource, file), join(eventArt, file));

  // Each item's picture, by item name, cut from the 48 × 48 strip the
  // items share (several items use the same picture).
  const itemImages = await fresh(join(site, "public/images/items"));
  const itemSource = join(
    repoRoot,
    "scripts/portraits-items-discoveries/output",
  );
  const itemRecords = JSON.parse(
    await readFile(join(itemSource, "items.json"), "utf8"),
  ) as Record<string, { name: string; imageSlice: number }>;
  for (const item of Object.values(itemRecords))
    await sharp(join(itemSource, "items.png"))
      .extract({ left: item.imageSlice * 48, top: 0, width: 48, height: 48 })
      .png()
      .toFile(join(itemImages, `${slug(item.name)}.png`));

  // Each ship model's picture (GRAPH.DAT records 28–52, by ship ID) and
  // each discovery's, by name.
  const shipImages = await fresh(join(site, "public/images/ships"));
  const shipModels = JSON.parse(
    await readFile(join(repoRoot, "scripts/ships/output/ships.json"), "utf8"),
  ) as Record<string, { name: string }>;
  for (const [id, ship] of Object.entries(shipModels))
    await copyFile(
      join(
        repoRoot,
        "scripts/art/output/graph-art",
        `graph-${String(28 + Number(id)).padStart(3, "0")}-128x96.png`,
      ),
      join(shipImages, `${slug(ship.name)}.png`),
    );
  const discoveryImages = await fresh(join(site, "public/images/discoveries"));
  const discoverySource = join(repoRoot, "scripts/discoveries/output");
  const discoveryRecords = JSON.parse(
    await readFile(join(discoverySource, "discoveries.json"), "utf8"),
  ) as { name: string; picture: string }[];
  for (const discovery of discoveryRecords)
    await copyFile(
      join(discoverySource, discovery.picture),
      join(discoveryImages, `${slug(discovery.name)}.png`),
    );

  // Each building's vendor, as its greeting shows them (GRAPH.DAT records
  // 6–17 in building order; 20 is the Mosque's), by building name.
  const vendors = await fresh(join(site, "public/images/buildings"));
  const VENDORS: [number, string][] = [
    [6, "market"],
    [7, "pub"],
    [8, "shipyard"],
    [9, "harbor"],
    [10, "lodge"],
    [11, "palace"],
    [12, "guild"],
    [13, "residence"],
    [14, "bank"],
    [15, "item-shop"],
    [16, "church"],
    [17, "house-of-fortune"],
    [20, "mosque"],
  ];
  for (const [record, name] of VENDORS)
    await copyFile(
      join(
        repoRoot,
        "scripts/art/output/graph-art",
        `graph-${String(record).padStart(3, "0")}-136x112.png`,
      ),
      join(vendors, `${name}.png`),
    );

  // The world map's tiles and tile pixels, for the map the site draws. The
  // map is gzipped (2.3 MB to 70 KB); the browser unpacks it.
  const worldMap = join(repoRoot, "scripts/draw-world-map/output");
  await writeFile(
    join(generatorData, "world-map.bin.gz"),
    gzipSync(await readFile(join(worldMap, "world-map.bin")), { level: 9 }),
  );
  await copyFile(
    join(worldMap, "world-tiles.bin"),
    join(generatorData, "world-tiles.bin"),
  );

  // Town maps by port name; the supply ports share one map.
  const towns = await fresh(join(site, "public/images/towns"));
  const ports = JSON.parse(
    await readFile(join(repoRoot, "scripts/ports/output/ports.json"), "utf8"),
  ) as { name: string }[];
  const townSource = join(repoRoot, "scripts/ports/output/town-maps");
  for (let index = 0; index <= 100; index++)
    await copyFile(
      join(townSource, `${String(index).padStart(3, "0")}.png`),
      join(
        towns,
        `${index === 100 ? "supply-port" : slug(ports[index]!.name)}.png`,
      ),
    );

  console.log(`Synced data and images to ${site}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
