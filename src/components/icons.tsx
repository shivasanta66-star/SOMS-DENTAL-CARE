// Simple line icons (24px grid, 1.75 stroke). Decorative by default.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const TOOTH = "M7.5 3C5 3 3.5 4.9 3.5 7.4c0 2.1.9 3.4 1.5 5.1.8 2.4.9 8.5 3.1 8.5 1.9 0 1.8-4.6 3.9-4.6s2 4.6 3.9 4.6c2.2 0 2.3-6.1 3.1-8.5.6-1.7 1.5-3 1.5-5.1C20.5 4.9 19 3 16.5 3c-1.9 0-2.8.9-4.5.9S9.4 3 7.5 3Z";

export const ToothIcon = (p: IconProps) => <Icon {...p}><path d={TOOTH} /></Icon>;
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></Icon>
);
export const WhatsAppIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.2l-4.7 1.3Z" /><path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.8-2.2-1-1 1a4.6 4.6 0 0 1-2.5-2.5l1-1-1-2.2L9 8.5Z" /></Icon>
);
export const InstagramIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></Icon>
);
export const MapPinIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>
);
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;

/** Star glyph: full, half or empty. Decorative - pair with a text rating. */
export function Star({ fill, size = 22 }: { fill: "full" | "half" | "empty"; size?: number }) {
  const id = `half-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {fill === "half" && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z"
        fill={fill === "full" ? "currentColor" : fill === "half" ? `url(#${id})` : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
