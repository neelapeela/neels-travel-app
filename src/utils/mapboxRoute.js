/**
 * Trip map driving geometry via Mapbox Directions API (browser `fetch`).
 * Set `VITE_MAPBOX_ACCESS_TOKEN` (Mapbox **default public** token is fine for client-side Directions).
 * @see https://docs.mapbox.com/api/navigation/directions/
 */

import { isBrowserOnline } from './networkStatus.js'
import { routeDebugLog } from './routeDebug.js'

const MAPBOX_DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox/driving'

/** Mapbox allows up to 25 coordinates per Directions request (including all waypoints). */
const MAPBOX_MAX_COORDINATES_PER_REQUEST = 25

/** Meters each waypoint may move when snapped to the road graph (geocoded POIs are often off the centerline). */
const WAYPOINT_SNAP_RADIUS_METERS = 200

export function readCoord(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

export function stopsWithValidCoords(stops) {
  if (!Array.isArray(stops)) return []
  return stops
    .map((s) => {
      const lat = readCoord(s.latitude)
      const lng = readCoord(s.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
      return { ...s, latitude: lat, longitude: lng }
    })
    .filter(Boolean)
}

export function stopHasValidMapCoords(stop) {
  const lat = readCoord(stop?.latitude)
  const lng = readCoord(stop?.longitude)
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}

export function straightLinePositions(stops) {
  return stopsWithValidCoords(stops).map((s) => [s.latitude, s.longitude])
}

function getMapboxAccessToken() {
  const raw = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPBOX_ACCESS_TOKEN
  return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Split stops into chunks of at most `max` points, overlapping by one so the path is continuous.
 * @param {{ latitude: number, longitude: number }[]} coords
 */
export function chunkCoordsForMapbox(coords, max = MAPBOX_MAX_COORDINATES_PER_REQUEST) {
  if (coords.length <= max) return [coords]
  const chunks = []
  let start = 0
  while (start < coords.length) {
    const end = Math.min(start + max, coords.length)
    chunks.push(coords.slice(start, end))
    if (end === coords.length) break
    start = end - 1
  }
  return chunks
}

function mapboxPathSegment(coords) {
  return coords.map((c) => `${c.longitude},${c.latitude}`).join(';')
}

/**
 * @param {{ latitude: number, longitude: number }[]} chunk — ≥2 points
 * @returns {Promise<[number, number][]|null>} [lat, lng][] or null on failure
 */
async function fetchMapboxDrivingChunk(chunk, signal) {
  const token = getMapboxAccessToken()
  if (!token || chunk.length < 2) return null

  const path = mapboxPathSegment(chunk)
  const radiuses = Array.from({ length: chunk.length }, () => String(WAYPOINT_SNAP_RADIUS_METERS)).join(
    ';'
  )
  const qs = new URLSearchParams({
    access_token: token,
    geometries: 'geojson',
    // `full` follows road centerlines closely; `simplified` drops vertices and looks “off” on OSM basemaps at city zoom.
    overview: 'full',
    radiuses
  })
  const url = `${MAPBOX_DIRECTIONS_BASE}/${encodeURI(path)}?${qs}`

  routeDebugLog('Mapbox Directions request', {
    urlChars: url.length,
    waypointCount: chunk.length,
    url: url.length > 320 ? `${url.slice(0, 260)}…` : url.replace(token, '…TOKEN…')
  })

  let data
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      routeDebugLog('Mapbox Directions HTTP not OK → straight leg', {
        status: response.status,
        statusText: response.statusText,
        bodyPreview: errBody.slice(0, 220)
      })
      return null
    }
    data = await response.json()
  } catch (e) {
    if (e?.name === 'AbortError') {
      routeDebugLog('Mapbox Directions aborted')
      throw e
    }
    routeDebugLog('Mapbox Directions fetch error → straight leg', {
      name: e?.name,
      message: e?.message,
      cause: e?.cause?.message
    })
    return null
  }

  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) {
    routeDebugLog('Mapbox Directions response not usable → straight leg', {
      code: data?.code,
      message: data?.message
    })
    return null
  }

  const geom = data.routes[0].geometry
  const rawCoords = geom.coordinates
  if (!Array.isArray(rawCoords)) {
    routeDebugLog('Mapbox Directions geometry missing coordinates → straight leg')
    return null
  }

  const points = rawCoords
    .map((c) => {
      const lon = c[0]
      const lat = c[1]
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      return [lat, lon]
    })
    .filter(Boolean)

  if (points.length >= 2) {
    routeDebugLog('Mapbox Directions chunk OK', { polylinePoints: points.length })
    return points
  }

  routeDebugLog('Mapbox Directions geometry <2 points → straight leg', { parsed: points.length })
  return null
}

/**
 * Driving route through stops in order. One Mapbox request per chunk (max 25 waypoints each).
 *
 * @param {{ id: string, latitude: number, longitude: number }[]} sortedStops
 * @param {AbortSignal} [signal]
 * @returns {Promise<[number, number][]>}
 */
export async function fetchDrivingRoutePolyline(sortedStops, signal) {
  const coords = stopsWithValidCoords(sortedStops)
  if (coords.length < 2) {
    routeDebugLog('Mapbox route skipped: need ≥2 stops with valid lat/lng', {
      inputStops: sortedStops?.length ?? 0,
      routableStops: coords.length
    })
    return []
  }

  if (!isBrowserOnline()) {
    routeDebugLog('Mapbox route skipped: offline')
    return straightLinePositions(coords)
  }

  const token = getMapboxAccessToken()
  if (!token) {
    routeDebugLog('Mapbox route skipped: set VITE_MAPBOX_ACCESS_TOKEN')
    return straightLinePositions(coords)
  }

  const chunks = chunkCoordsForMapbox(coords)
  const merged = []

  try {
    for (let i = 0; i < chunks.length; i++) {
      if (signal?.aborted) {
        routeDebugLog('Mapbox route chain aborted (signal)')
        return []
      }
      const chunk = chunks[i]
      const segment = await fetchMapboxDrivingChunk(chunk, signal)
      if (!segment) {
        return straightLinePositions(coords)
      }
      if (merged.length === 0) merged.push(...segment)
      else merged.push(...segment.slice(1))
    }
  } catch (e) {
    if (e?.name === 'AbortError') {
      routeDebugLog('Mapbox route chain aborted')
      return []
    }
    throw e
  }

  if (merged.length >= 2) {
    routeDebugLog('Mapbox route chain complete', {
      chunks: chunks.length,
      polylinePoints: merged.length
    })
    return merged
  }

  return straightLinePositions(coords)
}
