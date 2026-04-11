import { useEffect } from 'react'

export default function StopTicketsModal({ stopTitle, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content stop-tickets-modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="stop-tickets-modal-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="stop-tickets-modal-title">Tickets</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form flights-modal-form">
          {stopTitle ? <h4>{stopTitle}</h4> : null}
          <p className="setup-subtitle">Ticket details will go here.</p>
        </div>
      </div>
    </div>
  )
}
