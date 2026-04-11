import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { OfflineProvider } from './context/OfflineContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Trip from './pages/Trip'
import ProtectedRoute from './routes/ProtectedRoute'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="trip/:tripId"
              element={
                <ProtectedRoute>
                  <Trip />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
