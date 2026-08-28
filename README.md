# Laris POS — Point of Sale untuk Coffee Shop & Restoran

Sistem Point of Sale (POS) yang lengkap untuk bisnis F&B — ditenagai **Next.js 16**, **Prisma**, dan **PostgreSQL (Supabase)**. Mendukung alur kasir, dapur, manajemen inventori, hingga **pemesanan mandiri via QR code meja**.

> Dibangun untuk kebutuhan warung/kafe/resto Indonesia: pembayaran tunai & **QRIS (Midtrans)**, pajak + service charge, diskon, laporan harian.

---

## ✨ Fitur Utama

### 🖥️ Point of Sale (POS)
- Kasir cepat: tap menu → masuk keranjang → bayar
- Mode **Dine In / Takeaway**, pilih meja
- Diskon **(% / Rp)**, pajak, dan service charge otomatis
- Pembayaran **Tunai** (dengan hitung kembalian) & **QRIS** (Midtrans Snap)
- Cetak struk (invoice)

### 👨‍🍳 Kitchen Display System (KDS)
- Pesanan masuk real-time (SSE) ke dapur
- Alur status: **Diterima → Disiapkan → Siap → Selesai** (FIFO)
- Tampilan terpisah per meja

### ☕ Manajemen Menu & Inventori
- Kelola **kategori** dan **menu** (upload gambar via Cloudinary)
- Harga, deskripsi, status tersedia/habis
- **Stok** per item + ambang batas stok rendah (low-stock)

### 🍽️ Meja & QR Code
- Kelola nomor meja & kapasitas
- Generate **QR code per meja**
- Pelanggan scan QR → pesan sendiri via halaman `/order/[outlet]/[meja]`

### 📋 Pesanan
- Lihat semua pesanan (filter status & tipe)
- **Detail pesanan** lengkap per transaksi
- **Refund** pesanan

### 📊 Laporan & Pengaturan
- Dashboard ringkasan omzet, jumlah pesanan, produk terlaris
- **Export CSV** data pesanan
- Kelola **staff & role** (admin / kasir / dapur), atur PIN login
- Pengaturan outlet: **pajak & service charge**

### 🔐 Autentikasi
- Login dengan **nama + PIN** (hash bcrypt)
- Role-based access: tampilan & halaman disesuaikan per role

---

## 🧰 Tech Stack

| Layer      | Teknologi |
|-----------|-----------|
| Framework  | Next.js 16 (App Router, Turbopack) |
| Frontend   | React 19, Tailwind CSS 4, lucide-react |
| Database   | PostgreSQL (Supabase) + Prisma ORM 5 |
| Auth       | JWT (jose) + bcryptjs |
| Payment    | Midtrans Snap (QRIS/Virtual Account) |
| Upload     | Cloudinary + browser-image-compression |
| Lainnya    | QR Code (qrcode), Server-Sent Events |

---

## 📸 Screenshot

### POS / Kasir
![POS](public/screenshots/pos.png)

### Manajemen Menu
![Menu](public/screenshots/menu.png)

### Kitchen Display
![Kitchen](public/screenshots/kitchen.png)

### Daftar Pesanan
![Orders](public/screenshots/orders.png)

### Detail Pesanan
![Order Detail](public/screenshots/order-detail.png)

### Pemesanan Mandiri Pelanggan (via QR meja)
![Customer Order](public/screenshots/customer-order.png)

### Inventori
![Inventory](public/screenshots/inventory.png)

### Meja & QR
![Tables](public/screenshots/tables.png)

### Laporan
![Reports](public/screenshots/reports.png)

### Manajemen Staff
![Staff](public/screenshots/staff.png)

### Pengaturan Outlet
![Settings](public/screenshots/settings.png)

### Halaman Login
![Login](public/screenshots/login.png)

---

## 🚀 Menjalankan Secara Lokal

Prasyarat: **Node.js 20+** dan **pnpm** (atau npm/yarn).

```bash
# 1. Install dependensi
pnpm install

# 2. Siapkan env — salin template lalu isi
cp env.example .env
#    DATABASE_URL: connection string PostgreSQL (Supabase) — wajib
#    JWT_SECRET: kunci rahasia JWT (wajib, ganti ke string acak)
#    CLOUDINARY_*: opsional, untuk upload gambar menu
#    MIDTRANS_*: opsional, untuk pembayaran QRIS

# 3. Buat database & jalankan migrasi (buat semua tabel di PostgreSQL)
pnpm prisma migrate dev --name init

# 4. (Opsional) Isi data demo — outlet "Saji Coffee & Eatery", staff, menu, meja
pnpm seed

# 5. Jalankan dev server
pnpm dev
# buka http://localhost:3000
```

