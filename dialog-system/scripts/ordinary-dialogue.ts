import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  FAME_RECORD_SIZE,
  FAME_START,
  inspectCartographers,
  inspectFame,
  inspectRank,
  inspectSlot,
  PORT_RECORD_SIZE,
  PORT_TABLE,
  RANK_NAMES,
  slotOffset,
  validate,
} from "../../save-editor/format.js";
import { repoRoot } from "../../scripts/shared.js";
import {
  decodeGeneralMessageBank,
  type GeneralMessage,
} from "./general-messages.js";

const SAILOR_TABLE = 0x612;
const SAILOR_RECORD_SIZE = 42;
const SAILOR_AFFILIATION = 0x29;
const PORT_CONTROLLER = 0x13;
const BUILDINGS_PER_PORT = 12;
const BUILDING_COORDINATE_SIZE = 2;
const SUPPLY_PORT_MAP = 100;
const PIRACY = 6;
const TURKEY = 2;

export type OrdinaryEntryDisposition =
  | "shown"
  | "access-denied"
  | "suppressed"
  | "conditional"
  | "closed"
  | "unavailable"
  | "unsupported";

export interface OrdinaryDialogueLine {
  readonly bank: GeneralMessage["bank"];
  readonly rawIndex: number;
  readonly entryNumber: number;
  readonly combinedIndex: number;
  readonly text: string;
  readonly speaker: string;
}

export interface OrdinaryBuildingEntry {
  readonly confidence: "decoded" | "ambiguous" | "none";
  readonly disposition: OrdinaryEntryDisposition;
  readonly dialogue: readonly OrdinaryDialogueLine[];
  readonly menu: readonly string[];
  readonly uncertainties: readonly string[];
  readonly notes: readonly string[];
}

export interface OrdinaryDialogueData {
  readonly messages: ReadonlyMap<number, GeneralMessage>;
  readonly buildingCoordinates: Buffer;
  readonly portTilesets: Buffer;
}

const MENUS: Readonly<Record<number, readonly string[]>> = {
  0x00: ["Buy Goods", "Sell Goods", "Invest", "Market Rate"],
  0x01: ["Recruit Crew", "Dismiss Crew", "Treat", "Meet", "Waitress", "Gamble"],
  0x02: ["New Ship", "Used Ship", "Repair", "Sell", "Remodel", "Invest"],
  0x03: ["Sail", "Supply", "Moor"],
  0x04: ["Check In", "Gossip", "Port Info"],
  0x05: ["Meet Ruler", "Defect", "Gold", "Ship", "Secret Call"],
  0x06: ["Job Assignment", "Country Info"],
  0x08: ["Deposit", "Withdraw", "Borrow", "Repay"],
  0x09: ["Buy", "Sell"],
  0x0a: ["Pray", "Donate"],
  0x0b: ["Life", "Career", "Love", "Mates"],
};

const FIXED_GREETINGS = new Map<number, number>([
  [0x02, 77],
  [0x03, 56],
  [0x04, 66],
  [0x06, 85],
  [0x09, 235],
  [0x0b, 298],
]);

let ordinaryDataPromise: Promise<OrdinaryDialogueData> | undefined;

export function loadOrdinaryDialogueData(): Promise<OrdinaryDialogueData> {
  ordinaryDataPromise ??= Promise.all([
    readFile(join(repoRoot, "raw/MESSAGE.DAT")),
    readFile(join(repoRoot, "raw/MESSAGE2.DAT")),
    readFile(join(repoRoot, "raw/ZA_DAT.DAT")),
    readFile(join(repoRoot, "raw/CHIP_NO.DAT")),
  ]).then(([messageDat, message2Dat, buildingCoordinates, portTilesets]) => {
    const decoded = [
      ...decodeGeneralMessageBank(messageDat, "MESSAGE.DAT"),
      ...decodeGeneralMessageBank(message2Dat, "MESSAGE2.DAT"),
    ];
    return {
      messages: new Map(
        decoded.map((message) => [message.combinedIndex, message]),
      ),
      buildingCoordinates,
      portTilesets,
    };
  });
  return ordinaryDataPromise;
}

function cstring(data: Buffer): string {
  const end = data.indexOf(0);
  return data.subarray(0, end < 0 ? data.length : end).toString("latin1");
}

function protagonistNames(
  save: Buffer,
  slot: number,
  protagonistId: number,
): { first: string; last: string } {
  const start =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  return {
    first: cstring(save.subarray(start, start + 9)),
    last: cstring(save.subarray(start + 9, start + 18)),
  };
}

function substitute(text: string, values: readonly string[]): string {
  let index = 0;
  return text.replace(/%s/g, () => values[index++] ?? "%s");
}

