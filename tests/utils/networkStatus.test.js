import { describe, expect, it, vi, afterEach } from 'vitest'
import { isBrowserOnline } from '../../src/utils/networkStatus.js'

describe('networkStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when navigator is undefined', () => {
    vi.stubGlobal('navigator', undefined)
    expect(isBrowserOnline()).toBe(true)
  })

  it('reflects navigator.onLine', () => {
    vi.stubGlobal('navigator', { onLine: true })
    expect(isBrowserOnline()).toBe(true)
    vi.stubGlobal('navigator', { onLine: false })
    expect(isBrowserOnline()).toBe(false)
  })
})
