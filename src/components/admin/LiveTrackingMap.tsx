import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Bike, MapPin, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hitungJarak, courierColors } from "@/lib/transitCoordinates";

interface Shipment {
  id: string;
  order_id: string;
  resi_number: string;
  courier: string;
  current_status: string;
  current_phase: string;
  current_location: string | null;
  current_lat: number | null;
  current_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  distance_to_dest_km: number | null;
  icon_type: string;
  checkpoints: any[];
  dest_city: string | null;
  origin_city: string | null;
  estimated_arrival: string | null;
}

function createIcon(type: string, courier: string, phase: string): L.DivIcon {
  const color = courierColors[courier] || "#3B82F6";
  const emoji = type === "truck" ? "🚚" : "🛵";
  const pulse = phase === "neardest" ? "animate-pulse" : "";
  const gray = phase === "delivered" ? "grayscale" : "";
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class="flex items-center justify-center ${pulse}" style="font-size:28px;filter:${gray};text-shadow:0 2px 4px rgba(0,0,0,0.3)">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const warehouseIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div class="flex items-center justify-center" style="font-size:24px">🏭</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div class="flex items-center justify-center" style="font-size:24px">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function LiveTrackingMap() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = async () => {
    const { data } = await supabase
      .from("shipment_tracking")
      .select("*")
      .order("updated_at", { ascending: false });
    setShipments((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchShipments();
    const ch = supabase
      .channel("live-tracking-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipment_tracking" }, () => fetchShipments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => {
    const active = shipments.filter(s => s.current_phase !== "delivered");
    return {
      total: active.length,
      intercity: active.filter(s => s.current_phase === "intercity").length,
      lastmile: active.filter(s => ["lastmile", "transition"].includes(s.current_phase)).length,
      neardest: active.filter(s => s.current_phase === "neardest").length,
      delivered: shipments.filter(s => s.current_phase === "delivered").length,
      delayed: 0,
    };
  }, [shipments]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Belum ada data pengiriman</p>
        <p className="text-sm">Data akan muncul ketika ada order yang dikirim</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <MetricCard label="Paket Aktif" value={stats.total} icon={<Package className="h-4 w-4" />} />
        <MetricCard label="Antar Kota 🚚" value={stats.intercity} color="text-blue-400" />
        <MetricCard label="Last Mile 🛵" value={stats.lastmile} color="text-yellow-400" />
        <MetricCard label="Hampir Tiba" value={stats.neardest} color="text-amber-400" />
        <MetricCard label="Delivered ✅" value={stats.delivered} color="text-green-400" />
        <MetricCard label="Delay ⚠️" value={stats.delayed} color="text-red-400" />
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg" style={{ height: "500px" }}>
          <MapContainer
            center={[-2.5, 118]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Warehouse marker */}
            <Marker position={[-6.2088, 106.8456]} icon={warehouseIcon}>
              <Popup>🏭 Gudang NORTHVEIZ — Jakarta</Popup>
            </Marker>

            {shipments.map((s) => {
              if (s.current_lat == null || s.current_lng == null) return null;
              const pos: [number, number] = [Number(s.current_lat), Number(s.current_lng)];
              const destPos: [number, number] | null = s.dest_lat && s.dest_lng ? [Number(s.dest_lat), Number(s.dest_lng)] : null;
              const icon = createIcon(s.icon_type, s.courier, s.current_phase);

              // Build route line from checkpoints
              const routePoints: [number, number][] = (s.checkpoints || [])
                .filter((c: any) => c.lat != null && c.lng != null)
                .map((c: any) => [Number(c.lat), Number(c.lng)] as [number, number]);

              return (
                <div key={s.id}>
                  {/* Route line */}
                  {routePoints.length > 1 && (
                    <Polyline positions={routePoints} pathOptions={{ color: courierColors[s.courier] || "#3B82F6", weight: 2, opacity: 0.6, dashArray: "6 4" }} />
                  )}

                  {/* Current position */}
                  <Marker position={pos} icon={icon}>
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[180px]">
                        <p className="font-bold">{s.resi_number}</p>
                        <p>Kurir: {s.courier}</p>
                        <p>Status: {s.current_status}</p>
                        <p>Jarak: {s.distance_to_dest_km?.toFixed(1)} km</p>
                        <p>Tujuan: {s.dest_city}</p>
                        <Badge variant="outline" className="text-[10px]">{s.current_phase}</Badge>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Destination marker */}
                  {destPos && (
                    <>
                      <Marker position={destPos} icon={destIcon}>
                        <Popup>📍 Tujuan: {s.dest_city}</Popup>
                      </Marker>
                      {s.current_phase === "neardest" && (
                        <CircleMarker center={destPos} radius={20} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.2 }} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </MapContainer>
        </CardContent>
      </Card>

      {/* Shipment list */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Daftar Pengiriman Aktif</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {shipments.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-bold">{s.resi_number}</p>
                  <p className="text-muted-foreground text-xs truncate">{s.current_status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{s.courier}</span>
                  <Badge variant="outline" className={`text-[10px] ${
                    s.current_phase === "delivered" ? "bg-green-500/20 text-green-400" :
                    s.current_phase === "neardest" ? "bg-amber-500/20 text-amber-400" :
                    s.current_phase === "lastmile" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>{s.current_phase}</Badge>
                  <span className="text-xs text-muted-foreground">{s.distance_to_dest_km?.toFixed(0)}km</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={`text-xl font-bold ${color || ""}`}>{value}</div>
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">{icon}{label}</p>
      </CardContent>
    </Card>
  );
}
