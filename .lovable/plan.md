
# Fitur Live Streaming NORTHVEIZ (Shopee-style)

## Ringkasan

Admin menyiarkan video langsung dari dashboard. User di halaman utama melihat banner "LIVE" saat siaran aktif, membuka viewer full-screen untuk menonton, like, komentar, share, dan langsung tambah produk yang ditayangkan ke keranjang / checkout. Semua realtime, tanpa data dummy.

## Arsitektur Teknis

**Media:** WebRTC mesh — admin (broadcaster) membuat 1 RTCPeerConnection per viewer, signaling lewat Supabase Realtime (broadcast channel `live:<streamId>`). Cocok untuk skala puluhan viewer tanpa media server. Video/audio: `getUserMedia({ video: true, audio: true })` di admin, viewer hanya menerima track (recv-only).

**Signaling events (Realtime broadcast):**
- `viewer-join` (viewer → admin) — viewer masuk, minta offer
- `offer` (admin → viewer spesifik)
- `answer` (viewer → admin)
- `ice` (dua arah)
- `viewer-leave`

**Persistensi & interaksi:** Supabase tables + Realtime `postgres_changes` untuk chat, like counter, pinned products.

## Skema Database (migration baru)

```sql
-- Sesi siaran
CREATE TABLE public.live_streams (
  id uuid PK default gen_random_uuid(),
  admin_id uuid NOT NULL,             -- auth.users.id host
  title text NOT NULL,
  cover_url text,
  status text NOT NULL DEFAULT 'live',-- 'live' | 'ended'
  viewer_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Produk yang di-"pin" untuk dibeli selama siaran
CREATE TABLE public.live_stream_products (
  id uuid PK,
  stream_id uuid REFERENCES live_streams ON DELETE CASCADE,
  product_id uuid REFERENCES products,
  position int DEFAULT 0,
  is_flash boolean DEFAULT false,     -- highlight "flash sale"
  created_at timestamptz DEFAULT now()
);

-- Komentar realtime
CREATE TABLE public.live_stream_messages (
  id uuid PK,
  stream_id uuid REFERENCES live_streams ON DELETE CASCADE,
  user_id uuid,                       -- nullable → guest
  display_name text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'chat',           -- 'chat' | 'join' | 'like' | 'system'
  created_at timestamptz DEFAULT now()
);

-- Like (log per user; counter di live_streams update lewat RPC)
CREATE TABLE public.live_stream_likes (
  stream_id uuid,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);
```

Grants + RLS:
- `live_streams`: SELECT anon+authenticated; INSERT/UPDATE hanya admin (`has_role('admin')`).
- `live_stream_products`: SELECT publik; write admin.
- `live_stream_messages`: SELECT publik; INSERT authenticated (user_id = auth.uid()).
- `live_stream_likes`: SELECT publik; INSERT authenticated.
- Enable Realtime publication untuk 4 tabel.
- RPC `increment_live_like(stream_id)` SECURITY DEFINER untuk atomic counter.

## Struktur File Baru

```text
src/
  hooks/
    useLiveStream.ts          # subscribe stream aktif + realtime updates
    useLiveBroadcaster.ts     # admin: getUserMedia + peer per viewer
    useLiveViewer.ts          # user: terima track dari admin
  components/live/
    LiveBadge.tsx             # banner "LIVE" di Home
    LiveViewerOverlay.tsx     # full-screen viewer (video + chat + produk)
    LiveChatPanel.tsx         # komentar realtime + input
    LiveProductRail.tsx       # daftar produk pinned + tombol beli
    LikeBurst.tsx             # animasi hati floating
    ShareSheet.tsx            # share link siaran (Web Share API + copy)
  components/admin/
    LiveStreamStudio.tsx      # UI broadcaster (start/stop, kamera, mic, pin produk, moderasi chat)
```

Integrasi:
- `src/pages/Home.tsx` → tambah `<LiveBadge />` di atas hero.
- `src/pages/AdminDashboard.tsx` → tab baru **"Live"** memuat `LiveStreamStudio`.
- `useCart` dipakai `LiveProductRail` untuk "Add to Cart" langsung; tombol "Beli Sekarang" navigate ke `/checkout` dengan item terpilih.

## Fitur User (Viewer)

- Banner LIVE di home → klik → overlay fullscreen.
- Video stream + jumlah viewer + like realtime.
- Chat: kirim komentar (harus login; guest baca-only + prompt login).
- Like: tap hati → animasi burst + counter naik (throttle 1 like/user, tap ulang = tambah animasi lokal saja).
- Share: Web Share API (`navigator.share`) fallback copy link `?live=<id>`.
- Rail produk horizontal di bawah video → **Add to Cart** atau **Beli Sekarang** (checkout).
- Flash-sale highlight untuk produk yang admin tandai.

## Fitur Admin (Studio)

- Start Live: input judul + cover → buat row `live_streams` status `live` → mulai `getUserMedia` → siap terima `viewer-join`.
- Pin/unpin produk dari katalog (search + add).
- Toggle Flash Sale per produk.
- Preview jumlah viewer + list peserta.
- Panel chat live + hapus komentar (moderasi).
- Toggle kamera/mic, ganti kamera depan/belakang.
- End Live: tutup semua peer, update status `ended`, set `ended_at`.

## Realtime Flow

1. Admin start → INSERT `live_streams` → viewers Home menerima update via `postgres_changes` → banner muncul.
2. Viewer buka overlay → subscribe channel `live:<id>` → kirim `viewer-join` → admin buat RTCPeerConnection, addTrack lokal, kirim `offer` → viewer setRemoteDescription, kirim `answer`, ICE dua arah → video muncul.
3. Chat & like: INSERT tabel → semua client dapat event `postgres_changes` INSERT.
4. Add-to-cart: viewer klik → `useCart.addItem(product)` (existing).
5. End: admin kirim `stream-ended` broadcast + UPDATE status; viewers auto-close overlay.

## Batas & Catatan

- WebRTC mesh: ideal < 30 viewer simultan (STUN publik `stun:stun.l.google.com:19302`). Untuk skala besar butuh SFU eksternal — di luar scope.
- Tidak ada rekaman siaran (bisa ditambah nanti via MediaRecorder).
- Guest bisa menonton & like, harus login untuk komentar / checkout (memakai flow auth existing).

## Deliverables

- 1 migration SQL (4 tabel + RPC + policies + grants + realtime publication).
- 3 hook + 6 komponen live baru.
- Tab "Live" di Admin Dashboard.
- Banner + overlay di Home.
- Integrasi `useCart` untuk beli langsung dari siaran.
