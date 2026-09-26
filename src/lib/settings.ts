import "server-only";
import { query } from "./db";

export const DEFAULT_FEE_PAISE = 20000;

export async function getConsultationFeePaise() {
  const { rows } = await query<{ value: string }>("SELECT value FROM settings WHERE key = 'consultation_fee_paise'");
  const fee = Number(rows[0]?.value);
  return Number.isInteger(fee) && fee >= 100 ? fee : DEFAULT_FEE_PAISE;
}

export async function setConsultationFeePaise(paise: number) {
  await query(
    `INSERT INTO settings (key, value) VALUES ('consultation_fee_paise', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(paise)],
  );
}
