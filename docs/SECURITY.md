# Security and PHI handling

This document says what is protected, how, and what is still outstanding before
this could carry real patient data. It is deliberately explicit about the gaps.

---

## The PHI boundary

Anything that identifies a patient or describes their health is PHI. The design
keeps it inside a small number of components and keeps it away from everything
else on purpose.

### Inside the boundary — a BAA is required with each of these

| Component | Holds | Notes |
| --- | --- | --- |
| PostgreSQL | Everything clinical, encrypted at the field level | Managed Postgres with encryption at rest |
| Object storage | Lab results, ID documents, progress photographs | Encrypted before write; never publicly addressable |
| Application servers | PHI in memory during a request | Logs are scrubbed; see below |

### Outside the boundary — kept out by design, not by promise

| Vendor | Receives | How that is kept true |
| --- | --- | --- |
| Stripe | A customer token and an internal reference | No diagnosis, medication or note in metadata, product names or receipt descriptions. Enforced in `src/lib/stripe.ts` — `safeMetadata()` is the only metadata the app sends |
| Email / SMS | A template key such as `new_message` | `Notification` rows store a template key, never message content. The outbound message says only that something is waiting |
| Analytics | Nothing | No analytics tag is loaded on any page that renders PHI |

The notification rule matters more than it looks. Even with a signed BAA, the risk
being removed is not the vendor — it is the patient's own inbox, a shared phone, or
a screen someone else glances at.

---

## Encryption

Field-level AES-256-GCM on top of whatever the database does at rest, because
encryption at rest only protects the disk. A leaked backup, a careless `SELECT *`
in a support tool, or a read replica shared with an analytics vendor all show
ciphertext instead of names and diagnoses.

Encrypted columns are suffixed `Enc` in `prisma/schema.prisma`: patient date of
birth, address, phone, every questionnaire answer, every message body, every
clinical note, and every uploaded filename. Filenames are encrypted because
`biopsy_results_positive.pdf` is a disclosure on its own.

Ciphertext is `v1.<iv>.<tag>.<ciphertext>`. The version prefix exists so a key can
be rotated by adding a `v2` writer and keeping the `v1` reader until a backfill
finishes, without a schema migration.

`PHI_ENC_KEY` must decode to exactly 32 bytes. The application throws on startup if
it is missing or the wrong length rather than silently writing plaintext.

---

## Authentication and access

- Passwords hashed with bcrypt. A failed login does the same work whether or not the
  address exists, so the form cannot be used to enumerate accounts.
- Sessions are a signed httpOnly cookie holding an id and a role and nothing else.
  Eight hours, then re-authenticate.
- Authorization is deny by default. Every read of a patient record goes through
  `canAccessPatient()` in `src/lib/auth.ts`, so there is one place to audit and one
  place to fix. Hiding a link in the UI is not access control.
- A patient sees only their own record. A physician sees patients. An administrator
  has no clinical read access by default — administration and care are different jobs.
- Progress photographs are private to the patient unless they choose to share them,
  and the file route enforces that separately from the ordinary role check.

---

## Audit logging

`AuditLog` records reads as well as writes, because after an incident the question is
always who *looked* at a chart, not who edited one. Every row carries the actor, the
action, the record, the patient, the time, the IP and the user agent. `patientId` is
denormalised onto every row so "everyone who touched this patient" is one index scan.

Patients can see their own access log at `/profile`. That is not a nicety — it is the
kind of transparency the regulation is built around.

**In production, grant the application's database role INSERT on `AuditLog` but not
UPDATE or DELETE**, so the trail cannot be quietly tidied up:

```sql
REVOKE UPDATE, DELETE ON "AuditLog" FROM medilean_app;
GRANT INSERT, SELECT ON "AuditLog" TO medilean_app;
```

An audit write failing never fails the request that triggered it, but it logs loudly.
In production that log line should page someone.

---

## What is still outstanding

Honest list. None of these is hard; all of them are required before real patients.

1. **Signed BAAs** with the cloud provider, the object store and any error-tracking
   vendor. Start the paperwork early — it has a lead time and it blocks go-live, not
   development.
2. **MFA for clinician accounts.** Patient accounts can reasonably stay
   password-and-email; a physician account that can read every chart cannot.
3. **Log scrubbing with tests around it.** Right now the application avoids logging
   PHI by convention. That belongs in code with a test that fails if a message body
   ever reaches a log line.
4. **Rate limiting** on login, verification codes and document downloads.
5. ~~**Session revocation.**~~ Done. Every request re-checks the account behind the
   cookie, so a deleted or suspended user is signed out immediately and a role
   change takes effect at once, rather than whenever the token happens to expire.
   See `loadValidSession` in `src/lib/auth.ts` and `tests/session.test.ts`.
6. **Key management.** `PHI_ENC_KEY` should come from a managed secret store with
   rotation, not from an environment file.
7. **Backup restore drill**, rehearsed and written down. See DEPLOYMENT.md.
8. **Penetration test** before launch.
9. **Verification codes are printed to the server console** in development. Wire the
   real email and SMS transport, keeping clinical content out of both.
