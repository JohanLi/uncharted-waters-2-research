import {
  PORT_RECORD_SIZE,
  PORT_TABLE,
  slotOffset,
  validate,
} from "../../save-editor/format.js";
import { GOODS_NAMES } from "./ordinary-dialogue.js";

// Lines shown when the player walks into a townsperson (MAIN.EXE 0x0B800).
// See game-details/townspeople.md.

export const TOWNSPEOPLE = [
  "market-woman",
  "pub-man",
  "shipyard-woman",
  "lodge-man",
  "waving-man",
  "dog",
  "guard",
  "old-man",
] as const;

export type Townsperson = (typeof TOWNSPEOPLE)[number];

export interface TownspersonLine {
  readonly combinedIndex: number;
  readonly text: string;
}

const PORT_METADATA = 0x5968;
const PORT_METADATA_SIZE = 0x25;
const USED_SHIP_STOCK = 0x6e5c;
const SHIP_INSTANCE_TABLE = 0x47fc;
const SHIP_INSTANCE_SIZE = 0x18;
const SHIP_TEMPLATE_INSTANCE = 40;
const PLURAL_GOODS = new Set([40, 44]);

function cstring(bytes: Buffer): string {
  const end = bytes.indexOf(0);
  return bytes.subarray(0, end < 0 ? bytes.length : end).toString("latin1");
}

function format(template: string, args: readonly string[]): string {
  let next = 0;
  return template.replace(/%%|%l?[ds]/g, (token) =>
    token === "%%" ? "%" : (args[next++] ?? token),
  );
}

export function townspersonLines(
  save: Buffer,
  slot: number,
  who: Townsperson,
  messages: ReadonlyMap<number, string>,
): TownspersonLine[] {
  validate(save);
  const base = slotOffset(slot);
  const portId = save[base + 0x0a]!;
  if (portId >= 130) return [];
  const year = save[base + 6]!;
  const day = save[base + 8]!;
  // The three tip families use their second set of ten lines outside 1522 in
  // ports 0–41.
  const tips = year === 21 || portId >= 42 ? 0 : 30;
  const line = (
    combinedIndex: number,
    args: readonly string[] = [],
  ): TownspersonLine => ({
    combinedIndex,
    text: format(messages.get(combinedIndex) ?? "", args),
  });
  const portName = cstring(
    save.subarray(
      base + PORT_TABLE + portId * PORT_RECORD_SIZE + 4,
      base + PORT_TABLE + portId * PORT_RECORD_SIZE + 18,
    ),
  );

  switch (who) {
    case "market-woman":
      return portId < 100 ? [line(642 + portId)] : [];
    case "pub-man":
      return [line(1274 + (day % 10) + tips)];
    case "lodge-man":
      return [line(1264 + (day % 10) + tips)];
    case "waving-man":
      return portId >= 100
        ? [line(578, [portName])]
        : [line(1284 + (day % 10) + tips)];
    case "dog":
      return [line(619 + (portId % 3))];
    case "guard":
      return [line(622)];
    case "shipyard-woman": {
      const stock = save.subarray(
        base + USED_SHIP_STOCK,
        base + USED_SHIP_STOCK + 5,
      );
      const type = [...stock].find((value) => value !== 0xff);
      if (type === undefined) return [line(641)];
      const template =
        base +
        SHIP_INSTANCE_TABLE +
        (SHIP_TEMPLATE_INSTANCE + type) * SHIP_INSTANCE_SIZE;
      return [line(640, [cstring(save.subarray(template, template + 17))])];
    }
    case "old-man": {
      // Supply ports have no port metadata record for the specialty lookup.
      if (portId >= 100) return [line(616)];
      const specialty =
        save[base + PORT_METADATA + portId * PORT_METADATA_SIZE + 0x1a]!;
      return specialty === 0xff
        ? [line(616), line(618)]
        : [
            line(616),
            line(617, [
              GOODS_NAMES[specialty] ?? `goods ${specialty}`,
              PLURAL_GOODS.has(specialty) ? "are" : "is",
            ]),
          ];
    }
  }
}