> **Setup database:** pakai [Supabase](https://supabase.com) (Postgres serverless, gratis). Buat project → buka **Project Settings → Database → Connection string** → salin URL → isi ke `DATABASE_URL` di `.env`. Sama untuk local & production.

Login default dari seed:

| Role    | Nama | PIN |
|---------|------|-----|
| Admin   | Admin | 123456 |

> Staff kasir/dapur bisa ditambah lewat menu **Staff** setelah login sebagai admin.

---

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── (customer)/order/[outletId]/[tableId]/   # self-order via QR
│   ├── (staff)/                                  # area staff (auth)
│   │   ├── pos/    kitchen/    orders/
│   │   ├── menu/   inventory/  tables/
│   │   ├── staff/  reports/    settings/
│   │   └── login/
│   └── api/                                       # REST API (Prisma)
│       ├── auth/        orders/   menu/
│       ├── categories/  inventory/  tables/
│       ├── staff/       reports/  outlets/
│       ├── payment/     upload/
│       └── orders/sse   # realtime kitchen
├── components/          # UI bersama (toast, skeleton, dll)
├── lib/                 # auth, prisma, db helper
prisma/
├── schema.prisma        # model: Outlet, Staff, MenuItem, Order, OrderItem...
└── seed-demo.mjs        # data demo (outlet, staff, menu, meja, order)
```

---

## 👤 Cara Mengelola User (Staff) & PIN

Manajemen staff (tambah, edit data, ganti PIN, aktif/nonaktif, hapus) dilakukan lewat menu **Staff** sebagai admin.

### Menambah Staff Baru
1. Login sebagai **admin** → buka menu **Staff**.
2. Klik **+ Tambah Staff**.
3. Isi **Nama**, **PIN** (awal login), dan pilih **Role** (`Kasir` / `Dapur` / `Admin`).
4. Klik **Tambah**.

### Mengedit User & Mengganti PIN
1. Di daftar **Staff**, klik **Edit** pada baris staff yang mau diubah.
2. Ubah **Nama** dan/atau **Role** sesuai kebutuhan.
3. Untuk **mengganti PIN**: isi kolom **PIN Baru** dengan PIN baru. *Kosongkan kolom PIN jika PIN tidak diganti* — PIN lama tetap dipakai.
4. Klik **Simpan**. PIN disimpan ter-hash (bcrypt) otomatis.

### Mengaktifkan / Menonaktifkan Staff
- Klik tombol status **Aktif/Nonaktif** di baris staff. Staff nonaktif tidak bisa login.

### Menghapus Staff
- Klik **Hapus** → konfirmasi. Admin tidak bisa menghapus akun sendiri.

> **Catatan:** PIN bersifat numerik. Login dilakukan pakai **Nama + PIN** (bukan email). Hanya admin yang bisa mengelola staff.

---

## 🚀 Deploy ke Vercel

Proyek siap di-deploy ke [Vercel](https://vercel.com) dengan database PostgreSQL (Supabase). Ikuti langkah berikut:

### 1. Siapkan Database (Supabase)
1. Buat project di [Supabase](https://supabase.com) (region dekat lokasi kamu).
2. Buka **Project Settings → Database → Connection string** → salin URL **(connection string)**.
3. Simpan URL itu — akan dipakai sebagai `DATABASE_URL`.

### 2. Jalankan Migrasi
Sebelum deploy, buat semua tabel di database production. Dari lokal (dengan `DATABASE_URL` sudah diisi URL Supabase tadi):
```bash
pnpm prisma migrate deploy
```
Kalau belum ada migrations folder di repo, beri nama dulu sekali:
```bash
pnpm prisma migrate dev --name init
pnpm prisma migrate deploy
```
Lalu (opsional) isi data awal:
```bash
pnpm seed
```

### 3. Set Environment Variables di Vercel
Di dashboard Vercel (project → **Settings → Environment Variables**), tambahkan:

| Variable | Contoh / Catatan |
|----------|------------------|
| `DATABASE_URL` | URL Supabase production kamu |
| `JWT_SECRET` | String acak panjang (wajib) — `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://<nama-project>.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Opsional — untuk upload foto menu |
| `CLOUDINARY_API_KEY` | Opsional |
| `CLOUDINARY_API_SECRET` | Opsional |
| `MIDTRANS_SERVER_KEY` | Opsional — untuk pembayaran QRIS |
| `MIDTRANS_CLIENT_KEY` | Opsional |
| `MIDTRANS_IS_PRODUCTION` | `true` saat produksi (default `false`) |

> **Perlu diingat:** SAMPAIKAN migrasi database **sebelum** first deploy — kalau `migrate deploy` belum dijalankan, app akan error karena tabel belum ada. Setelah env terpasang, lakukan **Redeploy**.

### 4. Import & Deploy
1. Dashboard Vercel → **Add New → Project**.
2. Import repo **Table-QR-POS** dari GitHub.
3. Vercel otomatis mendeteksi **Next.js** + **pnpm**. Build command sudah otomatis menjalankan `prisma generate` sebelum build.
4. Klik **Deploy**. Tunggu selesai → app live di URL Vercel kamu.

> **Upload gambar menu:** tanpa konfigurasi Cloudinary, upload foto menu akan gagal. Isi credential `CLOUDINARY_*` jika ingin fitur upload gambar aktif.

---

## 🗂️ Lisensi

Proyek pribadi — bebas digunakan & dikembangkan. Dibuat dengan ❤️ untuk usaha F&B.
