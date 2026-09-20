import { createHash } from "node:crypto";

export interface ScenarioVmExecutableAnalysis {
  readonly sha256: string;
  readonly loader: {
    readonly openScenarioFilesOffset: number;
    readonly loadSectionOffset: number;
    readonly scenarioDatPatternOffset: number;
    readonly scenarioMesPatternOffset: number;
  };
  readonly streamReaders: {
    readonly byteOffset: number;
    readonly bigEndianWordOffset: number;
  };
  readonly dispatcher: {
    readonly offset: number;
    readonly familyHandlers: readonly {
      readonly range: string;
      readonly handlerOffset: number;
      readonly role: string;
    }[];
    readonly actionJumpTableOffset: number;
    readonly actionHandlers: readonly {
      readonly opcode: number;
      readonly opcodeHex: string;
      readonly handlerOffset: number;
      readonly implemented: boolean;
    }[];
  };
  readonly routeMatching: {
    readonly sharedMatcherOffset: number;
    readonly sharedDispatcherOffset: number;
    readonly protagonistMatcherOffset: number;
    readonly protagonistDispatcherOffset: number;
    readonly atSeaDispatchOffset: number;
    readonly atSeaSelector: string;
    readonly atSeaQualifierSource: string;
    readonly atSeaQualifierSlot1SaveOffset: number;
    readonly voyageDayIncrementOffset: number;
    readonly voyageDayResetOnDepartureOffset: number;
    readonly anyRegularPortSelector: string;
    readonly protagonistRegularPortCount: number;
    readonly sharedPortCount: number;
    readonly navalBattle: {
      readonly beforeSelector: string;
      readonly afterSelector: string;
      readonly protagonistQualifierSource: string;
      readonly sharedQualifierSource: string;
      readonly qualifierMeaning: string;
      readonly currentProtagonistIdSource: string;
      readonly opponentSelectionOffset: number;
      readonly protagonistBeforeDispatchOffset: number;
      readonly sharedBeforeDispatchOffset: number;
      readonly sharedAfterDispatchOffset: number;
      readonly protagonistAfterDispatchOffset: number;
    };
  };
  readonly musicSelection: {
    readonly driver: string;
    readonly scenarioActionHandlerOffset: number;
    readonly scenarioWrapperOffset: number;
    readonly scenarioDriverCallOffset: number;
    readonly portRegionDriverCallOffset: number;
    readonly ordinaryBuildingDriverCallOffset: number;
    readonly pubTrackId: number;
    readonly palaceTrackId: number;
    readonly resumeCurrentTrackCallOffset: number;
    readonly currentTrackSource: string;
    readonly otherDirectDriverCallOffsets: readonly number[];
  };
  readonly buildingTiming: {
    readonly generalRandomOffset: number;
    readonly durationRollOffset: number;
    readonly minimumDurationTicks: number;
    readonly randomDurationBound: number;
    readonly durationReturnOffset: number;
    readonly townClockAddOffset: number;
    readonly portArrivalIncrementOffset: number;
  };
  readonly menuCommandScenarioDispatch: {
    readonly jobAssignment: {
      readonly handlerOffset: number;
      readonly dispatchOffset: number;
      readonly scenario: "shared";
      readonly selectorSource: string;
      readonly qualifier: string;
    };
    readonly treat: {
      readonly commandHandlerOffset: number;
      readonly handlerStartOffset: number;
      readonly handlerEndOffset: number;
      readonly scenarioDispatch: "none";
      readonly royalInvitationFlagWriteOffset: number;
    };
    readonly meetRuler: {
      readonly handlerOffset: number;
      readonly calls: readonly {
        readonly offset: number;
        readonly scenario: "shared" | "protagonist";
        readonly selectorSource: string;
        readonly qualifier: string;
      }[];
    };
  };
  readonly buildingAccess: {
    readonly openingHoursOffset: number;
    readonly palaceHandlerOffset: number;
    readonly palaceHostileReceptionEndOffset: number;
    readonly palaceCommonerCheckOffset: number;
    readonly palaceCommonerRejectOffset: number;
    readonly religiousHandlerOffset: number;
    readonly religiousAffiliationCheckOffset: number;
  };
  readonly globals: Readonly<Record<string, string>>;
  readonly systemValues: readonly {
    readonly id: number;
    readonly handlerOffset: number;
    readonly source: string;
    readonly meaning: string;
  }[];
}

