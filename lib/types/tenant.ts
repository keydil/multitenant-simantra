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
  image_url: string | null;
  queue_view_seconds: number;
  media_view_seconds: number;
  running_text: string | null;
  is_custom_theme: boolean;
  // Judul tengah kiosk: teks auto-generate ('generated') atau wordmark
  // gambar custom ('wordmark'). URL tetap tersimpan walau mode balik ke
  // generated — lihat kiosk-home.tsx untuk logika render + fallback.
  header_mode: 'generated' | 'wordmark';
  header_wordmark_url: string | null;
  // Tipografi mode 'generated' — lihat lib/theme/header-fonts.ts untuk daftar
  // key font yang valid. Judul TETAP ikut tenant.name (tak ada teks judul
  // terpisah, sengaja); subtitle boleh diganti teksnya (null → fallback).
  header_title_font: string;
  header_title_bold: boolean;
  header_subtitle_text: string | null;
  header_subtitle_font: string;
  header_subtitle_bold: boolean;
  header_subtitle_size: string;
  header_subtitle_color: string;
}
