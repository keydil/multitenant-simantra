/**
 * Daftar font judul/subtitle kiosk yang boleh dipilih superadmin.
 *
 * Key di sini HARUS SAMA PERSIS dengan `HEADER_FONT_KEYS` di
 * `simantra-backend/src/tenants/dto/tenants.dto.ts` — dua repo terpisah tak
 * bisa saling import, jadi daftar ini diduplikasi manual. Kalau menambah
 * font baru, ubah keduanya bersamaan, plus:
 *  - tambah import font di app/layout.tsx (next/font/google, expose sebagai
 *    CSS variable `--font-{key}`)
 *  - tambah entri di FONT_LABELS di bawah
 *
 * Disimpan sebagai STRING tervalidasi (bukan enum Prisma) SENGAJA: nambah
 * pilihan font baru tidak pernah butuh migrasi database, murni kerja kode
 * di kedua repo.
 */

export const HEADER_FONT_OPTIONS = [
  { key: 'default', label: 'Bawaan' },
  { key: 'montserrat', label: 'Montserrat' },
  { key: 'poppins', label: 'Poppins' },
  { key: 'inter', label: 'Inter' },
  { key: 'pt_serif', label: 'PT Serif' },
  { key: 'playfair_display', label: 'Playfair Display' },
  { key: 'comic_neue', label: 'Comic Neue' },
  { key: 'patrick_hand', label: 'Patrick Hand' },
] as const;

export type HeaderFontKey = (typeof HEADER_FONT_OPTIONS)[number]['key'];

/**
 * key font → var CSS. 'default' sengaja tidak masuk peta ini — pemanggil
 * membiarkan `font-family` warisan dari elemen induknya (font-sans/
 * font-rounded yang sudah dipakai kiosk) alih-alih memaksa satu var
 * tertentu, supaya "Bawaan" benar-benar berarti "tidak override".
 */
const FONT_CSS_VARS: Partial<Record<HeaderFontKey, string>> = {
  montserrat: 'var(--font-montserrat)',
  poppins: 'var(--font-poppins)',
  inter: 'var(--font-inter)',
  pt_serif: 'var(--font-pt-serif)',
  playfair_display: 'var(--font-playfair-display)',
  comic_neue: 'var(--font-comic-neue)',
  patrick_hand: 'var(--font-patrick-hand)',
};

/** undefined untuk 'default' → pemanggil tahu harus skip override fontFamily. */
export function headerFontFamily(key: string | null | undefined): string | undefined {
  return FONT_CSS_VARS[key as HeaderFontKey];
}

/**
 * Preset ukuran subtitle kiosk. Key HARUS SAMA PERSIS dengan
 * `HEADER_SUBTITLE_SIZES` di `tenants.dto.ts` backend — duplikasi manual,
 * sama seperti HEADER_FONT_OPTIONS di atas. Preset (bukan px bebas)
 * konsisten dengan gaya form lain di app ini.
 */
export const HEADER_SUBTITLE_SIZE_OPTIONS = [
  { key: 'sm', label: 'Kecil' },
  { key: 'md', label: 'Sedang' },
  { key: 'lg', label: 'Besar' },
] as const;

export type HeaderSubtitleSizeKey = (typeof HEADER_SUBTITLE_SIZE_OPTIONS)[number]['key'];

const SUBTITLE_SIZE_CLASSES: Record<HeaderSubtitleSizeKey, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/** Fallback 'sm' kalau nilai tak dikenal — tak pernah mengembalikan string kosong. */
export function headerSubtitleSizeClass(size: string | null | undefined): string {
  return SUBTITLE_SIZE_CLASSES[size as HeaderSubtitleSizeKey] ?? SUBTITLE_SIZE_CLASSES.sm;
}
