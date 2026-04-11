import { useEffect, useState } from 'react'
import { useOffline } from '../context/OfflineContext'
import { subscribeToTripById } from '../api/trip'
import { getTripSnapshot } from '../utils/tripReadCache'

/**
 * Live trip document + initial day selection when none chosen.
 * When offline with no in-memory snapshot, hydrates the last server-backed copy from IndexedDB (read-only mirror).
 */
export function useTripDocument(tripId, setSelectedDate) {
  const { isOnline } = useOffline()
  const [trip, setTrip] = useState(null)
  const [staleReadCache, setStaleReadCache] = useState(false)

  useEffect(() => {
    if (!tripId) {
      setTrip(null)
      setStaleReadCache(false)
      return
    }
    setTrip(null)
    setStaleReadCache(false)
  }, [tripId])

  useEffect(() => {
    if (!tripId) return undefined

    let cancelled = false

    ;(async () => {
      if (isOnline) return
      const cached = await getTripSnapshot(tripId)
      if (cancelled || !cached) return
      let filledFromIdb = false
      setTrip((prev) => {
        if (prev !== null) return prev
        filledFromIdb = true
        return cached
      })
      if (filledFromIdb) {
        setStaleReadCache(true)
        setSelectedDate((d) => d || cached?.itinerary?.[0]?.date || null)
      }
    })()

    const unsubscribe = subscribeToTripById(tripId, (snapshot, meta) => {
      setTrip(snapshot)
      if (!meta.fromCache) {
        setStaleReadCache(false)
      }
      if (snapshot?.itinerary?.[0]?.date) {
        setSelectedDate((d) => d || snapshot.itinerary[0].date)
      }
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [tripId, isOnline, setSelectedDate])

  return { trip, staleReadCache }
}
