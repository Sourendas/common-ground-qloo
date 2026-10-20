// Thin Qloo client. Hackathon keys only work on hackathon.api.qloo.com and go in X-Api-Key.
const BASE = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextSlot = 0;
const GAP_MS = 230; // just under 5 req/s
async function throttle() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + GAP_MS;
  if (at > now) await sleep(at - now);
}

export async function qloo(path, params = {}, { key = process.env.QLOO_API_KEY, fetchImpl = fetch } = {}) {
  if (!key) throw new Error("QLOO_API_KEY is not configured");
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  // Hackathon keys allow 5 requests/second: space calls out and back off on 429.
  for (let attempt = 0; ; attempt++) {
    await throttle();
    const r = await fetchImpl(u, { headers: { "X-Api-Key": key, accept: "application/json" } });
    if ((r.status === 429 || r.status >= 500) && attempt < 3) { await sleep(600 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`Qloo ${path} -> HTTP ${r.status}`);
    return r.json();
  }
}

// /search returns { results: [...] }; /v2/insights returns { results: { entities: [...] } }.
export const entitiesOf = (body) =>
  Array.isArray(body?.results) ? body.results : body?.results?.entities ?? body?.entities ?? [];

// Resolve a free-text favourite ("Radiohead", "Spirited Away") to a Qloo entity.
export async function resolveEntity(name, opts) {
  const body = await qloo("/search", { query: name, take: 1 }, opts);
  const e = entitiesOf(body)[0];
  if (!e) return null;
  return { id: e.entity_id || e.id, name: e.name, types: e.types || [], raw_type: (e.types || [])[0] || null };
}

export const places = (ids, city, extra, opts) =>
  qloo("/v2/insights", {
    "filter.type": "urn:entity:place",
    "filter.tags": "urn:tag:genre:place:restaurant",
    "signal.interests.entities": ids,
    "filter.location.query": city,
    take: 30, ...extra,
  }, opts);

// Pass 2: ask Qloo how well specific candidate places fit ONE person's taste.
export const affinityFor = (ids, candidateIds, city, opts) =>
  qloo("/v2/insights", {
    "filter.type": "urn:entity:place",
    "signal.interests.entities": ids,
    "filter.results.entities": candidateIds,
    "filter.location.query": city,
    take: 50,
  }, opts);

export const crossDomain = (type, ids, opts) =>
  qloo("/v2/insights", {
    "filter.type": type,
    "signal.interests.entities": ids,
    "feature.explainability": true,
    take: 10,
  }, opts);
