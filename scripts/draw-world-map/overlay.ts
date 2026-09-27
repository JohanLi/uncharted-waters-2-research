import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

// Helpers for drawing SVG overlays on a flat-coloured world map, one pixel per
// tile. They read the combined map written by `pnpm draw-world-map`.

export const MAP_WIDTH = 2160;
export const MAP_HEIGHT = 1080;

/**
 * Game and save X 0 is the left edge of WORLDMAP.000 (Europe/Africa), which
 * `combineWorldMaps` places after the 720-column Americas part:
 * map x = (save x + 720) mod 2160.
 */
export const SAVE_X_OFFSET = 720;

export const mapX = (saveX: number): number =>
  (saveX + SAVE_X_OFFSET) % MAP_WIDTH;

export type TileColour = (tile: number) => [number, number, number];

const worldMapPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "output",
  "world-map.bin",
);

/** The combined world map as RGB pixels, one per tile. */
export async function colourWorldMap(colour: TileColour): Promise<Buffer> {
  const worldMap = await readFile(worldMapPath);
  const pixels = Buffer.alloc(MAP_WIDTH * MAP_HEIGHT * 3);
  for (let index = 0; index < MAP_WIDTH * MAP_HEIGHT; index += 1) {
    pixels.set(colour(worldMap[index]!), index * 3);
  }
  return pixels;
}

export async function writeOverlayPng(
  path: string,
  pixels: Buffer,
  svg: string,
): Promise<void> {
  await sharp(pixels, {
    raw: { width: MAP_WIDTH, height: MAP_HEIGHT, channels: 3 },
  })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toFile(path);
}
