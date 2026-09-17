import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { describe, type Condition } from '@/lib/rules'
import { DERIVED_KEYS } from '@/lib/clinical'
import AppShell, { ADMIN_NAV, physicianNav } from '@/components/AppShell'
import { queueCounts } from '@/lib/queue'
import { toggleFlagRule } from '@/actions/flags'
import RuleEditor from './RuleEditor'

/**
 * Clinical flag rules.
 *
 * This screen exists because of one line in the brief: clinical protocols are
 * supplied and approved by the physician, and the software's job is to apply
 * them. A threshold change should be a form submission, not a release.
 */
export default async function FlagsPage() {
  const session = await requireRole('ADMIN', 'PHYSICIAN')

  const [me, rules, questionnaires, counts, firing] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.flagRule.findMany({ orderBy: [{ active: 'desc' }, { severity: 'desc' }, { label: 'asc' }] }),
    prisma.questionnaire.findMany({
      where: { active: true },
      include: { questions: { orderBy: { order: 'asc' } } },
    }),
    queueCounts(),
    prisma.raisedFlag.groupBy({ by: ['ruleId'], where: { resolvedAt: null }, _count: true }),
  ])

  await audit({
    actorId: session.userId,
    actorRole: session.role,
    action: 'flag_rules.view',
    entity: 'FlagRule',
    meta: { count: rules.length },
  })

  const firingCount = new Map(firing.map((f) => [f.ruleId, f._count]))

  // Everything a rule can be written against: every question in every active
  // questionnaire, plus the values the system derives.
  const fields = [
    ...questionnaires.flatMap((q) =>
      q.questions.map((question) => ({
        key: question.key,
        label: question.label,
        source: q.title,
        type: question.type,
        options: (question.options as Array<{ value: string; label: string }> | null) ?? null,
      })),
    ),
    ...DERIVED_KEYS.map((key) => ({
      key,
      label: key.toUpperCase() + ' (calculated)',
      source: 'Derived by MediLean',
      type: 'NUMBER' as const,
      options: null,
    })),
  ].filter((f, i, arr) => arr.findIndex((x) => x.key === f.key) === i)

  const severityTone = { HIGH: 'is-red', MEDIUM: 'is-yellow', LOW: '' } as const

  return (
    <AppShell
      nav={session.role === 'ADMIN' ? ADMIN_NAV : physicianNav(counts.pending, counts.flagged)}
      active="/admin/flags"
      role={session.role}
      userName={me.fullName}
      roleLabel={session.role === 'ADMIN' ? 'Administrator' : 'Physician'}
      toolbar={
        <>
          <h2 className="text-[22px] font-bold">Clinical Flags</h2>
          <div className="ml-sub">
            Rules you control. MediLean runs them and routes the case to a clinician — it never
            decides anything itself.
          </div>
        </>
      }
    >
      <div className="grid grid-cols-[1.25fr_1fr] gap-3 max-[900px]:grid-cols-1">
        <section className="ml-card">
          <div className="ml-card-title">
            {rules.length} rule{rules.length === 1 ? '' : 's'}
          </div>
          <div className="p-5">
            {rules.map((rule) => {
              const open = firingCount.get(rule.id) ?? 0
              return (
                <div
                  key={rule.id}
                  className={`border-b border-line py-4 last:border-0 ${rule.active ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`ml-pill ${severityTone[rule.severity]}`}>{rule.severity}</span>
                        <strong className="text-[14px]">{rule.label}</strong>
                        {open > 0 ? (
                          <span className="ml-sub text-[11px]">
                            firing on {open} open case{open === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>

                      <div className="ml-sub mt-2 font-mono text-[12px]">
                        when {describe(rule.condition as unknown as Condition)}
                      </div>

                      {rule.guidance ? (
                        <div className="ml-sub mt-1.5 text-[12px] italic">{rule.guidance}</div>
                      ) : null}
                    </div>

                    <form action={toggleFlagRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button className="ml-btn-review" type="submit">
                        {rule.active ? 'Turn off' : 'Turn on'}
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <RuleEditor fields={fields} />
      </div>

      <p className="ml-sub mt-5 text-[11px]">
        Changing a rule affects new submissions and any case re-evaluated afterwards. Flags already
        acknowledged by a clinician are left alone.
      </p>
    </AppShell>
  )
}
