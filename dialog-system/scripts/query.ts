import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  inspectCartographers,
  inspectFame,
  inspectGold,
  inspectItems,
  inspectRank,
  inspectSlot,
  RANK_NAMES,
  slotOffset,
  validate,
} from "../../save-editor/format.js";
import { repoRoot } from "../../scripts/shared.js";
import {
  loadOrdinaryDialogueData,
  ordinaryBuildingEntry,
  type OrdinaryBuildingEntry,
} from "./ordinary-dialogue.js";
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
      readonly commandPath?: readonly string[];
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
  readonly ordinaryBuilding?: OrdinaryBuildingEntry;
  readonly notes: readonly string[];
}

export interface SharedScenarioStatus {
  readonly section: number;
  readonly subsection: number;
  readonly executionSection: number;
  readonly executionSubsection: number;
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
  readonly confidence: QueryConfidence;
  readonly outcomes: readonly ScenarioQueryOutcome[];
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
const PLAYER_FLEET_TABLE = 0x1de0;
const FLEET_RECORD_SIZE = 0x85;
const FLEET_SHIP_SLOTS = 0x2b;
const SHIP_SLOT_SIZE = 9;
const SHIP_INSTANCE_TABLE = 0x47fc;
const SHIP_INSTANCE_SIZE = 0x18;
const PLAYER_SUPPLY_RECORDS = 0x423e;
const SUPPLY_RECORD_SIZE = 0x1e;
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

function inspectPlayerCargo(
  save: Buffer,
  slot: number,
  protagonistId: number,
): {
  fleetId: number;
  fleetRecord: Buffer;
  freeCapacity: number;
  cargoByGoodsId: Map<number, number>;
} {
  const base = slotOffset(slot);
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  const cargoByGoodsId = new Map<number, number>();
  let freeCapacity = 0;

  for (let index = 0; index < 10; index++) {
    const shipSlot = fleet + FLEET_SHIP_SLOTS + index * SHIP_SLOT_SIZE;
    if (save[shipSlot] === 0xff || (save[shipSlot + 8]! & 0x30) !== 0x10)
      continue;
    const instanceId = save[shipSlot + 7]!;
    const instance =
      base + SHIP_INSTANCE_TABLE + instanceId * SHIP_INSTANCE_SIZE;
    const capacity = save.readUInt16LE(instance + 0x16);
    const supply = base + PLAYER_SUPPLY_RECORDS + index * SUPPLY_RECORD_SIZE;
    let used =
      Math.floor(save.readUInt16LE(supply) / 10) +
      Math.floor(save.readUInt16LE(supply + 2) / 10) +
      save.readUInt16LE(supply + 4) +
      save.readUInt16LE(supply + 6);
    for (let cargoIndex = 0; cargoIndex < 5; cargoIndex++) {
      const goodsId = save[supply + 0x16 + cargoIndex]!;
      if (goodsId === 0xff) continue;
      const quantity = save.readUInt16LE(supply + 0x0c + cargoIndex * 2);
      used += quantity;
      cargoByGoodsId.set(
        goodsId,
        (cargoByGoodsId.get(goodsId) ?? 0) + quantity,
      );
    }
    freeCapacity += Math.max(0, capacity - used);
  }
  return {
    fleetId,
    fleetRecord: save.subarray(fleet, fleet + FLEET_RECORD_SIZE),
    freeCapacity,
    cargoByGoodsId,
  };
}

interface ExecutionState {
  offset: number;
  flags: number;
  variables: Map<number, number>;
  variableNotEqual: Map<number, Set<number>>;
  references: Map<
    number,
    | { kind: "cartographer-flags"; index: number }
    | { kind: "inventory-item"; indexVariable: number }
    | { kind: "constant"; value: number }
    | { kind: "record"; data: Buffer; offset: number }
  >;
  cartographerFlags: number[];
  cargoByGoodsId: Map<number, number>;
  presentation?: {
    startOffset: number;
    position: number;
    characterId?: number;
    characterVariable?: number;
    messageIndices: number[];
    lastMessageInstructionEndOffset?: number;
    instructionOffsets: number[];
    rawParts: string[];
  };
  dialogue: DialogueLine[];
  uncertainties: string[];
  effects: string[];
  randomState: number;
  probability: number;
  steps: number;
}

export function protagonistScenarioRandomSeed(
  savedYear: number,
  savedMonth: number,
  savedDay: number,
  ticks: number,
  navigationLevel: number,
  navigationExperience: number,
): number {
  const dateProduct = Math.imul(
    Math.imul(savedYear, savedMonth),
    navigationLevel + navigationExperience,
  );
  return ((dateProduct + savedDay + ticks) << 8) >>> 0;
}

export function sharedScenarioRandomSeed(
  savedYear: number,
  savedMonth: number,
  savedDay: number,
  navigationLevel: number,
  navigationExperience: number,
): number {
  const dateProduct = Math.imul(
    Math.imul(savedYear, savedMonth),
    navigationLevel + navigationExperience,
  );
  return ((dateProduct + savedDay) << 8) >>> 0;
}

export function nextScenarioRandom(
  state: number,
  bound: number,
): { state: number; result: number } {
  if (bound <= 0) throw new Error(`Invalid scenario random bound: ${bound}`);
  const nextState = (Math.imul(state, 0x5d58_8b65) + 1) >>> 0;
  return {
    state: nextState,
    result: ((nextState >>> 8) & 0x7fff) % bound,
  };
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
  const [rawBuildingName = "", ...commandPath] = value.split(":");
  const buildingName = rawBuildingName.toLowerCase();
  if (Object.hasOwn(BUILDING_CONTEXTS, buildingName))
    return {
      type: "building",
      context:
        BUILDING_CONTEXTS[buildingName as keyof typeof BUILDING_CONTEXTS],
      name: buildingName,
      ...(commandPath.length === 0 ? {} : { commandPath }),
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
  day: number,
  year: number,
  month: number,
): number | undefined {
  if (systemId === 2) return year;
  if (systemId === 3) return month;
  if (systemId === 4) return day;
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
    references: new Map(state.references),
    cartographerFlags: [...state.cartographerFlags],
    cargoByGoodsId: new Map(state.cargoByGoodsId),
    ...(state.presentation
      ? {
          presentation: {
            ...state.presentation,
            messageIndices: [...state.presentation.messageIndices],
            instructionOffsets: [...state.presentation.instructionOffsets],
            rawParts: [...state.presentation.rawParts],
          },
        }
      : {}),
    dialogue: [...state.dialogue],
    uncertainties: [...state.uncertainties],
    effects: [...state.effects],
  };
}

function presentDialogue(
  scenario: DisassembledScenario,
  state: ExecutionState,
  instruction: ScenarioInstruction,
  bytes: Buffer,
): void {
  const presentation = state.presentation;
  if (!presentation || presentation.messageIndices.length === 0) return;
  const messageIndex = presentation.messageIndices.at(-1)!;
  const message = scenario.messages[messageIndex];
  const speakerMessageIndex =
    presentation.messageIndices.length === 2
      ? presentation.messageIndices[0]
      : undefined;
  const speakerMessage =
    speakerMessageIndex === undefined
      ? undefined
      : scenario.messages[speakerMessageIndex];
  if (!message || (speakerMessageIndex !== undefined && !speakerMessage))
    return;

  const instructionOffsets = [
    ...presentation.instructionOffsets,
    instruction.offset,
  ];
  const rawParts = [...presentation.rawParts, instruction.rawHex];
  const contiguous = instructionOffsets.every(
    (offset, index) =>
      index === 0 ||
      instructionOffsets[index - 1]! + rawParts[index - 1]!.length / 2 ===
        offset,
  );
  state.dialogue.push({
    offset: presentation.startOffset,
    position: presentation.position,
    ...(presentation.characterId === undefined
      ? {}
      : { characterId: presentation.characterId }),
    ...(presentation.characterVariable === undefined
      ? {}
      : { characterVariable: presentation.characterVariable }),
    ...(speakerMessageIndex === undefined
      ? {}
      : { speakerMessageId: speakerMessageIndex + 1 }),
    messageId: messageIndex + 1,
    body: message.body,
    ...(speakerMessage?.speakerLabel
      ? { speakerLabel: speakerMessage.speakerLabel }
      : message.speakerLabel
        ? { speakerLabel: message.speakerLabel }
        : {}),
    ...(instruction.opcode === 0xe9
      ? { presentation: "choice-prompt" as const, choiceFlag: bytes[1]! }
      : {}),
    ...(contiguous
      ? {}
      : { presentationInstructionOffsets: instructionOffsets }),
    rawHex: rawParts.join(""),
  });
}

function outcomeKey(outcome: ScenarioQueryOutcome): string {
  return JSON.stringify({
    dialogue: outcome.dialogue.map((line) => line.messageId),
    effects: outcome.effects,
  });
}

function mergeConfidence(
  ...values: readonly QueryConfidence[]
): QueryConfidence {
  const present = values.filter((value) => value !== "none");
  if (present.length === 0) return "none";
  if (present.includes("ambiguous")) return "ambiguous";
  if (present.every((value) => value === "confirmed")) return "confirmed";
  return "decoded";
}

function executeRoute(
  scenario: DisassembledScenario,
  sectionId: number,
  route: ScenarioRoute,
  initialFlags: number,
  initialVariables: ReadonlyMap<number, number>,
  portId: number,
  ticks: number,
  day: number,
  initialCartographerFlags: readonly number[],
  gold: number,
  inventory: readonly number[],
  protagonistId: number,
  protagonistFameRecord: Buffer,
  protagonistSailorRecord: Buffer,
  initialRandomState: number,
  environment: {
    readonly savedYear: number;
    readonly savedMonth: number;
    readonly nationRecords?: readonly Buffer[];
    readonly playerFleetId?: number;
    readonly playerFleetRecord?: Buffer;
    readonly freeCargoCapacity?: number;
    readonly cargoByGoodsId?: ReadonlyMap<number, number>;
  },
): { outcomes: ScenarioQueryOutcome[]; truncated: boolean } {
  const section = scenario.sections[sectionId]!;
  const instructions = new Map(
    section.instructions.map((instruction) => [
      instruction.offset,
      instruction,
    ]),
  );
  const pending: ExecutionState[] = [
    {
      offset: route.destinationOffset,
      flags: initialFlags,
      variables: new Map(initialVariables),
      variableNotEqual: new Map(),
      references: new Map(),
      cartographerFlags: [...initialCartographerFlags],
      cargoByGoodsId: new Map(environment.cargoByGoodsId),
      dialogue: [],
      uncertainties: [],
      effects: [],
      randomState: initialRandomState,
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
    const bytes = Buffer.from(instruction.rawHex, "hex");
    if (instruction.opcode === 0xc0) {
      state.presentation = {
        startOffset: instruction.offset,
        position: bytes[1]!,
        messageIndices: [],
        instructionOffsets: [instruction.offset],
        rawParts: [instruction.rawHex],
      };
    } else if (instruction.opcode === 0xc4) {
      delete state.presentation;
    } else if (state.presentation && instruction.opcode === 0xcc) {
      state.presentation.characterId = bytes.readUInt16BE(1) + 1;
      delete state.presentation.characterVariable;
      state.presentation.instructionOffsets.push(instruction.offset);
      state.presentation.rawParts.push(instruction.rawHex);
    } else if (state.presentation && instruction.opcode === 0xcd) {
      state.presentation.characterVariable = bytes[1]!;
      delete state.presentation.characterId;
      state.presentation.instructionOffsets.push(instruction.offset);
      state.presentation.rawParts.push(instruction.rawHex);
    } else if (state.presentation && instruction.opcode === 0xc8) {
      const append =
        state.presentation.lastMessageInstructionEndOffset ===
        instruction.offset;
      if (!append && state.presentation.messageIndices.length > 0) {
        const count = state.presentation.messageIndices.length;
        state.presentation.messageIndices = [];
        state.presentation.instructionOffsets.splice(-count, count);
        state.presentation.rawParts.splice(-count, count);
      }
      state.presentation.messageIndices.push(bytes.readUInt16BE(1));
      state.presentation.lastMessageInstructionEndOffset =
        instruction.endOffset;
      state.presentation.instructionOffsets.push(instruction.offset);
      state.presentation.rawParts.push(instruction.rawHex);
    } else if (instruction.opcode === 0xc7 || instruction.opcode === 0xe9) {
      presentDialogue(scenario, state, instruction, bytes);
      delete state.presentation;
    }
    if (
      instruction.opcode === 0xdc &&
      bytes[3] === protagonistId &&
      (bytes[2] === 0x01 || bytes[2] === 0x03)
    ) {
      state.references.set(bytes[1]!, {
        kind: "record",
        data:
          bytes[2] === 0x01 ? protagonistFameRecord : protagonistSailorRecord,
        offset: bytes[4]!,
      });
    } else if (
      instruction.opcode === 0xdc &&
      bytes[2] === 0x02 &&
      bytes[3] === 0x00 &&
      bytes[4] === 0x07
    ) {
      state.references.set(bytes[1]!, {
        kind: "constant",
        value: protagonistId,
      });
    } else if (instruction.opcode === 0xd0 && bytes[2] === 0x00) {
      const recordIndex = state.variables.get(bytes[3]!);
      const record =
        recordIndex === undefined
          ? undefined
          : environment.nationRecords?.[recordIndex];
      if (record)
        state.references.set(bytes[1]!, {
          kind: "record",
          data: record,
          offset: bytes[4]!,
        });
      else state.references.delete(bytes[1]!);
    } else if (
      instruction.opcode === 0xd0 &&
      (bytes[2] === 0x01 || bytes[2] === 0x03)
    ) {
      const recordIndex = state.variables.get(bytes[3]!);
      if (recordIndex === protagonistId)
        state.references.set(bytes[1]!, {
          kind: "record",
          data:
            bytes[2] === 0x01 ? protagonistFameRecord : protagonistSailorRecord,
          offset: bytes[4]!,
        });
      else state.references.delete(bytes[1]!);
    } else if (instruction.opcode === 0xd0 && bytes[2] === 0x08) {
      const recordIndex = state.variables.get(bytes[3]!);
      if (
        recordIndex === environment.playerFleetId &&
        environment.playerFleetRecord
      )
        state.references.set(bytes[1]!, {
          kind: "record",
          data: environment.playerFleetRecord,
          offset: bytes[4]!,
        });
      else state.references.delete(bytes[1]!);
    } else if (
      instruction.opcode === 0xdc &&
      bytes[2] === 0x04 &&
      bytes[3]! >= 0x05 &&
      bytes[3]! <= 0x09 &&
      bytes[4] === 0x16
    ) {
      state.references.set(bytes[1]!, {
        kind: "cartographer-flags",
        index: bytes[3]! - 0x05,
      });
    } else if (
      instruction.opcode === 0xd0 &&
      bytes[2] === 0x06 &&
      bytes[4] === 0x3f
    ) {
      state.references.set(bytes[1]!, {
        kind: "inventory-item",
        indexVariable: bytes[3]!,
      });
    } else if (instruction.opcode === 0x04) {
      const reference = state.references.get(bytes[2]!);
      if (
        reference?.kind === "record" &&
        reference.offset < reference.data.length
      ) {
        state.variables.set(
          bytes[1]!,
          reference.offset + 1 < reference.data.length
            ? reference.data.readUInt16LE(reference.offset)
            : reference.data[reference.offset]!,
        );
      } else {
        state.variables.delete(bytes[1]!);
      }
      state.variableNotEqual.delete(bytes[1]!);
    } else if (instruction.opcode === 0x05) {
      const reference = state.references.get(bytes[2]!);
      if (
        reference?.kind === "record" &&
        reference.offset < reference.data.length
      ) {
        state.variables.set(bytes[1]!, reference.data[reference.offset]!);
        state.variableNotEqual.delete(bytes[1]!);
      } else if (reference?.kind === "cartographer-flags") {
        state.variables.set(
          bytes[1]!,
          state.cartographerFlags[reference.index]!,
        );
        state.variableNotEqual.delete(bytes[1]!);
      } else if (reference?.kind === "inventory-item") {
        const index = state.variables.get(reference.indexVariable);
        const value = index === undefined ? undefined : inventory[index];
        if (value === undefined) state.variables.delete(bytes[1]!);
        else state.variables.set(bytes[1]!, value);
        state.variableNotEqual.delete(bytes[1]!);
      } else if (reference?.kind === "constant") {
        state.variables.set(bytes[1]!, reference.value);
        state.variableNotEqual.delete(bytes[1]!);
      } else {
        state.variables.delete(bytes[1]!);
        state.variableNotEqual.delete(bytes[1]!);
      }
    } else if (instruction.opcode === 0x11) {
      const reference = state.references.get(bytes[1]!);
      const value = state.variables.get(bytes[2]!);
      if (reference?.kind === "cartographer-flags" && value !== undefined) {
        const previous = state.cartographerFlags[reference.index]!;
        state.cartographerFlags[reference.index] = value;
        if ((previous & 0x10) !== (value & 0x10)) {
          const names = [
            "Giovanni Verrazano",
            "Gerard de Jode",
            "Diogo Ribeiro",
            "Olives",
            "Mercator",
          ];
          state.effects.push(
            `${value & 0x10 ? "activate" : "clear"} ${names[reference.index]} cartographer contract`,
          );
        }
      }
    } else if (instruction.opcode === 0x6c || instruction.opcode === 0x6d) {
      const variable = bytes[1]!;
      const value = state.variables.get(variable);
      if (value !== undefined) {
        state.variables.set(
          variable,
          instruction.opcode === 0x6c ? value | bytes[2]! : value & bytes[2]!,
        );
        state.variableNotEqual.delete(variable);
      }
    } else if (instruction.opcode === 0x4c) {
      const variable = bytes[1]!;
      const reference = state.references.get(variable);
      if (reference?.kind === "record") {
        state.references.set(variable, {
          ...reference,
          offset: reference.offset + bytes[2]!,
        });
      } else {
        const value = state.variables.get(variable);
        if (value === undefined) state.variables.delete(variable);
        else state.variables.set(variable, (value + bytes[2]!) & 0xffff);
      }
      state.variableNotEqual.delete(variable);
    } else if (instruction.opcode === 0x2c) {
      state.flags = writeFlag(state.flags, bytes[1]!, bytes[2]!);
    } else if (instruction.opcode === 0x0c) {
      state.variables.set(bytes[1]!, bytes.readUInt16BE(2));
      state.variableNotEqual.delete(bytes[1]!);
    } else if (
      instruction.kind === "assignment" &&
      ((instruction.opcode >> 4) & 3) === 0 &&
      ((instruction.opcode >> 2) & 3) === 0
    ) {
      const value = state.variables.get(bytes[2]!);
      if (value === undefined) state.variables.delete(bytes[1]!);
      else state.variables.set(bytes[1]!, value);
      state.variableNotEqual.delete(bytes[1]!);
    } else if (instruction.opcode === 0x0f) {
      const value = knownSystemValue(
        bytes[2]!,
        portId,
        ticks,
        day,
        environment.savedYear,
        environment.savedMonth,
      );
      if (value === undefined) {
        state.variables.delete(bytes[1]!);
        state.variableNotEqual.delete(bytes[1]!);
      } else {
        state.variables.set(bytes[1]!, value);
        state.variableNotEqual.delete(bytes[1]!);
      }
    } else if (instruction.opcode === 0xea) {
      state.variables.set(bytes[1]!, Math.floor(gold / 10_000));
      state.variableNotEqual.delete(bytes[1]!);
    } else if (instruction.opcode === 0xee) {
      if (environment.freeCargoCapacity === undefined)
        state.variables.delete(bytes[1]!);
      else state.variables.set(bytes[1]!, environment.freeCargoCapacity);
      state.variableNotEqual.delete(bytes[1]!);
    } else if (instruction.opcode === 0xe2) {
      const goodsId = state.variables.get(bytes[1]!);
      const quantity = state.variables.get(bytes[2]!);
      if (goodsId !== undefined && quantity !== undefined) {
        state.cargoByGoodsId.set(
          goodsId,
          (state.cargoByGoodsId.get(goodsId) ?? 0) + quantity,
        );
        state.effects.push(`load ${quantity} lots of goods ${goodsId}`);
      }
    } else if (instruction.opcode === 0xe3) {
      const goodsId = state.variables.get(bytes[1]!);
      const requested = state.variables.get(bytes[2]!);
      if (goodsId === undefined || requested === undefined) {
        state.variables.delete(bytes[2]!);
      } else {
        const available = state.cargoByGoodsId.get(goodsId) ?? 0;
        if (requested === 0) {
          state.variables.set(bytes[2]!, available);
        } else {
          const transferred = Math.min(requested, available);
          state.variables.set(bytes[2]!, transferred);
          state.cargoByGoodsId.set(goodsId, available - transferred);
          state.effects.push(`unload ${transferred} lots of goods ${goodsId}`);
        }
      }
      state.variableNotEqual.delete(bytes[2]!);
    } else if (instruction.kind === "arithmetic") {
      const destinationMode = (instruction.opcode >> 4) & 3;
      const sourceMode = (instruction.opcode >> 2) & 3;
      if (destinationMode === 0 && (sourceMode === 0 || sourceMode === 3)) {
        const reference = state.references.get(bytes[1]!);
        const left = state.variables.get(bytes[1]!);
        const right =
          sourceMode === 0 ? state.variables.get(bytes[2]!) : bytes[2];
        if (
          reference?.kind === "record" &&
          right !== undefined &&
          (instruction.opcode & 0x23) === 0
        ) {
          state.references.set(bytes[1]!, {
            ...reference,
            offset: reference.offset + right,
          });
        } else if (left === undefined || right === undefined) {
          state.variables.delete(bytes[1]!);
        } else {
          let value: number | undefined;
          switch (instruction.opcode & 0x23) {
            case 0x00:
              value = left + right;
              break;
            case 0x01:
              value = left - right;
              break;
            case 0x02:
              value = left * right;
              break;
            case 0x03:
              value = right === 0 ? undefined : Math.floor(left / right);
              break;
            case 0x20:
              value = left | right;
              break;
            case 0x21:
              value = left & right;
              break;
            case 0x22:
              value = left >>> right;
              break;
            case 0x23:
              value = left << right;
              break;
          }
          if (value === undefined) state.variables.delete(bytes[1]!);
          else state.variables.set(bytes[1]!, value & 0xffff);
        }
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
      state.effects.push(`start duel against sailor ${bytes[1]}`);
    else if (instruction.opcode === 0xcb)
      state.effects.push(
        `show EVENT${scenario.scenarioId}.DAT record ${bytes[5]} at (${bytes.readUInt16BE(1)}, ${bytes.readUInt16BE(3)})`,
      );
    else if (instruction.opcode === 0xe6) {
      const amount = state.variables.get(bytes[1]!);
      state.effects.push(
        amount === undefined ? "add gold" : `add ${amount} gold`,
      );
    } else if (instruction.opcode === 0xe7) {
      const amount = state.variables.get(bytes[1]!);
      state.effects.push(
        amount === undefined ? "deduct gold" : `deduct ${amount} gold`,
      );
    } else if (instruction.opcode === 0xf0)
      state.effects.push("advance subsection when the interpreter returns");
    else if (instruction.opcode === 0xf1)
      state.effects.push("advance section when the interpreter returns");
    else if (instruction.opcode === 0xf8)
      state.effects.push("suppress normal building menu and force exit");

    if (instruction.opcode === 0xf2) {
      finish(state);
      continue;
    }
    if (instruction.opcode === 0xeb) {
      const variable = bytes[1]!;
      const bound = bytes.readUInt16BE(2);
      if (bound > 0) {
        const draw = nextScenarioRandom(state.randomState, bound);
        state.randomState = draw.state;
        state.variables.set(variable, draw.result);
        state.variableNotEqual.delete(variable);
      } else {
        state.variables.delete(variable);
        state.variableNotEqual.delete(variable);
        state.uncertainties.push(`random variable ${variable} has bound zero`);
      }
      state.offset = instruction.endOffset;
      pending.push(state);
      continue;
    }
    if (instruction.opcode === 0xec) {
      const variable = bytes[1]!;
      const checkpoint = state.variables.get(variable);
      if (checkpoint === undefined) {
        state.uncertainties.push(
          `scenario RNG checkpoint variable ${variable} is unknown`,
        );
      } else {
        state.randomState = (checkpoint << 8) >>> 0;
      }
      state.offset = instruction.endOffset;
      pending.push(state);
      continue;
    }
    if (instruction.opcode === 0xe9) {
      const flag = bytes[1]!;
      const no = cloneState(state);
      no.flags = writeFlag(no.flags, flag, 0);
      no.effects.push(`answer No (set scenario flag ${flag} to 0)`);
      no.offset = instruction.endOffset;
      state.flags = writeFlag(state.flags, flag, 1);
      state.effects.push(`answer Yes (set scenario flag ${flag} to 1)`);
      state.offset = instruction.endOffset;
      pending.push(no, state);
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
  const palaceVisit =
    action.type === "building" && action.context === BUILDING_CONTEXTS.palace;
  const guildJobRow =
    section === 0 &&
    action.type === "building" &&
    action.context === BUILDING_CONTEXTS.guild &&
    action.commandPath?.[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ===
      "jobassignment"
      ? /^(?:job-?)?(\d+)$/i.exec(action.commandPath[1] ?? "")
      : undefined;
  const guildRowNumber = guildJobRow ? Number(guildJobRow[1]) : undefined;
  const guildAssignmentSelector =
    guildRowNumber !== undefined && guildRowNumber >= 1 && guildRowNumber <= 3
      ? save[base + 0x0a]! >= 42
        ? 2
        : save.readUInt16LE(
            base + SHARED_VARIABLES_START + (guildRowNumber - 1) * 2,
          )
      : undefined;
  const consumesCachedRoyalMission =
    section === 0 &&
    palaceVisit &&
    readFlag(flags, 17) &&
    cachedMissionSection >= 6 &&
    cachedMissionSection <= 12;
  const executionSection = consumesCachedRoyalMission
    ? cachedMissionSection
    : section;
  // Accepting a cached Palace invitation first runs the mission section's
  // primary initializer, which advances to subsection 1, and then immediately
  // dispatches the Palace-audience route that presents the offer. The mission
  // variables were populated when the invitation was armed, so the query can
  // execute that visible second stage directly.
  const executionSubsection = consumesCachedRoyalMission
    ? 1
    : guildAssignmentSelector !== undefined &&
        guildAssignmentSelector >= 0 &&
        guildAssignmentSelector <= 4
      ? guildAssignmentSelector + 1
      : subsection;
  const executionFlags = consumesCachedRoyalMission
    ? writeFlag(writeFlag(flags, 17, 0), 18, 1)
    : flags;
  const selectedSection = scenario.sections[executionSection];
  const routes =
    executionSubsection === 0
      ? selectedSection?.routes
      : selectedSection?.entryRouteTables[executionSubsection - 1]?.routes;
  const executionAction: ScenarioQueryAction =
    palaceVisit && executionSection >= 6 && executionSubsection > 0
      ? { type: "building", context: 0x15, name: "palace-audience" }
      : action;
  const request = actionSelectorAndQualifier(
    executionAction,
    save[base + 0x0a]!,
    save[base + 0x1d82]!,
    130,
  );
  const route = routes ? findRoute(routes, request) : undefined;
  const ticks = save[base + 9]!;
  const buildingOpen =
    action.type === "building"
      ? isBuildingOpen(action.context, ticks)
      : undefined;
  const variables = new Map(
    Array.from({ length: SCENARIO_VARIABLE_COUNT }, (_, variable) => [
      variable,
      save.readUInt16LE(base + SHARED_VARIABLES_START + variable * 2),
    ]),
  );
  const cargo = inspectPlayerCargo(save, slot, protagonistId);
  const execution = route
    ? executeRoute(
        scenario,
        executionSection,
        route,
        executionFlags,
        variables,
        save[base + 0x0a]!,
        ticks,
        save[base + 8]!,
        inspectCartographers(save, slot).map(
          (cartographer) => cartographer.flags,
        ),
        inspectGold(save, slot),
        inspectItems(save, slot),
        protagonistId,
        save.subarray(
          base + 0x5b6 + protagonistId * 14,
          base + 0x5b6 + (protagonistId + 1) * 14,
        ),
        save.subarray(
          base + 0x612 + protagonistId * 42,
          base + 0x612 + (protagonistId + 1) * 42,
        ),
        sharedScenarioRandomSeed(
          save[base + 6]!,
          save[base + 7]!,
          save[base + 8]!,
          save[base + 0x612 + protagonistId * 42 + 0x1c]!,
          save.readUInt16LE(base + 0x612 + protagonistId * 42 + 0x1e),
        ),
        {
          savedYear: save[base + 6]!,
          savedMonth: save[base + 7]!,
          nationRecords: Array.from({ length: 7 }, (_, nation) =>
            save.subarray(
              base + 0x04d6 + nation * 0x20,
              base + 0x04d6 + (nation + 1) * 0x20,
            ),
          ),
          playerFleetId: cargo.fleetId,
          playerFleetRecord: cargo.fleetRecord,
          freeCargoCapacity: cargo.freeCapacity,
          cargoByGoodsId: cargo.cargoByGoodsId,
        },
      )
    : { outcomes: [], truncated: false };
  const outcomes =
    buildingOpen === false
      ? []
      : execution.outcomes.filter(
          (outcome) =>
            outcome.dialogue.length > 0 || outcome.effects.length > 0,
        );
  const confidence: QueryConfidence =
    outcomes.length === 0
      ? "none"
      : outcomes.some((outcome) => outcome.confidence === "ambiguous")
        ? "ambiguous"
        : "decoded";
  return {
    section,
    subsection,
    executionSection,
    executionSubsection,
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
      ? executionSubsection === 0
        ? "primary"
        : `subsection-${executionSubsection}`
      : "unavailable",
    ...(route ? { route } : {}),
    confidence,
    outcomes,
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
  const ordinaryData =
    action.type === "building" ? await loadOrdinaryDialogueData() : undefined;
  const inspectOrdinaryBuilding = (
    protagonistOutcomes: readonly ScenarioQueryOutcome[],
  ): OrdinaryBuildingEntry | undefined =>
    action.type === "building" && ordinaryData
      ? ordinaryBuildingEntry(
          save,
          slot,
          action.context,
          buildingOpen,
          protagonistOutcomes.map((outcome) => outcome.effects),
          shared.outcomes.map((outcome) => outcome.effects),
          ordinaryData,
          action.commandPath,
        )
      : undefined;
  const notes = [
    `Fame: trade ${fame.trade}, piracy ${fame.piracy}, adventure ${fame.adventure}.`,
    "Shared SNR0 dialogue is reported separately from protagonist-story dialogue.",
    "Ordinary building entry is reported separately from story dialogue.",
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
    const ordinaryBuilding = inspectOrdinaryBuilding([]);
    const joaoPubNeedsHarborVisit =
      scenarioId === 1 &&
      sectionId === 1 &&
      subsection === 0 &&
      action.type === "building" &&
      action.context === BUILDING_CONTEXTS.pub;
    return {
      confidence:
        buildingOpen === false
          ? "none"
          : mergeConfidence(
              shared.confidence,
              ordinaryBuilding?.confidence ?? "none",
              ordinaryBuilding?.command?.confidence ?? "none",
            ),
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
      ...(ordinaryBuilding ? { ordinaryBuilding } : {}),
      notes: [
        ...notes,
        ...(joaoPubNeedsHarborVisit
          ? [
              "The 2,000-fame Pub scene is not available in subsection 0. Visit the Harbor first: its primary 0xA303 route checks João's adventure fame and advances the save to subsection 1.",
              "The apparent 06:40 arrival effect came from visiting the Harbor while waiting for the Pub to open; entering the Pub directly after the 11:40 arrival left the save in subsection 0.",
            ]
          : []),
        "No matching protagonist-scenario route was found.",
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
    save[base + 8]!,
    inspectCartographers(save, slot).map((cartographer) => cartographer.flags),
    inspectGold(save, slot),
    inspectItems(save, slot),
    protagonistId,
    save.subarray(
      base + 0x5b6 + protagonistId * 14,
      base + 0x5b6 + (protagonistId + 1) * 14,
    ),
    save.subarray(
      base + 0x612 + protagonistId * 42,
      base + 0x612 + (protagonistId + 1) * 42,
    ),
    protagonistScenarioRandomSeed(
      save[base + 6]!,
      save[base + 7]!,
      save[base + 8]!,
      ticks,
      save[base + 0x612 + protagonistId * 42 + 0x1c]!,
      save.readUInt16LE(base + 0x612 + protagonistId * 42 + 0x1e),
    ),
    {
      savedYear: save[base + 6]!,
      savedMonth: save[base + 7]!,
    },
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
  if (
    outcomesWithDialogue.length === 0 &&
    scenarioId === 5 &&
    sectionId === 1 &&
    action.type === "building" &&
    action.context === BUILDING_CONTEXTS.pub
  ) {
    const gold = inspectGold(save, slot);
    if (gold < 10_000)
      notes.push(
        `The Golden Medallion Pub handler requires at least one Gold Ingot (10,000 combined on-hand gold); this save has ${gold.toLocaleString("en-US")} combined on-hand gold. Adventure Fame is not checked.`,
      );
    if (portId < 42)
      notes.push(
        `The Golden Medallion Pub handler rejects port ID ${portId}; it requires ID 42 or higher.`,
      );
    if (!inspectItems(save, slot).includes(0xff))
      notes.push(
        "The Golden Medallion Pub handler requires an empty item-inventory slot.",
      );
  }
  const availableOutcomes = buildingOpen === false ? [] : outcomesWithDialogue;
  const storyConfidence: QueryConfidence =
    availableOutcomes.length === 0
      ? shared.confidence
      : availableOutcomes.some((outcome) => outcome.confidence === "ambiguous")
        ? "ambiguous"
        : shared.confidence === "ambiguous"
          ? "ambiguous"
          : availableOutcomes.every(
                (outcome) => outcome.confidence === "confirmed",
              )
            ? "confirmed"
            : "decoded";
  const ordinaryBuilding = inspectOrdinaryBuilding(execution.outcomes);
  const confidence = mergeConfidence(
    storyConfidence,
    ordinaryBuilding?.confidence ?? "none",
    ordinaryBuilding?.command?.confidence ?? "none",
  );
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
    ...(ordinaryBuilding ? { ordinaryBuilding } : {}),
    notes,
  };
}

function formatAction(action: ScenarioQueryAction): string {
  if (action.type === "building")
    return `${action.name}${action.commandPath ? `:${action.commandPath.join(":")}` : ""} (context ${hex(action.context, 2)})`;
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
    ...(shared.executionSection === shared.section &&
    shared.executionSubsection === shared.subsection
      ? []
      : [
          `  Effective Palace dispatch: section ${shared.executionSection}, subsection ${shared.executionSubsection}`,
        ]),
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
    `  Shared confidence: ${shared.confidence}`,
    "",
  ];
  for (const [index, outcome] of shared.outcomes.entries()) {
    lines.push(`Shared outcome ${index + 1} [${outcome.confidence}]`);
    if (outcome.dialogue.length === 0)
      lines.push("  No shared-scenario dialogue.");
    for (const line of outcome.dialogue)
      lines.push(
        `  ${hex(line.offset)} · message ${line.messageId}${line.presentation === "choice-prompt" ? ` · choice → flag ${line.choiceFlag}` : ""} · ${line.speakerLabel ?? (line.characterId !== undefined ? `Character ${line.characterId}` : line.characterVariable !== undefined ? `Character from variable ${line.characterVariable}` : "Narration")}: ${line.body}`,
      );
    for (const effect of outcome.effects) lines.push(`  Effect: ${effect}`);
    for (const uncertainty of outcome.uncertainties)
      lines.push(`  Unresolved: ${uncertainty}`);
    lines.push("");
  }
  if (result.ordinaryBuilding) {
    const ordinary = result.ordinaryBuilding;
    lines.push(
      "Ordinary building entry",
      `  Disposition: ${ordinary.disposition}`,
      `  Confidence: ${ordinary.confidence}`,
    );
    if (ordinary.dialogue.length === 0)
      lines.push("  No ordinary greeting or access message is displayed.");
    for (const dialogue of ordinary.dialogue)
      lines.push(
        `  ${dialogue.bank} raw ${dialogue.rawIndex} (entry ${dialogue.entryNumber}) · ${dialogue.speaker}: ${dialogue.text}`,
      );
    lines.push(
      ordinary.menu.length > 0
        ? `  Menu: ${ordinary.menu.join("; ")}`
        : "  Menu: none",
    );
    for (const uncertainty of ordinary.uncertainties)
      lines.push(`  Unresolved: ${uncertainty}`);
    for (const note of ordinary.notes) lines.push(`  Note: ${note}`);
    lines.push("");
    if (ordinary.command) {
      const command = ordinary.command;
      lines.push(
        "Selected ordinary command",
        `  Path: ${command.path.join(" → ")}`,
        `  Disposition: ${command.disposition}`,
        `  Confidence: ${command.confidence}`,
      );
      if (command.dialogue.length === 0)
        lines.push("  No fixed command dialogue is displayed.");
      for (const dialogue of command.dialogue)
        lines.push(
          `  ${dialogue.bank} raw ${dialogue.rawIndex} (entry ${dialogue.entryNumber}) · ${dialogue.speaker}: ${dialogue.text}`,
        );
      lines.push(
        command.menu.length > 0
          ? `  Next selection: ${command.menu.join("; ")}`
          : "  Next selection: none",
      );
      for (const effect of command.effects) lines.push(`  Effect: ${effect}`);
      for (const uncertainty of command.uncertainties)
        lines.push(`  Unresolved: ${uncertainty}`);
      for (const note of command.notes) lines.push(`  Note: ${note}`);
      lines.push("");
    }
  }
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
        `  ${hex(line.offset)} · message ${line.messageId}${line.presentation === "choice-prompt" ? ` · choice → flag ${line.choiceFlag}` : ""} · ${line.speakerLabel ?? (line.characterId !== undefined ? `Character ${line.characterId}` : line.characterVariable !== undefined ? `Character from variable ${line.characterVariable}` : "Narration")}: ${line.body}`,
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

pnpm run query-dialog -- FILE SLOT ACTION[:COMMAND[:SELECTION]]

Actions:
  market, pub, shipyard, harbor, arrival, lodge, palace, guild, special-building,
  bank, item-shop, church, house-of-fortune, fortune-teller
  context:ID                  raw building/context qualifier
  at-sea                     uses the saved voyage-day counter
  before-battle:CAPTAIN_ID   scenario hook before naval combat
  after-battle:CAPTAIN_ID    scenario hook after naval combat

Ordinary command examples:
  market:buy-goods:1:1:20:yes
  market:sell-goods:1:1:20
  market:invest:10000
  market:market-rate
  shipyard:new-ship:1:Beech
  shipyard:used-ship
  shipyard:used-ship:1:yes:no:10000:Mercury
  shipyard:used-ship:exchange:yes:1:yes:yes:2:3:yes:yes:Mercury
  shipyard:repair:1:yes
  shipyard:sell:2
  shipyard:remodel:rename:1:Dauntless
  shipyard:remodel:load-capacity:1:yes:10:5:yes
  shipyard:invest:10000
  harbor:sail
  harbor:sail:yes
  harbor:supply:load:1:food:20
  harbor:supply:dump:1:water:50
  harbor:moor:store:1:yes
  harbor:moor:commission:1:yes
  harbor:moor:exchange:1:1:yes
  harbor:rename-port:Newhaven
  item-shop:buy:1:yes
  item-shop:sell:1:yes
  item-shop:sell:1:no
  pub:recruit-crew:yes:20
  pub:treat:10
  pub:meet:1:treat
  pub:waitress:tell-stories:1
  pub:waitress:give-gift:1
  pub:gamble:black-jack
  guild:job-assignment:1
  guild:country-info:Portugal:yes
  special-building:contract:yes
  special-building:discovery:1
  special-building:learn-skills:yes
  special-building:report
  special-building:locate:1
  special-building:learn-skill:yes
  bank:deposit:5000
  bank:withdraw:1000
  bank:borrow:10000
  bank:repay:1000
  lodge:check-in
  lodge:port-info
  church:pray
  church:donate:500
  house-of-fortune:life:yes
  house-of-fortune:career:yes
  house-of-fortune:love:yes
  house-of-fortune:mates:yes:1

The tool never modifies the save. It symbolically executes protagonist story
routes and reports the shared SNR0 route, royal-invitation state, and cached
mission. Ambiguous results show each possible protagonist path and the undecoded
VM condition responsible for it. Building queries also report the ordinary
entry greeting or access response and visible main menu when story handling
does not certainly suppress them. A command path additionally predicts the
next ordinary command dialogue without modifying the save.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--") args.shift();
  const [file, slotText, actionText] = args;
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
