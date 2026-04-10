import { useEffect, useMemo, useRef, useState } from 'react'

const hours = Array.from({ length: 24 }, (_, index) => index)
const GHOST_HALF_WIDTH = 72
const GHOST_HALF_HEIGHT = 18
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

const formatHour = (hour) => {
  const normalizedHour = ((hour % 24) + 24) % 24
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM'
  const hour12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12
  return `${hour12}:00 ${suffix}`
}

export default function ItineraryView({
  stops,
  selectedStopId,
  onSelectStop,
  onMoveStop,
  onTimestampClick
}) {
  const [allowDragReorder, setAllowDragReorder] = useState(false)
  const [touchHeldId, setTouchHeldId] = useState(null)
  const [touchGhost, setTouchGhost] = useState(null)
  const [touchHiddenId, setTouchHiddenId] = useState(null)
  const touchSessionRef = useRef(null)
  const touchDelayTimerRef = useRef(null)
  const autoScrollRafRef = useRef(null)
  const autoScrollVelocityRef = useRef(0)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const sync = () => setAllowDragReorder(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  useEffect(() => () => clearTouchHighlight(), [])

  const handleTimestampClick = onTimestampClick || (() => {})
  const handleDrop = (event, hour) => {
    event.preventDefault()
    const stopId = event.dataTransfer.getData('text/plain')
    if (!stopId) return
    onMoveStop(stopId, hour)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const clearTouchHighlight = () => {
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
  }

  const startAutoScrollLoop = () => {
    if (autoScrollRafRef.current != null) return
    const tick = () => {
      autoScrollRafRef.current = null
      const session = touchSessionRef.current
      if (!session || !session.activated || !session.scrollEl) return
      const v = autoScrollVelocityRef.current
      if (v !== 0) {
        session.scrollEl.scrollTop += v
      }
      autoScrollRafRef.current = window.requestAnimationFrame(tick)
    }
    autoScrollRafRef.current = window.requestAnimationFrame(tick)
  }

  const updateAutoScrollVelocity = (clientY) => {
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
  }

  const handleStopPointerDown = (event, stopId) => {
    if (event.pointerType === 'mouse') return
    clearTouchHighlight()
    const timelineEl = event.currentTarget.closest('.timeline')
    const timelineRect = timelineEl?.getBoundingClientRect?.() || null
    const clampedX = timelineRect
      ? clamp(event.clientX, timelineRect.left + GHOST_HALF_WIDTH, timelineRect.right - GHOST_HALF_WIDTH)
      : event.clientX
    const clampedY = timelineRect
      ? clamp(event.clientY, timelineRect.top + GHOST_HALF_HEIGHT, timelineRect.bottom - GHOST_HALF_HEIGHT)
      : event.clientY

    touchSessionRef.current = {
      pointerId: event.pointerId,
      stopId,
      sourceEl: event.currentTarget,
      scrollEl: event.currentTarget.closest('.time-panel-scroll'),
      activated: false,
      canActivate: false,
      captured: false,
      listeners: null,
      timelineRect,
      startX: clampedX,
      startY: clampedY,
      lastX: clampedX,
      lastY: clampedY
    }
    if (event.pointerType === 'touch' && touchSessionRef.current.scrollEl) {
      touchSessionRef.current.scrollEl.classList.add('time-panel-scroll--drag-locked')
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
  }

  const handleStopPointerMove = (event) => {
    const session = touchSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    const clampedX = session.timelineRect
      ? clamp(
          event.clientX,
          session.timelineRect.left + GHOST_HALF_WIDTH,
          session.timelineRect.right - GHOST_HALF_WIDTH
        )
      : event.clientX
    const clampedY = session.timelineRect
      ? clamp(
          event.clientY,
          session.timelineRect.top + GHOST_HALF_HEIGHT,
          session.timelineRect.bottom - GHOST_HALF_HEIGHT
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

    if (event.cancelable) event.preventDefault()
    updateAutoScrollVelocity(clampedY)
    setTouchGhost((prev) =>
      prev
        ? {
            ...prev,
            x: clampedX,
            y: clampedY
          }
        : null
    )
  }

  const handleStopPointerEnd = (event) => {
    const session = touchSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return
    if (session.activated) {
      if (event.cancelable) event.preventDefault()
      const targetHour = readDropHourFromPoint(session.lastX, session.lastY)
      const stop = stops.find((s) => s.id === session.stopId)
      if (stop && targetHour != null) {
        const fromHour = Number(stop.timestampHour)
        if (Number.isFinite(fromHour) && targetHour !== fromHour) {
          onMoveStop(session.stopId, targetHour)
        }
      }
    }
    clearTouchHighlight()
  }

  const grouped = useMemo(
    () =>
      hours.map((hour) => ({
        hour,
        stops: stops.filter((stop) => Number(stop.timestampHour) === hour)
      })),
    [stops]
  )

  return (
    <div className="itinerary-view">
      <div className="itinerary-header">
        <h3 className="itinerary-header__title">Day timeline</h3>
        <p className="itinerary-header__hint">
          {allowDragReorder
            ? 'Tap a time to add a stop · drag stops between hours'
            : 'Tap a time to add a stop · tap a stop to view details'}
        </p>
      </div>
      <div className="timeline">
        {grouped.map((slot) => (
          <div
            className="timeline-row"
            key={slot.hour}
            data-timeline-hour={slot.hour}
          >
            <button
              type="button"
              className="timeline-label timeline-label-button"
              onClick={() => handleTimestampClick(slot.hour)}
            >
              {formatHour(slot.hour)}
            </button>
            <div
              className="timeline-stops"
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, slot.hour)}
            >
              {slot.stops.length === 0 && <span className="timeline-empty">-</span>}
              {slot.stops.map((stop) => (
                <button
                  type="button"
                  key={stop.id}
                  className={`timeline-stop ${selectedStopId === stop.id ? 'active' : ''}${
                    touchHeldId === stop.id ? ' timeline-stop--touch-lifted' : ''
                  }${touchHiddenId === stop.id ? ' timeline-stop--touch-hidden' : ''}`}
                  draggable={allowDragReorder}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', stop.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onPointerDown={(event) => handleStopPointerDown(event, stop.id)}
                  onClick={() => onSelectStop(stop.id)}
                >
                  {stop.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {touchGhost && (
        <div
          className="timeline-stop-ghost"
          style={{
            left: `${touchGhost.x}px`,
            top: `${touchGhost.y}px`
          }}
        >
          {touchGhost.title}
        </div>
      )}
    </div>
  )
}
