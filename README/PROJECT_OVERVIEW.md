# Neel's Travel Book — Project Overview

## What this app does

**Neel's Travel Book** is a collaborative trip planner with a warm, retro-inspired UI built from a **six-color mood board** (terra cotta, sand, olive, ochre, clay, sea)—**sea (teal) dark chrome** and **olive** as the secondary accent on dark surfaces, plus a **sand/clay** login and dashboard “room”; **DM Sans** for UI, **Figtree** for hero type, **Pixelify Sans** for pixel-era accents; login pairs copy with a **pixel-art map** (`src/illustrations/landing-hero-map.png`). A signed-in user can:
- create a trip with destination and date range
- join a trip by invite code or invite link
- view each day of a trip on a map and timeline
- add and edit stops (time + notes) with updates synced in real time

## Core user flow

1. User lands on `/login` and signs in with Google (**popup** by default; **full-page redirect** if the browser blocks popups or does not support the popup flow—see `getRedirectResult` in `AuthContext` and `signInWithRedirect` fallback in `Login`). Storage-partitioned environments (some in-app browsers, strict privacy) can trigger Firebase’s “missing initial state” error; the app treats benign redirect recovery errors quietly and shows a clearer message when sign-in still fails.
2. User is redirected to `/dashboard`.
3. Dashboard shows all trips linked to the user.
4. User can:
   - create a trip from the create modal
   - join an existing trip by invite code
   - open an invite link (`/dashboard?tripId=<id>`) which auto-joins after sign-in: unauthenticated visitors are sent to `/login` with **router state** preserving the full URL (`pathname` + `search`), and after Google sign-in **Login** sends them back to that URL (not a bare `/dashboard`), so `tripId` is not lost on production or local.
5. Clicking a trip opens `/trip/:tripId`.
6. Trip view shows:
   - top toolbar (add stop on left, centered date + editable day title, share + time controls on right)
   - settings popover from toolbar for trip notes and participant management (anchored under the **gear** button like share); creator can remove others; **creator** can **Delete trip** (removes `trips/{id}` + matching `trip_invites/{code}` + `arrayRemove`s that trip id from **every** participant’s `users.trips` in one transaction)
   - map with stop markers
   - numbered marker circles (chronological order)
   - route line connecting stops in chronological order
   - **Right column** (toggle with clock): full-height panel with date navigation (fixed) and a **scrollable** timeline (`Day Timeline` + hourly rows). Choosing a stop opens **stop details**: on **desktop**, a **floating card** (narrower than the map width) appears near the lower-left of the map with a soft “pop in”; on **≤768px width**, the same content appears as a **centered modal** (dimmed backdrop, tap outside or Escape to dismiss, body scroll locked). The mobile shell is rendered with **`createPortal(..., document.body)`** so **`overflow: hidden`** on `.trip-map-column` / `.trip-map-stack` does not clip the overlay; desktop-only shell styles use **`@media (min-width: 769px)`** so they never override the mobile `position: fixed` + backdrop rules. **`useStopSheetHeight`** measures sheet height for the **island** and **horizontal overlap** (`mapLeftInsetPx`) for desktop marker centering; on the mobile modal breakpoint it returns **0** for map overlap. Selected-stop fly-to shifts focus **rightward** to keep markers clear of the floating card. `MapView` also fits bounds to all valid stops by default so new/loaded days open with all stops visible.
   - **≤768px width** with the timeline open: map and timeline **stack vertically** (`trip-page-content--with-timeline`); the map uses a **bounded height** (`clamp` / `vh`) so the timeline keeps usable space, unless the user has set a **custom band height** via the **split handle** (terra grip between map and timeline; persisted in **`localStorage`** as `tripMapBandHeightPx`, see **`useTripTimelineResize`**). While dragging, the **actual in-flow grip stays in place** at the map/timeline boundary; map height is still computed from **`clientY − mapTop − halfHandle`** each move for smooth tracking. The split handle uses a **12px** hit band with a smaller visual pill centered inside (compact strip). **Map-only** (clock closed) the map column gets a **flexible min-height** so the band doesn’t feel cramped. Page **padding and gaps** tighten; **toolbar** uses smaller vertical padding. Each hour row’s **stop pills** sit in a **horizontally scrollable** strip (`overflow-x: auto`, `flex-wrap: nowrap`) when there are many stops.
   - drag-and-drop stop reordering by hour, and stop detail UI (bottom sheet or mobile modal) with edit mode
   - payments per stop: **Add payment** opens a modal (amount > 0, reason); saved payments appear as pills `Payer – $amount`; a pill opens a detail modal (payer, amount, reason, optional recorded time)
   - **Action island** (flights, lodging, **Money**) lives **inside** `.trip-map-stack` with **`position: absolute`** so it stays **within the map frame** on narrow viewports (not fixed to the whole window). **Money** has tabs **Overview** (signed-in user: their balance vs equal share of total spend, plus per–other-traveler settlement with **you** from a greedy equal-split settle-up plan) and **Logs** (all payments in a table with day, user, reason, amount, stop); when the stop sheet is open, the island’s `bottom` is increased by the measured sheet height (plus safe-area inset on notched devices) so it sits above the sheet (CSS transition on `bottom`)
   - flights modal supports batch lookup, editable preview, selection of final flights, and managing/deleting added flights
  - lodging modal: one stay at a time (name, address, check-in/out date and time); **Add lodging** creates stops and clears the form so another stay can be entered; trip-wide list and delete behave like flights; map uses a home-shaped marker for lodging stops
  - island-driven modals (Money / Flights / Lodging) share refreshed “trip” chrome aligned with the mood board palette (sand/clay/terra/sea), reduced green dominance, and explicit **dark-on-light text tokens** (`--color-ink-on-sand`, `--color-ink-on-sand-muted`) to prevent light-on-light contrast issues
   - first-run get-started modal to initialize trip notes/title; can be closed with **×** or backdrop without saving (stays dismissed until you leave and re-open the same trip route)
   - fullscreen-style modals use a **×** in the header and click-outside on the dimmed backdrop to close; **Trip settings** (gear) uses the same **×** in its popover header
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
- `participantNames`: optional `{ [uid]: string }` — display labels synced on create/join and when a user opens the trip (so Money and settings show names without reading other users’ `users/{uid}` docs, which rules often forbid)
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
- `payments`: optional array of `{ id, payerId, payerName, reason, amount, createdAt? }` — new payments get `createdAt` (ISO); `addPaymentToStop` rejects non‑finite or `<= 0` amounts

