/**
 * Trip API — public surface. Implementation is split by concern under ./trip/.
 * Import from `../api/trip` (this file) so callers stay stable.
 */

export { getDatesBetween } from './dates'
export { geocodeLocation, reverseGeocodeLocation } from './geocoding'

export { getTripById, subscribeToTripById, getTripsForUser, subscribeToUserTrips } from './reads'

export {
  createTripForUser,
  joinTripByCode,
  joinTripById,
  ensureTripInviteMapping,
  deleteTripForCreator
} from './lifecycle'

export {
  addStopToTrip,
  updateStopInTrip,
  updateTripSettings,
  upsertParticipantNameOnTrip,
  removeParticipantFromTrip,
  addPaymentToStop,
  deleteStopFromTrip,
  deletePaymentFromStop,
  addSpecialStopToTrip,
  deleteFlightStopsByFlightNumber,
  deleteFlightStopsAcrossTrip,
  deleteLodgingStopsAcrossTrip,
  completeTripSetup,
  updateDayTitleInTrip
} from './itinerary'
