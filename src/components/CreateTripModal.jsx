import { useState } from 'react'
import { BsX } from 'react-icons/bs'
import { useAuth } from '../context/AuthContext'
import { createTripForUser } from '../api/trip'
import '../App.css'

export default function CreateTripModal({ onClose }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.destination || !formData.startDate || !formData.endDate) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      // Create trip
      const tripId = await createTripForUser(user.uid, formData)

      // Close modal on success
      if (onClose) {
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Failed to create trip')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Trip</h2>
          <button className="modal-close-button" onClick={handleClose}>
            <BsX size={24} />
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Trip Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Summer Vacation 2024"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="destination">Destination *</label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g., Paris, France"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add any notes about your trip..."
              rows={4}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
