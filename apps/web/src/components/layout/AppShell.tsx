import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Обзор',
  '/contacts': 'Контакты',
  '/lists': 'Списки',
  '/imports': 'Импорт',
  '/campaigns': 'Кампании',
  '/templates': 'Шаблоны писем',
  '/senders': 'Отправители',
  '/warmup': 'Прогрев',
  '/deliverability': 'Доставляемость',
  '/suppressions': 'Стоп-лист',
  '/reports': 'Отчёты',
  '/recommendations': 'Рекомендации',
  '/notifications': 'Уведомления',
  '/activity': 'Журнал действий',
  '/users': 'Пользователи',
  '/settings': 'Настройки',
};

export function AppShell() {
  const location = useLocation();
  const path = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[path] ?? 'MailForge';

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="ml-56">
        <Header title={title} />
        <main className="mt-14 p-6 h-[calc(100vh-56px)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
