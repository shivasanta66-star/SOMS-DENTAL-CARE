import { BookingWidget } from "@/components/booking/BookingWidget";
import { ClockIcon, InstagramIcon, MapPinIcon, PhoneIcon, ShieldIcon, Star, WhatsAppIcon } from "@/components/icons";
import { BookThisButton } from "@/components/site/BookThisButton";
import { ClinicIllustration } from "@/components/site/Illustrations";
import { PersistentActions } from "@/components/site/PersistentActions";
import { SiteHeader } from "@/components/site/SiteHeader";
import { clinic, weekdayNames, whatsappLink } from "@/lib/clinic";
import { facilityPhotos, faqs, navLinks, reviewHighlights, services, trustPoints } from "@/lib/content";
import { getPublicHours, type PublicHours } from "@/lib/hours";
import { formatTime12, istNow, weekdayOf } from "@/lib/time";

// Static page, refreshed every 5 minutes so opening hours edited in the admin
// panel show up without a redeploy.
export const revalidate = 300;

// Monday first, as clinics usually list hours.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function hoursLabel(h: PublicHours[number]) {
  return h.isClosed ? "Closed" : `${formatTime12(h.opensAt)} - ${formatTime12(h.closesAt)}`;
}

function hoursSummary(hours: PublicHours) {
  const first = hours[0];
  const allSame = hours.every((h) => h.isClosed === first.isClosed && h.opensAt === first.opensAt && h.closesAt === first.closesAt);
  return allSame && !first.isClosed ? `Open every day, ${hoursLabel(first)}` : "See opening hours below";
}

function jsonLd(hours: PublicHours) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const schemaDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: clinic.name,
    description: `${clinic.tagline}. Dental clinic serving Umerkote and surrounding villages.`,
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
  const hours = await getPublicHours();
  const today = weekdayOf(istNow().date);
  const todayHours = hours.find((h) => h.weekday === today);
  const yearsNote = `In practice since ${clinic.doctor.practiceSince}`;
  const fullAddress = `${clinic.address.street}, ${clinic.address.city}, ${clinic.address.district} District, ${clinic.address.state} ${clinic.address.postalCode}`;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(hours)).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      <main id="main">
        {/* 1. Hero */}
        <section id="top" className="hero" aria-labelledby="hero-title">
          <div className="container grid">
            <div className="hero__inner">
              <span className="eyebrow">{clinic.name} · {clinic.locality}</span>
              <h1 id="hero-title">Gentle dental care, with the cost explained first.</h1>
              <p className="hero__promise">
                Choose a time that suits you, pay the consultation fee online, and sit down with a doctor who tells you what is
                wrong and what each option costs before anything begins.
              </p>
              <div className="hero__actions">
                <a href="#book" className="btn btn--primary">Book Appointment</a>
                <a href={`tel:${clinic.phoneE164}`} className="btn btn--outline"><PhoneIcon size={18} />Call Now</a>
              </div>
            </div>
            <aside className="hero__card" aria-label="Clinic at a glance">
              <p className="hero__card-label">Today · {weekdayNames[today]}</p>
              <p className="hero__card-hours">{todayHours ? hoursLabel(todayHours) : "Call to confirm"}</p>
              <dl className="hero__facts">
                <div><dt>Google rating</dt><dd><Star fill="full" size={16} /> {clinic.googleRating.value} <span>({clinic.googleRating.count} reviews)</span></dd></div>
                <div><dt>Where</dt><dd>{clinic.address.street}, {clinic.address.city}</dd></div>
                <div><dt>Call or WhatsApp</dt><dd>{clinic.phoneDisplay}</dd></div>
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
            <div className="doctor__photo reveal" suppressHydrationWarning>
              <ClinicIllustration kind="doctor" portrait label={`Illustration of ${clinic.doctor.shortName} at ${clinic.name}. A real photo will replace it.`} />
            </div>
            <div className="doctor__body reveal" suppressHydrationWarning>
              <span className="eyebrow">Meet your doctor</span>
              <h2 id="doctor-title">{clinic.doctor.name}</h2>
              <ul className="doctor__creds">
                <li>{clinic.doctor.qualification}</li>
                <li>{yearsNote}</li>
              </ul>
              <p>
                {clinic.doctor.shortName} believes a dental visit should never feel rushed or frightening. Before any treatment, you'll
                hear what's wrong, what your options are, and what each one costs, in plain words.
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

        {/* 5. Our facility */}
        <section id="facility" className="section" aria-labelledby="facility-title">
          <div className="container">
            <div className="section-head">
              <h2 id="facility-title">Where you will be treated</h2>
              <p>Chair, sterilisation, X-ray and reception, all under one roof.</p>
            </div>
            <ul className="grid facility__photos">
              {facilityPhotos.map((p) => (
                <li key={p.title} className="reveal" suppressHydrationWarning>
                  <figure style={{ margin: 0 }}>
                    <ClinicIllustration kind={p.illustration} label={`Illustration: ${p.detail} at ${clinic.name}. A real photo will replace it.`} />
                    <figcaption>{p.title}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            <div className="facility__note">
              <span className="icon-badge"><ShieldIcon /></span>
              <p>
                <strong>Sterilised between every patient.</strong> Instruments are cleaned and sterilised after each patient, and gloves, masks and suction tips are
                single-use.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Patient reviews */}
        <section id="reviews" className="section section--deep" aria-labelledby="reviews-title">
          <div className="container grid">
            <div className="reviews__head">
              <h2 id="reviews-title">What patients say</h2>
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

        {/* 8. Book appointment */}
        <section id="book" className="section section--mint" aria-labelledby="book-title">
          <div className="container booking-wrap">
            <div className="section-head">
              <h2 id="book-title">Book your appointment</h2>
              <p>Pick a service and an open slot, then pay the consultation fee online to confirm. About two minutes.</p>
            </div>
            <BookingWidget />
          </div>
        </section>

        {/* 9. Map, hours, contact */}
        <section id="visit" className="section" aria-labelledby="visit-title">
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
                <h3>Opening hours (OPD)</h3>
                <table className="hours">
                  <caption className="sr-only">Opening hours by day</caption>
                  <tbody>
                    {WEEK_ORDER.map((wd) => {
                      const h = hours.find((x) => x.weekday === wd);
                      if (!h) return null;
                      return (
                        <tr key={wd} data-today={wd === today}>
                          <th scope="row">{weekdayNames[wd]}{wd === today && <span className="sr-only"> (today)</span>}</th>
                          <td>{hoursLabel(h)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

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
                  <li><WhatsAppIcon /><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp {clinic.phoneDisplay}</a></li>
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
                <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
                <li><a href={clinic.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></li>
                <li><a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps</a></li>
              </ul>
            </div>
          </div>
          <p className="site-footer__legal">© {new Date().getFullYear()} {clinic.name}. {hoursSummary(hours)}.</p>
        </div>
      </footer>

      <PersistentActions />
    </>
  );
}
