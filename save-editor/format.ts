import { readFileSync } from "node:fs";

export const HEADER_SIZE = 0x97;
export const SLOT_SIZE = 0x7cc8;
export const SLOT_COUNT = 10;
export const FILE_SIZE = HEADER_SIZE + SLOT_SIZE * SLOT_COUNT;
const SAILOR_START = 0x612;
const SAILOR_SIZE = 42;
export const RANK_NAMES = [
  "No Rank",
  "Page",
  "Squire",
  "Knight",
  "Baronet",
  "Baron",
  "Viscount",
  "Earl",
  "Marquis",
  "Duke",
] as const;
// The eight displayed attributes are followed by navigation and battle levels.
const SAILOR_STATS_START = 0x14;
const SAILOR_LEVELS_START = 0x1c;
export const SAILOR_STAT_NAMES = [
  "leadership",
  "seamanship",
  "knowledge",
  "intuition",
  "courage",
  "swordsmanship",
  "charm",
  "luck",
] as const;
export const SAILOR_LEVEL_NAMES = ["navigation", "battle"] as const;

export const CURRENT_PORT = 0x0a;
export const PORT_TABLE = 0x4f40;
export const PORT_RECORD_SIZE = 20;
export const PORT_COUNT = 130;
export const TOWN_VIEW_STATE = 0x10;
export const WALKING_NPC_START = 0x18;
export const WALKING_NPC_COUNT = 8;
export const WALKING_NPC_SIZE = 3;
export const ITEM_INVENTORY = 0x1dc1;
export const ITEM_INVENTORY_SIZE = 20;
export const CRUSADERS_ARMOR = 0x4b;
export const CRUSADERS_SWORD = 0x4c;
const CRUSADER_EQUIPPED_FLAGS = [0x77b7, 0x77cd] as const;
const EQUIPPED_MASK = 0x10;
export const GOLD = 0x60a;
export const GOLD_MAX = 0xffffff;

export const CARTOGRAPHER_TABLE = 0x1a3a;
export const CARTOGRAPHER_RECORD_SIZE = 24;
export const CARTOGRAPHER_COUNT = 5;
export const COLLECTOR_TABLE =
  CARTOGRAPHER_TABLE - CARTOGRAPHER_RECORD_SIZE * CARTOGRAPHER_COUNT;
export const COLLECTOR_RECORD_SIZE = CARTOGRAPHER_RECORD_SIZE;
export const COLLECTOR_COUNT = 5;
const CARTOGRAPHER_NAME_SIZE = 19;
const CARTOGRAPHER_CONTRACT_FLAGS = 0x16;
const CARTOGRAPHER_PORT = 0x17;
const ACTIVE_CARTOGRAPHER_CONTRACT = 0x10;

const FLEET_TABLE = 0x1e77;
const FLEET_RECORD_SIZE = 0x85;
const FLEET_SHIP_SLOTS = 0x2b;
const SHIP_SLOT_SIZE = 9;
const SHIP_SLOT_COUNT = 10;
const SHIP_INSTANCE_TABLE = 0x4893;
const SHIP_INSTANCE_SIZE = 0x18;
const SHIP_TYPE_OFFSET = 0x11;
const TEKKOUSEN_TEMPLATE_INSTANCE = 0x3e;
// The fleet-slot value used by the game for no gun type.
const NO_GUNS_SELECTOR = 0x10;
const SHIP_CONFIGURED_CREW_OFFSET = 0x14;
const SHIP_CONFIGURED_GUNS_OFFSET = 0x13;
const SHIP_CARGO_CAPACITY_OFFSET = 0x16;
const TEKKOUSEN_MAXIMUM_CREW = 300;
const TEKKOUSEN_CARGO_CAPACITY = 1100;
// Tekkousen is automatically built with Steel, but ship construction caps
// material-adjusted durability at 100.
const TEKKOUSEN_DURABILITY = 100;
const TEKKOUSEN_TACKING = 80;
const TEKKOUSEN_POWER = 85;
// Ship provisions are stored as tenths: 300 water and 500 food are encoded
// as 3000 and 5000 respectively in the active player's supply record.
const PLAYER_WATER = 0x42d5;
const PLAYER_FOOD = 0x42d7;

const BUILDINGS_PER_TOWN = 12;
const BUILDING_SIZE = 2;
const SUPPLY_TOWN_MAP = 100;
const TOWN_BUILDINGS = readFileSync(
  new URL("../raw/ZA_DAT.DAT", import.meta.url),
);

