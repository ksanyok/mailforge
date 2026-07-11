import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, MessageSquare, Mail, Check, X, AlertTriangle, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deliverabilityApi, sendersApi, inboxApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Sender { id: string; name: string; fromEmail: string; }
interface Check { id: string; checkType: string; status: string; value?: string; recommendation?: string; checkedAt: string; }
interface Conversation { contactEmail: string; contactName: string; senderId: string; senderEmail: string; lastMessage: string; lastMessageAt: string; unreadCount: number; }

const STATUS_META: Record<string, { chip: string; label: string; Icon: typeof Check }> = {
  PASS: { chip: 'bg-success-soft text-success', label: 'PASS', Icon: Check },
  FAIL: { chip: 'bg-danger-soft text-danger', label: 'FAIL', Icon: X },
  WARNING: { chip: 'bg-warn-soft text-warn', label: 'WARN', Icon: AlertTriangle },
  UNKNOWN: { chip: 'bg-surface-3 text-ink-3', label: '—', Icon: Minus },
};

const CHECK_LABELS: Record<string, string> = {
  SPF: 'SPF', DKIM: 'DKIM', DMARC: 'DMARC', MX: 'MX',
  RDNS: 'rDNS', SMTP: 'SMTP', BLACKLIST: 'Чёрные списки',
};

