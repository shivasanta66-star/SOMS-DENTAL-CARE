-- SOMS Dental Care - database schema.
-- Idempotent: safe to run on every deploy via `npm run db:migrate`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- weekday: 0 = Sunday ... 6 = Saturday (same as JavaScript Date#getDay).
CREATE TABLE IF NOT EXISTS clinic_hours (
  weekday   SMALLINT PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  opens_at  TIME NOT NULL DEFAULT '10:00',
  closes_at TIME NOT NULL DEFAULT '20:00',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (is_closed OR closes_at > opens_at)
);

-- time_slot NULL means the whole day is blocked.
CREATE TABLE IF NOT EXISTS blocked_slots (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL,
  time_slot  TIME,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blocked_slots_date_idx ON blocked_slots (date);

CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name        TEXT NOT NULL,
  patient_phone       TEXT NOT NULL,
  service             TEXT NOT NULL,
  appointment_date    DATE NOT NULL,
  time_slot           TIME NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show')),
  payment_status      TEXT NOT NULL DEFAULT 'unpaid'
                        CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'expired', 'refund_pending', 'refunded')),
  razorpay_payment_id TEXT,
  razorpay_order_id   TEXT UNIQUE,
  razorpay_refund_id  TEXT,
  amount_paise        INTEGER NOT NULL CHECK (amount_paise >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments (appointment_date, time_slot);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status);
-- One live appointment per slot. This is what actually prevents double booking
-- when two patients pick the same slot at the same moment.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_one_per_slot
  ON appointments (appointment_date, time_slot)
  WHERE status <> 'cancelled';

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only a SHA-256 hash of the session token is stored.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash    TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Fixed-window rate limiting that works across serverless instances.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Seed data (only inserted when missing, never overwrites admin edits).
INSERT INTO services (name, display_order) VALUES
  ('General Checkup & Cleaning', 1),
  ('Root Canal Treatment', 2),
  ('Braces & Orthodontics', 3),
  ('Tooth Extraction (incl. wisdom teeth)', 4),
  ('Crowns & Caps', 5),
  ('Dental Implants', 6),
  ('Cosmetic / Smile Treatments', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO clinic_hours (weekday, opens_at, closes_at, is_closed)
SELECT d, '10:00', '20:00', FALSE FROM generate_series(0, 6) AS d
ON CONFLICT (weekday) DO NOTHING;

-- Consultation fee in paise. 20000 = Rs. 200 (DUMMY - confirm real amount).
INSERT INTO settings (key, value) VALUES ('consultation_fee_paise', '20000')
ON CONFLICT (key) DO NOTHING;