## Real-time behavior

- Dashboard trip list: `subscribeToUserTrips()` listens to the user document and reloads listed trips.
- Trip details: `subscribeToTripById()` listens to the trip document and updates map + timeline immediately for all participants.
- Stop edits and stop time changes are written via `updateStopInTrip()` and broadcast through Firestore snapshots.

## Routing

- `Layout` wraps the router `Outlet` in `main.app-main` > `div.app-main-outlet` so the outlet is a flex child with `flex: 1 1 0%` and `min-height: 0`. That keeps the flex height chain unbroken for Trip/Dashboard (otherwise `trip-page-content` can compute to 0 height). The outlet is wrapped in **`ErrorBoundary`** (`src/components/ErrorBoundary.jsx`) so a render error in a route shows a recovery UI instead of breaking the whole tree.
- Header brand text (**Neel's Travel Book**) is an interactive control that routes to `/dashboard` for quick navigation.

## Tooling and dependencies

- **`npm test`** / **`npm run test:watch`** — Vitest runs `tests/**/*.test.js` (mirrors `src/` areas, e.g. `tests/utils/` for `paymentSettlement`, `stopTime`). Config lives in `vite.config.js` under `test`.
- **`npm run lint`** — ESLint; `react/prop-types` is off (project uses plain JS without PropTypes).
- **Runtime dependencies** are limited to Firebase, React, router, Leaflet, icons, and `uuid` (via trip normalize). Chakra UI, Emotion, Framer Motion, and **`firebase-admin`** were removed from the client app (`firebase-admin` belongs in a Node backend only). After pulling, run **`npm install`** so `package-lock.json` matches `package.json`.

- `/login`: welcome and sign in
- `/dashboard`: protected user trip hub
- `/trip/:tripId`: protected trip workspace
- `/`: redirects to `/login`

## Key frontend modules

### Layout and shared code

- `src/styles/tokens.css` — **mood-board palette** (`--palette-*`), dashboard **`--color-dashboard-join-*`** (including **`--color-dashboard-join-input-border`** for join inputs only), **dark chrome** (`--color-bg-page` / `--color-surface*`), **olive** / **teal** accents, and **`--trip-*`**. **Trip**: **sand room** page; **toolbar** and **island** shells use **`--app-chrome-bg`** / **`--app-chrome-border`** (same **`--color-surface`** / **`--color-border`** as **Layout** `app-header`). **Sand** icon chips (**`--trip-toolbar-btn-*`**, mood-board **sand** + **sea** ink) on toolbar and island; **Add stop** alone uses **`.trip-tool-button--terra`**. **Timeline** uses **`--trip-timeline-*`** (**dashboard join** stationery). **DM Sans**, **Figtree**, **Pixelify Sans**; `.pixel-art` for sprites. Imported from `src/index.css`.
- `src/styles/ui.css` — login + dashboard: sand room, **terra** “Start” bento, **sand/clay** join panel (`.dashboard-join-card` stack), **sea-elevated** trip tiles with **olive** hover border, light dashed empty state; **sea ink** on sand CTAs (`--color-primary-action-text`). **Layout** header uses **`--app-chrome-bg`** / **`--app-chrome-border`** (defined in `tokens.css`).
- `src/illustrations/landing-hero-map.png` — pixel-art map scroll on `/login` (imported in `Login.jsx`; `.pixel-art` for crisp scaling).
- `src/components/ui/` — small presentational building blocks: `Button` (`primary` | `secondary` | `tertiary` | `google`), `Card`, `Input`, `PageShell`, `TripListCard`. **`Login`** and **`Dashboard`** are built with these; the trip route additionally loads `features/trip/trip.css`.
- `src/utils/` — pure helpers used across the UI (no React): stop time display/sort (`stopTime.js`), trip date headings and range checks (`tripDates.js`), lodging title normalization (`lodging.js`), money formatting (`formatMoney.js`), equal-split settlement math (`paymentSettlement.js`), Mapbox Directions route fetch + straight-line fallback (`mapboxRoute.js`).
- `src/hooks/` — trip-focused hooks: `useTripDocument` (Firestore subscription + first-day selection), `useDestinationCoordinates` (geocode destination for the map; starts from **`MAP_FALLBACK_CENTER`** and falls back there when geocoding returns no result/errors so `MapView` never disappears to the plain canvas), `useStopSheetHeight` (ref to **`.trip-map-pane`** + sheet ref: returns **`stopSheetHeight`** for the island and **`mapLeftInsetPx`** = horizontal overlap between floating stop card and map pane for marker centering on **wide** viewports; **`useMobileStopModal`** (same `max-width: 768px` as trip CSS) short-circuits overlap to **0** when the stop UI is a viewport modal), with **`animationend`** / `ResizeObserver` remeasure and width fallback when overlap reads **0** during animation), **`useTripTimelineResize`** (when the time panel is open and **`TRIP_TIMELINE_SPLIT_MQ`** matches: refs on **`.trip-page-content`** + **`.trip-map-column`**, pointer drag on **`.trip-timeline-split-handle`**, **`mapBandPx`** + **`localStorage`**, clamps using content height + **`TRIP_MAP_BAND_MIN_PX`** / **`TRIP_TIMELINE_MIN_PX`**), `useTripPaymentAnalytics` (flattened payments + settlement overview), `useTripSpecialStopGroups` (flight/lodging groupings for modals), `useTripDaySelection` (day/stop derived state + day navigation), `useTouchPillDrag` (mobile timeline pill reorder), `useRequestCache` (in-memory `getOrSet` for repeated async work).

