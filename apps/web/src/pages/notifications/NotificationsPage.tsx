import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notificationsApi } from '@/api/index';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/format';

interface Notification { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string; }

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.findAll({ limit: 50 }) });
  const notifs = ((data as any)?.data ?? []) as Notification[];

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-3 max-w-3xl">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <Check className="h-4 w-4 mr-2" />Mark all read ({unread})
          </Button>
        </div>
      )}
      {notifs.length === 0 && <div className="text-center py-16 text-muted-foreground">No notifications</div>}
      {notifs.map((n) => (
        <Card key={n.id} className={cn(!n.isRead && 'bg-primary/5 border-primary/20')}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className={cn('mt-1 w-2 h-2 rounded-full shrink-0', n.isRead ? 'bg-muted' : 'bg-primary')} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{n.title}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelative(n.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
              {!n.isRead && (
                <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs" onClick={() => markRead.mutate(n.id)}>Mark as read</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
