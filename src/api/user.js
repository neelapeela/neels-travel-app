import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export const syncUserWithFirestore = async (user) => {
  if (!user) return

  try {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        createdAt: new Date(),
        trips: []
      })
    }
  } catch (error) {
    console.error('Error syncing user with Firestore:', error)
    throw error
  }
}