'use client';

import { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Zap, Info } from 'lucide-react';
import { useAnnouncements } from '@/hooks/use-tenant-data';
import type { Announcement } from '@/lib/api/types';

interface AnnouncementBellProps {
  tenantId: string;
  brandColor?: string;
}

const TYPE_ICON: Record<Announcement['announcement_type'], React.ReactNode> = {
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  maintenance: <Zap className="w-4 h-4 text-red-500" />,
  update: <Info className="w-4 h-4 text-blue-500" />,
  info: <AlertCircle className="w-4 h-4 text-slate-400" />,
};

export function AnnouncementBell({ tenantId, brandColor = '#1e40af' }: AnnouncementBellProps) {
  const { announcements, loading } = useAnnouncements(tenantId);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        aria-label="Pengumuman"
      >
        <Bell className="w-4 h-4" />
        {announcements.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {announcements.length > 9 ? '9+' : announcements.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Click-outside overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Pengumuman</p>
              <p className="text-xs text-slate-400">Info dari administrator sistem</p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <p className="text-center py-8 text-sm text-slate-400">Memuat...</p>
              ) : announcements.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Belum ada pengumuman</p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0">{TYPE_ICON[a.announcement_type]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.description}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(a.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
