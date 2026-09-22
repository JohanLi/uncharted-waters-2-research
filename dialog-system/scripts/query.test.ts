import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  CARTOGRAPHER_RECORD_SIZE,
  CARTOGRAPHER_TABLE,
  COLLECTOR_TABLE,
  ITEM_INVENTORY,
  ITEM_INVENTORY_SIZE,
  setFame,
  setGold,
  slotOffset,
} from "../../save-editor/format.js";
import { repoRoot } from "../../scripts/shared.js";
import {
  loadOrdinaryDialogueData,
  ordinaryBuildingEntry,
} from "./ordinary-dialogue.js";
import {
  inspectSharedScenario,
  isBuildingOpen,
  loadProtagonistScenario,
  loadSharedScenario,
  nextScenarioRandom,
  parseQueryAction,
  protagonistScenarioRandomSeed,
  queryScenario,
  sharedScenarioRandomSeed,
} from "./query.js";

async function originalSave(): Promise<Buffer> {
  return readFile(join(repoRoot, "raw/KOUKAI2.DAT"));
}

test("reproduces protagonist scenario random draws", () => {
  const seed = protagonistScenarioRandomSeed(21, 4, 17, 24, 10, 1_224);
  assert.equal(seed, 0x0195_1100);
  assert.deepEqual(nextScenarioRandom(seed, 3), {
    state: 0x680a_b501,
    result: 2,
  });
});

test("reproduces shared scenario random seeds without time of day", () => {
  assert.equal(sharedScenarioRandomSeed(21, 4, 17, 10, 1_224), 0x0194_f900);
});

test("parses nested ordinary command paths", () => {
  assert.deepEqual(parseQueryAction("harbor:sail:yes"), {
    type: "building",
    context: 3,
    name: "harbor",
    commandPath: ["sail", "yes"],
  });
  assert.deepEqual(parseQueryAction("church:donate:500"), {
    type: "building",
    context: 10,
    name: "church",
    commandPath: ["donate", "500"],
  });
});

