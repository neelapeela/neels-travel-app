import { lodgingBaseTitle } from './lodging'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => normalizeText(v)).filter(Boolean).sort()
}

export function flightIdentityKey(stop) {
  if (!stop || stop.stopType !== 'flight') return ''
  const pairId = normalizeText(stop.metadata?.flightPairId)
  if (pairId) return `flight:pair:${pairId}`

  const flightNumber = normalizeText(stop.metadata?.flightNumber).toUpperCase()
  const travelerId = normalizeText(stop.metadata?.travelerId)
  if (flightNumber && travelerId) return `flight:number:${flightNumber}:traveler:${travelerId}`

  const participantIds = normalizeList(stop.metadata?.participantIds).join(',')
  if (flightNumber && participantIds) return `flight:number:${flightNumber}:group:${participantIds}`

  if (flightNumber) return `flight:number:${flightNumber}`
  return ''
}

export function lodgingIdentityKey(stop) {
  if (!stop || stop.stopType !== 'lodging') return ''
  const lodgingId = normalizeText(stop.metadata?.lodgingId)
  if (lodgingId) return `lodging:id:${lodgingId}`
  const location = normalizeText(stop.location)
  const baseTitle = lodgingBaseTitle(stop.title)
  if (location || baseTitle) return `lodging:legacy:${location}|${baseTitle}`
  return ''
}

export function specialStopIdentityKey(stop) {
  if (!stop) return ''
  if (stop.stopType === 'flight') return flightIdentityKey(stop)
  if (stop.stopType === 'lodging') return lodgingIdentityKey(stop)
  return ''
}

