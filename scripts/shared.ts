import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function prepareOutput(directory: string): Promise<string> {
  const output = resolve(repoRoot, "scripts", directory, "output");
  await mkdir(output, { recursive: true });
  return output;
}

export function bit(bytes: Uint8Array, index: number): number {
  return (bytes[Math.floor(index / 8)]! >> (7 - (index % 8))) & 1;
}

export function decodePlanar(
  bytes: Uint8Array,
  pixelsPerBlock: number,
  planes: number,
  palette: ReadonlyArray<readonly number[] | undefined>,
): { data: Uint8Array; channels: number } {
  const channels = palette.find(Boolean)!.length;
  const blockBits = pixelsPerBlock * planes;
  const blocks = Math.floor((bytes.length * 8) / blockBits);
  const data = new Uint8Array(blocks * pixelsPerBlock * channels);
  for (let block = 0; block < blocks; block++) {
    for (let pixel = 0; pixel < pixelsPerBlock; pixel++) {
      let value = 0;
      for (let plane = 0; plane < planes; plane++)
        value =
          (value << 1) |
          bit(bytes, block * blockBits + pixel + plane * pixelsPerBlock);
      const color = palette[value];
      if (!color) throw new Error(`Missing palette value ${value}`);
      data.set(color, (block * pixelsPerBlock + pixel) * channels);
    }
  }
  return { data, channels };
}

export async function writePng(
  path: string,
  data: Uint8Array,
  width: number,
  height: number,
  channels: 3 | 4,
): Promise<void> {
  await sharp(data, { raw: { width, height, channels } }).png().toFile(path);
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2));
}

export function decodeCString(bytes: Uint8Array): string {
  const end = bytes.indexOf(0);
  return new TextDecoder()
    .decode(end < 0 ? bytes : bytes.subarray(0, end))
    .replaceAll("'", "’");
}
