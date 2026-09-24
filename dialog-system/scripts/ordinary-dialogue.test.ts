import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
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

const base = slotOffset(1);
const SAILOR_TABLE = 0x612;
const SAILOR_SIZE = 42;
const ITEM_TABLE = 0x7130;
const ITEM_SIZE = 22;
const DISCOVERY_TABLE = 0x6e74;
const MATE_ROSTER = 0x1d85;

async function originalSave(): Promise<Buffer> {
  return readFile(join(repoRoot, "raw/KOUKAI2.DAT"));
}

function raw(entry: {
  readonly dialogue: readonly { readonly rawIndex: number }[];
}): number[] {
  return entry.dialogue.map((line) => line.rawIndex);
}

function setInventory(save: Buffer, items: readonly number[]): void {
  save.fill(
    0xff,
    base + ITEM_INVENTORY,
    base + ITEM_INVENTORY + ITEM_INVENTORY_SIZE,
  );
  save.set(items, base + ITEM_INVENTORY);
}

// Giovanni Verrazano (cartographer record 0) lives at port 13.
async function cartographerSave(gold: number): Promise<Buffer> {
  const save = setGold(await originalSave(), 1, gold);
  save[base + 0x0a] = 13;
  save[base + CARTOGRAPHER_TABLE + 0x16] =
    save[base + CARTOGRAPHER_TABLE + 0x16]! | 0x10;
  // Point Map of Mask (80) at discovery 3 and Map of Table (81) at discovery 4.
  save[base + ITEM_TABLE + 80 * ITEM_SIZE + 0x14] = 3;
  save[base + ITEM_TABLE + 81 * ITEM_SIZE + 0x14] = 4;
  const lisbonArea = base + DISCOVERY_TABLE + 3 * 7;
  save.writeInt16LE(120, lisbonArea);
  save.writeInt16LE(358, lisbonArea + 2);
  const southernArea = base + DISCOVERY_TABLE + 4 * 7;
  save.writeInt16LE(700, southernArea);
  save.writeInt16LE(900, southernArea + 2);
  return save;
}

test("resolves cartographer Locate prompts, fees, and RNG-dependent coordinates", async () => {
  const data = await loadOrdinaryDialogueData();
  const save = await cartographerSave(30_000);
  setInventory(save, [80]);
  const locate = (path: string[], source = save) =>
    ordinaryBuildingEntry(source, 1, 0x07, true, [], [], data, [
      "locate",
      ...path,
    ]).command!;

  const prompt = locate([]);
  assert.equal(prompt.disposition, "shown");
  assert.deepEqual(
    prompt.dialogue.map((line) => line.combinedIndex),
    [785, 1419],
  );
  assert.deepEqual(prompt.menu, ["Yes", "No"]);
  assert.equal(locate(["no"]).disposition, "completed");
  assert.deepEqual(locate(["no"]).effects, [
    "return to the cartographer menu without charge",
  ]);

  const single = locate(["yes"]);
  assert.equal(single.disposition, "completed");
  assert.equal(single.confidence, "ambiguous");
  assert.deepEqual(
    single.dialogue.map((line) => line.combinedIndex),
    [785, 1419, 786, 783],
  );
  assert.equal(
    single.dialogue.at(-1)?.text,
    "I think this is a map of the area around\n[35|40]@N [5|10]@W .",
  );
  assert.equal(single.effects[0], "deduct 20000 gold");
  assert.match(single.notes[0] ?? "", /39° latitude and 9° longitude/);
  assert.match(single.uncertainties[0] ?? "", /random\(2\)/);

  const poor = locate(["yes"], setGold(save, 1, 20_000));
  assert.equal(poor.disposition, "blocked");
  assert.deepEqual(
    poor.dialogue.map((line) => line.combinedIndex),
    [785, 1419, 239],
  );

  const twoMaps = Buffer.from(save);
  setInventory(twoMaps, [81, 0xff, 80]);
  const chooser = locate(["yes"], twoMaps);
  assert.equal(chooser.disposition, "shown");
  assert.deepEqual(
    chooser.dialogue.map((line) => line.combinedIndex),
    [785, 1419, 335],
  );
  assert.deepEqual(chooser.menu, [
    "1: Map of Table",
    "2: Map of Mask",
    "Cancel",
  ]);
  const canceled = locate(["yes", "cancel"], twoMaps);
  assert.deepEqual(
    canceled.dialogue.map((line) => line.combinedIndex),
    [785, 1419, 335, 1421],
  );
  assert.ok(!canceled.effects.some((effect) => /deduct/.test(effect)));
  const southern = locate(["yes", "1"], twoMaps);
  assert.equal(
    southern.dialogue.at(-1)?.text,
    "I think this is a map of the area around\n[35|40]@S [85|90]@E .",
  );

  const oldMap = Buffer.from(save);
  setInventory(oldMap, [89]);
  // With only the Old Map the handler analyzes item 0xFF, which always
  // selects discovery 0.
  const oldMapOnly = locate(["yes"], oldMap);
  assert.equal(oldMapOnly.confidence, "ambiguous");
  assert.equal(oldMapOnly.effects[0], "deduct 20000 gold");
  assert.match(oldMapOnly.notes[0] ?? "", /item 0xFF/);
  assert.match(
    oldMapOnly.dialogue.at(-1)!.text,
    /\[\d+\|\d+\]@[NS] \[\d+\|\d+\]@[EW] \.$/,
  );

  const noMap = Buffer.from(save);
  setInventory(noMap, []);
  const disabled = ordinaryBuildingEntry(noMap, 1, 0x07, true, [], [], data, [
    "locate",
  ]);
  assert.equal(disabled.command?.disposition, "unavailable");
  assert.ok(disabled.notes.some((note) => /Locate is grayed out/.test(note)));
});

