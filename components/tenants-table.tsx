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
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Tenant } from '@/lib/api/types';

export type { Tenant };

interface TenantsTableProps {
  tenants: Tenant[];
  onEdit?: (tenant: Tenant) => void;
  onDelete?: (tenant: Tenant) => void;
}

export function TenantsTable({ tenants, onEdit, onDelete }: TenantsTableProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Tenants Management</CardTitle>
        <CardDescription>Manage your agencies and organizations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Tenant Name</TableHead>
                <TableHead className="text-foreground font-semibold">Subdomain/URL</TableHead>
                <TableHead className="text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Created</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada tenant terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className="border-border hover:bg-muted/50 transition-colors duration-200"
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
                        {tenant.is_active ? 'Active' : 'Inactive'}
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
                            <span className="sr-only">Open menu</span>
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
                          <DropdownMenuItem
                            onClick={() => onDelete?.(tenant)}
                            className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
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
