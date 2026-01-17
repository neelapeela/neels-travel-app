import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase"; // Your Firestore instance

export const syncUserWithFirestore = async (user) => {
  if (!user) return;

  // Reference to the document: users/{uid}
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create the "profile" in Firestore linked by UID
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      createdAt: new Date(),
      trips: []
    });
  }
};