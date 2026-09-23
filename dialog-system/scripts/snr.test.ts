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
    voyageDayIncrementOffset: 0x1e979,
    voyageDayResetOnDepartureOffset: 0x2d7b4,
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
  assert.deepEqual(analysis.musicSelection, {
    driver: "0000:952E",
    scenarioActionHandlerOffset: 0x38d20,
    scenarioWrapperOffset: 0x37980,
    scenarioDriverCallOffset: 0x37984,
    portRegionDriverCallOffset: 0x20682,
    ordinaryBuildingDriverCallOffset: 0x20a0e,
    pubTrackId: 0x13,
    palaceTrackId: 0x12,
    resumeCurrentTrackCallOffset: 0x26ba6,
    currentTrackSource: "DS:0x903A",
    otherDirectDriverCallOffsets: [0x15b4a, 0x15bb3, 0x15d6e, 0x1c2b8, 0x1c8c9],
  });
  assert.deepEqual(analysis.buildingTiming, {
    generalRandomOffset: 0x0a198,
    durationRollOffset: 0x209e8,
    minimumDurationTicks: 2,
    randomDurationBound: 3,
    durationReturnOffset: 0x20b35,
    townClockAddOffset: 0x204a5,
    portArrivalIncrementOffset: 0x20521,
  });
  assert.deepEqual(analysis.menuCommandScenarioDispatch, {
    jobAssignment: {
      handlerOffset: 0x32e70,
      dispatchOffset: 0x32f72,
      scenario: "shared",
      selectorSource: "DS:0x0E32 current port",
      qualifier: "0x06 Guild",
    },
    treat: {
      commandHandlerOffset: 0x2bc8d,
      handlerStartOffset: 0x2bafa,
      handlerEndOffset: 0x2bc8c,
      scenarioDispatch: "none",
      royalInvitationFlagWriteOffset: 0x2bbcd,
    },
    meetRuler: {
      handlerOffset: 0x3044a,
      calls: [
        {
          offset: 0x30482,
          scenario: "shared",
          selectorSource: "DS:0x0E32 current port",
          qualifier: "0x05 Palace",
        },
        {
          offset: 0x3048c,
          scenario: "protagonist",
          selectorSource: "DS:0x0E32 current port",
          qualifier: "0x15 Palace audience",
        },
        {
          offset: 0x3049d,
          scenario: "shared",
          selectorSource: "DS:0x0E32 current port",
          qualifier: "0x15 Palace audience",
        },
      ],
    },
  });
  assert.deepEqual(analysis.buildingAccess, {
    openingHoursOffset: 0x20930,
    palaceHandlerOffset: 0x309a5,
    palaceHostileReceptionEndOffset: 0x30a1a,
    palaceCommonerCheckOffset: 0x30a1b,
    palaceCommonerRejectOffset: 0x30a5b,
    religiousHandlerOffset: 0x32cd0,
    religiousAffiliationCheckOffset: 0x32ce9,
  });
  assert.deepEqual(analysis.systemValues, [
    {
      id: 2,
      handlerOffset: 0x38842,
      source: "DS:0x0734",
      meaning: "stored-year-offset-from-1501",
    },
    {
      id: 3,
      handlerOffset: 0x38847,
      source: "DS:0x0735",
      meaning: "current-month-zero-based",
    },
    {
      id: 4,
      handlerOffset: 0x3884c,
      source: "DS:0x0736",
      meaning: "current-day-zero-based",
    },
    {
      id: 5,
      handlerOffset: 0x38851,
      source: "DS:0x0E32",
      meaning: "current-port-id",
    },
    {
      id: 6,
      handlerOffset: 0x38856,
      source: "DS:0xA0A4",
      meaning: "duel-balance-meter",
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
      [0x00ff, "any-building", 0x082f],
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
    knownTrack: "joao-theme",
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
        knownTrack: "joao-theme",
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
        knownTrack: "european-port-theme",
        rawHex: "ca0a",
      },
    ],
  );
  assert.deepEqual(
    princeKidnapping.duelStartCandidates.map(
      ({ offset, opponentSailorId, rawHex }) => [
        offset,
        opponentSailorId,
        rawHex,
      ],
    ),
    [
      [0x0ca6, 60, "e83c"],
      [0x0fff, 60, "e83c"],
    ],
  );
  const otto = await readScenario(3);
  assert.deepEqual(
    otto.sections.flatMap((section) => section.duelStartCandidates),
    [{ offset: 0x0284, opponentSailorId: 75, rawHex: "e84b" }],
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

test("identifies every naturally occurring scenario music cue", async () => {
  const scenarios = await Promise.all(
    Array.from({ length: 7 }, (_, id) => readScenario(id)),
  );
  const allCues = scenarios.flatMap((scenario) =>
    scenario.sections.flatMap((section) => section.musicCueCandidates),
  );
  assert.equal(allCues.filter((cue) => cue.knownTrack === undefined).length, 0);

  const catalina = scenarios[2]!;
  const cues = catalina.sections.flatMap((section) =>
    section.musicCueCandidates.map((cue) => [cue.offset, cue.knownTrack]),
  );

  assert.ok(
    cues.some(
      ([offset, knownTrack]) =>
        offset === 0x1b9b && knownTrack === "otto-theme",
    ),
  );
  for (const offset of [0x126f, 0x12a3])
    assert.ok(
      cues.some(
        ([candidateOffset, knownTrack]) =>
          candidateOffset === offset && knownTrack === "pub-theme",
      ),
    );
  assert.ok(
    cues.some(
      ([offset, knownTrack]) => offset === 0x0239 && knownTrack === "fanfare",
    ),
  );
});

test("sequential VM decoding follows table-relative control flow", async () => {
  const scenarios = await Promise.all(
    Array.from({ length: 7 }, (_, id) => readScenario(id)),
  );

  const actionMnemonic = (opcode: number) =>
    scenarios
      .flatMap((scenario) => scenario.sections)
      .flatMap((section) => section.instructions)
      .find((instruction) => instruction.opcode === opcode)?.mnemonic;
  assert.deepEqual(
    [0xc3, 0xd0, 0xe2, 0xe3, 0xe6, 0xe7, 0xeb, 0xec].map(actionMnemonic),
    [
      "close-latest-dialogue-panel",
      "resolve-indexed-game-field-reference",
      "load-goods",
      "transfer-goods",
      "add-gold",
      "deduct-gold",
      "random",
      "restore-random-state",
    ],
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
  const sharedGuildOffer = scenarios[0]!.sections[0]!.dialogueRuns.flatMap(
    (run) => run.lines,
  ).find((line) => line.messageId === 2);
  assert.deepEqual(sharedGuildOffer, {
    offset: 0x051c,
    position: 0,
    speakerMessageId: 1,
    messageId: 2,
    body: "I’ve got a job for you. I need you to transport some goods from the port of $r32 to $r33. Will you take on this job?",
    speakerLabel: "Old Guild Worker",
    presentation: "choice-prompt",
    choiceFlag: 0,
    rawHex: "c000c80000c80001e900",
  });
  const sharedNoCargoSpace = scenarios[0]!.sections[1]!.dialogueRuns.flatMap(
    (run) => run.lines,
  ).find((line) => line.messageId === 14);
  assert.deepEqual(sharedNoCargoSpace, {
    offset: 0x0a3b,
    position: 0,
    speakerMessageId: 13,
    messageId: 14,
    body: "You don’t have any room to store cargo on your ship right now. Come back once you’ve made room.",
    speakerLabel: "Head Trader",
    rawHex: "c000c8000cc8000dc7",
  });
  const sharedLines = scenarios[0]!.sections.flatMap((section) =>
    section.dialogueRuns.flatMap((run) => run.lines),
  );
  const accountedSharedMessageIds = new Set<number>();
  for (const line of sharedLines) {
    accountedSharedMessageIds.add(line.messageId);
    if (line.speakerMessageId !== undefined)
      accountedSharedMessageIds.add(line.speakerMessageId);
  }
  assert.equal(sharedLines.length, 201);
  assert.equal(
    sharedLines.filter((line) => line.speakerMessageId !== undefined).length,
    71,
  );
  assert.equal(
    sharedLines.filter((line) => line.characterVariable !== undefined).length,
    129,
  );
  assert.equal(accountedSharedMessageIds.size, 272);
  assert.deepEqual(
    Array.from({ length: 272 }, (_, index) => index + 1).filter(
      (messageId) => !accountedSharedMessageIds.has(messageId),
    ),
    [],
  );
  assert.deepEqual(
    sharedLines.find((line) => line.messageId === 30),
    {
      offset: 0x0b51,
      position: 0,
      speakerMessageId: 29,
      messageId: 30,
      body: "You’ve only got a few hours left. Maybe it’s too tough an assignment for you?",
      speakerLabel: "Head Trader",
      presentation: "choice-prompt",
      choiceFlag: 1,
      presentationInstructionOffsets: [0x0b51, 0x0b53, 0x0b56, 0x0b78],
      rawHex: "c000c8001cc8001de901",
    },
  );
  assert.deepEqual(
    [148, 149].map((messageId) => {
      const line = sharedLines.find(
        (candidate) => candidate.messageId === messageId,
      );
      return [
        line?.offset,
        line?.speakerMessageId,
        line?.characterVariable,
        line?.presentationInstructionOffsets,
        line?.rawHex,
      ];
    }),
    [
      [
        0x176a,
        undefined,
        50,
        [0x176a, 0x176c, 0x1773, 0x177e],
        "c001cd32c80093c7",
      ],
      [
        0x176a,
        undefined,
        50,
        [0x176a, 0x176c, 0x177b, 0x177e],
        "c001cd32c80094c7",
      ],
    ],
  );
  assert.deepEqual(
    scenarios[0]!.sections[1]!.instructions.find(
      (instruction) => instruction.offset === 0x0a26,
    ),
    {
      offset: 0x0a26,
      endOffset: 0x0a28,
      opcode: 0xee,
      opcodeHex: "0xEE",
      kind: "action",
      mnemonic: "read-free-cargo-capacity",
      rawHex: "ee0a",
      destinationBaseOffset: 0x09c2,
      terminal: false,
    },
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
