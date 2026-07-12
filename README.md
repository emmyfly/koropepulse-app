# KoropePulse

Real-time shuttle visibility for UNILAG's on-campus transit network. Built for WEMA
Hackaholics 7.0 and the UNILAG SEES Hackathon.

**The problem:** UNILAG's shuttle system has no centralized visibility. Students queue
blind with no idea when a shuttle is coming — and for the two off-campus terminals this
isn't just an inconvenience: Bariga and Yaba are not safe places to stand around waiting
for an unknown length of time. Drivers, meanwhile, have no visibility into demand
elsewhere, which causes bunching (multiple shuttles arriving together) and gaps (long
stretches with none).

**The approach:** drivers tap their status as they go ("Arrived" / "On route") from a
phone; that write hits Firebase Realtime Database and appears on the commuter view
instantly, no polling. Students pick the stop they're at (CITS, Bariga, or Yaba) and see
exactly which buses have arrived (board now) versus which are still on the way (stay
put) — that arrived/inbound split is the actual safety mechanism, not just a status
label. A FastAPI backend adds a wait-time estimate on top when nothing has checked in
yet, trained on a documented synthetic baseline with a real path to retraining on field
data.

**v1 scope, deliberately narrow:** the official UNILAG shuttle buses only, covering the
2 routes described below. Campus cabs/electric buses and city-wide public transit are
explicitly phase 2 and phase 3 — not attempted here.

## What's real vs proof-of-concept

This is stated plainly because it matters for how you evaluate the project:

- **Real and working:** the driver check-in flow, Firebase live sync, the commuter
  view's real-time updates, phone+PIN driver verification against the backend, GPS
  verification of arrival taps, the PWA install/offline shell, and the FastAPI service
  itself (routing, validation, error handling, tests).
