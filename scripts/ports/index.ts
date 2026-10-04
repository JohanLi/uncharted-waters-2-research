import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  decodeCString,
  decodePlanar,
  prepareOutput,
  repoRoot,
  writeJson,
  writePng,
} from "../shared.js";

const paletteHex: Record<string, string[]> = {
  dawn: [
    "000000",
    "8292A2",
    "00A261",
    "0061A2",
    "D34100",
    "A27100",
    "F3A261",
    "009282",
    "0041D3",
    "0041A2",
    "00A2F3",
    "003041",
    "D361A2",
    "928220",
    "F3E3D3",
    "D3E3F3",
  ],
  day: [
    "000000",
    "717192",
    "00A261",
    "0082F3",
    "D34100",
    "A26100",
    "F3A261",
    "00B261",
    "0041D3",
    "0041C3",
    "00A2F3",
    "007161",
    "D361A2",
    "E3B251",
    "F3E3D3",
    "F3E3D3",
  ],
  dusk: [
    "000000",
    "826130",
    "00A261",
    "617192",
    "D34100",
    "923000",
    "F3A261",
    "928261",
    "0041D3",
    "415192",
    "00A2F3",
    "004141",
    "D361A2",
    "C39271",
    "F3E3D3",
    "F3D3A2",
  ],
  night: [
    "000000",
    "414141",
    "00A261",
    "005161",
    "D34100",
    "614100",
    "F3A261",
    "004141",
    "0041D3",
    "004171",
    "00A2F3",
    "003041",
    "D361A2",
    "515130",
    "F3E3D3",
    "616171",
  ],
};
type Port = Record<string, unknown> & {
  name: string;
  position: { x: number; y: number };
};

export async function extractPortMetadata(): Promise<Port[]> {
  const data = await readFile(join(repoRoot, "raw/DATA1/DATA1.015"));
  const ports: Port[] = [];
  let cursor = 20286;
  for (let index = 0; index < 130; index++, cursor += 20) {
    let x = data.readUInt16LE(cursor + 2);
    if (x >= 1440) x -= 1440;
    else x += 720;
    ports.push({
      name: decodeCString(data.subarray(cursor + 6, cursor + 20)),
      position: { x, y: data.readUInt16LE(cursor + 4) },
    });
  }
  cursor = 22886;
  for (let index = 0; index < 100; index++, cursor += 37) {
    const port = ports[index]!;
    port.economy = data.readUInt16LE(cursor + 2);
    port.industry = data.readUInt16LE(cursor + 6);
    port.allegiances = [...data.subarray(cursor + 10, cursor + 16)];
    port.regionId = String(data[cursor + 30]!);
    const regular = [...data.subarray(cursor + 31, cursor + 34)]
      .filter((x) => x !== 0xff)
      .map(String);
    const secret = data[cursor + 34]!;
    if (regular.length)
      port.itemShop = {
        regular,
        ...(secret !== 0xff ? { secret: String(secret) } : {}),
      };
    port.marketId = String(data[cursor + 35]!);
    port.industryId = String(data[cursor + 36]!);
  }
  const locations = await readFile(join(repoRoot, "raw/ZA_DAT.DAT"));
  cursor = 0;
  for (let index = 0; index < 101; index++) {
    const buildings: Record<string, { x: number; y: number }> = {};
    for (let building = 0; building < 12; building++) {
      const x = locations[cursor++]!,
        y = locations[cursor++]!;
      if (!((x === 255 && y === 255) || (x === 0 && y === 0)))
        buildings[String(building)] = { x, y };
    }
    ports[index]!.buildings = buildings;
  }
  const chips = await readFile(join(repoRoot, "raw/CHIP_NO.DAT"));
  for (let index = 0; index < 100; index++)
    ports[index]!.tileset = chips[index]!;
  return ports;
}

async function readTileset(set: number, time: string): Promise<Uint8Array> {
  const raw = await readFile(
    join(
      repoRoot,
      "raw/PORTCHIP",
      `PORTCHIP.${String(set * 2).padStart(3, "0")}`,
    ),
  );
  const palette = paletteHex[time]!.map((hex) => [...Buffer.from(hex, "hex")]);
  return decodePlanar(raw, 256, 4, palette).data;
}

const TOWN_TILES = 96;

// Each town as a day-palette picture: PORTMAP.nnn is 96 × 96 tile numbers
// into the port's PORTCHIP tileset (CHIP_NO.DAT), 16 × 16 pixels each. The
// 30 supply ports share map 100, drawn with tileset 0.
async function drawTownMaps(
  output: string,
  maps: Buffer[],
  ports: Port[],
): Promise<void> {
  const directory = join(output, "town-maps");
  await mkdir(directory, { recursive: true });
  const tilesets = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map((set) => readTileset(set, "day")),
  );
  const size = TOWN_TILES * 16;
  for (const [index, map] of maps.entries()) {
    const tiles = tilesets[(ports[index]?.tileset as number | undefined) ?? 0]!;
    const image = new Uint8Array(size * size * 3);
    for (let cell = 0; cell < TOWN_TILES * TOWN_TILES; cell++) {
      const tile = map[cell]!,
        x = (cell % TOWN_TILES) * 16,
        y = Math.floor(cell / TOWN_TILES) * 16;
      for (let row = 0; row < 16; row++) {
        const src = (tile * 256 + row * 16) * 3;
        image.set(tiles.subarray(src, src + 48), ((y + row) * size + x) * 3);
      }
    }
    // The 16 colours make a lossless palette PNG.
    await sharp(image, { raw: { width: size, height: size, channels: 3 } })
      .png({ palette: true, colours: 16, dither: 0, compressionLevel: 9 })
      .toFile(join(directory, `${String(index).padStart(3, "0")}.png`));
  }
}

async function drawTilesets(output: string): Promise<void> {
  const width = 240 * 16,
    height = 7 * 4 * 16,
    image = new Uint8Array(width * height * 3);
  let strip = 0;
  for (let set = 0; set < 7; set++)
    for (const time of ["dawn", "day", "dusk", "night"]) {
      const tiles = await readTileset(set, time);
      for (let tile = 0; tile < 240; tile++)
        for (let row = 0; row < 16; row++) {
          const src = (tile * 256 + row * 16) * 3,
            dst = ((strip * 16 + row) * width + tile * 16) * 3;
          image.set(tiles.subarray(src, src + 48), dst);
        }
      strip++;
    }
  await writePng(join(output, "port-tilesets.png"), image, width, height, 3);
}

export async function run(): Promise<void> {
  const output = await prepareOutput("ports");
  const chunks = [];
  for (let index = 0; index < 101; index++)
    chunks.push(
      await readFile(
        join(
          repoRoot,
          "raw/PORTMAP",
          `PORTMAP.${String(index).padStart(3, "0")}`,
        ),
      ),
    );
  await writeFile(join(output, "port-tilemaps.bin"), Buffer.concat(chunks));
  const ports = await extractPortMetadata();
  await writeJson(join(output, "ports.json"), ports);
  await drawTilesets(output);
  await drawTownMaps(output, chunks, ports);
}
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
