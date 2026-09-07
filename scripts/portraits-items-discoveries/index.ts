import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  bit,
  decodeCString,
  decodePlanar,
  prepareOutput,
  repoRoot,
  writeJson,
  writePng,
} from "../shared.js";

const palette3 = [
  "000000",
  "00A060",
  "D04000",
  "F0A060",
  "0040D0",
  "00A0F0",
  "D060A0",
  "F0E0D0",
].map((hex) => [...Buffer.from(hex, "hex"), 255] as const);
const charPalette: Array<readonly number[] | undefined> = Array.from({
  length: 16,
});
for (const [value, hex] of [
  [0, "000000"],
  [2, "00A261"],
  [4, "D34100"],
  [6, "F3A261"],
  [8, "0041D3"],
  [10, "00A2F3"],
  [12, "D361A2"],
  [14, "F3E3D3"],
] as const)
  charPalette[value] = [...Buffer.from(hex, "hex"), 255];

async function kaoSheet(
  start: number,
  end: number,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const images: Uint8Array[] = [];
  for (let index = start; index < end; index++) {
    const raw = await readFile(
      join(repoRoot, "raw/KAO", `KAO.${String(index).padStart(3, "0")}`),
    );
    images.push(decodePlanar(raw, 8, 3, palette3).data);
  }
  const output = new Uint8Array(images.length * width * height * 3);
  for (let image = 0; image < images.length; image++)
    for (let row = 0; row < height; row++) {
      const source = row * width * 4;
      const target = (row * images.length * width + image * width) * 3;
      for (let pixel = 0; pixel < width; pixel++)
        output.set(
          images[image]!.subarray(source + pixel * 4, source + pixel * 4 + 3),
          target + pixel * 3,
        );
    }
  return output;
}

async function characters(output: string): Promise<void> {
  for (let character = 0; character < 7; character++) {
    const raw = await readFile(
      join(repoRoot, "raw/CHAR", `CHAR.${String(character).padStart(3, "0")}`),
    );
    const frames = character < 6 ? 8 : 24;
    const image = new Uint8Array(frames * 32 * 32 * 4);
    let pointer = 0;
    for (let frame = 0; frame < frames; frame++)
      for (let quadrant = 0; quadrant < 4; quadrant++) {
        for (let pixel = 0; pixel < 256; pixel++) {
          let colorIndex = 0;
          for (let plane = 0; plane < 4; plane++)
            colorIndex =
              (colorIndex << 1) | bit(raw, pointer + pixel + plane * 256);
          const transparent = bit(raw, pointer + pixel + 1024) === 1;
          const x = (quadrant % 2) * 16 + (pixel % 16);
          const y = Math.floor(quadrant / 2) * 16 + Math.floor(pixel / 16);
          const target = (y * frames * 32 + frame * 32 + x) * 4;
          image.set(
            transparent ? [0, 0, 0, 0] : charPalette[colorIndex]!,
            target,
          );
        }
        pointer += 1280;
      }
    await writePng(
      join(output, `char${character}.png`),
      image,
      frames * 32,
      32,
      4,
    );
  }
}

async function itemText(output: string): Promise<void> {
  const descriptionsRaw = await readFile(join(repoRoot, "raw/ITEM.MES"));
  const descriptions: string[] = [];
  for (let offset = 0; offset < descriptionsRaw.length; offset += 172)
    descriptions.push(
      decodeCString(descriptionsRaw.subarray(offset, offset + 172)),
    );
  const executable = await readFile(join(repoRoot, "raw/MAIN.EXE"));
  const items: Record<string, unknown> = {};
  let cursor = 277192;
  for (let index = 0; index < descriptions.length; index++) {
    const name = decodeCString(executable.subarray(cursor, cursor + 17));
    cursor += 17;
    const imageSlice = executable[cursor++]!;
    const price = executable.readUInt16LE(cursor) * 100;
    cursor += 2;
    const rating = executable[cursor++]!;
    const category = executable[cursor++]! + 1;
    const description = descriptions[index]!;
    if (
      ["106", "bendadecan", "chakuses", "Expiation", "Pardon", "null"].includes(
        name,
      ) ||
      description === "Expiation"
    )
      continue;
    if (name === "Reserve") break;
    items[String(index + 1)] = {
      name,
      description,
      price,
      imageSlice,
      rating,
      categoryId: String(category),
    };
  }
  const categories: Record<string, string> = {};
  cursor = 245902;
  for (let index = 1; index < 15; index++) {
    const end = executable.indexOf(0, cursor);
    categories[String(index)] = new TextDecoder()
      .decode(executable.subarray(cursor, end))
      .replaceAll("'", "’");
    cursor = end + 1;
  }
  await writeJson(join(output, "items.json"), items);
  await writeJson(join(output, "itemTypes.json"), categories);
}

export async function run(): Promise<void> {
  const output = await prepareOutput("portraits-items-discoveries");
  await writePng(
    join(output, "portraits.png"),
    await kaoSheet(0, 128, 64, 80),
    8192,
    80,
    3,
  );
  await writePng(
    join(output, "discoveries.png"),
    await kaoSheet(128, 227, 48, 48),
    4752,
    48,
    3,
  );
  await writePng(
    join(output, "items.png"),
    await kaoSheet(227, 270, 48, 48),
    2064,
    48,
    3,
  );
  await characters(output);
  await itemText(output);
}
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
