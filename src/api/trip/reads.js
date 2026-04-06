import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { normalizeDay, normalizeParticipants } from './normalize'

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
