export default function LodgingModal({
  onClose,
  lodgingForm,
  onLodgingFormChange,
  addedLodgings,
  onDeleteLodging,
  onAddLodging,
  addDisabled
}) {
  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose}>
      <div className="modal-content lodging-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Lodging</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form flights-modal-form">
          <p className="setup-subtitle">
            Add one stay at a time. We create check-in and check-out stops from the address and dates you set. The Add
            lodging button saves them and clears the form so you can enter another stay without closing the modal.
          </p>
          <div className="flight-preview-card lodging-form-card">
            <input
              value={lodgingForm.name}
              onChange={(event) => onLodgingFormChange((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Hotel / Airbnb name"
            />
            <input
              value={lodgingForm.address}
              onChange={(event) => onLodgingFormChange((prev) => ({ ...prev, address: event.target.value }))}
              placeholder="Address"
            />
            <label>Check-in</label>
            <div className="flight-preview-time-row">
              <input
                type="date"
                value={lodgingForm.checkInDate || ''}
                onChange={(event) =>
                  onLodgingFormChange((prev) => ({ ...prev, checkInDate: event.target.value }))
                }
              />
              <input
                type="time"
                value={lodgingForm.checkInTime || '15:00'}
                onChange={(event) =>
                  onLodgingFormChange((prev) => ({ ...prev, checkInTime: event.target.value }))
                }
              />
            </div>
            <label>Check-out</label>
            <div className="flight-preview-time-row">
              <input
                type="date"
                value={lodgingForm.checkOutDate || ''}
                onChange={(event) =>
                  onLodgingFormChange((prev) => ({ ...prev, checkOutDate: event.target.value }))
                }
              />
              <input
                type="time"
                value={lodgingForm.checkOutTime || '11:00'}
                onChange={(event) =>
                  onLodgingFormChange((prev) => ({ ...prev, checkOutTime: event.target.value }))
                }
              />
            </div>
          </div>
          <h4>Currently Added Lodgings (Trip-wide)</h4>
          {addedLodgings.length === 0 && <p className="setup-subtitle">No lodging stops yet.</p>}
          {addedLodgings.map((entry) => (
            <div key={entry.key} className="participant-row">
              <span>
                {entry.label}
                {entry.location ? ` — ${entry.location}` : ''}
              </span>
              <button type="button" onClick={() => onDeleteLodging(entry)}>
                Delete
              </button>
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Close
            </button>
            <button type="button" onClick={onAddLodging} disabled={addDisabled}>
              Add lodging
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
