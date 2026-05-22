import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { contactsApi } from '@/api/contacts';
import { cn } from '@/utils/cn';
import { formatDate, STATUS_COLORS } from '@/utils/format';

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.findOne(id!),
    enabled: !!id,
  });

  const c = contact as Record<string, unknown> | undefined;

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!c) return <div className="text-muted-foreground">Contact not found</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
          {(c.firstName as string)?.[0] ?? (c.email as string)?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold">
            {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email as string}
          </h2>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[c.status as string] ?? 'bg-gray-100')}>
            {c.status as string}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{c.email as string}</div>
            {c.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{c.phone as string}</div>}
            {c.company && <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />{c.company as string}</div>}
            <div className="text-muted-foreground">Added {formatDate(c.createdAt as string)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Engagement</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span className="font-medium">{c.engagementScore as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Risk</span><span className="font-medium">{c.riskScore as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Sent</span><span>{c.totalSent as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Opened</span><span>{c.totalOpened as number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Clicked</span><span>{c.totalClicked as number}</span></div>
            {c.lastOpenedAt && <div className="flex justify-between"><span className="text-muted-foreground">Last Opened</span><span>{formatDate(c.lastOpenedAt as string)}</span></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
