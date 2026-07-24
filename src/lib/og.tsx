import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Standard OpenGraph / Twitter card canvas.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// PT Serif ships full Cyrillic — required so Russian titles don't render as
// tofu. The TTFs are committed under public/fonts and copied into the
// standalone image (Dockerfile `COPY /app/public`), so this fs read works at
// runtime without any network fetch.
function loadFont(file: string) {
  return readFile(join(process.cwd(), "public", "fonts", file));
}

function titleSize(title: string): number {
  if (title.length > 70) return 52;
  if (title.length > 45) return 64;
  if (title.length > 25) return 78;
  return 92;
}

/** Render a branded 1200×630 OG card. Text may include user-submitted titles. */
export async function renderOgImage({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}): Promise<ImageResponse> {
  const [bold, regular] = await Promise.all([
    loadFont("PTSerif-Bold.ttf"),
    loadFont("PTSerif-Regular.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(120% 120% at 0% 0%, #1A1A20 0%, #0E0E10 55%)",
          padding: "72px 80px",
          borderTop: "8px solid #B85450",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              background: "#CA6E6A",
            }}
          />
          <div
            style={{
              fontFamily: "PT Serif",
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#CA6E6A",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "PT Serif",
            fontWeight: 700,
            fontSize: titleSize(title),
            lineHeight: 1.05,
            color: "#ECECEF",
            // Clamp very long titles so they never overflow the canvas.
            overflow: "hidden",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "PT Serif",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: 4,
              color: "#ECECEF",
            }}
          >
            KRIPIPASTA
          </div>
          {meta ? (
            <div
              style={{
                fontFamily: "PT Serif",
                fontSize: 24,
                color: "rgba(236,236,239,0.55)",
              }}
            >
              {meta}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "PT Serif", data: bold, weight: 700, style: "normal" },
        { name: "PT Serif", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
