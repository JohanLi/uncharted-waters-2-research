import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  FAME_RECORD_SIZE,
  FAME_START,
  inspectCartographers,
  inspectCollectors,
  inspectFame,
  inspectGold,
  inspectItems,
  inspectRank,
  inspectSlot,
  ITEM_INVENTORY_SIZE,
  PORT_COUNT,
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
const CELESTIAL_NAVIGATION_TEACHER_PORT = 10;
const GUNNERY_TEACHER_PORT = 35;

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
  readonly command?: OrdinaryCommandResult;
}

export interface OrdinaryCommandResult {
  readonly path: readonly string[];
  readonly confidence: "decoded" | "ambiguous" | "none";
  readonly disposition:
    "shown" | "completed" | "blocked" | "unavailable" | "unsupported";
  readonly dialogue: readonly OrdinaryDialogueLine[];
  readonly menu: readonly string[];
  readonly effects: readonly string[];
  readonly uncertainties: readonly string[];
  readonly notes: readonly string[];
}

export interface OrdinaryDialogueData {
  readonly messages: ReadonlyMap<number, GeneralMessage>;
  readonly buildingCoordinates: Buffer;
  readonly portTilesets: Buffer;
  readonly colonyNames: readonly string[];
  readonly shipNames: readonly string[];
  readonly shipModels: readonly ShipModel[];
  readonly shipyardModels: readonly (readonly number[])[];
  readonly marketDefinitions: readonly MarketDefinition[];
  readonly portCoordinates: readonly {
    readonly x: number;
    readonly y: number;
  }[];
}

interface ShipModel {
  readonly id: number;
  readonly name: string;
  readonly usedGuns: number;
  readonly usedCrew: number;
  readonly industryRequirement: number;
  readonly durability: number;
  readonly tacking: number;
  readonly power: number;
  readonly maximumCrew: number;
  readonly minimumCrew: number;
  readonly capacity: number;
  readonly maximumGuns: number;
  readonly basePrice: number;
}

interface MarketDefinition {
  readonly basePrices: readonly number[];
  readonly goods: readonly number[];
  readonly requirements: readonly number[];
}

const MENUS: Readonly<Record<number, readonly string[]>> = {
  0x00: ["Buy Goods", "Sell Goods", "Invest", "Market Rate"],
  0x01: ["Recruit Crew", "Dismiss Crew", "Treat", "Meet", "Waitress", "Gamble"],
  0x02: ["New Ship", "Used Ship", "Repair", "Sell", "Remodel", "Invest"],
  0x03: ["Sail", "Supply", "Moor"],
  0x04: ["Check In", "Gossip", "Port Info"],
  0x05: ["Meet Ruler", "Defect", "Gold", "Ship"],
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

const PLAYER_FLEET_TABLE = 0x1de0;
const FLEET_RECORD_SIZE = 0x85;
const FLEET_SHIP_SLOTS = 0x2b;
const SHIP_SLOT_SIZE = 9;
const SHIP_SLOT_COUNT = 10;
const SHIP_INSTANCE_TABLE = 0x47fc;
const SHIP_INSTANCE_SIZE = 0x18;
const PLAYER_SUPPLY_RECORDS = 0x423e;
const SUPPLY_RECORD_SIZE = 0x1e;
const RESERVE_SHIP_SLOTS = 0x46ee;
const RESERVE_SHIP_COUNT = 30;
const MATE_ROSTER = 0x1d85;
const MATE_ROSTER_COUNT = 30;
const BANK_ACCOUNT_HUNDREDS = 0x60e;
const BANK_ACCOUNT_REMAINDER = 0x610;
const BANK_SAVINGS_LIMIT = 1_000_000;
const GOLD_CARRYING_LIMIT = 600_000_000;
const WAITRESS_TABLE = 0x1bb2;
const WAITRESS_COUNT = 29;
const WAITRESS_RECORD_SIZE = 0x10;
// Records naturally begin at 0x5968 (MAIN.EXE's current-port pointer is
// DS:0x6790 + port * 0x25). Offsets from this table are therefore two bytes
// larger than the executable's record-relative offsets.
const PORT_METADATA_TABLE = 0x5966;
const PORT_METADATA_RECORD_SIZE = 0x25;
const ITEM_DEFINITION_TABLE = 0x7130;
const ITEM_DEFINITION_SIZE = 22;
const ITEM_NAME_SIZE = 17;
const ITEM_PRICE_UNITS = 18;
const ITEM_APPEAL = 20;
const ITEM_TYPE_FLAGS = 21;
const ITEM_EQUIPPED = 0x10;
const SHARED_SCENARIO_START = 0xba;
const SHARED_VARIABLES_START = 0xc4;
const NATION_RECORDS = 0x04d6;
const NATION_RECORD_SIZE = 0x20;
const DISCOVERY_TABLE = 0x6e74;
const DISCOVERY_RECORD_SIZE = 7;
// Records 98 and 99 are always-excluded placeholders (flag 0x80).
const DISCOVERY_COUNT = 100;
const CHART_TOTAL_KNOWN = 0x036a;
const CHART_UNREPORTED = 0x036c;
// Port controllers, sailor affiliations, and nation records share this order.
const NATION_NAMES = [
  "Portugal",
  "Spain",
  "Turkey",
  "England",
  "Italy",
  "Holland",
] as const;
const GOODS_NAMES = [
  "Clove",
  "Cinnamon",
  "Pepper",
  "Nutmeg",
  "Pimento",
  "Ginger",
  "Tobacco",
  "Tea",
  "Coffee",
  "Cacao",
  "Sugar",
  "Cheese",
  "Fish",
  "Grain",
  "Olive Oil",
  "Wine",
  "Rock Salt",
  "Silk",
  "Cotton",
  "Wool",
  "Flax",
  "Cotton Cloth",
  "Silk Cloth",
  "Wool Cloth",
  "Velvet",
  "Linen Cloth",
  "Coral",
  "Amber",
  "Ivory",
  "Pearl",
  "Tortoise Shell",
  "Gold",
  "Silver",
  "Copper Ore",
  "Tin Ore",
  "Iron Ore",
  "Art",
  "Carpet",
  "Musk",
  "Perfume",
  "Glass Beads",
  "Dye",
  "Porcelain",
  "Glassware",
  "Arms",
  "Wood",
] as const;
const FIGUREHEAD_NAMES = [
  "Sea Horse",
  "Commodore",
  "Unicorn",
  "Lion",
  "Giant Eagle",
  "Hero",
  "Neptune",
  "Dragon",
  "Angel",
  "Goddess",
] as const;
const GUN_NAMES = [
  "Cannon",
  "Demicannon",
  "Canon Pedrero",
  "Culverin",
  "Demiculverin",
  "Saker",
  "Carronade",
] as const;
const GUN_PRICES = [360, 80, 40, 250, 40, 5, 600] as const;
const GOODS_CATEGORY_LIMITS = [6, 10, 17, 21, 26, 31, 33, 36, 40, 46] as const;
const PUB_SPECIALTIES = [
  "rum",
  "wine",
  "whiskey",
  "brandy",
  "gin",
  "beer",
  "vodka",
  "tequila",
  "mango juice",
  "palm wine",
  "mint tea",
  "fenny",
  "plum wine",
  "sake",
] as const;
const PUB_SPECIALTY_PRICES = [
  3, 4, 5, 6, 3, 3, 2, 2, 1, 1, 3, 2, 3, 2,
] as const;
const SAILOR_ABILITY_NAMES = [
  "Leadership",
  "Seamanship",
  "Knowledge",
  "Intuition",
  "Courage",
] as const;

let ordinaryDataPromise: Promise<OrdinaryDialogueData> | undefined;

export function loadOrdinaryDialogueData(): Promise<OrdinaryDialogueData> {
  ordinaryDataPromise ??= Promise.all([
    readFile(join(repoRoot, "raw/MESSAGE.DAT")),
    readFile(join(repoRoot, "raw/MESSAGE2.DAT")),
    readFile(join(repoRoot, "raw/ZA_DAT.DAT")),
    readFile(join(repoRoot, "raw/CHIP_NO.DAT")),
    readFile(join(repoRoot, "raw/COLONY.DAT")),
    readFile(join(repoRoot, "raw/DATA1/DATA1.015")),
    readFile(join(repoRoot, "raw/MAIN.EXE")),
  ]).then(
    ([
      messageDat,
      message2Dat,
      buildingCoordinates,
      portTilesets,
      colonyDat,
      data1,
      mainExe,
    ]) => {
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
        colonyNames: Array.from({ length: DISCOVERY_COUNT }, (_, index) =>
          cstring(colonyDat.subarray(index * 293, index * 293 + 25)),
        ),
        shipNames: Array.from({ length: 25 }, (_, index) =>
          cstring(
            data1.subarray(19_388 + index * 24, 19_388 + index * 24 + 16),
          ),
        ),
        shipModels: Array.from({ length: 25 }, (_, index) => {
          const identity = 19_388 + index * 24;
          const stats = 19_988 + index * 12;
          return {
            id: index,
            name: cstring(data1.subarray(identity, identity + 16)),
            usedGuns: data1[identity + 19]!,
            usedCrew: data1.readUInt16LE(identity + 20),
            industryRequirement: data1[stats]! * 10,
            durability: data1[stats + 1]!,
            tacking: data1[stats + 2]!,
            power: data1[stats + 3]!,
            maximumCrew: data1[stats + 4]! * 10,
            minimumCrew: data1[stats + 5]!,
            capacity: data1.readUInt16LE(stats + 6),
            maximumGuns: data1[stats + 8]!,
            basePrice: data1.readUInt16LE(stats + 10) * 10,
          };
        }),
        shipyardModels: Array.from({ length: 11 }, (_, yard) =>
          Array.from(
            mainExe.subarray(0x47270 + yard * 8, 0x47278 + yard * 8),
          ).filter((id) => id !== 0xff),
        ),
        marketDefinitions: Array.from({ length: 13 }, (_, market) => {
          // 46 little-endian base prices, nine unnamed words for the listed
          // goods, then nine goods IDs and their minimum-Economy bytes.
          const record = 0x67dc + market * 0x80;
          return {
            basePrices: Array.from({ length: GOODS_NAMES.length }, (_, good) =>
              data1.readUInt16LE(record + good * 2),
            ),
            goods: Array.from(data1.subarray(record + 0x6e, record + 0x77)),
            requirements: Array.from(
              data1.subarray(record + 0x77, record + 0x80),
            ),
          };
        }),
        portCoordinates: Array.from({ length: 130 }, (_, index) => ({
          x: data1.readUInt16LE(0x4f3e + index * 20 + 2),
          y: data1.readUInt16LE(0x4f3e + index * 20 + 4),
        })),
      };
    },
  );
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

function substitute(
  text: string,
  values: readonly (string | number)[],
): string {
  let index = 0;
  return text.replace(/%l?[ds]/g, (placeholder) =>
    String(values[index++] ?? placeholder),
  );
}

function line(
  data: OrdinaryDialogueData,
  combinedIndex: number,
  speaker: string,
  substitutions: readonly (string | number)[] = [],
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

function normalizedCommand(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function result(
  path: readonly string[],
  values: Omit<OrdinaryCommandResult, "path">,
): OrdinaryCommandResult {
  return { path, ...values };
}

function unavailableCommand(
  path: readonly string[],
  note: string,
): OrdinaryCommandResult {
  return result(path, {
    confidence: "none",
    disposition: "unavailable",
    dialogue: [],
    menu: [],
    effects: [],
    uncertainties: [],
    notes: [note],
  });
}

interface HarborShip {
  readonly recordIndex: number;
  readonly index: number;
  readonly name: string;
  readonly captainId: number;
  readonly instanceId: number;
  readonly typeId: number;
  readonly crew: number;
  readonly currentDurability: number;
  readonly maximumDurability: number;
  readonly tacking: number;
  readonly power: number;
  readonly guns: number;
  readonly navigationCrew: number;
  readonly water: number;
  readonly food: number;
  readonly lumber: number;
  readonly shot: number;
  readonly cargoCapacity: number;
  readonly usedCapacity: number;
  readonly configuredCrew: number;
}

function harborShip(
  save: Buffer,
  base: number,
  recordIndex: number,
  index: number,
  shipSlot: number,
): HarborShip {
  const crew = save.readUInt16LE(shipSlot);
  const instanceId = save[shipSlot + 7]!;
  const instance = base + SHIP_INSTANCE_TABLE + instanceId * SHIP_INSTANCE_SIZE;
  const supply =
    base + PLAYER_SUPPLY_RECORDS + recordIndex * SUPPLY_RECORD_SIZE;
  const water = save.readUInt16LE(supply);
  const food = save.readUInt16LE(supply + 2);
  const lumber = save.readUInt16LE(supply + 4);
  const shot = save.readUInt16LE(supply + 6);
  let usedCapacity =
    Math.floor(water / 10) + Math.floor(food / 10) + lumber + shot;
  for (let cargo = 0; cargo < 5; cargo++) {
    if (save[supply + 0x16 + cargo] !== 0xff)
      usedCapacity += save.readUInt16LE(supply + 0x0c + cargo * 2);
  }
  return {
    recordIndex,
    index,
    name: cstring(save.subarray(instance, instance + 0x11)),
    captainId: save[supply + 0x1b]!,
    instanceId,
    typeId: save[instance + 0x11]!,
    crew,
    currentDurability: save[shipSlot + 2]!,
    maximumDurability: save[shipSlot + 3]!,
    tacking: save[shipSlot + 4]!,
    power: save[shipSlot + 5]!,
    guns: save[shipSlot + 6]!,
    navigationCrew: Math.floor((crew * save[supply + 9]!) / 100),
    water,
    food,
    lumber,
    shot,
    cargoCapacity: save.readUInt16LE(instance + 0x16),
    usedCapacity,
    configuredCrew: save.readUInt16LE(instance + 0x14),
  };
}

function harborShips(
  save: Buffer,
  slot: number,
  protagonistId: number,
): HarborShip[] {
  const base = slotOffset(slot);
  const officer = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const fleetId = save[officer + 0x24]!;
  const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  const ships: HarborShip[] = [];
  for (let index = 0; index < SHIP_SLOT_COUNT; index++) {
    const shipSlot = fleet + FLEET_SHIP_SLOTS + index * SHIP_SLOT_SIZE;
    if (save[shipSlot] === 0xff || (save[shipSlot + 8]! & 0x30) !== 0x10)
      continue;
    ships.push(harborShip(save, base, index, index, shipSlot));
  }
  return ships;
}

function activeFleetOccupancyCount(
  save: Buffer,
  slot: number,
  protagonistId: number,
): number {
  const base = slotOffset(slot);
  const fleetId =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x24]!;
  const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  let count = 0;
  for (let index = 0; index < SHIP_SLOT_COUNT; index++) {
    const status =
      save[fleet + FLEET_SHIP_SLOTS + index * SHIP_SLOT_SIZE + 8]! & 0x30;
    if (status === 0x10 || status === 0x20) count++;
  }
  return count;
}

function dockedShips(
  save: Buffer,
  slot: number,
  portId: number,
): { ships: HarborShip[]; capacity: number } {
  const base = slotOffset(slot);
  const ships: HarborShip[] = [];
  let unused = 0;
  for (let index = 0; index < RESERVE_SHIP_COUNT; index++) {
    const shipSlot = base + RESERVE_SHIP_SLOTS + index * SHIP_SLOT_SIZE;
    const status = save[shipSlot + 8]! & 0x30;
    const recordIndex = index + SHIP_SLOT_COUNT;
    const supply =
      base + PLAYER_SUPPLY_RECORDS + recordIndex * SUPPLY_RECORD_SIZE;
    if (status === 0x10 && save[supply + 0x1b] === (portId | 0x80))
      ships.push(harborShip(save, base, recordIndex, index, shipSlot));
    else if (status !== 0x10 && status !== 0x20) unused++;
  }
  return { ships, capacity: Math.min(5, ships.length + unused) };
}

function shipLabel(ship: HarborShip, ordinal: number): string {
  return `${ordinal + 1}: ${ship.name || `ship record ${ship.recordIndex}`}`;
}

function activeHarborShipSlot(
  save: Buffer,
  slot: number,
  protagonistId: number,
  ship: HarborShip,
): number {
  const base = slotOffset(slot);
  const fleetId =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x24]!;
  return (
    base +
    PLAYER_FLEET_TABLE +
    fleetId * FLEET_RECORD_SIZE +
    FLEET_SHIP_SLOTS +
    ship.index * SHIP_SLOT_SIZE
  );
}

function selectedShip(
  ships: readonly HarborShip[],
  selector: string | undefined,
): HarborShip | undefined {
  if (!selector) return undefined;
  const numeric = /^(?:ship-?)?(\d+)$/i.exec(selector);
  if (numeric) return ships[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return ships.find((ship) => normalizedCommand(ship.name) === normalized);
}

interface ShopItem {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly appeal: number;
  readonly type: number;
  readonly equipped: boolean;
}

function shopItem(save: Buffer, slot: number, id: number): ShopItem {
  const record =
    slotOffset(slot) + ITEM_DEFINITION_TABLE + id * ITEM_DEFINITION_SIZE;
  const flags = save[record + ITEM_TYPE_FLAGS]!;
  return {
    id,
    name: cstring(save.subarray(record, record + ITEM_NAME_SIZE)),
    price: save.readUInt16LE(record + ITEM_PRICE_UNITS) * 100,
    appeal: save[record + ITEM_APPEAL]!,
    type: flags & 0x0f,
    equipped: (flags & ITEM_EQUIPPED) !== 0,
  };
}

function itemLabel(item: ShopItem, ordinal: number): string {
  return `${ordinal + 1}: ${item.name || `item ${item.id}`}`;
}

function selectedItem(
  items: readonly ShopItem[],
  selector: string | undefined,
): ShopItem | undefined {
  if (!selector) return undefined;
  const numeric = /^(?:item-?)?(\d+)$/i.exec(selector);
  if (numeric) return items[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return items.find((item) => normalizedCommand(item.name) === normalized);
}

function itemShopStock(save: Buffer, slot: number, portId: number): ShopItem[] {
  if (portId >= 100) return [];
  const base = slotOffset(slot);
  const metadata =
    base + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const ticks = save[base + 9]!;
  const secretHours = ticks >= 0x06 && ticks < 0x09;
  const offsets = secretHours ? [0x22] : [0x1f, 0x20, 0x21];
  return offsets
    .map((offset) => save[metadata + offset]!)
    .filter((id) => id !== 0xff)
    .map((id) => shopItem(save, slot, id));
}

function sailorName(save: Buffer, slot: number, sailorId: number): string {
  if (sailorId >= 120) return `sailor ${sailorId}`;
  const start = slotOffset(slot) + SAILOR_TABLE + sailorId * SAILOR_RECORD_SIZE;
  return `${cstring(save.subarray(start, start + 9))} ${cstring(save.subarray(start + 9, start + 18))}`.trim();
}

interface LocalSailor {
  readonly id: number;
  readonly name: string;
  readonly record: number;
  readonly fleetId: number;
  readonly ownMate: boolean;
  readonly pirateCaptain: boolean;
}

function localSailors(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  pub: boolean,
  data: OrdinaryDialogueData,
): LocalSailor[] {
  const base = slotOffset(slot);
  const protagonist = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const playerFleet = save[protagonist + 0x24]!;
  const coordinates = data.portCoordinates[portId];
  const sailors: LocalSailor[] = [];
  for (let id = 6; id < 120; id++) {
    if (id === protagonistId) continue;
    const record = base + SAILOR_TABLE + id * SAILOR_RECORD_SIZE;
    const status = save[record + SAILOR_AFFILIATION]!;
    if ((status & 0x20) === 0 || Boolean(status & 0x40) !== pub) continue;
    const fleetId = save[record + 0x24]!;
    const ownMate = fleetId === playerFleet;
    const unemployedHere = fleetId === 0xff && save[record + 0x25] === portId;
    let fleetHere = false;
    if (!ownMate && fleetId < 100 && coordinates) {
      const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
      fleetHere =
        (save[fleet + 0x29]! & 1) !== 0 &&
        save.readUInt16LE(fleet) === coordinates.x &&
        save.readUInt16LE(fleet + 2) === coordinates.y;
    }
    if (!ownMate && !unemployedHere && !fleetHere) continue;
    sailors.push({
      id,
      name: sailorName(save, slot, id),
      record,
      fleetId,
      ownMate,
      pirateCaptain: fleetId >= 60 && fleetId < 70,
    });
  }
  return sailors;
}

function selectedLocalSailor(
  sailors: readonly LocalSailor[],
  selector: string | undefined,
): LocalSailor | undefined {
  if (!selector) return undefined;
  const numeric = /^(?:sailor-?)?(\d+)$/i.exec(selector);
  if (numeric) return sailors[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return sailors.find(
    (sailor) => normalizedCommand(sailor.name) === normalized,
  );
}

function fleetShipType(
  save: Buffer,
  slot: number,
  fleetId: number,
  data: OrdinaryDialogueData,
): string {
  if (fleetId >= 100) return "ship";
  const base = slotOffset(slot);
  const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  for (let index = 0; index < SHIP_SLOT_COUNT; index++) {
    const ship = fleet + FLEET_SHIP_SLOTS + index * SHIP_SLOT_SIZE;
    if (save[ship] === 0xff) continue;
    const instanceId = save[ship + 7]!;
    const type =
      save[
        base + SHIP_INSTANCE_TABLE + instanceId * SHIP_INSTANCE_SIZE + 0x11
      ]!;
    return data.shipNames[type] || `ship type ${type}`;
  }
  return "ship";
}

function sailorIntroduction(
  save: Buffer,
  slot: number,
  sailor: LocalSailor,
  pub: boolean,
  data: OrdinaryDialogueData,
): {
  dialogue: OrdinaryDialogueLine[];
  uncertainties: string[];
  menu: string[];
} {
  if (sailor.ownMate)
    return {
      dialogue: [],
      uncertainties: [
        `The unsaved general RNG selects one of raw messages ${pub ? "134–136" : "69–71"} for ${sailor.name}.`,
      ],
      menu: [],
    };
  if (sailor.pirateCaptain)
    return {
      dialogue: [],
      uncertainties: [
        `The unsaved general RNG selects pirate-captain threat 859 or 860 for ${sailor.name}.`,
      ],
      menu: pub
        ? ["Treat", "Gossip", "Hire", "Duel"]
        : ["Gossip", "Hire", "Duel"],
    };

  const nation =
    NATION_NAMES[save[sailor.record + SAILOR_AFFILIATION]! & 7] ?? "Piracy";
  const type = fleetShipType(save, slot, sailor.fleetId, data);
  const duty = save[sailor.record + 0x26]!;
  const dialogue = [line(data, pub ? 41 : 72, sailor.name)];
  if (sailor.fleetId === 0xff)
    dialogue.push(line(data, pub ? 43 : 75, sailor.name));
  else if (duty === 1)
    dialogue.push(
      line(data, pub ? 137 : 73, sailor.name, [sailor.name, nation, type]),
    );
  else
    dialogue.push(
      line(data, pub ? 138 : 74, sailor.name, [
        sailor.name,
        `officer role ${duty}`,
        type,
        nation,
      ]),
    );
  return {
    dialogue,
    uncertainties: [],
    menu: pub
      ? ["Treat", "Gossip", "Hire", "Duel"]
      : ["Gossip", "Hire", "Duel"],
  };
}

function sailorHireCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  sailor: LocalSailor,
  pub: boolean,
  path: readonly string[],
  choiceIndex: number,
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const selectedMenu = pub
    ? ["Treat", "Gossip", "Hire", "Duel"]
    : ["Gossip", "Hire", "Duel"];
  const prompt = line(data, 48, sailor.name);
  const duty = save[sailor.record + 0x26]!;
  if (duty !== 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 49, sailor.name)],
      menu: selectedMenu,
      effects: [],
      uncertainties: [],
      notes: [
        `${sailor.name}'s duty field is ${duty}, so the sailor is not looking for work.`,
      ],
    });
  const base = slotOffset(slot);
  const roster = Array.from(
    save.subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT),
  );
  if (!roster.includes(0xff))
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 140, sailor.name)],
      menu: selectedMenu,
      effects: [],
      uncertainties: [],
      notes: ["All 30 employed-mate slots are occupied."],
    });
  const loyalty = save[sailor.record + 0x23]!;
  if (pub && loyalty <= 30)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 141, sailor.name)],
      menu: selectedMenu,
      effects: [],
      uncertainties: [],
      notes: [
        `${sailor.name}'s Loyalty is ${loyalty}; Pub hiring requires more than 30.`,
      ],
    });

  let bestIndex = 0;
  for (let index = 1; index < 7; index++)
    if (
      save[sailor.record + 0x14 + index]! >
      save[sailor.record + 0x14 + bestIndex]!
    )
      bestIndex = index;
  const best = save[sailor.record + 0x14 + bestIndex]!;
  const sailorScore =
    (save[sailor.record + 0x1c]! + save[sailor.record + 0x1d]!) * best;
  const protagonist = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const playerScore =
    (save[protagonist + 0x1c]! + save[protagonist + 0x1d]!) *
    save[protagonist + 0x14 + bestIndex]!;
  const experienceMargin = Math.floor(
    (playerScore * inspectRank(save, slot, protagonistId)) / 10,
  );
  const successOutcomes = Math.min(20, experienceMargin);
  if (successOutcomes === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 145, sailor.name)],
      menu: selectedMenu,
      effects: [],
      uncertainties: [],
      notes: [
        "The rank-scaled Navigation/Battle experience comparison cannot succeed.",
      ],
    });

  const wageUnits = Array.from(
    new Set(
      [0, 1, 2].map((roll) =>
        Math.min(20, Math.floor(sailorScore / 400) + roll + 1),
      ),
    ),
  );
  const wageLabel =
    wageUnits.length === 1
      ? wageUnits[0]! * 10
      : `${wageUnits[0]! * 10}–${wageUnits.at(-1)! * 10}`;
  const quote = line(data, 142, sailor.name, [wageLabel]);
  const choice = path[choiceIndex] && normalizedCommand(path[choiceIndex]);
  const probabilistic = successOutcomes < 20;
  const uncertainty = probabilistic
    ? [
        `Hiring reaches the wage offer on ${successOutcomes} of 20 general-RNG results; failure instead shows raw message 145.`,
      ]
    : [];
  if (!choice)
    return result(path, {
      confidence: probabilistic ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: [prompt, quote],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: uncertainty,
      notes: [`Possible monthly wage: ${wageLabel} gold.`],
    });
  if (choice === "no")
    return result(path, {
      confidence: probabilistic ? "ambiguous" : "decoded",
      disposition: "completed",
      dialogue: [prompt, quote, line(data, 143, sailor.name)],
      menu: selectedMenu,
      effects: ["leave the sailor unemployed if the wage offer is reached"],
      uncertainties: uncertainty,
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(
      path,
      `Unknown Hire confirmation: ${path[choiceIndex]}.`,
    );
  return result(path, {
    confidence: probabilistic ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue: [prompt, quote, line(data, 144, sailor.name)],
    menu: selectedMenu,
    effects: [
      `if the experience roll succeeds, add ${sailor.name} to the first empty mate slot`,
      `store a monthly wage of ${wageLabel} gold`,
      `increase ${sailor.name}'s Loyalty from ${loyalty} to ${Math.min(100, loyalty + 10)}`,
      "clear the sailor's port, assign the protagonist's fleet, and set duty 6",
    ],
    uncertainties: uncertainty,
    notes: [
      `Candidate score: (${save[sailor.record + 0x1c]} + ${save[sailor.record + 0x1d]}) × ${best} = ${sailorScore}.`,
      `Rank-scaled player margin: ${experienceMargin}.`,
    ],
  });
}

function harborSailCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const ships = harborShips(save, slot, protagonistId);
  const shipSummary = ships.map(
    (ship) =>
      `${ship.name || `ship ${ship.index + 1}`}: crew ${ship.crew}, navigation ${ship.navigationCrew}, water ${Math.floor(ship.water / 10)}, food ${Math.floor(ship.food / 10)}`,
  );
  if (ships.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: ["The active fleet contains no ship that can sail."],
    });
  if (ships.some((ship) => ship.navigationCrew === 0))
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 57, "Harbor vendor")],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: shipSummary,
    });

  const crew = ships.reduce((total, ship) => total + ship.crew, 0);
  const water = ships.reduce((total, ship) => total + ship.water, 0);
  const food = ships.reduce((total, ship) => total + ship.food, 0);
  const days = Math.floor(Math.min(water, food) / Math.max(crew, 1));
  if (days === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 59, "Harbor vendor")],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: [...shipSummary, "Projected endurance: 0 days."],
    });

  const message = days < 10 ? 60 : days <= 180 ? 61 : 58;
  const prompt = line(data, message, "Harbor vendor", [days]);
  const choice = path[1] && normalizedCommand(path[1]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [...shipSummary, `Projected endurance: ${days} days.`],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt],
      menu: [],
      effects: ["decline departure and return to the Harbor menu"],
      uncertainties: [],
      notes: [...shipSummary, `Projected endurance: ${days} days.`],
    });
  if (choice === "yes")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt],
      menu: [],
      effects: [
        "reset the current-voyage midnight counter to 0",
        "change the protagonist's fleet state to at sea",
        "initialize the departure position",
      ],
      uncertainties: [],
      notes: [
        ...shipSummary,
        `Projected endurance: ${days} days.`,
        "The pending 40-, 60-, or 80-minute Harbor visit duration is applied afterward; Sail adds no separate tick.",
      ],
    });
  return unavailableCommand(path, `Unknown Sail selection: ${path[1]}.`);
}

function churchCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const mosque = data.portTilesets[portId] === 2;
  const speaker = mosque ? "Imam" : "Priest";
  const offset = mosque ? 712 : 0;
  const selected = normalizedCommand(path[0]!);
  if (selected === "pray")
    return result(path, {
      confidence: "ambiguous",
      disposition: "completed",
      dialogue: [line(data, 92 + offset, speaker)],
      menu: ["Pray", "Donate"],
      effects: [],
      uncertainties: [
        "On the first Pray command of this visit, the general gameplay RNG adds either 0 or 1 Luck, capped at 100; that transient visit flag and RNG state are not saved.",
      ],
      notes: ["The command returns to the religious-building menu."],
    });
  if (selected !== "donate")
    return unavailableCommand(path, `Unknown religious command: ${path[0]}.`);

  const gold = inspectGold(save, slot);
  if (gold === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 28, "system")],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: ["The command returns to the religious-building menu."],
    });
  const prompt = line(data, 93 + offset, speaker);
  if (path[1] === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: [`Amount: 0–${gold}`],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (!/^\d+$/.test(path[1]!))
    return unavailableCommand(path, `Invalid donation amount: ${path[1]}.`);
  const amount = Number(path[1]);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > gold)
    return unavailableCommand(
      path,
      `Donation must be between 0 and the ${gold} gold currently carried.`,
    );
  if (amount === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt],
      menu: ["Pray", "Donate"],
      effects: ["return to the religious-building menu without donating"],
      uncertainties: [],
      notes: [],
    });

  const ratio = Math.floor(gold / amount);
  const generous = ratio <= 10;
  const dialogue = [prompt, line(data, (generous ? 95 : 94) + offset, speaker)];
  const base = slotOffset(slot);
  const luck =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x1b]!;
  const adjustedLuck = Math.min(100, luck - ratio + 11);
  const effects = [`deduct ${amount} gold`];
  const uncertainties: string[] = [];
  // Only the generous response evaluates Luck, after comparing the donation
  // with (random(5) + 1) * 100.
  if (generous && amount >= 500) effects.push(`set Luck to ${adjustedLuck}`);
  else if (generous && amount >= 100)
    uncertainties.push(
      `A general-RNG threshold may apply the donation's Luck adjustment, which would set Luck from ${luck} to ${adjustedLuck}.`,
    );
  return result(path, {
    confidence: uncertainties.length > 0 ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue,
    menu: ["Pray", "Donate"],
    effects,
    uncertainties,
    notes: ["The command returns to the religious-building menu."],
  });
}

function fortunePayment(
  save: Buffer,
  slot: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
):
  | OrdinaryCommandResult
  | {
      readonly prompt: OrdinaryDialogueLine;
      readonly introduction: OrdinaryDialogueLine;
    } {
  const prompt = line(data, 299, "Fortune teller");
  const choice = path[1] && normalizedCommand(path[1]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt],
      menu: ["Life", "Career", "Love", "Mates"],
      effects: ["decline the reading and return to the House of Fortune menu"],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(path, `Unknown Life selection: ${path[1]}.`);
  if (inspectGold(save, slot) < 50)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 300, "Fortune teller")],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: ["Insufficient gold ends the House of Fortune visit."],
    });
  return {
    prompt,
    introduction: line(data, 301, "Fortune teller"),
  };
}

function isCommandResult(
  value:
    | OrdinaryCommandResult
    | {
        readonly prompt: OrdinaryDialogueLine;
        readonly introduction: OrdinaryDialogueLine;
      },
): value is OrdinaryCommandResult {
  return "path" in value;
}

function fortuneLifeCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const payment = fortunePayment(save, slot, path, data);
  if (isCommandResult(payment)) return payment;
  const base = slotOffset(slot);
  const luck =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x1b]!;
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [
      payment.prompt,
      payment.introduction,
      line(data, 302 + Math.floor(luck / 25), "Fortune teller"),
    ],
    menu: ["Life", "Career", "Love", "Mates"],
    effects: ["deduct 50 gold"],
    uncertainties: [],
    notes: [`The reading uses Luck ${luck}.`],
  });
}

function levelThreshold(level: number): number {
  return 30 * Math.min(level, 18) ** 2;
}

function fortuneCareerCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const payment = fortunePayment(save, slot, path, data);
  if (isCommandResult(payment)) return payment;
  const base = slotOffset(slot);
  const sailor = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const navigationLevel = save[sailor + 0x1c]!;
  const battleLevel = save[sailor + 0x1d]!;
  const navigationExperience = save.readUInt16LE(sailor + 0x1e);
  const battleExperience = save.readUInt16LE(sailor + 0x20);
  const navigationRemaining =
    levelThreshold(navigationLevel) - navigationExperience;
  const battleRemaining = levelThreshold(battleLevel) - battleExperience;
  const dialogue = [
    payment.prompt,
    payment.introduction,
    line(data, 545, "Fortune teller", [navigationRemaining]),
    line(data, 546, "Fortune teller", [battleRemaining]),
  ];
  const affiliation = save[sailor + 0x29]! & 0x0f;
  const fame = inspectFame(save, slot, protagonistId);
  const highestFame = Math.max(fame.trade, fame.piracy, fame.adventure);
  const rank = inspectRank(save, slot, protagonistId);
  const titleThresholds = [
    500, 2_000, 4_500, 8_000, 12_500, 18_000, 24_500, 32_000, 40_000,
  ];
  const threshold = titleThresholds[rank];
  const uncertainties: string[] = [];
  if (affiliation !== PIRACY && threshold !== undefined)
    dialogue.push(
      highestFame >= threshold
        ? line(data, 754, "Fortune teller")
        : line(data, 547, "Fortune teller", [threshold - highestFame]),
    );
  else if (affiliation !== PIRACY)
    uncertainties.push(
      "The executable indexes beyond its nine next-title thresholds for a Duke; that malformed edge case is not rendered by the query.",
    );
  return result(path, {
    confidence: uncertainties.length > 0 ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue,
    menu: ["Life", "Career", "Love", "Mates"],
    effects: ["deduct 50 gold"],
    uncertainties,
    notes: [
      `Navigation: level ${navigationLevel}, experience ${navigationExperience}, ${navigationRemaining} remaining.`,
      `Battle: level ${battleLevel}, experience ${battleExperience}, ${battleRemaining} remaining.`,
      ...(affiliation === PIRACY
        ? ["The title portion is omitted for Pirate affiliation."]
        : [`Highest Fame: ${highestFame}.`]),
    ],
  });
}

function localWaitress(
  save: Buffer,
  slot: number,
  portId: number,
): { name: string; favor: number } | undefined {
  const base = slotOffset(slot) + WAITRESS_TABLE;
  for (let index = 0; index < WAITRESS_COUNT; index++) {
    const record = base + index * WAITRESS_RECORD_SIZE;
    const flags = save[record + 0x0f]!;
    if (
      save[record + 0x0b] === portId &&
      (flags & 0x08) !== 0 &&
      (flags & 0x40) === 0
    )
      return {
        name: cstring(save.subarray(record, record + 0x0b)),
        favor: save[record + 0x0c]!,
      };
  }
  return undefined;
}

interface PubWaitress {
  readonly record: number;
  readonly name: string;
  readonly favor: number;
  readonly flags: number;
  readonly preference: number;
}

function pubWaitress(
  save: Buffer,
  slot: number,
  portId: number,
): PubWaitress | undefined {
  const base = slotOffset(slot) + WAITRESS_TABLE;
  for (let index = 0; index < WAITRESS_COUNT; index++) {
    const record = base + index * WAITRESS_RECORD_SIZE;
    if (save[record + 0x0b] !== portId) continue;
    const flags = save[record + 0x0f]!;
    return {
      record,
      name: cstring(save.subarray(record, record + 0x0b)),
      favor: save[record + 0x0c]!,
      flags,
      preference: (flags & 0x30) >>> 4,
    };
  }
  return undefined;
}

function pubSpecialty(
  save: Buffer,
  slot: number,
  portId: number,
): { name: string; price: number; specialtyId: number } {
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const specialtyId = save[metadata + 0x26]!;
  return {
    name: PUB_SPECIALTIES[specialtyId] ?? `specialty ${specialtyId}`,
    price: PUB_SPECIALTY_PRICES[specialtyId] ?? 1,
    specialtyId,
  };
}

function fortuneLoveCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const payment = fortunePayment(save, slot, path, data);
  if (isCommandResult(payment)) return payment;
  const waitress = localWaitress(save, slot, portId);
  const reading = !waitress
    ? line(data, 329, "Fortune teller")
    : waitress.favor >= 80
      ? line(data, 326, "Fortune teller", [waitress.name])
      : waitress.favor >= 50
        ? line(data, 327, "Fortune teller")
        : line(data, 328, "Fortune teller");
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [payment.prompt, payment.introduction, reading],
    menu: ["Life", "Career", "Love", "Mates"],
    effects: ["deduct 50 gold"],
    uncertainties: [],
    notes: waitress
      ? [`${waitress.name}'s favor is ${waitress.favor}.`]
      : ["No eligible waitress record exists at this port."],
  });
}

function selectedMate(
  save: Buffer,
  slot: number,
  selector: string | undefined,
): number | undefined {
  if (!selector) return undefined;
  const base = slotOffset(slot);
  const mates = Array.from(
    save.subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT),
  ).filter((id) => id !== 0xff);
  const numeric = /^(?:mate-?)?(\d+)$/i.exec(selector);
  if (numeric) return mates[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return mates.find(
    (id) => normalizedCommand(sailorName(save, slot, id)) === normalized,
  );
}

function fortuneMatesCommand(
  save: Buffer,
  slot: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const payment = fortunePayment(save, slot, path, data);
  if (isCommandResult(payment)) return payment;
  const base = slotOffset(slot);
  const mates = Array.from(
    save.subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT),
  ).filter((id) => id !== 0xff);
  const mate = selectedMate(save, slot, path[2]);
  if (mate === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: path[2] ? "unavailable" : "shown",
      dialogue: [
        payment.prompt,
        payment.introduction,
        line(data, 792, "Fortune teller"),
      ],
      menu: mates.map(
        (id, index) => `${index + 1}: ${sailorName(save, slot, id)}`,
      ),
      effects: ["deduct 50 gold"],
      uncertainties: [],
      notes: path[2] ? [`Unknown employed-mate selector: ${path[2]}.`] : [],
    });
  const sailor = base + SAILOR_TABLE + mate * SAILOR_RECORD_SIZE;
  const luck = save[sailor + 0x1b]!;
  const loyalty = save[sailor + 0x23]!;
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [
      payment.prompt,
      payment.introduction,
      line(data, 792, "Fortune teller"),
      line(data, 78 + Math.floor(luck / 25), "Fortune teller"),
      line(data, 793 + Math.floor(loyalty / 25), "Fortune teller"),
    ],
    menu: ["Life", "Career", "Love", "Mates"],
    effects: ["deduct 50 gold"],
    uncertainties: [],
    notes: [
      `${sailorName(save, slot, mate)}: Luck ${luck}, Loyalty ${loyalty}.`,
    ],
  });
}

const SUPPLY_RESOURCES = {
  water: { index: 0, prompt: 62, unit: "barrels" },
  food: { index: 1, prompt: 63, unit: "barrels" },
  lumber: { index: 2, prompt: 64, unit: "planks" },
  shot: { index: 3, prompt: 65, unit: "barrels" },
} as const;

function supplyAmount(
  ship: HarborShip,
  resource: keyof typeof SUPPLY_RESOURCES,
) {
  if (resource === "water") return Math.floor(ship.water / 10);
  if (resource === "food") return Math.floor(ship.food / 10);
  return ship[resource];
}

function supplyPrice(
  save: Buffer,
  slot: number,
  portId: number,
  resource: keyof typeof SUPPLY_RESOURCES,
): number | undefined {
  if (resource === "water") return 0;
  if (portId >= 100) return undefined;
  const port =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const basePrice = resource === "food" ? 20 : resource === "lumber" ? 90 : 120;
  const modifier = save[port + (resource === "lumber" ? 0x19 : 0x12)]!;
  return Math.floor((basePrice * (modifier + 50)) / 100);
}

function supplyCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const ships = harborShips(save, slot, protagonistId);
  const mode = path[1] && normalizedCommand(path[1]);
  if (!mode)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [line(data, 1394, "Harbor vendor")],
      menu: ["Load", "Dump"],
      effects: [],
      uncertainties: [],
      notes: [
        "Choose load or dump, followed by a displayed ship number, resource, and optional quantity.",
      ],
    });
  if (mode !== "load" && mode !== "dump")
    return unavailableCommand(path, `Unknown Supply mode: ${path[1]}.`);
  const ship = selectedShip(ships, path[2]);
  if (!ship)
    return result(path, {
      confidence: "decoded",
      disposition: path[2] ? "unavailable" : "shown",
      dialogue: [line(data, 1394, "Harbor vendor")],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: path[2] ? [`Unknown active ship selector: ${path[2]}.`] : [],
    });
  const resourceName = path[3] && normalizedCommand(path[3]);
  if (!resourceName || !Object.hasOwn(SUPPLY_RESOURCES, resourceName))
    return result(path, {
      confidence: "decoded",
      disposition: path[3] ? "unavailable" : "shown",
      dialogue: [],
      menu: Object.keys(SUPPLY_RESOURCES),
      effects: [],
      uncertainties: [],
      notes: path[3] ? [`Unknown supply resource: ${path[3]}.`] : [],
    });
  const resource = resourceName as keyof typeof SUPPLY_RESOURCES;
  const descriptor = SUPPLY_RESOURCES[resource];
  const price = supplyPrice(save, slot, portId, resource);
  if (mode === "load" && price === undefined)
    return result(path, {
      confidence: "ambiguous",
      disposition: "unsupported",
      dialogue: [],
      menu: [],
      effects: [],
      uncertainties: [
        "At a supply port, Food, Lumber, and Shot prices use the regular-port metadata pointer retained by the running executable. That process history is not stored in the save.",
      ],
      notes: [
        "Water is free and remains exactly resolvable. Dumping any resource also does not require a price.",
      ],
    });
  const unitPrice = price ?? 0;
  let maximum: number;
  let prompt: OrdinaryDialogueLine;
  if (mode === "load") {
    const freeCapacity = Math.max(0, ship.cargoCapacity - ship.usedCapacity);
    if (unitPrice > 0 && Math.floor(inspectGold(save, slot) / unitPrice) === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 28, "Harbor vendor")],
        menu: [],
        effects: [],
        uncertainties: [],
        notes: [
          `${ship.name || "The selected ship"} has ${freeCapacity} cargo space remaining.`,
        ],
      });
    maximum =
      unitPrice === 0
        ? freeCapacity
        : Math.min(
            freeCapacity,
            Math.floor(inspectGold(save, slot) / unitPrice),
          );
    prompt = line(
      data,
      descriptor.prompt,
      "Harbor vendor",
      unitPrice === 0 ? [maximum] : [unitPrice, maximum],
    );
  } else {
    maximum = supplyAmount(ship, resource);
    prompt = line(data, 1392, "Harbor vendor", [descriptor.unit, maximum]);
  }
  if (path[4] === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: [`Quantity: 0–${maximum}`],
      effects: [],
      uncertainties: [],
      notes: [
        `${ship.name || "Selected ship"}: capacity ${ship.cargoCapacity}, occupied ${ship.usedCapacity}.`,
      ],
    });
  if (!/^\d+$/.test(path[4]!))
    return unavailableCommand(path, `Invalid supply quantity: ${path[4]}.`);
  const quantity = Number(path[4]);
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > maximum)
    return unavailableCommand(
      path,
      `Quantity must be between 0 and the calculated maximum ${maximum}.`,
    );
  const effects =
    quantity === 0
      ? ["return to the Supply grid without changing cargo"]
      : mode === "load"
        ? [
            `add ${quantity} ${descriptor.unit} of ${resource} to ${ship.name || "the selected ship"}`,
            ...(unitPrice === 0 ? [] : [`deduct ${quantity * unitPrice} gold`]),
          ]
        : [
            `remove ${quantity} ${descriptor.unit} of ${resource} from ${ship.name || "the selected ship"}`,
          ];
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [prompt],
    menu: ["Supply grid"],
    effects,
    uncertainties: [],
    notes: [
      `${ship.name || "Selected ship"}: capacity ${ship.cargoCapacity}, occupied ${ship.usedCapacity}.`,
    ],
  });
}

function moorCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const active = harborShips(save, slot, protagonistId);
  const secondary = active.filter((ship) => ship.captainId !== protagonistId);
  const dock = dockedShips(save, slot, portId);
  const opening = [
    line(data, 1395, "Harbor vendor"),
    dock.ships.length > 0
      ? line(data, 276, "Harbor vendor", [dock.ships.length, dock.capacity])
      : line(data, 277, "Harbor vendor", [dock.capacity]),
  ];
  const operation = path[1] && normalizedCommand(path[1]);
  if (!operation)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: opening,
      menu: ["Store", "Commission", "Exchange"],
      effects: [],
      uncertainties: [],
      notes: [],
    });

  if (operation === "store") {
    if (secondary.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...opening, line(data, 279, "Harbor vendor")],
        menu: [],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (dock.ships.length === dock.capacity)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...opening, line(data, 288, "Harbor vendor")],
        menu: [],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const ship = selectedShip(secondary, path[2]);
    if (!ship)
      return result(path, {
        confidence: "decoded",
        disposition: path[2] ? "unavailable" : "shown",
        dialogue: [...opening, line(data, 280, "Harbor vendor")],
        menu: secondary.map(shipLabel),
        effects: [],
        uncertainties: [],
        notes: path[2] ? [`Unknown secondary ship selector: ${path[2]}.`] : [],
      });
    const confirmation =
      ship.crew > 0
        ? line(data, 281, "Harbor vendor", [ship.crew])
        : line(data, 201, "Harbor vendor");
    const choice = path[3] && normalizedCommand(path[3]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [...opening, line(data, 280, "Harbor vendor"), confirmation],
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [...opening, confirmation],
        menu: secondary.map(shipLabel),
        effects: ["decline storage and return to the Store ship list"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(path, `Unknown Store selection: ${path[3]}.`);
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [...opening, confirmation, line(data, 282, "Harbor vendor")],
      menu: ["Store", "Commission", "Exchange"],
      effects: [
        `store ${ship.name || "the selected ship"} at port ${portId}`,
        `dismiss its ${ship.crew} crew`,
        `make ${sailorName(save, slot, ship.captainId)} an unassigned mate`,
        "preserve the ship's provisions and cargo",
      ],
      uncertainties: [],
      notes: [],
    });
  }

  if (operation === "commission") {
    if (dock.ships.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...opening, line(data, 283, "Harbor vendor")],
        menu: [],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const base = slotOffset(slot);
    const roster = Array.from(
      save.subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT),
    ).filter((id) => id !== 0xff);
    if (active.length === Math.min(10, roster.length + 1))
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...opening, line(data, 285, "Harbor vendor")],
        menu: [],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const ship = selectedShip(dock.ships, path[2]);
    if (!ship)
      return result(path, {
        confidence: "decoded",
        disposition: path[2] ? "unavailable" : "shown",
        dialogue: [...opening, line(data, 284, "Harbor vendor")],
        menu: dock.ships.map(shipLabel),
        effects: [],
        uncertainties: [],
        notes: path[2] ? [`Unknown docked ship selector: ${path[2]}.`] : [],
      });
    const choice = path[3] && normalizedCommand(path[3]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [
          ...opening,
          line(data, 284, "Harbor vendor"),
          line(data, 201, "Harbor vendor"),
        ],
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [...opening, line(data, 201, "Harbor vendor")],
        menu: dock.ships.map(shipLabel),
        effects: ["decline commissioning and return to the docked-ship list"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown Commission selection: ${path[3]}.`,
      );
    const protagonistAvailable = !active.some(
      (activeShip) => activeShip.captainId === protagonistId,
    );
    const captainId = protagonistAvailable
      ? protagonistId
      : roster.find(
          (id) =>
            save[base + SAILOR_TABLE + id * SAILOR_RECORD_SIZE + 0x26]! > 2,
        );
    return result(path, {
      confidence: captainId === undefined ? "ambiguous" : "decoded",
      disposition: "completed",
      dialogue: [
        ...opening,
        line(data, 201, "Harbor vendor"),
        line(data, 286, "Harbor vendor"),
      ],
      menu: ["Store", "Commission", "Exchange"],
      effects: [
        `commission ${ship.name || "the selected ship"} into the first free active-fleet slot`,
        ...(captainId === undefined
          ? ["assign the first available mate as captain"]
          : [`assign ${sailorName(save, slot, captainId)} as captain`]),
        "retain the ship's provisions and cargo with zero crew",
      ],
      uncertainties:
        captainId === undefined
          ? [
              "The roster count implies a spare captain, but no available duty record was identified.",
            ]
          : [],
      notes: [],
    });
  }

  if (operation === "exchange") {
    if (dock.ships.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...opening, line(data, 283, "Harbor vendor")],
        menu: [],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const outgoing = selectedShip(secondary, path[2]);
    if (!outgoing)
      return result(path, {
        confidence: "decoded",
        disposition: path[2] ? "unavailable" : "shown",
        dialogue: [...opening, line(data, 280, "Harbor vendor")],
        menu: secondary.map(shipLabel),
        effects: [],
        uncertainties: [],
        notes: path[2] ? [`Unknown secondary ship selector: ${path[2]}.`] : [],
      });
    const incoming = selectedShip(dock.ships, path[3]);
    if (!incoming)
      return result(path, {
        confidence: "decoded",
        disposition: path[3] ? "unavailable" : "shown",
        dialogue: [...opening, line(data, 284, "Harbor vendor")],
        menu: dock.ships.map(shipLabel),
        effects: [],
        uncertainties: [],
        notes: path[3] ? [`Unknown docked ship selector: ${path[3]}.`] : [],
      });
    const excess = Math.max(0, outgoing.crew - incoming.configuredCrew);
    const confirmation =
      excess > 0
        ? line(data, 281, "Harbor vendor", [excess])
        : line(data, 201, "Harbor vendor");
    const choice = path[4] && normalizedCommand(path[4]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [...opening, confirmation],
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [...opening, confirmation],
        menu: secondary.map(shipLabel),
        effects: ["decline the exchange and return to the active-ship list"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown Exchange selection: ${path[4]}.`,
      );
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [...opening, confirmation, line(data, 287, "Harbor vendor")],
      menu: ["Store", "Commission", "Exchange"],
      effects: [
        `commission ${incoming.name || "the selected docked ship"} and store ${outgoing.name || "the selected active ship"}`,
        `transfer ${sailorName(save, slot, outgoing.captainId)} as captain`,
        `transfer ${Math.min(outgoing.crew, incoming.configuredCrew)} crew${excess > 0 ? ` and dismiss ${excess}` : ""}`,
        "keep each physical ship's provisions and cargo with that hull",
      ],
      uncertainties: [],
      notes: [],
    });
  }

  return unavailableCommand(path, `Unknown Moor command: ${path[1]}.`);
}

