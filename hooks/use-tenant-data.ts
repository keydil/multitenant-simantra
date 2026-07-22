'use client';

import { useEffect, useState } from 'react';
import {
  tenantQueries,
  announcementQueries,
  analyticsQueries,
  themeQueries,
  tenantUserQueries,
} from '@/lib/api/queries';
import type {
  Tenant,
  Announcement,
  AnalyticsDaily,
  TenantTheme,
  TenantUser,
} from '@/lib/api/types';

/**
 * `includeInactive` wajib dikirim halaman Manajemen Instansi (E1/E3). Tanpa itu
 * `getAll()` menempel `?is_active=true`, sehingga instansi yang dinonaktifkan
 * lenyap dari dashboard dan tidak ada lagi jalan untuk mengaktifkannya kembali.
 */
export const useTenants = (opts?: { includeInactive?: boolean }) => {
  const includeInactive = opts?.includeInactive ?? false;
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setTenants(await tenantQueries.getAll({ includeInactive }));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [includeInactive]);

  return { tenants, loading, error, setTenants };
};

export const useTenant = (tenantId: string) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setTenant(await tenantQueries.getById(tenantId));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

  return { tenant, loading, error };
};

export const useAnnouncements = (tenantId?: string) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        if (tenantId) {
          // Staff: server sudah memfilter aktif + belum expired + target cocok
          setAnnouncements(await announcementQueries.getActiveForTenant(tenantId));
        } else {
          // Superadmin: /announcements = semua; pertahankan semantik lama
          // hook ini (hanya yang aktif & belum expired, sort priority)
          const now = Date.now();
          const all = await announcementQueries.getAll();
          setAnnouncements(
            all
              .filter(
                (a) =>
                  a.is_active &&
                  (a.expires_at === null || new Date(a.expires_at).getTime() > now)
              )
              .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
          );
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [tenantId]);

  return { announcements, loading, error, setAnnouncements };
};

export const useAnalytics = (tenantId: string, days = 30) => {
  const [analytics, setAnalytics] = useState<AnalyticsDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const endDate = new Date();

        setAnalytics(
          await analyticsQueries.getByTenantAndDate(
            tenantId,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
        );
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchAnalytics();
    }
  }, [tenantId, days]);

  return { analytics, loading, error };
};

export const useTenantTheme = (tenantId: string) => {
  const [theme, setTheme] = useState<TenantTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        setTheme(await themeQueries.getByTenant(tenantId));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchTheme();
    }
  }, [tenantId]);

  return { theme, loading, error, setTheme };
};

export const useTenantUsers = (tenantId: string) => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsers(await tenantUserQueries.getByTenant(tenantId));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchUsers();
    }
  }, [tenantId]);

  return { users, loading, error, setUsers };
};
