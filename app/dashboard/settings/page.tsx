'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bell, Lock, Users, Database, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = (section: string) => {
    toast({
      title: 'Pengaturan disimpan',
      description: `Pengaturan ${section} berhasil diperbarui.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-slate-400 text-sm mt-1">Kelola konfigurasi dan preferensi sistem</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { value: 'general', label: 'Umum', icon: <Shield className="h-3.5 w-3.5" /> },
            { value: 'security', label: 'Keamanan', icon: <Lock className="h-3.5 w-3.5" /> },
            { value: 'notifications', label: 'Notifikasi', icon: <Bell className="h-3.5 w-3.5" /> },
            { value: 'users', label: 'Pengguna', icon: <Users className="h-3.5 w-3.5" /> },
            { value: 'database', label: 'Database', icon: <Database className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Umum */}
        <TabsContent value="general" className="mt-5">
          <Card className="border border-slate-200 bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">Konfigurasi Sistem</CardTitle>
              <CardDescription className="text-xs text-slate-400">Atur pengaturan dasar sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="system-name" className="text-sm font-medium text-slate-700">Nama Sistem</Label>
                <Input id="system-name" defaultValue="Queue Management System" className="border-slate-200 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="system-url" className="text-sm font-medium text-slate-700">URL Sistem</Label>
                <Input id="system-url" defaultValue="https://queuemgmt.local" className="border-slate-200 text-sm" />
              </div>
              <div className="flex items-center justify-between py-3 border-t border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Mode Maintenance</p>
                  <p className="text-xs text-slate-400 mt-0.5">Nonaktifkan akses untuk semua tenant sementara</p>
                </div>
                <Switch id="maintenance-mode" defaultChecked={false} />
              </div>
              <Button onClick={() => handleSave('Umum')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg">
                Simpan Perubahan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keamanan */}
        <TabsContent value="security" className="mt-5">
          <Card className="border border-slate-200 bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">Pengaturan Keamanan</CardTitle>
              <CardDescription className="text-xs text-slate-400">Kelola kontrol akses dan keamanan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-400 mt-0.5">Wajibkan 2FA untuk akun admin</p>
                </div>
                <Switch id="2fa" defaultChecked={true} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Paksa SSL/TLS</p>
                  <p className="text-xs text-slate-400 mt-0.5">Wajibkan HTTPS untuk semua koneksi</p>
                </div>
                <Switch id="ssl" defaultChecked={true} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="session-timeout" className="text-sm font-medium text-slate-700">Session Timeout (menit)</Label>
                <Input id="session-timeout" type="number" defaultValue="30" className="border-slate-200 text-sm max-w-xs" />
              </div>
              <Button onClick={() => handleSave('Keamanan')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg">
                Simpan Perubahan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifikasi */}
        <TabsContent value="notifications" className="mt-5">
          <Card className="border border-slate-200 bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">Preferensi Notifikasi</CardTitle>
              <CardDescription className="text-xs text-slate-400">Konfigurasi notifikasi sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { id: 'onboard-alerts', label: 'Notifikasi Onboarding Tenant', desc: 'Notif saat ada tenant baru ditambahkan', defaultChecked: true },
                { id: 'health-alerts', label: 'Peringatan Kesehatan Sistem', desc: 'Notif bila ada masalah pada sistem', defaultChecked: true },
                { id: 'daily-reports', label: 'Laporan Harian', desc: 'Terima ringkasan sistem setiap hari', defaultChecked: false },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <Switch id={item.id} defaultChecked={item.defaultChecked} />
                </div>
              ))}
              <div className="pt-4">
                <Button onClick={() => handleSave('Notifikasi')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-lg">
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pengguna */}
        <TabsContent value="users" className="mt-5">
          <Card className="border border-slate-200 bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">Admin Pengguna</CardTitle>
              <CardDescription className="text-xs text-slate-400">Kelola akun admin dan izin akses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Fitur manajemen pengguna akan segera hadir. Kamu bisa menambah, menghapus, dan mengelola akun admin dari sini.
              </p>
              <Button disabled className="bg-slate-900 text-white text-sm rounded-lg opacity-40 cursor-not-allowed">
                Kelola Pengguna
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database */}
        <TabsContent value="database" className="mt-5">
          <Card className="border border-slate-200 bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-800">Konfigurasi Database</CardTitle>
              <CardDescription className="text-xs text-slate-400">Kelola pengaturan dan backup database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2">Status Database</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-600">Terhubung dan Berjalan Normal</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="text-sm border-slate-200 rounded-lg">
                  Jalankan Backup
                </Button>
                <Button variant="outline" className="text-sm border-slate-200 rounded-lg">
                  Optimasi Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
