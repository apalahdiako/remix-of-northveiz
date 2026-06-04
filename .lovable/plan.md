# NORTHVEIZ Redesign + Feature Build — Phased Plan

Estetika referensi Calle de Larache: typography editorial tipis, banyak whitespace, hover halus, kartu produk minimal. Home page **tidak diubah**. Accent tetap orange (`#FF5722`).

Karena permintaan sangat besar, saya pecah jadi 4 fase. Setiap fase dieksekusi terpisah agar bisa Anda review sebelum lanjut. Plan ini hanya mencakup **Fase 1**; fase berikut akan diajukan plan baru saat siap.

---

## Fase 1 — Visual Redesign (Header + Catalog + Product Detail)

### 1. Design tokens (`src/index.css`, `tailwind.config.ts`)
- Tambah font editorial: **Playfair Display** (display) + **Inter** (body), via `<link>` di `index.html`.
- Token baru: `--font-display`, `--font-body`, spacing scale 8px, letter-spacing wide untuk uppercase eyebrow.
- Tidak mengubah HSL primary/accent existing (orange stay).

### 2. Header (`src/components/Header.tsx`)
- Logo center kecil, nav links kiri (Catalog · Community · About · Contact), icon group kanan (Search · Chat · Cart · Account).
- Tipografi uppercase tracking-widest text-xs.
- Sticky + transparent → solid putih saat scroll (sudah ada).
- Mobile: hamburger tetap di kiri, logo center.

### 3. Catalog (`src/pages/Catalog.tsx` + `ProductCard.tsx`)
- Layout: sidebar filter desktop (sticky kiri) + grid 4 kolom; mobile drawer filter.
- Filter: Availability, Sort. (Color/Material/Size filter skip — schema produk belum punya kolom itu; kalau mau saya tambah di Fase 3.)
- Sort dropdown kanan-atas (bukan tombol pill).
- Product card: gambar aspect 3:4, nama uppercase tipis, harga, hover reveal "Add to wishlist" + secondary image kalau ada.
- Lazy load image, skeleton loader.

### 4. Product Detail (`src/pages/ProductDetail.tsx`)
- Layout 2 kolom desktop: gallery sticky kiri (main + thumbnail vertical), info kanan.
- Info: nama display font besar, harga, stock indicator, size selector pill, qty stepper, Add to Cart full-width black, Wishlist icon, Share row (WhatsApp/Copy).
- Accordion: Description · Material & Care · Shipping & Returns.
- Section "You might also like" pakai 4 produk random dari catalog.

### 5. QA
- Cek tiap halaman di mobile 360px + desktop 1280px via browser tool.
- Pastikan dashboard `/admin` tidak ikut berubah visual (scope tokens harus tidak conflict).

---

## Fase 2 — Wishlist Page (planned, not in this run)
Halaman `/wishlist` pakai `useProductLikes`, tombol heart aktif di ProductCard & ProductDetail, link di account menu.

## Fase 3 — Live Search Autocomplete (planned)
Upgrade `SearchSheet` jadi instant search: query Supabase debounce 200ms, tampil thumbnail + nama + harga, klik → product detail.

## Fase 4 — Coupon + Multi-step Checkout (planned, paling berisiko)
- Tabel baru `coupons` + `order_coupons`, validasi server-side via edge function.
- Refactor `Checkout.tsx` jadi stepper Address → Payment → Review, **mempertahankan** integrasi Midtrans Snap existing (hanya UI di-wrap, logic submit tidak berubah).

---

## Yang TIDAK dikerjakan (perlu konfirmasi terpisah kalau mau)
- Reviews schema baru (sudah ada `product_reviews`, hanya butuh UI extras — bisa fase 5).
- Dark/light theme toggle (existing default dark, redesign ini light editorial — saya pilih satu, default jadi light untuk pages publik agar match referensi; dashboard tetap dark seperti sekarang).
- Saved payment methods, address book full CRUD, Instagram embed, lookbook, product comparison, push notifications, 360 view, video preview, PWA — semuanya butuh effort besar dan/atau integrasi eksternal; saya akan skip kecuali Anda minta eksplisit.

---

## Risiko & catatan
- Mengganti default page theme dari dark → light hanya untuk public pages bisa menggeser banyak komponen. Saya akan pakai class `light` di route public dan biarkan admin/community tetap dark.
- Saya **tidak akan** menyentuh: Home hero, `AdminDashboard`, edge functions, Midtrans, schema database (di Fase 1).

Konfirmasi untuk lanjut **Fase 1** saja dulu?