test("executes a shared Transport Goods progress route", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 0;
  save[base + 9] = 0x0c;
  save[base + 0xba] = 1;
  save[base + 0xbb] = 1;
  save.writeUInt32LE(0, base + 0xbc);
  const sharedVariable = (index: number) => base + 0xc4 + index * 2;
  save.writeUInt16LE(0, sharedVariable(16));
  save.writeUInt16LE(16, sharedVariable(17));
  save.writeUInt16LE(25, sharedVariable(18));
  save.writeUInt16LE(90, sharedVariable(19));
  const today = (save[base + 6]! * 12 + save[base + 7]!) * 30 + save[base + 8]!;
  save.writeUInt16LE(today + 30, sharedVariable(24));

  const result = await queryScenario(
    save,
    1,
    parseQueryAction("market"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.equal(result.sharedScenario.confidence, "decoded");
  assert.deepEqual(
    result.sharedScenario.outcomes.map((outcome) => ({
      messages: outcome.dialogue.map((line) => line.messageId),
      effects: outcome.effects,
    })),
    [
      {
        messages: [28, 34],
        effects: [
          "answer Yes (set scenario flag 1 to 1)",
          "advance section when the interpreter returns",
          "suppress normal building menu and force exit",
        ],
      },
      {
        messages: [28, 34],
        effects: [
          "answer No (set scenario flag 1 to 0)",
          "suppress normal building menu and force exit",
        ],
      },
    ],
  );
});

test("uses fleet free capacity in the shared Transport Goods offer", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const shipSlot = base + 0x1de0 + fleetId * 0x85 + 0x2b;
  save.set([88, 0, 100, 100, 80, 85, 0, 0, 0x10], shipSlot);
  const instance = base + 0x47fc;
  save.writeUInt16LE(800, instance + 0x16);
  const supply = base + 0x423e;
  save.fill(0, supply, supply + 0x1e);
  save.writeUInt16LE(3_000, supply);
  save.writeUInt16LE(5_000, supply + 2);
  save.fill(0xff, supply + 0x16, supply + 0x1b);

  save[base + 0x0a] = 0;
  save[base + 9] = 0x0c;
  save[base + 0xba] = 1;
  save[base + 0xbb] = 0;
  save.writeUInt32LE(1, base + 0xbc);
  save.writeUInt16LE(0, base + 0xc4 + 16 * 2);
  save.writeUInt16LE(16, base + 0xc4 + 17 * 2);
  save.writeUInt16LE(0, base + 0xc4 + 23 * 2);

  const result = await queryScenario(
    save,
    1,
    parseQueryAction("market"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.deepEqual(
    result.sharedScenario.outcomes.map((outcome) =>
      outcome.dialogue.map((line) => line.messageId),
    ),
    [[14]],
  );
});

test("follows the cached royal invitation into the visible Palace offer", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 0;
  save[base + 9] = 0x0c;
  save[base + 0xba] = 0;
  save[base + 0xbb] = 0;
  save.writeUInt32LE(0x0003_0000, base + 0xbc);
  save.writeUInt16LE(3, base + 0xc4 + 18 * 2);
  save.writeUInt16LE(7, base + 0xc4 + 30 * 2);

  const result = await queryScenario(
    save,
    1,
    parseQueryAction("palace"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.deepEqual(
    {
      executionSection: result.sharedScenario.executionSection,
      executionSubsection: result.sharedScenario.executionSubsection,
      route: result.sharedScenario.route?.key,
      messages: result.sharedScenario.outcomes.map((outcome) =>
        outcome.dialogue.map((line) => line.messageId),
      ),
    },
    {
      executionSection: 7,
      executionSubsection: 1,
      route: 0xa315,
      messages: [
        [155, 156, 162, 164],
        [155, 156, 162, 163],
      ],
    },
  );
});

test("selects destination and home ruler document-mission transcripts", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  const sharedVariable = (index: number) => base + 0xc4 + index * 2;
  save[base + 9] = 0x0c;
  save[base + 0xba] = 7;
  save[base + 0xbb] = 2;
  save.writeUInt16LE(29, sharedVariable(17));
  save.writeUInt16LE(3, sharedVariable(18));
  save.writeUInt16LE(7, sharedVariable(30));

  save[base + 0x0a] = 29;
  save.writeUInt32LE(0x0005_0001, base + 0xbc);
  const destination = await queryScenario(
    save,
    1,
    parseQueryAction("palace"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.deepEqual(
    destination.sharedScenario.outcomes.map((outcome) =>
      outcome.dialogue.map((line) => line.messageId),
    ),
    [[174]],
  );

  save[base + 0x0a] = 0;
  save.writeUInt32LE(0x0005_0003, base + 0xbc);
  const home = await queryScenario(
    save,
    1,
    parseQueryAction("palace"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.deepEqual(
    home.sharedScenario.outcomes.map((outcome) =>
      outcome.dialogue.map((line) => line.messageId),
    ),
    [[166]],
  );
});

test("decodes source placeholders in query dialogue", async () => {
  const save = await originalSave();
  save[slotOffset(1) + 0x0a] = 0;
  const result = await queryScenario(
    save,
    1,
    parseQueryAction("pub"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  const bodies = result.outcomes.flatMap((outcome) =>
    outcome.dialogue.map((line) => line.body),
  );
  assert.ok(bodies.some((body) => body.includes("$n")));
  assert.equal(result.sharedScenario.route?.key, 0xa3ff);
});

test("reports decoded shared royal-mission state and tie priority", async () => {
  let save = await originalSave();
  save[slotOffset(1) + 0x0a] = 0;
  save = setFame(save, 1, 0, "trade", 0, 500);
  save = setFame(save, 1, 0, "piracy", 0, 500);
  save = setFame(save, 1, 0, "adventure", 0, 500);
  const base = slotOffset(1);
  save.writeUInt32LE(0x0003_0000, base + 0xbc);
  save.writeUInt16LE(11, base + 0xc4 + 30 * 2);

  const shared = inspectSharedScenario(
    save,
    1,
    parseQueryAction("pub"),
    await loadSharedScenario(),
  );
  assert.deepEqual(
    {
      section: shared.section,
      subsection: shared.subsection,
      category: shared.highestFameCategory,
      fame: shared.highestFame,
      threshold: shared.nextTitleThreshold,
      meets: shared.meetsFameThreshold,
      eligible: shared.eligibilityFlag,
      armed: shared.invitationArmed,
      offer: shared.offerStarted,
      mission: shared.cachedMissionName,
      route: shared.route?.key,
    },
    {
      section: 0,
      subsection: 0,
      category: "adventure",
      fame: 500,
      threshold: 500,
      meets: true,
      eligible: true,
      armed: true,
      offer: false,
      mission: "Special search",
      route: 0xa3ff,
    },
  );

  save[base + 0x0a] = 100;
  assert.equal(
    inspectSharedScenario(
      save,
      1,
      parseQueryAction("pub"),
      await loadSharedScenario(),
    ).route?.key,
    0xa3ff,
  );
});

test("applies decoded building hours before reporting triggerable dialogue", async () => {
  assert.equal(isBuildingOpen(0x00, 0), false);
  assert.equal(isBuildingOpen(0x01, 0), true);
  assert.equal(isBuildingOpen(0x09, 0x06), true);
  assert.equal(isBuildingOpen(0x09, 0x09), false);
  assert.equal(isBuildingOpen(0x0b, 0x30), true);

  const save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 0;
  save[base + 9] = 0;
  const result = await queryScenario(
    save,
    1,
    parseQueryAction("market"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.equal(result.buildingOpen, false);
  assert.equal(result.confidence, "none");
  assert.deepEqual(result.outcomes, []);
  assert.ok(result.route);
});

test("resolves Ernst's Mercator-contract branch and renewal effects", async () => {
  const mercator = await originalSave();
  const base = slotOffset(1);
  mercator[14] = 3;
  mercator[base + 0x0a] = 33;
  mercator[base + 0x30] = 1;
  mercator[base + 0x31] = 0;
  const cartographerFlags = (index: number) =>
    base + CARTOGRAPHER_TABLE + index * CARTOGRAPHER_RECORD_SIZE + 0x16;
  mercator[cartographerFlags(4)]! |= 0x10;

  const scenario = await loadProtagonistScenario(4);
  const shared = await loadSharedScenario();
  const mercatorResult = await queryScenario(
    mercator,
    1,
    parseQueryAction("special-building"),
    scenario,
    shared,
  );
  assert.equal(mercatorResult.confidence, "decoded");
  assert.deepEqual(
    mercatorResult.outcomes.flatMap((outcome) =>
      outcome.dialogue.map((line) => line.messageId),
    ),
    [77],
  );

  const gerard = Buffer.from(mercator);
  gerard[cartographerFlags(4)]! &= ~0x10;
  gerard[cartographerFlags(1)]! |= 0x10;
  const gerardResult = await queryScenario(
    gerard,
    1,
    parseQueryAction("special-building"),
    scenario,
    shared,
  );
  assert.equal(gerardResult.confidence, "decoded");
  assert.deepEqual(
    gerardResult.outcomes.flatMap((outcome) =>
      outcome.dialogue.map((line) => line.messageId),
    ),
    [78, 79, 80, 81],
  );
  assert.deepEqual(gerardResult.outcomes[0]!.effects, [
    "activate Mercator cartographer contract",
    "clear Gerard de Jode cartographer contract",
  ]);
});

test("distinguishes Pietro's forced Church exit from his usable Lodge", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[14] = 4;
  save[base + 0x0a] = 8;
  save[base + 0x30] = 0;
  save[base + 0x31] = 1;

  const scenario = await loadProtagonistScenario(5);
  const shared = await loadSharedScenario();
  const church = await queryScenario(
    save,
    1,
    parseQueryAction("church"),
    scenario,
    shared,
  );
  assert.deepEqual(
    church.outcomes[0]!.dialogue.map((line) => line.messageId),
    [97, 98],
  );
  assert.ok(
    church.outcomes[0]!.effects.includes(
      "suppress normal building menu and force exit",
    ),
  );
  assert.equal(church.ordinaryBuilding?.disposition, "suppressed");
  assert.deepEqual(church.ordinaryBuilding?.dialogue, []);
  assert.deepEqual(church.ordinaryBuilding?.menu, []);

  const lodge = await queryScenario(
    save,
    1,
    parseQueryAction("lodge"),
    scenario,
    shared,
  );
  assert.deepEqual(
    lodge.outcomes[0]!.dialogue.map((line) => line.messageId),
    [99, 100],
  );
  assert.ok(
    !lodge.outcomes[0]!.effects.includes(
      "suppress normal building menu and force exit",
    ),
  );
  assert.equal(lodge.ordinaryBuilding?.disposition, "shown");
  assert.equal(lodge.ordinaryBuilding?.dialogue[0]?.rawIndex, 66);
  assert.deepEqual(lodge.ordinaryBuilding?.menu, [
    "Check In",
    "Gossip",
    "Port Info",
  ]);
});

test("reports an ordinary religious access denial", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[14] = 5;
  save[base + 0x0a] = 0;
  save[base + 9] = 0x0c;
  save[base + 0x612 + 5 * 42 + 0x29] = 2;

  const entry = ordinaryBuildingEntry(
    save,
    1,
    0x0a,
    true,
    [],
    [],
    await loadOrdinaryDialogueData(),
  );
  assert.equal(entry.confidence, "decoded");
  assert.equal(entry.disposition, "access-denied");
  assert.equal(entry.dialogue[0]?.rawIndex, 90);
  assert.deepEqual(entry.menu, []);
});

test("predicts Harbor Sail endurance and confirmed departure", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const shipSlots = base + 0x1de0 + fleetId * 0x85 + 0x2b;
  save.fill(0xff, shipSlots, shipSlots + 10 * 9);
  save.set([100, 0, 100, 100, 80, 85, 0, 0, 0x10], shipSlots);
  const supply = base + 0x423e;
  save.fill(0, supply, supply + 0x1e);
  save.writeUInt16LE(1_000, supply);
  save.writeUInt16LE(1_000, supply + 2);
  save[supply + 9] = 50;
  save[base + 0x0a] = 0;

  const entry = ordinaryBuildingEntry(
    save,
    1,
    0x03,
    true,
    [],
    [],
    await loadOrdinaryDialogueData(),
    ["sail", "yes"],
  );
  assert.equal(entry.command?.confidence, "decoded");
  assert.equal(entry.command?.disposition, "completed");
  assert.equal(entry.command?.dialogue[0]?.rawIndex, 61);
  assert.match(entry.command?.dialogue[0]?.text ?? "", /10 days/);
  assert.ok(
    entry.command?.effects.includes(
      "reset the current-voyage midnight counter to 0",
    ),
  );
});

test("predicts Harbor Supply load and dump limits", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const shipSlots = base + 0x1de0 + fleetId * 0x85 + 0x2b;
  save.fill(0xff, shipSlots, shipSlots + 10 * 9);
  save.set([100, 0, 100, 100, 80, 85, 0, 0, 0x10], shipSlots);
  const instance = base + 0x47fc;
  save.fill(0, instance, instance + 0x18);
  save.write("Supply Test", instance, "latin1");
  save.writeUInt16LE(500, instance + 0x16);
  const supply = base + 0x423e;
  save.fill(0, supply, supply + 0x1e);
  save.writeUInt16LE(1_000, supply);
  save.writeUInt16LE(1_000, supply + 2);
  save[supply + 9] = 50;
  save[base + 0x0a] = 0;
  save = setGold(save, 1, 1_000);
  const data = await loadOrdinaryDialogueData();

  const load = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "supply",
    "load",
    "1",
    "food",
    "10",
  ]);
  assert.equal(load.command?.dialogue[0]?.rawIndex, 63);
  assert.match(load.command?.dialogue[0]?.text ?? "", /19 gold pieces/);
  assert.ok(load.command?.effects.includes("deduct 190 gold"));

  const dump = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "supply",
    "dump",
    "1",
    "water",
    "50",
  ]);
  assert.equal(dump.command?.dialogue[0]?.combinedIndex, 1392);
  assert.ok(
    dump.command?.effects.includes(
      "remove 50 barrels of water from Supply Test",
    ),
  );

  save[base + 0x0a] = 100;
  const supplyPort = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "supply",
    "load",
    "1",
    "food",
    "10",
  ]);
  assert.equal(supplyPort.command?.confidence, "ambiguous");
  assert.equal(supplyPort.command?.disposition, "unsupported");
  assert.match(
    supplyPort.command?.uncertainties[0] ?? "",
    /process history is not stored in the save/,
  );
});

