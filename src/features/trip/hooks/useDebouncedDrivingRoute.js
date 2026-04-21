import { useEffect, useMemo, useRef, useState } from 'react'
import { getSortMinutes } from '../../../utils/stopTime'
import {
  fetchDrivingRoutePolyline,
  readCoord,
  stopHasValidMapCoords,
  stopsWithValidCoords
} from '../../../utils/mapboxRoute'
import { isRouteDebugEnabled, routeDebugLog } from '../../../utils/routeDebug'
import { ROUTE_FETCH_DEBOUNCE_MS } from '../constants'

const isFlightStop = (stop) => stop?.stopType === 'flight'

const getFlightLeg = (stop) => {
  const explicit = String(stop?.metadata?.flightLeg || '').toLowerCase()
  if (explicit === 'departure' || explicit === 'arrival') return explicit
  const title = String(stop?.title || '').toLowerCase()
  if (title.includes('departure')) return 'departure'
  if (title.includes('arrival')) return 'arrival'
  return ''
}

const getFlightKey = (stop) => {
  const pairId = String(stop?.metadata?.flightPairId || '').trim()
  if (pairId) return `PAIR:${pairId}`

  const flightNumber = String(stop?.metadata?.flightNumber || '').trim().toUpperCase()
  const travelerId = String(stop?.metadata?.travelerId || '').trim()
  if (flightNumber && travelerId) return `FLT:${flightNumber}::TRV:${travelerId}`

  const participantIds = Array.isArray(stop?.metadata?.participantIds)
    ? stop.metadata.participantIds.filter(Boolean).map(String).sort().join(',')
    : ''
  if (flightNumber && participantIds) return `FLT:${flightNumber}::GRP:${participantIds}`

  const fallback = String(stop?.metadata?.flightNumber || stop?.title || stop?.id || '')
    .trim()
    .toUpperCase()
  return fallback ? `LEGACY:${fallback}` : ''
}

const segmentKey = (start, end) => `${start.id}->${end.id}`

function buildCurvedArcSegment(from, to, bend = 0.18, points = 24) {
  const start = [readCoord(from.latitude), readCoord(from.longitude)]
  const end = [readCoord(to.latitude), readCoord(to.longitude)]
  if (start.some((n) => !Number.isFinite(n)) || end.some((n) => !Number.isFinite(n))) return []

  const lat1 = start[0]
  const lon1 = start[1]
  const lat2 = end[0]
  const lon2 = end[1]
  const meanLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180)
  const lonScale = Math.max(0.25, Math.cos(meanLatRad))
  const dx = (lon2 - lon1) * lonScale
  const dy = lat2 - lat1
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return [start, end]

  const midX = ((lon1 + lon2) / 2) * lonScale
  const midY = (lat1 + lat2) / 2
  const perpX = -dy / len
  const perpY = dx / len
  const controlX = midX + perpX * len * bend
  const controlY = midY + perpY * len * bend

  const result = []
  for (let i = 0; i <= points; i += 1) {
    const t = i / points
    const inv = 1 - t
    const x = inv * inv * (lon1 * lonScale) + 2 * inv * t * controlX + t * t * (lon2 * lonScale)
    const y = inv * inv * lat1 + 2 * inv * t * controlY + t * t * lat2
    result.push([y, x / lonScale])
  }
  return result
}

/**
 * Chronological stops → debounced Mapbox driving polyline. Refetch key is stable string of id + rounded
 * lat/lng (not stop array identity) so Firestore churn does not restart fetch every snapshot.
 */