function townMap(port: number): number {
  return port < 100 ? port : SUPPLY_TOWN_MAP;
}

function buildings(port: number): ({ x: number; y: number } | undefined)[] {
  const start = townMap(port) * BUILDINGS_PER_TOWN * BUILDING_SIZE;
  return Array.from({ length: BUILDINGS_PER_TOWN }, (_, index) => {
    const x = TOWN_BUILDINGS[start + index * BUILDING_SIZE]!;
    const y = TOWN_BUILDINGS[start + index * BUILDING_SIZE + 1]!;
    return (x === 0 && y === 0) || (x === 0xff && y === 0xff)
      ? undefined
      : { x, y };
  });
}

export function inspectPort(data: Buffer, slot: number, port: number) {
  validate(data);
  const offset =
    slotOffset(slot) +
    PORT_TABLE +
    integer(port, 0, PORT_COUNT - 1) * PORT_RECORD_SIZE;
  return { id: port, name: cstring(data.subarray(offset + 4, offset + 18)) };
}

function harborCoordinates(port: number): { x: number; y: number } {
  const harbor = buildings(port)[3];
  if (!harbor) throw new Error(`Port ${port} has no harbor coordinates.`);
  return harbor;
}

// Friendly-port spawn order reconstructed from the game's eight saved actor
// slots. Moving actors are reset to their spawn rather than preserving the
// positions to which they wandered before the save.
const WALKING_NPC_PLACEMENTS = [
  { building: 0, dx: -2, dy: 1 }, // woman, moving
  { building: 1, dx: -2, dy: 1 }, // man, moving
  { building: 2, dx: 0, dy: 0 }, // woman, moving
  { building: 4, dx: -2, dy: 1 }, // man, moving
  { building: 0, dx: 2, dy: 1 },
  { building: 1, dx: 2, dy: 1 },
  undefined, // third hostile guard slot; inactive in friendly ports
  { building: 4, dx: 2, dy: 1 },
] as const;

function placeWalkingNpcs(result: Buffer, slot: number, newPort: number): void {
  const newBuildings = buildings(newPort);
  const start = slotOffset(slot) + WALKING_NPC_START;
  for (let npc = 0; npc < WALKING_NPC_COUNT; npc++) {
    const offset = start + npc * WALKING_NPC_SIZE;
    const placement = WALKING_NPC_PLACEMENTS[npc]!;
    if (!placement) {
      result[offset] = 0xff;
      result[offset + 1] = 0xff;
      continue;
    }
    const newBuilding = newBuildings[placement.building];
    if (!newBuilding) {
      result[offset] = 0xff;
      result[offset + 1] = 0xff;
      continue;
    }
    const translatedX = newBuilding.x + placement.dx;
    const translatedY = newBuilding.y + placement.dy;
    if (
      translatedX < 0 ||
      translatedX > 0xff ||
      translatedY < 0 ||
      translatedY > 0xff
    ) {
      result[offset] = 0xff;
      result[offset + 1] = 0xff;
    } else {
      result[offset] = translatedX;
      result[offset + 1] = translatedY;
    }
  }
}

// Moves the town viewport to the destination harbor and translates each walking
// NPC relative to its nearest building entrance. Fleet coordinates are separate.
export function setPort(
  data: Buffer,
  slot: number,
  expected: number,
  port: number,
): Buffer {
  integer(expected, 0, PORT_COUNT - 1);
  integer(port, 0, PORT_COUNT - 1);
  const result = patch(data, slot, CURRENT_PORT, "u8", expected, port);
  result[1 + (slot - 1) * 15 + 12] = port;
  const base = slotOffset(slot) + TOWN_VIEW_STATE;
  const harbor = harborCoordinates(port);
  const cameraX = Math.max(0, Math.min(72, harbor.x - 12));
  const cameraY = Math.max(0, Math.min(72, harbor.y - 13));
  result.writeUInt16LE(cameraX, base);
  result.writeUInt16LE(cameraY, base + 2);
  result.writeUInt16LE(harbor.x - cameraX, base + 4);
  result.writeUInt16LE(harbor.y - cameraY + 1, base + 6);
  placeWalkingNpcs(result, slot, port);
  return result;
}

export const FAME_START = 0x5b6;
export const FAME_RECORD_SIZE = 14;
export const FAME_FIELDS = { trade: 0, piracy: 2, adventure: 4 } as const;
const RANK_OFFSET = FAME_RECORD_SIZE - 1;
export const PROTAGONIST_COUNT = 6;

