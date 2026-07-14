import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, XCircle, Trash2, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { campaignsApi } from '@/api/index';
import { formatDate, formatPercent, formatNumber } from '@/utils/format';
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

// Soft-цветные бейджи статусов под смысл
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  DRAFT:     { bg: 'var(--surface-3)',   fg: 'var(--text-2)' },
  QUEUED:    { bg: 'var(--surface-3)',   fg: 'var(--text-2)' },
  SCHEDULED: { bg: 'var(--info-soft)',    fg: 'var(--info)' },
  SENDING:   { bg: 'var(--info-soft)',    fg: 'var(--info)' },
  SENT:      { bg: 'var(--success-soft)', fg: 'var(--success)' },
  COMPLETED: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  PAUSED:    { bg: 'var(--warn-soft)',    fg: 'var(--warn)' },
  CANCELLED: { bg: 'var(--danger-soft)',  fg: 'var(--danger)' },
  FAILED:    { bg: 'var(--danger-soft)',  fg: 'var(--danger)' },
};

function StatusBadge({ status }: { status: string }) {
  const st = STATUS_STYLE[status] ?? { bg: 'var(--surface-3)', fg: 'var(--text-2)' };
  const running = status === 'SENDING';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded"
      style={{ background: st.bg, color: st.fg }}
    >
      {running && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: st.fg }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: st.fg }} />
        </span>
      )}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

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
        <div className="min-w-0">
          <button
            onClick={() => navigate(`/campaigns/${row.original.id}`)}
            className="text-[13px] font-semibold text-ink hover:text-brand transition-colors truncate block max-w-[280px] text-left"
          >
            {row.original.name}
          </button>
          <p className="text-[11px] text-ink-3 truncate max-w-[280px]">{row.original.subject}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      id: 'stats',
      header: 'Статистика',
      cell: ({ row }) => {
        const c = row.original as Campaign & { uniqueOpenCount?: number; uniqueClickCount?: number };
        const notResponded = c.sentCount > 0 ? c.sentCount - (c.uniqueOpenCount ?? 0) : 0;
        return (
          <div className="text-[11px] space-y-0.5">
            <p className="text-ink-3">
              Отправлено <span className="font-mono text-ink-2">{c.sentCount}</span>
              <span className="text-ink-3"> / {c.totalRecipients}</span>
            </p>
            {c.sentCount > 0 && (
              <>
                <p className="font-medium" style={{ color: 'var(--success)' }}>
                  <span className="font-mono">{c.uniqueOpenCount ?? 0}</span> открыли
                  <span className="text-ink-3 font-normal ml-1 font-mono">
                    ({formatPercent(c.uniqueOpenCount ?? 0, c.sentCount)})
                  </span>
                </p>
                {notResponded > 0 && (
                  <p className="text-ink-3"><span className="font-mono">{notResponded}</span> не открыли</p>
                )}
              </>
            )}
          </div>
        );
      },
    },
    { accessorKey: 'createdAt', header: 'Создана', cell: ({ getValue }) => <span className="text-[12px] text-ink-3 font-mono">{formatDate(getValue() as string)}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const { id, status } = row.original;
        return (
          <div className="flex gap-1 flex-wrap justify-end">
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
                className="text-warn border-warn/40 hover:bg-warn-soft"
                title="Отменить кампанию"
                onClick={() => { if (confirm('Отменить эту кампанию? Это действие необратимо.')) cancel.mutate(id); }}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {['DRAFT', 'CANCELLED', 'SENT'].includes(status) && (
              <Button
                size="sm" variant="outline"
                className="text-danger border-danger/40 hover:bg-danger-soft"
                title="Удалить кампанию"
                onClick={() => { if (confirm(`Удалить «${row.original.name}»?`)) remove.mutate(id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate(`/campaigns/${id}/edit`)} title="Изменить">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  const campaigns = result?.data ?? [];
  const totalSent = campaigns.reduce((a, c) => a + (c.sentCount || 0), 0);
  const sentCampaigns = campaigns.filter((c) => c.sentCount > 0);
  const avgOpen = sentCampaigns.length
    ? sentCampaigns.reduce((a, c) => a + (c.openCount || 0) / Math.max(1, c.sentCount), 0) / sentCampaigns.length * 100
    : 0;
  const activeNow = campaigns.filter((c) => c.status === 'SENDING').length;

  const kpis = [
    { label: 'Всего кампаний', value: formatNumber(result?.total ?? 0), color: 'var(--text)' },
    { label: 'Отправлено писем', value: formatNumber(totalSent), color: 'var(--text)' },
    { label: 'Средний Open Rate', value: `${avgOpen.toFixed(1).replace('.', ',')}%`, color: 'var(--success)' },
    { label: 'Активны сейчас', value: formatNumber(activeNow), color: 'var(--info)' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-[-0.3px]">Кампании</h1>
          <p className="text-ink-3 text-[12.5px] mt-0.5">Создавайте, отправляйте и анализируйте рассылки</p>
        </div>
        <div className="flex-1" />
        <Button onClick={() => navigate('/campaigns/new')}><Plus className="h-4 w-4 mr-2" />Новая кампания</Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-4 shadow-soft">
            <div className="text-[12px] text-ink-3">{k.label}</div>
            <div className="text-[22px] font-extrabold font-mono tracking-[-0.5px] mt-0.5" style={{ color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <DataTable data={campaigns} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
