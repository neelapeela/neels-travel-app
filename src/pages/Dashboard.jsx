import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTripsForUser } from '../api/trip'
import { BsPlusCircle } from 'react-icons/bs'
import CreateTripModal from '../components/CreateTripModal'
import '../App.css'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [createTripModalOpen, setCreateTripModalOpen] = useState(false)

  // Fetch trips function
  const fetchTrips = async () => {
    if (!user?.uid) return

    try {
      setTripsLoading(true)
      const userTrips = await getTripsForUser(user.uid)
      setTrips(userTrips || [])
    } catch (error) {
      console.error('Error fetching trips:', error)
      setTrips([])
    } finally {
      setTripsLoading(false)
    }
  }

  // Fetch trips when user is available
  useEffect(() => {
    fetchTrips()
  }, [user?.uid])

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrip = () => {
    setCreateTripModalOpen(true)
  }

  const handleCloseModal = () => {
    setCreateTripModalOpen(false)
    // Refresh trips after modal closes (trip was created)
    fetchTrips()
  }

  const handleCreateTripSubmit = async (tripData) => {
    // TODO: Implement trip creation API call
    console.log('Creating trip:', tripData)
    // After creating, refresh trips list
    // You can call fetchTrips again or update trips state directly
  }

  return (
    <div className="dashboard">
      {createTripModalOpen && (
        <CreateTripModal 
          onClose={handleCloseModal}
        />
      )}
      <div className="left-panel">
        <button className="create-trip-button" onClick={handleCreateTrip}>
          <BsPlusCircle size={48} />
          <span>Create Trip</span>
        </button>
      </div>
      <div className="right-panel">
        <div className="trip-container-header">
          <h2>Trips</h2>
        </div>
        <div className="trip-list">
          {trips.map((trip) => (
            <div className="trip-item" key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)}>
              <h3>{trip.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
