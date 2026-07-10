import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCheck, UserX, Mail, Send, TrendingUp, AlertTriangle, Ban, MessageSquare, MousePointerClick, ThumbsDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi, recommendationsApi, inboxApi } from '@/api/index';
import { formatNumber, formatPercent, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#94a3b8', '#ef4444', '#f97316', '#8b5cf6'];

export function DashboardPage() {
  const { data: stats } = useQuery({ queryKey: ['dashboard'], queryFn: analyticsApi.dashboard });
  const { data: daily } = useQuery({ queryKey: ['daily-metrics'], queryFn: () => analyticsApi.dailyMetrics(30) });
  const { data: recs } = useQuery({ queryKey: ['recommendations'], queryFn: () => recommendationsApi.findAll({ limit: 5 }) });
  const { data: inboxStats } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.conversations(),
    staleTime: 60_000,
  });

  const s = stats as { contacts?: Record<string, number>; campaigns?: Record<string, number>; sending?: Record<string, number>; senders?: Record<string, unknown> } | undefined;
  const dailyData = (Array.isArray(daily) ? daily : ((daily as any)?.data ?? [])) as { date: string; sent: number; opened: number; clicked: number; bounced: number }[];
  const recsRaw = (recs as any)?.data;
  const recsData = (Array.isArray(recsRaw) ? recsRaw : []) as { id: string; severity: string; title: string; message: string }[];
  const conversations = Array.isArray(inboxStats) ? (inboxStats as any[]).length : 0;

  const kpiCards = [
    { label: 'Всего контактов', value: s?.contacts?.total ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Подписаны', value: s?.contacts?.subscribed ?? 0, icon: UserCheck, color: 'text-green-600' },
    { label: 'Открыто (30 дн.)', value: (s?.sending as any)?.openedLast30 ?? 0, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Кликнуто (30 дн.)', value: (s?.sending as any)?.clickedLast30 ?? 0, icon: MousePointerClick, color: 'text-blue-500' },
    { label: 'Ответы / Диалоги', value: conversations, icon: MessageSquare, color: 'text-violet-600' },
    { label: 'Не интересно', value: s?.contacts?.unsubscribed ?? 0, icon: ThumbsDown, color: 'text-gray-600' },
    { label: 'Всего кампаний', value: s?.campaigns?.total ?? 0, icon: Mail, color: 'text-indigo-600' },
    { label: 'Отправлено сегодня', value: s?.sending?.sentToday ?? 0, icon: Send, color: 'text-cyan-600' },
  ];

  const pieData = [
    { name: 'Подписан', value: s?.contacts?.subscribed ?? 0 },
    { name: 'Отписан', value: s?.contacts?.unsubscribed ?? 0 },
    { name: 'Отказ', value: s?.contacts?.bounced ?? 0 },
    { name: 'Жалоба', value: s?.contacts?.complained ?? 0 },
    { name: 'В стоп-листе', value: s?.contacts?.suppressed ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn('h-8 w-8 shrink-0', color)} />
              <div>
                <p className="text-2xl font-bold">{formatNumber(value as number)}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations alert */}
      {recsData.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              Рекомендации ({recsData.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recsData.map((r) => (
              <div key={r.id} className="flex items-start gap-2">
                <span className={cn('text-xs px-1.5 py-0.5 rounded font-semibold mt-0.5', STATUS_COLORS[r.severity] ?? 'bg-gray-100')}>
                  {r.severity}
                </span>
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart - 30 day activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Активность писем (30 дней)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="#6366f120" name="Отправлено" />
                <Area type="monotone" dataKey="opened" stroke="#22c55e" fill="#22c55e20" name="Открыто" />
                <Area type="monotone" dataKey="clicked" stroke="#3b82f6" fill="#3b82f620" name="Кликнуто" />
                <Area type="monotone" dataKey="bounced" stroke="#ef4444" fill="#ef444420" name="Отказы" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart - contact status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Статусы контактов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sender health */}
      {s?.senders && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Состояние отправителей</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">Активные отправители: <span className="font-semibold text-foreground">{s.senders.active as number ?? 0}</span> / {s.senders.total as number ?? 0}</p>
            <p className="text-muted-foreground mt-1">Средний индекс здоровья: <span className="font-semibold text-foreground">{s.senders.averageHealthScore as number ?? 0}</span></p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
