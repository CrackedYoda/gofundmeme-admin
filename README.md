# gofundmeme admin

Operator panel for gofundmeme. A static React app (Vite, TanStack Query) that talks to
[gofundmeme-backend](https://github.com/CrackedYoda/gofundmeme-backend)'s `/api/admin` routes.
It is kept out of the public site on purpose.

## Pages

- **Overview**: API, MongoDB, Redis and worker health; stale or failing jobs; the kill switch
  (pause / resume launches and sweeps); donated, waiting and owed money; payouts due; creator fees
  swept; ops wallet gas against its alert level; the integrity and creator checks; alerts in the
  last 24h; launch, campaign and swap counts. Refreshes every 30 seconds.
- **Jobs**: every worker job with its schedule, last run, duration, run and failure counts, and
  last error. A scheduled job is stale when it hasn't run for two of its intervals.
- **Alerts**: the alerts the worker sends to Telegram, newest first.
- **Payouts**: campaigns due a donation, and a form to record one with its receipt.
- **Launches**: failed, pending and expired launches, with the failure reason.
- **Campaigns**: every campaign including blocked ones, with block / unblock.

## Signing in

Sign-In With Solana: connect a browser wallet (Phantom, Solflare, Backpack…) whose address is in
the backend's `ADMIN_WALLETS`, then sign the one-time message. The 12-hour session is kept in
`sessionStorage` for that tab only. Donations record which admin wallet logged them.

## Backend setup

| Variable | Value |
| --- | --- |
| `ADMIN_WALLETS` | Comma-separated admin wallet addresses. |
| `CORS_ORIGINS` | Add this panel's Vercel origin alongside the site. |

## Deploying (Vercel)

The panel is its own Vercel project on its own URL, separate from the public site.

1. Import this repo in Vercel. `vercel.json` sets the build (`pnpm build` → `dist/`), serves the app
   on every path, and marks it `noindex`.
2. Set `VITE_API_URL` to the backend API, including `/api` (e.g. `https://api.gofundmeme.live/api`).
3. Add your domain in Vercel, then add that origin to the backend's `CORS_ORIGINS`.
4. Make sure your wallet is in the backend's `ADMIN_WALLETS`.

## Running locally

```sh
cp .env.example .env    # set VITE_API_URL to the backend, including /api
pnpm install
pnpm dev                # http://localhost:4100
pnpm typecheck && pnpm test
pnpm build              # static files in dist/
```

`src/api.ts` copies the admin types from the backend's `packages/core/src/api-types.ts`; keep them in sync.
