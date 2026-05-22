import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { warmupApi, sendersApi } from '@/api/index';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

interface WarmupEntry { senderId: string; sender: { name: string; fromEmail: string }; warmupRule?: Record<string, unknown>; warmupCurrentDailyLimit: number; warmupStage: number; }

export function WarmupPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['warmup'], queryFn: () => warmupApi.findAll() });
  const entries = (data as WarmupEntry[]) ?? [];
  const [selectedSender, setSelectedSender] = useState<string | null>(null);

  const { data: logs } = useQuery({
    queryKey: ['warmup-logs', selectedSender],
    queryFn: () => warmupApi.logs(selectedSender!, { limit: 30 }),
    enabled: !!selectedSender,
  });

  const logsData = (logs as { date: string; targetVolume: number; actualVolume: number; openRate: number; bounceRate: number }[]) ?? [];

  const { register, handleSubmit } = useForm<{
    initialDailyVolume: number; dailyIncreasePercent: number; maxDailyLimit: number;
    minOpenRate: number; maxBounceRate: number; autoPauseOnCritical: boolean;
  }>({ defaultValues: { initialDailyVolume: 20, dailyIncreasePercent: 20, maxDailyLimit: 500, minOpenRate: 0.2, maxBounceRate: 0.03, autoPauseOnCritical: true } });

  const saveRule = useMutation({
    mutationFn: ({ senderId, data }: { senderId: string; data: unknown }) => warmupApi.upsertRule(senderId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warmup'] }); toast({ title: 'Warmup rule saved' }); },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((e) => (
          <Card key={e.senderId} className={`cursor-pointer hover:shadow-md transition-shadow ${selectedSender === e.senderId ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedSender(e.senderId)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{e.sender.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{e.sender.fromEmail}</p>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Stage</span><span className="font-medium">{e.warmupStage}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current Limit</span><span className="font-medium">{e.warmupCurrentDailyLimit}/day</span></div>
            </CardContent>
          </Card>
        ))}
        {entries.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No warmup-enabled senders.</div>}
      </div>

      {selectedSender && (
        <>
          {logsData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Warmup Progress (30 days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={logsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="targetVolume" stroke="#94a3b8" fill="#94a3b820" name="Target" />
                    <Area type="monotone" dataKey="actualVolume" stroke="#6366f1" fill="#6366f120" name="Actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Warmup Rule Configuration</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => saveRule.mutate({ senderId: selectedSender, data: d }))} className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Initial Daily Volume</Label><Input type="number" {...register('initialDailyVolume', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Daily Increase %</Label><Input type="number" {...register('dailyIncreasePercent', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Max Daily Limit</Label><Input type="number" {...register('maxDailyLimit', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Min Open Rate (0-1)</Label><Input type="number" step="0.01" {...register('minOpenRate', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Max Bounce Rate (0-1)</Label><Input type="number" step="0.001" {...register('maxBounceRate', { valueAsNumber: true })} /></div>
                <div className="col-span-2">
                  <Button type="submit" disabled={saveRule.isPending}>Save Rule</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
