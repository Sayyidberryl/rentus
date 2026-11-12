# RentUs — Platform Rental Kampus & Komunitas (Next.js + Supabase RBAC)

**RentUs** adalah platform sewa barang berbasis **Next.js (App Router)** dan **Supabase (Postgres, Auth, Storage, RLS, RPC)** yang siap dideploy ke **Vercel**. Dirancang **mobile-first** dengan dukungan **Zero-Login Guest Borrowing** (peminjam cukup mengisi data diri saat menyewa tanpa wajib membuat akun), **pembayaran QRIS fleksibel** (QRIS dummy otomatis atau upload QRIS resmi di panel admin), **WhatsApp Admin dinamis**, **RBAC penuh**, **Light/Dark mode**, serta dwibahasa **Indonesia & Inggris (`ID`/`EN`)**.

> 📘 **Dokumentasi Lengkap**: Baca [**`PANDUAN_FITUR.md`**](./PANDUAN_FITUR.md) untuk daftar lengkap semua fitur, detail 5 role & 17 permission RBAC, serta panduan penggunaan langkah demi langkah untuk Peminjam, Mitra, Staff, dan Admin.

---

## Ringkasan Fitur Utama

- **Pinjam Barang Tanpa Login (Guest Checkout)**: Peminjam memilih barang, mengisi data diri (`Nama`, `WhatsApp`, `KTM/KTP/SIM/Paspor`, `Alamat`), melihat kalkulasi biaya sewa + biaya layanan + deposit, memilih metode **QRIS** atau **Transfer Bank/E-Wallet**, mengunggah bukti bayar, dan langsung mendapat **Kode Booking** (`RNT-XXXXXX`).
- **Lacak Sewa Lintas Perangkat (`Sewa Saya`)**: Cek status pesanan memakai **Kode Booking + No. WA/Email**, lihat timer pengembalian **live tiap 1 detik**, kirim bukti transfer susulan, ajukan perpanjangan hari sewa, konfirmasi pengembalian barang, dan hubungi WhatsApp Admin dalam 1 klik.
- **Konfigurator QRIS & WhatsApp Admin (`/admin`)**:
  - **2 Mode QRIS**: *QRIS Dummy Otomatis* (dibentuk dinamis dari Nama Merchant & NMID) atau *Upload Gambar QRIS Resmi* (`PNG/JPG/WEBP` ke bucket `qris-images`).
  - Ubah **Nomor WhatsApp Admin**, nama tampilan admin, nama platform/toko, titik pengambilan utama, biaya layanan peminjam (%), komisi platform mitra (%), serta daftar rekening Bank/E-Wallet secara langsung.
- **CRUD Barang & Panel Mitra (`/dashboard` & `/admin`)**:
  - Admin mengelola seluruh katalog barang (CRUD penuh, upload foto ke `item-images`, penyesuaian stok cepat `-` / `+`, dan aktivasi listing).
  - Mitra / Pemilik Barang (`owner`) mengelola barang miliknya sendiri, melihat pesanan masuk, estimasi payout bersih, menyetujui perpanjangan, dan mengonfirmasi pengembalian barang.
- **RBAC Database-Enforced (5 Role · 17 Permission)**:
  - Role: `admin` (Level 100), `staff` (Level 70), `owner` (Level 40), `renter` (Level 10), dan `guest` (tanpa login).
  - Dilengkapi **Matriks Permission RBAC Live** dan **Audit Log** di konsol `/admin`, serta ditegakkan via PostgreSQL Row-Level Security (RLS) dan `SECURITY DEFINER` RPC.
- **Tampilan Adaptif & Bilingual**: Toggle cepat **Light / Dark mode** dan **Indonesia / English**, responsif dari mobile `360px` hingga desktop.

---

## Peta Halaman (Routes)

