import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, List, Upload, Send, FileText, Mail,
  Thermometer, Shield, BarChart2, Bell, Settings, Activity, AlertCircle,
  UserCircle, Ban,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/lists', label: 'Lists', icon: List },
  { to: '/imports', label: 'Imports', icon: Upload },
  { to: '/campaigns', label: 'Campaigns', icon: Send },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/senders', label: 'Senders', icon: Mail },
  { to: '/warmup', label: 'Warmup', icon: Thermometer },
  { to: '/deliverability', label: 'Deliverability', icon: Shield },
  { to: '/suppressions', label: 'Suppressions', icon: Ban },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/recommendations', label: 'Recommendations', icon: AlertCircle },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/users', label: 'Users', icon: UserCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
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
