import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeGeneralMessageBank,
  findDirectGeneralMessageCallSites,
} from "./general-messages.js";

function messageBank(strings: string[]): Buffer {
  const tableLength = strings.length * 2;
  const encoded = strings.map((value) => Buffer.from(`${value}\0`, "latin1"));
  const result = Buffer.alloc(
    tableLength + encoded.reduce((total, value) => total + value.length, 0),
  );
  let offset = tableLength;
  for (const [index, value] of encoded.entries()) {
    result.writeUInt16BE(offset, index * 2);
    value.copy(result, offset);
    offset += value.length;
  }
  return result;
}

test("general message banks use one combined executable index", () => {
  const first = decodeGeneralMessageBank(
    messageBank(["first", "second"]),
    "MESSAGE.DAT",
  );
  const second = decodeGeneralMessageBank(
    messageBank(["extra"]),
    "MESSAGE2.DAT",
  );
  assert.deepEqual(
    [...first, ...second].map(
      ({ bank, rawIndex, entryNumber, combinedIndex }) => ({
        bank,
        rawIndex,
        entryNumber,
        combinedIndex,
      }),
    ),
    [
      { bank: "MESSAGE.DAT", rawIndex: 0, entryNumber: 1, combinedIndex: 0 },
      { bank: "MESSAGE.DAT", rawIndex: 1, entryNumber: 2, combinedIndex: 1 },
      {
        bank: "MESSAGE2.DAT",
        rawIndex: 0,
        entryNumber: 1,
        combinedIndex: 1000,
      },
    ],
  );
});

test("direct helper calls resolve their bank and text", () => {
  const messages = [
    ...decodeGeneralMessageBank(messageBank(["zero"]), "MESSAGE.DAT"),
    ...decodeGeneralMessageBank(messageBank(["other"]), "MESSAGE2.DAT"),
  ];
  const executable = Buffer.from([
    0xb8, 0x00, 0x00, 0x50, 0x9a, 0x95, 0x8d, 0x00, 0x00, 0x68, 0xe8, 0x03,
    0x9a, 0x46, 0x5d, 0xff, 0x2d,
  ]);
  assert.deepEqual(
    findDirectGeneralMessageCallSites(executable, messages).map(
      ({ fileOffset, helper, bank, rawIndex, text }) => ({
        fileOffset,
        helper,
        bank,
        rawIndex,
        text,
      }),
    ),
    [
      {
        fileOffset: 4,
        helper: "0000:8D95",
        bank: "MESSAGE.DAT",
        rawIndex: 0,
        text: "zero",
      },
      {
        fileOffset: 12,
        helper: "FF2D:5D46",
        bank: "MESSAGE2.DAT",
        rawIndex: 0,
        text: "other",
      },
    ],
  );
});