test("decodes local Moor storage and nested ship operations", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const active = base + 0x1de0 + fleetId * 0x85 + 0x2b;
  save.fill(0xff, active, active + 10 * 9);
  save.set([100, 0, 100, 100, 80, 85, 0, 0, 0x10], active);
  save.set([40, 0, 80, 80, 70, 70, 0, 1, 0x10], active + 9);
  const reserve = base + 0x46ee;
  save.fill(0, reserve, reserve + 30 * 9);
  save.set([0, 0, 60, 60, 75, 75, 0, 2, 0x10], reserve);

  const instances = base + 0x47fc;
  for (const [id, name, crew] of [
    [0, "Flagship", 100],
    [1, "Escort", 50],
    [2, "Docked", 30],
  ] as const) {
    const instance = instances + id * 0x18;
    save.fill(0, instance, instance + 0x18);
    save.write(name, instance, "latin1");
    save.writeUInt16LE(crew, instance + 0x14);
    save.writeUInt16LE(500, instance + 0x16);
  }
  const supplies = base + 0x423e;
  save.fill(0, supplies, supplies + 40 * 0x1e);
  save[supplies + 0x1b] = protagonistId;
  save[supplies + 0x1e + 0x1b] = 69;
  save[supplies + 10 * 0x1e + 0x1b] = 0x80;
  save[base + 0x0a] = 0;
  save.fill(0xff, base + 0x1d85, base + 0x1d85 + 30);
  save[base + 0x1d85] = 69;
  save[base + 0x1d86] = 70;
  save[base + 0x612 + 69 * 42 + 0x26] = 2;
  save[base + 0x612 + 70 * 42 + 0x26] = 6;
  const data = await loadOrdinaryDialogueData();

  const moor = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "moor",
  ]);
  assert.deepEqual(
    moor.command?.dialogue.map((dialogue) => dialogue.combinedIndex),
    [1395, 276],
  );
  assert.match(moor.command?.dialogue[1]?.text ?? "", /keeping 1/);
  assert.match(moor.command?.dialogue[1]?.text ?? "", /up to 5/);

  const store = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "moor",
    "store",
    "1",
    "yes",
  ]);
  assert.equal(store.command?.dialogue.at(-1)?.rawIndex, 282);
  assert.ok(
    store.command?.effects.includes("preserve the ship's provisions and cargo"),
  );

  const commission = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "moor",
    "commission",
    "1",
    "yes",
  ]);
  assert.equal(commission.command?.dialogue.at(-1)?.rawIndex, 286);
  assert.ok(
    commission.command?.effects.some((effect) => effect.startsWith("assign ")),
  );

  const exchange = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "moor",
    "exchange",
    "1",
    "1",
    "yes",
  ]);
  assert.equal(exchange.command?.dialogue.at(-1)?.rawIndex, 287);
  assert.ok(
    exchange.command?.effects.includes("transfer 30 crew and dismiss 10"),
  );
});

