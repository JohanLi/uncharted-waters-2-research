export interface ScenarioMessage {
  readonly id: number;
  readonly body: string;
  readonly speakerLabel?: string;
  readonly sourceOffset: number;
}

export interface DialogueLine {
  readonly offset: number;
  readonly position: number;
  readonly characterId?: number;
  readonly characterVariable?: number;
  readonly messageId: number;
  readonly body: string;
  readonly speakerLabel?: string;
  readonly presentation?: "choice-prompt";
  readonly choiceFlag?: number;
  readonly rawHex: string;
}

export interface DialogueRun {
  readonly offset: number;
  readonly endOffset: number;
  readonly lines: readonly DialogueLine[];
}

export type ScenarioInstructionKind =
  "assignment" | "arithmetic" | "conditional-branch" | "action" | "invalid";

export interface ScenarioInstruction {
  readonly offset: number;
  readonly endOffset: number;
  readonly opcode: number;
  readonly opcodeHex: string;
  readonly kind: ScenarioInstructionKind;
  readonly mnemonic: string;
  readonly rawHex: string;
  readonly destinationBaseOffset: number;
  readonly branchDestination?: number;
  readonly branchDestinationOffset?: number;
  readonly terminal: boolean;
}

export interface ScenarioControlFlowEdge {
  readonly from: number;
  readonly to: number;
  readonly type: "fallthrough" | "branch";
}

export interface ScenarioRoute {
  readonly key: number;
  readonly keyHex: string;
  readonly selector: number;
  readonly qualifier: number;
  readonly destination: number;
  readonly destinationOffset: number;
  readonly knownLocation?: KnownLocation;
  readonly knownSelector?:
    | "specific-port"
    | "at-sea-day-counter"
    | "before-naval-battle"
    | "after-naval-battle"
    | "any-regular-port";
  readonly opposingCaptainId?: number;
  readonly knownOpposingCaptain?: KnownOpposingCaptain;
  readonly knownEvent?: KnownRouteEvent;
}

export interface ScenarioEntryRouteTable {
  readonly offset: number;
  readonly routes: readonly ScenarioRoute[];
}

export type KnownLocation =
  | "market"
  | "pub"
  | "shipyard"
  | "harbor"
  | "palace"
  | "special-building"
  | "item-shop"
  | "church";

export type KnownRouteEvent =
  | "shared-bank-lodge-guild"
  | `at-sea-day-${number}`
  | "at-sea-any-day"
  | "before-naval-battle"
  | "after-naval-battle";

export type KnownOpposingCaptain = "Catalina Erantzo" | "Antonio Khan";

export type KnownMusicTrack =
  | "flute-theme"
  | "catalina-theme"
  | "port-theme"
  | "battle-theme"
  | "game-over-theme";

export interface ScenarioSection {
  readonly id: number;
  readonly offset: number;
  readonly endOffset: number;
  readonly codeOffset: number;
  /**
   * VM branch and route destinations are relative to the byte immediately
   * after the first section-offset table, not to the section itself.
   */
  readonly destinationBaseOffset: number;
  readonly entryOffsets: readonly number[];
  readonly routes: readonly ScenarioRoute[];
  readonly entryRouteTables: readonly ScenarioEntryRouteTable[];
  readonly dialogueRuns: readonly DialogueRun[];
  readonly booleanStateWrites: readonly {
    offset: number;
    flag: number;
    value: number;
    rawHex: string;
  }[];
  readonly stateBranchCandidates: readonly {
    offset: number;
    opcode: "AC" | "AD";
    flag: number;
    destination: number;
    destinationOffset: number;
    rawHex: string;
  }[];
  readonly fameChecks: readonly {
    offset: number;
    threshold: number;
    trailingOperand: number;
    rawHex: string;
  }[];
  readonly musicCueCandidates: readonly {
    offset: number;
    trackId: number;
    knownTrack?: KnownMusicTrack;
    rawHex: string;
  }[];
  readonly sceneBreakCandidates: readonly {
    offset: number;
    rawHex: string;
  }[];
  readonly duelStartCandidates: readonly {
    offset: number;
    rawHex: string;
  }[];
  readonly eventArtCandidates: readonly {
    offset: number;
    commandOffset: number;
    resourceFile: string;
    eventImageIndex: number;
    x: number;
    y: number;
    extractedAsset: string;
    rawHex: string;
  }[];
  readonly instructions: readonly ScenarioInstruction[];
  readonly controlFlowEdges: readonly ScenarioControlFlowEdge[];
  readonly rawHex: string;
}

