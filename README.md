# SOMS Dental Care

This is the website, online booking system, admin panel and Razorpay payment integration for **SOMS Dental Care** in Jharigaon, Umerkote (Nabarangpur District, Odisha). It is built from the *Website Design Brief & Build Prompts* (26 Sep 2026).

The brief recommends putting the public site, booking, payments and admin in one codebase, and this project does that. The pages are a Next.js static export, the backend is Netlify Functions, and the database is Supabase. Everything deploys together from this repository, so booking, payment and the public pages can't drift apart.

## What's in it

**Public site** (`/`): a single page that is mobile-first. The sections follow the order in the brief:

1. Hero with the trust promise, "Book Appointment" and "Call Now"
2. Trust strip: painless treatment, advanced facility, transparent pricing, experienced care
3. Meet the doctor
4. Services: 7 cards. Each "Book This" button pre-selects that service in the booking form.
5. Our facility: photo placeholders plus the hygiene line
6. Patient reviews: 4.5★ from 12 Google reviews, exactly as verified, followed by the themes patients mention. No invented quotes or reviewer names.
7. FAQ accordion (`<details>`, keyboard accessible)
8. Book appointment: the live booking widget (`data-integration="booking-api"`)
9. Map, OPD hours (built from the database at deploy time and refreshed from `/api/hours` in the browser, so edits in the admin panel appear straight away), contact details and footer

The page also has a sticky header whose "Book Appointment" button appears once you scroll past the hero. On mobile there is a bottom bar with Call, WhatsApp and Book Now; on desktop there is a floating WhatsApp button. SEO covers the `MedicalClinic` JSON-LD schema, Open Graph tags and a generated OG image, `robots.txt` and `sitemap.xml`. The design tokens, type scale, radii, shadow and 300 ms fade-and-rise follow the brief exactly, and the animation respects `prefers-reduced-motion`.

**Booking and payment flow**

1. The patient picks a service and then one of the next 30 days (the booking window, which can be changed in **Admin → Settings**). Open 30-minute slots are derived from the clinic hours, minus slots already booked and slots the admin has blocked. All dates and times are in IST.
2. The patient enters a name and a 10-digit Indian mobile number and sees the consultation fee.
3. **Proceed to Payment** holds the slot (`pending_payment`), creates a Razorpay order and opens Razorpay Checkout (UPI, cards, netbanking).
4. The server verifies the Razorpay signature, never the browser, and the appointment becomes `confirmed` / `paid`. The patient sees a confirmation with **Save to Google Calendar** and a **.ics** download.
5. An unpaid hold expires after 30 minutes and the slot frees up. Expiry is checked whenever availability is read, and by a scheduled function every 10 minutes.
6. If the patient closes the browser straight after paying, the same scheduled function asks Razorpay whether the order was paid and confirms the booking. No webhook is needed for this; the optional Razorpay webhook just does it sooner.

Edge cases that are handled:

- **Double booking:** a unique index on the slot guarantees two patients can't book the same slot, even when they click at the same instant.
- **Retrying after an abandoned checkout:** the patient's own earlier hold doesn't block them.
- **Payment arriving after the hold expired:**
  - If the slot is still free, the booking is revived.
  - If someone else has taken the slot, the payment is recorded and the admin dashboard flags it for a refund decision.

**Admin panel** (`/admin`, behind a login)

- **Dashboard:** today's appointments, upcoming confirmed appointments this week, bookings awaiting payment, and paid-but-cancelled bookings that need a refund decision.
- **Appointments:** quick views (Upcoming, Today, Past, Refund decisions, All) plus date and status filters.
- **Appointment detail:** the Razorpay order, payment and refund IDs, with Mark completed and Mark no-show buttons. **Cancelling a paid booking asks** whether to refund in full through Razorpay or keep the payment on record to refund later. A payment record is never lost silently.
- **Services:** add, rename, show or hide, and reorder.
- **Availability:** weekly hours, and blocks for whole days or time ranges (holidays, leave). The page warns if bookings already exist inside a block.
- **Settings:** the flat consultation fee, how many days ahead patients can book (1-90, default 30), the Razorpay status, and a password change.

**Security and data handling**

