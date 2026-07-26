/**
 * Ilustrasi flat untuk halaman kiosk publik.
 *
 * Digambar tangan sebagai inline SVG (bukan aset dari desainer) supaya bisa ikut
 * warna tiap tenant tanpa perlu file gambar per instansi, dan supaya layar kiosk
 * yang ditinggal menyala tak perlu request gambar tambahan.
 *
 * ── Aturan warna (penting, jangan dilanggar saat menambah elemen) ────────────
 * Ada DUA palet yang sengaja dipisah:
 *
 *  1. PALET ORANG + LATAR — konstanta di bawah, FIXED, tidak pernah ikut tenant.
 *     Kulit, rambut, baju, celana, sepatu, jam dinding, tanaman, garis lantai.
 *     Alasannya: warna tenant itu warna instansi, bukan warna manusia. Kalau
 *     baju orang ikut brand_color, tenant berwarna merah menyala akan
 *     menghasilkan ilustrasi orang berbaju merah menyala — dan tiap ganti
 *     tenant, orangnya ganti baju. Netral yang tetap justru bikin warna tenant
 *     kelihatan lebih menonjol karena tak bersaing dengan apa pun.
 *
 *  2. PALET TENANT — prop `palette`, diambil dari TenantTheme yang MEMANG SUDAH
 *     punya lima kolom warna. Cuma untuk benda tema: badan mesin tiket, meja,
 *     layar, tombol, aksen kertas. Tiga warna (primary/secondary/accent) dipakai
 *     langsung apa adanya — tidak ada turunan HSL, tidak ada color-mix — jadi
 *     yang tampil persis warna yang admin set di database.
 *
 * Gradasi halus tetap dibuat dari OPACITY, bukan hitung-hitungan warna, supaya
 * warna tenant segelap/sepucat apa pun tetap menghasilkan tint yang masuk akal.
 */

// ── Palet FIXED: orang & elemen latar. Tidak pernah ikut warna tenant. ───────
const SKIN = '#f2c6a0';
const SKIN_SHADE = '#e0ac83';
const HAIR = '#3f3f46';
const SHIRT = '#94a3b8';
const TROUSER = '#475569';
const SHOE = '#1e293b';

// Orang kedua (yang mengantre di belakang): sengaja lebih terang & lebih pucat
// supaya terbaca sebagai "lebih jauh" tanpa perlu blur atau bayangan.
const SKIN_ALT = '#e8bfa0';
const HAIR_ALT = '#57534e';
const SHIRT_ALT = '#cbd5e1';
const TROUSER_ALT = '#64748b';
const SHOE_ALT = '#334155';

// Netral bersama: kertas, garis, perabot yang bukan benda tema.
const PAPER = '#ffffff';
const PAPER_SHADE = '#f1f5f9';
const LINE = '#e2e8f0';
const MID = '#cbd5e1';
const SLOT = '#94a3b8';
const SCREEN = '#0f172a';
// Daun tanaman: hijau-abu teredam. Tetap FIXED (bukan warna tenant) sesuai
// aturan di atas — dibuat sedikit kehijauan, bukan abu murni, supaya tak
// terbaca sebagai tanaman mati. Ganti ke MID kalau mau benar-benar netral.
const FOLIAGE = '#9aab9d';

export type KioskPalette = {
  /** TenantTheme.primary_color — fallback ke Tenant.brand_color. */
  primary: string;
  /** TenantTheme.secondary_color. */
  secondary: string;
  /** TenantTheme.accent_color. */
  accent: string;
};

type IllustrationProps = {
  palette: KioskPalette;
  className?: string;
};

/**
 * Garis batas dinding-lantai. Orang & perabot berdiri DI DEPAN garis ini
 * (kaki di y=244, garis di y=222) — itu yang bikin ruangnya terasa punya
 * kedalaman, bukan sekadar objek melayang di bidang kosong.
 */
function FloorLine() {
  return <rect x="14" y="222" width="252" height="2" rx="1" fill={LINE} />;
}

/** Jam dinding — elemen latar, netral penuh. */
function WallClock({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={MID} strokeWidth="2.5" />
      <path
        d={`M${cx} ${cy - r * 0.55}V${cy}h${r * 0.42}`}
        stroke={TROUSER}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx={cx} cy={cy} r="1.8" fill={TROUSER} />
    </g>
  );
}

