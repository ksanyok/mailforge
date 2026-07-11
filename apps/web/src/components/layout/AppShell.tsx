import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/inbox': 'Инбокс',
  '/dashboard': 'Дашборд',
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

// Pages that manage their own full-height scroll/layout (no page padding)
const BARE_PATHS = new Set(['/inbox']);

export function AppShell() {
  const location = useLocation();
  const path = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[path] ?? 'MailForge';
  const bare = BARE_PATHS.has(path);

  return (
    <div className="h-screen overflow-hidden bg-canvas text-ink">
      <Sidebar />
      <div className="ml-[234px]">
        <Header title={title} />
        <main
          className={
            bare
              ? 'mt-[58px] h-[calc(100vh-58px)] overflow-hidden'
              : 'mt-[58px] p-6 h-[calc(100vh-58px)] overflow-y-auto'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