test("grays out cartographer and collector commands from contract state", async () => {
  const data = await loadOrdinaryDialogueData();
  const active = await cartographerSave(0);
  setInventory(active, []);
  const activeEntry = ordinaryBuildingEntry(
    active,
    1,
    0x07,
    true,
    [],
    [],
    data,
    ["contract"],
  );
  assert.equal(activeEntry.command?.disposition, "unavailable");
  assert.ok(
    activeEntry.notes.some((note) => /Contract is grayed out/.test(note)),
  );
  assert.equal(
    ordinaryBuildingEntry(active, 1, 0x07, true, [], [], data, ["report"])
      .command?.disposition,
    "blocked",
  );

  const inactive = Buffer.from(active);
  inactive[base + CARTOGRAPHER_TABLE + 0x16] =
    inactive[base + CARTOGRAPHER_TABLE + 0x16]! & ~0x10;
  inactive[base + SAILOR_TABLE + 0x28] =
    inactive[base + SAILOR_TABLE + 0x28]! | 0x08;
  const inactiveEntry = ordinaryBuildingEntry(
    inactive,
    1,
    0x07,
    true,
    [],
    [],
    data,
  );
  assert.deepEqual(raw(inactiveEntry), [493]);
  for (const command of ["report", "learn-skills", "locate"])
    assert.equal(
      ordinaryBuildingEntry(inactive, 1, 0x07, true, [], [], data, [command])
        .command?.disposition,
      "unavailable",
      command,
    );

  // Professor Mordes (collector record 4) lives at port 27.
  const collector = await originalSave();
  collector[base + 0x0a] = 27;
  assert.equal(
    ordinaryBuildingEntry(collector, 1, 0x07, true, [], [], data, ["rumor"])
      .command?.disposition,
    "unavailable",
  );
  collector[base + COLLECTOR_TABLE + 4 * 24 + 0x16] =
    collector[base + COLLECTOR_TABLE + 4 * 24 + 0x16]! | 0x10;
  assert.equal(
    ordinaryBuildingEntry(collector, 1, 0x07, true, [], [], data, ["contract"])
      .command?.disposition,
    "unavailable",
  );
});

test("substitutes honorifics into cartographer and collector greetings", async () => {
  const data = await loadOrdinaryDialogueData();
  const save = await cartographerSave(0);
  const cartographer = ordinaryBuildingEntry(save, 1, 0x07, true, [], [], data);
  assert.equal(cartographer.dialogue[0]?.combinedIndex, 494);
  assert.equal(
    cartographer.dialogue[0]?.text,
    "Oh, Sir Franco. I was waiting for you.",
  );
  assert.equal(cartographer.dialogue[0]?.speaker, "Giovanni Verrazano");

  const catalina = Buffer.from(save);
  catalina[1 + 13] = 1;
  assert.match(
    ordinaryBuildingEntry(catalina, 1, 0x07, true, [], [], data).dialogue[0]
      ?.text ?? "",
    /^Oh, Ms\. /,
  );

  const collector = await originalSave();
  collector[base + 0x0a] = 27;
  collector[base + COLLECTOR_TABLE + 4 * 24 + 0x16] =
    collector[base + COLLECTOR_TABLE + 4 * 24 + 0x16]! | 0x10;
  const greeting = ordinaryBuildingEntry(
    collector,
    1,
    0x07,
    true,
    [],
    [],
    data,
  );
  assert.equal(
    greeting.dialogue[0]?.text,
    "Oh, Sir Franco. I was waiting for you!",
  );
});

