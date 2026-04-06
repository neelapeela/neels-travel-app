import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { formatStopTime, getSortMinutes } from '../../../utils/stopTime'
import {
  fetchDrivingRoutePolyline,
  readCoord,
  stopHasValidMapCoords,
  straightLinePositions
} from '../../../utils/osrmRoute'
import '../trip.css'
import { OSRM_FETCH_DEBOUNCE_MS } from '../constants'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function ResizeHandler({ shouldResizeMap }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, shouldResizeMap])
  return null
}

const FLY_ZOOM = 17

/** Bottom inset used for “visible map band” above the sheet (buffer + clamps). */
function effectiveSheetPadPx(map, rawPad) {
  if (!rawPad || rawPad <= 0) return 0
  const size = map.getSize()
  const pad = Math.min(
    Math.round(rawPad + 20 + rawPad * 0.08),
    Math.floor(size.y * 0.82),
    size.y - 52
  )
  if (pad <= 0 || size.y - pad < 44) return 0
  return pad
}

/**
 * Map center (lat/lng) such that `latlng` appears at the target pixel row for the sheet inset — one smooth
 * `flyTo` instead of fly-to-center + abrupt `panBy`.
 */
function offsetCenterLatLngForSheet(map, latlng, zoom, rawPad) {
  const size = map.getSize()
  const pad = effectiveSheetPadPx(map, rawPad)
  if (pad <= 0) return latlng

  const visibleH = size.y - pad
  const target = L.point(size.x / 2, visibleH / 2)
  const viewHalf = size.divideBy(2)
  const stopPx = map.project(latlng, zoom)
  const newCenterPx = stopPx.subtract(target.subtract(viewHalf))
  return map.unproject(newCenterPx, zoom)
}

/**
 * Fly so the stop ends in the visual center of the band above the sheet; padding is ref-backed so the
 * fly effect deps stay stable. Closing the stop flies back to center the pin in the full map.
 */
function FlyToSelectedStop({ focusStop, focusBottomPaddingPx = 0 }) {
  const map = useMap()
  const lastFlyTargetKeyRef = useRef('')
  const paddingRef = useRef(focusBottomPaddingPx)
  const flyAnimActiveRef = useRef(false)
  /** Stop position for re-centering the full map when the sheet closes. */
  const lastSelectedStopLatLngRef = useRef(null)
  /** Tracks padding for the current stop so we only run a follow-up fly when inset changes (resize). */
  const sheetPadForStopRef = useRef({ id: null, pad: null })
  paddingRef.current = focusBottomPaddingPx

  useEffect(() => {
    if (focusStop) return undefined
    lastFlyTargetKeyRef.current = ''
    sheetPadForStopRef.current = { id: null, pad: null }
    const restore = lastSelectedStopLatLngRef.current
    lastSelectedStopLatLngRef.current = null
    if (!restore) return undefined
    const z = map.getZoom()
    const raf = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false })
      map.flyTo(restore, z, { duration: 0.38, animate: true })
    })
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [map, focusStop])

  /* eslint-disable react-hooks/exhaustive-deps -- flyTo must not depend on full `focusStop` or padding (see module comment). */
  useEffect(() => {
    if (!focusStop || !Number.isFinite(focusStop.latitude) || !Number.isFinite(focusStop.longitude)) {
      lastFlyTargetKeyRef.current = ''
      return undefined
    }

    const key = `${focusStop.id}|${focusStop.latitude}|${focusStop.longitude}`
    if (lastFlyTargetKeyRef.current === key) return undefined
    lastFlyTargetKeyRef.current = key

    const latlng = L.latLng(focusStop.latitude, focusStop.longitude)
    lastSelectedStopLatLngRef.current = latlng
    sheetPadForStopRef.current = { id: focusStop.id, pad: paddingRef.current }

    let cancelled = false
    let rafOuter
    let rafInner

    const onFlyMoveEnd = () => {
      if (cancelled) return
      flyAnimActiveRef.current = false
    }

    const run = () => {
      if (cancelled) return
      map.invalidateSize({ pan: false })
      flyAnimActiveRef.current = true
      const dest = offsetCenterLatLngForSheet(map, latlng, FLY_ZOOM, paddingRef.current)
      map.flyTo(dest, FLY_ZOOM, { duration: 0.55, animate: true })
      map.once('moveend', onFlyMoveEnd)
    }

    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(run)
    })

    return () => {
      cancelled = true
      flyAnimActiveRef.current = false
      if (rafOuter != null) cancelAnimationFrame(rafOuter)
      if (rafInner != null) cancelAnimationFrame(rafInner)
      map.off('moveend', onFlyMoveEnd)
    }
  }, [map, focusStop?.id, focusStop?.latitude, focusStop?.longitude])
  /* eslint-enable react-hooks/exhaustive-deps */

  /* Same stop, inset changed (e.g. sheet resize): short fly to updated offset center. */
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!focusStop || !Number.isFinite(focusStop.latitude) || !Number.isFinite(focusStop.longitude)) {
      return undefined
    }
    if (focusBottomPaddingPx <= 0) return undefined

    const id = focusStop.id
    const prev = sheetPadForStopRef.current
    if (prev.id !== id) return undefined
    if (prev.pad === focusBottomPaddingPx) return undefined

    sheetPadForStopRef.current = { id, pad: focusBottomPaddingPx }

    const latlng = L.latLng(focusStop.latitude, focusStop.longitude)
    let cancelled = false

    const onAdjustMoveEnd = () => {
      flyAnimActiveRef.current = false
    }

    const runAdjust = () => {
      if (cancelled) return
      if (flyAnimActiveRef.current) {
        requestAnimationFrame(runAdjust)
        return
      }
      map.invalidateSize({ pan: false })
      flyAnimActiveRef.current = true
      const dest = offsetCenterLatLngForSheet(map, latlng, FLY_ZOOM, focusBottomPaddingPx)
      map.once('moveend', onAdjustMoveEnd)
      map.flyTo(dest, FLY_ZOOM, { duration: 0.28, animate: true })
    }

    requestAnimationFrame(runAdjust)

    return () => {
      cancelled = true
      map.off('moveend', onAdjustMoveEnd)
      flyAnimActiveRef.current = false
    }
  }, [map, focusStop?.id, focusStop?.latitude, focusStop?.longitude, focusBottomPaddingPx])
  /* eslint-enable react-hooks/exhaustive-deps */

  return null
}

