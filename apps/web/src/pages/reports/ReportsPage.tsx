import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi } from '@/api/index';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Отчёты</h1>
        <p className="text-[13px] text-ink-3 mt-1">Динамика отправки и сравнение отправителей за последние 90 дней</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Объём писем — последние 90 дней</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="var(--accent)" name="Отправлено" />
              <Bar dataKey="opened" fill="var(--success)" name="Открыто" />
              <Bar dataKey="clicked" fill="var(--info)" name="Кликнуто" />
              <Bar dataKey="bounced" fill="var(--danger)" name="Отказы" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Динамика процента открытий</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${(v as number).toFixed(1)}%`} />
              <Line type="monotone" dataKey="openRate" stroke="var(--success)" name="Процент открытий" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {senderData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Сравнение отправителей</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={senderData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="var(--accent)" name="Отправлено" />
                <Bar dataKey="openRate" fill="var(--success)" name="Процент открытий %" />
                <Bar dataKey="bounceRate" fill="var(--danger)" name="Процент отказов %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
