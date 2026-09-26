// Single source of truth for the clinic's public details.
// Every value marked "DUMMY - confirm" must be checked with the clinic before launch.

export const clinic = {
  name: "SOMS Dental Care",
  tagline: "Gentle, modern dental care in Umerkote",
  locality: "Jharigaon - Umerkote",
  address: {
    street: "Jharigaon - Dhamnaguda Rd, Arachitguda",
    city: "Umerkote",
    district: "Nabarangpur",
    state: "Odisha",
    postalCode: "764073",
    country: "IN",
  },
  phoneDisplay: "070773 76464",
  phoneE164: "+917077376464",
  // DUMMY - confirm this is the WhatsApp number.
  whatsappE164: "917077376464",
  // DUMMY - confirm real handle.
  instagramUrl: "https://instagram.com/somsdentalcare",
  instagramHandle: "@somsdentalcare",
  mapsUrl: "https://maps.app.goo.gl/mcUPukq2ub2TsLaR6",
  mapsEmbedQuery: "SOMS Dental Care, Jharigaon - Dhamnaguda Rd, Umerkote, Odisha 764073",
  // Exact clinic coordinates are not confirmed yet. Add { latitude, longitude }
  // here and they will be included in the JSON-LD schema automatically.
  geo: null as { latitude: number; longitude: number } | null,
  doctor: {
    // DUMMY - confirm full name and qualification.
    name: "Dr. Soumya Ranjan Sahu",
    shortName: "Dr. Soumya",
    qualification: "BDS",
    // DUMMY - confirm year.
    practiceSince: 2015,
  },
  // The verified Google rating. Display exactly - do not round.
  googleRating: { value: 4.5, count: 12 },
} as const;

export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// Used only if the database cannot be reached when the page is rendered.
export const fallbackHours = weekdayNames.map((_, weekday) => ({
  weekday,
  opensAt: "10:00",
  closesAt: "20:00",
  isClosed: false,
}));

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${clinic.whatsappE164}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
