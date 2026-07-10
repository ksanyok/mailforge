import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Wifi, RotateCcw, Trash2, Server, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { sendersApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { healthBg, STATUS_COLORS } from '@/utils/format';
import { toast } from '@/hooks/use-toast';

interface Sender {
  id: string; name: string; fromEmail: string; smtpHost: string;
  status: string; healthScore: number; warmupEnabled: boolean;
  warmupStage: number; warmupCurrentDailyLimit: number; dailyLimit: number; totalSent: number;
}

export function SendersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mailboxSender, setMailboxSender] = useState<Sender | null>(null);
  const [mailboxPassword, setMailboxPassword] = useState('');
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const senders = ((data as any)?.data ?? []) as Sender[];

  const { register, handleSubmit, setValue, reset } = useForm<{
    name: string; fromName: string; fromEmail: string; smtpHost: string;
    smtpPort: number; smtpEncryption: string; smtpUser: string; smtpPassword: string;
    dailyLimit: number; warmupEnabled: boolean;
  }>({ defaultValues: { smtpPort: 587, smtpEncryption: 'STARTTLS', dailyLimit: 500, warmupEnabled: true } });

  const create = useMutation({
    mutationFn: (d: unknown) => sendersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); setOpen(false); reset(); toast({ title: 'Отправитель создан' }); },
    onError: () => toast({ title: 'Не удалось создать отправителя', variant: 'destructive' }),
  });

  const test = useMutation({
    mutationFn: (id: string) => sendersApi.testConnection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Соединение установлено' }); },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['senders'] });
      const msg = err?.response?.data?.message || 'Не удалось установить соединение';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendersApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Отправитель удалён' }); },
    onError: () => toast({ title: 'Не удалось удалить отправителя', variant: 'destructive' }),
  });

  const resetStatus = useMutation({
    mutationFn: (id: string) => sendersApi.resetStatus(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders'] }); toast({ title: 'Отправитель переведён в статус «Активен»' }); },
  });

  const provisionMailbox = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      sendersApi.provisionMailbox(id, password),
    onSuccess: (res: any) => {
      toast({ title: res?.message ?? 'Почтовый ящик успешно создан' });
      setMailboxSender(null);
      setMailboxPassword('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Не удалось создать почтовый ящик';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const removeMailbox = useMutation({
    mutationFn: ({ id, deleteFiles }: { id: string; deleteFiles: boolean }) =>
      sendersApi.removeMailbox(id, deleteFiles),
    onSuccess: (res: any) => {
      toast({ title: res?.message ?? 'Почтовый ящик удалён' });
      setMailboxSender(null);
      setDeleteFiles(false);
      setDeleteConfirm(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Не удалось удалить почтовый ящик';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const closeMailboxDialog = () => {
    setMailboxSender(null);
    setMailboxPassword('');
    setDeleteFiles(false);
    setDeleteConfirm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Добавить отправителя</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Добавить SMTP-отправителя</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Название аккаунта *</Label><Input {...register('name', { required: true })} /></div>
                <div className="space-y-1"><Label>Имя отправителя *</Label><Input {...register('fromName', { required: true })} /></div>
                <div className="space-y-1"><Label>Email отправителя *</Label><Input type="email" {...register('fromEmail', { required: true })} /></div>
                <div className="space-y-1"><Label>SMTP-хост *</Label><Input {...register('smtpHost', { required: true })} placeholder="mail.yourdomain.com" /></div>
                <div className="space-y-1"><Label>Порт</Label><Input type="number" {...register('smtpPort', { valueAsNumber: true })} /></div>
                <div className="space-y-1">
                  <Label>Шифрование</Label>
                  <Select defaultValue="STARTTLS" onValueChange={(v) => setValue('smtpEncryption', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS (порт 465)</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS (порт 587)</SelectItem>
                      <SelectItem value="NONE">Без шифрования</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>SMTP-пользователь *</Label><Input {...register('smtpUser', { required: true })} placeholder="user@senior-dev.cloud" /></div>
                <div className="space-y-1">
                  <Label>SMTP-пароль *</Label>
                  <Input type="password" {...register('smtpPassword', { required: true })} placeholder="Введите пароль (не ваш email)" />
                </div>
                <div className="space-y-1"><Label>Дневной лимит</Label><Input type="number" {...register('dailyLimit', { valueAsNumber: true })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Для отправителей <strong>@senior-dev.cloud</strong> почтовый ящик создаётся на сервере автоматически. Для внешних SMTP-провайдеров провижининг не требуется.
              </p>
              <Button type="submit" disabled={create.isPending} className="w-full">Добавить отправителя</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {senders.map((s) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/senders/${s.id}`)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{s.name}</CardTitle>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[s.status] ?? 'bg-gray-100')}>{s.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.fromEmail}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Здоровье</span>
                <span className={cn('text-sm font-bold px-2 py-0.5 rounded', healthBg(s.healthScore))}>{s.healthScore}</span>
              </div>
              {s.warmupEnabled && (
                <p className="text-xs text-muted-foreground">Этап прогрева {s.warmupStage} — {s.warmupCurrentDailyLimit}/{s.dailyLimit}/день</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm" variant="outline" className="flex-1"
                  onClick={(e) => { e.stopPropagation(); test.mutate(s.id); }}
                  disabled={test.isPending}
                  title="Проверить SMTP-соединение"
                >
                  <Wifi className="h-3.5 w-3.5 mr-1" />Проверить
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                  onClick={(e) => { e.stopPropagation(); setMailboxSender(s); setDeleteConfirm(false); }}
                  title="Управление почтовым ящиком на сервере"
                >
                  <Server className="h-3.5 w-3.5" />
                </Button>
                {s.status === 'ERROR' && (
                  <Button
                    size="sm" variant="outline"
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    onClick={(e) => { e.stopPropagation(); resetStatus.mutate(s.id); }}
                    disabled={resetStatus.isPending}
                    title="Сбросить статус на «Активен»"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Удалить отправителя «${s.name}»?`)) remove.mutate(s.id); }}
                  disabled={remove.isPending}
                  title="Удалить отправителя"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {senders.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">Отправители ещё не настроены.</div>}
      </div>

      {/* Mailbox management dialog */}
      <Dialog open={!!mailboxSender} onOpenChange={(o) => { if (!o) closeMailboxDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600" />
              Почтовый ящик на сервере — {mailboxSender?.fromEmail}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create / Update section */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Создать / обновить почтовый ящик</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Создаёт почтовый ящик на сервере (Dovecot + Postfix). Если ящик уже существует, обновляет пароль.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Пароль почтового ящика</Label>
                <Input
                  type="password"
                  value={mailboxPassword}
                  onChange={(e) => setMailboxPassword(e.target.value)}
                  placeholder="Введите пароль почтового ящика"
                />
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!mailboxPassword || provisionMailbox.isPending}
                onClick={() => {
                  if (mailboxSender) {
                    provisionMailbox.mutate({ id: mailboxSender.id, password: mailboxPassword });
                  }
                }}
              >
                {provisionMailbox.isPending ? 'Создание…' : 'Создать почтовый ящик на сервере'}
              </Button>
            </div>

            {/* Delete section */}
            <div className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Удалить почтовый ящик</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Удаляет почтовый ящик из конфигурации Dovecot и Postfix. Уже полученные письма можно опционально удалить.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  className="accent-red-600"
                />
                <span className="text-red-700">Также удалить все файлы писем (безвозвратно)</span>
              </label>
              {!deleteConfirm ? (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Удалить почтовый ящик
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={removeMailbox.isPending}
                    onClick={() => {
                      if (mailboxSender) {
                        removeMailbox.mutate({ id: mailboxSender.id, deleteFiles });
                      }
                    }}
                  >
                    {removeMailbox.isPending ? 'Удаление…' : 'Подтвердить удаление'}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>Отмена</Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
