// Peta warna aksen semantik — fondasi audit UI template (bukti: "Sedang
// Dilayani" biru di admin/page.tsx tapi amber di components/kpi-cards.tsx;
// "Menunggu" amber di admin/page.tsx tapi biru di operator/stats-bar.tsx;
// dashboard/page.tsx pakai palet ketiga lagi untuk titik aktivitas). Satu
// sumber kebenaran dipilih di sini; migrasi pemakai lama menyusul bertahap,
// TIDAK sekaligus (lihat rencana audit UI template).
//
// Keputusan warna (mayoritas + hindari tabrakan semantik antar status):
// - waiting   → amber   (menunggu/pending, konvensi UX umum)
// - serving   → blue    (mayoritas 2 dari 3 sumber; amber dipakai waiting)
// - completed → emerald (bulat di SEMUA sumber, tanpa konflik)
// - operator  → purple  (satu-satunya sumber, tanpa konflik)

export type StatusKey = 'waiting' | 'serving' | 'completed' | 'operator';

export interface AccentColor {
  text: string;
  bg: string;
  border: string;
}

export const STATUS_COLORS: Record<StatusKey, AccentColor> = {
  waiting: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  serving: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  completed: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  operator: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
};
