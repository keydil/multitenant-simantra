// Tipe row API backend NestJS — bentuk snake_case sama persis dengan row
// Supabase lama (lihat common/wire.ts di backend), supaya komponen tidak
// perlu ganti nama field. Pengganti lib/supabase/types.ts.

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string;
  is_active: boolean;
  subscription_tier: 'free' | 'standard' | 'premium';
  created_at: string;
  updated_at: string;
  // Ikut terkirim di /public/tenants/:slug dan /auth/me
  theme?: TenantTheme | null;
}

/** Ringkasan data yang akan ikut hancur saat instansi dihapus permanen. */
export interface TenantPurgePreview {
  users: number;
  queues: number;
  entries: number;
  guest_book_entries: number;
}

export interface TenantUser {
  id: string;
  tenant_id: string | null;
  email: string;
  full_name: string | null;
  role: 'superadmin' | 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  must_change_password: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  tenant?: Tenant | null;
}

export interface Queue {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  display_name: string | null;
  service_code: string | null;
  color_code: string;
  is_active: boolean;
  max_capacity: number;
  estimated_service_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export type QueueEntryStatus = 'waiting' | 'serving' | 'completed' | 'no_show' | 'cancelled';

export interface QueueEntry {
  id: string;
  queue_id: string;
  tenant_id: string;
  ticket_number: string;
  customer_name: string | null;
  status: QueueEntryStatus;
  service_window: number | null;
  priority: number;
  entered_at: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

/** Bentuk publik (display board/kiosk) — tanpa customer_name & notes. */
export type PublicQueueEntry = Omit<QueueEntry, 'customer_name' | 'notes' | 'priority'>;

export interface Announcement {
  id: string;
  title: string;
  description: string;
  announcement_type: 'update' | 'warning' | 'maintenance' | 'info';
  target_tenants: 'all' | 'specific';
  specific_tenant_ids: string[] | null;
  is_active: boolean;
  priority: number;
  published_at: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDaily {
  id: string;
  tenant_id: string;
  queue_id: string | null;
  date: string;
  total_entries: number;
  completed_entries: number;
  no_show_entries: number;
  cancelled_entries: number;
  average_service_time_minutes: number | null;
  peak_hour: number | null;
  peak_count: number | null;
  created_at: string;
}

export interface TenantTheme {
  id: string;
  tenant_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  custom_css: string | null;
  is_custom_theme: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueueStatusSummary {
  queue_id: string;
  tenant_id: string;
  queue_name: string | null;
  total_in_queue: number;
  currently_serving: number;
  waiting_count: number;
  latest_entry_time: string | null;
}

export interface GuestBook {
  id: string;
  tenant_id: string;
  name: string;
  institution: string;
  purpose: string;
  phone: string;
  photo_url: string | null;
  created_at: string;
}

/** Kategori "Keperluan Kunjungan" per-tenant (opsi chip buku tamu). */
export interface VisitPurpose {
  id: string;
  tenant_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Respons GET /queues/:queueId/stats/today. */
export interface QueueStatsToday {
  waiting: number;
  serving: number;
  completed: number;
  no_show: number;
  cancelled: number;
}
