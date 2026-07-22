// Pengganti lib/supabase/queries.ts — peta lengkap ada di
// FRONTEND_MIGRATION.md §3. Semua fungsi mengembalikan data langsung dan
// melempar ApiError saat gagal (tidak ada lagi tuple {data, error} gaya
// Supabase; "tidak ditemukan" = ApiError statusCode 404, bukan row NULL).

import { api } from './client';
import type {
  AnalyticsDaily,
  Announcement,
  GuestBook,
  PublicQueueEntry,
  Queue,
  QueueEntry,
  QueueEntryStatus,
  QueueStatsToday,
  QueueStatusSummary,
  Tenant,
  TenantPurgePreview,
  TenantTheme,
  TenantUser,
  VisitPurpose,
} from './types';

// ============================================================================
// TENANTS (superadmin)
// ============================================================================
export const tenantQueries = {
  /** Tanpa filter = semua termasuk nonaktif (dipakai fix UI_UX 3.2). */
  getAll: (opts?: { includeInactive?: boolean }) =>
    api.get<Tenant[]>(`/tenants${opts?.includeInactive ? '' : '?is_active=true'}`),

  getById: (id: string) => api.get<Tenant>(`/tenants/${id}`),

  create: (tenant: Partial<Tenant>) => api.post<Tenant>('/tenants', tenant),

  update: (id: string, updates: Partial<Tenant>) =>
    api.patch<Tenant>(`/tenants/${id}`, updates),

  /** Soft delete — `is_active=false`, bisa diaktifkan lagi. */
  delete: (id: string) => api.delete<void>(`/tenants/${id}`),

  /** Data yang akan ikut hancur kalau instansi dihapus permanen. */
  purgePreview: (id: string) =>
    api.get<TenantPurgePreview>(`/tenants/${id}/purge-preview`),

  /**
   * HARD DELETE — tidak bisa dibatalkan, seluruh riwayat instansi ikut hilang.
   * Server menolak (400) kalau instansinya masih aktif.
   */
  purge: (id: string) =>
    api.delete<{ id: string; deleted: boolean; files_removed: number }>(
      `/tenants/${id}/permanent`
    ),

  uploadLogo: (tenantId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ logo_url: string }>(`/tenants/${tenantId}/logo`, form);
  },
};

// ============================================================================
// QUEUES (staff)
// ============================================================================
export const queueQueries = {
  getByTenant: (tenantId: string, opts?: { includeInactive?: boolean }) =>
    api.get<Queue[]>(
      `/tenants/${tenantId}/queues${opts?.includeInactive ? '' : '?is_active=true'}`
    ),

  getById: (id: string) => api.get<Queue>(`/queues/${id}`),

  create: (tenantId: string, queue: Partial<Queue>) =>
    api.post<Queue>(`/tenants/${tenantId}/queues`, queue),

  update: (id: string, updates: Partial<Queue>) =>
    api.patch<Queue>(`/queues/${id}`, updates),

  delete: (id: string) => api.delete<void>(`/queues/${id}`),
};

