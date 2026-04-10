import { arrayRemove, arrayUnion, doc, getDoc, runTransaction, setDoc, updateDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../firebase'
import { getDatesBetween } from './dates'
import { generateInviteCode } from './normalize'
import { buildParticipantLabel } from '../../utils/participantLabels'

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
    const itinerary = dates.map((date) => ({
      date: date,
      stops: []
    }))

    const tripId = uuidv4()
    const inviteCode = generateInviteCode()
    const creatorProfile = userSnap.data()
    const creatorLabel =
      buildParticipantLabel({
        displayName: creatorProfile?.displayName,
        email: creatorProfile?.email
      }) ||
      buildParticipantLabel({
        displayName: tripData.memberDisplayName,
        email: tripData.memberEmail
      })
    const newTrip = {
      id: tripId,
      name: tripData.name,
      creatorId: userId,
      participants: [userId],
      participantNames: creatorLabel ? { [userId]: creatorLabel } : {},
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      description: tripData.description || '',
      notes: tripData.notes || '',
      setupCompleted: true,
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

export const joinTripByCode = async (userId, inviteCode, memberProfile = null) => {
  if (!userId || !inviteCode) throw new Error('User and invite code are required')

  const normalizedCode = inviteCode.trim().toUpperCase()
  const inviteDocRef = doc(db, 'trip_invites', normalizedCode)
  const inviteSnapshot = await getDoc(inviteDocRef)
  if (!inviteSnapshot.exists()) throw new Error('Trip not found for that invite code')

  const inviteData = inviteSnapshot.data()
  const tripId = inviteData.tripId
  if (!tripId) throw new Error('Invite code is invalid')

  const joinLabel = buildParticipantLabel(memberProfile || {})
  const tripUpdate = {
    participants: arrayUnion(userId),
    updatedAt: new Date().toISOString()
  }
  if (joinLabel) {
    tripUpdate[`participantNames.${userId}`] = joinLabel
  }
  await updateDoc(doc(db, 'trips', tripId), tripUpdate)

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

export const joinTripById = async (userId, tripId, memberProfile = null) => {
  if (!userId || !tripId) throw new Error('User and trip ID are required')
  const joinLabel = buildParticipantLabel(memberProfile || {})
  const tripUpdate = {
    participants: arrayUnion(userId),
    updatedAt: new Date().toISOString()
  }
  if (joinLabel) {
    tripUpdate[`participantNames.${userId}`] = joinLabel
  }
  await updateDoc(doc(db, 'trips', tripId), tripUpdate)

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

/**
 * Deletes the trip + invite mapping and `arrayRemove`s the trip id from every participant’s `users.trips`
 * (in one transaction, before the trip doc is deleted, so rules can verify the caller is the creator).
 * Requires Firestore rules that allow the creator to touch another user’s doc only for that `trips` change.
 */
export const deleteTripForCreator = async (tripId, creatorUserId) => {
  if (!tripId || !creatorUserId) throw new Error('Trip ID and user ID are required')

  await runTransaction(db, async (transaction) => {
    const tripRef = doc(db, 'trips', tripId)
    const tripSnap = await transaction.get(tripRef)
    if (!tripSnap.exists()) {
      throw new Error('Trip not found')
    }
    const data = tripSnap.data()
    if (data.creatorId !== creatorUserId) {
      throw new Error('Only the trip creator can delete this trip')
    }

    const participants = Array.from(new Set(data.participants || []))
    const inviteCode = (data.inviteCode || '').trim().toUpperCase()
    const inviteRef = inviteCode ? doc(db, 'trip_invites', inviteCode) : null

    const userRefs = participants.map((uid) => doc(db, 'users', uid))
    const userSnaps = await Promise.all(userRefs.map((ref) => transaction.get(ref)))
    const inviteSnap = inviteRef ? await transaction.get(inviteRef) : null

    for (let i = 0; i < userRefs.length; i++) {
      if (userSnaps[i].exists()) {
        transaction.update(userRefs[i], {
          trips: arrayRemove(tripId)
        })
      }
    }

    if (inviteRef && inviteSnap?.exists() && inviteSnap.data()?.tripId === tripId) {
      transaction.delete(inviteRef)
    }

    transaction.delete(tripRef)
  })
}
