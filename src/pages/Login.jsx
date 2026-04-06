import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../api/firebase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, PageShell } from '../components/ui'
import landingHeroMap from '../illustrations/landing-hero-map.png'
import '../App.css'

export default function Login() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell variant="center" className="login-page-shell">
      <div className="login-page">
        <div className="login-page__inner">
          <div className="login-page__copy">
            <p className="ui-eyebrow login-page__eyebrow">Maps, stops &amp; split bills</p>
            <h1 className="ui-display">
              We&apos;re going
              <br />
              <span className="ui-display__accent">on an adventure!</span>
            </h1>
            <p className="ui-lead login-page__lead">
              Lucky for you my travel book is awesome. Sign in with Google to start a trip or join with an invite code.
            </p>
          </div>

          <Card className="login-page__card" padded>
            <div className="login-page__actions">
              {error ? (
                <div className="ui-alert ui-alert--error" role="alert">
                  {error}
                </div>
              ) : null}
              <Button variant="google" block disabled={loading} onClick={handleGoogleSignIn}>
                {loading ? 'Signing in…' : 'Continue with Google'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="login-page__art">
          <img
            className="login-page__art-img pixel-art"
            src={landingHeroMap}
            alt="Pixel art treasure map scroll with a dotted path, landmarks, and compass."
            width={1024}
            height={1024}
            decoding="async"
          />
        </div>
      </div>
    </PageShell>
  )
}
