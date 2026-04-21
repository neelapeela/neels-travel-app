import { forwardRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BsArrowLeft,
  BsCheckLg,
  BsGeoAltFill,
  BsPencil,
  BsTicketPerforated,
  BsTrash,
  BsXLg
} from 'react-icons/bs'
import { formatStopTime } from '../../../utils/stopTime'
import { formatFlightTimeZoneAtStop } from '../../../utils/stopTimezone'
import { useMobileStopModal } from '../../../hooks/useStopSheetHeight'
import { openDrivingDirectionsFromCurrentLocation } from '../../../utils/mapsDirectionsUrl'
import { readCoord, stopHasValidMapCoords } from '../../../utils/mapboxRoute'
import { normalizeMembersForParticipants } from '../utils/stopMembers'
import StopDirectionsPickerModal from './modals/StopDirectionsPickerModal'

const StopViewSheet = forwardRef(function StopViewSheet(
  {
    stopCalendarDate = '',
    participants = [],
    participantNames = {},
    selectedStop,
    isEditingStop,
    setIsEditingStop,
    savingStop,
    onClose,
    onDeleteStop,
    stopForm,
    onStopFormChange,
    onSaveStop,
    onOpenTickets,
    savesDisabled = false,
    ticketsModalOpen = false
  },
  ref
) {
  const isMobileModal = useMobileStopModal()
  const [directionsPickerOpen, setDirectionsPickerOpen] = useState(false)
  const childModalOpen = directionsPickerOpen || ticketsModalOpen

  useEffect(() => {
    if (savesDisabled) setIsEditingStop(false)
  }, [savesDisabled, setIsEditingStop])

  useEffect(() => {
    setDirectionsPickerOpen(false)
  }, [selectedStop?.id])

  useEffect(() => {
    if (!isMobileModal || !selectedStop) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (directionsPickerOpen) {
        setDirectionsPickerOpen(false)
        return
      }
      if (ticketsModalOpen) {
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileModal, selectedStop, onClose, directionsPickerOpen, ticketsModalOpen])

  useEffect(() => {
    if (isMobileModal || !directionsPickerOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setDirectionsPickerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileModal, directionsPickerOpen])

  useEffect(() => {
    if (!isMobileModal || !selectedStop) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobileModal, selectedStop])

  const canNavigate = stopHasValidMapCoords(selectedStop)
  const navLat = readCoord(selectedStop?.latitude)
  const navLng = readCoord(selectedStop?.longitude)
  const flightTimeZoneLabel =
    selectedStop?.stopType === 'flight'
      ? formatFlightTimeZoneAtStop(selectedStop, stopCalendarDate, 'full')
      : ''
  const allMemberIds = Array.isArray(participants) ? participants.filter(Boolean) : []
  const visibleMemberIds = normalizeMembersForParticipants(selectedStop?.members, allMemberIds) || allMemberIds
  const selectedMemberIds = Array.isArray(stopForm?.members) ? stopForm.members : allMemberIds
  const allMembersSelected =
    allMemberIds.length > 0 &&
    selectedMemberIds.length === allMemberIds.length &&
    allMemberIds.every((id) => selectedMemberIds.includes(id))

  const writeMembers = (nextIds) => {
    const normalized = Array.from(new Set((nextIds || []).filter(Boolean)))
    const asAll = normalized.length === 0 || normalized.length === allMemberIds.length
    onStopFormChange({
      target: { name: 'members', value: asAll ? null : normalized }
    })
  }

  const toggleMember = (id) => {
    const next = selectedMemberIds.includes(id)
      ? selectedMemberIds.filter((v) => v !== id)
      : [...selectedMemberIds, id]
    writeMembers(next)
  }

  const directionsPortal =
    directionsPickerOpen &&
    createPortal(
      <StopDirectionsPickerModal
        onClose={() => setDirectionsPickerOpen(false)}
        onPickApple={() => {
          openDrivingDirectionsFromCurrentLocation('apple', navLat, navLng)
          setDirectionsPickerOpen(false)
        }}
        onPickGoogle={() => {
          openDrivingDirectionsFromCurrentLocation('google', navLat, navLng)
          setDirectionsPickerOpen(false)
        }}
      />,
      document.body
    )

  const shell = (
    <div
      className={`stop-view-sheet-shell${isMobileModal && childModalOpen ? ' stop-view-sheet-shell--child-modal-open' : ''}`}
    >
      <button
        type="button"
        className="stop-view-sheet__backdrop"
        onClick={onClose}
        tabIndex={-1}
        aria-label="Close stop details"
      />
      <div
        ref={ref}
        className={`stop-view-sheet stop-view-sheet--map-overlay${isMobileModal ? ' stop-view-sheet--mobile-modal' : ''}`}
        role="dialog"
        aria-modal={isMobileModal ? true : undefined}
        aria-label="Stop details"
      >
        <div className="stop-view-actions">
          <div className="stop-view-actions-primary">
            {!isEditingStop && (
              <button
                type="button"
                className="stop-view-icon-btn stop-view-icon-btn--edit"
                onClick={() => setIsEditingStop(true)}
                aria-label="Edit stop"
                title={savesDisabled ? 'Connect to edit this stop' : 'Edit'}
                disabled={savesDisabled}
              >
                <BsPencil size={18} aria-hidden />
              </button>
            )}
            {isEditingStop && (
              <>
                <button
                  type="button"
                  className="stop-view-icon-btn stop-view-icon-btn--cancel-edit"
                  onClick={() => setIsEditingStop(false)}
                  disabled={savingStop}
                  aria-label="Discard edits"
                  title="Discard edits"
                >
                  <BsArrowLeft size={19} aria-hidden />
                </button>
                <button
                  type="button"
                  className="stop-view-icon-btn stop-view-icon-btn--save"
                  onClick={onSaveStop}
                  disabled={savingStop || savesDisabled}
                  aria-label={savingStop ? 'Saving' : 'Save stop'}
                  title={savesDisabled ? 'Connect to save changes' : savingStop ? 'Saving…' : 'Save'}
                  aria-busy={savingStop}
                >
                  <BsCheckLg size={20} aria-hidden />
                </button>
              </>
            )}
          </div>
          <div className="stop-view-actions-end">
            {!isEditingStop && (
              <button
                type="button"
                className="stop-view-icon-btn stop-view-icon-btn--delete"
                onClick={onDeleteStop}
                aria-label="Delete stop"
                title={savesDisabled ? 'Connect to delete this stop' : 'Delete'}
                disabled={savesDisabled}
              >
                <BsTrash size={18} aria-hidden />
              </button>
            )}
            <button
              type="button"
              className="stop-view-icon-btn stop-view-icon-btn--close"
              onClick={onClose}
              aria-label="Close stop details"
              title="Close"
            >
              <BsXLg size={20} aria-hidden />
            </button>
          </div>
        </div>

        <div className="stop-view-sheet__scroll">
          {savesDisabled && (
            <p className="stop-view-offline-hint" role="status">
              You&apos;re offline — this stop is view-only. Changes are not saved until you reconnect.
            </p>
          )}
          {!isEditingStop ? (
            <>
              <h3>{selectedStop.title}</h3>
              <div className="stop-view-row">
                <span>Address</span>
                <strong>{selectedStop.location || 'Not provided'}</strong>
              </div>
              <div className="stop-view-row">
                <span>Time</span>
                <strong>
                  {formatStopTime(selectedStop.stopTime, selectedStop.timestampHour)}
                  {flightTimeZoneLabel ? (
                    <span className="stop-view-timezone"> · {flightTimeZoneLabel}</span>
                  ) : null}
                </strong>
              </div>
              <div className="stop-view-row">
                <span>Notes</span>
                <strong>{selectedStop.notes || 'No notes yet'}</strong>
              </div>
              <div className="stop-view-members">
                <span className="stop-view-members-label">Members</span>
                <ul className="stop-member-pills" aria-label="Members for this stop">
                  {visibleMemberIds.length > 0 ? (
                    visibleMemberIds.map((memberId) => (
                      <li key={memberId}>
                        <span className="stop-member-pill">{participantNames?.[memberId] || 'Member'}</span>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span className="stop-member-pill">All members</span>
                    </li>
                  )}
                </ul>
              </div>
            </>
          ) : (
            <div className="stop-view-form">
              <label htmlFor="stop-title-edit">Stop Name</label>
              <input id="stop-title-edit" name="title" value={stopForm.title} onChange={onStopFormChange} />
              <label htmlFor="stop-location-edit">Address</label>
              <input id="stop-location-edit" name="location" value={stopForm.location} onChange={onStopFormChange} />
              <label htmlFor="stop-time-edit">Time</label>
              <input
                type="time"
                id="stop-time-edit"
                name="stopTime"
                value={stopForm.stopTime}
                onChange={onStopFormChange}
                aria-describedby={selectedStop?.stopType === 'flight' && flightTimeZoneLabel ? 'stop-timezone-hint' : undefined}
              />
              {selectedStop?.stopType === 'flight' && flightTimeZoneLabel ? (
                <p className="stop-view-timezone-hint" id="stop-timezone-hint">
                  Local time zone at this stop&apos;s map pin: {flightTimeZoneLabel}
                </p>
              ) : null}
              <label htmlFor="stop-notes-edit">Notes</label>
              <textarea id="stop-notes-edit" name="notes" rows={4} value={stopForm.notes} onChange={onStopFormChange} />
              <div className="stop-view-edit-members">
                <span className="stop-view-edit-members__label">Members</span>
                <div className="stop-view-edit-members__pills">
                  <button
                    type="button"
                    className={`stop-view-edit-members__pill${allMembersSelected ? ' is-active' : ''}`}
                    onClick={() => writeMembers([])}
                    disabled={savingStop || savesDisabled}
                  >
                    Select all
                  </button>
                  {allMemberIds.map((memberId) => (
                    <button
                      key={memberId}
                      type="button"
                      className={`stop-view-edit-members__pill${
                        selectedMemberIds.includes(memberId) ? ' is-active' : ''
                      }`}
                      onClick={() => toggleMember(memberId)}
                      disabled={savingStop || savesDisabled}
                    >
                      {participantNames?.[memberId] || 'Member'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {!isEditingStop && (
          <div className="stop-view-sheet__fab-bar" aria-label="Stop shortcuts">
            <button
              type="button"
              className="stop-view-fab stop-view-fab--tickets"
              onClick={() => onOpenTickets?.()}
              aria-label="Tickets"
              title="Tickets"
            >
              <BsTicketPerforated size={22} aria-hidden />
            </button>
            <button
              type="button"
              className="stop-view-fab stop-view-fab--nav"
              onClick={() => canNavigate && setDirectionsPickerOpen(true)}
              disabled={!canNavigate}
              aria-label={canNavigate ? 'Open directions to this stop' : 'Add map coordinates to open directions'}
              title={canNavigate ? 'Directions' : 'Save a location with coordinates to use directions'}
            >
              <BsGeoAltFill size={22} aria-hidden />
            </button>
          </div>
        )}
      </div>
      {directionsPortal}
    </div>
  )

  if (isMobileModal) {
    return createPortal(shell, document.body)
  }
  return shell
})

export default StopViewSheet
