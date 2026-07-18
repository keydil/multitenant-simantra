# 🎫 SIMANTRA — Sistem Manajemen Antrian Multi-Tenant & SaaS

Sistem Manajemen Antrian (**SIMANTRA**) adalah platform SaaS (*Software as a Service*) tingkat perusahaan (*enterprise-grade*) yang dirancang khusus untuk instansi pemerintahan dan swasta di Indonesia. Platform ini memungkinkan manajemen antrian multi-tenant secara terisolasi dengan fitur *real-time monitoring*, penyesuaian identitas merek (*white-labeling*), pemanggilan suara otomatis (*Text-to-Speech*), integrasi buku tamu dengan kamera, serta pelaporan Excel yang profesional.

> **Catatan Teknis**: Proyek ini dibangun menggunakan Supabase sebagai *BaaS* untuk keperluan akademik (Tugas Akhir). Arsitektur dirancang modular sehingga migrasi ke backend **NestJS** mandiri di masa depan cukup mengubah fungsi di dalam folder `hooks/` dan `lib/supabase/` — tanpa perlu menulis ulang komponen UI.

---

## 🏗️ Gambaran Umum Arsitektur

SIMANTRA dirancang dengan prinsip pemisahan data yang ketat (*row-level isolation*) dan arsitektur *hybrid real-time* untuk memastikan performa yang cepat dan toleransi kegagalan (*fault tolerance*) yang tinggi.

```
                  ┌──────────────────────────────────────────────┐
                  │            SUARA PANGGILAN (TTS)             │
                  └──────────────────────┬───────────────────────┘
                                         │
┌────────────────────────┐    ┌──────────▼─────────────┐    ┌────────────────────────┐
│  🖥️ KIOSK PENGUNJUNG   │    │  📺 TV DISPLAY BOARD   │    │ 📱 REAL-TIME STATUS    │
│  Ambil Tiket & Layanan │    │  Monitor Ruang Tunggu   │    │ (Scan QR dari HP)      │
└──────────┬─────────────┘    └──────────▲─────────────┘    └──────────▲─────────────┘
           │                             │                             │
           │ (Insert Entry)              │ (WebSocket Sync)            │ (WebSocket Sync)
           │                             │                             │
           └─────────────────────► 🗄️ SUPABASE ◄───────────────────────┘
                                 PostgreSQL + RLS
                                         ▲
                                         │ (CRUD / Call Next)
                                         │
                              ┌──────────┴─────────────┐
                              │  💼 OPERATOR PANEL     │
                              │  Pemanggilan Antrian   │
                              └────────────────────────┘
```

---

## 📊 Fitur Utama & Keunggulan

### 1. 🎨 Dynamic White-Labeling (Per-Tenant)
Setiap instansi (tenant) memiliki tema visualnya sendiri. Sistem membaca kode warna primer, sekunder, aksen, logo, serta favicon langsung dari database `tenant_themes` dan mengaplikasikannya secara dinamis ke halaman kiosk, tiket, display TV, dan operator tanpa memerlukan kompilasi ulang kode.

### 2. ⚡ Real-Time WebSocket & Polling Fallback
Menggunakan koneksi WebSocket dari **Supabase Realtime** untuk sinkronisasi instan antara tindakan operator (misal: tombol "Panggil") dengan tampilan layar tunggu TV dan handphone pengunjung. Jika koneksi WebSocket terganggu, sistem secara otomatis beralih ke *smart polling* (interval 2-3 detik) untuk menjaga kelangsungan layanan.

### 3. 🗣️ Native Text-to-Speech (TTS) Bahasa Indonesia
Sistem dilengkapi dengan mesin suara otomatis berbasis Web Speech API yang telah dioptimalkan untuk bahasa Indonesia (`id-ID`). TV Display dan halaman status pengunjung akan secara otomatis mengeja nomor tiket dan loket tujuan secara presisi (contoh: *"Nomor antrian A nol nol empat, silakan menuju loket pendaftaran"*).

