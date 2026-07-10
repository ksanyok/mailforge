import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Mail, Phone, Building, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { contactsApi } from '@/api/contacts';
import { cn } from '@/utils/cn';
import { formatDate, STATUS_COLORS } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

const STATUSES = ['SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'];

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
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
          {(c.firstName as string)?.[0] ?? (c.email as string)?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold">
            {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email as string}
          </h2>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[c.status as string] ?? 'bg-gray-100')}>
            {c.status as string}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Контактные данные</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{c.email as string}</div>
            {c.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone as string}</div>}
            {c.company && <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />{c.company as string}</div>}
            <div className="text-muted-foreground">Добавлен {formatDate(c.createdAt as string)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Вовлечённость</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Индекс</span><span className="font-medium">{c.engagementScore as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Риск</span><span className="font-medium">{c.riskScore as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Всего отправлено</span><span>{c.totalSent as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Всего открытий</span><span>{c.totalOpened as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Всего кликов</span><span>{c.totalClicked as number}</span></div>
            {c.lastOpenedAt && <div className="flex justify-between"><span className="text-muted-foreground">Последнее открытие</span><span>{formatDate(c.lastOpenedAt as string)}</span></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
