import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(120% 120% at 0% 0%, #1A1A20 0%, #0E0E10 60%)",
          color: "#CA6E6A",
          fontSize: 120,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        K
      </div>
    ),
    size,
  );
}
