/**
 * Dev: `/api/osrm` → Vite proxy (same-origin `fetch`, no browser CORS).
 * Prod / preview: direct OSRM (demo usually sends CORS on 2xx; **error pages like 504 often omit CORS**, so the console shows a CORS error even when the real problem is timeout/upstream failure).
 * Override: `VITE_OSRM_BASE_URL` (no trailing slash).
 */
export function getOsrmBaseUrl() {
  const raw = typeof import.meta !== 'undefined' && import.meta.env?.VITE_OSRM_BASE_URL
  if (raw) return String(raw).replace(/\/$/, '')
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return '/api/osrm'
  }
  return 'https://router.project-osrm.org'
}

function routeDebugEnabled() {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ROUTE_DEBUG === 'true')
  )
}

/** Dev / `VITE_ROUTE_DEBUG=true`: OSRM fetch diagnostics (filter console by `[route]`). */
function routeLog(label, detail) {
  if (!routeDebugEnabled()) return
  if (detail !== undefined) console.info('[route]', label, detail)
  else console.info('[route]', label)
}

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

/**
 * @param {{ id: string, latitude: number, longitude: number }[]} sortedStops
 * @param {AbortSignal} [signal]
 * @returns {Promise<[number, number][]>}
 */
export async function fetchDrivingRoutePolyline(sortedStops, signal) {
  const coords = stopsWithValidCoords(sortedStops)
  if (coords.length < 2) {
    routeLog('OSRM skipped: need ≥2 stops with valid lat/lng', {
      inputStops: sortedStops?.length ?? 0,
      routableStops: coords.length
    })
    return []
  }

  const path = coords.map((s) => `${s.longitude},${s.latitude}`).join(';')
  const base = getOsrmBaseUrl()
  const url = `${base}/route/v1/driving/${encodeURI(path)}?overview=full&geometries=geojson`
  routeLog('OSRM request', {
    base,
    waypoints: coords.length,
    urlChars: url.length,
    url: url.length > 280 ? `${url.slice(0, 240)}…` : url
  })

  let data
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      routeLog('OSRM HTTP not OK → straight fallback', {
        status: response.status,
        statusText: response.statusText
      })
      return straightLinePositions(coords)
    }
    data = await response.json()
  } catch (e) {
    if (e?.name === 'AbortError') {
      routeLog('OSRM fetch aborted')
      return []
    }
    routeLog('OSRM fetch error → straight fallback', { name: e?.name, message: e?.message })
    return straightLinePositions(coords)
  }

  if (!data || data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
    routeLog('OSRM response not usable → straight fallback', {
      code: data?.code,
      message: data?.message,
      hasRoutes: Boolean(data?.routes?.length),
      hasGeometry: Boolean(data?.routes?.[0]?.geometry)
    })
    return straightLinePositions(coords)
  }

  const raw = data.routes[0].geometry.coordinates
  const points = raw
    .map((c) => {
      const lon = c[0]
      const lat = c[1]
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      return [lat, lon]
    })
    .filter(Boolean)

  if (points.length >= 2) {
    routeLog('OSRM OK', { polylinePoints: points.length })
    return points
  }

  routeLog('OSRM geometry parsed to <2 points → straight fallback', { parsed: points.length })
  return straightLinePositions(coords)
}
