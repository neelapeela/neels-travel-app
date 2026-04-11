import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOffline } from '../context/OfflineContext'
import { joinTripByCode, joinTripById, subscribeToUserTrips } from '../api/trip'
import { BsPlusLg } from 'react-icons/bs'
import CreateTripModal from '../components/CreateTripModal'
import { Button, Card, Input, PageShell, TripListCard } from '../components/ui'
import '../App.css'

export default function Dashboard() {
  const { user } = useAuth()
  const { isOnline } = useOffline()
  const savesDisabled = !isOnline
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

    joinTripById(user.uid, tripId, {
      displayName: user.displayName,
      email: user.email
    })
      .then(() => navigate(`/trip/${tripId}`, { replace: true }))
      .catch((error) => {
        setJoinError(error.message || 'Unable to join trip from link')
      })
  }, [navigate, searchParams, user?.uid, user?.displayName, user?.email])

  const handleJoin = async () => {
    if (!user?.uid || !joinCode.trim()) return
    setJoinError('')
    setJoining(true)
    try {
      const tripId = await joinTripByCode(user.uid, joinCode.trim(), {
        displayName: user.displayName,
        email: user.email
      })
      setJoinCode('')
      navigate(`/trip/${tripId}`)
    } catch (error) {
      setJoinError(error.message || 'Unable to join trip')
    } finally {
      setJoining(false)
    }
  }

  return (
    <PageShell variant="padded" className="dashboard-page-shell">
      {createTripModalOpen && isOnline && <CreateTripModal onClose={() => setCreateTripModalOpen(false)} />}

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <Card padded className="ui-card--bento-warm">
            <p className="ui-section-title">Start</p>
            <div className="dashboard-sidebar__actions">
              <Button
                variant="primary"
                block
                disabled={savesDisabled}
                title={savesDisabled ? 'Connect to create a trip' : undefined}
                onClick={() => {
                  if (savesDisabled) return
                  setCreateTripModalOpen(true)
                }}
              >
                <BsPlusLg size={18} aria-hidden />
                New trip
              </Button>
            </div>
          </Card>

          <Card padded className="dashboard-join-card-surface">
            <div className="dashboard-join-card">
              <p className="ui-section-title dashboard-join-card__title">Join</p>
              <Input
                label="Invite code"
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                autoComplete="off"
                wrapperClassName="dashboard-join-card__field"
              />
              <Button
                variant="secondary"
                block
                disabled={savesDisabled || joining || !joinCode.trim()}
                title={savesDisabled ? 'Connect to join a trip' : undefined}
                onClick={handleJoin}
              >
                {joining ? 'Joining…' : 'Join trip'}
              </Button>
              {joinError ? (
                <p className="ui-alert ui-alert--error dashboard-join-card__alert" role="alert">
                  {joinError}
                </p>
              ) : null}
            </div>
          </Card>
        </aside>

        <section className="dashboard-main">
          <h2 className="ui-heading-2">Your trips</h2>
          {trips.length === 0 ? (
            <p className="dashboard-empty">No trips yet. Create one or join with a code from the left.</p>
          ) : (
            <div className="dashboard-trip-grid">
              {trips.map((trip) => (
                <TripListCard key={trip.id} trip={trip} onSelect={() => navigate(`/trip/${trip.id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
