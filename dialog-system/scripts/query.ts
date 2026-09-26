import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  CARTOGRAPHER_COUNT,
  CARTOGRAPHER_RECORD_SIZE,
  CARTOGRAPHER_TABLE,
  FAME_RECORD_SIZE,
  FAME_START,
  GOLD,
  GOLD_MAX,
  inspectFame,
  inspectGold,
  inspectItems,
  inspectRank,
  inspectSlot,
  PORT_RECORD_SIZE,
  PORT_TABLE,
  RANK_NAMES,
  SLOT_SIZE,
  slotOffset,
  validate,
} from "../../save-editor/format.js";
import { repoRoot } from "../../scripts/shared.js";
import { decodeGeneralMessageBank } from "./general-messages.js";
import {
  CONTROL_VARIABLE_EFFECT,
  GOODS_NAMES,
  loadOrdinaryDialogueData,
  NEW_ORDINARY_VISIT,
  ordinaryBuildingEntry,
  type OrdinaryBuildingEntry,
  type OrdinaryCommandResult,
  ordinaryVisitTransition,
  type OrdinaryVisitState,
} from "./ordinary-dialogue.js";
import {
  TOWNSPEOPLE,
  type Townsperson,
  townspersonLines,
} from "./townspeople.js";
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
  // Present only when a building visit runs more than one command.
  readonly visit?: readonly VisitStep[];
  readonly notes: readonly string[];
}

// The caller's assumption about a command's unsaved general-RNG roll.
export type RandomAssumption = "success" | "failure";

export interface VisitCommand {
  readonly path: readonly string[];
  readonly assume?: RandomAssumption;
}

