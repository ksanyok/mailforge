import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { warmupApi, sendersApi } from '@/api/index';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip, ChartGradients, axisProps, gridProps } from '@/components/charts/chart-kit';
import { useState } from 'react';

interface WarmupEntry { senderId: string; sender: { name: string; fromEmail: string }; warmupRule?: Record<string, unknown>; warmupCurrentDailyLimit: number; warmupStage: number; }

export function WarmupPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['warmup'], queryFn: () => warmupApi.findAll() });
  const entriesRaw = Array.isArray(data) ? data : ((data as any)?.data ?? []);
  const entries = (Array.isArray(entriesRaw) ? entriesRaw : []) as WarmupEntry[];
  const [selectedSender, setSelectedSender] = useState<string | null>(null);

  const { data: logs } = useQuery({
    queryKey: ['warmup-logs', selectedSender],
    queryFn: () => warmupApi.logs(selectedSender!, { limit: 30 }),
    enabled: !!selectedSender,
  });

  const logsRaw = Array.isArray(logs) ? logs : ((logs as any)?.data ?? []);
  const logsData = (Array.isArray(logsRaw) ? logsRaw : []) as { date: string; targetVolume: number; actualVolume: number; openRate: number; bounceRate: number }[];

  const { register, handleSubmit } = useForm<{
    initialDailyVolume: number; dailyIncreasePercent: number; maxDailyLimit: number;
    minOpenRate: number; maxBounceRate: number; autoPauseOnCritical: boolean;
  }>({ defaultValues: { initialDailyVolume: 20, dailyIncreasePercent: 20, maxDailyLimit: 500, minOpenRate: 0.2, maxBounceRate: 0.03, autoPauseOnCritical: true } });

  const saveRule = useMutation({
    mutationFn: ({ senderId, data }: { senderId: string; data: unknown }) => warmupApi.upsertRule(senderId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warmup'] }); toast({ title: 'Правило прогрева сохранено' }); },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Прогрев отправителей</h1>
        <p className="text-[13px] text-ink-3 mt-1">Постепенно наращивайте объём отправки, чтобы сохранить репутацию домена</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((e) => (
          <Card key={e.senderId} className={`cursor-pointer hover:shadow-soft-lg transition-shadow ${selectedSender === e.senderId ? 'ring-2 ring-brand' : ''}`} onClick={() => setSelectedSender(e.senderId)}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                  <Flame className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{e.sender.name}</CardTitle>
                  <p className="text-xs text-ink-3 truncate">{e.sender.fromEmail}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-ink-3">Этап</span><span className="font-semibold font-mono">{e.warmupStage}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Текущий лимит</span><span className="font-semibold"><span className="font-mono">{e.warmupCurrentDailyLimit}</span>/день</span></div>
            </CardContent>
          </Card>
        ))}
        {entries.length === 0 && <div className="col-span-3 text-center py-12 text-ink-3">Нет отправителей с включённым прогревом.</div>}
      </div>

      {selectedSender && (
        <>
          {logsData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Прогресс прогрева (30 дней)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={logsData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <ChartGradients ids={[{ id: 'gActual', color: 'var(--accent)' }]} />
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" {...axisProps} tickFormatter={(v) => v.slice(5)} minTickGap={24} />
                    <YAxis {...axisProps} width={40} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="targetVolume" stroke="var(--text-3)" strokeWidth={1.6} strokeDasharray="4 3" fill="transparent" name="Целевой" />
                    <Area type="monotone" dataKey="actualVolume" stroke="var(--accent)" strokeWidth={2.5} fill="url(#gActual)" name="Фактический" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Настройка правила прогрева</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => saveRule.mutate({ senderId: selectedSender, data: d }))} className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Начальный дневной объём</Label><Input type="number" {...register('initialDailyVolume', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Дневной прирост, %</Label><Input type="number" {...register('dailyIncreasePercent', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Максимальный дневной лимит</Label><Input type="number" {...register('maxDailyLimit', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Мин. процент открытий (0–1)</Label><Input type="number" step="0.01" {...register('minOpenRate', { valueAsNumber: true })} /></div>
                <div className="space-y-1"><Label>Макс. процент отказов (0–1)</Label><Input type="number" step="0.001" {...register('maxBounceRate', { valueAsNumber: true })} /></div>
                <div className="col-span-2">
                  <Button type="submit" disabled={saveRule.isPending}>Сохранить правило</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