test("formats collector discovery articles and payment lines", async () => {
  const data = await loadOrdinaryDialogueData();
  const save = await originalSave();
  save[base + 0x0a] = 27;
  save[base + COLLECTOR_TABLE + 4 * 24 + 0x16] =
    save[base + COLLECTOR_TABLE + 4 * 24 + 0x16]! | 0x10;
  // Discovery 0 is on the article-free list; discovery 1 is not.
  for (const index of [0, 1]) {
    const record = base + DISCOVERY_TABLE + index * 7;
    save[record + 5] = index === 0 ? 20 : 60;
    save[record + 6] = 0x20;
  }
  const turnIn = (selector: string) =>
    ordinaryBuildingEntry(save, 1, 0x07, true, [], [], data, [
      "discovery",
      selector,
    ]).command!;
  const easy = turnIn("1");
  assert.deepEqual(
    easy.dialogue.map((line) => line.combinedIndex),
    [485, 486, 1081],
  );
  assert.equal(easy.dialogue[1]?.text, `${data.colonyNames[0]}?`);
  assert.equal(easy.dialogue[2]?.text, "Then here is 5000 gold pieces.");
  const hard = turnIn("2");
  assert.deepEqual(
    hard.dialogue.map((line) => line.combinedIndex),
    [485, 488, 1083],
  );
  assert.equal(
    hard.dialogue[1]?.text,
    `Great, you discovered the ${data.colonyNames[1]}!`,
  );

  const empty = await originalSave();
  empty[base + 0x0a] = 27;
  empty[base + COLLECTOR_TABLE + 4 * 24 + 0x16] =
    empty[base + COLLECTOR_TABLE + 4 * 24 + 0x16]! | 0x10;
  assert.deepEqual(
    ordinaryBuildingEntry(empty, 1, 0x07, true, [], [], data, [
      "discovery",
    ]).command?.dialogue.map((line) => line.combinedIndex),
    [484, 1078],
  );
});

test("reads the 30-record waitress table from Carlotta onward", async () => {
  const data = await loadOrdinaryDialogueData();
  const save = await originalSave();
  save[base + 0x0a] = 0;
  const lisbon = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data);
  assert.equal(lisbon.dialogue[0]?.combinedIndex, 17);
  assert.equal(lisbon.dialogue[0]?.speaker, "Carlotta");
  assert.match(
    lisbon.dialogue[0]?.text ?? "",
    /^Hello Joao, would you like some /,
  );
  const waitress = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "waitress",
  ]);
  assert.match(waitress.command?.dialogue[0]?.text ?? "", /^Lucia /);

  // Hadi (Cairo) lacks flag 0x08, so the Waitress command is grayed out.
  const cairo = Buffer.from(save);
  cairo[base + 0x0a] = cairo[base + 0x1d12 + 0x0b]!;
  const cairoEntry = ordinaryBuildingEntry(cairo, 1, 0x01, true, [], [], data, [
    "waitress",
  ]);
  assert.equal(cairoEntry.dialogue[0]?.combinedIndex, 18);
  assert.equal(cairoEntry.command?.disposition, "unavailable");

  const regular = Buffer.from(save);
  regular[base + SAILOR_TABLE + 0x29] =
    regular[base + SAILOR_TABLE + 0x29]! | 0x10;
  const regularEntry = ordinaryBuildingEntry(
    regular,
    1,
    0x01,
    true,
    [],
    [],
    data,
  );
  assert.deepEqual(raw(regularEntry), [18, 308]);
  assert.equal(regularEntry.dialogue[1]?.speaker, "Lucia");
});

