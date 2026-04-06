export default function PaymentDetailModal({ payment, onClose, onDelete }) {
  if (!payment) return null

  const handleDeleteClick = () => {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return
    onDelete?.(payment)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stop-payment-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header stop-payment-modal-header">
          <h2>Payment</h2>
          <div className="modal-header-inline-actions">
            <button
              type="button"
              className="stop-payment-modal-delete"
              onClick={handleDeleteClick}
              aria-label="Delete payment"
            >
              Delete
            </button>
            <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>
        <div className="modal-form stop-payment-detail">
          <dl className="stop-payment-detail-dl">
            <dt>Paid by</dt>
            <dd>{payment.payerName}</dd>
            <dt>Amount</dt>
            <dd>${Number(payment.amount || 0).toFixed(2)}</dd>
            <dt>Reason</dt>
            <dd>{payment.reason?.trim() ? payment.reason : '—'}</dd>
            {payment.createdAt ? (
              <>
                <dt>Recorded</dt>
                <dd>{new Date(payment.createdAt).toLocaleString()}</dd>
              </>
            ) : null}
          </dl>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
