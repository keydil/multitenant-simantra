'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTenant } from '@/hooks/use-tenant';
import { publicQueries } from '@/lib/api/queries';
import { ApiError } from '@/lib/api/client';
import type { Queue } from '@/lib/types/queue';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ServiceCard from './service-card';

export default function ServiceList() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const router = useRouter();

  const { tenant, loading: tenantLoading } = useTenant(tenantSlug);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queuesLoading, setQueuesLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchQueues = useCallback(async () => {
    if (!tenant) return;
    try {
      setQueues((await publicQueries.getQueues(tenantSlug)) as Queue[]);
    } catch {
      // biarkan kosong — UI menampilkan "Belum ada layanan aktif"
    } finally {
      setQueuesLoading(false);
    }
  }, [tenant, tenantSlug]);

  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  const handleServiceSelect = async (queue: Queue) => {
    if (!tenant || isGenerating) return;
    setIsGenerating(true);
    try {
      // Nomor tiket dihitung server (anti-race)
      const entry = await publicQueries.createEntry(tenantSlug, queue.id);
      router.push(`/${tenantSlug}/queue/ticket/${entry.id}`);
    } catch (e) {
      // Rate limit ambil tiket 5/menit/IP — jangan retry-loop
      alert(
        e instanceof ApiError && e.statusCode === 429
          ? 'Terlalu banyak pengambilan tiket. Mohon tunggu sebentar lalu coba lagi.'
          : 'Gagal membuat tiket. Coba lagi.'
      );
      setIsGenerating(false);
    }
  };

  const brand = tenant?.brand_color ?? '#1e40af';

  if (tenantLoading || queuesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/${tenantSlug}`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          {tenant?.logo_url && <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-auto object-contain" />}
          <div>
            <h1 className="text-xl font-bold" style={{ color: brand }}>PILIH LAYANAN</h1>
            <p className="text-sm text-slate-500">Sistem Antrian Digital SIMANTRA</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Pilih Jenis Layanan</h2>
          <p className="text-slate-500">Silakan pilih layanan yang Anda butuhkan</p>
        </div>

        {queues.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-5xl mb-4">🎫</p>
            <p className="font-medium">Belum ada layanan aktif</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {queues.map((queue, i) => (
              <motion.div
                key={queue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <ServiceCard
                  queue={queue}
                  brand={brand}
                  isGenerating={isGenerating}
                  onSelect={() => handleServiceSelect(queue)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Loading overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <Loader2 className="animate-spin mx-auto mb-4" style={{ color: brand }} size={40} />
            <p className="text-lg font-semibold text-slate-700">Mencetak Tiket Antrian...</p>
          </div>
        </div>
      )}
    </div>
  );
}
