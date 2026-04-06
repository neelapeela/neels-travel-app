import { arrayRemove, deleteField, doc, getDoc, updateDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../firebase'
import { lodgingBaseTitle } from '../../utils/lodging'
import { normalizeStop } from './normalize'

export const addStopToTrip = async (tripId, date, stopData) => {
  if (!tripId || !date || !stopData) throw new Error('Missing required parameters')

  try {
    const tripRef = doc(db, 'trips', tripId)
    const tripSnap = await getDoc(tripRef)
    if (!tripSnap.exists()) throw new Error('Trip not found')

    const tripData = tripSnap.data()
    const itinerary = [...(tripData.itinerary || [])]
    const dayIndex = itinerary.findIndex((day) => day.date === date)
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

/** Writes `participantNames.{userId}` on the trip (visible to all participants). */
export const upsertParticipantNameOnTrip = async (tripId, userId, displayLabel) => {
  const trimmed = (displayLabel || '').trim()
  if (!tripId || !userId || !trimmed) return
  await updateDoc(doc(db, 'trips', tripId), {
    [`participantNames.${userId}`]: trimmed,
    updatedAt: new Date().toISOString()
  })
}

export const removeParticipantFromTrip = async (tripId, userId) => {
  if (!tripId || !userId) throw new Error('Trip ID and user ID are required')
  await updateDoc(doc(db, 'trips', tripId), {
    participants: arrayRemove(userId),
    [`participantNames.${userId}`]: deleteField(),
    updatedAt: new Date().toISOString()
  })
  await updateDoc(doc(db, 'users', userId), {
    trips: arrayRemove(tripId)
  })
}

export const addPaymentToStop = async (tripId, date, stopId, payment) => {
  if (!tripId || !date || !stopId) throw new Error('Missing required parameters')
  const amount = Number(payment?.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Payment amount must be greater than zero')
  }
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
          amount,
          createdAt: new Date().toISOString()
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

/** Removes the stop from the day (embedded payments are removed with the stop). */
export const deleteStopFromTrip = async (tripId, date, stopId) => {
  if (!tripId || !date || !stopId) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const dayIndex = itinerary.findIndex((day) => day.date === date)
  if (dayIndex < 0) throw new Error('Day not found')

  const prevLen = (itinerary[dayIndex].stops || []).length
  const nextStops = (itinerary[dayIndex].stops || []).filter((stop) => stop.id !== stopId)
  if (nextStops.length === prevLen) throw new Error('Stop not found')

  itinerary[dayIndex] = { ...itinerary[dayIndex], stops: nextStops }
  await updateDoc(tripRef, {
    itinerary,
    updatedAt: new Date().toISOString()
  })
}

export const deletePaymentFromStop = async (tripId, date, stopId, paymentId) => {
  if (!tripId || !date || !stopId || !paymentId) throw new Error('Missing required parameters')
  const tripRef = doc(db, 'trips', tripId)
  const tripSnapshot = await getDoc(tripRef)
  if (!tripSnapshot.exists()) throw new Error('Trip not found')

  const tripData = tripSnapshot.data()
  const itinerary = [...(tripData.itinerary || [])]
  const dayIndex = itinerary.findIndex((day) => day.date === date)
  if (dayIndex < 0) throw new Error('Day not found')

  let found = false
  const updatedStops = (itinerary[dayIndex].stops || []).map((stop) => {
    if (stop.id !== stopId) return stop
    const payments = stop.payments || []
    const nextPayments = payments.filter((p) => p.id !== paymentId)
    if (nextPayments.length === payments.length) return stop
    found = true
    return { ...stop, payments: nextPayments }
  })

  if (!found) throw new Error('Payment not found')

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
      lodgingBaseTitle(stop.title) === baseTitle
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
