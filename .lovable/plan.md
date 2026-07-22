
## Temuan audit (sebelum revisi)

- `src/hooks/useVisitorTracking.tsx` memanggil `https://ipapi.co/json/` **dari browser** dan meng-`upsert` langsung ke `visitor_sessions`. Artinya:
  - IP yang tersimpan adalah IP yang dilaporkan ipapi.co, bukan yang divalidasi server.
  - Client bisa mengirim `latitude`, `longitude`, `city` apa saja (spoofable).
  - Tidak ada validasi rentang lat/lon, tidak ada region/ISP/ASN/timezone, tidak ada status FAILED.
- Data di tabel `visitor_sessions` yang saya cek **tidak menunjukkan bug "semua sama"**: IP berbeda menghasilkan koordinat berbeda (mis. `202.46.68.190 → -6.9295, 107.6841`, `.191 → -6.9172, 107.6296`, `.250 → -7.0305, 107.6426`, IPv6 `2400:9800:… → -6.9092, 107.5934`). Yang sama adalah **kota "Bandung"** karena mayoritas IP yang mengunjungi memang dari ISP Telkom/Indosat area Bandung. Revisi tetap dilakukan sesuai spec, tapi kemungkinan besar data akan tetap didominasi Bandung setelah revisi — itu bukan bug melainkan realita traffic Anda.
- Tabel `visitor_sessions` belum punya kolom: `region`, `country_name` (ada), `isp`, `asn`, `timezone`, `lookup_status`, `provider`, `raw_response`, `lookup_error`, `lookup_at`.
- `orders` juga menyimpan `latitude/longitude/city/country_code` (dari `initiate-payment`) — di luar scope OSINT visitor, tidak diubah.

## Rencana revisi

### 1. Migrasi database

Tambah kolom pada `visitor_sessions`:

- `region text`
- `isp text`
- `asn text`
- `timezone text`
- `provider text` (nama provider yang berhasil, mis. `ipapi.co`, `ip-api.com`)
- `lookup_status text` — `SUCCESS` / `FAILED` / `PRIVATE_IP` / `INVALID_COORDS`
- `lookup_error text`
- `lookup_at timestamptz`
- `raw_response jsonb`
- Constraint: `latitude BETWEEN -90 AND 90`, `longitude BETWEEN -180 AND 180` (nullable diperbolehkan; constraint hanya cek saat NOT NULL).

Kunci RLS supaya client **tidak bisa** menulis kolom lokasi langsung:

- Cabut policy INSERT/UPDATE terbuka pada `visitor_sessions`.
- Client hanya diizinkan `UPDATE last_activity_at`, `page_path`, `is_active` untuk `session_id` miliknya (via kolom terbatas atau lewat RPC `touch_visitor_session`).
- Semua penulisan lokasi lewat edge function `visitor-track` dengan service role.

### 2. Edge function baru: `supabase/functions/visitor-track/index.ts`

Tanggung jawab per request (stateless, tanpa cache/singleton/global):

1. **Ekstrak IP asli** dengan prioritas:
   1. `CF-Connecting-IP`
   2. `True-Client-IP`
   3. `X-Real-IP`
   4. entri pertama dari `X-Forwarded-For` (trim, ambil kiri)
   5. `req.headers.get("x-forwarded-for")` fallback
2. **Validasi IP**: tolak `127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fc00::/7`, `fe80::/10`, dan literal `unknown`/kosong. Jika invalid → simpan row dengan `lookup_status='PRIVATE_IP'`, tanpa koordinat.
3. **Lookup real-time** per request (tidak ada in-memory cache):
   - Provider utama: `https://ipapi.co/{ip}/json/`
   - Fallback: `http://ip-api.com/json/{ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,as,query`
   - Timeout 4 detik per provider (`AbortController`).
4. **Validasi hasil**: `lat` dan `lon` harus number, dalam rentang; jika tidak → `INVALID_COORDS`, koordinat tidak ditulis.
5. **Persist** row via service-role client: `session_id`, `ip_address`, `country_code`, `country_name`, `region`, `city`, `latitude`, `longitude`, `isp`, `asn`, `timezone`, `provider`, `lookup_status`, `lookup_error`, `lookup_at=now()`, `raw_response`, `user_agent`, `page_path`, `referrer`, `is_active=true`, `last_activity_at=now()`.
6. **Logging** structured (satu baris JSON per lookup) berisi: `client_ip`, `source_ip_header`, `forwarded_chain`, `provider`, `status`, `latency_ms`, `country`, `city`, `lat`, `lon`, `isp`, `asn`, `timezone`, ringkasan `raw_response`.
7. Tidak pernah menyimpan koordinat default; jika gagal semua provider → `FAILED`.

