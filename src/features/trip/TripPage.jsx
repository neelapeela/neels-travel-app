import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useOffline } from '../../context/OfflineContext'
import MapView from './components/MapView'
import ItineraryView from './components/ItineraryView'
import {
  ensureTripInviteMapping,
  geocodeLocation,
  reverseGeocodeLocation,
  deleteStopFromTrip,
  deletePaymentFromStop,
  addSpecialStopToTrip,
  deleteFlightStopsAcrossTrip,
  deleteLodgingStopsAcrossTrip,
  lookupFlightByNumber,
  removeParticipantFromTrip,
  deleteTripForCreator,
  upsertParticipantNameOnTrip,
  updateTripSettings,
  updateDayTitleInTrip,
  updateStopInTrip
} from '../../api/trip'
import { buildParticipantLabel } from '../../utils/participantLabels'
import { useTripDocument } from '../../hooks/useTripDocument'
import { useDestinationCoordinates } from '../../hooks/useDestinationCoordinates'
import { useStopSheetHeight } from '../../hooks/useStopSheetHeight'
import { useTripTimelineResize } from '../../hooks/useTripTimelineResize'
import { useTripPaymentAnalytics } from '../../hooks/useTripPaymentAnalytics'
import { useTripSpecialStopGroups } from '../../hooks/useTripSpecialStopGroups'
import { useRequestCache } from '../../hooks/useRequestCache'
import { useTripDaySelection } from '../../hooks/useTripDaySelection'
import { normalizeTimeInput } from '../../utils/stopTime'
import { findTimeZoneIdAtCoordinate } from '../../utils/stopTimezone'
import { membersKey, colorForMembersKey, normalizeMembersForParticipants, normalizeMembersValue } from './utils/stopMembers'
import { isDateWithinRange, formatDateHeading } from '../../utils/tripDates'
import { hasSeenTripTutorial, markTripTutorialSeen } from '../../utils/tripTutorialStorage'
import { SHARE_FEEDBACK_CLEAR_MS } from './constants'
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'
import TripToolbar from './components/TripToolbar'
import StopViewSheet from './components/StopViewSheet'
import TripIsland from './components/TripIsland'
import TripSettingsPopover from './components/TripSettingsPopover'
import MoneyModal from './components/modals/MoneyModal'
import PaymentDetailModal from './components/modals/PaymentDetailModal'
import TripOnboardingCarousel from './components/TripOnboardingCarousel'
import FlightsModal from './components/modals/FlightsModal'
import LodgingModal from './components/modals/LodgingModal'
import StopTicketsModal from './components/modals/StopTicketsModal'
import './trip.css'

function membersValueEqual(left, right) {
  const a = normalizeMembersValue(left)
  const b = normalizeMembersValue(right)
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}

