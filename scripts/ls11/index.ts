// KOEI's LS10/LS11 archives (the game's `.LZW` files). Despite the extension
// they are not LZW but LZSS with gamma-like codes; the format is described at
// https://sites.google.com/site/drrkdriller/uncharted-waters-2/lsw.
//
// Layout, all integers big-endian:
//   0x000  "LS10" or "LS11", then 12 zero bytes
//   0x010  256-byte table: literal code n stands for byte table[n]
//   0x110  12-byte entries (compressed size, original size, offset), ended by
//          a zero compressed size
// Every entry is compressed, even when both sizes are equal. The two magics
// share the same layout and codes.

export interface Ls11Entry {
  readonly compressedSize: number;
  readonly size: number;
  readonly offset: number;
}

export interface Ls11Archive {
  readonly magic: string;
  readonly table: Uint8Array;
  readonly entries: readonly Ls11Entry[];
}

const TABLE = 0x10;
const ENTRIES = 0x110;
const MIN_MATCH = 3;

/** Code class m covers 2^m − 2 … 2^(m+1) − 3 and takes 2m bits. */
const codeClass = (value: number) => Math.floor(Math.log2(value + 2));
const codeBits = (value: number) => 2 * codeClass(value);

export function readArchive(data: Uint8Array): Ls11Archive {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const magic = String.fromCharCode(...data.subarray(0, 4));
  if (magic !== "LS10" && magic !== "LS11")
    throw new Error(`Not an LS10/LS11 archive: ${magic}`);
  const entries: Ls11Entry[] = [];
  for (let p = ENTRIES; ; p += 12) {
    const compressedSize = view.getUint32(p);
    if (compressedSize === 0) break;
    entries.push({
      compressedSize,
      size: view.getUint32(p + 4),
      offset: view.getUint32(p + 8),
    });
  }
  return { magic, table: data.subarray(TABLE, TABLE + 256), entries };
}

export function decodeStream(
  data: Uint8Array,
  start: number,
  size: number,
  table: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(size);
  let bitPosition = start * 8;
  const bit = () => (data[bitPosition >> 3]! >> (7 - (bitPosition++ & 7))) & 1;
  const code = () => {
    let m = 1;
    while (bit()) m++;
    let value = 0;
    for (let i = 0; i < m; i++) value = (value << 1) | bit();
    return value + (1 << m) - 2;
  };
  for (let o = 0; o < size;) {
    const value = code();
    if (value < 256) {
      out[o++] = table[value]!;
      continue;
    }
    const distance = value - 256;
    const length = code() + MIN_MATCH;
    for (let i = 0; i < length && o < size; i++, o++)
      out[o] = out[o - distance]!;
  }
  return out;
}

export function decodeEntry(
  data: Uint8Array,
  archive: Ls11Archive,
  index: number,
): Uint8Array {
  const entry = archive.entries[index];
  if (!entry) throw new Error(`No entry ${index}`);
  return decodeStream(data, entry.offset, entry.size, archive.table);
}

export function decodeArchive(data: Uint8Array): Uint8Array[] {
  const archive = readArchive(data);
  return archive.entries.map((_, index) => decodeEntry(data, archive, index));
}

class BitWriter {
  private readonly bytes: number[] = [];
  private current = 0;
  private count = 0;

  bit(value: number) {
    this.current = (this.current << 1) | value;
    if (++this.count === 8) {
      this.bytes.push(this.current);
      this.current = 0;
      this.count = 0;
    }
  }

  bits(value: number, count: number) {
    for (let i = count - 1; i >= 0; i--) this.bit((value >> i) & 1);
  }

  code(value: number) {
    const m = codeClass(value);
    this.bits(((1 << (m - 1)) - 1) << 1, m);
    this.bits(value - ((1 << m) - 2), m);
  }

  finish(): Uint8Array {
    if (this.count) this.bytes.push(this.current << (8 - this.count));
    return Uint8Array.from(this.bytes);
  }
}

