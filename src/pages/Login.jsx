import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../api/firebase'
import { useAuth } from '../context/AuthContext'
import '../App.css'

export default function Login() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      // No need to navigate - AuthContext will handle redirect via ProtectedRoute
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div>
        <h2>Welcome to Travel Itinerary</h2>
        <p>Plan shared trips with friends in one real-time itinerary.</p>
        <p>Sign in with Google to create or join your trips.</p>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <button 
        onClick={handleGoogleSignIn} 
        disabled={loading}
        className="google-sign-in-button"
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </div>
  )
}
