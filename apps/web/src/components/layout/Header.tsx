import { Bell, LogOut, User, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/api/auth';
import { notificationsApi, inboxApi } from '@/api/index';
import { cn } from '@/utils/cn';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  // Unread notification count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });
  const notifCount = (unreadData as any)?.count ?? 0;

  // Unread inbox count
  const { data: convRaw } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.conversations(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const inboxUnread = ((convRaw as any[]) ?? []).reduce(
    (sum: number, c: any) => sum + (c.unreadCount ?? 0), 0,
  );

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => null);
    }
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-56 right-0 h-14 border-b bg-background flex items-center justify-between px-6 z-10">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-1">

        {/* Inbox bell */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/inbox')}>
          <Inbox className="h-5 w-5" />
          {inboxUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
              {inboxUnread > 99 ? '99+' : inboxUnread}
            </span>
          )}
        </Button>

        {/* Notifications bell */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
          <Bell className="h-5 w-5" />
          {notifCount > 0 && (
            <span className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5',
              'bg-red-500',
            )}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
