# Deployment

Written so someone who has never seen this codebase can deploy it, and so the
client owns every account involved.

## Ownership

Per the brief, the client holds these directly. No contractor should be the
account owner on any of them.

- Source repository
- Cloud account (and the signed BAA on it)
- Domain and DNS
- Production database and object storage
- Stripe account
- Any third-party service account

A contractor gets access granted to them, and that access can be revoked without
anything breaking.

---

## What has to exist

| Thing | Notes |
| --- | --- |
| Node 20 runtime | Containers or a managed Node platform |
| PostgreSQL 16 | Managed, encryption at rest, automated backups, point-in-time recovery |
| Object storage | Private bucket, server-side encryption, **no public access** |
| Secret store | For the two secrets below. Not an environment file in the repo |
| TLS | 1.2 minimum, HSTS on |

## Environment

```bash
DATABASE_URL=postgresql://user:pass@host:5432/medilean?sslmode=require
PHI_ENC_KEY=            # 32 bytes, base64. From the secret store
SESSION_SECRET=         # 48+ random bytes
APP_URL=https://app.example.com
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
UPLOAD_DIR=             # replace with S3 config when storage.ts is swapped
```

Generate the secrets once, store them in the secret manager, and never in git:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # PHI_ENC_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" # SESSION_SECRET
```

**If `PHI_ENC_KEY` is lost, every encrypted column becomes unreadable.** It is not
recoverable from a database backup. Back it up separately from the database, and
test that you can read it back.

---

## Deploying

```bash
npm ci
npx prisma migrate deploy     # never `migrate dev` in production
npx prisma generate
npm run build
npm start
```

CI runs types, lint, tests and a build against a real Postgres on every push
(`.github/workflows/ci.yml`). Nothing reaches production without passing.

### After the first deploy

1. Apply the audit-log grants from SECURITY.md so the trail cannot be edited.
2. Create the physician and admin accounts. Do not leave demo accounts in place —
   the seed is for development only and wipes data before it runs.
3. Populate `EligibleState` with the states the physician is actually licensed in.
4. Add the real clinical flag rules through `/admin/flags` with the physician
   present. The seeded rules are examples, not a protocol.
5. Point the Stripe webhook at `/api/stripe/webhook` and confirm the signature
   secret is set — an unverified webhook is an unauthenticated write endpoint.

---

## Backups and recovery

Automated backups with point-in-time recovery, plus versioning on the bucket.

**Rehearse the restore on a schedule and write down the result.** An untested
backup is a hope, not a control. The drill:

1. Restore the latest snapshot into a scratch database.
2. Point a staging instance at it with the production `PHI_ENC_KEY`.
3. Confirm encrypted fields decrypt — if the key is wrong this is where you find out.
4. Record the date, who ran it, how long it took, and anything that went wrong.

Recovery point and recovery time objectives should be numbers the client has agreed
to, not numbers a developer picked quietly.

Production PHI never goes into staging. Restore drills use a scratch environment
that is torn down afterwards.

---

## Monitoring

- Uptime check on `/` and a database-backed route.
- Alert on failed audit writes — the code logs loudly when one fails, and that line
  should page someone.
- Alert on repeated `*.access_denied` audit actions; that is either a bug or someone
  probing.
- Error tracking must scrub PHI before it leaves the boundary, and the vendor needs a
  BAA regardless.

---

## Handover

Everything needed to take this over without the original developer:

- `README.md` — run it locally in five commands
- `docs/ARCHITECTURE.md` — why it is shaped this way
- `docs/SECURITY.md` — PHI handling, and an honest list of what is still outstanding
- `docs/CLINICAL-CONFIG.md` — how the physician changes clinical behaviour themselves
- `prisma/schema.prisma` — the data model, commented
- `npm run verify` — one command that proves the tree is healthy

Milestone acceptance should run against functional tests, not screenshots. `npm run
verify` plus a walk through the flows in the README is a reasonable acceptance gate.