- HTTPS-only headers (HSTS).
- Admin passwords are hashed with bcrypt. Sessions live in the database; only a SHA-256 hash of the session token is stored, and the cookie is httpOnly with SameSite=Lax.
- Login, booking and availability are rate-limited. The limits are stored in Supabase, so they hold across function instances.
- Row Level Security is on for every table with no policies, so Supabase's public key can read nothing. Only the Netlify Functions, using `SUPABASE_SECRET_KEY`, can reach patient data. The secret key never reaches the browser.
- Every Razorpay callback and webhook signature is verified with a timing-safe comparison.
- Phone numbers are masked in application logs.
- Only booking basics are collected: no symptoms and no medical history.

## Tech stack

- **Frontend:** Next.js 16 (App Router) with React 19 and TypeScript, exported as static files (`output: "export"`). The public site and the admin panel are both static pages that call the backend with `fetch`.
- **Backend:** Netlify Functions in `netlify/functions/`, one per endpoint, plus a scheduled function.
- **Database:** Supabase (Postgres) through `@supabase/supabase-js`, using `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Steps that must be atomic (confirming a payment, rate limiting, reordering services, expiring holds) are SQL functions in `db/schema.sql`, called with `supabase.rpc()`.
- **Payments:** Razorpay Orders, Checkout, Refunds and (optionally) Webhooks, using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. There is no SDK dependency; the code calls the REST API directly. `rzp_test_...` keys run in test mode.
- Plain CSS with the brief's tokens (`src/app/globals.css`). The fonts are Source Serif 4 (600) and Inter, self-hosted through `next/font`.

### API endpoints (Netlify Functions)

| Endpoint | Function | Purpose |
| --- | --- | --- |
| `GET /api/booking/config` | `booking-config` | Active services, consultation fee, Razorpay key ID |
| `GET /api/availability` | `availability` | Open 30-minute slots for each day in the booking window (30 days by default) |
| `POST /api/appointments` | `appointments-create` | Holds the slot (`pending_payment`) and creates the Razorpay order |
| `POST /api/appointments/verify` | `appointments-verify` | Verifies the Razorpay signature server-side and confirms the booking |
| `POST /api/razorpay/webhook` | `razorpay-webhook` | Optional backup confirmation and refund status (needs `RAZORPAY_WEBHOOK_SECRET`) |
| `GET /api/hours` | `hours` | Weekly opening hours for the public page |
| `GET /api/health` | `health` | Setup check: database, schema, admin account and Razorpay mode (yes/no only) |
| `/api/admin/*` | `admin` | Login, dashboard, appointments, refunds, services, availability, settings |
| every 10 minutes | `expire-pending` | Releases expired holds and recovers payments the browser never reported |

## Setting up on Netlify

The Netlify site, the Supabase project and the environment variables `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are already in place. Netlify builds and deploys every push to `main`. `netlify.toml` sets the build command, the functions directory, Node 22 and the security headers, so there's nothing to configure in the Netlify UI.

### 1. Create the database tables (once)

In **Supabase Dashboard → SQL Editor → New query**, paste the whole of [`db/schema.sql`](db/schema.sql) and click **Run**. It creates the tables, turns on Row Level Security, adds the SQL functions and seeds the 7 services, the opening hours (10 AM - 8 PM daily) and the ₹200 fee. It is safe to run again after an update.

### 2. Create the admin login (once)

In the same SQL Editor, run this with your own username and a passphrase of at least 12 characters:

```sql
SELECT public.set_admin_password('reception', 'a long passphrase here');
```

The password is stored as a bcrypt hash. Run the same line again to reset a forgotten password; that also signs out every device. You can change the password later in **Admin → Settings**. (Supabase keeps SQL Editor history, so change the password from the admin panel afterwards if that matters to you.)

### 3. Check the setup

Open `https://<your-site>.netlify.app/api/health`. You should see `"database": "ok"`, `"adminAccount": true` and `"razorpay": "test"`. The admin login page shows the same hints if something is missing.

### 4. Razorpay settings

- **Account & Settings → Payment capture:** set it to **automatic**, so payments don't sit in the authorised state and get auto-refunded.
- **Webhook (optional):** add `https://<your-domain>/api/razorpay/webhook` with the events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed` and `refund.failed`, and add the secret you choose as a Netlify environment variable `RAZORPAY_WEBHOOK_SECRET`. Without it, bookings are still confirmed at checkout, and the scheduled function catches any payment whose browser closed early within 10 minutes.

### 5. Functions region

Under **Site configuration → Build & deploy → Functions → Functions region**, choose **Mumbai (ap-south-1)** if your plan offers it, so the functions sit next to a Mumbai Supabase project. The site works from any region; nearer is just faster.

### 6. Launch test

With the `rzp_test_...` keys: book a slot on the live site, pay with a [Razorpay test card or UPI ID](https://razorpay.com/docs/payments/payments/test-card-details/), check the confirmation screen and the **Save to Google Calendar** link, then find the booking in `/admin`. Try cancelling it with a refund. Switch to `rzp_live_...` keys after KYC.

## Running locally

```bash
npm install
npm install -g netlify-cli
netlify link          # once: connects this folder to the Netlify site
npm run dev           # netlify dev: site, admin and functions on http://localhost:8888, using the site's env vars
```

Other commands:

```bash
npm test            # unit tests: slot maths, IST handling, validation, signatures, calendar links
npm run typecheck   # the Next.js app and the Netlify Functions
npm run build       # static export to out/
```

`npm run admin:create` is an alternative to step 2 that runs from your computer: `ADMIN_USERNAME=reception ADMIN_PASSWORD='a long passphrase' netlify dev:exec npm run admin:create`.

Without Razorpay keys the site still works: the booking form shows "Online payment is being set up, please call or WhatsApp", and nothing pretends to take a payment.

## Before launch: replace the DUMMY values

Every value that needs confirming lives in **`src/lib/clinic.ts`**, apart from the fee, which is set in the admin panel. The brief marks these **DUMMY - confirm**:

- [ ] Doctor's full name and qualification: currently *Dr. Soumya Ranjan Sahu, BDS*
- [ ] Year the doctor started practising: currently *2015*
- [ ] WhatsApp number: currently the clinic phone, *070773 76464*
- [ ] Instagram handle: currently *@somsdentalcare*
- [ ] Consultation fee: currently *₹200*. Change it in **Admin → Settings**.

Other copy to check with the clinic:

- [ ] **Parking**, in the FAQ in `src/lib/content.ts`. It is a clearly marked `[placeholder]`.
- [ ] The **hygiene line** in the facility section, which says instruments are sterilised after every patient and single-use items are fresh for each person.
- [ ] The **map pin**: the embedded map and the JSON-LD coordinates come from the clinic's Google Maps listing (`mapsEmbedUrl` and `geo` in `clinic.ts`). Check the pin is on the right building.

Other launch tasks:

- [ ] Replace every photo placeholder (the doctor, treatment chair, sterilisation area, X-ray, waiting area) with **real photos of this clinic**, in WebP and under about 150 KB each. The doctor's photo needs the doctor's consent.
- [ ] Complete Razorpay KYC and test in sandbox mode before switching to live keys.
- [ ] Decide who holds the admin login day to day, and set a real password (re-running `set_admin_password` in the Supabase SQL Editor resets it).

The Google Maps link, the embedded map and the 4.5★ / 12 reviews rating are real and verified. Keep the rating as it is until the real count changes.

## Out of scope for v1 (flagged, not built)

As the brief asks, these are not built yet: SMS/WhatsApp booking confirmations, multiple staff logins, per-service pricing, patient medical history, a public "my bookings" lookup, a monthly revenue view, and an Odia-language toggle (Odia copy will be added once the clinic supplies translations). The data model leaves room for all of them.

## Project layout

```
db/schema.sql                 tables, RLS, SQL functions, anti-double-booking index, seed data (run in the Supabase SQL Editor)
netlify.toml                  build settings, functions directory, security headers
netlify/functions/            the backend: one Netlify Function per endpoint, plus the scheduled expire-pending job
netlify/lib/                  server-only code: Supabase client, auth, appointments, Razorpay, rate limiting
src/app/page.tsx              the public single-page site
src/app/admin/…               login, dashboard, appointments, services, availability, settings (static pages calling /api/admin)
src/components/booking/       BookingWidget (data-integration="booking-api")
src/lib/                      shared code: clinic details, slot maths, IST time, validation, calendar links
scripts/create-admin.mjs      optional: create or reset the admin login from your computer
tests/                        unit tests (vitest)
```
