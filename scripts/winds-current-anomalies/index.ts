import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { prepareOutput, repoRoot } from "../shared.js";

const width = 2160,
  height = 1080;
function shift(data: Uint8Array) {
  const out = new Uint8Array(data.length);
  for (let row = 0; row < 15; row++)
    for (let col = 0; col < 30; col++)
      out[row * 30 + ((col + 10) % 30)] = data[row * 30 + col]!;
  return out;
}
function svg(labels: string[], font: string, centered = false) {
  const cells = labels
    .map((label, index) => {
      const x = (index % 30) * 72,
        y = Math.floor(index / 30) * 72;
      if (!centered)
        return `<text x="${x + 4}" y="${y + 4}" dominant-baseline="hanging">${label}</text>`;
      const lines = label.split("\n");
      return lines
        .map(
          (line, lineIndex) =>
            `<text x="${x + 36}" y="${y + 31 + lineIndex * 18}" text-anchor="middle">${line}</text>`,
        )
        .join("");
    })
    .join("");
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${centered ? '<rect width="100%" height="100%" fill="white"/>' : ""}<style>@font-face{font-family:r;src:url(data:font/ttf;base64,${font})}text{font-family:r;font-size:16px;font-weight:bold;fill:black}</style>${cells}</svg>`,
  );
}
async function raw(path: string) {
  return (
    await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  ).data;
}
async function overlay(inputs: OverlayOptions[]) {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite(inputs)
    .raw()
    .toBuffer();
}
function blend(base: Uint8Array, top: Uint8Array) {
  const out = new Uint8Array(base.length);
  for (let i = 0; i < out.length; i++)
    out[i] = Math.floor(base[i]! * 0.25 + top[i]! * 0.75);
  return out;
}
export async function run(): Promise<void> {
  const output = await prepareOutput("winds-current-anomalies"),
    bytes = await readFile(join(repoRoot, "raw/WINDCUR.DAT")),
    font = (await readFile(join(repoRoot, "assets/Roboto-Bold.ttf"))).toString(
      "base64",
    );
  const world = await raw(join(repoRoot, "assets/world-map.png")),
    grid = join(repoRoot, "assets/world-map-grid.png");
  const parts = [
    shift(bytes.subarray(0, 450)),
    shift(bytes.subarray(450, 900)),
    shift(bytes.subarray(900, 1350)),
  ];
  for (const [part, name] of [
    "summer-winds",
    "winter-winds",
    "ocean-current",
  ].entries()) {
    const values = parts[part]!,
      icons: OverlayOptions[] = [],
      speeds: string[] = [];
    for (let index = 0; index < 450; index++) {
      const value = values[index]!;
      icons.push({
        input: join(repoRoot, "assets/arrows", `${(value >> 3) & 7}.png`),
        left: (index % 30) * 72,
        top: Math.floor(index / 30) * 72,
      });
      speeds.push(String(value & 7));
    }
    const combined = await overlay([
      ...icons,
      { input: svg(speeds, font), left: 0, top: 0 },
      { input: grid, left: 0, top: 0 },
    ]);
    await sharp(blend(world, combined), { raw: { width, height, channels: 4 } })
      .png()
      .toFile(join(output, `world-map-${name}.png`));
  }
  const names = ["Storm", "Fog", "No Wind", "Storm +\nMissing", "?", ""];
  const mapping: Record<number, number> = {
    9: 0,
    11: 1,
    10: 2,
    13: 3,
    4: 4,
    0: 5,
  };
  const labels: string[] = [];
  for (let index = 0; index < 450; index++) {
    const key = ((parts[0]![index]! >> 6) << 2) | (parts[2]![index]! >> 6);
    labels.push(names[mapping[key]!]!);
  }
  const anomalies = await overlay([
    { input: svg(labels, font, true), left: 0, top: 0 },
    { input: grid, left: 0, top: 0 },
  ]);
  await sharp(blend(world, anomalies), { raw: { width, height, channels: 4 } })
    .png()
    .toFile(join(output, "world-map-anomalies.png"));
}
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
