import { useCallback, useEffect, useRef, useState } from 'react'

const hours = Array.from({ length: 24 }, (_, index) => index)

const LONG_PRESS_MS = 400
const MOVE_CANCEL_PX = 14

const formatHour = (hour) => {
  const normalizedHour = ((hour % 24) + 24) % 24
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM'
  const hour12 = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12
  return `${hour12}:00 ${suffix}`
}

function readDropHourFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY)
  const row = el?.closest?.('[data-timeline-hour]')
  if (!row) return null
  const h = Number(row.getAttribute('data-timeline-hour'))
  return Number.isFinite(h) ? h : null
}

export default function ItineraryView({
  stops,
  selectedStopId,
  onSelectStop,
  onMoveStop,
  onTimestampClick
}) {
  const [allowDragReorder, setAllowDragReorder] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const sync = () => setAllowDragReorder(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const onMoveStopRef = useRef(onMoveStop)
  onMoveStopRef.current = onMoveStop

  const [touchLiftedId, setTouchLiftedId] = useState(null)
  const [touchDropHour, setTouchDropHour] = useState(null)

  const skipNextClickRef = useRef(false)

  /** Long-press timer while waiting to lift (not yet dragging). */
  const armTimerRef = useRef(null)
  /** { pointerId, startX, startY, stopId, fromHour } during arm phase */
  const armRef = useRef(null)
  /** { pointerId, stopId, fromHour } during drag phase */
  const dragRef = useRef(null)
  /** Stored listener fns so we can remove the exact same references */
  const armListenersRef = useRef(null)
  const dragListenersRef = useRef(null)

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current != null) {
      window.clearTimeout(armTimerRef.current)
      armTimerRef.current = null
    }
  }, [])

  const removeArmWindowListeners = useCallback(() => {
    const L = armListenersRef.current
    if (!L) return
    window.removeEventListener('pointermove', L.preMove, true)
    window.removeEventListener('pointerup', L.preEnd, true)
    window.removeEventListener('pointercancel', L.preEnd, true)
    armListenersRef.current = null
  }, [])

  const removeDragWindowListeners = useCallback(() => {
    const L = dragListenersRef.current
    if (!L) return
    window.removeEventListener('pointermove', L.dragMove, true)
    window.removeEventListener('pointerup', L.dragEnd, true)
    window.removeEventListener('pointercancel', L.dragEnd, true)
    dragListenersRef.current = null
  }, [])

  const teardownArmOnly = useCallback(() => {
    clearArmTimer()
    removeArmWindowListeners()
    armRef.current = null
  }, [clearArmTimer, removeArmWindowListeners])

  const teardownDrag = useCallback(() => {
    removeDragWindowListeners()
    dragRef.current = null
    setTouchLiftedId(null)
    setTouchDropHour(null)
  }, [removeDragWindowListeners])

  useEffect(
    () => () => {
      clearArmTimer()
      removeArmWindowListeners()
      removeDragWindowListeners()
    },
    [clearArmTimer, removeArmWindowListeners, removeDragWindowListeners]
  )

  useEffect(() => {
    if (!touchLiftedId) return
    const exists = stops.some((s) => s.id === touchLiftedId)
    if (!exists) {
      clearArmTimer()
      removeArmWindowListeners()
      removeDragWindowListeners()
      armRef.current = null
      dragRef.current = null
      setTouchLiftedId(null)
      setTouchDropHour(null)
    }
  }, [
    stops,
    touchLiftedId,
    clearArmTimer,
    removeArmWindowListeners,
    removeDragWindowListeners
  ])

  const usesNativeDrag = (event) => event.pointerType === 'mouse' && allowDragReorder

  const startTouchReorderArm = useCallback(
    (event, stop) => {
      if (usesNativeDrag(event)) return

      teardownArmOnly()
      teardownDrag()

      const pointerId = event.pointerId
      const fromHour = Number(stop.timestampHour)
      armRef.current = {
        pointerId,
        startX: event.clientX,
        startY: event.clientY,
        stopId: stop.id,
        fromHour
      }

      const preMove = (ev) => {
        if (ev.pointerId !== pointerId) return
        const arm = armRef.current
        if (!arm) return
        const dx = ev.clientX - arm.startX
        const dy = ev.clientY - arm.startY
        if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
          teardownArmOnly()
        }
      }

      const preEnd = (ev) => {
        if (ev.pointerId !== pointerId) return
        teardownArmOnly()
      }

      armListenersRef.current = { preMove, preEnd }
      window.addEventListener('pointermove', preMove, { capture: true })
      window.addEventListener('pointerup', preEnd, { capture: true })
      window.addEventListener('pointercancel', preEnd, { capture: true })

      armTimerRef.current = window.setTimeout(() => {
        armTimerRef.current = null
        const arm = armRef.current
        if (!arm || arm.pointerId !== pointerId) return

        removeArmWindowListeners()
        armRef.current = null

        dragRef.current = {
          pointerId,
          stopId: arm.stopId,
          fromHour: arm.fromHour
        }
        setTouchLiftedId(arm.stopId)
        setTouchDropHour(arm.fromHour)

        const dragMove = (ev) => {
          if (ev.pointerId !== pointerId) return
          if (ev.cancelable) ev.preventDefault()
          const h = readDropHourFromPoint(ev.clientX, ev.clientY)
          setTouchDropHour(h != null ? h : null)
        }

        const dragEnd = (ev) => {
          if (ev.pointerId !== pointerId) return
          const session = dragRef.current
          removeDragWindowListeners()
          dragRef.current = null
          setTouchLiftedId(null)
          setTouchDropHour(null)

          if (!session) return

          skipNextClickRef.current = true
          const hour = readDropHourFromPoint(ev.clientX, ev.clientY)
          if (
            hour != null &&
            Number.isFinite(session.fromHour) &&
            hour !== session.fromHour
          ) {
            onMoveStopRef.current(session.stopId, hour)
          }
        }

        dragListenersRef.current = { dragMove, dragEnd }
        window.addEventListener('pointermove', dragMove, { capture: true, passive: false })
        window.addEventListener('pointerup', dragEnd, { capture: true })
        window.addEventListener('pointercancel', dragEnd, { capture: true })
      }, LONG_PRESS_MS)
    },
    [teardownArmOnly, teardownDrag, removeArmWindowListeners, usesNativeDrag]
  )

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

  const grouped = hours.map((hour) => ({
    hour,
    stops: stops.filter((stop) => Number(stop.timestampHour) === hour)
  }))

  const touchReorderActive = touchLiftedId != null

  return (
    <div className="itinerary-view">
      <div className="itinerary-header">
        <h3 className="itinerary-header__title">Day timeline</h3>
        <p className="itinerary-header__hint">
          {allowDragReorder
            ? 'Tap a time to add a stop · drag stops between hours'
            : 'Tap a time to add a stop · hold a stop until it highlights, then drag to another hour'}
        </p>
      </div>
      <div className="timeline">
        {grouped.map((slot) => (
          <div
            className={`timeline-row${
              touchReorderActive && touchDropHour === slot.hour ? ' timeline-row--drop-target' : ''
            }`}
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
                    touchLiftedId === stop.id ? ' timeline-stop--touch-lifted' : ''
                  }`}
                  draggable={allowDragReorder}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', stop.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onPointerDown={(e) => startTouchReorderArm(e, stop)}
                  onClick={() => {
                    if (skipNextClickRef.current) {
                      skipNextClickRef.current = false
                      return
                    }
                    onSelectStop(stop.id)
                  }}
                >
                  {stop.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
