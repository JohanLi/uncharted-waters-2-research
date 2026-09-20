import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot, writeJson } from "../../scripts/shared.js";

export type GeneralMessageBankName = "MESSAGE.DAT" | "MESSAGE2.DAT";

export interface GeneralMessage {
  bank: GeneralMessageBankName;
  rawIndex: number;
  entryNumber: number;
  combinedIndex: number;
  text: string;
}

export interface GeneralMessageCallSite extends GeneralMessage {
  fileOffset: number;
  helper: "0000:8D95" | "FF2D:5D46";
  referenceForm: "mov-ax-push" | "push-immediate";
}

const MESSAGE_DAT_COUNT = 1_000;

export function decodeGeneralMessageBank(
  bytes: Buffer,
  bank: GeneralMessageBankName,
): GeneralMessage[] {
  const tableLength = bytes.readUInt16BE(0);
  if (tableLength % 2 !== 0)
    throw new Error(`${bank} has an odd offset-table length`);

  const count = tableLength / 2;
  const combinedBase = bank === "MESSAGE.DAT" ? 0 : MESSAGE_DAT_COUNT;
  const messages: GeneralMessage[] = [];
  for (let rawIndex = 0; rawIndex < count; rawIndex++) {
    const start = bytes.readUInt16BE(rawIndex * 2);
    const end = bytes.indexOf(0, start);
    if (end < 0) throw new Error(`${bank} entry ${rawIndex} is unterminated`);
    messages.push({
      bank,
      rawIndex,
      entryNumber: rawIndex + 1,
      combinedIndex: combinedBase + rawIndex,
      text: bytes.subarray(start, end).toString("latin1"),
    });
  }
  return messages;
}

interface HelperSignature {
  helper: GeneralMessageCallSite["helper"];
  bytes: Buffer;
}

const HELPER_SIGNATURES: HelperSignature[] = [
  { helper: "0000:8D95", bytes: Buffer.from([0x9a, 0x95, 0x8d, 0x00, 0x00]) },
  { helper: "FF2D:5D46", bytes: Buffer.from([0x9a, 0x46, 0x5d, 0xff, 0x2d]) },
];

export function findDirectGeneralMessageCallSites(
  executable: Buffer,
  messages: readonly GeneralMessage[],
): GeneralMessageCallSite[] {
  const byCombinedIndex = new Map(
    messages.map((message) => [message.combinedIndex, message]),
  );
  const sites: GeneralMessageCallSite[] = [];

  for (const signature of HELPER_SIGNATURES) {
    let cursor = 0;
    while ((cursor = executable.indexOf(signature.bytes, cursor)) >= 0) {
      let combinedIndex: number | undefined;
      let referenceForm: GeneralMessageCallSite["referenceForm"] | undefined;

      // mov ax, <id>; push ax; lcall ...
      if (
        cursor >= 4 &&
        executable[cursor - 4] === 0xb8 &&
        executable[cursor - 1] === 0x50
      ) {
        combinedIndex = executable.readUInt16LE(cursor - 3);
        referenceForm = "mov-ax-push";
      }
      // push <id>; lcall ...
      else if (cursor >= 3 && executable[cursor - 3] === 0x68) {
        combinedIndex = executable.readUInt16LE(cursor - 2);
        referenceForm = "push-immediate";
      }

      const message =
        combinedIndex === undefined
          ? undefined
          : byCombinedIndex.get(combinedIndex);
      if (message && referenceForm) {
        sites.push({
          fileOffset: cursor,
          helper: signature.helper,
          referenceForm,
          ...message,
        });
      }
      cursor += signature.bytes.length;
    }
  }

  return sites.sort((left, right) => left.fileOffset - right.fileOffset);
}

export async function writeGeneralMessageCallSites(
  output: string,
): Promise<void> {
  const [main, messageDat, message2Dat] = await Promise.all([
    readFile(join(repoRoot, "raw/MAIN.EXE")),
    readFile(join(repoRoot, "raw/MESSAGE.DAT")),
    readFile(join(repoRoot, "raw/MESSAGE2.DAT")),
  ]);
  const messages = [
    ...decodeGeneralMessageBank(messageDat, "MESSAGE.DAT"),
    ...decodeGeneralMessageBank(message2Dat, "MESSAGE2.DAT"),
  ];
  await writeJson(
    join(output, "general-message-call-sites.json"),
    findDirectGeneralMessageCallSites(main, messages),
  );
}
