/** Display and sort helpers for stop times (shared by trip UI and map). */

export const formatStopTime = (timeValue, fallbackHour = 9) => {
  const normalized =
    typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)
      ? timeValue
      : `${String(fallbackHour).padStart(2, '0')}:00`
  const [hh, mm] = normalized.split(':').map(Number)
  const suffix = hh >= 12 ? 'PM' : 'AM'
  const hour12 = hh % 12 === 0 ? 12 : hh % 12
  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`
}

export const getSortMinutes = (stop) => {
  const value = stop?.stopTime
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    const [hh, mm] = value.split(':').map(Number)
    return hh * 60 + mm
  }
  return Number(stop?.timestampHour || 0) * 60 + Number(stop?.timestampMinute || 0)
}

export const normalizeTimeInput = (value) => {
  if (!value || typeof value !== 'string') return '09:00'
  const parts = value.split(':')
  const hh = String(Number(parts[0] || 0)).padStart(2, '0')
  const mm = String(parts[1] != null ? parts[1].slice(0, 2) : '00').padStart(2, '0')
  return `${hh}:${mm}`
}
