import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Mail, Phone, Building, Edit, Trash2, Send, MailOpen, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contactsApi } from '@/api/contacts';
import { formatDate } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

const STATUSES = ['SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'];

const STATUS_LABELS: Record<string, string> = {
  SUBSCRIBED: 'Подписан',
  UNSUBSCRIBED: 'Отписан (не интересно)',
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
    <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
function avatarColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface ContactForm {
  email: string; firstName: string; lastName: string;
  phone: string; company: string; status: string;
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.findOne(id!),
    enabled: !!id,
  });

  const c = contact as Record<string, unknown> | undefined;

  const { register, handleSubmit, reset, setValue } = useForm<ContactForm>();

  const startEdit = () => {
    if (!c) return;
    reset({
      email: c.email as string,
      firstName: (c.firstName as string) ?? '',
      lastName: (c.lastName as string) ?? '',
      phone: (c.phone as string) ?? '',
      company: (c.company as string) ?? '',
      status: c.status as string,
    });
    setEditing(true);
  };

  const update = useMutation({
    mutationFn: (d: ContactForm) => contactsApi.update(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setEditing(false);
      toast({ title: 'Контакт обновлён' });
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось обновить', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: () => contactsApi.remove(id!),
    onSuccess: () => { navigate('/contacts'); toast({ title: 'Контакт удалён' }); },
  });

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>;
  if (!c) return <div className="text-muted-foreground">Контакт не найден</div>;

  if (editing) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Назад
        </Button>
        <h2 className="text-xl font-semibold">Изменить контакт</h2>
        <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register('email', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <Select defaultValue={c.status as string} onValueChange={(v) => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Имя</Label>
              <Input {...register('firstName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Фамилия</Label>
              <Input {...register('lastName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Телефон</Label>
              <Input {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Компания</Label>
              <Input {...register('company')} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Сохранение…' : 'Сохранить изменения'}</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Отмена</Button>
          </div>
        </form>
      </div>
    );
  }

  const engagement = (c.engagementScore as number) ?? 0;
  const engColor = engagement >= 70 ? 'var(--success)' : engagement >= 40 ? 'var(--warn)' : 'var(--danger)';
  const risk = (c.riskScore as number) ?? 0;
  const riskColor = risk >= 70 ? 'var(--danger)' : risk >= 40 ? 'var(--warn)' : 'var(--success)';

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Назад
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Edit className="h-3.5 w-3.5 mr-1" /> Изменить
          </Button>
          <Button
            variant="ghost" size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => { if (confirm('Удалить этот контакт?')) remove.mutate(); }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить
          </Button>
        </div>
      </div>

      {/* Шапка контакта */}
      <div className="bg-surface border border-border rounded-xl shadow-soft p-[18px] flex items-center gap-4">
        <div
          className="h-14 w-14 flex-none rounded-[14px] flex items-center justify-center text-xl font-bold text-white"
          style={{ background: avatarColor((c.email as string) ?? '') }}
        >
          {((c.firstName as string)?.[0] ?? (c.email as string)?.[0])?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-[19px] font-extrabold tracking-[-0.3px] truncate">
            {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email as string}
          </h2>
          <div className="mt-1"><StatusPill status={c.status as string} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Контактные данные */}
        <div className="bg-surface border border-border rounded-xl shadow-soft p-[18px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-ink-3 mb-3">Контактные данные</div>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex items-center gap-2.5 text-ink"><Mail className="h-4 w-4 text-ink-3" strokeWidth={1.7} />{c.email as string}</div>
            {c.phone && <div className="flex items-center gap-2.5 text-ink"><Phone className="h-4 w-4 text-ink-3" strokeWidth={1.7} />{c.phone as string}</div>}
            {c.company && <div className="flex items-center gap-2.5 text-ink"><Building className="h-4 w-4 text-ink-3" strokeWidth={1.7} />{c.company as string}</div>}
            <div className="text-ink-3 text-[12px] pt-1">Добавлен {formatDate(c.createdAt as string)}</div>
          </div>
        </div>

        {/* Вовлечённость */}
        <div className="bg-surface border border-border rounded-xl shadow-soft p-[18px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-ink-3 mb-3">Вовлечённость</div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-ink-2">Индекс вовлечённости</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: engColor }}>{c.engagementScore as number}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, engagement))}%`, background: engColor }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-ink-2">Индекс риска</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: riskColor }}>{c.riskScore as number}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, risk))}%`, background: riskColor }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* История отправок */}
      <div className="bg-surface border border-border rounded-xl shadow-soft p-[18px]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-ink-3 mb-3">История отправок</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[10px] bg-surface-2 p-3">
            <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-2" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
              <Send className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div className="text-[20px] font-extrabold font-mono tracking-[-0.5px]">{c.totalSent as number}</div>
            <div className="text-[11.5px] text-ink-3 font-semibold">Отправлено</div>
          </div>
          <div className="rounded-[10px] bg-surface-2 p-3">
            <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-2" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              <MailOpen className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div className="text-[20px] font-extrabold font-mono tracking-[-0.5px]">{c.totalOpened as number}</div>
            <div className="text-[11.5px] text-ink-3 font-semibold">Открытий</div>
          </div>
          <div className="rounded-[10px] bg-surface-2 p-3">
            <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-2" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <MousePointerClick className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div className="text-[20px] font-extrabold font-mono tracking-[-0.5px]">{c.totalClicked as number}</div>
            <div className="text-[11.5px] text-ink-3 font-semibold">Кликов</div>
          </div>
        </div>
        {c.lastOpenedAt && <div className="text-[12px] text-ink-3 mt-3 pt-3 border-t border-border">Последнее открытие: <span className="font-mono text-ink-2">{formatDate(c.lastOpenedAt as string)}</span></div>}
      </div>
    </div>
  );
}
