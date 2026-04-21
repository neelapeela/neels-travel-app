import tzLookup from '@photostructure/tz-lookup'
import { readCoord } from './mapboxRoute.js'

/**
 * IANA time zone id at a coordinate (approximate grid; good for airport/stop pins in the browser).
 * @see https://www.npmjs.com/package/@photostructure/tz-lookup
 */
export function findTimeZoneIdAtCoordinate(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  try {
    const id = tzLookup(lat, lon)
    return typeof id === 'string' && id.trim() !== '' ? id.trim() : null
  } catch {
    return null
  }
}

/** Prefer metadata from when the stop was saved; else derive from pinned coordinates. */
export function resolveStopTimeZoneId(stop) {
  const stored = stop?.metadata?.stopTimezone
  if (typeof stored === 'string' && stored.trim() !== '') return stored.trim()
  const lat = readCoord(stop?.latitude)
  const lng = readCoord(stop?.longitude)
  return findTimeZoneIdAtCoordinate(lat, lng)
}

function calendarNoonDate(calendarDate) {
  if (typeof calendarDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) return null
  const instant = new Date(`${calendarDate}T12:00:00`)
  return Number.isNaN(instant.getTime()) ? null : instant
}

/**
 * @param {'abbrev' | 'full'} style — abbrev for compact UI (timeline), full includes IANA id
 */
export function formatFlightTimeZoneAtStop(stop, calendarDate, style = 'full') {
  if (stop?.stopType !== 'flight') return ''
  const iana = resolveStopTimeZoneId(stop)
  if (!iana) return ''

  const ianaTail =
    (iana.includes('/') ? iana.split('/').pop() : iana)?.replace(/_/g, ' ') || ''

  const instant = calendarNoonDate(calendarDate)
  if (!instant) {
    return style === 'abbrev' ? ianaTail : iana.replace(/_/g, ' ')
  }

  try {
    const parts = Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      timeZoneName: 'short'
    }).formatToParts(instant)
    const abbr = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    if (style === 'abbrev') return abbr || ianaTail
    if (abbr) return `${abbr} · ${iana}`
    return iana.replace(/_/g, ' ')
  } catch {
    return style === 'abbrev' ? ianaTail : iana.replace(/_/g, ' ')
  }
}
