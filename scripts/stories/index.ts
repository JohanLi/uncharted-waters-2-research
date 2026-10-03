import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  disassembleScenario,
  type ScenarioRoute,
} from "../../dialog-system/scripts/snr.js";
import { writeFixedPortrait } from "../characters/index.js";
import { prepareOutput, repoRoot, writeJson } from "../shared.js";

// What each main character's story contains, by story section: who joins,
// whose portrait appears, which ports have story scenes, and which event art
// is shown, plus every story portrait as portraits/{picture number}.png.
// Story n (raw/SNRn.DAT) belongs to main character n − 1. A story section is
// the spoiler part on the wiki. Run after the sailors, characters, and ports
// exporters.

const ADD_PARTY_MEMBER = 0xfb;
// The character-selection screen's descriptions are MESSAGE.DAT messages
// 56–61 (NUL-separated), one per main character in sailor order.
const FIRST_DESCRIPTION = 56;
const FIXED_PORTRAITS = 128; // KAO.000–KAO.127

interface Named {
  name: string;
  kind: "sailor" | "named character" | "waitress" | "story character";
  id?: number;
}

const read = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(join(repoRoot, file), "utf8")) as T;

export async function run(): Promise<void> {
  const sailors = await read<
    { id: number; name: string; portrait: { kind: string; kao?: number } }[]
  >("scripts/sailors/output/sailors.json");
  const named = await read<{ id: number; name: string; portrait: string }[]>(
    "scripts/characters/output/named-characters.json",
  );
  const waitresses = await read<{ id: number; name: string }[]>(
    "scripts/characters/output/waitresses.json",
  );
  const ports = await read<{ name: string }[]>(
    "scripts/ports/output/ports.json",
  );
  // Names for story portraits that match no record, written by hand.
  const portraitNames = await read<Record<string, string>>(
    "scripts/stories/portrait-names.json",
  );
  const messages = (await readFile(join(repoRoot, "raw/MESSAGE.DAT")))
    .toString("latin1")
    .split("\0");
  const output = await prepareOutput("stories");

  // Who a portrait number belongs to: a scenario portrait code is a KAO
  // picture number, shared by sailors, named characters, and waitresses.
  const byPortrait = new Map<number, Named>();
  for (const sailor of sailors)
    if (sailor.portrait.kind === "fixed")
      byPortrait.set(sailor.portrait.kao!, {
        name: sailor.name,
        kind: "sailor",
        id: sailor.id,
      });
  for (const character of named) {
    const kao = Number(/(\d+)\.png$/.exec(character.portrait)![1]);
    if (!byPortrait.has(kao))
      byPortrait.set(kao, {
        name: character.name,
        kind: "named character",
        id: character.id,
      });
  }
  for (const [kao, name] of Object.entries(portraitNames))
    byPortrait.set(Number(kao), { name, kind: "story character" });
  for (const waitress of waitresses)
    if (!byPortrait.has(0x61 + waitress.id))
      byPortrait.set(0x61 + waitress.id, {
        name: waitress.name,
        kind: "waitress",
        id: waitress.id,
      });

  const stories = [];
  for (let scenario = 1; scenario <= 6; scenario++) {
    const story = disassembleScenario(
      scenario,
      await readFile(join(repoRoot, `raw/SNR${scenario}.DAT`)),
      await readFile(join(repoRoot, `raw/SNR${scenario}.MES`)),
    );
    const mainCharacter = scenario - 1;

    const recruits = [];
    const portraits = new Map<number, number>(); // KAO → first section
    const portSections = new Map<number, Set<number>>();
    const eventArt = [];
    for (const section of story.sections) {
      for (const instruction of section.instructions)
        if (instruction.opcode === ADD_PARTY_MEMBER) {
          const sailor = parseInt(instruction.rawHex.slice(2, 4), 16);
          recruits.push({
            sailor,
            name: sailors[sailor]!.name,
            section: section.id,
          });
        }
      for (const run of section.dialogueRuns)
        for (const line of run.lines)
          if (
            line.characterId !== undefined &&
            line.characterId < FIXED_PORTRAITS &&
            !portraits.has(line.characterId)
          )
            portraits.set(line.characterId, section.id);
      // Routes keyed to one port (selector = port ID), at any building.
      const routes: ScenarioRoute[] = [
        ...section.routes,
        ...section.entryRouteTables.flatMap((table) => table.routes),
      ];
      for (const route of routes)
        if (
          route.knownSelector === "specific-port" &&
          route.selector < ports.length
        ) {
          const sections = portSections.get(route.selector) ?? new Set();
          sections.add(section.id);
          portSections.set(route.selector, sections);
        }
      for (const art of section.eventArtCandidates)
        eventArt.push({
          section: section.id,
          image: art.eventImageIndex,
          file: `scripts/art/output/event-art/${art.extractedAsset}`,
        });
    }

    const ownPortrait = sailors[mainCharacter]!.portrait.kao;
    stories.push({
      mainCharacter,
      name: sailors[mainCharacter]!.name,
      description: messages[FIRST_DESCRIPTION + mainCharacter],
      sections: story.sections.length,
      recruits,
      characters: [...portraits]
        .filter(([kao]) => kao !== ownPortrait)
        .sort(([, a], [, b]) => a - b)
        .map(([kao, section]) => ({
          portrait: kao,
          firstSection: section,
          ...(byPortrait.get(kao) ?? { name: null, kind: "unknown" }),
        })),
      ports: [...portSections]
        .sort(([a], [b]) => a - b)
        .map(([port, sections]) => ({
          port,
          name: ports[port]!.name,
          sections: [...sections].sort((a, b) => a - b),
        })),
      eventArt,
    });
  }

  // Every portrait the stories show, including those of characters with no
  // record (named in portrait-names.json).
  await mkdir(join(output, "portraits"), { recursive: true });
  const shown = new Set(
    stories.flatMap((story) => story.characters.map((c) => c.portrait)),
  );
  for (const kao of shown)
    await writeFixedPortrait(kao, join(output, "portraits", `${kao}.png`));

  await writeJson(join(output, "stories.json"), stories);
  console.log(`Wrote ${stories.length} stories to ${output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
