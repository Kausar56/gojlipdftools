import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered on demand by Next.js's Metadata API convention — this file being
// named `opengraph-image` at the root segment makes it the default social
// preview image for every route that doesn't define its own more specific one.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b1220",
          backgroundImage: "linear-gradient(135deg, #0b1220 0%, #10203a 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#2663bb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            G
          </div>
          <div style={{ fontSize: 88, fontWeight: 700, color: "#ffffff" }}>Gojli</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#94a3b8", display: "flex" }}>
          Merge, Split, Compress &amp; Convert PDFs — Free &amp; Browser-Based
        </div>
      </div>
    ),
    { ...size },
  );
}
