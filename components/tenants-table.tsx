'use client';

import { useState } from 'react';
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

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

interface TenantsTableProps {
  tenants?: Tenant[];
  onEdit?: (tenant: Tenant) => void;
  onDelete?: (tenant: Tenant) => void;
}

const defaultTenants: Tenant[] = [
  {
    id: '1',
    name: 'Dinas Kesehatan',
    subdomain: 'dinkes.queuemgmt.local',
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Kantor Desa Maju',
    subdomain: 'desamaju.queuemgmt.local',
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Puskesmas Sentosa',
    subdomain: 'puskesmas-sentosa.queuemgmt.local',
    status: 'active',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Rumah Sakit Umum',
    subdomain: 'rsu-umum.queuemgmt.local',
    status: 'active',
    createdAt: '2024-03-25',
  },
  {
    id: '5',
    name: 'Kantor Imigrasi',
    subdomain: 'imigrasi.queuemgmt.local',
    status: 'inactive',
    createdAt: '2024-01-10',
  },
  {
    id: '6',
    name: 'Badan Pajak Daerah',
    subdomain: 'pajak.queuemgmt.local',
    status: 'active',
    createdAt: '2024-04-05',
  },
];

const statusColors = {
  active: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
  inactive: { bg: 'bg-gray-100 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-400' },
  suspended: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
};

export function TenantsTable({
  tenants = defaultTenants,
  onEdit,
  onDelete,
}: TenantsTableProps) {
  const [localTenants, setLocalTenants] = useState(tenants);

  const handleDelete = (tenant: Tenant) => {
    setLocalTenants(localTenants.filter((t) => t.id !== tenant.id));
    onDelete?.(tenant);
  };

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
              {localTenants.map((tenant) => (
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
                      className={`${statusColors[tenant.status].bg} ${statusColors[tenant.status].text} border-0 font-medium capitalize`}
                      variant="secondary"
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tenant.createdAt}</TableCell>
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
                          onClick={() => handleDelete(tenant)}
                          className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
