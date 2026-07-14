import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Send, Eye, Code2, AlertTriangle,
  CheckCircle, Users, Mail, Settings2, FileText, Sparkles,
  ShieldAlert, ShieldCheck, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { campaignsApi, sendersApi, listsApi, templatesApi } from '@/api/index';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';
import { analyzeSpam } from '@/utils/spamScore';
import { DEMO_TEMPLATES } from '@/utils/demoTemplates';

interface BuilderForm {
  name: string; subject: string; preheader: string;
  senderId: string; fromNameOverride: string;
  htmlContent: string; textContent: string;
  throttlePerHour: number; trackOpens: boolean; trackClicks: boolean;
  followUpEnabled: boolean; followUpDays: number;
  followUpSubject: string; followUpBody: string;
}

const STEPS = [
  { label: 'Основное',   icon: FileText,   hint: 'Название кампании, тема, прехедер' },
  { label: 'Отправитель',icon: Mail,        hint: 'SMTP-аккаунт и имя отправителя' },
  { label: 'Получатели', icon: Users,       hint: 'Списки контактов' },
  { label: 'Содержимое', icon: Code2,       hint: 'HTML-редактор и предпросмотр' },
  { label: 'Настройки',  icon: Settings2,   hint: 'Скорость отправки и отслеживание' },
  { label: 'Проверка',   icon: CheckCircle, hint: 'Финальная проверка перед отправкой' },
];

const VARIABLES = [
  { v: '{{firstName}}',    label: 'Имя' },
  { v: '{{lastName}}',     label: 'Фамилия' },
  { v: '{{company}}',      label: 'Компания' },
  { v: '{{website}}',      label: 'Сайт клиента' },
  { v: '{{region}}',       label: 'Регион' },
  { v: '{{email}}',        label: 'Email' },
  { v: '{{senderName}}',   label: 'Имя отправителя (подпись)' },
  { v: '{{unsubscribeUrl}}', label: 'Отписка ⚠️', required: true },
];

