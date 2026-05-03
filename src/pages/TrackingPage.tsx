import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, Truck, Bike, MapPin, Package } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function TrackingPage() {
  const { resi } = useParams<{ resi: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(true);

  const fetchTracking = async () => {
    if (!resi) { setError("Nomor resi tidak valid"); setLoading(false); return; }
    const { data, error: err } = await supabase
      .from("shipment_tracking")
      .select("*")
      .eq("resi_number", resi)
      .maybeSingle();

    if (err || !data) {
      setError("Data tracking tidak ditemukan");
    } else {
      setShipment(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTracking();
    const ch = supabase
      .channel(`track-${resi}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shipment_tracking", filter: `resi_number=eq.${resi}` }, (payload) => {
        setShipment(payload.new);
        setIsLive(true);
      })
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });
    return () => { supabase.removeChannel(ch); };
  }, [resi]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error || !shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-16 px-4">
        <Package className="h-16 w-16 mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">Tracking Tidak Ditemukan</h2>
        <p className="text-muted-foreground text-sm mb-4">{error || "Nomor resi tidak valid atau belum terdaftar"}</p>
        <Button variant="outline" onClick={() => navigate("/")}>Kembali</Button>
      </div>
    );
  }

  const checkpoints: any[] = Array.isArray(shipment.checkpoints) ? shipment.checkpoints : [];
  const hasCoords = shipment.current_lat != null && shipment.current_lng != null;
  const destCoords = shipment.dest_lat != null && shipment.dest_lng != null;
  const phaseLabel: Record<string, string> = {
    intercity: "Dalam Perjalanan Antar Kota",
    transition: "Tiba di Kota Tujuan",
    lastmile: "Sedang Diantar Kurir",
    neardest: "Kurir Sudah Sangat Dekat!",
    delivered: "Paket Telah Diterima",
  };

  const phaseColor: Record<string, string> = {
    intercity: "bg-blue-500/20 text-blue-400",
    transition: "bg-yellow-500/20 text-yellow-400",
    lastmile: "bg-orange-500/20 text-orange-400",
    neardest: "bg-amber-500/20 text-amber-400",
    delivered: "bg-green-500/20 text-green-400",
  };

  const emoji = shipment.icon_type === "truck" ? "🚚" : "🛵";

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />Kembali
      </Button>

      {/* Near destination alert */}
      {shipment.current_phase === "neardest" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">🛵</span>
          <p className="text-sm font-medium text-amber-300">Kurir sudah sangat dekat! Siapkan diri untuk menerima paket.</p>
        </div>
      )}

      {/* Status header */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-mono text-sm font-bold">{shipment.resi_number}</p>
                <p className="text-xs text-muted-foreground">{shipment.courier}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-[10px] text-muted-foreground">{isLive ? "Live" : "Reconnecting..."}</span>
            </div>
          </div>
          <Badge className={`${phaseColor[shipment.current_phase] || ""} mb-2`}>
            {phaseLabel[shipment.current_phase] || shipment.current_phase}
          </Badge>
          <p className="text-sm">{shipment.current_status}</p>
          {shipment.distance_to_dest_km != null && (
            <p className="text-xs text-muted-foreground mt-1">Jarak ke tujuan: {shipment.distance_to_dest_km.toFixed(1)} km</p>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      {hasCoords && (
        <Card className="mb-4">
          <CardContent className="p-0 overflow-hidden rounded-lg" style={{ height: "300px" }}>
            <MapContainer
              center={[Number(shipment.current_lat), Number(shipment.current_lng)]}
              zoom={8}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <Marker
                position={[Number(shipment.current_lat), Number(shipment.current_lng)]}
                icon={L.divIcon({
                  className: "custom-div-icon",
                  html: `<div style="font-size:28px;text-align:center">${emoji}</div>`,
                  iconSize: [40, 40], iconAnchor: [20, 20],
                })}
              >
                <Popup>{shipment.current_status}</Popup>
              </Marker>
              {destCoords && (
                <>
                  <Marker
                    position={[Number(shipment.dest_lat), Number(shipment.dest_lng)]}
                    icon={L.divIcon({
                      className: "custom-div-icon",
                      html: `<div style="font-size:24px;text-align:center">${shipment.current_phase === "delivered" ? "✅" : "📍"}</div>`,
                      iconSize: [32, 32], iconAnchor: [16, 16],
                    })}
                  >
                    <Popup>Tujuan: {shipment.dest_city}</Popup>
                  </Marker>
                  {shipment.current_phase === "neardest" && (
                    <CircleMarker center={[Number(shipment.dest_lat), Number(shipment.dest_lng)]} radius={25} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15 }} />
                  )}
                </>
              )}
              {checkpoints.length > 1 && (
                <Polyline
                  positions={checkpoints.filter((c: any) => c.lat && c.lng).map((c: any) => [Number(c.lat), Number(c.lng)] as [number, number])}
                  pathOptions={{ color: "#3B82F6", weight: 2, opacity: 0.6, dashArray: "6 4" }}
                />
              )}
            </MapContainer>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Riwayat Tracking</h3>
          {checkpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada checkpoint</p>
          ) : (
            <div className="space-y-0">
              {[...checkpoints].reverse().map((cp: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {i < checkpoints.length - 1 && <div className="w-px h-full bg-border min-h-[40px]" />}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <p className="text-sm font-medium">{cp.name || cp.location}</p>
                    <p className="text-xs text-muted-foreground">
                      {cp.timestamp ? format(new Date(cp.timestamp), "dd MMM yyyy, HH:mm", { locale: idLocale }) : "-"}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">{cp.phase}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm delivery button */}
      {shipment.current_phase === "delivered" && (
        <Button className="w-full mt-4" onClick={() => navigate("/account")}>
          <CheckCircle2 className="mr-2 h-4 w-4" />Konfirmasi Paket Diterima
        </Button>
      )}
    </div>
  );
}
