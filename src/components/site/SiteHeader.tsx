"use client";

import { useEffect, useState } from "react";
import { clinic } from "@/lib/clinic";
import { navLinks } from "@/lib/content";
import { CloseIcon, MenuIcon, ToothIcon } from "../icons";

export function SiteHeader() {
  // The header's "Book Appointment" button appears once the hero (which has
  // its own big button) has scrolled out of view.
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero || !("IntersectionObserver" in window)) {
      setPastHero(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#top" className="brand" aria-label={`${clinic.name}, back to top`}>
          <span className="brand__mark"><ToothIcon size={20} /></span>
          {clinic.name}
        </a>
        <nav className="site-nav" aria-label="Main">
          <ul>
            {navLinks.map((l) => (
              <li key={l.href}><a href={l.href}>{l.label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="header-actions">
          <a href={`tel:${clinic.phoneE164}`} className="header-phone">{clinic.phoneDisplay}</a>
          <a href="#book" className="btn btn--primary btn--small header-book" data-hidden={!pastHero} tabIndex={pastHero ? 0 : -1} aria-hidden={!pastHero}>
            Book Appointment
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Main">
          <ul className="container">
            {navLinks.map((l) => (
              <li key={l.href}><a href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a></li>
            ))}
            <li><a href="#book" onClick={() => setMenuOpen(false)}>Book Appointment</a></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
