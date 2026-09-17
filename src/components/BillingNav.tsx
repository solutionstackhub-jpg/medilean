import Link from 'next/link'
import { CardIcon, FileIcon, ClipboardIcon, SettingsIcon, HomeIcon } from '@/components/icons'

/** The billing sub-rail from the comp. */
const ITEMS = [
  { href: '/billing', label: 'Overview', Icon: HomeIcon },
  { href: '/billing/methods', label: 'Payment Methods', Icon: CardIcon },
  { href: '/billing/invoices', label: 'Invoices', Icon: FileIcon },
  { href: '/billing/subscription', label: 'Subscription', Icon: ClipboardIcon },
  { href: '/billing/settings', label: 'Settings', Icon: SettingsIcon },
]

export default function BillingNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-col gap-0.5 border-r border-[#17313b] py-5 pr-4 max-[880px]:flex-row max-[880px]:overflow-x-auto max-[880px]:border-b max-[880px]:border-r-0 max-[880px]:pb-3 max-[880px]:pr-0">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`ml-menu whitespace-nowrap no-underline ${active === i.href ? 'is-on' : ''}`}
        >
          <i.Icon />
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