const ACTION_JUMP_TABLE_OFFSET = 0x38c2b;
const ACTION_RUNTIME_TO_FILE_DELTA = 0x335f0;
const INVALID_ACTION_HANDLER = 0x56bb;

function hex(value: number, width: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

function requireAscii(data: Buffer, offset: number, expected: string): void {
  if (
    data.subarray(offset, offset + expected.length).toString("ascii") !==
    expected
  )
    throw new Error(
      `MAIN.EXE does not contain ${JSON.stringify(expected)} at ${hex(offset, 5)}`,
    );
}

export function analyzeScenarioVmExecutable(
  data: Buffer,
): ScenarioVmExecutableAnalysis {
  requireAscii(data, 0x3c7a8, "C:SNR*.DAT");
  requireAscii(data, 0x3c804, "C:SNR*.MES");
  if (ACTION_JUMP_TABLE_OFFSET + 64 * 2 > data.length)
    throw new Error("MAIN.EXE is too short for the scenario action jump table");

  const actionHandlers = Array.from({ length: 64 }, (_, index) => {
    const runtimeOffset = data.readUInt16LE(
      ACTION_JUMP_TABLE_OFFSET + index * 2,
    );
    return {
      opcode: 0xc0 + index,
      opcodeHex: hex(0xc0 + index, 2),
      handlerOffset: runtimeOffset + ACTION_RUNTIME_TO_FILE_DELTA,
      implemented: runtimeOffset !== INVALID_ACTION_HANDLER,
    };
  });

  return {
    sha256: createHash("sha256").update(data).digest("hex"),
    loader: {
      openScenarioFilesOffset: 0x3854f,
      loadSectionOffset: 0x38593,
      scenarioDatPatternOffset: 0x3c7a8,
      scenarioMesPatternOffset: 0x3c804,
    },
    streamReaders: {
      byteOffset: 0x382b7,
      bigEndianWordOffset: 0x382cb,
    },
    dispatcher: {
      offset: 0x38f4f,
      familyHandlers: [
        { range: "0x00-0x3F", handlerOffset: 0x3873e, role: "assignment" },
        { range: "0x40-0x7F", handlerOffset: 0x3893e, role: "arithmetic" },
        {
          range: "0x80-0xBF",
          handlerOffset: 0x38a78,
          role: "conditional-branch",
        },
        { range: "0xC0-0xFF", handlerOffset: 0x38c07, role: "action" },
      ],
      actionJumpTableOffset: ACTION_JUMP_TABLE_OFFSET,
      actionHandlers,
    },
    routeMatching: {
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
    },
    musicSelection: {
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
      otherDirectDriverCallOffsets: [
        0x15b4a, 0x15bb3, 0x15d6e, 0x1c2b8, 0x1c8c9,
      ],
    },
    buildingTiming: {
      generalRandomOffset: 0x0a198,
      durationRollOffset: 0x209e9,
      minimumDurationTicks: 2,
      randomDurationBound: 3,
      durationReturnOffset: 0x20b36,
      townClockAddOffset: 0x204a7,
      portArrivalIncrementOffset: 0x2051e,
    },
    menuCommandScenarioDispatch: {
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
    },
    buildingAccess: {
      openingHoursOffset: 0x20930,
      palaceHandlerOffset: 0x309a5,
      palaceHostileReceptionEndOffset: 0x30a1a,
      palaceCommonerCheckOffset: 0x30a1b,
      palaceCommonerRejectOffset: 0x30a5b,
      religiousHandlerOffset: 0x32cd0,
      religiousAffiliationCheckOffset: 0x32ce9,
    },
    globals: {
      currentSection: "DS:0x060E",
      currentSubsection: "DS:0x060F",
      scenarioFlagsPointer: "DS:0x0610",
      variablesPointer: "DS:0x0612",
      instructionOffset: "DS:0x0614",
      datHandle: "DS:0x0616",
      mesHandle: "DS:0x0618",
      streamPointer: "DS:0x061A",
      streamSegment: "DS:0x061C",
    },
    systemValues: [
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
    ],
  };
}
