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
import { useMobileStopModal } from '../../../hooks/useStopSheetHeight'
import { openDrivingDirectionsFromCurrentLocation } from '../../../utils/mapsDirectionsUrl'
import { readCoord, stopHasValidMapCoords } from '../../../utils/mapboxRoute'
import StopDirectionsPickerModal from './modals/StopDirectionsPickerModal'

const StopViewSheet = forwardRef(function StopViewSheet(
  {
    selectedStop,
    isEditingStop,
    setIsEditingStop,
    savingStop,
    onClose,
    onDeleteStop,
    stopForm,
    onStopFormChange,
    onSaveStop,
    onOpenAddPayment,
    onSelectPaymentDetail,
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
                <strong>{formatStopTime(selectedStop.stopTime, selectedStop.timestampHour)}</strong>
              </div>
              <div className="stop-view-row">
                <span>Notes</span>
                <strong>{selectedStop.notes || 'No notes yet'}</strong>
              </div>
              <div className="stop-view-payments">
                <span className="stop-view-payments-label">Payments</span>
                <button
                  type="button"
                  className="stop-view-add-payment-btn"
                  onClick={onOpenAddPayment}
                  disabled={savesDisabled}
                  title={savesDisabled ? 'Connect to add payments' : undefined}
                >
                  Add payment
                </button>
                {(selectedStop.payments || []).length > 0 ? (
                  <ul className="stop-payment-pills" aria-label="Payments for this stop">
                    {(selectedStop.payments || []).map((payment) => (
                      <li key={payment.id}>
                        <button
                          type="button"
                          className="stop-payment-pill"
                          onClick={() => onSelectPaymentDetail(payment)}
                          disabled={savesDisabled}
                          title={savesDisabled ? 'Payment details when online' : undefined}
                        >
                          {payment.payerName} – ${Number(payment.amount || 0).toFixed(2)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="stop-payment-empty">No payments yet</p>
                )}
              </div>
            </>
          ) : (
            <div className="stop-view-form">
              <label htmlFor="stop-title-edit">Stop Name</label>
              <input id="stop-title-edit" name="title" value={stopForm.title} onChange={onStopFormChange} />
              <label htmlFor="stop-location-edit">Address</label>
              <input id="stop-location-edit" name="location" value={stopForm.location} onChange={onStopFormChange} />
              <label htmlFor="stop-time-edit">Time</label>
              <input type="time" id="stop-time-edit" name="stopTime" value={stopForm.stopTime} onChange={onStopFormChange} />
              <label htmlFor="stop-notes-edit">Notes</label>
              <textarea id="stop-notes-edit" name="notes" rows={4} value={stopForm.notes} onChange={onStopFormChange} />
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
