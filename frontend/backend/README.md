# Backend (fixed layout)

Use with Render:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Features
- 2h slots: Tue–Fri 14–16; Sat 9–11, 11–13, 14–16; Sun 10–12; Mon closed
- EUR pricing by window + 50% deposit
- Stripe PaymentIntent with receipt email + description
- Admin: list, cancel, refund; toggle shades & slots
- Public: GET /api/public/shades

Env (see .env.example)
