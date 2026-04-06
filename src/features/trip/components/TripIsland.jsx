import { BsAirplane, BsCash, BsHouseDoor } from 'react-icons/bs'

export default function TripIsland({ stopSheetHeight, hasSelectedStop, onFlights, onLodging, onMoney }) {
  return (
    <div
      className="trip-island"
      style={
        hasSelectedStop
          ? {
              bottom: `calc(var(--space-md) + ${stopSheetHeight}px + var(--space-sm) + env(safe-area-inset-bottom, 0px))`,
            }
          : undefined
      }
    >
      <button type="button" className="trip-tool-button" onClick={onFlights}>
        <BsAirplane />
      </button>
      <button type="button" className="trip-tool-button" onClick={onLodging}>
        <BsHouseDoor />
      </button>
      <button type="button" className="trip-tool-button" onClick={onMoney}>
        <BsCash />
      </button>
    </div>
  )
}
