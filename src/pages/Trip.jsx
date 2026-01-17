import { useParams } from 'react-router-dom'
import '../App.css'

export default function Trip() {
  const { tripId } = useParams()

  return (
    <div className="trip-page">
      <h1>Welcome to your trip of trip id: {tripId}</h1>
    </div>
  )
}
