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
  throttlePerMinute: number; trackOpens: boolean; trackClicks: boolean;
}

const STEPS = [
  { label: 'Тема',       icon: FileText,   hint: 'Название, тема, прехедер' },
  { label: 'Отправитель',icon: Mail,        hint: 'Откуда придёт письмо' },
  { label: 'Получатели', icon: Users,       hint: 'Списки контактов' },
  { label: 'Письмо',     icon: Code2,       hint: 'HTML-редактор + превью' },
  { label: 'Настройки',  icon: Settings2,   hint: 'Скорость, трекинг' },
  { label: 'Проверка',   icon: CheckCircle, hint: 'Финальный чеклист' },
];

const VARIABLES = [
  { v: '{{firstName}}',    label: 'Имя' },
  { v: '{{lastName}}',     label: 'Фамилия' },
  { v: '{{email}}',        label: 'Email' },
  { v: '{{unsubscribeUrl}}', label: 'Отписка ⚠️', required: true },
];

export function CampaignBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [contentTab, setContentTab] = useState<'code' | 'preview'>('code');

  const { register, handleSubmit, setValue, watch } = useForm<BuilderForm>({
    defaultValues: { throttlePerMinute: 60, trackOpens: true, trackClicks: true },
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
    ...DEMO_TEMPLATES.map((d) => ({ id: d.id, name: `${d.name} (демо)`, htmlContent: d.htmlContent })),
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
      toast({ title: err?.response?.data?.message ?? 'Ошибка сохранения', variant: 'destructive' });
    },
  });

  const onSubmit = (data: BuilderForm) => {
    if (selectedLists.length === 0) { toast({ title: 'Выбери хотя бы один список', variant: 'destructive' }); setStep(2); return; }
    save.mutate({ ...data, listIds: selectedLists });
  };

  const goNext = () => {
    if (step === 0 && !watch('name')) { toast({ title: 'Введи название кампании', variant: 'destructive' }); return; }
    if (step === 0 && !watch('subject')) { toast({ title: 'Введи тему письма', variant: 'destructive' }); return; }
    if (step === 1 && !senderId) { toast({ title: 'Выбери отправителя', variant: 'destructive' }); return; }
    if (step === 2 && selectedLists.length === 0) { toast({ title: 'Выбери хотя бы один список', variant: 'destructive' }); return; }
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Назад
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{id ? 'Редактировать кампанию' : 'Новая кампания'}</h1>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {STEPS.map(({ label, icon: Icon, hint }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => i < step && setStep(i)}
            title={hint}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              i === step   ? 'bg-primary text-primary-foreground shadow-sm'   : '',
              i < step     ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' : '',
              i > step     ? 'text-muted-foreground cursor-default'            : '',
            )}
          >
            {i < step ? <CheckCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{label}</span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-1" />}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── STEP 0: BASICS ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" />Основная информация</CardTitle>
              <CardDescription>Придумай название, тему и прехедер</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Название кампании <span className="text-red-500">*</span></Label>
                <Input {...register('name', { required: true })} placeholder="Майский дайджест, Чёрная пятница…" />
                <p className="text-xs text-muted-foreground">Внутреннее название — получатели его не видят</p>
              </div>
              <div className="space-y-1.5">
                <Label>Тема письма (subject) <span className="text-red-500">*</span></Label>
                <Input {...register('subject', { required: true })} placeholder="Например: 🚀 Новые функции которые изменят твою работу" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Это то, что видит получатель в папке Входящие. 40–60 символов — оптимально.</p>
                  <span className={cn('text-xs font-medium', subject.length > 70 ? 'text-red-500' : subject.length > 50 ? 'text-yellow-500' : 'text-green-600')}>
                    {subject.length} симв.
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Прехедер (preheader)</Label>
                <Input {...register('preheader')} placeholder="Текст предпросмотра после темы письма, 80–100 символов" />
                <p className="text-xs text-muted-foreground">Краткий анонс, виден рядом с темой в большинстве почтовых клиентов</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 1: SENDER ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-primary" />Отправитель</CardTitle>
              <CardDescription>Выбери SMTP-аккаунт и при необходимости переопредели имя отправителя</CardDescription>
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
                        <span className="text-xs text-muted-foreground">Рейтинг: <span className={cn('font-bold', s.healthScore >= 70 ? 'text-green-600' : s.healthScore >= 40 ? 'text-yellow-600' : 'text-red-600')}>{s.healthScore}</span></span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>{s.status}</span>
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
                    Если указать — в поле «От:» будет это имя вместо имени SMTP-аккаунта
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
              <CardDescription>Выбери один или несколько списков контактов</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {listsArr.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Нет списков контактов.{' '}
                  <button type="button" className="text-primary underline" onClick={() => navigate('/lists')}>Создать список →</button>
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
                  Итого ~{totalContacts.toLocaleString()} контактов (до дедупликации и фильтра отписавшихся)
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
                <CardDescription>Редактируй HTML или смотри превью вживую</CardDescription>
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
                      <SelectValue placeholder="— Выбери шаблон —" />
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
                        title={required ? 'Обязательна для соответствия требованиям закона' : undefined}
                      >
                        {v} <span className="text-muted-foreground font-sans">({label})</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Клик — вставка в позицию курсора</p>
                </div>

                {/* Editor / Preview tabs */}
                <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as any)}>
                  <TabsList className="mb-2">
                    <TabsTrigger value="code" className="gap-1.5"><Code2 className="h-3.5 w-3.5" />HTML-код</TabsTrigger>
                    <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Превью</TabsTrigger>
                  </TabsList>
                  <TabsContent value="code">
                    <Textarea
                      id="htmlContent"
                      {...register('htmlContent', { required: true })}
                      rows={20}
                      className="font-mono text-xs resize-y leading-relaxed"
                      placeholder="Вставь или напиши HTML-код письма, или выбери шаблон выше…"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded-xl overflow-hidden bg-muted/30" style={{ height: 500 }}>
                      {htmlContent.trim() ? (
                        <iframe
                          srcDoc={htmlContent}
                          title="Превью письма"
                          className="w-full h-full"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Eye className="h-10 w-10 mb-3 opacity-20" />
                          <p className="text-sm">Добавь HTML-код чтобы увидеть превью</p>
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
                    Вероятность попасть в спам:{' '}
                    <span className="font-bold text-base">{spam.score}%</span>
                    <span className="ml-auto text-xs font-normal">
                      {spam.level === 'good' ? '✅ Хорошо' : spam.level === 'warning' ? '⚠️ Есть замечания' : '🚫 Высокий риск'}
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
                <CardDescription>Для клиентов которые не отображают HTML. Если пусто — генерируется автоматически.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register('textContent')}
                  rows={5}
                  placeholder={`Привет, {{firstName}}!\n\nТекст письма здесь...\n\nОтписаться: {{unsubscribeUrl}}`}
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
              <CardDescription>Скорость рассылки и параметры трекинга</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label>Скорость отправки (писем в минуту)</Label>
                <Input type="number" min={1} max={500} {...register('throttlePerMinute', { valueAsNumber: true })} />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[{ v: 20, label: 'Медленно', hint: 'Лучше репутация' },
                    { v: 60, label: 'Стандарт',  hint: 'Рекомендуем' },
                    { v: 200, label: 'Быстро', hint: 'Для больших баз' }].map(({ v, label, hint }) => (
                    <button key={v} type="button"
                      onClick={() => setValue('throttlePerMinute', v)}
                      className={cn('p-2 rounded-lg border text-xs text-center transition-colors',
                        watch('throttlePerMinute') === v ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/50',
                      )}>
                      <p className="font-semibold">{v}/мин</p>
                      <p className="text-muted-foreground">{label}</p>
                      <p className="text-muted-foreground">{hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Трекинг</p>
                {[
                  { field: 'trackOpens' as const, label: 'Отслеживать открытия', desc: 'Встраивает невидимый пиксель 1×1 для фиксации открытий письма' },
                  { field: 'trackClicks' as const, label: 'Отслеживать клики', desc: 'Оборачивает ссылки — клики фиксируются до перехода на сайт' },
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
            </CardContent>
          </Card>
        )}

        {/* ── STEP 5: REVIEW ── */}
        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4 text-primary" />Итоговая сводка</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Название',   watch('name')],
                    ['Тема',       watch('subject')],
                    ['Прехедер',   watch('preheader') || '—'],
                    ['Отправитель', selectedSender ? `${watch('fromNameOverride') || selectedSender.fromName} <${selectedSender.fromEmail}>` : '—'],
                    ['Списки',     `${selectedLists.length} список(ов) • ~${totalContacts.toLocaleString()} контактов`],
                    ['Скорость',   `${watch('throttlePerMinute')} писем/мин`],
                    ['Трекинг',    [watch('trackOpens') && 'открытия', watch('trackClicks') && 'клики'].filter(Boolean).join(', ') || 'отключён'],
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
                    Спам-анализ: {spam.score}% риска
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
                <span>Нельзя сохранить: исправь {criticalFails} обязательных пункта выше</span>
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
              Далее<ArrowRight className="h-4 w-4" />
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
