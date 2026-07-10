import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, List, Upload, Send, FileText, Mail,
  Thermometer, Shield, BarChart2, Bell, Settings, Activity, AlertCircle,
  UserCircle, Ban, Inbox,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { to: '/contacts', label: 'Контакты', icon: Users },
  { to: '/lists', label: 'Списки', icon: List },
  { to: '/imports', label: 'Импорт', icon: Upload },
  { to: '/campaigns', label: 'Кампании', icon: Send },
  { to: '/templates', label: 'Шаблоны', icon: FileText },
  { to: '/senders', label: 'Отправители', icon: Mail },
  { to: '/inbox', label: 'Входящие', icon: Inbox },
  { to: '/warmup', label: 'Прогрев', icon: Thermometer },
  { to: '/deliverability', label: 'Доставляемость', icon: Shield },
  { to: '/suppressions', label: 'Стоп-лист', icon: Ban },
  { to: '/reports', label: 'Отчёты', icon: BarChart2 },
  { to: '/recommendations', label: 'Рекомендации', icon: AlertCircle },
  { to: '/notifications', label: 'Уведомления', icon: Bell },
  { to: '/activity', label: 'Журнал действий', icon: Activity },
  { to: '/users', label: 'Пользователи', icon: UserCircle },
  { to: '/settings', label: 'Настройки', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r bg-card flex flex-col">
      <div className="flex h-14 items-center px-4 border-b">
        <Mail className="h-5 w-5 text-primary mr-2" />
        <span className="font-bold text-lg">MailForge</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors mb-0.5',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
