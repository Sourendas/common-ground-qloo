# Common Ground — a Qloo-powered group-taste agent

Qloo Agentic Hackathon entry. Groups never agree on where to eat. Common Ground is an agent that asks Qloo's taste graph how well **each venue fits each person**, picks the venue that maximises the *worst-off* person's fit (maximin fairness), then builds the rest of the night (music, a film, a book) from everyone's taste plus the chosen venue.

## What is Qloo doing (and what an LLM alone can't)
1. `GET /search` resolves every favourite to a Qloo entity.
2. `GET /v2/insights` (`filter.type=urn:entity:place`, `signal.interests.entities`, `filter.location.query`) generates candidate venues per person.
3. `GET /v2/insights` with `filter.results.entities` scores *the same candidate set* against each person's taste: the per-person affinity bars in the UI are Qloo numbers.
4. Cross-domain insights (`urn:entity:artist|movie|book`) use all favourites **plus the chosen venue** as signals, with `feature.explainability`.
The optional LLM only phrases the result; it is not allowed to add venues.

## Run
```
export QLOO_API_KEY=...        # hackathon key, works only on hackathon.api.qloo.com
export LLM_API_KEY=...         # optional (OpenAI-compatible, default Nebius Token Factory)
node dev.js                    # http://localhost:3000
npm test                       # logic test against a stubbed Qloo
```
Deploy: any Vercel project pointed at this repo; set the env vars above. Keys live only in server env, never in the browser or repo.

## Notes
Qloo response data is not stored in this repo (per Qloo's terms). MIT licensed.
