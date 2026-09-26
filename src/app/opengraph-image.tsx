import { ImageResponse } from "next/og";

export const alt = "SOMS Dental Care - Gentle, modern dental care in Umerkote";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(160deg, #E8F4F5 0%, #FFFFFF 70%)",
          color: "#113B4C",
        }}
      >
        <div style={{ fontSize: 30, color: "#1A5F7A", fontWeight: 600, marginBottom: 24 }}>Umerkote, Nabarangpur, Odisha</div>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.1 }}>SOMS Dental Care</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#1B2A2F" }}>Gentle, modern dental care</div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 30, color: "#FFFFFF", background: "#1A5F7A", padding: "16px 36px", borderRadius: 999, alignSelf: "flex-start" }}>
          Book online · Open daily 10 AM - 8 PM
        </div>
      </div>
    ),
    size,
  );
}
