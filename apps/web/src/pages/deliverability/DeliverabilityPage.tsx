import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, MessageSquare, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deliverabilityApi, sendersApi, inboxApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { STATUS_COLORS } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Sender { id: string; name: string; fromEmail: string; }
interface Check { id: string; checkType: string; status: string; value?: string; recommendation?: string; checkedAt: string; }
interface Conversation { contactEmail: string; contactName: string; senderId: string; senderEmail: string; lastMessage: string; lastMessageAt: string; unreadCount: number; }

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

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {sendersArr.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSender(s.id)}
            className={cn('px-3 py-1.5 rounded-md text-sm border transition-colors', selectedSender === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted')}
          >
            {s.name}
          </button>
        ))}
      </div>

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
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {senderConvs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checks" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => runChecks.mutate()} disabled={runChecks.isPending}>
                <RefreshCw className={cn('h-4 w-4 mr-2', runChecks.isPending && 'animate-spin')} />
                {runChecks.isPending ? 'Выполняется…' : 'Запустить проверки'}
              </Button>
            </div>
            <div className="grid gap-3">
              {checkOrder.map((type) => {
                const check = checksArr.find((c) => c.checkType === type);
                return (
                  <Card key={type}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="w-20">
                        <p className="font-mono font-bold text-sm">{type}</p>
                      </div>
                      {check ? (
                        <div className="flex-1">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[check.status] ?? 'bg-gray-100')}>
                            {check.status}
                          </span>
                          {check.value && <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{check.value}</p>}
                          {check.recommendation && <p className="text-xs text-orange-600 mt-1">{check.recommendation}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ещё не проверено</span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {checksArr.length === 0 && !runChecks.isPending && (
                <div className="text-center py-8 text-muted-foreground text-sm">Запустите проверки, чтобы увидеть статус доставляемости для этого отправителя.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="respondents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Клиенты, ответившие этому отправителю</CardTitle>
              </CardHeader>
              <CardContent>
                {senderConvs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Для этого отправителя пока нет ответов.
                  </div>
                ) : (
                  <div className="divide-y">
                    {senderConvs.map((c) => (
                      <div key={c.contactEmail} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.contactName || c.contactEmail}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.contactEmail}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate italic">"{c.lastMessage}"</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{c.unreadCount} новых</span>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-muted-foreground">Выберите отправителя, чтобы посмотреть данные о доставляемости.</div>
      )}
    </div>
  );
}
