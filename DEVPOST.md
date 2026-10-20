# DEVPOST DRAFT — Qloo Agentic Hackathon (real Qloo run verified 2026-10-20; do not submit until live URL is up)

**Title:** Common Ground

**Tagline:** An agent that finds the place a whole group will love, because Qloo scores every venue for every person.

**Description**
Groups never agree on where to eat, and an LLM guessing "something for everyone" gives bland, generic answers. Common Ground is a tool-using agent that treats group taste as a fairness problem and uses Qloo's taste graph to solve it.

How it works
1. Each person types a few favourites (artists, films, restaurants, shows, books). The agent resolves each one to a Qloo entity with the Search API.
2. For every person it calls Qloo Insights (`urn:entity:place`, `signal.interests.entities`, `filter.location.query`) to generate dining candidates in the city.
3. It then asks Qloo to score the *same* candidate set against each person's taste (`filter.results.entities`). The per-person fit bars in the UI are Qloo affinities.
4. It picks the venue that maximises the worst-off person's fit (maximin), with the mean as tie-break, so nobody is sacrificed for the loudest taste.
5. It builds the rest of the evening with cross-domain Qloo Insights (artist, movie, book) using everyone's favourites plus the chosen venue as signals, with explainability turned on.
6. An optional LLM only phrases the result; it may not add venues. A visible agent trace lists every tool call.

Why Qloo: the "who likes what, and how much" numbers come from Qloo, not from a language model. Without Qloo the per-person fit scores and cross-domain picks would not exist.

Who it's for: friend groups, families, teams planning offsites, and event hosts who need a venue that works for mixed tastes.

**Built with:** Qloo Insights + Search API, Node.js, Vercel serverless functions, vanilla JS, optional OpenAI-compatible LLM (Nebius Token Factory)

**Links:** repo https://github.com/Sourendas/common-ground-qloo (MIT) · live demo URL: TODO (Vercel scope blocked) · video optional (not required by this hackathon)

**Truthfulness notes for the submitter:** code was written during the submission period. A full live run against hackathon.api.qloo.com passed on 2026-10-20 (3 people, 8 favourites resolved, 3x30 restaurant candidates, 3x50 per-person affinity scores, maximin pick, artist/movie/book extras). Client spaces calls under the 5 req/s hackathon limit and retries 429/5xx.
