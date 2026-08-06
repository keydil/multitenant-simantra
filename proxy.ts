import { NextResponse, type NextRequest } from 'next/server';

// 'login' ditambah di sini — tenant login page ga butuh auth
const PUBLIC_TENANT_AREAS = ['login', 'display', 'queue', 'guest-book', 'status'];
const RESERVED_SLUGS = ['auth', 'dashboard', 'api', '_next', 'favicon.ico'];

// Fallback localhost SENGAJA dibatasi ke non-produksi. Kalau env var hilang
// di hosting, menembak localhost hanya bikin kegagalannya senyap: fetch-nya
// gagal, catch di bawah menelannya, app tetap melayani dengan validasi tenant
// dilewati tanpa jejak apa pun di log.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3002/api/v1');

// Middleware jalan di depan tiap navigasi halaman publik, jadi backend yang
// lambat/mati tidak boleh ikut menggantung seluruh halaman.
const TENANT_LOOKUP_TIMEOUT_MS = 3000;

// Peran middleware ini berubah total sejak konversi ke backend NestJS
// (FRONTEND_MIGRATION.md §2): access token JWT sekarang cuma hidup di
// memory di browser (state React), BUKAN cookie — middleware yang jalan di
// server gak pernah bisa membacanya. Jadi middleware di sini murni
// routing/UX (cek tenant valid buat halaman publik lalu redirect kalau slug
// tidak dikenal), SAMA SEKALI BUKAN auth gate. Enforcement login 100% ada di
// guard backend (tiap endpoint) + guard client-side di layout terproteksi
// (app/dashboard/layout.tsx, app/[tenant]/admin/layout.tsx,
// app/[tenant]/operator/layout.tsx — semua sudah cek useAuth() sendiri).
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  const tenantSlug = pathSegments[0];
  const area = pathSegments[1];

  // Skip static files — termasuk semua path yang mengandung titik
  // (/icon.svg, /icon-dark-32x32.png, dll), supaya nama file tidak
  // diperlakukan sebagai slug tenant lalu di-redirect ke /{file}/login.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // =========================================================================
  // PUBLIC TENANT PAGES — login, kiosk, display, queue, guest-book, status
  // Cuma validasi tenant ada & aktif; slug tak dikenal dilempar ke halaman
  // login tenant itu. Halaman /[tenant]/login sendiri yang urus redirect
  // "udah login" (client-side, lewat useAuth()) karena middleware gak
  // punya akses ke access token.
  // =========================================================================
  if (tenantSlug && !RESERVED_SLUGS.includes(tenantSlug)) {
    const isPublicArea = !area || PUBLIC_TENANT_AREAS.includes(area);

    if (isPublicArea) {
      if (!API_BASE) {
        console.error('[proxy] NEXT_PUBLIC_API_URL belum di-set — validasi tenant dilewati.');
        return NextResponse.next();
      }

      let tenant: { id: string } | null = null;
      try {
        const res = await fetch(`${API_BASE}/public/tenants/${tenantSlug}`, {
          signal: AbortSignal.timeout(TENANT_LOOKUP_TIMEOUT_MS),
        });
        if (res.ok) tenant = await res.json();
      } catch {
        // Backend gak bisa dihubungi / timeout — biarkan lolos, halaman tujuan
        // yang tampilkan error-nya sendiri daripada bikin seluruh app down.
        return NextResponse.next();
      }

      // 404 = tidak ada / tidak aktif (lihat FRONTEND_MIGRATION.md §2 —
      // ganti semua cek `data?.id` jadi cek res.ok/status)
      if (!tenant?.id) {
        // Kalau udah di halaman login tenant ini, jangan redirect ke diri
        // sendiri (infinite loop) — biarkan halaman itu render pesan
        // "tidak ditemukan"-nya sendiri.
        if (area === 'login') {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
      }

      // Dulu di sini di-set header x-tenant-slug/x-tenant-id. Itu dihapus:
      // NextResponse.next().headers adalah header RESPON (terkirim ke browser),
      // bukan header request untuk Server Components — dan tidak ada satu pun
      // konsumennya di app ini (semua halaman [tenant] client component).
      // Efek satu-satunya: membocorkan UUID internal tenant ke publik.
      return NextResponse.next();
    }
  }

  // =========================================================================
  // AUTH ROUTES & PROTECTED ROUTES (/auth/*, /dashboard/*, /[tenant]/admin,
  // /[tenant]/operator) — tidak ada gate di sini lagi, lihat komentar atas.
  // =========================================================================
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/auth/:path*', '/dashboard/:path*', '/:tenant/:path*'],
};
