import type { CSSProperties } from "react";
import { BookingWidget } from "@/components/booking/BookingWidget";
import {
  BracesIcon,
  CheckupIcon,
  ClockIcon,
  CrownIcon,
  ExtractionIcon,
  HeartIcon,
  ImplantIcon,
  InstagramIcon,
  MapPinIcon,
  PhoneIcon,
  RootCanalIcon,
  RupeeIcon,
  ShieldIcon,
  SmileIcon,
  Star,
  UserCheckIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { BookThisButton } from "@/components/site/BookThisButton";
import { ClinicIllustration } from "@/components/site/Illustrations";
import { PersistentActions } from "@/components/site/PersistentActions";
import { SiteHeader } from "@/components/site/SiteHeader";
import { clinic, weekdayNames, whatsappLink } from "@/lib/clinic";
import { facilityPhotos, faqs, navLinks, reviewHighlights, services, trustPoints, type ServiceIconKey } from "@/lib/content";
import { getPublicHours, type PublicHours } from "@/lib/hours";
import { formatTime12, istNow, weekdayOf } from "@/lib/time";

// Static page, refreshed every 5 minutes so opening hours edited in the admin
// panel show up without a redeploy.
export const revalidate = 300;

const serviceIcons: Record<ServiceIconKey, typeof CheckupIcon> = {
  checkup: CheckupIcon,
  rootCanal: RootCanalIcon,
  braces: BracesIcon,
  extraction: ExtractionIcon,
  crown: CrownIcon,
  implant: ImplantIcon,
  smile: SmileIcon,
};

const trustIcons = { heart: HeartIcon, shield: ShieldIcon, rupee: RupeeIcon, user: UserCheckIcon };

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
              <span className="eyebrow">Dental clinic in {clinic.locality}</span>
              <h1 id="hero-title">{clinic.name}</h1>
              <p className="hero__promise">
                <strong>{clinic.tagline}.</strong> Book a time that suits you, see the fee before you pay, and know the cost of any
                treatment before it starts.
              </p>
              <div className="hero__actions">
                <a href="#book" className="btn btn--primary">Book Appointment</a>
                <a href={`tel:${clinic.phoneE164}`} className="btn btn--outline"><PhoneIcon size={18} />Call Now</a>
              </div>
              <ul className="hero__meta">
                <li><ClockIcon size={18} />{hoursSummary(hours)}</li>
                <li><Star fill="full" size={16} />{clinic.googleRating.value} on Google ({clinic.googleRating.count} reviews)</li>
                <li><MapPinIcon size={18} />{clinic.address.city}, {clinic.address.district}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. Trust strip */}
        <section className="section trust" aria-label="Why patients choose us">
          <div className="container">
            <ul className="grid trust__list">
              {trustPoints.map((t) => {
                const Icon = trustIcons[t.icon];
                return (
                  <li key={t.title} className="card trust__item reveal" suppressHydrationWarning>
                    <span className="icon-badge"><Icon /></span>
                    <h3>{t.title}</h3>
                    <p>{t.text}</p>
                  </li>
                );
              })}
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
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Services</span>
              <h2 id="services-title">Treatments we offer</h2>
              <p>From a routine check-up to replacing a missing tooth. Pick a treatment to book a consultation for it.</p>
            </div>
            <ul className="grid services__list">
              {services.map((s) => {
                const Icon = serviceIcons[s.icon];
                return (
                  <li key={s.name} className="card service reveal" suppressHydrationWarning>
                    <span className="icon-badge"><Icon /></span>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <BookThisButton service={s.name} />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 5. Our facility */}
        <section id="facility" className="section" aria-labelledby="facility-title">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Our facility</span>
              <h2 id="facility-title">Clean, modern and carefully kept</h2>
              <p>The same standard of equipment and hygiene you'd expect in a bigger town, close to home.</p>
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
                <strong>Hygiene, every time.</strong> Instruments are cleaned and sterilised after every patient, and single-use items
                such as gloves, masks and suction tips are fresh for each person.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Patient reviews */}
        <section id="reviews" className="section section--mint" aria-labelledby="reviews-title">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Patient reviews</span>
              <h2 id="reviews-title">What our patients say</h2>
            </div>
            <div className="rating">
              <span className="rating__score">{clinic.googleRating.value}</span>
              <Stars value={clinic.googleRating.value} />
              <span className="rating__count">
                <span className="sr-only">{clinic.googleRating.value} out of 5 stars, </span>
                from {clinic.googleRating.count} Google reviews
              </span>
            </div>
            <p className="caption">What patients mention most often in their reviews:</p>
            <ul className="grid reviews__list">
              {reviewHighlights.map((r) => (
                <li key={r.title} className="card review reveal" suppressHydrationWarning>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 24 }}>
              <a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer">Read all reviews on Google</a>
            </p>
          </div>
        </section>

        {/* 7. FAQ */}
        <section id="faq" className="section" aria-labelledby="faq-title">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Questions</span>
              <h2 id="faq-title">Before your visit</h2>
              <p>Answers to what first-time patients ask us most.</p>
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
              <span className="eyebrow">Book appointment</span>
              <h2 id="book-title">Choose a time that suits you</h2>
              <p>Pick a service and an open slot, then pay the consultation fee online to confirm. It takes about two minutes.</p>
            </div>
            <BookingWidget />
          </div>
        </section>

        {/* 9. Map, hours, contact */}
        <section id="visit" className="section" aria-labelledby="visit-title">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Visit us</span>
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
                <table className="hours reveal" suppressHydrationWarning>
                  <caption className="sr-only">Opening hours by day</caption>
                  <tbody>
                    {WEEK_ORDER.map((wd, i) => {
                      const h = hours.find((x) => x.weekday === wd);
                      if (!h) return null;
                      return (
                        <tr key={wd} data-today={wd === today} data-closed={h.isClosed} style={{ "--i": i } as CSSProperties}>
                          <th scope="row"><span className="hours__dot" aria-hidden="true" />{weekdayNames[wd]}{wd === today && <span className="sr-only"> (today)</span>}</th>
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