test("grays out Used Ship when the cached stock is empty", async () => {
  const data = await loadOrdinaryDialogueData();
  const save = await originalSave();
  save[base + 0x0a] = 0;
  save[base + 0x6e61] = 0;
  const stocked = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "used-ship",
  ]);
  assert.notEqual(stocked.command?.disposition, "unavailable");
  save.fill(0xff, base + 0x6e5c, base + 0x6e61);
  const empty = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    "used-ship",
  ]);
  assert.equal(empty.command?.disposition, "unavailable");
  assert.ok(empty.notes.some((note) => /Used Ship is grayed out/.test(note)));
  assert.deepEqual(empty.menu, [
    "New Ship",
    "Used Ship",
    "Repair",
    "Sell",
    "Remodel",
    "Invest",
  ]);
});

test("names rulers and crew spokesmen", async () => {
  const data = await loadOrdinaryDialogueData();
  let save = await originalSave();
  save[base + 0x0a] = 0;
  save = setFame(save, 1, 0, "trade", 0, 2_000);
  const sphere = ordinaryBuildingEntry(save, 1, 0x05, true, [], [], data, [
    "meet-ruler",
    "sphere-of-influence",
  ]).command!;
  assert.equal(sphere.dialogue[0]?.combinedIndex, 1073);
  assert.equal(sphere.dialogue[0]?.speaker, "Manuel I");
  assert.ok([1048, 453].includes(sphere.dialogue[1]?.combinedIndex ?? -1));

  const alone = Buffer.from(save);
  for (let port = 1; port < 100; port++) {
    const controller = alone.subarray(base + 0x4f40 + port * 20 + 0x13);
    if ((controller[0]! & 7) === 0) controller[0] = (controller[0]! & ~7) | 5;
  }
  assert.deepEqual(
    ordinaryBuildingEntry(alone, 1, 0x05, true, [], [], data, [
      "meet-ruler",
      "sphere-of-influence",
    ]).command?.dialogue.map((line) => line.combinedIndex),
    [1073, 1048],
  );

  // Rocco (69) is a Navigator, Enrico (70) the Bookkeeper, Domingo (71) the
  // First Mate; an empty roster has no mate portrait.
  const crew = setGold(await originalSave(), 1, 0);
  crew[base + 0x0a] = 0;
  crew.set([69, 70, 71], base + MATE_ROSTER);
  crew[base + SAILOR_TABLE + 69 * SAILOR_SIZE + 0x26] = 2;
  crew[base + SAILOR_TABLE + 70 * SAILOR_SIZE + 0x26] = 4;
  crew[base + SAILOR_TABLE + 71 * SAILOR_SIZE + 0x26] = 3;
  const deposit = ordinaryBuildingEntry(crew, 1, 0x08, true, [], [], data, [
    "deposit",
  ]).command!;
  assert.equal(deposit.dialogue[0]?.combinedIndex, 100);
  assert.equal(deposit.dialogue[0]?.speaker, "Enrico Malione");
  const donate = ordinaryBuildingEntry(crew, 1, 0x0a, true, [], [], data, [
    "donate",
  ]).command!;
  assert.equal(donate.dialogue[0]?.speaker, "Enrico Malione");
  crew[base + SAILOR_TABLE + 70 * SAILOR_SIZE + 0x26] = 6;
  assert.equal(
    ordinaryBuildingEntry(crew, 1, 0x0a, true, [], [], data, ["donate"]).command
      ?.dialogue[0]?.speaker,
    "Domingo Manana",
  );
  // Without any preferred duty, the last nonempty roster entry speaks.
  for (const id of [69, 70, 71])
    crew[base + SAILOR_TABLE + id * SAILOR_SIZE + 0x26] = 0;
  assert.equal(
    ordinaryBuildingEntry(crew, 1, 0x0a, true, [], [], data, ["donate"]).command
      ?.dialogue[0]?.speaker,
    "Domingo Manana",
  );
  crew.fill(0xff, base + MATE_ROSTER, base + MATE_ROSTER + 30);
  assert.equal(
    ordinaryBuildingEntry(crew, 1, 0x0a, true, [], [], data, ["donate"]).command
      ?.dialogue[0]?.speaker,
    "crew (no mate portrait)",
  );
});

