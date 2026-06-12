# mm-kisa cron worker

A tiny Cloudflare Worker on a cron trigger that pings the app's `/api/cron`
endpoint so finished-match scores get fetched and points recomputed. Lives
outside the Next app (it's excluded from the root tsconfig).

## One-time deploy

```bash
cd cron-worker
npm install                      # installs wrangler locally

npx wrangler login               # opens browser; authorize your Cloudflare account

# Set the target URL: edit wrangler.toml -> [vars].CRON_URL to your prod app,
#   e.g. https://mm-kisa.vercel.app/api/cron

# Store the shared secret (must equal CRON_SECRET in the Vercel env):
npx wrangler secret put CRON_SECRET
# (paste the same value you set for CRON_SECRET in Vercel)

npx wrangler deploy
```

That's it — the `crons = ["*/30 * * * *"]` trigger in `wrangler.toml` now fires
every 30 minutes (UTC). Change that line and re-run `npx wrangler deploy` to
adjust the cadence.

## Verifying

- `npx wrangler tail` — live-stream the worker logs; each run logs the
  `/api/cron` status + response.
- Visit the worker's `*.workers.dev` URL in a browser to trigger a run manually
  (the `fetch` handler pings `/api/cron` and returns the result).
- Cloudflare dashboard → Workers & Pages → mm-kisa-cron → Triggers / Logs.

## Prereqs

- `CRON_SECRET` is set in **both** Vercel (env var, used by `/api/cron`) and here
  (`wrangler secret put`). They must match or the endpoint returns 401.
- `CRON_URL` points at the deployed app, not localhost.