export function inspectProtagonist(data: Buffer, slot: number) {
  validate(data);
  const id = data[1 + (integer(slot, 1, SLOT_COUNT) - 1) * 15 + 13]!;
  if (id >= PROTAGONIST_COUNT)
    throw new Error(`Unsupported protagonist ID ${id}.`);
  return { id, name: sailorName(data, slot, id) };
}

export function inspectFame(data: Buffer, slot: number, character: number) {
  validate(data);
  const offset =
    slotOffset(slot) + FAME_START + integer(character, 0, 5) * FAME_RECORD_SIZE;
  return {
    character,
    name: sailorName(data, slot, character),
    trade: data.readUInt16LE(offset),
    piracy: data.readUInt16LE(offset + 2),
    adventure: data.readUInt16LE(offset + 4),
  };
}

export function setFame(
  data: Buffer,
  slot: number,
  character: number,
  category: string,
  expected: number,
  value: number,
): Buffer {
  if (!Object.hasOwn(FAME_FIELDS, category))
    throw new Error("Fame category must be trade, piracy, or adventure.");
  const offset =
    FAME_START +
    integer(character, 0, 5) * FAME_RECORD_SIZE +
    FAME_FIELDS[category as keyof typeof FAME_FIELDS];
  // Storage range; the gameplay cap has not been established.
  return patch(data, slot, offset, "u16", expected, value);
}

export function integer(value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(
      `Expected an integer between ${min} and ${max}, got ${value}`,
    );
  return value;
}

export function validate(data: Buffer): void {
  if (data.length !== FILE_SIZE)
    throw new Error(
      `Expected ${FILE_SIZE} bytes, got ${data.length}. Unsupported format.`,
    );
}

export function slotOffset(slot: number): number {
  return HEADER_SIZE + (integer(slot, 1, SLOT_COUNT) - 1) * SLOT_SIZE;
}

function cstring(data: Buffer): string {
  const end = data.indexOf(0);
  return data.subarray(0, end < 0 ? data.length : end).toString("latin1");
}

export function inspectItems(data: Buffer, slot: number): number[] {
  validate(data);
  const start = slotOffset(slot) + ITEM_INVENTORY;
  return [...data.subarray(start, start + ITEM_INVENTORY_SIZE)];
}

export function inspectGold(data: Buffer, slot: number): number {
  validate(data);
  return data.readUIntLE(slotOffset(slot) + GOLD, 3);
}

export function inspectCartographers(data: Buffer, slot: number) {
  validate(data);
  const start = slotOffset(slot) + CARTOGRAPHER_TABLE;
  return Array.from({ length: CARTOGRAPHER_COUNT }, (_, index) => {
    const offset = start + index * CARTOGRAPHER_RECORD_SIZE;
    const flags = data[offset + CARTOGRAPHER_CONTRACT_FLAGS]!;
    const rewardModifier = flags & 0x03;
    return {
      index,
      name: cstring(data.subarray(offset, offset + CARTOGRAPHER_NAME_SIZE)),
      portId: data[offset + CARTOGRAPHER_PORT]!,
      flags,
      activeContract: (flags & ACTIVE_CARTOGRAPHER_CONTRACT) !== 0,
      rewardModifier,
      goldPerChartCell: 20 * (5 - rewardModifier),
    };
  });
}

export function inspectCollectors(data: Buffer, slot: number) {
  validate(data);
  const start = slotOffset(slot) + COLLECTOR_TABLE;
  return Array.from({ length: COLLECTOR_COUNT }, (_, index) => {
    const offset = start + index * COLLECTOR_RECORD_SIZE;
    const flags = data[offset + CARTOGRAPHER_CONTRACT_FLAGS]!;
    return {
      index,
      name: cstring(data.subarray(offset, offset + CARTOGRAPHER_NAME_SIZE)),
      portId: data[offset + CARTOGRAPHER_PORT]!,
      flags,
      activeContract: (flags & ACTIVE_CARTOGRAPHER_CONTRACT) !== 0,
    };
  });
}

export function inspectRank(
  data: Buffer,
  slot: number,
  character: number,
): number {
  validate(data);
  return data[
    slotOffset(slot) +
      FAME_START +
      integer(character, 0, PROTAGONIST_COUNT - 1) * FAME_RECORD_SIZE +
      RANK_OFFSET
  ]!;
}

