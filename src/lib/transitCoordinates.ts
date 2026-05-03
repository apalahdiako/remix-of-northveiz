export const transitCoordinates: Record<string, { lat: number; lng: number }> = {
  "Jakarta":              { lat: -6.2088,  lng: 106.8456 },
  "Hub Jakarta Timur":    { lat: -6.2251,  lng: 106.9004 },
  "Hub Bekasi":           { lat: -6.2383,  lng: 106.9756 },
  "Hub Depok":            { lat: -6.4025,  lng: 106.7942 },
  "Hub Tangerang":        { lat: -6.1783,  lng: 106.6319 },
  "Hub Bogor":            { lat: -6.5971,  lng: 106.8060 },
  "Transit Bandung":      { lat: -6.9175,  lng: 107.6191 },
  "Transit Cirebon":      { lat: -6.7063,  lng: 108.5573 },
  "Transit Semarang":     { lat: -6.9932,  lng: 110.4203 },
  "Transit Yogyakarta":   { lat: -7.7956,  lng: 110.3695 },
  "Transit Solo":         { lat: -7.5755,  lng: 110.8243 },
  "Transit Surabaya":     { lat: -7.2575,  lng: 112.7521 },
  "Transit Malang":       { lat: -7.9666,  lng: 112.6326 },
  "Transit Bali":         { lat: -8.6705,  lng: 115.2126 },
  "Transit Medan":        { lat:  3.5952,  lng:  98.6722 },
  "Transit Palembang":    { lat: -2.9761,  lng: 104.7754 },
  "Transit Makassar":     { lat: -5.1477,  lng: 119.4327 },
  "Transit Balikpapan":   { lat: -1.2654,  lng: 116.8312 },
  "Transit Pontianak":    { lat: -0.0226,  lng: 109.3318 },
  "Transit Manado":       { lat:  1.4748,  lng: 124.8421 },
};

export function hitungJarak(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type ShippingPhase = 'intercity' | 'transition' | 'lastmile' | 'neardest' | 'delivered';
export type IconType = 'truck' | 'motor';

export function determinePhase(distanceKm: number, status: string): { phase: ShippingPhase; iconType: IconType } {
  const statusLower = status.toLowerCase();
  const isOutForDelivery = /dengan kurir|out for delivery|sedang diantar|kurir menuju|antar ke alamat/.test(statusLower);
  const isDelivered = /delivered|terkirim|diterima/.test(statusLower);

  if (isDelivered) return { phase: 'delivered', iconType: 'motor' };
  if (distanceKm < 2) return { phase: 'neardest', iconType: 'motor' };
  if (distanceKm <= 50 && isOutForDelivery) return { phase: 'lastmile', iconType: 'motor' };
  if (distanceKm <= 50) return { phase: 'transition', iconType: 'motor' };
  return { phase: 'intercity', iconType: 'truck' };
}

export const courierColors: Record<string, string> = {
  "JNE": "#E30613",
  "J&T": "#E2001A",
  "SiCepat": "#FFD100",
  "Tiki": "#003087",
  "Lion Parcel": "#FF6600",
  "Pos Indonesia": "#FF6600",
  "Ninja Xpress": "#C8102E",
  "GoSend": "#00AA13",
  "GrabExpress": "#00B14F",
  "Anteraja": "#E02020",
};

export const JABODETABEK_KEYWORDS = [
  "Jakarta", "Bekasi", "Depok", "Tangerang", "Bogor",
  "Cikarang", "Karawang", "Cibinong", "Serpong",
  "Cikeas", "Cileungsi", "Parung"
];

export function isJabodetabek(locationName: string, lat?: number, lng?: number): boolean {
  if (JABODETABEK_KEYWORDS.some(k => locationName.toLowerCase().includes(k.toLowerCase()))) return true;
  if (lat != null && lng != null) {
    return hitungJarak(-6.2088, 106.8456, lat, lng) <= 80;
  }
  return false;
}
