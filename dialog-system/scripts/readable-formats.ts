import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  DialogueLine,
  DisassembledScenario,
  ScenarioRoute,
  ScenarioSection,
} from "./snr.js";

const SCENARIO_NAMES = [
  "Common quests and royal missions",
  "João Franco",
  "Catalina Erantzo",
  "Otto Baynes",
  "Ernst von Bohr",
  "Pietro Conti",
  "Ali Vezas",
] as const;

const KNOWN_PORTS = new Map<number, string>([
  [0x00, "Lisbon"],
  [0x01, "Seville"],
  [0x02, "Istanbul"],
  [0x08, "Genoa"],
  [0x0d, "Venice"],
  [0x12, "Alexandria"],
  [0x1a, "Ceuta"],
  [0x1b, "Bordeaux"],
  [0x1c, "Nantes"],
  [0x1d, "London"],
  [0x21, "Amsterdam"],
  [0x30, "Santo Domingo"],
  [0x39, "Madeira"],
  [0x4a, "Massawa"],
  [0x4c, "Basra"],
  [0x61, "Changan"],
  [0x62, "Sakai"],
  [0x63, "Nagasaki"],
]);

function hex(value: number, width = 4): string {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

function markdown(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function csv(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function routeMeaning(route: ScenarioRoute): string {
  if (route.selector <= 0x63) {
    const port = KNOWN_PORTS.get(route.selector) ?? `port ${route.selector}`;
    const context =
      route.knownLocation ??
      (route.qualifier === 0xff
        ? "any context"
        : `context ${hex(route.qualifier, 2)}`);
    return `${port}: ${context}`;
  }
  const meaning =
    route.knownLocation ??
    route.knownEvent ??
    route.knownSelector ??
    `route ${route.keyHex}`;
  return route.knownOpposingCaptain
    ? `${meaning}: ${route.knownOpposingCaptain} (sailor ${route.opposingCaptainId})`
    : meaning;
}

function lineSpeaker(line: DialogueLine): string {
  if (line.speakerLabel) return line.speakerLabel;
  if (line.characterId !== undefined) return `Character ${line.characterId}`;
  if (line.characterVariable !== undefined)
    return `Character from variable ${line.characterVariable}`;
  // Position 0 reuses the surrounding building speaker's upper panel.
  return line.position === 0 ? "Building speaker" : "Narration";
}

function renderSectionMarkdown(section: ScenarioSection): string[] {
  const lines = [
    `## Section ${section.id}`,
    "",
    `Offsets: ${hex(section.offset)}–${hex(section.endOffset)}; parsed code starts at ${hex(section.codeOffset)}; primary destination base is ${hex(section.destinationBaseOffset)}.`,
    "",
    `Sequential decoding found ${section.instructions.length} reachable instructions and ${section.controlFlowEdges.length} control-flow edges.`,
    "",
  ];

  if (section.routes.length > 0) {
    lines.push(
      "### Primary route table",
      "",
      "| Key | Selector | Qualifier | Known location/event | Destination |",
      "| ---: | ---: | ---: | --- | ---: |",
      ...section.routes.map(
        (route) =>
          `| ${route.keyHex} | ${hex(route.selector, 2)} | ${hex(route.qualifier, 2)} | ${routeMeaning(route)} | ${hex(route.destinationOffset)} |`,
      ),
      "",
    );
  }

  if (section.entryRouteTables.length > 0) {
    lines.push(
      "### Section-entry route tables",
      "",
      "Each table establishes its own base for route and branch destinations.",
      "",
      "| Table | Key | Selector | Qualifier | Known location/event | Destination |",
      "| ---: | ---: | ---: | ---: | --- | ---: |",
      ...section.entryRouteTables.flatMap((table) =>
        table.routes.map(
          (route) =>
            `| ${hex(table.offset)} | ${route.keyHex} | ${hex(route.selector, 2)} | ${hex(route.qualifier, 2)} | ${routeMeaning(route)} | ${hex(route.destinationOffset)} |`,
        ),
      ),
      "",
    );
  }

  if (section.fameChecks.length > 0) {
    lines.push(
      "### Fame-check candidates",
      "",
      "| Offset | Threshold | Trailing operand |",
      "| ---: | ---: | ---: |",
      ...section.fameChecks.map(
        (check) =>
          `| ${hex(check.offset)} | ${check.threshold.toLocaleString("en-US")} | ${hex(check.trailingOperand)} |`,
      ),
      "",
    );
  }

  if (section.booleanStateWrites.length > 0) {
    lines.push(
      "### Scenario flag writes",
      "",
      "| Offset | Flag | Value |",
      "| ---: | ---: | ---: |",
      ...section.booleanStateWrites.map(
        (write) => `| ${hex(write.offset)} | ${write.flag} | ${write.value} |`,
      ),
      "",
    );
  }

  if (section.musicCueCandidates.length > 0) {
    lines.push(
      "### Music-cue candidates",
      "",
      "| Offset | Track ID | Known track | Bytes |",
      "| ---: | ---: | --- | --- |",
      ...section.musicCueCandidates.map(
        (cue) =>
          `| ${hex(cue.offset)} | ${cue.trackId} | ${cue.knownTrack ?? "Unknown"} | \`${cue.rawHex.toUpperCase()}\` |`,
      ),
      "",
    );
  }

  if (section.sceneBreakCandidates.length > 0) {
    lines.push(
      "### Scene-break candidates",
      "",
      "Observed `C4` instructions, which close every open dialogue panel:",
      "",
      section.sceneBreakCandidates
        .map((candidate) => hex(candidate.offset))
        .join(", "),
      "",
    );
  }

  if (section.duelStartCandidates.length > 0) {
    lines.push(
      "### Duel starts",
      "",
      "| Offset | Opponent sailor ID | Bytes |",
      "| ---: | ---: | --- |",
      section.duelStartCandidates
        .map(
          (candidate) =>
            `| ${hex(candidate.offset)} | ${candidate.opponentSailorId} | \`${candidate.rawHex.toUpperCase()}\` |`,
        )
        .join("\n"),
      "",
    );
  }

  if (section.eventArtCandidates.length > 0) {
    lines.push(
      "### Event-art candidates",
      "",
      "| Offset | Resource | Image index | Position | Extracted asset | Bytes |",
      "| ---: | --- | ---: | ---: | --- | --- |",
      ...section.eventArtCandidates.map(
        (candidate) =>
          `| ${hex(candidate.offset)} | \`${candidate.resourceFile}\` | ${candidate.eventImageIndex} | ${candidate.x}, ${candidate.y} | \`${candidate.extractedAsset}\` | \`${candidate.rawHex.toUpperCase()}\` |`,
      ),
      "",
    );
  }

  if (section.stateBranchCandidates.length > 0) {
    lines.push(
      "<details>",
      `<summary>${section.stateBranchCandidates.length} scenario-flag branches</summary>`,
      "",
      "| Offset | Opcode | Flag | Destination |",
      "| ---: | --- | ---: | ---: |",
      ...section.stateBranchCandidates.map(
        (branch) =>
          `| ${hex(branch.offset)} | ${branch.opcode} | ${branch.flag} | ${hex(branch.destinationOffset)} |`,
      ),
      "",
      "</details>",
      "",
    );
  }

  lines.push("### Dialogue runs", "");
  for (const run of section.dialogueRuns) {
    lines.push(
      `<details><summary>Run at ${hex(run.offset)}–${hex(run.endOffset)} (${run.lines.length} lines)</summary>`,
      "",
      "| Offset | Kind | Side | Speaker | Message | Text |",
      "| ---: | --- | ---: | --- | ---: | --- |",
      ...run.lines.map(
        (line) =>
          `| ${hex(line.offset)} | ${line.presentation === "choice-prompt" ? `choice → flag ${line.choiceFlag}` : "dialogue"} | ${line.position} | ${markdown(lineSpeaker(line))} | ${line.messageId} | ${markdown(line.body)} |`,
      ),
      "",
      "</details>",
      "",
    );
  }
  return lines;
}

function renderMarkdown(scenario: DisassembledScenario): string {
  const name = SCENARIO_NAMES[scenario.scenarioId] ?? "Unknown";
  return `${[
    `# Scenario ${scenario.scenarioId}: ${name}`,
    "",
    "> This is a structural view of compiled scenario data. File order is not",
    "> necessarily runtime order, and candidate conditions are not fully decoded.",
    "",
    `Messages: ${scenario.messages.length}; sections: ${scenario.sections.length}.`,
    "",
    "Exact bytes and all extracted fields remain available in `../scenarios.json`.",
    "",
    ...scenario.sections.flatMap((section) => renderSectionMarkdown(section)),
  ].join("\n")}\n`;
}

function renderIndex(scenarios: readonly DisassembledScenario[]): string {
  return `${[
    "# Readable scenario views",
    "",
    "These files are generated from `scenarios.json`. Markdown files contain",
    "searchable transcripts and evidence tables. `dialogue-lines.csv` contains",
    "one row per dialogue occurrence.",
    "`instructions.csv` contains the reachable sequential VM decode, while",
    "`control-flow.csv` contains its fallthrough and branch edges.",
    "",
    ...scenarios.map((scenario) => {
      const id = scenario.scenarioId;
      const name = SCENARIO_NAMES[id] ?? "Unknown";
      return `- Scenario ${id}, ${name}: [structural transcript](./scenario-${id}.md)`;
    }),
  ].join("\n")}\n`;
}

function renderCsv(scenarios: readonly DisassembledScenario[]): string {
  const rows: (string | number | undefined)[][] = [
    [
      "scenarioId",
      "scenarioName",
      "sectionId",
      "runOffset",
      "lineOffset",
      "position",
      "characterId",
      "characterVariable",
      "speakerMessageId",
      "messageId",
      "speakerLabel",
      "presentation",
      "choiceFlag",
      "presentationInstructionOffsets",
      "body",
      "rawHex",
    ],
  ];
  for (const scenario of scenarios)
    for (const section of scenario.sections)
      for (const run of section.dialogueRuns)
        for (const line of run.lines)
          rows.push([
            scenario.scenarioId,
            SCENARIO_NAMES[scenario.scenarioId],
            section.id,
            run.offset,
            line.offset,
            line.position,
            line.characterId,
            line.characterVariable,
            line.speakerMessageId,
            line.messageId,
            line.speakerLabel,
            line.presentation,
            line.choiceFlag,
            line.presentationInstructionOffsets
              ?.map((offset) => hex(offset))
              .join(" "),
            line.body,
            line.rawHex,
          ]);
  return `${rows.map((row) => row.map(csv).join(",")).join("\n")}\n`;
}

function renderInstructionCsv(
  scenarios: readonly DisassembledScenario[],
): string {
  const rows: (string | number | undefined)[][] = [
    [
      "scenarioId",
      "sectionId",
      "offset",
      "endOffset",
      "destinationBaseOffset",
      "opcode",
      "kind",
      "mnemonic",
      "branchDestinationOffset",
      "terminal",
      "rawHex",
    ],
  ];
  for (const scenario of scenarios)
    for (const section of scenario.sections)
      for (const instruction of section.instructions)
        rows.push([
          scenario.scenarioId,
          section.id,
          instruction.offset,
          instruction.endOffset,
          instruction.destinationBaseOffset,
          instruction.opcodeHex,
          instruction.kind,
          instruction.mnemonic,
          instruction.branchDestinationOffset,
          String(instruction.terminal),
          instruction.rawHex,
        ]);
  return `${rows.map((row) => row.map(csv).join(",")).join("\n")}\n`;
}

function renderControlFlowCsv(
  scenarios: readonly DisassembledScenario[],
): string {
  const rows: (string | number | undefined)[][] = [
    ["scenarioId", "sectionId", "from", "to", "type"],
  ];
  for (const scenario of scenarios)
    for (const section of scenario.sections)
      for (const edge of section.controlFlowEdges)
        rows.push([
          scenario.scenarioId,
          section.id,
          edge.from,
          edge.to,
          edge.type,
        ]);
  return `${rows.map((row) => row.map(csv).join(",")).join("\n")}\n`;
}

export async function writeReadableFormats(
  output: string,
  scenarios: readonly DisassembledScenario[],
): Promise<void> {
  const readable = join(output, "readable");
  await rm(readable, { recursive: true, force: true });
  await mkdir(readable, { recursive: true });
  await Promise.all([
    writeFile(join(readable, "README.md"), renderIndex(scenarios)),
    writeFile(join(readable, "dialogue-lines.csv"), renderCsv(scenarios)),
    writeFile(
      join(readable, "instructions.csv"),
      renderInstructionCsv(scenarios),
    ),
    writeFile(
      join(readable, "control-flow.csv"),
      renderControlFlowCsv(scenarios),
    ),
    ...scenarios.map((scenario) =>
      writeFile(
        join(readable, `scenario-${scenario.scenarioId}.md`),
        renderMarkdown(scenario),
      ),
    ),
  ]);
}
