// Tenant & Theme types
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  brand_color: string;
  logo_url: string | null;
  is_active: boolean;
  subscription_tier?: 'free' | 'standard' | 'premium';
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  // Disertakan oleh GET /public/tenants/:slug (include theme). Display board
  // publik membaca theme.video_url dari sini (E7).
  theme?: TenantTheme | null;
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
  video_url: string | null;
  running_text: string | null;
  is_custom_theme: boolean;
}
