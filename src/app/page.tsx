import type { CSSProperties } from "react";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { ClockIcon, InstagramIcon, MapPinIcon, PhoneIcon, Star, WhatsAppIcon } from "@/components/icons";
import { BookThisButton } from "@/components/site/BookThisButton";
import { ClinicIllustration } from "@/components/site/Illustrations";
import { PersistentActions } from "@/components/site/PersistentActions";
import { SiteHeader } from "@/components/site/SiteHeader";
import { clinic, whatsappLink, whatsappGreeting as waText } from "@/lib/clinic";
import { facilityPhotos, faqs, navLinks, reviewHighlights, services, trustPoints } from "@/lib/content";
import { HoursProvider, HoursSummary, HoursTable, TodayHours, type PublicHours } from "@/components/site/LiveHours";
import { getPublicHoursOrFallback } from "../../netlify/lib/hours";

// Static page, built with the opening hours in Supabase at deploy time. The
// hours sections refresh themselves from /api/hours in the browser.


function jsonLd(hours: PublicHours) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000";
  const schemaDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: clinic.name,
    description: `${clinic.tagline}. Dental clinic in Umerkote, Nabarangpur district, Odisha.`,
    url: siteUrl,
    telephone: clinic.phoneE164,
    medicalSpecialty: "Dentistry",
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address.street,
      addressLocality: clinic.address.city,
      addressRegion: clinic.address.state,
      postalCode: clinic.address.postalCode,
      addressCountry: clinic.address.country,
    },
    ...(clinic.geo ? { geo: { "@type": "GeoCoordinates", ...clinic.geo } } : {}),
    hasMap: clinic.mapsUrl,
    openingHoursSpecification: hours
      .filter((h) => !h.isClosed)
      .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: schemaDays[h.weekday], opens: h.opensAt, closes: h.closesAt })),
    aggregateRating: { "@type": "AggregateRating", ratingValue: clinic.googleRating.value, reviewCount: clinic.googleRating.count, bestRating: 5 },
    sameAs: [clinic.instagramUrl, clinic.mapsUrl],
  };
}

function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} fill={value >= i ? "full" : value >= i - 0.5 ? "half" : "empty"} />
      ))}
    </span>
  );
}

