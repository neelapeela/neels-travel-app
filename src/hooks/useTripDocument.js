import { useEffect, useState } from 'react'
import { subscribeToTripById } from '../api/trip'

/**
 * Live trip document + initial day selection when none chosen.
 */
export function useTripDocument(tripId, selectedDate, setSelectedDate) {
  const [trip, setTrip] = useState(null)

  useEffect(() => {
    const unsubscribe = subscribeToTripById(tripId, (snapshot) => {
      setTrip(snapshot)
      if (!selectedDate && snapshot?.itinerary?.[0]?.date) {
        setSelectedDate(snapshot.itinerary[0].date)
      }
    })
    return () => unsubscribe()
  }, [tripId, selectedDate, setSelectedDate])

  return trip
}
