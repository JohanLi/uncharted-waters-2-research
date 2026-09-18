import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { repoRoot } from "../../scripts/shared.js";
import { analyzeScenarioVmExecutable } from "./main-exe.js";
import { disassembleScenario } from "./snr.js";

async function readScenario(id: number) {
  return disassembleScenario(
    id,
    await readFile(join(repoRoot, `raw/SNR${id}.DAT`)),
    await readFile(join(repoRoot, `raw/SNR${id}.MES`)),
  );
}

test("MAIN.EXE exposes the scenario loader and four-family VM dispatch", async () => {
  const analysis = analyzeScenarioVmExecutable(
    await readFile(join(repoRoot, "raw/MAIN.EXE")),
  );
  assert.equal(
    analysis.sha256,
    "6a02745af59b9a95918b42c2e5f8fe249a05f2d48bb33a6d54599536cb1a3eeb",
  );
  assert.deepEqual(
    analysis.dispatcher.familyHandlers.map((family) => [
      family.range,
      family.handlerOffset,
    ]),
    [
      ["0x00-0x3F", 0x3873e],
      ["0x40-0x7F", 0x3893e],
      ["0x80-0xBF", 0x38a78],
      ["0xC0-0xFF", 0x38c07],
    ],
  );
  const action = (opcode: number) =>
    analysis.dispatcher.actionHandlers.find(
      (candidate) => candidate.opcode === opcode,
    );
  assert.deepEqual(
    [0xc0, 0xc8, 0xf2, 0xfe, 0xc1].map((opcode) => [
      action(opcode)?.handlerOffset,
      action(opcode)?.implemented,
    ]),
    [
      [0x38cbc, true],
      [0x38cec, true],
      [0x38cb7, true],
      [0x38f36, true],
      [0x38cab, false],
    ],
  );
  assert.deepEqual(analysis.routeMatching, {
    sharedMatcherOffset: 0x39085,
    sharedDispatcherOffset: 0x39129,
    protagonistMatcherOffset: 0x391c6,
    protagonistDispatcherOffset: 0x3927c,
    atSeaDispatchOffset: 0x2052f,
    atSeaSelector: "0xA0",
    atSeaQualifierSource: "DS:0x2BAA",
    atSeaQualifierSlot1SaveOffset: 0x1e19,
    anyRegularPortSelector: "0xA3",
    protagonistRegularPortCount: 100,
    sharedPortCount: 130,
    navalBattle: {
      beforeSelector: "0xA1",
      afterSelector: "0xA2",
      protagonistQualifierSource: "DS:0x0EDA",
      sharedQualifierSource: "DS:0x0F64",
      qualifierMeaning: "opposing-captain-sailor-id",
      currentProtagonistIdSource: "DS:0x1439",
      opponentSelectionOffset: 0x163f2,
      protagonistBeforeDispatchOffset: 0x150e5,
      sharedBeforeDispatchOffset: 0x15107,
      sharedAfterDispatchOffset: 0x16191,
      protagonistAfterDispatchOffset: 0x1619c,
    },
  });
  assert.deepEqual(analysis.systemValues, [
    {
      id: 5,
      handlerOffset: 0x38851,
      source: "DS:0x0E32",
      meaning: "current-port-id",
    },
    {
      id: 7,
      handlerOffset: 0x3885b,
      source: "DS:0x0737",
      meaning: "time-of-day-20-minute-ticks",
    },
  ]);
});

