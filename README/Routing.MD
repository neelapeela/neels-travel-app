# How Routing Works in This Project — A Beginner's Tutorial

This guide walks you through how **routing** (changing what the user sees when they go to different URLs) is set up in the Travel App. No prior React Router experience is assumed.

---

## 1. What is routing?

In a normal website, each URL (e.g. `/dashboard`, `/trip/abc123`) usually loads a different HTML page from the server. In a **single-page application (SPA)** like this one, we only load one HTML file once. **Routing** is the logic that decides which **React component** to show for each URL, so it *feels* like moving between pages even though we're still on the same page.

- `/` or `/dashboard` → show the dashboard
- `/login` → show the login screen
- `/trip/xyz` → show the trip with id `xyz`

We use **React Router** to implement this.

---

## 2. React Router building blocks

Here are the main pieces we use:

| Concept | What it does |
|--------|----------------|
| **BrowserRouter** | Wraps the app and lets React Router use the browser’s URL (pathname) to decide what to render. |
| **Routes** | A container where we define all our **Route** rules. |
| **Route** | Maps a **path** (e.g. `"/login"`) to a **component** (e.g. `<Login />`). |
| **Navigate** | A component that **redirects** the user to another path (e.g. send them to `/dashboard`). |
| **Outlet** | Used in a **parent** route: it’s the “slot” where the **child** route’s component is rendered. |
| **useNavigate** | A hook that gives you a function to change the URL from code (e.g. after clicking “Sign in” or a trip). |
| **useParams** | A hook that gives you **dynamic** parts of the URL (e.g. the `tripId` in `/trip/:tripId`). |

You’ll see each of these in the sections below.

---

## 3. Where routing is configured: `App.jsx`

All top-level routes are defined in **`src/App.jsx`**. The structure looks like this:

```
BrowserRouter
  └── AuthProvider
        └── Routes
              └── Route path="/" element={<Layout />}
                    ├── index          → redirect to /login
                    ├── login          → <Login />
                    ├── dashboard      → <ProtectedRoute><Dashboard /></ProtectedRoute>
                    ├── *              → redirect to /login (catch-all)
                    └── trip/:tripId   → <ProtectedRoute><Trip /></ProtectedRoute>
```

- **BrowserRouter** enables URL-based routing for the whole app.
- **AuthProvider** wraps the app for auth; it doesn’t define routes.
- The **single** `<Route path="/" element={<Layout />}>` means: “For any path that starts with `/`, use `Layout` as the **parent**.” All other routes are **nested** inside it.
- **Layout** uses an **Outlet** (see below) to render the **child** that matches the current URL.

So:

- `/` → Layout is used; the **index** route runs → **Navigate** sends the user to `/login`.
- `/login` → Layout + **Login** in the Outlet.
- `/dashboard` → Layout + **ProtectedRoute** wrapping **Dashboard** in the Outlet.
- `/trip/123` → Layout + **ProtectedRoute** wrapping **Trip** in the Outlet.
- Anything else (e.g. `/unknown`) → Layout + the `*` route → **Navigate** sends the user to `/login`.

**Important:** Route order matters. More specific paths (e.g. `trip/:tripId`) should be defined **before** a catch-all like `*`, or the catch-all will match first and the specific route will never run.

---

## 4. Layout and nested routes: `Layout.jsx`

**`src/components/Layout.jsx`** is the shared “shell” of the app: header, title, profile menu. The **page content** (Login, Dashboard, or Trip) is not defined in Layout; it’s whatever the router chooses as the **child** route. That child is rendered in the **Outlet**, wrapped in an **ErrorBoundary** so a render error in one route doesn’t blank the whole shell:

```jsx
<main className="app-main">
  <div className="app-main-outlet">
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  </div>
</main>
```

So:

- On `/login` → `<Outlet />` renders `<Login />`.
- On `/dashboard` → `<Outlet />` renders `<ProtectedRoute><Dashboard /></ProtectedRoute>`, which eventually shows `<Dashboard />` if the user is logged in.
- On `/trip/:tripId` → `<Outlet />` renders `<ProtectedRoute><Trip /></ProtectedRoute>`, which shows `<Trip />` when the user is logged in.

Layout also uses **useNavigate** to send the user to `/login` after they sign out:

```jsx
const navigate = useNavigate()
// ...
navigate('/login')
```

---

## 5. Protected routes: `ProtectedRoute.jsx`

Some pages (Dashboard, Trip) should only be visible to **logged-in** users. That’s what **`src/routes/ProtectedRoute.jsx`** does:

```jsx
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  return user ? children : <Navigate to="/login" replace />
}
```

- It uses **useAuth()** to get the current `user` and `loading` state.
- While `loading` is true, it shows “Loading...” instead of the page.
- If there is a **user**, it renders **children** (e.g. `<Dashboard />` or `<Trip />`).
- If there is **no user**, it renders **`<Navigate to="/login" replace />`**, which redirects the user to the login page.

So “protected route” = “only show this page if the user is logged in; otherwise send them to `/login`.”

---

## 6. How each page uses routing

### Login page (`Login.jsx`)

- If the user is **already** logged in (`user` is set), the page immediately redirects to the dashboard:

  ```jsx
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  ```

- After a successful Google sign-in, the user becomes “logged in.” They don’t need to call `navigate` here; the next time they hit a protected route (or refresh on `/dashboard`), **ProtectedRoute** will allow the render, or they might already be on `/dashboard` and the auth context will just show the dashboard.

### Dashboard page (`Dashboard.jsx`)

- **useNavigate** is used to go to a specific trip when the user clicks a trip card:

  ```jsx
  const navigate = useNavigate()
  // ...
  <div className="trip-item" onClick={() => navigate(`/trip/${trip.id}`)}>
  ```

- So clicking a trip with `id === "abc123"` changes the URL to `/trip/abc123` and the router then renders the **Trip** page for that id.

### Trip page (`Trip.jsx`)

- The URL has a **dynamic** segment: `/trip/:tripId`. The **Trip** component needs to know which trip id that is. It uses **useParams**:

  ```jsx
  const { tripId } = useParams()
  ```

- Then it uses `tripId` to load the right trip (e.g. `getTripById(tripId)`) and show the correct map and itinerary. So the **route** defines the URL shape (`/trip/:tripId`), and **useParams** gives the actual value (e.g. `"abc123"`) inside the component.

---

## 7. Quick reference: URL → what happens

| URL | What the user sees |
|-----|--------------------|
| `/` | Redirected to `/login`. |
| `/login` | Login page (or redirect to `/dashboard` if already logged in). |
| `/dashboard` | Dashboard (or redirect to `/login` if not logged in). |
| `/trip/&lt;id&gt;` | Trip page for that id (or redirect to `/login` if not logged in). |
| Anything else | Redirected to `/login`. |

---

## 8. File checklist

If you’re following along in the codebase:

- **`src/App.jsx`** — BrowserRouter, Routes, Route definitions, Layout as parent, index/login/dashboard/trip/catch-all.
- **`src/components/Layout.jsx`** — Outlet for child routes, useNavigate for sign-out.
- **`src/routes/ProtectedRoute.jsx`** — useAuth, loading state, Navigate to `/login` when no user.
- **`src/pages/Login.jsx`** — Navigate to `/dashboard` when user exists.
- **`src/pages/Dashboard.jsx`** — useNavigate to `/trip/:id` on trip click.
- **`src/pages/Trip.jsx`** — useParams to read `tripId` from the URL.

Once you’re comfortable with this flow, you can extend it by adding new routes under the same `path="/"` parent in **App.jsx**, and new links or `navigate(...)` calls where you need them.
