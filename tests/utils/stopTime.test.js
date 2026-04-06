import { describe, expect, it } from 'vitest'
import { formatStopTime, getSortMinutes, normalizeTimeInput } from '../../src/utils/stopTime'

describe('formatStopTime', () => {
  it('formats 24h string to 12h with minutes', () => {
    expect(formatStopTime('14:30', 9)).toBe('2:30 PM')
  })

  it('uses fallback hour when time invalid', () => {
    expect(formatStopTime(null, 7)).toBe('7:00 AM')
  })
})

describe('getSortMinutes', () => {
  it('parses stopTime string', () => {
    expect(getSortMinutes({ stopTime: '09:15' })).toBe(9 * 60 + 15)
  })

  it('falls back to timestamp fields', () => {
    expect(getSortMinutes({ timestampHour: 11, timestampMinute: 0 })).toBe(11 * 60)
  })
})

describe('normalizeTimeInput', () => {
  it('pads hours and minutes', () => {
    expect(normalizeTimeInput('9:5')).toBe('09:05')
  })

  it('defaults invalid input', () => {
    expect(normalizeTimeInput('')).toBe('09:00')
  })
})
