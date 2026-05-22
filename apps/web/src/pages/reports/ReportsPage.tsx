import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi } from '@/api/index';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export function ReportsPage() {
  const { data: daily } = useQuery({ queryKey: ['daily-metrics-90'], queryFn: () => analyticsApi.dailyMetrics(90) });
  const { data: senderComparison } = useQuery({ queryKey: ['sender-comparison'], queryFn: () => analyticsApi.senderComparison() });

  const dailyData = (daily as { date: string; sent: number; opened: number; clicked: number; bounced: number; unsubscribed: number }[]) ?? [];
  const senderData = (senderComparison as { name: string; sent: number; openRate: number; bounceRate: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Email Volume — Last 90 Days</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="#6366f1" name="Sent" />
              <Bar dataKey="opened" fill="#22c55e" name="Opened" />
              <Bar dataKey="clicked" fill="#3b82f6" name="Clicked" />
              <Bar dataKey="bounced" fill="#ef4444" name="Bounced" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Open Rate Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${(v as number).toFixed(1)}%`} />
              <Line type="monotone" dataKey="openRate" stroke="#22c55e" name="Open Rate" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {senderData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Sender Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={senderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#6366f1" name="Sent" />
                <Bar dataKey="openRate" fill="#22c55e" name="Open Rate %" />
                <Bar dataKey="bounceRate" fill="#ef4444" name="Bounce Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
