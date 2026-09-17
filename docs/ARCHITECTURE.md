# Architecture

One application tier, one database, and a deliberately small set of outside
services. At this scale that is cheaper to run and far easier to reason about than
a distributed design, and it is easier for another developer to pick up.

```
Patient (mobile-first web)        Physician dashboard        Practice admin
                    |                     |                       |
                    +----------- TLS 1.2+ ----------+-------------+
                                          |
                            Next.js (App Router, Node 20)
                     server actions · route handlers · one auth layer
                                          |
        +---------------------+-----------+------------+
        |                     |                        |
   PostgreSQL 16        Object storage            Append-only
   (field-encrypted)    (encrypted files)          AuditLog
                                          |
                        -- PHI boundary ends here --
                                          |
              Stripe            Email / SMS            Analytics
          (tokens only)     (no clinical content)     (no PHI at all)
```

---

## The four flows

**Intake.** The patient answers a conditional questionnaire whose branching is
configuration. Answers are encrypted individually, the physician's flag rules run,
and the case enters the review queue with its flags attached. Nothing is decided
automatically.

**Physician review.** The clinician opens the queue, sees a summary, the answers as
the patient actually saw them, uploads, and the raised flags with the physician's own
guidance. They write a note — required — and set a status. The patient is told there
is an update, with no clinical detail in the notification.

**Follow-up.** A schedule issues recurring check-ins. Responses are recorded against
weight history, and a flag pushes the case back into the review queue rather than
into a report nobody opens.

**Billing.** The subscription lives in Stripe. The application stores a customer
reference and an internal patient id, and nothing else crosses that line.

---

## Decisions worth knowing

**Server actions over a REST API.** One fewer network boundary to authorise, and the
authorization check sits next to the query. A route handler is used where something
genuinely needs a URL — file downloads and the Stripe webhook.

**Prisma with the `pg` driver adapter.** Prisma 7 moved the connection URL out of the
schema and into `prisma7.config.ts`. The generated client lives in
`src/generated/prisma` and is committed to keep CI reproducible.

**Field encryption in the application, not the database.** It means the database
never holds readable PHI even to someone with a psql session, at the cost of not
being able to query encrypted values. That trade is right here: nothing searches
clinical answers, and patient search runs on name and email only.

**One rules engine for two jobs.** Question branching and clinical flags share
`src/lib/rules.ts`. One grammar, one evaluator, one test suite — and the physician
learns one mental model instead of two.

**An audit log that records reads.** Most audit implementations log writes, which is
the easy half and the less useful one.

**No autonomous clinical decision anywhere.** Flags route; humans decide. This is a
product constraint from the brief, and it is also what keeps the software out of
regulated clinical-decision-support territory.

---

## Swapping the pieces out

Each of these is deliberately behind one file, because "integration-ready" should
mean an adapter and not a rewrite.

| To change | Touch |
| --- | --- |
| Auth provider (Cognito, Auth0) | `src/lib/session.ts`, `src/lib/auth.ts` |
| File storage (S3, GCS) | `src/lib/storage.ts` — everything else deals in opaque keys |
| Payments | `src/lib/stripe.ts`, `src/actions/billing.ts` |
| Email / SMS transport | the `Notification` writes; content is a template key, never a body |

E-prescribing, labs and identity verification have no adapter yet on purpose. Each
brings its own compliance regime, and the interface should be designed against a
chosen vendor rather than guessed at now.
