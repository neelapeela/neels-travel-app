import Card from './Card'

export default function TripListCard({ trip, onSelect }) {
  const { name, destination, startDate, endDate } = trip
  return (
    <Card
      as="button"
      type="button"
      padded
      className="ui-card--interactive"
      onClick={onSelect}
    >
      <span className="ui-trip-card__name">{name || 'Untitled trip'}</span>
      <p className="ui-trip-card__meta">{destination || 'No destination set'}</p>
      <p className="ui-trip-card__dates">
        {startDate && endDate ? `${startDate} → ${endDate}` : 'Dates TBD'}
      </p>
    </Card>
  )
}
