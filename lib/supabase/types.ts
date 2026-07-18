export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
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
        };
        Insert: Omit<
          Database['public']['Tables']['tenants']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      tenant_users: {
        Row: {
          id: string;
          tenant_id: string | null;
          auth_user_id: string;
          email: string;
          full_name: string | null;
          role: 'superadmin' | 'admin' | 'operator';
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['tenant_users']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['tenant_users']['Insert']>;
      };
      queues: {
        Row: {
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
        };
        Insert: Omit<
          Database['public']['Tables']['queues']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['queues']['Insert']>;
      };
      queue_entries: {
        Row: {
          id: string;
          queue_id: string;
          tenant_id: string;
          ticket_number: string;
          customer_name: string | null;
          status: 'waiting' | 'serving' | 'completed' | 'no_show' | 'cancelled';
          service_window: number | null;
          priority: number;
          entered_at: string;
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['queue_entries']['Row'],
          'id' | 'entered_at'
        >;
        Update: Partial<Database['public']['Tables']['queue_entries']['Insert']>;
      };
      announcements: {
        Row: {
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
        };
        Insert: Omit<
          Database['public']['Tables']['announcements']['Row'],
          'id' | 'created_at' | 'updated_at' | 'published_at'
        >;
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>;
      };
      analytics_daily: {
        Row: {
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
        };
        Insert: Omit<
          Database['public']['Tables']['analytics_daily']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['analytics_daily']['Insert']>;
      };
      tenant_themes: {
        Row: {
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
        };
        Insert: Omit<
          Database['public']['Tables']['tenant_themes']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['tenant_themes']['Insert']>;
      };
      guest_book: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          institution: string;
          purpose: string;
          phone: string;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['guest_book']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['guest_book']['Insert']>;
      };
    };
    Views: {
      active_queues: {
        Row: {
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
          tenant_name: string;
        };
      };
      queue_status_summary: {
        Row: {
          queue_id: string;
          tenant_id: string;
          queue_name: string | null;
          total_in_queue: number;
          currently_serving: number;
          waiting_count: number;
          latest_entry_time: string | null;
        };
      };
    };
  };
};

// Type aliases for convenience
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantUser = Database['public']['Tables']['tenant_users']['Row'];
export type Queue = Database['public']['Tables']['queues']['Row'];
export type QueueEntry = Database['public']['Tables']['queue_entries']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type AnalyticsDaily = Database['public']['Tables']['analytics_daily']['Row'];
export type TenantTheme = Database['public']['Tables']['tenant_themes']['Row'];
export type ActiveQueue = Database['public']['Views']['active_queues']['Row'];
export type QueueStatusSummary = Database['public']['Views']['queue_status_summary']['Row'];
export type GuestBook = Database['public']['Tables']['guest_book']['Row'];