function bankBalance(save: Buffer, slot: number): number {
  const base = slotOffset(slot);
  return (
    save.readInt16LE(base + BANK_ACCOUNT_HUNDREDS) * 100 +
    save[base + BANK_ACCOUNT_REMAINDER]!
  );
}

function bankAmount(
  path: readonly string[],
  maximum: number,
): number | OrdinaryCommandResult | undefined {
  if (path[1] === undefined) return undefined;
  if (!/^\d+$/.test(path[1]!))
    return unavailableCommand(path, `Invalid Bank amount: ${path[1]}.`);
  const amount = Number(path[1]);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum)
    return unavailableCommand(
      path,
      `Amount must be between 0 and the calculated maximum ${maximum}.`,
    );
  return amount;
}

function bankCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const command = normalizedCommand(path[0]!);
  const speaker = "Bank representative";
  const gold = inspectGold(save, slot);
  const balance = bankBalance(save, slot);

  if (command === "deposit") {
    if (gold <= 1_000)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 100, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [`On-hand gold: ${gold}.`],
      });
    if (balance >= BANK_SAVINGS_LIMIT)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 101, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [`Savings balance: ${balance}.`],
      });
    if (balance < 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 102, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [`Outstanding debt: ${-balance}.`],
      });
    const maximum = Math.min(gold, BANK_SAVINGS_LIMIT - balance);
    const amount = bankAmount(path, maximum);
    if (typeof amount !== "number")
      return (
        amount ??
        result(path, {
          confidence: "decoded",
          disposition: "shown",
          dialogue: [
            line(data, balance === 0 ? 104 : 103, speaker, [balance]),
            line(data, 105, speaker, [maximum]),
          ],
          menu: [`Amount: 0–${maximum}`],
          effects: [],
          uncertainties: [],
          notes: [],
        })
      );
    if (amount === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [line(data, 105, speaker, [maximum])],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: ["return to the Bank menu without depositing"],
        uncertainties: [],
        notes: [],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 105, speaker, [maximum]),
        line(data, 106, speaker, [amount]),
        line(data, 103, speaker, [balance + amount]),
      ],
      menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
      effects: [
        `deduct ${amount} gold`,
        `set savings balance to ${balance + amount}`,
      ],
      uncertainties: [],
      notes: [],
    });
  }

  if (command === "withdraw") {
    if (balance <= 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 104, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [
          balance < 0
            ? `Outstanding debt: ${-balance}.`
            : "The account is empty.",
        ],
      });
    if (GOLD_CARRYING_LIMIT - gold < 100)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 107, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [`On-hand gold: ${gold}.`],
      });
    const amount = bankAmount(path, balance);
    if (typeof amount !== "number")
      return (
        amount ??
        result(path, {
          confidence: "decoded",
          disposition: "shown",
          dialogue: [
            line(data, 103, speaker, [balance]),
            line(data, 108, speaker, [balance]),
          ],
          menu: [`Amount: 0–${balance}`],
          effects: [],
          uncertainties: [],
          notes: [],
        })
      );
    if (amount === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [line(data, 108, speaker, [balance])],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: ["return to the Bank menu without withdrawing"],
        uncertainties: [],
        notes: [],
      });
    if (gold + amount > GOLD_CARRYING_LIMIT)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [
          line(data, 108, speaker, [balance]),
          line(data, 109, speaker),
        ],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [
          `The requested withdrawal would produce ${gold + amount} on-hand gold.`,
        ],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 108, speaker, [balance]),
        line(data, 110, speaker, [amount]),
        line(data, 103, speaker, [balance - amount]),
      ],
      menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
      effects: [
        `add ${amount} gold`,
        `set savings balance to ${balance - amount}`,
      ],
      uncertainties: [],
      notes: [],
    });
  }

  if (command === "borrow") {
    if (balance > 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 111, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [`Savings balance: ${balance}.`],
      });
    const rank = inspectRank(save, slot, protagonistId);
    const creditLine = rank ** 2 * 10_000 + balance + 1_000;
    if (creditLine <= 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 113, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [
          `Rank ${rank}, account balance ${balance}, calculated credit line ${creditLine}.`,
        ],
      });
    if (gold >= 1_000_000)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 112, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [`On-hand gold: ${gold}.`],
      });
    const amount = bankAmount(path, creditLine);
    if (typeof amount !== "number")
      return (
        amount ??
        result(path, {
          confidence: "decoded",
          disposition: "shown",
          dialogue: [
            line(data, 114, speaker, [creditLine]),
            line(data, 115, speaker, [creditLine]),
          ],
          menu: [`Amount: 0–${creditLine}`],
          effects: [],
          uncertainties: [],
          notes: [`Rank ${rank}; current account balance ${balance}.`],
        })
      );
    if (amount === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [line(data, 115, speaker, [creditLine])],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: ["return to the Bank menu without borrowing"],
        uncertainties: [],
        notes: [],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 115, speaker, [creditLine]),
        line(data, 116, speaker, [amount]),
        line(data, 117, speaker),
      ],
      menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
      effects: [
        `add ${amount} gold`,
        `set account balance to ${balance - amount}`,
      ],
      uncertainties: [],
      notes: ["The outstanding debt accrues 10% monthly interest."],
    });
  }

  if (command === "repay") {
    if (balance >= 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 118, speaker)],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const debt = -balance;
    const maximum = Math.min(debt, gold);
    const amount = bankAmount(path, maximum);
    if (typeof amount !== "number")
      return (
        amount ??
        result(path, {
          confidence: "decoded",
          disposition: "shown",
          dialogue: [
            line(data, 149, speaker, [debt]),
            line(data, 119, speaker, [maximum]),
          ],
          menu: [`Amount: 0–${maximum}`],
          effects: [],
          uncertainties: [],
          notes: [`On-hand gold: ${gold}.`],
        })
      );
    if (amount === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [line(data, 119, speaker, [maximum])],
        menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
        effects: ["return to the Bank menu without repaying"],
        uncertainties: [],
        notes: [],
      });
    const nextBalance = balance + amount;
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 119, speaker, [maximum]),
        line(data, 120, speaker),
        ...(nextBalance < 0
          ? [line(data, 149, speaker, [-nextBalance]), line(data, 117, speaker)]
          : [line(data, 382, speaker)]),
      ],
      menu: ["Deposit", "Withdraw", "Borrow", "Repay"],
      effects: [
        `deduct ${amount} gold`,
        `set account balance to ${nextBalance}`,
      ],
      uncertainties: [],
      notes:
        nextBalance < 0
          ? ["The remaining debt continues to accrue 10% monthly interest."]
          : [],
    });
  }

  return unavailableCommand(path, `Unknown Bank command: ${path[0]}.`);
}

function lodgePortInfoCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
): OrdinaryCommandResult {
  const base = slotOffset(slot);
  const metadata =
    base + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const supports = NATION_NAMES.map(
    (nation, index) => `${nation}: ${save[metadata + 0x0a + index]}%`,
  );
  const controller =
    save[base + PORT_TABLE + portId * PORT_RECORD_SIZE + PORT_CONTROLLER]! & 7;
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [],
    menu: ["Check In", "Gossip", "Port Info"],
    effects: ["display the generated Port Info screen"],
    uncertainties: [],
    notes: [
      `Controller: ${NATION_NAMES[controller] ?? `nation ${controller}`}.`,
      ...supports,
    ],
  });
}

function sailorTreatCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  sailor: LocalSailor,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const menu = ["Treat", "Gossip", "Hire", "Duel"];
  const specialty = pubSpecialty(save, slot, portId);
  const gold = inspectGold(save, slot);
  if (gold < specialty.price)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 76, sailor.name)],
      menu,
      effects: [],
      uncertainties: [],
      notes: [
        `${specialty.name} costs ${specialty.price} gold; on-hand gold is ${gold}.`,
      ],
    });

  const base = slotOffset(slot);
  // After payment, active shared state with variable 6 equal to 11 or 5 and
  // variable 17 naming this patron replaces the ordinary Treat response.
  const sharedVariable = (index: number) =>
    save.readUInt16LE(base + SHARED_VARIABLES_START + index * 2);
  const sharedJob = sharedVariable(6);
  if (
    save[base + SHARED_SCENARIO_START] !== 0 &&
    (sharedJob === 11 || sharedJob === 5) &&
    (sharedVariable(17) & 0xff) === sailor.id &&
    sharedVariable(18) !== 0
  )
    return result(path, {
      confidence: "decoded",
      disposition: "unsupported",
      dialogue: [],
      menu,
      effects: [`deduct ${specialty.price} gold`],
      uncertainties: [
        `Shared assignment handler ${sharedJob === 11 ? "0x2BF2A" : "0x2C021"} replaces the ordinary Treat response and Loyalty change.`,
      ],
      notes: [`${specialty.name} costs ${specialty.price} gold.`],
    });

  const protagonist = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const personality = save[sailor.record + 0x27]!;
  const matchingPersonality =
    (save[protagonist + 0x27]! & 3) === (personality & 3);
  const gain = 6 * (personality & 0x40 ? 2 : 1) * (matchingPersonality ? 3 : 1);
  const loyalty = save[sailor.record + 0x23]!;
  const nextLoyalty = Math.min(100, loyalty + gain);
  // Hostile fleet captains answer with raw 861 instead of 44 or 45.
  const dialogue = [
    line(
      data,
      sailor.pirateCaptain ? 861 : matchingPersonality ? 44 : 45,
      sailor.name,
    ),
  ];
  let bestIndex = 0;
  for (let index = 1; index < SAILOR_ABILITY_NAMES.length; index++)
    if (
      save[sailor.record + 0x14 + index]! >
      save[sailor.record + 0x14 + bestIndex]!
    )
      bestIndex = index;
  const best = save[sailor.record + 0x14 + bestIndex]!;
  if (nextLoyalty > 30 && best > 75)
    dialogue.push(
      line(data, 46, sailor.name),
      line(data, 139, sailor.name, [SAILOR_ABILITY_NAMES[bestIndex]!]),
    );
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue,
    menu,
    effects: [
      `deduct ${specialty.price} gold`,
      `raise ${sailor.name}'s Loyalty from ${loyalty} to ${nextLoyalty}`,
    ],
    uncertainties: [],
    notes: [
      `${specialty.name} costs ${specialty.price} gold.`,
      `Loyalty gain: 6 × ${personality & 0x40 ? 2 : 1} × ${matchingPersonality ? "3 (matching personality)" : "1 (different personality)"} = ${gain}.`,
    ],
  });
}

function sailorInteractionCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  pub: boolean,
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const sailors = localSailors(save, slot, protagonistId, portId, pub, data);
  const mainMenu = pub
    ? ["Recruit Crew", "Dismiss Crew", "Treat", "Meet", "Waitress", "Gamble"]
    : ["Check In", "Gossip", "Port Info"];
  if (sailors.length === 0) {
    const pubHasSailor =
      !pub &&
      localSailors(save, slot, protagonistId, portId, true, data).length > 0;
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        line(
          data,
          pub ? 39 : pubHasSailor ? 68 : 67,
          pub ? "Pub vendor" : "Lodge vendor",
        ),
      ],
      menu: mainMenu,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  }

  const sailor = selectedLocalSailor(sailors, path[1]);
  if (!sailor)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [],
      menu: sailors.map((entry, index) => `${index + 1}: ${entry.name}`),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown local-sailor selector: ${path[1]}.`] : [],
    });

  const introduction = sailorIntroduction(save, slot, sailor, pub, data);
  if (sailor.ownMate)
    return result(path, {
      confidence: "ambiguous",
      disposition: "completed",
      dialogue: introduction.dialogue,
      menu: sailors.map((entry, index) => `${index + 1}: ${entry.name}`),
      effects: [],
      uncertainties: introduction.uncertainties,
      notes: [
        "An employed mate gives a short greeting and does not open the sailor submenu.",
      ],
    });

  const action = path[2] && normalizedCommand(path[2]);
  if (!action)
    return result(path, {
      confidence: introduction.uncertainties.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: introduction.dialogue,
      menu: introduction.menu,
      effects: [],
      uncertainties: introduction.uncertainties,
      notes: [],
    });
  if (!introduction.menu.some((entry) => normalizedCommand(entry) === action))
    return unavailableCommand(
      path,
      `${path[2]} is not available for ${sailor.name}.`,
    );
  if (action === "hire") {
    const hired = sailorHireCommand(
      save,
      slot,
      protagonistId,
      sailor,
      pub,
      path,
      3,
      data,
    );
    return {
      ...hired,
      dialogue: [...introduction.dialogue, ...hired.dialogue],
      uncertainties: [...introduction.uncertainties, ...hired.uncertainties],
    };
  }
  if (action === "treat") {
    const treated = sailorTreatCommand(
      save,
      slot,
      protagonistId,
      portId,
      sailor,
      path,
      data,
    );
    return {
      ...treated,
      dialogue: [...introduction.dialogue, ...treated.dialogue],
      uncertainties: [...introduction.uncertainties, ...treated.uncertainties],
    };
  }
  if (action === "gossip")
    return result(path, {
      confidence: "ambiguous",
      disposition: "completed",
      dialogue: introduction.dialogue,
      menu: introduction.menu,
      effects: [
        "select a nearby port and report either a navigator there or that none is available",
      ],
      uncertainties: [
        ...introduction.uncertainties,
        "The navigator rumor uses the unsaved general RNG, so the selected port and raw message 570/571 cannot be recovered from the save.",
      ],
      notes: [],
    });
  if (action === "duel")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: introduction.dialogue,
      menu: [],
      effects: [`enter the duel engine against ${sailor.name}`],
      uncertainties: [
        ...introduction.uncertainties,
        "The duel result depends on combat selections and gameplay RNG after this dialogue route.",
      ],
      notes: [],
    });
  return unavailableCommand(path, `Unknown sailor command: ${path[2]}.`);
}

// Pub entry resets the visit's enthusiasm to protagonist Charm / 3.
function pubAtmosphere(
  save: Buffer,
  slot: number,
  protagonistId: number,
): number {
  const protagonist =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  return Math.floor(save[protagonist + 0x1a]! / 3);
}

function pubRecruitCrewCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "First mate";
  const ships = harborShips(save, slot, protagonistId);
  const freeCapacity = ships.reduce(
    (sum, ship) => sum + Math.max(0, ship.configuredCrew - ship.crew),
    0,
  );
  if (freeCapacity === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 29, speaker)],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const gold = inspectGold(save, slot);
  if (gold < 10)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 30, speaker)],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: [`On-hand gold: ${gold}.`],
    });

  const atmosphere = pubAtmosphere(save, slot, protagonistId);
  let amountIndex = 1;
  const opening: OrdinaryDialogueLine[] = [];
  if (atmosphere < 30) {
    opening.push(line(data, 31, speaker), line(data, 32, speaker));
    const choice = path[1] && normalizedCommand(path[1]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: opening,
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [`Current Pub enthusiasm: ${atmosphere}.`],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: opening,
        menu: MENUS[0x01]!,
        effects: ["return to the Pub menu without recruiting"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown Recruit Crew choice: ${path[1]}.`,
      );
    amountIndex = 2;
  }

  const base = slotOffset(slot);
  const metadata =
    base + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const economy = save.readUInt16LE(metadata + 2);
  const available = Math.min(
    Math.floor((atmosphere * economy) / 500),
    (inspectRank(save, slot, protagonistId) + 1) * atmosphere,
  );
  const price = Math.floor(economy / 20) + 5;
  const maximum = Math.min(available, freeCapacity, Math.floor(gold / price));
  const offer = [line(data, 33, speaker)];
  if (available >= 20) offer.push(line(data, 121, speaker, [available]));
  else if (available > 0)
    offer.push(
      line(data, 122, speaker, [available, available === 1 ? "man" : "men"]),
    );
  else offer.push(line(data, 123, speaker));
  if (available === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [...opening, ...offer],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: [`Current Pub enthusiasm: ${atmosphere}.`],
    });
  offer.push(
    line(data, 124, speaker, [price]),
    line(data, 125, speaker, [maximum]),
  );
  const rawAmount = path[amountIndex];
  if (rawAmount === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [...opening, ...offer],
      menu: [`Amount: 0–${maximum}`],
      effects: [],
      uncertainties: [],
      notes: [`Fleet-wide free crew capacity: ${freeCapacity}.`],
    });
  if (!/^\d+$/.test(rawAmount) || Number(rawAmount) > maximum)
    return unavailableCommand(
      path,
      `Crew amount must be between 0 and ${maximum}.`,
    );
  const amount = Number(rawAmount);
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [...opening, ...offer],
    menu: [],
    effects:
      amount === 0
        ? ["return to the Pub menu without recruiting"]
        : [
            `deduct ${amount * price} gold`,
            `open the fleet crew-assignment screen with ${amount} newly recruited sailors`,
          ],
    uncertainties: [],
    notes: [
      `Available recruits: min(floor(${atmosphere} × ${economy} / 500), (rank + 1) × ${atmosphere}) = ${available}.`,
      "The final per-ship distribution is an interactive crew-assignment screen, not a dialogue selection.",
    ],
  });
}

function pubTreatCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const specialty = pubSpecialty(save, slot, portId);
  const gold = inspectGold(save, slot);
  const maximum = Math.min(50, Math.floor(gold / specialty.price));
  const prompt = line(data, 19, "Pub vendor", [
    specialty.name,
    specialty.price,
    specialty.price === 1 ? "piece" : "pieces",
  ]);
  if (maximum === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 28, "First mate")],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (path[1] === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: [`Bottles: 0–${maximum}`],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (!/^\d+$/.test(path[1]!) || Number(path[1]) > maximum)
    return unavailableCommand(
      path,
      `Bottle count must be between 0 and ${maximum}.`,
    );
  const amount = Number(path[1]);
  if (amount === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt],
      menu: MENUS[0x01]!,
      effects: ["return to the Pub menu without buying a treat"],
      uncertainties: [],
      notes: [],
    });
  const names = protagonistNames(save, slot, protagonistId);
  const fame = inspectFame(save, slot, protagonistId);
  const highest = Math.max(fame.trade, fame.piracy, fame.adventure);
  const rank = inspectRank(save, slot, protagonistId);
  const response =
    highest < 1_000
      ? line(data, 36, "Pub patron")
      : highest < 5_000
        ? line(data, 132, "Pub patron", [
            RANK_NAMES[rank] ?? `Rank ${rank}`,
            names.first,
            names.last,
          ])
        : line(data, 133, "Pub patron", [names.first, names.last]);
  const base = slotOffset(slot);
  const sharedFlags = save.readUInt32LE(base + 0xbc);
  const invitation =
    save[base + SHARED_SCENARIO_START] === 0 &&
    (sharedFlags & ((1 << 16) | (1 << 17))) !== 0 &&
    (sharedFlags & (1 << 18)) === 0;
  const protagonist = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const affiliation = save[protagonist + SAILOR_AFFILIATION]! & 7;
  const invitationLine =
    invitation && affiliation < NATION_NAMES.length
      ? [line(data, 410 + affiliation, "Pub patron")]
      : [];
  const metadata =
    base + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const economy = save.readUInt16LE(metadata + 2);
  const charm = save[protagonist + 0x1a]!;
  const treatStrength = Math.floor((amount * 200) / economy);
  const oldAtmosphere = pubAtmosphere(save, slot, protagonistId);
  const nextAtmosphere = Math.min(
    100,
    oldAtmosphere + Math.floor((treatStrength * charm) / 10),
  );
  return result(path, {
    confidence: invitation ? "decoded" : "ambiguous",
    disposition: "completed",
    dialogue: [prompt, response, ...invitationLine],
    menu: MENUS[0x01]!,
    effects: [
      `deduct ${amount * specialty.price} gold`,
      `set the current Pub enthusiasm from ${oldAtmosphere} to ${nextAtmosphere}`,
      ...(invitation
        ? ["announce the ruler's invitation and set shared scenario flag 17"]
        : []),
    ],
    uncertainties: invitation
      ? []
      : [
          "After the fame response, optional patron rumors and quest hooks use executable state and the unsaved general RNG.",
        ],
    notes: [
      `Highest Fame: ${highest}.`,
      `Treat cost: ${amount} × ${specialty.price} = ${amount * specialty.price} gold.`,
      `Enthusiasm gain: floor(floor(${amount} × 200 / ${economy}) × Charm ${charm} / 10).`,
    ],
  });
}

function selectedDiscovery(
  entries: readonly DiscoveryRecord[],
  selector: string | undefined,
): DiscoveryRecord | undefined {
  if (!selector) return undefined;
  const numeric = /^(?:discovery-?)?(\d+)$/i.exec(selector);
  if (numeric) return entries[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return entries.find((entry) => normalizedCommand(entry.name) === normalized);
}

function pubWaitressCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const waitress = pubWaitress(save, slot, portId);
  if (!waitress)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: ["This Pub has no named waitress record."],
    });
  const introduction = line(data, 146, "Pub vendor", [waitress.name]);
  if (inspectGold(save, slot) < 10)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [introduction, line(data, 147, "First mate")],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const menu = ["Tell Stories", "Give Gift", "Investigation", "Ask Info"];
  const command = path[1] && normalizedCommand(path[1]);
  if (!command)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [introduction],
      menu,
      effects: ["deduct the 10-gold waitress tip"],
      uncertainties: [],
      notes: [`${waitress.name}'s current favor is ${waitress.favor}.`],
    });
  if (!menu.some((entry) => normalizedCommand(entry) === command))
    return unavailableCommand(path, `Unknown Waitress command: ${path[1]}.`);

  if (command === "tellstories") {
    const available = discoveries(save, slot, data).filter(
      (entry) => (entry.flags & 0x80) === 0 && (entry.flags & 0x20) !== 0,
    );
    if (available.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [introduction, line(data, 312, waitress.name)],
        menu,
        effects: ["deduct the 10-gold waitress tip"],
        uncertainties: [],
        notes: [],
      });
    const discovery = selectedDiscovery(available, path[2]);
    if (!discovery)
      return result(path, {
        confidence: "decoded",
        disposition: path[2] ? "unavailable" : "shown",
        dialogue: [introduction],
        menu: available.map((entry, index) => `${index + 1}: ${entry.name}`),
        effects: ["deduct the 10-gold waitress tip"],
        uncertainties: [],
        notes: path[2] ? [`Unknown discovery selector: ${path[2]}.`] : [],
      });
    const preferred = waitress.preference >= 2;
    const baseGain = Math.floor(discovery.difficulty / 10) + 1;
    const gain = baseGain * (preferred ? 2 : 1);
    const nextFavor = Math.min(100, waitress.favor + gain);
    const categoryMessage = 314 + (discovery.flags & 7);
    return result(path, {
      confidence: preferred ? "decoded" : "ambiguous",
      disposition: "completed",
      dialogue: [
        introduction,
        line(data, 313, waitress.name),
        ...(preferred && categoryMessage <= 320
          ? [line(data, categoryMessage, waitress.name)]
          : []),
      ],
      menu,
      effects: [
        "deduct the 10-gold waitress tip",
        ...(preferred
          ? [
              `raise ${waitress.name}'s favor from ${waitress.favor} to ${nextFavor}`,
            ]
          : [
              `raise favor to ${nextFavor} only if shared waitress flag 0x40 is clear`,
            ]),
      ],
      uncertainties: preferred
        ? []
        : [
            "The nonpreferred-story update depends on shared process flag 0x40, which is not persisted in the save.",
          ],
      notes: [
        `Difficulty ${discovery.difficulty} gives base gain ${baseGain}${preferred ? ", doubled for the Stories/Everything preference" : ""}.`,
      ],
    });
  }

  if (command === "givegift") {
    const inventory = inspectItems(save, slot);
    const gifts = inventory
      .map((id, inventoryIndex) => ({ id, inventoryIndex }))
      .filter(({ id }) => id !== 0xff)
      .map(({ id, inventoryIndex }) => ({
        ...shopItem(save, slot, id),
        inventoryIndex,
      }))
      .filter((item) => item.type === 0x0a || item.type === 0x0b);
    if (gifts.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [
          introduction,
          line(
            data,
            inventory.every((id) => id === 0xff) ? 331 : 330,
            waitress.name,
          ),
        ],
        menu,
        effects: ["deduct the 10-gold waitress tip"],
        uncertainties: [],
        notes: [],
      });
    const gift = selectedItem(gifts, path[2]);
    if (!gift)
      return result(path, {
        confidence: "decoded",
        disposition: path[2] ? "unavailable" : "shown",
        dialogue: [introduction],
        menu: gifts.map(itemLabel),
        effects: ["deduct the 10-gold waitress tip"],
        uncertainties: [],
        notes: path[2] ? [`Unknown gift selector: ${path[2]}.`] : [],
      });
    const matching =
      waitress.preference === 3 ||
      (waitress.preference === 0 && gift.type === 0x0a) ||
      (waitress.preference === 1 && gift.type === 0x0b);
    const gain = Math.min(gift.appeal, 10) * (matching ? 2 : 1);
    const nextFavor = Math.min(100, waitress.favor + gain);
    const reaction =
      matching && waitress.preference === 0
        ? 322
        : matching && waitress.preference === 1
          ? 323
          : matching && waitress.preference === 3
            ? 324
            : undefined;
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        introduction,
        line(data, 321, waitress.name),
        ...(reaction === undefined
          ? []
          : [line(data, reaction, waitress.name)]),
        ...(matching && waitress.favor >= 80
          ? [line(data, 325, waitress.name)]
          : []),
      ],
      menu,
      effects: [
        "deduct the 10-gold waitress tip",
        `consume ${gift.name} from inventory slot ${inventory.indexOf(gift.id) + 1}`,
        `raise ${waitress.name}'s favor from ${waitress.favor} to ${nextFavor}`,
      ],
      uncertainties: [],
      notes: [
        `Stored appeal ${gift.appeal} gives ${Math.min(gift.appeal, 10)} base favor${matching ? ", doubled by the matching preference" : ""}.`,
      ],
    });
  }

  if (command === "investigation") {
    const target = save[waitress.record + 0x0d]!;
    const remainingDays = save[waitress.record + 0x0e]!;
    if (target !== 0xff) {
      if (remainingDays !== 0)
        return result(path, {
          confidence: "decoded",
          disposition: "blocked",
          dialogue: [introduction, line(data, 537, waitress.name)],
          menu,
          effects: ["deduct the 10-gold waitress tip"],
          uncertainties: [],
          notes: [
            `Investigation target byte ${target}; ${remainingDays} days remain.`,
          ],
        });
      return result(path, {
        confidence: "ambiguous",
        disposition: "completed",
        dialogue: [introduction, line(data, 538, waitress.name)],
        menu,
        effects: [
          "deduct the 10-gold waitress tip",
          "display the completed fleet-objective report and clear the investigation target",
        ],
        uncertainties: [
          "The completed report is assembled from live fleet objectives and reusable fragments; the ordinary query does not yet render that composite screen.",
        ],
        notes: [`Stored investigation target byte: ${target}.`],
      });
    }
    const required = Math.floor(80 / (1 + (waitress.flags & 1)));
    if (waitress.favor < required)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [introduction, line(data, 533, waitress.name)],
        menu,
        effects: ["deduct the 10-gold waitress tip"],
        uncertainties: [],
        notes: [`Favor ${waitress.favor}; ordinary requirement ${required}.`],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [introduction, line(data, 534, waitress.name)],
      menu: [],
      effects: [
        "deduct the 10-gold waitress tip",
        "open the interactive nation and fleet selection for an investigation",
      ],
      uncertainties: [],
      notes: [
        `Favor ${waitress.favor} satisfies the ordinary requirement ${required}.`,
        "The selected target and later report depend on the interactive fleet-selection screen.",
      ],
    });
  }

  if (path[2] !== undefined)
    return unavailableCommand(
      path,
      "Ask Info has no further player-selected submenu.",
    );
  return result(path, {
    confidence: "ambiguous",
    disposition: "completed",
    dialogue: [introduction],
    menu,
    effects: [
      "deduct the 10-gold waitress tip",
      "display the executable-selected current-job hint or local-port information",
    ],
    uncertainties: [
      "Ask Info dispatches through quest and port state that is not yet fully represented in the ordinary-message query.",
    ],
    notes: [],
  });
}

