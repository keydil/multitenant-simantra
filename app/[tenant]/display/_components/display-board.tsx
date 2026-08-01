'use client';

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { publicQueries } from '@/lib/api/queries';
import { useRealtime } from '@/hooks/use-realtime';
import type { Tenant } from '@/lib/types/tenant';
import type { Queue } from '@/lib/types/queue';
import type { PublicQueueEntry, Announcement, Sponsor } from '@/lib/api/types';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Wrench, Info, Loader2, Megaphone, Hourglass, Inbox } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { AA_LARGE, AA_TEXT, INK_LIGHT, pickReadable, readableInk } from '@/lib/theme/contrast';
import { headerFontFamily, headerSubtitleSizeClass } from '@/lib/theme/header-fonts';

// Gaya banner pengumuman per tipe (warna latar + ikon + label). Statik →
// didefinisikan di module scope supaya tidak dialokasi ulang tiap render.
const ANN_STYLE: Record<Announcement['announcement_type'], { bg: string; icon: ReactNode; label: string }> = {
  maintenance: { bg: '#b91c1c', icon: <Wrench className="w-5 h-5" />, label: 'PEMELIHARAAN' },
  warning:     { bg: '#b45309', icon: <AlertTriangle className="w-5 h-5" />, label: 'PERHATIAN' },
  update:      { bg: '#1d4ed8', icon: <Info className="w-5 h-5" />, label: 'INFO' },
  info:        { bg: '#334155', icon: <Info className="w-5 h-5" />, label: 'INFO' },
};

// Acuan hitung kontras. Beda dari kiosk yang latarnya cuma PERKIRAAN (gradient
// + tint brand di atasnya), di sini `bg-slate-900` MEMANG persis #0f172a — jadi
// angka kontras yang dihitung terhadap nilai ini akurat, bukan aproksimasi.
const BOARD_BG = '#0f172a';

// Warna subtitle bawaan board (slate-400). Dipakai sebagai fallback saat warna
// subtitle pilihan superadmin gagal kontras di latar navy — lihat subtitleColor.
const SUBTITLE_FALLBACK = '#94a3b8';

// Satu transition untuk SEMUA transisi struktural di board ini (pergantian
// fase, pergantian view, crossfade media, rotasi banner). Sebelumnya tiap
// elemen punya durasi sendiri — 0.3 / 0.35 / 0.4, dua elemen tanpa transition
// sama sekali (jatuh ke default framer), dan satu jatuh ke SPRING tak
// terkendali — sehingga potongan-potongan gerak selesai di waktu berbeda dan
// terbaca saling susul. Nilainya sengaja SAMA PERSIS dengan SLIDE_TRANSITION di
// kiosk-home.tsx supaya dua layar publik ini terasa satu keluarga.
//
// CATATAN: ini BUKAN untuk tiga animasi berulang tak berujung (marquee 30s,
// denyut kartu 2s, rotasi konik 3s) — ketiganya punya semantik sendiri.
const SLIDE_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

// Tangga radius board. Sebelumnya rounded-lg/xl/2xl/3xl dipakai berselang-seling
// tanpa alasan; sekarang tiap tingkat punya makna:
//   rounded-2xl → permukaan besar & kartu (panel, kotak media, kartu antrian)
//   rounded-xl  → elemen kecil (badge, chip, header kolom, strip)
//   rounded-full→ pil (indikator status)
// Satu pengecualian yang DISENGAJA: isi kartu "dipanggil" memakai rounded-lg,
// karena pembungkusnya rounded-xl dengan padding 4px — radius dalam harus lebih
// kecil dari radius luar supaya lengkungannya sejajar, bukan karena lupa.
const R_SURFACE = 'rounded-2xl';
const R_ELEMENT = 'rounded-xl';

// Maksimal kolom yang muat dibaca dari jarak jauh di layar 16:9. Antrian lebih
// dari ini dipecah jadi beberapa halaman yang berotasi, bukan dijejalkan.
const GRID_PAGE_SIZE = 4;

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'id-ID'; utt.rate = 0.8;
  const voices = window.speechSynthesis.getVoices();
  const id = voices.find(v => v.lang.startsWith('id'));
  if (id) utt.voice = id;
  window.speechSynthesis.speak(utt);
}