const createStopIcon = (orderNumber) =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker">${orderNumber}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

const createSpecialIcon = (symbol) =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker special">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

const createLodgingHomeIcon = () =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker special lodging" title="Lodging"><svg class="lodging-marker-home" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

export default function MapView({ coordinates, shouldResizeMap, stops, focusStop, focusBottomPaddingPx = 0 }) {
  const [routePoints, setRoutePoints] = useState([])
  const sortedStopsRef = useRef([])
  const routeStopsKeyRef = useRef('')
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

  sortedStopsRef.current = sortedStops
  routeStopsKeyRef.current = routeStopsKey

  const straightFallback = useMemo(() => straightLinePositions(sortedStops), [sortedStops])

  const routeToDraw = routePoints.length > 1 ? routePoints : straightFallback

  /* eslint-disable react-hooks/exhaustive-deps -- only refetch when stop coords/ids change (string), not when Firestore replaces the stops array. */
  useEffect(() => {
    const debug =
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ROUTE_DEBUG === 'true')

    const keyWhenScheduled = routeStopsKey
    let alive = true
    const ac = new AbortController()
    setRoutePoints([])

    const stopsSnapshot = sortedStops
    const nRoutable = stopsSnapshot.filter((s) => stopHasValidMapCoords(s)).length

    if (debug) {
      console.info('[route] MapView effect', {
        routeStopsKey: routeStopsKey || '(empty)',
        sortedStopCount: stopsSnapshot.length,
        routableStopCount: nRoutable,
        osrmAfterMs: OSRM_FETCH_DEBOUNCE_MS
      })
    }

    const timeoutId = setTimeout(() => {
      if (!alive) return
      if (routeStopsKeyRef.current !== keyWhenScheduled) {
        if (debug) console.info('[route] MapView skipped debounced fetch (key changed before fire)')
        return
      }
      const latest = sortedStopsRef.current
      if (debug) {
        console.info('[route] MapView debounced OSRM run', {
          key: keyWhenScheduled || '(empty)',
          stopCount: latest.length
        })
      }
      void (async () => {
        const points = await fetchDrivingRoutePolyline(latest, ac.signal)
        if (!alive) {
          if (debug) console.info('[route] MapView ignored stale result (unmounted / key changed)')
          return
        }
        if (ac.signal.aborted) {
          if (debug) console.info('[route] MapView ignored aborted fetch')
          return
        }
        if (points.length > 1) {
          if (debug) console.info('[route] MapView applying polyline', { pointCount: points.length })
          setRoutePoints(points)
        } else if (debug) {
          console.info('[route] MapView not updating state (≤1 point from OSRM)', { pointCount: points.length })
        }
      })()
    }, OSRM_FETCH_DEBOUNCE_MS)

    return () => {
      alive = false
      clearTimeout(timeoutId)
      ac.abort()
    }
  }, [routeStopsKey])

  const polylineKey = `${routeStopsKey}#${routePoints.length}`

  return (
    <div className="map-view">
      <MapContainer
        center={coordinates}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        {routeToDraw.length > 1 && (
          <Polyline
            key={polylineKey}
            positions={routeToDraw}
            pathOptions={{ color: '#8B6F5A', weight: 5, opacity: 0.92 }}
          />
        )}
        {sortedStops.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[readCoord(stop.latitude), readCoord(stop.longitude)]}
            icon={
              stop.stopType === 'flight'
                ? createSpecialIcon('✈')
                : stop.stopType === 'lodging'
                  ? createLodgingHomeIcon()
                  : createStopIcon(
                      sortedStops.filter((item, itemIndex) => item.stopType !== 'flight' && item.stopType !== 'lodging' && itemIndex <= index).length
                    )
            }
          >
            <Popup>
              <div><strong>{stop.title}</strong></div>
              <div>{stop.location || 'Address not provided'}</div>
              <div>{formatStopTime(stop.stopTime, stop.timestampHour)}</div>
            </Popup>
          </Marker>
        ))}
        <FlyToSelectedStop focusStop={focusStop} focusBottomPaddingPx={focusBottomPaddingPx} />
        <ResizeHandler shouldResizeMap={shouldResizeMap} />
      </MapContainer>
    </div>
  )
}