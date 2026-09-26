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
export const HeartIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></Icon>
);
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3 5 6v5.5c0 4.3 3 7.9 7 9.5 4-1.6 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Icon>
);
export const RupeeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M7 5h10M7 9h10M13 21 7 13h2.5a4 4 0 0 0 0-8" /></Icon>
);
export const UserCheckIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><path d="m16 11 2 2 4-4" /></Icon>
);
export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></Icon>
);
export const CheckupIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m21 21-5.5-5.5" /><path d="M8 10.5h5M10.5 8v5" /></Icon>
);
export const RootCanalIcon = (p: IconProps) => (
  <Icon {...p}><path d={TOOTH} /><path d="M12 7v6" /></Icon>
);
export const BracesIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="8" width="5" height="8" rx="1.5" /><rect x="9.5" y="8" width="5" height="8" rx="1.5" /><rect x="16" y="8" width="5" height="8" rx="1.5" /><path d="M2 12h20" /></Icon>
);
export const ExtractionIcon = (p: IconProps) => (
  <Icon {...p}><path d="M8.5 9C6.8 9 5.8 10.3 5.8 12c0 1.4.6 2.3 1 3.4.5 1.6.6 5.6 2.1 5.6 1.2 0 1.2-3 2.6-3s1.3 3 2.6 3c1.5 0 1.6-4 2.1-5.6.4-1.1 1-2 1-3.4 0-1.7-1-3-2.7-3-1.3 0-1.9.6-3 .6s-1.7-.6-3-.6Z" /><path d="M12 6V2M9.5 4 12 1.5 14.5 4" /></Icon>
);
export const CrownIcon = (p: IconProps) => (
  <Icon {...p}><path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z" /><path d="M5 21h14" /></Icon>
);
export const ImplantIcon = (p: IconProps) => (
  <Icon {...p}><path d="M7 3h10v4H7z" /><path d="M8 10h8M8.5 13h7M9 16h6M10 19h4M8 7l1 13h6l1-13" /></Icon>
);
export const SmileIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9.5h.01M15 9.5h.01" /></Icon>
);
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
export const CameraIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Icon>
);

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
