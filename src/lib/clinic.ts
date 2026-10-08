// Single source of truth for the clinic's public details.
// Every value marked "DUMMY - confirm" must be checked with the clinic before launch.

export const clinic = {
  name: "SOMS Dental Care",
  tagline: "Dental clinic in Umerkote, Nabarangpur",
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
  // The clinic's own Google Maps embed (Google Maps > Share > Embed a map).
  mapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3574.1303099460406!2d82.36454897498959!3d19.533844381767274!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a2ff7f102b45ecf%3A0xcdb0121693d9bec5!2sSOMS%20DENTAL%20CARE!5e1!3m2!1sen!2sin!4v1790421216757!5m2!1sen!2sin",
  // Centre of the embed above, which Google centres on the clinic's listing.
  // Used in the JSON-LD schema; set to null to leave it out.
  geo: { latitude: 19.533844, longitude: 82.364549 } as { latitude: number; longitude: number } | null,
  doctor: {
    // DUMMY - confirm full name and qualification.
    name: "Dr. Soumya Ranjan Sahu",
    shortName: "Dr. Soumya",
    qualification: "BDS",
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

export const whatsappGreeting = "Hello SOMS Dental Care, I'd like to ask about an appointment.";

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${clinic.whatsappE164}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
