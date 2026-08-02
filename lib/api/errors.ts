import { ApiError } from './client';

// Backend NestJS mengirim pesan default framework yang bocor apa adanya ke
// user: 401 → "Unauthorized", 403 → "Forbidden resource". Itu jargon yang
// tidak menjelaskan apapun ke petugas loket. Helper ini menerjemahkannya ke
// bahasa yang bisa ditindaklanjuti; pesan spesifik dari server (mis. validasi
// 400 "Subdomain sudah dipakai") tetap dipakai apa adanya karena lebih
// informatif daripada teks generik.
export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.error === 'MUST_CHANGE_PASSWORD') {
      return 'Anda harus mengganti password terlebih dahulu sebelum melanjutkan.';
    }
    if (err.error === 'INVALID_RESET_TOKEN') {
      return 'Link reset tidak valid atau sudah kedaluwarsa. Silakan minta link baru.';
    }

    switch (err.statusCode) {
      case 400:
        return err.message || 'Data yang dikirim tidak valid.';
      case 401:
        // 401 TANPA pesan kustom = default framework NestJS/passport-jwt saat
        // token invalid/expired/hilang ("Unauthorized" generik) — itu beneran
        // sesi mati, biasanya sudah ditangani handleSessionExpired() sebelum
        // sampai sini. 401 DENGAN pesan kustom (mis. UnauthorizedException
        // eksplisit dari login: "Email atau password salah", atau ganti
        // password: "Password lama salah") BUKAN soal sesi — itu pesan yang
        // sudah ditulis backend buat manusia, tampilkan apa adanya, sama
        // prinsipnya kayak 400/409 di atas.
        if (!err.message || err.message === 'Unauthorized') {
          return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
        }
        return err.message;
      case 403:
        return 'Akun Anda tidak punya izin untuk melakukan aksi ini.';
      case 404:
        return 'Data tidak ditemukan — mungkin sudah dihapus orang lain.';
      case 409:
        return err.message || 'Data bentrok dengan yang sudah ada.';
      case 413:
        return 'Berkas terlalu besar untuk diunggah.';
      case 429:
        return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
      default:
        if (err.statusCode >= 500) {
          return 'Server sedang bermasalah. Coba lagi beberapa saat lagi.';
        }
        return err.message || 'Terjadi kesalahan.';
    }
  }

  // fetch() melempar TypeError kalau server mati / CORS / kabel putus —
  // bukan ApiError karena tidak pernah ada respons HTTP.
  if (err instanceof TypeError) {
    return 'Tidak bisa terhubung ke server. Periksa koneksi Anda.';
  }

  return err instanceof Error ? err.message : 'Terjadi kesalahan.';
}
