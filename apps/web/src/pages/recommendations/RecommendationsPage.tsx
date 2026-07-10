import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { recommendationsApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { formatRelative, STATUS_COLORS } from '@/utils/format';

interface Rec { id: string; severity: string; title: string; message: string; actionText?: string; isRead: boolean; isDismissed: boolean; createdAt: string; }

export function RecommendationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['recommendations', 'all'], queryFn: () => recommendationsApi.findAll({ limit: 50 }) });
  const recs = ((data as any)?.data ?? []) as Rec[];

  const dismiss = useMutation({
    mutationFn: (id: string) => recommendationsApi.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => recommendationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }),
  });

  const severityOrder = ['CRITICAL', 'WARNING', 'INFO'];
  const sorted = [...recs].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  return (
    <div className="space-y-3 max-w-3xl">
      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">Рекомендаций нет — с настройкой всё в порядке!</div>
      )}
      {sorted.map((r) => (
        <Card key={r.id} className={cn(!r.isRead && 'border-l-4 border-l-primary', r.severity === 'CRITICAL' && 'border-l-red-500')}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[r.severity] ?? 'bg-gray-100')}>{r.severity}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(r.createdAt)}</span>
                </div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{r.message}</p>
                {!r.isRead && (
                  <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs" onClick={() => markRead.mutate(r.id)}>Отметить прочитанным</Button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => dismiss.mutate(r.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
