/**
 * Icon set.
 *
 * The design comp uses line icons; the pixel-match HTML stood in for them with
 * unicode characters like ♙ and ▥, which render as whatever glyph the machine
 * happens to have. These are the real thing: inline SVG, currentColor, no icon
 * font and no extra network request.
 */

type IconProps = { className?: string; size?: number }

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

/** The MediLean mark: a two-tone leaf. */
export function Leaf({ className, size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20.5 3.5C12 3 5.5 6.5 4 13c-.8 3.4.4 6 2 7.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity=".55"
      />
      <path
        d="M20.5 3.5c1 8.5-3.2 14.2-9.5 15.3-2.8.5-5-.3-6.5-1.3 1-6.8 6.6-12.4 16-14z"
        fill="currentColor"
      />
    </svg>
  )
}

export function UserIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6" />
    </svg>
  )
}

export function ShieldIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3l7 2.6v5.2c0 4.4-2.9 8.2-7 10.2-4.1-2-7-5.8-7-10.2V5.6L12 3z" />
      <path d="M9.2 12.1l2 2 3.6-3.8" />
    </svg>
  )
}

export function ChartIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 18V11" />
      <path d="M12 18V6" />
      <path d="M18 18v-4.5" />
    </svg>
  )
}

export function ClipboardIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 4h6v2.4H9z" />
      <path d="M15 5.2h2.2A1.8 1.8 0 0119 7v12a1.8 1.8 0 01-1.8 1.8H6.8A1.8 1.8 0 015 19V7a1.8 1.8 0 011.8-1.8H9" />
      <path d="M9 12.6l2 2 4-4.2" />
    </svg>
  )
}

export function TrendIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 16.5l4.5-4.8 3.2 3 6.3-6.6" />
      <path d="M14.4 8.1H18v3.6" />
    </svg>
  )
}

export function MailIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.2" y="5.5" width="17.6" height="13" rx="2.2" />
      <path d="M4 7.2l8 5.6 8-5.6" />
    </svg>
  )
}

export function ChevronDown({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2}>
      <path d="M6 9.5l6 5.5 6-5.5" />
    </svg>
  )
}

export function ArrowRight({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2}>
      <path d="M4.5 12h14" />
      <path d="M13 6.5l5.5 5.5-5.5 5.5" />
    </svg>
  )
}

/** The little green bar cluster beside "Small Steps Big Change". */
export function BarCluster({ className }: { className?: string }) {
  return (
    <svg width="30" height="26" viewBox="0 0 30 26" fill="none" className={className} aria-hidden>
      <rect x="1" y="15" width="5" height="10" rx="1.6" fill="currentColor" opacity=".55" />
      <rect x="9" y="9" width="5" height="16" rx="1.6" fill="currentColor" opacity=".8" />
      <rect x="17" y="3" width="5" height="22" rx="1.6" fill="currentColor" />
    </svg>
  )
}

export function LockIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4.8" y="10.4" width="14.4" height="9.4" rx="2.2" />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 017.6 0v2.6" />
    </svg>
  )
}

export function StethoscopeIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 3.5v5a4 4 0 008 0v-5" />
      <path d="M10 15.5v1.2a3.8 3.8 0 007.6 0v-2.2" />
      <path d="M10 12.4v3.1" />
      <circle cx="17.6" cy="12.3" r="2" />
    </svg>
  )
}

/* --------------------------------------------------- application rail icons */

export function HomeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 10.4L12 4l8 6.4" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

export function FileIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M13.5 3.5H7A1.8 1.8 0 005.2 5.3v13.4A1.8 1.8 0 007 20.5h10a1.8 1.8 0 001.8-1.8V8.8z" />
      <path d="M13.5 3.5v5.3h5.3" />
    </svg>
  )
}

export function CardIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.2" y="6" width="17.6" height="12" rx="2.2" />
      <path d="M3.2 10h17.6" />
    </svg>
  )
}

export function UsersIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9.5" cy="8.5" r="3" />
      <path d="M3.5 19.5c.5-3.1 3-4.9 6-4.9s5.5 1.8 6 4.9" />
      <path d="M16 6.2a3 3 0 010 5.6" />
      <path d="M17.6 14.9c1.7.6 2.7 1.9 3 4.6" />
    </svg>
  )
}

export function WarningIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4.4l8.2 14.2H3.8z" />
      <path d="M12 10v3.6" />
      <path d="M12 16.4h.01" />
    </svg>
  )
}

export function ListIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8.5 7h11" />
      <path d="M8.5 12h11" />
      <path d="M8.5 17h11" />
      <path d="M4.6 7h.01M4.6 12h.01M4.6 17h.01" />
    </svg>
  )
}

export function FlagIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 21V4" />
      <path d="M6 4.6h11.2l-2.3 4 2.3 4H6" />
    </svg>
  )
}

export function MapIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 21s6.4-5.6 6.4-10.2A6.4 6.4 0 005.6 10.8C5.6 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.3" />
    </svg>
  )
}

export function PowerIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3.6v7.6" />
      <path d="M7.4 6.6a7 7 0 109.2 0" />
    </svg>
  )
}

export function CalendarIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.6" y="5.4" width="16.8" height="15" rx="2.2" />
      <path d="M3.6 10h16.8" />
      <path d="M8.4 3.4v3.4M15.6 3.4v3.4" />
    </svg>
  )
}

export function ReportIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.6" y="4" width="16.8" height="16.4" rx="2.2" />
      <path d="M8 16v-3.4M12 16V9M16 16v-5" />
    </svg>
  )
}

export function SettingsIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.2 14.4a1.6 1.6 0 00.32 1.76l.06.06a1.9 1.9 0 11-2.7 2.7l-.06-.06a1.6 1.6 0 00-1.76-.32 1.6 1.6 0 00-.97 1.47v.17a1.9 1.9 0 11-3.8 0v-.09a1.6 1.6 0 00-1.05-1.47 1.6 1.6 0 00-1.76.32l-.06.06a1.9 1.9 0 11-2.7-2.7l.06-.06a1.6 1.6 0 00.32-1.76 1.6 1.6 0 00-1.47-.97h-.17a1.9 1.9 0 110-3.8h.09a1.6 1.6 0 001.47-1.05 1.6 1.6 0 00-.32-1.76l-.06-.06a1.9 1.9 0 112.7-2.7l.06.06a1.6 1.6 0 001.76.32h.08a1.6 1.6 0 00.97-1.47v-.17a1.9 1.9 0 113.8 0v.09a1.6 1.6 0 00.97 1.47 1.6 1.6 0 001.76-.32l.06-.06a1.9 1.9 0 112.7 2.7l-.06.06a1.6 1.6 0 00-.32 1.76v.08a1.6 1.6 0 001.47.97h.17a1.9 1.9 0 110 3.8h-.09a1.6 1.6 0 00-1.47.97z" />
    </svg>
  )
}

export function BellIcon({ className, size = 19 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 9.4a6 6 0 10-12 0c0 5.4-2 7-2 7h16s-2-1.6-2-7" />
      <path d="M13.7 19.6a2 2 0 01-3.4 0" />
    </svg>
  )
}

export function ImageIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.6" y="5" width="16.8" height="14" rx="2.2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.4 16.6l4.4-4 3.3 3 3-2.6 4.5 4" />
    </svg>
  )
}