- **Proof-of-concept, clearly labeled as such in the API response:** the ETA prediction
  model. It's a real, trained regression model with a documented methodology (see
  [Predictive model](#predictive-model-methodology) below) — but it's trained on
  synthetic data shaped to resemble BRT terminal observations, not on data collected
  from UNILAG's actual shuttles. Every `/predict/eta` response includes a `confidence`
  field (`"synthetic"` or `"real_data_informed"`) so the frontend — and anyone
  evaluating this — always knows which kind of estimate they're looking at.
- **The path from one to the other is code, not a promise:** `backend/data/retrain.py`
  retrains the exact same pipeline against real field data the moment it exists, using
  the schema in `backend/data/real_field_data_template.csv`. Nothing about the model
  architecture needs to change when real data arrives.

## The transit topology

UNILAG's shuttle network (for v1 purposes) has 3 stops and 2 routes, both anchored at
the one on-campus terminal:

```
        CITS (on-campus)
        /            \
  cits-bariga      cits-yaba
      /                  \
  Bariga (off-campus)   Yaba (off-campus)
```

After signing in, a driver picks which route they're driving **for that day** — the
driver account itself isn't tied to one route, the choice is made fresh at sign-in and
then held for the session. Each route is bidirectional — a driver's day is a repeating
cycle of *Arrived → On route → Arrived* as they shuttle back and forth between the two
endpoints.

## Architecture

```
frontend/   React PWA (Vite + TypeScript). Commuter view + Driver check-in.
backend/    FastAPI service. /predict/eta, /drivers/verify, /health.
firebase/   Realtime Database security rules (database.rules.json).
```

### Real-time layer (Firebase Realtime Database)

```
/shuttles/{routeId}/{driverId} = { routeId, driverId, currentStop, state, updatedAt, gps? }
/drivers/{driverId}            = { name, phone, pinHash }   (reserved, see below)
/checkinLogs/{routeId}/{ts}    = { state, driverId, currentStop, gps?, loggedAt }
```

`currentStop` means "the stop I'm at" when `state: "arrived"`, or "the stop I just left"
when `state: "on_route"` — the destination is always derivable since each route only has
two endpoints (`config/routes.ts`'s `otherStop()` helper). The path is keyed by
`{routeId}/{driverId}` rather than just `{routeId}` because multiple buses run the same
route at once — the original single-shuttle-per-route schema didn't reflect that.

Driver check-ins write to `/shuttles/{routeId}/{driverId}` and
`/checkinLogs/{routeId}/{ts}`; the commuter view subscribes to `/shuttles` with
Firebase's `onValue` listener and flattens it client-side, so updates are pushed live
with no polling.

`/drivers/{driverId}` is reserved schema matching the original design, but in this build
driver records are **not** stored in Firebase — they live in the backend
(`backend/data/drivers.json`) so verification doesn't need Firebase Admin credentials
deployed alongside the API. The Firebase rules lock that path to `read: false, write:
false` since nothing in the client touches it. See [Security rules](#firebase-security-rules)
for the reasoning and the honest tradeoff this implies.

### GPS arrival verification

An "Arrived" tap also grabs the browser's geolocation (`navigator.geolocation`) and
checks the straight-line (Haversine) distance to the stop's known coordinates
(`config/routes.ts`). Within ~300m, the check-in is marked `gps.verified: true`.

This is **soft-fail by design**: a denied permission, unavailable GPS, or out-of-range
reading never blocks the tap — a low-end phone with flaky GPS in traffic can't be
allowed to stop a driver from checking in. It's logged as `gps.verified: false` instead,
visible to commuters as an "unverified location" tag on that shuttle. That verified/
unverified split is itself useful signal for the ML model later, in the same spirit as
the `confidence` flag on ETA predictions.

**Not built (documented next step, not attempted here):** continuous background tracking
while a driver is "on route" that auto-fires arrival instead of requiring a tap. That
needs battery-conscious polling and boundary-crossing debounce logic that didn't fit the
build window — the tap-triggered version above ships the same GPS-backed data honestly,
just without the automation.

### Frontend component structure

```
src/
  components/
    CommuterView/   CommuterView (stop picker), ShuttleList, ETADisplay
    DriverView/      DriverView, CheckIn (starting-stop picker + Arrived/On-route toggle)
    Layout/          ConnectionBanner (shown when Firebase is unreachable)
  hooks/useShuttles.ts        live subscription + connection state
  services/shuttleService.ts  Firebase reads/writes, GPS capture on arrival
  api/backend.ts              FastAPI client (verifyDriver, predictEta)
  firebase.ts                 Firebase app/auth/db initialization
  config/routes.ts            the 3 stops + 2 routes, coordinates, topology helpers
  utils/eta.ts                 pure ETA-label/status logic (unit tested)
  utils/geo.ts                 Haversine distance + arrival verification (unit tested)
  utils/shuttleFilters.ts      arrived-at-stop / inbound-to-stop selectors (unit tested)
```

## Setup — Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your Firebase config, see below
npm run dev
```

Requires a Firebase project with Realtime Database enabled. From the Firebase console:
**Project settings → General → Your apps → SDK setup and config**, copy the values into
`.env.local`.

```bash
npm run test    # Vitest + React Testing Library
npm run build   # static bundle in dist/, deployable to GitHub Pages/Vercel/Netlify as-is
```

## Setup — Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python data/train_model.py     # trains the baseline model, prints MAE/RMSE
cp .env.example .env           # optional: restrict CORS origins
uvicorn main:app --reload
```

```bash
pytest   # 11 tests covering /predict/eta and /drivers/verify
```

The API is available at `http://localhost:8000`, interactive docs at
`http://localhost:8000/docs`.

### Demo driver accounts

Seeded in `backend/data/drivers.json` for testing the check-in flow. Route isn't part of
the account — each of these picks a route fresh at sign-in (see below).

| Phone         | PIN  | Name          |
|---------------|------|---------------|
| 08031234567   | 1234 | Tunde Balogun |
| 08059876543   | 4321 | Aisha Bello   |
| 08123456789   | 5678 | Chidi Okafor  |

## API documentation

### `POST /predict/eta`

```jsonc
// Request
{ "stop": "CITS", "day_of_week": 1, "hour": 8, "weather_flag": false }
// day_of_week: 0=Monday..6=Sunday. hour: 0-23. stop: "CITS" | "Bariga" | "Yaba".

// Response
{ "stop": "CITS", "estimated_wait_minutes": 5.7, "confidence": "synthetic" }
```

Invalid `hour`/`day_of_week`/missing fields return `422` with Pydantic's validation
detail. If the model hasn't been trained yet (`data/model.joblib` missing), returns
`503`.

### `POST /drivers/verify`

```jsonc
// Request
{ "phone": "08031234567", "pin": "1234" }

// Response (200)
{ "driver_id": "driver-001", "name": "Tunde Balogun" }

// Wrong phone/PIN -> 401. Malformed PIN (not exactly 4 digits) -> 422.
```

### `GET /health`

```jsonc
{ "status": "ok" }
```

## Predictive model methodology

`backend/data/generate_synthetic_data.py` generates rows shaped like BRT terminal
observations: `stop, day_of_week, hour, weather_flag, headway_minutes, queue_count`,
one per stop per day-of-week per sample, with realistic patterns baked in (shorter
headways and longer queues at rush hour, longer headways off-peak and on weekends,
longer queues in rain, CITS running the busiest since it's the shared hub for both
routes).

The API only knows `stop, day_of_week, hour, weather_flag` at request time — a commuter
doesn't know the current headway or queue length, that's what's being predicted. So
`train_model.py` derives the training target (`estimated_wait_minutes`) from the logged
`headway_minutes` and `queue_count` using a standard random-arrival approximation
(`wait ≈ headway/2 + boarding delay from the queue already there`), then trains a
`GradientBoostingRegressor` to predict that target from the four request-time features,
with an 80/20 train/test split.

```
Trained on 105 rows (synthetic)
  MAE:  2.09 minutes
  RMSE: 2.63 minutes
```

Run `python data/train_model.py` to reproduce. `data/model_metadata.json` records what
the currently-saved model was trained on — this is what `/predict/eta`'s `confidence`
field reads from.

### The path to real data

`backend/data/real_field_data_template.csv` defines the exact schema for real BRT
observation data once someone stands at a terminal with a clipboard (or an app) and logs
it. Once that file has real rows:

```bash
python data/retrain.py path/to/real_observations.csv
```

This retrains the identical pipeline and overwrites `model.joblib` and
`model_metadata.json` — `/predict/eta` starts returning `confidence:
"real_data_informed"` automatically, no code changes needed. This is the actual
roadmap mechanism, not just a README aspiration.

## Firebase security rules

`firebase/database.rules.json`:

```json
{
  "rules": {
    "shuttles": {
      ".read": true,
      "$routeId": {
        "$driverId": { ".write": "auth != null" }
      }
    },
    "drivers": { ".read": false, ".write": false },
    "checkinLogs": {
      "$routeId": {
        ".read": true,
        "$logId": { ".write": "auth != null" }
      }
    }
  }
}
```

Deploy with the Firebase CLI: `firebase deploy --only database` from `firebase/`.

**Reads are open** (anyone can see live shuttle status — that's the point of the app).
**Writes require an authenticated session** (`auth != null`) rather than the fully-open
test-mode rules Firebase ships by default. The frontend signs in anonymously
(`signInAnonymously`) right before a driver's first check-in, so unauthenticated clients
can never write to `/shuttles` or `/checkinLogs`.

Note that `.read: true` sits on `shuttles` itself, not just on `$routeId` — RTDB rules
only cascade *downward* (a rule on a parent applies to its children, never the reverse),
and the commuter view subscribes to the whole `/shuttles` tree in one `onValue` listener
to flatten all routes/drivers into one list. Putting `.read` only on `$routeId` would
silently deny that top-level subscription.

**Honest simplification, stated plainly:** these rules stop an anonymous outsider from
writing to the database at all, but they don't cryptographically verify that a write's
`driverId` actually corresponds to the phone+PIN that was checked — that attribution is
enforced by the app's own code path (the frontend only ever calls `checkIn()` with the
`driver_id` that `/drivers/verify` just returned for the phone+PIN just entered), not by
the database itself. Someone capable of crafting a raw Firebase write directly (bypassing
the app entirely) could technically impersonate another driver's ID without ever knowing
their PIN. Note this isn't about route choice — a driver legitimately picks whichever
route they're driving each day (see [The transit topology](#the-transit-topology)), so
there's no "wrong route" to spoof anymore, only identity. This is a real but
low-severity gap for an MVP — the threat model here is "don't let a random visitor write
garbage," not "defend against someone deliberately crafting raw database calls."

The natural hardening step — binding a write to the verified driver's identity at the
database rules level too, via Firebase custom auth tokens minted by the backend after PIN
verification (`auth.uid === $driverId`) — is a known next step, deliberately deferred to
avoid requiring a Firebase Admin service account in the backend deployment for this
build.

## Deployment

- **Backend:** `backend/Dockerfile` builds a self-contained image (trains the model at
  build time, then serves with uvicorn). Works on Render, Railway, Fly.io, or anywhere
  else that runs a container on `$PORT`/`8000`.
- **Frontend:** `npm run build` in `frontend/` produces a static `dist/` bundle with no
  extra config — deployable to GitHub Pages, Vercel, or Netlify directly.
- **CI:** `.github/workflows/ci.yml` lints and tests both frontend (`npm run lint`,
  `npm run test`, `npm run build`) and backend (`pytest`, after training the model) on
  every push/PR to `main`.

## PWA

`frontend/vite.config.ts` configures `vite-plugin-pwa`: a web app manifest (navy/teal
theme, installable), and a service worker that precaches the app shell so the UI still
loads offline. Firebase traffic itself isn't cached by the service worker (that's the
Firebase SDK's job) — when Firebase is unreachable, `ConnectionBanner` shows a
"Reconnecting…" state instead of the UI breaking.

## Roadmap (documented, not built)

Kept here instead of left as a vague aspiration, so it's clear what's deliberately out
of scope for this build and why:

- **Custom-token route authorization** — see the honest gap noted in
  [Firebase security rules](#firebase-security-rules) above.
- **Always-on GPS tracking** — see the note in
  [GPS arrival verification](#gps-arrival-verification) above.
- **Supabase (Postgres) as a durable historical store**, separate from Firebase's live
  ephemeral state. Every check-in already carries everything `retrain.py` needs (stop,
  time, GPS verification); a Postgres table accumulating that history is a strictly
  better real-data source than a manually-filled CSV, and doesn't touch the live path —
  it's a parallel write, not a dependency of the commuter/driver flow.
- **A coordinator + specialist agent pipeline** for cross-route dispatch — this build
  answers "where's my bus" (single-route ETA), not "how should drivers rebalance across
  routes" (the bunching/gaps half of the original problem statement). A future
  ingestion → feature-engineering → anomaly-scoring → coordinator pipeline is the right
  shape for that, but doesn't belong on the same path as a driver's tap reaching a
  student's screen — that path needs to stay a fast, deterministic database write, not
  route through an LLM-driven agent.
- **Student sign-in (Google/Microsoft)** — the commuter view is deliberately open, no
  login, in this build. Generic Google sign-in wouldn't actually verify UNILAG
  affiliation (any Gmail account works); Microsoft sign-in restricted to the school's
  Office 365 tenant would, but needs that tenant restriction configured. Likely paired
  with the ₦200/month subscription mentioned as a business model, which needs its own
  payment integration (e.g. Paystack/Flutterwave) — none of that is built here.
- **Phase 2 (campus cabs + electric buses) and phase 3 (public mass transit,
  state/country-wide)** — the topology and data model here are deliberately scoped to
  the 2 official-shuttle routes only.
