import { db, must } from "./db";

export const DEFAULT_FEE_PAISE = 20000;

export async function getConsultationFeePaise() {
  const row = must(await db().from("settings").select("value").eq("key", "consultation_fee_paise").maybeSingle()) as { value: string } | null;
  const fee = Number(row?.value);
  return Number.isInteger(fee) && fee >= 100 ? fee : DEFAULT_FEE_PAISE;
}

export async function setConsultationFeePaise(paise: number) {
  must(await db().from("settings").upsert({ key: "consultation_fee_paise", value: String(paise) }, { onConflict: "key" }));
}
