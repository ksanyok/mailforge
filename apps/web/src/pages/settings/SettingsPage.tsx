import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, Mail, Zap, Shield, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { settingsApi } from '@/api/index';
import { toast } from '@/hooks/use-toast';

interface Setting { key: string; value: string; description?: string; }

const LABEL_MAP: Record<string, { label: string; description: string; placeholder?: string; type?: string }> = {
  'app.name':                   { label: 'Название приложения',         description: 'Отображаемое название в интерфейсе',                  placeholder: 'MailForge' },
  'app.url':                    { label: 'URL приложения',              description: 'Публичный URL этого приложения',                     placeholder: 'https://your-domain.com' },
  'app.supportEmail':           { label: 'Email поддержки',             description: 'Email-адрес для обращений в поддержку',               placeholder: 'support@your-domain.com' },
  'sending.defaultFromName':    { label: 'Имя отправителя по умолчанию', description: 'Имя в поле «От», если отправитель не указан',        placeholder: 'My Company' },
  'sending.defaultFromEmail':   { label: 'Email отправителя по умолчанию', description: 'Email в поле «От» для исходящих писем',            placeholder: 'noreply@your-domain.com' },
  'sending.maxDailyGlobal':     { label: 'Глобальный дневной лимит отправки', description: 'Максимум писем в день по всем отправителям',     placeholder: '10000', type: 'number' },
  'warmup.defaultInitialVolume':{ label: 'Начальный объём прогрева',     description: 'Писем в день на старте прогрева IP',                  placeholder: '20',    type: 'number' },
  'warmup.defaultDailyIncrease':{ label: 'Ежедневный прирост прогрева (%)', description: 'Процент прироста дневного объёма во время прогрева', placeholder: '20',    type: 'number' },
  'notifications.forwardEmail': { label: 'Пересылать уведомления на',   description: 'Системные оповещения будут отправляться на этот адрес (оставьте пустым, чтобы отключить)', placeholder: 'you@example.com' },
};

const SETTING_GROUPS = [
  {
    title: 'Общие',
    description: 'Базовая конфигурация приложения',
    icon: Globe,
    keys: ['app.name', 'app.url', 'app.supportEmail'],
  },
  {
    title: 'Отправка писем',
    description: 'Значения по умолчанию и лимиты для исходящих писем',
    icon: Mail,
    keys: ['sending.defaultFromName', 'sending.defaultFromEmail', 'sending.maxDailyGlobal'],
  },
  {
    title: 'Прогрев IP',
    description: 'Управляет постепенным наращиванием объёмов для новых отправляющих IP',
    icon: Zap,
    keys: ['warmup.defaultInitialVolume', 'warmup.defaultDailyIncrease'],
  },
  {
    title: 'Уведомления',
    description: 'Получайте системные оповещения вне интерфейса',
    icon: Bell,
    keys: ['notifications.forwardEmail'],
  },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.findAll() });
  const settings = ((data as any)?.data ?? (Array.isArray(data) ? data : [])) as Setting[];

  const { register, handleSubmit, reset } = useForm<Record<string, string>>();

  useEffect(() => {
    if (settings.length > 0) {
      const values = Object.fromEntries(settings.map((s) => [s.key.replace(/\./g, '_'), s.value]));
      reset(values);
    }
  }, [settings, reset]);

  const save = useMutation({
    mutationFn: (d: Record<string, string>) => {
      const payload = Object.entries(d).map(([k, v]) => ({ key: k.replace(/_/g, '.'), value: v }));
      return settingsApi.bulkUpdate(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast({ title: 'Настройки успешно сохранены' }); },
    onError: () => toast({ title: 'Не удалось сохранить настройки', variant: 'destructive' }),
  });

  const knownKeys = SETTING_GROUPS.flatMap((g) => g.keys);
  const otherSettings = settings.filter((s) => !knownKeys.includes(s.key));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-1">Настройте свой экземпляр MailForge</p>
      </div>

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        {SETTING_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <group.icon className="h-4 w-4 text-primary" />
                {group.title}
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.keys.map((key) => {
                const meta = LABEL_MAP[key];
                const fieldKey = key.replace(/\./g, '_');
                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={fieldKey}>{meta?.label ?? key}</Label>
                    <Input
                      id={fieldKey}
                      type={meta?.type ?? 'text'}
                      placeholder={meta?.placeholder}
                      {...register(fieldKey)}
                    />
                    <p className="text-xs text-muted-foreground">{meta?.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {otherSettings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Прочие настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherSettings.map((s) => {
                const fieldKey = s.key.replace(/\./g, '_');
                return (
                  <div key={s.key} className="space-y-1.5">
                    <Label htmlFor={fieldKey}>{LABEL_MAP[s.key]?.label ?? s.key}</Label>
                    <Input id={fieldKey} {...register(fieldKey)} />
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {save.isPending ? 'Сохранение…' : 'Сохранить настройки'}
          </Button>
        </div>
      </form>
    </div>
  );
}
