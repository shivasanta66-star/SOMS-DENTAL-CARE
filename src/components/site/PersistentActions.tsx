import { clinic, whatsappLink } from "@/lib/clinic";
import { CalendarIcon, PhoneIcon, WhatsAppIcon } from "../icons";

const waText = "Hello SOMS Dental Care, I'd like to ask about an appointment.";

/** Mobile: bottom bar with Call / WhatsApp / Book Now. Desktop: floating WhatsApp button. */
export function PersistentActions() {
  return (
    <>
      <nav className="mobile-bar" aria-label="Quick actions">
        <a href={`tel:${clinic.phoneE164}`} className="btn btn--outline"><PhoneIcon size={18} />Call</a>
        <a href={whatsappLink(waText)} className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} />WhatsApp</a>
        <a href="#book" className="btn btn--primary"><CalendarIcon size={18} />Book Now</a>
      </nav>
      <a href={whatsappLink(waText)} className="btn btn--whatsapp wa-float" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        <WhatsAppIcon size={20} />WhatsApp
      </a>
    </>
  );
}
