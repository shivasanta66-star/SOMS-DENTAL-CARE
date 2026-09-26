// Marketing copy for the public site. Service names must match the `services`
// table exactly so "Book This" can pre-select the right option in the form.

export type ServiceIconKey = "checkup" | "rootCanal" | "braces" | "extraction" | "crown" | "implant" | "smile";

export const services: { name: string; description: string; icon: ServiceIconKey }[] = [
  { name: "General Checkup & Cleaning", icon: "checkup", description: "A full check of your teeth and gums, and a gentle clean to remove stains and tartar." },
  { name: "Root Canal Treatment", icon: "rootCanal", description: "Saves an infected or badly decayed tooth, done under local anaesthetic so you stay comfortable." },
  { name: "Braces & Orthodontics", icon: "braces", description: "Straightens crowded or gapped teeth, with a clear plan and timeline before you start." },
  { name: "Tooth Extraction (incl. wisdom teeth)", icon: "extraction", description: "Careful removal of a tooth that can't be saved, including painful wisdom teeth." },
  { name: "Crowns & Caps", icon: "crown", description: "Covers and protects a weak or broken tooth so you can chew normally again." },
  { name: "Dental Implants", icon: "implant", description: "A fixed, natural-looking replacement for a missing tooth that doesn't rely on its neighbours." },
  { name: "Cosmetic / Smile Treatments", icon: "smile", description: "Whitening, reshaping and small repairs for a smile you feel good about." },
];

export const trustPoints = [
  { title: "Painless & Gentle Treatment", text: "We numb the area properly and go at your pace.", icon: "heart" },
  { title: "Advanced Facility & Equipment", text: "Modern equipment and strict sterilisation for every patient.", icon: "shield" },
  { title: "Transparent Pricing", text: "No hidden charges. You'll know the cost before we begin.", icon: "rupee" },
  { title: "Experienced, Friendly Care", text: "A doctor who listens, explains, and answers every question.", icon: "user" },
] as const;

export const facilityPhotos = [
  { title: "Treatment chair", detail: "The dental chair and overhead light", illustration: "chair" },
  { title: "Sterilisation area", detail: "The autoclave and sealed instrument pouches", illustration: "sterilisation" },
  { title: "Dental X-ray", detail: "The X-ray unit and viewer", illustration: "xray" },
  { title: "Waiting area", detail: "Reception and waiting seats", illustration: "waiting" },
] as const;

// Summaries of what patients mention most in the clinic's Google reviews.
// Not quotes, and not attributed to anyone.
export const reviewHighlights = [
  { title: "Painless treatment", text: "Patients often say their treatment was far gentler than they expected, even for procedures they were worried about." },
  { title: "Advanced facility", text: "The clean, well-equipped clinic comes up again and again, with modern equipment many didn't expect to find locally." },
  { title: "Affordable cost", text: "Reviewers mention fair, affordable charges, and knowing the cost clearly before treatment began." },
  { title: "Friendly staff", text: "People describe a warm welcome and a doctor who takes time to explain things and put nervous patients at ease." },
];

export const faqs: { q: string; a: string[] }[] = [
  {
    q: "Will treatment hurt?",
    a: [
      "Most treatments are done after numbing the area with a local anaesthetic, so you should feel pressure rather than pain.",
      "If anything feels uncomfortable, raise your hand and we'll stop straight away. You're always in control, and nothing starts until you've agreed to it.",
    ],
  },
  {
    q: "What should I bring to my first visit?",
    a: [
      "Bring any old dental X-rays or reports you have, and a list of medicines you take. Please tell us if you have diabetes, high blood pressure, a heart condition, or are pregnant.",
      "Keep your booking confirmation on your phone. Try to arrive about 10 minutes early.",
    ],
  },
  {
    q: "Do you accept online payment?",
    a: [
      "Yes. When you book online you pay the consultation fee by UPI, debit or credit card, or netbanking through Razorpay, a secure Indian payment service. Paying confirms your time slot.",
      "For any treatment after the consultation, the doctor will explain the cost first. Nothing is added without your agreement.",
    ],
  },
  {
    q: "Can I reschedule my appointment?",
    a: [
      "Yes. Call or WhatsApp us as early as you can with your name and booking time, and we'll find you another slot that suits you.",
    ],
  },
  {
    q: "Is there parking?",
    a: [
      "[Parking details to be confirmed by the clinic.] For directions, use the map below or call us and we'll guide you.",
    ],
  },
];

export const navLinks = [
  { href: "#doctor", label: "Our Doctor" },
  { href: "#services", label: "Services" },
  { href: "#facility", label: "Facility" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
  { href: "#visit", label: "Visit Us" },
];
