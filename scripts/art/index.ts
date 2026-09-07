import { runEventArt } from "./event-art.js";
import { runGraphArt } from "./graph-art.js";

export async function run(): Promise<void> {
  await runEventArt();
  await runGraphArt();
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
)
  await run();
