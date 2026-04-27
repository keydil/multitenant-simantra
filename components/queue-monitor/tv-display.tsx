'use client';

import { Card } from '@/components/ui/card';
import type { QueueEntry, Queue, Announcement } from '@/lib/supabase/types';
import { AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react';

interface TVDisplayProps {
  entries: QueueEntry[];
  queue: Queue | null;
  announcements?: Announcement[];
  loading?: boolean;
}

const getAnnouncementIcon = (type: string) => {
  switch (type) {
    case 'warning':     return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case 'maintenance': return <Zap className="w-3.5 h-3.5 text-red-500" />;
    case 'update':      return <Info className="w-3.5 h-3.5 text-blue-500" />;
    default:            return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const getAnnouncementStyle = (type: string) => {
  switch (type) {
    case 'warning':     return 'bg-amber-50 border border-amber-200';
    case 'maintenance': return 'bg-red-50 border border-red-200';
    case 'update':      return 'bg-blue-50 border border-blue-200';
    default:            return 'bg-slate-50 border border-slate-200';
  }
};

const getAnnouncementTextColor = (type: string) => {
  switch (type) {
    case 'warning':     return 'text-amber-800';
    case 'maintenance': return 'text-red-800';
    case 'update':      return 'text-blue-800';
    default:            return 'text-slate-700';
  }
};

export function TVDisplay({
  entries,
  queue,
  announcements = [],
  loading = false,
}: TVDisplayProps) {
  const servingEntry = entries.find((e) => e.status === 'serving');
  const waitingEntries = entries.filter((e) => e.status === 'waiting').slice(0, 8);

  if (loading) {
    return (
      <Card className="flex flex-col items-center justify-center h-full bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-sm text-slate-400">Memuat...</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{queue?.display_name || queue?.name || 'Monitor Antrian'}</h2>
          {queue?.service_code && (
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
              {queue.service_code}
            </span>
          )}
        </div>
        {queue?.description && (
          <p className="text-xs text-slate-400 mt-1">{queue.description}</p>
        )}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white border-b border-slate-100 px-6 py-3 space-y-2">
          {announcements.slice(0, 2).map((announcement) => (
            <div
              key={announcement.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${getAnnouncementStyle(announcement.announcement_type)}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {getAnnouncementIcon(announcement.announcement_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${getAnnouncementTextColor(announcement.announcement_type)}`}>
                  {announcement.title}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{announcement.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Currently Serving */}
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Sedang Dilayani
        </p>
        {servingEntry ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-5xl font-bold tabular-nums"
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {servingEntry.ticket_number}
                </p>
                <p className="text-sm text-slate-600 mt-1">{servingEntry.customer_name || 'Pelanggan'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Estimasi</p>
                <p className="text-lg font-bold text-slate-800">{queue?.estimated_service_time_minutes || '10'} mnt</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400">Tidak ada yang sedang dilayani</p>
          </div>
        )}
      </div>

      {/* Waiting List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Menunggu ({waitingEntries.length})
        </p>
        <div className="space-y-1.5">
          {waitingEntries.length > 0 ? (
            waitingEntries.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{entry.ticket_number}</p>
                    <p className="text-xs text-slate-400">{entry.customer_name || 'Menunggu...'}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {entry.entered_at
                    ? new Date(entry.entered_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : 'Baru masuk'}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">Antrian kosong</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Total menunggu: <span className="font-semibold text-blue-600">{waitingEntries.length}</span>
        </p>
        <p className="text-xs text-slate-400">{new Date().toLocaleTimeString('id-ID')}</p>
      </div>
    </Card>
  );
}