### Trip feature (`src/features/trip/`)

- `TripPage.jsx` — route entry for `/trip/:tripId`: wires hooks and API handlers, renders map + timeline, settings, island, and modals. Adds **`trip-page-content--with-timeline`** when the clock panel is open for **mobile stacking** styles in `trip.css`. **Page shell** (`.trip-page`) uses **`--color-bg-sand-room`**. **Toolbar** and **island** match **app header** chrome; **map** column stays **dark trip tile**. **Timeline** matches **join-card** paper. **Map** uses **`--trip-canvas-bg`** behind tiles.
- `trip.css` — trip workspace layout and chrome (toolbar, map column, timeline, stop sheet, island, trip modals, markers). **Toolbar** uses grid **`auto minmax(0, 1fr) auto`** so the date/title column can shrink on narrow widths (older **`1fr auto 1fr`** let min-content widths overflow). Imported by `TripPage.jsx` (and `MapView.jsx` for map/marker rules). Shared modal primitives (`.modal-overlay`, `.form-group`, etc.) remain in `App.css`.
- `constants.js` — trip-only constants (e.g. share-menu “copied” timeout).
- `components/` — `MapView` (Leaflet + Mapbox Directions route), `ItineraryView` (hourly timeline + drag/drop), plus `TripToolbar`, `StopViewSheet` (forwarded ref for height measurement), `TripIsland`, `TripSettingsPopover`, `modals/` (`MoneyModal`, `AddPaymentModal`, `PaymentDetailModal`, `TripOnboardingCarousel` (tutorial carousel each time a trip workspace loads), `FlightsModal`, `LodgingModal`).

