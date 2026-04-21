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
function buildDirectionsUrl(path, token, { useSnapRadius }) {
  const qs = new URLSearchParams({
    access_token: token,
    geometries: 'geojson',
    // `full` follows road centerlines closely; `simplified` drops vertices and looks “off” on OSM basemaps at city zoom.
    overview: 'full'
  })
  if (useSnapRadius) {
    const radiuses = Array.from({ length: path.split(';').length }, () =>
      String(WAYPOINT_SNAP_RADIUS_METERS)
    ).join(';')
    qs.set('radiuses', radiuses)
  }
  return `${MAPBOX_DIRECTIONS_BASE}/${encodeURI(path)}?${qs}`
}

function parseDirectionsGeometry(data) {
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) return null
  const geom = data.routes[0].geometry
  const rawCoords = geom.coordinates
  if (!Array.isArray(rawCoords)) return null
  const points = rawCoords
    .map((c) => {
      const lon = c[0]
      const lat = c[1]
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      return [lat, lon]
    })
    .filter(Boolean)
  return points.length >= 2 ? points : null
}

async function fetchMapboxDrivingChunk(chunk, signal) {
  const token = getMapboxAccessToken()
  if (!token || chunk.length < 2) return null

  const path = mapboxPathSegment(chunk)

  const attempts = [
    { useSnapRadius: true, label: 'radiuses=200m' },
    { useSnapRadius: false, label: 'radiuses omitted (unlimited snap)' }
  ]

  for (let i = 0; i < attempts.length; i += 1) {
    const url = buildDirectionsUrl(path, token, attempts[i])

    routeDebugLog('Mapbox Directions request', {
      attempt: `${i + 1}/${attempts.length}`,
      snap: attempts[i].label,
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
          attempt: attempts[i].label,
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
        attempt: attempts[i].label,
        name: e?.name,
        message: e?.message,
        cause: e?.cause?.message
      })
      return null
    }

    const points = parseDirectionsGeometry(data)
    if (points) {
      routeDebugLog('Mapbox Directions chunk OK', { polylinePoints: points.length, snap: attempts[i].label })
      return points
    }

    const retryable = data?.code === 'NoSegment' || data?.code === 'NoRoute'
    if (!retryable || i === attempts.length - 1) {
      routeDebugLog('Mapbox Directions response not usable → straight leg', {
        code: data?.code,
        message: data?.message,
        routesCount: Array.isArray(data?.routes) ? data.routes.length : 0,
        snap: attempts[i].label
      })
      return null
    }

    routeDebugLog('Mapbox Directions retrying with relaxed waypoint snap', {
      code: data?.code,
      message: data?.message
    })
  }

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
