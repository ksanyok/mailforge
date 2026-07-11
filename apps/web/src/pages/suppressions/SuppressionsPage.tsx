import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, ShieldBan } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table/DataTable';
import { suppressionsApi } from '@/api/index';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';

interface Suppression { id: string; email: string; reason: string; notes?: string; createdAt: string; }

const REASON_LABELS: Record<string, string> = {
  MANUAL: 'Вручную',
  BOUNCE_HARD: 'Жёсткий отказ',
  BOUNCE_SOFT: 'Мягкий отказ',
  COMPLAINT: 'Жалоба',
  ADMIN: 'Администратор',
  UNSUBSCRIBE: 'Отписка',
};

const REASON_TONE: Record<string, string> = {
  BOUNCE_HARD: 'bg-danger-soft text-danger',
  BOUNCE_SOFT: 'bg-warn-soft text-warn',
  COMPLAINT: 'bg-warn-soft text-warn',
  ADMIN: 'bg-info-soft text-info',
  MANUAL: 'bg-surface-3 text-ink-2',
  UNSUBSCRIBE: 'bg-surface-3 text-ink-2',
};

export function SuppressionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['suppressions', page], queryFn: () => suppressionsApi.findAll({ page, limit: 20 }) });
  const result = data as { data: Suppression[]; total: number } | undefined;
  const { register, handleSubmit, setValue, reset } = useForm<{ email: string; reason: string; notes: string }>();

  const create = useMutation({
    mutationFn: (d: unknown) => suppressionsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppressions'] }); setOpen(false); reset(); toast({ title: 'Email добавлен в стоп-лист' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => suppressionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppressions'] }),
  });

  const columns: ColumnDef<Suppression>[] = [
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'reason', header: 'Причина',
      cell: ({ getValue }) => {
        const r = getValue() as string;
        return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', REASON_TONE[r] ?? 'bg-surface-3 text-ink-2')}>{REASON_LABELS[r] ?? r}</span>;
      },
    },
    { accessorKey: 'notes', header: 'Заметки', cell: ({ getValue }) => <span className="text-ink-2">{(getValue() as string) || '—'}</span> },
    { accessorKey: 'createdAt', header: 'В стоп-листе с', cell: ({ getValue }) => <span className="text-ink-2">{formatDate(getValue() as string)}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:bg-danger-soft" onClick={() => remove.mutate(row.original.id)}><Trash2 className="h-3.5 w-3.5" /></Button>,
    },
  ];

  const rows = (result?.data ?? []).filter(
    (r) => !search || r.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-[-0.3px]">Стоп-лист</h1>
          <p className="text-ink-3 text-[12.5px] mt-0.5">Адреса, исключённые из всех рассылок</p>
        </div>
        <div className="flex-1" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Добавить в стоп-лист</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Добавить email в стоп-лист</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="space-y-1"><Label>Email *</Label><Input type="email" {...register('email', { required: true })} /></div>
              <div className="space-y-1">
                <Label>Причина</Label>
                <Select defaultValue="MANUAL" onValueChange={(v) => setValue('reason', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Вручную</SelectItem>
                    <SelectItem value="BOUNCE_HARD">Жёсткий отказ</SelectItem>
                    <SelectItem value="COMPLAINT">Жалоба</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Заметки</Label><Input {...register('notes')} /></div>
              <Button type="submit" disabled={create.isPending} className="w-full">Добавить в стоп-лист</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" strokeWidth={1.7} />
        <Input
          placeholder="Поиск по email…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!isLoading && rows.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl shadow-soft text-center py-16 text-ink-3">
          <ShieldBan className="h-10 w-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="font-semibold text-ink-2">Стоп-лист пуст</p>
          <p className="text-sm mt-1">{search ? 'Ничего не найдено по запросу' : 'Заблокированные адреса появятся здесь'}</p>
        </div>
      ) : (
        <DataTable data={rows} columns={columns} total={result?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
      )}
    </div>
  );
}
