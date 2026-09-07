export interface ByteGrid {
  readonly rows: number;
  readonly columns: number;
  readonly data: Uint8Array;
}

export function createGrid(rows: number, columns: number): ByteGrid {
  return { rows, columns, data: new Uint8Array(rows * columns) };
}

export function cloneGrid(grid: ByteGrid): ByteGrid {
  return { rows: grid.rows, columns: grid.columns, data: grid.data.slice() };
}

export function getCell(grid: ByteGrid, row: number, column: number): number {
  const normalizedRow = row < 0 ? grid.rows + row : row;
  const normalizedColumn = column < 0 ? grid.columns + column : column;

  if (
    normalizedRow < 0 ||
    normalizedRow >= grid.rows ||
    normalizedColumn < 0 ||
    normalizedColumn >= grid.columns
  ) {
    throw new RangeError(`Grid index out of bounds: [${row}, ${column}]`);
  }

  return grid.data[normalizedRow * grid.columns + normalizedColumn]!;
}

export function setCell(
  grid: ByteGrid,
  row: number,
  column: number,
  value: number,
): void {
  const normalizedRow = row < 0 ? grid.rows + row : row;
  const normalizedColumn = column < 0 ? grid.columns + column : column;

  if (
    normalizedRow < 0 ||
    normalizedRow >= grid.rows ||
    normalizedColumn < 0 ||
    normalizedColumn >= grid.columns
  ) {
    throw new RangeError(`Grid index out of bounds: [${row}, ${column}]`);
  }

  grid.data[normalizedRow * grid.columns + normalizedColumn] = value;
}

export function expandTileMap(
  tileMap: ByteGrid,
  tiles: Uint8Array,
  tileRows: number,
  tileColumns: number,
): ByteGrid {
  const output = createGrid(
    tileMap.rows * tileRows,
    tileMap.columns * tileColumns,
  );
  const tileSize = tileRows * tileColumns;

  for (let row = 0; row < tileMap.rows; row += 1) {
    for (let column = 0; column < tileMap.columns; column += 1) {
      const tile = getCell(tileMap, row, column);
      const tileOffset = tile * tileSize;

      for (let tileRow = 0; tileRow < tileRows; tileRow += 1) {
        const sourceStart = tileOffset + tileRow * tileColumns;
        const destinationStart =
          (row * tileRows + tileRow) * output.columns + column * tileColumns;
        output.data.set(
          tiles.subarray(sourceStart, sourceStart + tileColumns),
          destinationStart,
        );
      }
    }
  }

  return output;
}