/**
 * Smallest stream for `data` given each byte's literal code: a shortest-path
 * parse over every literal and every match at every distance. Quadratic in
 * the entry's size.
 */
export function encodeStream(
  data: Uint8Array,
  literalCode: ArrayLike<number>,
): { bytes: Uint8Array; literals: Uint32Array } {
  const n = data.length;
  const cost = new Float64Array(n + 1);
  const length = new Int32Array(n + 1);
  const distance = new Int32Array(n + 1);
  // matchNext[d] / matchHere[d]: match length at i + 1 / i with distance d
  let matchNext = new Int32Array(n + 1);
  let matchHere = new Int32Array(n + 1);
  for (let i = n - 1; i >= 0; i--) {
    for (let d = 1; d <= i; d++)
      matchHere[d] = data[i] === data[i - d] ? matchNext[d]! + 1 : 0;
    cost[i] = codeBits(literalCode[data[i]!]!) + cost[i + 1]!;
    length[i] = 1;
    distance[i] = 0;
    let longest = 0;
    for (let d = 1; d <= i; d++) {
      const available = matchHere[d]!;
      if (available <= longest || available < MIN_MATCH) continue;
      const distanceBits = codeBits(256 + d);
      for (let l = Math.max(MIN_MATCH, longest + 1); l <= available; l++) {
        const c = distanceBits + codeBits(l - MIN_MATCH) + cost[i + l]!;
        if (c < cost[i]!) {
          cost[i] = c;
          length[i] = l;
          distance[i] = d;
        }
      }
      longest = available;
    }
    [matchNext, matchHere] = [matchHere, matchNext];
  }
  const writer = new BitWriter();
  const literals = new Uint32Array(256);
  for (let i = 0; i < n;) {
    if (distance[i] === 0) {
      writer.code(literalCode[data[i]!]!);
      literals[data[i]!]!++;
      i++;
    } else {
      writer.code(256 + distance[i]!);
      writer.code(length[i]! - MIN_MATCH);
      i += length[i]!;
    }
  }
  return { bytes: writer.finish(), literals };
}

/** Bytes ranked by count, most common first; ties by byte value. */
function rankTable(counts: ArrayLike<number>) {
  const table = Uint8Array.from(
    [...Array(256).keys()].sort((a, b) => counts[b]! - counts[a]! || a - b),
  );
  const literalCode = new Uint16Array(256);
  table.forEach((byte, rank) => (literalCode[byte] = rank));
  return { table, literalCode };
}

/**
 * Builds an archive the game's decoder reads. The table starts from the
 * files' byte counts and is re-ranked by the literals the parse actually
 * emits, `passes` times in all.
 */
export function encodeArchive(
  files: readonly Uint8Array[],
  magic: "LS10" | "LS11" = "LS11",
  passes = 3,
): Uint8Array {
  const counts = new Uint32Array(256);
  for (const file of files) for (const byte of file) counts[byte]!++;
  let { table, literalCode } = rankTable(counts);
  let streams: Uint8Array[] = [];
  for (let pass = 0; pass < passes; pass++) {
    const encoded = files.map((file) => encodeStream(file, literalCode));
    streams = encoded.map((stream) => stream.bytes);
    if (pass === passes - 1) break;
    const used = new Uint32Array(256);
    for (const stream of encoded)
      stream.literals.forEach((count, byte) => (used[byte]! += count));
    ({ table, literalCode } = rankTable(used));
  }

  const header = ENTRIES + 12 * files.length + 4;
  const out = new Uint8Array(
    header + streams.reduce((total, stream) => total + stream.length, 0),
  );
  const view = new DataView(out.buffer);
  out.set([...magic].map((c) => c.charCodeAt(0)));
  out.set(table, TABLE);
  let offset = header;
  streams.forEach((stream, index) => {
    const p = ENTRIES + 12 * index;
    view.setUint32(p, stream.length);
    view.setUint32(p + 4, files[index]!.length);
    view.setUint32(p + 8, offset);
    out.set(stream, offset);
    offset += stream.length;
  });
  return out;
}
