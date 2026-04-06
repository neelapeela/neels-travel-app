import { forwardRef } from 'react'
import { formatStopTime } from '../../../utils/stopTime'

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
  return (
    <div
      ref={ref}
      className="stop-view-sheet stop-view-sheet--map-overlay"
      role="dialog"
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
  )
})

export default StopViewSheet
