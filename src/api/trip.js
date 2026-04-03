import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { v4 as uuidv4 } from 'uuid'

/**
 * Generates an array of dates between start and end date (inclusive)
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} endDate - End date string (YYYY-MM-DD)
 * @returns {Array<string>} - Array of date strings in YYYY-MM-DD format
 */
export const getDatesBetween = (startDate, endDate) => {
  const dates = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
    dates.push(dateString)
  }

  return dates
}

const generateInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

const normalizeParticipants = (tripData) => {
  const participants = tripData.participants || tripData.travelers || []
  return Array.from(new Set(participants))
}

const parseHour = (value) => {
  if (Number.isFinite(value)) return Math.max(0, Math.min(23, value))
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(23, parsed))
  return 9
}

const normalizeTime = (value, fallbackHour = 9) => {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return value
  }
  const hour = parseHour(value ?? fallbackHour)
  return `${String(hour).padStart(2, '0')}:00`
}

const getHourFromTime = (timeValue, fallback = 9) => {
  if (typeof timeValue !== 'string') return fallback
  const match = timeValue.match(/^(\d{2}):(\d{2})$/)
  if (!match) return fallback
  const hour = Number(match[1])
  if (!Number.isFinite(hour)) return fallback
  return Math.max(0, Math.min(23, hour))
}

const getMinuteFromTime = (timeValue) => {
  if (typeof timeValue !== 'string') return 0
  const match = timeValue.match(/^(\d{2}):(\d{2})$/)
  if (!match) return 0
  const minute = Number(match[2])
  return Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0
}

const parseCoordinate = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeStop = (stop, index = 0, date = 'day') => ({
  id: stop.id || `${date}-${index}-${stop.title || stop.stopName || 'stop'}`,
  title: stop.title || stop.stopName || `Stop ${index + 1}`,
  notes: stop.notes || stop.description || '',
  location: stop.location || stop.address || '',
  stopTime: normalizeTime(stop.stopTime, stop.timestampHour),
  timestampHour: getHourFromTime(normalizeTime(stop.stopTime, stop.timestampHour)),
  timestampMinute: getMinuteFromTime(normalizeTime(stop.stopTime, stop.timestampHour)),
  latitude: parseCoordinate(stop.latitude),
  longitude: parseCoordinate(stop.longitude),
  createdBy: stop.createdBy || null,
  stopType: stop.stopType || 'regular',
  metadata: stop.metadata || {},
  payments: (stop.payments || []).map((payment) => ({
    id: payment.id || uuidv4(),
    payerId: payment.payerId || '',
    payerName: payment.payerName || 'Unknown',
    reason: payment.reason || '',
    amount: Number(payment.amount || 0)
  }))
})

const normalizeDay = (day) => ({
  ...day,
  stops: (day.stops || []).map((stop, index) => normalizeStop(stop, index, day.date))
})

/**
 * Geocodes a location name to coordinates using Nominatim API
 * @param {string} locationName - Name of the location (e.g., "Paris, France")
 * @returns {Promise<{lat: number, lon: number} | null>} - Coordinates or null if not found
 */
export const geocodeLocation = async (locationName) => {
  if (!locationName) return null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Travel App' // Required by Nominatim
        }
      }
    )

    const data = await response.json()

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }

    return null
  } catch (error) {
    console.error('Error geocoding location:', error)
    return null
  }
}