function pubGambleCommand(
  save: Buffer,
  slot: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  if (inspectGold(save, slot) === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 1010, "Gambler")],
      menu: MENUS[0x01]!,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const choice = path[1] && normalizedCommand(path[1]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [],
      menu: ["Black Jack", "Dice"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "blackjack" && choice !== "dice")
    return unavailableCommand(path, `Unknown Gamble choice: ${path[1]}.`);
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [],
    menu: [],
    effects: [
      `enter the ${choice === "blackjack" ? "Black Jack" : "Dice"} minigame`,
    ],
    uncertainties: [
      "Wagers, cards or dice, and winnings are determined after dialogue by the interactive minigame and gameplay RNG.",
    ],
    notes: [],
  });
}

interface MarketGood {
  readonly id: number;
  readonly name: string;
  readonly requirement: number;
  readonly rate: number;
  readonly buyPrice: number;
  readonly sellPrice: number;
  readonly specialty: boolean;
}

function goodsCategory(goodsId: number): number {
  const category = GOODS_CATEGORY_LIMITS.findIndex((limit) => goodsId < limit);
  return category < 0 ? GOODS_CATEGORY_LIMITS.length - 1 : category;
}

function marketGoodLabel(good: MarketGood, index: number): string {
  return `${index + 1}: ${good.name} (${good.buyPrice} gold/lot)`;
}

function selectedMarketGood(
  goods: readonly MarketGood[],
  selector: string | undefined,
): MarketGood | undefined {
  if (!selector) return undefined;
  const numeric = /^(?:goods?-?)?(\d+)$/i.exec(selector);
  if (numeric) return goods[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return goods.find((good) => normalizedCommand(good.name) === normalized);
}

function marketGoods(
  save: Buffer,
  slot: number,
  portId: number,
  data: OrdinaryDialogueData,
): MarketGood[] {
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const economy = save.readUInt16LE(metadata + 2);
  const marketId = save[metadata + 0x23]!;
  const definition = data.marketDefinitions[marketId];
  if (!definition) return [];
  const nation = palaceNation(save, slot, portId);
  const taxFree = inspectItems(save, slot).includes(35 + nation);
  const specialtyId = save[metadata + 0x1c]!;
  const ids = definition.goods.filter(
    (id, index) =>
      id !== 0xff && definition.requirements[index]! * 10 <= economy,
  );
  if (
    specialtyId < GOODS_NAMES.length &&
    save[metadata + 0x1d]! * 10 <= economy &&
    save[metadata + 0x10 + goodsCategory(specialtyId)]! < 90 &&
    !ids.includes(specialtyId)
  )
    ids.push(specialtyId);
  return ids.map((id) => {
    const category = goodsCategory(id);
    const rate = save[metadata + 0x10 + category]!;
    const basePrice =
      id === specialtyId
        ? save.readUInt16LE(metadata + 0x1a)
        : (definition.basePrices[id] ?? 0);
    const ordinary = Math.floor(((rate + 50) * basePrice) / 100);
    return {
      id,
      name: GOODS_NAMES[id] ?? `goods ${id}`,
      requirement:
        id === specialtyId
          ? save[metadata + 0x1d]! * 10
          : definition.requirements[definition.goods.indexOf(id)]! * 10,
      rate,
      buyPrice: Math.floor((ordinary * (taxFree ? 10 : 12)) / 10),
      sellPrice: id === specialtyId ? Math.floor(ordinary / 2) : ordinary,
      specialty: id === specialtyId,
    };
  });
}

function marketBuyCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Market vendor";
  const ships = harborShips(save, slot, protagonistId);
  if (ships.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 26, speaker)],
      menu: MENUS[0x00]!,
      effects: [],
      uncertainties: [],
      notes: ["The active fleet contains no ship that can carry goods."],
    });
  const goods = marketGoods(save, slot, portId, data);
  const opening = line(data, 3, speaker);
  const good = selectedMarketGood(goods, path[1]);
  if (!good)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [opening],
      menu: goods.map(marketGoodLabel),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown locally available goods: ${path[1]}.`] : [],
    });
  const ship = selectedShip(ships, path[2]);
  if (!ship)
    return result(path, {
      confidence: "decoded",
      disposition: path[2] ? "unavailable" : "shown",
      dialogue: [
        opening,
        ...(good.specialty ? [line(data, 5, speaker, [good.name])] : []),
      ],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: path[2] ? [`Unknown active-ship selector: ${path[2]}.`] : [],
    });
  const freeCapacity = Math.max(0, ship.cargoCapacity - ship.usedCapacity);
  const maximum = Math.min(
    freeCapacity,
    Math.floor(inspectGold(save, slot) / Math.max(1, good.buyPrice)),
  );
  const prompts = [
    opening,
    ...(good.specialty ? [line(data, 5, speaker, [good.name])] : []),
    line(data, 9, speaker, [good.name]),
    line(data, 150, speaker, [good.name, good.buyPrice]),
    line(data, good.rate <= 40 ? 23 : good.rate > 60 ? 24 : 25, "First mate"),
  ];
  if (maximum === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [...prompts, line(data, 22, speaker)],
      menu: goods.map(marketGoodLabel),
      effects: [],
      uncertainties: [],
      notes: [
        `${ship.name} has ${freeCapacity} cargo space; on-hand gold is ${inspectGold(save, slot)}.`,
      ],
    });
  if (path[3] === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: prompts,
      menu: [`Lots: 0–${maximum}`],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (!/^\d+$/.test(path[3]!) || Number(path[3]) > maximum)
    return unavailableCommand(
      path,
      `Purchase quantity must be between 0 and ${maximum}.`,
    );
  const quantity = Number(path[3]);
  if (quantity === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: prompts,
      menu: goods.map(marketGoodLabel),
      effects: ["return to the goods list without buying"],
      uncertainties: [],
      notes: [],
    });
  const choice = path[4] && normalizedCommand(path[4]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: prompts,
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [`Listed total: ${quantity * good.buyPrice} gold.`],
    });
  if (choice === "no")
    return result(path, {
      confidence: "ambiguous",
      disposition: "shown",
      dialogue: [...prompts, line(data, 6, speaker, [good.buyPrice])],
      menu: ["Enter a unit-price counteroffer"],
      effects: [],
      uncertainties: [
        "The subsequent negotiation uses protagonist attributes and the unsaved general RNG; only accepting the listed price is fully save-determined here.",
      ],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(
      path,
      `Unknown purchase-price choice: ${path[4]}.`,
    );
  const transaction = quantity * good.buyPrice;
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const economy = save.readUInt16LE(metadata + 2);
  const selectedIncrease = Math.min(
    10,
    Math.floor(transaction / (economy + 500)),
  );
  const marketIncrease = Math.min(3, Math.floor(transaction / 1_000));
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: prompts,
    menu: goods.map(marketGoodLabel),
    effects: [
      `deduct ${transaction} gold`,
      `load ${quantity} lots of ${good.name} aboard ${ship.name}`,
      `raise its category rate by ${selectedIncrease} and every category rate by ${marketIncrease}, each capped at 100`,
    ],
    uncertainties: [],
    notes: [`Unit price ${good.buyPrice}; total ${transaction}.`],
  });
}

function marketSellCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Market vendor";
  const ships = harborShips(save, slot, protagonistId).filter((ship) => {
    const supply =
      slotOffset(slot) +
      PLAYER_SUPPLY_RECORDS +
      ship.recordIndex * SUPPLY_RECORD_SIZE;
    return Array.from(save.subarray(supply + 0x16, supply + 0x1b)).some(
      (id) => id < GOODS_NAMES.length,
    );
  });
  if (ships.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 21, speaker)],
      menu: MENUS[0x00]!,
      effects: [],
      uncertainties: [],
      notes: ["No active ship carries saleable trade goods."],
    });
  const ship = selectedShip(ships, path[1]);
  if (!ship)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [line(data, 407, speaker)],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown cargo-ship selector: ${path[1]}.`] : [],
    });
  const supply =
    slotOffset(slot) +
    PLAYER_SUPPLY_RECORDS +
    ship.recordIndex * SUPPLY_RECORD_SIZE;
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const specialtyId = save[metadata + 0x1c]!;
  const definition = data.marketDefinitions[save[metadata + 0x23]!]!;
  const carried = Array.from({ length: 5 }, (_, cargo) => {
    const id = save[supply + 0x16 + cargo]!;
    const category = goodsCategory(id);
    const rate = save[metadata + 0x10 + category]!;
    const basePrice =
      id === specialtyId
        ? save.readUInt16LE(metadata + 0x1a)
        : (definition?.basePrices[id] ?? 0);
    const ordinary = Math.floor(((rate + 50) * basePrice) / 100);
    return {
      id,
      name: GOODS_NAMES[id] ?? `goods ${id}`,
      quantity: save.readUInt16LE(supply + 0x0c + cargo * 2),
      cargo,
      price: id === specialtyId ? Math.floor(ordinary / 2) : ordinary,
    };
  }).filter((entry) => entry.id < GOODS_NAMES.length && entry.quantity > 0);
  const selector = path[2];
  const numeric = selector && /^(?:goods?-?)?(\d+)$/i.exec(selector);
  const good = numeric
    ? carried[Number(numeric[1]) - 1]
    : carried.find(
        (entry) =>
          selector &&
          normalizedCommand(entry.name) === normalizedCommand(selector),
      );
  if (!good)
    return result(path, {
      confidence: "decoded",
      disposition: selector ? "unavailable" : "shown",
      dialogue: [line(data, 407, speaker)],
      menu: carried.map(
        (entry, index) =>
          `${index + 1}: ${entry.name} (${entry.quantity} lots, ${entry.price} gold/lot)`,
      ),
      effects: [],
      uncertainties: [],
      notes: selector ? [`Unknown carried-goods selector: ${selector}.`] : [],
    });
  if (path[3] === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [
        line(data, 408, speaker, [good.name, good.quantity, good.price]),
      ],
      menu: [`Lots: 0–${good.quantity}`],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (!/^\d+$/.test(path[3]!) || Number(path[3]) > good.quantity)
    return unavailableCommand(
      path,
      `Sale quantity must be between 0 and ${good.quantity}.`,
    );
  const quantity = Number(path[3]);
  const proceeds = quantity * good.price;
  const economy = save.readUInt16LE(metadata + 2);
  const selectedDecrease = Math.min(10, Math.floor(proceeds / (economy + 500)));
  const marketDecrease = Math.min(3, Math.floor(proceeds / 1_000));
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [
      line(data, 408, speaker, [good.name, good.quantity, good.price]),
    ],
    menu: carried.map((entry, index) => `${index + 1}: ${entry.name}`),
    effects:
      quantity === 0
        ? ["return to the carried-goods list without selling"]
        : [
            `remove ${quantity} lots of ${good.name} from ${ship.name}`,
            `add ${proceeds} gold`,
            `lower its category rate by ${selectedDecrease} and every category rate by ${marketDecrease}, each floored at 0`,
          ],
    uncertainties: [],
    notes: [`Unit price ${good.price}; proceeds ${proceeds}.`],
  });
}

function isNationalCapital(
  save: Buffer,
  slot: number,
  portId: number,
): boolean {
  const base = slotOffset(slot) + NATION_RECORDS;
  for (let nation = 0; nation < 6; nation++)
    if (save[base + nation * NATION_RECORD_SIZE + 0x0a] === portId) return true;
  return false;
}

function portInvestCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  industrial: boolean,
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = industrial ? "Shipyard vendor" : "Market vendor";
  if (isNationalCapital(save, slot, portId))
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        line(data, 2, speaker, [
          portName(save, slot, portId),
          NATION_NAMES[palaceNation(save, slot, portId)] ?? "its nation",
        ]),
      ],
      menu: MENUS[industrial ? 0x02 : 0x00]!,
      effects: [],
      uncertainties: [],
      notes: ["National capitals cannot receive player investment."],
    });
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  // Each port accumulates Market and Shipyard investment separately from its
  // Economy and Industry values. The executable caps each total at 50,000.
  const investedOffset = industrial ? 8 : 4;
  const invested = save.readUInt16LE(metadata + investedOffset);
  const kind = industrial ? "Shipyard" : "Market";
  if (invested >= 50_000)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 7, speaker)],
      menu: MENUS[industrial ? 0x02 : 0x00]!,
      effects: [],
      uncertainties: [],
      notes: [`Current ${kind} investment: ${invested}.`],
    });
  const gold = inspectGold(save, slot);
  const maximum = Math.min(gold, 50_000 - invested);
  const prompt = line(data, 8, speaker);
  if (maximum === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 28, "First mate")],
      menu: MENUS[industrial ? 0x02 : 0x00]!,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (path[1] === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: [`Amount: 0–${maximum}`],
      effects: [],
      uncertainties: [],
      notes: [`Current ${kind} investment: ${invested}.`],
    });
  if (!/^\d+$/.test(path[1]!) || Number(path[1]) > maximum)
    return unavailableCommand(
      path,
      `Investment must be between 0 and ${maximum}.`,
    );
  const amount = Number(path[1]);
  const response =
    amount === 0 ? 13 : amount < 500 ? 14 : amount < 10_000 ? 15 : 16;
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [prompt, line(data, response, speaker)],
    menu: MENUS[industrial ? 0x02 : 0x00]!,
    effects:
      amount === 0
        ? ["return without investing"]
        : [
            `deduct ${amount} gold`,
            `raise the port's ${kind} investment from ${invested} to ${invested + amount}`,
            "redistribute national Support and refresh the associated port state",
          ],
    uncertainties: [],
    notes: [],
  });
}

function marketRateCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const definition = data.marketDefinitions[save[metadata + 0x23]!];
  if (!definition)
    return unavailableCommand(
      path,
      "The port has no decoded market definition.",
    );
  const specialtyId = save[metadata + 0x1c]!;
  const notes = GOODS_NAMES.map((name, id) => {
    const rate = save[metadata + 0x10 + goodsCategory(id)]!;
    const basePrice =
      id === specialtyId
        ? save.readUInt16LE(metadata + 0x1a)
        : definition.basePrices[id]!;
    const sell = Math.floor(((rate + 50) * basePrice) / 100);
    return `${name}: price index ${rate + 50}, sells at ${sell} gold per lot.`;
  });
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [line(data, 379, "Market vendor")],
    menu: MENUS[0x00]!,
    effects: ["display the generated commodity-rate tables"],
    uncertainties: [],
    notes,
  });
}

function shipyardModels(
  save: Buffer,
  slot: number,
  portId: number,
  data: OrdinaryDialogueData,
): ShipModel[] {
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const industry = save.readUInt16LE(metadata + 6);
  const yardId = save[metadata + 0x24]!;
  return (data.shipyardModels[yardId] ?? [])
    .map((id) => data.shipModels[id])
    .filter((model): model is ShipModel =>
      Boolean(model && model.industryRequirement <= industry),
    );
}

function shipyardIndex(save: Buffer, slot: number, portId: number): number {
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const rateSum = save
    .subarray(metadata + 0x10, metadata + 0x1a)
    .reduce((sum, rate) => sum + rate, 0);
  return 50 + Math.floor(rateSum / 10);
}

function shipyardQuote(
  basePrice: number,
  materialIndex: number,
  index: number,
): number {
  const basePriceTens = basePrice / 10;
  const materialPriceTens =
    Math.floor((4 * basePriceTens) / 5) +
    Math.floor((materialIndex * basePriceTens) / 10);
  return 10 * Math.floor((materialPriceTens * index) / 100);
}

function shipyardTradeInQuote(
  save: Buffer,
  slot: number,
  portId: number,
  ship: HarborShip,
  data: OrdinaryDialogueData,
): number {
  const model = data.shipModels[ship.typeId]!;
  const instance =
    slotOffset(slot) +
    SHIP_INSTANCE_TABLE +
    ship.instanceId * SHIP_INSTANCE_SIZE;
  const materialIndex = save[instance + 0x12]! & 7;
  return shipyardQuote(
    model.basePrice,
    materialIndex,
    shipyardIndex(save, slot, portId),
  );
}

function selectedShipModel(
  models: readonly ShipModel[],
  selector: string | undefined,
): ShipModel | undefined {
  if (!selector) return undefined;
  const numeric = /^(?:model-?)?(\d+)$/i.exec(selector);
  if (numeric) return models[Number(numeric[1]) - 1];
  const normalized = normalizedCommand(selector);
  return models.find((model) => normalizedCommand(model.name) === normalized);
}

function pendingConstructionShip(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
): HarborShip | undefined {
  const base = slotOffset(slot);
  const fleetId =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x24]!;
  const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  const marker = portId | 0x80;
  for (
    let recordIndex = 0;
    recordIndex < SHIP_SLOT_COUNT + RESERVE_SHIP_COUNT;
    recordIndex++
  ) {
    const shipSlot =
      recordIndex < SHIP_SLOT_COUNT
        ? fleet + FLEET_SHIP_SLOTS + recordIndex * SHIP_SLOT_SIZE
        : base +
          RESERVE_SHIP_SLOTS +
          (recordIndex - SHIP_SLOT_COUNT) * SHIP_SLOT_SIZE;
    const supply =
      base + PLAYER_SUPPLY_RECORDS + recordIndex * SUPPLY_RECORD_SIZE;
    if ((save[shipSlot + 8]! & 0x30) === 0x20 && save[supply + 0x1b] === marker)
      return harborShip(
        save,
        base,
        recordIndex,
        recordIndex < SHIP_SLOT_COUNT
          ? recordIndex
          : recordIndex - SHIP_SLOT_COUNT,
        shipSlot,
      );
  }
  return undefined;
}

function shipyardAvailableCaptain(
  save: Buffer,
  slot: number,
): number | undefined {
  const base = slotOffset(slot);
  return save
    .subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT)
    .find(
      (id) =>
        id !== 0xff &&
        save[base + SAILOR_TABLE + id * SAILOR_RECORD_SIZE + 0x26]! >= 3,
    );
}

function shipyardConstructionDeliveryCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Shipyard vendor";
  const pending = pendingConstructionShip(save, slot, protagonistId, portId);
  if (!pending)
    return result(path, {
      confidence: "ambiguous",
      disposition: "blocked",
      dialogue: [line(data, 250, speaker), line(data, 263, speaker)],
      menu: [],
      effects: [],
      uncertainties: [
        "The port's construction timer is ready, but no matching pending ship record was found in the save.",
      ],
      notes: [],
    });

  const opening = [line(data, 250, speaker), line(data, 263, speaker)];
  const answer = path[1] && normalizedCommand(path[1]);
  if (!answer)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: opening,
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [`Ready ship: ${pending.name}.`],
    });
  if (answer === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [...opening, line(data, 265, speaker)],
      menu: MENUS[0x02]!,
      effects: [`leave ${pending.name} in the dock for now`],
      uncertainties: [],
      notes: [],
    });
  if (answer !== "yes")
    return unavailableCommand(
      path,
      `Unknown construction-delivery confirmation: ${path[1]}.`,
    );

  const activeShips = harborShips(save, slot, protagonistId);
  const availableCaptain = shipyardAvailableCaptain(save, slot);
  const exchangeRequired =
    availableCaptain === undefined ||
    activeFleetOccupancyCount(save, slot, protagonistId) >= SHIP_SLOT_COUNT;
  if (!exchangeRequired) {
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: opening,
      menu: [
        ...activeShips.map(shipLabel),
        shipLabel(pending, activeShips.length),
      ],
      effects: [
        `activate ${pending.name} in the active fleet`,
        `assign ${sailorName(save, slot, availableCaptain!)} as its captain`,
        `clear the construction order at this port`,
      ],
      uncertainties: [],
      notes: [
        `The pending ship occupies ${pending.recordIndex < SHIP_SLOT_COUNT ? "an active-fleet slot" : "a reserve slot"} before delivery.`,
      ],
    });
  }

  const hasCaptain = availableCaptain !== undefined;
  const exchangeOpening = [
    ...opening,
    ...(!hasCaptain ? [line(data, 166, speaker)] : []),
    line(data, 167, speaker),
  ];
  const suppliedPath =
    path[2] && normalizedCommand(path[2]) === "exchange"
      ? path.slice(3)
      : path.slice(2);
  const sale = shipyardSellCommand(
    save,
    slot,
    protagonistId,
    portId,
    ["sell", ...suppliedPath],
    data,
  );
  const dialogue = [...exchangeOpening, ...sale.dialogue];
  if (sale.disposition !== "completed")
    return result(path, {
      confidence: sale.confidence,
      disposition: sale.disposition,
      dialogue,
      menu: sale.menu.length ? sale.menu : activeShips.map(shipLabel),
      effects: sale.effects,
      uncertainties: sale.uncertainties,
      notes: [
        "The ready ship is added after one active ship is sold through the shared Shipyard sale sequence.",
        ...sale.notes,
      ],
    });

  const sold = selectedShip(activeShips, suppliedPath[0]);
  if (!sold)
    return unavailableCommand(
      path,
      `Unknown exchange ship: ${suppliedPath[0]}.`,
    );
  const captainId =
    sold.captainId === protagonistId
      ? selectedShip(
          activeShips.filter(
            (candidate) => candidate.recordIndex !== sold.recordIndex,
          ),
          suppliedPath[3],
        )?.captainId
      : sold.captainId;
  if (captainId === undefined)
    return result(path, {
      confidence: "ambiguous",
      disposition: "completed",
      dialogue,
      menu: activeShips
        .filter((candidate) => candidate.recordIndex !== sold.recordIndex)
        .map(shipLabel)
        .concat(shipLabel(pending, activeShips.length - 1)),
      effects: [
        ...sale.effects,
        `activate ${pending.name} in the active fleet after the exchange`,
        "clear the construction order at this port",
      ],
      uncertainties: [
        "The shared sale route completed, but the captain transferred from the flagship replacement could not be identified.",
      ],
      notes: [],
    });
  return result(path, {
    confidence: sale.confidence,
    disposition: "completed",
    dialogue,
    menu: activeShips
      .filter((candidate) => candidate.recordIndex !== sold.recordIndex)
      .map(shipLabel)
      .concat(shipLabel(pending, activeShips.length - 1)),
    effects: [
      ...sale.effects,
      `activate ${pending.name} in the active fleet after the exchange`,
      `assign ${sailorName(save, slot, captainId)} as its captain`,
      `clear the construction order at this port`,
    ],
    uncertainties: [],
    notes: [],
  });
}

function shipyardNewShipExchangeCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const activeShips = harborShips(save, slot, protagonistId);
  const speaker = "Shipyard vendor";
  const entry = line(data, 167, speaker);
  const exchangePath =
    path[1] && normalizedCommand(path[1]) === "exchange"
      ? path.slice(2)
      : path.slice(1);
  const sale = shipyardSellCommand(
    save,
    slot,
    protagonistId,
    portId,
    ["sell", ...exchangePath],
    data,
  );
  const dialogue = [entry, ...sale.dialogue];
  if (sale.disposition !== "completed")
    return result(path, {
      confidence: sale.confidence,
      disposition: sale.disposition,
      dialogue,
      menu: sale.menu.length ? sale.menu : activeShips.map(shipLabel),
      effects: sale.effects,
      uncertainties: sale.uncertainties,
      notes: [
        "The full-storage New Ship route sells one active ship before model selection.",
        ...sale.notes,
      ],
    });

  const sold = selectedShip(activeShips, exchangePath[0]);
  if (!sold)
    return unavailableCommand(
      path,
      `Unknown exchange ship: ${exchangePath[0]}.`,
    );
  let saleFinal = 3;
  if (sold.captainId === protagonistId) saleFinal += 2;
  if (sold.usedCapacity > 0) saleFinal++;
  if (sold.crew > 0) saleFinal++;
  const modelStart =
    saleFinal + (path[1] && normalizedCommand(path[1]) === "exchange" ? 2 : 1);
  const order = shipyardNewShipCommand(
    save,
    slot,
    protagonistId,
    portId,
    ["new-ship", ...path.slice(modelStart)],
    data,
    { skipStorageCheck: true },
  );
  return result(path, {
    confidence:
      sale.confidence === "ambiguous" || order.confidence === "ambiguous"
        ? "ambiguous"
        : order.confidence,
    disposition: order.disposition,
    dialogue: [...dialogue, ...order.dialogue],
    menu: order.menu,
    effects: [...sale.effects, ...order.effects],
    uncertainties: [...sale.uncertainties, ...order.uncertainties],
    notes: [
      "The sold ship's active slot receives the pending New Ship order until construction completes.",
      ...sale.notes,
      ...order.notes,
    ],
  });
}

function shipyardNewShipCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
  options: { readonly skipStorageCheck?: boolean } = {},
): OrdinaryCommandResult {
  const speaker = "Shipyard vendor";
  const base = slotOffset(slot);
  const metadata =
    base + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  // The executable's port pointer starts at metadata + 2; its +0x23
  // construction-day field is therefore metadata + 0x25.
  const pendingDays = save[metadata + 0x25]!;
  if (pendingDays === 0)
    return shipyardConstructionDeliveryCommand(
      save,
      slot,
      protagonistId,
      portId,
      path,
      data,
    );
  if (pendingDays !== 0xff)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        line(data, 261, speaker, [pendingDays, pendingDays === 1 ? "" : "s"]),
      ],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: ["This port already has a construction order."],
    });
  const models = shipyardModels(save, slot, portId, data);
  if (models.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 251, speaker)],
      menu: MENUS[0x02]!,
      effects: [],
      uncertainties: [],
      notes: ["No model in this shipyard meets the port's current Industry."],
    });
  const fleetId =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x24]!;
  const fleet = base + PLAYER_FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  if (!options.skipStorageCheck) {
    const freeReserve = Array.from(
      { length: RESERVE_SHIP_COUNT },
      (_, index) =>
        save[base + RESERVE_SHIP_SLOTS + index * SHIP_SLOT_SIZE + 8]! & 0x30,
    ).some((status) => status !== 0x10 && status !== 0x20);
    if (!freeReserve) {
      const freeActive = Array.from(
        { length: SHIP_SLOT_COUNT },
        (_, index) =>
          save[fleet + FLEET_SHIP_SLOTS + index * SHIP_SLOT_SIZE + 8]! & 0x30,
      ).some((status) => status !== 0x10 && status !== 0x20);
      if (!freeActive)
        return shipyardNewShipExchangeCommand(
          save,
          slot,
          protagonistId,
          portId,
          path,
          data,
        );
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 377, speaker)],
        menu: MENUS[0x02]!,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    }
  }
  const opening = line(data, 252, speaker);
  const model = selectedShipModel(models, path[1]);
  if (!model)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [opening],
      menu: models.map(
        (entry, index) =>
          `${index + 1}: ${entry.name} (${entry.basePrice} base gold)`,
      ),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown available ship model: ${path[1]}.`] : [],
    });
  const industry = save.readUInt16LE(metadata + 6);
  const materialCount = Math.min(
    5,
    3 + Math.floor(Math.max(0, industry - 500) / 200),
  );
  const materials =
    model.id === 22
      ? ["Steel"]
      : ["Teak", "Cedar", "Beech", "Oak", "Copper"].slice(0, materialCount);
  const material =
    path[2] &&
    materials.find(
      (entry) => normalizedCommand(entry) === normalizedCommand(path[2]!),
    );
  if (!material)
    return result(path, {
      confidence: "decoded",
      disposition: path[2] ? "unavailable" : "shown",
      dialogue: [
        opening,
        line(data, 253, speaker, [model.name]),
        line(data, 254, speaker),
      ],
      menu: materials,
      effects: [],
      uncertainties: [],
      notes: path[2] ? [`Unknown hull material: ${path[2]}.`] : [],
    });
  const materialIndex = material === "Steel" ? 6 : materials.indexOf(material);
  const factor = materialIndex + 8;
  const durability = Math.min(
    100,
    Math.floor((model.durability * factor) / 10),
  );
  const constructionDays = Math.floor(
    ((100 - Math.floor(industry / 50)) * model.durability) / 100,
  );
  const basePriceTens = model.basePrice / 10;
  const materialPriceTens =
    Math.floor((4 * basePriceTens) / 5) +
    Math.floor((materialIndex * basePriceTens) / 10);
  const marketRateSum = Array.from(
    save.subarray(metadata + 0x10, metadata + 0x1a),
  ).reduce((sum, rate) => sum + rate, 0);
  const shipyardIndex = 50 + Math.floor(marketRateSum / 10);
  const quote = 10 * Math.floor((materialPriceTens * shipyardIndex) / 100);
  const protagonist =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const charm = save[protagonist + 0x1a]!;
  const minimumOffer = Math.floor((quote * (500 - charm)) / 500);
  const preview = [
    opening,
    line(data, 253, speaker, [model.name]),
    line(data, 254, speaker),
    line(data, 255, speaker),
  ];
  const notes = [
    `Preview durability: min(floor(${model.durability} × ${factor} / 10), 100) = ${durability}.`,
    `Capacity ${model.capacity}, crew range ${model.minimumCrew}–${model.maximumCrew}, maximum guns ${model.maximumGuns}.`,
    `Shipyard Price Index ${shipyardIndex}%; quoted price ${quote} gold.`,
    `Minimum acceptable negotiated offer: ${minimumOffer} gold (protagonist Charm ${charm}).`,
    `If ordered, construction takes ${constructionDays} days at Industry ${industry}.`,
  ];
  const designChoice = path[3] && normalizedCommand(path[3]);
  if (!designChoice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: preview,
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes,
    });
  if (designChoice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: preview,
      menu: materials,
      effects: ["return to hull-material selection"],
      uncertainties: [],
      notes,
    });
  if (designChoice !== "yes")
    return unavailableCommand(path, `Unknown design confirmation: ${path[3]}.`);

  const pricePrompt = line(data, 256, speaker, [quote]);
  const quotedDialogue = [...preview, pricePrompt];
  const priceChoice = path[4] && normalizedCommand(path[4]);
  if (!priceChoice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: quotedDialogue,
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes,
    });
  if (priceChoice !== "yes" && priceChoice !== "no")
    return unavailableCommand(path, `Unknown price confirmation: ${path[4]}.`);

  const gold = inspectGold(save, slot);
  let price = quote;
  let nextInput = 5;
  let priceDialogue = quotedDialogue;
  let negotiationUncertainties: string[] = [];
  if (priceChoice === "no") {
    nextInput = 6;
    const bookkeeperId = save
      .subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT)
      .find(
        (id) =>
          id !== 0xff &&
          save[base + SAILOR_TABLE + id * SAILOR_RECORD_SIZE + 0x26] === 4,
      );
    const accounting =
      bookkeeperId !== undefined &&
      (save[base + SAILOR_TABLE + bookkeeperId * SAILOR_RECORD_SIZE + 0x28]! &
        0x02) !==
        0;
    if (bookkeeperId !== undefined && !accounting)
      negotiationUncertainties = [
        "The Bookkeeper's displayed estimate uses gameplay RNG and cannot be recovered from the save.",
      ];
    priceDialogue = [
      ...quotedDialogue,
      ...(bookkeeperId === undefined
        ? []
        : [
            line(
              data,
              196,
              "Bookkeeper",
              accounting ? [minimumOffer] : ["[RNG-dependent estimate]"],
            ),
          ]),
      line(data, 195, speaker),
    ];
    const offerInput = path[5];
    const maximumOffer = Math.min(gold, quote);
    if (offerInput === undefined)
      return result(path, {
        confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
        disposition: "shown",
        dialogue: priceDialogue,
        menu: [`Enter an offer from 0 to ${maximumOffer} gold`],
        effects: [],
        uncertainties: negotiationUncertainties,
        notes: [...notes, `Minimum acceptable offer: ${minimumOffer} gold.`],
      });
    price = Number(offerInput);
    if (!Number.isInteger(price) || price < 0 || price > maximumOffer)
      return unavailableCommand(
        path,
        `The offer must be an integer from 0 to ${maximumOffer} gold.`,
      );
    if (price < minimumOffer)
      return result(path, {
        confidence: "ambiguous",
        disposition: "blocked",
        dialogue: priceDialogue,
        menu: [],
        effects: ["end the New Ship negotiation without placing an order"],
        uncertainties: [
          ...negotiationUncertainties,
          "A random(5) roll selects raw refusal 198, or raw 197 and a temporary Shipyard ejection flag on zero.",
        ],
        notes: [
          ...notes,
          `Offer ${price} is below the minimum ${minimumOffer}.`,
        ],
      });
    priceDialogue = [...priceDialogue, line(data, 863, speaker, [price])];
  }

  if (gold < price)
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "blocked",
      dialogue: [...priceDialogue, line(data, 239, speaker)],
      menu: [],
      effects: [],
      uncertainties: negotiationUncertainties,
      notes: [`On-hand gold: ${gold}; selected price: ${price}.`],
    });

  const orderedDialogue = [...priceDialogue, line(data, 257, speaker)];
  const orderEffects = [
    `deduct ${price} gold`,
    `create a ${material} ${model.name} construction order at this port`,
  ];
  const bunkInput = path[nextInput];
  const defaultCargo = model.capacity - model.usedCrew - model.usedGuns;
  if (bunkInput && normalizedCommand(bunkInput) === "cancel")
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "completed",
      dialogue: [
        ...orderedDialogue,
        line(data, 258, speaker),
        line(data, 262, speaker, [constructionDays]),
      ],
      menu: MENUS[0x02]!,
      effects: [
        ...orderEffects,
        `retain default allocation of ${model.usedCrew} crew bunks, ${model.usedGuns} gun spaces, and ${defaultCargo} cargo spaces`,
        `set construction time to ${constructionDays} days`,
      ],
      uncertainties: negotiationUncertainties,
      notes,
    });
  if (bunkInput === undefined)
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: [...orderedDialogue, line(data, 258, speaker)],
      menu: [
        `Enter ${model.minimumCrew}–${model.maximumCrew} crew bunks`,
        "Cancel",
      ],
      effects: orderEffects,
      uncertainties: negotiationUncertainties,
      notes,
    });
  const bunks = Number(bunkInput);
  if (
    !Number.isInteger(bunks) ||
    bunks < model.minimumCrew ||
    bunks > model.maximumCrew
  )
    return unavailableCommand(
      path,
      `Crew bunks must be an integer from ${model.minimumCrew} to ${model.maximumCrew}.`,
    );
  const gunInput = path[nextInput + 1];
  if (gunInput && normalizedCommand(gunInput) === "cancel")
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "completed",
      dialogue: [
        ...orderedDialogue,
        line(data, 258, speaker),
        line(data, 259, speaker),
        line(data, 262, speaker, [constructionDays]),
      ],
      menu: MENUS[0x02]!,
      effects: [
        ...orderEffects,
        `retain default allocation of ${model.usedCrew} crew bunks, ${model.usedGuns} gun spaces, and ${defaultCargo} cargo spaces`,
        `set construction time to ${constructionDays} days`,
      ],
      uncertainties: negotiationUncertainties,
      notes,
    });
  if (gunInput === undefined)
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: [
        ...orderedDialogue,
        line(data, 258, speaker),
        line(data, 259, speaker),
      ],
      menu: [`Enter 0–${model.maximumGuns} gun spaces`, "Cancel"],
      effects: orderEffects,
      uncertainties: negotiationUncertainties,
      notes,
    });
  const guns = Number(gunInput);
  if (!Number.isInteger(guns) || guns < 0 || guns > model.maximumGuns)
    return unavailableCommand(
      path,
      `Gun spaces must be an integer from 0 to ${model.maximumGuns}.`,
    );
  const cargo = model.capacity - bunks - guns;
  const capacityDialogue = [
    ...orderedDialogue,
    line(data, 258, speaker),
    line(data, 259, speaker),
    line(data, 260, speaker),
  ];
  const capacityChoice =
    path[nextInput + 2] && normalizedCommand(path[nextInput + 2]!);
  if (!capacityChoice || capacityChoice === "no")
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: capacityDialogue,
      menu: capacityChoice === "no" ? ["Re-enter crew bunks"] : ["Yes", "No"],
      effects: orderEffects,
      uncertainties: negotiationUncertainties,
      notes: [...notes, `Proposed cargo capacity: ${cargo}.`],
    });
  if (capacityChoice !== "yes")
    return unavailableCommand(
      path,
      `Unknown capacity confirmation: ${path[nextInput + 2]}.`,
    );
  return result(path, {
    confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue: [
      ...capacityDialogue,
      line(data, 262, speaker, [constructionDays]),
    ],
    menu: MENUS[0x02]!,
    effects: [
      ...orderEffects,
      `set ${bunks} crew bunks, ${guns} gun spaces, and ${cargo} cargo spaces`,
      `set construction time to ${constructionDays} days`,
    ],
    uncertainties: negotiationUncertainties,
    notes,
  });
}

function shipyardRepairCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Shipyard vendor";
  const ships = harborShips(save, slot, protagonistId);
  const ship = selectedShip(ships, path[1]);
  if (!ship)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown active-ship selector: ${path[1]}.`] : [],
    });
  const model = data.shipModels[ship.typeId]!;
  const repairUnits =
    ship.maximumDurability -
    ship.currentDurability -
    ship.tacking -
    ship.power +
    model.tacking +
    model.power;
  if (repairUnits === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 204, speaker)],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: [`${ship.name} already has full durability, tacking, and power.`],
    });
  const cost = 20 * repairUnits;
  const prompt = line(data, 205, speaker, [cost]);
  const choice = path[2] && normalizedCommand(path[2]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [`Repair units ${repairUnits}; cost ${cost} gold.`],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt, line(data, 206, speaker)],
      menu: ships.map(shipLabel),
      effects: ["return to the ship list without repairing"],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(path, `Unknown Repair confirmation: ${path[2]}.`);
  if (inspectGold(save, slot) < cost)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 207, speaker)],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: [`On-hand gold: ${inspectGold(save, slot)}.`],
    });
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [prompt, line(data, 1047, speaker)],
    menu: ships.map(shipLabel),
    effects: [
      `deduct ${cost} gold`,
      `restore ${ship.name} durability to ${ship.maximumDurability}, tacking to ${model.tacking}, and power to ${model.power}`,
    ],
    uncertainties: [],
    notes: [],
  });
}

function shipyardUsedShipCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Shipyard vendor";
  const base = slotOffset(slot);
  const availableCaptain = shipyardAvailableCaptain(save, slot) !== undefined;
  const activeShips = harborShips(save, slot, protagonistId);
  const exchangeRequired =
    !availableCaptain ||
    activeFleetOccupancyCount(save, slot, protagonistId) >= SHIP_SLOT_COUNT;
  const exchangeEntryDialogue = [
    ...(!availableCaptain ? [line(data, 166, "Shipyard vendor")] : []),
    ...(exchangeRequired ? [line(data, 167, "Shipyard vendor")] : []),
  ];
  let tradeIn: HarborShip | undefined;
  let replacementFlagship: HarborShip | undefined;
  let exchangeDialogue: OrdinaryDialogueLine[] = [];
  let stockPathOffset = 1;
  if (exchangeRequired) {
    const explicitMarker = normalizedCommand(path[1] ?? "") === "exchange";
    const legacyConfirmation =
      explicitMarker && normalizedCommand(path[2] ?? "") === "yes";
    const firstSelector = explicitMarker ? (legacyConfirmation ? 3 : 2) : 1;
    if (
      (explicitMarker && normalizedCommand(path[2] ?? "") === "no") ||
      (!explicitMarker && normalizedCommand(path[1] ?? "") === "no")
    )
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: exchangeEntryDialogue,
        menu: MENUS[0x02]!,
        effects: ["cancel the Used Ship exchange"],
        uncertainties: [],
        notes: [],
      });

    tradeIn = selectedShip(activeShips, path[firstSelector]);
    if (!tradeIn)
      return result(path, {
        confidence: "decoded",
        disposition: path[firstSelector] ? "unavailable" : "shown",
        dialogue: [...exchangeEntryDialogue, line(data, 200, speaker)],
        menu: activeShips.map(
          (ship, index) =>
            `${shipLabel(ship, index)} (trade-in credit ${shipyardTradeInQuote(save, slot, portId, ship, data)} gold)`,
        ),
        effects: [],
        uncertainties: [],
        notes: path[firstSelector]
          ? [`Unknown exchange ship: ${path[firstSelector]}.`]
          : [],
      });

    let next = firstSelector + 1;
    exchangeDialogue = [
      ...exchangeEntryDialogue,
      line(data, 200, speaker),
      line(data, 201, speaker, [tradeIn.name]),
    ];
    const shipConfirmation = path[next]
      ? normalizedCommand(path[next]!)
      : undefined;
    if (!shipConfirmation)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: exchangeDialogue,
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [
          `Trade-in credit: ${shipyardTradeInQuote(save, slot, portId, tradeIn, data)} gold.`,
        ],
      });
    if (shipConfirmation === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: exchangeDialogue,
        menu: activeShips.map(shipLabel),
        effects: ["return to exchange-ship selection"],
        uncertainties: [],
        notes: [],
      });
    if (shipConfirmation !== "yes")
      return unavailableCommand(
        path,
        `Unknown exchange-ship confirmation: ${path[next]}.`,
      );
    next++;

    if (tradeIn.captainId === protagonistId) {
      const flagshipConfirmation = path[next]
        ? normalizedCommand(path[next]!)
        : undefined;
      const flagshipDialogue = [...exchangeDialogue, line(data, 209, speaker)];
      if (!flagshipConfirmation)
        return result(path, {
          confidence: "decoded",
          disposition: "shown",
          dialogue: flagshipDialogue,
          menu: ["Yes", "No"],
          effects: [],
          uncertainties: [],
          notes: [],
        });
      if (flagshipConfirmation === "no")
        return result(path, {
          confidence: "decoded",
          disposition: "shown",
          dialogue: flagshipDialogue,
          menu: activeShips.map(shipLabel),
          effects: ["return to exchange-ship selection"],
          uncertainties: [],
          notes: [],
        });
      if (flagshipConfirmation !== "yes")
        return unavailableCommand(
          path,
          `Unknown flagship exchange confirmation: ${path[next]}.`,
        );
      exchangeDialogue.push(line(data, 209, speaker));
      next++;
      const eligibleFlagships = activeShips.filter(
        (ship) => ship.recordIndex !== tradeIn!.recordIndex,
      );
      replacementFlagship = selectedShip(eligibleFlagships, path[next]);
      if (!replacementFlagship)
        return result(path, {
          confidence: "decoded",
          disposition: path[next] ? "unavailable" : "shown",
          dialogue: [...flagshipDialogue, line(data, 210, speaker)],
          menu: eligibleFlagships.map(shipLabel),
          effects: [],
          uncertainties: [],
          notes: path[next]
            ? [`Unknown replacement flagship: ${path[next]}.`]
            : [],
        });
      exchangeDialogue.push(line(data, 210, speaker));
      next++;
    }
    stockPathOffset = next;
  }

  const stock = base + 0x6e5c;
  if (save[stock + 5] !== portId)
    return result(path, {
      confidence: "ambiguous",
      disposition: "shown",
      dialogue: exchangeDialogue,
      menu: [],
      effects: [],
      uncertainties: [
        "The saved current-port Used Ship cache does not match the saved port. Stock will be refreshed on the next port-arrival update.",
      ],
      notes: [],
    });
  const stockEntries = Array.from(save.subarray(stock, stock + 5))
    .map((id, index) => ({ slot: index + 1, model: data.shipModels[id] }))
    .filter((entry): entry is { slot: number; model: ShipModel } =>
      Boolean(entry.model),
    );
  const menu = stockEntries.map(
    (entry) => `${entry.slot}: ${entry.model.name}`,
  );
  const stockSelector = path[stockPathOffset];
  const numericStockSelector =
    stockSelector && /^(?:model-?)?(\d+)$/i.exec(stockSelector);
  const selectedStock = numericStockSelector
    ? stockEntries.find(
        (entry) => entry.slot === Number(numericStockSelector[1]),
      )
    : stockEntries.find(
        (entry) =>
          stockSelector !== undefined &&
          normalizedCommand(entry.model.name) ===
            normalizedCommand(stockSelector),
      );
  const model = selectedStock?.model;
  if (!model)
    return result(path, {
      confidence: "decoded",
      disposition: path[stockPathOffset] ? "unavailable" : "shown",
      dialogue: exchangeDialogue,
      menu,
      effects: [],
      uncertainties: [],
      notes: path[stockPathOffset]
        ? [`Unknown offered used ship: ${path[stockPathOffset]}.`]
        : [],
    });
  const index = shipyardIndex(save, slot, portId);
  const quote = 10 * Math.floor(((model.basePrice / 10) * index) / 100);
  const charm =
    save[base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE + 0x1a]!;
  const minimumOffer = Math.floor((quote * (500 - charm)) / 500);
  const template =
    base +
    SHIP_INSTANCE_TABLE +
    (SHIP_SLOT_COUNT + RESERVE_SHIP_COUNT + model.id) * SHIP_INSTANCE_SIZE;
  const crewBunks = save.readUInt16LE(template + 0x14);
  const gunSpaces = model.maximumGuns;
  const cargoSpaces = model.capacity - crewBunks - gunSpaces;
  const firstDurabilityStep = Math.floor((9 * model.durability) / 10);
  const usedDurability =
    firstDurabilityStep - Math.floor(firstDurabilityStep / 15);
  const notes = [
    `Selected ${model.name}; Shipyard Price Index ${index}%; quoted price ${quote} gold.`,
    `Minimum acceptable negotiated offer: ${minimumOffer} gold (protagonist Charm ${charm}).`,
    `Purchased state: durability ${usedDurability}, ${crewBunks} crew bunks, ${gunSpaces} gun spaces, and ${cargoSpaces} cargo spaces.`,
    ...(tradeIn
      ? [
          `Trade-in credit: ${shipyardTradeInQuote(save, slot, portId, tradeIn, data)} gold.`,
        ]
      : []),
    "Repeated names are separate stock slots; select by number to distinguish them.",
  ];
  const selection = line(data, 193, speaker);
  const selectedChoice =
    path[stockPathOffset + 1] && normalizedCommand(path[stockPathOffset + 1]!);
  if (!selectedChoice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [...exchangeDialogue, selection],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes,
    });
  if (selectedChoice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [...exchangeDialogue, selection],
      menu,
      effects: ["return to the Used Ship stock list"],
      uncertainties: [],
      notes,
    });
  if (selectedChoice !== "yes")
    return unavailableCommand(
      path,
      `Unknown Used Ship confirmation: ${path[stockPathOffset + 1]}.`,
    );

  const quotedDialogue = [
    ...exchangeDialogue,
    selection,
    line(data, 194, speaker, [quote]),
  ];
  const priceChoice =
    path[stockPathOffset + 2] && normalizedCommand(path[stockPathOffset + 2]!);
  if (!priceChoice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: quotedDialogue,
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes,
    });
  if (priceChoice !== "yes" && priceChoice !== "no")
    return unavailableCommand(
      path,
      `Unknown price confirmation: ${path[stockPathOffset + 2]}.`,
    );

  const gold = inspectGold(save, slot);
  let price = quote;
  let nameIndex = stockPathOffset + 3;
  let priceDialogue = quotedDialogue;
  const negotiationUncertainties: string[] = [];
  if (priceChoice === "no") {
    nameIndex = stockPathOffset + 4;
    const bookkeeperId = save
      .subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT)
      .find(
        (id) =>
          id !== 0xff &&
          save[base + SAILOR_TABLE + id * SAILOR_RECORD_SIZE + 0x26] === 4,
      );
    const accounting =
      bookkeeperId !== undefined &&
      (save[base + SAILOR_TABLE + bookkeeperId * SAILOR_RECORD_SIZE + 0x28]! &
        0x02) !==
        0;
    if (bookkeeperId !== undefined && !accounting)
      negotiationUncertainties.push(
        "The Bookkeeper's displayed estimate uses gameplay RNG and cannot be recovered from the save.",
      );
    priceDialogue = [
      ...quotedDialogue,
      ...(bookkeeperId === undefined
        ? []
        : [
            line(
              data,
              196,
              "Bookkeeper",
              accounting ? [minimumOffer] : ["[RNG-dependent estimate]"],
            ),
          ]),
      line(data, 195, speaker),
    ];
    const tradeInCredit = tradeIn
      ? shipyardTradeInQuote(save, slot, portId, tradeIn, data)
      : 0;
    const availableGold = gold + tradeInCredit;
    const maximumOffer = Math.min(availableGold, quote);
    if (path[stockPathOffset + 3] === undefined)
      return result(path, {
        confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
        disposition: "shown",
        dialogue: priceDialogue,
        menu: [`Enter an offer from 0 to ${maximumOffer} gold`],
        effects: [],
        uncertainties: negotiationUncertainties,
        notes,
      });
    price = Number(path[stockPathOffset + 3]);
    if (!Number.isInteger(price) || price < 0 || price > maximumOffer)
      return unavailableCommand(
        path,
        `The offer must be an integer from 0 to ${maximumOffer} gold.`,
      );
    if (price < minimumOffer)
      return result(path, {
        confidence: "ambiguous",
        disposition: "blocked",
        dialogue: priceDialogue,
        menu: [],
        effects: ["end the Used Ship negotiation without buying the ship"],
        uncertainties: [
          ...negotiationUncertainties,
          "A random(5) roll selects raw refusal 198, or raw 197 and a same-day Shipyard ejection flag on zero.",
        ],
        notes: [
          ...notes,
          `Offer ${price} is below the minimum ${minimumOffer}.`,
        ],
      });
    priceDialogue = [...priceDialogue, line(data, 863, speaker, [price])];
  }

  const tradeInCredit = tradeIn
    ? shipyardTradeInQuote(save, slot, portId, tradeIn, data)
    : 0;
  if (gold + tradeInCredit < price)
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "blocked",
      dialogue: [...priceDialogue, line(data, 239, speaker)],
      menu: [],
      effects: [],
      uncertainties: negotiationUncertainties,
      notes: [
        ...notes,
        `On-hand gold: ${gold}; trade-in credit: ${tradeInCredit}; selected price: ${price}.`,
      ],
    });

  const purchaseEffects = [
    ...(tradeIn
      ? [
          `trade in ${tradeIn.name} for ${tradeInCredit} gold`,
          ...(replacementFlagship
            ? [
                `make ${replacementFlagship.name} the flagship before the exchange`,
              ]
            : []),
        ]
      : []),
    `deduct ${price} gold`,
    `create a used ${model.name} ${tradeIn ? `in the exchange slot replacing ${tradeIn.name}` : "in the first free active-fleet slot"} with durability ${usedDurability}, zero assigned crew and loaded guns`,
    `configure ${crewBunks} crew bunks, ${gunSpaces} gun spaces, and ${cargoSpaces} cargo spaces`,
  ];
  const namingDialogue = [...priceDialogue, line(data, 199, speaker)];
  const proposed = path[nameIndex];
  if (proposed === undefined)
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: namingDialogue,
      menu: ["Enter a ship name of at most 8 characters"],
      effects: purchaseEffects,
      uncertainties: negotiationUncertainties,
      notes: [...notes, "Payment and ship creation precede naming."],
    });
  if (proposed.length === 0 || normalizedCommand(proposed) === "cancel")
    return result(path, {
      confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: namingDialogue,
      menu: ["Enter a ship name of at most 8 characters"],
      effects: purchaseEffects,
      uncertainties: negotiationUncertainties,
      notes: [
        ...notes,
        "Naming retries; the completed payment is not canceled.",
      ],
    });
  if (Buffer.byteLength(proposed, "latin1") > 8)
    return unavailableCommand(
      path,
      "A new ship name must contain 1 to 8 single-byte characters.",
    );
  return result(path, {
    confidence: negotiationUncertainties.length ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue: namingDialogue,
    menu: MENUS[0x02]!,
    effects: [
      ...purchaseEffects,
      `name the new ship ${proposed}`,
      `mark the selected Used Ship stock slot empty`,
    ],
    uncertainties: negotiationUncertainties,
    notes,
  });
}

function shipyardSellCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Shipyard vendor";
  const ships = harborShips(save, slot, protagonistId);
  if (ships.length <= 1)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 208, speaker)],
      menu: MENUS[0x02]!,
      effects: [],
      uncertainties: [],
      notes: ["The game will not sell the fleet's only ship."],
    });
  const ship = selectedShip(ships, path[1]);
  if (!ship)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [line(data, 200, speaker)],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown active-ship selector: ${path[1]}.`] : [],
    });
  const flagship = ship.captainId === protagonistId;
  const hasCargo = ship.usedCapacity > 0;
  const tradeInQuote = shipyardTradeInQuote(save, slot, portId, ship, data);
  const shipDialogue = [line(data, 201, speaker, [ship.name])];
  const selectionChoice = path[2] && normalizedCommand(path[2]);
  if (!selectionChoice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: shipDialogue,
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (selectionChoice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: shipDialogue,
      menu: ships.map(shipLabel),
      effects: ["return to ship selection without selling"],
      uncertainties: [],
      notes: [],
    });
  if (selectionChoice !== "yes")
    return unavailableCommand(
      path,
      `Unknown ship-sale confirmation: ${path[2]}.`,
    );

  let next = 3;
  let dialogue = [...shipDialogue];
  const effects: string[] = [];
  if (flagship) {
    const flagshipChoice = path[next] && normalizedCommand(path[next]!);
    dialogue.push(line(data, 209, speaker));
    if (!flagshipChoice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ["Yes", "No"],
        effects: ["select a replacement flagship before the sale can continue"],
        uncertainties: [],
        notes: [],
      });
    if (flagshipChoice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ships.map(shipLabel),
        effects: ["return to ship selection without selling"],
        uncertainties: [],
        notes: [],
      });
    if (flagshipChoice !== "yes")
      return unavailableCommand(
        path,
        `Unknown flagship-sale confirmation: ${path[next]}.`,
      );
    next++;
    dialogue.push(line(data, 210, speaker));
    const replacementShips = ships.filter(
      (candidate) => candidate.recordIndex !== ship.recordIndex,
    );
    const replacement = selectedShip(replacementShips, path[next]);
    if (!replacement)
      return result(path, {
        confidence: "decoded",
        disposition: path[next] ? "unavailable" : "shown",
        dialogue,
        menu: replacementShips.map(shipLabel),
        effects: [],
        uncertainties: [],
        notes: path[next]
          ? [`Unknown replacement flagship: ${path[next]}.`]
          : [],
      });
    effects.push(`make ${replacement.name} the flagship before the sale`);
    next++;
  } else {
    effects.push("retain the current flagship");
  }

  if (hasCargo) {
    const cargoChoice = path[next] && normalizedCommand(path[next]!);
    dialogue.push(line(data, 211, speaker));
    if (!cargoChoice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ["Yes", "No"],
        effects: [...effects, "discard carried cargo if confirmed"],
        uncertainties: [],
        notes: [],
      });
    if (cargoChoice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ships.map(shipLabel),
        effects: ["return to ship selection without selling"],
        uncertainties: [],
        notes: [],
      });
    if (cargoChoice !== "yes")
      return unavailableCommand(
        path,
        `Unknown cargo-disposal confirmation: ${path[next]}.`,
      );
    effects.push("discard carried cargo");
    next++;
  }

  if (ship.crew > 0) {
    const crewChoice = path[next] && normalizedCommand(path[next]!);
    dialogue.push(line(data, 212, speaker));
    if (!crewChoice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ["Yes", "No"],
        effects: [...effects, "dismiss the ship's crew if confirmed"],
        uncertainties: [],
        notes: [],
      });
    if (crewChoice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ships.map(shipLabel),
        effects: ["return to ship selection without selling"],
        uncertainties: [],
        notes: [],
      });
    if (crewChoice !== "yes")
      return unavailableCommand(
        path,
        `Unknown crew-dismissal confirmation: ${path[next]}.`,
      );
    effects.push("dismiss the ship's crew");
    next++;
  }

  const offer = line(data, 213, speaker, [tradeInQuote]);
  dialogue.push(offer);
  const offerChoice = path[next] && normalizedCommand(path[next]!);
  if (!offerChoice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue,
      menu: ["Yes", "No"],
      effects: [...effects, `add ${tradeInQuote} gold`, `remove ${ship.name}`],
      uncertainties: [],
      notes: [
        `Sale offer: ${tradeInQuote} gold using the saved hull material and this port's Shipyard Price Index.`,
      ],
    });
  if (offerChoice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [...dialogue, line(data, 214, speaker)],
      menu: ships.map(shipLabel),
      effects: ["return to ship selection without selling"],
      uncertainties: [],
      notes: [],
    });
  if (offerChoice !== "yes")
    return unavailableCommand(
      path,
      `Unknown final sale confirmation: ${path[next]}.`,
    );
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue,
    menu: ships
      .filter((candidate) => candidate.recordIndex !== ship.recordIndex)
      .map(shipLabel),
    effects: [
      ...effects,
      `add ${tradeInQuote} gold`,
      `remove ${ship.name} from the active fleet`,
    ],
    uncertainties: [],
    notes: [],
  });
}

function remodelFigureheadCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  ship: HarborShip,
  path: readonly string[],
  data: OrdinaryDialogueData,
  economy: number,
  industry: number,
  luck: number,
  rareEligible: boolean,
  rareUncertainties: readonly string[],
  ships: readonly HarborShip[],
): OrdinaryCommandResult {
  const normalCount = Math.min(Math.floor(economy / 100) + 1, 8);
  const ordinary = FIGUREHEAD_NAMES.slice(0, normalCount);
  const choices = [...ordinary];
  const selector = path[3];
  const numeric = selector && /^(?:figurehead-?)?(\d+)$/i.exec(selector);
  const selectedIndex = numeric
    ? Number(numeric[1])
    : selector
      ? choices.findIndex(
          (name) => normalizedCommand(name) === normalizedCommand(selector),
        ) + 1
      : undefined;
  const possibleChoices = rareEligible
    ? [...choices, "Angel", ...(luck > 90 ? ["Goddess"] : [])]
    : choices;
  const chosen =
    selectedIndex !== undefined && selectedIndex >= 1
      ? possibleChoices[selectedIndex - 1]
      : possibleChoices.find(
          (name) =>
            selector !== undefined &&
            normalizedCommand(name) === normalizedCommand(selector),
        );
  const dialogue = [
    line(data, 267, "Shipyard vendor"),
    line(data, 268, "Shipyard vendor"),
  ];
  if (!chosen)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: selector ? "unavailable" : "shown",
      dialogue,
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: [],
      uncertainties: rareUncertainties,
      notes: selector ? [`Unknown figurehead selection: ${selector}.`] : [],
    });
  const figureheadIndex = possibleChoices.indexOf(chosen) + 1;
  const cost = 500 * figureheadIndex * figureheadIndex;
  const offered = [
    ...dialogue,
    line(data, 269, "Shipyard vendor", [chosen, cost]),
  ];
  const confirmation = path[4] && normalizedCommand(path[4]);
  const uncertainty = rareEligible ? rareUncertainties : [];
  const effects = [
    `deduct ${cost} gold`,
    `fit ${ship.name} with a ${chosen} figurehead`,
  ];
  if (!confirmation)
    return result(path, {
      confidence: uncertainty.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: offered,
      menu: ["Yes", "No"],
      effects,
      uncertainties: uncertainty,
      notes: [`Figurehead position ${figureheadIndex} costs ${cost} gold.`],
    });
  if (confirmation === "no")
    return result(path, {
      confidence: uncertainty.length ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: offered,
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: ["return to figurehead selection"],
      uncertainties: uncertainty,
      notes: [],
    });
  if (confirmation !== "yes")
    return unavailableCommand(
      path,
      `Unknown figurehead confirmation: ${path[4]}.`,
    );
  if (inspectGold(save, slot) < cost)
    return result(path, {
      confidence: uncertainty.length ? "ambiguous" : "decoded",
      disposition: "blocked",
      dialogue: [...offered, line(data, 207, "Shipyard vendor")],
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: [],
      uncertainties: uncertainty,
      notes: [`On-hand gold: ${inspectGold(save, slot)}; required: ${cost}.`],
    });
  return result(path, {
    confidence: uncertainty.length ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue: offered,
    menu: ships.map(shipLabel),
    effects,
    uncertainties: uncertainty,
    notes: [
      `Store figurehead index ${figureheadIndex} in ${ship.name}'s provision record.`,
    ],
  });
}

function remodelGunsCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  ship: HarborShip,
  path: readonly string[],
  data: OrdinaryDialogueData,
  economy: number,
  industry: number,
  rareEligible: boolean,
  rareUncertainties: readonly string[],
  ships: readonly HarborShip[],
): OrdinaryCommandResult {
  const model = data.shipModels[ship.typeId]!;
  const normalCount = Math.min(Math.floor((economy + industry) / 200) + 1, 6);
  const ordinary = GUN_NAMES.slice(0, normalCount);
  const possibleChoices = rareEligible ? [...ordinary, "Carronade"] : ordinary;
  const selector = path[3];
  const numeric = selector && /^(?:gun-?)?(\d+)$/i.exec(selector);
  const selectedIndex = numeric
    ? Number(numeric[1])
    : selector
      ? possibleChoices.findIndex(
          (name) => normalizedCommand(name) === normalizedCommand(selector),
        ) + 1
      : undefined;
  const chosen =
    selectedIndex !== undefined && selectedIndex >= 1
      ? possibleChoices[selectedIndex - 1]
      : undefined;
  const dialogue = [
    line(data, 270, "Shipyard vendor"),
    line(data, 268, "Shipyard vendor"),
  ];
  if (!chosen)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: selector ? "unavailable" : "shown",
      dialogue,
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: [],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: selector ? [`Unknown gun type selection: ${selector}.`] : [],
    });
  const gunIndex = possibleChoices.indexOf(chosen);
  const shipSlot = activeHarborShipSlot(save, slot, protagonistId, ship);
  const currentGunType = save[shipSlot + 8]! & 7;
  const configuredGunSpaces = Math.max(
    0,
    model.capacity - ship.configuredCrew - ship.cargoCapacity,
  );
  const remaining =
    currentGunType === gunIndex + 1
      ? Math.max(0, configuredGunSpaces - ship.guns)
      : configuredGunSpaces;
  if (configuredGunSpaces === 0)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "blocked",
      dialogue: [...dialogue, line(data, 1021, "Shipyard vendor")],
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: [],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [`${ship.name} has no gun spaces.`],
    });
  if (remaining === 0)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "blocked",
      dialogue: [...dialogue, line(data, 1020, "Shipyard vendor")],
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: [],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [
        `${ship.name} already has its maximum ${configuredGunSpaces} guns of this type.`,
      ],
    });
  const quantityInput = path[4];
  const quantity =
    quantityInput === undefined ? undefined : Number(quantityInput);
  const quantityDialogue = [
    ...dialogue,
    line(data, 334, "Shipyard vendor", [
      remaining,
      `${chosen}${remaining === 1 ? "" : "s"}`,
    ]),
    line(data, 271, "Shipyard vendor"),
  ];
  if (quantity === undefined)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: quantityDialogue,
      menu: [`Enter 1–${remaining} guns`, "Cancel"],
      effects: [],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [],
    });
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > remaining)
    return unavailableCommand(
      path,
      `Gun quantity must be an integer from 0 to ${remaining}.`,
    );
  if (quantity === 0)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue,
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: ["return to gun-type selection"],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [],
    });
  const cost = quantity * GUN_PRICES[gunIndex]!;
  const offered = [
    ...quantityDialogue,
    line(data, 272, "Shipyard vendor", [
      quantity,
      chosen,
      quantity === 1 ? "" : "s",
      cost,
    ]),
  ];
  const confirmation = path[5] && normalizedCommand(path[5]);
  if (!confirmation)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: offered,
      menu: ["Yes", "No"],
      effects: [
        `deduct ${cost} gold`,
        `load ${quantity} ${chosen}${quantity === 1 ? "" : "s"} onto ${ship.name}`,
      ],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [`${chosen} costs ${GUN_PRICES[gunIndex]} gold per gun.`],
    });
  if (confirmation === "no")
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "shown",
      dialogue: offered,
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: ["return to gun-type selection"],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [],
    });
  if (confirmation !== "yes")
    return unavailableCommand(
      path,
      `Unknown gun purchase confirmation: ${path[5]}.`,
    );
  if (inspectGold(save, slot) < cost)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: "blocked",
      dialogue: [...offered, line(data, 207, "Shipyard vendor")],
      menu: possibleChoices.map((name, index) => `${index + 1}: ${name}`),
      effects: [],
      uncertainties: rareEligible ? rareUncertainties : [],
      notes: [`On-hand gold: ${inspectGold(save, slot)}; required: ${cost}.`],
    });
  return result(path, {
    confidence: rareEligible ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue: offered,
    menu: ships.map(shipLabel),
    effects: [
      `deduct ${cost} gold`,
      `load ${quantity} ${chosen}${quantity === 1 ? "" : "s"} onto ${ship.name}`,
      `set ${ship.name}'s gun type to ${chosen}`,
    ],
    uncertainties: rareEligible ? rareUncertainties : [],
    notes: [],
  });
}

function shipyardRemodelCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const choices = ["Figurehead", "Guns", "Load Capacity", "Rename"];
  const subcommand =
    path[1] &&
    choices.find(
      (choice) => normalizedCommand(choice) === normalizedCommand(path[1]!),
    );
  if (!subcommand)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [],
      menu: choices,
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown Remodel command: ${path[1]}.`] : [],
    });
  const metadata =
    slotOffset(slot) + PORT_METADATA_TABLE + portId * PORT_METADATA_RECORD_SIZE;
  const economy = save.readUInt16LE(metadata + 2);
  const industry = save.readUInt16LE(metadata + 6);
  const sailor =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const luck = save[sailor + 0x1b]!;
  const rareEligible =
    subcommand === "Figurehead"
      ? economy > 800 && industry > 800 && luck > 80
      : subcommand === "Guns"
        ? economy > 900 && industry > 900 && luck > 90
        : false;
  const rareUncertainties = !rareEligible
    ? []
    : subcommand === "Figurehead"
      ? [
          "A 1-in-20 gameplay-RNG roll may add Angel and show raw message 266 before the ordinary selection prompt.",
          ...(luck > 90
            ? [
                `If Angel appears, a second random(${luck}) roll may also add Goddess when its result is at least 90.`,
              ]
            : []),
        ]
      : [
          "A 1-in-20 gameplay-RNG roll may add Carronade and show raw message 266 before the ordinary selection prompt.",
        ];
  const selectionMessage =
    subcommand === "Figurehead" ? 267 : subcommand === "Guns" ? 270 : 273;
  const ships = harborShips(save, slot, protagonistId);
  const ship = selectedShip(ships, path[2]);
  if (!ship)
    return result(path, {
      confidence: rareEligible ? "ambiguous" : "decoded",
      disposition: path[2] ? "unavailable" : "shown",
      dialogue: [line(data, selectionMessage, "Shipyard vendor")],
      menu: ships.map(shipLabel),
      effects: [],
      uncertainties: rareUncertainties,
      notes: path[2] ? [`Unknown active-ship selector: ${path[2]}.`] : [],
    });
  if (subcommand === "Rename") {
    const proposed = path[3];
    if (proposed === undefined)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [
          line(data, 273, "Shipyard vendor"),
          line(data, 275, "Shipyard vendor"),
        ],
        menu: ["Enter a name of at most 16 characters", "Cancel"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (proposed.length === 0 || Buffer.byteLength(proposed, "latin1") > 16)
      return unavailableCommand(
        path,
        "A ship name must contain 1 to 16 single-byte characters.",
      );
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 273, "Shipyard vendor"),
        line(data, 275, "Shipyard vendor"),
      ],
      menu: choices,
      effects: [`rename ${ship.name} to ${proposed}`],
      uncertainties: [],
      notes: [],
    });
  }
  if (subcommand === "Load Capacity") {
    const cost = data.shipModels[ship.typeId]!.basePrice / 10;
    const dialogue = [
      line(data, 273, "Shipyard vendor"),
      line(data, 274, "Shipyard vendor", [cost]),
    ];
    const choice = path[3] && normalizedCommand(path[3]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [`The capacity remodel costs ${cost} gold if completed.`],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue,
        menu: ships.map(shipLabel),
        effects: ["return to ship selection without remodeling"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown Load Capacity confirmation: ${path[3]}.`,
      );
    if (inspectGold(save, slot) < cost)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...dialogue, line(data, 207, "Shipyard vendor")],
        menu: ships.map(shipLabel),
        effects: [],
        uncertainties: [],
        notes: [`On-hand gold: ${inspectGold(save, slot)}.`],
      });
    const model = data.shipModels[ship.typeId]!;
    const bunkInput = path[4];
    if (bunkInput === undefined)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [...dialogue, line(data, 258, "Shipyard vendor")],
        menu: [`Enter ${model.minimumCrew}–${model.maximumCrew} crew bunks`],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const bunks = Number(bunkInput);
    if (
      !Number.isInteger(bunks) ||
      bunks < model.minimumCrew ||
      bunks > model.maximumCrew
    )
      return unavailableCommand(
        path,
        `Crew bunks must be an integer from ${model.minimumCrew} to ${model.maximumCrew}.`,
      );
    const gunInput = path[5];
    if (gunInput === undefined)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [
          ...dialogue,
          line(data, 258, "Shipyard vendor"),
          line(data, 259, "Shipyard vendor"),
        ],
        menu: [`Enter 0–${model.maximumGuns} gun spaces`],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const gunSpaces = Number(gunInput);
    if (
      !Number.isInteger(gunSpaces) ||
      gunSpaces < 0 ||
      gunSpaces > model.maximumGuns
    )
      return unavailableCommand(
        path,
        `Gun spaces must be an integer from 0 to ${model.maximumGuns}.`,
      );
    const cargoCapacity = model.capacity - bunks - gunSpaces;
    const configuredDialogue = [
      ...dialogue,
      line(data, 258, "Shipyard vendor"),
      line(data, 259, "Shipyard vendor"),
      line(data, 260, "Shipyard vendor"),
    ];
    const confirmation = path[6] && normalizedCommand(path[6]);
    if (!confirmation || confirmation === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: configuredDialogue,
        menu: confirmation === "no" ? ["Re-enter crew bunks"] : ["Yes", "No"],
        effects: confirmation === "no" ? ["return to capacity inputs"] : [],
        uncertainties: [],
        notes: [`Proposed cargo capacity: ${cargoCapacity}.`],
      });
    if (confirmation !== "yes")
      return unavailableCommand(
        path,
        `Unknown capacity configuration confirmation: ${path[6]}.`,
      );
    if (ship.usedCapacity > cargoCapacity)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...configuredDialogue, line(data, 20, "Shipyard vendor")],
        menu: ["Re-enter crew bunks"],
        effects: [],
        uncertainties: [],
        notes: [
          `Carried provisions and goods occupy ${ship.usedCapacity} of ${cargoCapacity} proposed cargo spaces.`,
        ],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: configuredDialogue,
      menu: ships.map(shipLabel),
      effects: [
        `deduct ${cost} gold`,
        `set ${ship.name} to ${bunks} crew bunks, ${gunSpaces} gun spaces, and ${cargoCapacity} cargo spaces`,
        `reduce assigned crew to at most ${bunks} and loaded guns to at most ${gunSpaces}`,
      ],
      uncertainties: [],
      notes: [],
    });
  }
  if (subcommand === "Figurehead")
    return remodelFigureheadCommand(
      save,
      slot,
      protagonistId,
      ship,
      path,
      data,
      economy,
      industry,
      luck,
      rareEligible,
      rareUncertainties,
      ships,
    );
  if (subcommand === "Guns")
    return remodelGunsCommand(
      save,
      slot,
      protagonistId,
      ship,
      path,
      data,
      economy,
      industry,
      rareEligible,
      rareUncertainties,
      ships,
    );
  return result(path, {
    confidence: rareEligible ? "ambiguous" : "decoded",
    disposition: "completed",
    dialogue: [
      line(data, selectionMessage, "Shipyard vendor"),
      line(data, 268, "Shipyard vendor"),
    ],
    menu: [],
    effects: [
      `open the interactive ${subcommand.toLowerCase()} controls for ${ship.name}`,
    ],
    uncertainties: rareUncertainties,
    notes: [
      "The final cost and resulting ship fields depend on the player's following selection or numeric input.",
    ],
  });
}

const GUILD_ASSIGNMENTS = [
  "Transport Goods",
  "Buy Goods",
  "Deliver Letter",
  "Defeat Pirates",
  "Collect Debt",
] as const;
const PALACE_REGION_NAMES = [
  "Europe",
  "New World",
  "West Africa",
  "East Africa",
  "Middle East",
  "India",
  "Southeast Asia",
  "Far East",
] as const;
const PALACE_REGION_DIVISORS = [4, 3, 3, 2, 3, 1, 1, 1] as const;

