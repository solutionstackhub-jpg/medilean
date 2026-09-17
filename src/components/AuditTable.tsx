import { prisma } from '@/lib/db'

/**
 * The access log, made readable.
 *
 * An audit trail nobody can read is a compliance decoration. This shows who did
 * what, to whose record, and when — including reads, which is the question that
 * actually gets asked after an incident.
 */

const ACTION_COPY: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.login_failed': 'Failed sign-in attempt',
  'auth.signup': 'Created an account',
  'auth.email_verified': 'Verified their email',
  'dashboard.view': 'Opened their dashboard',
  'queue.view': 'Opened the review queue',
  'submission.view': 'Opened a patient chart',
  'submission.submit': 'Submitted an intake',
  'submission.save_draft': 'Saved an intake draft',
  'submission.decision': 'Recorded a clinical decision',
  'submission.flags_evaluated': 'Flag rules were evaluated',
  'flag.acknowledged': 'Acknowledged a flag',
  'flag_rule.create': 'Created a flag rule',
  'flag_rule.update': 'Edited a flag rule',
  'flag_rule.toggle': 'Turned a flag rule on or off',
  'flag_rules.view': 'Viewed the flag rules',
  'thread.view': 'Opened a message thread',
  'message.send': 'Sent a message',
  'document.upload': 'Uploaded a document',
  'document.download': 'Downloaded a document',
  'document.delete': 'Deleted a document',
  'document.access_denied': 'Was refused access to a document',
  'document.access_denied_private': 'Was refused a private photograph',
  'document.share_changed': 'Changed who can see a document',
  'documents.view': 'Viewed their documents',
  'billing.view': 'Viewed billing',
  'followup.submit': 'Completed a check-in',
  'patient.profile_saved': 'Saved their profile',
  'subscription.activated_simulated': 'Started a plan (simulated)',
  'subscription.canceled': 'Cancelled their plan',
}

const SENSITIVE = new Set([
  'submission.view',
  'document.download',
  'thread.view',
  'document.access_denied',
  'document.access_denied_private',
  'auth.login_failed',
])

export default async function AuditTable({
  patientId,
  limit = 100,
}: {
  patientId?: string
  limit?: number
}) {
  const rows = await prisma.auditLog.findMany({
    where: patientId ? { patientId } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { fullName: true, email: true } } },
  })

  const patientIds = [...new Set(rows.map((r) => r.patientId).filter(Boolean) as string[])]
  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, fullName: true },
  })
  const nameOf = new Map(patients.map((p) => [p.id, p.fullName]))

  return (
    <div className="overflow-x-auto">
      <table className="ml-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Did what</th>
            <th>Whose record</th>
            <th>From</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="ml-sub py-10 text-center">
                Nothing recorded yet.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="ml-sub whitespace-nowrap">{r.createdAt.toLocaleString()}</td>
                <td>
                  {r.actor?.fullName ?? 'Anonymous'}
                  {r.actorRole ? (
                    <div className="ml-sub text-[11px]">{r.actorRole.toLowerCase()}</div>
                  ) : null}
                </td>
                <td className={SENSITIVE.has(r.action) ? 'text-[#f1c565]' : ''}>
                  {ACTION_COPY[r.action] ?? r.action}
                </td>
                <td className="ml-sub">
                  {r.patientId ? (nameOf.get(r.patientId) ?? r.patientId.slice(0, 8)) : '—'}
                </td>
                <td className="ml-sub whitespace-nowrap">{r.ip ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