function line(
  data: OrdinaryDialogueData,
  combinedIndex: number,
  speaker: string,
  substitutions: readonly string[] = [],
): OrdinaryDialogueLine {
  const message = data.messages.get(combinedIndex);
  if (!message)
    throw new Error(`Missing general message combined index ${combinedIndex}.`);
  return {
    bank: message.bank,
    rawIndex: message.rawIndex,
    entryNumber: message.entryNumber,
    combinedIndex: message.combinedIndex,
    text: substitute(message.text, substitutions),
    speaker,
  };
}

function buildingExists(
  data: OrdinaryDialogueData,
  portId: number,
  context: number,
): boolean {
  if (context < 0 || context >= BUILDINGS_PER_PORT) return false;
  const map = portId < 100 ? portId : SUPPLY_PORT_MAP;
  const offset =
    (map * BUILDINGS_PER_PORT + context) * BUILDING_COORDINATE_SIZE;
  const x = data.buildingCoordinates[offset];
  const y = data.buildingCoordinates[offset + 1];
  return (
    x !== undefined &&
    y !== undefined &&
    !((x === 0 && y === 0) || (x === 0xff && y === 0xff))
  );
}

function storySuppression(
  context: number,
  protagonistEffects: readonly (readonly string[])[],
  sharedEffects: readonly (readonly string[])[],
): "none" | "possible" | "certain" {
  if (context === 0x04) return "none";
  const groups = [protagonistEffects, sharedEffects].filter(
    (outcomes) => outcomes.length > 0,
  );
  if (
    groups.some((outcomes) =>
      outcomes.every((effects) =>
        effects.includes("suppress normal building menu and force exit"),
      ),
    )
  )
    return "certain";
  if (
    groups.some((outcomes) =>
      outcomes.some((effects) =>
        effects.includes("suppress normal building menu and force exit"),
      ),
    )
  )
    return "possible";
  return "none";
}

function hostileRisk(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  context: number,
): string | undefined {
  if (portId >= 100) return undefined;
  const base = slotOffset(slot);
  const controller =
    save[base + PORT_TABLE + portId * PORT_RECORD_SIZE + PORT_CONTROLLER]! & 7;
  if (controller === PIRACY) return undefined;
  const friendship =
    save[
      base + FAME_START + protagonistId * FAME_RECORD_SIZE + 6 + controller
    ]!;
  const eligibleOrdinary = new Set([
    0x00, 0x01, 0x02, 0x04, 0x06, 0x08, 0x09, 0x0b,
  ]);
  if (context === 0x05 && friendship <= 80)
    return `A random hostile Palace reception may preempt this path: stored Friendship with nation ${controller} is ${friendship} (displayed ${friendship - 100}).`;
  if (eligibleOrdinary.has(context) && friendship < 80)
    return `A random hostile-building encounter may preempt this path: stored Friendship with nation ${controller} is ${friendship} (displayed ${friendship - 100}).`;
  return undefined;
}

function specialResidence(
  save: Buffer,
  slot: number,
  portId: number,
  protagonistId: number,
  data: OrdinaryDialogueData,
): Pick<OrdinaryBuildingEntry, "dialogue" | "menu" | "uncertainties"> {
  const names = protagonistNames(save, slot, protagonistId);
  const cartographer = inspectCartographers(save, slot).find(
    (record) => record.portId === portId,
  );
  if (cartographer)
    return {
      dialogue: [
        cartographer.activeContract
          ? line(data, 478, cartographer.name, [names.first, names.last])
          : line(data, 477, cartographer.name),
      ],
      menu: ["Contract", "Learn Skills", "Report", "Locate"],
      uncertainties: [],
    };
  return {
    dialogue: [line(data, 477, "special-residence occupant")],
    menu: [],
    uncertainties: [
      "The residence occupant and its collector, teacher, or story-specific menu are not yet selected by the ordinary-dialogue model.",
    ],
  };
}

