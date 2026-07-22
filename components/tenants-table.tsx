'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MoreHorizontal, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Tenant } from '@/lib/api/types';

export type { Tenant };

interface TenantsTableProps {
  tenants: Tenant[];
  onEdit?: (tenant: Tenant) => void;
  onDelete?: (tenant: Tenant) => void;
  /**
   * E1: tanpa ini "Nonaktifkan" jadi pintu satu arah — instansi nonaktif
   * hilang dari dashboard dan hanya bisa dipulihkan lewat query DB manual.
   */
  onReactivate?: (tenant: Tenant) => void;
  /**
   * E8: hapus permanen. Hanya ditawarkan untuk baris nonaktif (interlock
   * dua langkah). Membuka modal konfirmasi sendiri di parent.
   */
  onRequestPurge?: (tenant: Tenant) => void;
}

export function TenantsTable({
  tenants,
  onEdit,
  onDelete,
  onReactivate,
  onRequestPurge,
}: TenantsTableProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Daftar Instansi</CardTitle>
        <CardDescription>Kelola semua instansi yang terdaftar di sistem</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Nama Instansi</TableHead>
                <TableHead className="text-foreground font-semibold">Subdomain</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Dibuat</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada instansi terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className={`border-border hover:bg-muted/50 transition-colors duration-200 ${
                      // Baris nonaktif diredupkan supaya sekali lihat ketahuan
                      // mana yang tidak lagi melayani — badge saja mudah terlewat
                      // di tabel yang panjang.
                      tenant.is_active ? '' : 'opacity-55'
                    }`}
                  >
                    <TableCell className="font-medium text-foreground">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {tenant.subdomain}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          tenant.is_active
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-0 font-medium'
                            : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-0 font-medium'
                        }
                        variant="secondary"
                      >
                        {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(tenant.created_at).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Buka menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => onEdit?.(tenant)}
                            className="cursor-pointer flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          {tenant.is_active ? (
                            <DropdownMenuItem
                              onClick={() => onDelete?.(tenant)}
                              className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Nonaktifkan</span>
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() => onReactivate?.(tenant)}
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span>Aktifkan kembali</span>
                              </DropdownMenuItem>
                              {/* Hapus permanen hanya untuk yang sudah nonaktif.
                                  Dipisah garis supaya tidak bersebelahan langsung
                                  dengan aksi non-destruktif. */}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onRequestPurge?.(tenant)}
                                className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Hapus permanen</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