// ============================================================================
// QUEUE ENTRIES (staff)
// ============================================================================
export const queueEntryQueries = {
  /** status = CSV; default backend "waiting,serving" (sama dgn perilaku lama).
   *  since = ISO date string (filter entered_at >=), limit maks 500. */
  getByQueue: (tenantId: string, queueId: string, opts?: { status?: string; limit?: number; since?: string }) => {
    const params = new URLSearchParams({ queue_id: queueId });
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.since) params.set('since', opts.since);
    return api.get<QueueEntry[]>(`/tenants/${tenantId}/entries?${params}`);
  },

  getByTenant: (tenantId: string, opts?: { status?: string; limit?: number; since?: string }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.since) params.set('since', opts.since);
    const qs = params.toString();
    return api.get<QueueEntry[]>(`/tenants/${tenantId}/entries${qs ? `?${qs}` : ''}`);
  },

  getStatusSummary: (tenantId: string) =>
    api.get<QueueStatusSummary[]>(`/tenants/${tenantId}/entries/summary`),

  getStatsToday: (queueId: string) =>
    api.get<QueueStatsToday>(`/queues/${queueId}/stats/today`),

  /** Transisi divalidasi server (ilegal = 400); timestamp SELALU server. */
  updateStatus: (id: string, status: QueueEntryStatus) =>
    api.patch<QueueEntry>(`/entries/${id}/status`, { status }),

  /** Atomik utk tombol "Panggil Berikutnya" — 404 = tidak ada yang menunggu. */
  callNext: (queueId: string, serviceWindow?: number) =>
    api.post<QueueEntry>(`/queues/${queueId}/call-next`,
      serviceWindow !== undefined ? { service_window: serviceWindow } : {}),
};

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================
export const announcementQueries = {
  /** Staff, tenant-scoped: aktif + belum expired + target cocok. */
  getActiveForTenant: (tenantId: string) =>
    api.get<Announcement[]>(`/tenants/${tenantId}/announcements/active`),

  /** Superadmin: SEMUA announcement (termasuk nonaktif/expired). */
  getAll: () => api.get<Announcement[]>('/announcements'),

  create: (announcement: Partial<Announcement>) =>
    api.post<Announcement>('/announcements', announcement),

  update: (id: string, updates: Partial<Announcement>) =>
    api.patch<Announcement>(`/announcements/${id}`, updates),

  delete: (id: string) => api.delete<void>(`/announcements/${id}`),
};

// ============================================================================
// ANALYTICS
// ============================================================================
export const analyticsQueries = {
  getByTenantAndDate: (tenantId: string, from: string, to: string) =>
    api.get<AnalyticsDaily[]>(`/tenants/${tenantId}/analytics?from=${from}&to=${to}`),

  getQueueAnalytics: (queueId: string, days = 30) =>
    api.get<AnalyticsDaily[]>(`/queues/${queueId}/analytics?days=${days}`),

  /**
   * Backfill agregasi N hari terakhir (superadmin). Cron backend hanya mengisi
   * "kemarin" tiap 00:15, jadi data historis & environment yang cron-nya belum
   * pernah nyala butuh trigger manual ini. Idempoten.
   */
  aggregate: (days: number) =>
    api.post<{ days: number; upserted: number }>('/analytics/aggregate', { days }),
};

// ============================================================================
// SYSTEM (config global — Mode Maintenance)
// ============================================================================
export interface MaintenanceStatus {
  active: boolean;
  message?: string;
}

export const systemQueries = {
  /** Publik — dipanggil halaman kiosk/display/buku-tamu. */
  getMaintenanceStatus: () =>
    api.get<MaintenanceStatus>('/system/maintenance-status', { auth: false }),

  /** Superadmin — toggle + pesan custom. */
  updateMaintenance: (active: boolean, message?: string) =>
    api.patch<MaintenanceStatus>('/system/maintenance', { active, message }),
};

// ============================================================================
// TENANT THEMES
// ============================================================================
export const themeQueries = {
  getByTenant: (tenantId: string) => api.get<TenantTheme>(`/tenants/${tenantId}/theme`),

  update: (tenantId: string, updates: Partial<TenantTheme>) =>
    api.patch<TenantTheme>(`/tenants/${tenantId}/theme`, updates),
};

// ============================================================================
// TENANT USERS
// ============================================================================
export const tenantUserQueries = {
  getByTenant: (tenantId: string) => api.get<TenantUser[]>(`/tenants/${tenantId}/users`),

  getSuperadmins: () => api.get<TenantUser[]>('/users/superadmins'),

  create: (user: Partial<TenantUser> & { password?: string }) =>
    api.post<TenantUser>('/users', user),

  update: (id: string, updates: Partial<TenantUser>) =>
    api.patch<TenantUser>(`/users/${id}`, updates),

  resetPassword: (id: string) =>
    api.post<{ temp_password: string }>(`/users/${id}/reset-password`),

  delete: (id: string) => api.delete<void>(`/users/${id}`),
};