test("fills Pub, Market, Guild, Item Shop, and Bank substitutions", async () => {
  const data = await loadOrdinaryDialogueData();
  let save = await originalSave();
  save[base + 0x0a] = 0;
  save = setGold(save, 1, 1_000);
  save = setFame(save, 1, 0, "piracy", 0, 2_000);
  save = setFame(save, 1, 0, "adventure", 0, 2_000);
  const treat = ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
    "treat",
    "1",
  ]).command!;
  assert.equal(treat.dialogue[1]?.combinedIndex, 132);
  assert.equal(
    treat.dialogue[1]?.text,
    "What? You are the famous Pirate Joao Franco?",
  );

  const country = ordinaryBuildingEntry(save, 1, 0x06, true, [], [], data, [
    "country-info",
    "Spain",
    "yes",
  ]).command!;
  assert.deepEqual(
    country.dialogue.map((line) => line.combinedIndex),
    [162, 86, 1367, 89],
  );
  assert.equal(
    country.dialogue[2]?.text,
    "It seems Spain is cracking down on pirates.",
  );

  const shop = Buffer.from(save);
  setInventory(shop, [80]);
  shop[base + ITEM_TABLE + 80 * ITEM_SIZE + 0x14] = 3;
  const refused = ordinaryBuildingEntry(shop, 1, 0x09, true, [], [], data, [
    "sell",
    "1",
  ]).command!;
  assert.equal(refused.disposition, "blocked");
  assert.equal(refused.dialogue.at(-1)?.combinedIndex, 929);
  assert.match(refused.notes[0] ?? "", /offer is 0 gold/);

  const bank = setGold(save, 1, 5_000);
  bank.writeInt16LE(0, base + 0x60e);
  bank[base + 0x610] = 0;
  const deposit = ordinaryBuildingEntry(bank, 1, 0x08, true, [], [], data, [
    "deposit",
    "2500",
  ]).command!;
  assert.deepEqual(raw(deposit), [104, 105, 106, 103]);

  const market = Buffer.from(save);
  const officer = base + SAILOR_TABLE;
  const fleetShip = base + 0x1de0 + market[officer + 0x24]! * 0x85 + 0x2b;
  const instance = base + 0x47fc;
  const supply = base + 0x423e;
  market.set([20, 0, 80, 100, 50, 50, 0, 0, 0x10], fleetShip);
  market.fill(0, instance, instance + 0x18);
  market.writeUInt16LE(200, instance + 0x16);
  market.fill(0, supply, supply + 0x1e);
  market.fill(0xff, supply + 0x16, supply + 0x1b);
  market[supply + 0x1b] = 0;
  const metadata = base + 0x5966;
  market.writeUInt16LE(10_000, metadata + 2);
  market[metadata + 0x1c] = 40;
  market[metadata + 0x1d] = 0;
  market.fill(50, metadata + 0x10, metadata + 0x1a);
  const goods = ordinaryBuildingEntry(market, 1, 0x00, true, [], [], data, [
    "buy-goods",
    "Glass Beads",
  ]).command!;
  assert.ok(
    goods.dialogue.some(
      (line) => line.text === "Glass Beads are the local specialty.",
    ),
  );
});

test("splits a low Shipyard offer into ejection and refusal outcomes", async () => {
  const data = await loadOrdinaryDialogueData();
  let save = await originalSave();
  save[base + 0x0a] = 0;
  save = setGold(save, 1, 100_000);
  const path = ["new-ship", "1", "Beech", "yes", "no", "1"];
  const pending = ordinaryBuildingEntry(
    save,
    1,
    0x02,
    true,
    [],
    [],
    data,
    path,
  ).command!;
  assert.equal(pending.disposition, "shown");
  assert.deepEqual(pending.menu, ["Ejected", "Refused"]);
  assert.match(pending.effects[0] ?? "", /^Ejected \(1\/5\): raw 197/);
  assert.match(pending.effects[1] ?? "", /^Refused \(4\/5\): raw 198/);
  const ejected = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    ...path,
    "ejected",
  ]).command!;
  assert.equal(ejected.dialogue.at(-1)?.combinedIndex, 197);
  assert.ok(ejected.effects.some((effect) => /ejection flag/.test(effect)));
  const refused = ordinaryBuildingEntry(save, 1, 0x02, true, [], [], data, [
    ...path,
    "refused",
  ]).command!;
  assert.equal(refused.dialogue.at(-1)?.combinedIndex, 198);
  assert.ok(refused.effects.includes("return to the Shipyard menu"));
});

