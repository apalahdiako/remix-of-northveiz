import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { transitCoordinates, hitungJarak, determinePhase } from "@/lib/transitCoordinates";

const SIMULATION_ROUTES: Record<string, string[]> = {
  "Surabaya": ["Jakarta", "Hub Jakarta Timur", "Transit Cirebon", "Transit Semarang", "Transit Surabaya"],
  "Bandung": ["Jakarta", "Hub Depok", "Transit Bandung"],
  "Yogyakarta": ["Jakarta", "Transit Cirebon", "Transit Semarang", "Transit Yogyakarta"],
  "Bali": ["Jakarta", "Transit Semarang", "Transit Surabaya", "Transit Bali"],
  "Medan": ["Jakarta", "Transit Palembang", "Transit Medan"],
  "Makassar": ["Jakarta", "Transit Surabaya", "Transit Makassar"],
  "Solo": ["Jakarta", "Transit Semarang", "Transit Solo"],
  "Malang": ["Jakarta", "Transit Semarang", "Transit Surabaya", "Transit Malang"],
  "default": ["Jakarta", "Hub Jakarta Timur", "Hub Bekasi"],
};

function getRouteForCity(destCity: string): string[] {
  for (const [key, route] of Object.entries(SIMULATION_ROUTES)) {
    if (destCity.toLowerCase().includes(key.toLowerCase())) return route;
  }
  return SIMULATION_ROUTES["default"];
}

const statusMessages: Record<string, string[]> = {
  intercity: ["Paket diberangkatkan dari hub", "Transit di sorting center", "Dalam perjalanan antar kota"],
  transition: ["Paket tiba di hub kota tujuan", "Proses sortir di kota tujuan"],
  lastmile: ["Paket sedang diantar kurir", "Kurir menuju lokasi Anda"],
  neardest: ["Kurir sudah sangat dekat dengan lokasi Anda"],
  delivered: ["Paket telah diterima"],
};

export function useTrackingSimulation(enabled: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const simulate = async () => {
      const { data: shipments } = await supabase
        .from("shipment_tracking")
        .select("*")
        .neq("current_phase", "delivered");

      if (!shipments || shipments.length === 0) return;

      for (const shipment of shipments) {
        const checkpoints: any[] = Array.isArray(shipment.checkpoints) ? shipment.checkpoints : [];
        const route = getRouteForCity(shipment.dest_city || "default");
        const currentIdx = checkpoints.length;

        if (currentIdx >= route.length) {
          // Deliver
          const destLat = Number(shipment.dest_lat) || -6.2088;
          const destLng = Number(shipment.dest_lng) || 106.8456;
          await supabase.from("shipment_tracking").update({
            current_status: "Paket telah diterima",
            current_phase: "delivered" as any,
            current_lat: destLat,
            current_lng: destLng,
            distance_to_dest_km: 0,
            icon_type: "motor" as any,
            checkpoints: [...checkpoints, {
              name: "Delivered",
              location: shipment.dest_city || "Tujuan",
              lat: destLat, lng: destLng,
              timestamp: new Date().toISOString(),
              phase: "delivered"
            }]
          }).eq("id", shipment.id);

          await supabase.from("tracking_checkpoints").insert({
            order_id: shipment.order_id,
            shipment_id: shipment.id,
            resi_number: shipment.resi_number,
            checkpoint_name: "Delivered",
            location_name: shipment.dest_city || "Tujuan",
            lat: destLat, lng: destLng,
            phase: "delivered" as any,
          });
          continue;
        }

        const nextStop = route[currentIdx];
        const coords = transitCoordinates[nextStop] || { lat: -6.2088, lng: 106.8456 };
        const destLat = Number(shipment.dest_lat) || -6.2088;
        const destLng = Number(shipment.dest_lng) || 106.8456;
        const dist = hitungJarak(coords.lat, coords.lng, destLat, destLng);
        const { phase, iconType } = determinePhase(dist, currentIdx >= route.length - 1 ? "sedang diantar" : "transit");

        const phaseMessages = statusMessages[phase] || statusMessages.intercity;
        const statusMsg = `${phaseMessages[Math.floor(Math.random() * phaseMessages.length)] } — ${nextStop}`;

        const newCheckpoint = {
          name: nextStop,
          location: nextStop,
          lat: coords.lat, lng: coords.lng,
          timestamp: new Date().toISOString(),
          phase,
        };

        await supabase.from("shipment_tracking").update({
          current_status: statusMsg,
          current_phase: phase as any,
          current_location: nextStop,
          current_lat: coords.lat,
          current_lng: coords.lng,
          distance_to_dest_km: Math.round(dist * 10) / 10,
          icon_type: iconType as any,
          checkpoints: [...checkpoints, newCheckpoint],
        }).eq("id", shipment.id);

        await supabase.from("tracking_checkpoints").insert({
          order_id: shipment.order_id,
          shipment_id: shipment.id,
          resi_number: shipment.resi_number,
          checkpoint_name: nextStop,
          location_name: nextStop,
          lat: coords.lat, lng: coords.lng,
          phase: phase as any,
        });
      }
    };

    intervalRef.current = setInterval(simulate, 20000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled]);
}
