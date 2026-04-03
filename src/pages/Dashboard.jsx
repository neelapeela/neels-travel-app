import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { joinTripByCode, joinTripById, subscribeToUserTrips } from '../api/trip'
import { BsPlusCircle } from 'react-icons/bs'
import CreateTripModal from '../components/CreateTripModal'
import '../App.css'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [trips, setTrips] = useState([])
  const [createTripModalOpen, setCreateTripModalOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    const unsubscribe = subscribeToUserTrips(user.uid, (userTrips) => {
      setTrips(
        userTrips.sort(
          (a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
        )
      )
    })
    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const tripId = searchParams.get('tripId')
    if (!tripId) return

    joinTripById(user.uid, tripId).catch((error) => {
      setJoinError(error.message || 'Unable to join trip from link')
    })
  }, [searchParams, user?.uid])

  const handleJoin = async () => {
    if (!user?.uid || !joinCode.trim()) return
    setJoinError('')
    setJoining(true)
    try {
      const tripId = await joinTripByCode(user.uid, joinCode.trim())
      setJoinCode('')
      navigate(`/trip/${tripId}`)
    } catch (error) {
      setJoinError(error.message || 'Unable to join trip')
    } finally {
      setJoining(false)
    }
  }

  const handleCloseModal = () => {
    setCreateTripModalOpen(false)
  }

  return (
    <div className="dashboard">
      {createTripModalOpen && (
        <CreateTripModal 
          onClose={handleCloseModal}
        />
      )}
      <div className="left-panel">
        <button className="create-trip-button" onClick={() => setCreateTripModalOpen(true)}>
          <BsPlusCircle size={48} />
          <span>Create Trip</span>
        </button>
        <div className="join-trip-card">
          <h3>Join with code</h3>
          <input
            type="text"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
          />
          <button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
            {joining ? 'Joining...' : 'Join Trip'}
          </button>
          {joinError && <p className="join-error">{joinError}</p>}
        </div>
      </div>
      <div className="right-panel">
        <div className="trip-container-header">
          <h2>Upcoming Trips</h2>
        </div>
        <div className="trip-list">
          {trips.length === 0 && <p className="empty-state">No trips yet. Create one to get started.</p>}
          {trips.map((trip) => (
            <div className="trip-item" key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)}>
              <h3>{trip.name}</h3>
              <p>{trip.destination}</p>
              <p>{trip.startDate} - {trip.endDate}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
