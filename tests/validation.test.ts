import { describe, expect, it } from "vitest";
import { maskPhone, normaliseIndianMobile, normalisePatientName } from "@/lib/validation";
import { isIsoDate, isHhmm, formatTime12, formatRupees } from "@/lib/time";

describe("normaliseIndianMobile", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["98765 43210", "9876543210"],
    ["+91 98765-43210", "9876543210"],
    ["919876543210", "9876543210"],
    ["09876543210", "9876543210"],
  ])("accepts %s", (input, expected) => expect(normaliseIndianMobile(input)).toBe(expected));

  it.each(["5876543210", "987654321", "98765432100", "abcdefghij", ""])("rejects %s", (input) => {
    expect(normaliseIndianMobile(input)).toBeNull();
  });
});

describe("normalisePatientName", () => {
  it("accepts names in Latin and Odia script and tidies spacing", () => {
    expect(normalisePatientName("  Ramesh   Kumar ")).toBe("Ramesh Kumar");
    expect(normalisePatientName("ରମେଶ କୁମାର")).toBe("ରମେଶ କୁମାର");
    expect(normalisePatientName("D'Souza-Patra")).toBe("D'Souza-Patra");
  });
  it("rejects empty, too-short and markup input", () => {
    expect(normalisePatientName("A")).toBeNull();
    expect(normalisePatientName("<script>")).toBeNull();
    expect(normalisePatientName(42)).toBeNull();
  });
});

describe("helpers", () => {
  it("masks phone numbers for logs", () => expect(maskPhone("9876543210")).toBe("******3210"));
  it("validates dates and times", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isHhmm("19:30")).toBe(true);
    expect(isHhmm("24:00")).toBe(false);
  });
  it("formats for display", () => {
    expect(formatTime12("00:30")).toBe("12:30 AM");
    expect(formatTime12("12:00")).toBe("12:00 PM");
    expect(formatTime12("19:30")).toBe("7:30 PM");
    expect(formatRupees(20000)).toBe("₹200");
    expect(formatRupees(25050)).toBe("₹250.50");
  });
});