test("selects supply-port Harbor commands and a Luck-based Life reading", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  const data = await loadOrdinaryDialogueData();
  save[base + 0x0a] = 100;
  const supplyPort = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data);
  assert.deepEqual(supplyPort.menu, ["Sail", "Supply", "Rename Port"]);

  save = setGold(save, 1, 100);
  save[base + 0x0a] = 4;
  const protagonistId = save[14]!;
  save[base + 0x612 + protagonistId * 42 + 0x1b] = 75;
  const fortune = ordinaryBuildingEntry(save, 1, 0x0b, true, [], [], data, [
    "life",
    "yes",
  ]);
  assert.deepEqual(
    fortune.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [299, 301, 305],
  );
  assert.deepEqual(fortune.command?.effects, ["deduct 50 gold"]);
});

test("accepts and validates supply-port Rename Port input", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 100;
  const data = await loadOrdinaryDialogueData();

  const unique = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "rename-port",
    "Codex",
  ]);
  assert.equal(unique.command?.disposition, "completed");
  assert.deepEqual(
    unique.command?.dialogue.map((entry) => entry.rawIndex),
    [926, 928],
  );
  assert.match(unique.command?.effects[0] ?? "", /Codex/);

  const duplicate = ordinaryBuildingEntry(save, 1, 0x03, true, [], [], data, [
    "rename-port",
    "Lisbon",
  ]);
  assert.equal(duplicate.command?.disposition, "blocked");
  assert.equal(duplicate.command?.dialogue.at(-1)?.rawIndex, 927);
});

test("resolves Item Shop stock, purchases, and deterministic sales", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 0;
  save[base + 9] = 0x18;
  save.fill(
    0xff,
    base + ITEM_INVENTORY,
    base + ITEM_INVENTORY + ITEM_INVENTORY_SIZE,
  );
  save = setGold(save, 1, 5_000);
  const data = await loadOrdinaryDialogueData();

  const bought = ordinaryBuildingEntry(save, 1, 0x09, true, [], [], data, [
    "buy",
    "Quadrant",
    "yes",
  ]);
  assert.equal(bought.command?.disposition, "completed");
  assert.deepEqual(
    bought.command?.dialogue.map((entry) => entry.rawIndex),
    [238, 240, 242],
  );
  assert.match(bought.command?.effects[0] ?? "", /4000/);
  assert.match(bought.command?.effects[1] ?? "", /item 20.*slot 1/);

  save[base + ITEM_INVENTORY] = 0;
  const sold = ordinaryBuildingEntry(save, 1, 0x09, true, [], [], data, [
    "sell",
    "Dagger",
    "yes",
  ]);
  assert.equal(sold.command?.disposition, "completed");
  assert.deepEqual(
    sold.command?.dialogue.map((entry) => entry.rawIndex),
    [244, 245, 248],
  );
  assert.match(sold.command?.effects[0] ?? "", /200 gold/);
});

test("uses secret Item Shop stock and exposes the Luck counteroffer", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 1;
  save[base + 9] = 0x06;
  save.fill(
    0xff,
    base + ITEM_INVENTORY,
    base + ITEM_INVENTORY + ITEM_INVENTORY_SIZE,
  );
  save[base + ITEM_INVENTORY] = 0;
  save = setGold(save, 1, 20_000);
  const data = await loadOrdinaryDialogueData();

  const buy = ordinaryBuildingEntry(save, 1, 0x09, true, [], [], data, ["buy"]);
  assert.equal(buy.dialogue[0]?.rawIndex, 764);
  assert.deepEqual(buy.command?.menu, ["1: Basterd Sword"]);

  const counter = ordinaryBuildingEntry(save, 1, 0x09, true, [], [], data, [
    "sell",
    "Dagger",
    "no",
  ]);
  assert.equal(counter.command?.confidence, "ambiguous");
  assert.match(counter.command?.uncertainties[0] ?? "", /random\(100\)/);
  assert.match(counter.command?.notes[0] ?? "", /Charm/);
});

test("resolves all deterministic Bank transaction paths", async () => {
  const source = await originalSave();
  const data = await loadOrdinaryDialogueData();
  const base = slotOffset(1);

  let save = setGold(source, 1, 5_000);
  save[base + 0x0a] = 0;
  save.writeInt16LE(0, base + 0x60e);
  save[base + 0x610] = 0;
  const deposit = ordinaryBuildingEntry(save, 1, 0x08, true, [], [], data, [
    "deposit",
    "2500",
  ]);
  assert.deepEqual(
    deposit.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [105, 106, 103],
  );
  assert.ok(deposit.command?.effects.includes("set savings balance to 2500"));

  save = setGold(source, 1, 5_000);
  save[base + 0x0a] = 0;
  save.writeInt16LE(25, base + 0x60e);
  save[base + 0x610] = 0;
  const withdraw = ordinaryBuildingEntry(save, 1, 0x08, true, [], [], data, [
    "withdraw",
    "1000",
  ]);
  assert.deepEqual(
    withdraw.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [108, 110, 103],
  );
  assert.ok(withdraw.command?.effects.includes("set savings balance to 1500"));

  save = setGold(source, 1, 100);
  save[base + 0x0a] = 0;
  save.writeInt16LE(0, base + 0x60e);
  save[base + 0x610] = 0;
  const protagonistId = save[14]!;
  save[base + 0x5b6 + protagonistId * 14 + 13] = 2;
  const borrow = ordinaryBuildingEntry(save, 1, 0x08, true, [], [], data, [
    "borrow",
    "10000",
  ]);
  assert.deepEqual(
    borrow.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [115, 116, 117],
  );
  assert.ok(borrow.command?.effects.includes("set account balance to -10000"));

  save = setGold(source, 1, 1_000);
  save[base + 0x0a] = 0;
  save.writeInt16LE(-13, base + 0x60e);
  save[base + 0x610] = 50;
  const repay = ordinaryBuildingEntry(save, 1, 0x08, true, [], [], data, [
    "repay",
    "1000",
  ]);
  assert.deepEqual(
    repay.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [119, 120, 149, 117],
  );
  assert.ok(repay.command?.effects.includes("set account balance to -250"));
});

