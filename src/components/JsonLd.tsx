// Renders a JSON-LD structured-data block. Fields may include user-submitted
// text (story titles/leads), so we escape "<" to < to prevent a
// "</script>" breakout — the classic JSON-in-script XSS vector.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
