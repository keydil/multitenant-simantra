'use client';

import { useEffect, useState } from 'react';
import {
  tenantQueries,
  announcementQueries,
  analyticsQueries,
  themeQueries,
  tenantUserQueries,
} from '@/lib/supabase/queries';
import type {
  Tenant,
  Announcement,
  AnalyticsDaily,
  TenantTheme,
  TenantUser,
} from '@/lib/supabase/types';

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const { data, error } = await tenantQueries.getAll();
        if (error) throw error;
        setTenants(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  return { tenants, loading, error, setTenants };
};

export const useTenant = (tenantId: string) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const { data, error } = await tenantQueries.getById(tenantId);
        if (error) throw error;
        setTenant(data);
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
        const { data, error } = await announcementQueries.getActive(tenantId);
        if (error) throw error;
        setAnnouncements(data || []);
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

        const { data, error } = await analyticsQueries.getByTenantAndDate(
          tenantId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        if (error) throw error;
        setAnalytics(data || []);
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
        const { data, error } = await themeQueries.getByTenant(tenantId);
        if (error) throw error;
        setTheme(data);
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
        const { data, error } = await tenantUserQueries.getByTenant(tenantId);
        if (error) throw error;
        setUsers(data || []);
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
