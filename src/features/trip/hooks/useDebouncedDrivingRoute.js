import { useEffect, useMemo, useRef, useState } from 'react'
import { getSortMinutes } from '../../../utils/stopTime'
import {
  fetchDrivingRoutePolyline,
  readCoord,
  stopHasValidMapCoords,
  straightLinePositions
} from '../../../utils/mapboxRoute'
import { isRouteDebugEnabled, routeDebugLog } from '../../../utils/routeDebug'
import { ROUTE_FETCH_DEBOUNCE_MS } from '../constants'

/**
 * Chronological stops → debounced Mapbox driving polyline. Refetch key is stable string of id + rounded
 * lat/lng (not stop array identity) so Firestore churn does not restart fetch every snapshot.
 */
export function useDebouncedDrivingRoute(stops, debounceMs = ROUTE_FETCH_DEBOUNCE_MS) {
  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => getSortMinutes(a) - getSortMinutes(b)),
    [stops]
  )

  const routeStopsKey = useMemo(
    () =>
      sortedStops
        .filter((s) => stopHasValidMapCoords(s))
        .map((s) => {
          const lat = readCoord(s.latitude)
          const lng = readCoord(s.longitude)
          return `${s.id}:${lat.toFixed(5)},${lng.toFixed(5)}`
        })
        .join('|'),
    [sortedStops]
  )

  const sortedStopsRef = useRef(sortedStops)
  const routeStopsKeyRef = useRef(routeStopsKey)
  sortedStopsRef.current = sortedStops
  routeStopsKeyRef.current = routeStopsKey

  const straightFallback = useMemo(() => straightLinePositions(sortedStops), [sortedStops])
  const [routePoints, setRoutePoints] = useState([])

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
    setRoutePoints([])

    const stopsSnapshot = sortedStops
    const nRoutable = stopsSnapshot.filter((s) => stopHasValidMapCoords(s)).length

    if (debug) {
      routeDebugLog('MapView route effect', {
        routeStopsKey: routeStopsKey || '(empty)',
        sortedStopCount: stopsSnapshot.length,
        routableStopCount: nRoutable,
        debounceMs
      })
    }

    const timeoutId = setTimeout(() => {
      if (routeStopsKeyRef.current !== keyWhenScheduled) {
        if (debug) routeDebugLog('MapView skipped debounced fetch (key changed before fire)')
        return
      }
      const latest = sortedStopsRef.current
      if (debug) {
        routeDebugLog('MapView debounced route fetch', {
          key: keyWhenScheduled || '(empty)',
          stopCount: latest.length
        })
      }
      void (async () => {
        let points = []
        try {
          points = await fetchDrivingRoutePolyline(latest, undefined)
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
        if (points.length > 1) {
          if (debug) routeDebugLog('MapView applying polyline', { pointCount: points.length })
          setRoutePoints(points)
        } else if (debug) {
          routeDebugLog('MapView not updating state (≤1 routable point)', { pointCount: points.length })
        }
      })()
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [routeStopsKey])
  /* eslint-enable react-hooks/exhaustive-deps */

  const routeToDraw = routePoints.length > 1 ? routePoints : straightFallback
  const polylineKey = `${routeStopsKey}#${routePoints.length}`

  return { sortedStops, routeToDraw, polylineKey }
}
