import { Bell, LogOut, Search, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { authApi } from '@/api/auth';
import { notificationsApi } from '@/api/index';

interface HeaderProps {
  title?: string;
}

function initials(name?: string): string {
  if (!name) return 'MF';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export function Header({ title }: HeaderProps) {
  const { user, refreshToken, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });
  const notifCount = (unreadData as any)?.count ?? 0;

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => null);
    }
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-[234px] right-0 h-[58px] flex items-center gap-3.5 px-5 bg-surface border-b border-border z-10">
      <div className="font-bold text-[15px] min-w-[132px]">{title}</div>

      <div className="flex-1 max-w-[440px] flex items-center gap-2.5 bg-surface-2 border border-border rounded-[10px] px-3 py-2">
        <Search className="w-4 h-4 text-ink-3 shrink-0" strokeWidth={1.9} />
        <input
          placeholder="Поиск по письмам, контактам, кампаниям…"
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder:text-ink-3"
        />
        <kbd className="text-[10.5px] font-mono text-ink-3 bg-surface-3 px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1" />

      <button
        onClick={toggle}
        title="Сменить тему"
        className="w-9 h-9 rounded-[9px] border border-border flex items-center justify-center text-ink-2 hover:bg-hover transition-colors"
      >
        {theme === 'dark'
          ? <Sun className="w-[17px] h-[17px]" strokeWidth={1.8} />
          : <Moon className="w-[17px] h-[17px]" strokeWidth={1.8} />}
      </button>

      <button
        onClick={() => navigate('/notifications')}
        className="w-9 h-9 rounded-[9px] border border-border flex items-center justify-center text-ink-2 hover:bg-hover transition-colors relative"
      >
        <Bell className="w-[17px] h-[17px]" strokeWidth={1.8} />
        {notifCount > 0 && (
          <span className="absolute top-[7px] right-2 w-[7px] h-[7px] rounded-full bg-danger border-2 border-surface" />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 pl-1.5 border-l border-border">
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white font-bold text-[12px] uppercase"
              style={{ background: 'linear-gradient(135deg,#5b54ec,#c77700)' }}>
              {initials(user?.name)}
            </div>
            <div className="hidden md:flex flex-col leading-[1.2] text-left">
              <span className="font-semibold text-[12.5px]">{user?.name ?? 'Пользователь'}</span>
              <span className="text-[10.5px] text-ink-3">
                {user?.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            Настройки
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
