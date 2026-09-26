/** Accepts "98765 43210", "+91 98765-43210", "098765 43210"; returns "9876543210" or null. */
export function normaliseIndianMobile(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Letters in any script (so Odia names work), spaces, dots, apostrophes, hyphens. */
export function normalisePatientName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name) ? name : null;
}

/** For logs: "9876543210" -> "******3210". Never log a full phone number. */
export function maskPhone(phone: string) {
  return phone.length > 4 ? `${"*".repeat(phone.length - 4)}${phone.slice(-4)}` : "****";
}