export function useDebouncedDrivingRoute(stops, debounceMs = ROUTE_FETCH_DEBOUNCE_MS) {
  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => getSortMinutes(a) - getSortMinutes(b)),
    [stops]
  )

  const { drivingChunks, dottedFlightSegments, mapboxConnectorPairs, routeStopsKey } = useMemo(() => {
    const withCoords = sortedStops.map((stop) => ({
      stop,
      valid: stopHasValidMapCoords(stop),
      lat: readCoord(stop?.latitude),
      lng: readCoord(stop?.longitude)
    }))

    const chunks = []
    let currentChunk = []
    for (const item of withCoords) {
      if (isFlightStop(item.stop) || !item.valid) {
        if (currentChunk.length) chunks.push(currentChunk)
        currentChunk = []
        continue
      }
      currentChunk.push(item.stop)
    }
    if (currentChunk.length) chunks.push(currentChunk)

    const findPrevGround = (index) => {
      for (let i = index - 1; i >= 0; i -= 1) {
        if (!isFlightStop(withCoords[i].stop) && withCoords[i].valid) return withCoords[i].stop
      }
      return null
    }
    const findNextGround = (index) => {
      for (let i = index + 1; i < withCoords.length; i += 1) {
        if (!isFlightStop(withCoords[i].stop) && withCoords[i].valid) return withCoords[i].stop
      }
      return null
    }

    const connectorMap = new Map()
    const depQueueByKey = new Map()
    const dottedSegments = []

    for (let index = 0; index < withCoords.length; index += 1) {
      const item = withCoords[index]
      if (!item.valid || !isFlightStop(item.stop)) continue
      const leg = getFlightLeg(item.stop)
      const key = getFlightKey(item.stop)
      if (!key || !leg) continue

      if (leg === 'departure') {
        const prevGround = findPrevGround(index)
        if (prevGround) connectorMap.set(segmentKey(prevGround, item.stop), [prevGround, item.stop])
        if (!depQueueByKey.has(key)) depQueueByKey.set(key, [])
        depQueueByKey.get(key).push(item.stop)
      } else if (leg === 'arrival') {
        const nextGround = findNextGround(index)
        if (nextGround) connectorMap.set(segmentKey(item.stop, nextGround), [item.stop, nextGround])
        const queue = depQueueByKey.get(key) || []
        if (queue.length) {
          const departureStop = queue.shift()
          dottedSegments.push([departureStop, item.stop])
          depQueueByKey.set(key, queue)
        }
      }
    }

    const key = withCoords
      .filter((item) => item.valid)
      .map((item) => {
        const stop = item.stop
        const flightTag =
          isFlightStop(stop) ? `${getFlightKey(stop)}:${getFlightLeg(stop) || 'unknown'}` : 'ground'
        return `${stop.id}:${stop.stopType}:${flightTag}:${item.lat.toFixed(5)},${item.lng.toFixed(5)}`
      })
      .join('|')

    return {
      drivingChunks: chunks.filter((chunk) => chunk.length >= 2),
      dottedFlightSegments: dottedSegments,
      mapboxConnectorPairs: Array.from(connectorMap.values()),
      routeStopsKey: key
    }
  }, [sortedStops])

  const drivingChunksRef = useRef(drivingChunks)
  const routeStopsKeyRef = useRef(routeStopsKey)
  drivingChunksRef.current = drivingChunks
  routeStopsKeyRef.current = routeStopsKey

  const [drivingRouteSegments, setDrivingRouteSegments] = useState([])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /* eslint-disable react-hooks/exhaustive-deps -- intentionally only `routeStopsKey`: same key means same geometry key despite new stop array references from Firestore. */
  useEffect(() => {
    const debug = isRouteDebugEnabled()
    const keyWhenScheduled = routeStopsKey
    setDrivingRouteSegments([])

    const nRoutable = drivingChunks.reduce((sum, chunk) => sum + chunk.length, 0)

    if (debug) {
      routeDebugLog('MapView route effect', {
        routeStopsKey: routeStopsKey || '(empty)',
        sortedStopCount: sortedStops.length,
        routeCandidateCount: nRoutable,
        drivingChunkCount: drivingChunks.length,
        dottedFlightSegmentCount: dottedFlightSegments.length,
        solidConnectorCount: mapboxConnectorPairs.length,
        routableStopCount: nRoutable,
        debounceMs
      })
    }

    const timeoutId = setTimeout(() => {
      if (routeStopsKeyRef.current !== keyWhenScheduled) {
        if (debug) routeDebugLog('MapView skipped debounced fetch (key changed before fire)')
        return
      }
      const latestChunks = drivingChunksRef.current
      if (debug) {
        routeDebugLog('MapView debounced route fetch', {
          key: keyWhenScheduled || '(empty)',
          chunkCount: latestChunks.length
        })
      }
      void (async () => {
        const fetchedSegments = []
        try {
          for (const chunk of latestChunks) {
            const points = await fetchDrivingRoutePolyline(chunk, undefined)
            if (points.length > 1) {
              fetchedSegments.push(points)
            } else {
              const straight = stopsWithValidCoords(chunk).map((s) => [s.latitude, s.longitude])
              if (straight.length > 1) fetchedSegments.push(straight)
            }
          }
          for (const [from, to] of mapboxConnectorPairs) {
            const connectorStops = [from, to]
            const points = await fetchDrivingRoutePolyline(connectorStops, undefined)
            if (points.length > 1) {
              fetchedSegments.push(points)
            } else {
              const straight = stopsWithValidCoords(connectorStops).map((s) => [s.latitude, s.longitude])
              if (straight.length > 1) fetchedSegments.push(straight)
            }
          }
        } catch (err) {
          if (debug) console.warn('[route] MapView route fetch threw', err)
          return
        }
        if (!mountedRef.current) {
          if (debug) routeDebugLog('MapView ignored route result (unmounted)')
          return
        }
        if (routeStopsKeyRef.current !== keyWhenScheduled) {
          if (debug) routeDebugLog('MapView ignored stale route result (routeStopsKey changed)')
          return
        }
        if (fetchedSegments.length > 0) {
          if (debug) {
            routeDebugLog('MapView applying polyline', {
              segmentCount: fetchedSegments.length,
              pointCount: fetchedSegments.reduce((sum, seg) => sum + seg.length, 0)
            })
          }
          setDrivingRouteSegments(fetchedSegments)
        } else if (debug) {
          routeDebugLog('MapView not updating state (≤1 routable point)', { pointCount: 0 })
        }
      })()
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [routeStopsKey])
  /* eslint-enable react-hooks/exhaustive-deps */

  const dottedFlightSegmentPositions = useMemo(
    () => dottedFlightSegments.map(([from, to]) => buildCurvedArcSegment(from, to)),
    [dottedFlightSegments]
  )

  const regularRouteSegments = drivingRouteSegments
  const polylineKey = `${routeStopsKey}#${regularRouteSegments.length}#${dottedFlightSegmentPositions.length}`

  return {
    sortedStops,
    regularRouteSegments,
    dottedFlightSegmentPositions,
    polylineKey
  }
}
