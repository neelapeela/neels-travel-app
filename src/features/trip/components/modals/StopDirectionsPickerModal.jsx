import { useEffect } from 'react'

export default function StopDirectionsPickerModal({ onClose, onPickApple, onPickGoogle }) {
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
        className="modal-content stop-directions-modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="stop-directions-picker-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="stop-directions-picker-title">Open directions</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form flights-modal-form">
          <p className="setup-subtitle">
            Choose an app. Directions start from your current location.
          </p>
          <button type="button" onClick={onPickApple}>
            Apple Maps
          </button>
          <button type="button" onClick={onPickGoogle}>
            Google Maps
          </button>
        </div>
      </div>
    </div>
  )
}
