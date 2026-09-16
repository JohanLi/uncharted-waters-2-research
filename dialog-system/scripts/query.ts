import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  inspectFame,
  inspectRank,
  inspectSlot,
  RANK_NAMES,
  slotOffset,
  validate,
} from "../../save-editor/format.js";
import { repoRoot } from "../../scripts/shared.js";
import {
  disassembleScenario,
  type DialogueLine,
  type DisassembledScenario,
  type ScenarioInstruction,
  type ScenarioRoute,
} from "./snr.js";

export const BUILDING_CONTEXTS = {
  market: 0x00,
  pub: 0x01,
  shipyard: 0x02,
  harbor: 0x03,
  port: 0x03,
  arrival: 0x03,
  lodge: 0x04,
  palace: 0x05,
  guild: 0x06,
  "special-building": 0x07,
  home: 0x07,
  bank: 0x08,
  "item-shop": 0x09,
  church: 0x0a,
  "house-of-fortune": 0x0b,
  "fortune-teller": 0x0b,
} as const;

export type ScenarioQueryAction =
  | {
      readonly type: "building";
      readonly context: number;
      readonly name: string;
    }
  | { readonly type: "at-sea" }
  | {
      readonly type: "before-battle" | "after-battle";
      readonly opposingCaptainId: number;
    };

export type QueryConfidence = "confirmed" | "decoded" | "ambiguous" | "none";

export interface ScenarioQueryOutcome {
  readonly confidence: Exclude<QueryConfidence, "none">;
  readonly probability: number;
  readonly dialogue: readonly DialogueLine[];
  readonly uncertainties: readonly string[];
  readonly effects: readonly string[];
}

export interface ScenarioQueryResult {
  readonly confidence: QueryConfidence;
  readonly scenarioId: number;
  readonly protagonist: string;
  readonly section: number;
  readonly subsection: number;
  readonly flagsHex: string;
  readonly portId: number;
  readonly portName: string;
  readonly action: ScenarioQueryAction;
  readonly buildingOpen?: boolean;
  readonly route?: ScenarioRoute;
  readonly routeTable: "primary" | `subsection-${number}`;
  readonly outcomes: readonly ScenarioQueryOutcome[];
  readonly sharedScenario: SharedScenarioStatus;
  readonly notes: readonly string[];
}

export interface SharedScenarioStatus {
  readonly section: number;
  readonly subsection: number;
  readonly flagsHex: string;
  readonly eligibilityFlag: boolean;
  readonly invitationArmed: boolean;
  readonly offerStarted: boolean;
  readonly rank: number;
  readonly highestFameCategory: "trade" | "piracy" | "adventure";
  readonly highestFame: number;
  readonly nextTitleThreshold?: number;
  readonly meetsFameThreshold: boolean;
  readonly cachedMissionSection: number;
  readonly cachedMissionName?: string;
  readonly routeTable: "primary" | `subsection-${number}` | "unavailable";
  readonly route?: ScenarioRoute;
}

const PROTAGONISTS = [
  "João Franco",
  "Catalina Erantzo",
  "Otto Baynes",
  "Ernst von Bohr",
  "Pietro Conti",
  "Ali Vezas",
] as const;

const RUNTIME_CONFIRMED_FIRST_MESSAGES = new Set([
  2, 23, 62, 63, 227, 240, 269, 274, 282, 293, 332, 425, 429,
]);

const SCENARIO_VARIABLES_START = 0x3a;
const SCENARIO_VARIABLE_COUNT = 64;
const SHARED_SCENARIO_START = 0xba;
const SHARED_VARIABLES_START = SHARED_SCENARIO_START + 0x0a;
const SHARED_MISSION_NAMES = new Map<number, string>([
  [1, "Transport Goods"],
  [2, "Buy Goods"],
  [3, "Deliver Letter"],
  [4, "Defeat Pirates"],
  [5, "Collect Debt"],
  [6, "Royal trading test"],
  [7, "Deliver documents"],
  [8, "Negotiate a treaty"],
  [9, "Establish allied ports"],
  [10, "Make discoveries"],
  [11, "Special search"],
  [12, "Defeat a national fleet or pirates"],
]);