### 4. 📸 Buku Tamu Digital & Ekspor Excel Profesional
Fitur buku tamu publik yang dilengkapi dengan modul tangkapan kamera langsung (*live snapshot*), pencarian otomatis instansi (*autocomplete*), serta panel administrator yang mampu mengekspor daftar tamu ke dalam format Excel (`.xlsx`) lengkap dengan kustomisasi layout tabel yang rapi menggunakan pustaka `xlsx-js-style`.

### 5. 🔐 Keamanan Berlapis (Multi-Layer Security)
- **Postgres RLS** — Kebijakan keamanan di level database memastikan admin/operator hanya bisa akses data tenant mereka sendiri, bukan tenant lain.
- **Auth Guard Berlapis** — Middleware server-side + layout client-side + role validation di `signIn`. Superadmin tidak bisa login via portal tenant dan sebaliknya.
- **Soft Delete** — Data tidak pernah benar-benar dihapus (`is_active = false`), mencegah kehilangan data permanen.
- **Redirect Cerdas** — Logout dari portal tenant Dinkes mengarah ke `/dinkes/login`, bukan ke portal superadmin.

---

## 📂 Peta Struktur Folder & Halaman

Struktur proyek memanfaatkan keunggulan Next.js App Router untuk merutekan halaman publik dan terproteksi secara elegan:

```bash
simantra-multitenant/
├── app/
│   ├── [tenant]/                       # 🏢 Dynamic Route Spesifik Per-Tenant
│   │   ├── _components/                # Komponen modular visual tenant (kiosk-home)
│   │   ├── admin/                      # Dashboard admin lokal instansi
│   │   │   ├── counters/               # ✅ CRUD kelola loket & jenis layanan
│   │   │   ├── guest-book/             # ✅ Rekapan tamu + filter + Ekspor Excel
│   │   │   ├── operators/              # ✅ CRUD kelola petugas operator & admin
│   │   │   └── settings/               # ✅ Profil instansi & theme white-labeling
│   │   ├── display/                    # Halaman TV monitor ruang tunggu (TTS aktif)
│   │   ├── guest-book/                 # Halaman pengisian buku tamu (kamera aktif)
│   │   ├── login/                      # Portal login petugas per-instansi
│   │   ├── operator/                   # Panel panggil/hold/complete untuk petugas loket
│   │   ├── queue/                      # Alur alokasi antrian
│   │   │   ├── status/[id]/            # Pantau antrian dari HP pengunjung (real-time)
│   │   │   └── ticket/[id]/            # Tampilan tiket antrian + QR Code dinamis
│   │   └── page.tsx                    # Kiosk utama instansi
│   ├── auth/                           # Halaman login superadmin SaaS
│   ├── dashboard/                      # 🌐 Global Superadmin Dashboard (SaaS Owner)
│   │   ├── analytics/                  # Grafik analitik seluruh tenant (Recharts)
│   │   ├── announcements/              # ✅ CRUD broadcast pengumuman ke tenant
│   │   ├── queue-management/           # ✅ CRUD kategori antrian global
│   │   ├── queue-monitor/              # Monitoring antrian live seluruh tenant
│   │   ├── settings/                   # Konfigurasi sistem
│   │   ├── tenants/                    # ✅ CRUD pendaftaran & kustomisasi tenant
│   │   └── users/                      # ✅ CRUD manajemen user RBAC multitenant
│   ├── globals.css                     # Konfigurasi Tailwind CSS v4
│   ├── layout.tsx                      # Root layout + AuthProvider
│   └── page.tsx                        # Root redirector
├── components/                         # Komponen UI global (Shadcn/UI & Lucide)
│   ├── dashboard-sidebar.tsx           # Sidebar navigasi superadmin
│   ├── kpi-cards.tsx                   # ✅ KPI cards dashboard (data real dari DB)
│   └── ui/                             # Shadcn/UI primitives
├── hooks/                              # React Hooks Kustom — abstraksi data layer
│   ├── use-guest-book.ts               # Buku tamu insert & fetch autocomplete
│   ├── use-queue-data.ts               # Sinkronisasi real-time antrian
│   ├── use-queue-entries.ts            # Fetch & subscribe queue entries
│   ├── use-tenant.ts                   # Fetcher identitas & tema instansi
│   ├── use-tenant-data.ts              # Hook koleksi (useTenants, useAnnouncements, dll)
│   └── use-toast.ts                    # Notifikasi pop-up
├── lib/
│   ├── auth/
│   │   └── auth-context.tsx            # ✅ AuthProvider — signIn/signOut + signingOut state
│   └── supabase/
│       ├── client.ts                   # Supabase browser client (singleton)
│       ├── queries.ts                  # ✅ Semua fungsi CRUD terstruktur per tabel
│       ├── server.ts                   # Supabase SSR server-side client
│       └── types.ts                    # TypeScript database schema types
├── middleware.ts                       # ✅ Route guard + redirect cerdas per-role
└── scripts/                            # Migrasi SQL & Seed Data awal
    ├── 01-init-schema.sql              # Tabel, indeks, view, RLS policies
    ├── 02-seed-data.sql                # Data sampel instansi, operator, antrian
    └── run-migrations.mjs              # Skrip eksekusi migrasi database otomatis
```

