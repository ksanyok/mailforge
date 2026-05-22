import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contacts': 'Contacts',
  '/lists': 'Lists',
  '/imports': 'Imports',
  '/campaigns': 'Campaigns',
  '/templates': 'Email Templates',
  '/senders': 'Sender Accounts',
  '/warmup': 'Warmup',
  '/deliverability': 'Deliverability',
  '/suppressions': 'Suppressions',
  '/reports': 'Reports',
  '/recommendations': 'Recommendations',
  '/notifications': 'Notifications',
  '/activity': 'Activity Log',
  '/users': 'Users',
  '/settings': 'Settings',
};

export function AppShell() {
  const location = useLocation();
  const path = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[path] ?? 'MailForge';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-56">
        <Header title={title} />
        <main className="mt-14 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
