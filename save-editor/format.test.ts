import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CURRENT_PORT,
  FILE_SIZE,
  inspectFame,
  inspectGold,
  inspectItems,
  inspectPort,
  inspectProtagonist,
  inspectSlot,
  setClock,
  setCrusaderEquipment,
  setFame,
  setGold,
  setPort,
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

test("applies the fixed equipment and gold changes", () => {
  const save = saveInLisbon();
  const equipped = setCrusaderEquipment(save, 1);
  const edited = setGold(equipped, 1, 1_000_000);

  assert.deepEqual(inspectItems(edited, 1), [
    0x4c,
    0x4b,
    ...Array.from({ length: 18 }, () => 0xff),
  ]);
  assert.equal(inspectGold(edited, 1), 1_000_000);
  assert.equal(inspectGold(save, 1), 0);
  assert.throws(() => setGold(save, 1, 0x1000000));
});