export function setRank(
  data: Buffer,
  slot: number,
  character: number,
  expected: number,
  rank: number,
): Buffer {
  return patch(
    data,
    slot,
    FAME_START +
      integer(character, 0, PROTAGONIST_COUNT - 1) * FAME_RECORD_SIZE +
      RANK_OFFSET,
    "u8",
    expected,
    integer(rank, 0, 9),
  );
}

export function setGold(data: Buffer, slot: number, value: number): Buffer {
  validate(data);
  const result = Buffer.from(data);
  result.writeUIntLE(integer(value, 0, GOLD_MAX), slotOffset(slot) + GOLD, 3);
  return result;
}

export function setCrusaderEquipment(data: Buffer, slot: number): Buffer {
  validate(data);
  const result = Buffer.from(data);
  const start = slotOffset(slot) + ITEM_INVENTORY;
  result[start] = CRUSADERS_SWORD;
  result[start + 1] = CRUSADERS_ARMOR;
  for (const offset of CRUSADER_EQUIPPED_FLAGS) {
    const absolute = slotOffset(slot) + offset;
    result[absolute] = result[absolute]! | EQUIPPED_MASK;
  }
  return result;
}

export function inspectProtagonistStats(data: Buffer, slot: number) {
  const protagonist = inspectProtagonist(data, slot);
  const start =
    slotOffset(slot) +
    SAILOR_START +
    protagonist.id * SAILOR_SIZE +
    SAILOR_STATS_START;
  return Object.fromEntries(
    SAILOR_STAT_NAMES.map((name, index) => [name, data[start + index]!]),
  ) as Record<(typeof SAILOR_STAT_NAMES)[number], number>;
}

export function setProtagonistStats(
  data: Buffer,
  slot: number,
  value: number,
): Buffer {
  validate(data);
  const protagonist = inspectProtagonist(data, slot);
  const start =
    slotOffset(slot) +
    SAILOR_START +
    protagonist.id * SAILOR_SIZE +
    SAILOR_STATS_START;
  const result = Buffer.from(data);
  result.fill(integer(value, 0, 0xff), start, start + SAILOR_STAT_NAMES.length);
  result.fill(
    integer(value, 0, 0xff),
    start + (SAILOR_LEVELS_START - SAILOR_STATS_START),
    start +
      (SAILOR_LEVELS_START - SAILOR_STATS_START) +
      SAILOR_LEVEL_NAMES.length,
  );
  return result;
}

export function setPlayerShipToTekkousen(data: Buffer, slot: number): Buffer {
  validate(data);
  const protagonist = inspectProtagonist(data, slot);
  const officer =
    slotOffset(slot) + SAILOR_START + protagonist.id * SAILOR_SIZE;
  const fleetId = data[officer + 0x24]!;
  if (fleetId >= 0x64) throw new Error(`Unsupported fleet ID ${fleetId}.`);
  const fleet = FLEET_TABLE + fleetId * FLEET_RECORD_SIZE;
  let shipSlot = -1;
  for (let index = 0; index < SHIP_SLOT_COUNT; index++) {
    const offset = fleet + FLEET_SHIP_SLOTS + index * SHIP_SLOT_SIZE;
    if (data[offset] !== 0xff) {
      shipSlot = offset;
      break;
    }
  }
  if (shipSlot < 0) throw new Error("The player's fleet has no ships.");

  const instanceId = data[shipSlot + 0x07]!;
  const instance = SHIP_INSTANCE_TABLE + instanceId * SHIP_INSTANCE_SIZE;
  const template =
    SHIP_INSTANCE_TABLE + TEKKOUSEN_TEMPLATE_INSTANCE * SHIP_INSTANCE_SIZE;
  const result = Buffer.from(data);
  // Preserve the existing 9-byte ship name, while copying Tekkousen's model data.
  result.set(
    data.subarray(template + SHIP_TYPE_OFFSET, template + SHIP_INSTANCE_SIZE),
    instance + SHIP_TYPE_OFFSET,
  );
  // The instance stores the configured crew maximum separately from the
  // slot's current crew. Configure both to the model's maximum crew.
  result.writeUInt16LE(
    TEKKOUSEN_MAXIMUM_CREW,
    instance + SHIP_CONFIGURED_CREW_OFFSET,
  );
  result[instance + SHIP_CONFIGURED_GUNS_OFFSET] = 0;
  result.writeUInt16LE(
    TEKKOUSEN_CARGO_CAPACITY - TEKKOUSEN_MAXIMUM_CREW,
    instance + SHIP_CARGO_CAPACITY_OFFSET,
  );
  result.writeUInt16LE(3000, PLAYER_WATER);
  result.writeUInt16LE(5000, PLAYER_FOOD);
  // Slot state: maximum crew and full Tekkousen model stats.
  result.writeUInt16LE(TEKKOUSEN_MAXIMUM_CREW, shipSlot);
  result[shipSlot + 2] = TEKKOUSEN_DURABILITY;
  result[shipSlot + 3] = TEKKOUSEN_DURABILITY;
  result[shipSlot + 4] = TEKKOUSEN_TACKING;
  result[shipSlot + 5] = TEKKOUSEN_POWER;
  // Clear the slot's configured gun count as well.
  result[shipSlot + 6] = 0;
  result[shipSlot + 8] = NO_GUNS_SELECTOR;
  return result;
}

