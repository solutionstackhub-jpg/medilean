# Deploying to Vercel

This gets the demo running on Vercel in about ten minutes. It is a demonstration
deployment: fictional patients, no real PHI. Read [SECURITY.md](SECURITY.md)
before anything resembling a real patient touches it — several things on the
outstanding list there are not optional once that happens.

---

## 1. A database

Vercel has no database of its own, and the app needs PostgreSQL. Any hosted
Postgres works; the free tiers are fine for a demo.

- **Neon** — neon.tech, closest to zero setup
- **Supabase** — supabase.com
- **Vercel Postgres** — from the Storage tab in your project

Copy the connection string. It should end with `?sslmode=require`.

---

## 2. Import the repository

In Vercel: **Add New → Project → Import Git Repository**, pick this repo.

Framework preset is detected as Next.js. Leave the build settings alone — the
repo ships a `vercel-build` script that runs migrations before building:

```
prisma migrate deploy && prisma generate && next build
```

---

## 3. Environment variables

Set these under **Settings → Environment Variables** before the first deploy.

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | your Postgres URL | Must allow connections from Vercel |
| `PHI_ENC_KEY` | 32 bytes, base64 | Generate below. **Losing it makes every encrypted column unreadable** |
| `SESSION_SECRET` | 48+ random bytes | Generate below |
| `STORAGE_DRIVER` | `db` | Vercel's filesystem is read-only. Set automatically if `VERCEL` is present, but be explicit |
| `APP_URL` | `https://your-app.vercel.app` | Used for Stripe redirect URLs |

Generate the two secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"    # PHI_ENC_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" # SESSION_SECRET
```

### Demo-only, optional

| Variable | Value | What it does |
| --- | --- | --- |
| `SHOW_VERIFICATION_CODE` | `true` | Shows the email code on screen and enables the one-click demo sign-in. **Only for a demo** — it lets anyone sign in as the seeded accounts |
| `STRIPE_SECRET_KEY` etc. | — | Leave unset and billing runs in simulation, which is what you want for a demo |

### Do not set

`COOKIE_SECURE` — Vercel serves over HTTPS, so leave it unset and the cookie is
marked Secure automatically. It only exists because this project was also demoed
over plain http, where a Secure cookie is silently discarded by the browser.

---

## 4. Seed the demo data

The build runs migrations but deliberately does not seed — you do not want a
deploy wiping the database. Run it once, locally, pointed at the hosted database:

```bash
DATABASE_URL="<your hosted url>" \
PHI_ENC_KEY="<the same key you set in Vercel>" \
npm run db:seed
```

The key must match exactly. Seeded data is encrypted with it, and a different
key means the deployed app cannot read its own demo data.

`npm run db:seed` **wipes every table first.** That is correct for a demo and
wrong for anything else.

---

## 5. Check it

- `/` loads, the nav scrolls, sign-in works
- One-click sign-in as the physician shows a queue with flagged cases
- Open a document from a patient's Documents page — this is the one that proves
  `STORAGE_DRIVER=db` took effect

---

## What is different about a serverless deployment

**File storage.** Serverless functions get a read-only filesystem, so the local
driver cannot run there. `STORAGE_DRIVER=db` keeps the encrypted bytes in
Postgres instead, which is fine at demo volume and honest about its limits: a
real practice moves to S3 by implementing the same three functions in
`src/lib/storage.ts`. Nothing else in the application would change.

**Connection pooling.** Each serverless invocation can open its own connection.
Neon and Supabase both offer a pooled connection string — use it, or you will
hit connection limits under any real load.

**Cron.** `FollowUpSchedule` rows are read when a page renders. Sending an actual
reminder needs a scheduled job; Vercel Cron hitting a route handler is the
obvious fit, and it is not built yet.

---

## Not ready for real patients

Deploying this to Vercel does not make it HIPAA-compliant. At minimum you need a
signed BAA with the hosting and database providers, MFA on clinician accounts,
log scrubbing with tests, rate limiting, and a rehearsed backup restore.
[SECURITY.md](SECURITY.md) has the full list, written plainly.
