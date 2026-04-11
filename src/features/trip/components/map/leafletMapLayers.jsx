import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { stopHasValidMapCoords } from '../../../../utils/mapboxRoute'

const FLY_ZOOM = 17

/** Left inset used for visible map area to the right of floating stop card. */
function effectiveLeftPadPx(map, rawPad) {
  if (!rawPad || rawPad <= 0) return 0
  const size = map.getSize()
  const pad = Math.min(
    Math.round(rawPad + 16 + rawPad * 0.08),
    Math.floor(size.x * 0.75),
    size.x - 80
  )
  if (pad <= 0 || size.x - pad < 88) return 0
  return pad
}

/** Map center so `latlng` sits in the visible band to the right of the floating stop card. */
function offsetCenterLatLngForFloatingCard(map, latlng, zoom, rawPad) {
  const size = map.getSize()
  const pad = effectiveLeftPadPx(map, rawPad)
  if (pad <= 0) return latlng

  const visibleW = size.x - pad
  const target = L.point(pad + visibleW / 2, size.y / 2)
  const viewHalf = size.divideBy(2)
  const stopPx = map.project(latlng, zoom)
  const newCenterPx = stopPx.subtract(target.subtract(viewHalf))
  return map.unproject(newCenterPx, zoom)
}

export function ResizeHandler({ shouldResizeMap, layoutResizeKey }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, shouldResizeMap, layoutResizeKey])
  return null
}

export function FitStopsToView({ coordinates, stops, fitViewKey }) {
  const map = useMap()
  const lastFitKeyRef = useRef('')

  const fitStops = useMemo(() => (stops || []).filter((s) => stopHasValidMapCoords(s)), [stops])

  useEffect(() => {
    const key = fitStops
      .map((s) => `${s.id}:${Number(s.latitude).toFixed(5)},${Number(s.longitude).toFixed(5)}`)
      .join('|')
    const combinedKey = `${fitViewKey || ''}::${key}`
    if (!key) {
      lastFitKeyRef.current = `${fitViewKey || ''}::(empty)`
      return
    }
    if (combinedKey === lastFitKeyRef.current) return
    map.stop()
    lastFitKeyRef.current = combinedKey

    const latLngs = fitStops.map((s) => L.latLng(Number(s.latitude), Number(s.longitude)))
    if (latLngs.length === 1) {
      map.flyTo(latLngs[0], Math.max(map.getZoom(), 14), { duration: 0.45, animate: true })
      return
    }

    const bounds = L.latLngBounds(latLngs)
    map.fitBounds(bounds, {
      padding: [44, 44],
      animate: true,
      duration: 0.5,
      maxZoom: 15
    })
  }, [map, fitStops, fitViewKey])

  useEffect(() => {
    if (!coordinates) return
    if (fitStops.length > 0) return
    map.setView(coordinates, 13, { animate: false })
  }, [map, coordinates, fitStops.length])

  return null
}

/**
 * Fly so the selected stop sits in the visual center above the sheet; padding is ref-backed so effect
 * deps stay stable. Clearing the stop recenters on the full map.
 */
export function FlyToSelectedStop({ focusStop, focusLeftPaddingPx = 0 }) {
  const map = useMap()
  const lastFlyTargetKeyRef = useRef('')
  const paddingRef = useRef(focusLeftPaddingPx)
  const flyAnimActiveRef = useRef(false)
  const sheetPadForStopRef = useRef({ id: null, pad: null })
  paddingRef.current = focusLeftPaddingPx

  useEffect(() => {
    if (focusStop) return undefined
    lastFlyTargetKeyRef.current = ''
    sheetPadForStopRef.current = { id: null, pad: null }
    return undefined
  }, [map, focusStop])

  /* eslint-disable react-hooks/exhaustive-deps -- flyTo must not depend on full `focusStop` object. */
  useEffect(() => {
    if (!focusStop || !Number.isFinite(focusStop.latitude) || !Number.isFinite(focusStop.longitude)) {
      lastFlyTargetKeyRef.current = ''
      return undefined
    }

    const key = `${focusStop.id}|${focusStop.latitude}|${focusStop.longitude}`
    if (lastFlyTargetKeyRef.current === key) return undefined
    lastFlyTargetKeyRef.current = key

    const latlng = L.latLng(focusStop.latitude, focusStop.longitude)
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
      const dest = offsetCenterLatLngForFloatingCard(map, latlng, FLY_ZOOM, paddingRef.current)
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

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!focusStop || !Number.isFinite(focusStop.latitude) || !Number.isFinite(focusStop.longitude)) {
      return undefined
    }
    if (focusLeftPaddingPx <= 0) return undefined

    const id = focusStop.id
    const prev = sheetPadForStopRef.current
    if (prev.id !== id) return undefined
    if (prev.pad === focusLeftPaddingPx) return undefined

    sheetPadForStopRef.current = { id, pad: focusLeftPaddingPx }

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
      const dest = offsetCenterLatLngForFloatingCard(map, latlng, FLY_ZOOM, focusLeftPaddingPx)
      map.once('moveend', onAdjustMoveEnd)
      map.flyTo(dest, FLY_ZOOM, { duration: 0.28, animate: true })
    }

    requestAnimationFrame(runAdjust)

    return () => {
      cancelled = true
      map.off('moveend', onAdjustMoveEnd)
      flyAnimActiveRef.current = false
    }
  }, [map, focusStop?.id, focusStop?.latitude, focusStop?.longitude, focusLeftPaddingPx])
  /* eslint-enable react-hooks/exhaustive-deps */

  return null
}
