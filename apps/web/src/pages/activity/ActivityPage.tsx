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
    { accessorKey: 'user.name', header: 'Пользователь', cell: ({ row }) => <div><p className="font-medium text-sm">{row.original.user?.name}</p><p className="text-xs text-ink-3">{row.original.user?.email}</p></div> },
    { accessorKey: 'action', header: 'Действие', cell: ({ getValue }) => <span className="font-mono text-xs bg-surface-3 text-ink-2 px-1.5 py-0.5 rounded">{getValue() as string}</span> },
    { accessorKey: 'resourceType', header: 'Ресурс', cell: ({ getValue }) => <span className="text-ink-2">{getValue() as string}</span> },
    { accessorKey: 'ipAddress', header: 'IP', cell: ({ getValue }) => <span className="font-mono text-xs text-ink-3">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'createdAt', header: 'Время', cell: ({ getValue }) => <span className="text-ink-3">{formatDateTime(getValue() as string)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Журнал активности</h1>
        <p className="text-[13px] text-ink-3 mt-1">История действий пользователей в системе</p>
      </div>
      <DataTable data={result?.data ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={30} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