export function ordinaryBuildingEntry(
  save: Buffer,
  slot: number,
  context: number,
  buildingOpen: boolean | undefined,
  protagonistEffects: readonly (readonly string[])[],
  sharedEffects: readonly (readonly string[])[],
  data: OrdinaryDialogueData,
): OrdinaryBuildingEntry {
  validate(save);
  if (context < 0 || context >= BUILDINGS_PER_PORT)
    return {
      confidence: "none",
      disposition: "unsupported",
      dialogue: [],
      menu: [],
      uncertainties: [],
      notes: ["This raw context has no ordinary building model."],
    };
  const slotInfo = inspectSlot(save, slot);
  const { protagonistId } = slotInfo;
  const portId = slotInfo.portId!;
  if (!buildingExists(data, portId, context))
    return {
      confidence: "none",
      disposition: "unavailable",
      dialogue: [],
      menu: [],
      uncertainties: [],
      notes: ["This facility does not exist at the saved port."],
    };
  if (buildingOpen === false)
    return {
      confidence: "none",
      disposition: "closed",
      dialogue: [],
      menu: [],
      uncertainties: [],
      notes: ["The facility is closed at the saved time."],
    };

  const suppression = storySuppression(
    context,
    protagonistEffects,
    sharedEffects,
  );
  if (suppression === "certain")
    return {
      confidence: "decoded",
      disposition: "suppressed",
      dialogue: [],
      menu: [],
      uncertainties: [],
      notes: ["A preceding story route forces exit before ordinary entry."],
    };

  const uncertainties: string[] = [];
  if (suppression === "possible")
    uncertainties.push(
      "A choice or unresolved story branch may force exit before ordinary entry.",
    );
  const hostile = hostileRisk(save, slot, protagonistId, portId, context);
  if (hostile) uncertainties.push(hostile);

  const names = protagonistNames(save, slot, protagonistId);
  let dialogue: OrdinaryDialogueLine[];
  let menu = [...(MENUS[context] ?? [])];
  let accessDenied = false;

  if (context === 0x00) {
    const tradeFame = inspectFame(save, slot, protagonistId).trade;
    dialogue = [
      tradeFame < 1_000
        ? line(data, 0, "Market vendor")
        : line(data, 1, "Market vendor", [names.first, names.last]),
    ];
  } else if (context === 0x01) {
    dialogue = [line(data, 18, "Pub vendor", ["[port specialty]"])];
    uncertainties.push("The port-specific Pub specialty is not yet decoded.");
  } else if (context === 0x05) {
    const base = slotOffset(slot);
    const rank = inspectRank(save, slot, protagonistId);
    const affiliation =
      save[
        base +
          SAILOR_TABLE +
          protagonistId * SAILOR_RECORD_SIZE +
          SAILOR_AFFILIATION
      ]! & 7;
    const controller =
      save[base + PORT_TABLE + portId * PORT_RECORD_SIZE + PORT_CONTROLLER]! &
      7;
    const sharedFlags = save.readUInt32LE(base + 0xbc);
    const invited = (sharedFlags & ((1 << 17) | (1 << 18))) !== 0;
    accessDenied =
      rank === 0 &&
      controller !== affiliation &&
      affiliation !== PIRACY &&
      !invited;
    if (accessDenied) {
      dialogue = [line(data, 84, "Palace guard")];
      menu = [];
    } else if (rank > 0) {
      dialogue = [
        line(data, 444, "Palace guard", [
          RANK_NAMES[rank] ?? `Rank ${rank}`,
          names.last,
        ]),
      ];
    } else {
      dialogue = [line(data, 576, "Palace guard")];
    }
  } else if (context === 0x07) {
    const residence = specialResidence(save, slot, portId, protagonistId, data);
    dialogue = [...residence.dialogue];
    menu = [...residence.menu];
    uncertainties.push(...residence.uncertainties);
  } else if (context === 0x08) {
    dialogue = [
      line(data, portId === 13 ? 97 : 98, "Marco Polo Bank representative"),
    ];
  } else if (context === 0x0a) {
    const base = slotOffset(slot);
    const affiliation =
      save[
        base +
          SAILOR_TABLE +
          protagonistId * SAILOR_RECORD_SIZE +
          SAILOR_AFFILIATION
      ]! & 0x0f;
    const mosque = data.portTilesets[portId] === 2;
    accessDenied = mosque ? affiliation !== TURKEY : affiliation === TURKEY;
    const message = mosque
      ? accessDenied
        ? 802
        : 803
      : accessDenied
        ? 90
        : 91;
    dialogue = [line(data, message, mosque ? "Imam" : "Priest")];
    if (accessDenied) menu = [];
  } else {
    const greeting = FIXED_GREETINGS.get(context);
    if (greeting === undefined)
      throw new Error(`Missing ordinary greeting for context ${context}.`);
    dialogue = [line(data, greeting, "building vendor")];
  }

  const conditional = uncertainties.length > 0;
  return {
    confidence: conditional ? "ambiguous" : "decoded",
    disposition: conditional
      ? "conditional"
      : accessDenied
        ? "access-denied"
        : "shown",
    dialogue,
    menu,
    uncertainties,
    notes:
      context === 0x05 && menu.length > 0
        ? [
            "Palace menu entries may be disabled by rank, allegiance, or mission state.",
          ]
        : [],
  };
}
