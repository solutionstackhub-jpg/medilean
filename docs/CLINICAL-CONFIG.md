# Clinical configuration

The brief is explicit: clinical protocols, contraindication logic, treatment
decisions and prescribing policy are supplied and approved by the physician. The
developer's job is to implement configurable, secure workflows — not to define
medical standards of care.

That sentence drove the whole design. Nothing clinical is written in code. A
threshold change is a form submission, not a release.

---

## Clinical flags — `/admin/flags`

A flag is a rule the physician writes that routes a case to a human. It never
approves, declines or prescribes anything; it puts a labelled warning in front of a
clinician, with guidance the physician wrote.

The editor builds conditions from a dropdown of every question in every active
questionnaire, plus values the system derives. No JSON, no syntax to learn. Each
saved rule is displayed back in plain English:

```
conditions includes high_bp AND bp_controlled is no
pregnancy_status is pregnant OR pregnancy_status is breastfeeding
bmi is under 27
alcohol_weekly is at least 14
```

Severity is `HIGH`, `MEDIUM` or `LOW` and changes only how prominently the flag is
shown. It does not gate anything on its own.

**Turning a rule off** keeps its history. Flags already acknowledged by a clinician
are left alone — switching a rule off does not erase the record that it once fired.

**Editing a rule** affects new submissions and any case re-evaluated afterwards.
Re-evaluation reconciles: a flag that no longer fires is removed, so correcting an
answer clears its warning instead of leaving a stale one on the chart.

Before a rule is saved the application runs it once against an empty answer set. A
condition that throws is refused, so a broken rule cannot sit there silently never
firing — which is worse than an obviously broken one.

---

## Questions and branching

Questions live in the `Questionnaire` and `Question` tables. A question with a
`showIf` condition is shown only when that condition passes, using the same grammar
as flag rules.

For example, the medication question appears only for patients who ticked Type 2
Diabetes:

```json
{ "question": "conditions", "op": "includes", "value": "diabetes_t2" }
```

Branching is evaluated in the browser so the form reacts as the patient types, and
**again on the server before anything is stored**. The browser decides what to show;
it never decides what is accepted. Answers to questions the patient never saw are
discarded rather than saved, so a clinician reading the chart later sees only what
was actually asked.

Editing questions currently means a database change or a seed edit. A question editor
screen is the obvious next piece of work; the data model is already shaped for it,
including `version` on `Questionnaire` so a change does not rewrite the meaning of
submissions already in the record.

---

## Derived values

Some things a physician wants to write rules against are calculated rather than
typed. They appear in the editor's dropdown marked "Derived by MediLean".

| Key | Meaning |
| --- | --- |
| `bmi` | Calculated from `height_in` and `weight_lb`, rounded to one decimal |

Adding another is one entry in `DERIVED_KEYS` and one line in `withDerived()` in
`src/lib/clinical.ts`.

---

## Condition grammar

For reference, or for writing a rule directly in the database.

```
{ all: [ ... ] }              every child must pass
{ any: [ ... ] }              at least one child must pass
{ not: condition }            negation
{ question, op, value }       a single test
```

Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `includes`, `excludes`,
`answered`, `blank`.

Two behaviours worth knowing, both tested in `tests/rules.test.ts`:

- Numeric comparisons compare numbers, not strings, so `9` is not "over 14".
- A missing answer never satisfies a numeric comparison. An unanswered BMI does not
  fire "BMI is under 27". Silence is not a clinical finding.

---

## Licensed states — `/admin/states`

Which states the practice can accept patients from is a row an administrator
toggles, not a constant in the source. A patient whose state is closed is stopped
during onboarding, before they fill in a full medical history that nobody could
review.

Closing a state affects new sign-ups only. Patients already under care are not
touched.
