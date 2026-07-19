// @ts-nocheck - Supabase client types are handled at runtime, will be generated from schema
import { createClient } from './client';
import type { Tenant, TenantUser, Queue, QueueEntry, Announcement, AnalyticsDaily, TenantTheme, QueueStatusSummary } from './types';

const supabase = createClient();

// ============================================================================
// TENANTS QUERIES
// ============================================================================
export const tenantQueries = {
  getAll: async () => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('is_active', true);
    return { data: data as Tenant[] | null, error };
  },

  getById: async (id: string) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as Tenant | null, error };
  },

  create: async (tenant: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenants')
      .insert([tenant])
      .select()
      .single();
    return { data: data as Tenant | null, error };
  },

  update: async (id: string, updates: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data: data as Tenant | null, error };
  },

  delete: async (id: string) => {
    // @ts-ignore
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: false })
      .eq('id', id);
    return { error };
  },
};

// ============================================================================
// QUEUES QUERIES
// ============================================================================
export const queueQueries = {
  getByTenant: async (tenantId: string) => {
    const { data, error } = await (supabase
      .from('queues')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as any);
    return { data: data as Queue[] | null, error };
  },

  getById: async (id: string) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queues')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as Queue | null, error };
  },

  create: async (queue: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queues')
      .insert([queue])
      .select()
      .single();
    return { data: data as Queue | null, error };
  },

  update: async (id: string, updates: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data: data as Queue | null, error };
  },
};

// ============================================================================
// QUEUE ENTRIES QUERIES
// ============================================================================
export const queueEntryQueries = {
  getByQueue: async (queueId: string, limit = 100) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', queueId)
      .in('status', ['waiting', 'serving'])
      .order('entered_at', { ascending: true })
      .limit(limit);
    return { data: data as QueueEntry[] | null, error };
  },

  getByTenant: async (tenantId: string, limit = 100) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['waiting', 'serving'])
      .order('entered_at', { ascending: true })
      .limit(limit);
    return { data: data as QueueEntry[] | null, error };
  },

  getStatusSummary: async (tenantId: string) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queue_status_summary')
      .select('*')
      .eq('tenant_id', tenantId);
    return { data: data as QueueStatusSummary[] | null, error };
  },

  create: async (entry: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('queue_entries')
      .insert([entry])
      .select()
      .single();
    return { data: data as QueueEntry | null, error };
  },

  updateStatus: async (id: string, status: string, timestamp?: string) => {
    const updates: any = { status };
    if (status === 'serving' && timestamp) {
      updates.started_at = timestamp;
    } else if (status === 'completed' && timestamp) {
      updates.completed_at = timestamp;
    }
    
    // @ts-ignore
    const { data, error } = await supabase
      .from('queue_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data: data as QueueEntry | null, error };
  },

  subscribeToQueue: (queueId: string, callback: (entry: QueueEntry) => void) => {
    return supabase
      .channel(`queue:${queueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `queue_id=eq.${queueId}`,
        },
        (payload: any) => {
          callback(payload.new as QueueEntry);
        }
      )
      .subscribe();
  },
};

// ============================================================================
// ANNOUNCEMENTS QUERIES
// ============================================================================
export const announcementQueries = {
  getActive: async (tenantId?: string) => {
    const base = () =>
      supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

    if (!tenantId) {
      // @ts-ignore
      const { data, error } = await base().order('priority', { ascending: false });
      return { data: data as Announcement[] | null, error };
    }

    // Query terpisah untuk target 'all' vs 'specific' — lebih robust
    // daripada hand-roll string filter .or()/.contains() (format array
    // Postgres vs JSON gampang salah dan gagal diam-diam).
    const [allRes, specificRes] = await Promise.all([
      // @ts-ignore
      base().eq('target_tenants', 'all'),
      // @ts-ignore
      base().eq('target_tenants', 'specific').contains('specific_tenant_ids', [tenantId]),
    ]);

    if (allRes.error) return { data: null, error: allRes.error };
    if (specificRes.error) return { data: null, error: specificRes.error };

    const merged = [...(allRes.data ?? []), ...(specificRes.data ?? [])].sort(
      (a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0)
    );
    return { data: merged as Announcement[], error: null };
  },

  create: async (announcement: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('announcements')
      .insert([announcement])
      .select()
      .single();
    return { data: data as Announcement | null, error };
  },

  update: async (id: string, updates: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data: data as Announcement | null, error };
  },
};

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================
export const analyticsQueries = {
  getByTenantAndDate: async (tenantId: string, startDate: string, endDate: string) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('analytics_daily')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    return { data: data as AnalyticsDaily[] | null, error };
  },

  getQueueAnalytics: async (queueId: string, days = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // @ts-ignore
    const { data, error } = await supabase
      .from('analytics_daily')
      .select('*')
      .eq('queue_id', queueId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    return { data: data as AnalyticsDaily[] | null, error };
  },
};

// ============================================================================
// TENANT THEMES QUERIES
// ============================================================================
export const themeQueries = {
  getByTenant: async (tenantId: string) => {
    const { data, error } = await supabase
      .from('tenant_themes')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    return { data: data as TenantTheme | null, error };
  },

  update: async (tenantId: string, updates: any) => {
    const { data, error } = await supabase
      .from('tenant_themes')
      .update(updates)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    return { data: data as TenantTheme | null, error };
  },
};

// ============================================================================
// TENANT USERS QUERIES
// ============================================================================
export const tenantUserQueries = {
  getByTenant: async (tenantId: string) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    return { data: data as TenantUser[] | null, error };
  },

  create: async (user: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenant_users')
      .insert([user])
      .select()
      .single();
    return { data: data as TenantUser | null, error };
  },

  update: async (id: string, updates: any) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('tenant_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single() as any;
    return { data: data as TenantUser | null, error };
  },
};
