import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TRIP_MAP_BAND_MIN_PX,
  TRIP_MAP_BAND_STORAGE_KEY,
  TRIP_TIMELINE_MIN_PX,
  TRIP_TIMELINE_SPLIT_HANDLE_PX,
  TRIP_TIMELINE_SPLIT_MQ
} from '../features/trip/constants'

function readStoredMapBand() {
  try {
    const raw = localStorage.getItem(TRIP_MAP_BAND_STORAGE_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= TRIP_MAP_BAND_MIN_PX ? n : null
  } catch {
    return null
  }
}

/**
 * Mobile stacked layout: drag handle between map and timeline adjusts map band height.
 * Persists to localStorage. Desktop side-by-side layout does not use the handle.
 */
export function useTripTimelineResize(timelineOpen) {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(TRIP_TIMELINE_SPLIT_MQ).matches
  )
  const [mapBandPx, setMapBandPx] = useState(() =>
    typeof window !== 'undefined' ? readStoredMapBand() : null
  )

  const mapColumnRef = useRef(null)
  const contentRef = useRef(null)
  const dragRef = useRef(null)

  const [splitDragging, setSplitDragging] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(TRIP_TIMELINE_SPLIT_MQ)
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const clampMapHeight = useCallback((h) => {
    const vMax = typeof window !== 'undefined' ? window.innerHeight * 0.72 : 560
    const lo = TRIP_MAP_BAND_MIN_PX
    let hi = Math.min(vMax, 560)
    const content = contentRef.current
    if (content) {
      const ch = content.getBoundingClientRect().height
      const gapAllowance = 28
      const maxFromLayout = ch - TRIP_TIMELINE_SPLIT_HANDLE_PX - TRIP_TIMELINE_MIN_PX - gapAllowance
      hi = Math.min(hi, Math.max(lo, maxFromLayout))
    }
    return Math.round(Math.min(Math.max(h, lo), hi))
  }, [])

  useEffect(() => {
    const onResize = () => {
      setMapBandPx((prev) => (prev == null ? null : clampMapHeight(prev)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampMapHeight])

  const persistHeight = useCallback((px) => {
    try {
      localStorage.setItem(TRIP_MAP_BAND_STORAGE_KEY, String(px))
    } catch {
      /* ignore quota */
    }
  }, [])

  const showHandle = Boolean(timelineOpen && isNarrow)

  /** Map band height so the grip center sits at clientY (viewport Y). */
  const mapHeightForGripCenterAt = useCallback(
    (clientY) => {
      const mapEl = mapColumnRef.current
      if (!mapEl) return null
      const mapTop = mapEl.getBoundingClientRect().top
      const half = TRIP_TIMELINE_SPLIT_HANDLE_PX / 2
      return clampMapHeight(clientY - mapTop - half)
    },
    [clampMapHeight]
  )

  const onResizePointerDown = useCallback(
    (e) => {
      if (!showHandle) return
      if (e.button !== 0) return
      const mapEl = mapColumnRef.current
      if (!mapEl) return
      const next = mapHeightForGripCenterAt(e.clientY)
      if (next != null) setMapBandPx(next)
      dragRef.current = { active: true }
      setSplitDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    },
    [showHandle, mapHeightForGripCenterAt]
  )

  const onResizePointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return
      const next = mapHeightForGripCenterAt(e.clientY)
      if (next != null) setMapBandPx(next)
    },
    [mapHeightForGripCenterAt]
  )

  const onResizePointerEnd = useCallback(
    (e) => {
      const wasDragging = Boolean(dragRef.current)
      dragRef.current = null
      setSplitDragging(false)
      try {
        if (e?.currentTarget && e.pointerId != null) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      } catch {
        /* already released */
      }
      if (wasDragging) {
        setMapBandPx((prev) => {
          if (prev != null) persistHeight(prev)
          return prev
        })
      }
    },
    [persistHeight]
  )

  const onResizeKeyDown = useCallback(
    (e) => {
      if (!showHandle) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const mapEl = mapColumnRef.current
      const base =
        mapBandPx ?? (mapEl ? mapEl.getBoundingClientRect().height : TRIP_MAP_BAND_MIN_PX + 80)
      const delta = e.key === 'ArrowUp' ? 12 : -12
      const next = clampMapHeight(base + delta)
      setMapBandPx(next)
      persistHeight(next)
    },
    [showHandle, mapBandPx, clampMapHeight, persistHeight]
  )

  const mapColumnStyle =
    showHandle && mapBandPx != null
      ? { height: `${mapBandPx}px`, flex: '0 0 auto', maxHeight: 'none' }
      : undefined

  const resizeHandleProps = {
    type: 'button',
    onPointerDown: onResizePointerDown,
    onPointerMove: onResizePointerMove,
    onPointerUp: onResizePointerEnd,
    onPointerCancel: onResizePointerEnd,
    onLostPointerCapture: onResizePointerEnd,
    onKeyDown: onResizeKeyDown
  }

  return {
    mapColumnRef,
    contentRef,
    mapColumnStyle,
    showHandle,
    mapBandPx,
    resizeHandleProps,
    splitDragging
  }
}
