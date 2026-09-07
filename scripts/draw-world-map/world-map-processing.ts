import { cloneGrid, getCell, setCell, type ByteGrid } from "./grid.js";

const LAND_TILES = new Set([
  ...range(51, 65),
  73,
  81,
  89,
  97,
  ...range(105, 127),
]);
const DESERT_TILES = new Set([
  25, 26, 28, 29, 30, 31, 32, 89, 105, 106, 107, 108, 109, 110, 111, 112, 113,
  114,
]);

interface Position {
  readonly row: number;
  readonly column: number;
}

interface DesertCoastOffset extends Position {
  readonly desertTiles: ReadonlySet<number>;
}

export interface ProcessingContext {
  readonly possibleDesertCoasts: Position[];
  readonly possibleDesertCoastKeys: Set<string>;
}

export function createProcessingContext(): ProcessingContext {
  return { possibleDesertCoasts: [], possibleDesertCoastKeys: new Set() };
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function fillDeserts(worldMap: ByteGrid): ByteGrid {
  for (let column = 0; column < worldMap.columns; column += 1) {
    for (let row = 0; row < worldMap.rows; row += 1) {
      if (getCell(worldMap, row, column) !== 89) {
        continue;
      }
      if (
        column + 1 < worldMap.columns &&
        getCell(worldMap, row, column + 1) === 65
      ) {
        setCell(worldMap, row, column + 1, 89);
      }
      if (
        row + 1 < worldMap.rows &&
        getCell(worldMap, row + 1, column) === 65
      ) {
        setCell(worldMap, row + 1, column, 89);
      }
    }
  }
  return worldMap;
}

const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

export function replaceCoasts(
  worldMap: ByteGrid,
  coastalMap: Uint8Array,
  context: ProcessingContext,
): ByteGrid {
  const original = cloneGrid(worldMap);

  for (let row = 0; row < original.rows; row += 1) {
    for (let column = 0; column < original.columns; column += 1) {
      if (getCell(original, row, column) !== 0) {
        continue;
      }

      let signature = 1;
      for (const [rowOffset, columnOffset] of NEIGHBOR_OFFSETS) {
        const neighborRow = row + rowOffset;
        const neighborColumn = column + columnOffset;
        signature <<= 1;

        if (
          neighborRow < 0 ||
          neighborColumn < 0 ||
          neighborRow >= original.rows ||
          neighborColumn >= original.columns
        ) {
          continue;
        }

        const neighbor = getCell(original, neighborRow, neighborColumn);
        if (LAND_TILES.has(neighbor)) {
          signature |= 1;
          if (DESERT_TILES.has(neighbor)) {
            const key = `${row},${column}`;
            if (!context.possibleDesertCoastKeys.has(key)) {
              context.possibleDesertCoastKeys.add(key);
              context.possibleDesertCoasts.push({ row, column });
            }
          }
        }
      }

      const coastTile = coastalMap[signature];
      if (coastTile === undefined) {
        throw new Error(`Missing coastal map entry ${signature}`);
      }
      setCell(worldMap, row, column, coastTile);
    }
  }

  return worldMap;
}

function desertCoastOffsets(
  tile: number,
  row: number,
  column: number,
): DesertCoastOffset[] {
  const adjacentChecks: Readonly<Record<number, readonly number[]>> = {
    1: [1, 2, 8],
    2: [8],
    3: [6, 7, 8],
    4: [2],
    5: [6],
    6: [2, 3, 4],
    7: [4],
    8: [4, 5, 6],
  };
  const adjacent: Readonly<Record<number, DesertCoastOffset>> = {
    1: { row: row - 1, column: column - 1, desertTiles: new Set([89, 105]) },
    2: {
      row,
      column: column - 1,
      desertTiles: new Set([89, 105, 106, 108, 110, 111]),
    },
    3: { row: row + 1, column: column - 1, desertTiles: new Set([89, 110]) },
    4: {
      row: row + 1,
      column,
      desertTiles: new Set([89, 108, 109, 110, 111, 112]),
    },
    5: { row: row + 1, column: column + 1, desertTiles: new Set([89, 112]) },
    6: {
      row,
      column: column + 1,
      desertTiles: new Set([89, 106, 107, 109, 111, 112]),
    },
    7: { row: row - 1, column: column + 1, desertTiles: new Set([89, 107]) },
    8: {
      row: row - 1,
      column,
      desertTiles: new Set([89, 105, 106, 107, 108, 109]),
    },
  };

  return (adjacentChecks[tile] ?? []).map((number) => adjacent[number]!);
}

export function replaceDesertCoasts(
  worldMap: ByteGrid,
  context: ProcessingContext,
): ByteGrid {
  for (const coast of context.possibleDesertCoasts) {
    const coastTile = getCell(worldMap, coast.row, coast.column);
    const offsets = desertCoastOffsets(coastTile, coast.row, coast.column);
    if (offsets.length === 0) {
      continue;
    }

    const isDesert = offsets.every((offset) =>
      offset.desertTiles.has(getCell(worldMap, offset.row, offset.column)),
    );
    if (isDesert && coastTile !== 0) {
      setCell(worldMap, coast.row, coast.column, coastTile + 24);
    }
  }
  return worldMap;
}

export function updateClimateTerrain(worldMap: ByteGrid): ByteGrid {
  for (let row = 0; row < worldMap.rows; row += 1) {
    for (let column = 0; column < worldMap.columns; column += 1) {
      const tile = getCell(worldMap, row, column);
      if (!((tile >= 1 && tile <= 8) || (tile >= 65 && tile <= 72))) {
        continue;
      }

      if (row < 24 || row >= worldMap.rows - 24) {
        setCell(worldMap, row, column, tile + 16);
      } else if (row < 24 * 14 || row >= 24 * 31) {
        setCell(worldMap, row, column, tile + 8);
      }
    }
  }
  return worldMap;
}

export function applyManualCorrections(worldMap: ByteGrid, part: number): void {
  if (part === 0) {
    setCell(worldMap, 444, 366, 28);
    setCell(worldMap, 445, 366, 28);
    setCell(worldMap, 489, 415, 27);
    setCell(worldMap, 1055, 266, 23);
    setCell(worldMap, 1055, 267, 23);
  }

  if (part === 2) {
    setCell(worldMap, 890, 134, 26);
    setCell(worldMap, 890, 135, 26);
    setCell(worldMap, 1056, 417, 13);
    setCell(worldMap, 1061, 435, 12);
  }
}
