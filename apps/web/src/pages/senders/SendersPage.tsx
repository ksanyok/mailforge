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

  const statusTone = (status: string): string =>
    ({
      ACTIVE: 'bg-success-soft text-success',
      PAUSED: 'bg-warn-soft text-warn',
      ERROR: 'bg-danger-soft text-danger',
    } as Record<string, string>)[status] ?? 'bg-surface-3 text-ink-2';

  const healthTone = (n: number): string =>
    n >= 80 ? 'var(--success)' : n >= 50 ? 'var(--warn)' : 'var(--danger)';
  const healthToneSoft = (n: number): string =>
    n >= 80 ? 'var(--success-soft)' : n >= 50 ? 'var(--warn-soft)' : 'var(--danger-soft)';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-[-0.3px]">Отправители и прогрев</h1>
          <p className="text-ink-3 text-[12.5px] mt-0.5">SMTP-аккаунты, лимиты, здоровье и статус прогрева</p>
        </div>
        <div className="flex-1" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {senders.map((s) => {
          const cap = s.warmupEnabled ? s.warmupCurrentDailyLimit : s.dailyLimit;
          const capPct = Math.min(100, Math.round(((cap || 0) / (s.dailyLimit || 1)) * 100));
          return (
            <div
              key={s.id}
              className="bg-surface border border-border rounded-xl p-[18px] shadow-soft hover:shadow-soft-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/senders/${s.id}`)}
            >
              {/* Header: health ring + identity */}
              <div className="flex items-center gap-3.5 mb-4">
                <div
                  className="w-[52px] h-[52px] flex-none rounded-full flex items-center justify-center"
                  style={{ background: healthToneSoft(s.healthScore) }}
                >
                  <div
                    className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-mono font-extrabold text-[14px]"
                    style={{ color: healthTone(s.healthScore) }}
                  >
                    {s.healthScore}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] truncate">{s.name}</span>
                    <span className={cn('flex-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full', statusTone(s.status))}>{s.status}</span>
                  </div>
                  <div className="text-[12px] text-ink-2 mt-0.5 truncate">{s.fromEmail}</div>
                  <div className="text-[11px] text-ink-3 font-mono mt-px truncate">{s.smtpHost}</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11.5px] text-ink-2">Дневной лимит</span>
                    <span className="text-[11.5px] font-bold font-mono">{cap} / {s.dailyLimit}</span>
                  </div>
                  <div className="h-[7px] rounded-full bg-surface-3 overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${capPct}%` }} />
                  </div>
                </div>
                {s.warmupEnabled ? (
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11.5px] text-ink-2">Прогрев · Этап {s.warmupStage}</span>
                      <span className="text-[11.5px] font-bold font-mono" style={{ color: healthTone(s.healthScore) }}>{capPct}%</span>
                    </div>
                    <div className="h-[7px] rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${capPct}%`, background: healthTone(s.healthScore) }} />
                    </div>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-ink-3">Прогрев выключен</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3.5 border-t border-border">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[12px] font-semibold text-ink-2 hover:bg-hover transition-colors disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); test.mutate(s.id); }}
                  disabled={test.isPending}
                  title="Проверить SMTP-соединение"
                >
                  <Wifi className="h-3.5 w-3.5" strokeWidth={1.7} />Проверить
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[12px] font-semibold text-brand hover:bg-brand-softer transition-colors"
                  onClick={(e) => { e.stopPropagation(); setMailboxSender(s); setDeleteConfirm(false); }}
                  title="Управление почтовым ящиком на сервере"
                >
                  <Server className="h-3.5 w-3.5" strokeWidth={1.7} />Ящик
                </button>
                {s.status === 'ERROR' && (
                  <button
                    className="flex items-center justify-center px-2.5 py-2 rounded-lg border border-border text-warn hover:bg-warn-soft transition-colors disabled:opacity-50"
                    onClick={(e) => { e.stopPropagation(); resetStatus.mutate(s.id); }}
                    disabled={resetStatus.isPending}
                    title="Сбросить статус на «Активен»"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </button>
                )}
                <button
                  className="flex items-center justify-center px-2.5 py-2 rounded-lg text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Удалить отправителя «${s.name}»?`)) remove.mutate(s.id); }}
                  disabled={remove.isPending}
                  title="Удалить отправителя"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                </button>
              </div>
            </div>
          );
        })}
        {senders.length === 0 && <div className="col-span-full text-center py-12 text-ink-3">Отправители ещё не настроены.</div>}
      </div>

      {/* Mailbox management dialog */}
      <Dialog open={!!mailboxSender} onOpenChange={(o) => { if (!o) closeMailboxDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-brand" />
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
                className="w-full bg-brand text-white hover:brightness-105"
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
            <div className="rounded-lg border border-danger bg-danger-soft p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-danger">Удалить почтовый ящик</p>
                  <p className="text-xs text-danger mt-0.5">
                    Удаляет почтовый ящик из конфигурации Dovecot и Postfix. Уже полученные письма можно опционально удалить.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  className="accent-danger"
                />
                <span className="text-danger">Также удалить все файлы писем (безвозвратно)</span>
              </label>
              {!deleteConfirm ? (
                <Button
                  variant="outline"
                  className="w-full text-danger border-danger hover:bg-danger-soft"
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
