import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  chunkCoordsForMapbox,
  fetchDrivingRoutePolyline,
  straightLinePositions,
  stopsWithValidCoords
} from '../../src/utils/mapboxRoute.js'

describe('mapboxRoute', () => {
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

  it('chunkCoordsForMapbox overlaps for >25 points', () => {
    const coords = Array.from({ length: 26 }, (_, i) => ({ latitude: i, longitude: i }))
    const chunks = chunkCoordsForMapbox(coords, 25)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(25)
    expect(chunks[1]).toHaveLength(2)
    expect(chunks[0][24]).toEqual(chunks[1][0])
  })

  describe('fetchDrivingRoutePolyline', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN', 'pk.test_token_for_vitest')
      vi.stubGlobal('fetch', vi.fn())
    })
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    })

    it('returns straight line when token is missing', async () => {
      vi.unstubAllEnvs()
      vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN', '')
      const stops = [
        { id: 'a', latitude: 51.5, longitude: -0.09 },
        { id: 'b', latitude: 51.51, longitude: -0.1 }
      ]
      const pts = await fetchDrivingRoutePolyline(stops)
      expect(pts).toEqual([
        [51.5, -0.09],
        [51.51, -0.1]
      ])
      expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it('returns straight line when Mapbox code is not Ok', async () => {
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
                type: 'LineString',
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
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(String(globalThis.fetch.mock.calls[0][0])).toContain('api.mapbox.com/directions/v5/mapbox/driving')
    })

    it('uses one request for three stops (multi-waypoint)', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-0.09, 51.5],
                  [-0.091, 51.501],
                  [-0.1, 51.51]
                ]
              }
            }
          ]
        })
      })
      const stops = [
        { id: 'a', latitude: 51.5, longitude: -0.09 },
        { id: 'b', latitude: 51.501, longitude: -0.091 },
        { id: 'c', latitude: 51.51, longitude: -0.1 }
      ]
      const pts = await fetchDrivingRoutePolyline(stops)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(pts[0]).toEqual([51.5, -0.09])
      expect(pts[pts.length - 1]).toEqual([51.51, -0.1])
      expect(pts.length).toBeGreaterThanOrEqual(3)
    })
  })
})
