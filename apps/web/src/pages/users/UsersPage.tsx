import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { usersApi } from '@/api/index';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt?: string; createdAt: string; }

export function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['users', page], queryFn: () => usersApi.findAll({ page, limit: 20 }) });
  const result = data as { items: User[]; total: number } | undefined;

  const toggle = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'User updated' }); },
  });

  const columns: ColumnDef<User>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => <span className="text-xs font-medium">{getValue() as string}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getValue() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
          {getValue() ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { accessorKey: 'lastLoginAt', header: 'Last Login', cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : 'Never' },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => toggle.mutate(row.original.id)}>
          {row.original.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return <DataTable data={result?.items ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />;
}
