import { useMemo, useState } from 'react'
import { BsTicketPerforated } from 'react-icons/bs'
import MemberMultiSelect from '../MemberMultiSelect'
import { formatStopTime } from '../../../../utils/stopTime'

export default function FlightsModal({
  onClose,
  participants,
  participantNames,
  members,
  onMembersChange,
  flightNumbersInput,
  onFlightNumbersInputChange,
  flightLookupLoading,
  flightLookupError,
  onLookup,
  flightLookupPreview,
  onFlightPreviewChange,
  onRemoveFlightPreview,
  addedFlights,
  onEditFlightStop,
  onOpenFlightTickets,
  onDeleteFlight,
  onCreateStops,
  createDisabled
}) {
  const [activeTab, setActiveTab] = useState('add')
  const sortedFlights = useMemo(
    () =>
      [...(addedFlights || [])].sort((a, b) => {
        const aDate = a?.stops?.[0]?.date || ''
        const bDate = b?.stops?.[0]?.date || ''
        return aDate.localeCompare(bDate)
      }),
    [addedFlights]
  )

  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose}>
      <div className="modal-content flights-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Flights</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="money-modal-tabs" role="tablist" aria-label="Flights view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'add'}
            className={`money-modal-tab${activeTab === 'add' ? ' money-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add flights
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'current'}
            className={`money-modal-tab${activeTab === 'current' ? ' money-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            Current flights
          </button>
        </div>
        <div className="modal-form flights-modal-form">
          {activeTab === 'add' ? (
            <>
              <MemberMultiSelect
                participants={participants}
                participantNames={participantNames}
                value={members}
                onChange={onMembersChange}
                label="Create flights for"
              />
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
                <div className="flights-preview-section">
                  <h4 className="flights-preview-section__title">Lookup results</h4>
                  <p className="flights-preview-section__hint">
                    Each block is one flight — edit details or remove flights you do not want.
                  </p>
                  <div className="flights-preview" role="list">
                    {flightLookupPreview.map((flight, index) => (
                      <div
                        key={flight.id}
                        className="flight-preview-card"
                        role="listitem"
                        aria-label={`Flight ${index + 1}${flight.flightNumber ? `, ${flight.flightNumber}` : ''}`}
                      >
                        <div className="flight-preview-card__head">
                          <span className="flight-preview-index" aria-hidden="true">
                            {index + 1}
                          </span>
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
                            <button
                              type="button"
                              className="flight-preview-delete"
                              onClick={() => onRemoveFlightPreview(flight.id)}
                              aria-label={`Remove ${flight.flightNumber || 'flight'} from lookup results`}
                            >
                              Delete
                            </button>
                          </div>
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
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" onClick={onCreateStops} disabled={createDisabled}>
                  Create Flight Stops
                </button>
              </div>
            </>
          ) : (
            <div className="special-stops-current-tab">
              <p className="setup-subtitle">Review all added flights and jump into stop editing.</p>
              {sortedFlights.length === 0 ? (
                <p className="setup-subtitle">No flights added yet.</p>
              ) : (
                <div className="special-stops-list">
                  {sortedFlights.map((flight, index) => {
                    const sortedStops = [...(flight.stops || [])].sort((a, b) =>
                      `${a.date || ''} ${a.stopTime || ''}`.localeCompare(`${b.date || ''} ${b.stopTime || ''}`)
                    )
                    const firstStop = sortedStops[0]
                    const lastStop = sortedStops[sortedStops.length - 1]
                    return (
                      <section key={flight.code} className="special-stop-card">
                        <div className="special-stop-card__head">
                          <div>
                            <p className="special-stop-card__eyebrow">Flight {index + 1}</p>
                            <h4 className="special-stop-card__title">{flight.code}</h4>
                            <p className="special-stop-card__meta">
                              {firstStop?.date || 'Unknown date'} to {lastStop?.date || 'Unknown date'} ·{' '}
                              {sortedStops.length} stop{sortedStops.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="special-stop-card__entry-actions">
                            <button
                              type="button"
                              className="stop-view-fab stop-view-fab--tickets special-stop-card__ticket-shortcut"
                              onClick={() => firstStop && onOpenFlightTickets?.(firstStop)}
                              disabled={!firstStop}
                              aria-label="Open tickets for this flight"
                              title="Tickets"
                            >
                              <BsTicketPerforated size={18} aria-hidden />
                            </button>
                            <button type="button" className="flight-added-row__delete" onClick={() => onDeleteFlight(flight)}>
                              Delete
                            </button>
                          </div>
                        </div>
                        <ul className="special-stop-card__stops">
                          {sortedStops.map((stop) => (
                            <li key={stop.id} className="special-stop-card__stop-row">
                              <div>
                                <strong>{stop.metadata?.flightLeg === 'arrival' ? 'Arrival' : 'Departure'}</strong>
                                <p>
                                  {stop.date || 'Unknown date'} · {formatStopTime(stop.stopTime, stop.timestampHour)} ·{' '}
                                  {stop.location || 'No location'}
                                </p>
                              </div>
                              <button type="button" className="special-stop-card__edit-btn" onClick={() => onEditFlightStop(stop)}>
                                Edit
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  })}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
