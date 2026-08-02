import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Warna aktif — brand tenant kalau ada, default abu netral. */
  brandColor?: string;
}

/** Selalu tampilkan halaman 1, halaman terakhir, dan halaman aktif ± 1 —
 *  gap di antaranya diringkas jadi "..." (bukan render ratusan nomor). */
function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const keep = new Set<number>([1, total]);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) keep.add(p);
  }
  const sorted = Array.from(keep).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

/** Pagination bernomor (1 2 3 ... N) — dipakai Rekap Antrean & Buku Tamu,
 *  mengikuti gaya tombol yang sudah dipakai kedua halaman itu (bukan
 *  primitive shadcn components/ui/pagination.tsx yang berbasis <a>/Button
 *  variant, belum pernah diadopsi di mana pun). Merender null kalau
 *  totalPages <= 1 supaya caller tidak perlu cek berulang. */
export function PaginationControls({ page, totalPages, onPageChange, brandColor }: PaginationControlsProps) {
  if (totalPages <= 1) return null;
  const activeStyle = brandColor ? { background: brandColor, borderColor: brandColor } : undefined;

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={16} />
      </button>
      {pageNumbers(page, totalPages).map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={p === page ? activeStyle : undefined}
            className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${p === page ? 'text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="p-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
