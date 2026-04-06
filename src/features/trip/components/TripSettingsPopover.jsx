export default function TripSettingsPopover({
  tripNotesDraft,
  onTripNotesDraftChange,
  onSaveTripSettings,
  onClose,
  participants,
  participantNames,
  currentUserId,
  creatorId,
  canManageSharing,
  onRemoveParticipant,
  onDeleteTrip
}) {
  const labelFor = (participantId) => {
    const fromTrip = (participantNames?.[participantId] || '').trim()
    if (fromTrip) return fromTrip
    return 'Member'
  }

  return (
    <div className="inline-popover">
      <div className="inline-popover-header">
        <h3>Trip Settings</h3>
        <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <label htmlFor="trip-notes-input">Trip Notes</label>
      <textarea
        id="trip-notes-input"
        rows={4}
        value={tripNotesDraft}
        onChange={(event) => onTripNotesDraftChange(event.target.value)}
      />
      <button type="button" onClick={onSaveTripSettings}>
        Save Settings
      </button>
      <h4>Participants</h4>
      {(participants || []).map((participantId) => {
        const name = labelFor(participantId)
        const youSuffix = participantId === currentUserId ? ' (You)' : ''
        return (
          <div key={participantId} className="participant-row">
            <span>
              {name}
              {youSuffix}
            </span>
            {canManageSharing && participantId !== creatorId && (
              <button type="button" onClick={() => onRemoveParticipant(participantId)}>
                Remove
              </button>
            )}
          </div>
        )
      })}
      {onDeleteTrip ? (
        <div className="inline-popover-danger">
          <h4>Danger zone</h4>
          <p className="inline-popover-danger-hint">
            Delete this trip for all participants. This cannot be undone.
          </p>
          <button type="button" className="inline-popover-delete-trip" onClick={onDeleteTrip}>
            Delete trip
          </button>
        </div>
      ) : null}
    </div>
  )
}
