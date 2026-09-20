import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  CARTOGRAPHER_RECORD_SIZE,
  CARTOGRAPHER_TABLE,
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
  assert.equal(below.confidence, "ambiguous");
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
