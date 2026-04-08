import { BsClock, BsGear, BsPlus, BsShare } from 'react-icons/bs'
import AddStopModal from '../../../components/AddStopModal'
import { formatDateHeading } from '../../../utils/tripDates'

export default function TripToolbar({
  tripId,
  selectedDate,
  newStopHour,
  showAddStopModal,
  setShowAddStopModal,
  dayTitleDraft,
  onDayTitleDraftChange,
  onSaveDayTitleBlur,
  onDayTitleKeyDown,
  savingDayTitle,
  setShowSettingsModal,
  canManageSharing,
  showShareMenu,
  setShowShareMenu,
  tripInviteCode,
  shareCopied,
  onCopyShareCode,
  onCopyShareLink,
  setShowTimePanel,
  settingsPopover
}) {
  return (
    <div className="trip-toolbar">
      <div className="trip-toolbar-left">
        <button
          type="button"
          className="trip-tool-button trip-tool-button--terra"
          onClick={() => setShowAddStopModal(!showAddStopModal)}
          aria-label="Add stop"
        >
          <BsPlus />
        </button>
      </div>
      {showAddStopModal && (
        <AddStopModal
          onClose={() => setShowAddStopModal(false)}
          tripId={tripId}
          tripDate={selectedDate}
          initialHour={newStopHour}
        />
      )}

      <div className="trip-toolbar-center">
        <div className="trip-toolbar-date-line">{formatDateHeading(selectedDate)}</div>
        <input
          type="text"
          className="trip-toolbar-day-title"
          value={dayTitleDraft}
          onChange={(event) => onDayTitleDraftChange(event.target.value)}
          onBlur={onSaveDayTitleBlur}
          onKeyDown={onDayTitleKeyDown}
          placeholder="Title of the day"
          aria-label="Title of the day"
          disabled={savingDayTitle}
        />
      </div>

      <div className="trip-toolbar-right">
        <div className="settings-menu-anchor">
          <button
            type="button"
            className="trip-tool-button"
            onClick={() => setShowSettingsModal((prev) => !prev)}
            aria-label="Trip settings"
          >
            <BsGear />
          </button>
          {settingsPopover}
        </div>
        {canManageSharing && (
          <div className="share-menu-anchor">
            <button
              type="button"
              className="trip-tool-button"
              onClick={() => setShowShareMenu((prev) => !prev)}
              aria-label="Share trip"
            >
              <BsShare />
            </button>
            {showShareMenu && (
              <div className="share-dropdown">
                <button type="button" onClick={onCopyShareCode}>
                  Trip Code: {tripInviteCode}
                </button>
                <button type="button" onClick={onCopyShareLink}>
                  Copy Invite Link
                </button>
                {shareCopied && <span>{shareCopied}</span>}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="trip-tool-button"
          onClick={() => setShowTimePanel((prev) => !prev)}
          aria-label="Open time panel"
        >
          <BsClock />
        </button>
      </div>
    </div>
  )
}
