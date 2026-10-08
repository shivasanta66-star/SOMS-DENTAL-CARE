// Marketing copy for the public site. Service names must match the `services`
// table exactly so "Book This" can pre-select the right option in the form.

export const services: { name: string; description: string }[] = [
  { name: "General Checkup & Cleaning", description: "A full check of your teeth and gums, and a gentle clean to remove stains and tartar." },
  { name: "Root Canal Treatment", description: "Saves an infected or badly decayed tooth, done under local anaesthetic so you stay comfortable." },
  { name: "Braces & Orthodontics", description: "For crooked, crowded or gapped teeth. You get the plan and a rough timeline before you commit." },
  { name: "Tooth Extraction (incl. wisdom teeth)", description: "Careful removal of a tooth that can't be saved, including painful wisdom teeth." },
  { name: "Crowns & Caps", description: "Covers and protects a weak or broken tooth so you can chew normally again." },
  { name: "Dental Implants", description: "A fixed, natural-looking replacement for a missing tooth that doesn't rely on its neighbours." },
  { name: "Cosmetic / Smile Treatments", description: "Whitening, fixing chipped edges, closing small gaps." },
];

export const facilityPhotos = [
  { title: "The treatment chair", detail: "The dental chair and overhead light", illustration: "chair" },
  { title: "Sterilisation", detail: "Instruments go through the autoclave after every patient and come out in sealed pouches", illustration: "sterilisation" },
  { title: "X-ray", detail: "The X-ray unit, so you don't have to go elsewhere for one", illustration: "xray" },
  { title: "Waiting area", detail: "Reception and waiting seats", illustration: "waiting" },
] as const;

export const faqs: { q: string; a: string[] }[] = [
  {
    q: "Will treatment hurt?",
    a: [
      "Most treatments are done after numbing the area with a local anaesthetic, so you should feel pressure rather than pain.",
      "If anything feels uncomfortable, raise your hand and we'll stop straight away. Nothing starts until you've said yes to it.",
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
      "We're on Jharigaon - Dhamnaguda Road in Arachitguda, Umerkote. The map below has directions. If you get lost, call us and we'll talk you in.",
    ],
  },
];

export const navLinks = [
  { href: "#doctor", label: "Doctor" },
  { href: "#services", label: "Services" },
  { href: "#facility", label: "Clinic" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
  { href: "#visit", label: "Find us" },
];
