import Link from 'next/link'
import { logout } from '@/actions/auth'
import MobileTabs from '@/components/MobileTabs'
import {
  Leaf, HomeIcon, TrendIcon, ClipboardIcon, MailIcon, FileIcon, CardIcon,
  UserIcon, UsersIcon, WarningIcon, ListIcon, FlagIcon, MapIcon, PowerIcon,
  CalendarIcon, ReportIcon, SettingsIcon, BellIcon,
} from '@/components/icons'

type IconComponent = (props: { className?: string; size?: number }) => React.ReactElement
import type { Role } from '@/generated/prisma/enums'

export type NavItem = {
  href: string
  label: string
  Icon: IconComponent
  badge?: number | null
  danger?: boolean
}

export const PATIENT_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { href: '/progress', label: 'Progress', Icon: TrendIcon },
  { href: '/questionnaires', label: 'Questionnaires', Icon: ClipboardIcon },
  { href: '/messages', label: 'Messages', Icon: MailIcon },
  { href: '/documents', label: 'Documents', Icon: FileIcon },
  { href: '/billing', label: 'Billing', Icon: CardIcon },
  { href: '/profile', label: 'My Profile', Icon: UserIcon },
]

export function physicianNav(pendingCount: number, flaggedCount: number): NavItem[] {
  return [
    { href: '/physician/overview', label: 'Dashboard', Icon: HomeIcon },
    { href: '/physician', label: 'Patient Queue', Icon: ListIcon, badge: pendingCount },
    { href: '/physician/flagged', label: 'Flagged', Icon: WarningIcon, badge: flaggedCount, danger: true },
    { href: '/physician/patients', label: 'Patients', Icon: UsersIcon },
    { href: '/physician/messages', label: 'Messages', Icon: MailIcon },
    { href: '/physician/calendar', label: 'Calendar', Icon: CalendarIcon },
    { href: '/physician/notes', label: 'Clinical Notes', Icon: ClipboardIcon },
    { href: '/physician/billing', label: 'Billing', Icon: CardIcon },
    { href: '/physician/reports', label: 'Reports', Icon: ReportIcon },
    { href: '/physician/audit', label: 'Access Log', Icon: FileIcon },
    { href: '/physician/settings', label: 'Settings', Icon: SettingsIcon },
  ]
}

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/flags', label: 'Clinical Flags', Icon: FlagIcon },
  { href: '/admin/states', label: 'Licensed States', Icon: MapIcon },
  { href: '/admin/audit', label: 'Audit Log', Icon: FileIcon },
]

/**
 * The application chrome from the design board: a fixed left rail with the
 * brand and the menu, a toolbar across the top of the work area, and the page
 * itself below. The rail collapses to a horizontal scroller under 900px, which
 * is what the original stylesheet did.
 */
export default function AppShell({
  nav,
  active,
  role,
  userName,
  roleLabel,
  toolbar,
  children,
  notifications,
  notificationsHref,
}: {
  nav: NavItem[]
  active: string
  role: Role
  userName: string
  roleLabel?: string
  toolbar?: React.ReactNode
  children: React.ReactNode
  /** Unread count behind the bell in the toolbar. */
  notifications?: number
  notificationsHref?: string
}) {
  const isPatient = role === 'PATIENT'

  return (
    <div className={`ml-shell min-h-screen p-5 max-[560px]:p-0 ${isPatient ? 'max-[560px]:pb-[68px]' : ''}`}>
      <section className="ml-card grid min-h-[calc(100vh-40px)] grid-cols-[210px_1fr] max-[900px]:grid-cols-1 max-[560px]:rounded-none">
        {/* --------------------------------------------------------- rail */}
        <aside
          className={`border-r border-[#17313b] p-3.5 max-[900px]:border-b max-[900px]:border-r-0 ${
            isPatient ? 'max-[560px]:hidden' : ''
          }`}
        >
          <Link
            href="/"
            className="mx-1.5 mb-4 flex items-center gap-2 text-[15px] font-extrabold no-underline text-ink max-[900px]:mb-2"
          >
            <Leaf className="ml-green" size={18} /> MediLean
          </Link>

          <nav className="flex flex-col gap-0.5 max-[900px]:flex-row max-[900px]:overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`ml-menu no-underline whitespace-nowrap ${active === item.href ? 'is-on' : ''}`}
              >
                <item.Icon />
                {item.label}
                {item.badge ? (
                  <span className={`ml-auto ${item.danger ? 'ml-danger' : 'ml-green'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-5 border-t border-[#17313b] pt-3 max-[900px]:hidden">
            <div className="px-3 text-[13px]">{userName}</div>
            <div className="ml-sub px-3 text-[11px]">{roleLabel ?? role}</div>
            <form action={logout}>
              <button type="submit" className="ml-menu mt-1.5 w-full text-left">
                <PowerIcon /> Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* --------------------------------------------------------- work */}
        <main className="min-w-0 p-6 max-[560px]:p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">{toolbar}</div>
            <div className="flex flex-none items-center gap-4">
              {notificationsHref ? (
                <Link
                  href={notificationsHref}
                  className="relative text-[#a1b1b7] no-underline hover:text-white"
                  aria-label={
                    notifications
                      ? `${notifications} unread message${notifications === 1 ? '' : 's'}`
                      : 'Messages'
                  }
                >
                  <BellIcon size={20} />
                  {notifications ? (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#58edb5] px-1 text-[10px] font-bold text-[#042016]">
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  ) : null}
                </Link>
              ) : null}

              <div className="text-right text-[13px]">
                <div>{userName}</div>
                <div className="ml-sub text-[11px]">{roleLabel ?? role}</div>
              </div>
            </div>
          </div>
          {children}
        </main>
      </section>

      {isPatient ? <MobileTabs active={active} unread={notifications ?? 0} /> : null}
    </div>
  )
}
