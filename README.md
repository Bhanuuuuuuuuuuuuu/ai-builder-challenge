# Asset tracking challenge

A take-home challenge for software engineering interns. Candidates build a frontend on top of a small local backend that simulates the operational asset tracking system of a multi-site research lab.

This is a **monorepo** with two apps you run side by side:

- [`api/`](./api) — small Node/Fastify backend with a seeded SQLite database. Candidates don't modify it.
- [`starter/`](./starter) — the Next.js starter that candidates fork. API client, types, base components, and stub pages already wired up.

## Quick start

```bash
pnpm install

# Runs the API on :8080 and the starter on :3000
pnpm dev
```

Open http://localhost:3000.

The starter reads `API_BASE_URL` and `API_TOKEN` from `starter/.env`. Copy `starter/.env.example` to `starter/.env` if you don't have one. Both are server-side only — the browser hits a proxy at `/api/upstream` that adds the token, so it never reaches the client.

## What's in here

| Document | For |
|---|---|
| [`docs/CHALLENGE.md`](./docs/CHALLENGE.md) | The candidate-facing brief |
| [`docs/CONTEXT.md`](./docs/CONTEXT.md) | Background on the kind of system this is and why each piece exists. Optional. |
| [`api/README.md`](./api/README.md) | How to run and test the API |
| [`starter/README.md`](./starter/README.md) | How to run the starter |
| [`starter/docs/api-reference.md`](./starter/docs/api-reference.md) | The API contract |
| [`starter/docs/tips.md`](./starter/docs/tips.md) | Notes for candidates |
| [`starter/docs/happy-path.md`](./starter/docs/happy-path.md) | 10-step smoke test for candidates |

## Testing

```bash
pnpm test          # all packages
pnpm --filter @asset-tracking/api test
pnpm --filter @asset-tracking/starter test
```

## License

MIT. See [LICENSE](./LICENSE).

## Candidate notes

### Three calls I nearly made the other way

1. **Browser writes vs server route handlers**

   I nearly called the upstream scan APIs directly from the browser because it would have been faster to wire up. I chose server route handlers instead so the API token stays server-side. This also gave me one place to coordinate scan writes with facilities and finance sync.

2. **Raw diff reconciliation vs categorized report**

   I nearly made reconciliation a simple table of mismatched fields. I chose a categorized report instead because an asset manager needs to know what to investigate first, not just see that two systems disagree. Critical issues like missing rack records are separated from lower-priority finance warnings.

3. **Letting the backend catch every scan mistake vs pre-checking in the UI**

   I nearly let the backend reject all invalid deploy attempts. I chose to load the asset after scanning and show its current state first, because a tech should know before committing that an asset is already in service, disposed, or not yet received.

### Microcopy I chose carefully

For deploy, I used messages like:

> Cannot deploy: This asset is already in service, so it cannot be deployed again.

I chose this wording because it tells the tech exactly what happened, why the action stopped, and what not to retry. It avoids vague errors like “invalid transition.”

### Notes on external system sync

Deploy writes are handled in the server route. After a successful deploy, the app updates facilities with the rack location and finance with capitalized status. Store-from-in-service removes the facilities rack row. I kept these writes server-side for the same reason as reconciliation: the browser should never receive the upstream bearer token.

### What I intentionally did not build

I did not build offline mode, RMA UI, hardware driver integration, or bulk import/export. Those are useful in a real system, but for this challenge I focused on the hot scan path, manager information design, reconciliation depth, and clear recovery paths for mistakes.
