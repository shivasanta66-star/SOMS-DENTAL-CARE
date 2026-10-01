-- SOMS Dental Care - Supabase database schema.
--
-- Run this whole file once in Supabase Dashboard > SQL Editor > New query.
-- It is idempotent: running it again (e.g. after pulling an update) is safe and
-- never overwrites the clinic's own edits.
--
-- The Netlify Functions connect with SUPABASE_SECRET_KEY, which bypasses Row
-- Level Security. RLS is switched on for every table with no policies, so the
-- public (publishable / anon) key can read or write nothing - patient names and
-- phone numbers are only reachable through the functions.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.services (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- weekday: 0 = Sunday ... 6 = Saturday (same as JavaScript Date#getDay).
CREATE TABLE IF NOT EXISTS public.clinic_hours (
  weekday   SMALLINT PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  opens_at  TIME NOT NULL DEFAULT '10:00',
  closes_at TIME NOT NULL DEFAULT '20:00',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (is_closed OR closes_at > opens_at)
);

-- time_slot NULL means the whole day is blocked.
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL,
  time_slot  TIME,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blocked_slots_date_idx ON public.blocked_slots (date);

CREATE TABLE IF NOT EXISTS public.appointments (
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
CREATE INDEX IF NOT EXISTS appointments_date_idx ON public.appointments (appointment_date, time_slot);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON public.appointments (status);
CREATE INDEX IF NOT EXISTS appointments_phone_idx ON public.appointments (patient_phone);
-- One live appointment per slot. This is what actually prevents double booking
-- when two patients pick the same slot at the same moment.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_one_per_slot
  ON public.appointments (appointment_date, time_slot)
  WHERE status <> 'cancelled';

CREATE TABLE IF NOT EXISTS public.admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only a SHA-256 hash of the session token is stored.
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token_hash    TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Fixed-window rate limiting that works across serverless function instances.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: on everywhere, no policies. Only the secret key (used by
-- the Netlify Functions) can reach these tables.
-- ---------------------------------------------------------------------------

ALTER TABLE public.services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_hours   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS appointments_touch_updated_at ON public.appointments;
CREATE TRIGGER appointments_touch_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Functions called from the Netlify Functions through supabase.rpc(). Anything
-- that must happen atomically (locking a row, retrying on a unique violation)
-- lives here, because the REST API runs each call as its own statement.
-- ---------------------------------------------------------------------------

-- Check-on-read expiry: an unpaid booking holds its slot for 30 minutes, then is
-- cancelled so the slot frees up. Returns how many holds were released.
CREATE OR REPLACE FUNCTION public.expire_stale_appointments(p_hold_minutes INTEGER DEFAULT 30)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE appointments
     SET status = 'cancelled',
         payment_status = CASE WHEN payment_status IN ('unpaid', 'failed') THEN 'expired' ELSE payment_status END
   WHERE status = 'pending_payment'
     AND created_at < now() - make_interval(mins => p_hold_minutes);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Records a verified Razorpay payment. Safe to call more than once for the same
-- payment (the checkout callback, the webhook and the reconciliation job can
-- all report it). Returns {kind, appointment}.
CREATE OR REPLACE FUNCTION public.mark_appointment_paid(p_order_id TEXT, p_payment_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  a appointments%ROWTYPE;
BEGIN
  SELECT * INTO a FROM appointments WHERE razorpay_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('kind', 'not_found');
  END IF;

  IF a.payment_status IN ('paid', 'refund_pending', 'refunded') THEN
    RETURN jsonb_build_object(
      'kind', CASE WHEN a.status = 'cancelled' THEN 'paid_but_slot_lost' ELSE 'already_paid' END,
      'appointment', to_jsonb(a));
  END IF;

  -- A cancelled + expired row means the 30-minute hold lapsed (or the patient
  -- started a fresh booking) before this payment landed. Try to give the patient
  -- the slot back; if someone else has taken it, keep the payment on record so
  -- the clinic can refund it. A booking the clinic cancelled on purpose is never
  -- revived.
  IF a.status = 'pending_payment' OR (a.status = 'cancelled' AND a.payment_status = 'expired') THEN
    BEGIN
      UPDATE appointments
         SET status = 'confirmed', payment_status = 'paid', razorpay_payment_id = p_payment_id
       WHERE id = a.id
       RETURNING * INTO a;
      RETURN jsonb_build_object('kind', 'confirmed', 'appointment', to_jsonb(a));
    EXCEPTION WHEN unique_violation THEN
      NULL; -- the slot was re-booked by someone else; fall through
    END;
  END IF;

  UPDATE appointments
     SET payment_status = 'paid', razorpay_payment_id = p_payment_id
   WHERE id = a.id
   RETURNING * INTO a;
  RETURN jsonb_build_object(
    'kind', CASE WHEN a.status = 'cancelled' THEN 'paid_but_slot_lost' ELSE 'already_paid' END,
    'appointment', to_jsonb(a));
END $$;

-- Counts one hit against a fixed window and returns the count so far.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_window_seconds INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  c INTEGER;
BEGIN
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds), 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO c;
  -- Occasionally clear out old windows.
  IF random() < 0.02 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  END IF;
  RETURN c;
END $$;

-- Moves a service one place up (p_dir = -1) or down (p_dir = 1) in the booking list.
CREATE OR REPLACE FUNCTION public.move_service(p_id INTEGER, p_dir INTEGER)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  ids INTEGER[];
  i INTEGER;
  j INTEGER;
  tmp INTEGER;
BEGIN
  SELECT array_agg(id ORDER BY display_order, id) INTO ids
    FROM (SELECT id, display_order FROM services FOR UPDATE) s;
  i := array_position(ids, p_id);
  IF i IS NULL THEN RETURN; END IF;
  j := i + sign(p_dir)::INTEGER;
  IF j < 1 OR j > array_length(ids, 1) THEN RETURN; END IF;
  tmp := ids[i];
  ids[i] := ids[j];
  ids[j] := tmp;
  UPDATE services s SET display_order = o.ord
    FROM unnest(ids) WITH ORDINALITY AS o(id, ord)
   WHERE s.id = o.id;
END $$;

-- Creates the admin account, or resets its password, and signs out its sessions.
-- Run from the SQL Editor (never exposed to the website):
--   SELECT public.set_admin_password('reception', 'a long passphrase here');
CREATE OR REPLACE FUNCTION public.set_admin_password(p_username TEXT, p_password TEXT)
RETURNS TEXT LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE
  uid INTEGER;
BEGIN
  IF length(trim(coalesce(p_username, ''))) < 3 THEN
    RAISE EXCEPTION 'Choose a username of at least 3 characters.';
  END IF;
  IF length(coalesce(p_password, '')) < 12 THEN
    RAISE EXCEPTION 'Use a password of at least 12 characters.';
  END IF;
  -- pgcrypto's bf is bcrypt; the functions verify it with bcryptjs.
  INSERT INTO admin_users (username, password_hash)
  VALUES (trim(p_username), crypt(p_password, gen_salt('bf', 12)))
  ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
  RETURNING id INTO uid;
  DELETE FROM admin_sessions WHERE admin_user_id = uid;
  RETURN format('Admin account "%s" is ready.', trim(p_username));
END $$;

-- Only the secret key (service_role) may call these through the API.
REVOKE EXECUTE ON FUNCTION public.expire_stale_appointments(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_appointment_paid(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_service(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_admin_password(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_appointments(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_appointment_paid(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_service(INTEGER, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- Seed data (only inserted when missing, never overwrites admin edits)
-- ---------------------------------------------------------------------------

INSERT INTO public.services (name, display_order) VALUES
  ('General Checkup & Cleaning', 1),
  ('Root Canal Treatment', 2),
  ('Braces & Orthodontics', 3),
  ('Tooth Extraction (incl. wisdom teeth)', 4),
  ('Crowns & Caps', 5),
  ('Dental Implants', 6),
  ('Cosmetic / Smile Treatments', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.clinic_hours (weekday, opens_at, closes_at, is_closed)
SELECT d, '10:00', '20:00', FALSE FROM generate_series(0, 6) AS d
ON CONFLICT (weekday) DO NOTHING;

-- Consultation fee in paise. 20000 = Rs. 200 (DUMMY - confirm real amount).
INSERT INTO public.settings (key, value) VALUES ('consultation_fee_paise', '20000')
ON CONFLICT (key) DO NOTHING;

-- How many days ahead patients can book (1-90). Editable in Admin > Settings.
-- Without this row the functions use 30, so re-running this file is optional.
INSERT INTO public.settings (key, value) VALUES ('booking_window_days', '30')
ON CONFLICT (key) DO NOTHING;

-- Make the REST API see the new tables and functions straight away.
NOTIFY pgrst, 'reload schema';
