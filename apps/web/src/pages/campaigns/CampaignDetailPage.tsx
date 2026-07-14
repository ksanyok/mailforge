import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Pause, RotateCcw, Edit2, XCircle, Trash2, X, SendHorizonal, UserX, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { campaignsApi, analyticsApi } from '@/api/index';
import { formatDate, formatPercent } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  SCHEDULED: 'Запланирована',
  SENDING: 'Отправляется',
  SENT: 'Отправлена',
  PAUSED: 'Приостановлена',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
  FAILED: 'Ошибка',
  QUEUED: 'В очереди',
};

// Soft-цветные бейджи статусов под смысл
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  DRAFT:     { bg: 'var(--surface-3)',   fg: 'var(--text-2)' },
  QUEUED:    { bg: 'var(--surface-3)',   fg: 'var(--text-2)' },
  SCHEDULED: { bg: 'var(--info-soft)',    fg: 'var(--info)' },
  SENDING:   { bg: 'var(--info-soft)',    fg: 'var(--info)' },
  SENT:      { bg: 'var(--success-soft)', fg: 'var(--success)' },
  COMPLETED: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  PAUSED:    { bg: 'var(--warn-soft)',    fg: 'var(--warn)' },
  CANCELLED: { bg: 'var(--danger-soft)',  fg: 'var(--danger)' },
  FAILED:    { bg: 'var(--danger-soft)',  fg: 'var(--danger)' },
};

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [followUpSubject, setFollowUpSubject] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recipPage, setRecipPage] = useState(1);

  const { data: campaign, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.findOne(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });
  const { data: funnel } = useQuery({
    queryKey: ['funnel', id],
    queryFn: () => analyticsApi.campaignFunnel(id!),
    enabled: !!id,
  });
  const { data: nonRespondersData } = useQuery({
    queryKey: ['non-responders', id],
    queryFn: () => campaignsApi.nonResponders(id!),
    enabled: !!id && ['SENT', 'SENDING', 'PAUSED', 'CANCELLED'].includes((campaign as any)?.status ?? ''),
  });
  const nr = nonRespondersData as { total: number; responded: number; notResponded: number } | undefined;

  const { data: recipRaw } = useQuery({
    queryKey: ['recipients', id, recipPage],
    queryFn: () => campaignsApi.recipients(id!, { page: recipPage, limit: 25 }),
    enabled: !!id,
    refetchInterval: 8000,
  });
  const recipients = ((recipRaw as any)?.data ?? []) as any[];
  const recipTotal = ((recipRaw as any)?.total ?? 0) as number;
  const recipPages = ((recipRaw as any)?.totalPages ?? 1) as number;

  const dispatch = useMutation({
    mutationFn: () => campaignsApi.dispatch(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign', id] }); toast({ title: 'Кампания запущена' }); refetch(); },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось запустить кампанию', variant: 'destructive' }),
  });

  const pause = useMutation({
    mutationFn: () => campaignsApi.pause(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign', id] }); toast({ title: 'Кампания приостановлена' }); },
  });

  const resume = useMutation({
    mutationFn: () => campaignsApi.resume(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign', id] }); toast({ title: 'Кампания возобновлена' }); },
  });

  const cancel = useMutation({
    mutationFn: () => campaignsApi.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', id] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setCancelConfirm(false);
      toast({ title: 'Кампания отменена' });
    },
    onError: () => toast({ title: 'Не удалось отменить кампанию', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: () => campaignsApi.remove(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Кампания удалена' });
      navigate('/campaigns');
    },
    onError: () => toast({ title: 'Не удалось удалить кампанию', variant: 'destructive' }),
  });

  const createFollowUp = useMutation({
    mutationFn: () => campaignsApi.createFollowUp(id!, followUpSubject ? { subject: followUpSubject } : undefined),
    onSuccess: (res: any) => {
      toast({ title: `Дожимная кампания создана: получателей ${nr?.notResponded ?? 0}` });
      setShowFollowUp(false);
      navigate(`/campaigns/${res.id}`);
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message ?? 'Не удалось создать дожимную кампанию', variant: 'destructive' }),
  });

  const c = campaign as Record<string, unknown> | undefined;
  const funnelData = funnel as { stage: string; count: number }[] | undefined;

  if (!c) return <div className="text-muted-foreground p-4">Загрузка…</div>;

  const status = c.status as string;

  const stats = [
    { label: 'Получатели', value: c.totalRecipients as number, color: 'var(--text)' },
    { label: 'Отправлено', value: c.sentCount as number, color: 'var(--text)' },
    { label: 'Открыли', value: c.uniqueOpenCount as number, color: 'var(--success)' },
    { label: 'Кликнули', value: c.uniqueClickCount as number, color: 'var(--info)' },
    { label: 'Отказы', value: c.bounceCount as number, color: 'var(--danger)' },
    { label: 'Отписались', value: c.unsubscribeCount as number, color: 'var(--text-2)' },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Actions bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Назад
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${id}/edit`)}>
          <Edit2 className="h-4 w-4 mr-2" />Изменить
        </Button>

        {status === 'DRAFT' && (
          <Button size="sm" className="gap-2" onClick={() => dispatch.mutate()} disabled={dispatch.isPending}>
            <Play className="h-4 w-4" />
            {dispatch.isPending ? 'Запуск…' : 'Запустить кампанию'}
          </Button>
        )}
        {status === 'SENDING' && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => pause.mutate()} disabled={pause.isPending}>
            <Pause className="h-4 w-4" />Приостановить
          </Button>
        )}
        {status === 'PAUSED' && (
          <Button size="sm" className="gap-2" onClick={() => resume.mutate()} disabled={resume.isPending}>
            <RotateCcw className="h-4 w-4" />Возобновить
          </Button>
        )}

        {/* Cancel — for active/paused campaigns */}
        {['SENDING', 'PAUSED'].includes(status) && (
          cancelConfirm ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                <XCircle className="h-4 w-4 mr-1" />{cancel.isPending ? 'Отмена…' : 'Подтвердить отмену'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCancelConfirm(false)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="gap-2 text-warn border-warn/40 hover:bg-warn-soft" onClick={() => setCancelConfirm(true)}>
              <XCircle className="h-4 w-4" />Отменить кампанию
            </Button>
          )
        )}

        {/* Delete — for draft and cancelled/sent campaigns */}
        {['DRAFT', 'CANCELLED', 'SENT'].includes(status) && (
          deleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4 mr-1" />{remove.isPending ? 'Удаление…' : 'Подтвердить удаление'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="gap-2 text-danger border-danger/40 hover:bg-danger-soft" onClick={() => setDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4" />Удалить
            </Button>
          )
        )}
      </div>

      {/* Campaign header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold tracking-[-0.3px] truncate">{c.name as string}</h2>
          <p className="text-[12.5px] text-ink-3 truncate">{c.subject as string}</p>
        </div>
        <span
          className="shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded"
          style={STATUS_STYLE[status] ? { background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].fg } : { background: 'var(--surface-3)', color: 'var(--text-2)' }}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Draft hint */}
      {status === 'DRAFT' && (
        <div
          className="rounded-xl border px-4 py-3 text-[13px] flex items-center gap-2"
          style={{ borderColor: 'var(--warn)', background: 'var(--warn-soft)', color: 'var(--warn)' }}
        >
          <Play className="h-4 w-4 shrink-0" />
          Кампания готова. Нажмите <strong>Запустить кампанию</strong>, чтобы начать отправку.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 shadow-soft text-center">
            <p className="text-[22px] font-extrabold font-mono tracking-[-0.5px]" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[12px] text-ink-3 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Response summary + Follow-up */}
      {nr && (c.sentCount as number) > 0 && (
        <Card
          className="border-2"
          style={nr.notResponded === 0
            ? { borderColor: 'var(--success)', background: 'var(--success-soft)' }
            : { borderColor: 'var(--info)', background: 'var(--info-soft)' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success)' }} />
                  <div>
                    <p className="text-xl font-extrabold font-mono" style={{ color: 'var(--success)' }}>{nr.responded}</p>
                    <p className="text-[11px] text-ink-3">Открыли / Кликнули</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-ink-3" />
                  <div>
                    <p className="text-xl font-extrabold font-mono text-ink">{nr.notResponded}</p>
                    <p className="text-[11px] text-ink-3">Не открыли</p>
                  </div>
                </div>
                <div className="text-[11px] text-ink-3">
                  из <span className="font-mono">{nr.total}</span> отправленных
                </div>
              </div>

              {nr.notResponded > 0 && ['SENT', 'CANCELLED', 'PAUSED'].includes(status) && (
                <div>
                  {showFollowUp ? (
                    <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-right-2">
                      <input
                        value={followUpSubject}
                        onChange={(e) => setFollowUpSubject(e.target.value)}
                        placeholder={`Re: ${c.subject as string}`}
                        className="text-sm bg-surface-2 border border-border rounded-[10px] px-3 py-1.5 w-64 outline-none focus:ring-2 focus:ring-brand/40"
                      />
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => createFollowUp.mutate()}
                        disabled={createFollowUp.isPending}
                      >
                        <SendHorizonal className="h-3.5 w-3.5" />
                        {createFollowUp.isPending ? 'Создание…' : `Отправить дожим ${nr.notResponded} не открывшим`}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowFollowUp(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setShowFollowUp(true)}
                    >
                      <SendHorizonal className="h-3.5 w-3.5" />
                      Дожать {nr.notResponded} не открывших
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rates */}
      {(c.sentCount as number) > 0 && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-soft text-center">
            <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--success)' }}>{formatPercent(c.uniqueOpenCount as number, c.sentCount as number)}</p>
            <p className="text-[12px] text-ink-3 mt-0.5">Процент открытий</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 shadow-soft text-center">
            <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--info)' }}>{formatPercent(c.uniqueClickCount as number, c.sentCount as number)}</p>
            <p className="text-[12px] text-ink-3 mt-0.5">Процент кликов</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 shadow-soft text-center">
            <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--danger)' }}>{formatPercent(c.bounceCount as number, c.sentCount as number)}</p>
            <p className="text-[12px] text-ink-3 mt-0.5">Процент отказов</p>
          </div>
        </div>
      )}

      {/* Funnel */}
      {funnelData && funnelData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Воронка кампании</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Follow-up info */}
      {c.followUpEnabled && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-indigo-500" />
            Дожим настроен
          </CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Автодожим через <strong className="text-foreground">{c.followUpDays as number} дн.</strong> без ответа.
            {c.followUpSentAt && <span> Последняя отправка: {formatDate(c.followUpSentAt as string)}</span>}
          </CardContent>
        </Card>
      )}

      {/* Recipients */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">
            Получатели <span className="font-mono text-ink-3 font-normal">{recipTotal}</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            Просмотреть письмо
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-ink-3">
                  <th className="font-medium px-4 py-2">Контакт</th>
                  <th className="font-medium px-3 py-2">Статус</th>
                  <th className="font-medium px-3 py-2">Отправлено</th>
                  <th className="font-medium px-3 py-2 text-center">Открыл</th>
                  <th className="font-medium px-3 py-2 text-center">Ответил</th>
                  <th className="font-medium px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => {
                  const st = (r.status as string) ?? 'PENDING';
                  const nm = [r.contact?.firstName, r.contact?.lastName].filter(Boolean).join(' ');
                  return (
                    <tr key={r.id} className="border-b border-border hover:bg-hover">
                      <td className="px-4 py-2.5">
                        <button onClick={() => navigate(`/contacts/${r.contactId}`)} className="text-left group">
                          <div className="font-semibold text-ink group-hover:text-brand transition-colors">{nm || r.contact?.email}</div>
                          <div className="text-[11px] text-ink-3">{r.contact?.email}</div>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: (STATUS_STYLE[st] ?? STATUS_STYLE.QUEUED).bg, color: (STATUS_STYLE[st] ?? STATUS_STYLE.QUEUED).fg }}>
                          {STATUS_LABELS[st] ?? st}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-ink-2">
                        {r.sentAt ? new Date(r.sentAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {r.opened ? <CheckCircle2 className="h-4 w-4 inline" style={{ color: 'var(--success)' }} /> : <span className="text-ink-3">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {r.responded ? <CheckCircle2 className="h-4 w-4 inline" style={{ color: 'var(--info)' }} /> : <span className="text-ink-3">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => navigate('/inbox')} className="text-[11.5px] text-brand hover:underline">Инбокс →</button>
                      </td>
                    </tr>
                  );
                })}
                {recipients.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-ink-3">Получателей пока нет</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {recipPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[12px]">
              <button disabled={recipPage <= 1} onClick={() => setRecipPage((p) => p - 1)} className="text-ink-2 disabled:text-ink-3 disabled:cursor-not-allowed">← Назад</button>
              <span className="text-ink-3 font-mono">{recipPage} / {recipPages}</span>
              <button disabled={recipPage >= recipPages} onClick={() => setRecipPage((p) => p + 1)} className="text-ink-2 disabled:text-ink-3 disabled:cursor-not-allowed">Далее →</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email preview modal */}
      {showPreview && c && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-surface rounded-xl shadow-soft-lg w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="min-w-0">
                <div className="text-[11px] text-ink-3">Тема</div>
                <div className="font-semibold text-[13.5px] truncate">
                  {String(c.subject ?? '')
                    .replace(/\{\{\s*firstName\s*\}\}/g, "Ім'я")
                    .replace(/\{\{\s*company\s*\}\}/g, 'Компанія')}
                </div>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-ink-3 hover:text-ink"><X className="h-5 w-5" /></button>
            </div>
            <iframe
              title="preview"
              className="flex-1 w-full rounded-b-xl bg-white"
              style={{ minHeight: 360 }}
              srcDoc={String(c.htmlContent ?? '')
                .replace(/\{\{\s*firstName\s*\}\}/g, "Ім'я")
                .replace(/\{\{\s*lastName\s*\}\}/g, 'Прізвище')
                .replace(/\{\{\s*company\s*\}\}/g, 'Компанія')
                .replace(/\{\{\s*website\s*\}\}/g, 'example.com')
                .replace(/\{\{\s*senderName\s*\}\}/g, 'Олександр Коваль')
                .replace(/\{\{\s*unsubscribeUrl\s*\}\}/g, '#')}
            />
          </div>
        </div>
      )}

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Детали</CardTitle></CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-2">
          <div className="text-muted-foreground">Создана</div><div>{formatDate(c.createdAt as string)}</div>
          {c.scheduledAt && <><div className="text-muted-foreground">Запланирована</div><div>{formatDate(c.scheduledAt as string)}</div></>}
          {c.startedAt && <><div className="text-muted-foreground">Запущена</div><div>{formatDate(c.startedAt as string)}</div></>}
          {c.completedAt && <><div className="text-muted-foreground">Завершена</div><div>{formatDate(c.completedAt as string)}</div></>}
        </CardContent>
      </Card>
    </div>
  );
}
