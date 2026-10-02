import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Link } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Runner } from "@workspace/api-client-react";
import { MapPin, Timer, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveAvatarUrl } from "@/lib/avatar";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function createRunnerIcon(avatarUrl: string | null | undefined, gender: string | null | undefined, name: string) {
  const fallbackColor = gender?.toLowerCase() === "female" ? "#e85d7a" : "#3b6ef6";
  const initial = "";
  if (avatarUrl) {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 3px solid ${fallbackColor};
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          background: #f3f4f6;
        ">
          <img src="${escapeHtmlAttribute(avatarUrl)}" alt="${escapeHtmlAttribute(name)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />
        </div>
        <div style="
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${fallbackColor};
          margin: 0 auto;
        "></div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 52],
      popupAnchor: [0, -56],
    });
  }
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 38px; height: 38px;
        border-radius: 50%;
        background: ${fallbackColor};
        border: 3px solid white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        color: white; font-weight: bold; font-size: 14px;
      ">
        <svg aria-hidden="true" xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white'><path d='M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z'/></svg>
      </div>
      <div style="
        width: 0; height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 7px solid ${fallbackColor};
        margin: 0 auto;
      "></div>
    `,
    iconSize: [38, 45],
    iconAnchor: [19, 45],
    popupAnchor: [0, -48],
  });
}

function FitBounds({ runners }: { runners: Runner[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = runners.filter((r) => r.lat != null && r.lng != null);
    if (valid.length === 0) return;
    const bounds = L.latLngBounds(valid.map((r) => [r.lat!, r.lng!]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 });
  }, [runners, map]);
  return null;
}

interface RunnerMapProps {
  runners: Runner[];
}

export function RunnerMap({ runners }: RunnerMapProps) {
  const mappable = runners.filter((r) => r.lat != null && r.lng != null);

  return (
    <div className="w-full rounded-xl overflow-hidden border shadow-sm" style={{ height: "580px" }}>
      <MapContainer
        center={[20, 10]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.length > 0 && <FitBounds runners={mappable} />}
        {mappable.map((runner) => (
          <Marker
            key={runner.id}
            position={[runner.lat!, runner.lng!]}
            icon={createRunnerIcon(
              resolveAvatarUrl(runner.avatarUrl),
              runner.gender,
              runner.name,
            )}
            title={runner.name}
          >
            <Popup maxWidth={240} className="runner-popup">
              <div style={{ fontFamily: "inherit", minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {runner.avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(runner.avatarUrl)}
                      alt={runner.name}
                      style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : null}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {runner.name}{runner.age ? `, ${runner.age}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
                      <span>📍</span> {runner.city}, {runner.country}
                    </div>
                  </div>
                </div>

                {runner.bio && (
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 8, lineHeight: 1.4 }}>
                    {runner.bio.length > 80 ? runner.bio.slice(0, 80) + "…" : runner.bio}
                  </p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                  {runner.experience && (
                    <span style={{
                      background: "#f0f4ff", color: "#3b6ef6", borderRadius: 12,
                      padding: "2px 8px", fontSize: 11, fontWeight: 600, textTransform: "capitalize"
                    }}>
                      {runner.experience}
                    </span>
                  )}
                  {runner.runningStats?.avgPacePerKm && (
                    <span style={{
                      background: "#fff0f5", color: "#e85d7a", borderRadius: 12,
                      padding: "2px 8px", fontSize: 11, fontWeight: 600
                    }}>
                      {runner.runningStats.avgPacePerKm}/km
                    </span>
                  )}
                </div>

                <a
                  href={`/runner/${runner.id}`}
                  style={{
                    display: "block", textAlign: "center",
                    background: "#3b6ef6", color: "white",
                    borderRadius: 8, padding: "6px 0",
                    fontSize: 13, fontWeight: 600, textDecoration: "none"
                  }}
                >
                  View Profile
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-xl">
          <div className="text-center text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No runners with location data</p>
          </div>
        </div>
      )}
    </div>
  );
}
