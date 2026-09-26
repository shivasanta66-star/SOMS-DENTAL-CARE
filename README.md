# SOMS Dental Care

This is the website, online booking system, admin panel and Razorpay payment integration for **SOMS Dental Care** in Jharigaon, Umerkote (Nabarangpur District, Odisha). It is built from the *Website Design Brief & Build Prompts* (26 Sep 2026).

The brief recommends putting the public site, booking, payments and admin in one Next.js codebase, and this project does that. Booking, payment and the public pages share one deployment, so they can't drift apart.

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
9. Map, OPD hours (read from the database, so edits in the admin panel appear on the site within 5 minutes), contact details and footer

The page also has a sticky header whose "Book Appointment" button appears once you scroll past the hero. On mobile there is a bottom bar with Call, WhatsApp and Book Now; on desktop there is a floating WhatsApp button. SEO covers the `MedicalClinic` JSON-LD schema, Open Graph tags and a generated OG image, `robots.txt` and `sitemap.xml`. The design tokens, type scale, radii, shadow and 300 ms fade-and-rise follow the brief exactly, and the animation respects `prefers-reduced-motion`.

**Booking and payment flow**

1. The patient picks a service and then one of the next 14 days. Open 30-minute slots are derived from the clinic hours, minus slots already booked and slots the admin has blocked. All dates and times are in IST.
2. The patient enters a name and a 10-digit Indian mobile number and sees the consultation fee.
3. **Proceed to Payment** holds the slot (`pending_payment`), creates a Razorpay order and opens Razorpay Checkout (UPI, cards, netbanking).
4. The server verifies the Razorpay signature, never the browser, and the appointment becomes `confirmed` / `paid`. The patient sees a confirmation with **Save to Google Calendar** and a **.ics** download.
5. An unpaid hold expires after 30 minutes and the slot frees up. Expiry is checked whenever availability is read.
6. The Razorpay **webhook** is a backup confirmation path in case the patient closes the browser straight after paying.

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
- **Settings:** the flat consultation fee, the Razorpay status, and a password change.

**Security and data handling**

- HTTPS-only headers (HSTS).
- Admin passwords are hashed with bcrypt. Sessions live in the database; only a SHA-256 hash of the session token is stored, and the cookie is httpOnly with SameSite=Lax.
- Login, booking and availability are rate-limited. The limits are stored in Postgres, so they hold across serverless instances.
- Every Razorpay callback and webhook signature is verified with a timing-safe comparison.
- Phone numbers are masked in application logs.
- Only booking basics are collected: no symptoms and no medical history.

## Tech stack

- Next.js 16 (App Router) with React 19 and TypeScript
- PostgreSQL through `pg`, using plain SQL with no ORM. Supabase or Neon both work.
- Razorpay Orders, Checkout, Refunds and Webhooks. There is no SDK dependency; the code calls the REST API directly.
- Plain CSS with the brief's tokens (`src/app/globals.css`). The fonts are Source Serif 4 (600) and Inter, self-hosted through `next/font`.

## Running locally

```bash
npm install
cp .env.example .env.local            # then fill in the values
npm run db:migrate                    # creates tables and seeds services, hours and the fee (safe to re-run)
ADMIN_USERNAME=reception ADMIN_PASSWORD='a long passphrase' npm run admin:create
npm run dev                           # http://localhost:3000  and  /admin
```

Other commands:

```bash
npm test            # unit tests: slot maths, IST handling, validation, signatures, calendar links
npm run typecheck
npm run build
```

Without Razorpay keys the site still works: the booking form shows "Online payment is being set up, please call or WhatsApp", and nothing pretends to take a payment.

## Deploying

The app runs on either **Vercel** or **Netlify**. Both need the same database, and the Razorpay setup and launch test afterwards are identical.

### 1. Database (either host)

