// "Common Ground" agent: finds the place a *group* with different tastes will all enjoy,
// then builds the rest of the evening from the same taste graph.
import { resolveEntity, places, affinityFor, crossDomain, entitiesOf } from "./qloo.js";

const FOOD = /restaurant|bar|cafe|coffee|pizza|bistro|diner|bakery|pub|grill|kitchen|food|brewery|eatery|dining/i;
const aff = (e) => Number(e?.query?.affinity ?? e?.affinity ?? 0);
const isDining = (e) =>
  FOOD.test((e.tags || []).map((t) => t.name || t.id || "").join(" ")) || FOOD.test(e.subtype || "") || FOOD.test(e.name || "");

export async function runAgent({ city, people, llm }, opts = {}) {
  const trace = [];
  const log = (tool, input, summary) => trace.push({ step: trace.length + 1, tool, input, summary });

  // 1. resolve everyone's favourites
  const resolved = [];
  for (const p of people) {
    const ents = [];
    for (const fav of p.favorites) {
      const e = await resolveEntity(fav, opts);
      log("qloo.search", { person: p.name, query: fav }, e ? `${e.name} (${e.raw_type})` : "no match");
      if (e) ents.push(e);
    }
    resolved.push({ name: p.name, entities: ents });
  }
  const usable = resolved.filter((p) => p.entities.length);
  if (!usable.length) throw new Error("None of the favourites could be matched in the Qloo taste graph.");

  // 2. candidate generation: each person's own top places
  const cand = new Map();
  for (const p of usable) {
    const body = await places(p.entities.map((e) => e.id), city, {}, opts);
    const list = entitiesOf(body).filter(isDining);
    log("qloo.insights(place)", { person: p.name, city }, `${list.length} dining candidates`);
    for (const e of list) if (!cand.has(e.entity_id)) cand.set(e.entity_id, e);
  }
  const candIds = [...cand.keys()].slice(0, 50);
  if (!candIds.length) throw new Error(`Qloo returned no dining places for "${city}".`);

  // 3. every person scores every candidate through Qloo (not through an LLM)
  const scores = new Map(candIds.map((id) => [id, {}]));
  for (const p of usable) {
    const body = await affinityFor(p.entities.map((e) => e.id), candIds, city, opts);
    const list = entitiesOf(body);
    log("qloo.insights(filter.results.entities)", { person: p.name, candidates: candIds.length }, `scored ${list.length}`);
    for (const e of list) if (scores.has(e.entity_id)) scores.get(e.entity_id)[p.name] = aff(e);
  }

  // 4. fairness: maximin (nobody is sacrificed), mean as tie-break
  const ranked = candIds.map((id) => {
    const per = scores.get(id);
    const vals = usable.map((p) => per[p.name] ?? 0);
    return { entity: cand.get(id), per, min: Math.min(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length };
  }).sort((a, b) => b.min - a.min || b.mean - a.mean);
  const top = ranked.slice(0, 3);
  log("fairness.maximin", { people: usable.length }, `winner ${top[0].entity.name} (worst-off affinity ${top[0].min.toFixed(2)})`);

  // 5. rest of the evening, grounded in everyone's taste + the chosen venue (cross-domain)
  const allIds = [...usable.flatMap((p) => p.entities.map((e) => e.id)), top[0].entity.entity_id];
  const extras = {};
  for (const [label, type] of [["music", "urn:entity:artist"], ["watch", "urn:entity:movie"], ["read", "urn:entity:book"]]) {
    try {
      const l = entitiesOf(await crossDomain(type, allIds, opts)).slice(0, 3);
      extras[label] = l.map((e) => ({ id: e.entity_id, name: e.name, affinity: aff(e), why: e.query?.explainability ?? null }));
      log(`qloo.insights(${type.split(":").pop()})`, { signals: allIds.length }, `${l.length} picks`);
    } catch (err) {
      log(`qloo.insights(${type.split(":").pop()})`, {}, `skipped: ${err.message}`);
    }
  }

  const plan = {
    city,
    people: usable.map((p) => ({ name: p.name, matched: p.entities.map((e) => e.name) })),
    unmatched: resolved.map((p) => p.name).filter((n) => !usable.find((u) => u.name === n)),
    venues: top.map((t) => ({
      id: t.entity.entity_id, name: t.entity.name, address: t.entity.properties?.address || null,
      worst_fit: t.min, mean_fit: t.mean, per_person: t.per,
      tags: (t.entity.tags || []).slice(0, 5).map((x) => x.name),
    })),
    extras, trace,
  };
  plan.narrative = llm ? await llm(plan).catch(() => null) : null;
  return plan;
}
