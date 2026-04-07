import { useEffect, useState } from 'react'
import { geocodeLocation } from '../api/trip'
import { MAP_FALLBACK_CENTER } from '../features/trip/constants'

export function useDestinationCoordinates(destination) {
  const [coordinates, setCoordinates] = useState(MAP_FALLBACK_CENTER)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!destination) {
        setCoordinates(MAP_FALLBACK_CENTER)
        return
      }
      const coords = await geocodeLocation(destination)
      if (cancelled) return

      if (coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lon))) {
        setCoordinates({ lat: Number(coords.lat), lng: Number(coords.lon) })
      } else {
        // Keep map usable even when Nominatim is blocked/rate-limited on specific devices.
        setCoordinates(MAP_FALLBACK_CENTER)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [destination])

  return coordinates
}
