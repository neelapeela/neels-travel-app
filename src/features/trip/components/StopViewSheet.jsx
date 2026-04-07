import { forwardRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatStopTime } from '../../../utils/stopTime'
import { useMobileStopModal } from '../../../hooks/useStopSheetHeight'

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
    onSelectPaymentDetail
  },
  ref
) {
  const isMobileModal = useMobileStopModal()

  useEffect(() => {
    if (!isMobileModal || !selectedStop) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileModal, selectedStop, onClose])

  useEffect(() => {
    if (!isMobileModal || !selectedStop) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobileModal, selectedStop])

  const shell = (
    <div className="stop-view-sheet-shell">
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
            <button type="button" onClick={() => setIsEditingStop(true)}>
              Edit
            </button>
          )}
          {isEditingStop && (
            <>
              <button type="button" onClick={() => setIsEditingStop(false)} disabled={savingStop}>
                Cancel
              </button>
              <button type="button" onClick={onSaveStop} disabled={savingStop}>
                {savingStop ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
        <div className="stop-view-actions-end">
          {!isEditingStop && (
            <button type="button" className="stop-view-delete" onClick={onDeleteStop}>
              Delete
            </button>
          )}
          <button type="button" className="stop-view-close" onClick={onClose}>
            Close
          </button>
        </div>
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
          <div className="stop-view-payments">
            <span className="stop-view-payments-label">Payments</span>
            <button type="button" className="stop-view-add-payment-btn" onClick={onOpenAddPayment}>
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
    </div>
  )

  /* Portal avoids overflow:hidden on .trip-map-column / .trip-map-stack clipping fixed overlays. */
  if (isMobileModal) {
    return createPortal(shell, document.body)
  }
  return shell
})

export default StopViewSheet