### Pages and API

- `src/api/user.js` — `syncUserWithFirestore` on sign-in (merge profile fields); `getParticipantDisplayNamesByIds` reads `users/{uid}` when allowed — secondary to `trips.participantNames` for Money labels.
- `src/api/trip/` (import as `../api/trip` — resolves to `trip/index.js`)
  - `dates.js` — `getDatesBetween` for itinerary day rows
  - `geocoding.js` — Nominatim forward/reverse geocode
  - `flightLookup.js` — Aviationstack flight lookup and parsing (env: `VITE_AVIATIONSTACK_API_KEY`)
  - `normalize.js` — Firestore trip/stop shape normalization (participants, stops, payments, invite code helper)
  - `reads.js` — `getTripById`, `subscribeToTripById`, `getTripsForUser`, `subscribeToUserTrips`
  - `lifecycle.js` — create trip, join by code/id, ensure `trip_invites` mapping, `deleteTripForCreator` (transaction: `arrayRemove` trip id on each participant’s `users` doc, then delete invite + trip)
  - `itinerary.js` — stops, day title, settings, payments (`addPaymentToStop`, `deletePaymentFromStop`), `deleteStopFromTrip` (removes embedded payments with the stop), special stops, flight/lodging deletes, `completeTripSetup` (legacy / migrations)
  - `index.js` — re-exports the public API (callers do not need to know the split)
- `src/pages/Dashboard.jsx`
  - two-column layout (sidebar: new trip + join code; main: trip grid cards)
  - create modal trigger, join-by-code, join-by-link query param, realtime trip list
- `src/pages/Trip.jsx`
  - thin re-export of `src/features/trip/TripPage.jsx` so routing stays stable (`/trip/:tripId` still imports `./pages/Trip`).
- `src/features/trip/components/MapView.jsx`
  - Leaflet map — **Carto Voyager** raster tiles (`MAP_TILE_URL` / `MAP_TILE_ATTRIBUTION` in `constants.js`; warmer and more legible for trip planning than **Positron** / `light_all`)
  - numbered stop markers and route polyline
  - marker popup with stop name, address, and time
  - defaults to fitting all valid stop coordinates into view (`fitBounds` with padding; single-stop zoom-in behavior). Day/date changes pass an explicit `fitViewKey` so fit-to-stops always reruns even when stop coordinates happen to match, and ongoing map animations are stopped before fitting to avoid janky animation conflicts. No-stop days explicitly reset fit de-duplication state so navigating `stops -> no stops -> same stops` still triggers a fresh fit. When a stop is selected, the map **`flyTo`s a computed geographic center** at zoom 17 so the pin lands in the visible area **to the right of the floating stop card** on desktop; if **`mapLeftInsetPx`** changes while the same stop stays selected (resize), a short fly refines the center.
- `src/features/trip/components/ItineraryView.jsx`
  - hourly timeline list
  - stacked stops for same hour
  - rendered inside the slide-in time panel, which scrolls as one column (`overflow-y: auto`) with a sticky date nav; **narrow layouts** use a **horizontally scrollable** stop strip (`overflow-x: scroll`, **`touch-action: manipulation`** on the vertical `.time-panel-scroll` and on pills — iOS handles nested scroll better than `pan-x`-only; strip uses **`touch-action: auto`** + compositor hint); **HTML5 `draggable`** stays **`(pointer: fine)`** only — native touch DnD is unreliable on iOS

## Architectural trade-offs

