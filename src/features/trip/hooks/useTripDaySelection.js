import { useCallback, useMemo } from 'react'
import { getSortMinutes } from '../../../utils/stopTime'
import { stopHasValidMapCoords } from '../../../utils/osrmRoute'

/**
 * Derived day/stop state for the trip page: sorted stops for the map and timeline,
 * and navigation between itinerary days.
 */
export function useTripDaySelection(
  trip,
  selectedDate,
  selectedStopId,
  setSelectedDate,
  setSelectedStopId
) {
  const selectedDay = trip?.itinerary?.find((day) => day.date === selectedDate)
  const selectedDayIndex = trip?.itinerary?.findIndex((day) => day.date === selectedDate) ?? -1
  const hasPreviousDate = selectedDayIndex > 0
  const hasNextDate =
    selectedDayIndex >= 0 && selectedDayIndex < (trip?.itinerary?.length || 0) - 1

  const stopsForSelectedDate = useMemo(
    () => [...(selectedDay?.stops || [])].sort((a, b) => getSortMinutes(a) - getSortMinutes(b)),
    [selectedDay]
  )
  const mapStopsForSelectedDate = useMemo(
    () => stopsForSelectedDate.filter((stop) => stopHasValidMapCoords(stop)),
    [stopsForSelectedDate]
  )
  const selectedStop = useMemo(
    () => stopsForSelectedDate.find((stop) => stop.id === selectedStopId) || null,
    [stopsForSelectedDate, selectedStopId]
  )

  const handleShiftDate = useCallback(
    (delta) => {
      if (!trip?.itinerary?.length || selectedDayIndex < 0) return
      const nextIndex = selectedDayIndex + delta
      if (nextIndex < 0 || nextIndex >= trip.itinerary.length) return
      setSelectedDate(trip.itinerary[nextIndex].date)
      setSelectedStopId(null)
    },
    [trip?.itinerary, selectedDayIndex, setSelectedDate, setSelectedStopId]
  )

  return {
    selectedDay,
    selectedDayIndex,
    hasPreviousDate,
    hasNextDate,
    stopsForSelectedDate,
    mapStopsForSelectedDate,
    selectedStop,
    handleShiftDate
  }
}