export function DeliverabilityPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const sendersArr = ((senders as any)?.data ?? []) as Sender[];

  const { data: checks } = useQuery({
    queryKey: ['deliverability', selectedSender],
    queryFn: () => deliverabilityApi.bySender(selectedSender!),
    enabled: !!selectedSender,
  });

  const { data: conversations } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.conversations(),
    staleTime: 30_000,
    enabled: !!selectedSender,
  });

  const checksArr = ((checks as any)?.data ?? (Array.isArray(checks) ? checks : [])) as Check[];
  const allConvs = (Array.isArray(conversations) ? conversations : []) as Conversation[];
  const senderConvs = selectedSender ? allConvs.filter((c) => c.senderId === selectedSender) : [];

  const runChecks = useMutation({
    mutationFn: () => deliverabilityApi.runChecks(selectedSender!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliverability'] }); toast({ title: 'Проверки завершены' }); },
    onError: () => toast({ title: 'Не удалось выполнить проверки', variant: 'destructive' }),
  });

  const checkOrder = ['SPF', 'DKIM', 'DMARC', 'MX', 'RDNS', 'SMTP', 'BLACKLIST'];

  const passed = checksArr.filter((c) => c.status === 'PASS').length;
  const warned = checksArr.filter((c) => c.status === 'WARNING').length;
  const failed = checksArr.filter((c) => c.status === 'FAIL').length;
  const totalDone = checksArr.length;
  const score = totalDone > 0 ? Math.round((passed / totalDone) * 100) : 0;
  const scoreColor = failed > 0 ? 'var(--danger)' : score >= 80 ? 'var(--success)' : 'var(--warn)';
  const scoreLabel = failed > 0 ? 'Требуются исправления' : score >= 80 ? 'Хорошая репутация' : 'Требует внимания';
  const selectedSenderObj = sendersArr.find((s) => s.id === selectedSender);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Доставляемость</h1>
          <p className="text-ink-3 text-[12.5px]">DNS и SMTP-проверки для ваших отправляющих доменов</p>
        </div>
        <div className="flex-1" />
        {selectedSender && (
          <button
            onClick={() => runChecks.mutate()}
            disabled={runChecks.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-white font-semibold text-[13px] shadow-[0_6px_16px_-6px_var(--accent)] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] hover:brightness-105 disabled:opacity-60 transition-[filter]"
          >
            <RefreshCw className={cn('h-[15px] w-[15px]', runChecks.isPending && 'animate-spin')} strokeWidth={2} />
            {runChecks.isPending ? 'Выполняется…' : 'Запустить проверку'}
          </button>
        )}
      </div>

      {/* Sender selector */}
      {sendersArr.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {sendersArr.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSender(s.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors',
                selectedSender === s.id
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-border bg-surface-2 text-ink-2 hover:bg-hover',
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: selectedSender === s.id ? 'var(--accent)' : 'var(--text-3)' }}
              />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {selectedSender ? (
        <Tabs defaultValue="checks">
          <TabsList>
            <TabsTrigger value="checks">
              <Mail className="h-3.5 w-3.5 mr-1.5" />Технические проверки
            </TabsTrigger>
            <TabsTrigger value="respondents">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Ответившие
              {senderConvs.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold">
                  {senderConvs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checks" className="mt-4">
            {totalDone === 0 ? (
              <div className="rounded-xl border border-border bg-surface shadow-soft p-10 text-center">
                <div
                  className="w-[34px] h-[34px] rounded-[9px] mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--info-soft)', color: 'var(--info)' }}
                >
                  <Mail className="h-4 w-4" strokeWidth={1.7} />
                </div>
                <p className="text-[13px] text-ink-2 font-medium">Проверки ещё не запускались</p>
                <p className="text-[12.5px] text-ink-3 mt-1">
                  Запустите проверку, чтобы увидеть статус доставляемости для «{selectedSenderObj?.name}».
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
                {/* Score card */}
                <div className="bg-surface border border-border rounded-xl p-[22px] shadow-soft text-center">
                  <div
                    className="relative w-[130px] h-[130px] mx-auto mb-3.5 rounded-full flex items-center justify-center"
                    style={{ background: `conic-gradient(${scoreColor} ${score * 3.6}deg, var(--surface-3) 0deg)` }}
                  >
                    <div className="w-[104px] h-[104px] rounded-full bg-surface flex flex-col items-center justify-center">
                      <span className="text-[32px] font-extrabold font-mono" style={{ color: scoreColor }}>{score}</span>
                      <span className="text-[11px] text-ink-3">из 100</span>
                    </div>
                  </div>
                  <div className="font-bold text-[15px]">{scoreLabel}</div>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    {passed} проверок пройдено{warned > 0 ? `, ${warned} требует внимания` : ''}
                    {failed > 0 ? `, ${failed} с ошибками` : ''}.
                  </p>
                  <div className="flex gap-2.5 mt-4 pt-4 border-t border-border">
                    <div className="flex-1">
                      <div className="text-[20px] font-extrabold font-mono text-success">{passed}</div>
                      <div className="text-[11px] text-ink-3">Пройдено</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[20px] font-extrabold font-mono text-warn">{warned}</div>
                      <div className="text-[11px] text-ink-3">Внимание</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[20px] font-extrabold font-mono text-danger">{failed}</div>
                      <div className="text-[11px] text-ink-3">Ошибки</div>
                    </div>
                  </div>
                </div>

                {/* Checks list */}
                <div className="bg-surface border border-border rounded-xl shadow-soft overflow-hidden">
                  {checkOrder.map((type) => {
                    const check = checksArr.find((c) => c.checkType === type);
                    const meta = STATUS_META[check?.status ?? 'UNKNOWN'] ?? STATUS_META.UNKNOWN;
                    const ChipIcon = meta.Icon;
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-3.5 px-[18px] py-[15px] border-b border-border last:border-b-0 hover:bg-hover transition-colors"
                      >
                        <div
                          className={cn('w-[34px] h-[34px] flex-none rounded-[9px] flex items-center justify-center', meta.chip)}
                          title={meta.label}
                        >
                          <ChipIcon className="h-4 w-4" strokeWidth={2.2} />
                        </div>
                        <div className="w-[110px] flex-none font-bold text-[13.5px]">{CHECK_LABELS[type] ?? type}</div>
                        <div className="flex-1 min-w-0">
                          {check ? (
                            <>
                              <p className="text-[12.5px] text-ink-2 font-mono truncate">
                                {check.value || meta.label}
                              </p>
                              {check.recommendation && (
                                <p className="text-[11.5px] text-warn truncate mt-0.5">{check.recommendation}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-[12.5px] text-ink-3">Ещё не проверено</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="respondents" className="mt-4">
            <div className="bg-surface border border-border rounded-xl shadow-soft overflow-hidden">
              <div className="px-[18px] py-4 border-b border-border">
                <div className="font-bold text-[15px]">Клиенты, ответившие этому отправителю</div>
                <div className="text-[12px] text-ink-3 mt-0.5">Диалоги, связанные с «{selectedSenderObj?.name}»</div>
              </div>
              {senderConvs.length === 0 ? (
                <div className="text-center py-10 text-ink-3 text-[12.5px]">
                  Для этого отправителя пока нет ответов.
                </div>
              ) : (
                <div>
                  {senderConvs.map((c) => (
                    <div
                      key={c.contactEmail}
                      className="flex items-center justify-between gap-4 px-[18px] py-3.5 border-b border-border last:border-b-0 hover:bg-hover transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{c.contactName || c.contactEmail}</p>
                        <p className="text-[12px] text-ink-3 truncate font-mono">{c.contactEmail}</p>
                        <p className="text-[12px] text-ink-3 mt-0.5 truncate italic">«{c.lastMessage}»</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-brand-soft text-brand text-[10.5px] font-semibold">
                            {c.unreadCount} новых
                          </span>
                        )}
                        <Button
                          size="sm" variant="outline"
                          onClick={() => navigate(`/inbox?senderId=${encodeURIComponent(c.senderId)}&contactEmail=${encodeURIComponent(c.contactEmail)}`)}
                        >
                          Открыть
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-soft p-12 text-center text-ink-3 text-[13px]">
          Выберите отправителя, чтобы посмотреть данные о доставляемости.
        </div>
      )}
    </div>
  );
}
