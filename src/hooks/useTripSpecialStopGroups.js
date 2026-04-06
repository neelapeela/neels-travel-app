import { useMemo } from 'react'
import { lodgingBaseTitle } from '../utils/lodging'

/** Aggregates flight and lodging stops across the itinerary for trip-wide lists. */
export function useTripSpecialStopGroups(itinerary) {
  const addedFlights = useMemo(() => {
    const map = new Map()
    for (const day of itinerary || []) {
      for (const stop of day.stops || []) {
        if (stop.stopType !== 'flight') continue
        const code = (stop.metadata?.flightNumber || stop.title || 'FLIGHT').toUpperCase()
        if (!map.has(code)) map.set(code, { code, stops: [] })
        map.get(code).stops.push({
          ...stop,
          date: day.date
        })
      }
    }
    return Array.from(map.values())
  }, [itinerary])

  const addedLodgings = useMemo(() => {
    const groups = new Map()
    for (const day of itinerary || []) {
      for (const stop of day.stops || []) {
        if (stop.stopType !== 'lodging') continue
        const id = stop.metadata?.lodgingId
        const base = lodgingBaseTitle(stop.title)
        const key = id || `legacy:${stop.location || ''}|${base}`
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            lodgingId: id || null,
            legacy: !id,
            label: stop.metadata?.lodgingLabel || base,
            location: stop.location || '',
            baseTitle: base,
            stops: []
          })
        }
        groups.get(key).stops.push({ ...stop, date: day.date })
      }
    }
    return Array.from(groups.values())
  }, [itinerary])

  return { addedFlights, addedLodgings }
}
