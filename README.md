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

    npm install

Run every extractor:

    npm run extract-all

Each domain writes to its own ignored `scripts/<domain>/output/` directory.

Individual workflows are also available:

    npm run draw-world-map
    npm run draw-tilesets
    npm run draw-winds-current-anomalies
    npm run extract-ports
    npm run extract-ships
    npm run extract-art
    npm run extract-event-art
    npm run extract-graph-art
    npm run extract-portraits-items-discoveries
    npm run extract-dueling
    npm run extract-dialog

The dialog extractor reads the game data directly and does not require a
database.

The [DOS save editor](save-editor/README.md) is a local browser app for editing
the active save's port, calendar, fame, equipment, and gold. Start it with
`npm run save-editor`.

## Example Output

<img width="256" height="128" alt="Regular Tileset" src="https://media.githubusercontent.com/media/JohanLi/uncharted-waters-2-research/master/assets/readme/regular-tileset.png">

<img width="512" height="512" alt="Large Tileset" src="https://media.githubusercontent.com/media/JohanLi/uncharted-waters-2-research/master/assets/readme/large-tileset.png">

<img width="256" height="128" alt="Ship Tileset" src="https://media.githubusercontent.com/media/JohanLi/uncharted-waters-2-research/master/assets/readme/ship-tileset.png">

<img width="950" height="475" src="https://media.githubusercontent.com/media/JohanLi/uncharted-waters-2-research/master/assets/readme/world-map.png">
