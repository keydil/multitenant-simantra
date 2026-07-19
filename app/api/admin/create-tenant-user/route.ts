import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

// Server-only route — fixes the "ghost account" bug (UI_UX_AUDIT.md 3.3):
// the old client-side "Tambah Pengguna"/"Tambah Petugas" forms inserted a
// tenant_users row with a random client-generated auth_user_id that never
// matched any real Supabase Auth account, so the new user could never log
// in. This route actually creates the Auth account (requires
// SUPABASE_SERVICE_ROLE_KEY, which must stay server-only — never expose it
// with a NEXT_PUBLIC_ prefix) using a password the caller sets, then links
// tenant_users to the real resulting auth_user_id.

const ALLOWED_ROLES = ['superadmin', 'admin', 'operator', 'viewer'] as const;
type Role = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(value: unknown): value is Role {
  return typeof value === 'string' && (ALLOWED_ROLES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body request tidak valid' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const role = body?.role;
  const requestedTenantId = typeof body?.tenant_id === 'string' ? body.tenant_id : null;

  if (!email) {
    return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
  }
  if (!isAllowedRole(role)) {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
  }

  // ── 1) Verify the caller's session server-side. getUser() revalidates
  // against the Supabase Auth server — same security boundary middleware.ts
  // uses — not just a trusted client-supplied claim. ──
  const supabaseServer = await createServerSupabaseClient();
  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseServer.auth.getUser();

  if (callerError || !caller) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseServer
    .from('tenant_users')
    .select('role, tenant_id, is_active')
    .eq('auth_user_id', caller.id)
    .single();

  if (callerProfileError || !callerProfile || !(callerProfile as any).is_active) {
    return NextResponse.json({ error: 'Profil pengguna tidak ditemukan' }, { status: 403 });
  }

  const callerRole = (callerProfile as any).role as string;
  const callerTenantId = (callerProfile as any).tenant_id as string | null;

  // ── 2) Authorize + resolve tenant_id server-side. Never trust the
  // client's tenant_id for an 'admin' caller — force their own tenant so an
  // admin can't create users in a tenant they don't own. ──
  let resolvedTenantId: string | null;

  if (callerRole === 'superadmin') {
    resolvedTenantId = role === 'superadmin' ? null : requestedTenantId;
    if (role !== 'superadmin' && !resolvedTenantId) {
      return NextResponse.json(
        { error: 'tenant_id wajib diisi untuk role selain superadmin' },
        { status: 400 }
      );
    }
  } else if (callerRole === 'admin') {
    if (role !== 'admin' && role !== 'operator') {
      return NextResponse.json(
        { error: 'Admin hanya boleh membuat akun dengan role admin atau operator' },
        { status: 403 }
      );
    }
    if (!callerTenantId) {
      return NextResponse.json({ error: 'Akun admin tidak terikat instansi manapun' }, { status: 403 });
    }
    resolvedTenantId = callerTenantId;
  } else {
    return NextResponse.json({ error: 'Tidak punya izin membuat pengguna baru' }, { status: 403 });
  }

  // ── 3) Service-role client. Server-only — used exclusively for the two
  // privileged operations below, never returned to the browser. ──
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server' },
      { status: 500 }
    );
  }

  const admin = createServiceClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no working email delivery in this project (all seed emails are @*.local) — mark verified immediately so the account is usable right away
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (createUserError || !created?.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? 'Gagal membuat akun autentikasi' },
      { status: 400 }
    );
  }

  const { data: insertedRow, error: insertError } = await admin
    .from('tenant_users')
    // @ts-ignore — Insert type requires all non-optional Row fields
    .insert({
      tenant_id: resolvedTenantId,
      auth_user_id: created.user.id,
      email,
      full_name: fullName || null,
      role,
      is_active: true,
      must_change_password: true,
    })
    .select()
    .single();

  if (insertError || !insertedRow) {
    // Roll back the orphaned Auth account so we don't trade a
    // "no auth account" ghost for a "no tenant_users row" one.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: insertError?.message ?? 'Gagal menyimpan data pengguna' },
      { status: 400 }
    );
  }

  return NextResponse.json({ data: insertedRow }, { status: 201 });
}
