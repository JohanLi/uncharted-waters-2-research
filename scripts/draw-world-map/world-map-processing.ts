import type { ByteGrid } from "./grid.js";

// Terrain passes of the sea-view loader, MAIN.EXE 0x284F9. The game builds a
// window of 3 × 3 blocks (72 × 72 tiles) around the fleet; these functions run
// the same passes over a whole 1080 × 720 map part, which gives the same tiles
// away from the window edges.

const FIRST_FIXED_LARGE_TILE = 0x13;
const FIRST_KEPT_TILE = 0x34;
const FIRST_LAND_TILE = 0x29;
const DESERT = 0x59;
const DESERT_OFFSET = 0x18;
const WATER_TABLE = 0x100;

/** Climate added to plain land, coasts and rivers: 0x41, 0x49 or 0x51. */
export function climateOffset(row: number): number {
  const blockRow = Math.floor(row / 24);
  if (blockRow === 0 || blockRow === 44) return 0x10;
  return blockRow >= 14 && blockRow <= 30 ? 0 : 8;
}

/**
 * First pass (0x282AA): large tiles 0x00–0x0F are already land/sea quadrants;
 * larger ones keep only their tiles from 0x34 up, the rest become sea.
 */
export function keepLandTiles(
  expanded: ByteGrid,
  largeMap: ByteGrid,
): ByteGrid {
  const data = expanded.data.slice();
  for (let row = 0; row < expanded.rows; row += 1) {
    const largeRow = (row >> 1) * largeMap.columns;
    for (let column = 0; column < expanded.columns; column += 1) {
      const index = row * expanded.columns + column;
      if (
        largeMap.data[largeRow + (column >> 1)]! >= 0x10 &&
        data[index]! < FIRST_KEPT_TILE
      ) {
        data[index] = 0;
      }
    }
  }
  return { rows: expanded.rows, columns: expanded.columns, data };
}

/**
 * Second pass (0x277C0): every tile below the desert is replaced through the
 * DATA1.010 table, indexed by its eight neighbours (land = tile 0x29 or more,
 * off-map neighbours repeat the nearest tile) plus 0x100 for a sea tile. A
 * non-zero entry gets the climate offset, or 0x18 instead when a side
 * neighbour is desert. Tiles are updated in place, so the tiles above and to
 * the left are tested after their own update and desert spreads right and down.
 * `firstRow` is the map row of the grid's first row, for the climate bands.
 */
export function applyCoastTable(
  worldMap: ByteGrid,
  coastTable: Uint8Array,
  firstRow = 0,
): ByteGrid {
  const { rows, columns, data } = worldMap;
  const land = data.map((tile) => (tile >= FIRST_LAND_TILE ? 1 : 0));
  const isLand = (row: number, column: number): number =>
    land[
      Math.min(Math.max(row, 0), rows - 1) * columns +
        Math.min(Math.max(column, 0), columns - 1)
    ]!;

  for (let row = 0; row < rows; row += 1) {
    const climate = climateOffset(firstRow + row);
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (data[index]! >= DESERT) continue;

      const signature =
        (isLand(row - 1, column - 1) << 7) |
        (isLand(row, column - 1) << 6) |
        (isLand(row + 1, column - 1) << 5) |
        (isLand(row + 1, column) << 4) |
        (isLand(row + 1, column + 1) << 3) |
        (isLand(row, column + 1) << 2) |
        (isLand(row - 1, column + 1) << 1) |
        isLand(row - 1, column);
      const tile = coastTable[signature | (land[index] ? 0 : WATER_TABLE)]!;
      const besideDesert =
        (row > 0 && data[index - columns] === DESERT) ||
        (column > 0 && data[index - 1] === DESERT) ||
        (column < columns - 1 && data[index + 1] === DESERT) ||
        (row < rows - 1 && data[index + columns] === DESERT);
      data[index] =
        tile === 0 ? 0 : tile + (besideDesert ? DESERT_OFFSET : climate);
    }
  }
  return worldMap;
}

/**
 * Third pass (0x284F9): large tiles from 0x13 up are drawn exactly as stored,
 * replacing whatever the coast pass made of them. Ports (0x10, 0x12) and
 * villages (0x11) keep the coast-pass result; the game draws an unknown port
 * or an unsighted village as plain land instead, which this reference map
 * does not do.
 */
export function restoreFixedLargeTiles(
  worldMap: ByteGrid,
  expanded: ByteGrid,
  largeMap: ByteGrid,
): ByteGrid {
  for (let row = 0; row < worldMap.rows; row += 1) {
    const largeRow = (row >> 1) * largeMap.columns;
    for (let column = 0; column < worldMap.columns; column += 1) {
      const largeTile = largeMap.data[largeRow + (column >> 1)]!;
      if (largeTile >= FIRST_FIXED_LARGE_TILE) {
        const index = row * worldMap.columns + column;
        worldMap.data[index] = expanded.data[index]!;
      }
    }
  }
  return worldMap;
}
