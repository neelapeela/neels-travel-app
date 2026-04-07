import { createContext, useContext, useEffect, useState } from 'react'
import { getRedirectResult, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../api/firebase'
import { syncUserWithFirestore } from '../api/user'
import { isBenignRedirectRecoveryError } from '../utils/authSignIn'

const AuthContext = createContext(undefined)

export function useAuth() {
  const value = useContext(AuthContext)
  if (value === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return value
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}

    ;(async () => {
      try {
        await getRedirectResult(auth)
      } catch (error) {
        if (!isBenignRedirectRecoveryError(error)) {
          console.error('getRedirectResult failed:', error)
        }
      }
      if (cancelled) return

      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser)
        try {
          await syncUserWithFirestore(currentUser)
        } catch (error) {
          console.error('Auth bootstrap failed:', error)
        } finally {
          setLoading(false)
        }
      })
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