test("resolves Career, Love, and Mates fortune readings", async () => {
  let save = await originalSave();
  const data = await loadOrdinaryDialogueData();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const protagonist = base + 0x612 + protagonistId * 42;
  save = setGold(save, 1, 1_000);
  save[base + 0x0a] = 1;
  save[protagonist + 0x1c] = 2;
  save[protagonist + 0x1d] = 3;
  save.writeUInt16LE(20, protagonist + 0x1e);
  save.writeUInt16LE(100, protagonist + 0x20);
  save.writeUInt16LE(100, base + 0x5b6 + protagonistId * 14);
  save.writeUInt16LE(50, base + 0x5b6 + protagonistId * 14 + 2);
  save.writeUInt16LE(25, base + 0x5b6 + protagonistId * 14 + 4);
  save[base + 0x5b6 + protagonistId * 14 + 13] = 0;
  const career = ordinaryBuildingEntry(save, 1, 0x0b, true, [], [], data, [
    "career",
    "yes",
  ]);
  assert.deepEqual(
    career.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [299, 301, 545, 546, 547],
  );
  assert.match(career.command?.dialogue[2]?.text ?? "", /100 more experience/);
  assert.match(career.command?.dialogue[4]?.text ?? "", /400 more fame/);

  save[base + 0x0a] = 2;
  const ladia = base + 0x1bb2 + 0x10;
  save[ladia + 0x0b] = 2;
  save[ladia + 0x0c] = 80;
  save[ladia + 0x0f] = 0x08;
  const love = ordinaryBuildingEntry(save, 1, 0x0b, true, [], [], data, [
    "love",
    "yes",
  ]);
  assert.equal(love.command?.dialogue.at(-1)?.rawIndex, 326);
  assert.match(love.command?.dialogue.at(-1)?.text ?? "", /Ladia/);

  save[base + 0x0a] = 1;
  save.fill(0xff, base + 0x1d85, base + 0x1d85 + 30);
  save[base + 0x1d85] = 69;
  save[base + 0x612 + 69 * 42 + 0x1b] = 70;
  save[base + 0x612 + 69 * 42 + 0x23] = 20;
  const mates = ordinaryBuildingEntry(save, 1, 0x0b, true, [], [], data, [
    "mates",
    "yes",
    "1",
  ]);
  assert.deepEqual(
    mates.command?.dialogue.map((dialogue) => dialogue.rawIndex),
    [299, 301, 792, 80, 793],
  );
  assert.match(mates.command?.notes[0] ?? "", /Luck 70, Loyalty 20/);
});

test("renders the Lodge Port Info values from saved port metadata", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 0;
  const metadata = base + 0x5966;
  save.set([75, 20, 10, 5, 0, 1], metadata + 0x0a);
  save[base + 0x4f40 + 0x13] = 0;
  const entry = ordinaryBuildingEntry(
    save,
    1,
    0x04,
    true,
    [],
    [],
    await loadOrdinaryDialogueData(),
    ["port-info"],
  );
  assert.equal(entry.command?.confidence, "decoded");
  assert.deepEqual(entry.command?.dialogue, []);
  assert.deepEqual(entry.command?.notes.slice(0, 3), [
    "Controller: Portugal.",
    "Portugal: 75%",
    "Spain: 20%",
  ]);
});

test("selects collector, teacher, and locked story residences", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  const data = await loadOrdinaryDialogueData();
  const at = (portId: number) => {
    save[base + 0x0a] = portId;
    return ordinaryBuildingEntry(save, 1, 0x07, true, [], [], data);
  };

  const collector = at(27);
  assert.equal(collector.dialogue[0]?.rawIndex, 477);
  assert.deepEqual(collector.menu, ["Contract", "Discovery", "Rumor"]);

  const celestialTeacher = at(10);
  assert.equal(celestialTeacher.dialogue[0]?.rawIndex, 750);
  assert.equal(celestialTeacher.dialogue[0]?.speaker, "Professor Juliano");
  assert.deepEqual(celestialTeacher.menu, []);

  const gunneryTeacher = at(35);
  assert.equal(gunneryTeacher.dialogue[0]?.rawIndex, 743);
  assert.equal(gunneryTeacher.dialogue[0]?.speaker, "Dr. Wolf");

  const storyResidence = at(75);
  assert.equal(storyResidence.dialogue[0]?.rawIndex, 933);
  assert.deepEqual(storyResidence.uncertainties, []);
});

test("resolves Guild assignment rows and cached Country Info", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 16;
  save[base + 0xba] = 0;
  save.writeUInt16LE(0, base + 0xc4);
  save.writeUInt16LE(2, base + 0xc6);
  save.writeUInt16LE(2, base + 0xc8);
  const data = await loadOrdinaryDialogueData();
  const jobs = ordinaryBuildingEntry(save, 1, 0x06, true, [], [], data, [
    "job-assignment",
  ]);
  assert.deepEqual(jobs.command?.menu, [
    "1: Transport Goods",
    "2: Deliver Letter",
    "3: Deliver Letter",
  ]);
  const selected = ordinaryBuildingEntry(save, 1, 0x06, true, [], [], data, [
    "job-assignment",
    "1",
  ]);
  assert.match(selected.command?.effects[1] ?? "", /section 1/);
  const routed = await queryScenario(
    save,
    1,
    parseQueryAction("guild:job-assignment:1"),
    await loadProtagonistScenario(1),
    await loadSharedScenario(),
  );
  assert.equal(routed.sharedScenario.executionSubsection, 1);
  assert.deepEqual(
    routed.sharedScenario.outcomes.map((outcome) =>
      outcome.dialogue.map((entry) => entry.messageId),
    ),
    [[2], [2]],
  );

  save = setGold(save, 1, 500);
  const country = ordinaryBuildingEntry(save, 1, 0x06, true, [], [], data, [
    "country-info",
    "Portugal",
    "yes",
  ]);
  assert.equal(country.command?.disposition, "completed");
  assert.deepEqual(
    country.command?.dialogue.map((entry) => entry.rawIndex),
    [162, 86, 88, 89],
  );
  assert.match(country.command?.notes[0] ?? "", /Profit/);
});

test("resolves collector contracts and discovery turn-ins", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  save[base + 0x0a] = 27;
  const collector = base + COLLECTOR_TABLE + 4 * 24;
  save[collector + 0x16] = save[collector + 0x16]! | 0x10;
  const stonehenge = base + 0x6e74;
  save[stonehenge + 6] = 0x20;
  const data = await loadOrdinaryDialogueData();

  const discovery = ordinaryBuildingEntry(save, 1, 0x07, true, [], [], data, [
    "discovery",
    "Stonehenge",
  ]);
  assert.equal(discovery.command?.disposition, "completed");
  assert.deepEqual(
    discovery.command?.dialogue.map((entry) => entry.rawIndex),
    [485, 486],
  );
  assert.match(discovery.command?.effects[0] ?? "", /2500 gold/);
  assert.match(discovery.command?.effects[1] ?? "", /80 Adventure Fame/);
});