- Trip document stores full itinerary as an embedded array.
  - Pro: simple reads and easy single-document real-time sync.
  - Con: contention risk for very large itineraries or heavy concurrent edits.
- Hour-based scheduling (`timestampHour`) instead of minute precision.
  - Pro: easier timeline UX and grouping.
  - Con: less precise than full timestamp.
- Route geometry: **Mapbox Directions** (`https://api.mapbox.com/directions/v5/...`) via **`fetch`** from the browser. Set **`VITE_MAPBOX_ACCESS_TOKEN`** (Mapbox **default public** token). Requests use **`geometries=geojson`**, **`overview=full`** (follows roads closely vs. simplified), and **`radiuses`** so waypoints snap to the road graph. Requests are chunked to **25 waypoints** per call (Mapbox limit). Without a token, the map draws a **straight polyline** between stops. **`MapView`**: stable refetch key (ids + rounded lat/lng); **debounced** route fetch (`ROUTE_FETCH_DEBOUNCE_MS` in `features/trip/constants.js`) so rapid Firestore updates do not stack redundant requests; polyline **`key`** includes **`routePoints.length`** so react-leaflet remounts when route geometry arrives. **Debug:** in **`import.meta.env.DEV`** or with **`VITE_ROUTE_DEBUG=true`**, filter the console by **`[route]`** (`mapboxRoute.js` + **`MapView`**).
  - Pro: reliable road geometry vs. a public demo router; straight fallback when the API fails or the token is missing.
  - Con: Mapbox account, quotas, and [attribution](https://docs.mapbox.com/help/getting-started/attribution/) for Directions; straight segments when offline or on error.

## Mobile viewport (iOS Safari)

The shell (`#root`, `.app`, `html`/`body`) uses **`100dvh`** with a **`100vh` fallback**. On iPhone Safari, **`100vh`** is tied to the **layout** viewport and is often **taller** than the area you actually see when the **bottom browser chrome** is visible, so flex layouts looked “cut off” at the bottom. **`100dvh`** (dynamic viewport height) tracks the **visible** viewport as toolbars show and hide. **`index.html`** sets **`viewport-fit=cover`** so **`env(safe-area-inset-*)`** matches edge-to-edge layouts with the home indicator.

## Next improvements

- Expand Vitest coverage under `tests/` (hooks with mocks, critical API normalize paths).
- Replace hour-only time with exact timestamps.
- Add optimistic UI conflict handling for simultaneous stop edits.
- Add trip role model (creator/admin/editor/viewer).
- Move high-write stop data to subcollection if trip docs become too large.

## Security rules shape for private trips

To keep trips private, use participant-gated reads on `trips` and a separate invite mapping:
- `users/{uid}`: user can read/create/update own document; **update** by **another** user is allowed only when the write changes **nothing except** `trips`, removes **one logical trip id** (after de-duping), and that trip’s **`creatorId`** is the caller — supports creator **delete trip** (strip id from all members) and **remove participant**
- `trips/{tripId}`: read/update only if `participants` contains `request.auth.uid`; **delete** only if `resource.data.creatorId == request.auth.uid` (needed for creator delete-trip)
- `trip_invites/{code}`: signed-in users can read by exact code; create allowed for creator on trip creation; **delete** allowed when the doc’s `tripId` matches a trip whose `creatorId` is the caller (or use Admin SDK in a Cloud Function if you prefer centralizing deletes)

This avoids making all trips readable just to support join-by-code.

Join flow implementation note:
- client reads `trip_invites/{code}` to get `tripId`
- client writes `arrayUnion(auth.uid)` to `trips/{tripId}.participants`
- client writes `arrayUnion(tripId)` to `users/{uid}.trips`
- no pre-read of the trip is required during join

### Deploying rules (fixes “missing or insufficient permission” on delete)

The repo includes **`firestore.rules`** at the project root (and **`firebase.json`** pointing at it). Without **`allow delete`** on `trips` and `trip_invites`, **Delete trip** fails in the client.

1. **Firebase CLI** (from project root, after `firebase login` and `firebase use <your-project-id>`):
   - `firebase deploy --only firestore:rules`
2. **Console**: Firebase → Firestore → Rules → paste the contents of `firestore.rules` → **Publish**.

If your project still uses older/different rules, merge in the **`users`** `allow update` exception, plus **`allow delete`** on `trips` and `trip_invites`, from `firestore.rules`.
