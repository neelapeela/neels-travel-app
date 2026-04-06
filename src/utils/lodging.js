export const lodgingBaseTitle = (title) =>
  (title || '').replace(/\s*(Check-in|Check-out)\s*$/i, '').trim() || 'Lodging'
