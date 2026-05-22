import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deliverabilityApi, sendersApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { STATUS_COLORS } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Sender { id: string; name: string; fromEmail: string; }
interface Check { id: string; checkType: string; status: string; value?: string; recommendation?: string; checkedAt: string; }

export function DeliverabilityPage() {
  const qc = useQueryClient();
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const { data: senders } = useQuery({ queryKey: ['senders'], queryFn: () => sendersApi.findAll() });
  const sendersArr = ((senders as any)?.data ?? []) as Sender[];

  const { data: checks } = useQuery({
    queryKey: ['deliverability', selectedSender],
    queryFn: () => deliverabilityApi.bySender(selectedSender!),
    enabled: !!selectedSender,
  });

  const checksArr = ((checks as any)?.data ?? (Array.isArray(checks) ? checks : [])) as Check[];

  const runChecks = useMutation({
    mutationFn: () => deliverabilityApi.runChecks(selectedSender!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliverability'] }); toast({ title: 'Checks completed' }); },
    onError: () => toast({ title: 'Checks failed', variant: 'destructive' }),
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

      {selectedSender && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => runChecks.mutate()} disabled={runChecks.isPending}>
              <RefreshCw className={cn('h-4 w-4 mr-2', runChecks.isPending && 'animate-spin')} />
              {runChecks.isPending ? 'Running...' : 'Run Checks'}
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
                      <span className="text-xs text-muted-foreground">Not checked yet</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {checksArr.length === 0 && !runChecks.isPending && (
              <div className="text-center py-8 text-muted-foreground text-sm">Run checks to see deliverability status for this sender.</div>
            )}
          </div>
        </div>
      )}

      {!selectedSender && (
        <div className="text-center py-12 text-muted-foreground">Select a sender account to view deliverability checks.</div>
      )}
    </div>
  );
}
