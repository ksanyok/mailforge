import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi } from '@/api/index';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChartTooltip, ChartGradients, axisProps, gridProps } from '@/components/charts/chart-kit';

const LEGEND = [
  { c: 'var(--accent)', l: 'Отправлено' },
  { c: 'var(--success)', l: 'Открыто' },
  { c: 'var(--info)', l: 'Кликнуто' },
  { c: 'var(--danger)', l: 'Отказы' },
];

function Legend({ items }: { items: { c: string; l: string }[] }) {
  return (
    <div className="flex items-center gap-4 mb-3 flex-wrap">
      {items.map((x) => (
        <span key={x.l} className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: x.c }} />
          {x.l}
        </span>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const { data: daily } = useQuery({ queryKey: ['daily-metrics-90'], queryFn: () => analyticsApi.dailyMetrics(90) });
  const { data: senderComparison } = useQuery({ queryKey: ['sender-comparison'], queryFn: () => analyticsApi.senderComparison() });

  const rawDaily = (Array.isArray(daily) ? daily : ((daily as any)?.data ?? [])) as { date: string; sent: number; opened: number; clicked: number; bounced: number; unsubscribed: number }[];
  const dailyData = rawDaily.map((d) => ({
    ...d,
    openRate: d.sent > 0 ? +((d.opened / d.sent) * 100).toFixed(1) : 0,
  }));
  const senderData = (Array.isArray(senderComparison) ? senderComparison : ((senderComparison as any)?.data ?? [])) as { name: string; sent: number; openRate: number; bounceRate: number }[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Отчёты</h1>
        <p className="text-[13px] text-ink-3 mt-1">Динамика отправки и сравнение отправителей за последние 90 дней</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Объём писем — последние 90 дней</CardTitle></CardHeader>
        <CardContent>
          <Legend items={LEGEND} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="24%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(v) => v.slice(5)} minTickGap={24} />
              <YAxis {...axisProps} width={40} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--hover)' }} />
              <Bar dataKey="sent" fill="var(--accent)" name="Отправлено" radius={[3, 3, 0, 0]} />
              <Bar dataKey="opened" fill="var(--success)" name="Открыто" radius={[3, 3, 0, 0]} />
              <Bar dataKey="clicked" fill="var(--info)" name="Кликнуто" radius={[3, 3, 0, 0]} />
              <Bar dataKey="bounced" fill="var(--danger)" name="Отказы" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Динамика процента открытий</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <ChartGradients ids={[{ id: 'gOpenRate', color: 'var(--success)' }]} />
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={(v) => v.slice(5)} minTickGap={24} />
              <YAxis {...axisProps} width={40} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip suffix="%" formatter={(v) => v.toFixed(1)} />} cursor={{ stroke: 'var(--border-2)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="openRate" stroke="var(--success)" strokeWidth={2.5} fill="url(#gOpenRate)" name="Процент открытий" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {senderData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Сравнение отправителей</CardTitle></CardHeader>
          <CardContent>
            <Legend items={[
              { c: 'var(--accent)', l: 'Отправлено' },
              { c: 'var(--success)', l: 'Открытия %' },
              { c: 'var(--danger)', l: 'Отказы %' },
            ]} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={senderData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={40} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--hover)' }} />
                <Bar dataKey="sent" fill="var(--accent)" name="Отправлено" radius={[3, 3, 0, 0]} />
                <Bar dataKey="openRate" fill="var(--success)" name="Открытия %" radius={[3, 3, 0, 0]} />
                <Bar dataKey="bounceRate" fill="var(--danger)" name="Отказы %" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
