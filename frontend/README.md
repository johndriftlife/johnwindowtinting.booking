# John Window Tinting — Booking Website (50% Deposit)

A full-stack booking system for **John Window Tinting** with a 50% online deposit collected at the time of booking.

## Tech
- Frontend: React (Vite) + Tailwind + Stripe Elements
- Backend: Node.js + Express + SQLite (via better-sqlite3)
- Payments: Stripe Payment Intent (50% of service price)
- Auth (admin): Simple password from environment variables
- Timezone: America/Guadeloupe
- Business hours:
  - Tue–Fri: 14:00–17:00
  - Sat: 09:00–17:00
  - Sun: 10:00–12:00
  - Mon: Closed

## One-time setup

1) Install dependencies

```bash
# backend
cd backend
cp .env.example .env   # fill in your keys
npm install

# initialize the database (auto on first run)
npm run dev
```

```bash
# frontend
cd ../frontend
cp .env.example .env   # put your STRIPE_PUBLISHABLE_KEY and API URL
npm install
npm run dev
```

2) Fill in `.env` files:

### backend/.env
```
PORT=8080
NODE_ENV=development
TZ=America/Guadeloupe

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # optional; only if you enable webhook route

# App
ADMIN_PASSWORD=changeme
FRONTEND_URL=http://localhost:5173
CURRENCY=usd  # set to eur if you prefer
SLOT_DURATION_MIN=60

# Prices in smallest currency unit, e.g. cents
PRICE_CARBON=20000
PRICE_CERAMIC=35000
```

### frontend/.env
```
VITE_API_BASE=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## Run locally

In one terminal:
```bash
cd backend
npm run dev
```

In another:
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Deploy

- Backend: Render/Railway/Fly.io/etc.
- Frontend: Vercel/Netlify/etc.  
Make sure `FRONTEND_URL` on the backend matches your deployed frontend URL, and `VITE_API_BASE` on the frontend points to your backend.

## Notes

- The deposit is always 50% of the service price (Carbon or Ceramic). Adjust prices or currency in `backend/.env`.
- To change business hours or slot length, edit `backend/src/config/businessHours.js` and `.env` (SLOT_DURATION_MIN).
- Webhook handling is included but optional. The flow works without it: after payment success, the frontend notifies the backend to finalize the booking.

