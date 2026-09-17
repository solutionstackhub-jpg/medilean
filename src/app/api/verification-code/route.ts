import { NextResponse } from 'next/server'
import { emailIsSimulated, peekVerificationCode } from '@/actions/auth'

/**
 * Reads back the current verification code, and only while there is no mail
 * transport configured. In production `emailIsSimulated` is false and this
 * returns nothing, so it cannot be used to bypass verification.
 */
export async function GET() {
  if (!(await emailIsSimulated())) {
    return NextResponse.json({ code: null }, { status: 404 })
  }
  return NextResponse.json({ code: await peekVerificationCode() })
}
