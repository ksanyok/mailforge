import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, List, Upload, Send, FileText, Mail,
  Thermometer, Shield, BarChart2, Bell, Settings, Activity, AlertCircle,
  UserCircle, Ban, Inbox, Pencil,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { inboxApi } from '@/api/index';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Inbox;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const navigate = useNavigate();

  const { data: convRaw } = useQuery({
    queryKey: ['inbox-conversations'],
    queryFn: () => inboxApi.conversations(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const inboxUnread = ((convRaw as any[]) ?? []).reduce(
    (sum: number, c: any) => sum + (c.unreadCount ?? 0), 0,
  );

  const groups: NavGroup[] = [
    {
      title: 'Почта',
      items: [
        { to: '/inbox', label: 'Инбокс', icon: Inbox, badge: inboxUnread || undefined },
        { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Рассылки',
      items: [
        { to: '/campaigns', label: 'Кампании', icon: Send },
        { to: '/templates', label: 'Шаблоны', icon: FileText },
        { to: '/contacts', label: 'Контакты', icon: Users },
        { to: '/lists', label: 'Списки', icon: List },
        { to: '/imports', label: 'Импорт', icon: Upload },
      ],
    },
    {
      title: 'Инфраструктура',
      items: [
        { to: '/senders', label: 'Отправители', icon: Mail },
        { to: '/deliverability', label: 'Доставляемость', icon: Shield },
        { to: '/warmup', label: 'Прогрев', icon: Thermometer },
        { to: '/suppressions', label: 'Стоп-лист', icon: Ban },
      ],
    },
    {
      title: 'Аналитика',
      items: [
        { to: '/reports', label: 'Отчёты', icon: BarChart2 },
        { to: '/recommendations', label: 'Рекомендации', icon: AlertCircle },
        { to: '/activity', label: 'Журнал действий', icon: Activity },
      ],
    },
    {
      title: 'Администрирование',
      items: [
        { to: '/users', label: 'Пользователи', icon: UserCircle },
        { to: '/notifications', label: 'Уведомления', icon: Bell },
      ],
    },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-[11px] w-full px-[10px] py-2 rounded-[9px] text-left font-medium transition-colors',
      isActive
        ? 'bg-brand-soft text-brand'
        : 'text-ink-2 hover:bg-hover',
    );

  return (
    <aside className="fixed left-0 top-0 h-screen w-[234px] flex flex-col bg-surface border-r border-border px-3 py-3.5 gap-1 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-1.5 pt-1 pb-3">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            boxShadow: '0 4px 12px -2px var(--accent)',
          }}
        >
          <Send className="w-[18px] h-[18px]" strokeWidth={2} />
        </div>
        <div className="flex flex-col leading-[1.15] min-w-0">
          <span className="font-extrabold text-[15px] tracking-[-0.2px]">MailForge</span>
          <span className="text-[11px] text-ink-3 truncate">brandup.group</span>
        </div>
      </div>

      {/* Compose */}
      <button
        onClick={() => navigate('/campaigns/new')}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] text-white font-semibold text-[13.5px] mb-2 transition hover:brightness-105"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          boxShadow: '0 6px 16px -6px var(--accent)',
        }}
      >
        <Pencil className="w-4 h-4" />
        Написать
      </button>

      {/* Groups */}
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-px">
          <span className="text-[10.5px] font-bold tracking-[0.6px] text-ink-3 px-2 pt-2 pb-1 uppercase">
            {group.title}
          </span>
          {group.items.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.7} />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="min-w-[20px] h-[19px] px-1.5 rounded-full bg-brand text-white text-[11px] font-bold font-mono flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="flex-1" />

      <NavLink to="/settings" className={linkClass}>
        <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.7} />
        <span className="flex-1">Настройки</span>
      </NavLink>
    </aside>
  );
}