---

## 🛠️ Stack Teknologi

*   **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
*   **Styling & Animasi**: Tailwind CSS v4, Framer Motion (transisi kiosk), Lucide React
*   **Visualisasi Data**: Recharts (analitik performa loket)
*   **Integrasi Backend**: Supabase (PostgreSQL, Realtime WebSockets, SSR Auth)
*   **Pustaka Pendukung**:
    *   `qrcode.react` (pembuat QR Code tiket antrian)
    *   `xlsx-js-style` (generator laporan excel dengan desain kustom)
    *   `react-hook-form` + `zod` (validasi form buku tamu & admin)
    *   `sonner` (sistem notifikasi toast)

---

## ✅ Status Implementasi

| Area | Halaman | Status |
| :--- | :--- | :---: |
| **Pengunjung (Publik)** | Kiosk, Tiket, Status Real-time, TV Display, Buku Tamu | ✅ Selesai |
| **Operator** | Panel Panggil / Hold / Complete / No-Show | ✅ Selesai |
| **Admin Tenant** | Dashboard, Buku Tamu, Kelola Loket, Kelola Operator, Pengaturan | ✅ Selesai |
| **Superadmin** | Overview, Analytics, Queue Monitor, Announcements, Queue Mgmt, Users, Tenants | ✅ Selesai |
| **Autentikasi** | Login Superadmin, Login Tenant, Logout, Session Guard, Redirect per-role | ✅ Selesai |
| **Superadmin Settings** | Toggle 2FA, Backup DB, dll | 🔲 Roadmap (NestJS) |

---

## 🚀 Panduan Instalasi & Pengoperasian

### 1. Prasyarat Awal
Pastikan Anda sudah memiliki akun **Supabase** dan proyek PostgreSQL yang aktif.

### 2. Konfigurasi Database
Buka **SQL Editor** pada dashboard Supabase Anda, salin dan jalankan skrip berikut sesuai urutan:
1.  Isi skrip dari `scripts/01-init-schema.sql` untuk menginisialisasi tabel, views, index, dan RLS.
2.  Isi skrip dari `scripts/02-seed-data.sql` untuk mengisi data simulasi instansi.

### 3. Konfigurasi Environment Variables
Buat file `.env` di direktori utama proyek Anda dan konfigurasikan kunci akses Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<id-proyek-anda>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<kunci-anon-anda>
SUPABASE_SERVICE_ROLE_KEY=<kunci-service-role-anda>
```

### 4. Instalasi Dependensi & Menjalankan Aplikasi
Buka terminal dan jalankan perintah berikut:
```bash
# Instal seluruh pustaka pendukung
npm install