`verify_jwt = false` (dipanggil dari halaman publik).

### 3. Refactor `useVisitorTracking.tsx`

- Ganti `fetch("https://ipapi.co/json/")` + `supabase.upsert(...)` dengan satu panggilan `supabase.functions.invoke("visitor-track", { body: { session_id, page_path, referrer, user_agent } })`.
- `updateActivity` dan `markInactive` tetap client-side, tapi hanya update kolom aktivitas (bukan kolom lokasi) via RPC baru `touch_visitor_session(session_id, page_path, is_active)`.
- Tidak ada state global; tiap request membuat pemanggilan baru.

### 4. Audit ulang tempat lain

- `src/pages/PetaGlobal.tsx` dan `src/pages/AdminDashboard.tsx`: hanya membaca. Sesuaikan agar row `lookup_status != 'SUCCESS'` (atau `latitude` NULL) dihitung sebagai "Unknown" — tidak dipaksa ke `XX`/koordinat 0. Tambah kolom kecil "status" di tabel PetaGlobal.
- `supabase/functions/initiate-payment/index.ts` — `country_code: "IDN"` hardcoded pada order (di luar scope tracking, tapi disebut). **Tidak diubah** kecuali Anda minta.

### 5. Validasi setelah implementasi

- Code review internal untuk memastikan tidak ada variabel modul-level yang menampung IP/koordinat.
- SQL cek: `SELECT count(*), count(DISTINCT ip_address), count(DISTINCT (latitude,longitude)) FROM visitor_sessions WHERE lookup_at > now() - interval '1 hour'` untuk memastikan variasi.
- Stress test dari sandbox: script menembak edge function dengan 100 IP publik acak (mis. daftar IP dari cloud + berbagai negara) via header `X-Forwarded-For`, lalu verifikasi jumlah kota unik.
- Security audit ringkas: pastikan tidak ada endpoint yang bisa dipakai untuk menulis lokasi arbitrer selain edge function ini.

## Bagian teknis

Skema tambahan:

```sql
ALTER TABLE public.visitor_sessions
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS isp text,
  ADD COLUMN IF NOT EXISTS asn text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS lookup_status text,
  ADD COLUMN IF NOT EXISTS lookup_error text,
  ADD COLUMN IF NOT EXISTS lookup_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw_response jsonb,
  ADD CONSTRAINT visitor_sessions_lat_range CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  ADD CONSTRAINT visitor_sessions_lon_range CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));
```

RPC aktivitas (tanpa akses ke kolom lokasi):

```sql
CREATE OR REPLACE FUNCTION public.touch_visitor_session(p_sid text, p_path text, p_active boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.visitor_sessions
  SET last_activity_at = now(), page_path = p_path, is_active = p_active
  WHERE session_id = p_sid;
$$;
```

Edge function flow (pseudokode):

```text
handler(req):
  ip = extract_client_ip(req.headers)         # CF-Connecting-IP > True-Client-IP > X-Real-IP > XFF[0]
  if is_private_or_invalid(ip):
     persist(session, status=PRIVATE_IP); return
  data, provider, raw = try_lookup(ip, [ipapi.co, ip-api.com])   # 4s timeout, tidak cache
  if !data:
     persist(session, status=FAILED, lookup_error=...); return
  if !valid_coords(data.lat, data.lon):
     persist(session, status=INVALID_COORDS, other fields ok); return
  persist(session, status=SUCCESS, all fields, raw_response=raw)
  log_json({...})
```

## Konfirmasi sebelum eksekusi

1. Setuju provider utama **ipapi.co** dengan fallback **ip-api.com** (keduanya free-tier, tanpa API key)? Kalau ingin provider berbayar (ipinfo.io / ipdata.co / MaxMind), sebutkan dan sediakan API key.
2. `orders.country_code = "IDN"` hardcoded di `initiate-payment` — dibiarkan atau ikut dibersihkan?
3. Data historis `visitor_sessions` yang lama: dibiarkan apa adanya, atau di-`TRUNCATE` sebelum sistem baru mulai mencatat?