export interface VisitStep {
  readonly path: readonly string[];
  readonly assume?: RandomAssumption;
  // Absent when the command cannot be selected during this visit.
  readonly command?: OrdinaryCommandResult;
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
const CONTROL_VARIABLE = 63;
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
const SAILOR_TABLE = 0x612;
const SAILOR_RECORD_SIZE = 42;
const MATE_ROSTER = 0x1d85;
const MATE_ROSTER_COUNT = 30;
const RESERVE_SHIP_SLOTS = 0x46ee;
const SHIP_TEMPLATE_INSTANCE = 40;
const ITEM_DEFINITION_TABLE = 0x7130;
const ITEM_DEFINITION_SIZE = 22;
const GOLD_LIMIT = GOLD_MAX;
// Slot-relative bases and record sizes of the `D0`/`DC` record groups
// (MAIN.EXE jump table 0x37A4A). Group 0x07 (ship slots) depends on the
// player's fleet; 0x12 (COLONY.DAT text) and 0x13 (goods-name pointers) are
// not save records.
const RECORD_GROUPS = new Map<number, { offset: number; size: number }>([
  [0x00, { offset: 0x04d6, size: 0x20 }], // nations
  [0x01, { offset: FAME_START, size: FAME_RECORD_SIZE }], // protagonist Fame
  [0x02, { offset: GOLD, size: 0 }], // gold, bank, protagonist ID
  [0x03, { offset: SAILOR_TABLE, size: SAILOR_RECORD_SIZE }], // sailors
  [0x04, { offset: 0x19c2, size: 24 }], // collectors and cartographers
  [0x05, { offset: 0x1ba2, size: 16 }], // Pub attendants
  [0x06, { offset: 0x1d82, size: 0 }], // voyage day, roster, inventory
  [0x08, { offset: PLAYER_FLEET_TABLE, size: FLEET_RECORD_SIZE }], // fleets
  [0x09, { offset: PLAYER_SUPPLY_RECORDS, size: SUPPLY_RECORD_SIZE }], // supplies
  [0x0a, { offset: SHIP_INSTANCE_TABLE, size: SHIP_INSTANCE_SIZE }], // ships
  [0x0b, { offset: 0x4e14, size: 12 }], // ship models
  [0x0c, { offset: PORT_TABLE, size: PORT_RECORD_SIZE }], // ports
  [0x0d, { offset: 0x5968, size: 0x25 }], // port metadata
  [0x0e, { offset: 0x67dc, size: 0x80 }], // market definitions
  [0x0f, { offset: 0x6e5c, size: 8 }], // Used Ship stock
  [0x10, { offset: 0x6e74, size: 7 }], // discoveries
  [0x11, { offset: ITEM_DEFINITION_TABLE, size: ITEM_DEFINITION_SIZE }], // items
]);
const CARTOGRAPHER_NAMES = [
  "Giovanni Verrazano",
  "Gerard de Jode",
  "Diogo Ribeiro",
  "Olives",
  "Mercator",
] as const;
// Discoveries whose names are shown without "the " (DS:0xB3B2).
const DISCOVERY_WITHOUT_ARTICLE = new Set([
  0, 5, 8, 9, 16, 17, 21, 22, 23, 25, 26, 28, 33, 40, 44, 60, 72, 77, 89,
]);

// Executable text shown by scenario actions such as `D9`.
export interface GeneralText {
  readonly messages: ReadonlyMap<number, string>;
  readonly discoveryNames: readonly string[];
}

export async function loadGeneralText(): Promise<GeneralText> {
  const [messageDat, message2Dat, colonyDat] = await Promise.all([
    readFile(join(repoRoot, "raw/MESSAGE.DAT")),
    readFile(join(repoRoot, "raw/MESSAGE2.DAT")),
    readFile(join(repoRoot, "raw/COLONY.DAT")),
  ]);
  return {
    messages: new Map(
      [
        ...decodeGeneralMessageBank(messageDat, "MESSAGE.DAT"),
        ...decodeGeneralMessageBank(message2Dat, "MESSAGE2.DAT"),
      ].map((message) => [message.combinedIndex, message.text]),
    ),
    discoveryNames: Array.from({ length: 100 }, (_, index) => {
      const record = colonyDat.subarray(index * 293, index * 293 + 25);
      const end = record.indexOf(0);
      return record
        .subarray(0, end < 0 ? record.length : end)
        .toString("latin1");
    }),
  };
}

// Before and after a naval battle, MAIN.EXE stores the opposing captain's
// sailor ID in variable 60 of both VM arrays (0x163F2). After the battle that
// captain's fleet byte depends on the result: a defeated fleet is dissolved.
function battleEnvironment(action: ScenarioQueryAction): {
  captain?: number;
  unknownAddresses?: ReadonlySet<number>;
} {
  if (action.type !== "before-battle" && action.type !== "after-battle")
    return {};
  return {
    captain: action.opposingCaptainId,
    ...(action.type === "after-battle"
      ? {
          unknownAddresses: new Set([
            SAILOR_TABLE + action.opposingCaptainId * SAILOR_RECORD_SIZE + 0x24,
          ]),
        }
      : {}),
  };
}

function formatGeneralMessage(
  template: string,
  args: readonly (string | number)[],
): string {
  let next = 0;
  return template.replace(/%%|%l?[ds]/g, (token) =>
    token === "%%" ? "%" : String(args[next++] ?? token),
  );
}

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
  // A game-record reference resolved by `D0`/`DC` holds a slot-relative
  // address; writes through references are kept in `writes`.
  references: Map<number, { kind: "address"; offset: number }>;
  writes: Map<number, number>;
  stringBuffer?: string;
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

const ASSUMPTION_SUFFIX = /@(success|failure)$/i;

function splitAssumption(value: string): {
  text: string;
  assume?: RandomAssumption;
} {
  const match = ASSUMPTION_SUFFIX.exec(value);
  if (!match) return { text: value };
  return {
    text: value.slice(0, match.index),
    assume: match[1]!.toLowerCase() as RandomAssumption,
  };
}

// Parses ACTION[:COMMAND...][@success|@failure] followed by the visit's
// later commands. A later command may repeat the building name.
export function parseQueryVisit(values: readonly string[]): {
  action: ScenarioQueryAction;
  commands: VisitCommand[];
} {
  const [first, ...rest] = values;
  if (first === undefined) throw new Error("Missing action.");
  const head = splitAssumption(first);
  const parsed = parseQueryAction(head.text);
  if (parsed.type !== "building") {
    if (rest.length > 0 || head.assume)
      throw new Error("Only a building action accepts a command sequence.");
    return { action: parsed, commands: [] };
  }
  const { commandPath, ...action } = parsed;
  const commands: VisitCommand[] = [];
  if (commandPath)
    commands.push({
      path: commandPath,
      ...(head.assume ? { assume: head.assume } : {}),
    });
  else if (head.assume)
    throw new Error(`@${head.assume} must follow a command.`);
  for (const value of rest) {
    const { text, assume } = splitAssumption(value);
    let path = text.split(":");
    const building = path[0]!.toLowerCase();
    if (
      path.length > 1 &&
      Object.hasOwn(BUILDING_CONTEXTS, building) &&
      BUILDING_CONTEXTS[building as keyof typeof BUILDING_CONTEXTS] ===
        action.context
    )
      path = path.slice(1);
    if (path[0] === "") throw new Error(`Missing command in ${value}.`);
    commands.push({ path, ...(assume ? { assume } : {}) });
  }
  return { action, commands };
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
    writes: new Map(state.writes),
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
    dialogue: outcome.dialogue.map(
      (line) => line.generalMessageIndex ?? line.messageId,
    ),
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
  slotData: Buffer,
  protagonistId: number,
  initialRandomState: number,
  environment: {
    readonly savedYear: number;
    readonly savedMonth: number;
    readonly freeCargoCapacity?: number;
    readonly cargoByGoodsId?: ReadonlyMap<number, number>;
    readonly text?: GeneralText;
    // Save addresses whose value depends on runtime state the save lacks.
    readonly unknownAddresses?: ReadonlySet<number>;
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
      variables: new Map([...initialVariables, [CONTROL_VARIABLE, 0]]),
      variableNotEqual: new Map(),
      references: new Map(),
      writes: new Map(),
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

  const readByte = (
    state: ExecutionState,
    offset: number,
  ): number | undefined =>
    state.writes.get(offset) ??
    (environment.unknownAddresses?.has(offset) ? undefined : slotData[offset]);
  const readWord = (
    state: ExecutionState,
    offset: number,
  ): number | undefined => {
    const low = readByte(state, offset);
    const high = readByte(state, offset + 1);
    return low === undefined || high === undefined
      ? undefined
      : low | (high << 8);
  };
  const readText = (
    state: ExecutionState,
    offset: number,
    length: number,
  ): string => {
    const characters: number[] = [];
    for (let index = 0; index < length; index++) {
      const value = readByte(state, offset + index);
      if (value === undefined || value === 0) break;
      characters.push(value);
    }
    return Buffer.from(characters).toString("latin1");
  };
  const writeByte = (
    state: ExecutionState,
    offset: number,
    value: number,
  ): void => {
    const previous = readByte(state, offset);
    state.writes.set(offset, value & 0xff);
    const cartographer = offset - CARTOGRAPHER_TABLE;
    if (
      cartographer >= 0 &&
      cartographer < CARTOGRAPHER_COUNT * CARTOGRAPHER_RECORD_SIZE &&
      cartographer % CARTOGRAPHER_RECORD_SIZE === 0x16 &&
      previous !== undefined &&
      ((previous ^ value) & 0x10) !== 0
    )
      state.effects.push(
        `${value & 0x10 ? "activate" : "clear"} ${CARTOGRAPHER_NAMES[Math.floor(cartographer / CARTOGRAPHER_RECORD_SIZE)]} cartographer contract`,
      );
  };
  const readGold = (state: ExecutionState): number =>
    (readWord(state, GOLD) ?? 0) + (readWord(state, GOLD + 2) ?? 0) * 0x10000;
  const writeGold = (state: ExecutionState, value: number): void => {
    const unsigned = value >>> 0;
    for (let index = 0; index < 4; index++)
      writeByte(state, GOLD + index, (unsigned >>> (index * 8)) & 0xff);
  };
  const setVariable = (
    state: ExecutionState,
    variable: number,
    value: number | undefined,
  ): void => {
    if (value === undefined) state.variables.delete(variable);
    else state.variables.set(variable, value);
    state.variableNotEqual.delete(variable);
    state.references.delete(variable);
  };
  const recordGroupAddress = (
    group: number,
    index: number,
    read: (offset: number) => number | undefined,
  ): number | undefined => {
    const base = RECORD_GROUPS.get(group);
    if (base) return base.offset + index * base.size;
    if (group === 0x07) {
      // Ship slots: 0–9 in the player's fleet, 10–39 in the reserve pool.
      if (index >= 10)
        return RESERVE_SHIP_SLOTS + (index - 10) * SHIP_SLOT_SIZE;
      const fleet = read(
        SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x24,
      );
      return fleet === undefined
        ? undefined
        : PLAYER_FLEET_TABLE +
            fleet * FLEET_RECORD_SIZE +
            FLEET_SHIP_SLOTS +
            index * SHIP_SLOT_SIZE;
    }
    return undefined;
  };
  const describeAddress = (offset: number): string => {
    const sailor = offset - SAILOR_TABLE;
    if (sailor >= 0 && sailor < 120 * SAILOR_RECORD_SIZE)
      return `sailor ${Math.floor(sailor / SAILOR_RECORD_SIZE)} field +0x${(sailor % SAILOR_RECORD_SIZE).toString(16).padStart(2, "0")}`;
    const port = offset - PORT_TABLE;
    if (port >= 0 && port < 130 * PORT_RECORD_SIZE)
      return `port ${Math.floor(port / PORT_RECORD_SIZE)} field +0x${(port % PORT_RECORD_SIZE).toString(16).padStart(2, "0")}`;
    return `save offset ${hex(offset)}`;
  };
  const sailorName = (state: ExecutionState, sailor: number): string =>
    readText(state, SAILOR_TABLE + sailor * SAILOR_RECORD_SIZE, 9);
  const fleetCourseEffect = (state: ExecutionState, fleet: number): string => {
    const record = PLAYER_FLEET_TABLE + fleet * FLEET_RECORD_SIZE;
    const order = readByte(state, record + 0x1b);
    const target = readByte(state, record + 0x1c);
    if (order === undefined || target === undefined)
      return `recompute fleet ${fleet}'s course`;
    if (order <= 3 || order === 9)
      return `send fleet ${fleet} to ${readText(state, PORT_TABLE + target * PORT_RECORD_SIZE + 4, 14)} (port ${target})`;
    if (order === 4) return `set fleet ${fleet} to follow the player`;
    const verb =
      order === 7
        ? "pursue"
        : order === 0x0a
          ? "follow"
          : `target (order ${order})`;
    return `set fleet ${fleet} to ${verb} ${sailorName(state, target)} (sailor ${target})`;
  };
  const shipModelName = (state: ExecutionState, type: number): string =>
    readText(
      state,
      SHIP_INSTANCE_TABLE +
        (SHIP_TEMPLATE_INSTANCE + type) * SHIP_INSTANCE_SIZE,
      17,
    );
  const generalMessageLines = (
    state: ExecutionState,
    selector: number,
    instruction: ScenarioInstruction,
  ): DialogueLine[] => {
    const variable = (index: number) => state.variables.get(index);
    const count = (index: number) => variable(index) ?? "?";
    const plural = (index: number) => (variable(index) === 1 ? "" : "s");
    const item = () => {
      const id = variable(18);
      return id === undefined
        ? "?"
        : readText(
            state,
            ITEM_DEFINITION_TABLE + id * ITEM_DEFINITION_SIZE,
            17,
          );
    };
    const discovery = () => {
      const id = variable(9);
      if (id === undefined) return ["", "?"];
      return [
        DISCOVERY_WITHOUT_ARTICLE.has(id) ? "" : "the ",
        environment.text?.discoveryNames[id] ?? `discovery ${id}`,
      ];
    };
    const goods = () => {
      const id = variable(18);
      return id === undefined ? "?" : (GOODS_NAMES[id] ?? `goods ${id}`);
    };
    const title = () => {
      const rank = readByte(
        state,
        FAME_START + protagonistId * FAME_RECORD_SIZE + 0x0d,
      );
      return rank === undefined ? "?" : (RANK_NAMES[rank] ?? `Rank ${rank}`);
    };
    const surname = () =>
      readText(state, SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 9, 9);
    const ruler = { characterVariable: 50 } as const;
    const lines: {
      index: number;
      args: readonly (string | number)[];
      speaker: { characterVariable: number } | { speakerLabel: string };
    }[] =
      selector === 0
        ? [
            {
              index: 941,
              args: [
                count(19),
                goods(),
                count(20),
                "month",
                (variable(20) ?? 0) <= 1 ? "" : "s",
              ],
              speaker: { speakerLabel: "Head Trader" },
            },
          ]
        : selector >= 1 && selector <= 3
          ? [{ index: 941 + selector, args: [item()], speaker: ruler }]
          : selector === 4
            ? [{ index: 945, args: [title(), surname()], speaker: ruler }]
            : selector === 5
              ? [
                  {
                    index: 946,
                    args: [],
                    speaker: { speakerLabel: "Old Guild Worker" },
                  },
                  {
                    index: 957,
                    args: [
                      count(19),
                      "pirate",
                      plural(19),
                      count(20),
                      "month",
                      plural(20),
                    ],
                    speaker: { speakerLabel: "Old Guild Worker" },
                  },
                ]
              : selector === 6
                ? variable(12) === 0
                  ? [
                      {
                        index: 948,
                        args: [count(19), "pirate", plural(19)],
                        speaker: ruler,
                      },
                    ]
                  : [
                      {
                        index: 949,
                        args: [
                          count(12),
                          "day",
                          plural(12),
                          count(19),
                          "pirate",
                          plural(19),
                        ],
                        speaker: ruler,
                      },
                    ]
                : selector === 7 || selector === 8
                  ? [
                      {
                        index: selector === 7 ? 950 : 955,
                        args: discovery(),
                        speaker: ruler,
                      },
                    ]
                  : [];
    if (lines.length === 0)
      state.uncertainties.push(
        `general-message selector ${selector} is unknown`,
      );
    return lines.map((line) => ({
      offset: instruction.offset,
      position: "speakerLabel" in line.speaker ? 0 : 1,
      ...line.speaker,
      messageId: 0,
      generalMessageIndex: line.index,
      body: formatGeneralMessage(
        environment.text?.messages.get(line.index) ??
          `general message ${line.index}`,
        line.args,
      ),
      rawHex: instruction.rawHex,
    }));
  };

  const finish = (state: ExecutionState): void => {
    // The dispatcher zeroes variable 63 before each route. Its caller tests the
    // final value to skip ordinary greetings and later scenario dispatches.
    const control = state.variables.get(CONTROL_VARIABLE);
    if (control === undefined)
      state.uncertainties.push(
        `control variable ${CONTROL_VARIABLE} is unknown`,
      );
    else if (control !== 0) state.effects.push(CONTROL_VARIABLE_EFFECT);
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
    if (instruction.opcode === 0xdc || instruction.opcode === 0xd0) {
      const index =
        instruction.opcode === 0xdc
          ? bytes[3]!
          : (() => {
              const value = state.variables.get(bytes[3]!);
              return value === undefined ? undefined : value & 0xff;
            })();
      const address =
        index === undefined
          ? undefined
          : recordGroupAddress(bytes[2]!, index, (offset) =>
              readByte(state, offset),
            );
      setVariable(state, bytes[1]!, undefined);
      if (address !== undefined)
        state.references.set(bytes[1]!, {
          kind: "address",
          offset: address + bytes[4]!,
        });
    } else if (instruction.kind === "assignment") {
      const destinationMode = (instruction.opcode >> 4) & 3;
      const sourceMode = (instruction.opcode >> 2) & 3;
      const width = instruction.opcode & 3;
      if (sourceMode === 3 && width === 3) {
        if (destinationMode === 0)
          setVariable(
            state,
            bytes[1]!,
            knownSystemValue(
              bytes[2]!,
              portId,
              ticks,
              day,
              environment.savedYear,
              environment.savedMonth,
            ),
          );
        else if (destinationMode === 1 && bytes[2] === 0) {
          // System value 0 copies the `D4` string buffer through a reference.
          const reference = state.references.get(bytes[1]!);
          if (reference && state.stringBuffer !== undefined) {
            const text = Buffer.from(state.stringBuffer, "latin1");
            [...text, 0].forEach((value, offset) =>
              writeByte(state, reference.offset + offset, value),
            );
            state.effects.push(
              `write "${state.stringBuffer}" to ${describeAddress(reference.offset)}`,
            );
          }
        }
      } else {
        let value: number | undefined;
        if (sourceMode === 0) value = state.variables.get(bytes[2]!);
        else if (sourceMode === 1) {
          const reference = state.references.get(bytes[2]!);
          value =
            reference === undefined
              ? undefined
              : width === 1
                ? readByte(state, reference.offset)
                : readWord(state, reference.offset);
        } else if (sourceMode === 3)
          value =
            instruction.endOffset - instruction.offset === 4
              ? bytes.readUInt16BE(2)
              : bytes[2]!;
        if (destinationMode === 0)
          setVariable(
            state,
            bytes[1]!,
            value === undefined
              ? undefined
              : value & (width === 1 ? 0xff : 0xffff),
          );
        else if (destinationMode === 1) {
          const reference = state.references.get(bytes[1]!);
          if (reference && value !== undefined) {
            writeByte(state, reference.offset, value);
            if (width !== 1) writeByte(state, reference.offset + 1, value >> 8);
          }
        } else if (destinationMode === 2) {
          if (value === undefined)
            state.uncertainties.push(
              `scenario flag ${bytes[1]} is written from an unknown value`,
            );
          else state.flags = writeFlag(state.flags, bytes[1]!, value ? 1 : 0);
        }
      }
    } else if (instruction.opcode === 0xea) {
      setVariable(state, bytes[1]!, Math.floor(readGold(state) / 10_000));
    } else if (instruction.opcode === 0xee) {
      setVariable(state, bytes[1]!, environment.freeCargoCapacity);
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
        setVariable(state, bytes[2]!, undefined);
      } else {
        const available = state.cargoByGoodsId.get(goodsId) ?? 0;
        if (requested === 0) {
          setVariable(state, bytes[2]!, available);
        } else {
          const transferred = Math.min(requested, available);
          setVariable(state, bytes[2]!, transferred);
          state.cargoByGoodsId.set(goodsId, available - transferred);
          state.effects.push(`unload ${transferred} lots of goods ${goodsId}`);
        }
      }
    } else if (instruction.kind === "arithmetic") {
      // Bits 0, 1, and 5 select the operation, so bit 4 alone is the
      // destination mode.
      const destinationMode = (instruction.opcode >> 4) & 1;
      const sourceMode = (instruction.opcode >> 2) & 3;
      if (destinationMode === 0 && (sourceMode === 0 || sourceMode === 3)) {
        const reference = state.references.get(bytes[1]!);
        const left = state.variables.get(bytes[1]!);
        const right =
          sourceMode === 0 ? state.variables.get(bytes[2]!) : bytes[2];
        if (
          reference &&
          right !== undefined &&
          (instruction.opcode & 0x23) === 0
        ) {
          // Pointer arithmetic advances the reference, as in Pietro's
          // inventory scan.
          state.references.set(bytes[1]!, {
            kind: "address",
            offset: reference.offset + right,
          });
        } else if (left === undefined || right === undefined) {
          setVariable(state, bytes[1]!, undefined);
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
          setVariable(
            state,
            bytes[1]!,
            value === undefined ? undefined : value & 0xffff,
          );
        }
      }
    } else if (instruction.opcode === 0xd4) {
      const message = scenario.messages[bytes.readUInt16BE(1)];
      if (message) state.stringBuffer = message.body;
      else delete state.stringBuffer;
    } else if (instruction.opcode === 0xd1) {
      const fleetId = state.variables.get(bytes[1]!);
      state.effects.push(
        fleetId === undefined
          ? "recompute an unknown fleet's course"
          : fleetCourseEffect(state, fleetId & 0xff),
      );
    } else if (instruction.opcode === 0xd9) {
      delete state.presentation;
      state.dialogue.push(
        ...generalMessageLines(state, bytes[2]!, instruction),
      );
    } else if (instruction.opcode === 0xe4) {
      const value = state.variables.get(bytes[1]!);
      if (value === undefined)
        state.uncertainties.push(
          `gold is set from unknown variable ${bytes[1]}`,
        );
      else {
        const signed = value >= 0x8000 ? value - 0x10000 : value;
        const gold = Math.min(signed, GOLD_LIMIT);
        writeGold(state, gold);
        state.effects.push(`set gold to ${gold}`);
      }
    } else if (instruction.opcode === 0xe6 || instruction.opcode === 0xe7) {
      const amount = state.variables.get(bytes[1]!);
      const add = instruction.opcode === 0xe6;
      if (amount === undefined) {
        state.effects.push(add ? "add gold" : "deduct gold");
        state.uncertainties.push("gold changes by an unknown amount");
      } else {
        state.effects.push(
          add ? `add ${amount} gold` : `deduct ${amount} gold`,
        );
        writeGold(
          state,
          add
            ? Math.min(readGold(state) + amount, GOLD_LIMIT)
            : readGold(state) - amount,
        );
      }
    } else if (instruction.opcode === 0xf9) {
      const type = bytes[1]!;
      state.effects.push(
        `start a pending ${shipModelName(state, type)} (ship type ${type}) in the player's fleet and clear this port's construction timer`,
      );
    } else if (instruction.opcode === 0xfa) {
      const name = scenario.messages[bytes.readUInt16BE(2)]?.body ?? "?";
      state.effects.push(
        `commission the pending ship as "${name}" and clear this port's Shipyard order`,
      );
    } else if (instruction.opcode === 0xfb) {
      const sailor = bytes[1]!;
      const record = SAILOR_TABLE + sailor * SAILOR_RECORD_SIZE;
      const protagonist = SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
      writeByte(
        state,
        record + 0x24,
        readByte(state, protagonist + 0x24) ?? 0xff,
      );
      writeByte(
        state,
        record + 0x25,
        readByte(state, protagonist + 0x25) ?? 0xff,
      );
      writeByte(state, record + 0x26, 6);
      for (let entry = 0; entry < MATE_ROSTER_COUNT; entry++)
        if (readByte(state, MATE_ROSTER + entry) === 0xff) {
          writeByte(state, MATE_ROSTER + entry, sailor);
          break;
        }
      state.effects.push(
        `${readText(state, record, 9)} (sailor ${sailor}) joins the party as an unassigned mate`,
      );
    }

    if (instruction.opcode === 0xca)
      state.effects.push(`play music track ${bytes[1]}`);
    else if (instruction.opcode === 0xc4)
      state.effects.push("close all dialogue panels");
    else if (instruction.opcode === 0xe8)
      state.effects.push(`start duel against sailor ${bytes[1]}`);
    else if (instruction.opcode === 0xcb)
      state.effects.push(
        `show EVENT${scenario.scenarioId}.DAT record ${bytes[5]} at (${bytes.readUInt16BE(1)}, ${bytes.readUInt16BE(3)})`,
      );
    else if (instruction.opcode === 0xf0)
      state.effects.push("advance subsection when the interpreter returns");
    else if (instruction.opcode === 0xf1)
      state.effects.push("advance section when the interpreter returns");
    else if (instruction.opcode === 0xf8)
      state.effects.push("suppress normal building menu and force exit");

    if (instruction.opcode === 0xf2) {
      finish(state);
      continue;
    }
    if (instruction.opcode === 0xf4) {
      state.effects.push(
        `show protagonist ending ${bytes[1]} and exit to END.EXE`,
      );
      finish(state);
      continue;
    }
    if (instruction.opcode === 0xc9) {
      // A forced menu built from the lines of an MES entry; the zero-based
      // selection is stored in the variable and cannot be cancelled.
      const options = (scenario.messages[bytes.readUInt16BE(2)]?.body ?? "")
        .split("\n")
        .filter((option) => option.length > 0);
      const branches = options.map((_, index) =>
        index === 0 ? state : cloneState(state),
      );
      branches.forEach((branch, index) => {
        setVariable(branch, bytes[1]!, index);
        branch.effects.push(`choose menu option "${options[index]}"`);
        branch.offset = instruction.endOffset;
      });
      if (branches.length === 0) {
        setVariable(state, bytes[1]!, undefined);
        state.uncertainties.push(`menu at ${hex(instruction.offset)} is empty`);
        state.offset = instruction.endOffset;
        branches.push(state);
      }
      pending.push(...branches.reverse());
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
  text?: GeneralText,
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
  // Job Assignment copies the selected row's RNG checkpoint (variables 3–5)
  // into variable 8 before dispatch; the offer's `EC 08` restores from it.
  if (guildAssignmentSelector !== undefined && guildRowNumber !== undefined)
    variables.set(8, variables.get(2 + guildRowNumber)!);
  const battle = battleEnvironment(action);
  if (battle.captain !== undefined) variables.set(60, battle.captain);
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
        save.subarray(base, base + SLOT_SIZE),
        protagonistId,
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
          freeCargoCapacity: cargo.freeCapacity,
          cargoByGoodsId: cargo.cargoByGoodsId,
          ...(text ? { text } : {}),
          ...(battle.unknownAddresses
            ? { unknownAddresses: battle.unknownAddresses }
            : {}),
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
  const battle = battleEnvironment(action);
  if (battle.captain !== undefined) variables.set(60, battle.captain);
  const fame = inspectFame(save, slot, protagonistId);
  const battleNotes =
    action.type === "after-battle"
      ? [
          `Variable 60 holds the opposing captain (sailor ${action.opposingCaptainId}). Whether that captain still commands a fleet (sailor byte +0x24, 0xFF when none) depends on the battle result and is treated as unknown.`,
        ]
      : [];
  const generalText = await loadGeneralText();
  const shared = inspectSharedScenario(
    save,
    slot,
    action,
    selectedSharedScenario,
    generalText,
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
    ...battleNotes,
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

  // A nonzero shared variable 63 after the shared entry route makes the
  // building dispatcher skip the protagonist entry route (MAIN.EXE 0x20A32).
  const sharedEntryDispatch =
    action.type === "building" &&
    shared.executionSection === shared.section &&
    shared.executionSubsection === shared.subsection &&
    shared.outcomes.length > 0;
  const sharedControl = (every: boolean) =>
    sharedEntryDispatch &&
    shared.outcomes[every ? "every" : "some"]((outcome) =>
      outcome.effects.includes(CONTROL_VARIABLE_EFFECT),
    );
  const sharedSkipsProtagonist = sharedControl(true);
  if (sharedSkipsProtagonist)
    notes.push(
      "The shared entry route sets control variable 63, so the protagonist route is not dispatched.",
    );
  else if (sharedControl(false))
    notes.push(
      "An unresolved shared branch may set control variable 63 and prevent the protagonist route from being dispatched.",
    );
  const execution = sharedSkipsProtagonist
    ? { outcomes: [], truncated: false }
    : executeRoute(
        selectedScenario,
        sectionId,
        route,
        flags,
        variables,
        portId,
        ticks,
        save[base + 8]!,
        save.subarray(base, base + SLOT_SIZE),
        protagonistId,
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
          text: generalText,
          ...(battle.unknownAddresses
            ? { unknownAddresses: battle.unknownAddresses }
            : {}),
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

function percent(probability: number): string {
  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(probability);
}

// Effects that only return to a menu change nothing that later commands see.
const MENU_RETURN_EFFECT = /^(?:return|decline)\b/;

// Runs a building visit as a sequence of ordinary commands. The first
// command is resolved exactly as queryScenario resolves a single command
// path; each later command sees a working copy of the save with the earlier
// commands' modeled writes applied, plus the unsaved per-visit state
// (Pub enthusiasm, the Pray guard, the cartographer's Report). Random
// outcomes stay unresolved unless the caller assumes one with @success or
// @failure; an unassumed roll is carried forward as not having happened.
export async function queryVisit(
  save: Buffer,
  slot: number,
  action: ScenarioQueryAction,
  commands: readonly VisitCommand[],
  scenario?: DisassembledScenario,
  sharedScenario?: DisassembledScenario,
): Promise<ScenarioQueryResult> {
  const first = commands[0];
  if (action.type !== "building") {
    if (commands.length > 0)
      throw new Error("Only a building action accepts a command sequence.");
    return queryScenario(save, slot, action, scenario, sharedScenario);
  }
  const result = await queryScenario(
    save,
    slot,
    first ? { ...action, commandPath: first.path } : action,
    scenario,
    sharedScenario,
  );
  if (commands.length <= 1) return result;

  const data = await loadOrdinaryDialogueData();
  const entry = result.ordinaryBuilding;
  const menuReached =
    entry !== undefined &&
    (entry.disposition === "shown" || entry.disposition === "conditional") &&
    entry.menu.length > 0;
  const working = Buffer.from(save);
  let visit: OrdinaryVisitState = NEW_ORDINARY_VISIT;
  let unresolvedRandom = false;
  // Notes about earlier commands that every later command depends on.
  const carried: string[] = [];
  if (entry?.disposition === "conditional")
    carried.push(
      "Ordinary entry is conditional; later commands assume the menu was reached.",
    );
  if (
    [...result.outcomes, ...result.sharedScenario.outcomes].some(
      (outcome) => outcome.effects.length > 0,
    )
  )
    carried.push(
      "Story and shared-scenario effects at entry are not applied to the working save.",
    );

  const steps = commands.map((visitCommand, index): VisitStep => {
    const number = index + 1;
    const label = `command ${number} (${visitCommand.path.join(":")})`;
    const step = {
      path: visitCommand.path,
      ...(visitCommand.assume ? { assume: visitCommand.assume } : {}),
    };
    const notes = index === 0 ? [] : [...carried];
    if (index > 0 && !menuReached)
      return {
        ...step,
        notes: [
          ...notes,
          "The ordinary building menu is not reached, so this command cannot be selected.",
        ],
      };
    if (visit.ended)
      return {
        ...step,
        notes: [
          ...notes,
          "An earlier command ended the visit, so this command cannot be selected.",
        ],
      };
    const laterEntry =
      index === 0
        ? undefined
        : ordinaryBuildingEntry(
            working,
            slot,
            action.context,
            true,
            [],
            [],
            data,
            visitCommand.path,
            visit,
          );
    const command = index === 0 ? entry?.command : laterEntry?.command;
    if (!command) return { ...step, notes };
    // Explain why the selected command is grayed out, such as a
    // cartographer's Report after one use.
    const normalized = (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (laterEntry && command.disposition === "unavailable")
      notes.push(
        ...laterEntry.notes.filter(
          (note) =>
            note.includes("grayed out") &&
            normalized(note).startsWith(normalized(visitCommand.path[0]!)),
        ),
      );
    const last = index === commands.length - 1;
    const transition = ordinaryVisitTransition(command);
    const ignored = `${label} has no random save effect, so @${visitCommand.assume} is ignored.`;
    if (transition) {
      for (const write of transition.writes) write(working);
      visit = { ...visit, ...transition.visit };
      if (transition.unmodeled && transition.unmodeled.length > 0)
        carried.push(
          `Not applied from ${label}: ${transition.unmodeled.join("; ")}.`,
        );
      const random = transition.random;
      if (random) {
        const chance =
          random.probability === undefined
            ? "unknown probability"
            : `probability ${percent(random.probability)}`;
        if (visitCommand.assume === "success") {
          for (const write of random.writes) write(working);
          notes.push(
            `Assumed roll success: ${random.description} (${chance}).`,
          );
          carried.push(
            `Assumes the roll in ${label} succeeded: ${random.description} (${chance}).`,
          );
        } else if (visitCommand.assume === "failure") {
          notes.push(
            `Assumed roll failure (${chance} that ${random.description}).`,
          );
          carried.push(
            `Assumes the roll in ${label} failed (${chance} that ${random.description}).`,
          );
        } else if (!last) {
          unresolvedRandom = true;
          notes.push(
            `Later commands assume this roll fails (${chance} that ${random.description}); append @success or @failure to choose.`,
          );
          carried.push(
            `Depends on an unresolved roll in ${label}, assumed to fail (${chance} that ${random.description}).`,
          );
        }
      } else if (visitCommand.assume) notes.push(ignored);
    } else {
      if (visitCommand.assume) notes.push(ignored);
      const effects = command.effects.filter(
        (effect) => !MENU_RETURN_EFFECT.test(effect),
      );
      if (command.disposition === "completed" && effects.length > 0)
        carried.push(
          `No save writes are modeled for ${label}; not applied: ${effects.join("; ")}.`,
        );
      else if (
        (command.disposition === "shown" ||
          command.disposition === "unavailable" ||
          command.disposition === "unsupported") &&
        !last
      )
        notes.push(
          "The next command assumes the player backs out of this incomplete selection to the building menu.",
        );
    }
    return { ...step, command, notes };
  });

  return {
    ...result,
    confidence: mergeConfidence(
      result.confidence,
      ...steps.map((step) => step.command?.confidence ?? "none"),
      unresolvedRandom ? "ambiguous" : "none",
    ),
    visit: steps,
  };
}

function formatAction(action: ScenarioQueryAction): string {
  if (action.type === "building")
    return `${action.name}${action.commandPath ? `:${action.commandPath.join(":")}` : ""} (context ${hex(action.context, 2)})`;
  if (action.type === "at-sea") return "at-sea day event";
  return `${action.type}, opposing captain ${action.opposingCaptainId}`;
}

function formatOrdinaryCommand(
  title: string,
  command: OrdinaryCommandResult,
): string[] {
  const lines = [
    title,
    `  Path: ${command.path.join(" → ")}`,
    `  Disposition: ${command.disposition}`,
    `  Confidence: ${command.confidence}`,
  ];
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
  return lines;
}

export function formatQueryResult(result: ScenarioQueryResult): string {
  const shared = result.sharedScenario;
  const lines = [
    `Scenario ${result.scenarioId}: ${result.protagonist}`,
    `Save state: section ${result.section}, subsection ${result.subsection}, flags ${result.flagsHex}`,
    `Location: ${result.portName} (${result.portId}); action: ${formatAction(result.action)}`,
    ...(result.visit
      ? [
          `Visit sequence: ${result.visit
            .map(
              (step) =>
                `${step.path.join(":")}${step.assume ? `@${step.assume}` : ""}`,
            )
            .join(" → ")}`,
        ]
      : []),
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
        `  ${hex(line.offset)} · ${line.generalMessageIndex === undefined ? `message ${line.messageId}` : `general message ${line.generalMessageIndex}`}${line.presentation === "choice-prompt" ? ` · choice → flag ${line.choiceFlag}` : ""} · ${line.speakerLabel ?? (line.characterId !== undefined ? `Character ${line.characterId}` : line.characterVariable !== undefined ? `Character from variable ${line.characterVariable}` : line.position === 0 ? "Building speaker" : "Narration")}: ${line.body}`,
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
    if (ordinary.command)
      lines.push(
        ...formatOrdinaryCommand("Selected ordinary command", ordinary.command),
        ...(result.visit?.[0]?.notes ?? []).map((note) => `  Visit: ${note}`),
        "",
      );
  }
  for (const [index, step] of (result.visit ?? []).entries()) {
    if (index === 0) continue;
    const title = `Visit command ${index + 1}`;
    lines.push(
      ...(step.command
        ? formatOrdinaryCommand(title, step.command)
        : [title, `  Path: ${step.path.join(" → ")}`, "  Not selectable"]),
      ...(step.assume ? [`  Assumed roll: ${step.assume}`] : []),
      ...step.notes.map((note) => `  Visit: ${note}`),
      "",
    );
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
        `  ${hex(line.offset)} · ${line.generalMessageIndex === undefined ? `message ${line.messageId}` : `general message ${line.generalMessageIndex}`}${line.presentation === "choice-prompt" ? ` · choice → flag ${line.choiceFlag}` : ""} · ${line.speakerLabel ?? (line.characterId !== undefined ? `Character ${line.characterId}` : line.characterVariable !== undefined ? `Character from variable ${line.characterVariable}` : line.position === 0 ? "Building speaker" : "Narration")}: ${line.body}`,
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

pnpm run query-dialog -- FILE SLOT ACTION[:COMMAND[:SELECTION]] [COMMAND...]

Actions:
  market, pub, shipyard, harbor, arrival, lodge, palace, guild, special-building,
  bank, item-shop, church, house-of-fortune, fortune-teller
  context:ID                  raw building/context qualifier
  at-sea                     uses the saved voyage-day counter
  before-battle:CAPTAIN_ID   scenario hook before naval combat
  after-battle:CAPTAIN_ID    scenario hook after naval combat
  townsperson:NAME           line shown when walking into a townsperson:
                             market-woman, pub-man, shipyard-woman, lodge-man,
                             waving-man, dog, guard, or old-man

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

Multi-command visits:
  Further arguments are later commands in the same building visit, resolved in
  order against the save as changed by the earlier commands. Per-visit state
  such as Pub enthusiasm, the one Luck roll per Pray visit, and the
  cartographer's single Report is carried between them. Append @success or
  @failure to a command to choose its unsaved random outcome; otherwise later
  commands assume the roll did not change the save.
  pub:treat:10 treat:10 recruit-crew:20
  church:pray@success pray
  market:buy-goods:1:1:20:yes buy-goods:2:1:5:yes
  special-building:report report

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
  const [file, slotText, actionText, ...laterCommands] = args;
  if (!file || !slotText || !actionText || process.argv.includes("--help")) {
    console.log(help);
    return;
  }
  const slot = integer(slotText, "slot");
  const townsperson = /^townsperson:(.+)$/i.exec(actionText);
  if (townsperson) {
    const who = townsperson[1]!.toLowerCase() as Townsperson;
    if (!TOWNSPEOPLE.includes(who))
      throw new Error(
        `Unknown townsperson ${townsperson[1]}. Use one of: ${TOWNSPEOPLE.join(", ")}.`,
      );
    const lines = townspersonLines(
      await readFile(file),
      slot,
      who,
      (await loadGeneralText()).messages,
    );
    console.log(
      lines.length === 0
        ? `No ${who} is present at the saved location.`
        : lines
            .map(
              (line) => `general message ${line.combinedIndex} · ${line.text}`,
            )
            .join("\n"),
    );
    console.log(
      "Note: the line is shown only in daytime, after ten unobstructed steps since the previous townsperson line.",
    );
    return;
  }
  const visit = parseQueryVisit([actionText, ...laterCommands]);
  const result = await queryVisit(
    await readFile(file),
    slot,
    visit.action,
    visit.commands,
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