test("disassembles João's building dialogue and one-shot state writes", async () => {
  const scenario = await readScenario(1);
  assert.equal(scenario.messages.length, 1189);
  assert.equal(scenario.sections.length, 6);

  const opening = scenario.sections[0]!;
  assert.deepEqual(
    opening.routes.map((route) => [
      route.key,
      route.knownLocation ?? route.knownEvent,
      route.destinationOffset,
    ]),
    [
      [0x0007, "special-building", 0x005e],
      [0x0001, "pub", 0x02cc],
      [0x0005, "palace", 0x0434],
      [0x000a, "church", 0x044a],
      [0x0002, "shipyard", 0x05c7],
      [0x0003, "harbor", 0x060c],
      [0x0000, "market", 0x07b1],
      [0x0009, "item-shop", 0x07e4],
      [0x00ff, "shared-bank-lodge-guild", 0x082f],
      [0xa001, "at-sea-day-1", 0x08a2],
    ],
  );

  const dayOneRoute = opening.routes.at(-1)!;
  assert.deepEqual(
    [dayOneRoute.selector, dayOneRoute.qualifier, dayOneRoute.knownSelector],
    [0xa0, 1, "at-sea-day-counter"],
  );
  assert.deepEqual(
    opening.instructions
      .filter(
        (instruction) =>
          instruction.offset === 0x08a2 || instruction.offset === 0x08a3,
      )
      .map((instruction) => [instruction.offset, instruction.mnemonic]),
    [
      [0x08a2, "advance-subsection-on-return"],
      [0x08a3, "stop"],
    ],
  );
  const dayThreeRoute = opening.entryRouteTables
    .find((table) => table.offset === 0x08a4)!
    .routes.find((route) => route.key === 0xa003)!;
  assert.deepEqual(
    [
      dayThreeRoute.selector,
      dayThreeRoute.qualifier,
      dayThreeRoute.knownSelector,
      dayThreeRoute.knownEvent,
      dayThreeRoute.destinationOffset,
    ],
    [0xa0, 3, "at-sea-day-counter", "at-sea-day-3", 0x08b0],
  );

  const lines = opening.dialogueRuns.flatMap((run) => run.lines);
  assert.deepEqual(
    [23, 2, 63].map((messageId) => {
      const line = lines.find((candidate) => candidate.messageId === messageId);
      return [line?.offset, line?.characterId, line?.position];
    }),
    [
      [352, 1, 2],
      [130, 20, 1],
      [737, 98, 1],
    ],
  );
  assert.deepEqual(
    [0, 1, 4].map((flag) =>
      opening.booleanStateWrites.find((write) => write.flag === flag),
    ),
    [
      { offset: 708, flag: 0, value: 1, rawHex: "2c0001" },
      { offset: 291, flag: 1, value: 1, rawHex: "2c0101" },
      { offset: 803, flag: 4, value: 1, rawHex: "2c0401" },
    ],
  );
  assert.deepEqual(opening.musicCueCandidates[0], {
    offset: 0x0306,
    trackId: 4,
    knownTrack: "flute-theme",
    rawHex: "ca04",
  });
  assert.deepEqual(opening.sceneBreakCandidates[0], {
    offset: 0x0305,
    rawHex: "c4",
  });

  const princeKidnapping = scenario.sections[1]!;
  const anyPortHarbor = princeKidnapping.routes.find(
    (route) => route.key === 0xa303,
  )!;
  assert.deepEqual(
    [
      anyPortHarbor.knownSelector,
      anyPortHarbor.knownLocation,
      anyPortHarbor.qualifier,
    ],
    ["any-regular-port", "harbor", 3],
  );
  assert.deepEqual(
    [0x0c77, 0x0cd0, 0x0d2d, 0x0d39, 0x1009, 0x10a2].map((offset) =>
      princeKidnapping.musicCueCandidates.find((cue) => cue.offset === offset),
    ),
    [
      {
        offset: 0x0c77,
        trackId: 16,
        knownTrack: "battle-theme",
        rawHex: "ca10",
      },
      {
        offset: 0x0cd0,
        trackId: 5,
        knownTrack: "catalina-theme",
        rawHex: "ca05",
      },
      {
        offset: 0x0d2d,
        trackId: 4,
        knownTrack: "flute-theme",
        rawHex: "ca04",
      },
      {
        offset: 0x0d39,
        trackId: 16,
        knownTrack: "battle-theme",
        rawHex: "ca10",
      },
      {
        offset: 0x1009,
        trackId: 20,
        knownTrack: "game-over-theme",
        rawHex: "ca14",
      },
      {
        offset: 0x10a2,
        trackId: 10,
        knownTrack: "port-theme",
        rawHex: "ca0a",
      },
    ],
  );
  assert.deepEqual(
    princeKidnapping.duelStartCandidates.map((candidate) => candidate.offset),
    [0x0ca6, 0x0fff],
  );
  assert.deepEqual(
    princeKidnapping.eventArtCandidates.find(
      (candidate) => candidate.offset === 0x0d3b,
    ),
    {
      offset: 0x0d3b,
      commandOffset: 0x0d3d,
      resourceFile: "EVENT1.DAT",
      eventImageIndex: 0,
      x: 112,
      y: 24,
      extractedAsset: "event1-00-192x144.png",
      rawHex: "c003cb0070001800",
    },
  );

  const eventArtCalls = (
    await Promise.all([1, 2, 3, 4, 5, 6].map(readScenario))
  )
    .flatMap((candidate) => candidate.sections)
    .flatMap((section) => section.eventArtCandidates);
  assert.equal(eventArtCalls.length, 39);
  assert.deepEqual(
    [...new Set(eventArtCalls.map(({ x, y }) => `${x},${y}`))],
    ["112,24"],
  );

  const navalBattleRoutes = scenario.sections[2]!.entryRouteTables.flatMap(
    (table) => table.routes,
  ).filter((route) => route.key === 0xa101 || route.key === 0xa201);
  assert.deepEqual(
    navalBattleRoutes.map((route) => [
      route.key,
      route.knownSelector,
      route.knownEvent,
      route.opposingCaptainId,
      route.knownOpposingCaptain,
    ]),
    [
      [
        0xa101,
        "before-naval-battle",
        "before-naval-battle",
        1,
        "Catalina Erantzo",
      ],
      [
        0xa201,
        "after-naval-battle",
        "after-naval-battle",
        1,
        "Catalina Erantzo",
      ],
    ],
  );

  const antonioRoute = (
    await readScenario(2)
  ).sections[5]!.entryRouteTables.flatMap((table) => table.routes).find(
    (route) => route.key === 0xa13c,
  )!;
  assert.deepEqual(
    [antonioRoute.opposingCaptainId, antonioRoute.knownOpposingCaptain],
    [60, "Antonio Khan"],
  );
});