export interface DisassembledScenario {
  readonly scenarioId: number;
  readonly messages: readonly ScenarioMessage[];
  readonly sections: readonly ScenarioSection[];
}

const KNOWN_LOCATIONS = new Map<number, KnownLocation>([
  [0x0000, "market"],
  [0x0001, "pub"],
  [0x0002, "shipyard"],
  [0x0003, "harbor"],
  [0x0005, "palace"],
  [0x0007, "special-building"],
  [0x0009, "item-shop"],
  [0x000a, "church"],
]);

const KNOWN_MUSIC_TRACKS = new Map<number, KnownMusicTrack>([
  [4, "flute-theme"],
  [5, "catalina-theme"],
  [10, "port-theme"],
  [16, "battle-theme"],
  [20, "game-over-theme"],
]);

const KNOWN_OPPOSING_CAPTAINS = new Map<number, KnownOpposingCaptain>([
  [1, "Catalina Erantzo"],
  [60, "Antonio Khan"],
]);

function hex(value: number, width: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

function formatBody(body: string): string {
  return body.replace(/\|.*?\|\n/g, "").replaceAll("'", "’");
}

export function readScenarioMessages(data: Buffer): ScenarioMessage[] {
  if (data.length < 4) throw new Error("SNR message table is too short");
  const firstOffset = data.readUInt32BE(0);
  if (firstOffset < 4 || firstOffset > data.length || firstOffset % 4 !== 0)
    throw new Error("Invalid SNR message offset table");

  return Array.from({ length: firstOffset / 4 }, (_, index) => {
    const sourceOffset = data.readUInt32BE(index * 4);
    const end = data.indexOf(0, sourceOffset);
    if (sourceOffset < firstOffset || end < 0)
      throw new Error(`Invalid SNR message ${index + 1}`);
    const rawBody = new TextDecoder().decode(data.subarray(sourceOffset, end));
    const label = /^\|([^|]+)\|\n/.exec(rawBody)?.[1];
    return {
      id: index + 1,
      body: formatBody(rawBody),
      ...(label ? { speakerLabel: label } : {}),
      sourceOffset,
    };
  });
}

function readSectionOffsets(data: Buffer): number[] {
  if (data.subarray(0, 4).toString("ascii") !== "SNDT")
    throw new Error("Invalid SNDT signature");

  const offsets: number[] = [];
  for (let cursor = 16; cursor + 4 <= data.length; cursor += 4) {
    const offset = data.readUInt32BE(cursor);
    if (offset === 0xffffffff) break;
    if (
      offset < 20 ||
      offset >= data.length ||
      (offsets.at(-1) !== undefined && offset <= offsets.at(-1)!)
    )
      throw new Error(`Invalid SNDT section offset ${hex(offset, 8)}`);
    offsets.push(offset);
  }
  if (offsets.length === 0) throw new Error("SNDT has no sections");
  return offsets;
}

function readDialogueLine(
  data: Buffer,
  offset: number,
  messages: readonly ScenarioMessage[],
): { line: DialogueLine; length: number } | undefined {
  let length: number;
  let position: number;
  let characterId: number | undefined;
  let characterVariable: number | undefined;
  let messageIndex: number;
  let presentation: DialogueLine["presentation"];
  let choiceFlag: number | undefined;

  if (
    data[offset] === 0xc0 &&
    (data[offset + 1] === 1 || data[offset + 1] === 2) &&
    data[offset + 2] === 0xcc &&
    data[offset + 5] === 0xc8 &&
    (data[offset + 8] === 0xc7 || data[offset + 8] === 0xe9)
  ) {
    const presentationOpcode = data[offset + 8]!;
    length = presentationOpcode === 0xe9 ? 10 : 9;
    position = data[offset + 1]!;
    characterId = data.readUInt16BE(offset + 3) + 1;
    messageIndex = data.readUInt16BE(offset + 6);
    if (presentationOpcode === 0xe9) {
      presentation = "choice-prompt";
      choiceFlag = data[offset + 9];
    }
  } else if (
    data[offset] === 0xc0 &&
    (data[offset + 1] === 1 || data[offset + 1] === 2) &&
    data[offset + 2] === 0xcd &&
    data[offset + 4] === 0xc8 &&
    (data[offset + 7] === 0xc7 || data[offset + 7] === 0xe9)
  ) {
    const presentationOpcode = data[offset + 7]!;
    length = presentationOpcode === 0xe9 ? 9 : 8;
    position = data[offset + 1]!;
    characterVariable = data[offset + 3]!;
    messageIndex = data.readUInt16BE(offset + 5);
    if (presentationOpcode === 0xe9) {
      presentation = "choice-prompt";
      choiceFlag = data[offset + 8];
    }
  } else if (
    data[offset] === 0xc0 &&
    data[offset + 1] === 0 &&
    data[offset + 2] === 0xc8 &&
    (data[offset + 5] === 0xc7 || data[offset + 5] === 0xe9)
  ) {
    const presentationOpcode = data[offset + 5]!;
    length = presentationOpcode === 0xe9 ? 7 : 6;
    position = 0;
    messageIndex = data.readUInt16BE(offset + 3);
    if (presentationOpcode === 0xe9) {
      presentation = "choice-prompt";
      choiceFlag = data[offset + 6];
    }
  } else {
    return undefined;
  }

  const message = messages[messageIndex];
  if (!message) return undefined;
  return {
    length,
    line: {
      offset,
      position,
      ...(characterId === undefined ? {} : { characterId }),
      ...(characterVariable === undefined ? {} : { characterVariable }),
      messageId: messageIndex + 1,
      body: message.body,
      ...(message.speakerLabel ? { speakerLabel: message.speakerLabel } : {}),
      ...(presentation ? { presentation } : {}),
      ...(choiceFlag === undefined ? {} : { choiceFlag }),
      rawHex: data.subarray(offset, offset + length).toString("hex"),
    },
  };
}

function readDialogueRuns(
  data: Buffer,
  start: number,
  end: number,
  messages: readonly ScenarioMessage[],
): DialogueRun[] {
  const runs: DialogueRun[] = [];
  let current: DialogueLine[] = [];
  let previousEnd = -1;

  for (let offset = start; offset < end; offset++) {
    const decoded = readDialogueLine(data, offset, messages);
    if (!decoded) continue;
    if (current.length > 0 && offset !== previousEnd) {
      runs.push({
        offset: current[0]!.offset,
        endOffset: previousEnd,
        lines: current,
      });
      current = [];
    }
    current.push(decoded.line);
    previousEnd = offset + decoded.length;
    offset += decoded.length - 1;
  }
  if (current.length > 0)
    runs.push({
      offset: current[0]!.offset,
      endOffset: previousEnd,
      lines: current,
    });
  return runs;
}

function readSectionHeader(
  data: Buffer,
  start: number,
  end: number,
): Pick<
  ScenarioSection,
  "entryOffsets" | "routes" | "codeOffset" | "destinationBaseOffset"
> {
  const headerLength = data.readUInt16BE(start);
  const firstTableEnd = start + headerLength;
  if (
    headerLength < 4 ||
    headerLength % 2 !== 0 ||
    firstTableEnd > end ||
    data.readUInt16BE(firstTableEnd - 2) !== 0xffff
  )
    return {
      entryOffsets: [],
      routes: [],
      codeOffset: start,
      destinationBaseOffset: start,
    };

  const entryOffsets: number[] = [];
  for (let cursor = start + 2; cursor < firstTableEnd - 2; cursor += 2)
    entryOffsets.push(start + data.readUInt16BE(cursor));

  const routes: ScenarioSection["routes"][number][] = [];
  let codeOffset = firstTableEnd;
  for (let cursor = firstTableEnd; cursor + 4 <= end; cursor += 4) {
    const key = data.readUInt16BE(cursor);
    const destination = data.readUInt16BE(cursor + 2);
    if (key === 0xffff && destination === 0xffff) {
      codeOffset = cursor + 4;
      break;
    }
    if (destination >= end - start) break;
    routes.push(annotateRoute(key, destination, firstTableEnd));
  }
  return {
    entryOffsets,
    routes,
    codeOffset,
    destinationBaseOffset: firstTableEnd,
  };
}

function annotateRoute(
  key: number,
  destination: number,
  tableOffset: number,
): ScenarioRoute {
  const selector = key >> 8;
  const qualifier = key & 0xff;
  const isPortSelector = selector <= 0x63 || selector === 0xa3;
  const knownLocation = isPortSelector
    ? KNOWN_LOCATIONS.get(qualifier)
    : undefined;
  const knownSelector =
    selector <= 0x63
      ? ("specific-port" as const)
      : selector === 0xa0
        ? ("at-sea-day-counter" as const)
        : selector === 0xa1
          ? ("before-naval-battle" as const)
          : selector === 0xa2
            ? ("after-naval-battle" as const)
            : selector === 0xa3
              ? ("any-regular-port" as const)
              : undefined;
  const knownEvent =
    key === 0x00ff
      ? ("shared-bank-lodge-guild" as const)
      : selector === 0xa0 && qualifier === 0xff
        ? ("at-sea-any-day" as const)
        : selector === 0xa0
          ? (`at-sea-day-${qualifier}` as const)
          : selector === 0xa1
            ? ("before-naval-battle" as const)
            : selector === 0xa2
              ? ("after-naval-battle" as const)
              : undefined;
  const opposingCaptainId =
    (selector === 0xa1 || selector === 0xa2) && qualifier !== 0xff
      ? qualifier
      : undefined;
  const knownOpposingCaptain =
    opposingCaptainId === undefined
      ? undefined
      : KNOWN_OPPOSING_CAPTAINS.get(opposingCaptainId);
  return {
    key,
    keyHex: hex(key, 4),
    selector,
    qualifier,
    destination,
    destinationOffset: tableOffset + destination,
    ...(knownLocation ? { knownLocation } : {}),
    ...(knownSelector ? { knownSelector } : {}),
    ...(opposingCaptainId === undefined ? {} : { opposingCaptainId }),
    ...(knownOpposingCaptain ? { knownOpposingCaptain } : {}),
    ...(knownEvent ? { knownEvent } : {}),
  };
}

function readEntryRouteTable(
  data: Buffer,
  tableOffset: number,
  end: number,
): ScenarioEntryRouteTable {
  const routes: ScenarioRoute[] = [];
  for (let cursor = tableOffset; cursor + 4 <= end; cursor += 4) {
    const key = data.readUInt16BE(cursor);
    const destination = data.readUInt16BE(cursor + 2);
    if (key === 0xffff && destination === 0xffff) break;
    const destinationOffset = tableOffset + destination;
    if (destinationOffset < tableOffset || destinationOffset >= end) break;
    routes.push(annotateRoute(key, destination, tableOffset));
  }
  return { offset: tableOffset, routes };
}

const ACTION_LENGTHS = new Map<number, number>([
  [0xc0, 2],
  [0xc3, 1],
  [0xc4, 1],
  [0xc5, 2],
  [0xc7, 1],
  [0xc8, 3],
  [0xc9, 4],
  [0xca, 2],
  [0xcb, 6],
  [0xcc, 3],
  [0xcd, 2],
  [0xd0, 5],
  [0xd1, 2],
  [0xd4, 3],
  [0xd9, 3],
  [0xdc, 5],
  [0xe2, 3],
  [0xe3, 3],
  [0xe4, 2],
  [0xe6, 2],
  [0xe7, 2],
  [0xe8, 2],
  [0xe9, 2],
  [0xea, 2],
  [0xeb, 4],
  [0xec, 2],
  [0xed, 2],
  [0xee, 2],
  [0xf0, 1],
  [0xf1, 1],
  [0xf2, 1],
  [0xf4, 2],
  [0xf8, 1],
  [0xf9, 3],
  [0xfa, 4],
  [0xfb, 2],
  [0xfc, 3],
  [0xfe, 3],
  [0xff, 1],
]);

const ACTION_MNEMONICS = new Map<number, string>([
  [0xc0, "set-dialogue-position"],
  [0xc4, "scene-break"],
  [0xc7, "present-dialogue"],
  [0xc8, "select-message"],
  [0xca, "play-music"],
  [0xcb, "show-event-art"],
  [0xcc, "select-character"],
  [0xcd, "select-character-indirect"],
  [0xdc, "resolve-game-field-reference"],
  [0xe8, "start-duel"],
  [0xe9, "prompt-choice"],
  [0xea, "read-gold-ingots"],
  [0xf0, "advance-subsection-on-return"],
  [0xf1, "advance-section-on-return"],
  [0xf2, "stop"],
  [0xf8, "force-building-exit"],
  [0xfe, "jump"],
  [0xff, "nop"],
]);

const ARITHMETIC_MNEMONICS = new Map<number, string>([
  [0x00, "add"],
  [0x01, "subtract"],
  [0x02, "multiply"],
  [0x03, "divide"],
  [0x20, "bitwise-or"],
  [0x21, "bitwise-and"],
  [0x22, "shift-right"],
  [0x23, "shift-left"],
]);

function readInstruction(
  data: Buffer,
  offset: number,
  end: number,
  destinationBaseOffset: number,
): ScenarioInstruction | undefined {
  const opcode = data[offset];
  if (opcode === undefined || offset >= end) return undefined;

  let length: number;
  let kind: ScenarioInstructionKind;
  let mnemonic: string;
  let terminal = false;
  let branchDestination: number | undefined;

  if (opcode < 0x40) {
    const destinationMode = (opcode >> 4) & 3;
    const sourceMode = (opcode >> 2) & 3;
    const operation = opcode & 3;
    length =
      destinationMode !== 2 && sourceMode === 3 && operation === 0 ? 4 : 3;
    kind = "assignment";
    mnemonic =
      opcode === 0x2c
        ? "set-scenario-flag"
        : opcode === 0x0f && data[offset + 2] === 7
          ? "read-time-of-day"
          : "assign";
  } else if (opcode < 0x80) {
    length = 3;
    kind = "arithmetic";
    mnemonic = ARITHMETIC_MNEMONICS.get(opcode & 0x23) ?? "arithmetic";
  } else if (opcode < 0xc0) {
    const leftMode = (opcode >> 4) & 3;
    const rightMode = (opcode >> 2) & 3;
    length = leftMode === 2 && rightMode !== 2 ? 4 : 5;
    kind = "conditional-branch";
    mnemonic =
      opcode === 0xac
        ? "jump-if-flag-set"
        : opcode === 0xad
          ? "jump-if-flag-clear"
          : [
              "jump-if-not-equal",
              "jump-if-equal",
              "jump-if-less-than",
              "jump-if-greater-than",
            ][opcode & 3]!;
    if (offset + length <= end)
      branchDestination = data.readUInt16BE(offset + length - 2);
  } else {
    length = ACTION_LENGTHS.get(opcode) ?? 1;
    const valid = ACTION_LENGTHS.has(opcode);
    kind = valid ? "action" : "invalid";
    mnemonic = ACTION_MNEMONICS.get(opcode) ?? (valid ? "action" : "invalid");
    terminal = !valid || opcode === 0xf2;
    if (opcode === 0xfe && offset + length <= end)
      branchDestination = data.readUInt16BE(offset + 1);
  }

  if (offset + length > end) return undefined;
  return {
    offset,
    endOffset: offset + length,
    opcode,
    opcodeHex: hex(opcode, 2),
    kind,
    mnemonic,
    rawHex: data.subarray(offset, offset + length).toString("hex"),
    destinationBaseOffset,
    ...(branchDestination === undefined
      ? {}
      : {
          branchDestination,
          branchDestinationOffset: destinationBaseOffset + branchDestination,
        }),
    terminal,
  };
}

function readReachableInstructions(
  data: Buffer,
  start: number,
  end: number,
  entries: readonly {
    offset: number;
    destinationBaseOffset: number;
  }[],
): {
  instructions: ScenarioInstruction[];
  controlFlowEdges: ScenarioControlFlowEdge[];
} {
  const pending = [...entries];
  const instructions = new Map<number, ScenarioInstruction>();
  const edgeKeys = new Set<string>();
  const controlFlowEdges: ScenarioControlFlowEdge[] = [];

  const addEdge = (edge: ScenarioControlFlowEdge): void => {
    if (edge.to < start || edge.to >= end) return;
    const key = `${edge.from}:${edge.to}:${edge.type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    controlFlowEdges.push(edge);
    const source = instructions.get(edge.from);
    if (source)
      pending.push({
        offset: edge.to,
        destinationBaseOffset: source.destinationBaseOffset,
      });
  };

  while (pending.length > 0) {
    const { offset, destinationBaseOffset: instructionBaseOffset } =
      pending.pop()!;
    if (offset < start || offset >= end || instructions.has(offset)) continue;
    const instruction = readInstruction(
      data,
      offset,
      end,
      instructionBaseOffset,
    );
    if (!instruction) continue;
    instructions.set(offset, instruction);

    if (instruction.branchDestinationOffset !== undefined)
      addEdge({
        from: offset,
        to: instruction.branchDestinationOffset,
        type: "branch",
      });
    if (!instruction.terminal && instruction.opcode !== 0xfe)
      addEdge({
        from: offset,
        to: instruction.endOffset,
        type: "fallthrough",
      });
  }

  return {
    instructions: [...instructions.values()].sort(
      (a, b) => a.offset - b.offset,
    ),
    controlFlowEdges: controlFlowEdges.sort(
      (a, b) => a.from - b.from || a.to - b.to,
    ),
  };
}

export function disassembleScenario(
  scenarioId: number,
  dat: Buffer,
  mes: Buffer,
): DisassembledScenario {
  const messages = readScenarioMessages(mes);
  const offsets = readSectionOffsets(dat);
  const sections = offsets.map((offset, id): ScenarioSection => {
    const endOffset = offsets[id + 1] ?? dat.length;
    const dialogueRuns = readDialogueRuns(dat, offset, endOffset, messages);
    const header = readSectionHeader(dat, offset, endOffset);
    const entryRouteTables = header.entryOffsets.map((entryOffset) =>
      readEntryRouteTable(dat, entryOffset, endOffset),
    );
    const controlFlow = readReachableInstructions(
      dat,
      header.codeOffset,
      endOffset,
      [
        ...header.routes.map((route) => ({
          offset: route.destinationOffset,
          destinationBaseOffset: header.destinationBaseOffset,
        })),
        ...entryRouteTables.flatMap((table) =>
          table.routes.map((route) => ({
            offset: route.destinationOffset,
            destinationBaseOffset: table.offset,
          })),
        ),
      ],
    );
    const booleanStateWrites: ScenarioSection["booleanStateWrites"][number][] =
      [];
    const stateBranchCandidates: ScenarioSection["stateBranchCandidates"][number][] =
      [];
    const fameChecks: ScenarioSection["fameChecks"][number][] = [];
    const musicCueCandidates: ScenarioSection["musicCueCandidates"][number][] =
      [];
    const sceneBreakCandidates: ScenarioSection["sceneBreakCandidates"][number][] =
      [];
    const duelStartCandidates: ScenarioSection["duelStartCandidates"][number][] =
      [];
    const eventArtCandidates: ScenarioSection["eventArtCandidates"][number][] =
      [];

    const instructionOffsets = new Set(
      controlFlow.instructions.map((instruction) => instruction.offset),
    );
    for (const instruction of controlFlow.instructions) {
      const cursor = instruction.offset;
      if (instruction.opcode === 0x2c && dat[cursor + 2]! <= 1)
        booleanStateWrites.push({
          offset: cursor,
          flag: dat[cursor + 1]!,
          value: dat[cursor + 2]!,
          rawHex: dat.subarray(cursor, cursor + 3).toString("hex"),
        });

      if (
        (instruction.opcode === 0xac || instruction.opcode === 0xad) &&
        instruction.branchDestination !== undefined &&
        instruction.branchDestinationOffset !== undefined
      )
        stateBranchCandidates.push({
          offset: cursor,
          opcode: instruction.opcode === 0xac ? "AC" : "AD",
          flag: dat[cursor + 1]!,
          destination: instruction.branchDestination,
          destinationOffset: instruction.branchDestinationOffset,
          rawHex: instruction.rawHex,
        });

      if (
        cursor + 8 < endOffset &&
        instruction.opcode === 0x0c &&
        dat[cursor + 1] === 2 &&
        dat[cursor + 4] === 0x82 &&
        dat[cursor + 5] === 1 &&
        dat[cursor + 6] === 2 &&
        instructionOffsets.has(cursor + 4)
      ) {
        fameChecks.push({
          offset: cursor,
          threshold: dat.readUInt16BE(cursor + 2),
          trailingOperand: dat.readUInt16BE(cursor + 7),
          rawHex: dat.subarray(cursor, cursor + 9).toString("hex"),
        });
      }

      if (
        cursor + 1 < endOffset &&
        instruction.opcode === 0xca &&
        dat[cursor + 1]! <= 0x15
      ) {
        const trackId = dat[cursor + 1]!;
        const knownTrack = KNOWN_MUSIC_TRACKS.get(trackId);
        musicCueCandidates.push({
          offset: cursor,
          trackId,
          ...(knownTrack ? { knownTrack } : {}),
          rawHex: dat.subarray(cursor, cursor + 2).toString("hex"),
        });
      }

      if (instruction.opcode === 0xc4)
        sceneBreakCandidates.push({ offset: cursor, rawHex: "c4" });

      if (
        cursor + 1 < endOffset &&
        instruction.opcode === 0xe8 &&
        dat[cursor + 1] === 0x3c
      )
        duelStartCandidates.push({ offset: cursor, rawHex: "e83c" });

      if (
        cursor + 7 < endOffset &&
        dat
          .subarray(cursor, cursor + 7)
          .equals(Buffer.from([0xc0, 0x03, 0xcb, 0x00, 0x70, 0x00, 0x18])) &&
        instructionOffsets.has(cursor + 2)
      )
        eventArtCandidates.push({
          offset: cursor,
          commandOffset: cursor + 2,
          resourceFile: `EVENT${scenarioId}.DAT`,
          eventImageIndex: dat[cursor + 7]!,
          x: dat.readUInt16BE(cursor + 3),
          y: dat.readUInt16BE(cursor + 5),
          extractedAsset: `event${scenarioId}-${dat[
            cursor + 7
          ]!.toString().padStart(2, "0")}-192x144.png`,
          rawHex: dat.subarray(cursor, cursor + 8).toString("hex"),
        });
    }

    return {
      id,
      offset,
      endOffset,
      ...header,
      entryRouteTables,
      dialogueRuns,
      booleanStateWrites,
      stateBranchCandidates,
      fameChecks,
      musicCueCandidates,
      sceneBreakCandidates,
      duelStartCandidates,
      eventArtCandidates,
      ...controlFlow,
      rawHex: dat.subarray(offset, endOffset).toString("hex"),
    };
  });
  return { scenarioId, messages, sections };
}
