import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, List, Users } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { listsApi, contactsApi } from '@/api/index';
import { formatDate, formatNumber } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Member { contactId: string; contact: { email: string; status: string; firstName?: string; lastName?: string }; addedAt: string; }

const STATUS_LABELS: Record<string, string> = {
  SUBSCRIBED: 'Подписан',
  UNSUBSCRIBED: 'Отписан',
  BOUNCED: 'Отказ',
  COMPLAINED: 'Жалоба',
  SUPPRESSED: 'В стоп-листе',
};
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  SUBSCRIBED: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  UNSUBSCRIBED: { bg: 'var(--surface-3)', fg: 'var(--text-2)' },
  BOUNCED: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  COMPLAINED: { bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  SUPPRESSED: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
};
function StatusPill({ status }: { status: string }) {
  const st = STATUS_STYLE[status] ?? { bg: 'var(--surface-3)', fg: 'var(--text-2)' };
  return (
    <span
      className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: st.bg, color: st.fg }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const verifyList = useMutation({
    mutationFn: () => contactsApi.verifyList(id!),
    onSuccess: (res: any) => {
      const r = res as { total: number; noMx: number; marked: number };
      toast({
        title: `Проверка завершена`,
        description: `Проверено контактов: ${r.total}. Найдено невалидных доменов: ${r.noMx}, помечено как «Отказ»: ${r.marked}.`,
      });
    },
    onError: () => toast({ title: 'Не удалось выполнить проверку', variant: 'destructive' }),
  });

  const { data: list } = useQuery({ queryKey: ['list', id], queryFn: () => listsApi.findOne(id!), enabled: !!id });
  const { data: members } = useQuery({ queryKey: ['list-members', id, page], queryFn: () => listsApi.members(id!, { page, limit: 20 }), enabled: !!id });

  const l = list as Record<string, unknown> | undefined;
  const m = members as { data: Member[]; total: number } | undefined;

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: 'contact.email', header: 'Контакт',
      cell: ({ row }) => {
        const ct = row.original.contact;
        const name = [ct?.firstName, ct?.lastName].filter(Boolean).join(' ');
        return (
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 flex-none rounded-[9px] flex items-center justify-center text-white font-bold text-[11.5px]"
              style={{ background: avatarColor(ct?.email ?? '') }}
            >
              {contactInitials(ct?.firstName, ct?.lastName, ct?.email)}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-[12.5px] text-ink truncate">{name || ct?.email}</span>
              <span className="block text-[11.5px] text-ink-3 truncate">{ct?.email}</span>
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'contact.status', header: 'Статус',
      cell: ({ getValue }) => <StatusPill status={getValue() as string} />,
    },
    { accessorKey: 'addedAt', header: 'Добавлен', cell: ({ getValue }) => <span className="text-[11.5px] text-ink-3 font-mono">{formatDate(getValue() as string)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Назад</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => verifyList.mutate()}
          disabled={verifyList.isPending || !id}
          title="Проверить MX-записи всех контактов в списке и пометить невалидные домены как «Отказ»"
        >
          <ShieldCheck className="h-4 w-4 mr-2" style={{ color: 'var(--accent)' }} />
          {verifyList.isPending ? 'Проверка...' : 'Проверить MX-записи'}
        </Button>
      </div>
      {l && (
        <div className="bg-surface border border-border rounded-xl shadow-soft p-[18px]">
          <div className="flex items-start gap-3">
            <div
              className="w-[42px] h-[42px] flex-none rounded-[11px] flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <List className="w-5 h-5" strokeWidth={1.7} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-extrabold tracking-[-0.3px] truncate">{l.name as string}</h1>
              {l.description && <p className="text-[12.5px] text-ink-3 mt-0.5">{l.description as string}</p>}
              <div className="inline-flex items-center gap-1.5 mt-2 text-[12.5px] text-ink-2">
                <Users className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.7} />
                <span className="font-mono font-bold text-ink">{formatNumber((l.contactCount as number) ?? 0)}</span>
                <span className="text-ink-3">контактов</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <DataTable data={m?.data ?? []} columns={columns} total={m?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} />
    </div>
  );
}

// палитра аватаров (декоративная)
const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
function avatarColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function contactInitials(first?: string, last?: string, email?: string): string {
  const a = (first ?? '').trim();
  const b = (last ?? '').trim();
  if (a || b) return ((a[0] ?? '') + (b[0] ?? '')).toUpperCase() || (email?.[0] ?? '?').toUpperCase();
  return (email?.[0] ?? '?').toUpperCase();
}