test("sequential VM decoding follows table-relative control flow", async () => {
  const scenarios = await Promise.all(
    Array.from({ length: 7 }, (_, id) => readScenario(id)),
  );

  for (const scenario of scenarios)
    for (const section of scenario.sections) {
      assert.equal(
        section.instructions.some(
          (instruction) => instruction.kind === "invalid",
        ),
        false,
        `scenario ${scenario.scenarioId}, section ${section.id}`,
      );
      const instructionOffsets = new Set(
        section.instructions.map((instruction) => instruction.offset),
      );
      for (const line of section.dialogueRuns.flatMap((run) => run.lines))
        assert.equal(
          instructionOffsets.has(line.offset),
          true,
          `unreachable dialogue at ${line.offset.toString(16)}`,
        );
    }

  const opening = scenarios[1]!.sections[0]!;
  assert.deepEqual(
    opening.instructions
      .filter(
        (instruction) =>
          instruction.offset === 0x007a || instruction.offset === 0x007d,
      )
      .map((instruction) => [
        instruction.offset,
        instruction.mnemonic,
        instruction.rawHex,
        instruction.branchDestinationOffset,
      ]),
    [
      [0x007a, "read-time-of-day", "0f0107", undefined],
      [0x007d, "jump-if-less-than", "8e014200f7", 0x0129],
    ],
  );

  const joaoAfterTrial = scenarios[1]!.sections[1]!.dialogueRuns.flatMap(
    (run) => run.lines,
  ).find((line) => line.messageId === 310);
  assert.deepEqual(joaoAfterTrial, {
    offset: 0x0e23,
    position: 1,
    characterId: 19,
    messageId: 310,
    body: "Hmm... I wonder. $n, what do you want to do? Are you going to quit sea travel?",
    presentation: "choice-prompt",
    choiceFlag: 16,
    rawHex: "c001cc0012c80135e910",
  });
  const sharedCourierLines = scenarios[0]!.sections[7]!.dialogueRuns.flatMap(
    (run) => run.lines,
  );
  assert.deepEqual(
    [155, 174].map((messageId) => {
      const line = sharedCourierLines.find(
        (candidate) => candidate.messageId === messageId,
      );
      return [
        line?.offset,
        line?.position,
        line?.characterId,
        line?.characterVariable,
        line?.rawHex,
      ];
    }),
    [
      [0x19f7, 1, undefined, 50, "c001cd32c8009ac7"],
      [0x1c49, 1, undefined, 51, "c001cd33c800adc7"],
    ],
  );
  assert.deepEqual(
    opening.instructions
      .filter((instruction) => instruction.offset >= 0x02e1)
      .slice(0, 4)
      .map((instruction) => [instruction.offset, instruction.mnemonic]),
    [
      [0x02e1, "set-dialogue-position"],
      [0x02e3, "select-character"],
      [0x02e6, "select-message"],
      [0x02e9, "present-dialogue"],
    ],
  );
  assert.deepEqual(
    opening.stateBranchCandidates
      .filter((branch) => branch.offset === 0x02d0 || branch.offset === 0x02dd)
      .map((branch) => [
        branch.offset,
        branch.opcode,
        branch.destinationOffset,
      ]),
    [
      [0x02d0, "AD", 0x02dd],
      [0x02dd, "AC", 0x0326],
    ],
  );

  const nested = scenarios[1]!.sections[1]!.instructions.find(
    (instruction) => instruction.offset === 0x0a26,
  );
  assert.deepEqual(
    [nested?.destinationBaseOffset, nested?.branchDestinationOffset],
    [0x09f4, 0x0a2e],
  );
  assert.deepEqual(
    scenarios[1]!.sections[1]!.instructions.filter(
      (instruction) =>
        instruction.offset === 0x09e9 || instruction.offset === 0x09ed,
    ).map((instruction) => [instruction.mnemonic, instruction.rawHex]),
    [
      ["assign", "0c0207d0"],
      ["jump-if-less-than", "820102008a"],
    ],
  );
});

test("finds João's explicit fame thresholds", async () => {
  const scenario = await readScenario(1);
  const checks = scenario.sections.flatMap((section) => section.fameChecks);
  assert.deepEqual(
    [...new Set(checks.map((check) => check.threshold))],
    [2_000, 8_000, 16_000, 30_000, 40_000],
  );
  assert.equal(
    checks.some((check) => check.threshold === 23_500),
    false,
  );
});
