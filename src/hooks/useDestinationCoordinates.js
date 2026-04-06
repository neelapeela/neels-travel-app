import { useEffect, useState } from 'react'
import { geocodeLocation } from '../api/trip'

export function useDestinationCoordinates(destination) {
  const [coordinates, setCoordinates] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!destination) return
      const coords = await geocodeLocation(destination)
      if (coords) {
        setCoordinates({ lat: coords.lat, lng: coords.lon })
      }
    }
    load()
  }, [destination])

  return coordinates
}
