export default function SetupModal({
  setupNotes,
  setupFirstDayTitle,
  onNotesChange,
  onFirstDayTitleChange,
  onComplete,
  onClose
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content setup-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Get Started</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form setup-modal-form">
          <p className="setup-subtitle">Set up your trip workspace with two quick details.</p>
          <div className="setup-field-card">
            <label>Overall trip notes</label>
            <small>High-level details everyone should know.</small>
            <textarea
              rows={3}
              value={setupNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Budget notes, group expectations, packing reminders..."
            />
          </div>
          <div className="setup-field-card">
            <label>Day 1 title</label>
            <small>What is the focus/theme for the first day?</small>
            <input
              value={setupFirstDayTitle}
              onChange={(event) => onFirstDayTitleChange(event.target.value)}
              placeholder="Arrival and downtown walk"
            />
          </div>
          <div className="modal-actions setup-actions">
            <button type="button" onClick={onComplete}>
              Initialize Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
