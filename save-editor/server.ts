import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import {
  FILE_SIZE,
  inspectFame,
  inspectGold,
  inspectPort,
  inspectProtagonist,
  inspectSlot,
  PORT_COUNT,
  setClock,
  setCrusaderEquipment,
  setFame,
  setGold,
  setPort,
  setPlayerShipToTekkousen,
  setProtagonistStats,
  validate,
} from "./format.js";

const EDITED_SLOT = 1;
const API_VERSION = 8;

const host = "127.0.0.1";
const port = 4173;
const publicDirectory = new URL("./ui/", import.meta.url);

const assets: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/style.css": { file: "style.css", type: "text/css; charset=utf-8" },
};

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > FILE_SIZE) throw new Error("Uploaded file is too large.");
    chunks.push(bytes);
  }
  const result = Buffer.concat(chunks);
  validate(result);
  return result;
}

function parameter(url: URL, name: string): number {
  const text = url.searchParams.get(name);
  if (text === null || !/^\d+$/.test(text))
    throw new Error(`Missing or invalid ${name}.`);
  return Number(text);
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (request.method === "GET" && assets[url.pathname]) {
    const asset = assets[url.pathname]!;
    const contents = await readFile(new URL(asset.file, publicDirectory));
    response.writeHead(200, {
      "content-type": asset.type,
      "cache-control": "no-store",
    });
    response.end(contents);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/inspect") {
    const data = await body(request);
    const protagonist = inspectProtagonist(data, EDITED_SLOT);
    sendJson(response, 200, {
      apiVersion: API_VERSION,
      save: inspectSlot(data, EDITED_SLOT),
      fame: inspectFame(data, EDITED_SLOT, protagonist.id),
      gold: inspectGold(data, EDITED_SLOT),
      ports: Array.from({ length: PORT_COUNT }, (_, id) =>
        inspectPort(data, EDITED_SLOT, id),
      ),
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/save") {
    const data = await body(request);
    const protagonist = inspectProtagonist(data, EDITED_SLOT);
    const expectedPort = parameter(url, "expectedPort");
    const newPort = parameter(url, "port");
    let edited =
      expectedPort === newPort
        ? Buffer.from(data)
        : setPort(data, EDITED_SLOT, expectedPort, newPort);
    edited = setClock(
      edited,
      EDITED_SLOT,
      `${parameter(url, "year")}-${String(parameter(url, "month")).padStart(2, "0")}-${String(parameter(url, "day")).padStart(2, "0")}`,
      url.searchParams.get("time") ?? "",
    );
    for (const category of ["trade", "piracy", "adventure"] as const) {
      edited = setFame(
        edited,
        EDITED_SLOT,
        protagonist.id,
        category,
        parameter(
          url,
          `expected${category[0]!.toUpperCase()}${category.slice(1)}`,
        ),
        parameter(url, category),
      );
    }
    edited = setCrusaderEquipment(edited, EDITED_SLOT);
    edited = setGold(edited, EDITED_SLOT, 1_000_000);
    edited = setProtagonistStats(edited, EDITED_SLOT, 100);
    edited = setPlayerShipToTekkousen(edited, EDITED_SLOT);
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-disposition": 'attachment; filename="KOUKAI2.DAT"',
      "content-length": edited.length,
      "cache-control": "no-store",
    });
    response.end(edited);
    return;
  }
  sendJson(response, 404, { error: "Not found." });
}

createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}).listen(port, host, () => {
  console.log(`UW2 save editor: http://${host}:${port}`);
  console.log("Press Ctrl+C to stop.");
});
