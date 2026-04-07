import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    // Preserve path + query (e.g. /dashboard?tripId=…) so invite links work after Google sign-in.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
