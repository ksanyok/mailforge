import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Filter } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table/DataTable';
import { contactsApi } from '@/api/contacts';
import { formatDate } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

interface Contact {
  id: string; email: string; firstName?: string; lastName?: string;
  status: string; engagementScore: number; riskScore: number; createdAt: string;
  emailType?: string | null; website?: string | null;
}

function EmailTypeChip({ type }: { type?: string | null }) {
  if (type !== 'CORPORATE' && type !== 'FREE') return null;
  const corp = type === 'CORPORATE';
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-px rounded"
      style={{
        background: corp ? 'var(--success-soft)' : 'var(--surface-3)',
        color: corp ? 'var(--success)' : 'var(--text-2)',
      }}
    >
      {corp ? 'корп.' : 'беспл.'}
    </span>
  );
}

const STATUSES = ['SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'];

const STATUS_LABELS: Record<string, string> = {
  SUBSCRIBED: 'Подписан',
  UNSUBSCRIBED: 'Отписан (не интересно)',
  BOUNCED: 'Отказ',
  COMPLAINED: 'Жалоба',
  SUPPRESSED: 'В стоп-листе',
};

// soft-цвета статусов по смыслу (токены темы)
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

// палитра аватаров (декоративная, как PIE_COLORS дашборда)
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

export function ContactsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search, statusFilter],
    queryFn: () => contactsApi.findAll({ page, limit: 20, search, ...(statusFilter ? { status: statusFilter } : {}) }),
  });
  const result = data as { data: Contact[]; total: number } | undefined;

  const { register, handleSubmit, reset, setValue } = useForm<{
    email: string; firstName: string; lastName: string;
    phone: string; company: string; status: string;
  }>({ defaultValues: { status: 'SUBSCRIBED' } });

  const create = useMutation({
    mutationFn: (d: unknown) => contactsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setAddOpen(false);
      reset();
      toast({ title: 'Контакт добавлен' });
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось добавить контакт', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast({ title: 'Контакт удалён' }); },
    onError: () => toast({ title: 'Не удалось удалить контакт', variant: 'destructive' }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      contactsApi.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast({ title: 'Статус обновлён' }); },
    onError: () => toast({ title: 'Не удалось обновить статус', variant: 'destructive' }),
  });

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: 'email',
      header: 'Контакт',
      cell: ({ row }) => {
        const c = row.original;
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
        return (
          <button
            onClick={() => navigate(`/contacts/${c.id}`)}
            className="flex items-center gap-3 text-left min-w-0 group"
          >
            <span
              className="w-8 h-8 flex-none rounded-[9px] flex items-center justify-center text-white font-bold text-[11.5px]"
              style={{ background: avatarColor(c.email) }}
            >
              {contactInitials(c.firstName, c.lastName, c.email)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-[12.5px] text-ink truncate group-hover:text-brand transition-colors">
                  {name || c.email}
                </span>
                <EmailTypeChip type={c.emailType} />
              </span>
              <span className="block text-[11.5px] text-ink-3 truncate">{c.email}</span>
            </span>
          </button>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(val) => changeStatus.mutate({ id: row.original.id, status: val })}
        >
          <SelectTrigger className="h-7 w-auto gap-1 text-xs border-0 p-0 focus:ring-0 shadow-none">
            <SelectValue>
              <StatusPill status={row.original.status} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <StatusPill status={s} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: 'engagementScore',
      header: 'Вовлечённость',
      cell: ({ getValue }) => {
        const v = getValue() as number;
        const color = v >= 70 ? 'var(--success)' : v >= 40 ? 'var(--warn)' : 'var(--danger)';
        return (
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: color }} />
            </div>
            <span className="text-[11.5px] font-bold font-mono" style={{ color }}>{v}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Создан',
      cell: ({ getValue }) => <span className="text-[11.5px] text-ink-3 font-mono">{formatDate(getValue() as string)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm" variant="ghost"
          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
          onClick={() => {
            if (confirm(`Удалить ${row.original.email}?`)) remove.mutate(row.original.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Контакты</h1>
          <p className="text-ink-3 text-[13px] mt-0.5">
            {(data as any)?.total !== undefined ? (
              <><span className="font-mono">{(data as any).total}</span> {'контакт(ов)'} в базе</>
            ) : 'База контактов'}
          </p>
        </div>
        <div className="flex-1" />
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Добавить контакт
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" strokeWidth={1.7} />
          <Input
            placeholder="Поиск контактов..."
            className="pl-9 bg-surface"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter || '__all__'} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-52 shrink-0 bg-surface">
            <Filter className="h-3.5 w-3.5 mr-2 text-ink-3" strokeWidth={1.7} />
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все статусы</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <StatusPill status={s} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={result?.data ?? []}
        columns={columns}
        total={result?.total ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Добавить контакт</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register('email', { required: true })} placeholder="name@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Имя</Label>
                <Input {...register('firstName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Фамилия</Label>
                <Input {...register('lastName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Телефон</Label>
                <Input {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Компания</Label>
                <Input {...register('company')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <Select defaultValue="SUBSCRIBED" onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Добавление…' : 'Добавить контакт'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
