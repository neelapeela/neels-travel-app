import { describe, expect, it } from 'vitest'
import { tripFromCacheJson, tripJsonReplacer, tripToCacheJson } from '../../src/utils/tripReadCache'

describe('tripReadCache JSON', () => {
  it('round-trips plain trip data', () => {
    const trip = {
      id: 't1',
      name: 'Paris',
      participants: ['a'],
      itinerary: [{ date: '2026-06-01', stops: [] }]
    }
    expect(tripFromCacheJson(tripToCacheJson(trip))).toEqual(trip)
  })

  it('serializes Firestore-like timestamps to ISO strings', () => {
    const ts = {
      seconds: 1700000000,
      nanoseconds: 0,
      toDate: () => new Date(1700000000000)
    }
    const trip = { id: 'x', createdAt: ts }
    const parsed = tripFromCacheJson(tripToCacheJson(trip))
    expect(parsed.createdAt).toBe('2023-11-14T22:13:20.000Z')
  })

  it('tripJsonReplacer leaves primitives unchanged', () => {
    expect(tripJsonReplacer('k', 42)).toBe(42)
    expect(tripJsonReplacer('k', 'hi')).toBe('hi')
  })
})
