import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, List, Users, ChevronRight, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { listsApi } from '@/api/index';
import { formatDate, formatNumber } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { SmartListDialog } from './SmartListDialog';

interface ContactList { id: string; name: string; description?: string; contactCount: number; createdAt: string; }

export function ListsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll() });
  const lists = ((data as any)?.data ?? []) as ContactList[];

  const { register, handleSubmit, reset } = useForm<{ name: string; description: string }>();

  const create = useMutation({
    mutationFn: (d: { name: string; description: string }) => listsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lists'] }); setOpen(false); reset(); toast({ title: 'Список создан' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => listsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lists'] }); toast({ title: 'Список удалён' }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Списки</h1>
          <p className="text-ink-3 text-[13px] mt-0.5">
            <span className="font-mono">{lists.length}</span> {'список(ов)'} контактов
          </p>
        </div>
        <div className="flex-1" />
        <SmartListDialog onCreated={() => qc.invalidateQueries({ queryKey: ['lists'] })}>
          <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Умный список</Button>
        </SmartListDialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Новый список</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Создать список контактов</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="space-y-1">
                <Label>Название</Label>
                <Input {...register('name', { required: true })} placeholder="Подписчики рассылки" />
              </div>
              <div className="space-y-1">
                <Label>Описание</Label>
                <Input {...register('description')} placeholder="Необязательное описание" />
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">Создать</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {lists.map((list) => (
          <div
            key={list.id}
            onClick={() => navigate(`/lists/${list.id}`)}
            className="group bg-surface border border-border rounded-xl shadow-soft p-[18px] cursor-pointer transition hover:shadow-soft-lg hover:border-border-2"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-[38px] h-[38px] flex-none rounded-[10px] flex items-center justify-center"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <List className="w-[19px] h-[19px]" strokeWidth={1.7} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[14px] text-ink truncate group-hover:text-brand transition-colors">{list.name}</div>
                {list.description
                  ? <p className="text-[12px] text-ink-3 mt-0.5 line-clamp-2">{list.description}</p>
                  : <p className="text-[12px] text-ink-3 mt-0.5">Без описания</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 flex-none opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.7} />
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <Users className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.7} />
                <span className="font-mono font-bold text-ink">{formatNumber(list.contactCount)}</span>
                <span className="text-ink-3">контактов</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-3 font-mono">{formatDate(list.createdAt)}</span>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Удалить список «${list.name}»?`)) remove.mutate(list.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {lists.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-surface border border-dashed border-border-2 rounded-xl">
            <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <List className="w-6 h-6" strokeWidth={1.6} />
            </div>
            <p className="text-ink-2 font-semibold text-[14px]">Списков пока нет</p>
            <p className="text-ink-3 text-[12.5px] mt-0.5">Создайте первый список контактов.</p>
          </div>
        )}
      </div>
    </div>
  );
}
