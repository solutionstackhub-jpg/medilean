'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from '@/components/icons'

/**
 * Marketing navigation.
 *
 * Every item goes somewhere. The four plain links scroll to their section and
 * highlight while it is on screen; Resources is a real dropdown that opens on
 * click, closes on Escape or an outside click, and is reachable by keyboard.
 */

const LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#treatments', label: 'Treatments' },
  { href: '#physicians', label: 'Our Physicians' },
  { href: '#pricing', label: 'Pricing' },
]

const RESOURCES = [
  { href: '#resources', label: 'Common questions' },
  { href: '#physicians', label: 'How we handle privacy' },
  { href: '#how-it-works', label: 'What happens after you sign up' },
]

export default function SiteNav() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  // Highlight whichever section is currently in view.
  useEffect(() => {
    const ids = [...LINKS.map((l) => l.href), '#resources'].map((h) => h.slice(1))
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive('#' + visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  // Close the dropdown on an outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <nav className="flex items-center gap-7 text-[13px] max-[1100px]:hidden">
      {LINKS.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className={`no-underline transition-colors ${
            active === l.href ? 'text-[#58edb5]' : 'text-[#e2e9eb] hover:text-white'
          }`}
        >
          {l.label}
        </a>
      ))}

      <div className="relative" ref={wrap}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-[inherit] text-[13px] transition-colors ${
            open || active === '#resources' ? 'text-[#58edb5]' : 'text-[#e2e9eb] hover:text-white'
          }`}
        >
          Resources
          <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-8 z-50 w-[260px] rounded-xl border border-[#29414a] bg-[#0c1d26] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,.45)]"
          >
            {RESOURCES.map((r) => (
              <a
                key={r.label}
                href={r.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-[13px] no-underline text-[#dbe5e8] hover:bg-[#12303a] hover:text-white"
              >
                {r.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  )
}