function portName(save: Buffer, slot: number, portId: number): string {
  if (portId >= PORT_COUNT) return `port ${portId}`;
  const record = slotOffset(slot) + PORT_TABLE + portId * PORT_RECORD_SIZE;
  return cstring(save.subarray(record + 4, record + 18));
}

function palaceNation(save: Buffer, slot: number, portId: number): number {
  const base = slotOffset(slot);
  for (let nation = 0; nation < 6; nation++)
    if (
      save[base + NATION_RECORDS + nation * NATION_RECORD_SIZE + 0x0a] ===
      portId
    )
      return nation;
  const controller =
    save[base + PORT_TABLE + portId * PORT_RECORD_SIZE + PORT_CONTROLLER]! & 7;
  return controller;
}

function palaceRuler(nation: number): string {
  return `${NATION_NAMES[nation] ?? `nation ${nation}`} ruler`;
}

function sphereOfInfluence(
  save: Buffer,
  slot: number,
  nation: number,
): readonly string[] {
  const base = slotOffset(slot);
  const controller = nation;
  const economies = Array<number>(8).fill(0);
  const industries = Array<number>(8).fill(0);
  const counts = Array<number>(8).fill(0);
  for (let port = 0; port < 100; port++) {
    const savedController =
      save[base + PORT_TABLE + port * PORT_RECORD_SIZE + PORT_CONTROLLER]! & 7;
    if (savedController !== controller) continue;
    const metadata =
      base + PORT_METADATA_TABLE + port * PORT_METADATA_RECORD_SIZE;
    const region = save[metadata + 0x1e]!;
    if (region >= 8) continue;
    counts[region]!++;
    economies[region]! += save.readUInt16LE(metadata + 2);
    industries[region]! += save.readUInt16LE(metadata + 6);
  }
  const active = industries.map((industry, region) => {
    if (industry < 300) return false;
    if (region === 3) return industries[2]! >= 300 || industries[4]! >= 300;
    if (region === 5) return industries[4]! >= 300;
    if (region === 6) return industries[4]! >= 300 && industries[5]! >= 300;
    if (region === 7)
      return (
        industries[4]! >= 300 && industries[5]! >= 300 && industries[6]! >= 300
      );
    return true;
  });
  return PALACE_REGION_NAMES.map((name, region) => {
    const rating = active[region]
      ? Math.floor(economies[region]! / PALACE_REGION_DIVISORS[region]!)
      : 0;
    return `${name}: ${counts[region]} allied ports, Economy ${economies[region]}, Industry ${industries[region]}, rating ${rating}${active[region] ? "" : " (inactive supply line)"}.`;
  });
}

function palaceMeetRulerCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const nation = palaceNation(save, slot, portId);
  const speaker = palaceRuler(nation);
  const menu = ["Sphere of Influence", "Letter of Marque", "Tax Free Permit"];
  const subcommand = path[1] && normalizedCommand(path[1]);
  if (!subcommand)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [],
      menu,
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (subcommand === "sphereofinfluence")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [line(data, 453, speaker), line(data, 454, speaker)],
      menu,
      effects: ["display the current Sphere of Influence report"],
      uncertainties: [],
      notes: [...sphereOfInfluence(save, slot, nation)],
    });

  const inventory = inspectItems(save, slot);
  const emptySlot = inventory.indexOf(0xff);
  if (subcommand === "letterofmarque") {
    const itemId = 29 + nation;
    if (inventory.includes(itemId))
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 864, "Palace attendant")],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (emptySlot < 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 865, "Palace attendant")],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const fame = inspectFame(save, slot, protagonistId);
    if (fame.piracy < 1_000)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [
          line(data, 866, "Palace attendant"),
          line(data, 867, "Palace attendant"),
        ],
        menu,
        effects: [],
        uncertainties: [],
        notes: [`Piracy Fame: ${fame.piracy}.`],
      });
    if (fame.piracy < fame.trade || fame.piracy < fame.adventure)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [
          line(data, 866, "Palace attendant"),
          line(data, 868, "Palace attendant"),
        ],
        menu,
        effects: [],
        uncertainties: [],
        notes: [
          `Trade ${fame.trade}, Piracy ${fame.piracy}, Adventure ${fame.adventure}.`,
        ],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 866, "Palace attendant"),
        line(data, 869, "Palace attendant"),
        line(data, 870, speaker),
        line(data, 871, speaker),
      ],
      menu,
      effects: [
        `put Marque (${NATION_NAMES[nation]}) (item ${itemId}) in inventory slot ${emptySlot + 1}`,
      ],
      uncertainties: [],
      notes: [],
    });
  }

  if (subcommand === "taxfreepermit") {
    const itemId = 35 + nation;
    if (inventory.includes(itemId))
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 872, "Palace attendant")],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (emptySlot < 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 865, "Palace attendant")],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const base = slotOffset(slot);
    const sailor = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
    const affiliation = save[sailor + SAILOR_AFFILIATION]! & 7;
    const rank = inspectRank(save, slot, protagonistId);
    const ownNation = affiliation === nation;
    const units = ownNation ? (rank >= 6 ? 0 : 7 - rank) : 11 - rank;
    const price = units * 10_000;
    const introduction = [
      line(data, 873, "Palace attendant"),
      ...(save[base + 7]! % 6 < 3 ? [line(data, 874, "Palace attendant")] : []),
      line(data, 875, "Palace attendant"),
    ];
    const firstChoice = path[2] && normalizedCommand(path[2]);
    if (!firstChoice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: introduction,
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (firstChoice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: introduction,
        menu,
        effects: ["return without requesting a permit"],
        uncertainties: [],
        notes: [],
      });
    if (firstChoice !== "yes")
      return unavailableCommand(
        path,
        `Unknown permit request selection: ${path[2]}.`,
      );
    const offer = [
      ...introduction,
      line(data, 869, "Palace attendant"),
      line(data, 876, speaker),
      ...(units > 0 ? [line(data, 877, speaker, [units])] : []),
    ];
    const secondChoice = path[3] && normalizedCommand(path[3]);
    if (units > 0 && !secondChoice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: offer,
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [`Permit price: ${price} gold.`],
      });
    if (units > 0 && secondChoice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: offer,
        menu,
        effects: ["return without buying a permit"],
        uncertainties: [],
        notes: [],
      });
    if (units > 0 && secondChoice !== "yes")
      return unavailableCommand(
        path,
        `Unknown permit-price selection: ${path[3]}.`,
      );
    if (inspectGold(save, slot) < price)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...offer, line(data, 878, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: [`Permit price: ${price} gold.`],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [...offer, line(data, 1032, speaker)],
      menu,
      effects: [
        ...(price > 0 ? [`deduct ${price} gold`] : []),
        `put Tax Permit (${NATION_NAMES[nation]}) (item ${itemId}) in inventory slot ${emptySlot + 1}`,
      ],
      uncertainties: [],
      notes: [`Permit units: ${units}.`],
    });
  }
  return unavailableCommand(path, `Unknown Meet Ruler command: ${path[1]}.`);
}

function palaceDefectCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const base = slotOffset(slot);
  const nation = palaceNation(save, slot, portId);
  const destination = nation;
  const sailor = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const former = save[sailor + SAILOR_AFFILIATION]! & 7;
  const flags = save.readUInt32LE(base + 0xbc);
  const section = save[base + SHARED_SCENARIO_START]!;
  const royalMission =
    section !== 0 &&
    section !== 0xff &&
    save.readUInt16LE(base + SHARED_VARIABLES_START + 6 * 2) >= 6;
  const invitation = (flags & ((1 << 17) | (1 << 18))) !== 0;
  const reasons = [
    ...(former === destination
      ? ["this is already the protagonist's nation"]
      : []),
    ...(invitation
      ? ["a royal invitation or royal offer is already in progress"]
      : []),
    ...(royalMission ? ["an accepted royal mission is active"] : []),
  ];
  if (reasons.length > 0)
    return result(path, {
      confidence: "decoded",
      disposition: "unavailable",
      dialogue: [],
      menu: ["Meet Ruler", "Defect", "Gold", "Ship"],
      effects: [],
      uncertainties: [],
      notes: [`Defect is disabled because ${reasons.join(" and ")}.`],
    });

  const speaker = palaceRuler(nation);
  const prompt = line(data, 458, speaker);
  const choice = path[1] && normalizedCommand(path[1]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt, line(data, 459, speaker)],
      menu: ["Meet Ruler", "Defect", "Gold", "Ship"],
      effects: ["retain the current affiliation"],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(path, `Unknown Defect confirmation: ${path[1]}.`);

  const friendship = base + FAME_START + protagonistId * FAME_RECORD_SIZE + 6;
  const formerFriendship = save[friendship + former]!;
  const destinationFriendship = save[friendship + destination]!;
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [prompt, line(data, 460, speaker)],
    menu: ["Meet Ruler", "Defect", "Gold", "Ship"],
    effects: [
      `change affiliation from ${NATION_NAMES[former] ?? `nation ${former}`} to ${NATION_NAMES[destination] ?? `nation ${destination}`}`,
      ...(formerFriendship >= 30
        ? [
            `reduce former-nation Friendship from ${formerFriendship} to ${formerFriendship - 30}`,
          ]
        : []),
      `increase destination-nation Friendship from ${destinationFriendship} to ${Math.min(200, destinationFriendship + 10)}`,
      "clear the protagonist's former national-fleet state",
    ],
    uncertainties: [],
    notes: [],
  });
}

function palaceGoldCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const base = slotOffset(slot);
  const nation = palaceNation(save, slot, portId);
  const controller = nation;
  const sailor = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  if ((save[sailor + SAILOR_AFFILIATION]! & 7) !== controller)
    return result(path, {
      confidence: "decoded",
      disposition: "unavailable",
      dialogue: [],
      menu: ["Meet Ruler", "Defect"],
      effects: [],
      uncertainties: [],
      notes: ["Gold aid is disabled at a foreign Palace."],
    });

  const speaker = palaceRuler(nation);
  const record = base + NATION_RECORDS + nation * NATION_RECORD_SIZE;
  const units = save[record + 5]!;
  if (units === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 461, speaker)],
      menu: ["Meet Ruler", "Gold", "Ship"],
      effects: [],
      uncertainties: [],
      notes: ["The cached Gold-aid amount is zero."],
    });
  const award = units * 1_000;
  const gold = inspectGold(save, slot);
  if (gold + award > GOLD_CARRYING_LIMIT)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 530, speaker)],
      menu: ["Meet Ruler", "Gold", "Ship"],
      effects: [],
      uncertainties: [],
      notes: [
        `On-hand gold ${gold} plus aid ${award} exceeds ${GOLD_CARRYING_LIMIT}.`,
      ],
    });
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [line(data, 462, speaker, [units]), line(data, 463, speaker)],
    menu: ["Meet Ruler", "Gold", "Ship"],
    effects: [`add ${award} gold`, "clear the cached Gold-aid amount"],
    uncertainties: [],
    notes: [],
  });
}

function palaceShipCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const base = slotOffset(slot);
  const nation = palaceNation(save, slot, portId);
  const controller = nation;
  const sailor = base + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  if ((save[sailor + SAILOR_AFFILIATION]! & 7) !== controller)
    return result(path, {
      confidence: "decoded",
      disposition: "unavailable",
      dialogue: [],
      menu: ["Meet Ruler", "Defect"],
      effects: [],
      uncertainties: [],
      notes: ["Ship aid is disabled at a foreign Palace."],
    });

  const speaker = palaceRuler(nation);
  const record = base + NATION_RECORDS + nation * NATION_RECORD_SIZE;
  const shipType = save[record + 7]!;
  const remaining = save[record + 8]!;
  if (remaining === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 461, speaker)],
      menu: ["Meet Ruler", "Gold", "Ship"],
      effects: [],
      uncertainties: [],
      notes: ["The cached Ship-aid count is zero."],
    });

  const activeShips = harborShips(save, slot, protagonistId);
  if (activeShips.length >= 10)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 531, speaker)],
      menu: ["Meet Ruler", "Gold", "Ship"],
      effects: [],
      uncertainties: [],
      notes: [`Ships in the protagonist's fleet: ${activeShips.length}.`],
    });

  const assignedCaptains = new Set<number>();
  for (let index = 0; index < SHIP_SLOT_COUNT + RESERVE_SHIP_COUNT; index++) {
    const captain =
      save[base + PLAYER_SUPPLY_RECORDS + index * SUPPLY_RECORD_SIZE + 0x1b]!;
    if (captain < 0x80) assignedCaptains.add(captain);
  }
  const eligibleMates = Array.from(
    save.subarray(base + MATE_ROSTER, base + MATE_ROSTER + MATE_ROSTER_COUNT),
  ).filter(
    (id) => id !== 0xff && id !== protagonistId && !assignedCaptains.has(id),
  );
  if (eligibleMates.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 532, speaker)],
      menu: ["Meet Ruler", "Gold", "Ship"],
      effects: [],
      uncertainties: [],
      notes: ["No employed mate is free to captain the awarded ship."],
    });

  const typeName = data.shipNames[shipType] || `ship type ${shipType}`;
  const introduction = [
    line(data, 464, speaker, [typeName]),
    line(data, 555, speaker),
  ];
  const shipName = path[1]?.trim();
  if (!shipName)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: introduction,
      menu: ["Enter ship name"],
      effects: [],
      uncertainties: [],
      notes: [`Awarded type: ${typeName}.`],
    });
  const captain = eligibleMates[0]!;
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [
      ...introduction,
      line(data, 552, speaker),
      line(data, 463, speaker),
    ],
    menu: ["Meet Ruler", "Gold", "Ship"],
    effects: [
      `create a ${typeName} named ${shipName}`,
      `assign ${sailorName(save, slot, captain)} as captain`,
      `decrement the cached Ship-aid count from ${remaining} to ${remaining - 1}`,
      "make the awarded vessel available through the Shipyard",
    ],
    uncertainties: [],
    notes: [],
  });
}

function palaceCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const requested = normalizedCommand(path[0]!);
  if (requested === "meetruler")
    return palaceMeetRulerCommand(
      save,
      slot,
      protagonistId,
      portId,
      path,
      data,
    );
  if (requested === "defect")
    return palaceDefectCommand(save, slot, protagonistId, portId, path, data);
  if (requested === "gold")
    return palaceGoldCommand(save, slot, protagonistId, portId, path, data);
  if (requested === "ship")
    return palaceShipCommand(save, slot, protagonistId, portId, path, data);
  return unavailableCommand(
    path,
    "Secret Call has no ordinary Palace dispatch handler.",
  );
}

function guildJobCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const base = slotOffset(slot);
  const section = save[base + SHARED_SCENARIO_START]!;
  if (section !== 0 && section !== 0xff) {
    const origin = save.readUInt16LE(base + SHARED_VARIABLES_START + 17 * 2);
    const samePort = origin === portId;
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        samePort
          ? line(data, 931, "Old Guild Worker")
          : line(data, 338, "Old Guild Worker", [portName(save, slot, origin)]),
      ],
      menu: ["Job Assignment", "Country Info"],
      effects: [],
      uncertainties: [],
      notes: [
        `Shared assignment section ${section} is already active.`,
        "The origin-port comparison uses shared variable 17, the common assignment origin field.",
      ],
    });
  }

  const selectors = Array.from({ length: 3 }, (_, index) =>
    portId >= 42
      ? 2
      : save.readUInt16LE(base + SHARED_VARIABLES_START + index * 2),
  );
  const rows = selectors.map(
    (selector, index) =>
      `${index + 1}: ${GUILD_ASSIGNMENTS[selector] ?? `assignment ${selector}`}`,
  );
  const selected = path[1] && /^(?:job-?)?(\d+)$/i.exec(path[1]);
  if (!selected)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [],
      menu: rows,
      effects: [],
      uncertainties: [],
      notes: path[1]
        ? [`Unknown assignment-row selector: ${path[1]}.`]
        : ["Duplicate assignment labels are valid and remain separate rows."],
    });
  const row = Number(selected[1]) - 1;
  const selector = selectors[row];
  if (selector === undefined || selector < 0 || selector > 4)
    return unavailableCommand(path, `Unknown assignment row: ${path[1]}.`);
  return result(path, {
    confidence: "decoded",
    disposition: "shown",
    dialogue: [],
    menu: ["Accept", "Reject"],
    effects: [
      `select row ${row + 1}: ${GUILD_ASSIGNMENTS[selector]}`,
      `copy shared variable ${3 + row} to variable 8`,
      `dispatch the Old Guild Worker's shared-scenario offer from section 0, subsection ${selector + 1}`,
    ],
    uncertainties: [],
    notes: [
      "The mission-specific offer is scenario dialogue; the command resolver identifies its exact shared route table rather than duplicating that transcript as ordinary dialogue.",
    ],
  });
}

function guildNationSelector(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const numeric = /^(?:nation-?)?(\d+)$/i.exec(value);
  if (numeric) {
    const ordinal = Number(numeric[1]) - 1;
    return ordinal >= 0 && ordinal < NATION_NAMES.length ? ordinal : undefined;
  }
  const normalized = normalizedCommand(value);
  return NATION_NAMES.findIndex(
    (nation) => normalizedCommand(nation) === normalized,
  );
}

function guildCountryInfoCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Old Guild Worker";
  const nation = guildNationSelector(path[1]);
  if (nation === undefined || nation < 0)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [line(data, 162, speaker)],
      menu: [...NATION_NAMES],
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown country selector: ${path[1]}.`] : [],
    });
  const question = line(data, 86, speaker);
  const choice = path[2] && normalizedCommand(path[2]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [line(data, 162, speaker), question],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [line(data, 162, speaker), question, line(data, 87, speaker)],
      menu: ["Job Assignment", "Country Info"],
      effects: ["return to the Guild menu without buying information"],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(
      path,
      `Unknown Country Info confirmation: ${path[2]}.`,
    );
  const gold = inspectGold(save, slot);
  if (gold < 100)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 162, speaker), question, line(data, 163, speaker)],
      menu: ["Job Assignment", "Country Info"],
      effects: [],
      uncertainties: [],
      notes: [`On-hand gold: ${gold}.`],
    });

  const base = slotOffset(slot);
  const record = base + NATION_RECORDS + nation * NATION_RECORD_SIZE;
  const target = save[record + 2]!;
  const destination = save[record + 4]!;
  const selectedName = NATION_NAMES[nation]!;
  const targetLine =
    target <= 6
      ? line(data, 88, speaker, [
          selectedName,
          target === 6 ? "pirates" : NATION_NAMES[target]!,
        ])
      : line(data, 853, speaker, [selectedName]);
  const destinationLine =
    destination < PORT_COUNT
      ? [line(data, 89, speaker, [portName(save, slot, destination)])]
      : [];
  const friendship =
    save[base + FAME_START + protagonistId * FAME_RECORD_SIZE + 6 + nation]! -
    100;
  const relationNotes = NATION_NAMES.flatMap((other, otherId) => {
    if (otherId === nation) return [];
    const relation = save[record + 0x0b + otherId]! - 30;
    const status = save[record + 0x12 + otherId]!;
    const markers = [
      ...(status & 0x20 ? ["alliance"] : []),
      ...(status & 0x10 ? ["blockade"] : []),
    ];
    return [
      `Relation toward ${other}: ${relation}${markers.length ? ` (${markers.join(", ")})` : ""}.`,
    ];
  });
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [
      line(data, 162, speaker),
      question,
      targetLine,
      ...destinationLine,
    ],
    menu: ["Job Assignment", "Country Info"],
    effects: [
      "deduct 100 gold",
      `display the cached ${selectedName} intelligence report`,
    ],
    uncertainties: [],
    notes: [
      `Profit: ${save.readUInt16LE(record)}.`,
      `Player Friendship: ${friendship}.`,
      ...relationNotes,
      `Target field: ${target}.`,
      `Merchant-fleet destination: ${destination < PORT_COUNT ? portName(save, slot, destination) : "none"}.`,
    ],
  });
}

interface DiscoveryRecord {
  readonly index: number;
  readonly name: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly itemId: number;
  readonly difficulty: number;
  readonly flags: number;
}

function discoveries(
  save: Buffer,
  slot: number,
  data: OrdinaryDialogueData,
): DiscoveryRecord[] {
  const start = slotOffset(slot) + DISCOVERY_TABLE;
  return Array.from({ length: DISCOVERY_COUNT }, (_, index) => {
    const record = start + index * DISCOVERY_RECORD_SIZE;
    return {
      index,
      name: data.colonyNames[index] ?? `discovery ${index}`,
      longitude: save.readUInt16LE(record),
      latitude: save.readUInt16LE(record + 2),
      itemId: save[record + 4]!,
      difficulty: save[record + 5]!,
      flags: save[record + 6]!,
    };
  });
}

function lessonPrice(charm: number): number {
  return Math.min(
    60_000,
    100 * (Math.floor(5_000 / (Math.floor(charm / 5) + 1)) + 200),
  );
}

function collectorCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const collector = inspectCollectors(save, slot).find(
    (entry) => entry.portId === portId,
  )!;
  const command = normalizedCommand(path[0]!);
  const speaker = collector.name;
  if (command === "contract") {
    if (collector.activeContract)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 479, speaker)],
        menu: ["Contract", "Discovery", "Rumor"],
        effects: [],
        uncertainties: [],
        notes: ["This collector already holds the active contract."],
      });
    const dialogue = [line(data, 480, speaker), line(data, 481, speaker)];
    const choice = path[1] && normalizedCommand(path[1]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue,
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [...dialogue, line(data, 482, speaker)],
        menu: ["Contract", "Discovery", "Rumor"],
        effects: ["leave collector contracts unchanged"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown Contract selection: ${path[1]}.`,
      );
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [...dialogue, line(data, 483, speaker)],
      menu: ["Contract", "Discovery", "Rumor"],
      effects: [
        "clear the active-contract bit on every other collector",
        `activate the collector contract with ${collector.name}`,
      ],
      uncertainties: [],
      notes: [],
    });
  }

  if (command === "discovery") {
    if (!collector.activeContract)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 480, speaker)],
        menu: ["Contract", "Discovery", "Rumor"],
        effects: [],
        uncertainties: [],
        notes: ["Discovery turn-in requires this collector's active contract."],
      });
    const eligible = discoveries(save, slot, data).filter(
      (entry) =>
        (entry.flags & 0x80) === 0 &&
        (entry.flags & 0x20) !== 0 &&
        (entry.flags & 0x10) === 0,
    );
    if (eligible.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 484, speaker)],
        menu: ["Contract", "Discovery", "Rumor"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const selected = selectedItem(
      eligible.map((entry) => ({
        id: entry.index,
        name: entry.name,
        price: 0,
        appeal: 0,
        type: 0,
        equipped: false,
      })),
      path[1],
    );
    if (!selected)
      return result(path, {
        confidence: "decoded",
        disposition: path[1] ? "unavailable" : "shown",
        dialogue: [line(data, 485, speaker)],
        menu: eligible.map((entry, index) => `${index + 1}: ${entry.name}`),
        effects: [],
        uncertainties: [],
        notes: path[1] ? [`Unknown discovery selector: ${path[1]}.`] : [],
      });
    const discovery = eligible.find((entry) => entry.index === selected.id)!;
    const modifier = collector.flags & 0x03;
    const baseGold =
      discovery.difficulty === 100 ? 100_000 : discovery.difficulty * 250;
    const gold = Math.floor((baseGold * (5 - modifier)) / 5);
    const fame =
      discovery.difficulty === 100 ? 1_500 : discovery.difficulty * 8;
    const reaction = 486 + Math.min(4, Math.floor(discovery.difficulty / 25));
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, 485, speaker),
        line(data, reaction, speaker, [discovery.name, ""]),
      ],
      menu: ["Contract", "Discovery", "Rumor"],
      effects: [
        `add ${gold} gold`,
        `add ${fame} Adventure Fame, capped at 50,000`,
        `mark ${discovery.name} as consumed`,
      ],
      uncertainties: [],
      notes: [
        `Difficulty ${discovery.difficulty}; collector payment modifier ${modifier}.`,
      ],
    });
  }

  if (command === "rumor") {
    const candidate = discoveries(save, slot, data).find(
      (entry) => (entry.flags & 0x80) === 0 && (entry.flags & 0x40) === 0,
    );
    if (!candidate)
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [line(data, 491, speaker)],
        menu: ["Contract", "Discovery", "Rumor"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    return result(path, {
      confidence: "ambiguous",
      disposition: "shown",
      dialogue: [
        line(data, 492, speaker, [
          "[approximate latitude]",
          "",
          "[approximate longitude]",
          "",
        ]),
      ],
      menu: [],
      effects: [
        "give approximate coordinates for the first eligible undiscovered village",
      ],
      uncertainties: [
        "The coordinate error uses the unsaved general RNG together with protagonist Luck.",
      ],
      notes: [
        `The selected record is ${candidate.name} (record ${candidate.index}).`,
        "Raw message 492 presents the selected approximate latitude and longitude.",
      ],
    });
  }
  return unavailableCommand(path, `Unknown collector command: ${path[0]}.`);
}

function cartographerCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const cartographer = inspectCartographers(save, slot).find(
    (entry) => entry.portId === portId,
  )!;
  const speaker = cartographer.name;
  const command = normalizedCommand(path[0]!);
  const sailor =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const skills = save[sailor + 0x28]!;
  const menu = ["Contract", "Learn Skills", "Report", "Locate"];
  if (command === "contract") {
    if ((skills & 0x08) === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 495, speaker), line(data, 496, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (cartographer.activeContract)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 500, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: ["This cartographer already holds the active contract."],
      });
    const question = line(data, 495, speaker);
    const choice = path[1] && normalizedCommand(path[1]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [
          question,
          line(data, 497, speaker),
          line(data, 447, speaker),
        ],
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [
          question,
          line(data, 497, speaker),
          line(data, 447, speaker),
          line(data, 499, speaker),
        ],
        menu,
        effects: ["leave cartographer contracts unchanged"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown Contract selection: ${path[1]}.`,
      );
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        question,
        line(data, 497, speaker),
        line(data, 447, speaker),
        line(data, 500, speaker),
      ],
      menu,
      effects: [
        "clear the active-contract bit on every other cartographer",
        `activate the cartographer contract with ${cartographer.name}`,
        "reset the unreported-chart-cell counter to 0",
      ],
      uncertainties: [],
      notes: [],
    });
  }

  if (command === "learnskills") {
    if ((skills & 0x08) !== 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 501, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: ["The protagonist already knows Cartography."],
      });
    const requirements = [
      ["Seamanship", save[sailor + 0x15]!],
      ["Knowledge", save[sailor + 0x16]!],
      ["Intuition", save[sailor + 0x17]!],
    ] as const;
    const missing = requirements.find(([, value]) => value < 75);
    if (missing)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [
          line(data, 501, speaker),
          line(data, 502, speaker, [missing[0]]),
          line(data, 498, speaker),
        ],
        menu,
        effects: [],
        uncertainties: [],
        notes: [`${missing[0]} is ${missing[1]}; 75 is required.`],
      });
    const price = lessonPrice(save[sailor + 0x1a]!);
    const dialogue = [
      line(data, 501, speaker),
      line(data, 503, speaker, [price]),
    ];
    if (inspectGold(save, slot) < price)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [...dialogue, line(data, 504, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const choice = path[1] && normalizedCommand(path[1]);
    if (!choice)
      return result(path, {
        confidence: "decoded",
        disposition: "shown",
        dialogue: [...dialogue, line(data, 505, speaker)],
        menu: ["Yes", "No"],
        effects: [],
        uncertainties: [],
        notes: [],
      });
    if (choice === "no")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [...dialogue, line(data, 505, speaker)],
        menu,
        effects: ["return without learning Cartography"],
        uncertainties: [],
        notes: [],
      });
    if (choice !== "yes")
      return unavailableCommand(
        path,
        `Unknown lesson confirmation: ${path[1]}.`,
      );
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [...dialogue, line(data, 505, speaker)],
      menu,
      effects: [`deduct ${price} gold`, "set the Cartography skill bit"],
      uncertainties: [],
      notes: [],
    });
  }

  if (command === "report") {
    if (!cartographer.activeContract)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 495, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: ["Reporting requires this cartographer's active contract."],
      });
    const base = slotOffset(slot);
    const cells = save.readUInt16LE(base + CHART_UNREPORTED);
    if (cells === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 506, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: [],
      });
    const total = save.readUInt16LE(base + CHART_TOTAL_KNOWN);
    const gold = cells * cartographer.goldPerChartCell;
    const fame = cells * 5;
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [
        line(data, total >= 3_300 ? 507 : 508, speaker),
        line(data, 509, speaker),
      ],
      menu,
      effects: [
        `add ${gold} gold`,
        `add ${fame} Adventure Fame, capped at 50,000`,
        "reset the unreported-chart-cell counter to 0",
      ],
      uncertainties: [],
      notes: [`${cells} unreported cells; ${total} total known cells.`],
    });
  }

  if (command === "locate") {
    const maps = inspectItems(save, slot)
      .filter((id) => id >= 80 && id <= 88)
      .map((id) => shopItem(save, slot, id));
    if (maps.length === 0)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [],
        menu,
        effects: [],
        uncertainties: [],
        notes: ["No treasure-map item (IDs 80–88) is carried."],
      });
    if (inspectGold(save, slot) <= 20_000)
      return result(path, {
        confidence: "decoded",
        disposition: "blocked",
        dialogue: [line(data, 785, speaker)],
        menu,
        effects: [],
        uncertainties: [],
        notes: ["Locate requires more than 20,000 on-hand gold."],
      });
    const selected = selectedItem(maps, path[1]);
    if (!selected)
      return result(path, {
        confidence: "decoded",
        disposition: path[1] ? "unavailable" : "shown",
        dialogue: [line(data, 785, speaker)],
        menu: maps.map(itemLabel),
        effects: [],
        uncertainties: [],
        notes: path[1] ? [`Unknown treasure-map selector: ${path[1]}.`] : [],
      });
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [line(data, 785, speaker), line(data, 786, speaker)],
      menu,
      effects: [
        "deduct 20,000 gold",
        `analyze ${selected.name} without consuming it`,
      ],
      uncertainties: [],
      notes: [
        "The following location phrase is assembled by the map renderer rather than stored as another ordinary message line.",
      ],
    });
  }
  return unavailableCommand(path, `Unknown cartographer command: ${path[0]}.`);
}

function skillTeacherCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const celestial = portId === CELESTIAL_NAVIGATION_TEACHER_PORT;
  const speaker = celestial ? "Professor Juliano" : "Dr. Wolf";
  const skillName = celestial ? "Celestial Navigation" : "Gunnery";
  const skillBit = celestial ? 0x10 : 0x04;
  const questionIndex = celestial ? 750 : 743;
  const knownIndex = celestial ? 751 : 744;
  const requirementIndex = celestial ? 752 : 745;
  const sailor =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const skills = save[sailor + 0x28]!;
  const choice = path[1] && normalizedCommand(path[1]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [line(data, questionIndex, speaker)],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [line(data, questionIndex, speaker)],
      menu: [],
      effects: [`leave without learning ${skillName}`],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(path, `Unknown lesson confirmation: ${path[1]}.`);
  if ((skills & skillBit) !== 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        line(data, questionIndex, speaker),
        line(data, knownIndex, speaker),
      ],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const requirements = celestial
    ? ([
        ["Seamanship", save[sailor + 0x15]!, 80],
        ["Knowledge", save[sailor + 0x16]!, 70],
        ["Intuition", save[sailor + 0x17]!, 70],
      ] as const)
    : ([
        ["Leadership", save[sailor + 0x14]!, 75],
        ["Knowledge", save[sailor + 0x16]!, 65],
        ["Courage", save[sailor + 0x18]!, 80],
      ] as const);
  const missing = requirements.find(
    ([, value, threshold]) => value < threshold,
  );
  if (missing)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        line(data, questionIndex, speaker),
        line(data, requirementIndex, speaker, [missing[0]]),
      ],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: [`${missing[0]} is ${missing[1]}; ${missing[2]} is required.`],
    });
  const price = lessonPrice(save[sailor + 0x1a]!);
  const prompt = celestial
    ? [
        line(data, questionIndex, speaker),
        line(data, 503, speaker, [price]),
        line(data, 505, speaker),
      ]
    : [line(data, questionIndex, speaker), line(data, 567, speaker, [price])];
  if (inspectGold(save, slot) < price)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [
        ...prompt,
        line(data, celestial ? 504 : 747, speaker),
        ...(celestial ? [] : [line(data, 749, speaker)]),
      ],
      menu: [],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [...prompt, line(data, celestial ? 753 : 749, speaker)],
    menu: [],
    effects: [`deduct ${price} gold`, `set the ${skillName} skill bit`],
    uncertainties: [],
    notes: [],
  });
}

function renamePortCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const prompt = line(data, 926, "Harbor vendor");
  const proposed = path[1];
  if (proposed === undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt],
      menu: ["Enter a unique name of at most 8 characters", "Cancel"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (normalizedCommand(proposed) === "cancel")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt],
      menu: ["Sail", "Supply", "Rename Port"],
      effects: ["keep the existing port name"],
      uncertainties: [],
      notes: [],
    });
  if (Buffer.byteLength(proposed, "latin1") > 8 || proposed.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt],
      menu: ["Enter a name containing 1 to 8 characters", "Cancel"],
      effects: [],
      uncertainties: [],
      notes: ["The port-name input field accepts at most eight characters."],
    });

  const base = slotOffset(slot);
  const duplicate = Array.from({ length: PORT_COUNT }, (_, id) => id).find(
    (id) => {
      if (id === portId) return false;
      const record = base + PORT_TABLE + id * PORT_RECORD_SIZE;
      return cstring(save.subarray(record + 4, record + 18)) === proposed;
    },
  );
  if (duplicate !== undefined)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 927, "Harbor vendor")],
      menu: ["Enter a different name of at most 8 characters", "Cancel"],
      effects: [],
      uncertainties: [],
      notes: [`The proposed name is already used by port ${duplicate}.`],
    });
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [prompt, line(data, 928, "Harbor vendor", [proposed])],
    menu: ["Sail", "Supply", "Rename Port"],
    effects: [`rename the current port to ${proposed}`],
    uncertainties: [],
    notes: [],
  });
}

function itemShopBuyCommand(
  save: Buffer,
  slot: number,
  portId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Item Shop vendor";
  const gold = inspectGold(save, slot);
  if (gold === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 236, speaker)],
      menu: ["Buy", "Sell"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const inventory = inspectItems(save, slot);
  if (!inventory.includes(0xff))
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 237, speaker)],
      menu: ["Buy", "Sell"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const stock = itemShopStock(save, slot, portId);
  const prompt = line(data, 238, speaker);
  const item = selectedItem(stock, path[1]);
  if (!item)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [prompt],
      menu: stock.map(itemLabel),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown shop-item selector: ${path[1]}.`] : [],
    });
  if (item.type < 7 && inventory.some((id) => id === item.id))
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 332, speaker)],
      menu: stock.map(itemLabel),
      effects: [],
      uncertainties: [],
      notes: [
        "The one-copy restriction applies to item types whose low type nibble is below 7.",
      ],
    });
  const offer = line(data, 240, speaker, [item.name, item.price]);
  if (gold < item.price)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, offer, line(data, 239, speaker)],
      menu: stock.map(itemLabel),
      effects: [],
      uncertainties: [],
      notes: [`On-hand gold: ${gold}.`],
    });
  const choice = path[2] && normalizedCommand(path[2]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt, offer],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (choice === "no")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt, offer],
      menu: stock.map(itemLabel),
      effects: ["return to the shop-item list without buying"],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "yes")
    return unavailableCommand(path, `Unknown Buy confirmation: ${path[2]}.`);
  const emptySlot = inventory.indexOf(0xff);
  return result(path, {
    confidence: "decoded",
    disposition: "completed",
    dialogue: [prompt, offer, line(data, 242, speaker)],
    menu: stock.map(itemLabel),
    effects: [
      `deduct ${item.price} gold`,
      `put ${item.name} (item ${item.id}) in inventory slot ${emptySlot + 1}`,
    ],
    uncertainties: [],
    notes: [],
  });
}

function itemShopSellCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  path: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const speaker = "Item Shop vendor";
  const carried = inspectItems(save, slot)
    .map((id, inventoryIndex) => ({ id, inventoryIndex }))
    .filter(({ id }) => id !== 0xff)
    .map(({ id, inventoryIndex }) => ({
      ...shopItem(save, slot, id),
      inventoryIndex,
    }));
  if (carried.length === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [line(data, 243, speaker)],
      menu: ["Buy", "Sell"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const prompt = line(data, 244, speaker);
  const item = selectedItem(carried, path[1]);
  if (!item)
    return result(path, {
      confidence: "decoded",
      disposition: path[1] ? "unavailable" : "shown",
      dialogue: [prompt],
      menu: carried.map(itemLabel),
      effects: [],
      uncertainties: [],
      notes: path[1] ? [`Unknown carried-item selector: ${path[1]}.`] : [],
    });
  if (item.equipped)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 333, speaker)],
      menu: carried.map(itemLabel),
      effects: [],
      uncertainties: [],
      notes: [],
    });
  if (item.appeal === 0)
    return result(path, {
      confidence: "decoded",
      disposition: "blocked",
      dialogue: [prompt, line(data, 929, speaker)],
      menu: carried.map(itemLabel),
      effects: [],
      uncertainties: [],
      notes: [
        "Item Shops accept only items with a nonzero stored appeal rating.",
      ],
    });
  const baseOffer = Math.floor(item.price / 200) * 100;
  const offer = line(data, 245, speaker, [item.name, baseOffer]);
  const choice = path[2] && normalizedCommand(path[2]);
  if (!choice)
    return result(path, {
      confidence: "decoded",
      disposition: "shown",
      dialogue: [prompt, offer],
      menu: ["Yes", "No"],
      effects: [],
      uncertainties: [],
      notes: [],
    });
  const inventoryIndex = inspectItems(save, slot).indexOf(item.id);
  if (choice === "yes")
    return result(path, {
      confidence: "decoded",
      disposition: "completed",
      dialogue: [prompt, offer, line(data, 248, speaker)],
      menu: carried.filter((entry) => entry !== item).map(itemLabel),
      effects: [
        `add ${baseOffer} gold, capped at ${GOLD_CARRYING_LIMIT}`,
        `remove ${item.name} from inventory slot ${inventoryIndex + 1}`,
      ],
      uncertainties: [],
      notes: [],
    });
  if (choice !== "no")
    return unavailableCommand(path, `Unknown Sell confirmation: ${path[2]}.`);

  const sailor =
    slotOffset(slot) + SAILOR_TABLE + protagonistId * SAILOR_RECORD_SIZE;
  const charm = save[sailor + 0x1a]!;
  const luck = save[sailor + 0x1b]!;
  const counteroffer = baseOffer + Math.floor((baseOffer * charm) / 200);
  const probability = (Math.min(luck, 99) + 1) / 100;
  const counterChoice = path[3] && normalizedCommand(path[3]);
  const counterLine = line(data, 246, speaker, [counteroffer]);
  return result(path, {
    confidence: "ambiguous",
    disposition: counterChoice === "yes" ? "completed" : "shown",
    dialogue: [prompt, offer, ...(counterChoice ? [counterLine] : [])],
    menu: counterChoice ? carried.map(itemLabel) : ["Yes", "No"],
    effects:
      counterChoice === "yes"
        ? [
            `if the counteroffer roll succeeds, add ${counteroffer} gold, capped at ${GOLD_CARRYING_LIMIT}`,
            `if the counteroffer roll succeeds, remove ${item.name} from inventory slot ${inventoryIndex + 1}`,
          ]
        : ["a failed counteroffer roll returns to the carried-item list"],
    uncertainties: [
      `The unsaved general RNG decides whether Luck ${luck} meets random(100); the counteroffer succeeds with probability ${(probability * 100).toFixed(0)}%.`,
    ],
    notes: [
      `A successful roll offers ${counteroffer} gold: ${baseOffer} plus floor(${baseOffer} × Charm ${charm} / 200).`,
    ],
  });
}

function ordinaryCommand(
  save: Buffer,
  slot: number,
  protagonistId: number,
  portId: number,
  context: number,
  path: readonly string[],
  visibleMenu: readonly string[],
  data: OrdinaryDialogueData,
): OrdinaryCommandResult {
  const requested = normalizedCommand(path[0]!);
  if (
    context === 0x07 &&
    (portId === CELESTIAL_NAVIGATION_TEACHER_PORT ||
      portId === GUNNERY_TEACHER_PORT)
  ) {
    if (requested !== "learn" && requested !== "learnskill")
      return unavailableCommand(
        path,
        `The skill-teacher continuation is queried as learn-skill[:yes|no], not ${path[0]}.`,
      );
    return skillTeacherCommand(save, slot, protagonistId, portId, path, data);
  }
  const selected = visibleMenu.find(
    (item) => normalizedCommand(item) === requested,
  );
  if (!selected)
    return unavailableCommand(
      path,
      `The selected command is not available in this menu: ${path[0]}.`,
    );

  if (context === 0x00) {
    if (requested === "buygoods")
      return marketBuyCommand(save, slot, protagonistId, portId, path, data);
    if (requested === "sellgoods")
      return marketSellCommand(save, slot, protagonistId, portId, path, data);
    if (requested === "invest")
      return portInvestCommand(save, slot, portId, path, false, data);
    if (requested === "marketrate")
      return marketRateCommand(save, slot, portId, path, data);
  }

  if (context === 0x02) {
    if (requested === "newship")
      return shipyardNewShipCommand(
        save,
        slot,
        protagonistId,
        portId,
        path,
        data,
      );
    if (requested === "usedship")
      return shipyardUsedShipCommand(
        save,
        slot,
        protagonistId,
        portId,
        path,
        data,
      );
    if (requested === "repair")
      return shipyardRepairCommand(save, slot, protagonistId, path, data);
    if (requested === "sell")
      return shipyardSellCommand(save, slot, protagonistId, portId, path, data);
    if (requested === "remodel")
      return shipyardRemodelCommand(
        save,
        slot,
        protagonistId,
        portId,
        path,
        data,
      );
    if (requested === "invest")
      return portInvestCommand(save, slot, portId, path, true, data);
  }

  if (context === 0x03) {
    if (requested === "sail")
      return harborSailCommand(save, slot, protagonistId, path, data);
    if (requested === "supply")
      return supplyCommand(save, slot, protagonistId, portId, path, data);
    if (requested === "moor")
      return moorCommand(save, slot, protagonistId, portId, path, data);
    if (requested === "renameport")
      return renamePortCommand(save, slot, portId, path, data);
  }

  if (context === 0x01) {
    if (requested === "meet")
      return sailorInteractionCommand(
        save,
        slot,
        protagonistId,
        portId,
        path,
        true,
        data,
      );
    if (requested === "recruitcrew")
      return pubRecruitCrewCommand(
        save,
        slot,
        protagonistId,
        portId,
        path,
        data,
      );
    if (requested === "dismisscrew") {
      const ships = harborShips(save, slot, protagonistId);
      const crew = ships.reduce((sum, ship) => sum + ship.crew, 0);
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [],
        menu: [],
        effects: ["open the fleet crew-assignment and discharge screen"],
        uncertainties: [],
        notes: [
          `The fleet currently has ${crew} crew across ${ships.length} active ships.`,
          "Each changed ship asks for confirmation with raw messages 231 or 858; final values depend on the interactive per-ship inputs.",
        ],
      });
    }
    if (requested === "treat")
      return pubTreatCommand(save, slot, protagonistId, portId, path, data);
    if (requested === "waitress")
      return pubWaitressCommand(save, slot, portId, path, data);
    if (requested === "gamble") return pubGambleCommand(save, slot, path, data);
  }

  if (context === 0x04) {
    if (requested === "checkin")
      return result(path, {
        confidence: "decoded",
        disposition: "completed",
        dialogue: [],
        menu: [],
        effects: ["advance to 8:00 AM on the next day"],
        uncertainties: [],
        notes: ["Check In is free and has no confirmation prompt."],
      });
    if (requested === "portinfo")
      return lodgePortInfoCommand(save, slot, portId, path);
    if (requested === "gossip")
      return sailorInteractionCommand(
        save,
        slot,
        protagonistId,
        portId,
        path,
        false,
        data,
      );
  }
  if (context === 0x05)
    return palaceCommand(save, slot, protagonistId, portId, path, data);
  if (context === 0x06) {
    if (requested === "jobassignment")
      return guildJobCommand(save, slot, portId, path, data);
    if (requested === "countryinfo")
      return guildCountryInfoCommand(save, slot, protagonistId, path, data);
  }
  if (context === 0x07) {
    if (inspectCollectors(save, slot).some((entry) => entry.portId === portId))
      return collectorCommand(save, slot, portId, path, data);
    if (
      inspectCartographers(save, slot).some((entry) => entry.portId === portId)
    )
      return cartographerCommand(save, slot, protagonistId, portId, path, data);
  }
  if (context === 0x08)
    return bankCommand(save, slot, protagonistId, path, data);
  if (context === 0x09) {
    if (requested === "buy")
      return itemShopBuyCommand(save, slot, portId, path, data);
    if (requested === "sell")
      return itemShopSellCommand(save, slot, protagonistId, path, data);
  }
  if (context === 0x0a)
    return churchCommand(save, slot, protagonistId, portId, path, data);
  if (context === 0x0b) {
    if (requested === "life")
      return fortuneLifeCommand(save, slot, protagonistId, path, data);
    if (requested === "career")
      return fortuneCareerCommand(save, slot, protagonistId, path, data);
    if (requested === "love")
      return fortuneLoveCommand(save, slot, portId, path, data);
    if (requested === "mates")
      return fortuneMatesCommand(save, slot, path, data);
  }

  return result(path, {
    confidence: "none",
    disposition: "unsupported",
    dialogue: [],
    menu: [],
    effects: [],
    uncertainties: [],
    notes: [
      `${selected} is statically documented, but its save-aware command resolver has not been implemented yet.`,
    ],
  });
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

// A nonzero VM variable 63 after an entry route skips the greeting in these
// building handlers; the Shipyard, Palace, and skill teachers do not test it.
export const CONTROL_VARIABLE_EFFECT =
  "set control variable 63 (skip the ordinary greeting)";
const GREETING_CONTROL_CONTEXTS = new Set([
  0x00, 0x01, 0x03, 0x04, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
]);

function storyEffect(
  effect: string,
  protagonistEffects: readonly (readonly string[])[],
  sharedEffects: readonly (readonly string[])[],
): "none" | "possible" | "certain" {
  const groups = [protagonistEffects, sharedEffects].filter(
    (outcomes) => outcomes.length > 0,
  );
  if (
    groups.some((outcomes) =>
      outcomes.every((effects) => effects.includes(effect)),
    )
  )
    return "certain";
  if (
    groups.some((outcomes) =>
      outcomes.some((effects) => effects.includes(effect)),
    )
  )
    return "possible";
  return "none";
}

function storySuppression(
  context: number,
  protagonistEffects: readonly (readonly string[])[],
  sharedEffects: readonly (readonly string[])[],
): "none" | "possible" | "certain" {
  if (context === 0x04) return "none";
  return storyEffect(
    "suppress normal building menu and force exit",
    protagonistEffects,
    sharedEffects,
  );
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
  const collector = inspectCollectors(save, slot).find(
    (record) => record.portId === portId,
  );
  if (collector)
    return {
      dialogue: [
        collector.activeContract
          ? line(data, 478, collector.name, [names.first, names.last])
          : line(data, 477, collector.name),
      ],
      menu: ["Contract", "Discovery", "Rumor"],
      uncertainties: [],
    };
  if (portId === CELESTIAL_NAVIGATION_TEACHER_PORT)
    return {
      dialogue: [line(data, 750, "Professor Juliano")],
      menu: [],
      uncertainties: [],
    };
  if (portId === GUNNERY_TEACHER_PORT)
    return {
      dialogue: [line(data, 743, "Dr. Wolf")],
      menu: [],
      uncertainties: [],
    };
  return {
    dialogue: [line(data, 933, "residence")],
    menu: [],
    uncertainties: [],
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
  commandPath: readonly string[] = [],
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
  if (portId >= PORT_COUNT)
    return {
      confidence: "none",
      disposition: "unavailable",
      dialogue: [],
      menu: [],
      uncertainties: [],
      notes: ["The saved player is at sea, not in a port."],
    };
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

  if (context === 0x02 && (save[slotOffset(slot) + 0x0c]! & 0x02) !== 0)
    return {
      confidence: "decoded",
      disposition: "access-denied",
      dialogue: [line(data, 249, "Shipyard vendor")],
      menu: [],
      uncertainties: [],
      notes: ["The same-day Shipyard ejection flag is set."],
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
  if (context === 0x03 && portId >= 100)
    menu = ["Sail", "Supply", "Rename Port"];
  const disabledMenuNotes: string[] = [];
  let accessDenied = false;

  if (context === 0x00) {
    const tradeFame = inspectFame(save, slot, protagonistId).trade;
    dialogue = [
      tradeFame < 1_000
        ? line(data, 0, "Market vendor")
        : line(data, 1, "Market vendor", [names.first, names.last]),
    ];
  } else if (context === 0x01) {
    dialogue = [
      line(data, 18, "Pub vendor", [pubSpecialty(save, slot, portId).name]),
    ];
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
  } else if (context === 0x09) {
    const ticks = save[slotOffset(slot) + 9]!;
    dialogue = [
      line(data, ticks >= 0x06 && ticks < 0x09 ? 764 : 235, "Item Shop vendor"),
    ];
  } else {
    const greeting = FIXED_GREETINGS.get(context);
    if (greeting === undefined)
      throw new Error(`Missing ordinary greeting for context ${context}.`);
    dialogue = [line(data, greeting, "building vendor")];
  }

  const greetingControl =
    !accessDenied &&
    GREETING_CONTROL_CONTEXTS.has(context) &&
    (context !== 0x07 || menu[0] === "Contract")
      ? storyEffect(CONTROL_VARIABLE_EFFECT, protagonistEffects, sharedEffects)
      : "none";
  const greetingNotes: string[] = [];
  if (greetingControl === "certain") {
    dialogue = [];
    greetingNotes.push(
      "A preceding story route set control variable 63, so the greeting is skipped.",
    );
  } else if (greetingControl === "possible")
    uncertainties.push(
      "An unresolved story branch may set control variable 63 and skip the greeting.",
    );

  let commandMenu = menu;
  if (
    context === 0x03 &&
    portId < 100 &&
    !isNationalCapital(save, slot, portId)
  ) {
    disabledMenuNotes.push(
      "Moor is grayed out outside the six national capitals.",
    );
    commandMenu = menu.filter((item) => normalizedCommand(item) !== "moor");
  }

  const conditional = uncertainties.length > 0;
  const command =
    commandPath.length > 0
      ? ordinaryCommand(
          save,
          slot,
          protagonistId,
          portId,
          context,
          commandPath,
          commandMenu,
          data,
        )
      : undefined;
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
    notes: [
      ...greetingNotes,
      ...disabledMenuNotes,
      ...(context === 0x05 && menu.length > 0
        ? [
            "Palace menu entries may be disabled by rank, allegiance, or mission state.",
          ]
        : []),
    ],
    ...(command ? { command } : {}),
  };
}
