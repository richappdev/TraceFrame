import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = "AniPins — anime pilgrimage trip planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(145deg, #121826 0%, #1e293b 45%, #0f172a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "#f07167",
              boxShadow: "0 0 0 6px rgba(240,113,103,0.25)",
            }}
          />
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 4 }}>{SITE_NAME.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.15 }}>
            From watchlist to waypoints.
          </div>
          <div style={{ fontSize: 30, color: "#94a3b8", lineHeight: 1.4 }}>
            Plan 1–3 day anime pilgrimage trips from Bangumi favorites and Anitabi maps.
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#64748b", letterSpacing: 1 }}>
          antiable-anipin.web.app
        </div>
      </div>
    ),
    { ...size },
  );
}
