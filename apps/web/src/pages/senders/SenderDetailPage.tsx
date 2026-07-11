import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sendersApi } from '@/api/index';
import { formatDate, healthBg, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sender } = useQuery({ queryKey: ['sender', id], queryFn: () => sendersApi.findOne(id!), enabled: !!id });
  const { data: healthLogs } = useQuery({ queryKey: ['sender-health', id], queryFn: () => sendersApi.healthLogs(id!), enabled: !!id });

  const s = sender as Record<string, unknown> | undefined;
  const logsRaw = Array.isArray(healthLogs) ? healthLogs : ((healthLogs as any)?.data ?? []);
  const logs = (Array.isArray(logsRaw) ? logsRaw : []) as { createdAt: string; healthScore: number; sentToday: number; bouncesToday: number }[];

  const statusTone = (status: string): string =>
    ({
      ACTIVE: 'bg-success-soft text-success',
      PAUSED: 'bg-warn-soft text-warn',
      ERROR: 'bg-danger-soft text-danger',
    } as Record<string, string>)[status] ?? 'bg-surface-3 text-ink-2';
  const healthTone = (n: number): string =>
    n >= 80 ? 'var(--success)' : n >= 50 ? 'var(--warn)' : 'var(--danger)';
  const healthToneSoft = (n: number): string =>
    n >= 80 ? 'var(--success-soft)' : n >= 50 ? 'var(--warn-soft)' : 'var(--danger-soft)';

  if (!s) return <div className="text-ink-3">Загрузка…</div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Назад</Button>
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="w-[52px] h-[52px] flex-none rounded-full flex items-center justify-center"
          style={{ background: healthToneSoft(s.healthScore as number) }}
        >
          <div
            className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-mono font-extrabold text-[14px]"
            style={{ color: healthTone(s.healthScore as number) }}
          >
            {s.healthScore as number}
          </div>
        </div>
        <div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.3px]">{s.name as string}</h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">
            <span>{s.fromEmail as string}</span>
            <span className="text-ink-3"> · </span>
            <span className="font-mono">{s.smtpHost as string}</span>
          </p>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-[10.5px] font-semibold', statusTone(s.status as string))}>{s.status as string}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Настройки SMTP</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Хост</span><span>{s.smtpHost as string}:{s.smtpPort as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Шифрование</span><span>{s.smtpEncryption as string}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Пользователь</span><span>{s.smtpUser as string}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Лимиты отправки</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Дневной лимит</span><span>{s.dailyLimit as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Часовой лимит</span><span>{s.hourlyLimit as number}</span></div>
            {s.warmupEnabled && <>
              <div className="flex justify-between"><span className="text-muted-foreground">Этап прогрева</span><span>{s.warmupStage as number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Лимит прогрева</span><span>{s.warmupCurrentDailyLimit as number}/день</span></div>
            </>}
          </CardContent>
        </Card>
      </div>

      {logs && logs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">История индекса здоровья</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={[...logs].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="createdAt" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(0, 10)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="healthScore" stroke="#6366f1" name="Индекс здоровья" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
