import { readFile } from "node:fs/promises";

import sharp from "sharp";

import { writePng } from "../shared.js";

export interface SheetImage {
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export async function writeContactSheet(
  outputPath: string,
  images: readonly SheetImage[],
  options: {
    readonly thumbnailWidth: number;
    readonly thumbnailHeight: number;
    readonly columns: number;
    readonly gap: number;
    readonly fit: boolean;
  },
): Promise<void> {
  if (images.length === 0) return;
  const rows = Math.ceil(images.length / options.columns);
  const width =
    options.columns * options.thumbnailWidth +
    (options.columns - 1) * options.gap;
  const height = rows * options.thumbnailHeight + (rows - 1) * options.gap;
  const pixels = new Uint8Array(width * height * 3).fill(32);

  for (const [index, image] of images.entries()) {
    const source = await sharp(await readFile(image.path))
      .raw()
      .toBuffer();
    const scale = options.fit
      ? Math.min(
          options.thumbnailWidth / image.width,
          options.thumbnailHeight / image.height,
        )
      : 1;
    const targetWidth = Math.max(1, Math.floor(image.width * scale));
    const targetHeight = Math.max(1, Math.floor(image.height * scale));
    const cellX =
      (index % options.columns) * (options.thumbnailWidth + options.gap);
    const cellY =
      Math.floor(index / options.columns) *
      (options.thumbnailHeight + options.gap);
    const targetX =
      cellX + Math.floor((options.thumbnailWidth - targetWidth) / 2);
    const targetY =
      cellY + Math.floor((options.thumbnailHeight - targetHeight) / 2);

    for (let y = 0; y < targetHeight; y++) {
      const sourceY = Math.min(image.height - 1, Math.floor(y / scale));
      for (let x = 0; x < targetWidth; x++) {
        const sourceX = Math.min(image.width - 1, Math.floor(x / scale));
        const sourceOffset = (sourceY * image.width + sourceX) * 3;
        const targetOffset = ((targetY + y) * width + targetX + x) * 3;
        pixels.set(
          source.subarray(sourceOffset, sourceOffset + 3),
          targetOffset,
        );
      }
    }
  }

  await writePng(outputPath, pixels, width, height, 3);
}
