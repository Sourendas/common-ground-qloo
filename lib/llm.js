// Optional: turn the Qloo-grounded plan into friendly prose. Facts come from Qloo; the LLM may not add venues.
export function makeLlm(env = process.env) {
  if (!env.LLM_API_KEY) return null;
  const base = env.LLM_BASE_URL || "https://api.tokenfactory.nebius.com/v1";
  const model = env.LLM_MODEL || "nvidia/nemotron-3-nano-30b-a3b";
  return async (plan) => {
    const facts = JSON.stringify({ city: plan.city, people: plan.people, venues: plan.venues, extras: plan.extras });
    const r = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model, max_tokens: 350, temperature: 0.4,
        messages: [
          { role: "system", content: "Write a short, warm evening plan (max 120 words) using ONLY the venues and picks in the JSON. Never invent names. Mention why it works for everyone, using the fit numbers." },
          { role: "user", content: facts },
        ],
      }),
    });
    if (!r.ok) throw new Error("llm " + r.status);
    return (await r.json()).choices?.[0]?.message?.content?.trim() || null;
  };
}