export default async function HomePage() {
  const hours = await getPublicHoursOrFallback();
  const fullAddress = `${clinic.address.street}, ${clinic.address.city}, ${clinic.address.district} District, ${clinic.address.state} ${clinic.address.postalCode}`;

  return (
    <HoursProvider initial={hours}>
      <a href="#main" className="skip-link">Skip to content</a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(hours)).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      <main id="main">
        {/* 1. Hero */}
        <section id="top" className="hero" aria-labelledby="hero-title">
          <div className="container grid">
            <div className="hero__inner">
              <span className="eyebrow">Dental clinic · {clinic.address.city}</span>
              <h1 id="hero-title">Gentle dental care, with the cost explained first.</h1>
              <p className="hero__promise">
                Choose a time that suits you, pay the consultation fee online, and sit down with a doctor who tells you what is
                wrong and what each option costs before anything begins.
              </p>
              <div className="hero__actions">
                <a href="#book" className="btn btn--primary">Book Appointment</a>
                <a href={`tel:${clinic.phoneE164}`} className="btn btn--outline"><PhoneIcon size={18} />Call Now</a>
              </div>
              <p className="hero__alt">
                Prefer to chat first?{" "}
                <a href={whatsappLink(waText)} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
                {" · "}
                <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Get directions</a>
              </p>
            </div>
            <aside className="hero__card" aria-label="Clinic at a glance">
              <TodayHours />
              <dl className="hero__facts">
                <div><dt>Google rating</dt><dd><Star fill="full" size={16} /> {clinic.googleRating.value} <span>({clinic.googleRating.count} reviews)</span></dd></div>
                <div><dt>Where</dt><dd><a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">{clinic.address.street}, {clinic.address.city}</a></dd></div>
                <div><dt>Phone</dt><dd><a href={`tel:${clinic.phoneE164}`}>{clinic.phoneDisplay}</a></dd></div>
              </dl>
            </aside>
          </div>
        </section>

        {/* 2. Trust strip: plain statements, no cards */}
        <section className="trust" aria-label="How we work">
          <div className="container">
            <ul className="trust__list">
              {trustPoints.map((t) => (
                <li key={t.title}>
                  <h2>{t.title}</h2>
                  <p>{t.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. Meet the doctor */}
        <section id="doctor" className="section" aria-labelledby="doctor-title">
          <div className="container grid">
            <div className="doctor__photo">
              <ClinicIllustration kind="doctor" portrait label={`Illustration of ${clinic.doctor.shortName} at ${clinic.name}.`} />
            </div>
            <div className="doctor__body">
              <span className="eyebrow">Meet your doctor</span>
              <h2 id="doctor-title">{clinic.doctor.name}</h2>
              <ul className="doctor__creds">
                <li>{clinic.doctor.qualification}</li>
              </ul>
              <p>
                At SOMS Dental Care, a visit starts with a conversation. Before any treatment you'll hear what's wrong, what your
                options are, and what each one costs, in plain words.
              </p>
              <p>
                If you're nervous, just say so. We'll go slowly, explain each step as we go, and you can ask us to pause at any time.
              </p>
              <a href="#book" className="btn btn--primary">Book with {clinic.doctor.shortName}</a>
            </div>
          </div>
        </section>

        {/* 4. Services */}
        <section id="services" className="section section--mint" aria-labelledby="services-title">
          <div className="container grid">
            <div className="services__head">
              <h2 id="services-title">What we treat</h2>
              <p>From a routine check-up to replacing a missing tooth. Choose a treatment and the booking form opens with it selected.</p>
            </div>
            <ol className="services__list">
              {services.map((s, i) => (
                <li key={s.name} className="service">
                  <span className="service__no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <div className="service__text">
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                  </div>
                  <BookThisButton service={s.name} />
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 8. Book appointment */}
        <section id="book" className="section" aria-labelledby="book-title">
          <div className="container booking-wrap">
            <div className="section-head">
              <h2 id="book-title">Book your appointment</h2>
              <p>Pick a service and an open slot, then pay the consultation fee online to confirm. About two minutes.</p>
            </div>
            <BookingWidget />
          </div>
        </section>

        {/* 5. Our facility */}
        <section id="facility" className="section section--mint" aria-labelledby="facility-title">
          <div className="container">
            <div className="section-head">
              <h2 id="facility-title">Where you will be treated</h2>
              <p>Chair, sterilisation, X-ray and reception, all under one roof.</p>
            </div>
            <ul className="grid facility__photos">
              {facilityPhotos.map((p) => (
                <li key={p.title}>
                  <figure style={{ margin: 0 }}>
                    <ClinicIllustration kind={p.illustration} label={`Illustration: ${p.detail} at ${clinic.name}.`} />
                    <figcaption>{p.title}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>          </div>
        </section>

        {/* 6. Patient reviews */}
        <section id="reviews" className="section section--deep" aria-labelledby="reviews-title">
          <div className="container grid">
            <div className="reviews__head">
              <h2 id="reviews-title">What patients mention</h2>
              <div className="rating">
                <span className="rating__score">{clinic.googleRating.value}</span>
                <Stars value={clinic.googleRating.value} />
              </div>
              <p className="rating__count">
                <span className="sr-only">{clinic.googleRating.value} out of 5 stars, </span>
                from {clinic.googleRating.count} Google reviews
              </p>
              <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Read all reviews on Google</a>
            </div>
            <dl className="reviews__list">
              {reviewHighlights.map((r) => (
                <div key={r.title}>
                  <dt>{r.title}</dt>
                  <dd>{r.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 7. FAQ */}
        <section id="faq" className="section" aria-labelledby="faq-title">
          <div className="container">
            <div className="section-head">
              <h2 id="faq-title">Before your first visit</h2>
            </div>
            <div className="faq">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <div className="faq__answer">
                    {f.a.map((para) => <p key={para}>{para}</p>)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Map, hours, contact */}
        <section id="visit" className="section section--mint" aria-labelledby="visit-title">
          <div className="container">
            <div className="section-head">
              <h2 id="visit-title">Find the clinic</h2>
            </div>
            <div className="grid">
              <div className="visit__map">
                <iframe
                  title={`Map showing ${clinic.name}`}
                  src={clinic.mapsEmbedUrl}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <div className="visit__info">
                <div className="visit__actions">
                  <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary"><MapPinIcon size={18} />Get directions</a>
                  <a href={`tel:${clinic.phoneE164}`} className="btn btn--outline"><PhoneIcon size={18} />Call</a>
                  <a href={whatsappLink(waText)} target="_blank" rel="noopener noreferrer" className="btn btn--whatsapp"><WhatsAppIcon size={18} />WhatsApp</a>
                </div>
                <h3>Opening hours (OPD)</h3>
                <HoursTable />

                <h3>Contact</h3>
                <ul className="contact-list">
                  <li>
                    <MapPinIcon />
                    <span>
                      {fullAddress}
                      <br />
                      <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Get directions</a>
                    </span>
                  </li>
                  <li><PhoneIcon /><a href={`tel:${clinic.phoneE164}`}>{clinic.phoneDisplay}</a></li>
                  <li><WhatsAppIcon /><a href={whatsappLink(waText)} target="_blank" rel="noopener noreferrer">WhatsApp {clinic.phoneDisplay}</a></li>
                  <li><InstagramIcon /><a href={clinic.instagramUrl} target="_blank" rel="noopener noreferrer">{clinic.instagramHandle}</a></li>
                </ul>
                <p>
                  Dental emergency, like severe toothache or swelling?{" "}
                  <a className="emergency" href={`tel:${clinic.phoneE164}`}>Call {clinic.phoneDisplay}</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__cols">
            <div>
              <h2>{clinic.name}</h2>
              <p>{clinic.tagline}.</p>
              <address style={{ fontStyle: "normal" }}>{fullAddress}</address>
            </div>
            <nav aria-label="Footer">
              <h2>Explore</h2>
              <ul>
                {navLinks.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
                <li><a href="#book">Book Appointment</a></li>
              </ul>
            </nav>
            <div>
              <h2>Get in touch</h2>
              <ul>
                <li><a href={`tel:${clinic.phoneE164}`}>{clinic.phoneDisplay}</a></li>
                <li><a href={whatsappLink(waText)} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
                <li><a href={clinic.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></li>
                <li><a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps</a></li>
              </ul>
            </div>
          </div>
          <p className="site-footer__legal">© {new Date().getFullYear()} {clinic.name}. <HoursSummary />.</p>
        </div>
      </footer>

      <PersistentActions />
    </HoursProvider>
  );
}