export default function DisplayBoard() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  // Tenant + theme ikut siklus polling (bukan fetch-sekali) supaya perubahan
  // video_url/running_text/logo/brand langsung tampil tanpa reload manual —
  // konsisten dengan strategi realtime data antrian.
  const [tenant, setTenant] = useState<Tenant | null>(null);
  // Pengumuman superadmin untuk banner berrotasi di bawah header. Sudah
  // difilter ke subset genting (maintenance/warning) saat fetch — lihat
  // loadTenant; info/update tak ditampilkan di layar publik.
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annIndex, setAnnIndex] = useState(0);
  // Logo sponsor/mitra ("OFFICIAL PARTNERS") — config admin, ikut siklus poll
  // lambat yang sama dengan tenant/announcements. Hanya dirender saat fase
  // media (lihat showMedia di JSX).
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [entries, setEntries] = useState<PublicQueueEntry[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  // Rotasi tampilan disimpan sebagai SATU penghitung langkah, bukan dua state
  // terpisah (mode + halaman). Dengan dua state, interval harus mengubah
  // keduanya secara terkoordinasi dan gampang menghasilkan kombinasi mustahil
  // (mis. mode split tapi halaman ke-3). Satu penghitung mustahil tak sinkron:
  // mode dan halaman sama-sama DITURUNKAN darinya saat render.
  const [rotStep, setRotStep] = useState(0);
  // Rotasi display: bergantian fase antrian ↔ media (kalau media di-set).
  const [phase, setPhase] = useState<'queue' | 'media'>('queue');
  const prevServingRef = useRef<Set<string>>(new Set());
  // Status boot. LATCH SATU ARAH ke 'ready' — sekali board berhasil tampil, ia
  // TIDAK BOLEH turun lagi ke layar error walau poll berikutnya gagal.
  //
  // Ini bukan sekadar soal estetika: speak() dipicu dari DUA jalur (handler WS
  // `entry.called` dan diff di loadData), dideduplikasi HANYA lewat
  // prevServingRef. Layar error yang berkedip masuk-keluar akan me-remount
  // komponen, me-reset ref itu, dan loadData berikutnya akan MENYUARAKAN ULANG
  // SEMUA nomor yang sedang dilayani lewat pengeras suara ruangan.
  const [boot, setBoot] = useState<'loading' | 'ready' | 'notfound' | 'offline'>('loading');

  // Board ini menyala 24 jam dengan TIGA animasi tak berujung sekaligus.
  // Saat OS meminta gerak dikurangi, yang dimatikan HANYA yang dekoratif
  // (denyut kartu + rotasi border konik). Marquee SENGAJA tetap jalan: ia
  // MEMBAWA KONTEN — menghentikannya berarti menyembunyikan teks berjalan yang
  // panjangnya bisa melebihi layar, jadi justru menghilangkan informasi, bukan
  // sekadar mengurangi gerak.
  const reduceMotion = useReducedMotion();

  // Theme (video_url/running_text/logo/brand) = config admin, TIDAK punya event
  // WS dan tidak ikut aktivitas antrian. Karena itu di-poll sendiri dengan
  // interval tetap yang SELALU jalan (lihat useEffect) — beda dari loadData
  // yang digerakkan event WS + fallback 3s hanya saat WS putus. Menempelkan
  // theme ke loadData bikin ia stale saat WS sehat & antrian idle.
  const loadTenant = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      // Tenant (theme) + pengumuman publik ikut siklus lambat yang sama —
      // dua-duanya config admin/superadmin, bukan data antrian realtime.
      const [tenantData, anns, sponsorData] = await Promise.all([
        publicQueries.getTenant(tenantSlug) as Promise<Tenant>,
        publicQueries.getActiveAnnouncements(tenantSlug),
        publicQueries.getSponsors(tenantSlug),
      ]);
      setTenant(tenantData);
      setSponsors(sponsorData);
      // Public display HANYA menampilkan pengumuman genting bagi pengunjung:
      // maintenance & warning (sesuai desain listActiveForTenantPublic). Tipe
      // info/update ditujukan ke admin — sengaja tak muncul di layar publik;
      // absennya banner saat tak ada hal genting = perilaku benar, bukan bug.
      setAnnouncements(
        anns.filter(
          (a) => a.announcement_type === 'maintenance' || a.announcement_type === 'warning',
        ),
      );
      setBoot('ready');
    } catch (err) {
      // gagal — pertahankan data terakhir, coba lagi tick berikut.
      //
      // Updater FUNGSIONAL (bukan membaca `boot` langsung) itu WAJIB: kalau
      // `boot` masuk ke closure, ia harus masuk ke deps useCallback di bawah,
      // dan berubahnya deps akan merobohkan-membangun ulang useEffect yang
      // memiliki KEEMPAT interval (poll theme, poll data, jam, rotasi
      // grid/split) setiap kali status berubah. Gejalanya halus dan baru
      // kelihatan setelah beberapa menit: rotasi 20 detik restart di
      // tengah jalan, jam melompat. Deps HARUS tetap [tenantSlug].
      setBoot((s) =>
        s === 'ready'
          ? 'ready'
          : err instanceof ApiError && err.statusCode === 404
            ? 'notfound'
            : 'offline',
      );
    }
  }, [tenantSlug]);

  const loadData = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      // Endpoint publik: entries TANPA customer_name/notes
      const [qData, newEntries] = await Promise.all([
        publicQueries.getQueues(tenantSlug) as Promise<Queue[]>,
        publicQueries.getEntries(tenantSlug, 'waiting,serving,completed'),
      ]);
      setQueues(qData);

      // TTS for newly serving
      const nowServing = new Set(newEntries.filter(e => e.status === 'serving').map(e => e.id));
      nowServing.forEach(id => {
        if (!prevServingRef.current.has(id)) {
          const e = newEntries.find(x => x.id === id);
          if (e) {
            const q = qData.find((q: Queue) => q.id === e.queue_id);
            const loket = e.service_window ?? 1;
            speak(`Nomor antrian ${e.ticket_number}, ${q?.display_name ?? q?.name ?? ''}, silakan menuju loket ${loket}.`);
          }
        }
      });
      prevServingRef.current = nowServing;
      setEntries(newEntries);
    } catch {
      // gagal memuat — pertahankan tampilan terakhir, coba lagi di tick berikut
    }
  }, [tenantSlug]);

  // WebSocket room tenant_public:{slug}. entry.called men-trigger TTS
  // langsung; event lain cukup refresh data. prevServingRef ditandai dulu
  // supaya diff di loadData tidak menyuarakan nomor yang sama dua kali.
  const wsConnected = useRealtime(
    tenant ? { type: 'tenant_public', slug: tenantSlug } : null,
    {
      'entry.called': (payload) => {
        const { entry: e, queue: q } = payload as { entry: PublicQueueEntry; queue: Queue | null };
        if (!prevServingRef.current.has(e.id)) {
          prevServingRef.current.add(e.id);
          const loket = e.service_window ?? 1;
          speak(`Nomor antrian ${e.ticket_number}, ${q?.display_name ?? q?.name ?? ''}, silakan menuju loket ${loket}.`);
        }
        loadData();
      },
      'entry.created': () => loadData(),
      'entry.updated': () => loadData(),
      'queue.updated': () => loadData(),
    }
  );
  const wsConnectedRef = useRef(wsConnected);
  wsConnectedRef.current = wsConnected;

  // Mode & halaman DITURUNKAN dari rotStep, bukan disimpan sendiri. Siklus =
  // N halaman grid + 1 langkah split. Kalau jumlah antrian berubah di tengah
  // jalan, pembagiannya ikut menyesuaikan sendiri di tick berikutnya — tak ada
  // state basi yang perlu direkonsiliasi.
  const totalGridPages = Math.max(1, Math.ceil(queues.length / GRID_PAGE_SIZE));
  const cycleStep = rotStep % (totalGridPages + 1);
  const viewMode: 'grid' | 'split' = cycleStep < totalGridPages ? 'grid' : 'split';
  const gridPage = viewMode === 'grid' ? cycleStep : 0;
  // Isi halaman DISEIMBANGKAN, bukan diisi penuh 4 lalu sisanya menumpuk di
  // halaman terakhir. Dengan 5 antrian, pembagian naif 4+1 menyisakan satu
  // kartu sebatang kara yang melar selebar layar tiap 20 detik sekali —
  // terlihat rusak. Membagi rata jadi 3+2 membuat tiap halaman tetap penuh.
  // Rumusnya: jumlah halaman ditentukan dulu, baru isinya dibagi rata.
  const perPage = Math.max(1, Math.ceil(queues.length / totalGridPages));
  // Antrian yang tampil di halaman grid saat ini. Dengan ≤4 antrian ini selalu
  // seluruh daftar dan perilakunya persis seperti sebelum paginasi ada.
  const pagedQueues = queues.slice(gridPage * perPage, (gridPage + 1) * perPage);

  useEffect(() => {
    loadTenant();
    loadData();
    // Theme di-poll SENDIRI tiap 5s dan SELALU (tak peduli WS), karena tak ada
    // event WS untuk perubahan video/running text. Refetch tenant tidak memicu
    // reconnect WS: useRealtime nge-key ke nilai join, bukan identitas objek.
    const themePoll = setInterval(loadTenant, 5000);
    // Polling data antrian 3s = fallback saat socket disconnect; skip saat connected
    const dataPoll = setInterval(() => {
      if (!wsConnectedRef.current) loadData();
    }, 3000);
    const t = setInterval(() => {
      const now = new Date();
      // Tanpa detik — sama dengan header kiosk. Detik tak berguna bagi
      // pengunjung yang menunggu antrian, dan justru bikin angka bergeser tiap
      // detik kalau font yang dipakai tak punya tabular figures.
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    // Rotasi tampilan. Siklusnya sekarang: grid-hal-1 → grid-hal-2 → … → split
    // → kembali ke grid-hal-1. Sengaja MENUMPANG interval yang sudah ada, tidak
    // menambah timer kelima — dua rotasi yang tak sinkron bikin board tak
    // pernah tenang.
    //
    // Callback-nya cuma menaikkan penghitung, tak membaca state apa pun, jadi
    // deps useEffect ini tetap [loadData, loadTenant] — syarat mutlak, karena
    // useEffect inilah pemilik KEEMPAT interval (poll theme, poll data, jam,
    // rotasi). Deps yang ikut berubah tiap daftar antrian berubah akan
    // merobohkan dan membangun ulang semuanya, bikin jam melompat.
    const switchView = setInterval(() => setRotStep((s) => s + 1), 20000);
    return () => { clearInterval(themePoll); clearInterval(dataPoll); clearInterval(t); clearInterval(switchView); };
  }, [loadData, loadTenant]);

  // Resolusi warna DISAMAKAN dengan kiosk (kiosk-home.tsx): theme.primary_color
  // didahulukan, brand_color jadi cadangan. Dulu board ini cuma membaca
  // brand_color — akibatnya satu instansi yang superadmin-nya menyetel
  // primary_color di dialog theme tapi membiarkan brand_color lama bisa tampil
  // DUA WARNA BERBEDA antara kiosk dan TV di ruangan yang sama.
  const theme = tenant?.theme;
  const primary = theme?.primary_color || tenant?.brand_color || '#1e40af';
  const secondary = theme?.secondary_color || '#64748b';
  // Nama `brand` dipertahankan: 7 call site `queue.color_code ?? brand` di
  // bawah tak perlu disentuh sama sekali.
  const brand = primary;

  // Judul instansi. Fallback WAJIB INK_LIGHT eksplisit — default pickReadable
  // adalah INK_DARK (#0f172a) yang PERSIS warna latar board ini, jadi tenant
  // yang primary & secondary-nya sama-sama gagal di navy akan mendapat judul
  // ber-rasio 1.00 alias benar-benar tak terlihat.
  const titleColor = pickReadable([primary, secondary], BOARD_BG, AA_LARGE, INK_LIGHT);
  // Warna subtitle disetel superadmin untuk latar kiosk yang TERANG. Default-nya
  // (#64748b) cuma 3.75 di atas navy — gagal untuk teks kecil. Disaring dulu;
  // kalau tak lolos, pakai slate-400 yang selama ini hardcoded (6.96).
  const subtitleColor = pickReadable(
    [theme?.header_subtitle_color ?? SUBTITLE_FALLBACK],
    BOARD_BG,
    AA_TEXT,
    SUBTITLE_FALLBACK,
  );
  // Cek URL-nya juga, bukan cuma mode: kalau mode 'wordmark' tapi filenya sudah
  // dihapus, jatuh ke judul teks — gambar patah lebih buruk daripada teks
  // generik. Jaring pengaman yang sama dengan kiosk-home.tsx.
  const isWordmark = theme?.header_mode === 'wordmark' && !!theme.header_wordmark_url;

  // Media Display dari theme instansi (endpoint publik menyertakan theme).
  // video_url & image_url XOR (backend menjamin). Ada media → fase media
  // menampilkan video/foto besar; fase antrian menampilkan grid/split.
  const videoUrl = tenant?.theme?.video_url ?? null;
  const imageUrl = tenant?.theme?.image_url ?? null;
  const hasMedia = !!(videoUrl || imageUrl);
  const queueSeconds = tenant?.theme?.queue_view_seconds ?? 20;
  const mediaSeconds = tenant?.theme?.media_view_seconds ?? 60;
  // Media tampil hanya saat fase media (dan memang ada media-nya).
  const showMedia = hasMedia && phase === 'media';
  // Teks berjalan admin-managed; fallback ke default kalau belum diisi.
  const runningText =
    tenant?.theme?.running_text?.trim() || 'MELAYANI DENGAN SEPENUH HATI • BUDAYAKAN ANTRE';

  // Rotasi fase: durasi tiap fase beda, jadi pakai setTimeout yang menjadwalkan
  // ulang tiap kali fase berganti (bukan setInterval). Tanpa media → paksa fase
  // antrian. Deps primitif (angka/bool) → stabil, tak reset tiap poll 5s.
  useEffect(() => {
    if (!hasMedia) {
      setPhase('queue');
      return;
    }
    const seconds = phase === 'queue' ? queueSeconds : mediaSeconds;
    const t = setTimeout(() => setPhase((p) => (p === 'queue' ? 'media' : 'queue')), seconds * 1000);
    return () => clearTimeout(t);
  }, [phase, hasMedia, queueSeconds, mediaSeconds]);

  // Rotasi banner pengumuman tiap 8s bila ada >1. Deps = panjang saja (bukan
  // array) supaya poll 5s yang mengembalikan isi sama tak me-reset interval.
  // annIndex bisa menggantung di indeks lama saat daftar menyusut → di-clamp
  // saat render (lihat currentAnn), jadi aman tanpa reset paksa di sini.
  useEffect(() => {
    if (announcements.length <= 1) {
      setAnnIndex(0);
      return;
    }
    const t = setInterval(() => setAnnIndex((i) => (i + 1) % announcements.length), 8000);
    return () => clearInterval(t);
  }, [announcements.length]);

  const serving = entries.filter(e => e.status === 'serving');
  const entriesByQueue = (qId: string) => entries.filter(e => e.queue_id === qId);

  // Clamp indeks: aman saat daftar menyusut (pengumuman kedaluwarsa) tanpa
  // menunggu efek rotasi menormalkan annIndex.
  const currentAnn =
    announcements.length > 0
      ? announcements[Math.min(annIndex, announcements.length - 1)]
      : null;

  // Isi marquee dipakai dua tempat: strip fixed (mode split) & strip in-flow
  // di bawah video (mode video). Didefinisikan sekali supaya tidak dobel.
  //
  // Scroll <motion.p> STABIL (tak di-key) supaya pergantian teks TIDAK mereset
  // scroll ke awal. Hanya <span> running text yang dibungkus AnimatePresence
  // (key={runningText}) → cuma bagian yang berubah yang slide-up+fade, greeting
  // & pemisah tetap diam. inline-block supaya translateY jalan tanpa merusak
  // baris. Poll 5s nilai sama → key sama → tidak re-trigger.
  const marquee = (
    <motion.p
      initial={{ x: '100vw' }}
      animate={{ x: '-100%' }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      className="whitespace-nowrap text-slate-900 font-black text-xl uppercase tracking-widest"
    >
      SELAMAT DATANG DI {tenant?.name?.toUpperCase() ?? 'SIMANTRA'} &nbsp;•&nbsp;{' '}
      <AnimatePresence mode="wait">
        <motion.span
          key={runningText}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={SLIDE_TRANSITION}
          className="inline-block"
        >
          {runningText}
        </motion.span>
      </AnimatePresence>
      {' '}&nbsp;•&nbsp;
    </motion.p>
  );

  // Strip sponsor diekstrak (dulu inline hanya di fase media) supaya dua call
  // site tak bisa berbeda. Dirender kalau ada sponsor; lihat dua pemanggilnya
  // di bawah untuk alasan kondisi masing-masing.
  const sponsorStrip = (
    <div className={`h-16 ${R_ELEMENT} bg-slate-800 border border-slate-700 flex items-center gap-5 px-6 flex-shrink-0`}>
      <span className="flex-shrink-0 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase leading-tight">
        Official<br />Partners
      </span>
      <div className="flex-1 flex items-center justify-around gap-6 overflow-hidden">
        {sponsors.map((s) => (
          <img
            key={s.id}
            src={s.image_url}
            alt={s.name ?? 'Sponsor'}
            className="h-8 max-w-[110px] object-contain grayscale opacity-70"
          />
        ))}
      </div>
    </div>
  );

  // ── Layar boot ────────────────────────────────────────────────────────────
  // Semua bg-slate-900 (BUKAN bg-slate-50 gaya kiosk) — ini TV, latar terang
  // menyilaukan ruang tunggu. Tak satu pun punya tombol: tak ada yang memegang
  // mouse di depan layar antrian.
  if (boot === 'notfound') {
    // Tak sembuh sendiri — manusia harus membetulkan URL-nya. Slug ditampilkan
    // besar supaya teknisi bisa membacanya dari seberang ruangan.
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500" />
        <p className="text-2xl font-bold">Instansi tidak ditemukan</p>
        <p className="text-slate-400">
          Alamat layar ini menunjuk ke instansi yang tidak terdaftar.
        </p>
        <p className="mt-2 text-4xl font-mono font-bold text-slate-300">/{tenantSlug}</p>
      </div>
    );
  }

  if (boot !== 'ready') {
    // 'loading' & 'offline' berbagi layar yang sama: dua-duanya sementara dan
    // sembuh sendiri di poll 5 detik berikutnya, jadi tak ada gunanya
    // membedakan secara visual selain kalimatnya. Spinner tetap berputar supaya
    // terbaca "sedang berusaha", bukan "mati".
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 className="w-14 h-14 animate-spin text-slate-500" />
        <p className="text-xl text-slate-300">
          {boot === 'offline' ? 'Menyambungkan ke server…' : 'Memuat layar antrian…'}
        </p>
        {/* Info diagnostik kecil — supaya teknisi tahu layar ini menunjuk ke
            mana tanpa perlu membuka DevTools di TV. */}
        <p className="text-xs text-slate-600 font-mono mt-2">
          {tenantSlug} · {process.env.NEXT_PUBLIC_API_URL ?? 'API tak dikonfigurasi'}
        </p>
      </div>
    );
  }

  return (
    // tabular-nums di ROOT, bukan di tiap nomor: font-variant-numeric itu
    // properti TERWARISI, jadi satu deklarasi di sini menutup kelima lokasi
    // nomor antrian + dua penghitung "menunggu" + indikator pengumuman
    // sekaligus. Tanpa ini digit berlebar beda bikin nomor bergeser-geser tiap
    // kali berganti — sangat kentara di layar besar.
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans overflow-hidden text-white tabular-nums">
      {/* Header */}
      <header className="px-10 py-5 flex items-center justify-between border-b border-white/10">
        {/* Logo instansi SELALU tampil — di kedua mode. Sempat disembunyikan di
            mode wordmark dengan alasan "wordmark sudah lockup lengkap", tapi itu
            keliru: kiosk pun tetap menampilkan logo di sel kirinya dan wordmark
            di sana HANYA menggantikan judul tengah. Menyembunyikannya di sini
            bikin display board berperilaku beda dari kiosk tanpa alasan sah. */}
        <div className="flex items-center gap-4">
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} className="h-14 w-auto object-contain drop-shadow" />
          )}

          {/* Judul: ikut sistem wordmark/tipografi yang sama dengan kiosk (diatur
              superadmin per instansi). Sengaja TANPA pembungkus AnimatePresence
              seperti di kiosk — di kiosk itu ada karena layar sentuh yang sedang
              diedit superadmin, sementara di TV tak ada yang menonton headernya
              berubah dan composite key-nya ~11 nilai yang harus disinkronkan
              manual: biaya perawatan tanpa manfaat. */}
          {isWordmark ? (
            // Plat putih WAJIB, tanpa syarat. Wordmark diasumsikan gelap-di-terang
            // (dialog superadmin menerima JPEG dan mem-preview-nya di atas
            // bg-slate-50), jadi di latar navy ia nyaris tak terlihat. Tanpa plat,
            // aset JPEG opak justru tampil sebagai kotak putih bertepi keras —
            // persis "kelihatan seperti bug". bg-white PENUH, bukan bg-white/90:
            // transparansi di atas navy membirukan warna putih di dalam
            // wordmark-nya sendiri.
            <div className="bg-white rounded-2xl px-5 py-3 inline-flex items-center shadow-lg shadow-black/30">
              <img
                src={theme!.header_wordmark_url!}
                alt={tenant?.name ?? ''}
                className="h-14 w-auto object-contain"
              />
            </div>
          ) : (
            <div>
              {/* text-2xl dipertahankan (TIDAK menyalin text-3xl kiosk) — header
                  board lebih padat. font-bold bukan font-black, alasan synthetic
                  bold sama dengan catatan jam di bawah. */}
              <h1
                className={`text-2xl tracking-tight ${theme?.header_title_bold ?? true ? 'font-bold' : 'font-normal'}`}
                style={{ color: titleColor, fontFamily: headerFontFamily(theme?.header_title_font) }}
              >
                {tenant?.name?.toUpperCase()}
              </h1>
              <p
                className={`${headerSubtitleSizeClass(theme?.header_subtitle_size)} tracking-widest uppercase ${theme?.header_subtitle_bold ? 'font-bold' : 'font-normal'}`}
                style={{ color: subtitleColor, fontFamily: headerFontFamily(theme?.header_subtitle_font) }}
              >
                {theme?.header_subtitle_text || 'SISTEM ANTRIAN DIGITAL'}
              </p>
            </div>
          )}
        </div>
        {/* Tanggal di atas, jam di bawah — sama dengan header kiosk. */}
        <div className="text-right">
          <p className="text-xs text-slate-400">{currentDate}</p>
          {/* font-bold, BUKAN font-black: Quicksand berhenti di 700. Minta 900
              bikin browser memalsukan tebalnya (synthetic bold) dan bentuk
              bulatnya jadi rusak. */}
          <p className="text-4xl font-rounded font-bold text-white tabular-nums mt-0.5">{currentTime}</p>
        </div>
      </header>

      {/* Banner pengumuman superadmin — strip di bawah header, berrotasi antar
          item. Sengaja di luar <main> agar selalu tampil di fase antrian MAUPUN
          media (info penting tak hilang saat layar sedang menayangkan video). */}
      {currentAnn && (
        <div className="px-10 py-2.5 flex items-center gap-4 text-white"
          style={{ backgroundColor: ANN_STYLE[currentAnn.announcement_type].bg }}>
          <span className="flex-shrink-0 flex items-center gap-2 font-black text-xs tracking-widest uppercase">
            {ANN_STYLE[currentAnn.announcement_type].icon}
            {ANN_STYLE[currentAnn.announcement_type].label}
          </span>
          {/* key=id → hanya bagian teks yang slide+fade saat rotasi; label/ikon
              & indikator tetap diam. */}
          <AnimatePresence mode="wait">
            <motion.div key={currentAnn.id}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={SLIDE_TRANSITION}
              className="flex items-baseline gap-2 min-w-0 flex-1">
              <span className="font-bold truncate flex-shrink-0 max-w-[40%]">{currentAnn.title}</span>
              <span className="text-white/80 text-sm truncate">{currentAnn.description}</span>
            </motion.div>
          </AnimatePresence>
          {announcements.length > 1 && (
            <span className="flex-shrink-0 text-xs text-white/70 tabular-nums">
              {Math.min(annIndex, announcements.length - 1) + 1}/{announcements.length}
            </span>
          )}
        </div>
      )}

      {/* Main — fase media (video/foto besar + strip antrian) bergantian dengan
          fase antrian (grid/split), diatur rotasi durasi admin. */}
      <main className="relative flex-grow overflow-hidden">
        {/* key media/queue: fade cuma jalan saat fase bertukar, bukan tiap poll
            5s (nilai sama → key sama). TANPA mode="wait" + kedua branch absolute
            inset-0 → media & antrian saling tumpuk saat transisi (crossfade),
            jadi TIDAK ada momen "antrian doang" di layar besar saat masuk fase
            media (dulu mode="wait" nahan antrian fade-out dulu baru media masuk). */}
        <AnimatePresence>
        {showMedia ? (
          <motion.div key="media"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SLIDE_TRANSITION}
            className="absolute inset-0 p-8 flex flex-col gap-4 justify-center">
            {/* Area media dipatok rasio 16:9 (aspect-video, kaya YouTube).
                justify-center membagi sisa ruang atas-bawah rata. */}
            <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 aspect-video rounded-2xl overflow-hidden bg-black relative">
              {/* key by url: ganti media → crossfade (old fade-out & new fade-in
                  overlap), tanpa membongkar sidebar/strip. object-cover: penuhi
                  area tanpa bar hitam (tepi ter-crop tipis). Video XOR foto. */}
              <AnimatePresence>
                {videoUrl ? (
                  <motion.video
                    key={videoUrl}
                    src={videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SLIDE_TRANSITION}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <motion.img
                    key={imageUrl}
                    src={imageUrl ?? undefined}
                    alt=""
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SLIDE_TRANSITION}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="col-span-4 flex flex-col gap-3 overflow-y-auto">
              {queues.map(queue => {
                const qEntries = entriesByQueue(queue.id);
                const servingNow = qEntries.find(e => e.status === 'serving');
                const waitingCount = qEntries.filter(e => e.status === 'waiting').length;
                return (
                  <div key={queue.id} className={`${R_SURFACE} bg-slate-800 border border-slate-700 p-4 flex items-center gap-3`}>
                    {/* readableInk: `text-white` hardcoded gagal kontras di
                        SEMUA 7 warna antrian tersemai (2.49–4.23 vs ambang 4.5). */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black flex-shrink-0"
                      style={{ backgroundColor: queue.color_code ?? brand, color: readableInk(queue.color_code ?? brand) }}>
                      {queue.service_code ?? queue.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 truncate">{queue.display_name ?? queue.name}</p>
                      <p className="font-black text-2xl">{servingNow ? servingNow.ticket_number : '---'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-300">{waitingCount}</p>
                      <p className="text-[10px] text-slate-500">menunggu</p>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            {/* Sponsor/mitra — strip "OFFICIAL PARTNERS", cuma fase media
                (sejajar area media, di atas running text). Grayscale/opacity
                biar seragam (desain: logo mono abu). Cuma dirender kalau ada,
                supaya tak menyita tinggi layar saat tak dikonfigurasi. */}
            {sponsors.length > 0 && sponsorStrip}
            {/* Running text — ruang tetap di bawah (video digeser ke atas).
                Pola INVERSI mengikuti desain acuan: badan putih dengan garis
                merah tipis atas-bawah, bukan sebaliknya seperti dulu. Merah
                sengaja tetap hardcoded (tak ikut warna instansi) — di sini ia
                berfungsi sebagai penanda "informasi berjalan" yang seragam di
                semua instansi, bukan elemen identitas. */}
            <div className={`h-14 ${R_ELEMENT} bg-white flex items-center overflow-hidden flex-shrink-0 relative`}>
              <div className="w-full h-[3px] bg-red-600 absolute top-0" />
              {marquee}
              <div className="w-full h-[3px] bg-red-600 absolute bottom-0" />
            </div>
          </motion.div>
        ) : (
          <motion.div key="queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SLIDE_TRANSITION}
            // pb-20 saat split: strip marquee `fixed` setinggi 56px menutupi
            // dasar layar, sementara padding di sini cuma 32px — tanpa ini
            // dasar kartu kolom kiri tersembunyi di balik strip merah.
            className={`absolute inset-0 p-8 flex flex-col gap-4 ${viewMode === 'split' ? 'pb-20' : ''}`}>
          {queues.length === 0 ? (
            // Instansi belum punya layanan aktif. Tanpa cabang ini layar cuma
            // menampilkan navy kosong melompong — terlihat seperti sistemnya
            // rusak, padahal cuma belum dikonfigurasi.
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-3">
              <Inbox className="w-16 h-16 text-slate-600" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-slate-400">Belum ada layanan aktif</p>
              <p className="text-slate-500">Silakan hubungi petugas.</p>
            </div>
          ) : (
          <>
          {/* CATATAN: `flex-1 min-h-0` pada kedua anak di bawah aman KARENA
              AnimatePresence ini `mode="wait"` — dijamin cuma satu anak yang
              ter-mount pada satu waktu. Kalau mode="wait" pernah dihapus (di
              file ini sudah ada preseden: AnimatePresence media/antrian di atas
              sengaja TANPA mode="wait"), dua anak akan sama-sama mengklaim
              flex-1 dan board terbelah dua saat transisi. */}
          <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            // key ikut nomor halaman: pergantian antar halaman grid ikut
            // ter-crossfade seperti pergantian grid↔split, bukan berganti isi
            // secara mendadak di tempat.
            <motion.div key={`grid-${gridPage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={SLIDE_TRANSITION}
              className="grid gap-6 flex-1 min-h-0"
              style={{
                // Math.max(…, 1): `repeat(0, 1fr)` itu CSS tak valid dan
                // dibuang diam-diam oleh browser (grid jatuh ke satu kolom
                // implisit) — terjadi tiap kali daftar antrian masih kosong.
                // Dihitung dari pagedQueues, bukan queues: halaman terakhir
                // bisa berisi kurang dari 4 dan kolomnya harus ikut menyesuaikan
                // supaya tidak menyisakan kolom kosong menganga.
                gridTemplateColumns: `repeat(${Math.max(pagedQueues.length, 1)}, 1fr)`,
              }}>
              {pagedQueues.map(queue => {
                const qEntries = entriesByQueue(queue.id);
                const servingNow = qEntries.filter(e => e.status === 'serving');
                const waiting = qEntries.filter(e => e.status === 'waiting').slice(0, 6);
                return (
                  // min-h-0 + overflow-hidden: 6 kartu antre + kartu dipanggil
                  // sudah berisiko melewati tinggi baris; begitu ada baris kedua
                  // tingginya separuh. Terpotong rapi itu kegagalan yang anggun,
                  // meluber ke balik strip marquee tidak.
                  <div key={queue.id} className="flex flex-col gap-3 min-h-0 overflow-hidden">
                    {/* Column header. text-xl (BUKAN text-lg) disengaja: 18px
                        bold ada tepat DI BAWAH ambang "teks besar" WCAG
                        (18.66px) sehingga butuh 4.5, sementara 20px bold ada di
                        atasnya sehingga cukup 3.0 — itu yang membuat #8B5CF6
                        (mentok 4.23, tak terbaca oleh tinta mana pun) ikut
                        lolos. readableInk saja tidak cukup untuk warna itu.
                        line-clamp-2: isinya tanpa `truncate`, nama layanan
                        panjang akan membungkus dan menumbuhkan header. */}
                    <div className="rounded-xl px-4 py-2 text-center font-black text-xl tracking-wider line-clamp-2"
                      style={{ backgroundColor: queue.color_code ?? brand, color: readableInk(queue.color_code ?? brand) }}>
                      {queue.service_code ?? queue.name.charAt(0)} — {queue.display_name ?? queue.name}
                    </div>

                    {/* Serving */}
                    {servingNow.map(e => (
                      // BUGFIX: dulu kartu ini TIDAK PERNAH terlihat di mode grid.
                      // Pembungkusnya `relative` tanpa tinggi, sementara KEDUA
                      // anaknya `absolute` (border konik + isi) — jadi tidak ada
                      // yang mengisi tinggi dan kartunya kolaps jadi 0px di dalam
                      // flex column. Nomor yang sedang dipanggil baru muncul saat
                      // board berganti ke mode split (yang isinya normal flow).
                      // Sekarang: isi kartu dikembalikan ke normal flow (`relative`,
                      // bukan `absolute`) supaya dialah yang menentukan tinggi, dan
                      // celah 4px untuk border didapat dari padding pembungkus.
                      <motion.div key={e.id} layout
                        className={`relative ${R_ELEMENT} overflow-hidden shadow-2xl p-[4px]`}
                        // Denyut & rotasi konik = dekoratif murni, dimatikan saat
                        // OS minta gerak dikurangi. Border tetap terlihat karena
                        // gradiennya statis, cuma berhenti berputar.
                        animate={reduceMotion ? undefined : { scale: [1, 1.02, 1] }}
                        transition={reduceMotion ? undefined : { duration: 2, repeat: Infinity }}>
                        {/* Magic conic border */}
                        <motion.div className="absolute inset-[-150%]"
                          animate={reduceMotion ? undefined : { rotate: 360 }}
                          transition={reduceMotion ? undefined : { duration: 3, repeat: Infinity, ease: 'linear' }}
                          style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${queue.color_code ?? brand} 90deg, transparent 180deg, ${queue.color_code ?? brand} 270deg, transparent 360deg)` }}
                        />
                        {/* rounded-lg DISENGAJA lebih kecil dari pembungkusnya
                            (rounded-xl): radius dalam harus dikurangi setebal
                            padding 4px supaya lengkungannya sejajar. */}
                        <div className="relative rounded-lg flex flex-col items-center justify-center py-6 text-center"
                          style={{ backgroundColor: BOARD_BG }}>
                          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">DIPANGGIL</p>
                          <p className="text-5xl font-black" style={{ color: queue.color_code ?? brand }}>{e.ticket_number}</p>
                          {e.service_window && <p className="text-xs text-slate-400 mt-2">Loket {e.service_window}</p>}
                        </div>
                      </motion.div>
                    ))}

                    {/* Waiting entries */}
                    {waiting.map((e, i) => (
                      <div key={e.id} className={`rounded-xl px-4 py-3 text-center font-bold ${i === 0 && servingNow.length === 0 ? 'text-white' : 'bg-slate-800 text-slate-300'}`}
                        style={i === 0 && servingNow.length === 0 ? { backgroundColor: `${queue.color_code ?? brand}40`, borderLeft: `3px solid ${queue.color_code ?? brand}` } : {}}>
                        {e.ticket_number}
                      </div>
                    ))}

                    {servingNow.length === 0 && waiting.length === 0 && (
                      // flex-1 + justify-center: kolom tanpa antrian dulu cuma
                      // menyisakan kotak kecil di atas dengan ruang kosong
                      // menganga di bawahnya — terbaca seperti layar yang gagal
                      // memuat. Sekarang kotaknya mengisi tinggi kolom dan
                      // isinya di tengah, jadi terlihat memang sedang kosong.
                      <div className={`${R_ELEMENT} bg-slate-800 border border-dashed border-slate-600 flex-1 min-h-0 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm`}>
                        <Hourglass className="w-6 h-6" strokeWidth={1.5} />
                        Menunggu antrian
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={SLIDE_TRANSITION}
              className="grid grid-cols-12 gap-8 flex-1 min-h-0">
              {/* Left: compact queue status. overflow-hidden — daftar ini tak
                  punya batas jumlah sama sekali (beda dari grid yang slice(0,6)). */}
              <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
                {queues.map(queue => {
                  const qEntries = entriesByQueue(queue.id);
                  const servingNow = qEntries.find(e => e.status === 'serving');
                  const waitingCount = qEntries.filter(e => e.status === 'waiting').length;
                  return (
                    <div key={queue.id} className={`${R_SURFACE} bg-slate-800 border border-slate-700 p-4 flex items-center gap-4`}>
                      {/* readableInk — sama seperti badge di fase media. */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                        style={{ backgroundColor: queue.color_code ?? brand, color: readableInk(queue.color_code ?? brand) }}>
                        {queue.service_code ?? queue.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 truncate">{queue.display_name ?? queue.name}</p>
                        <p className="font-black text-2xl">{servingNow ? servingNow.ticket_number : '---'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-300">{waitingCount}</p>
                        <p className="text-xs text-slate-500">menunggu</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: currently serving big display */}
              <div className="col-span-8 flex flex-col gap-4">
                <div className={`flex-grow ${R_SURFACE} bg-slate-800 border border-slate-700 flex flex-col items-center justify-center p-8 text-center`}>
                  {serving.length > 0 ? (
                    <>
                      <p className="text-sm text-slate-400 uppercase tracking-widest mb-3">SEDANG DIPANGGIL</p>
                      {serving.map(e => {
                        const q = queues.find(q => q.id === e.queue_id);
                        return (
                          <div key={e.id} className="mb-4">
                            <p className="text-9xl font-black" style={{ color: q?.color_code ?? brand }}>{e.ticket_number}</p>
                            <p className="text-xl text-slate-300 mt-2">{q?.display_name ?? q?.name}</p>
                            {e.service_window && <p className="text-slate-500 text-sm mt-1">Loket {e.service_window}</p>}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    // Dulu emoji 📢 — satu-satunya emoji di seluruh board, dan
                    // ia jadi elemen terbesar di panel utama saat idle. Ikon
                    // lucide dipakai supaya seragam dengan ikon lain di file ini
                    // (Wrench/AlertTriangle/Info) dan bisa ikut warna & ketebalan
                    // garis yang konsisten.
                    <div className="flex flex-col items-center gap-4">
                      <Megaphone className="w-20 h-20 text-slate-600" strokeWidth={1.5} />
                      <p className="text-slate-400 text-2xl font-semibold">Belum ada panggilan</p>
                      <p className="text-slate-500">Nomor akan tampil di sini saat dipanggil.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Sponsor di fase antrian — HANYA saat instansi tak punya media.
              Cacat yang diperbaiki bukan "sponsor tak tampil di fase antrian",
              melainkan "instansi yang punya sponsor tapi tak punya video/foto
              TAK PERNAH melihatnya sama sekali" (strip aslinya cuma dirender di
              cabang showMedia). Sengaja TIDAK dirotasi masuk-keluar: strip yang
              muncul-hilang tiap N detik me-reflow seluruh board 24/7, lebih
              buruk daripada bug-nya. `hasMedia` cuma berubah saat admin
              mengedit config, jadi tata letak tetap stabil — nol risiko regresi
              bagi instansi yang rotasi medianya sudah jalan. */}
          {sponsors.length > 0 && !hasMedia && sponsorStrip}
          </>
          )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Running text (split view, fase antrian) */}
      <AnimatePresence>
        {/* Inversi sama dengan strip in-flow di fase media — lihat komentar di
            sana. transition sebelumnya TIDAK diisi sama sekali, sehingga `y`
            jatuh ke spring default framer: satu-satunya elemen di board ini
            yang memantul. */}
        {viewMode === 'split' && !showMedia && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            transition={SLIDE_TRANSITION}
            className="fixed bottom-0 left-0 w-full h-14 bg-white flex items-center overflow-hidden z-50">
            <div className="w-full h-[3px] bg-red-600 absolute top-0" />
            {marquee}
            <div className="w-full h-[3px] bg-red-600 absolute bottom-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* View mode indicator — dulu selalu "Live" hardcoded, ngeklaim
          tersambung walau WS putus total & data sudah basi. Sekarang jujur:
          abu-abu (bukan merah) saat fallback polling, karena polling itu
          fitur yang memang jalan normal, bukan kerusakan. */}
      {/* z-40 + posisi bawah dinamis: dulu indikator ini `fixed bottom-4` TANPA
          z-index sama sekali, sementara strip marquee `z-50` — jadi indikator
          tertutup strip di split view, dan menutupi tepi kanan strip in-flow di
          fase media. Dua elemen fixed ini jelas ditulis tanpa saling tahu. */}
      <div
        className={`fixed right-4 z-40 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 ${
          viewMode === 'split' || showMedia ? 'bottom-[4.75rem]' : 'bottom-4'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
        <span className="text-xs text-slate-400">
          {wsConnected ? 'Live' : 'Polling'} · {viewMode === 'grid' ? 'Grid' : 'Split'}
        </span>
      </div>
    </div>
  );
}
