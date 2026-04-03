# Travel Itinerary App - Project Overview

## What this app does

This app lets groups collaboratively build trip itineraries. A signed-in user can:
- create a trip with destination and date range
- join a trip by invite code or invite link
- view each day of a trip on a map and timeline
- add and edit stops (time + notes) with updates synced in real time

## Core user flow

1. User lands on `/login` and signs in with Google.
2. User is redirected to `/dashboard`.
3. Dashboard shows all trips linked to the user.
4. User can:
   - create a trip from the create modal
   - join an existing trip by invite code
   - open an invite link (`/dashboard?tripId=<id>`) which auto-joins
5. Clicking a trip opens `/trip/:tripId`.
6. Trip view shows:
   - top toolbar (add stop on left, centered date + editable day title, share + time controls on right)
   - settings popover from toolbar for trip notes and participant management (creator can remove)
   - map with stop markers
   - numbered marker circles (chronological order)
   - route line connecting stops in chronological order
   - **Right column** (toggle with clock): full-height panel with date navigation (fixed) and a **scrollable** timeline (`Day Timeline` + hourly rows). Choosing a stop opens a **bottom sheet** that slides up in that same column and shares vertical space with the timeline (timeline flex-shrinks above it). **Map** stays in the **left column** at full height; selecting a stop **`flyTo`s** that point at zoom 17 with the marker at the **viewport center** (no post-`panInside` nudge, which had skewed centering)
   - drag-and-drop stop reordering by hour, and stop detail bottom sheet with edit mode
   - payment entries per stop (payer, reason, amount)
   - bottom-left action island for flights, lodging, and money summary
   - flights modal supports batch lookup, editable preview, selection of final flights, and managing/deleting added flights
  - lodging modal: one stay at a time (name, address, check-in/out date and time); **Add lodging** creates stops and clears the form so another stay can be entered; trip-wide list and delete behave like flights; map uses a home-shaped marker for lodging stops
   - first-run get-started modal to initialize trip notes/title
7. Trip creator can copy invite code/link and share with others.

## Data model (Firestore)

### `users/{uid}`
- `displayName`
- `email`
- `phoneNumber`
- `photoURL`
- `createdAt`
- `trips`: `string[]` of trip IDs

### `trips/{tripId}`
- `id`
- `name`
- `creatorId`
- `participants`: `string[]` user IDs
- `destination`
- `startDate` (`YYYY-MM-DD`)
- `endDate` (`YYYY-MM-DD`)
- `description`
- `inviteCode` (short uppercase code)
- `itinerary`: day array
- `createdAt`
- `updatedAt`

### `trip_invites/{inviteCode}`
- `code`
- `tripId`
- `createdBy`
- `createdAt`

### itinerary day shape
- `date` (`YYYY-MM-DD`)
- `stops`: stop array

### stop shape
- `id`
- `title`
- `notes`
- `location` (canonical reverse-geocoded address)
- `stopTime` (`HH:mm`) when set
- `timestampHour` (`0-23`)
- `latitude`
- `longitude`
- `createdBy`
- `stopType`: `'regular'` | `'flight'` | `'lodging'`
- `metadata`: e.g. `{ flightNumber }` for flights; `{ lodgingId, lodgingLabel }` for lodging (pairs check-in/check-out for one stay)

## Real-time behavior

- Dashboard trip list: `subscribeToUserTrips()` listens to the user document and reloads listed trips.
- Trip details: `subscribeToTripById()` listens to the trip document and updates map + timeline immediately for all participants.
- Stop edits and stop time changes are written via `updateStopInTrip()` and broadcast through Firestore snapshots.

## Routing

- `Layout` wraps the router `Outlet` in `main.app-main` > `div.app-main-outlet` so the outlet is a flex child with `flex: 1 1 0%` and `min-height: 0`. That keeps the flex height chain unbroken for Trip/Dashboard (otherwise `trip-page-content` can compute to 0 height).

- `/login`: welcome and sign in
- `/dashboard`: protected user trip hub
- `/trip/:tripId`: protected trip workspace
- `/`: redirects to `/login`

## Key frontend modules

- `src/api/trip.js`
  - date generation
  - trip create/join methods
  - user/trip realtime subscriptions
  - stop create/update helpers
  - invite-code mapping via `trip_invites`
  - flight lookup helper (API-key based, airport-local departure/arrival date+time)
  - `deleteFlightStopsAcrossTrip` / `deleteLodgingStopsAcrossTrip` to remove special stops trip-wide (by flight number or `metadata.lodgingId`, with legacy lodging fallback by location + base title)
- `src/pages/Dashboard.jsx`
  - create modal trigger
  - join-by-code form
  - join-by-link handling from query param
  - realtime trip list
- `src/pages/Trip.jsx`
  - realtime trip subscription
  - day selection
  - stop editing callbacks
  - invite sharing controls for creator
- `src/components/Trip/MapView.jsx`
  - Leaflet map
  - numbered stop markers and route polyline
  - marker popup with stop name, address, and time
  - when a stop is selected, the map `flyTo`s that stop at zoom 17 with the pin centered in the map pane (`invalidateSize` before `flyTo` after layout)
- `src/components/Trip/ItineraryView.jsx`
  - hourly timeline list
  - stacked stops for same hour
  - compact stop detail editor
  - rendered inside the slide-in time panel, which scrolls as one column (`overflow-y: auto`) with a sticky date nav

## Architectural trade-offs

- Trip document stores full itinerary as an embedded array.
  - Pro: simple reads and easy single-document real-time sync.
  - Con: contention risk for very large itineraries or heavy concurrent edits.
- Hour-based scheduling (`timestampHour`) instead of minute precision.
  - Pro: easier timeline UX and grouping.
  - Con: less precise than full timestamp.
- Route geometry uses public OSRM API.
  - Pro: no backend required for route polylines.
  - Con: depends on third-party uptime/rate limits.

## Next improvements

- Replace hour-only time with exact timestamps.
- Add optimistic UI conflict handling for simultaneous stop edits.
- Add trip role model (creator/admin/editor/viewer).
- Move high-write stop data to subcollection if trip docs become too large.

## Security rules shape for private trips

To keep trips private, use participant-gated reads on `trips` and a separate invite mapping:
- `users/{uid}`: user can read/write only own document
- `trips/{tripId}`: read/update only if `participants` contains `request.auth.uid`
- `trip_invites/{code}`: signed-in users can read by exact code; create allowed for creator on trip creation

This avoids making all trips readable just to support join-by-code.

Join flow implementation note:
- client reads `trip_invites/{code}` to get `tripId`
- client writes `arrayUnion(auth.uid)` to `trips/{tripId}.participants`
- client writes `arrayUnion(tripId)` to `users/{uid}.trips`
- no pre-read of the trip is required during join
