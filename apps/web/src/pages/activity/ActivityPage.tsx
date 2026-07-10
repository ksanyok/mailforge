import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { activityApi } from '@/api/index';
import { formatDateTime } from '@/utils/format';

interface Activity { id: string; action: string; resourceType: string; resourceId?: string; ipAddress?: string; user: { name: string; email: string }; createdAt: string; }

export function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['activity', page], queryFn: () => activityApi.findAll({ page, limit: 30 }) });
  const result = data as { data: Activity[]; total: number } | undefined;

  const columns: ColumnDef<Activity>[] = [
    { accessorKey: 'user.name', header: 'Пользователь', cell: ({ row }) => <div><p className="font-medium text-sm">{row.original.user?.name}</p><p className="text-xs text-muted-foreground">{row.original.user?.email}</p></div> },
    { accessorKey: 'action', header: 'Действие', cell: ({ getValue }) => <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{getValue() as string}</span> },
    { accessorKey: 'resourceType', header: 'Ресурс' },
    { accessorKey: 'ipAddress', header: 'IP', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'createdAt', header: 'Время', cell: ({ getValue }) => formatDateTime(getValue() as string) },
  ];

  return (
    <DataTable data={result?.data ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={30} onPageChange={setPage} isLoading={isLoading} />
  );
}
