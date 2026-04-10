import { useCallback, useEffect, useRef, useState } from 'react'

const TOUCH_ACTIVATE_DELAY_MS = 120
const EDGE_SCROLL_ZONE_PX = 56
const EDGE_SCROLL_MAX_SPEED = 14
const DRAG_START_MOVE_PX = 4

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const readDropHourFromPoint = (clientX, clientY) => {
  const el = document.elementFromPoint(clientX, clientY)
  const row = el?.closest?.('[data-timeline-hour]')
  if (!row) return null
  const hour = Number(row.getAttribute('data-timeline-hour'))
  return Number.isFinite(hour) ? hour : null
}

export function useTouchPillDrag({ stops, onMoveStop }) {
  const [touchHeldId, setTouchHeldId] = useState(null)
  const [touchGhost, setTouchGhost] = useState(null)
  const [touchHiddenId, setTouchHiddenId] = useState(null)

  const touchSessionRef = useRef(null)
  const touchDelayTimerRef = useRef(null)
  const autoScrollRafRef = useRef(null)
  const autoScrollVelocityRef = useRef(0)
  const stopsRef = useRef(stops)
  const onMoveStopRef = useRef(onMoveStop)
  stopsRef.current = stops
  onMoveStopRef.current = onMoveStop

  const clearTouchDrag = useCallback(() => {
    if (touchDelayTimerRef.current != null) {
      window.clearTimeout(touchDelayTimerRef.current)
      touchDelayTimerRef.current = null
    }
    if (autoScrollRafRef.current != null) {
      window.cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = null
    }
    autoScrollVelocityRef.current = 0
    const session = touchSessionRef.current
    if (session?.listeners) {
      window.removeEventListener('pointermove', session.listeners.move, true)
      window.removeEventListener('pointerup', session.listeners.end, true)
      window.removeEventListener('pointercancel', session.listeners.end, true)
    }
    if (session?.scrollEl) {
      session.scrollEl.classList.remove('time-panel-scroll--drag-locked')
    }
    if (session?.captured && session?.sourceEl?.hasPointerCapture?.(session.pointerId)) {
      try {
        session.sourceEl.releasePointerCapture(session.pointerId)
      } catch {
        // no-op
      }
    }
    touchSessionRef.current = null
    setTouchHeldId(null)
    setTouchGhost(null)
    setTouchHiddenId(null)
  }, [])

  const updateAutoScrollVelocity = useCallback((clientY) => {
    const session = touchSessionRef.current
    if (!session?.scrollEl) {
      autoScrollVelocityRef.current = 0
      return
    }
    const rect = session.scrollEl.getBoundingClientRect()
    let velocity = 0
    if (clientY < rect.top + EDGE_SCROLL_ZONE_PX) {
      const intensity = (rect.top + EDGE_SCROLL_ZONE_PX - clientY) / EDGE_SCROLL_ZONE_PX
      velocity = -Math.max(1, Math.round(intensity * EDGE_SCROLL_MAX_SPEED))
    } else if (clientY > rect.bottom - EDGE_SCROLL_ZONE_PX) {
      const intensity = (clientY - (rect.bottom - EDGE_SCROLL_ZONE_PX)) / EDGE_SCROLL_ZONE_PX
      velocity = Math.max(1, Math.round(intensity * EDGE_SCROLL_MAX_SPEED))
    }
    autoScrollVelocityRef.current = velocity
  }, [])

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current != null) return
    const tick = () => {
      autoScrollRafRef.current = null
      const session = touchSessionRef.current
      if (!session || !session.activated || !session.scrollEl) return
      const velocity = autoScrollVelocityRef.current
      if (velocity !== 0) {
        session.scrollEl.scrollTop += velocity
      }
      autoScrollRafRef.current = window.requestAnimationFrame(tick)
    }
    autoScrollRafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const handleStopPointerEnd = useCallback(
    (event) => {
      const session = touchSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      if (session.activated) {
        if (event.cancelable) event.preventDefault()
        const targetHour = readDropHourFromPoint(session.lastX, session.lastY)
        const stop = stopsRef.current.find((s) => s.id === session.stopId)
        if (stop && targetHour != null) {
          const fromHour = Number(stop.timestampHour)
          if (Number.isFinite(fromHour) && targetHour !== fromHour) {
            onMoveStopRef.current(session.stopId, targetHour)
          }
        }
      }
      clearTouchDrag()
    },
    [clearTouchDrag]
  )

  const handleStopPointerMove = useCallback(
    (event) => {
      const session = touchSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      const clampedX = session.timelineRect
        ? clamp(
            event.clientX,
            session.timelineRect.left + session.ghostHalfWidth,
            session.timelineRect.right - session.ghostHalfWidth
          )
        : event.clientX
      const clampedY = session.boundsRect
        ? clamp(
            event.clientY,
            session.boundsRect.top + session.ghostHalfHeight,
            session.boundsRect.bottom - session.ghostHalfHeight
          )
        : event.clientY
      session.lastX = clampedX
      session.lastY = clampedY
      const dx = clampedX - session.startX
      const dy = clampedY - session.startY
      const movedEnoughForDrag =
        dx * dx + dy * dy >= DRAG_START_MOVE_PX * DRAG_START_MOVE_PX

      if (!session.canActivate || !movedEnoughForDrag) return
      if (event.cancelable) event.preventDefault()

      if (!session.activated) {
        session.activated = true
        setTouchHeldId(session.stopId)
        setTouchHiddenId(session.stopId)
        setTouchGhost({
          title: session.sourceEl.textContent || '',
          x: clampedX,
          y: clampedY
        })
        updateAutoScrollVelocity(clampedY)
        startAutoScrollLoop()
        return
      }

      updateAutoScrollVelocity(clampedY)
      setTouchGhost((prev) => (prev ? { ...prev, x: clampedX, y: clampedY } : null))
    },
    [startAutoScrollLoop, updateAutoScrollVelocity]
  )

  const handleStopPointerDown = useCallback(
    (event, stopId) => {
      if (event.pointerType === 'mouse') return
      clearTouchDrag()
      const timelineEl = event.currentTarget.closest('.timeline')
      const scrollEl = event.currentTarget.closest('.time-panel-scroll')
      const boundsEl = scrollEl || timelineEl
      const sourceRect = event.currentTarget.getBoundingClientRect()
      const timelineRect = timelineEl?.getBoundingClientRect?.() || null
      const boundsRect = boundsEl?.getBoundingClientRect?.() || timelineRect
      const ghostHalfWidth = Math.max(24, Math.round(sourceRect.width / 2))
      const ghostHalfHeight = Math.max(12, Math.round(sourceRect.height / 2))
      const clampedX = timelineRect
        ? clamp(event.clientX, timelineRect.left + ghostHalfWidth, timelineRect.right - ghostHalfWidth)
        : event.clientX
      const clampedY = boundsRect
        ? clamp(event.clientY, boundsRect.top + ghostHalfHeight, boundsRect.bottom - ghostHalfHeight)
        : event.clientY

      touchSessionRef.current = {
        pointerId: event.pointerId,
        stopId,
        sourceEl: event.currentTarget,
        scrollEl,
        activated: false,
        canActivate: false,
        captured: false,
        listeners: null,
        timelineRect,
        boundsRect,
        ghostHalfWidth,
        ghostHalfHeight,
        startX: clampedX,
        startY: clampedY,
        lastX: clampedX,
        lastY: clampedY
      }

      if (event.pointerType === 'touch' && scrollEl) {
        scrollEl.classList.add('time-panel-scroll--drag-locked')
      }

      touchDelayTimerRef.current = window.setTimeout(() => {
        const session = touchSessionRef.current
        if (!session || session.pointerId !== event.pointerId) return
        session.canActivate = true
        if (!session.captured) {
          try {
            session.sourceEl.setPointerCapture(session.pointerId)
            session.captured = true
          } catch {
            session.captured = false
          }
        }
        touchDelayTimerRef.current = null
      }, TOUCH_ACTIVATE_DELAY_MS)

      const move = (ev) => handleStopPointerMove(ev)
      const end = (ev) => handleStopPointerEnd(ev)
      touchSessionRef.current.listeners = { move, end }
      window.addEventListener('pointermove', move, { capture: true })
      window.addEventListener('pointerup', end, { capture: true })
      window.addEventListener('pointercancel', end, { capture: true })
    },
    [clearTouchDrag, handleStopPointerEnd, handleStopPointerMove]
  )

  useEffect(() => () => clearTouchDrag(), [clearTouchDrag])

  return {
    touchHeldId,
    touchGhost,
    touchHiddenId,
    handleStopPointerDown
  }
}
