import { useParams } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { BsCash, BsClock, BsGear, BsHouseDoor, BsPlus, BsShare, BsAirplane } from 'react-icons/bs'
import MapView from '../components/Trip/MapView'
import ItineraryView from '../components/Trip/ItineraryView'
import AddStopModal from '../components/AddStopModal'
import {
  ensureTripInviteMapping,
  geocodeLocation,
  reverseGeocodeLocation,
  subscribeToTripById,
  addPaymentToStop,
  addSpecialStopToTrip,
  completeTripSetup,
  deleteFlightStopsAcrossTrip,
  deleteLodgingStopsAcrossTrip,
  lookupFlightByNumber,
  removeParticipantFromTrip,
  updateTripSettings,
  updateDayTitleInTrip,
  updateStopInTrip
} from '../api/trip'
import '../App.css'

const formatStopTime = (timeValue, fallbackHour = 9) => {
  const normalized = typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)
    ? timeValue
    : `${String(fallbackHour).padStart(2, '0')}:00`
  const [hh, mm] = normalized.split(':').map(Number)
  const suffix = hh >= 12 ? 'PM' : 'AM'
  const hour12 = hh % 12 === 0 ? 12 : hh % 12
  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`
}

const getSortMinutes = (stop) => {
  const value = stop?.stopTime
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    const [hh, mm] = value.split(':').map(Number)
    return hh * 60 + mm
  }
  return Number(stop?.timestampHour || 0) * 60 + Number(stop?.timestampMinute || 0)
}

const lodgingBaseTitle = (title) =>
  (title || '').replace(/\s*(Check-in|Check-out)\s*$/i, '').trim() || 'Lodging'

const normalizeTimeInput = (value) => {
  if (!value || typeof value !== 'string') return '09:00'
  const parts = value.split(':')
  const hh = String(Number(parts[0] || 0)).padStart(2, '0')
  const mm = String(parts[1] != null ? parts[1].slice(0, 2) : '00').padStart(2, '0')
  return `${hh}:${mm}`
}

const isDateWithinRange = (value, start, end) => {
  if (!value || !start || !end) return false
  return value >= start && value <= end
}

const formatDateHeading = (dateValue) => {
  if (!dateValue) return 'No date selected'
  const parsed = new Date(`${dateValue}T00:00:00`)
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

export default function Trip() {
  const { tripId } = useParams()
  const { user } = useAuth()

  const [trip, setTrip] = useState(null)
  const [showTimePanel, setShowTimePanel] = useState(true)
  const [showAddStopModal, setShowAddStopModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [coordinates, setCoordinates] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedStopId, setSelectedStopId] = useState(null)
  const [newStopHour, setNewStopHour] = useState(9)
  const [shareCopied, setShareCopied] = useState('')
  const [isEditingStop, setIsEditingStop] = useState(false)
  const [stopForm, setStopForm] = useState({
    title: '',
    location: '',
    stopTime: '09:00',
    notes: ''
  })
  const [savingStop, setSavingStop] = useState(false)
  const [dayTitleDraft, setDayTitleDraft] = useState('')
  const [savingDayTitle, setSavingDayTitle] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [showFlightsModal, setShowFlightsModal] = useState(false)
  const [showLodgingModal, setShowLodgingModal] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [tripNotesDraft, setTripNotesDraft] = useState('')
  const [setupNotes, setSetupNotes] = useState('')
  const [setupFirstDayTitle, setSetupFirstDayTitle] = useState('')
  const [paymentForm, setPaymentForm] = useState({ reason: '', amount: '' })
  const [flightNumbersInput, setFlightNumbersInput] = useState('')
  const [flightLookupPreview, setFlightLookupPreview] = useState([])
  const [lodgingForm, setLodgingForm] = useState({
    name: '',
    address: '',
    checkInDate: '',
    checkInTime: '15:00',
    checkOutDate: '',
    checkOutTime: '11:00'
  })
  const [flightLookupLoading, setFlightLookupLoading] = useState(false)
  const [flightLookupError, setFlightLookupError] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeToTripById(tripId, (snapshot) => {
      setTrip(snapshot)
      if (!selectedDate && snapshot?.itinerary?.[0]?.date) {
        setSelectedDate(snapshot.itinerary[0].date)
      }
    })
    return () => unsubscribe()
  }, [tripId, selectedDate])

  useEffect(() => {
    const loadCoordinates = async () => {
      if (!trip?.destination) return
      const coords = await geocodeLocation(trip.destination)
      if (coords) {
        setCoordinates({ lat: coords.lat, lng: coords.lon })
      }
    }
    loadCoordinates()
  }, [trip?.destination])

  const selectedDay = trip?.itinerary?.find((day) => day.date === selectedDate)
  const selectedDayIndex = trip?.itinerary?.findIndex((day) => day.date === selectedDate) ?? -1
  const hasPreviousDate = selectedDayIndex > 0
  const hasNextDate = selectedDayIndex >= 0 && selectedDayIndex < (trip?.itinerary?.length || 0) - 1
  const stopsForSelectedDate = useMemo(
    () => [...(selectedDay?.stops || [])].sort((a, b) => getSortMinutes(a) - getSortMinutes(b)),
    [selectedDay]
  )
  const mapStopsForSelectedDate = useMemo(
    () =>
      stopsForSelectedDate.filter(
        (stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
      ),
    [stopsForSelectedDate]
  )
  const selectedStop = useMemo(
    () => stopsForSelectedDate.find((stop) => stop.id === selectedStopId) || null,
    [stopsForSelectedDate, selectedStopId]
  )
  const addedFlights = useMemo(() => {
    const map = new Map()
    for (const day of trip?.itinerary || []) {
      for (const stop of day.stops || []) {
        if (stop.stopType !== 'flight') continue
      const code = (stop.metadata?.flightNumber || stop.title || 'FLIGHT').toUpperCase()
      if (!map.has(code)) map.set(code, { code, stops: [] })
        map.get(code).stops.push({
          ...stop,
          date: day.date
        })
      }
    }
    return Array.from(map.values())
  }, [trip?.itinerary])

  const addedLodgings = useMemo(() => {
    const groups = new Map()
    for (const day of trip?.itinerary || []) {
      for (const stop of day.stops || []) {
        if (stop.stopType !== 'lodging') continue
        const id = stop.metadata?.lodgingId
        const base = lodgingBaseTitle(stop.title)
        const key = id || `legacy:${stop.location || ''}|${base}`
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            lodgingId: id || null,
            legacy: !id,
            label: stop.metadata?.lodgingLabel || base,
            location: stop.location || '',
            baseTitle: base,
            stops: []
          })
        }
        groups.get(key).stops.push({ ...stop, date: day.date })
      }
    }
    return Array.from(groups.values())
  }, [trip?.itinerary])

  const handleCopyShareLink = async () => {
    const shareLink = `${window.location.origin}/dashboard?tripId=${tripId}`
    await navigator.clipboard.writeText(shareLink)
    setShareCopied('Link copied')
    setTimeout(() => setShareCopied(''), 1500)
  }

  const handleCopyShareCode = async () => {
    await navigator.clipboard.writeText(trip?.inviteCode || '')
    setShareCopied('Code copied')
    setTimeout(() => setShareCopied(''), 1500)
  }

  const handleStopHourChange = async (stopId, hour) => {
    if (!selectedDate) return
    const targetStop = stopsForSelectedDate.find((stop) => stop.id === stopId)
    const minutes = targetStop?.stopTime?.split(':')?.[1] || '00'
    await updateStopInTrip(tripId, selectedDate, stopId, {
      stopTime: `${String(hour).padStart(2, '0')}:${minutes}`
    })
  }

  const handleTimestampClick = (hour) => {
    setNewStopHour(hour)
    setShowAddStopModal(true)
  }

  const handleShiftDate = (delta) => {
    if (!trip?.itinerary?.length || selectedDayIndex < 0) return
    const nextIndex = selectedDayIndex + delta
    if (nextIndex < 0 || nextIndex >= trip.itinerary.length) return
    setSelectedDate(trip.itinerary[nextIndex].date)
    setSelectedStopId(null)
  }

  useEffect(() => {
    if (!selectedStop) {
      setIsEditingStop(false)
      return
    }
    setStopForm({
      title: selectedStop.title || '',
      location: selectedStop.location || '',
      stopTime: selectedStop.stopTime || `${String(selectedStop.timestampHour ?? 9).padStart(2, '0')}:00`,
      notes: selectedStop.notes || ''
    })
    setIsEditingStop(false)
  }, [selectedStop])

  useEffect(() => {
    setDayTitleDraft(selectedDay?.title || '')
  }, [selectedDay?.date, selectedDay?.title])

  useEffect(() => {
    setTripNotesDraft(trip?.notes || '')
  }, [trip?.notes])

  useEffect(() => {
    if (trip && trip.setupCompleted === false) {
      setShowSetupModal(true)
    }
  }, [trip])

  const canManageSharing = user?.uid && trip?.creatorId === user.uid

  useEffect(() => {
    if (!canManageSharing || !trip?.inviteCode) return
    ensureTripInviteMapping(trip).catch((error) => {
      console.error('Failed to ensure invite mapping:', error)
    })
  }, [canManageSharing, trip])

  const handleStopFormChange = (event) => {
    const { name, value } = event.target
    setStopForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveDayTitle = async () => {
    if (!selectedDate || !tripId) return
    const nextTitle = dayTitleDraft.trim()
    if ((selectedDay?.title || '') === nextTitle) return
    setSavingDayTitle(true)
    try {
      await updateDayTitleInTrip(tripId, selectedDate, nextTitle)
    } catch (error) {
      console.error('Failed to save day title:', error)
    } finally {
      setSavingDayTitle(false)
    }
  }

  const handleSaveTripSettings = async () => {
    await updateTripSettings(tripId, { notes: tripNotesDraft })
    setShowSettingsModal(false)
  }

  const handleRemoveParticipant = async (participantId) => {
    await removeParticipantFromTrip(tripId, participantId)
  }

  const handleAddPayment = async () => {
    if (!selectedStopId || !selectedDate) return
    await addPaymentToStop(tripId, selectedDate, selectedStopId, {
      payerId: user?.uid || '',
      payerName: user?.displayName || user?.email || 'Unknown',
      reason: paymentForm.reason,
      amount: Number(paymentForm.amount)
    })
    setPaymentForm({ reason: '', amount: '' })
  }

  const createSpecialStop = async (base, dateOverride) => {
    const coords = await geocodeLocation(base.location)
    if (!coords) return
    const canonical = (await reverseGeocodeLocation(coords.lat, coords.lon)) || base.location
    await addSpecialStopToTrip(tripId, dateOverride || selectedDate, {
      title: base.title,
      notes: base.notes || '',
      location: canonical,
      stopTime: base.stopTime,
      latitude: coords.lat,
      longitude: coords.lon,
      stopType: base.stopType,
      createdBy: user?.uid || null,
      metadata: base.metadata || {}
    })
  }

  const handleAddFlightStops = async () => {
    if (!trip || flightLookupPreview.length === 0) return
    const selectedFlights = flightLookupPreview.filter((flight) => flight.selected)
    if (selectedFlights.length === 0) return
    const skipped = []
    for (const flight of selectedFlights) {
      const depInRange = isDateWithinRange(flight.departureDate, trip.startDate, trip.endDate)
      const arrInRange = isDateWithinRange(flight.arrivalDate, trip.startDate, trip.endDate)

      if (depInRange) {
        await createSpecialStop(
          {
            title: `${flight.flightNumber || 'Flight'} Departure`,
            notes: `Flight ${flight.flightNumber || ''} (${flight.departureTimezone || 'local'})`,
            location: flight.departureAddress,
            stopTime: flight.departureTime || '08:00',
            stopType: 'flight',
            metadata: {
              flightNumber: flight.flightNumber || ''
            }
          },
          flight.departureDate
        )
      } else {
        skipped.push(`${flight.flightNumber} departure (${flight.departureDate || 'unknown'})`)
      }

      if (arrInRange) {
        await createSpecialStop(
          {
            title: `${flight.flightNumber || 'Flight'} Arrival`,
            notes: `Flight ${flight.flightNumber || ''} (${flight.arrivalTimezone || 'local'})`,
            location: flight.arrivalAddress,
            stopTime: flight.arrivalTime || '12:00',
            stopType: 'flight',
            metadata: {
              flightNumber: flight.flightNumber || ''
            }
          },
          flight.arrivalDate
        )
      } else {
        skipped.push(`${flight.flightNumber} arrival (${flight.arrivalDate || 'unknown'})`)
      }
    }
    if (skipped.length > 0) {
      window.alert(
        `The following flight stop(s) were out of trip range and not added:\n- ${skipped.join('\n- ')}`
      )
    }
    setFlightLookupPreview([])
    setFlightNumbersInput('')
    setShowFlightsModal(false)
  }

  const handleFlightLookup = async () => {
    const numbers = flightNumbersInput
      .split(/[\n, ]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
    if (numbers.length === 0) return
    setFlightLookupLoading(true)
    setFlightLookupError('')
    try {
      const lookedUp = []
      for (let index = 0; index < numbers.length; index += 1) {
        const flightNumber = numbers[index]
        const flight = await lookupFlightByNumber(flightNumber, {
          targetDate: selectedDate
        })
        lookedUp.push({
          ...flight,
          id: `${flight.flightNumber || flightNumber}-${index}`,
          selected: true
        })
      }
      setFlightLookupPreview(lookedUp)
    } catch (error) {
      setFlightLookupError(error.message || 'Unable to lookup flight right now')
    } finally {
      setFlightLookupLoading(false)
    }
  }

  const handleDeleteFlight = async (flightNumber) => {
    await deleteFlightStopsAcrossTrip(tripId, flightNumber)
  }

  const handleFlightPreviewChange = (flightId, patch) => {
    setFlightLookupPreview((prev) =>
      prev.map((flight) => (flight.id === flightId ? { ...flight, ...patch } : flight))
    )
  }

  const getDefaultLodgingForm = () => {
    if (!trip?.itinerary?.length) {
      return {
        name: '',
        address: '',
        checkInDate: '',
        checkInTime: '15:00',
        checkOutDate: '',
        checkOutTime: '11:00'
      }
    }
    const first = trip.itinerary[0].date
    const last = trip.itinerary[trip.itinerary.length - 1].date
    return {
      name: '',
      address: '',
      checkInDate: first,
      checkInTime: '15:00',
      checkOutDate: last,
      checkOutTime: '11:00'
    }
  }

  const openLodgingModal = () => {
    setLodgingForm(getDefaultLodgingForm())
    setShowLodgingModal(true)
  }

  const handleDeleteLodging = async (entry) => {
    if (entry.lodgingId) {
      await deleteLodgingStopsAcrossTrip(tripId, entry.lodgingId)
    } else {
      await deleteLodgingStopsAcrossTrip(tripId, {
        location: entry.location,
        baseTitle: entry.baseTitle
      })
    }
  }

  const handleAddLodgingStops = async () => {
    if (!trip) return
    const label = lodgingForm.name.trim() || 'Lodging'
    const addr = lodgingForm.address.trim()
    if (!addr) {
      window.alert('Enter an address so we can place the stop on the map.')
      return
    }
    const lodgingId = crypto.randomUUID()
    const checkInTime = normalizeTimeInput(lodgingForm.checkInTime)
    const checkOutTime = normalizeTimeInput(lodgingForm.checkOutTime)
    const inRange = isDateWithinRange(lodgingForm.checkInDate, trip.startDate, trip.endDate)
    const outRange = isDateWithinRange(lodgingForm.checkOutDate, trip.startDate, trip.endDate)
    const skipped = []

    if (inRange) {
      await createSpecialStop(
        {
          title: `${label} Check-in`,
          notes: 'Lodging check-in',
          location: addr,
          stopTime: checkInTime,
          stopType: 'lodging',
          metadata: { lodgingId, lodgingLabel: label }
        },
        lodgingForm.checkInDate
      )
    } else {
      skipped.push(`check-in (${lodgingForm.checkInDate || 'missing'})`)
    }

    if (outRange) {
      await createSpecialStop(
        {
          title: `${label} Check-out`,
          notes: 'Lodging check-out',
          location: addr,
          stopTime: checkOutTime,
          stopType: 'lodging',
          metadata: { lodgingId, lodgingLabel: label }
        },
        lodgingForm.checkOutDate
      )
    } else {
      skipped.push(`check-out (${lodgingForm.checkOutDate || 'missing'})`)
    }

    if (skipped.length > 0) {
      window.alert(`Some lodging stop(s) were skipped:\n- ${skipped.join('\n- ')}`)
    }
    if (inRange || outRange) {
      setLodgingForm(getDefaultLodgingForm())
    }
  }

  const allPayments = useMemo(
    () =>
      (trip?.itinerary || []).flatMap((day) =>
        (day.stops || []).flatMap((stop) =>
          (stop.payments || []).map((payment) => ({
            ...payment,
            stopTitle: stop.title
          }))
        )
      ),
    [trip]
  )

  const paymentTotals = useMemo(() => {
    const totals = {}
    for (const payment of allPayments) {
      totals[payment.payerId] = (totals[payment.payerId] || 0) + Number(payment.amount || 0)
    }
    const participants = trip?.participants || []
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0)
    const share = participants.length > 0 ? total / participants.length : 0
    const userTotal = totals[user?.uid] || 0
    return { totals, total, share, userNet: userTotal - share }
  }, [allPayments, trip?.participants, user?.uid])

  const handleCompleteSetup = async () => {
    await completeTripSetup(tripId, {
      notes: setupNotes,
      firstDayTitle: setupFirstDayTitle
    })
    setShowSetupModal(false)
  }

  const handleSaveStop = async () => {
    if (!selectedDate || !selectedStopId || !selectedStop) return
    setSavingStop(true)
    try {
      const patch = {
        title: stopForm.title.trim(),
        location: stopForm.location.trim(),
        stopTime: stopForm.stopTime,
        notes: stopForm.notes.trim()
      }

      const locationChanged = patch.location !== (selectedStop.location || '')
      if (locationChanged && patch.location) {
        const coords = await geocodeLocation(patch.location)
        if (coords) {
          patch.latitude = coords.lat
          patch.longitude = coords.lon
          patch.location =
            (await reverseGeocodeLocation(coords.lat, coords.lon)) || patch.location
        }
      }

      await updateStopInTrip(tripId, selectedDate, selectedStopId, patch)
      setIsEditingStop(false)
    } catch (error) {
      console.error('Failed to save stop details:', error)
    } finally {
      setSavingStop(false)
    }
  }

  return (
    <div className="trip-page">
      <div className="trip-toolbar">
        <div className="trip-toolbar-left">
          <button
            type="button"
            className="trip-tool-button"
            onClick={() => setShowAddStopModal(!showAddStopModal)}
            aria-label="Add stop"
          >
            <BsPlus />
          </button>
        </div>
        {showAddStopModal && (
          <AddStopModal
            onClose={() => setShowAddStopModal(false)}
            tripId={tripId}
            tripDate={selectedDate}
            initialHour={newStopHour}
          />
        )}

        <div className="trip-toolbar-center">
          <div className="trip-toolbar-date-line">{formatDateHeading(selectedDate)}</div>
          <input
            type="text"
            className="trip-toolbar-day-title"
            value={dayTitleDraft}
            onChange={(event) => setDayTitleDraft(event.target.value)}
            onBlur={handleSaveDayTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            placeholder="Title of the day"
            aria-label="Title of the day"
            disabled={savingDayTitle}
          />
        </div>

        <div className="trip-toolbar-right">
          <button
            type="button"
            className="trip-tool-button"
            onClick={() => setShowSettingsModal((prev) => !prev)}
            aria-label="Trip settings"
          >
            <BsGear />
          </button>
          {canManageSharing && (
            <div className="share-menu-anchor">
              <button
                type="button"
                className="trip-tool-button"
                onClick={() => setShowShareMenu((prev) => !prev)}
                aria-label="Share trip"
              >
                <BsShare />
              </button>
              {showShareMenu && (
                <div className="share-dropdown">
                  <button type="button" onClick={handleCopyShareCode}>
                    Trip Code: {trip?.inviteCode}
                  </button>
                  <button type="button" onClick={handleCopyShareLink}>
                    Copy Invite Link
                  </button>
                  {shareCopied && <span>{shareCopied}</span>}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="trip-tool-button"
            onClick={() => setShowTimePanel((prev) => !prev)}
            aria-label="Open time panel"
          >
            <BsClock />
          </button>
        </div>
      </div>

      <div className="trip-page-content">
        <div className="trip-map-column">
          <div className="trip-map-pane">
            {coordinates && (
              <MapView
                coordinates={coordinates}
                shouldResizeMap={showTimePanel || Boolean(selectedStop)}
                stops={mapStopsForSelectedDate}
                focusStop={selectedStop}
              />
            )}
          </div>
        </div>
        {showTimePanel && (
          <div className="trip-right-column">
            <div className="time-panel">
              <div className="time-panel-date-nav">
                <button type="button" onClick={() => handleShiftDate(-1)} disabled={!hasPreviousDate}>
                  {'<'}
                </button>
                <span>{formatDateHeading(selectedDate)}</span>
                <button type="button" onClick={() => handleShiftDate(1)} disabled={!hasNextDate}>
                  {'>'}
                </button>
              </div>
              <div className="time-panel-scroll">
                <ItineraryView
                  stops={stopsForSelectedDate}
                  selectedStopId={selectedStopId}
                  onSelectStop={setSelectedStopId}
                  onMoveStop={handleStopHourChange}
                  onTimestampClick={handleTimestampClick}
                />
              </div>
            </div>
            {selectedStop && (
              <div className="stop-view-sheet" role="dialog" aria-label="Stop details">
                <div className="stop-view-actions">
                  {!isEditingStop && (
                    <button type="button" onClick={() => setIsEditingStop(true)}>
                      Edit
                    </button>
                  )}
                  {isEditingStop && (
                    <>
                      <button type="button" onClick={() => setIsEditingStop(false)} disabled={savingStop}>
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveStop} disabled={savingStop}>
                        {savingStop ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="stop-view-close"
                    onClick={() => setSelectedStopId(null)}
                  >
                    Close
                  </button>
                </div>
                {!isEditingStop ? (
                  <>
                    <h3>{selectedStop.title}</h3>
                    <div className="stop-view-row">
                      <span>Address</span>
                      <strong>{selectedStop.location || 'Not provided'}</strong>
                    </div>
                    <div className="stop-view-row">
                      <span>Time</span>
                      <strong>{formatStopTime(selectedStop.stopTime, selectedStop.timestampHour)}</strong>
                    </div>
                    <div className="stop-view-row">
                      <span>Notes</span>
                      <strong>{selectedStop.notes || 'No notes yet'}</strong>
                    </div>
                    <div className="stop-view-row">
                      <span>Payments</span>
                      {(selectedStop.payments || []).length === 0 && <strong>No payments yet</strong>}
                      {(selectedStop.payments || []).map((payment) => (
                        <strong key={payment.id}>
                          {payment.payerName} - {payment.reason} - ${Number(payment.amount || 0).toFixed(2)}
                        </strong>
                      ))}
                    </div>
                    <div className="stop-view-form-inline">
                      <input
                        placeholder="Reason"
                        value={paymentForm.reason}
                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, reason: event.target.value }))}
                      />
                      <input
                        placeholder="Amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                      />
                      <button type="button" onClick={handleAddPayment}>
                        Add Payment
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="stop-view-form">
                    <label htmlFor="stop-title-edit">Stop Name</label>
                    <input
                      id="stop-title-edit"
                      name="title"
                      value={stopForm.title}
                      onChange={handleStopFormChange}
                    />
                    <label htmlFor="stop-location-edit">Address</label>
                    <input
                      id="stop-location-edit"
                      name="location"
                      value={stopForm.location}
                      onChange={handleStopFormChange}
                    />
                    <label htmlFor="stop-time-edit">Time</label>
                    <input
                      type="time"
                      id="stop-time-edit"
                      name="stopTime"
                      value={stopForm.stopTime}
                      onChange={handleStopFormChange}
                    />
                    <label htmlFor="stop-notes-edit">Notes</label>
                    <textarea
                      id="stop-notes-edit"
                      name="notes"
                      rows={4}
                      value={stopForm.notes}
                      onChange={handleStopFormChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showSettingsModal && (
        <div className="inline-popover">
          <h3>Trip Settings</h3>
          <label htmlFor="trip-notes-input">Trip Notes</label>
          <textarea
            id="trip-notes-input"
            rows={4}
            value={tripNotesDraft}
            onChange={(event) => setTripNotesDraft(event.target.value)}
          />
          <button type="button" onClick={handleSaveTripSettings}>
            Save Settings
          </button>
          <h4>Participants</h4>
          {(trip?.participants || []).map((participantId) => (
            <div key={participantId} className="participant-row">
              <span>{participantId === user?.uid ? `${participantId} (You)` : participantId}</span>
              {canManageSharing && participantId !== trip?.creatorId && (
                <button type="button" onClick={() => handleRemoveParticipant(participantId)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="trip-island">
        <button type="button" className="trip-tool-button" onClick={() => setShowFlightsModal(true)}>
          <BsAirplane />
        </button>
        <button type="button" className="trip-tool-button" onClick={openLodgingModal}>
          <BsHouseDoor />
        </button>
        <button type="button" className="trip-tool-button" onClick={() => setShowPaymentsModal(true)}>
          <BsCash />
        </button>
      </div>

      {showFlightsModal && (
        <div className="modal-overlay" onClick={() => setShowFlightsModal(false)}>
          <div className="modal-content flights-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h2>Flights</h2></div>
            <div className="modal-form flights-modal-form">
              <p className="setup-subtitle">
                Add one or more flight numbers. We will fetch details and create departure/arrival stops.
              </p>
              <textarea
                rows={3}
                placeholder="UAL1325, UA847, AA120 (comma, space, or new line separated)"
                value={flightNumbersInput}
                onChange={(event) => setFlightNumbersInput(event.target.value)}
              />
              <button type="button" onClick={handleFlightLookup} disabled={flightLookupLoading}>
                {flightLookupLoading ? 'Looking up...' : 'Lookup Flights'}
              </button>
              {flightLookupError && <p className="join-error">{flightLookupError}</p>}
              {flightLookupPreview.length > 0 && (
                <div className="flights-preview">
                  {flightLookupPreview.map((flight) => (
                    <div key={flight.id} className="flight-preview-card">
                      <div className="flight-preview-header">
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(flight.selected)}
                            onChange={(event) =>
                              handleFlightPreviewChange(flight.id, { selected: event.target.checked })
                            }
                          />
                          Add this flight
                        </label>
                      </div>
                      <input
                        value={flight.flightNumber || ''}
                        onChange={(event) =>
                          handleFlightPreviewChange(flight.id, { flightNumber: event.target.value.toUpperCase() })
                        }
                        placeholder="Flight number"
                      />
                      <label>Departure</label>
                      <input
                        value={flight.departureAddress || ''}
                        onChange={(event) =>
                          handleFlightPreviewChange(flight.id, { departureAddress: event.target.value })
                        }
                      />
                      <div className="flight-preview-time-row">
                        <input
                          type="date"
                          value={flight.departureDate || ''}
                          onChange={(event) =>
                            handleFlightPreviewChange(flight.id, { departureDate: event.target.value })
                          }
                        />
                        <input
                          type="time"
                          value={flight.departureTime || '08:00'}
                          onChange={(event) =>
                            handleFlightPreviewChange(flight.id, { departureTime: event.target.value })
                          }
                        />
                      </div>
                      <label>Arrival</label>
                      <input
                        value={flight.arrivalAddress || ''}
                        onChange={(event) =>
                          handleFlightPreviewChange(flight.id, { arrivalAddress: event.target.value })
                        }
                      />
                      <div className="flight-preview-time-row">
                        <input
                          type="date"
                          value={flight.arrivalDate || ''}
                          onChange={(event) =>
                            handleFlightPreviewChange(flight.id, { arrivalDate: event.target.value })
                          }
                        />
                        <input
                          type="time"
                          value={flight.arrivalTime || '12:00'}
                          onChange={(event) =>
                            handleFlightPreviewChange(flight.id, { arrivalTime: event.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <h4>Currently Added Flights (Trip-wide)</h4>
              {addedFlights.length === 0 && <p className="setup-subtitle">No flights added yet.</p>}
              {addedFlights.map((flight) => (
                <div key={flight.code} className="participant-row">
                  <span>{flight.code}</span>
                  <button type="button" onClick={() => handleDeleteFlight(flight.code)}>
                    Delete
                  </button>
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowFlightsModal(false)}>Cancel</button>
                <button type="button" onClick={handleAddFlightStops} disabled={flightLookupPreview.length === 0}>
                  Create Flight Stops
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLodgingModal && (
        <div className="modal-overlay" onClick={() => setShowLodgingModal(false)}>
          <div className="modal-content lodging-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h2>Lodging</h2></div>
            <div className="modal-form flights-modal-form">
              <p className="setup-subtitle">
                Add one stay at a time. We create check-in and check-out stops from the address and dates you set.
                The Add lodging button saves them and clears the form so you can enter another stay without closing
                the modal.
              </p>
              <div className="flight-preview-card lodging-form-card">
                <input
                  value={lodgingForm.name}
                  onChange={(event) => setLodgingForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Hotel / Airbnb name"
                />
                <input
                  value={lodgingForm.address}
                  onChange={(event) => setLodgingForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Address"
                />
                <label>Check-in</label>
                <div className="flight-preview-time-row">
                  <input
                    type="date"
                    value={lodgingForm.checkInDate || ''}
                    onChange={(event) =>
                      setLodgingForm((prev) => ({ ...prev, checkInDate: event.target.value }))
                    }
                  />
                  <input
                    type="time"
                    value={lodgingForm.checkInTime || '15:00'}
                    onChange={(event) =>
                      setLodgingForm((prev) => ({ ...prev, checkInTime: event.target.value }))
                    }
                  />
                </div>
                <label>Check-out</label>
                <div className="flight-preview-time-row">
                  <input
                    type="date"
                    value={lodgingForm.checkOutDate || ''}
                    onChange={(event) =>
                      setLodgingForm((prev) => ({ ...prev, checkOutDate: event.target.value }))
                    }
                  />
                  <input
                    type="time"
                    value={lodgingForm.checkOutTime || '11:00'}
                    onChange={(event) =>
                      setLodgingForm((prev) => ({ ...prev, checkOutTime: event.target.value }))
                    }
                  />
                </div>
              </div>
              <h4>Currently Added Lodgings (Trip-wide)</h4>
              {addedLodgings.length === 0 && <p className="setup-subtitle">No lodging stops yet.</p>}
              {addedLodgings.map((entry) => (
                <div key={entry.key} className="participant-row">
                  <span>
                    {entry.label}
                    {entry.location ? ` — ${entry.location}` : ''}
                  </span>
                  <button type="button" onClick={() => handleDeleteLodging(entry)}>
                    Delete
                  </button>
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowLodgingModal(false)}>Close</button>
                <button
                  type="button"
                  onClick={handleAddLodgingStops}
                  disabled={!trip?.itinerary?.length || !lodgingForm.address.trim()}
                >
                  Add lodging
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentsModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentsModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h2>Money</h2></div>
            <div className="modal-form">
              <p>Total spent: ${paymentTotals.total.toFixed(2)}</p>
              <p>Your net: {paymentTotals.userNet >= 0 ? '+' : '-'}${Math.abs(paymentTotals.userNet).toFixed(2)}</p>
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reason</th>
                    <th>Amount</th>
                    <th>Stop</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payerName}</td>
                      <td>{payment.reason}</td>
                      <td>${Number(payment.amount).toFixed(2)}</td>
                      <td>{payment.stopTitle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showSetupModal && (
        <div className="modal-overlay">
          <div className="modal-content setup-modal-content">
            <div className="modal-header"><h2>Get Started</h2></div>
            <div className="modal-form setup-modal-form">
              <p className="setup-subtitle">Set up your trip workspace with two quick details.</p>
              <div className="setup-field-card">
                <label>Overall trip notes</label>
                <small>High-level details everyone should know.</small>
                <textarea
                  rows={3}
                  value={setupNotes}
                  onChange={(event) => setSetupNotes(event.target.value)}
                  placeholder="Budget notes, group expectations, packing reminders..."
                />
              </div>
              <div className="setup-field-card">
                <label>Day 1 title</label>
                <small>What is the focus/theme for the first day?</small>
                <input
                  value={setupFirstDayTitle}
                  onChange={(event) => setSetupFirstDayTitle(event.target.value)}
                  placeholder="Arrival and downtown walk"
                />
              </div>
              <div className="modal-actions setup-actions">
                <button type="button" onClick={handleCompleteSetup}>Initialize Trip</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
