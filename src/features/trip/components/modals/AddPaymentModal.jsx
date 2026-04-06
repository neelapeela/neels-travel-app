export default function AddPaymentModal({
  onClose,
  paymentForm,
  onPaymentFormChange,
  addPaymentError,
  onSave
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stop-payment-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Add payment</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="add-payment-amount">Amount</label>
            <input
              id="add-payment-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={paymentForm.amount}
              onChange={(event) => onPaymentFormChange((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label htmlFor="add-payment-reason">Reason</label>
            <input
              id="add-payment-reason"
              type="text"
              value={paymentForm.reason}
              onChange={(event) => onPaymentFormChange((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="e.g. Lunch, tickets"
            />
          </div>
          {addPaymentError ? <p className="stop-payment-modal-error">{addPaymentError}</p> : null}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" onClick={onSave}>
              Save payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