/** Pengunjung mengambil nomor antrian di mesin tiket. */
export function TicketKioskIllustration({ palette, className }: IllustrationProps) {
  const { primary, secondary, accent } = palette;
  return (
    <svg viewBox="0 0 280 280" fill="none" className={className} aria-hidden="true">
      {/* Latar: aksen ambient pakai primary supaya ilustrasi ini senada dengan
          kartu Layanan yang juga ber-aksen primary. */}
      <circle cx="252" cy="196" r="7" fill={primary} opacity="0.12" />
      <circle cx="248" cy="40" r="10" fill={accent} opacity="0.12" />
      <WallClock cx={40} cy={52} r={17} />
      <FloorLine />
      <ellipse cx="140" cy="250" rx="112" ry="13" fill={primary} opacity="0.09" />

      {/* Orang kedua yang mengantre — digambar SEBELUM mesin & orang utama
          supaya tertimpa, itu yang bikin urutan kedalamannya terbaca. */}
      <g transform="translate(-30 42) scale(0.78)">
        <rect x="80" y="112" width="12" height="14" fill={SKIN_ALT} />
        <path
          d="M86 120c-13 0-23 8-23 17v35c0 5 4 9 9 9h28c5 0 9-4 9-9v-35c0-9-10-17-23-17z"
          fill={SHIRT_ALT}
        />
        <rect x="72" y="170" width="32" height="16" rx="7" fill={TROUSER_ALT} />
        <rect x="74" y="180" width="12" height="58" rx="6" fill={TROUSER_ALT} />
        <rect x="90" y="180" width="12" height="58" rx="6" fill={TROUSER_ALT} />
        <rect x="68" y="233" width="21" height="11" rx="5.5" fill={SHOE_ALT} />
        <rect x="88" y="233" width="21" height="11" rx="5.5" fill={SHOE_ALT} />
        <path d="M68 140 L64 174" stroke={SHIRT_ALT} strokeWidth="13" strokeLinecap="round" />
        <circle cx="63" cy="178" r="6.5" fill={SKIN_ALT} />
        <path d="M104 140 L108 174" stroke={SHIRT_ALT} strokeWidth="13" strokeLinecap="round" />
        <circle cx="109" cy="178" r="6.5" fill={SKIN_ALT} />
        <circle cx="86" cy="97" r="20" fill={HAIR_ALT} />
        <circle cx="86" cy="101" r="19" fill={SKIN_ALT} />
      </g>

      {/* Mesin tiket — badan pakai secondary. Stroke netral tipis sengaja
          dipertahankan supaya siluet mesin tetap terbaca kalau tenant memilih
          secondary yang sangat pucat dan nyaris menyatu dengan latar. */}
      <rect
        x="168"
        y="58"
        width="84"
        height="182"
        rx="16"
        fill={secondary}
        stroke={MID}
        strokeWidth="1.5"
      />
      <rect x="176" y="236" width="68" height="11" rx="5.5" fill={MID} />

      {/* Layar: bodinya gelap tetap (bukan warna tenant) supaya isi layar
          kontras di semua tenant; isinya yang pakai warna tenant. */}
      <rect x="178" y="70" width="64" height="62" rx="9" fill={SCREEN} />
      <rect x="186" y="80" width="48" height="9" rx="4.5" fill={primary} />
      <rect x="186" y="95" width="32" height="6" rx="3" fill="#ffffff" opacity="0.35" />
      <rect x="186" y="107" width="40" height="6" rx="3" fill="#ffffff" opacity="0.18" />

      {/* Tombol: satu tombol aktif ber-accent, sisanya netral. */}
      <circle cx="192" cy="150" r="7" fill={accent} />
      <circle cx="210" cy="150" r="7" fill={MID} />
      <circle cx="228" cy="150" r="7" fill={MID} />

      {/* Slot + tiket yang keluar */}
      <rect x="184" y="170" width="52" height="9" rx="4.5" fill={SLOT} />
      <rect x="190" y="177" width="40" height="32" rx="4" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
      <rect x="197" y="186" width="26" height="6" rx="3" fill={primary} opacity="0.85" />
      <rect x="197" y="197" width="16" height="4" rx="2" fill={MID} />

      {/* Pengunjung utama */}
      <rect x="94" y="112" width="12" height="14" fill={SKIN_SHADE} />
      <path
        d="M100 120c-13 0-23 8-23 17v35c0 5 4 9 9 9h28c5 0 9-4 9-9v-35c0-9-10-17-23-17z"
        fill={SHIRT}
      />
      <rect x="86" y="170" width="32" height="16" rx="7" fill={TROUSER} />
      <rect x="88" y="180" width="12" height="58" rx="6" fill={TROUSER} />
      <rect x="104" y="180" width="12" height="58" rx="6" fill={TROUSER} />
      <rect x="82" y="233" width="21" height="11" rx="5.5" fill={SHOE} />
      <rect x="102" y="233" width="21" height="11" rx="5.5" fill={SHOE} />
      <path d="M82 140 L78 172" stroke={SHIRT} strokeWidth="13" strokeLinecap="round" />
      <circle cx="77" cy="176" r="6.5" fill={SKIN} />
      <path d="M118 138 L154 124" stroke={SHIRT} strokeWidth="13" strokeLinecap="round" />
      <circle cx="161" cy="121" r="7" fill={SKIN} />

      {/* Kepala: rambut = lingkaran sedikit lebih besar & digeser ke atas, lalu
          ditimpa lingkaran wajah — sabit rambut tanpa path rumit. */}
      <circle cx="100" cy="97" r="20" fill={HAIR} />
      <circle cx="100" cy="101" r="19" fill={SKIN} />
      <circle cx="119" cy="103" r="4" fill={SKIN_SHADE} />
    </svg>
  );
}