interface ExecutionState {
  offset: number;
  flags: number;
  variables: Map<number, number>;
  variableNotEqual: Map<number, Set<number>>;
  dialogue: DialogueLine[];
  uncertainties: string[];
  effects: string[];
  probability: number;
  steps: number;
}

function hex(value: number, width = 4): string {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

function integer(text: string, label: string): number {
  if (!/^(?:0x[\da-f]+|\d+)$/i.test(text))
    throw new Error(`Invalid ${label}: ${text}`);
  const value = Number(text);
  if (!Number.isSafeInteger(value))
    throw new Error(`Invalid ${label}: ${text}`);
  return value;
}

export function parseQueryAction(value: string): ScenarioQueryAction {
  const normalized = value.toLowerCase();
  if (Object.hasOwn(BUILDING_CONTEXTS, normalized))
    return {
      type: "building",
      context: BUILDING_CONTEXTS[normalized as keyof typeof BUILDING_CONTEXTS],
      name: normalized,
    };
  if (normalized === "at-sea") return { type: "at-sea" };
  const context = /^context:(.+)$/.exec(normalized);
  if (context) {
    const id = integer(context[1]!, "context ID");
    if (id > 0xff) throw new Error("Context ID must be between 0 and 255.");
    return { type: "building", context: id, name: `context:${hex(id, 2)}` };
  }
  const battle = /^(before|after)-battle:(.+)$/.exec(normalized);
  if (battle) {
    const opposingCaptainId = integer(battle[2]!, "opposing captain ID");
    if (opposingCaptainId > 0xff)
      throw new Error("Opposing captain ID must be between 0 and 255.");
    return {
      type: battle[1] === "before" ? "before-battle" : "after-battle",
      opposingCaptainId,
    };
  }
  throw new Error(
    `Unknown action ${value}. Use a building name, context:ID, at-sea, before-battle:CAPTAIN_ID, or after-battle:CAPTAIN_ID.`,
  );
}

function actionSelectorAndQualifier(
  action: ScenarioQueryAction,
  portId: number,
  voyageDay: number,
  fallbackPortCount = 100,
): { selector: number; qualifier: number; fallbackSelector?: number } {
  if (action.type === "building")
    return {
      selector: portId,
      qualifier: action.context,
      ...(portId < fallbackPortCount ? { fallbackSelector: 0xa3 } : {}),
    };
  if (action.type === "at-sea") return { selector: 0xa0, qualifier: voyageDay };
  return {
    selector: action.type === "before-battle" ? 0xa1 : 0xa2,
    qualifier: action.opposingCaptainId,
  };
}

function findRoute(
  routes: readonly ScenarioRoute[],
  request: { selector: number; qualifier: number; fallbackSelector?: number },
): ScenarioRoute | undefined {
  const selectors = [request.selector, request.fallbackSelector].filter(
    (value): value is number => value !== undefined,
  );
  for (const selector of selectors) {
    const exact = routes.find(
      (route) =>
        route.selector === selector && route.qualifier === request.qualifier,
    );
    if (exact) return exact;
    const wildcard = routes.find(
      (route) => route.selector === selector && route.qualifier === 0xff,
    );
    if (wildcard) return wildcard;
  }
  return undefined;
}

function readFlag(flags: number, flag: number): boolean {
  return (flags & (2 ** flag)) !== 0;
}

function writeFlag(flags: number, flag: number, value: number): number {
  return (value ? flags | (2 ** flag) : flags & ~(2 ** flag)) >>> 0;
}

function knownSystemValue(
  systemId: number,
  portId: number,
  ticks: number,
): number | undefined {
  if (systemId === 5) return portId;
  if (systemId === 7) return ticks;
  return undefined;
}

export function isBuildingOpen(
  context: number,
  ticks: number,
): boolean | undefined {
  if (ticks < 0 || ticks >= 72) return undefined;
  if ([0x00, 0x02, 0x05, 0x06, 0x08].includes(context))
    return ticks >= 0x0c && ticks < 0x3c;
  if (context === 0x01) return ticks < 0x0c || ticks >= 0x18;
  if ([0x03, 0x04, 0x07].includes(context)) return true;
  if (context === 0x09)
    return (ticks >= 0x06 && ticks < 0x09) || (ticks >= 0x18 && ticks < 0x3c);
  if (context === 0x0a) return ticks >= 0x0c;
  if (context === 0x0b) return ticks >= 0x30;
  return undefined;
}

function comparisonResult(
  instruction: ScenarioInstruction,
  variables: ReadonlyMap<number, number>,
  variableNotEqual: ReadonlyMap<number, ReadonlySet<number>>,
): boolean | undefined {
  const bytes = Buffer.from(instruction.rawHex, "hex");
  const leftMode = (instruction.opcode >> 4) & 3;
  const rightMode = (instruction.opcode >> 2) & 3;
  if (leftMode !== 0 || (rightMode !== 0 && rightMode !== 3)) return undefined;
  const left = variables.get(bytes[1]!);
  const right =
    rightMode === 0
      ? variables.get(bytes[2]!)
      : (bytes[2] as number | undefined);
  if (right === undefined) return undefined;
  if (left === undefined) {
    if (rightMode === 3 && variableNotEqual.get(bytes[1]!)?.has(right)) {
      if ((instruction.opcode & 3) === 0) return true;
      if ((instruction.opcode & 3) === 1) return false;
    }
    return undefined;
  }
  switch (instruction.opcode & 3) {
    case 0:
      return left !== right;
    case 1:
      return left === right;
    case 2:
      return left < right;
    case 3:
      return left > right;
  }
  return undefined;
}

function applyComparisonAssumption(
  state: ExecutionState,
  instruction: ScenarioInstruction,
  result: boolean,
): void {
  const bytes = Buffer.from(instruction.rawHex, "hex");
  const leftMode = (instruction.opcode >> 4) & 3;
  const rightMode = (instruction.opcode >> 2) & 3;
  const operation = instruction.opcode & 3;
  if (leftMode !== 0 || rightMode !== 3 || (operation !== 0 && operation !== 1))
    return;
  const variable = bytes[1]!;
  const immediate = bytes[2]!;
  const equal = operation === 0 ? !result : result;
  if (equal) {
    state.variables.set(variable, immediate);
    state.variableNotEqual.delete(variable);
  } else {
    const excluded = state.variableNotEqual.get(variable) ?? new Set<number>();
    excluded.add(immediate);
    state.variableNotEqual.set(variable, excluded);
  }
}

function cloneState(state: ExecutionState): ExecutionState {
  return {
    ...state,
    variables: new Map(state.variables),
    variableNotEqual: new Map(
      [...state.variableNotEqual].map(([variable, values]) => [
        variable,
        new Set(values),
      ]),
    ),
    dialogue: [...state.dialogue],
    uncertainties: [...state.uncertainties],
    effects: [...state.effects],
  };
}

function outcomeKey(outcome: ScenarioQueryOutcome): string {
  return JSON.stringify({
    dialogue: outcome.dialogue.map((line) => line.messageId),
    effects: outcome.effects,
  });
}

function executeRoute(
  scenario: DisassembledScenario,
  sectionId: number,
  route: ScenarioRoute,
  initialFlags: number,
  initialVariables: ReadonlyMap<number, number>,
  portId: number,
  ticks: number,
): { outcomes: ScenarioQueryOutcome[]; truncated: boolean } {
  const section = scenario.sections[sectionId]!;
  const instructions = new Map(
    section.instructions.map((instruction) => [
      instruction.offset,
      instruction,
    ]),
  );
  const dialogue = new Map(
    section.dialogueRuns.flatMap((run) =>
      run.lines.map((line) => [line.offset, line] as const),
    ),
  );
  const pending: ExecutionState[] = [
    {
      offset: route.destinationOffset,
      flags: initialFlags,
      variables: new Map(initialVariables),
      variableNotEqual: new Map(),
      dialogue: [],
      uncertainties: [],
      effects: [],
      probability: 1,
      steps: 0,
    },
  ];
  const rawOutcomes: ScenarioQueryOutcome[] = [];
  let truncated = false;

  const finish = (state: ExecutionState): void => {
    const firstMessage = state.dialogue[0]?.messageId;
    rawOutcomes.push({
      confidence:
        state.uncertainties.length > 0
          ? "ambiguous"
          : firstMessage !== undefined &&
              scenario.scenarioId === 1 &&
              RUNTIME_CONFIRMED_FIRST_MESSAGES.has(firstMessage)
            ? "confirmed"
            : "decoded",
      probability: state.probability,
      dialogue: state.dialogue,
      uncertainties: state.uncertainties,
      effects: state.effects,
    });
  };

  while (pending.length > 0) {
    if (pending.length + rawOutcomes.length > 256) {
      truncated = true;
      break;
    }
    const state = pending.pop()!;
    if (++state.steps > 5_000) {
      state.uncertainties.push("execution limit reached");
      finish(state);
      truncated = true;
      continue;
    }
    const instruction = instructions.get(state.offset);
    if (!instruction) {
      state.uncertainties.push(
        `no decoded instruction at ${hex(state.offset)}`,
      );
      finish(state);
      continue;
    }
    const line = dialogue.get(instruction.offset);
    if (line) state.dialogue.push(line);

    const bytes = Buffer.from(instruction.rawHex, "hex");
    if (instruction.opcode === 0x2c) {
      state.flags = writeFlag(state.flags, bytes[1]!, bytes[2]!);
    } else if (instruction.opcode === 0x0c) {
      state.variables.set(bytes[1]!, bytes.readUInt16BE(2));
      state.variableNotEqual.delete(bytes[1]!);
    } else if (instruction.opcode === 0x0f) {
      const value = knownSystemValue(bytes[2]!, portId, ticks);
      if (value === undefined) {
        state.variables.delete(bytes[1]!);
        state.variableNotEqual.delete(bytes[1]!);
      } else {
        state.variables.set(bytes[1]!, value);
        state.variableNotEqual.delete(bytes[1]!);
      }
    } else if (instruction.kind === "assignment") {
      const destinationMode = (instruction.opcode >> 4) & 3;
      if (destinationMode === 0) {
        state.variables.delete(bytes[1]!);
        state.variableNotEqual.delete(bytes[1]!);
      }
    }

    if (instruction.opcode === 0xca)
      state.effects.push(`play music track ${bytes[1]}`);
    else if (instruction.opcode === 0xc4) state.effects.push("scene break");
    else if (instruction.opcode === 0xe8)
      state.effects.push(`start duel (operand ${hex(bytes[1]!, 2)})`);
    else if (instruction.opcode === 0xcb)
      state.effects.push(`show event art ${bytes.at(-1)}`);
    else if (instruction.opcode === 0xf0)
      state.effects.push("advance subsection when the interpreter returns");
    else if (instruction.opcode === 0xf1)
      state.effects.push("advance section when the interpreter returns");

    if (instruction.opcode === 0xf2) {
      finish(state);
      continue;
    }
    if (instruction.opcode === 0xeb) {
      const variable = bytes[1]!;
      const bound = bytes.readUInt16BE(2);
      if (bound > 0 && bound <= 16) {
        for (let value = 0; value < bound; value++) {
          const branch = cloneState(state);
          branch.variables.set(variable, value);
          branch.variableNotEqual.delete(variable);
          branch.probability /= bound;
          branch.offset = instruction.endOffset;
          pending.push(branch);
        }
      } else {
        state.variables.delete(variable);
        state.variableNotEqual.delete(variable);
        state.uncertainties.push(
          `random variable ${variable} is in range 0–${Math.max(0, bound - 1)}`,
        );
        state.offset = instruction.endOffset;
        pending.push(state);
      }
      continue;
    }
    if (instruction.opcode === 0xac || instruction.opcode === 0xad) {
      const set = readFlag(state.flags, bytes[1]!);
      const taken = instruction.opcode === 0xac ? set : !set;
      state.offset = taken
        ? instruction.branchDestinationOffset!
        : instruction.endOffset;
      pending.push(state);
      continue;
    }
    if (instruction.kind === "conditional-branch") {
      const result = comparisonResult(
        instruction,
        state.variables,
        state.variableNotEqual,
      );
      if (result === undefined) {
        const uncertainty = `${instruction.opcodeHex} condition at ${hex(instruction.offset)} (${instruction.rawHex.toUpperCase()})`;
        const branch = cloneState(state);
        branch.uncertainties.push(`${uncertainty}: assumed true`);
        applyComparisonAssumption(branch, instruction, true);
        branch.offset = instruction.branchDestinationOffset!;
        state.uncertainties.push(`${uncertainty}: assumed false`);
        applyComparisonAssumption(state, instruction, false);
        state.offset = instruction.endOffset;
        pending.push(branch, state);
      } else {
        state.offset = result
          ? instruction.branchDestinationOffset!
          : instruction.endOffset;
        pending.push(state);
      }
      continue;
    }
    if (instruction.opcode === 0xfe) {
      state.offset = instruction.branchDestinationOffset!;
      pending.push(state);
      continue;
    }
    state.offset = instruction.endOffset;
    pending.push(state);
  }

  const unique = new Map<string, ScenarioQueryOutcome>();
  for (const outcome of rawOutcomes) {
    const key = outcomeKey(outcome);
    const existing = unique.get(key);
    if (
      !existing ||
      outcome.uncertainties.length < existing.uncertainties.length
    )
      unique.set(key, outcome);
  }
  return { outcomes: [...unique.values()], truncated };
}

export async function loadProtagonistScenario(
  scenarioId: number,
): Promise<DisassembledScenario> {
  return disassembleScenario(
    scenarioId,
    await readFile(join(repoRoot, `raw/SNR${scenarioId}.DAT`)),
    await readFile(join(repoRoot, `raw/SNR${scenarioId}.MES`)),
  );
}

export async function loadSharedScenario(): Promise<DisassembledScenario> {
  return disassembleScenario(
    0,
    await readFile(join(repoRoot, "raw/SNR0.DAT")),
    await readFile(join(repoRoot, "raw/SNR0.MES")),
  );
}

function highestFame(fame: ReturnType<typeof inspectFame>): {
  category: "trade" | "piracy" | "adventure";
  value: number;
} {
  let category: "trade" | "piracy" | "adventure" = "trade";
  let value = fame.trade;
  if (fame.piracy >= value) {
    category = "piracy";
    value = fame.piracy;
  }
  if (fame.adventure >= value) {
    category = "adventure";
    value = fame.adventure;
  }
  return { category, value };
}

export function inspectSharedScenario(
  save: Buffer,
  slot: number,
  action: ScenarioQueryAction,
  scenario: DisassembledScenario,
): SharedScenarioStatus {
  validate(save);
  if (scenario.scenarioId !== 0)
    throw new Error(`Expected shared scenario 0, got ${scenario.scenarioId}.`);
  const base = slotOffset(slot);
  const protagonistId = inspectSlot(save, slot).protagonistId;
  const section = save[base + SHARED_SCENARIO_START]!;
  const subsection = save[base + SHARED_SCENARIO_START + 1]!;
  const flags = save.readUInt32LE(base + SHARED_SCENARIO_START + 2);
  const rank = inspectRank(save, slot, protagonistId);
  const maximum = highestFame(inspectFame(save, slot, protagonistId));
  const nextTitleThreshold = rank < 9 ? 500 * (rank + 1) ** 2 : undefined;
  const cachedMissionSection = save.readUInt16LE(
    base + SHARED_VARIABLES_START + 30 * 2,
  );
  const selectedSection = scenario.sections[section];
  const routes =
    subsection === 0
      ? selectedSection?.routes
      : selectedSection?.entryRouteTables[subsection - 1]?.routes;
  const request = actionSelectorAndQualifier(
    action,
    save[base + 0x0a]!,
    save[base + 0x1d82]!,
    130,
  );
  const route = routes ? findRoute(routes, request) : undefined;
  return {
    section,
    subsection,
    flagsHex: hex(flags, 8),
    eligibilityFlag: readFlag(flags, 16),
    invitationArmed: readFlag(flags, 17),
    offerStarted: readFlag(flags, 18),
    rank,
    highestFameCategory: maximum.category,
    highestFame: maximum.value,
    ...(nextTitleThreshold === undefined ? {} : { nextTitleThreshold }),
    meetsFameThreshold:
      nextTitleThreshold !== undefined && maximum.value >= nextTitleThreshold,
    cachedMissionSection,
    ...(SHARED_MISSION_NAMES.has(cachedMissionSection)
      ? { cachedMissionName: SHARED_MISSION_NAMES.get(cachedMissionSection)! }
      : {}),
    routeTable: routes
      ? subsection === 0
        ? "primary"
        : `subsection-${subsection}`
      : "unavailable",
    ...(route ? { route } : {}),
  };
}

export async function queryScenario(
  save: Buffer,
  slot: number,
  action: ScenarioQueryAction,
  scenario?: DisassembledScenario,
  sharedScenario?: DisassembledScenario,
): Promise<ScenarioQueryResult> {
  validate(save);
  const base = slotOffset(slot);
  const protagonistId = save[1 + (slot - 1) * 15 + 13]!;
  if (protagonistId >= PROTAGONISTS.length)
    throw new Error(
      `Save slot ${slot} has unsupported protagonist ID ${protagonistId}.`,
    );
  const scenarioId = protagonistId + 1;
  const selectedScenario =
    scenario ?? (await loadProtagonistScenario(scenarioId));
  const selectedSharedScenario = sharedScenario ?? (await loadSharedScenario());
  if (selectedScenario.scenarioId !== scenarioId)
    throw new Error(
      `Expected scenario ${scenarioId}, got ${selectedScenario.scenarioId}.`,
    );
  const sectionId = save[base + 0x30]!;
  const subsection = save[base + 0x31]!;
  const section = selectedScenario.sections[sectionId];
  if (!section)
    throw new Error(
      `Save selects missing scenario ${scenarioId} section ${sectionId}.`,
    );
  const routeTable =
    subsection === 0
      ? section.routes
      : section.entryRouteTables[subsection - 1]?.routes;
  if (!routeTable)
    throw new Error(
      `Save selects missing scenario ${scenarioId} section ${sectionId} subsection ${subsection}.`,
    );

  const slotInfo = inspectSlot(save, slot);
  const portId = save[base + 0x0a]!;
  const voyageDay = save[base + 0x1d82]!;
  const ticks = save[base + 9]!;
  const buildingOpen =
    action.type === "building"
      ? isBuildingOpen(action.context, ticks)
      : undefined;
  const selector = actionSelectorAndQualifier(action, portId, voyageDay);
  const route = findRoute(routeTable, selector);
  const flags = save.readUInt32LE(base + 0x32);
  const variables = new Map(
    Array.from({ length: SCENARIO_VARIABLE_COUNT }, (_, variable) => [
      variable,
      save.readUInt16LE(base + SCENARIO_VARIABLES_START + variable * 2),
    ]),
  );
  const fame = inspectFame(save, slot, protagonistId);
  const shared = inspectSharedScenario(
    save,
    slot,
    action,
    selectedSharedScenario,
  );
  const notes = [
    `Fame: trade ${fame.trade}, piracy ${fame.piracy}, adventure ${fame.adventure}.`,
    "Shared SNR0 state and route are reported separately; its indirect message calls are not yet symbolically executed.",
    "Ordinary building dialogue is not yet evaluated.",
  ];
  if (buildingOpen === false)
    notes.push(
      "The building is closed at the saved time, so its matched scenario route cannot currently be triggered.",
    );
  if (
    scenarioId === 1 &&
    sectionId === 1 &&
    subsection > 0 &&
    fame.adventure < 2_000
  )
    notes.push(
      "The 2,000-fame event is already armed by the saved subsection; the Pub route does not recheck current fame.",
    );
  if (!route) {
    const joaoPubNeedsHarborVisit =
      scenarioId === 1 &&
      sectionId === 1 &&
      subsection === 0 &&
      action.type === "building" &&
      action.context === BUILDING_CONTEXTS.pub;
    return {
      confidence: "none",
      scenarioId,
      protagonist: PROTAGONISTS[protagonistId]!,
      section: sectionId,
      subsection,
      flagsHex: hex(flags, 8),
      portId,
      portName: slotInfo.portName,
      action,
      ...(buildingOpen === undefined ? {} : { buildingOpen }),
      routeTable: subsection === 0 ? "primary" : `subsection-${subsection}`,
      outcomes: [],
      sharedScenario: shared,
      notes: [
        ...notes,
        ...(joaoPubNeedsHarborVisit
          ? [
              "The 2,000-fame Pub scene is not available in subsection 0. Visit the Harbor first: its primary 0xA303 route checks João's adventure fame and advances the save to subsection 1.",
              "The apparent 06:40 arrival effect came from visiting the Harbor while waiting for the Pub to open; entering the Pub directly after the 11:40 arrival left the save in subsection 0.",
            ]
          : []),
        "No matching protagonist-scenario route was found. The game may still show its normal building dialogue.",
      ],
    };
  }

  const execution = executeRoute(
    selectedScenario,
    sectionId,
    route,
    flags,
    variables,
    portId,
    ticks,
  );
  if (execution.truncated)
    notes.push("Symbolic execution reached its path or instruction limit.");
  const uncertainties = execution.outcomes.flatMap(
    (outcome) => outcome.uncertainties,
  );
  if (uncertainties.length > 0)
    notes.push(
      "Ambiguous outcomes cross VM conditions whose input source has not yet been decoded.",
    );
  if (execution.outcomes.some((outcome) => outcome.probability < 1))
    notes.push(
      "Multiple outcomes reflect an explicit random draw in the scenario bytecode.",
    );
  const outcomesWithDialogue = execution.outcomes.filter(
    (outcome) => outcome.dialogue.length > 0 || outcome.effects.length > 0,
  );
  if (
    outcomesWithDialogue.length === 0 &&
    scenarioId === 1 &&
    sectionId === 1 &&
    subsection === 1 &&
    action.type === "building" &&
    action.context === BUILDING_CONTEXTS.pub
  ) {
    if (portId <= 2)
      notes.push(
        `The João 2,000-fame Pub handler explicitly rejects port ID ${portId}; IDs 0–2 are excluded.`,
      );
    if (ticks < 0x0d || ticks > 0x33)
      notes.push(
        "The João 2,000-fame Pub handler only reaches its story dialogue through 17:00; its internal lower bound is 04:20, but the Pub normally opens at 08:00.",
      );
  }
  const availableOutcomes = buildingOpen === false ? [] : outcomesWithDialogue;
  const confidence: QueryConfidence =
    availableOutcomes.length === 0
      ? "none"
      : availableOutcomes.some((outcome) => outcome.confidence === "ambiguous")
        ? "ambiguous"
        : availableOutcomes.every(
              (outcome) => outcome.confidence === "confirmed",
            )
          ? "confirmed"
          : "decoded";
  return {
    confidence,
    scenarioId,
    protagonist: PROTAGONISTS[protagonistId]!,
    section: sectionId,
    subsection,
    flagsHex: hex(flags, 8),
    portId,
    portName: slotInfo.portName,
    action,
    ...(buildingOpen === undefined ? {} : { buildingOpen }),
    route,
    routeTable: subsection === 0 ? "primary" : `subsection-${subsection}`,
    outcomes: availableOutcomes,
    sharedScenario: shared,
    notes,
  };
}

function formatAction(action: ScenarioQueryAction): string {
  if (action.type === "building")
    return `${action.name} (context ${hex(action.context, 2)})`;
  if (action.type === "at-sea") return "at-sea day event";
  return `${action.type}, opposing captain ${action.opposingCaptainId}`;
}

export function formatQueryResult(result: ScenarioQueryResult): string {
  const shared = result.sharedScenario;
  const lines = [
    `Scenario ${result.scenarioId}: ${result.protagonist}`,
    `Save state: section ${result.section}, subsection ${result.subsection}, flags ${result.flagsHex}`,
    `Location: ${result.portName} (${result.portId}); action: ${formatAction(result.action)}`,
    ...(result.buildingOpen === undefined
      ? []
      : [`Building hours: ${result.buildingOpen ? "open" : "closed"}`]),
    `Route table: ${result.routeTable}`,
    result.route
      ? `Matched route: ${result.route.keyHex} → ${hex(result.route.destinationOffset)}`
      : "Matched route: none",
    `Overall confidence: ${result.confidence}`,
    "",
    "Shared SNR0 state",
    `  Section ${shared.section}, subsection ${shared.subsection}, flags ${shared.flagsHex}`,
    `  Rank: ${RANK_NAMES[shared.rank] ?? `unknown (${shared.rank})`}; highest Fame: ${shared.highestFameCategory} ${shared.highestFame}`,
    shared.nextTitleThreshold === undefined
      ? "  Next-title eligibility: none (Duke is the highest title)"
      : `  Next-title threshold: ${shared.nextTitleThreshold}; Fame threshold ${shared.meetsFameThreshold ? "met" : "not met"}`,
    `  Flags: eligible ${shared.eligibilityFlag ? "yes" : "no"}; invitation armed ${shared.invitationArmed ? "yes" : "no"}; offer started ${shared.offerStarted ? "yes" : "no"}`,
    `  Cached assignment/mission: ${shared.cachedMissionName ?? `section ${shared.cachedMissionSection}`}`,
    `  Route table: ${shared.routeTable}`,
    shared.route
      ? `  Matched shared route: ${shared.route.keyHex} → ${hex(shared.route.destinationOffset)}`
      : "  Matched shared route: none",
    "",
  ];
  for (const [index, outcome] of result.outcomes.entries()) {
    const chance =
      outcome.probability < 1
        ? `, ${new Intl.NumberFormat("en", {
            style: "percent",
            maximumFractionDigits: 2,
          }).format(outcome.probability)}`
        : "";
    lines.push(`Outcome ${index + 1} [${outcome.confidence}${chance}]`);
    if (outcome.dialogue.length === 0) lines.push("  No story dialogue.");
    for (const line of outcome.dialogue)
      lines.push(
        `  ${hex(line.offset)} · message ${line.messageId}${line.presentation === "choice-prompt" ? ` · choice → flag ${line.choiceFlag}` : ""} · ${line.speakerLabel ?? (line.characterId === undefined ? "Narration" : `Character ${line.characterId}`)}: ${line.body}`,
      );
    for (const effect of outcome.effects) lines.push(`  Effect: ${effect}`);
    for (const uncertainty of outcome.uncertainties)
      lines.push(`  Unresolved: ${uncertainty}`);
    lines.push("");
  }
  lines.push(...result.notes.map((note) => `Note: ${note}`));
  return `${lines.join("\n")}\n`;
}

const help = `Query story dialogue and shared scenario state from a UW2 DOS save

pnpm run query-dialog -- FILE SLOT ACTION

Actions:
  market, pub, shipyard, harbor, arrival, lodge, palace, guild, special-building,
  bank, item-shop, church, house-of-fortune, fortune-teller
  context:ID                  raw building/context qualifier
  at-sea                     uses the saved voyage-day counter
  before-battle:CAPTAIN_ID   scenario hook before naval combat
  after-battle:CAPTAIN_ID    scenario hook after naval combat

The tool never modifies the save. It symbolically executes protagonist story
routes and reports the shared SNR0 route, royal-invitation state, and cached
mission. Ambiguous results show each possible protagonist path and the undecoded
VM condition responsible for it. Ordinary building dialogue is not evaluated.`;

async function main(): Promise<void> {
  const [file, slotText, actionText] = process.argv.slice(2);
  if (!file || !slotText || !actionText || process.argv.includes("--help")) {
    console.log(help);
    return;
  }
  const slot = integer(slotText, "slot");
  const result = await queryScenario(
    await readFile(file),
    slot,
    parseQueryAction(actionText),
  );
  console.log(formatQueryResult(result));
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
