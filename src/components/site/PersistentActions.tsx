"use client";

import { useEffect, useState } from "react";
import { clinic, whatsappGreeting, whatsappLink } from "@/lib/clinic";
import { CalendarIcon, PhoneIcon, WhatsAppIcon } from "../icons";

/** Mobile: bottom bar with Call / WhatsApp / Book Now. Desktop: floating WhatsApp button. */
export function PersistentActions() {
  // The bar's "Book Now" is pointless while the booking form is already on screen,
  // and the bar would cover the form's own buttons.
  const [inBooking, setInBooking] = useState(false);
  useEffect(() => {
    const el = document.getElementById("book");
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInBooking(e.isIntersecting), { rootMargin: "-25% 0px -25% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <nav className="mobile-bar" aria-label="Quick actions" data-hidden={inBooking}>
        <a href={`tel:${clinic.phoneE164}`} className="btn btn--outline"><PhoneIcon size={18} />Call</a>
        <a href={whatsappLink(whatsappGreeting)} className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} />WhatsApp</a>
        <a href="#book" className="btn btn--primary"><CalendarIcon size={18} />Book Now</a>
      </nav>
      <a href={whatsappLink(whatsappGreeting)} className="btn btn--whatsapp wa-float" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        <WhatsAppIcon size={20} />WhatsApp
      </a>
    </>
  );
}