export function CampaignBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [contentTab, setContentTab] = useState<'code' | 'preview'>('code');

  const { register, handleSubmit, setValue, watch } = useForm<BuilderForm>({
    defaultValues: { throttlePerHour: 1200, trackOpens: true, trackClicks: true, followUpEnabled: false, followUpDays: 3, followUpSubject: '', followUpBody: '' },
  });

  const subject = watch('subject') ?? '';
  const htmlContent = watch('htmlContent') ?? '';
  const senderId = watch('senderId');

  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const { data: listsData } = useQuery({ queryKey: ['lists'], queryFn: () => listsApi.findAll({ limit: 100 }) });
  const { data: tplData } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.findAll({ limit: 100 }) });

  const sendersArr = ((senders as any)?.data ?? []) as { id: string; name: string; fromEmail: string; fromName: string; status: string; healthScore: number }[];
  const listsArr = ((listsData as any)?.data ?? []) as { id: string; name: string; contactCount: number }[];
  const savedTemplates = ((tplData as any)?.data ?? []) as { id: string; name: string; htmlContent: string }[];

  const allTemplates = [
    ...DEMO_TEMPLATES.map((d) => ({ id: d.id, name: `${d.name} (demo)`, htmlContent: d.htmlContent })),
    ...savedTemplates,
  ];

  const selectedSender = sendersArr.find((s) => s.id === senderId);
  const totalContacts = listsArr.filter((l) => selectedLists.includes(l.id)).reduce((a, l) => a + l.contactCount, 0);

  const spam = useMemo(() => analyzeSpam(subject, htmlContent), [subject, htmlContent]);

  const save = useMutation({
    mutationFn: (data: BuilderForm & { listIds: string[] }) =>
      id ? campaignsApi.update(id, data) : campaignsApi.create(data),
    onSuccess: (result) => {
      toast({ title: 'Кампания сохранена' });
      navigate(`/campaigns/${(result as any).id}`);
    },
    onError: (err: any) => {
      toast({ title: err?.response?.data?.message ?? 'Не удалось сохранить кампанию', variant: 'destructive' });
    },
  });

  const onSubmit = (data: BuilderForm) => {
    if (selectedLists.length === 0) { toast({ title: 'Выберите хотя бы один список', variant: 'destructive' }); setStep(2); return; }
    const { fromNameOverride, throttlePerHour, ...campaignData } = data;
    save.mutate({ ...campaignData, throttlePerMinute: Math.max(1, throttlePerHour), listIds: selectedLists } as any);
  };

  const goNext = () => {
    if (step === 0 && !watch('name')) { toast({ title: 'Введите название кампании', variant: 'destructive' }); return; }
    if (step === 0 && !watch('subject')) { toast({ title: 'Введите тему письма', variant: 'destructive' }); return; }
    if (step === 1 && !senderId) { toast({ title: 'Выберите отправителя', variant: 'destructive' }); return; }
    if (step === 2 && selectedLists.length === 0) { toast({ title: 'Выберите хотя бы один список', variant: 'destructive' }); return; }
    setStep((s) => s + 1);
  };

  const insertVariable = (v: string) => {
    const el = document.getElementById('htmlContent') as HTMLTextAreaElement;
    if (el) {
      const s = el.selectionStart ?? htmlContent.length;
      setValue('htmlContent', htmlContent.slice(0, s) + v + htmlContent.slice(s));
      setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = s + v.length; }, 0);
    }
  };

  const criticalFails = [
    !watch('name'),
    !watch('subject'),
    !senderId,
    selectedLists.length === 0,
    !htmlContent || !htmlContent.includes('{{unsubscribeUrl}}'),
  ].filter(Boolean).length;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          title="Назад"
          className="w-[34px] h-[34px] rounded-[9px] border border-border flex items-center justify-center text-ink-2 hover:bg-hover transition-colors"
        >
          <ArrowLeft className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-extrabold tracking-[-0.3px]">{id ? 'Изменить кампанию' : 'Новая кампания'}</h1>
          <p className="text-ink-3 text-[12.5px] mt-0.5">Шаг {step + 1} из {STEPS.length} · {STEPS[step].label}</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center overflow-x-auto pb-1">
        {STEPS.map(({ label, hint }, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center flex-1 min-w-fit">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                title={hint}
                className={cn('flex items-center gap-2.5 flex-none', done ? 'cursor-pointer' : 'cursor-default')}
              >
                <span
                  className="w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center font-bold text-[13px] font-mono transition-colors shrink-0"
                  style={
                    active
                      ? { border: '2px solid transparent', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff' }
                      : done
                      ? { borderColor: 'var(--success)', background: 'var(--success-soft)', color: 'var(--success)' }
                      : { borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-3)' }
                  }
                >
                  {done ? <CheckCircle className="h-4 w-4" strokeWidth={2.2} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[12.5px] whitespace-nowrap hidden sm:inline',
                    active ? 'font-semibold text-ink' : done ? 'font-medium text-ink-2' : 'text-ink-3',
                  )}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className="flex-1 h-0.5 mx-2.5 rounded min-w-[16px]"
                  style={{ background: done ? 'var(--success)' : 'var(--border)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── STEP 0: BASICS ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" />Основная информация</CardTitle>
              <CardDescription>Укажите название кампании, тему и прехедер</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Название кампании <span className="text-red-500">*</span></Label>
                <Input {...register('name', { required: true })} placeholder="напр. Майский дайджест, Чёрная пятница…" />
                <p className="text-xs text-muted-foreground">Внутреннее название — получатели его не увидят</p>
              </div>
              <div className="space-y-1.5">
                <Label>Тема письма <span className="text-red-500">*</span></Label>
                <Input {...register('subject', { required: true })} placeholder="напр. 🚀 Новые функции, которые изменят вашу работу" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Что получатели видят во «Входящих». Оптимально 40–60 символов.</p>
                  <span className={cn('text-xs font-medium', subject.length > 70 ? 'text-red-500' : subject.length > 50 ? 'text-yellow-500' : 'text-green-600')}>
                    {subject.length} симв.
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Прехедер</Label>
                <Input {...register('preheader')} placeholder="Текст предпросмотра после темы письма, 80–100 символов" />
                <p className="text-xs text-muted-foreground">Короткий тизер рядом с темой в большинстве почтовых клиентов</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 1: SENDER ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-primary" />Отправитель</CardTitle>
              <CardDescription>Выберите SMTP-аккаунт и при желании переопределите имя отправителя</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sendersArr.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Нет настроенных SMTP-аккаунтов.{' '}
                  <button type="button" className="text-primary underline" onClick={() => navigate('/senders')}>Добавить →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sendersArr.map((s) => (
                    <label key={s.id} className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                      senderId === s.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/40',
                    )}>
                      <input type="radio" name="senderId" value={s.id}
                        checked={senderId === s.id}
                        onChange={() => setValue('senderId', s.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.fromName} &lt;{s.fromEmail}&gt;</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Индекс: <span className={cn('font-bold', s.healthScore >= 70 ? 'text-green-600' : s.healthScore >= 40 ? 'text-yellow-600' : 'text-red-600')}>{s.healthScore}</span></span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>{s.status === 'ACTIVE' ? 'Активен' : 'Неактивен'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {senderId && (
                <div className="space-y-1.5 pt-2 border-t">
                  <Label>Переопределить имя отправителя (необязательно)</Label>
                  <Input
                    {...register('fromNameOverride')}
                    placeholder={`По умолчанию: ${selectedSender?.fromName ?? ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Если задано, это имя появится в поле «От кого» вместо имени SMTP-аккаунта
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: RECIPIENTS ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" />Получатели</CardTitle>
              <CardDescription>Выберите один или несколько списков контактов</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {listsArr.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Списки контактов не найдены.{' '}
                  <button type="button" className="text-primary underline" onClick={() => navigate('/lists')}>Создать →</button>
                </div>
              ) : listsArr.map((list) => (
                <label key={list.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  selectedLists.includes(list.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                )}>
                  <input type="checkbox"
                    checked={selectedLists.includes(list.id)}
                    onChange={(e) => setSelectedLists(e.target.checked
                      ? [...selectedLists, list.id]
                      : selectedLists.filter((l) => l !== list.id)
                    )}
                    className="accent-primary h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{list.name}</p>
                  </div>
                  <span className="text-xs font-medium bg-muted px-2 py-1 rounded-lg">{list.contactCount.toLocaleString()} контактов</span>
                </label>
              ))}
              {selectedLists.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  всего ~{totalContacts.toLocaleString()} контактов (до дедупликации и фильтрации отписавшихся)
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: CONTENT ── */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Code2 className="h-4 w-4 text-primary" />Содержимое письма</CardTitle>
                <CardDescription>Редактируйте HTML или смотрите предпросмотр</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template picker */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" />Загрузить готовый шаблон</Label>
                  <Select onValueChange={(tplId) => {
                    const tpl = allTemplates.find((t) => t.id === tplId);
                    if (tpl) setValue('htmlContent', tpl.htmlContent);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="— Выберите шаблон —" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variable buttons */}
                <div className="space-y-1.5">
                  <Label>Вставить переменную</Label>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLES.map(({ v, label, required }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg font-mono border transition-colors hover:bg-primary/10 hover:border-primary hover:text-primary',
                          required && 'border-orange-300 bg-orange-50 text-orange-700',
                        )}
                        title={required ? 'Обязательно по закону (CAN-SPAM / GDPR)' : undefined}
                      >
                        {v} <span className="text-muted-foreground font-sans">({label})</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Нажмите, чтобы вставить в позицию курсора</p>
                </div>

                {/* Editor / Preview tabs */}
                <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as any)}>
                  <TabsList className="mb-2">
                    <TabsTrigger value="code" className="gap-1.5"><Code2 className="h-3.5 w-3.5" />HTML-код</TabsTrigger>
                    <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Предпросмотр</TabsTrigger>
                  </TabsList>
                  <TabsContent value="code">
                    <Textarea
                      id="htmlContent"
                      {...register('htmlContent', { required: true })}
                      rows={20}
                      className="font-mono text-xs resize-y leading-relaxed"
                      placeholder="Вставьте или напишите HTML-код письма либо выберите шаблон выше…"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded-xl overflow-hidden bg-muted/30" style={{ height: 500 }}>
                      {htmlContent.trim() ? (
                        <iframe
                          srcDoc={htmlContent}
                          title="Предпросмотр письма"
                          className="w-full h-full"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Eye className="h-10 w-10 mb-3 opacity-20" />
                          <p className="text-sm">Добавьте HTML-содержимое, чтобы увидеть предпросмотр</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Spam score panel */}
            {(subject || htmlContent) && (
              <Card className={cn(
                'border-2 transition-colors',
                spam.level === 'good'    ? 'border-green-200 bg-green-50/50'   : '',
                spam.level === 'warning' ? 'border-yellow-200 bg-yellow-50/50' : '',
                spam.level === 'danger'  ? 'border-red-200 bg-red-50/50'       : '',
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className={cn('text-sm flex items-center gap-2',
                    spam.level === 'good' ? 'text-green-700' : spam.level === 'warning' ? 'text-yellow-700' : 'text-red-700',
                  )}>
                    {spam.level === 'good'
                      ? <ShieldCheck className="h-4 w-4" />
                      : <ShieldAlert className="h-4 w-4" />}
                    Вероятность спама:{' '}
                    <span className="font-bold text-base">{spam.score}%</span>
                    <span className="ml-auto text-xs font-normal">
                      {spam.level === 'good' ? '✅ Хорошо' : spam.level === 'warning' ? '⚠️ Требует внимания' : '🚫 Высокий риск'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {spam.checks.map((c) => (
                      <div key={c.label} className={cn('flex items-start gap-2 text-xs',
                        c.pass ? 'text-green-700' : c.weight >= 20 ? 'text-red-600 font-medium' : 'text-yellow-700',
                      )}>
                        {c.pass
                          ? <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                        <div>
                          <span>{c.label}</span>
                          {!c.pass && <p className="text-muted-foreground mt-0.5 font-normal">{c.tip}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Текстовая версия (необязательно)</CardTitle>
                <CardDescription>Для клиентов, не отображающих HTML. Оставьте пустым для автогенерации.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register('textContent')}
                  rows={5}
                  placeholder={`Здравствуйте, {{firstName}}!\n\nВаш текст здесь...\n\nОтписаться: {{unsubscribeUrl}}`}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 4: SETTINGS ── */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary" />Настройки отправки</CardTitle>
              <CardDescription>Скорость отправки и параметры отслеживания</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label>Скорость отправки (писем в час)</Label>
                <Input type="number" min={1} max={36000} step={1} {...register('throttlePerHour', { valueAsNumber: true, min: 1 })} />
                <p className="text-xs text-muted-foreground">Минимум 1/час. Низкая скорость бережёт репутацию отправителя во время прогрева.</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                  {[
                    { v: 1,    label: '1/час',    hint: 'Очень медленно' },
                    { v: 10,   label: '10/час',   hint: 'Тест' },
                    { v: 50,   label: '50/час',   hint: 'Прогрев' },
                    { v: 300,  label: '300/час',  hint: 'Медленно' },
                    { v: 1200, label: '1.2k/час', hint: 'Стандарт' },
                    { v: 3600, label: '3.6k/час', hint: 'Быстро' },
                  ].map(({ v, label, hint }) => (
                    <button key={v} type="button"
                      onClick={() => setValue('throttlePerHour', v)}
                      className={cn('p-2 rounded-lg border text-xs text-center transition-colors',
                        watch('throttlePerHour') === v ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/50',
                      )}>
                      <p className="font-semibold">{label}</p>
                      <p className="text-muted-foreground">{hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Отслеживание</p>
                {[
                  { field: 'trackOpens' as const, label: 'Отслеживать открытия', desc: 'Встраивает невидимый пиксель 1×1 для учёта открытий писем' },
                  { field: 'trackClicks' as const, label: 'Отслеживать клики', desc: 'Оборачивает ссылки, чтобы фиксировать клики перед переходом' },
                ].map(({ field, label, desc }) => (
                  <label key={field} className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors">
                    <input type="checkbox" {...register(field)} className="accent-primary mt-0.5 h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Follow-up */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Автодожим</p>
                <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors">
                  <input type="checkbox" {...register('followUpEnabled')} className="accent-primary mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">Отправить дожим, если нет ответа</p>
                    <p className="text-xs text-muted-foreground">Автоматически повторно отправлять контактам, которые не ответили</p>
                  </div>
                </label>
                {watch('followUpEnabled') && (
                  <div className="pl-3 border-l-2 border-primary/30 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Сколько дней ждать перед дожимом</Label>
                      <Input type="number" min={1} max={30} {...register('followUpDays', { valueAsNumber: true })} className="w-24" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Тема дожима (необязательно)</Label>
                      <Input {...register('followUpSubject')} placeholder={`Re: ${watch('subject') || 'ваше письмо'}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Текст дожима (необязательно, по умолчанию — исходный)</Label>
                      <textarea rows={4} {...register('followUpBody')}
                        placeholder="Здравствуйте, {{firstName}}, напоминаю о моём предыдущем письме…"
                        className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 5: REVIEW ── */}
        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" />Сводка кампании</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Название',  watch('name')],
                    ['Тема',      watch('subject')],
                    ['Прехедер',  watch('preheader') || '—'],
                    ['Отправитель', selectedSender ? `${watch('fromNameOverride') || selectedSender.fromName} <${selectedSender.fromEmail}>` : '—'],
                    ['Списки',    `${selectedLists.length} спис. • ~${totalContacts.toLocaleString()} контактов`],
                    ['Скорость',  `${watch('throttlePerHour')} писем/час`],
                    ['Отслеживание', [watch('trackOpens') && 'открытия', watch('trackClicks') && 'клики'].filter(Boolean).join(', ') || 'отключено'],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between border-b pb-2 last:border-0 last:pb-0 gap-4">
                      <dt className="text-muted-foreground shrink-0">{label}</dt>
                      <dd className="font-medium text-right truncate max-w-xs">{value as string}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {/* Spam score summary */}
            <Card className={cn('border-2',
              spam.level === 'good' ? 'border-green-200' : spam.level === 'warning' ? 'border-yellow-200' : 'border-red-200',
            )}>
              <CardHeader className="pb-2">
                <CardTitle className={cn('text-sm flex items-center justify-between',
                  spam.level === 'good' ? 'text-green-700' : spam.level === 'warning' ? 'text-yellow-700' : 'text-red-700',
                )}>
                  <span className="flex items-center gap-2">
                    {spam.level === 'good' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    Анализ спама: риск {spam.score}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {spam.checks.map((c) => (
                  <div key={c.label} className={cn('flex items-center gap-2 text-xs', c.pass ? 'text-green-700' : c.weight >= 20 ? 'text-red-600' : 'text-yellow-600')}>
                    {c.pass ? <CheckCircle className="h-3 w-3 shrink-0" /> : <AlertTriangle className="h-3 w-3 shrink-0" />}
                    {c.label}
                  </div>
                ))}
              </CardContent>
            </Card>

            {criticalFails > 0 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Нельзя сохранить: исправьте {criticalFails} обязательн. пункт(ов) выше</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />Назад
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} className="gap-2">
              Далее: {STEPS[step + 1].label}<ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={save.isPending || criticalFails > 0} className="gap-2">
              <Send className="h-4 w-4" />
              {save.isPending ? 'Сохранение…' : 'Сохранить кампанию'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
