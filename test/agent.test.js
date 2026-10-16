// Unit test of the agent logic against a FAKE Qloo (shape-based stub). This does NOT prove the live API works.
import assert from "node:assert"; import { runAgent } from "../lib/agent.js";
const fakeFetch = async (u) => {
  const url = new URL(u); const p = url.pathname; const q = Object.fromEntries(url.searchParams);
  const ok = (entities) => ({ ok: true, status: 200, json: async () => ({ results: { entities } }) });
  if (p === "/search") return ok([{ entity_id: "E_" + q.query, name: q.query, types: ["urn:entity:artist"] }]);
  const mk = (id, name, a) => ({ entity_id: id, name, tags: [{ name: "Italian Restaurant" }], query: { affinity: a }, properties: { address: "1 Main" } });
  if (q["filter.type"] === "urn:entity:place" && q["filter.results.entities"]) {
    const alice = q["signal.interests.entities"].includes("E_A");
    return ok([mk("P1", "Spike's", alice ? 0.95 : 0.1), mk("P2", "Middle Ground", 0.7)]);
  }
  if (q["filter.type"] === "urn:entity:place") return ok([mk("P1", "Spike's", 0.9), mk("P2", "Middle Ground", 0.6)]);
  return ok([{ entity_id: "X", name: "Pick", query: { affinity: 0.8 } }]);
};
process.env.QLOO_API_KEY = "test";
const orig = globalThis.fetch; globalThis.fetch = fakeFetch;
const plan = await runAgent({ city: "Austin", people: [{ name: "Alice", favorites: ["A"] }, { name: "Bob", favorites: ["B"] }] });
globalThis.fetch = orig;
assert.equal(plan.venues[0].name, "Middle Ground", "maximin should prefer the venue nobody dislikes");
assert.ok(plan.extras.music.length === 1);
console.log("ok", plan.venues.map((v) => v.name));
