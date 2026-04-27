import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_TENANT_AREAS = ['display', 'queue', 'guest-book', 'status'];
const RESERVED_SLUGS = ['auth', 'dashboard', 'api', '_next', 'favicon.ico'];

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
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('favicon')) {
    return response;
  }

  // =========================================================================
  // AUTH ROUTES — boleh akses tanpa login
  // =========================================================================
  if (pathname.startsWith('/auth')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return response;

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role, tenant_id, tenants(subdomain)')
      .eq('auth_user_id', user.id)
      .single();

    const role = (tenantUser as any)?.role;
    const slug = (tenantUser as any)?.tenants?.subdomain;

    if (role === 'superadmin') return NextResponse.redirect(new URL('/dashboard', request.url));
    if (role === 'admin' && slug) return NextResponse.redirect(new URL(`/${slug}/admin`, request.url));
    if (role === 'operator' && slug) return NextResponse.redirect(new URL(`/${slug}/operator`, request.url));
    return response;
  }

  // =========================================================================
  // PUBLIC TENANT PAGES — kiosk, display, queue (no auth needed)
  // =========================================================================
  if (tenantSlug && !RESERVED_SLUGS.includes(tenantSlug)) {
    const isPublicArea = !area || PUBLIC_TENANT_AREAS.includes(area);

    if (isPublicArea) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, is_active')
        .eq('subdomain', tenantSlug)
        .single();

      if (!tenant || !tenant.is_active) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }

      response.headers.set('x-tenant-slug', tenantSlug);
      response.headers.set('x-tenant-id', tenant.id);
      return response;
    }
  }

  // =========================================================================
  // SEMUA PROTECTED ROUTES — butuh auth
  // =========================================================================
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const { data: tenantUser, error: userError } = await supabase
    .from('tenant_users')
    .select('role, tenant_id, tenants(id, subdomain, is_active)')
    .eq('auth_user_id', user.id)
    .single();

  if (userError || !tenantUser) {
    console.error('[middleware] Error:', userError?.message);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const userRole = (tenantUser as any).role;
  const userTenantData = (tenantUser as any).tenants;
  const userTenantId = (tenantUser as any).tenant_id;

  // Dashboard — superadmin only
  if (pathname.startsWith('/dashboard')) {
    if (userRole !== 'superadmin') {
      if (userRole === 'admin' && userTenantData?.subdomain)
        return NextResponse.redirect(new URL(`/${userTenantData.subdomain}/admin`, request.url));
      if (userRole === 'operator' && userTenantData?.subdomain)
        return NextResponse.redirect(new URL(`/${userTenantData.subdomain}/operator`, request.url));
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    response.headers.set('x-user-role', 'superadmin');
    return response;
  }

  // Tenant admin/operator
  if (tenantSlug && !RESERVED_SLUGS.includes(tenantSlug) && (area === 'admin' || area === 'operator')) {
    if (!userTenantData?.is_active)
      return NextResponse.redirect(new URL('/auth/login', request.url));

    if (userTenantData?.subdomain !== tenantSlug) {
      if (userRole === 'admin')
        return NextResponse.redirect(new URL(`/${userTenantData.subdomain}/admin`, request.url));
      if (userRole === 'operator')
        return NextResponse.redirect(new URL(`/${userTenantData.subdomain}/operator`, request.url));
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (area === 'admin' && userRole !== 'admin') {
      if (userRole === 'operator')
        return NextResponse.redirect(new URL(`/${tenantSlug}/operator`, request.url));
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (area === 'operator' && userRole !== 'operator' && userRole !== 'admin')
      return NextResponse.redirect(new URL('/auth/login', request.url));

    response.headers.set('x-user-role', userRole);
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-tenant-id', userTenantId || '');
    return response;
  }

  // Root redirect
  if (pathname === '/') {
    if (userRole === 'superadmin') return NextResponse.redirect(new URL('/dashboard', request.url));
    if (userRole === 'admin' && userTenantData?.subdomain)
      return NextResponse.redirect(new URL(`/${userTenantData.subdomain}/admin`, request.url));
    if (userRole === 'operator' && userTenantData?.subdomain)
      return NextResponse.redirect(new URL(`/${userTenantData.subdomain}/operator`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/auth/:path*', '/dashboard/:path*', '/:tenant/:path*'],
};