/** Tamu mengisi buku tamu di meja resepsionis. */
export function GuestBookIllustration({ palette, className }: IllustrationProps) {
  const { primary, secondary, accent } = palette;
  return (
    <svg viewBox="0 0 280 280" fill="none" className={className} aria-hidden="true">
      {/* Aksen ambient pakai accent — menyenadakan ilustrasi ini dengan kartu
          Buku Tamu, yang aksen kartunya juga accent. */}
      <circle cx="34" cy="82" r="6" fill={accent} opacity="0.14" />
      <circle cx="262" cy="150" r="7" fill={primary} opacity="0.1" />
      <WallClock cx={40} cy={46} r={15} />
      <FloorLine />
      <ellipse cx="140" cy="250" rx="112" ry="13" fill={accent} opacity="0.09" />

      {/* Kartu tamu melayang */}
      <g transform="rotate(-8 214 92)">
        <rect x="190" y="70" width="50" height="44" rx="8" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
        <circle cx="204" cy="86" r="7" fill={primary} opacity="0.5" />
        <rect x="196" y="98" width="38" height="5" rx="2.5" fill={LINE} />
        <rect x="196" y="107" width="24" height="4" rx="2" fill={PAPER_SHADE} />
      </g>

      {/* Meja — permukaan pakai secondary, kaki netral supaya bobot warnanya
          tak berlebihan kalau secondary kebetulan sangat gelap. */}
      <rect x="104" y="186" width="148" height="13" rx="6.5" fill={secondary} />
      <rect x="120" y="199" width="11" height="46" rx="5.5" fill={MID} />
      <rect x="226" y="199" width="11" height="46" rx="5.5" fill={MID} />

      {/* Tanaman di ujung meja — elemen latar, netral penuh. */}
      <path d="M239 166c-10-4-14-14-10-22 8 1 13 9 10 22z" fill={FOLIAGE} />
      <path d="M239 166c10-4 14-13 10-21-8 1-13 8-10 21z" fill={FOLIAGE} opacity="0.8" />
      <path d="M239 166c0-10 4-18 0-24-5 6-4 15 0 24z" fill={FOLIAGE} opacity="0.6" />
      <path d="M228 168h22l-3 18h-16z" fill={MID} />

      {/* Buku tamu terbuka */}
      <path d="M132 186l7-23 37 5v18z" fill={PAPER} />
      <path d="M220 186l-7-23-37 5v18z" fill={PAPER_SHADE} />
      <path d="M176 168v18" stroke={MID} strokeWidth="2" />
      <rect x="143" y="171" width="26" height="4" rx="2" fill={LINE} />
      <rect x="145" y="179" width="21" height="3.5" rx="1.75" fill={LINE} />
      <rect x="184" y="170" width="24" height="4" rx="2" fill={LINE} />
      {/* Coretan tanda tangan yang baru ditulis */}
      <path d="M185 179q6-6 11 0t11 0" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Tamu */}
      <rect x="64" y="112" width="12" height="14" fill={SKIN_SHADE} />
      <path
        d="M70 120c-13 0-23 8-23 17v35c0 5 4 9 9 9h28c5 0 9-4 9-9v-35c0-9-10-17-23-17z"
        fill={SHIRT}
      />
      <rect x="56" y="170" width="32" height="16" rx="7" fill={TROUSER} />
      <rect x="58" y="180" width="12" height="58" rx="6" fill={TROUSER} />
      <rect x="74" y="180" width="12" height="58" rx="6" fill={TROUSER} />
      <rect x="52" y="233" width="21" height="11" rx="5.5" fill={SHOE} />
      <rect x="72" y="233" width="21" height="11" rx="5.5" fill={SHOE} />
      <path d="M52 140 L48 170" stroke={SHIRT} strokeWidth="13" strokeLinecap="round" />
      <circle cx="47" cy="174" r="6.5" fill={SKIN} />
      <path d="M88 138 L132 162" stroke={SHIRT} strokeWidth="13" strokeLinecap="round" />
      <circle cx="139" cy="166" r="7" fill={SKIN} />

      {/* Pena */}
      <path d="M142 172l16-19 6 5-16 19z" fill={TROUSER} />
      <path d="M136 178l6-6 5 4z" fill={accent} />

      {/* Kepala (teknik sama dengan ilustrasi mesin tiket) */}
      <circle cx="70" cy="97" r="20" fill={HAIR} />
      <circle cx="70" cy="101" r="19" fill={SKIN} />
      <circle cx="89" cy="103" r="4" fill={SKIN_SHADE} />
    </svg>
  );
}
