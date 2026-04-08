export default function FlightsModal({
  onClose,
  flightNumbersInput,
  onFlightNumbersInputChange,
  flightLookupLoading,
  flightLookupError,
  onLookup,
  flightLookupPreview,
  onFlightPreviewChange,
  addedFlights,
  onDeleteFlight,
  onCreateStops,
  createDisabled
}) {
  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose}>
      <div className="modal-content flights-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Flights</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-form flights-modal-form">
          <p className="setup-subtitle">
            Add one or more flight numbers. We will fetch details and create departure/arrival stops.
          </p>
          <textarea
            rows={3}
            placeholder="UAL1325, UA847, AA120 (comma, space, or new line separated)"
            value={flightNumbersInput}
            onChange={(event) => onFlightNumbersInputChange(event.target.value)}
          />
          <button type="button" onClick={onLookup} disabled={flightLookupLoading}>
            {flightLookupLoading ? 'Looking up...' : 'Lookup Flights'}
          </button>
          {flightLookupError && <p className="join-error">{flightLookupError}</p>}
          {flightLookupPreview.length > 0 && (
            <div className="flights-preview">
              {flightLookupPreview.map((flight) => (
                <div key={flight.id} className="flight-preview-card">
                  <div className="flight-preview-header">
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(flight.selected)}
                        onChange={(event) =>
                          onFlightPreviewChange(flight.id, { selected: event.target.checked })
                        }
                      />
                      Add this flight
                    </label>
                  </div>
                  <input
                    value={flight.flightNumber || ''}
                    onChange={(event) =>
                      onFlightPreviewChange(flight.id, { flightNumber: event.target.value.toUpperCase() })
                    }
                    placeholder="Flight number"
                  />
                  <label>Departure</label>
                  <input
                    value={flight.departureAddress || ''}
                    onChange={(event) =>
                      onFlightPreviewChange(flight.id, { departureAddress: event.target.value })
                    }
                  />
                  <div className="flight-preview-time-row">
                    <input
                      type="date"
                      value={flight.departureDate || ''}
                      onChange={(event) =>
                        onFlightPreviewChange(flight.id, { departureDate: event.target.value })
                      }
                    />
                    <input
                      type="time"
                      value={flight.departureTime || '08:00'}
                      onChange={(event) =>
                        onFlightPreviewChange(flight.id, { departureTime: event.target.value })
                      }
                    />
                  </div>
                  <label>Arrival</label>
                  <input
                    value={flight.arrivalAddress || ''}
                    onChange={(event) =>
                      onFlightPreviewChange(flight.id, { arrivalAddress: event.target.value })
                    }
                  />
                  <div className="flight-preview-time-row">
                    <input
                      type="date"
                      value={flight.arrivalDate || ''}
                      onChange={(event) =>
                        onFlightPreviewChange(flight.id, { arrivalDate: event.target.value })
                      }
                    />
                    <input
                      type="time"
                      value={flight.arrivalTime || '12:00'}
                      onChange={(event) =>
                        onFlightPreviewChange(flight.id, { arrivalTime: event.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <h4>Currently Added Flights (Trip-wide)</h4>
          {addedFlights.length === 0 && <p className="setup-subtitle">No flights added yet.</p>}
          {addedFlights.map((flight) => (
            <div key={flight.code} className="participant-row">
              <span>{flight.code}</span>
              <button type="button" onClick={() => onDeleteFlight(flight.code)}>
                Delete
              </button>
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" onClick={onCreateStops} disabled={createDisabled}>
              Create Flight Stops
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
