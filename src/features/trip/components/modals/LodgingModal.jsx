import { useMemo, useState } from 'react'
import { BsTicketPerforated } from 'react-icons/bs'
import MemberMultiSelect from '../MemberMultiSelect'
import { formatStopTime } from '../../../../utils/stopTime'

export default function LodgingModal({
  onClose,
  participants,
  participantNames,
  members,
  onMembersChange,
  lodgingForm,
  onLodgingFormChange,
  addedLodgings,
  onEditLodgingStop,
  onOpenLodgingTickets,
  onDeleteLodging,
  onAddLodging,
  addDisabled
}) {
  const [activeTab, setActiveTab] = useState('add')
  const sortedLodgings = useMemo(
    () =>
      [...(addedLodgings || [])].sort((a, b) => {
        const aDate = a?.stops?.[0]?.date || ''
        const bDate = b?.stops?.[0]?.date || ''
        return aDate.localeCompare(bDate)
      }),
    [addedLodgings]
  )

  return (
    <div className="modal-overlay trip-modal-overlay" onClick={onClose}>
      <div className="modal-content lodging-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Lodging</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="money-modal-tabs" role="tablist" aria-label="Lodging view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'add'}
            className={`money-modal-tab${activeTab === 'add' ? ' money-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add lodging
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'current'}
            className={`money-modal-tab${activeTab === 'current' ? ' money-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            Current lodging
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
                label="Create lodging for"
              />
              <p className="setup-subtitle">
                Add one stay at a time. We create check-in and check-out stops from the address and dates you set.
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
              <div className="modal-actions">
                <button type="button" onClick={onClose}>
                  Close
                </button>
                <button type="button" onClick={onAddLodging} disabled={addDisabled}>
                  Add lodging
                </button>
              </div>
            </>
          ) : (
            <div className="special-stops-current-tab">
              <p className="setup-subtitle">Review all added lodging and edit each check-in/check-out stop.</p>
              {sortedLodgings.length === 0 ? (
                <p className="setup-subtitle">No lodging stops yet.</p>
              ) : (
                <div className="special-stops-list">
                  {sortedLodgings.map((entry, index) => {
                    const sortedStops = [...(entry.stops || [])].sort((a, b) =>
                      `${a.date || ''} ${a.stopTime || ''}`.localeCompare(`${b.date || ''} ${b.stopTime || ''}`)
                    )
                    const firstStop = sortedStops[0]
                    const lastStop = sortedStops[sortedStops.length - 1]
                    return (
                      <section key={entry.key} className="special-stop-card">
                        <div className="special-stop-card__head">
                          <div>
                            <p className="special-stop-card__eyebrow">Lodging {index + 1}</p>
                            <h4 className="special-stop-card__title">{entry.label || 'Lodging'}</h4>
                            <p className="special-stop-card__meta">
                              {entry.location || 'No location'} · {firstStop?.date || 'Unknown date'} to{' '}
                              {lastStop?.date || 'Unknown date'}
                            </p>
                          </div>
                          <div className="special-stop-card__entry-actions">
                            <button
                              type="button"
                              className="stop-view-fab stop-view-fab--tickets special-stop-card__ticket-shortcut"
                              onClick={() => firstStop && onOpenLodgingTickets?.(firstStop)}
                              disabled={!firstStop}
                              aria-label="Open tickets for this lodging"
                              title="Tickets"
                            >
                              <BsTicketPerforated size={18} aria-hidden />
                            </button>
                            <button type="button" className="flight-added-row__delete" onClick={() => onDeleteLodging(entry)}>
                              Delete
                            </button>
                          </div>
                        </div>
                        <ul className="special-stop-card__stops">
                          {sortedStops.map((stop) => (
                            <li key={stop.id} className="special-stop-card__stop-row">
                              <div>
                                <strong>{/check-out/i.test(stop.title || '') ? 'Check-out' : 'Check-in'}</strong>
                                <p>
                                  {stop.date || 'Unknown date'} · {formatStopTime(stop.stopTime, stop.timestampHour)}
                                </p>
                              </div>
                              <button type="button" className="special-stop-card__edit-btn" onClick={() => onEditLodgingStop(stop)}>
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
