import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARTOGRAPHER_RECORD_SIZE,
  CARTOGRAPHER_TABLE,
  CURRENT_PORT,
  FILE_SIZE,
  ITEM_INVENTORY,
  inspectCartographers,
  inspectFame,
  inspectGold,
  inspectItems,
  inspectPort,
  inspectProtagonist,
  inspectRank,
  inspectProtagonistStats,
  inspectSlot,
  setClock,
  setCrusaderEquipment,
  setFame,
  setGold,
  setPort,
  setPlayerShipToTekkousen,
  setProtagonistStats,
  setRank,
  slotOffset,
  validate,
} from "./format.js";

const baseline = readFileSync(new URL("../raw/KOUKAI2.DAT", import.meta.url));

function saveInLisbon(): Buffer {
  const save = Buffer.from(baseline);
  save[slotOffset(1) + CURRENT_PORT] = 0;
  save[13] = 0;
  return save;
}

test("inspects the supported save format", () => {
  assert.equal(baseline.length, FILE_SIZE);
  assert.doesNotThrow(() => validate(baseline));
  assert.throws(() => validate(Buffer.alloc(10)), /Unsupported format/);

  const save = saveInLisbon();
  assert.deepEqual(inspectProtagonist(save, 1), {
    id: 0,
    name: "Joao Franco",
  });
  assert.deepEqual(inspectPort(save, 1, 0), { id: 0, name: "Lisbon" });
  assert.deepEqual(inspectFame(save, 1, 0), {
    character: 0,
    name: "Joao Franco",
    trade: 0,
    piracy: 0,
    adventure: 0,
  });
  assert.equal(inspectSlot(save, 1).portName, "Lisbon");
  assert.equal(inspectSlot(save, 1).rank, 0);
  assert.equal(inspectRank(save, 1, 0), 0);
});

test("inspects cartographer contracts and chart-report rewards", () => {
  const save = saveInLisbon();
  assert.deepEqual(inspectCartographers(save, 1), [
    {
      index: 0,
      name: "Giovanni Verrazano",
      portId: 13,
      flags: 0x09,
      activeContract: false,
      rewardModifier: 1,
      goldPerChartCell: 80,
    },
    {
      index: 1,
      name: "Gerard de Jode",
      portId: 32,
      flags: 0x09,
      activeContract: false,
      rewardModifier: 1,
      goldPerChartCell: 80,
    },
    {
      index: 2,
      name: "Diogo Ribeiro",
      portId: 3,
      flags: 0x09,
      activeContract: false,
      rewardModifier: 1,
      goldPerChartCell: 80,
    },
    {
      index: 3,
      name: "Olives",
      portId: 12,
      flags: 0x09,
      activeContract: false,
      rewardModifier: 1,
      goldPerChartCell: 80,
    },
    {
      index: 4,
      name: "Mercator",
      portId: 33,
      flags: 0x09,
      activeContract: false,
      rewardModifier: 1,
      goldPerChartCell: 80,
    },
  ]);

  const withMercatorContract = Buffer.from(save);
  const mercatorFlags =
    slotOffset(1) + CARTOGRAPHER_TABLE + 4 * CARTOGRAPHER_RECORD_SIZE + 0x16;
  withMercatorContract[mercatorFlags] =
    withMercatorContract[mercatorFlags]! | 0x10;
  assert.equal(
    inspectCartographers(withMercatorContract, 1)[4]!.activeContract,
    true,
  );
});

test("changes rank while checking the expected current rank", () => {
  const save = saveInLisbon();
  const edited = setRank(save, 1, 0, 0, 9);

  assert.equal(inspectRank(edited, 1, 0), 9);
  assert.equal(inspectRank(save, 1, 0), 0);
  assert.throws(() => setRank(save, 1, 0, 1, 3), /Expected 1/);
  assert.throws(() => setRank(save, 1, 0, 0, 10));
});

test("changes port without mutating the input", () => {
  const save = saveInLisbon();
  const snapshot = Buffer.from(save);
  const edited = setPort(save, 1, 0, 1);

  assert.deepEqual(save, snapshot);
  assert.equal(inspectSlot(edited, 1).portName, "Seville");
  assert.equal(edited[13], 1);
  assert.throws(() => setPort(save, 1, 1, 2), /Expected 1/);
  assert.throws(() => setPort(baseline, 1, 255, 1));
});

