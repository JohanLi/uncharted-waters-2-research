import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { repoRoot, writeJson } from "../../scripts/shared.js";
import { analyzeScenarioVmExecutable } from "./main-exe.js";
import { writeReadableFormats } from "./readable-formats.js";
import { disassembleScenario } from "./snr.js";

interface Message {
  body: string;
  characterId?: string;
  position: number;
}
export async function run(): Promise<void> {
  const output = join(repoRoot, "dialog-system/scripts/output");
  await mkdir(output, { recursive: true });
  const mes = await readFile(join(repoRoot, "raw/SNR1.MES"));
  const messages: Message[] = [];
  let cursor = 4756;
  while (cursor < mes.length) {
    const end = mes.indexOf(0, cursor);
    if (end < 0) break;
    messages.push({
      body: new TextDecoder()
        .decode(mes.subarray(cursor, end))
        .replaceAll("'", "’"),
      position: 0,
    });
    cursor = end + 1;
  }
  const dat = await readFile(join(repoRoot, "raw/SNR1.DAT"));
  cursor = 0;
  while (cursor < dat.length) {
    const first = dat[cursor++]!;
    if (first !== 1 && first !== 2) continue;
    const second = dat[cursor++]!;
    if (second !== 0xcc) {
      cursor--;
      continue;
    }
    if (cursor + 7 > dat.length) break;
    const characterId = dat.readUInt16BE(cursor) + 1;
    cursor += 2;
    cursor++;
    const messageId = dat.readUInt16BE(cursor) + 1;
    cursor += 2;
    cursor += 2;
    const message = messages[messageId - 1];
    if (message) {
      message.characterId = String(characterId);
      message.position = first;
    }
  }
  for (const message of messages) {
    message.body = message.body.replace(/\|.*?\|\n/g, "");
  }
  await writeJson(join(output, "messages.json"), messages);

  const scenarios = await Promise.all(
    Array.from({ length: 7 }, async (_, scenarioId) =>
      disassembleScenario(
        scenarioId,
        await readFile(join(repoRoot, `raw/SNR${scenarioId}.DAT`)),
        await readFile(join(repoRoot, `raw/SNR${scenarioId}.MES`)),
      ),
    ),
  );
  await writeJson(join(output, "scenarios.json"), scenarios);
  await writeJson(
    join(output, "main-exe-vm.json"),
    analyzeScenarioVmExecutable(await readFile(join(repoRoot, "raw/MAIN.EXE"))),
  );
  await writeReadableFormats(output, scenarios);
}
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
