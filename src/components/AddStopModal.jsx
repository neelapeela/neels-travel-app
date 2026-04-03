import { useEffect, useState } from 'react'
import { BsX } from 'react-icons/bs'
import { useAuth } from '../context/AuthContext'
import { geocodeLocation, reverseGeocodeLocation, addStopToTrip } from '../api/trip'
import '../App.css'

export default function AddStopModal({ onClose, tripId, tripDate, initialHour = 9 }) {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    location: '',
    stopTime: `${String(initialHour).padStart(2, '0')}:00`
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      stopTime: `${String(initialHour).padStart(2, '0')}:00`
    }))
  }, [initialHour])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.title || !formData.location) {
        setError('Stop title and location are required')
        setLoading(false)
        return
      }

      const coords = await geocodeLocation(formData.location)
      if (!coords) {
        setError('Could not find that location. Try a more specific place name.')
        setLoading(false)
        return
      }

      const canonicalAddress =
        (await reverseGeocodeLocation(coords.lat, coords.lon)) || formData.location.trim()

      await addStopToTrip(tripId, tripDate, {
        title: formData.title,
        notes: formData.notes,
        stopTime: formData.stopTime,
        latitude: coords.lat,
        longitude: coords.lon,
        location: canonicalAddress,
        createdBy: user?.uid || null
      })

      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error('Error adding stop:', error)
      setError(error.message || 'Failed to add stop')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Stop</h2>
          <button className="modal-close-button" onClick={handleClose}>
            <BsX size={24} />
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title">Stop Name *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Louvre Museum"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Louvre Museum, Paris"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stopTime">Time *</label>
            <input
              type="time"
              id="stopTime"
              name="stopTime"
              value={formData.stopTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <input
              type="text"
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Short details for your group"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Adding...' : 'Add Stop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