Create a Postgres database in **Mumbai (ap-south-1)** on Neon, Supabase or Netlify DB (which is built on Neon). Copy its **pooled** connection string and keep `sslmode=require`. Serverless functions open many short-lived connections, which the pooler handles.

### 2a. Hosting on Vercel

1. Import this repository into Vercel. `vercel.json` already pins functions to **bom1 (Mumbai)** so the API sits next to the database.
2. Add the environment variables from `.env.example` in Vercel → Settings → Environment Variables.

### 2b. Hosting on Netlify

1. In Netlify, choose **Add new site → Import an existing project → GitHub** and pick this repository. Netlify detects Next.js by itself and uses its Next.js runtime automatically. Keep the defaults: the build command is `npm run build`, and no `netlify.toml` is needed.
2. Under **Site configuration → Environment variables**, add everything from `.env.example`: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (your Netlify URL or custom domain), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`.
3. Under **Site configuration → Build & deploy → Functions → Functions region**, choose **Mumbai (ap-south-1)**, or the nearest region offered. Netlify ignores `vercel.json` and runs functions in the US by default. If your plan doesn't offer region selection, the site still works, but each booking request travels further and is slower.
4. Under **Site configuration → Build & deploy → Environment**, make sure the Node.js version is 20 or later (set a `NODE_VERSION` environment variable of `22` if needed).
5. Deploy, then open the **deploy preview** URL and run through a booking and an admin login before you point your domain at the site.

### 3. First-time setup (either host)

Run these once from your own computer against the production database:

```bash
DATABASE_URL='<production url>' npm run db:migrate
DATABASE_URL='<production url>' ADMIN_USERNAME=reception ADMIN_PASSWORD='a long passphrase' npm run admin:create
```

### 4. Razorpay (either host)

In the Razorpay Dashboard:

- **Webhooks:** add `https://<your-domain>/api/razorpay/webhook` with the events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed` and `refund.failed`, and use the same secret as `RAZORPAY_WEBHOOK_SECRET`. On Netlify before a custom domain is set, the domain is `<your-site>.netlify.app`. Update the webhook URL when you add a custom domain.
- **Account & Settings → Payment capture:** set it to **automatic**, so payments don't sit in the authorised state and get auto-refunded.

### 5. Launch test

Test the whole flow with `rzp_test_...` keys first: book a slot, pay, see the confirmation, and check that the booking appears in `/admin`. Switch to `rzp_live_...` keys after KYC.

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
- [ ] The **clinic's exact coordinates**. Add them to `geo` in `clinic.ts` so they are included in the JSON-LD.

Other launch tasks:

- [ ] Replace every photo placeholder (the doctor, treatment chair, sterilisation area, X-ray, waiting area) with **real photos of this clinic**, in WebP and under about 150 KB each. The doctor's photo needs the doctor's consent.
- [ ] Complete Razorpay KYC and test in sandbox mode before switching to live keys.
- [ ] Decide who holds the admin login day to day, and set a real password (`npm run admin:create` resets it).

The Google Maps link and the 4.5★ / 12 reviews rating are real and verified. Keep the rating as it is until the real count changes.

## Out of scope for v1 (flagged, not built)

As the brief asks, these are not built yet: SMS/WhatsApp booking confirmations, multiple staff logins, per-service pricing, patient medical history, a public "my bookings" lookup, a monthly revenue view, and an Odia-language toggle (Odia copy will be added once the clinic supplies translations). The data model leaves room for all of them.

## Project layout

```
db/schema.sql                 tables, the anti-double-booking index, seed data
scripts/                      migrate.mjs, create-admin.mjs
src/app/page.tsx              the public single-page site
src/app/api/…                 booking config, availability, appointments, verify, Razorpay webhook
src/app/admin/…               login, dashboard, appointments, services, availability, settings (+ server actions)
src/components/booking/       BookingWidget (data-integration="booking-api")
src/lib/                      clinic details, slot maths, IST time, Razorpay, auth, rate limiting
tests/                        unit tests (vitest)
```
