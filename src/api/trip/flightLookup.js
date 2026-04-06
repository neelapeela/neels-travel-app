const toLocalPartsFromIso = (isoValue, timezone, fallbackDate = '', fallbackTime = '09:00') => {
  if (!isoValue) return { date: fallbackDate, time: fallbackTime }

  // Aviation provider values can already represent airport-local wall clock time.
  // Prefer the raw ISO clock components first to avoid double timezone conversion.
  const rawMatch = String(isoValue).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (rawMatch) {
    return {
      date: rawMatch[1],
      time: `${rawMatch[2]}:${rawMatch[3]}`
    }
  }

  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return { date: fallbackDate, time: fallbackTime }
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const parts = formatter.formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type)?.value || ''
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${get('hour')}:${get('minute')}`
    }
  } catch {
    const hh = String(date.getUTCHours()).padStart(2, '0')
    const mm = String(date.getUTCMinutes()).padStart(2, '0')
    const yyyy = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return { date: `${yyyy}-${month}-${day}`, time: `${hh}:${mm}` }
  }
}

const ICAO_TO_IATA_AIRLINE = {
  UAL: 'UA',
  AAL: 'AA',
  DAL: 'DL',
  SWA: 'WN',
  ASA: 'AS',
  JBU: 'B6'
}

const parseFlightCode = (value) => {
  const normalized = (value || '').trim().toUpperCase()
  const match = normalized.match(/^([A-Z0-9]{2,3})\s*([0-9]{1,4}[A-Z]?)$/)
  if (!match) {
    return {
      normalized,
      normalizedIata: normalized,
      airlineCode: '',
      airlineCodeIata: '',
      airlineCodeIcao: '',
      numberPart: normalized.replace(/[^0-9A-Z]/g, '')
    }
  }
  const airlineCodeRaw = match[1]
  const airlineCodeIata =
    airlineCodeRaw.length === 3 ? ICAO_TO_IATA_AIRLINE[airlineCodeRaw] || '' : airlineCodeRaw
  const airlineCodeIcao = airlineCodeRaw.length === 3 ? airlineCodeRaw : ''
  return {
    normalized,
    normalizedIata: `${airlineCodeIata || airlineCodeRaw}${match[2]}`,
    airlineCode: airlineCodeRaw,
    airlineCodeIata,
    airlineCodeIcao,
    numberPart: match[2]
  }
}

const sameUtcDay = (isoValue, dayString) => {
  if (!isoValue || !dayString) return false
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return false
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}` === dayString
}

const scoreFlightCandidate = (flight, parsedCode, targetDate) => {
  let score = 0
  const iata = (flight?.flight?.iata || '').toUpperCase()
  const icao = (flight?.flight?.icao || '').toUpperCase()
  const airlineIata = (flight?.airline?.iata || '').toUpperCase()
  const airlineIcao = (flight?.airline?.icao || '').toUpperCase()
  const number = String(flight?.flight?.number || '').toUpperCase()
  const depDate = flight?.departure?.scheduled || flight?.flight_date || ''
  const arrDate = flight?.arrival?.scheduled || ''

  if (iata === parsedCode.normalized) score += 100
  if (iata === parsedCode.normalizedIata) score += 120
  if (icao === parsedCode.normalized) score += 120
  if (parsedCode.airlineCode && airlineIata === parsedCode.airlineCode) score += 25
  if (parsedCode.airlineCodeIata && airlineIata === parsedCode.airlineCodeIata) score += 40
  if (parsedCode.airlineCodeIcao && airlineIcao === parsedCode.airlineCodeIcao) score += 40
  if (parsedCode.numberPart && number === parsedCode.numberPart) score += 25
  if (targetDate && (sameUtcDay(depDate, targetDate) || sameUtcDay(arrDate, targetDate))) score += 30
  if (flight?.departure?.airport && flight?.arrival?.airport) score += 10

  return score
}

export const lookupFlightByNumber = async (flightNumber, options = {}) => {
  const normalized = (flightNumber || '').trim().toUpperCase()
  if (!normalized) throw new Error('Flight number is required')
  const parsedCode = parseFlightCode(normalized)
  const targetDate = options.targetDate || ''

  const accessKey = import.meta.env.VITE_AVIATIONSTACK_API_KEY
  if (!accessKey) {
    throw new Error('Flight lookup not configured. Set VITE_AVIATIONSTACK_API_KEY.')
  }

  const fetchCandidates = async (queryString) => {
    const response = await fetch(
      `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(
        accessKey
      )}&${queryString}&limit=10`
    )
    const data = await response.json()
    return data?.data || []
  }

  const pickBestFlight = (flights) => {
    if (!flights.length) return null
    const scored = flights
      .map((flight) => ({
        flight,
        score: scoreFlightCandidate(flight, parsedCode, targetDate)
      }))
      .sort((a, b) => b.score - a.score)
    return scored[0]?.score > 0 ? scored[0].flight : null
  }

  try {
    let candidates = await fetchCandidates(`flight_iata=${encodeURIComponent(parsedCode.normalizedIata)}`)

    if (!candidates.length && parsedCode.airlineCodeIcao) {
      candidates = await fetchCandidates(`flight_icao=${encodeURIComponent(parsedCode.normalized)}`)
    }

    // Fallback for inputs like "UA1234" where provider may index just the numeric flight number.
    if (!candidates.length) {
      const numberOnly = normalized.replace(/[^0-9]/g, '')
      if (numberOnly) {
        candidates = await fetchCandidates(`flight_number=${encodeURIComponent(numberOnly)}`)
      }
    }

    // Last fallback: broad text search by airline/flight field.
    if (!candidates.length) {
      candidates = await fetchCandidates(`search=${encodeURIComponent(normalized)}`)
    }

    const flight = pickBestFlight(candidates)
    if (!flight) throw new Error('No flight details found for this flight number')

    const departureLabel = [flight.departure?.airport, flight.departure?.iata].filter(Boolean).join(' - ')
    const arrivalLabel = [flight.arrival?.airport, flight.arrival?.iata].filter(Boolean).join(' - ')
    const departureParts = toLocalPartsFromIso(
      flight.departure?.scheduled,
      flight.departure?.timezone,
      '',
      '08:00'
    )
    const arrivalParts = toLocalPartsFromIso(
      flight.arrival?.scheduled,
      flight.arrival?.timezone,
      '',
      '12:00'
    )

    return {
      flightNumber: normalized,
      departureAddress: departureLabel || '',
      arrivalAddress: arrivalLabel || '',
      departureTime: departureParts.time,
      arrivalTime: arrivalParts.time,
      departureDate: departureParts.date,
      arrivalDate: arrivalParts.date,
      departureTimezone: flight.departure?.timezone || '',
      arrivalTimezone: flight.arrival?.timezone || ''
    }
  } catch (error) {
    console.error('Error looking up flight:', error)
    throw error
  }
}
