# MediLean

A direct-to-consumer telemedicine platform for physician-guided weight management.
Patients complete a medical intake from home, a licensed physician reviews it, and
care continues through progress tracking, recurring check-ins and secure messaging.

**The software supports clinician review. It does not diagnose, decide treatment, or
prescribe.** Clinical protocols, contraindication logic and prescribing policy are set
by the supervising physician and live in the database as configuration, not in code.

---

## Running it locally

You need Node 20+ and Docker.

```bash
npm install
npm run db:up          # PostgreSQL 16 on port 5544
cp .env.example .env   # then fill in the two secrets below
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3000
```

Two secrets have no default, on purpose. The application refuses to start without
`PHI_ENC_KEY` rather than writing patient data in plaintext:

```bash
node -e "console.log('PHI_ENC_KEY=\"'+require('crypto').randomBytes(32).toString('base64')+'\"')"
node -e "console.log('SESSION_SECRET=\"'+require('crypto').randomBytes(48).toString('base64url')+'\"')"
```

### Demo accounts

Seeded by `npm run db:seed`. Password for all three: `Password123`

| Role | Email | Lands on |
| --- | --- | --- |
| Patient | `jane@example.com` | `/dashboard` |
| Physician | `dr.smith@medilean.test` | `/physician` |
| Practice admin | `admin@medilean.test` | `/admin/flags` |

### What the demo data covers

`npm run db:seed` creates fourteen fictional patients chosen so every screen has
something real on it. Patient names, answers and clinical values are invented.

| To see | Look at |
| --- | --- |
| Flags firing, high severity | David Wilson (4 flags), Chris Baker, Dana Whitfield |
| A flagged *follow-up*, not just an intake | Priya Raman — her check-in reports severe abdominal pain |
| An acknowledged flag | Marcus Bell's alcohol flag, resolved by the clinician |
| A declined case with the reasoning | Tom Alvarez — family history of MTC |
| Overdue vs upcoming check-ins | `/physician/calendar` — Marcus is 4 days overdue |
| Treatment plans | Jane (Semaglutide), Marcus (Tirzepatide), Priya, Luis |
| Invoices, paid and open | `/billing/invoices` and `/physician/billing` |
| A cancelled subscription | Nina Osei |
| A half-finished intake | Amy Fischer, still in draft |
| Progress photographs, one kept private | Jane and Priya, on the Photos tab |
| Working document downloads | Lab PDF and ID image, generated into `prisma/fixtures` |
| A populated access log | `/physician/audit` — two weeks of activity |

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run verify` | Types, lint, tests and a production build — run this before pushing |
| `npm run test` | Vitest, unit tests for the rules engine and encryption |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Reset demo data |
| `npm run db:reset` | Drop, migrate and re-seed |
| `npm run db:studio` | Prisma Studio, for looking at rows directly |

---

## Stack

Chosen against the brief's "preferred experience", and biased toward tools with a
large hiring pool so the client is never dependent on one developer.

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Backend | Next.js server actions and route handlers, Node 20 |
| Database | PostgreSQL 16, Prisma 7 with the `pg` driver adapter |
| Auth | Signed httpOnly session cookie (`jose`), bcrypt password hashing, role-based access |
| Payments | Stripe hosted checkout, webhook-driven state |
| Files | Encrypted object storage behind an authorised route (local dev, S3 in production) |
| Testing | Vitest |
| CI | GitHub Actions — types, lint, tests, build, against a real Postgres |

---

## Where things are

```
prisma/schema.prisma      the data model, commented
prisma/seed.ts            demo data, including the design board's patients
src/lib/rules.ts          the condition engine for branching and clinical flags
src/lib/clinical.ts       BMI, flag evaluation, derived values
src/lib/crypto.ts         PHI field encryption (AES-256-GCM)
src/lib/auth.ts           authorization; every patient record read goes through here
src/lib/audit.ts          the append-only access log
src/actions/              server actions, one file per area
src/app/                  routes
docs/                     architecture, security, deployment, clinical configuration
```

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the pieces fit together
- [docs/SECURITY.md](docs/SECURITY.md) — PHI boundary, encryption, audit, what is still outstanding
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — going to production, backups, restore drill
- [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md) — putting the demo on Vercel in about ten minutes
- [docs/CLINICAL-CONFIG.md](docs/CLINICAL-CONFIG.md) — how the physician changes questions and flags without a developer

---

## Scope

Built: intake with branching, configurable clinical flags, physician review and
documentation, recurring check-ins, secure messaging, progress tracking, document
upload, subscription billing, audit logging, role-based access, location eligibility.

Deliberately not built, and why: e-prescribing (EPCS brings its own identity-proofing
regime), lab ordering, insurance claims, video visits, native mobile apps. Each adds a
regulated integration or a second business model, and none is needed to prove the core
loop of enrol, review, follow up, bill. The integration points for them exist; the
integrations do not.
