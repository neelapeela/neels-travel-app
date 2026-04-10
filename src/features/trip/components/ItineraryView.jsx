import { useEffect, useMemo, useState } from 'react'

const hours = Array.from({ length: 24 }, (_, index) => index)

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
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const sync = () => setAllowDragReorder(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
                  className={`timeline-stop ${selectedStopId === stop.id ? 'active' : ''}`}
                  draggable={allowDragReorder}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', stop.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => onSelectStop(stop.id)}
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
