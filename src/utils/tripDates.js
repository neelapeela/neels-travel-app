export const isDateWithinRange = (value, start, end) => {
  if (!value || !start || !end) return false
  return value >= start && value <= end
}

export const formatDateHeading = (dateValue) => {
  if (!dateValue) return 'No date selected'
  const parsed = new Date(`${dateValue}T00:00:00`)
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}
