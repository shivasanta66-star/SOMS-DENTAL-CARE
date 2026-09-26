"use client";

export const SELECT_SERVICE_EVENT = "soms:select-service";

/** Scrolls to the booking form and pre-selects this service. Works as a plain link without JS. */
export function BookThisButton({ service }: { service: string }) {
  return (
    <a
      href="#book"
      className="btn btn--outline btn--small"
      aria-label={`Book ${service}`}
      onClick={() => window.dispatchEvent(new CustomEvent(SELECT_SERVICE_EVENT, { detail: service }))}
    >
      Book This
    </a>
  );
}
