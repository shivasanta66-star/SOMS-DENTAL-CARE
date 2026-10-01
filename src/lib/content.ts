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
  { title: "Numbed before we begin", text: "Local anaesthetic first, and we stop the moment you ask." },
  { title: "Sterilised between patients", text: "Instruments are autoclaved; gloves and masks are single-use." },
  { title: "Cost before treatment", text: "You hear the price of each option before you agree to one." },
  { title: "Explained in plain words", text: "What is wrong, what it needs, and what happens if you wait." },
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
  { title: "Gentler than expected", text: "Patients say even the treatments they dreaded were far more comfortable than they feared." },
  { title: "Better equipped than expected", text: "The clean, modern clinic comes up again and again, with equipment many did not expect to find locally." },
  { title: "Fair, clear charges", text: "Reviewers mention affordable fees and knowing the cost before treatment began." },
  { title: "Time taken to explain", text: "A warm welcome, and a doctor who puts nervous patients at ease." },
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
    q: "How do I find the clinic?",
    a: [
      `We are on Jharigaon - Dhamnaguda Road, Arachitguda, Umerkote. Use the map below for directions, or call us and we will guide you in.`,
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
