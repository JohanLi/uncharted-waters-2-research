import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { setFame, slotOffset } from "../../save-editor/format.js";
import { repoRoot } from "../../scripts/shared.js";
import {
  inspectSharedScenario,
  isBuildingOpen,
  loadProtagonistScenario,
  loadSharedScenario,
  parseQueryAction,
  queryScenario,
} from "./query.js";

async function originalSave(): Promise<Buffer> {
  return readFile(join(repoRoot, "raw/KOUKAI2.DAT"));
}

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
