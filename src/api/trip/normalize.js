import { v4 as uuidv4 } from 'uuid'

export const generateInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

export const normalizeParticipants = (tripData) => {
  const participants = tripData.participants || tripData.travelers || []
  return Array.from(new Set(participants))
}

const parseHour = (value) => {
  if (Number.isFinite(value)) return Math.max(0, Math.min(23, value))
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(23, parsed))
  return 9
}

const normalizeTime = (value, fallbackHour = 9) => {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return value
  }
  const hour = parseHour(value ?? fallbackHour)
  return `${String(hour).padStart(2, '0')}:00`
}

const getHourFromTime = (timeValue, fallback = 9) => {
  if (typeof timeValue !== 'string') return fallback
  const match = timeValue.match(/^(\d{2}):(\d{2})$/)
  if (!match) return fallback
  const hour = Number(match[1])
  if (!Number.isFinite(hour)) return fallback
  return Math.max(0, Math.min(23, hour))
}

const getMinuteFromTime = (timeValue) => {
  if (typeof timeValue !== 'string') return 0
  const match = timeValue.match(/^(\d{2}):(\d{2})$/)
  if (!match) return 0
  const minute = Number(match[2])
  return Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0
}

const parseCoordinate = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeMembers = (value) => {
  if (value == null) return null // null/undefined => treat as "all trip members"
  if (!Array.isArray(value)) return null
  const cleaned = value.map((v) => String(v || '').trim()).filter(Boolean)
  return cleaned.length ? Array.from(new Set(cleaned)) : null
}

export const normalizeStop = (stop, index = 0, date = 'day') => ({
  id: stop.id || `${date}-${index}-${stop.title || stop.stopName || 'stop'}`,
  title: stop.title || stop.stopName || `Stop ${index + 1}`,
  notes: stop.notes || stop.description || '',
  location: stop.location || stop.address || '',
  stopTime: normalizeTime(stop.stopTime, stop.timestampHour),
  timestampHour: getHourFromTime(normalizeTime(stop.stopTime, stop.timestampHour)),
  timestampMinute: getMinuteFromTime(normalizeTime(stop.stopTime, stop.timestampHour)),
  latitude: parseCoordinate(stop.latitude),
  longitude: parseCoordinate(stop.longitude),
  createdBy: stop.createdBy || null,
  members: normalizeMembers(stop.members),
  stopType: stop.stopType || 'regular',
  metadata: stop.metadata || {},
  payments: (stop.payments || []).map((payment) => ({
    id: payment.id || uuidv4(),
    payerId: payment.payerId || '',
    payerName: payment.payerName || 'Unknown',
    reason: payment.reason || '',
    amount: Number(payment.amount || 0),
    createdAt: payment.createdAt || null
  }))
})

export const normalizeDay = (day) => ({
  ...day,
  stops: (day.stops || []).map((stop, index) => normalizeStop(stop, index, day.date))
})