test("changes the calendar and rejects invalid dates", () => {
  const save = saveInLisbon();
  const edited = setClock(save, 1, "1523-01-01", "09:20");
  const inspected = inspectSlot(edited, 1);

  assert.equal(inspected.label, "Jan/01/1523");
  assert.equal(inspected.time, "09:20");
  assert.equal(inspected.portName, "Lisbon");
  assert.throws(() => setClock(save, 1, "1522-02-30", "00:00"));
  assert.throws(() => setClock(save, 1, "1522-05-17", "08:01"));
});

test("edits only the selected protagonist fame record", () => {
  const save = saveInLisbon();
  const edited = setFame(save, 1, 0, "trade", 0, 12_345);

  assert.equal(inspectFame(edited, 1, 0).trade, 12_345);
  assert.equal(inspectFame(edited, 1, 1).trade, 0);
  assert.throws(() => setFame(edited, 1, 0, "trade", 0, 1));
  assert.throws(() => setFame(save, 1, 0, "invalid", 0, 1));
  assert.throws(() => setFame(save, 1, 0, "trade", 0, 65_536));
});

test("edits each Fame category", () => {
  const save = saveInLisbon();
  const values = { trade: 12_345, piracy: 23_456, adventure: 34_567 };
  let edited = save;
  for (const [category, value] of Object.entries(values)) {
    const current = inspectFame(edited, 1, 0);
    edited = setFame(
      edited,
      1,
      0,
      category,
      current[category as keyof typeof values],
      value,
    );
  }
  assert.deepEqual(inspectFame(edited, 1, 0), {
    character: 0,
    name: "Joao Franco",
    ...values,
  });
});

test("applies the fixed equipment and gold changes", () => {
  const save = saveInLisbon();
  save[slotOffset(1) + ITEM_INVENTORY + 2] = 0x1d;
  const equipped = setCrusaderEquipment(save, 1);
  const edited = setGold(equipped, 1, 1_000_000);

  assert.deepEqual(inspectItems(edited, 1), [
    0x4c,
    0x4b,
    0x1d,
    ...Array.from({ length: 17 }, () => 0xff),
  ]);
  assert.equal(inspectGold(edited, 1), 1_000_000);
  assert.equal(inspectGold(save, 1), 0);
  assert.throws(() => setGold(save, 1, 0x1000000));
});

test("sets protagonist stats and levels without changing the source", () => {
  const save = saveInLisbon();
  const before = inspectProtagonistStats(save, 1);
  const edited = setProtagonistStats(save, 1, 100);

  assert.deepEqual(inspectProtagonistStats(edited, 1), {
    leadership: 100,
    seamanship: 100,
    knowledge: 100,
    intuition: 100,
    courage: 100,
    swordsmanship: 100,
    charm: 100,
    luck: 100,
  });
  assert.deepEqual(inspectProtagonistStats(save, 1), before);

  // Levels have no public inspector, so verify their deliberate file fields.
  const sailor = slotOffset(1) + 0x612;
  assert.equal(edited[sailor + 0x1c], 100);
  assert.equal(edited[sailor + 0x1d], 100);
  assert.equal(save[sailor + 0x1c], 1);
  assert.equal(save[sailor + 0x1d], 1);
});

test("converts the current player's first ship to a Tekkousen", () => {
  const save = saveInLisbon();
  const protagonist = inspectProtagonist(save, 1);
  const officer = slotOffset(1) + 0x612 + protagonist.id * 0x2a;
  const fleetId = save[officer + 0x24]!;
  const fleet = 0x1e77 + fleetId * 0x85;
  const shipSlot = fleet + 0x2b;
  // The raw baseline has an empty player fleet. Add one minimal source ship
  // to the cloned fixture so this test exercises the conversion operation.
  save.set([10, 0, 27, 27, 90, 75, 0, 0, 16], shipSlot);
  const instance = 0x4893 + save[shipSlot + 7]! * 0x18;
  save[instance + 0x11] = 5;
  const edited = setPlayerShipToTekkousen(save, 1);

  // Ship model and slot values are not currently exposed by an inspector.
  assert.equal(edited.readUInt16LE(shipSlot), 300);
  assert.deepEqual(
    [...edited.subarray(shipSlot + 2, shipSlot + 7)],
    [100, 100, 80, 85, 0],
  );
  assert.equal(edited[instance + 0x11], 22);
  assert.equal(edited[instance + 0x13], 0);
  assert.equal(edited.readUInt16LE(instance + 0x14), 300);
  assert.equal(edited.readUInt16LE(instance + 0x16), 800);
  assert.equal(edited.readUInt16LE(0x42d5), 3000);
  assert.equal(edited.readUInt16LE(0x42d7), 5000);
  assert.equal(save[instance + 0x11], 5);
});
