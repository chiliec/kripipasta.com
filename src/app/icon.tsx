import { ImageResponse } from "next/og";

// Generated favicon: a crimson "K" wordmark initial on the brand-dark chip.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0E0E10",
          color: "#CA6E6A",
          fontSize: 24,
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
