import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, Mail, Send, TrendingUp, AlertTriangle, MessageSquare, MousePointerClick, ThumbsDown, Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi, recommendationsApi, inboxApi } from '@/api/index';
import { formatNumber, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#0f9d58', '#8b93a1', '#e0483d', '#c77700', '#5b54ec'];

export function DashboardPage() {
  const navigate = useNavigate();
  const firstName = (useAuthStore((st) => st.user?.name) ?? '').split(' ')[0];
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
    { label: 'Всего контактов', value: s?.contacts?.total ?? 0, icon: Users, softbg: 'var(--info-soft)', color: 'var(--info)' },
    { label: 'Подписаны', value: s?.contacts?.subscribed ?? 0, icon: UserCheck, softbg: 'var(--success-soft)', color: 'var(--success)' },
    { label: 'Открыто (30 дн.)', value: (s?.sending as any)?.openedLast30 ?? 0, icon: TrendingUp, softbg: 'var(--success-soft)', color: 'var(--success)' },
    { label: 'Кликнуто (30 дн.)', value: (s?.sending as any)?.clickedLast30 ?? 0, icon: MousePointerClick, softbg: 'var(--info-soft)', color: 'var(--info)' },
    { label: 'Ответы / Диалоги', value: conversations, icon: MessageSquare, softbg: 'var(--accent-soft)', color: 'var(--accent)' },
    { label: 'Не интересно', value: s?.contacts?.unsubscribed ?? 0, icon: ThumbsDown, softbg: 'var(--surface-3)', color: 'var(--text-2)' },
    { label: 'Всего кампаний', value: s?.campaigns?.total ?? 0, icon: Mail, softbg: 'var(--accent-soft)', color: 'var(--accent)' },
    { label: 'Отправлено сегодня', value: s?.sending?.sentToday ?? 0, icon: Send, softbg: 'var(--warn-soft)', color: 'var(--warn)' },
  ];

  const pieData = [
    { name: 'Подписан', value: s?.contacts?.subscribed ?? 0 },
    { name: 'Отписан', value: s?.contacts?.unsubscribed ?? 0 },
    { name: 'Отказ', value: s?.contacts?.bounced ?? 0 },
    { name: 'Жалоба', value: s?.contacts?.complained ?? 0 },
    { name: 'В стоп-листе', value: s?.contacts?.suppressed ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">
            Здравствуйте{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-ink-3 text-[13px] mt-0.5">
            Сводка по всем ящикам и рассылкам за последние 30 дней
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => navigate('/campaigns/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-white font-semibold text-[13px] transition hover:brightness-105"
          style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', boxShadow: '0 6px 16px -6px var(--accent)' }}
        >
          <Plus className="w-4 h-4" /> Новая кампания
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, softbg, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 shadow-soft">
            <div
              className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center mb-3"
              style={{ background: softbg, color }}
            >
              <Icon className="w-[17px] h-[17px]" strokeWidth={1.8} />
            </div>
            <div className="text-[22px] font-extrabold tracking-[-0.5px] font-mono">
              {formatNumber(value as number)}
            </div>
            <div className="text-[12px] text-ink-2 font-semibold mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recommendations alert */}
      {recsData.length > 0 && (
        <Card style={{ borderColor: 'var(--warn)', background: 'var(--warn-soft)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warn)' }}>
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
