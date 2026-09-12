# Uncharted Waters: New Horizons Research

Contains a collection of one-off scripts to extract data and graphics from
the game Uncharted Waters: New Horizons (大航海時代II). They are in turn used for a browser-based
remake — see https://github.com/JohanLi/uncharted-waters-2.

Examples of what the scripts extract:

- the tilesets used for the world map, including the one for ships
- all three parts of the world map
- a visualization of winds and ocean current
- port and ship data
- dueling sprites

## Getting Started

Install dependencies from the repository root:

    pnpm install

Run every extractor:

    pnpm run extract-all

Each domain writes to its own ignored `scripts/<domain>/output/` directory.

Individual workflows are also available:

    pnpm run draw-world-map
    pnpm run draw-tilesets
    pnpm run draw-winds-current-anomalies
    pnpm run extract-ports
    pnpm run extract-ships
    pnpm run extract-art
    pnpm run extract-event-art
    pnpm run extract-graph-art
    pnpm run extract-portraits-items-discoveries
    pnpm run extract-dueling
    pnpm run extract-dialog

The dialog extractor reads the game data directly and does not require a
database.

The [DOS save editor](save-editor/README.md) is a local browser app for editing
the active save's port, calendar, fame, equipment, and gold. Start it with
`pnpm run save-editor`.

## Example Output

![Regular Tileset](assets/readme/regular-tileset.png)

![Large Tileset](assets/readme/large-tileset.png)

![Ship Tileset](assets/readme/ship-tileset.png)

![World map](assets/readme/world-map.png)
