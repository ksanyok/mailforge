import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, XCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { campaignsApi } from '@/api/index';
import { formatDate, formatPercent, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

interface Campaign {
  id: string; name: string; subject: string; status: string;
  sentCount: number; totalRecipients: number; openCount: number; clickCount: number;
  scheduledAt?: string; createdAt: string;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['campaigns', page], queryFn: () => campaignsApi.findAll({ page, limit: 20 }) });
  const result = data as { data: Campaign[]; total: number } | undefined;

  const dispatch = useMutation({
    mutationFn: (id: string) => campaignsApi.dispatch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast({ title: 'Campaign dispatched' }); },
    onError: () => toast({ title: 'Dispatch failed', variant: 'destructive' }),
  });

  const pause = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: 'name',
      header: 'Campaign',
      cell: ({ row }) => (
        <div>
          <button onClick={() => navigate(`/campaigns/${row.original.id}`)} className="text-primary hover:underline font-medium">{row.original.name}</button>
          <p className="text-xs text-muted-foreground">{row.original.subject}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[getValue() as string] ?? 'bg-gray-100')}>{getValue() as string}</span>,
    },
    {
      id: 'stats',
      header: 'Stats',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-xs space-y-0.5">
            <p>{c.sentCount}/{c.totalRecipients} sent</p>
            <p>Open: {formatPercent(c.openCount, c.sentCount)}</p>
            <p>Click: {formatPercent(c.clickCount, c.sentCount)}</p>
          </div>
        );
      },
    },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { id, status } = row.original;
        return (
          <div className="flex gap-1">
            {status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => dispatch.mutate(id)}><Play className="h-3.5 w-3.5" /></Button>}
            {status === 'SENDING' && <Button size="sm" variant="outline" onClick={() => pause.mutate(id)}><Pause className="h-3.5 w-3.5" /></Button>}
            <Button size="sm" variant="outline" onClick={() => navigate(`/campaigns/${id}/edit`)}>Edit</Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/campaigns/new')}><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
      </div>
      <DataTable data={result?.data ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
