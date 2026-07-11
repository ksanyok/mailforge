import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notificationsApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/format';

interface Notification { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string; metadata?: Record<string, string>; }

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['notifications'] });
  qc.invalidateQueries({ queryKey: ['notifications-unread'] });
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.findAll({ limit: 100 }) });
  const notifs = ((data as any)?.data ?? []) as Notification[];

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => invalidateAll(qc),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => invalidateAll(qc),
  });

  const unread = notifs.filter((n) => !n.isRead).length;

  const handleNotifClick = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    // If notification has inbox context, navigate to that conversation
    if (n.type === 'INBOX_REPLY' && n.metadata?.senderId && n.metadata?.contactEmail) {
      navigate(`/inbox?senderId=${encodeURIComponent(n.metadata.senderId)}&contactEmail=${encodeURIComponent(n.metadata.contactEmail)}`);
    }
  };

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">Уведомления</h1>
          <p className="text-[13px] text-ink-3 mt-1">События по вашим ящикам и рассылкам</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Check className="h-4 w-4 mr-2" />Отметить все прочитанными ({unread})
          </Button>
        )}
      </div>
      {notifs.length === 0 && <div className="text-center py-16 text-ink-3">Уведомлений нет</div>}
      {notifs.map((n) => (
        <Card
          key={n.id}
          className={cn(
            'transition-colors cursor-pointer hover:border-brand/30',
            !n.isRead && 'bg-brand-softer border-brand/20',
          )}
          onClick={() => handleNotifClick(n)}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <div className={cn('mt-1 w-2 h-2 rounded-full shrink-0', n.isRead ? 'bg-surface-3' : 'bg-brand animate-pulse')} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{n.title}</p>
                <span className="text-xs text-ink-3 whitespace-nowrap">{formatRelative(n.createdAt)}</span>
              </div>
              <p className="text-sm text-ink-2 mt-0.5">{n.message}</p>
              {n.type === 'INBOX_REPLY' && (
                <p className="text-xs text-brand mt-1">Нажмите, чтобы открыть диалог →</p>
              )}
            </div>
            {!n.isRead && (
              <button
                className="shrink-0 w-6 h-6 rounded-full hover:bg-hover flex items-center justify-center text-ink-3 hover:text-brand transition-colors"
                title="Отметить прочитанным"
                onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
              >
                <Check className="h-3 w-3" />
              </button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
