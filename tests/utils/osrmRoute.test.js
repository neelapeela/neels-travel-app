import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchDrivingRoutePolyline,
  straightLinePositions,
  stopsWithValidCoords
} from '../../src/utils/osrmRoute.js'

describe('osrmRoute', () => {
  it('stopsWithValidCoords filters bad values', () => {
    expect(
      stopsWithValidCoords([
        { id: '1', latitude: 1, longitude: 2 },
        { id: '2', latitude: NaN, longitude: 0 },
        { id: '3', latitude: 0, longitude: 200 }
      ])
    ).toEqual([{ id: '1', latitude: 1, longitude: 2 }])
  })

  it('straightLinePositions preserves order', () => {
    expect(
      straightLinePositions([
        { latitude: 10, longitude: 20 },
        { latitude: 11, longitude: 21 }
      ])
    ).toEqual([
      [10, 20],
      [11, 21]
    ])
  })

  it('coerces string coordinates from Firestore/forms', () => {
    expect(
      stopsWithValidCoords([{ id: '1', latitude: '51.5', longitude: '-0.09' }])
    ).toEqual([{ id: '1', latitude: 51.5, longitude: -0.09 }])
    expect(straightLinePositions([{ latitude: '10', longitude: '20' }])).toEqual([[10, 20]])
  })

  describe('fetchDrivingRoutePolyline', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn())
    })
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns straight line when OSRM code is not Ok', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 'NoRoute' })
      })
      const stops = [
        { id: 'a', latitude: 51.5, longitude: -0.09 },
        { id: 'b', latitude: 51.51, longitude: -0.1 }
      ]
      const pts = await fetchDrivingRoutePolyline(stops)
      expect(pts).toEqual([
        [51.5, -0.09],
        [51.51, -0.1]
      ])
    })

    it('maps GeoJSON coordinates to Leaflet latlngs', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              geometry: {
                coordinates: [
                  [-0.1, 51.5],
                  [-0.11, 51.51]
                ]
              }
            }
          ]
        })
      })
      const stops = [
        { id: 'a', latitude: 51.5, longitude: -0.09 },
        { id: 'b', latitude: 51.51, longitude: -0.1 }
      ]
      const pts = await fetchDrivingRoutePolyline(stops)
      expect(pts).toEqual([
        [51.5, -0.1],
        [51.51, -0.11]
      ])
    })
  })
})