export function inspectSlot(data: Buffer, slot: number) {
  validate(data);
  const base = slotOffset(slot);
  const ticks = data[base + 9]!;
  const protagonist = inspectProtagonist(data, slot);
  return {
    slot,
    offset: base,
    label: cstring(
      data.subarray(1 + (slot - 1) * 15, 1 + (slot - 1) * 15 + 12),
    ),
    portId: data[base + CURRENT_PORT],
    portName:
      data[base + CURRENT_PORT]! < PORT_COUNT
        ? inspectPort(data, slot, data[base + CURRENT_PORT]!).name
        : data[base + CURRENT_PORT] === 0xff
          ? "At sea / unused slot"
          : "Outside supported port IDs",
    protagonistId: protagonist.id,
    protagonistName: protagonist.name,
    rank: inspectRank(data, slot, protagonist.id),
    year: data[base + 6]! + 1501,
    month: data[base + 7]! + 1,
    day: data[base + 8]! + 1,
    time: `${String(Math.floor(ticks / 3)).padStart(2, "0")}:${String((ticks % 3) * 20).padStart(2, "0")}`,
  };
}

function sailorName(data: Buffer, slot: number, sailor: number): string {
  validate(data);
  const offset =
    slotOffset(slot) +
    SAILOR_START +
    integer(sailor, 0, PROTAGONIST_COUNT - 1) * SAILOR_SIZE;
  const bytes = data.subarray(offset, offset + SAILOR_SIZE);
  return `${cstring(bytes.subarray(0, 9))} ${cstring(bytes.subarray(9, 18))}`.trim();
}

export function setClock(
  data: Buffer,
  slot: number,
  date: string,
  time: string,
): Buffer {
  validate(data);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Use YYYY-MM-DD and HH:MM.");
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  integer(year, 1501, 1756);
  integer(month, 1, 12);
  integer(day, 1, 31);
  integer(hour, 0, 23);
  integer(minute, 0, 59);
  if (minute % 20 !== 0)
    throw new Error("Time must be on a 20-minute boundary.");
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day)
    throw new Error("Invalid calendar date.");
  const result = Buffer.from(data);
  const base = slotOffset(slot);
  result.set(
    [year - 1501, month - 1, day - 1, hour * 3 + minute / 20],
    base + 6,
  );
  const labelOffset = 1 + (slot - 1) * 15;
  const monthName = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month - 1];
  // The final three header bytes are metadata, including port and protagonist.
  result.fill(0, labelOffset, labelOffset + 12);
  result.write(
    `${monthName}/${String(day).padStart(2, "0")}/${year}`,
    labelOffset,
    "ascii",
  );
  return result;
}

function patch(
  data: Buffer,
  slot: number,
  offset: number,
  type: string,
  expected: number,
  value: number,
): Buffer {
  validate(data);
  if (type !== "u8" && type !== "u16" && type !== "u32")
    throw new Error("Type must be u8, u16, or u32 (little-endian).");
  const width = Number(type.slice(1)) / 8;
  integer(offset, 0, SLOT_SIZE - width);
  integer(expected, 0, 2 ** (width * 8) - 1);
  integer(value, 0, 2 ** (width * 8) - 1);
  const absolute = slotOffset(slot) + offset;
  const actual = data.readUIntLE(absolute, width);
  if (actual !== expected)
    throw new Error(
      `Expected ${expected} at offset ${offset}, found ${actual}; no output written.`,
    );
  const result = Buffer.from(data);
  result.writeUIntLE(value, absolute, width);
  return result;
}