# Jalankan server pengembangan lokal (Next.js Turbopack)
# Catatan Windows: Jika eksekusi skrip diblokir di PowerShell, jalankan via CMD
cmd /c "npm run dev"
```

Aplikasi kini dapat diakses melalui browser di alamat [http://localhost:3000](http://localhost:3000) dan akan secara otomatis diarahkan ke portal yang sesuai berdasarkan session login Anda.

---

## 🧪 Data Akun Simulasi untuk QA & Pengujian

Tabel berikut menyajikan data sampel yang sudah tersimpan di database untuk mempermudah pengujian alur kerja (*end-to-end workflow*):

### A. Daftar Instansi (Tenant) & URL Kiosk Publik
| Instansi | Slug URL Kiosk | Tema Warna Utama | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Dinas Kesehatan** | `/dinkes` | Hijau (`#10B981`) | Dinas Kesehatan Kota |
| **Kantor Desa** | `/kantor-desa` | Biru Muda (`#0EA5E9`) | Kantor Desa Sukamaju |
| **Puskesmas** | `/puskesmas` | Ungu (`#8B5CF6`) | Puskesmas Merdeka |
| **BPJS Kesehatan** | `/bpjs` | Oranye (`#F97316`) | BPJS Regional |
| **Kantor Kelurahan**| `/kelurahan` | Pink (`#EC4899`) | Kantor Kelurahan Jaya |

### B. Kredensial Pengguna Berdasarkan Peran (Role RBAC)
Petugas dapat masuk melalui portal login masing-masing instansi (misal: `/[tenant]/login`) atau login pusat superadmin.

> ⚠️ **Penting**: Superadmin hanya bisa login melalui `/auth/login`. Admin & Operator hanya bisa login melalui portal instansi (`/[tenant]/login`). Login silang akan ditolak secara eksplisit.

| Email Akun | Peran (Role) | Ruang Lingkup Hak Akses | Halaman Tujuan Redirect |
| :--- | :--- | :--- | :--- |
| **admin@queuemaster.local** | `superadmin` | Akses seluruh data & konfigurasi sistem | `/dashboard` |
| **admin@dinkes.local** | `admin` | Pengelola penuh instansi **Dinas Kesehatan** | `/dinkes/admin` |
| **operator1@dinkes.local** | `operator` | Petugas loket **Dinas Kesehatan** | `/dinkes/operator` |
| **admin@desasukamaju.local**| `admin` | Pengelola penuh instansi **Kantor Desa** | `/kantor-desa/admin` |

### C. Alur Pengujian Lengkap (End-to-End)
```
1. Buka /dinkes               → Kiosk publik, pilih layanan, ambil tiket
2. Buka /dinkes/display       → TV monitor, pantau nomor yang dipanggil
3. Buka /dinkes/login         → Login sebagai operator1@dinkes.local
4. Buka /dinkes/operator      → Panel operator: panggil, hold, selesaikan antrian
5. Buka /dinkes/login         → Login sebagai admin@dinkes.local
6. Buka /dinkes/admin         → Dashboard ringkasan statistik
7. Buka /dinkes/admin/counters   → Kelola loket layanan
8. Buka /dinkes/admin/operators  → Kelola daftar petugas
9. Buka /dinkes/admin/settings   → Ubah nama & warna tema instansi
10. Buka /auth/login          → Login sebagai admin@queuemaster.local (superadmin)
11. Buka /dashboard           → Overview statistik real dari seluruh tenant
```

---

## 🔮 Roadmap Pengembangan Masa Depan

*   **Migrasi Backend ke NestJS**: Ganti Supabase client di `hooks/` dan `lib/supabase/queries.ts` dengan HTTP request ke REST API NestJS — tanpa perlu ubah komponen UI.
*   **Notifikasi WhatsApp (Omnichannel)**: Pengiriman tiket digital dan notifikasi giliran via WhatsApp Bot atau SMS gateway.
*   **Pendaftaran Mandiri & Paket Langganan**: Integrasi gateway pembayaran Stripe untuk penagihan langganan otomatis (*SaaS monetization*).
*   **Aplikasi Mobile (PWA / React Native)**: Memudahkan pengunjung memantau antrian secara portabel.
*   **Sistem Tiket Kios Fisik**: Integrasi mesin pencetak thermal lokal via protokol ESC/POS dari browser.
