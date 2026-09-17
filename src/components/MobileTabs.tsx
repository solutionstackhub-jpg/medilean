import Link from 'next/link'
import { HomeIcon, MailIcon, TrendIcon, ListIcon } from '@/components/icons'

/**
 * The phone mock-up in the comp has a bottom tab bar: Home, Messages, Progress,
 * More. On a real phone that is the primary navigation, so it appears below
 * 560px and the side rail steps out of the way.
 */
const TABS = [
  { href: '/dashboard', label: 'Home', Icon: HomeIcon },
  { href: '/messages', label: 'Messages', Icon: MailIcon },
  { href: '/progress', label: 'Progress', Icon: TrendIcon },
  { href: '/questionnaires', label: 'More', Icon: ListIcon },
]

export default function MobileTabs({ active, unread = 0 }: { active: string; unread?: number }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-[#17313b] bg-[#091820] pb-[env(safe-area-inset-bottom)] max-[560px]:grid max-[560px]:grid-cols-4"
      aria-label="Main"
    >
      {TABS.map((t) => {
        const on = active === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] no-underline ${
              on ? 'ml-green' : 'text-[#8fa2aa]'
            }`}
          >
            <t.Icon size={19} />
            {t.label}
            {t.href === '/messages' && unread ? (
              <span className="absolute right-1/2 top-1.5 ml-3 grid h-[15px] min-w-[15px] translate-x-full place-items-center rounded-full bg-[#58edb5] px-1 text-[9px] font-bold text-[#042016]">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
