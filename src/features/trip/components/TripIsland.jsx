import { BsAirplane, BsCash, BsHouseDoor } from 'react-icons/bs'

export default function TripIsland({
  stopSheetHeight,
  hasSelectedStop,
  onFlights,
  onLodging,
  onMoney,
  savesDisabled = false
}) {
  return (
    <div
      className="trip-island"
      data-trip-tutorial="trip-island"
      style={
        hasSelectedStop
          ? {
              bottom: `calc(var(--space-md) + ${stopSheetHeight}px + var(--space-sm) + env(safe-area-inset-bottom, 0px))`,
            }
          : undefined
      }
    >
      <button
        type="button"
        className="trip-tool-button"
        onClick={onFlights}
        disabled={savesDisabled}
        title={savesDisabled ? 'Connect to use flights' : undefined}
        aria-label="Flights"
      >
        <BsAirplane />
      </button>
      <button
        type="button"
        className="trip-tool-button"
        onClick={onLodging}
        disabled={savesDisabled}
        title={savesDisabled ? 'Connect to use lodging' : undefined}
        aria-label="Lodging"
      >
        <BsHouseDoor />
      </button>
      <button
        type="button"
        className="trip-tool-button"
        onClick={onMoney}
        disabled={savesDisabled}
        title={savesDisabled ? 'Connect to use money' : undefined}
        aria-label="Money"
      >
        <BsCash />
      </button>
    </div>
  )
}