test("resolves cartographer reports and teacher lessons", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  save[base + 0x0a] = 33;
  const mercatorFlags =
    base + CARTOGRAPHER_TABLE + 4 * CARTOGRAPHER_RECORD_SIZE + 0x16;
  save[mercatorFlags] = save[mercatorFlags]! | 0x10;
  save.writeUInt16LE(3, base + 0x036c);
  save.writeUInt16LE(142, base + 0x036a);
  const data = await loadOrdinaryDialogueData();
  const report = ordinaryBuildingEntry(save, 1, 0x07, true, [], [], data, [
    "report",
  ]);
  assert.equal(report.command?.disposition, "completed");
  assert.deepEqual(report.command?.effects.slice(0, 2), [
    "add 240 gold",
    "add 15 Adventure Fame, capped at 50,000",
  ]);

  save[base + 0x0a] = 10;
  const sailor = base + 0x612 + protagonistId * 42;
  save[sailor + 0x15] = 80;
  save[sailor + 0x16] = 70;
  save[sailor + 0x17] = 70;
  save[sailor + 0x28] = save[sailor + 0x28]! & ~0x10;
  save = setGold(save, 1, 100_000);
  const lesson = ordinaryBuildingEntry(save, 1, 0x07, true, [], [], data, [
    "learn-skill",
    "yes",
  ]);
  assert.equal(lesson.command?.disposition, "completed");
  assert.match(lesson.command?.effects[1] ?? "", /Celestial Navigation/);
});

test("resolves Palace documents, defection, and royal aid", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const sailor = base + 0x612 + protagonistId * 42;
  const fame = base + 0x5b6 + protagonistId * 14;
  const portugal = base + 0x04d6;
  save[base + 0x0a] = 0;
  save[base + 7] = 0;
  save[sailor + 0x29] = save[sailor + 0x29]! & 0xf8;
  save[fame + 13] = 1;
  save.fill(
    0xff,
    base + ITEM_INVENTORY,
    base + ITEM_INVENTORY + ITEM_INVENTORY_SIZE,
  );
  save = setFame(save, 1, protagonistId, "piracy", 0, 1_000);
  const data = await loadOrdinaryDialogueData();

  const marque = ordinaryBuildingEntry(save, 1, 0x05, true, [], [], data, [
    "meet-ruler",
    "letter-of-marque",
  ]);
  assert.equal(marque.command?.disposition, "completed");
  assert.deepEqual(
    marque.command?.dialogue.map((entry) => entry.rawIndex),
    [866, 869, 870, 871],
  );
  assert.match(marque.command?.effects[0] ?? "", /item 29/);

  save[fame + 13] = 6;
  const permit = ordinaryBuildingEntry(save, 1, 0x05, true, [], [], data, [
    "meet-ruler",
    "tax-free-permit",
    "yes",
  ]);
  assert.equal(permit.command?.disposition, "completed");
  assert.deepEqual(
    permit.command?.dialogue.map((entry) => entry.rawIndex),
    [873, 874, 875, 869, 876, 32],
  );
  assert.equal(permit.command?.notes[0], "Permit units: 0.");

  save[portugal + 5] = 25;
  const gold = ordinaryBuildingEntry(save, 1, 0x05, true, [], [], data, [
    "gold",
  ]);
  assert.equal(gold.command?.disposition, "completed");
  assert.deepEqual(
    gold.command?.dialogue.map((entry) => entry.rawIndex),
    [462, 463],
  );
  assert.match(gold.command?.effects[0] ?? "", /25000 gold/);

  save[portugal + 7] = 0;
  save[portugal + 8] = 1;
  save.fill(0xff, base + 0x1d85, base + 0x1d85 + 30);
  save[base + 0x1d85] = 6;
  for (let index = 0; index < 40; index++)
    save[base + 0x423e + index * 0x1e + 0x1b] = 0xff;
  for (let index = 0; index < 30; index++)
    save[base + 0x46ee + index * 9 + 8] = 0;
  const ship = ordinaryBuildingEntry(save, 1, 0x05, true, [], [], data, [
    "ship",
    "Aurora",
  ]);
  assert.equal(ship.command?.disposition, "completed");
  assert.deepEqual(
    ship.command?.dialogue.map((entry) => entry.rawIndex),
    [464, 555, 552, 463],
  );
  assert.match(ship.command?.effects[0] ?? "", /Aurora/);

  save[base + 0x0a] = 1;
  save.writeUInt32LE(0, base + 0xbc);
  save[base + 0xba] = 0;
  const defect = ordinaryBuildingEntry(save, 1, 0x05, true, [], [], data, [
    "defect",
    "yes",
  ]);
  assert.equal(defect.command?.disposition, "completed");
  assert.deepEqual(
    defect.command?.dialogue.map((entry) => entry.rawIndex),
    [458, 460],
  );
  assert.match(defect.command?.effects[0] ?? "", /Spain/);
});

