import { runAgent } from "../lib/agent.js";
import { makeLlm } from "../lib/llm.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const city = String(b.city || "").slice(0, 80).trim();
    const people = (Array.isArray(b.people) ? b.people : []).slice(0, 5).map((p, i) => ({
      name: String(p.name || `Person ${i + 1}`).slice(0, 30),
      favorites: (Array.isArray(p.favorites) ? p.favorites : []).map((x) => String(x).slice(0, 60).trim()).filter(Boolean).slice(0, 6),
    })).filter((p) => p.favorites.length);
    if (!city || people.length < 1) return res.status(400).json({ error: "Need a city and at least one person with favourites." });
    res.status(200).json(await runAgent({ city, people, llm: makeLlm() }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
