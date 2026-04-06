/**
 * Generates an array of dates between start and end date (inclusive)
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} endDate - End date string (YYYY-MM-DD)
 * @returns {Array<string>} - Array of date strings in YYYY-MM-DD format
 */
export const getDatesBetween = (startDate, endDate) => {
  const dates = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
    dates.push(dateString)
  }

  return dates
}
