// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.110.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// NOTE: no module-level cache / no singletons for any location data.
// Only the Supabase admin client is reused (holds credentials, not visitor state).
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function extractClientIp(h: Headers): { ip: string | null; source: string; chain: string[] } {
  const chain: string[] = [];
  const xff = h.get("x-forwarded-for");
  if (xff) chain.push(...xff.split(",").map((s) => s.trim()).filter(Boolean));

  const candidates: Array<[string, string | null]> = [
    ["cf-connecting-ip", h.get("cf-connecting-ip")],
    ["true-client-ip", h.get("true-client-ip")],
    ["x-real-ip", h.get("x-real-ip")],
    ["x-forwarded-for", chain[0] ?? null],
    ["fly-client-ip", h.get("fly-client-ip")],
  ];
  for (const [source, v] of candidates) {
    if (v && v.trim() && v.trim().toLowerCase() !== "unknown") {
      return { ip: v.trim(), source, chain };
    }
  }
  return { ip: null, source: "none", chain };
}

function isPrivateOrInvalidIp(ip: string): boolean {
  if (!ip) return true;
  const s = ip.toLowerCase();
  if (s === "::1" || s === "localhost" || s === "0.0.0.0") return true;
  // IPv4
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  // IPv6 crude checks
  if (s.startsWith("fc") || s.startsWith("fd")) return true; // ULA fc00::/7
  if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb")) return true; // link-local
  if (!s.includes(":")) return true; // not v4 and not v6
  return false;
}

function validCoord(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const la = typeof lat === "number" ? lat : Number(lat);
  const lo = typeof lon === "number" ? lon : Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90) return null;
  if (lo < -180 || lo > 180) return null;
  if (la === 0 && lo === 0) return null;
  return { lat: la, lon: lo };
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { signal: ctl.signal, headers: { "accept": "application/json" } });
  } finally {
    clearTimeout(to);
  }
}

type Lookup = {
  provider: string;
  raw: any;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  asn: string | null;
  timezone: string | null;
};

async function lookupIpapiCo(ip: string): Promise<Lookup | null> {
  const r = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, 4000);
  const raw = await r.json().catch(() => null);
  if (!r.ok || !raw || raw.error) return null;
  return {
    provider: "ipapi.co",
    raw,
    country_code: raw.country_code ?? null,
    country_name: raw.country_name ?? null,
    region: raw.region ?? null,
    city: raw.city ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    isp: raw.org ?? null,
    asn: raw.asn ?? null,
    timezone: raw.timezone ?? null,
  };
}

async function lookupIpApiCom(ip: string): Promise<Lookup | null> {
  const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,as,query`;
  const r = await fetchWithTimeout(url, 4000);
  const raw = await r.json().catch(() => null);
  if (!r.ok || !raw || raw.status !== "success") return null;
  return {
    provider: "ip-api.com",
    raw,
    country_code: raw.countryCode ?? null,
    country_name: raw.country ?? null,
    region: raw.regionName ?? raw.region ?? null,
    city: raw.city ?? null,
    latitude: raw.lat ?? null,
    longitude: raw.lon ?? null,
    isp: raw.isp ?? null,
    asn: raw.as ?? null,
    timezone: raw.timezone ?? null,
  };
}

async function runLookup(ip: string): Promise<{ result: Lookup | null; errors: string[] }> {
  const errors: string[] = [];
  for (const fn of [lookupIpapiCo, lookupIpApiCom]) {
    try {
      const r = await fn(ip);
      if (r) return { result: r, errors };
      errors.push(`${fn.name}: empty/failure`);
    } catch (e) {
      errors.push(`${fn.name}: ${(e as Error).message}`);
    }
  }
  return { result: null, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const body = await req.json().catch(() => ({}));
  const session_id = String(body?.session_id ?? "").slice(0, 128);
  const page_path = body?.page_path ? String(body.page_path).slice(0, 512) : null;
  const referrer = body?.referrer ? String(body.referrer).slice(0, 1024) : null;
  const user_agent = body?.user_agent ? String(body.user_agent).slice(0, 1024) : (req.headers.get("user-agent") ?? null);
  const user_id = body?.user_id ? String(body.user_id) : null;

  if (!session_id) {
    return new Response(JSON.stringify({ error: "session_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { ip, source, chain } = extractClientIp(req.headers);
  const clientIp = ip ?? "";

  let status: "SUCCESS" | "FAILED" | "PRIVATE_IP" | "INVALID_COORDS" = "FAILED";
  let lookup: Lookup | null = null;
  let errors: string[] = [];
  let coords: { lat: number; lon: number } | null = null;

  if (!clientIp || isPrivateOrInvalidIp(clientIp)) {
    status = "PRIVATE_IP";
  } else {
    const { result, errors: errs } = await runLookup(clientIp);
    errors = errs;
    if (result) {
      lookup = result;
      coords = validCoord(result.latitude, result.longitude);
      status = coords ? "SUCCESS" : "INVALID_COORDS";
    }
  }

  const row: Record<string, unknown> = {
    session_id,
    user_id,
    ip_address: clientIp || null,
    country_code: lookup?.country_code ?? null,
    country_name: lookup?.country_name ?? null,
    region: lookup?.region ?? null,
    city: lookup?.city ?? null,
    latitude: coords?.lat ?? null,
    longitude: coords?.lon ?? null,
    isp: lookup?.isp ?? null,
    asn: lookup?.asn ?? null,
    timezone: lookup?.timezone ?? null,
    provider: lookup?.provider ?? null,
    lookup_status: status,
    lookup_error: status === "SUCCESS" ? null : (errors.join(" | ") || (status === "PRIVATE_IP" ? "private_or_invalid_ip" : "invalid_or_missing_coords")),
    lookup_at: new Date().toISOString(),
    raw_response: lookup?.raw ?? null,
    user_agent,
    page_path,
    referrer,
    is_active: true,
    last_activity_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await admin
    .from("visitor_sessions")
    .upsert(row, { onConflict: "session_id" });

  const latency_ms = Date.now() - t0;

  // Structured log line
  console.log(JSON.stringify({
    tag: "visitor_track",
    session_id,
    client_ip: clientIp || null,
    source_ip_header: source,
    forwarded_chain: chain,
    provider: lookup?.provider ?? null,
    status,
    latency_ms,
    country_code: lookup?.country_code ?? null,
    country_name: lookup?.country_name ?? null,
    region: lookup?.region ?? null,
    city: lookup?.city ?? null,
    latitude: coords?.lat ?? null,
    longitude: coords?.lon ?? null,
    isp: lookup?.isp ?? null,
    asn: lookup?.asn ?? null,
    timezone: lookup?.timezone ?? null,
    lookup_errors: errors,
    upsert_error: upsertErr?.message ?? null,
    raw_response_keys: lookup?.raw ? Object.keys(lookup.raw) : [],
  }));

  return new Response(JSON.stringify({
    ok: !upsertErr,
    status,
    ip: clientIp || null,
    provider: lookup?.provider ?? null,
    city: lookup?.city ?? null,
    country_code: lookup?.country_code ?? null,
    latitude: coords?.lat ?? null,
    longitude: coords?.lon ?? null,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
