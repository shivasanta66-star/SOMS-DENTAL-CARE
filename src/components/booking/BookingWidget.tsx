"use client";

/*
 * Booking widget (data-integration="booking-api").
 *
 * Everything here is driven by the backend in src/app/api:
 *   GET  /api/booking/config        active services, consultation fee, Razorpay key
 *   GET  /api/availability          open 30-minute slots for the next 14 days
 *   POST /api/appointments          holds the slot and creates a Razorpay order
 *   POST /api/appointments/verify   server-side signature check, confirms the slot
 * No availability is hard-coded and no payment is simulated in the browser.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { googleCalendarUrl, icsFile } from "@/lib/calendar";
import { clinic, whatsappLink } from "@/lib/clinic";
import { formatDateLong, formatRupees, formatTime12, toMinutes } from "@/lib/time";
import { CalendarIcon, CheckIcon, PhoneIcon, WhatsAppIcon } from "../icons";
import { SELECT_SERVICE_EVENT } from "../site/BookThisButton";

type Config = { services: { id: number; name: string }[]; feePaise: number; razorpayKeyId: string; paymentsEnabled: boolean };
type Day = { date: string; slots: string[] };
type FieldErrors = Partial<Record<"name" | "phone" | "service" | "date" | "time", string>>;
type Confirmation = {
  outcome: "confirmed" | "already_paid" | "paid_but_slot_lost";
  appointment: { service: string; date: string; time: string; amountPaise: number; paymentId: string | null };
};

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

function periodOf(time: string) {
  const m = toMinutes(time);
  return m < 12 * 60 ? "Morning" : m < 16 * 60 ? "Afternoon" : "Evening";
}

async function readJson<T>(res: Response): Promise<T & { error?: string; fieldErrors?: FieldErrors; code?: string }> {
  return res.json().catch(() => ({}) as T & { error?: string });
}

export function BookingWidget() {
  const uid = useId();
  const [config, setConfig] = useState<Config | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const pendingService = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadAvailability = useCallback(async () => {
    const res = await fetch("/api/availability", { cache: "no-store" });
    const data = await readJson<{ days: Day[] }>(res);
    if (!res.ok) throw new Error(data.error ?? "Could not load open slots.");
    setDays(data.days);
    return data.days;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/booking/config", { cache: "no-store" });
        const cfg = await readJson<Config>(res);
        if (!res.ok) throw new Error(cfg.error ?? "Online booking is unavailable.");
        if (cancelled) return;
        setConfig(cfg);
        const wanted = pendingService.current ?? new URLSearchParams(window.location.search).get("service");
        if (wanted && cfg.services.some((s) => s.name === wanted)) setService(wanted);
        const loaded = await loadAvailability();
        if (cancelled) return;
        const firstOpen = loaded.find((d) => d.slots.length > 0);
        if (firstOpen) setDate(firstOpen.date);
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAvailability]);

  // "Book This" buttons in the services section pre-select a service here.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const wanted = (e as CustomEvent<string>).detail;
      pendingService.current = wanted;
      if (config?.services.some((s) => s.name === wanted)) {
        setService(wanted);
        setFieldErrors((f) => ({ ...f, service: undefined }));
      }
    };
    window.addEventListener(SELECT_SERVICE_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_SERVICE_EVENT, onSelect);
  }, [config]);

  const selectedDay = useMemo(() => days?.find((d) => d.date === date), [days, date]);
  const groupedSlots = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const s of selectedDay?.slots ?? []) {
      const p = periodOf(s);
      groups.set(p, [...(groups.get(p) ?? []), s]);
    }
    return [...groups.entries()];
  }, [selectedDay]);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (name.trim().length < 2) errs.name = "Please enter your full name.";
    const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) errs.phone = "Please enter a valid 10-digit mobile number.";
    if (!service) errs.service = "Please choose a service.";
    if (!date) errs.date = "Please choose a date.";
    if (!time) errs.time = "Please choose a time.";
    return errs;
  }

  async function verifyPayment(resp: RazorpayResponse) {
    setBusy(true);
    setInfo("Confirming your payment…");
    try {
      const res = await fetch("/api/appointments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resp),
      });
      const data = await readJson<Confirmation>(res);
      if (!res.ok) throw new Error(data.error ?? "We couldn't confirm the payment.");
      setConfirmation(data);
      rootRef.current?.scrollIntoView({ block: "start" });
    } catch (err) {
      setFormError(`${(err as Error).message} Please call ${clinic.phoneDisplay} and we'll sort it out.`);
    } finally {
      setInfo(null);
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      const [checkoutReady, res] = await Promise.all([
        loadCheckout(),
        fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service, date, time, name, phone }),
        }),
      ]);
      const data = await readJson<{
        orderId: string;
        amountPaise: number;
        currency: string;
        keyId: string;
        prefill: { name: string; contact: string };
      }>(res);

      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        if (data.code === "slot_taken") {
          setTime("");
          await loadAvailability().catch(() => undefined);
        }
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      if (!checkoutReady || !window.Razorpay) {
        throw new Error("The payment window couldn't load. Please check your internet connection and try again.");
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amountPaise,
        currency: data.currency,
        name: clinic.name,
        description: `Consultation: ${service}`,
        prefill: data.prefill,
        theme: { color: "#1A5F7A" },
        // Close the checkout before the 30-minute slot hold runs out.
        timeout: 25 * 60,
        retry: { enabled: true },
        handler: (resp: RazorpayResponse) => void verifyPayment(resp),
        modal: {
          ondismiss: () => {
            setBusy(false);
            setInfo("Payment wasn't completed, so your slot isn't confirmed yet. We'll hold it for 30 minutes. Tap \"Proceed to Payment\" to try again.");
          },
        },
      });
      rzp.on("payment.failed", (resp) => {
        setFormError(`Payment failed: ${resp.error?.description ?? "please try again or use a different method"}. No money has been taken for this attempt.`);
      });
      rzp.open();
    } catch (err) {
      setFormError((err as Error).message);
      setBusy(false);
    }
  }

  function startOver() {
    setConfirmation(null);
    setTime("");
    setFormError(null);
    setInfo(null);
    void loadAvailability().catch(() => undefined);
  }

  if (confirmation) return <ConfirmationView confirmation={confirmation} rootRef={rootRef} onDone={startOver} />;

  if (loadError) {
    return (
      <div className="card booking" data-integration="booking-api">
        <div className="notice notice--error" role="alert">
          <p><strong>Online booking isn't available right now.</strong> {loadError}</p>
        </div>
        <FallbackContact />
      </div>
    );
  }

  const fee = config ? formatRupees(config.feePaise) : "…";
  const paymentsOff = config !== null && !config.paymentsEnabled;

  return (
    <div className="card booking" data-integration="booking-api" ref={rootRef}>
      {paymentsOff && (
        <div className="notice" role="status">
          <p><strong>Online payment is being set up.</strong> Until then, please call or WhatsApp us to book - we'll confirm your time right away.</p>
          <FallbackContact />
        </div>
      )}

      <form onSubmit={onSubmit} noValidate aria-describedby={`${uid}-fee`}>
        <div className="two-col">
          <div className="field">
            <label htmlFor={`${uid}-name`}>Full name</label>
            <input
              id={`${uid}-name`}
              className="input"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((f) => ({ ...f, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? `${uid}-name-err` : undefined}
              maxLength={80}
              required
            />
            {fieldErrors.name && <p className="field__error" id={`${uid}-name-err`}>{fieldErrors.name}</p>}
          </div>
          <div className="field">
            <label htmlFor={`${uid}-phone`}>Mobile number</label>
            <div className="phone-input">
              <span className="phone-input__prefix" aria-hidden="true">+91</span>
              <input
                id={`${uid}-phone`}
                className="input"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFieldErrors((f) => ({ ...f, phone: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? `${uid}-phone-err` : undefined}
                maxLength={16}
                required
              />
            </div>
            {fieldErrors.phone && <p className="field__error" id={`${uid}-phone-err`}>{fieldErrors.phone}</p>}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-service`}>Service</label>
          <select
            id={`${uid}-service`}
            className="select"
            name="service"
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setFieldErrors((f) => ({ ...f, service: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.service)}
            aria-describedby={fieldErrors.service ? `${uid}-service-err` : undefined}
            disabled={!config}
            required
          >
            <option value="">{config ? "Choose a service" : "Loading services…"}</option>
            {config?.services.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          {fieldErrors.service && <p className="field__error" id={`${uid}-service-err`}>{fieldErrors.service}</p>}
        </div>

        <fieldset className="field fieldset">
          <legend className="field__label" id={`${uid}-date`} tabIndex={-1}>Date</legend>
          {!days ? (
            <div className="skeleton" aria-label="Loading dates" />
          ) : (
            <ul className="date-strip" aria-labelledby={`${uid}-date`}>
              {days.map((d) => {
                const dt = new Date(`${d.date}T00:00:00Z`);
                const open = d.slots.length > 0;
                return (
                  <li key={d.date}>
                    <button
                      type="button"
                      className="date-chip"
                      aria-pressed={date === d.date}
                      disabled={!open}
                      aria-label={`${formatDateLong(d.date)}${open ? `, ${d.slots.length} times open` : ", no times open"}`}
                      onClick={() => {
                        setDate(d.date);
                        setTime("");
                        setFieldErrors((f) => ({ ...f, date: undefined, time: undefined }));
                      }}
                    >
                      <span className="date-chip__dow">{dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</span>
                      <span className="date-chip__day">{dt.getUTCDate()}</span>
                      <span className="date-chip__dow">{dt.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}</span>
                      <span className="date-chip__state">{open ? "Open" : "Full"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {fieldErrors.date && <p className="field__error">{fieldErrors.date}</p>}
        </fieldset>

        <fieldset className="field fieldset">
          <legend className="field__label" id={`${uid}-time`} tabIndex={-1}>
            Time{date && <span className="caption" style={{ fontWeight: 400 }}> - {formatDateLong(date)}</span>}
          </legend>
          {!days ? (
            <div className="skeleton" aria-label="Loading times" />
          ) : !date ? (
            <p className="caption">Choose a date to see open times.</p>
          ) : groupedSlots.length === 0 ? (
            <p className="caption">No open times on this day. Please pick another date.</p>
          ) : (
            groupedSlots.map(([period, slots]) => (
              <div className="slot-group" key={period}>
                <p className="slot-group__label">{period}</p>
                <ul className="slot-grid">
                  {slots.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="slot"
                        aria-pressed={time === s}
                        onClick={() => {
                          setTime(s);
                          setFieldErrors((f) => ({ ...f, time: undefined }));
                        }}
                      >
                        {formatTime12(s)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          {fieldErrors.time && <p className="field__error">{fieldErrors.time}</p>}
        </fieldset>

        <div className="fee-line" id={`${uid}-fee`}>
          <div>
            <strong>Consultation fee</strong>
            <p>Pay online to confirm your slot. No hidden charges.</p>
          </div>
          <span className="fee-line__amount">{fee}</span>
        </div>

        {formError && (
          <div className="notice notice--error" role="alert"><p>{formError}</p></div>
        )}
        {info && (
          <div className="notice" role="status"><p>{info}</p></div>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy || !config || paymentsOff}>
          {busy ? "Please wait…" : `Proceed to Payment (${fee})`}
        </button>
        <p className="caption" style={{ textAlign: "center", marginTop: 12 }}>
          Secure payment by Razorpay: UPI, cards and netbanking. Any treatment cost is explained and agreed before it starts.
        </p>
      </form>
    </div>
  );
}

function FallbackContact() {
  return (
    <div className="confirm__actions" style={{ justifyContent: "flex-start" }}>
      <a className="btn btn--primary btn--small" href={`tel:${clinic.phoneE164}`}><PhoneIcon size={18} />Call {clinic.phoneDisplay}</a>
      <a className="btn btn--whatsapp btn--small" href={whatsappLink("Hello, I'd like to book an appointment.")} target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon size={18} />WhatsApp
      </a>
    </div>
  );
}

function ConfirmationView({
  confirmation,
  rootRef,
  onDone,
}: {
  confirmation: Confirmation;
  rootRef: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
}) {
  const { appointment: a, outcome } = confirmation;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const address = `${clinic.address.street}, ${clinic.address.city}, ${clinic.address.state} ${clinic.address.postalCode}`;
  const event = {
    date: a.date,
    time: a.time,
    title: `Dental appointment - ${clinic.name}`,
    details: `${a.service}\nPhone: ${clinic.phoneDisplay}\nDirections: ${clinic.mapsUrl}`,
    location: address,
  };
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFile({ ...event, uid: `${a.paymentId ?? a.date + a.time}@somsdentalcare` }))}`;

  if (outcome === "paid_but_slot_lost") {
    return (
      <div className="card booking confirm" data-integration="booking-api" ref={rootRef}>
        <h3 ref={headingRef} tabIndex={-1}>We received your payment, but that slot was taken</h3>
        <p>
          Your payment reached us after the 30-minute hold on your slot ran out, and another patient booked it in the meantime.
          Don't worry - your payment is safe. Please call or WhatsApp us and we'll give you another time or refund you in full.
        </p>
        {a.paymentId && <p className="caption">Payment reference: {a.paymentId}</p>}
        <FallbackContact />
      </div>
    );
  }

  return (
    <div className="card booking confirm" data-integration="booking-api" ref={rootRef}>
      <span className="confirm__icon"><CheckIcon size={32} /></span>
      <h3 ref={headingRef} tabIndex={-1}>Your appointment is confirmed</h3>
      <p>Thank you. We look forward to seeing you. Please arrive about 10 minutes early.</p>
      <dl>
        <dt>Date</dt><dd>{formatDateLong(a.date)}</dd>
        <dt>Time</dt><dd>{formatTime12(a.time)}</dd>
        <dt>Service</dt><dd>{a.service}</dd>
        <dt>Paid</dt><dd>{formatRupees(a.amountPaise)}</dd>
        {a.paymentId && (<><dt>Reference</dt><dd>{a.paymentId}</dd></>)}
      </dl>
      <div className="confirm__actions">
        <a className="btn btn--primary btn--small" href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
          <CalendarIcon size={18} />Save to Google Calendar
        </a>
        <a className="btn btn--outline btn--small" href={icsHref} download="soms-dental-appointment.ics">Download .ics</a>
        <a className="btn btn--outline btn--small" href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Directions</a>
      </div>
      <p className="caption" style={{ marginTop: 24 }}>
        Need to change the time? Call or WhatsApp {clinic.phoneDisplay}.{" "}
        <button type="button" className="btn btn--small" style={{ minHeight: 0, padding: 0, color: "var(--medical)", background: "none", textDecoration: "underline" }} onClick={onDone}>
          Book another appointment
        </button>
      </p>
    </div>
  );
}
