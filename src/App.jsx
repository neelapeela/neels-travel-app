import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ChakraProvider } from '@chakra-ui/react'
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
        <ChakraProvider>
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
        </ChakraProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
