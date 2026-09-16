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
    ],
  };
}