// ============================================================================
// PUBLIK (kiosk/display/ticket — tanpa login)
// ============================================================================
export const publicQueries = {
  /** 404 kalau slug tak ada / tenant nonaktif. Respons include theme. */
  getTenant: (slug: string) => api.get<Tenant>(`/public/tenants/${slug}`, { auth: false }),

  getQueues: (slug: string) => api.get<Queue[]>(`/public/tenants/${slug}/queues`, { auth: false }),

  /** TANPA customer_name/notes — display board jangan bergantung padanya. */
  getEntries: (slug: string, status?: string) =>
    api.get<PublicQueueEntry[]>(
      `/public/tenants/${slug}/entries${status ? `?status=${status}` : ''}`,
      { auth: false }
    ),

  /** Lengkap termasuk customer_name — UUID entry = capability pemegang tiket. */
  getEntry: (id: string) => api.get<QueueEntry>(`/public/entries/${id}`, { auth: false }),

  getEntryPosition: (id: string) =>
    api.get<{ ahead: number }>(`/public/entries/${id}/position`, { auth: false }),

  getQueue: (id: string) => api.get<Queue>(`/public/queues/${id}`, { auth: false }),

  /** Nomor tiket dihitung server (anti-race). Rate limit 5/menit/IP. */
  createEntry: (slug: string, queueId: string, customerName?: string) =>
    api.post<QueueEntry>(
      `/public/tenants/${slug}/queues/${queueId}/entries`,
      customerName ? { customer_name: customerName } : {},
      { auth: false }
    ),

  getActiveAnnouncements: (slug: string) =>
    api.get<Announcement[]>(`/public/tenants/${slug}/announcements/active`, { auth: false }),
};

// ============================================================================
// GUEST BOOK
// ============================================================================
export const guestBookQueries = {
  create: (slug: string, entry: {
    name: string; institution: string; purpose: string; phone: string; photo_url?: string;
  }) => api.post<GuestBook>(`/public/tenants/${slug}/guest-book`, entry, { auth: false }),

  /** photo_url WAJIB dari endpoint ini (URL lain ditolak 400). Maks 2 MB. */
  uploadPhoto: (slug: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ photo_url: string }>(`/public/tenants/${slug}/guest-book/photo`, form, { auth: false });
  },

  getInstitutions: (slug: string, search: string) =>
    api.get<string[]>(
      `/public/tenants/${slug}/guest-book/institutions?search=${encodeURIComponent(search)}`,
      { auth: false }
    ),

  /** List admin, paginated. */
  getByTenant: (tenantId: string, opts?: {
    from?: string; to?: string; purpose?: string; search?: string; page?: number; limit?: number;
  }) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts ?? {})) {
      if (v !== undefined && v !== '') params.set(k, String(v));
    }
    const qs = params.toString();
    return api.get<{ data: GuestBook[]; count: number; page: number; limit: number }>(
      `/tenants/${tenantId}/guest-book${qs ? `?${qs}` : ''}`
    );
  },
};

// ============================================================================
// VISIT PURPOSES (Kelola Keperluan Kunjungan — per-tenant)
// ============================================================================
export const visitPurposeQueries = {
  /** Publik — opsi chip form buku tamu (hanya aktif, urut sort_order). */
  getPublic: (slug: string) =>
    api.get<VisitPurpose[]>(`/public/tenants/${slug}/guest-book/purposes`, { auth: false }),

  /** Staff — semua baris (termasuk nonaktif) untuk halaman kelola & filter. */
  getByTenant: (tenantId: string) =>
    api.get<VisitPurpose[]>(`/tenants/${tenantId}/guest-book/purposes`),

  create: (tenantId: string, label: string, sort_order?: number) =>
    api.post<VisitPurpose>(`/tenants/${tenantId}/guest-book/purposes`, { label, sort_order }),

  update: (id: string, updates: { label?: string; sort_order?: number; is_active?: boolean }) =>
    api.patch<VisitPurpose>(`/guest-book/purposes/${id}`, updates),

  delete: (id: string) => api.delete<void>(`/guest-book/purposes/${id}`),
};