| Route | Deskripsi | Akses |
| :--- | :--- | :--- |
| `/` | Etalase utama, kategori, pencarian, favorit, checkout guest, pelacak `Sewa Saya` | Publik (`guest` & semua role) |
| `/login` | Halaman masuk Staff/Admin/Mitra, daftar akun Mitra, dan pengisi cepat akun demo | Publik |
| `/dashboard` | Panel Mitra (`Barang Saya` CRUD & `Sewa Masuk` + payout bersih) | Login (`owner`, `staff`, `admin`) |
| `/admin` | Konsol Operasional (6 tab: Ringkasan, Pesanan & QRIS, CRUD Barang, Pengaturan WA & QRIS, RBAC, Audit Log) | Login (`staff`, `admin`) |

---

## Menjalankan Secara Lokal

### 1. Siapkan Environment Variables

Salin `.env.example` menjadi `.env.local` dan isi kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
# Opsional (untuk membuat akun Staff/Mitra langsung terkonfirmasi email dari /admin)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install & Jalankan Server Development

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

### 3. Verifikasi Typecheck, Lint & Build

```bash
npx tsc --noEmit
npm run lint
npm run build
```

---

## Panduan Deploy ke Vercel

1. Import repository GitHub ini di dashboard **Vercel**.
2. Pada menu **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - *(Opsional)* `SUPABASE_SERVICE_ROLE_KEY` agar admin dapat membuat akun baru dari tab RBAC tanpa batas rate-limit email.
3. Framework Preset: **Next.js** (otomatis terdeteksi), lalu klik **Deploy**.

---

## Akun Uji Coba RBAC (Halaman `/login`)

| Role | Level | Email | Password | Akses Utama |
| :--- | :---: | :--- | :--- | :--- |
| **Super Admin** (`admin`) | 100 | `admin@rentus.id` | `RentUsAdmin2026!` | Akses penuh `/admin` (6 tab) & `/dashboard` |
| **Staff Operator** (`staff`) | 70 | `staff@rentus.id` | `RentUsStaff2026!` | Verifikasi QRIS, status pesanan, atur ketersediaan barang |
| **Owner / Mitra** (`owner`) | 40 | `owner@rentus.id` | `RentUsOwner2026!` | Kelola barang & pesanan milik sendiri di `/dashboard` |

> Untuk menguji pelacakan sewa guest tanpa login lewat tombol **Sewa Saya**, gunakan kode demo `RNT-DEMO01` (WA `6281223344556`) atau `RNT-DEMO02` (WA `6285711229900`).

---

## Struktur Proyek Inti

```text
src/
├── proxy.ts                         # Middleware sesi Supabase SSR
├── app/
│   ├── page.tsx                     # SSR halaman etalase utama (/)
│   ├── login/page.tsx               # Halaman autentikasi & demo akun RBAC
│   ├── dashboard/page.tsx           # SSR Panel Mitra (/dashboard)
│   ├── admin/page.tsx               # SSR Konsol Admin & Staff (/admin)
│   └── api/
│       ├── storefront/route.ts      # Feed item aktif, settings & status RBAC
│       ├── items/route.ts           # GET (public/mine/all) & POST barang
│       ├── items/[id]/route.ts      # PATCH (edit/toggle stok) & DELETE barang
│       ├── bookings/route.ts        # POST booking guest & GET lookup kode/token
│       ├── bookings/action/route.ts # POST bukti bayar, perpanjang, konfirmasi kembali
│       └── admin/
│           ├── bookings/route.ts    # GET pesanan, verifikasi QRIS, status, retur, perpanjang
│           ├── settings/route.ts    # GET/PATCH WA Admin, QRIS, fee %, rekening bank
│           └── rbac/route.ts        # GET/POST/PATCH user, role, permission matrix & audit log
├── components/                      # StorefrontApp, Navbar, Modals, QrisCard, Admin & Owner clients
├── lib/                             # Supabase client/server, RBAC helper, format, upload & i18n
└── types/rental.ts                  # Definisi tipe TypeScript (Item, Booking, RBAC, StoreSettings)
```
