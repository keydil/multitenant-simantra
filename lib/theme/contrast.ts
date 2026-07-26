/**
 * Utilitas kontras WCAG untuk warna tenant.
 *
 * Kenapa perlu: warna di TenantTheme diisi superadmin dan bisa apa saja.
 * Palet seed saja sudah punya `#FED7AA` sebagai accent — teks putih di atasnya
 * cuma 1.35:1, praktis tak terbaca. Halaman kiosk dipakai publik di layar
 * sentuh yang sering silau, jadi ia tak boleh bergantung pada asumsi bahwa
 * warna yang di-set kebetulan gelap.
 *
 * ── Prinsip yang dipegang ───────────────────────────────────────────────────
 * TIDAK ADA warna yang diciptakan di sini. Tak ada penggelapan HSL, tak ada
 * color-mix. Yang dilakukan cuma dua hal:
 *   1. MEMILIH tinta netral (putih atau slate gelap) di atas permukaan berwarna;
 *   2. MEMILIH di antara warna tenant yang MEMANG SUDAH ADA mana yang lolos
 *      kontras, dan jatuh ke netral kalau tak satu pun lolos.
 * Jadi yang tampil selalu warna asli dari database, cuma dipilih penempatannya.
 */

/** Tinta di atas permukaan gelap. */
export const INK_LIGHT = '#ffffff';
/** Tinta di atas permukaan terang. Slate-900, senada dengan teks kiosk lain. */
export const INK_DARK = '#0f172a';

/** Ambang WCAG AA: 4.5 untuk teks normal, 3.0 untuk teks besar/grafis. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

/**
 * Luminansi relatif sRGB (WCAG 2.x). Mengembalikan null kalau hex tak bisa
 * dibaca — pemanggil wajib menangani, jangan diam-diam menganggapnya hitam:
 * warna tak terbaca yang dianggap gelap akan menghasilkan teks putih di atas
 * permukaan yang mungkin justru terang.
 */
export function relativeLuminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = (m[1].match(/../g) as string[]).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rasio kontras WCAG, 1–21. Mengembalikan 1 (terburuk) kalau warna tak terbaca. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Tinta yang terbaca di atas permukaan `background`. Dipakai untuk teks/ikon
 * DI ATAS blok berwarna tenant (tombol, kotak logo).
 *
 * Bukan sekadar ambang luminansi: dihitung dua-duanya lalu diambil yang
 * rasionya lebih besar, supaya warna di tengah rentang (yang jelek untuk
 * putih MAUPUN hitam) tetap dapat pilihan terbaik yang tersedia.
 */
export function readableInk(background: string): string {
  return contrastRatio(INK_LIGHT, background) >= contrastRatio(INK_DARK, background)
    ? INK_LIGHT
    : INK_DARK;
}

/**
 * Pilih warna tenant PERTAMA yang lolos ambang kontras di atas `background`.
 * Dipakai untuk teks/ikon BERWARNA tenant di atas permukaan terang (judul
 * header, ikon kartu).
 *
 * Urutan `candidates` = urutan preferensi. Pola khasnya `[primary, secondary]`:
 * primary dulu karena itu identitas utama, secondary sebagai cadangan karena
 * pada praktiknya ia sering versi lebih gelap dari primary. Kalau dua-duanya
 * gagal, `fallback` netral dipakai — lebih baik judul berwarna slate daripada
 * judul yang tak terbaca.
 */
export function pickReadable(
  candidates: string[],
  background: string,
  minRatio: number,
  fallback: string = INK_DARK,
): string {
  return candidates.find((c) => contrastRatio(c, background) >= minRatio) ?? fallback;
}

/**
 * Pilih warna tenant untuk dipakai sebagai PERMUKAAN (latar tombol) yang masih
 * sanggup memikul teks terbaca.
 *
 * Beda dari `pickReadable` yang mengurus warna teks: di sini yang dinilai
 * adalah apakah permukaan itu punya tinta — putih ATAU gelap — yang mencapai
 * `minRatio`. Perlu karena warna di tengah rentang luminansi (mis. `#8B5CF6`)
 * tidak terbaca oleh tinta mana pun: putih cuma 4.23:1, hitam lebih buruk lagi.
 * Untuk kasus begitu, primary dilewati dan secondary dipakai.
 *
 * Kalau tak ada satu pun kandidat yang lolos, dikembalikan kandidat dengan
 * rasio TERBAIK yang bisa dicapai — bukan warna netral karangan. Tombol tetap
 * berwarna tenant; kita cuma memilih yang paling tidak buruk, dan superadmin
 * yang harus membetulkan paletnya di sumber.
 */
export function pickSurface(candidates: string[], minRatio: number): string {
  const best = (c: string) => Math.max(contrastRatio(INK_LIGHT, c), contrastRatio(INK_DARK, c));
  return (
    candidates.find((c) => best(c) >= minRatio) ??
    candidates.reduce((a, b) => (best(b) > best(a) ? b : a))
  );
}
