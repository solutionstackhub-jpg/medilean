import { describe, expect, it } from 'vitest'
import { bmi, withDerived } from '@/lib/clinical'

describe('BMI', () => {
  it('matches the numbers on the design board', () => {
    // Emily Carter: 187 lb at 64 in -> 32.1
    expect(bmi(64, 187)).toBe(32.1)
    // Michael Roberts: 205 lb at 70 in -> 29.4
    expect(bmi(70, 205)).toBe(29.4)
    // Sarah Kim: 172 lb at 66 in -> 27.8
    expect(bmi(66, 172)).toBe(27.8)
  })

  it('returns null rather than NaN or Infinity when inputs are missing', () => {
    expect(bmi(null, 180)).toBeNull()
    expect(bmi(66, null)).toBeNull()
    expect(bmi(0, 180)).toBeNull()
    expect(bmi(undefined, undefined)).toBeNull()
  })
})

describe('derived values', () => {
  it('adds BMI so a physician can write a rule against it', () => {
    const out = withDerived({ height_in: 66, weight_lb: 172 })
    expect(out.bmi).toBe(27.8)
  })

  it('leaves answers untouched when BMI cannot be worked out', () => {
    const input = { weight_lb: 172 }
    expect(withDerived(input)).toEqual(input)
  })

  it('does not mutate the answers it was given', () => {
    const input = { height_in: 66, weight_lb: 172 }
    withDerived(input)
    expect(input).toEqual({ height_in: 66, weight_lb: 172 })
  })
})
