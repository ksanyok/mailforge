import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, XCircle, Trash2 } from 'lucide-react';
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  SCHEDULED: 'Запланирована',
  SENDING: 'Отправляется',
  SENT: 'Отправлена',
  PAUSED: 'Приостановлена',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
  FAILED: 'Ошибка',
  QUEUED: 'В очереди',
};

export function CampaignsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['campaigns', page], queryFn: () => campaignsApi.findAll({ page, limit: 20 }) });
  const result = data as { data: Campaign[]; total: number } | undefined;

  const dispatch = useMutation({
    mutationFn: (id: string) => campaignsApi.dispatch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast({ title: 'Кампания запущена' }); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Не удалось запустить';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const pause = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => campaignsApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast({ title: 'Кампания отменена' }); },
    onError: () => toast({ title: 'Не удалось отменить', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast({ title: 'Кампания удалена' }); },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось удалить', variant: 'destructive' }),
  });

  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: 'name',
      header: 'Кампания',
      cell: ({ row }) => (
        <div>
          <button onClick={() => navigate(`/campaigns/${row.original.id}`)} className="text-primary hover:underline font-medium">{row.original.name}</button>
          <p className="text-xs text-muted-foreground">{row.original.subject}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ getValue }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[getValue() as string] ?? 'bg-gray-100')}>{STATUS_LABELS[getValue() as string] ?? (getValue() as string)}</span>,
    },
    {
      id: 'stats',
      header: 'Статистика',
      cell: ({ row }) => {
        const c = row.original as Campaign & { uniqueOpenCount?: number; uniqueClickCount?: number };
        const responded = (c.uniqueOpenCount ?? 0) + (c.uniqueClickCount ?? 0);
        const notResponded = c.sentCount > 0 ? c.sentCount - (c.uniqueOpenCount ?? 0) : 0;
        return (
          <div className="text-xs space-y-0.5">
            <p className="text-muted-foreground">отправлено {c.sentCount}/{c.totalRecipients}</p>
            {c.sentCount > 0 && (
              <>
                <p className="text-green-700 font-medium">
                  ✓ {c.uniqueOpenCount ?? 0} открыли
                  <span className="text-muted-foreground font-normal ml-1">
                    ({formatPercent(c.uniqueOpenCount ?? 0, c.sentCount)})
                  </span>
                </p>
                {notResponded > 0 && (
                  <p className="text-gray-500">{notResponded} не открыли</p>
                )}
              </>
            )}
          </div>
        );
      },
    },
    { accessorKey: 'createdAt', header: 'Создана', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { id, status } = row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            {status === 'DRAFT' && (
              <Button size="sm" variant="outline" onClick={() => dispatch.mutate(id)} title="Запустить">
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            {status === 'SENDING' && (
              <Button size="sm" variant="outline" onClick={() => pause.mutate(id)} title="Приостановить">
                <Pause className="h-3.5 w-3.5" />
              </Button>
            )}
            {['SENDING', 'PAUSED'].includes(status) && (
              <Button
                size="sm" variant="outline"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                title="Отменить кампанию"
                onClick={() => { if (confirm('Отменить эту кампанию? Это действие необратимо.')) cancel.mutate(id); }}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {['DRAFT', 'CANCELLED', 'SENT'].includes(status) && (
              <Button
                size="sm" variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                title="Удалить кампанию"
                onClick={() => { if (confirm(`Удалить «${row.original.name}»?`)) remove.mutate(id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate(`/campaigns/${id}/edit`)}>Изменить</Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/campaigns/new')}><Plus className="h-4 w-4 mr-2" />Новая кампания</Button>
      </div>
      <DataTable data={result?.data ?? []} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
