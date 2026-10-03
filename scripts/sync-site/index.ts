import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
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
  "scripts/goods/output/goods.json",
  "scripts/discoveries/output/discoveries.json",
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

  // Portraits by picture number (KAO), the number stories refer to: fixed
  // sailor portraits are exported by sailor ID, the others by picture number.
  const portraits = await fresh(join(site, "public/images/portraits"));
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
  for (const sailor of sailors)
    if (sailor.portrait.kind === "fixed")
      await copyFile(
        join(repoRoot, `scripts/sailors/output/portraits/${sailor.id}.png`),
        join(portraits, `${sailor.portrait.kao}.png`),
      );
  for (const exporter of ["characters", "stories"]) {
    const source = join(repoRoot, `scripts/${exporter}/output/portraits`);
    for (const file of await readdir(source))
      await copyFile(join(source, file), join(portraits, file));
  }

  // Every sailor's portrait under a readable name (pilly-reis.png),
  // including the generated faces of temporary vagabonds and generic
  // captains, which have no picture number. Sailor names are unique.
  const sailorPortraits = await fresh(join(site, "public/images/sailors"));
  for (const sailor of sailors)
    await copyFile(
      join(repoRoot, `scripts/sailors/output/portraits/${sailor.id}.png`),
      join(sailorPortraits, `${slug(sailor.name)}.png`),
    );

  const eventArt = await fresh(join(site, "public/images/event-art"));
  const eventSource = join(repoRoot, "scripts/art/output/event-art");
  for (const file of await readdir(eventSource))
    await copyFile(join(eventSource, file), join(eventArt, file));

  console.log(`Synced data and images to ${site}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
