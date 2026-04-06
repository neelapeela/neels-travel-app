import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Load display names for trip participants from `users/{uid}` (displayName, else email).
 * @param {string[]} uids
 * @returns {Promise<Record<string, string | null>>} uid → label or null if missing
 */
export const getParticipantDisplayNamesByIds = async (uids) => {
  const unique = [...new Set((uids || []).filter(Boolean))]
  const result = {}
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) {
          result[uid] = null
          return
        }
        const d = snap.data()
        const name = (d.displayName || '').trim() || (d.email || '').trim() || null
        result[uid] = name
      } catch {
        result[uid] = null
      }
    })
  )
  return result
}

export const syncUserWithFirestore = async (user) => {
  if (!user) return

  try {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    const payload = {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      phoneNumber: user.phoneNumber ?? null,
      photoURL: user.photoURL ?? null
    }

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...payload,
        createdAt: new Date(),
        trips: []
      })
    } else {
      await setDoc(userRef, payload, { merge: true })
    }
  } catch (error) {
    console.error('Error syncing user with Firestore:', error)
    throw error
  }
}