test("resolves Pub Meet and Lodge Gossip sailor hiring", async () => {
  const save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  save[base + 0x0a] = 0;
  save[base + 0x5b6 + protagonistId * 14 + 13] = 7;
  save.fill(0xff, base + 0x1d85, base + 0x1d85 + 30);
  for (let id = 6; id < 120; id++) {
    const status = base + 0x612 + id * 42 + 0x29;
    save[status] = save[status]! & ~0x20;
  }

  const miguel = base + 0x612 + 85 * 42;
  save[miguel + 0x23] = 31;
  save[miguel + 0x24] = 0xff;
  save[miguel + 0x25] = 0;
  save[miguel + 0x26] = 0;
  save[miguel + 0x29] = 0x60;

  const roberto = base + 0x612 + 84 * 42;
  save[roberto + 0x23] = 0;
  save[roberto + 0x24] = 0xff;
  save[roberto + 0x25] = 0;
  save[roberto + 0x26] = 0;
  save[roberto + 0x29] = 0x20;
  const data = await loadOrdinaryDialogueData();

  const pubList = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "meet",
  ]);
  assert.deepEqual(pubList.command?.menu, ["1: Miguel Solis"]);

  const pubHire = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "meet",
    "Miguel Solis",
    "hire",
    "yes",
  ]);
  assert.equal(pubHire.command?.disposition, "completed");
  assert.deepEqual(
    pubHire.command?.dialogue.map((entry) => entry.rawIndex),
    [41, 43, 48, 142, 144],
  );
  assert.match(pubHire.command?.effects[0] ?? "", /Miguel Solis/);

  save[miguel + 0x23] = 30;
  const refused = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "meet",
    "Miguel Solis",
    "hire",
  ]);
  assert.equal(refused.command?.disposition, "blocked");
  assert.equal(refused.command?.dialogue.at(-1)?.rawIndex, 141);

  const lodgeHire = ordinaryBuildingEntry(save, 1, 0x04, true, [], [], data, [
    "gossip",
    "Roberto Almanzan",
    "hire",
    "yes",
  ]);
  assert.equal(lodgeHire.command?.disposition, "completed");
  assert.deepEqual(
    lodgeHire.command?.dialogue.map((entry) => entry.rawIndex),
    [72, 75, 48, 142, 144],
  );

  const duel = ordinaryBuildingEntry(save, 1, 0x04, true, [], [], data, [
    "gossip",
    "Roberto Almanzan",
    "duel",
  ]);
  assert.match(duel.command?.effects[0] ?? "", /duel engine/);

  save[miguel + 0x23] = 10;
  save[miguel + 0x27] = save[base + 0x612 + protagonistId * 42 + 0x27]!;
  save[miguel + 0x14] = 80;
  save.writeUIntLE(100, base + 0x60a, 3);
  const treat = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "meet",
    "Miguel Solis",
    "treat",
  ]);
  assert.equal(treat.command?.disposition, "completed");
  assert.deepEqual(
    treat.command?.dialogue.map((entry) => entry.rawIndex),
    [41, 43, 44, 46, 139],
  );
  assert.ok(treat.command?.effects.some((effect) => /10 to 46/.test(effect)));

  const metadata = base + 0x5966;
  save[metadata + 0x24] = 0;
  const crowdTreat = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "treat",
    "2",
  ]);
  assert.match(crowdTreat.dialogue[0]?.text ?? "", /rum/);
  assert.match(crowdTreat.command?.effects[0] ?? "", /6 gold/);

  const lucia = base + 0x1bb2;
  save[lucia + 0x0b] = 0;
  save[lucia + 0x0c] = 0;
  save[lucia + 0x0f] = save[lucia + 0x0f]! | 0x30;
  const discovery = base + 0x6e74;
  save[discovery + 5] = 50;
  save[discovery + 6] = 0x20;
  const story = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "waitress",
    "tell-stories",
    "1",
  ]);
  assert.equal(story.command?.disposition, "completed");
  assert.ok(
    story.command?.effects.some((effect) => /favor from 0 to 12/.test(effect)),
  );
});

test("resolves Market stock, purchases, rates, and investment", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const fleetShip = base + 0x1de0 + fleetId * 0x85 + 0x2b;
  const instance = base + 0x47fc;
  const supply = base + 0x423e;
  const metadata = base + 0x5966;
  save[base + 0x0a] = 0;
  save.writeUInt16LE(10_000, metadata + 2);
  save[metadata + 0x23] = 0;
  save.fill(50, metadata + 0x10, metadata + 0x1a);
  save.set([20, 0, 80, 100, 50, 50, 0, 0, 0x10], fleetShip);
  save.fill(0, instance, instance + 0x18);
  save.write("Mercury", instance, "latin1");
  save[instance + 0x11] = 0;
  save.writeUInt16LE(200, instance + 0x16);
  save.fill(0, supply, supply + 0x1e);
  save.fill(0xff, supply + 0x16, supply + 0x1b);
  save[supply + 0x1b] = protagonistId;
  save = setGold(save, 1, 100_000);
  const data = await loadOrdinaryDialogueData();

  const list = ordinaryBuildingEntry(save, 1, 0x00, true, [], [], data, [
    "buy-goods",
  ]);
  assert.equal(list.command?.disposition, "shown");
  assert.ok((list.command?.menu.length ?? 0) > 0);
  const bought = ordinaryBuildingEntry(save, 1, 0x00, true, [], [], data, [
    "buy-goods",
    "1",
    "1",
    "2",
    "yes",
  ]);
  assert.equal(bought.command?.disposition, "completed");
  assert.match(bought.command?.effects[1] ?? "", /2 lots/);

  save.writeUInt16LE(5, supply + 0x0c);
  save[supply + 0x16] = 0;
  const sold = ordinaryBuildingEntry(save, 1, 0x00, true, [], [], data, [
    "sell-goods",
    "1",
    "1",
    "2",
  ]);
  assert.equal(sold.command?.disposition, "completed");
  assert.match(sold.command?.effects[0] ?? "", /2 lots/);

  const rates = ordinaryBuildingEntry(save, 1, 0x00, true, [], [], data, [
    "market-rate",
  ]);
  assert.equal(rates.command?.confidence, "decoded");
  assert.equal(rates.command?.notes.length, 46);

  save[base + 0x04d6 + 0x0a] = 99;
  const investment = ordinaryBuildingEntry(save, 1, 0x00, true, [], [], data, [
    "invest",
    "500",
  ]);
  assert.equal(investment.command?.disposition, "completed");
  assert.match(investment.command?.effects[1] ?? "", /Economy/);
});

test("resolves Shipyard model lists, repairs, remodeling, and investment", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  const protagonistId = save[14]!;
  const officer = base + 0x612 + protagonistId * 42;
  const fleetId = save[officer + 0x24]!;
  const fleetShip = base + 0x1de0 + fleetId * 0x85 + 0x2b;
  const instance = base + 0x47fc;
  const supply = base + 0x423e;
  const metadata = base + 0x5966;
  save[base + 0x0a] = 0;
  save.writeUInt16LE(50_000, metadata + 6);
  save[metadata + 0x24] = 0;
  save.set([20, 0, 70, 100, 40, 40, 0, 0, 0x10], fleetShip);
  save.fill(0, instance, instance + 0x18);
  save.write("Mercury", instance, "latin1");
  save[instance + 0x11] = 0;
  save.writeUInt16LE(200, instance + 0x16);
  save.fill(0, supply, supply + 0x1e);
  save.fill(0xff, supply + 0x16, supply + 0x1b);
  save[supply + 0x1b] = protagonistId;
  save = setGold(save, 1, 100_000);
  const data = await loadOrdinaryDialogueData();

  const models = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "new-ship",
  ]);
  assert.equal(models.command?.disposition, "shown");
  assert.ok((models.command?.menu.length ?? 0) > 0);
  const design = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "new-ship",
    "1",
    "Beech",
  ]);
  assert.equal(design.command?.disposition, "completed");
  assert.match(design.command?.effects[0] ?? "", /design controls/);

  const used = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "used-ship",
  ]);
  assert.equal(used.command?.confidence, "ambiguous");
  assert.match(used.command?.uncertainties[0] ?? "", /not stored in the save/);

  const repair = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "repair",
    "1",
    "yes",
  ]);
  assert.equal(repair.command?.disposition, "completed");
  assert.equal(repair.command?.dialogue.at(-1)?.combinedIndex, 1047);
  assert.match(repair.command?.effects[1] ?? "", /durability to 100/);

  const rename = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "remodel",
    "rename",
    "1",
    "Dauntless",
  ]);
  assert.equal(rename.command?.disposition, "completed");
  assert.match(rename.command?.effects[0] ?? "", /Dauntless/);

  const sale = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "sell",
  ]);
  assert.equal(sale.command?.disposition, "blocked");
  assert.equal(sale.command?.dialogue[0]?.rawIndex, 208);

  save[base + 0x04d6 + 0x0a] = 99;
  save.writeUInt16LE(1_000, metadata + 6);
  const investment = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "invest",
    "500",
  ]);
  assert.equal(investment.command?.disposition, "completed");
  assert.match(investment.command?.effects[1] ?? "", /Industry/);
});

