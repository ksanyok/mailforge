import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { recommendationsApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/format';

interface Rec { id: string; severity: string; title: string; message: string; actionText?: string; isRead: boolean; isDismissed: boolean; createdAt: string; }

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-danger-soft text-danger',
  WARNING: 'bg-warn-soft text-warn',
  INFO: 'bg-info-soft text-info',
};

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Критично',
  WARNING: 'Внимание',
  INFO: 'Инфо',
};

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
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Рекомендации</h1>
        <p className="text-[13px] text-ink-3 mt-1">Подсказки по улучшению доставляемости и настройки отправки</p>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-ink-3">Рекомендаций нет — с настройкой всё в порядке!</div>
      )}
      {sorted.map((r) => (
        <Card key={r.id} className={cn('border-l-4', r.severity === 'CRITICAL' ? 'border-l-danger' : !r.isRead ? 'border-l-brand' : 'border-l-transparent')}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-2 py-0.5 rounded text-[10.5px] font-semibold', SEVERITY_BADGE[r.severity] ?? 'bg-surface-3 text-ink-2')}>{SEVERITY_LABEL[r.severity] ?? r.severity}</span>
                  <span className="text-xs text-ink-3">{formatRelative(r.createdAt)}</span>
                </div>
                <p className="font-semibold text-sm">{r.title}</p>
                <p className="text-sm text-ink-2 mt-0.5">{r.message}</p>
                {!r.isRead && (
                  <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs text-brand" onClick={() => markRead.mutate(r.id)}>Отметить прочитанным</Button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-ink-3" onClick={() => dismiss.mutate(r.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
