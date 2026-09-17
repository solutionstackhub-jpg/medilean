'use client'

import Link from 'next/link'
import { useFormStatus } from 'react-dom'

/**
 * Onboarding step rail.
 *
 * Finished steps are links, so a patient can go back and change an answer. The
 * current step is marked with aria-current, and steps that are not open yet are
 * inert rather than looking clickable and doing nothing.
 */
export function Stepper({
  steps,
  current,
}: {
  steps: Array<{ n: number; label: string; href: string; done: boolean; reachable: boolean }>
  current: number
}) {
  return (
    <ol className="ml-steps">
      {steps.map((step) => {
        const isCurrent = step.n === current
        const canGo = step.reachable && !isCurrent
        const state = isCurrent ? 'is-on' : step.done ? 'is-done' : ''
        const body = (
          <>
            <i>{step.done && !isCurrent ? '✓' : step.n}</i>
            <span>{step.label}</span>
          </>
        )

        return (
          <li key={step.n} className={`ml-step ${state} ${canGo ? 'is-link' : ''}`}>
            {canGo ? (
              <Link href={step.href} className="ml-step-hit">
                {body}
              </Link>
            ) : (
              <span className="ml-step-hit" aria-current={isCurrent ? 'step' : undefined}>
                {body}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function SubmitButton({
  children,
  className = 'ml-btn ml-btn-primary w-full',
  pendingLabel,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="mt-3 rounded-md border border-[#5a2b2e] bg-[#2a1518] px-3 py-2.5 text-[13px] text-[#ff8a85]"
    >
      {message}
    </div>
  )
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'danger'
  children: React.ReactNode
}) {
  const tones = {
    info: 'border-[#1f4a4a] bg-[#0a2029] text-[#bfe6dc]',
    warn: 'border-[#4a3f1f] bg-[#231d10] text-[#f1c565]',
    danger: 'border-[#5a2b2e] bg-[#2a1518] text-[#ff8a85]',
  }
  return (
    <div className={`rounded-md border px-4 py-3 text-[13px] leading-relaxed ${tones[tone]}`}>
      {children}
    </div>
  )
}