test("refuses Market purchases only below half the price", async () => {
  let save = await originalSave();
  const protagonistId = save[14]!;
  const officer = base + SAILOR_TABLE + protagonistId * SAILOR_SIZE;
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
  save.writeUInt16LE(200, instance + 0x16);
  save.fill(0, supply, supply + 0x1e);
  save.fill(0xff, supply + 0x16, supply + 0x1b);
  const data = await loadOrdinaryDialogueData();
  const buy = (gold: number) => {
    save = setGold(save, 1, gold);
    return ordinaryBuildingEntry(save, 1, 0x00, true, [], [], data, [
      "buy-goods",
      "1",
      "1",
    ]).command!;
  };

  assert.deepEqual(raw(buy(0)), [28]);
  const price = Number(/(\d+) gold/.exec(buy(100_000).dialogue[2]!.text)![1]);
  // At half the price the quantity input still opens, with a maximum of 0.
  const half = buy(Math.floor(price / 2));
  assert.equal(half.disposition, "shown");
  assert.deepEqual(half.menu, ["Amount: 0–0"]);
  assert.equal(raw(buy(Math.floor(price / 2) - 1)).at(-1), 22);
});

test("gives Guild hints for active shared missions", async () => {
  const save = await originalSave();
  const data = await loadOrdinaryDialogueData();
  const shared = (index: number) => base + 0xc4 + index * 2;
  save[base + 0x0a] = 0;
  save[base + 0xba] = 11;
  // A royal special search for item 90 whose hint port is Venice (13).
  save.writeUInt16LE(11, shared(6));
  save.writeUInt16LE(13, shared(16));
  save.writeUInt16LE(0xff, shared(17));
  save.writeUInt16LE(90, shared(18));
  setInventory(save, []);
  const hint = ordinaryBuildingEntry(save, 1, 0x06, true, [], [], data, [
    "job-assignment",
  ]).command!;
  assert.deepEqual(raw(hint), [598, 600]);
  // Matches the in-game line "You'll find Venice around 45°N 13°E.".
  assert.equal(hint.dialogue[1]!.text, "You'll find Venice around\n45@N 13@E.");

  // An ordinary Guild job compares the current port with shared variable 16.
  save.writeUInt16LE(3, shared(6));
  save.writeUInt16LE(0, shared(16));
  const job = ordinaryBuildingEntry(save, 1, 0x06, true, [], [], data, [
    "job-assignment",
  ]).command!;
  assert.deepEqual(raw(job), [931]);
});

test("hands the mission patron to the map sale or debt collection", async () => {
  let save = await originalSave();
  const data = await loadOrdinaryDialogueData();
  const shared = (index: number) => base + 0xc4 + index * 2;
  save[base + 0x0a] = 0;
  // Sailor 83 waits as an unemployed patron in the Lisbon Pub.
  const sailor = base + SAILOR_TABLE + 83 * SAILOR_SIZE;
  save[sailor + 0x24] = 0xff;
  save[sailor + 0x25] = 0;
  save[sailor + 0x29] = save[sailor + 0x29]! | 0x60;
  save[base + 0xba] = 11;
  save.writeUInt16LE(11, shared(6));
  save.writeUInt16LE(83, shared(17));
  save.writeUInt16LE(95, shared(18));
  setInventory(save, []);
  save = setGold(save, 1, 5_000);
  const meet = (...path: string[]) =>
    ordinaryBuildingEntry(save, 1, 0x01, true, [], [], data, [
      "meet",
      "fernan pinto",
      ...path,
    ]).command!;

  // Gossip and Hire both lead to the map offer.
  for (const action of ["gossip", "hire"]) {
    const offer = meet(action);
    assert.deepEqual(raw(offer).slice(-2), [604, 605]);
    assert.deepEqual(offer.menu, ["Yes", "No"]);
  }
  const bought = meet("gossip", "yes");
  assert.equal(raw(bought).at(-1), 606);
  assert.ok(bought.effects.includes("deduct 1000 gold"));
  assert.ok(bought.effects[0]!.startsWith("put Map of Pot (item 85)"));

  setInventory(save, [85]);
  assert.equal(raw(meet("treat")).at(-1), 879);

  // During Collect Debt the same patron is the debtor.
  save.writeUInt16LE(5, shared(6));
  save.writeUInt16LE(2, shared(19));
  const debtor = meet("hire");
  assert.equal(raw(debtor).at(-1), 608);
  assert.equal(debtor.confidence, "ambiguous");
});