test("decodes Pietro's one-gold-ingot Pub gate independently of Adventure Fame", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  save[14] = 4;
  save[base + 0x0a] = 57;
  save[base + 9] = 0x20;
  save[base + 0x30] = 1;
  save[base + 0x31] = 0;
  save.fill(
    0xff,
    base + ITEM_INVENTORY,
    base + ITEM_INVENTORY + ITEM_INVENTORY_SIZE,
  );
  save[base + ITEM_INVENTORY] = 0x4c;
  save[base + ITEM_INVENTORY + 1] = 0x4b;
  save = setFame(save, 1, 4, "adventure", 0, 0);

  const scenario = await loadProtagonistScenario(5);
  const shared = await loadSharedScenario();
  const below = await queryScenario(
    setGold(save, 1, 9_999),
    1,
    parseQueryAction("pub"),
    scenario,
    shared,
  );
  assert.equal(below.confidence, "decoded");
  assert.deepEqual(below.outcomes, []);
  assert.equal(below.ordinaryBuilding?.dialogue[0]?.rawIndex, 18);
  assert.deepEqual(below.ordinaryBuilding?.menu, [
    "Recruit Crew",
    "Dismiss Crew",
    "Treat",
    "Meet",
    "Waitress",
    "Gamble",
  ]);
  assert.ok(below.notes.some((note) => note.includes("one Gold Ingot")));

  const at = await queryScenario(
    setGold(save, 1, 10_000),
    1,
    parseQueryAction("pub"),
    scenario,
    shared,
  );
  assert.notEqual(at.confidence, "none");
  assert.equal(at.outcomes[0]!.dialogue[0]!.messageId, 109);
});

test("resolves Catalina's 1,500 and 2,000 Piracy Fame transitions", async () => {
  let save = await originalSave();
  const base = slotOffset(1);
  save[14] = 1;
  save[base + 0x0a] = 26;
  save[base + 9] = 0x20;
  save[base + 0x30] = 2;
  save[base + 0x31] = 0;
  save[base + 0x612 + 1 * 42 + 0x29] = 0x66;

  const scenario = await loadProtagonistScenario(2);
  const shared = await loadSharedScenario();
  const belowRumor = await queryScenario(
    setFame(save, 1, 1, "piracy", 0, 1_499),
    1,
    parseQueryAction("market"),
    scenario,
    shared,
  );
  assert.equal(belowRumor.confidence, "decoded");
  assert.deepEqual(belowRumor.outcomes, []);
  assert.equal(belowRumor.ordinaryBuilding?.disposition, "shown");
  assert.equal(belowRumor.ordinaryBuilding?.dialogue[0]?.rawIndex, 0);
  assert.deepEqual(belowRumor.ordinaryBuilding?.menu, [
    "Buy Goods",
    "Sell Goods",
    "Invest",
    "Market Rate",
  ]);

  save = setFame(save, 1, 1, "piracy", 0, 1_500);
  const rumor = await queryScenario(
    save,
    1,
    parseQueryAction("market"),
    scenario,
    shared,
  );
  assert.equal(rumor.outcomes[0]!.dialogue[0]!.messageId, 230);
  assert.ok(
    rumor.outcomes[0]!.effects.includes(
      "advance subsection when the interpreter returns",
    ),
  );

  save[base + 0x31] = 1;
  const belowSearch = await queryScenario(
    setFame(save, 1, 1, "piracy", 1_500, 1_999),
    1,
    parseQueryAction("pub"),
    scenario,
    shared,
  );
  assert.ok(
    belowSearch.outcomes.every(
      (outcome) =>
        !outcome.effects.includes(
          "advance section when the interpreter returns",
        ),
    ),
  );

  const search = await queryScenario(
    setFame(save, 1, 1, "piracy", 1_500, 2_000),
    1,
    parseQueryAction("pub"),
    scenario,
    shared,
  );
  assert.ok(
    search.outcomes.every((outcome) =>
      outcome.effects.includes("advance section when the interpreter returns"),
    ),
  );
});

test("resolves Catalina's Lucia wait counter and calendar-day rollover", async () => {
  const baseline = await originalSave();
  const base = slotOffset(1);
  baseline[14] = 1;
  baseline[base + 0x0a] = 0;
  baseline[base + 8] = 8;
  baseline[base + 9] = 56;
  baseline[base + 0x30] = 5;
  baseline[base + 0x31] = 2;
  baseline.writeUInt16LE(8, base + 0x3a);

  const scenario = await loadProtagonistScenario(2);
  const shared = await loadSharedScenario();
  const messagesFor = async (
    action: "pub" | "lodge",
    waitCounter: number,
    day = 8,
  ) => {
    const save = Buffer.from(baseline);
    save[base + 8] = day;
    save.writeUInt16LE(waitCounter, base + 0x3a + 16 * 2);
    const result = await queryScenario(
      save,
      1,
      parseQueryAction(action),
      scenario,
      shared,
    );
    return result.outcomes.flatMap((outcome) =>
      outcome.dialogue.map((line) => line.messageId),
    );
  };

  assert.deepEqual(await messagesFor("lodge", 0), [511, 512]);
  assert.deepEqual(await messagesFor("lodge", 1), [513, 514]);
  assert.deepEqual(
    await messagesFor("lodge", 2),
    [502, 503, 504, 505, 509, 510],
  );
  assert.deepEqual(await messagesFor("lodge", 3), [506, 507, 508, 509, 510]);
  assert.deepEqual(await messagesFor("lodge", 2, 9), [515, 516, 517, 518, 519]);
  assert.deepEqual(await messagesFor("pub", 1), [496, 497]);
  assert.deepEqual(await messagesFor("pub", 2), [498, 499]);
  assert.deepEqual(await messagesFor("pub", 2, 9), [500, 501]);
});
