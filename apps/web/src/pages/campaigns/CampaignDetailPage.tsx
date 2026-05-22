import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { campaignsApi, analyticsApi } from '@/api/index';
import { formatDate, formatPercent, STATUS_COLORS } from '@/utils/format';
import { cn } from '@/utils/cn';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaign } = useQuery({ queryKey: ['campaign', id], queryFn: () => campaignsApi.findOne(id!), enabled: !!id });
  const { data: funnel } = useQuery({ queryKey: ['funnel', id], queryFn: () => analyticsApi.campaignFunnel(id!), enabled: !!id });

  const c = campaign as Record<string, unknown> | undefined;
  const funnelData = funnel as { stage: string; count: number }[] | undefined;

  if (!c) return <div className="text-muted-foreground">Loading...</div>;

  const stats = [
    { label: 'Recipients', value: c.totalRecipients as number },
    { label: 'Sent', value: c.sentCount as number },
    { label: 'Opened', value: c.uniqueOpenCount as number },
    { label: 'Clicked', value: c.uniqueClickCount as number },
    { label: 'Bounced', value: c.bounceCount as number },
    { label: 'Unsubscribed', value: c.unsubscribeCount as number },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${id}/edit`)}>Edit</Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{c.name as string}</h2>
        <p className="text-sm text-muted-foreground">{c.subject as string}</p>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[c.status as string] ?? 'bg-gray-100')}>{c.status as string}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {c.sentCount as number > 0 && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-green-600">{formatPercent(c.uniqueOpenCount as number, c.sentCount as number)}</p><p className="text-xs text-muted-foreground">Open Rate</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-blue-600">{formatPercent(c.uniqueClickCount as number, c.sentCount as number)}</p><p className="text-xs text-muted-foreground">Click Rate</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-red-600">{formatPercent(c.bounceCount as number, c.sentCount as number)}</p><p className="text-xs text-muted-foreground">Bounce Rate</p></CardContent></Card>
        </div>
      )}

      {funnelData && funnelData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Campaign Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-2">
          <div className="text-muted-foreground">Created</div><div>{formatDate(c.createdAt as string)}</div>
          {c.scheduledAt && <><div className="text-muted-foreground">Scheduled</div><div>{formatDate(c.scheduledAt as string)}</div></>}
          {c.startedAt && <><div className="text-muted-foreground">Started</div><div>{formatDate(c.startedAt as string)}</div></>}
          {c.completedAt && <><div className="text-muted-foreground">Completed</div><div>{formatDate(c.completedAt as string)}</div></>}
        </CardContent>
      </Card>
    </div>
  );
}
