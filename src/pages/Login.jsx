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
      <h2>Sign In</h2>
      <p>Sign in with your Google account to continue</p>
      
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
