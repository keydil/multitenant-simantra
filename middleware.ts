import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 'login' ditambah di sini — tenant login page ga butuh auth
const PUBLIC_TENANT_AREAS = ['login', 'display', 'queue', 'guest-book', 'status'];
const RESERVED_SLUGS = ['auth', 'dashboard', 'api', '_next', 'favicon.ico'];

// Baca payload JWT tanpa verifikasi ulang — aman dipakai SETELAH getUser()
// sukses di request yang sama (getUser() sudah revalidasi ke server Auth;
// ini cuma baca data tambahan dari token yang sudah tervalidasi itu).
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Custom Access Token Hook (scripts/11-custom-access-token-hook.sql) nanam
// user_role/tenant_id/tenant_slug langsung di JWT, supaya di sini gak perlu
// query tenant_users lagi tiap navigasi. getSession() baca lokal dari
// cookie (gratis, gak ada network round-trip) — beda dari getUser() yang
// tetap wajib dipertahankan di tempat lain sebagai security boundary.
//
// Return null kalau claim belum ada (token diterbitkan sebelum hook aktif,
// atau belum sempat refresh) — pemanggil WAJIB fallback ke query
// tenant_users manual di kondisi ini, jangan anggap user tanpa role.
async function getJwtClaims(supabase: ReturnType<typeof createServerClient>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJwtPayload(session.access_token);
  if (!payload?.user_role) return null;

  return {
    role: payload.user_role as string,
    tenantId: (payload.tenant_id as string | null) ?? undefined,
    tenantSlug: (payload.tenant_slug as string | null) ?? undefined,
  };
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  const tenantSlug = pathSegments[0];
  const area = pathSegments[1];

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('favicon')
  ) {
    return response;
  }

  // =========================================================================
  // AUTH ROUTES (/auth/*) — khusus superadmin login
  // =========================================================================
  if (pathname.startsWith('/auth')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return response; // belum login → tampilkan halaman login

    // Udah login → redirect ke area yang bener. Coba dari JWT claims dulu
    // (gratis), fallback ke query tenant_users kalau claim belum ada.
    const claims = await getJwtClaims(supabase);
    let role: string | undefined;
    let slug: string | undefined;

    if (claims) {
      role = claims.role;
      slug = claims.tenantSlug;
    } else {
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('role, tenants(subdomain)')
        .eq('auth_user_id', user.id)
        .single();
      role = (tenantUser as any)?.role;
      slug = (tenantUser as any)?.tenants?.subdomain;
    }

    if (role === 'superadmin') return NextResponse.redirect(new URL('/dashboard', request.url));
    if (role === 'admin' && slug) return NextResponse.redirect(new URL(`/${slug}/admin`, request.url));
    if (role === 'operator' && slug) return NextResponse.redirect(new URL(`/${slug}/operator`, request.url));
    return response;
  }

  // =========================================================================
  // PUBLIC TENANT PAGES — login, kiosk, display, queue, guest-book, status
  // Semua ini ga butuh auth
  // =========================================================================
  if (tenantSlug && !RESERVED_SLUGS.includes(tenantSlug)) {
    const isPublicArea = !area || PUBLIC_TENANT_AREAS.includes(area);

    if (isPublicArea) {
      // Validasi tenant aktif dulu (RPC scoped by subdomain — lihat
      // scripts/10-rpc-scoped-public-tenant.sql; filter is_active sudah
      // dilakukan di dalam function, jadi null berarti "tidak ada / tidak aktif")
      const { data: tenant } = await supabase.rpc('get_public_tenant', { p_slug: tenantSlug });

      // RPC "not found" is one row with every column null (Postgres
      // FROM-clause call convention), not a JS null — check tenant.id.
      if (!tenant?.id) {
        // Kalau udah di halaman login tenant ini, jangan redirect ke diri
        // sendiri (infinite loop) — biarkan halaman itu render pesan
        // "tidak ditemukan"-nya sendiri.
        if (area === 'login') {
          return response;
        }
        return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
      }

      // Kalau buka /[tenant]/login tapi udah ada session
      // → redirect ke area yang bener, jangan tampilkan login lagi
      if (area === 'login') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const claims = await getJwtClaims(supabase);
          let role: string | undefined;
          let slug: string | undefined;

          if (claims) {
            role = claims.role;
            slug = claims.tenantSlug;
          } else {
            const { data: tenantUser } = await supabase
              .from('tenant_users')
              .select('role, tenants(subdomain)')
              .eq('auth_user_id', user.id)
              .single();
            role = (tenantUser as any)?.role;
            slug = (tenantUser as any)?.tenants?.subdomain;
          }

          if (role === 'superadmin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
          if (role === 'admin' && slug) {
            return NextResponse.redirect(new URL(`/${slug}/admin`, request.url));
          }
          if (role === 'operator' && slug) {
            return NextResponse.redirect(new URL(`/${slug}/operator`, request.url));
          }
        }
      }

      // Inject tenant info ke headers untuk Server Components
      response.headers.set('x-tenant-slug', tenantSlug);
      response.headers.set('x-tenant-id', tenant.id);
      return response;
    }
  }

  // =========================================================================
  // PROTECTED ROUTES — semua yang butuh auth
  // =========================================================================
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    // Kalau dari area tenant → redirect ke tenant login, bukan superadmin
    if (tenantSlug && !RESERVED_SLUGS.includes(tenantSlug)) {
      return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Fast path: claims dari JWT (lihat scripts/11-custom-access-token-hook.sql)
  // — skip query tenant_users tiap navigasi kalau claim udah ada.
  // Trade-off yang disadari: tenant.is_active gak ada di claims, jadi kalau
  // superadmin nonaktifin tenant pas ada admin/operator-nya lagi login,
  // itu baru kerasa pas token-nya refresh (~1 jam) atau logout/login ulang
  // — sama seperti staleness perubahan role. Fallback di bawah (query
  // manual) selalu dapet data ter-fresh, dipakai kalau claim belum ada.
  const claims = await getJwtClaims(supabase);

  let userRole: string | undefined;
  let userTenantId: string | undefined;
  let userTenantSlug: string | undefined;
  let userTenantActive = true;

  if (claims) {
    userRole = claims.role;
    userTenantId = claims.tenantId;
    userTenantSlug = claims.tenantSlug;
  } else {
    const { data: tenantUser, error: userError } = await supabase
      .from('tenant_users')
      .select('role, tenant_id, tenants(id, subdomain, is_active)')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !tenantUser) {
      console.error('[middleware] Error:', userError?.message);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    userRole = (tenantUser as any).role;
    userTenantId = (tenantUser as any).tenant_id;
    userTenantSlug = (tenantUser as any).tenants?.subdomain;
    userTenantActive = (tenantUser as any).tenants?.is_active;
  }

  if (!userRole) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Dashboard — superadmin only
  if (pathname.startsWith('/dashboard')) {
    if (userRole !== 'superadmin') {
      if (userRole === 'admin' && userTenantSlug)
        return NextResponse.redirect(new URL(`/${userTenantSlug}/admin`, request.url));
      if (userRole === 'operator' && userTenantSlug)
        return NextResponse.redirect(new URL(`/${userTenantSlug}/operator`, request.url));
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    response.headers.set('x-user-role', 'superadmin');
    return response;
  }

  // Tenant admin/operator
  if (
    tenantSlug &&
    !RESERVED_SLUGS.includes(tenantSlug) &&
    (area === 'admin' || area === 'operator')
  ) {
    if (!userTenantActive)
      return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));

    // Cek slug cocok
    if (userTenantSlug !== tenantSlug) {
      if (userRole === 'admin')
        return NextResponse.redirect(new URL(`/${userTenantSlug}/admin`, request.url));
      if (userRole === 'operator')
        return NextResponse.redirect(new URL(`/${userTenantSlug}/operator`, request.url));
      return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
    }

    // Cek role vs area
    if (area === 'admin' && userRole !== 'admin') {
      if (userRole === 'operator')
        return NextResponse.redirect(new URL(`/${tenantSlug}/operator`, request.url));
      return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));
    }

    if (area === 'operator' && userRole !== 'operator' && userRole !== 'admin')
      return NextResponse.redirect(new URL(`/${tenantSlug}/login`, request.url));

    response.headers.set('x-user-role', userRole);
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-tenant-id', userTenantId || '');
    return response;
  }

  // Root redirect
  if (pathname === '/') {
    if (userRole === 'superadmin')
      return NextResponse.redirect(new URL('/dashboard', request.url));
    if (userRole === 'admin' && userTenantSlug)
      return NextResponse.redirect(new URL(`/${userTenantSlug}/admin`, request.url));
    if (userRole === 'operator' && userTenantSlug)
      return NextResponse.redirect(new URL(`/${userTenantSlug}/operator`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/auth/:path*', '/dashboard/:path*', '/:tenant/:path*'],
};