export const reverseGeocodeLocation = async (latitude, longitude) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        latitude
      )}&lon=${encodeURIComponent(longitude)}`,
      {
        headers: {
          'User-Agent': 'Travel App'
        }
      }
    )
    const data = await response.json()
    return data?.display_name || null
  } catch (error) {
    console.error('Error reverse geocoding location:', error)
    return null
  }
}

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

    const departureLabel = [
      flight.departure?.airport,
      flight.departure?.iata
    ]
      .filter(Boolean)
      .join(' - ')
    const arrivalLabel = [
      flight.arrival?.airport,
      flight.arrival?.iata
    ]
      .filter(Boolean)
      .join(' - ')
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

export const getTripById = async (tripId) => {
  if (!tripId) return null
  const tripRef = doc(db, 'trips', tripId)
  const tripSnap = await getDoc(tripRef)
  if (!tripSnap.exists()) return null

  const tripData = tripSnap.data()
  return {
    ...tripData,
    participants: normalizeParticipants(tripData),
    itinerary: (tripData.itinerary || []).map(normalizeDay)
  }
}

export const subscribeToTripById = (tripId, callback) => {
  if (!tripId) return () => {}
  const tripRef = doc(db, 'trips', tripId)
  return onSnapshot(tripRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null)
      return
    }
    const tripData = snapshot.data()
    callback({
      ...tripData,
      participants: normalizeParticipants(tripData),
      itinerary: (tripData.itinerary || []).map(normalizeDay)
    })
  })
}

export const getTripsForUser = async (userId) => {
  if (!userId) return []

  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const userData = userSnap.data()
      const trips = userData.trips || []
      const tripsData = []
      for (const tripId of trips) {
        const tripRef = doc(db, 'trips', tripId)
        const tripSnap = await getDoc(tripRef)
        if (tripSnap.exists()) {
          tripsData.push(tripSnap.data())
        }
      }
      return tripsData
    }

    return []
  } catch (error) {
    console.error('Error fetching trips:', error)
    throw error
  }
}

export const subscribeToUserTrips = (userId, callback) => {
  if (!userId) return () => {}
  const userRef = doc(db, 'users', userId)
  return onSnapshot(userRef, async (userSnapshot) => {
    const userData = userSnapshot.data()
    const tripIds = userData?.trips || []
    if (tripIds.length === 0) {
      callback([])
      return
    }

    const tripResults = await Promise.allSettled(
      tripIds.map(async (tripId) => {
        const tripSnapshot = await getDoc(doc(db, 'trips', tripId))
        return tripSnapshot.exists() ? tripSnapshot.data() : null
      })
    )

    const trips = tripResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter(Boolean)

    callback(trips)
  })
}

export const createTripForUser = async (userId, tripData) => {
  if (!userId) throw new Error('User ID is required')
  if (!tripData.name || !tripData.destination) {
    throw new Error('Trip name and destination are required')
  }

  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error('User document does not exist')
    }

    const dates = getDatesBetween(tripData.startDate, tripData.endDate)
    const itinerary = dates.map(date => ({
      date: date,
      stops: []
    }))

    const tripId = uuidv4()
    const inviteCode = generateInviteCode()
    const newTrip = {
      id: tripId,
      name: tripData.name,
      creatorId: userId,
      participants: [userId],
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      description: tripData.description || '',
      notes: tripData.notes || '',
      setupCompleted: false,
      inviteCode,
      itinerary: itinerary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await setDoc(doc(db, 'trips', newTrip.id), newTrip)
    await setDoc(doc(db, 'trip_invites', inviteCode), {
      code: inviteCode,
      tripId: newTrip.id,
      createdBy: userId,
      createdAt: new Date().toISOString()
    })
    await updateDoc(userRef, {
      trips: [...new Set([...(userSnap.data().trips || []), newTrip.id])]
    })

    return newTrip.id
  } catch (error) {
    console.error('Error creating trip:', error)
    throw error
  }
}

export const joinTripByCode = async (userId, inviteCode) => {
  if (!userId || !inviteCode) throw new Error('User and invite code are required')

  const normalizedCode = inviteCode.trim().toUpperCase()
  const inviteDocRef = doc(db, 'trip_invites', normalizedCode)
  const inviteSnapshot = await getDoc(inviteDocRef)
  if (!inviteSnapshot.exists()) throw new Error('Trip not found for that invite code')

  const inviteData = inviteSnapshot.data()
  const tripId = inviteData.tripId
  if (!tripId) throw new Error('Invite code is invalid')

  await updateDoc(doc(db, 'trips', tripId), {
    participants: arrayUnion(userId),
    updatedAt: new Date().toISOString()
  })

  const userRef = doc(db, 'users', userId)
  await setDoc(
    userRef,
    {
      trips: arrayUnion(tripId)
    },
    { merge: true }
  )

  return tripId
}

export const joinTripById = async (userId, tripId) => {
  if (!userId || !tripId) throw new Error('User and trip ID are required')
  await updateDoc(doc(db, 'trips', tripId), {
    participants: arrayUnion(userId),
    updatedAt: new Date().toISOString()
  })

  const userRef = doc(db, 'users', userId)
  await setDoc(
    userRef,
    {
      trips: arrayUnion(tripId)
    },
    { merge: true }
  )

  return tripId
}

export const ensureTripInviteMapping = async (trip) => {
  if (!trip?.id || !trip?.inviteCode) return
  const normalizedCode = trip.inviteCode.trim().toUpperCase()
  await setDoc(
    doc(db, 'trip_invites', normalizedCode),
    {
      code: normalizedCode,
      tripId: trip.id,
      createdBy: trip.creatorId || null,
      createdAt: trip.createdAt || new Date().toISOString()
    },
    { merge: true }
  )
}

/* Stops API */
export const addStopToTrip = async (tripId, date, stopData) => {
  if (!tripId || !date || !stopData) throw new Error('Missing required parameters')

  try {
    const tripRef = doc(db, 'trips', tripId)
    const tripSnap = await getDoc(tripRef)
    if (!tripSnap.exists()) throw new Error('Trip not found')

    const tripData = tripSnap.data()
    const itinerary = [...(tripData.itinerary || [])]
    const dayIndex = itinerary.findIndex(day => day.date === date)
    if (dayIndex < 0) throw new Error('Day not found')

    const nextStop = {
      ...normalizeStop(stopData),
      id: stopData.id || uuidv4()
    }
    itinerary[dayIndex] = {
      ...itinerary[dayIndex],
      stops: [...(itinerary[dayIndex].stops || []), nextStop]
    }

    await updateDoc(tripRef, {
      itinerary,
      updatedAt: new Date().toISOString()
    })

    return nextStop
  } catch (error) {
    console.error('Error adding stop to trip:', error)
    throw error
  }
}

export const updateStopInTrip = async (tripId, date, stopId, patch) => {
  if (!tripId || !date || !stopId) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const dayIndex = itinerary.findIndex((day) => day.date === date)
  if (dayIndex < 0) throw new Error('Day not found')

  let found = false
  const updatedStops = (itinerary[dayIndex].stops || []).map((stop, index) => {
    if (stop.id !== stopId) return stop
    found = true
    return {
      ...normalizeStop(
        {
          ...stop,
          ...patch
        },
        index,
        itinerary[dayIndex].date
      ),
      id: stop.id || stopId
    }
  })

  if (!found) {
    throw new Error('Stop not found')
  }

  itinerary[dayIndex] = {
    ...itinerary[dayIndex],
    stops: updatedStops
  }

  await updateDoc(tripRef, {
    itinerary,
    updatedAt: new Date().toISOString()
  })
}

export const updateTripSettings = async (tripId, patch) => {
  if (!tripId) throw new Error('Trip ID is required')
  await updateDoc(doc(db, 'trips', tripId), {
    ...patch,
    updatedAt: new Date().toISOString()
  })
}

export const removeParticipantFromTrip = async (tripId, userId) => {
  if (!tripId || !userId) throw new Error('Trip ID and user ID are required')
  await updateDoc(doc(db, 'trips', tripId), {
    participants: arrayRemove(userId),
    updatedAt: new Date().toISOString()
  })
  await updateDoc(doc(db, 'users', userId), {
    trips: arrayRemove(tripId)
  })
}

export const addPaymentToStop = async (tripId, date, stopId, payment) => {
  if (!tripId || !date || !stopId) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const dayIndex = itinerary.findIndex((day) => day.date === date)
  if (dayIndex < 0) throw new Error('Day not found')

  const updatedStops = (itinerary[dayIndex].stops || []).map((stop) => {
    if (stop.id !== stopId) return stop
    const currentPayments = stop.payments || []
    return {
      ...stop,
      payments: [
        ...currentPayments,
        {
          id: uuidv4(),
          payerId: payment.payerId,
          payerName: payment.payerName,
          reason: payment.reason,
          amount: Number(payment.amount || 0)
        }
      ]
    }
  })

  itinerary[dayIndex] = { ...itinerary[dayIndex], stops: updatedStops }
  await updateDoc(tripRef, {
    itinerary,
    updatedAt: new Date().toISOString()
  })
}

export const addSpecialStopToTrip = async (tripId, date, stopData) => {
  return addStopToTrip(tripId, date, {
    ...stopData,
    stopType: stopData.stopType || 'regular'
  })
}

export const deleteFlightStopsByFlightNumber = async (tripId, date, flightNumber) => {
  if (!tripId || !date || !flightNumber) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const dayIndex = itinerary.findIndex((day) => day.date === date)
  if (dayIndex < 0) throw new Error('Day not found')

  const normalized = flightNumber.trim().toUpperCase()
  itinerary[dayIndex] = {
    ...itinerary[dayIndex],
    stops: (itinerary[dayIndex].stops || []).filter((stop) => {
      if (stop.stopType !== 'flight') return true
      const code = (stop.metadata?.flightNumber || '').toUpperCase()
      return code !== normalized
    })
  }

  await updateDoc(tripRef, {
    itinerary,
    updatedAt: new Date().toISOString()
  })
}

export const deleteFlightStopsAcrossTrip = async (tripId, flightNumber) => {
  if (!tripId || !flightNumber) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const normalized = flightNumber.trim().toUpperCase()

  const nextItinerary = itinerary.map((day) => ({
    ...day,
    stops: (day.stops || []).filter((stop) => {
      if (stop.stopType !== 'flight') return true
      const code = (stop.metadata?.flightNumber || '').toUpperCase()
      return code !== normalized
    })
  }))

  await updateDoc(tripRef, {
    itinerary: nextItinerary,
    updatedAt: new Date().toISOString()
  })
}

const lodgingBaseTitleFromStopTitle = (title) =>
  (title || '').replace(/\s*(Check-in|Check-out)\s*$/i, '').trim() || 'Lodging'

/**
 * Remove all lodging stops for one logical stay across the whole trip.
 * @param {string} tripId
 * @param {string | { location: string, baseTitle: string }} spec — `lodgingId` from metadata, or legacy `{ location, baseTitle }` for older stops without `metadata.lodgingId`
 */
export const deleteLodgingStopsAcrossTrip = async (tripId, spec) => {
  if (!tripId || spec == null) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]

  const shouldRemove = (stop) => {
    if (stop.stopType !== 'lodging') return false
    if (typeof spec === 'string') {
      return stop.metadata?.lodgingId === spec
    }
    const location = spec.location || ''
    const baseTitle = spec.baseTitle || ''
    return (
      !stop.metadata?.lodgingId &&
      (stop.location || '') === location &&
      lodgingBaseTitleFromStopTitle(stop.title) === baseTitle
    )
  }

  const nextItinerary = itinerary.map((day) => ({
    ...day,
    stops: (day.stops || []).filter((stop) => !shouldRemove(stop))
  }))

  await updateDoc(tripRef, {
    itinerary: nextItinerary,
    updatedAt: new Date().toISOString()
  })
}

export const completeTripSetup = async (tripId, payload) => {
  if (!tripId) throw new Error('Trip ID is required')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')
  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  if (itinerary.length > 0 && payload.firstDayTitle) {
    itinerary[0] = {
      ...itinerary[0],
      title: payload.firstDayTitle
    }
  }
  await updateDoc(tripRef, {
    notes: payload.notes || '',
    setupCompleted: true,
    itinerary,
    updatedAt: new Date().toISOString()
  })
}

export const updateDayTitleInTrip = async (tripId, date, title) => {
  if (!tripId || !date) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const dayIndex = itinerary.findIndex((day) => day.date === date)
  if (dayIndex < 0) throw new Error('Day not found')

  itinerary[dayIndex] = {
    ...itinerary[dayIndex],
    title: title || ''
  }

  await updateDoc(tripRef, {
    itinerary,
    updatedAt: new Date().toISOString()
  })
}