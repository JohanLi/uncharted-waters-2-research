import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { bit, prepareOutput, repoRoot, writePng } from "../shared.js";

const colors: Array<readonly number[] | undefined> = Array.from({ length: 16 });
for (const [value, hex] of [
  [0, "000000"],
  [2, "00A261"],
  [4, "D34100"],
  [6, "F3A200"],
  [8, "0041D3"],
  [9, "0040D0"],
  [10, "00A2F3"],
  [12, "F341C3"],
  [13, "F040C0"],
  [14, "F3E3D3"],
] as const)
  colors[value] = [...Buffer.from(hex, "hex"), 255];
colors[1] = [0, 0, 0, 0];

async function extractFamily(
  family: string,
  files: number,
  output: string,
): Promise<void> {
  for (let fileIndex = 0; fileIndex < files; fileIndex++) {
    const base = `${family}.${String(fileIndex).padStart(3, "0")}`;
    const raw = await readFile(join(repoRoot, "raw", family, base));
    const metadataCount = raw.readUInt32BE(4) / 8;
    for (let sprite = 0; sprite < metadataCount; sprite++) {
      const offset = sprite * 8;
      const columns = raw[offset + 2]!;
      const rows = raw[offset + 3]!;
      const start = raw.readUInt32BE(offset + 4);
      const source = raw.subarray(start, start + columns * 4 * rows);
      const pixels = new Uint8Array(rows * columns * 8 * 4);
      for (let group = 0; group < source.length / 4; group++)
        for (let pixel = 0; pixel < 8; pixel++) {
          let value = 0;
          for (let plane = 0; plane < 4; plane++)
            value = (value << 1) | bit(source, group * 32 + pixel + plane * 8);
          const color = colors[value];
          if (!color) throw new Error(`Missing duel palette value ${value}`);
          pixels.set(color, (group * 8 + pixel) * 4);
        }
      await writePng(
        join(output, `${base}-${sprite}.png`),
        pixels,
        columns * 8,
        rows,
        4,
      );
    }
  }
}

export async function run(): Promise<void> {
  const output = await prepareOutput("dueling");
  await extractFamily("IAE1", 35, output);
  for (let player = 1; player <= 6; player++)
    await extractFamily(`IAP${player}`, 35, output);
}
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
