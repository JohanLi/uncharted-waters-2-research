export type Rgb = readonly [number, number, number];

const WORD_STRIDE = 160;

export const UW2_DOSBOX_PALETTE: ReadonlyArray<Rgb> = [
  [0, 0, 0],
  [0, 65, 211],
  [211, 65, 0],
  [243, 65, 195],
  [0, 162, 97],
  [0, 162, 243],
  [243, 162, 0],
  [243, 227, 211],
  [113, 113, 146],
  [162, 162, 195],
  [211, 113, 65],
  [0, 97, 195],
  [0, 97, 97],
  [113, 81, 97],
  [162, 113, 81],
  [0, 65, 178],
];

export interface DecodedGraphImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export function readGraphOffsets(data: Buffer): number[] | undefined {
  if (data.length < 4) return undefined;
  const firstOffset = data.readUInt32BE(0);
  if (firstOffset < 4 || firstOffset > data.length || firstOffset % 4 !== 0)
    return undefined;

  const offsets = Array.from({ length: firstOffset / 4 }, (_, index) =>
    data.readUInt32BE(index * 4),
  );
  if (
    offsets[0] !== firstOffset ||
    offsets.some((offset) => offset < firstOffset || offset > data.length) ||
    offsets.some(
      (offset, index) =>
        index < offsets.length - 1 && offset >= offsets[index + 1]!,
    )
  )
    return undefined;

  return [...offsets, data.length];
}

export function readGraphRecords(data: Buffer): Buffer[] {
  const offsets = readGraphOffsets(data);
  if (!offsets) throw new Error("Invalid GRAPH offset table");
  return offsets
    .slice(0, -1)
    .map((offset, index) => data.subarray(offset, offsets[index + 1]));
}

function readTableValue(
  record: Buffer,
  position: number,
  command: number,
  table: readonly number[],
): readonly [value: number, count: number, position: number] {
  const count = (command & 0x07) + 1;
  const mode = command & 0x78;
  if (mode === 0) return [0, count, position];
  if ((command & 0x40) !== 0)
    return [table[(mode >> 3) & 0x07]!, count, position];
  if (mode === 0x38) {
    if (position + 1 >= record.length)
      throw new Error("GRAPH record ended inside a literal word");
    return [
      record[position + 1]! | (record[position]! << 8),
      count,
      position + 2,
    ];
  }

  const decodeCase = Math.floor(((mode - 0x08) >> 2) / 2);
  const byte = record[position];
  if (byte === undefined)
    throw new Error("GRAPH record ended inside a literal byte");
  let value: number;
  switch (decodeCase) {
    case 0:
      value = byte;
      break;
    case 1:
      value = (byte & 0x0f) | ((byte & 0xf0) << 4);
      break;
    case 2:
      value = (byte & 0x0f) | ((byte & 0xf0) << 8);
      break;
    case 3:
      value = (byte << 4) & 0xffff;
      break;
    case 4:
      value = ((byte & 0x0f) << 4) | ((byte & 0xf0) << 8);
      break;
    case 5:
      value = (byte << 8) & 0xffff;
      break;
    default:
      throw new Error(`Unsupported table low-command case ${decodeCase}`);
  }
  return [value, count, position + 1];
}

export function decodeGraphRecord(
  record: Buffer,
  palette: ReadonlyArray<Rgb> = UW2_DOSBOX_PALETTE,
): DecodedGraphImage {
  if (record.length < 20) throw new Error("GRAPH record is too short");
  const width = record.readUInt16LE(0);
  const height = record.readUInt16LE(2);
  const table = Array.from({ length: 8 }, (_, index) =>
    record.readUInt16LE(4 + index * 2),
  );
  let position = 20;
  const unitsPerRow = Math.ceil(width / 4);
  const words = new Uint16Array(WORD_STRIDE * height + unitsPerRow + 8);

  for (let row = 0; row < height; row++) {
    let output = row * WORD_STRIDE;
    let remaining = unitsPerRow;
    while (remaining > 0) {
      const command = record[position++];
      if (command === undefined)
        throw new Error(`GRAPH record ended while decoding row ${row}`);
      if ((command & 0x80) !== 0) {
        const count = (command & 0x0f) + 1;
        const distance = ((command >> 4) & 0x03) + 1;
        let source =
          output - ((command & 0x40) !== 0 ? distance * WORD_STRIDE : distance);
        for (let index = 0; index < count; index++) {
          words[output++] = source >= 0 ? words[source]! : 0;
          source++;
        }
        remaining -= count;
      } else {
        const [value, count, nextPosition] = readTableValue(
          record,
          position,
          command,
          table,
        );
        position = nextPosition;
        for (let index = 0; index < count; index++) words[output++] = value;
        remaining -= count;
      }
    }
  }

  if (position !== record.length)
    throw new Error(
      `GRAPH record decoded ${position} of ${record.length} bytes`,
    );

  return {
    width,
    height,
    pixels: wordsToPixels(words, width, height, palette),
  };
}

export function wordsToPixels(
  words: Uint16Array,
  width: number,
  height: number,
  palette: ReadonlyArray<Rgb>,
): Uint8Array {
  const pixels = new Uint8Array(width * height * 3);
  let pixel = 0;
  for (let row = 0; row < height; row++) {
    for (let group = 0; group < Math.ceil(width / 4); group++) {
      const word = words[row * WORD_STRIDE + group]!;
      const masks = [
        word & 0x0f,
        (word >> 4) & 0x0f,
        (word >> 8) & 0x0f,
        (word >> 12) & 0x0f,
      ];
      for (const sourceBit of [3, 2, 1, 0]) {
        let colorIndex = 0;
        for (let plane = 0; plane < 4; plane++)
          colorIndex |= ((masks[plane]! >> sourceBit) & 1) << plane;
        if (pixel < width * height)
          pixels.set(palette[colorIndex]!, pixel++ * 3);
      }
    }
  }
  return pixels;
}
