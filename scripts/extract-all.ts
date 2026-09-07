import { run as extractArt } from "./art/index.js";
import { run as extractDialog } from "./dialog/index.js";
import { run as extractDueling } from "./dueling/index.js";
import { run as extractPortraitsItemsDiscoveries } from "./portraits-items-discoveries/index.js";
import { run as extractPorts } from "./ports/index.js";
import { run as extractShips } from "./ships/index.js";
import { run as drawTilesets } from "./tilesets/index.js";
import { run as drawWindsCurrentAnomalies } from "./winds-current-anomalies/index.js";
import { run as drawWorldMap } from "./draw-world-map/index.js";

await drawWorldMap();
await drawTilesets();
await drawWindsCurrentAnomalies();
await extractPorts();
await extractShips();
await extractArt();
await extractPortraitsItemsDiscoveries();
await extractDueling();
await extractDialog();
