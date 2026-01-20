This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Integrating the Consumer App (Auth)

This dashboard can be integrated with your consumer app using either a **shared session cookie** (preferred) or a **token handoff**.

### Option A (Preferred): Shared Cookie

Configure both apps to use the same cookie name + domain:

- `AUTH_SESSION_COOKIE_NAME` (e.g. `weafrica_session`)
- `AUTH_COOKIE_DOMAIN` (e.g. `.weafrica.com`)

Flow:

1. The consumer app authenticates the user and **sets the shared session cookie** on `.weafrica.com`.
2. The DJ dashboard reads the cookie via `getUserFromSessionCookie()` and routes accordingly.

In this repo, the session cookie is assumed to be a **Firebase Session Cookie** and is verified server-side using Firebase Admin.

Required env vars for verification:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (store with literal `\n` in env; it is converted to newlines at runtime)

Optional cookie/session settings:

- `AUTH_SESSION_MAX_AGE_SECONDS` (default: 5 days)
- `AUTH_COOKIE_SAMESITE` (`lax` | `strict` | `none`, default: `lax`)

Server helper:

- `getUserFromSessionCookie()` in `lib/auth/session.ts`

### Option B: Token Handoff (Redirect)

The consumer app redirects to this dashboard with a Firebase ID token:

`https://<your-artist-dashboard-domain>/auth/consume?token=<FirebaseIDToken>&redirect=/artist/dashboard/overview`

This dashboard:

1. Verifies the ID token
2. Mints a Firebase **session cookie**
3. Stores it in the shared cookie
4. Redirects to the provided `redirect` path

Endpoint:

- `GET /auth/consume` in `app/auth/consume/route.ts`

### Option C: Redirect *to* Consumer App (Flutter)

If you want **everyone to login/sign up in the Flutter consumer app**, use the dashboard endpoint below.

- Dashboard URL: `GET /auth/connect?mode=login&redirect=/artist/dashboard/overview`
- Env vars:
	- `ARTIST_DASHBOARD_URL` (the deployed base URL of this dashboard)
	- `CONSUMER_APP_CONNECT_URL` (the consumer app URL/deeplink that initiates login)

The dashboard will redirect the browser to `CONSUMER_APP_CONNECT_URL` and include a query param:

- `returnTo=<dashboard>/auth/consume?redirect=...`

After the user signs in, the Flutter app should open `returnTo` and append:

- `token=<FirebaseIDToken>`

Debug endpoint:

- `GET /auth/me` returns `{ user: ... }` if authenticated

Logout:

- `POST /auth/logout` clears the session cookie

## Artist Dashboard (Web)

Routes live under `app/artist` and the main entry is:

- `/artist/dashboard` (redirects to `/artist/dashboard/overview`)

Authentication:

- Login UI: `/artist/auth/login`
- Session creation: `POST /auth/session` (expects `{ idToken }`)

Role/status enforcement:

- `lib/auth/artist.ts` expects Firebase custom claims on the session token:
	- `role: "artist"`
	- `artistStatus: "pending" | "approved" | "suspended" | "premium"` (or `status`)

Firebase Web SDK env vars (for the login page):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- (optional) `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- (optional) `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

## Getting Started

## Environment Variables

This repo expects a local env file.

- Copy `.env.local.example` to `.env.local`
- Fill in your Firebase values (Firebase Console → Project settings → General → Your apps → Web app)
- Restart the dev server after changes (`npm run dev`)

Optional dashboard features:

- `COIN_TO_MWK_RATE` enables MWK conversions on the Earnings pages
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` enable Supabase-backed analytics/finance insights

### Env checklist

Use this as a quick “why is this page empty/broken?” reference.

- **Auth (session cookies / server verification)**
	- Required: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
	- Or instead: `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`
	- Optional: `AUTH_SESSION_COOKIE_NAME`, `AUTH_COOKIE_DOMAIN`, `AUTH_COOKIE_SAMESITE`, `AUTH_SESSION_MAX_AGE_SECONDS`

- **Login page (Firebase Web SDK)**
	- Required: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
	- Optional: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

- **Content (Songs / Videos / Playlists)**
	- Requires Firestore enabled/created in the Firebase project used by Admin (`FIREBASE_*` above)

- **Analytics + Earnings insights (Supabase-backed)**
	- Optional: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- **Earnings MWK conversion**
	- Optional: `COIN_TO_MWK_RATE`

## Payouts (Supabase)

The Earnings page can submit payout requests and show payout history via a Supabase table.

- Create the table by running the SQL migration in [supabase/migrations/20260114_0001_create_payout_requests.sql](supabase/migrations/20260114_0001_create_payout_requests.sql) in the Supabase SQL editor.
- Ensure the dashboard has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`.

## Live scheduling (Supabase)

The Live page can schedule sessions and show upcoming/history via Supabase.

- Create the table by running [supabase/migrations/20260114_0002_create_live_sessions.sql](supabase/migrations/20260114_0002_create_live_sessions.sql) in the Supabase SQL editor.
- Ensure the dashboard has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`.

## Live battles (Supabase)

The Artist → Live → Live Battles tab reads/writes a `battles` table.

- Create the table by running [supabase/migrations/20260120_0008_create_battles.sql](supabase/migrations/20260120_0008_create_battles.sql) in the Supabase SQL editor.
- If you want the consumer app (anon key) to be able to list live battles, also run [supabase/migrations/20260120_0009_battles_public_read_policy.sql](supabase/migrations/20260120_0009_battles_public_read_policy.sql).
- Ensure the dashboard has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`.

## Profile (Supabase)

The Profile page can store editable artist profile fields and show audit logs via Supabase.

- Create the tables by running [supabase/migrations/20260114_0003_create_artist_profiles_and_audit_logs.sql](supabase/migrations/20260114_0003_create_artist_profiles_and_audit_logs.sql) in the Supabase SQL editor.
- Ensure the dashboard has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`.

## Promotions (Supabase)

The Promotions page can create boost campaigns (songs/videos/live) with targeting + coin budgets.

- Create the tables by running [supabase/migrations/20260114_0004_create_promotion_campaigns.sql](supabase/migrations/20260114_0004_create_promotion_campaigns.sql) in the Supabase SQL editor.
- Ensure the dashboard has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