export default function TripPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOnline } = useOffline()
  const savesDisabled = !isOnline

  const [selectedDate, setSelectedDate] = useState(null)
  const { trip, staleReadCache } = useTripDocument(tripId, setSelectedDate)
  const coordinates = useDestinationCoordinates(trip?.destination)
  const [showTimePanel, setShowTimePanel] = useState(true)
  const [showAddStopModal, setShowAddStopModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [selectedStopId, setSelectedStopId] = useState(null)
  const [newStopHour, setNewStopHour] = useState(9)
  const [shareCopied, setShareCopied] = useState('')
  const [isEditingStop, setIsEditingStop] = useState(false)
  const [stopForm, setStopForm] = useState({
    title: '',
    location: '',
    stopTime: '09:00',
    notes: '',
    members: null
  })
  const [savingStop, setSavingStop] = useState(false)
  const [dayTitleDraft, setDayTitleDraft] = useState('')
  const [savingDayTitle, setSavingDayTitle] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [paymentsMoneyTab, setPaymentsMoneyTab] = useState('overview')
  const [showFlightsModal, setShowFlightsModal] = useState(false)
  const [showLodgingModal, setShowLodgingModal] = useState(false)
  const [pendingStopEditId, setPendingStopEditId] = useState(null)
  const [tripNotesDraft, setTripNotesDraft] = useState('')
  const [showTripOnboarding, setShowTripOnboarding] = useState(false)
  const [showStopTicketsModal, setShowStopTicketsModal] = useState(false)
  const [ticketsModalInitialTab, setTicketsModalInitialTab] = useState('tickets')
  const [paymentDetailModal, setPaymentDetailModal] = useState(null)
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
  const [lodgingMembers, setLodgingMembers] = useState(null) // null => all
  const [flightLookupLoading, setFlightLookupLoading] = useState(false)
  const [flightLookupError, setFlightLookupError] = useState('')
  const [flightMembers, setFlightMembers] = useState(null) // null => all
  const geocodeCache = useRequestCache()
  const reverseGeocodeCache = useRequestCache()
  const flightLookupCache = useRequestCache()
  const normalizedTripParticipants = useMemo(
    () => normalizeMembersValue(trip?.participants) || [],
    [trip?.participants]
  )
  const sanitizeMembersForTrip = useCallback(
    (members) => normalizeMembersForParticipants(members, normalizedTripParticipants),
    [normalizedTripParticipants]
  )

  const {
    selectedDay,
    hasPreviousDate,
    hasNextDate,
    stopsForSelectedDate,
    mapStopsForSelectedDate,
    selectedStop,
    handleShiftDate
  } = useTripDaySelection(trip, selectedDate, selectedStopId, setSelectedDate, setSelectedStopId)

  const tripMapPaneRef = useRef(null)
  const { stopSheetRef, stopSheetHeight, mapLeftInsetPx } = useStopSheetHeight(
    tripMapPaneRef,
    selectedStop,
    isEditingStop
  )
  const {
    mapColumnRef,
    contentRef: tripContentRef,
    mapColumnStyle,
    showHandle: showTimelineSplitHandle,
    mapBandPx: timelineMapBandPx,
    resizeHandleProps,
    splitDragging: timelineSplitDragging
  } = useTripTimelineResize(showTimePanel)
  const { addedFlights, addedLodgings } = useTripSpecialStopGroups(trip?.itinerary)
  const { allPayments, paymentTotals, paymentOverviewVsYou } = useTripPaymentAnalytics(trip, user?.uid)

  const handleCopyShareLink = async () => {
    const shareLink = `${window.location.origin}/dashboard?tripId=${tripId}`
    await navigator.clipboard.writeText(shareLink)
    setShareCopied('Link copied')
    setTimeout(() => setShareCopied(''), SHARE_FEEDBACK_CLEAR_MS)
  }

  const handleCopyShareCode = async () => {
    await navigator.clipboard.writeText(trip?.inviteCode || '')
    setShareCopied('Code copied')
    setTimeout(() => setShareCopied(''), SHARE_FEEDBACK_CLEAR_MS)
  }

  const getCachedGeocode = async (locationRaw) => {
    const location = locationRaw?.trim()
    if (!location) return null
    const key = location.toLowerCase()
    return geocodeCache.getOrSet(key, async () => (await geocodeLocation(location)) || null)
  }

  const getCachedReverseGeocode = async (lat, lon) => {
    const key = `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`
    return reverseGeocodeCache.getOrSet(key, async () => (await reverseGeocodeLocation(lat, lon)) || null)
  }

  const getCachedFlightLookup = async (flightNumber, targetDate) => {
    const key = `${String(flightNumber || '')
      .trim()
      .toUpperCase()}::${String(targetDate || '')}`
    return flightLookupCache.getOrSet(key, async () => lookupFlightByNumber(flightNumber, { targetDate }))
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

  const getStopColor = (stop) => {
    const key = membersKey(stop?.members, trip?.participants || [])
    return colorForMembersKey(key)
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
      notes: selectedStop.notes || '',
      members: sanitizeMembersForTrip(selectedStop.members)
    })
    setIsEditingStop(false)
  }, [selectedStop, sanitizeMembersForTrip])

  useEffect(() => {
    setFlightMembers((prev) => {
      const next = sanitizeMembersForTrip(prev)
      return membersValueEqual(prev, next) ? prev : next
    })
    setLodgingMembers((prev) => {
      const next = sanitizeMembersForTrip(prev)
      return membersValueEqual(prev, next) ? prev : next
    })
    setStopForm((prev) => {
      const nextMembers = sanitizeMembersForTrip(prev.members)
      if (membersValueEqual(prev.members, nextMembers)) return prev
      return { ...prev, members: nextMembers }
    })
  }, [sanitizeMembersForTrip])

  useEffect(() => {
    if (!pendingStopEditId || !selectedStop?.id) return
    if (selectedStop.id !== pendingStopEditId) return
    setIsEditingStop(true)
    setPendingStopEditId(null)
  }, [pendingStopEditId, selectedStop?.id])

  useEffect(() => {
    setPaymentDetailModal(null)
    setTicketsModalInitialTab('tickets')
  }, [selectedStopId])

  useEffect(() => {
    if (isOnline) return
    setShowAddStopModal(false)
    setShowSettingsModal(false)
    setShowFlightsModal(false)
    setShowLodgingModal(false)
    setShowPaymentsModal(false)
    setPaymentDetailModal(null)
  }, [isOnline])

  useEffect(() => {
    setDayTitleDraft(selectedDay?.title || '')
  }, [selectedDay?.date, selectedDay?.title])

  useEffect(() => {
    setTripNotesDraft(trip?.notes || '')
  }, [trip?.notes])

  useEffect(() => {
    if (!tripId || !trip?.id || !user?.uid) {
      setShowTripOnboarding(false)
      return
    }
    if (hasSeenTripTutorial(user.uid)) {
      setShowTripOnboarding(false)
      return
    }
    setShowTripOnboarding(true)
  }, [tripId, trip?.id, user?.uid])

  useEffect(() => {
    if (showTripOnboarding) setShowTimePanel(true)
  }, [showTripOnboarding])

  const dismissTripOnboarding = () => {
    markTripTutorialSeen(user?.uid)
    setShowTripOnboarding(false)
  }

  const canManageSharing = user?.uid && trip?.creatorId === user.uid

  useEffect(() => {
    if (!canManageSharing || !trip?.inviteCode) return
    ensureTripInviteMapping(trip).catch((error) => {
      console.error('Failed to ensure invite mapping:', error)
    })
  }, [canManageSharing, trip])

  useEffect(() => {
    if (!trip?.id || !user?.uid) return
    const desired = buildParticipantLabel({ displayName: user.displayName, email: user.email })
    if (!desired) return
    if (trip.participantNames?.[user.uid] === desired) return
    upsertParticipantNameOnTrip(trip.id, user.uid, desired).catch((error) => {
      console.error('Failed to sync participant name on trip:', error)
    })
    // Full map in deps: effect only writes the current user’s slot; avoids missing updates when Firestore replaces `participantNames`.
  }, [trip?.id, user?.uid, user?.displayName, user?.email, trip?.participantNames])

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

  const handleDeleteTrip = async () => {
    if (!tripId || !user?.uid || trip?.creatorId !== user.uid) return
    const name = (trip?.name || 'this trip').trim() || 'this trip'
    if (
      !window.confirm(
        `Delete “${name}” for everyone? This removes the trip, invite link, and itinerary. Other travelers will lose access. This cannot be undone.`
      )
    ) {
      return
    }
    try {
      await deleteTripForCreator(tripId, user.uid)
      setShowSettingsModal(false)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Failed to delete trip', error)
      window.alert(error?.message || 'Could not delete trip. Check your connection and permissions.')
    }
  }

  const createSpecialStop = async (base, dateOverride) => {
    const coords = await getCachedGeocode(base.location)
    if (!coords) return
    const canonical = (await getCachedReverseGeocode(coords.lat, coords.lon)) || base.location
    const metadata = { ...(base.metadata || {}) }
    const tzId = findTimeZoneIdAtCoordinate(coords.lat, coords.lon)
    if (tzId) metadata.stopTimezone = tzId
    const baseNotes = (base.notes || '').trim()
    const tzLabel = tzId ? tzId.replace(/_/g, ' ') : ''
    const notes =
      base.stopType === 'flight' && tzLabel
        ? baseNotes.includes(tzLabel)
          ? baseNotes
          : `${baseNotes} (${tzLabel})`.trim()
        : baseNotes
    await addSpecialStopToTrip(tripId, dateOverride || selectedDate, {
      title: base.title,
      notes,
      location: canonical,
      stopTime: base.stopTime,
      latitude: coords.lat,
      longitude: coords.lon,
      members: sanitizeMembersForTrip(base.members),
      stopType: base.stopType,
      createdBy: user?.uid || null,
      metadata
    })
  }

  const handleAddFlightStops = async () => {
    if (!trip || flightLookupPreview.length === 0) return
    const selectedFlights = flightLookupPreview.filter((flight) => flight.selected)
    if (selectedFlights.length === 0) return
    const skipped = []
    const travelerId = user?.uid || null
    const participantIds = travelerId ? [travelerId] : []
    for (const flight of selectedFlights) {
      const flightPairId = crypto.randomUUID()
      const flightNumber = String(flight.flightNumber || '').trim().toUpperCase()
      const depInRange = isDateWithinRange(flight.departureDate, trip.startDate, trip.endDate)
      const arrInRange = isDateWithinRange(flight.arrivalDate, trip.startDate, trip.endDate)

      if (depInRange) {
        await createSpecialStop(
          {
            title: `${flightNumber || 'Flight'} Departure`,
            notes: `Flight ${flightNumber}`.trim(),
            location: flight.departureAddress,
            stopTime: flight.departureTime || '08:00',
            stopType: 'flight',
            members: flightMembers,
            metadata: {
              flightNumber,
              flightLeg: 'departure',
              flightPairId,
              travelerId,
              participantIds
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
            title: `${flightNumber || 'Flight'} Arrival`,
            notes: `Flight ${flightNumber}`.trim(),
            location: flight.arrivalAddress,
            stopTime: flight.arrivalTime || '12:00',
            stopType: 'flight',
            members: flightMembers,
            metadata: {
              flightNumber,
              flightLeg: 'arrival',
              flightPairId,
              travelerId,
              participantIds
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
        const flight = await getCachedFlightLookup(flightNumber, selectedDate)
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

  const handleRemoveFlightPreview = (flightId) => {
    setFlightLookupPreview((prev) => prev.filter((flight) => flight.id !== flightId))
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

  const openStopInEditor = (stop) => {
    if (!stop?.id || !stop?.date) return
    setShowFlightsModal(false)
    setShowLodgingModal(false)
    setSelectedDate(stop.date)
    setSelectedStopId(stop.id)
    setPendingStopEditId(stop.id)
  }

  const openStopForAction = (stop, type) => {
    if (!stop?.id || !stop?.date || !type) return
    setShowFlightsModal(false)
    setShowLodgingModal(false)
    setSelectedDate(stop.date)
    setSelectedStopId(stop.id)
    if (type === 'tickets') {
      setTicketsModalInitialTab('tickets')
      setShowStopTicketsModal(true)
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
          members: lodgingMembers,
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
          members: lodgingMembers,
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

  const openPaymentsModal = () => {
    setPaymentsMoneyTab('overview')
    setShowPaymentsModal(true)
  }

  const handleSaveStop = async () => {
    if (!selectedDate || !selectedStopId || !selectedStop) return
    setSavingStop(true)
    try {
      const patch = {
        title: stopForm.title.trim(),
        location: stopForm.location.trim(),
        stopTime: stopForm.stopTime,
        notes: stopForm.notes.trim(),
        members: sanitizeMembersForTrip(stopForm.members)
      }

      const locationChanged = patch.location !== (selectedStop.location || '')
      if (locationChanged && patch.location) {
        const coords = await getCachedGeocode(patch.location)
        if (coords) {
          patch.latitude = coords.lat
          patch.longitude = coords.lon
          patch.location = (await getCachedReverseGeocode(coords.lat, coords.lon)) || patch.location
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

  const handleDeleteStop = async () => {
    if (!tripId || !selectedDate || !selectedStopId || !selectedStop) return
    const payments = selectedStop.payments || []
    const count = payments.length
    const message =
      count > 0
        ? `This stop has ${count} payment${count === 1 ? '' : 's'}. Deleting the stop will permanently remove ${
            count === 1 ? 'that payment' : 'those payments'
          } as well.\n\nDelete this stop anyway?`
        : 'Delete this stop? This cannot be undone.'
    if (!window.confirm(message)) return
    try {
      await deleteStopFromTrip(tripId, selectedDate, selectedStopId)
      setSelectedStopId(null)
      setPaymentDetailModal(null)
      setIsEditingStop(false)
    } catch (error) {
      console.error('Failed to delete stop:', error)
      window.alert(error?.message || 'Could not delete stop.')
    }
  }

  const handleDeletePayment = async (payment) => {
    if (!tripId || !selectedDate || !selectedStopId || !payment?.id) return
    try {
      await deletePaymentFromStop(tripId, selectedDate, selectedStopId, payment.id)
      setPaymentDetailModal(null)
    } catch (error) {
      console.error('Failed to delete payment:', error)
      window.alert(error?.message || 'Could not delete payment.')
    }
  }

  const handleOpenPaymentFromLog = (payment) => {
    if (!payment?.id) return
    if (payment.dayDate) setSelectedDate(payment.dayDate)
    if (payment.stopId) setSelectedStopId(payment.stopId)
    setShowPaymentsModal(false)
    setPaymentDetailModal(payment)
  }

  return (
    <div className="trip-page">
      {staleReadCache && (
        <div className="trip-read-cache-hint" role="status">
          Showing the last copy saved on this device. Reconnect to refresh. Edits are not saved while offline.
        </div>
      )}
      <TripToolbar
        tripId={tripId}
        selectedDate={selectedDate}
        newStopHour={newStopHour}
        showAddStopModal={showAddStopModal}
        setShowAddStopModal={setShowAddStopModal}
        participants={trip?.participants || []}
        participantNames={trip?.participantNames || {}}
        dayTitleDraft={dayTitleDraft}
        onDayTitleDraftChange={setDayTitleDraft}
        onSaveDayTitleBlur={handleSaveDayTitle}
        onDayTitleKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        savingDayTitle={savingDayTitle}
        setShowSettingsModal={setShowSettingsModal}
        canManageSharing={canManageSharing}
        showShareMenu={showShareMenu}
        setShowShareMenu={setShowShareMenu}
        tripInviteCode={trip?.inviteCode}
        shareCopied={shareCopied}
        onCopyShareCode={handleCopyShareCode}
        onCopyShareLink={handleCopyShareLink}
        showTimePanel={showTimePanel}
        setShowTimePanel={setShowTimePanel}
        savesDisabled={savesDisabled}
        settingsPopover={
          showSettingsModal ? (
            <TripSettingsPopover
              tripName={trip?.name}
              tripNotesDraft={tripNotesDraft}
              onTripNotesDraftChange={setTripNotesDraft}
              onSaveTripSettings={handleSaveTripSettings}
              onClose={() => setShowSettingsModal(false)}
              participants={trip?.participants}
              participantNames={trip?.participantNames || {}}
              currentUserId={user?.uid}
              creatorId={trip?.creatorId}
              canManageSharing={canManageSharing}
              onRemoveParticipant={handleRemoveParticipant}
              onDeleteTrip={canManageSharing ? handleDeleteTrip : undefined}
            />
          ) : null
        }
      />

      <div
        ref={tripContentRef}
        className={`trip-page-content${showTimePanel ? ' trip-page-content--with-timeline' : ''}`}
      >
        <div
          ref={mapColumnRef}
          className="trip-map-column"
          style={mapColumnStyle}
          data-trip-tutorial="trip-map"
        >
          <div className="trip-map-stack">
            <div className="trip-map-pane" ref={tripMapPaneRef}>
              {coordinates && (
                <MapView
                  coordinates={coordinates}
                  shouldResizeMap={showTimePanel || Boolean(selectedStop)}
                  layoutResizeKey={timelineMapBandPx}
                  stops={mapStopsForSelectedDate}
                  focusStop={selectedStop}
                  focusLeftPaddingPx={selectedStop ? mapLeftInsetPx : 0}
                  fitViewKey={selectedDate || ''}
                  stopCalendarDate={selectedDate || ''}
                  participants={trip?.participants || []}
                  onSelectStop={setSelectedStopId}
                />
              )}
            </div>
            {selectedStop && (
              <StopViewSheet
                ref={stopSheetRef}
                participants={trip?.participants || []}
                participantNames={trip?.participantNames || {}}
                stopCalendarDate={selectedDate || ''}
                selectedStop={selectedStop}
                isEditingStop={isEditingStop}
                setIsEditingStop={setIsEditingStop}
                savingStop={savingStop}
                onClose={() => setSelectedStopId(null)}
                onDeleteStop={handleDeleteStop}
                stopForm={stopForm}
                onStopFormChange={handleStopFormChange}
                onSaveStop={handleSaveStop}
                onOpenTickets={() => setShowStopTicketsModal(true)}
                savesDisabled={savesDisabled}
                ticketsModalOpen={showStopTicketsModal}
              />
            )}
            <TripIsland
              stopSheetHeight={stopSheetHeight}
              hasSelectedStop={Boolean(selectedStop)}
              onFlights={() => setShowFlightsModal(true)}
              onLodging={openLodgingModal}
              onMoney={openPaymentsModal}
              savesDisabled={savesDisabled}
            />
          </div>
        </div>
        {showTimePanel && showTimelineSplitHandle && (
          <button
            {...resizeHandleProps}
            className={`trip-timeline-split-handle${timelineSplitDragging ? ' trip-timeline-split-handle--dragging' : ''}`}
            aria-label="Drag to resize map and timeline height"
            aria-orientation="horizontal"
            aria-valuemin={132}
            aria-valuemax={560}
            aria-valuenow={timelineMapBandPx ?? undefined}
            aria-grabbed={timelineSplitDragging}
          />
        )}
        {showTimePanel && (
          <div className="trip-right-column" data-trip-tutorial="trip-timeline">
            <div className="time-panel">
              <div className="time-panel-date-nav">
                <button
                  type="button"
                  className="time-panel-date-nav__btn"
                  onClick={() => handleShiftDate(-1)}
                  disabled={!hasPreviousDate}
                  aria-label="Previous day"
                >
                  <BsChevronLeft size={18} aria-hidden />
                </button>
                <span className="time-panel-date-nav__label">{formatDateHeading(selectedDate)}</span>
                <button
                  type="button"
                  className="time-panel-date-nav__btn"
                  onClick={() => handleShiftDate(1)}
                  disabled={!hasNextDate}
                  aria-label="Next day"
                >
                  <BsChevronRight size={18} aria-hidden />
                </button>
              </div>
              <div className="time-panel-scroll">
                <ItineraryView
                  stops={stopsForSelectedDate}
                  selectedStopId={selectedStopId}
                  onSelectStop={setSelectedStopId}
                  onMoveStop={handleStopHourChange}
                  onTimestampClick={handleTimestampClick}
                  getStopColor={getStopColor}
                  savesDisabled={savesDisabled}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showFlightsModal && (
        <FlightsModal
          onClose={() => setShowFlightsModal(false)}
          participants={trip?.participants || []}
          participantNames={trip?.participantNames || {}}
          members={flightMembers}
          onMembersChange={setFlightMembers}
          flightNumbersInput={flightNumbersInput}
          onFlightNumbersInputChange={setFlightNumbersInput}
          flightLookupLoading={flightLookupLoading}
          flightLookupError={flightLookupError}
          onLookup={handleFlightLookup}
          flightLookupPreview={flightLookupPreview}
          onFlightPreviewChange={handleFlightPreviewChange}
          onRemoveFlightPreview={handleRemoveFlightPreview}
          addedFlights={addedFlights}
          onEditFlightStop={openStopInEditor}
          onOpenFlightTickets={(stop) => openStopForAction(stop, 'tickets')}
          onDeleteFlight={handleDeleteFlight}
          onCreateStops={handleAddFlightStops}
          createDisabled={
            flightLookupPreview.length === 0 || !flightLookupPreview.some((f) => f.selected)
          }
        />
      )}

      {showLodgingModal && (
        <LodgingModal
          onClose={() => setShowLodgingModal(false)}
          participants={trip?.participants || []}
          participantNames={trip?.participantNames || {}}
          members={lodgingMembers}
          onMembersChange={setLodgingMembers}
          lodgingForm={lodgingForm}
          onLodgingFormChange={setLodgingForm}
          addedLodgings={addedLodgings}
          onEditLodgingStop={openStopInEditor}
          onOpenLodgingTickets={(stop) => openStopForAction(stop, 'tickets')}
          onDeleteLodging={handleDeleteLodging}
          onAddLodging={handleAddLodgingStops}
          addDisabled={!trip?.itinerary?.length || !lodgingForm.address.trim()}
        />
      )}

      {showPaymentsModal && (
        <MoneyModal
          onClose={() => setShowPaymentsModal(false)}
          paymentsMoneyTab={paymentsMoneyTab}
          onTabChange={setPaymentsMoneyTab}
          paymentTotals={paymentTotals}
          paymentOverviewVsYou={paymentOverviewVsYou}
          allPayments={allPayments}
          onSelectLogPayment={handleOpenPaymentFromLog}
          userId={user?.uid}
          participantCount={(trip?.participants || []).length}
        />
      )}

      {showStopTicketsModal && selectedStop && selectedDate && (
        <StopTicketsModal
          tripId={tripId}
          date={selectedDate}
          stop={selectedStop}
          stopTitle={selectedStop.title}
          onSelectPaymentDetail={setPaymentDetailModal}
          initialTab={ticketsModalInitialTab}
          savesDisabled={savesDisabled}
          onClose={() => {
            setShowStopTicketsModal(false)
            setTicketsModalInitialTab('tickets')
          }}
        />
      )}

      <PaymentDetailModal
        payment={paymentDetailModal}
        onClose={() => setPaymentDetailModal(null)}
        onDelete={handleDeletePayment}
      />

      <TripOnboardingCarousel
        open={showTripOnboarding}
        onDismiss={dismissTripOnboarding}
        showTimePanel={showTimePanel}
      />
    </div>
  )
}
