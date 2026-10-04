import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { repoRoot } from "../shared.js";
import { run } from "./index.js";

const read = async (file: string) =>
  JSON.parse(
    await readFile(join(repoRoot, "scripts/goods/output", file), "utf8"),
  );

test("goods and markets match the new-game data", async () => {
  await run();
  const goods = await read("goods.json");
  const markets = await read("markets.json");
  const ports = await read("port-markets.json");

  assert.equal(goods.length, 46);
  assert.deepEqual(goods[0], { id: 0, name: "Clove", category: 0 });
  assert.equal(goods[45].name, "Wood");
  assert.equal(markets.length, 13);
  assert.equal(
    markets.reduce(
      (total: number, market: { ports: number[] }) =>
        total + market.ports.length,
      0,
    ),
    100,
  );

  const lisbon = ports[0];
  assert.equal(lisbon.specialty.name, "Rock Salt");
  const buy = (port: typeof lisbon, name: string) =>
    port.buy.find((entry: { name: string }) => entry.name === name);
  // Listed goods use the market's purchase base (MAIN.EXE 0x29F23), the
  // specialty its own base price; both cost 120% without a permit.
  assert.deepEqual(buy(lisbon, "Olive Oil"), {
    good: 14,
    name: "Olive Oil",
    basePrice: 28,
    category: 2,
    price: 33,
    priceWithPermit: 28,
  });
  assert.equal(buy(lisbon, "Rock Salt").price, 45);

  const madeira = ports.find(
    (port: { name: string }) => port.name === "Madeira",
  );
  assert.equal(madeira.sell[14].price, 57); // Olive Oil
});
