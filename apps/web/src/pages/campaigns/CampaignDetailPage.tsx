import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Pause, RotateCcw, Edit2, XCircle, Trash2, X, SendHorizonal, UserX, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { campaignsApi, analyticsApi } from '@/api/index';
import { formatDate, formatPercent, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
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

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [followUpSubject, setFollowUpSubject] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);

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
    { label: 'Получатели', value: c.totalRecipients as number },
    { label: 'Отправлено', value: c.sentCount as number },
    { label: 'Открыли', value: c.uniqueOpenCount as number },
    { label: 'Кликнули', value: c.uniqueClickCount as number },
    { label: 'Отказы', value: c.bounceCount as number },
    { label: 'Отписались', value: c.unsubscribeCount as number },
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
          <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => dispatch.mutate()} disabled={dispatch.isPending}>
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
            <Button size="sm" variant="outline" className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setCancelConfirm(true)}>
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
            <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50" onClick={() => setDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4" />Удалить
            </Button>
          )
        )}
      </div>

      {/* Campaign header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{c.name as string}</h2>
          <p className="text-sm text-muted-foreground">{c.subject as string}</p>
        </div>
        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_COLORS[status] ?? 'bg-gray-100')}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Draft hint */}
      {status === 'DRAFT' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Play className="h-4 w-4 shrink-0" />
          Кампания готова. Нажмите <strong>Запустить кампанию</strong>, чтобы начать отправку.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Response summary + Follow-up */}
      {nr && (c.sentCount as number) > 0 && (
        <Card className={cn(
          'border-2',
          nr.notResponded === 0 ? 'border-green-200 bg-green-50/40' : 'border-blue-200 bg-blue-50/30',
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xl font-bold text-green-700">{nr.responded}</p>
                    <p className="text-xs text-muted-foreground">Открыли / Кликнули</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xl font-bold text-gray-700">{nr.notResponded}</p>
                    <p className="text-xs text-muted-foreground">Не открыли</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  из {nr.total} отправленных
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
                        className="text-sm border rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
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
                      className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
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
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Card><CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-green-600">{formatPercent(c.uniqueOpenCount as number, c.sentCount as number)}</p>
            <p className="text-xs text-muted-foreground">Процент открытий</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-blue-600">{formatPercent(c.uniqueClickCount as number, c.sentCount as number)}</p>
            <p className="text-xs text-muted-foreground">Процент кликов</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-red-600">{formatPercent(c.bounceCount as number, c.sentCount as number)}</p>
            <p className="text-xs text-muted-foreground">Процент отказов</p>
          </CardContent></Card>
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
