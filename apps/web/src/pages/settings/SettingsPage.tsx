import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, Mail, Zap, Shield, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const buildValues = () => Object.fromEntries(settings.map((s) => [s.key.replace(/\./g, '_'), s.value]));

  useEffect(() => {
    if (settings.length > 0) {
      reset(buildValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="mb-1">
        <h1 className="text-xl font-extrabold tracking-tight">Настройки</h1>
        <p className="text-ink-3 text-[12.5px] mt-0.5">Системные параметры MailForge</p>
      </div>

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        {SETTING_GROUPS.map((group) => (
          <div key={group.title} className="bg-surface border border-border rounded-xl p-[22px] shadow-soft">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-none"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <group.icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
              </div>
              <div>
                <div className="font-bold text-[15px] leading-tight">{group.title}</div>
                <div className="text-[12px] text-ink-3 mt-0.5">{group.description}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.keys.map((key) => {
                const meta = LABEL_MAP[key];
                const fieldKey = key.replace(/\./g, '_');
                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={fieldKey} className="text-[12px] font-semibold text-ink-2">
                      {meta?.label ?? key}
                    </Label>
                    <Input
                      id={fieldKey}
                      type={meta?.type ?? 'text'}
                      placeholder={meta?.placeholder}
                      {...register(fieldKey)}
                    />
                    <p className="text-[11.5px] text-ink-3 leading-snug">{meta?.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {otherSettings.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-[22px] shadow-soft">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-none"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Shield className="h-[17px] w-[17px]" strokeWidth={1.7} />
              </div>
              <div>
                <div className="font-bold text-[15px] leading-tight">Прочие настройки</div>
                <div className="text-[12px] text-ink-3 mt-0.5">Дополнительные параметры конфигурации</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherSettings.map((s) => {
                const fieldKey = s.key.replace(/\./g, '_');
                return (
                  <div key={s.key} className="space-y-1.5">
                    <Label htmlFor={fieldKey} className="text-[12px] font-semibold text-ink-2">
                      {LABEL_MAP[s.key]?.label ?? s.key}
                    </Label>
                    <Input id={fieldKey} {...register(fieldKey)} />
                    {s.description && <p className="text-[11.5px] text-ink-3 leading-snug">{s.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2.5 justify-end pt-1">
          <button
            type="button"
            onClick={() => reset(buildValues())}
            className="px-[18px] py-2.5 rounded-[10px] border border-border text-ink-2 font-semibold text-[13px] hover:bg-hover transition-colors"
          >
            Отменить
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white font-semibold text-[13px] shadow-[0_6px_14px_-6px_var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] hover:brightness-105 disabled:opacity-60 transition-[filter]"
          >
            <Save className="h-[15px] w-[15px]" strokeWidth={2} />
            {save.isPending ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  );
}
