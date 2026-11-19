# Panduan Lengkap Fitur, Role RBAC & Cara Penggunaan RentUs

Dokumen ini menjelaskan seluruh fitur yang tersedia di aplikasi **RentUs**, pembagian **role dan hak akses (RBAC)**, serta **petunjuk penggunaan lengkap** untuk setiap pengguna (Peminjam Tanpa Login, Mitra Pemilik Barang, Staff Operasional, dan Super Admin).

---

## Daftar Isi

1. [Gambaran Umum & Arsitektur Aplikasi](#1-gambaran-umum--arsitektur-aplikasi)
2. [Daftar Lengkap Semua Fitur](#2-daftar-lengkap-semua-fitur)
3. [Penjelasan Role & Matriks Hak Akses (RBAC)](#3-penjelasan-role--matriks-hak-akses-rbac)
4. [Cara Menggunakan Fitur (Panduan Langkah demi Langkah)](#4-cara-menggunakan-fitur-panduan-langkah-demi-langkah)
   - [A. Untuk Peminjam (Tanpa Login)](#a-untuk-peminjam-tanpa-login)
   - [B. Lacak Sewa, Timer Pengembalian, Upload Ulang & Perpanjangan](#b-lacak-sewa-timer-pengembalian-upload-ulang--perpanjangan)
   - [C. Untuk Mitra / Pemilik Barang (`/dashboard`)](#c-untuk-mitra--pemilik-barang-dashboard)
   - [D. Untuk Staff Operator (`/admin`)](#d-untuk-staff-operator-admin)
   - [E. Untuk Super Admin (`/admin`) — Termasuk Ubah No. WA & QRIS](#e-untuk-super-admin-admin--termasuk-ubah-no-wa--qris)
5. [Status Pesanan, Pembayaran & Alur Pengembalian Stok](#5-status-pesanan-pembayaran--alur-pengembalian-stok)
6. [Panduan Akun Akses & Kode Booking](#6-panduan-akun-akses--kode-booking)

---

## 1. Gambaran Umum & Arsitektur Aplikasi

**RentUs** dibangun menggunakan **Next.js (App Router)** + **Tailwind CSS** dan terhubung ke **Supabase**:

- **9 Tabel Database dengan Row-Level Security (RLS) Aktif**:
  - `roles`, `permissions`, `role_permissions` (sistem RBAC dinamis)
  - `profiles` (profil pengguna & role akun)
  - `store_settings` (identitas toko, nomor WhatsApp Admin, konfigurasi QRIS, biaya layanan, komisi mitra, dan daftar rekening transfer)
  - `items` (katalog barang sewaan dwibahasa ID/EN)
  - `bookings` & `booking_extensions` (transaksi sewa guest & pengajuan perpanjangan)
  - `audit_logs` (catatan aktivitas operasional & perubahan sistem)
- **3 Bucket Supabase Storage Publik**:
  - `item-images` — menyimpan foto produk yang diunggah Admin atau Mitra.
  - `qris-images` — menyimpan gambar QRIS resmi toko yang diunggah Admin.
  - `payment-proofs` — menyimpan bukti transfer / pembayaran QRIS dari peminjam.

---

## 2. Daftar Lengkap Semua Fitur

### A. Etalase Publik & Pengalaman Peminjam (`/`)
1. **Pencarian Real-Time**: Mencari barang berdasarkan nama (Indonesia & Inggris), kategori, lokasi pengambilan, nama pemilik, maupun deskripsi.
2. **Filter 6 Kategori**:
   - **Alat Belajar / Study** (`Study`)
   - **Teknologi & Gadget / Tech** (`Tech`)
   - **Peralatan Kreatif / Creative** (`Creative`)
   - **Gaya Hidup / Lifestyle** (`Lifestyle`)
   - **Acara & Audio / Events** (`Events`)
   - **Lainnya / Other** (`Other`)
   - Setiap kartu kategori menampilkan jumlah item aktif secara otomatis.
3. **5 Mode Pengurutan Katalog**:
   - Populer (`popular`)
   - Harga Terendah (`price-low`)
   - Harga Tertinggi (`price-high`)
   - Terbaru (`newest`)
   - Hanya yang Tersedia (`available` — menyembunyikan barang dengan stok `0`)
4. **Kartu Katalog Informatif**: Foto produk (atau emoji fallback), badge kondisi barang, sisa stok tersedia (`unit tersisa` / `Stok habis`), batas durasi sewa maksimal, lokasi pengambilan, dan harga per hari.
5. **Simpan Favorit (`❤️ Tersimpan`)**: Menyimpan barang ke daftar favorit di browser (`localStorage`) tanpa akun, lengkap dengan modal daftar tersimpan untuk langsung melanjutkan ke sewa.
6. **Checkout Guest Tanpa Login (`ItemBookingModal`)**:
   - Mengatur **jumlah unit** (`1` s/d stok tersedia) dan **lama sewa** (`1` s/d `max_days` barang).
   - Kalkulasi rincian biaya otomatis: `Subtotal sewa + Biaya layanan platform (%) + Deposit jaminan = Total bayar`.
   - Pengisian identitas peminjam: Nama lengkap, No. WhatsApp, Email (opsional), Jenis Identitas (`KTM`, `KTP`, `SIM`, `PASSPORT`), Nomor Identitas, Alamat/Kos/Asrama, dan Catatan tambahan.
   - Pembayaran via **QRIS** (mendukung **Generator QRIS Otomatis** dengan payload NMID atau **Gambar QRIS Asli** hasil upload admin + tombol **Perbesar/Zoom QR**) maupun metode transfer **Bank / E-Wallet** sesuai pengaturan admin.
   - Upload gambar bukti pembayaran langsung ke bucket `payment-proofs` + kolom opsional referensi pembayaran.
   - Menghasilkan **Kode Booking unik** (format `RNT-XXXXXX`) dan **Tracking Token** yang tersimpan otomatis di browser.
7. **Pelacak Sewa Lintas Perangkat (`Sewa Saya`)**:
   - Pencarian pesanan dari perangkat lain cukup dengan **Kode Booking + No. WhatsApp atau Email**.
   - **Countdown Pengembalian Live** yang diperbarui setiap 1 detik (`hari / jam / menit / detik tersisa` atau peringatan keterlambatan).
   - Upload bukti bayar susulan untuk pesanan dengan status `Menunggu Pembayaran` (`pending_payment`).
   - Pengajuan **perpanjangan sewa** (`+1` s/d `+7` hari pada form UI, atau maksimal `14` hari pada API), lengkap dengan kalkulasi biaya tambahan, pilihan metode bayar/QRIS, dan upload bukti bayar.
   - Tombol **Konfirmasi Sudah Dikembalikan** dari sisi peminjam dan tombol **Chat WhatsApp Admin**.
8. **Tombol WhatsApp CS Admin Langsung**: Terhubung otomatis ke nomor WhatsApp terbaru yang diatur Admin (di detail barang, struk booking, modal pelacakan sewa, bagian komunitas, dan footer).

### B. Tema, Bahasa & Desain Mobile-First
1. **Toggle Bahasa `ID` / `EN`**: Mengganti seluruh teks antarmuka, status pesanan, label kategori, deskripsi barang, dan catatan QRIS antara **Bahasa Indonesia** dan **English** (tersimpan di browser).
2. **Toggle Tema `Light` / `Dark`**: Tersedia langsung di navbar, menu mobile, modal preferensi, halaman login, panel mitra, dan konsol admin.
3. **Antarmuka Mobile-First**: Menu drawer khusus mobile pada `< lg`, kartu katalog/RBAC mobile (`md:hidden`) di panel admin, tombol dan angka badge rata tengah, serta proteksi anti-overflow mulai layar `360px`.

### C. Panel Mitra Pemilik Barang (`/dashboard`)
1. **Tab `Barang Saya` (CRUD Listing Sendiri)**: Menambah, mengedit, mengaktifkan/nonaktifkan (`Draft` vs `Aktif`), mengunggah foto produk (`item-images`), mengatur harga, deposit, stok, batas hari, serta mengisi **rekening payout** (BCA, Mandiri, BNI, BRI, BSI, BTN, Bank Jago, DANA, GoPay, OVO, Other).
2. **Tab `Sewa Masuk`**: Memantau pesanan untuk barang miliknya, melihat identitas penyewa dan periode sewa, melihat **rincian payout bersih** (`Subtotal − Komisi Platform`), menyetujui/menolak pengajuan perpanjangan sewa, mengonfirmasi pengembalian fisik barang (`Konfirmasi Barang Kembali`), dan menghubungi penyewa via WhatsApp.

### D. Konsol Admin & Staff (`/admin` — 6 Tab)
1. **Tab 1 — Ringkasan (`Overview`)**:
   - Statistik **Total Pendapatan Terverifikasi** & **Komisi Platform**.
   - Antrean **Menunggu Verifikasi QRIS** (dengan tombol pintas ke daftar pesanan).
   - Jumlah **Sewa Aktif / Berjalan** & peringatan **Terlambat kembali** (`overdue`).
   - Rasio **Barang Katalog Aktif / Total** & nomor WhatsApp Admin yang aktif.
   - Kartu daftar hak akses RBAC yang dimiliki akun saat ini.
2. **Tab 2 — Pesanan & Verifikasi QRIS (`Bookings`)**:
   - Filter berdasarkan status (`Semua`, `Menunggu Verifikasi`, `Menunggu Pembayaran`, `Sedang Disewa`, `Menunggu Konfirmasi Kembali`, `Sudah Dikembalikan`, `Dibatalkan`) serta pencarian kode, nama, nomor WA, identitas, atau nama barang.
   - **Lightbox Bukti Pembayaran** untuk mengecek foto transfer/QRIS peminjam dalam ukuran penuh.
   - Aksi **Verifikasi Lunas & Aktifkan** atau **Tolak Bukti**.
   - Dropdown pengubah status sewa manual, tombol **Setujui / Tolak Perpanjangan Sewa**, tombol **Konfirmasi Pengembalian (Pulihkan Stok)**, dan tautan cepat **WhatsApp Peminjam**.
3. **Tab 3 — CRUD Barang (`Catalog`)**:
   - Mengelola seluruh barang sewaan dari semua pemilik (`scope=all`), mencari barang, menambah, mengedit, atau menghapus barang.
   - Kontrol stok cepat (`-` / `tersedia/total` / `+`) dan tombol cepat aktif/nonaktif barang.
4. **Tab 4 — Pengaturan WA Admin & QRIS (`Settings`)**:
   - Mengubah **Nomor WhatsApp Admin** (+ link tes `wa.me`), **Nama Tampilan Admin**, **Nama Platform/Toko**, **Titik Pengambilan Utama**, **Biaya Layanan Peminjam (%)**, dan **Komisi Platform Mitra (%)**.
   - Mengatur mode pembayaran QRIS:
     - **Generator QRIS Otomatis** (isi **Nama Merchant QRIS** & **NMID**, QR langsung terbentuk otomatis + preview).
     - **Upload Gambar QRIS Resmi** (unggah file `PNG/JPG/WEBP` ke bucket `qris-images` atau tempel URL gambar QRIS).
   - Mengelola **Daftar Rekening Bank & E-Wallet** (tambah, ubah kode/label/no. rekening/atas nama, atau hapus metode selain `QRIS`).
   - Live preview kartu QRIS di sisi kanan layar sebelum disimpan.
5. **Tab 5 — RBAC User & Role (`RBAC`)**:
   - Form **Buat Akun Baru** (`admin`, `staff`, `owner`, `renter`).
   - Tabel & kartu pengguna untuk mengubah **Role** atau status aktif (**Active / Suspended**).
   - **Matriks Hak Akses RBAC Live**: Centang atau hapus centang tiap permission untuk setiap role secara real-time.
6. **Tab 6 — Log Aktivitas (`Audit Logs`)**:
   - Menampilkan hingga 80 catatan aktivitas terbaru lengkap dengan waktu, email aktor, role, jenis aksi, dan target entitas.

---

## 3. Penjelasan Role & Matriks Hak Akses (RBAC)

RentUs memiliki **5 Role** (4 role tersimpan di tabel `roles` + 1 role virtual `guest` untuk pengunjung tanpa login). Seluruh izin divalidasi di sisi Next.js Server/API dan database PostgreSQL (RLS & RPC).

| Role | Level | Deskripsi Singkat | Halaman yang Dapat Diakses |
| :--- | :---: | :--- | :--- |
| **`admin`** (*Admin Utama*) | **100** | Kontrol penuh sistem: seluruh transaksi, CRUD semua barang, pengaturan WA & QRIS, manajemen user & matriks RBAC, serta audit log. | `/`, `/dashboard`, `/admin` (semua 6 tab) |
| **`staff`** (*Petugas / Kasir*) | **70** | Akses operasional harian: memverifikasi bukti QRIS/transfer, mengubah status pesanan, konfirmasi pengembalian & perpanjangan, atur ketersediaan/stok barang, melihat audit log & settings (read-only). Tidak bisa mengubah WA Admin, QRIS, pengaturan RBAC, atau menghapus barang. | `/`, `/dashboard`, `/admin` (Overview, Pesanan, Katalog terbatas, Settings read-only, Audit) |
| **`owner`** (*Pemilik Barang / Mitra*) | **40** | Akses mitra pemilik barang: menambah/mengedit/menghapus barang milik sendiri, melihat pesanan untuk barang sendiri, menyetujui perpanjangan, dan konfirmasi pengembalian barang sendiri. Diblokir (`403`) dari konsol `/admin`. | `/`, `/dashboard` |
| **`renter`** (*Peminjam Terdaftar*) | **10** | Role standar bila pengguna mendaftar akun biasa tanpa izin mitra/staff. Dapat menyewa barang di etalase sebagaimana `guest`. | `/` |
| **`guest`** (*Tamu Tanpa Login*) | **0** | Pengunjung umum. Bisa mencari barang, menyimpan favorit, menyewa barang dengan mengisi form data diri, mengunggah bukti bayar, melacak pesanan lewat kode booking, mengajukan perpanjangan, dan mengonfirmasi pengembalian tanpa perlu login. | `/` |

### Daftar 17 Permission Granular & Matriks Bawaan

Pengaturan default di tabel `role_permissions` (dapat disesuaikan oleh `admin` langsung di tab **RBAC User & Role**):

| Kategori | Kode Permission | Fungsi | `admin` | `staff` | `owner` | `renter` / `guest` |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Bookings** | `bookings:view_all` | Melihat seluruh transaksi & identitas peminjam | ✓ | ✓ | — | — |
| **Bookings** | `bookings:view_own_listings` | Melihat pesanan khusus barang milik sendiri | ✓ | — | ✓ | — |
| **Bookings** | `bookings:verify_payment` | Menyetujui / menolak bukti bayar QRIS/transfer | ✓ | ✓ | — | — |
| **Bookings** | `bookings:update_status` | Mengubah status sewa (`active`, `overdue`, dll.) | ✓ | ✓ | — | — |
| **Bookings** | `bookings:confirm_owner_return` | Konfirmasi fisik kembali & pulihkan stok | ✓ | ✓ | ✓ | — |
| **Bookings** | `bookings:approve_extension` | Menyetujui / menolak perpanjangan sewa | ✓ | ✓ | ✓ | — |
| **Items** | `items:manage_all` | CRUD penuh seluruh barang di katalog | ✓ | — | — | — |
| **Items** | `items:toggle_availability` | Ubah status aktif & stok tersedia barang | ✓ | ✓ | — | — |
| **Items** | `items:create_own` | Menambah barang milik sendiri | ✓ | — | ✓ | — |
| **Items** | `items:update_own` | Mengubah barang milik sendiri | ✓ | — | ✓ | — |
| **Items** | `items:delete_own` | Menghapus barang milik sendiri | ✓ | — | ✓ | — |
| **Settings** | `settings:view` | Melihat konfigurasi toko, WA & QRIS | ✓ | ✓ | — | — |
| **Settings** | `settings:manage_admin_contact` | Ubah nomor WA Admin, fee %, & titik temu | ✓ | — | — | — |
| **Settings** | `settings:manage_payment_qris` | Ubah/upload QRIS, NMID & daftar bank | ✓ | — | — | — |
| **RBAC** | `rbac:view_users` | Melihat daftar user & matriks role | ✓ | — | — | — |
| **RBAC** | `rbac:manage_roles` | Buat akun, ubah role/status & edit matriks | ✓ | — | — | — |
| **Audit** | `audit:view` | Melihat catatan log aktivitas sistem | ✓ | ✓ | — | — |

---

## 4. Cara Menggunakan Fitur (Panduan Langkah demi Langkah)

### A. Untuk Peminjam (Tanpa Login)

1. **Cari & Pilih Barang**:
   - Buka halaman utama `/`. Gunakan **kolom pencarian** di Hero atau klik salah satu dari **6 kartu kategori** dan **tombol urutkan**.
   - Klik ikon hati (`❤️`) untuk menyimpan barang ke favorit, atau klik **`Sewa / Detail ↗`** pada barang yang ingin dipinjam.
2. **Isi Data Diri & Detail Sewa**:
   - Atur **Jumlah Unit** dan **Lama Sewa (Hari)**. Rincian harga sewa, biaya layanan, deposit jaminan, dan total bayar akan terhitung otomatis.
   - Lengkapi form identitas peminjam: **Nama Lengkap**, **No. WhatsApp**, **Email** (opsional), **Jenis Identitas** (`KTM`/`KTP`/`SIM`/`PASSPORT`), **Nomor Identitas**, **Alamat / Kos / Asrama**, dan **Catatan** (opsional).
3. **Bayar via QRIS atau Transfer Bank**:
   - Pilih metode **`QRIS`** untuk memindai kode QR (klik **Perbesar** bila perlu melihat QR lebih jelas), atau pilih rekening **Bank / E-Wallet** lain yang tersedia.
   - Unggah foto/screenshot **Bukti Pembayaran** (opsional saat checkout, bisa juga disusulkan nanti lewat *Sewa Saya*) dan isi nomor referensi bila ada.
4. **Simpan Kode Booking**:
   - Klik tombol konfirmasi sewa. Sistem akan membuat **Kode Booking** (mis. `RNT-123456`) dan menyimpannya otomatis di browser Anda.
   - Gunakan tombol **Salin Kode** jika suatu saat ingin melacak pesanan dari HP/laptop berbeda, atau klik **Tanya Admin via WhatsApp** bila ada pertanyaan.

### B. Lacak Sewa, Timer Pengembalian, Upload Ulang & Perpanjangan

1. Klik tombol **`Sewa Saya`** pada navbar (atau ikon jam di tampilan mobile / tombol **Lacak sewa saya** di Hero).
2. Jika Anda meminjam dari browser yang sama, daftar pesanan langsung muncul beserta **timer hitung mundur batas pengembalian (update per detik)**.
3. **Melacak dari Perangkat Lain**:
   - Masukkan **Kode Booking** dan **No. WhatsApp atau Email** yang dipakai saat meminjam pada kotak *"Lacak Pesanan dari Perangkat Lain"*, lalu klik **Cari Pesanan**.
4. **Upload Bukti Pembayaran Susulan**:
   - Jika status masih *Menunggu Pembayaran*, klik tombol **Upload Bukti Bayar** pada kartu pesanan tersebut untuk mengirimkan foto bukti transfer ke Admin.
5. **Ajukan Perpanjangan Sewa**:
   - Saat pesanan aktif, klik **Ajukan Perpanjangan**, pilih tambahan hari (`+1` s/d `+7` hari), pilih metode bayar, unggah bukti transfer tambahan, lalu kirim pengajuan agar disetujui Admin/Mitra.
6. **Konfirmasi Pengembalian**:
   - Setelah barang dikembalikan ke titik pengambilan/pemilik, klik **Konfirmasi Sudah Dikembalikan**. Stok barang akan pulih penuh ke katalog setelah Admin/Mitra mengonfirmasi penerimaan barang.

### C. Untuk Mitra / Pemilik Barang (`/dashboard`)

1. Klik **Titip sewakan barang** (atau masuk melalui `/login`), lalu **Daftar sebagai Mitra** atau login dengan akun role `owner`.
2. Buka **`/dashboard`**:
   - **Menambah / Mengelola Barang (`Barang Saya`)**: Klik **`+ Tambah Barang Baru`**, unggah foto produk, isi nama & deskripsi (ID & EN), tentukan harga/hari, deposit, maksimal hari, total stok, lokasi, dan detail rekening bank/e-wallet payout Anda. Gunakan tombol **Edit** atau **Hapus** kapan saja.
   - **Memproses Pesanan Masuk (`Sewa Masuk`)**: Pantau identitas peminjam, periode sewa, dan estimasi **Net Payout** (setelah komisi platform). Jika ada pengajuan perpanjangan sewa, klik **Setujui** atau **Tolak**. Saat peminjam mengembalikan barang fisik, klik **Konfirmasi Barang Kembali**.

### D. Untuk Staff Operator (`/admin`)

1. Login melalui `/login` menggunakan akun ber-role `staff`, lalu masuk ke **`/admin`**.
2. **Memverifikasi Pembayaran QRIS / Transfer**:
   - Buka tab **Pesanan & Verifikasi QRIS** → filter ke *Menunggu Verifikasi* (atau klik shortcut dari tab Ringkasan).
   - Klik **Lihat Bukti Transfer** untuk mengecek foto bukti bayar secara penuh.
   - Klik **`Verifikasi Lunas & Aktifkan`** jika pembayaran valid (status menjadi `Sedang Disewa`), atau **`Tolak Bukti`** jika tidak sesuai.
3. **Mengelola Status, Perpanjangan & Pengembalian**:
   - Ubah status pesanan via dropdown (`pending_payment`, `waiting_verification`, `active`, `overdue`, `return_pending`, `returned`, `cancelled`).
   - Klik **Setujui / Tolak** pada pengajuan perpanjangan dan **Konfirmasi Pengembalian (Pulihkan Stok)** ketika barang fisik diterima kembali.
4. **Atur Ketersediaan Barang**:
   - Di tab **CRUD Barang**, Staff dapat menyesuaikan jumlah stok tersedia (`-` / `+`) atau mengaktifkan/menonaktifkan listing barang tanpa menghapusnya.

### E. Untuk Super Admin (`/admin`) — Termasuk Ubah No. WA & QRIS

Login menggunakan akun `admin` lalu masuk ke **`/admin`**:

1. **Mengubah Nomor WhatsApp Admin & Identitas Toko**:
   - Buka tab **Pengaturan WA Admin & QRIS**.
   - Ubah kolom **Nomor WhatsApp Admin** (format diawali kode negara, contoh `6281234567890`). Klik link **`wa.me/...`** di bawah input untuk langsung mengetes tautan WA.
   - Sesuaikan **Nama Tampilan Admin**, **Nama Platform / Toko**, **Titik Pengambilan Utama**, **Biaya Layanan Peminjam (%)**, dan **Komisi Platform Mitra (%)**, lalu klik **Simpan Pengaturan**.
   - Perubahan langsung berlaku untuk semua tombol WhatsApp dan perhitungan checkout di etalase publik.
2. **Mengatur Mode Generator QRIS Otomatis atau Upload Gambar QRIS Asli**:
   - Masih di tab **Pengaturan WA Admin & QRIS**, pilih kartu mode:
     - **`Mode Generator QRIS Otomatis`**: Isi **Nama Merchant QRIS** dan **NMID** untuk menghasilkan QR code dinamis otomatis.
     - **`Mode Upload Gambar QRIS`**: Klik **`Upload Gambar QRIS`** (pilih file PNG/JPG/WEBP untuk diunggah ke Supabase Storage `qris-images`) atau tempel URL gambar QRIS Anda, lalu cek kotak **Live Preview QRIS** di sebelah kanan.
   - Klik **Simpan Pengaturan** agar halaman checkout & modal pembayaran langsung menampilkan QRIS terbaru.
3. **Mengatur Daftar Rekening Bank & E-Wallet**:
   - Di bagian **Daftar Metode Transfer & E-Wallet**, klik **`+ Tambah`**, isi Kode (mis. `BCA`, `GOPAY`), Label, No. Rekening/VA, dan Atas Nama, lalu simpan.
4. **CRUD Semua Barang**:
   - Di tab **CRUD Barang**, Admin dapat menambah barang baru, mengedit seluruh field barang, mengatur stok dengan cepat (`-` / `+`), mengaktifkan/nonaktifkan item, serta menghapus barang yang belum memiliki riwayat booking.
5. **Mengelola Akun & Matriks RBAC**:
   - Di tab **RBAC User & Role**:
     - Isi form **Buat Akun Staff / Mitra / Admin Baru** untuk menambah operator/mitra/admin baru.
     - Ubah role pengguna atau toggle status **Active / Suspended** langsung dari daftar pengguna.
     - Pada **Matriks Hak Akses Role**, centang atau hapus centang kotak permission per role untuk mengatur batasan fitur tiap role secara langsung.
   - Pantau riwayat perubahan dan verifikasi pada tab **Log Aktivitas**.

---

## 5. Status Pesanan, Pembayaran & Alur Pengembalian Stok

### Status Sewa (`status`)
- `pending_payment` *(Menunggu Pembayaran)* — Booking masuk tanpa bukti bayar; peminjam dapat mengunggah bukti lewat *Sewa Saya*.
- `waiting_verification` *(Menunggu Verifikasi)* — Bukti QRIS/transfer sudah diunggah; menunggu pengecekan Admin/Staff.
- `active` *(Sedang Disewa)* — Pembayaran terverifikasi lunas dan barang sedang dipakai.
- `overdue` *(Terlambat Kembali)* — Melewati waktu `due_at` dan belum selesai dikembalikan.
- `return_pending` *(Menunggu Konfirmasi Kembali)* — Peminjam sudah menekan konfirmasi kembali; menunggu pengecekan fisik oleh Admin/Staff/Mitra.
- `returned` *(Sudah Dikembalikan)* — Barang telah dikonfirmasi kembali oleh Admin/Staff/Mitra; stok unit otomatis dikembalikan ke katalog.
- `cancelled` *(Dibatalkan)* — Pesanan dibatalkan (stok dikembalikan jika belum dipulihkan).

### Status Pembayaran (`payment_status`)
- `unpaid` *(Belum Dibayar)*
- `pending_verification` *(Menunggu Verifikasi)*
- `paid` *(Lunas)*
- `rejected` *(Ditolak)*
- `refunded` *(Dikembalikan / Refund)*

---

## 6. Panduan Akun Akses & Kode Booking

### Autentikasi Pengguna & Akses Role (`/login`)
Akses masuk web RentUs diperuntukkan bagi pengelola operasional dan pemilik barang titipan:
- **Admin & Staff**: Menggunakan akun resmi yang didaftarkan oleh Administrator melalui konsol `/admin` (tab RBAC) atau Supabase Dashboard.
- **Mitra Pemilik Barang**: Dapat langsung mendaftar secara mandiri melalui tombol **Daftar sebagai Mitra** di modal login.
- **Peminjam Umum (Guest)**: Tidak memerlukan akun atau kata sandi untuk menyewa maupun melacak barang.

### Kode Booking & Pelacakan Sewa
Setiap transaksi sewa yang berhasil dibuat akan menghasilkan **Kode Booking resmi** (format: `RNT-XXXXXX`) dan **Tracking Token**:
1. Peminjam yang menggunakan perangkat yang sama dapat langsung memantau pesanan melalui tombol **Sewa Saya** di navbar.
2. Untuk melacak dari perangkat lain, buka **Sewa Saya** → form **Lacak Pesanan dari Perangkat Lain**, lalu masukkan **Kode Booking** dan **No. WhatsApp atau Email** yang digunakan saat checkout.

