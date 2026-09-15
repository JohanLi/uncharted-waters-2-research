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

interface RuntimeSectionKnowledge {
  title?: string;
  observations?: readonly string[];
  fameThresholds?: readonly number[];
}

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

const RUNTIME_SECTION_KNOWLEDGE = new Map<string, RuntimeSectionKnowledge>([
  [
    "1:0",
    {
      title: "Departure and Domingo introduction",
    },
  ],
  [
    "1:1",
    {
      title: "Prince Alberto kidnapping and Duke Franco trial",
      fameThresholds: [2_000],
      observations: [
        "Confirmed trigger floor: adventure fame is at least 2,000 (inclusive). After Domingo, visiting the Harbor runs the primary `A303` route and advances section 1 from subsection 0 to 1. Neither arrival time nor the number of port calls is the trigger.",
        "Once armed, the Pub route explicitly excludes port IDs 0–2 (Lisbon, Seville, and Istanbul), rather than testing a region ID. Barcelona, Valencia, and Bordeaux are allowed.",
        "The Pub handler accepts 04:20–17:00 internally. Because the Pub opens at 08:00, the effective observed window is 08:00–17:00. Advancing time by checking into the Lodge does not prevent the event.",
        "Fame eligibility is latched by the Harbor-triggered subsection transition: lowering adventure fame from 2,000 to 1,000 afterward does not prevent the Pub scene.",
        "Confirmed progression: Pub rumor → optional Lodge clue → Shipyard confrontation and duel → Catalina's intervention and challenge → Port revelation → return to Lisbon for the home and palace sequence.",
        "The Lodge is not required: flag 0 set by the Pub already permits the Shipyard scene. The first Lodge visit sets flag 8 and changes later reminder dialogue.",
        "After the Shipyard sequence, flag 1 is set and flag 0 is cleared. The subsequent Port revelation advances subsection 1 to 2 without changing the flags.",
        "In Lisbon subsection 2, completing the home duel sets flag 5 and completing the Palace trial sets flag 2. The section and subsection remain 1/2 afterward.",
        "Returning to João's father after the Palace trial presents the message 310 choice and sets flag 3, beginning Alberto's departure stage. Detouring into a non-Harbor building then shows messages 394–395 without ejecting João.",
        "Visiting the Harbor shows Alberto's distinct farewell at messages 361–362 and sets flag 4. A supplied post-Harbor save confirms section 1/subsection 2 with flags 1, 2, 3, 4, 5, and choice flag 16 set.",
        "Flag 3 remains set after Alberto leaves, so it marks the departure stage rather than his current presence. Flag 4 means the Harbor farewell is complete; the section's at-sea-day-1 route requires it before advancing to section 2.",
        "Controlled saves confirm that leaving Lisbon and voyage day 0 retain section 1/subsection 2 and flags 1, 2, 3, 4, 5, and 16. By voyage day 2 the save is section 2/subsection 0 with all scenario flags cleared, matching the intervening at-sea-day-1 `F1` route.",
        "During forced stages, other buildings can show context-specific warnings and eject the player.",
        "The confirmed runtime order differs from file order: for example, the Port revelation at 0x0B25 occurs after the Shipyard sequence beginning at 0x0C79.",
      ],
    },
  ],
  [
    "1:2",
    {
      title: "Catalina pursuit at 8,000 adventure fame",
      fameThresholds: [8_000],
      observations: [
        "Controlled saves confirm the preceding story reaches section 2/subsection 0 at sea with all scenario flags cleared and adventure fame exactly 8,000.",
        "A before/after pair confirms that entering the Lodge in Seville at exactly 8,000 adventure fame silently advances section 2 from subsection 0 to 1. Flag 6 remains set, and no other story flag changes.",
        "This runtime result confirms the primary `A3FF` wildcard activation route and shows that the 8,000-fame event is not Harbor-specific. A subsequent Pub visit shows messages 425–428 and sets flag 0.",
        "The initial Pub warning contains no time or port-ID test, so Lisbon, Seville, and Istanbul are not statically excluded. Normal Pub opening hours still apply.",
        "The Pub stores its port ID in scenario variable 0. A later building visit compares the current port with that saved value to select a warning: in the same port, Seville's Lodge shows messages 440–441.",
        "Opcode `EB 00 00 02` then assigns variable 0 a random value in `0..1`; Catalina appears on zero, making this a 50% chance. Her appearance shows messages 444–447, plays music track 16, and sets flag 1. The following Harbor sequence clears flags 0 and 1, sets flag 2, and directs the story back to sea.",
        "The Harbor aftermath shows messages 429–437 leave the save in section 2/subsection 1 with flags 2 and 6 set. Because this handler runs only when flag 1 is set, the result also confirms Catalina's preceding flag-1 write.",
        "The next voyage-day-1 route clears flag 2 and advances the story to subsection 2.",
      ],
    },
  ],
  [
    "1:3",
    {
      title: "Massawa, Poseidon's Staff, and the Turkish invasion",
      fameThresholds: [16_000, 16_000],
      observations: [
        "Two distinct 16,000-adventure-fame checks occur at 0x1DDB and 0x1E60. The section contains Ali's Massawa lead, Lord Taphali, Pietro's search for Poseidon's Staff, the delayed Turkish invasion, and the defense of Massawa.",
        "The duplicated threshold is real, but it does not imply two independent 16,000-fame milestones; flags, port/date state, and subsections gate the later phases.",
      ],
    },
  ],
  [
    "1:4",
    {
      title: "Enrico's voyage to Zipangu",
      fameThresholds: [30_000],
      observations: [
        "The section checks 30,000 adventure fame and asks João to take Enrico to Nagasaki.",
      ],
    },
  ],
  [
    "1:5",
    {
      title: "Enrico's letter and the Neo-Atlantis finale",
      fameThresholds: [40_000],
      observations: [
        "The section checks 40,000 adventure fame and contains the Guild letter, Sakai meeting, South American search, Lucia rescue, Ezequiel alliance, Amazon battles, and Lisbon ending.",
        "The South American wildcard-building handler executes `EB 03 00 0A` and advances only when the result is zero: each eligible building entry has a one-in-ten chance. It also checks 04:20–17:00 internally, making the effective window 08:00–17:00 for Pub access.",
      ],
    },
  ],
  ["2:0", { title: "Spanish Navy break and stolen Galleon" }],
  [
    "2:1",
    {
      title: "Spanish pursuit and Andreas's recruitment",
      fameThresholds: [1],
      observations: [
        "The first piracy-fame gate uses the literal value 1. Whether an external dispatch condition imposes a higher practical minimum still needs a controlled boundary test.",
        "The section advances through before/after-naval-battle hooks for the pursuing Spanish fleets and introduces Andreas.",
      ],
    },
  ],
  [
    "2:2",
    {
      title: "First search for João",
      fameThresholds: [1_500, 2_000],
      observations: [
        "The primary branch compares piracy fame with 1,500; a later section handoff compares it with 2,000. `SNR2.DAT` contains no 4,000 constant.",
      ],
    },
  ],
  [
    "2:3",
    {
      title: "Five-day search and Shipyard encounter with João",
      fameThresholds: [2_000],
      observations: [
        "This is continued 2,000-fame progression rather than a new 4,000-fame tier. Its subsections include day-at-sea waits, the Shipyard encounter, and João's escape.",
      ],
    },
  ],
  [
    "2:4",
    {
      title: "Bret Perot's randomized João hunt",
      fameThresholds: [8_000],
      observations: [
        "The section contains the exact 8,000 piracy-fame constant. `EB 10 00 14` selects one of 20 values for the reported destination, while `EB 00 00 04` creates a one-in-four branch during the town search.",
      ],
    },
  ],
  [
    "2:5",
    {
      title: "Lucia kidnapping and Bret Perot",
      observations: [
        "The routes explicitly name Ceuta (`0x1A`) and Alexandria (`0x12`) and end with the naval encounter against Antonio Khan (`0x3C`). This is continuation of the 8,000-fame quest, not another fame tier.",
      ],
    },
  ],
  [
    "2:6",
    {
      title: "Massawa and the Turkish fleet",
      fameThresholds: [15_000],
      observations: [
        "The section contains the exact 15,000 piracy-fame constant, an after-battle informant route, Massawa (`0x4A`), and the Turkish battle sequence.",
      ],
    },
  ],
  [
    "2:7",
    {
      title: "Franco truth and Neo-Atlantis finale",
      fameThresholds: [30_000],
      observations: [
        "The section checks 30,000 piracy fame and contains Ali, Pietro, Raul Franco, the South American rescue, Ezequiel, and the Amazon ending.",
        "`EB 01 00 0A` creates a one-in-ten random branch in the South American search phase.",
      ],
    },
  ],
  ["3:0", { title: "Royal commission and stolen Spanish Galleon" }],
  ["3:1", { title: "Spanish counterattack outside Seville" }],
  [
    "3:2",
    {
      title: "Ghosts and Catalina at 5,000 piracy fame",
      fameThresholds: [5_000, 5_000],
      observations: [
        "Two separate 5,000-piracy-fame checks gate the Trader and Pub portions of the encounter.",
      ],
    },
  ],
  [
    "3:3",
    {
      title: "Optional gold-frigate rumor at 20,000 piracy fame",
      fameThresholds: [20_000],
      observations: [
        "Runtime observation confirms that Pietro's information about a gold-laden Spanish frigate is completely optional, skippable, and easy to miss.",
      ],
    },
  ],
  [
    "3:4",
    {
      title: "Spanish Armada campaign at 30,000 piracy fame",
      fameThresholds: [30_000],
      observations: [
        "The section covers Henry VIII's summons, Nantes, Santo Domingo, the Amazon, and Catalina's intervention at 30,000 piracy fame.",
      ],
    },
  ],
  [
    "3:5",
    {
      title: "Ezequiel duel and London ending",
      fameThresholds: [30_000],
      observations: [
        "A second 30,000 check guards the continuation containing the Pub meeting with Ezequiel, the 30-day Bordeaux appointment, battle hooks, and ending.",
      ],
    },
  ],
  [
    "4:0",
    {
      title: "Mercator's expedition",
      observations: [
        "Drawing a map requires Cartography, bit `0x08` in the sailor skill mask, and a signed contract with a cartographer.",
        "Known cartographers are Mercator in Amsterdam, Gerard de Jode in Antwerp, Diogo Ribeiro in Barcelona, Olives in Palma, and Giovanni Verrazano in Venice. Each can teach Cartography or accept a contract.",
        "The persistent chart is a 90 × 45-cell bitmap. New-game initialization reveals a 13 × 10 European rectangle, leaving 3,920 cells. Each newly charted cell awards 5 adventure fame when reported, so the map reports themselves can contribute at most 19,600 fame outside Europe.",
        "The paired initial-map screenshots add exactly three cells and produced 15 adventure fame, runtime-confirming the 5-fame calculation. Their 240-gold reward also matches 80 gold per cell for the active cartographer.",
        "The general gold formula is `new cells × 20 × (5 − (record[0x16] & 3))`. All five cartographer records contain `0x09` at `+0x16`, so all use modifier 1 and pay 80 gold per cell. Mercator's completion check requires 3,300 known cells including the initial 130: 3,170 of 3,920 initially hidden cells, or approximately 80.87%.",
      ],
    },
  ],
  [
    "4:1",
    {
      title: "Paula joins at 1,000 adventure fame",
      fameThresholds: [1_000],
      observations: [
        "The section contains the exact 1,000-adventure-fame check. Additional map-progress state is evaluated before Paula joins.",
      ],
    },
  ],
  [
    "4:2",
    {
      title: "Paula travel dialogue at 5,000 adventure fame",
      fameThresholds: [5_000],
      observations: [
        "The exact 5,000 threshold is followed by `EB 01 00 03`, selecting among three dialogue variants.",
      ],
    },
  ],
  [
    "4:3",
    {
      title: "Paula travel dialogue at 20,000 adventure fame",
      fameThresholds: [20_000],
      observations: [
        "The exact 20,000 threshold is followed by another three-way random dialogue selection.",
      ],
    },
  ],
  [
    "4:4",
    {
      title: "Zipangu, Huang He, and Paula's home",
      fameThresholds: [40_000],
      observations: [
        "The section checks exactly 40,000 adventure fame. Routes explicitly name Changan (`0x61`), Sakai (`0x62`), and Nagasaki (`0x63`).",
      ],
    },
  ],
  ["5:0", { title: "Debts, Camillo, and Duchess Franco's sponsorship" }],
  [
    "5:1",
    {
      title: "Golden Medallion and El Dorado",
      observations: [
        "The dialogue and condition constants support African-port, money, and adventure-progress prerequisites, but the exact 1,000-fame plus 2,000-gold interpretation still depends on unnamed `EA`/comparison operands.",
      ],
    },
  ],
  [
    "5:2",
    {
      title: "Poseidon's Staff at 10,000 adventure fame",
      fameThresholds: [10_000],
      observations: [
        "The section checks exactly 10,000 adventure fame. It randomly selects Ottoman and Middle Eastern leads, then routes the recovered Staff to João in Massawa.",
      ],
    },
  ],
  [
    "5:3",
    {
      title: "Zipangu, Raul Franco, and El Dorado at 40,000 fame",
      fameThresholds: [40_000],
      observations: [
        "The exact 40,000-adventure-fame check leads through both Japanese ports, South America, Raul Franco, and the Lisbon ending.",
      ],
    },
  ],
  ["6:0", { title: "Debt repayment and rise to Page" }],
  [
    "6:1",
    {
      title: "Sultan's expansion commission",
      observations: [
        "This section covers palace summons, investment/alliance instructions, and several money/fame rewards. It is progression- and rank-gated rather than fame-threshold-gated.",
      ],
    },
  ],
  [
    "6:2",
    {
      title: "João, Catalina, and Sapha",
      observations: [
        "Opcode `EA 00` is compared directly with 100 before flag 0 is set, supporting a 100-gold-ingot trigger. The section then contains João's decoy sail, Catalina, the five-day wait, Basra (`0x4C`), and Sapha.",
      ],
    },
  ],
  [
    "6:3",
    {
      title: "Radino and Howell's Pietro debt",
      observations: [
        "The section explicitly routes through Venice (`0x0D`), Lisbon (`0x00`), Sakai (`0x62`), and Nagasaki (`0x63`). A 15-allied-port prerequisite is plausible but the responsible alliance-count operand remains unnamed.",
      ],
    },
  ],
  [
    "6:4",
    {
      title: "Return to the Sultan",
      observations: [
        "This short transition pays the 100-ingot reward and advances into the final trade-fame section.",
      ],
    },
  ],
  [
    "6:5",
    {
      title: "Sapha and the Istanbul house at 40,000 trade fame",
      fameThresholds: [40_000, 40_000],
      observations: [
        "Two exact 40,000-trade-fame checks gate the criticism and subsequent final sequence. The routes cover Basra, Venice, the Istanbul house purchase, and Ali's Pub ending.",
      ],
    },
  ],
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

function runtimeKnowledge(
  scenarioId: number,
  sectionId: number,
): RuntimeSectionKnowledge | undefined {
  return RUNTIME_SECTION_KNOWLEDGE.get(`${scenarioId}:${sectionId}`);
}

function summarizeThresholds(thresholds: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const threshold of thresholds)
    counts.set(threshold, (counts.get(threshold) ?? 0) + 1);
  return [...counts]
    .map(([threshold, count]) =>
      count === 1 ? String(threshold) : `${threshold} ×${count}`,
    )
    .join(", ");
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

function sectionSummary(
  section: ScenarioSection,
  knowledge?: RuntimeSectionKnowledge,
): string {
  const knownThresholds = knowledge?.fameThresholds;
  const thresholds =
    knownThresholds ?? section.fameChecks.map((check) => check.threshold);
  return [
    `${section.dialogueRuns.length} dialogue runs`,
    `${section.routes.length} routes`,
    `${section.instructions.length} reachable VM instructions`,
    `${section.booleanStateWrites.length} state writes`,
    ...(thresholds.length > 0
      ? [
          `${knownThresholds ? "known fame gates" : "fame candidates"}: ${summarizeThresholds(thresholds)}`,
        ]
      : []),
  ].join("<br/>");
}

function renderJoaoPrinceQuestMermaid(lines: string[]): void {
  lines.push(
    '  subgraph s1runtime["Section 1: confirmed runtime flow"]',
    "    direction TB",
    '    s1arrival["After Domingo<br/>section 1/subsection 0"]',
    '    s1harbor{"Visit Harbor with adventure fame ≥ 2,000<br/>A303 advances to subsection 1"}',
    '    s1trigger{"Enter Pub<br/>port ID must be greater than 2"}',
    '    s1pub["Pub rumor<br/>message 227 at 0x0A9F"]',
    '    s1wrong["Other building<br/>context warning and forced exit"]',
    '    s1lodge["Optional Lodge clue<br/>first visit: messages 270–271<br/>repeat: message 269<br/>sets flag 8"]',
    '    s1shipyard["Shipyard confrontation<br/>message 274 at 0x0C79<br/>track 16: battle"]',
    '    s1duel1{{"Duel with Antonio Khan<br/>E8 3C at 0x0CA6"}}',
    '    s1catalina["Catalina intervenes<br/>message 282 at 0x0CD2<br/>track 5: Catalina"]',
    '    s1flute["Flute scene<br/>message 292 at 0x0D2F<br/>track 4: flute"]',
    '    s1challenge["Catalina challenges João<br/>message 293 at 0x0D43<br/>track 16 + event art 0"]',
    '    s1port["Port revelation<br/>message 240 at 0x0B25<br/>advances to subsection 2"]',
    '    s1lisbon["Return to Lisbon"]',
    '    s1home["Franco home ambush<br/>message 332 at 0x0F74<br/>successful duel sets flag 5"]',
    '    s1duel2{{"Home duel<br/>E8 3C at 0x0FFF"}}',
    '    s1palace["Palace and trial progression<br/>sets flag 2"]',
    '    s1aftermath["Return to father\'s house<br/>message 310 choice prompt<br/>sets flag 3"]',
    '    s1detour["Other building during departure stage<br/>messages 394–395<br/>reminder only; no ejection"]',
    '    s1farewell["Visit Harbor<br/>Prince Alberto farewell<br/>messages 361–362"]',
    '    s1sea["Set sail<br/>at-sea day 1 + flag 4<br/>advances to section 2"]',
    "    s1arrival --> s1harbor --> s1trigger --> s1pub --> s1lodge --> s1shipyard --> s1duel1",
    "    s1pub -->|Lodge may be skipped| s1shipyard",
    "    s1duel1 --> s1catalina --> s1flute --> s1challenge --> s1port",
    "    s1port --> s1lisbon --> s1home --> s1duel2 --> s1palace --> s1aftermath --> s1farewell --> s1sea",
    "    s1aftermath -. detour .-> s1detour -. still pending .-> s1farewell",
    "    s1pub -. wrong destination .-> s1wrong",
    "    s1wrong -. before Lodge visit .-> s1lodge",
    "  end",
    "  s1 -. live-test evidence .-> s1arrival",
  );
}

function renderMermaid(scenario: DisassembledScenario): string {
  const name = SCENARIO_NAMES[scenario.scenarioId] ?? "Unknown";
  const lines = [
    "flowchart LR",
    `  scenario["Scenario ${scenario.scenarioId}: ${name}"]`,
  ];

  for (const section of scenario.sections) {
    const sectionNode = `s${section.id}`;
    const knowledge = runtimeKnowledge(scenario.scenarioId, section.id);
    const title = knowledge?.title ? `<br/>${knowledge.title}` : "";
    lines.push(
      `  ${sectionNode}["Section ${section.id}${title}<br/>${hex(section.offset)}–${hex(section.endOffset)}<br/>${sectionSummary(section, knowledge)}"]`,
    );
    lines.push(
      section.id === 0
        ? `  scenario -->|file order| ${sectionNode}`
        : `  s${section.id - 1} -->|file order| ${sectionNode}`,
    );

    for (const [index, route] of section.routes.entries()) {
      const label = routeMeaning(route);
      lines.push(
        `  ${sectionNode} -.-> s${section.id}r${index}["${label}<br/>entry ${hex(route.destinationOffset)}"]`,
      );
    }
    for (const [index, check] of section.fameChecks.entries()) {
      const confirmedJoaoTrigger =
        scenario.scenarioId === 1 &&
        section.id === 1 &&
        check.threshold === 2_000;
      lines.push(
        `  ${sectionNode} --- s${section.id}f${index}{"${confirmedJoaoTrigger ? "Confirmed adventure-fame trigger" : "Fame threshold candidate"}<br/>${confirmedJoaoTrigger ? "≥ " : ""}${check.threshold.toLocaleString("en-US")}<br/>at ${hex(check.offset)}"}`,
      );
    }
  }

  if (scenario.scenarioId === 1) renderJoaoPrinceQuestMermaid(lines);

  lines.push(
    "",
    "%% Solid arrows show file order only, not confirmed runtime transitions.",
    "%% Dotted edges are location entry routes; fame nodes are detected checks.",
    "%% The labeled Section 1 subgraph records behavior confirmed in live tests.",
  );
  return `${lines.join("\n")}\n`;
}

function lineSpeaker(line: DialogueLine): string {
  if (line.speakerLabel) return line.speakerLabel;
  if (line.characterId !== undefined) return `Character ${line.characterId}`;
  return "Narration";
}

function renderSectionMarkdown(
  scenarioId: number,
  section: ScenarioSection,
): string[] {
  const knowledge = runtimeKnowledge(scenarioId, section.id);
  const lines = [
    `## Section ${section.id}${knowledge?.title ? `: ${knowledge.title}` : ""}`,
    "",
    `Offsets: ${hex(section.offset)}–${hex(section.endOffset)}; parsed code starts at ${hex(section.codeOffset)}; primary destination base is ${hex(section.destinationBaseOffset)}.`,
    "",
    `Sequential decoding found ${section.instructions.length} reachable instructions and ${section.controlFlowEdges.length} control-flow edges.`,
    "",
  ];

  if (knowledge?.observations) {
    lines.push(
      "### Runtime-confirmed behavior",
      "",
      ...knowledge.observations.map((observation) => `- ${observation}`),
      "",
      "",
    );
  }

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
      "Observed `C4` instructions, provisionally identified as screen clears or pauses:",
      "",
      section.sceneBreakCandidates
        .map((candidate) => hex(candidate.offset))
        .join(", "),
      "",
    );
  }

  if (section.duelStartCandidates.length > 0) {
    lines.push(
      "### Duel-start candidates",
      "",
      section.duelStartCandidates
        .map((candidate) => hex(candidate.offset))
        .join(", "),
      "",
    );
  }

  if (section.eventArtCandidates.length > 0) {
    lines.push(
      "### Event-art candidates",
      "",
      "| Offset | Image index | Bytes |",
      "| ---: | ---: | --- |",
      ...section.eventArtCandidates.map(
        (candidate) =>
          `| ${hex(candidate.offset)} | ${candidate.eventImageIndex} | \`${candidate.rawHex.toUpperCase()}\` |`,
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
    "The companion `.mmd` file provides a Mermaid overview. Exact bytes and",
    "all extracted fields remain available in `../scenarios.json`.",
    "",
    ...scenario.sections.flatMap((section) =>
      renderSectionMarkdown(scenario.scenarioId, section),
    ),
  ].join("\n")}\n`;
}

function renderIndex(scenarios: readonly DisassembledScenario[]): string {
  return `${[
    "# Readable scenario views",
    "",
    "These files are generated from `scenarios.json`. Markdown files contain",
    "searchable transcripts and evidence tables; Mermaid files show a compact",
    "overview; `dialogue-lines.csv` contains one row per dialogue occurrence.",
    "`instructions.csv` contains the reachable sequential VM decode, while",
    "`control-flow.csv` contains its fallthrough and branch edges.",
    "",
    "Solid Mermaid arrows show file order, not confirmed runtime control flow.",
    "",
    ...scenarios.map((scenario) => {
      const id = scenario.scenarioId;
      const name = SCENARIO_NAMES[id] ?? "Unknown";
      return `- Scenario ${id}, ${name}: [transcript](./scenario-${id}.md) · [Mermaid](./scenario-${id}.mmd)`;
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
      "messageId",
      "speakerLabel",
      "presentation",
      "choiceFlag",
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
            line.messageId,
            line.speakerLabel,
            line.presentation,
            line.choiceFlag,
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
    ...scenarios.flatMap((scenario) => [
      writeFile(
        join(readable, `scenario-${scenario.scenarioId}.md`),
        renderMarkdown(scenario),
      ),
      writeFile(
        join(readable, `scenario-${scenario.scenarioId}.mmd`),
        renderMermaid(scenario),
      ),
    ]),
  ]);
}
