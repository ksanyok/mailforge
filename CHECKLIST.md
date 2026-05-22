# MailForge — Чеклист разработки

**Дата создания:** 22 мая 2026  
**Последнее обновление:** 22 мая 2026  
**Проект:** MailForge — Self-Hosted Email Delivery & Warmup Platform  
**Репозиторий:** https://github.com/ksanyok/mailforge  
**Стек:** NestJS + React + MySQL (Prisma) + BullMQ + Redis + Docker  

---

## Прогресс

**Выполнено: 85 / 85 задач (100%)**

```
[████████████████████████████████████████] 100%
```

---

## Инструкция для агента

Этот файл является единственным источником правды о состоянии проекта.  
После каждого выполненного пункта:
1. Пометить задачу `[x]`
2. Обновить счётчик прогресса и прогресс-бар наверху
3. Выполнить `git add . && git commit -m "..." && git push`

Если агент подключается к уже начатому проекту — прочитать этот файл,  
найти первую незавершённую задачу `[ ]` и продолжить с неё.

---

## Фаза 1: Корневая структура и конфигурация

- [x] 1.1 Создать CHECKLIST.md (русский, с прогресс-баром, дата)
- [x] 1.2 Создать корневой package.json (pnpm workspaces + turborepo scripts)
- [x] 1.3 Создать pnpm-workspace.yaml
- [x] 1.4 Создать turbo.json
- [x] 1.5 Создать tsconfig.base.json
- [x] 1.6 Создать .gitignore
- [x] 1.7 Создать .env.example (все переменные)
- [x] 1.8 Создать LICENSE (MIT)
- [x] 1.9 Создать docker-compose.yml (prod: api, web, db, redis, minio)
- [x] 1.10 Создать docker-compose.dev.yml (dev overrides с hot reload)

---

## Фаза 2: packages/shared

- [x] 2.1 Создать packages/shared/package.json
- [x] 2.2 Создать packages/shared/tsconfig.json
- [x] 2.3 Создать все enum-ы (Role, ContactStatus, BounceType, ValidationStatus, ImportStatus, DedupeRule, SmtpEncryption, SenderStatus, CampaignStatus, RotationMode, RecipientStatus, EventType, TokenType, SuppressionReason, CheckType, CheckStatus, RecommendationSeverity, NotificationType)
- [x] 2.4 Создать все DTO-типы (LoginDto, RegisterDto, AuthResponseDto, ContactDto, CampaignDto, DashboardStatsDto и остальные)
- [x] 2.5 Создать packages/shared/src/index.ts (barrel export)

---

## Фаза 3: apps/api — Backend

### 3.1 Инфраструктура
- [x] 3.1.1 Создать apps/api/package.json (NestJS 10 + все зависимости)
- [x] 3.1.2 Создать apps/api/tsconfig.json и tsconfig.build.json
- [x] 3.1.3 Создать apps/api/nest-cli.json
- [x] 3.1.4 Создать apps/api/src/main.ts (bootstrap: helmet, CORS, prefix, ValidationPipe, Swagger)
- [x] 3.1.5 Создать apps/api/src/app.module.ts (все модули, глобальные guards)
- [x] 3.1.6 Создать PrismaModule + PrismaService (с enableShutdownHooks)
- [x] 3.1.7 Создать JwtAuthGuard (глобальный, с IS_PUBLIC_KEY)
- [x] 3.1.8 Создать RolesGuard (глобальный)
- [x] 3.1.9 Создать @Public(), @CurrentUser(), @Roles() декораторы
- [x] 3.1.10 Создать GlobalExceptionFilter
- [x] 3.1.11 Создать ResponseTransformInterceptor
- [x] 3.1.12 Создать encrypt/decrypt utility (AES-256-GCM)
- [x] 3.1.13 Создать interpolate utility (переменные в шаблонах)
- [x] 3.1.14 Создать calculateHealthScore utility
- [x] 3.1.15 Создать pagination utility
- [x] 3.1.16 Создать tokens utility (generateToken)

### 3.2 Prisma Schema
- [x] 3.2.1 Создать полный schema.prisma (27+ моделей)
- [x] 3.2.2 Создать seed.ts (admin user + default settings + system templates)

### 3.3 Модули
- [x] 3.3.1 Auth module (login, register, refresh, logout, JWT strategy)
- [x] 3.3.2 Users module (CRUD, toggleActive)
- [x] 3.3.3 Contacts module (CRUD, search, bulk actions, notes, validation, risk scoring)
- [x] 3.3.4 Lists module (CRUD, members management)
- [x] 3.3.5 Tags module (CRUD)
- [x] 3.3.6 Imports module (upload, queue processor: CSV/XLSX/JSON/TXT, progress, errors)
- [x] 3.3.7 Suppressions module (CRUD, check endpoint)
- [x] 3.3.8 Senders module (CRUD, testConnection, updateHealthScore)
- [x] 3.3.9 Warmup module (rules CRUD, daily cron, advanceSender, auto-pause)
- [x] 3.3.10 Templates module (CRUD, variable extraction)
- [x] 3.3.11 Campaigns module (CRUD, dispatch, pause/resume/cancel, recipients resolution, token generation, BullMQ enqueueing)
- [x] 3.3.12 Sending module (BullMQ processor, rate limiting, interpolation, tracking injection, nodemailer)
- [x] 3.3.13 Tracking module (@Public routes: pixel GIF, click redirect, unsubscribe page)
- [x] 3.3.14 Deliverability module (DNS checks, daily cron, recommendations)
- [x] 3.3.15 Analytics module (dashboard stats, daily metrics, campaign funnel, sender comparison)
- [x] 3.3.16 Notifications module (CRUD, markRead, markAllRead, unreadCount)
- [x] 3.3.17 Recommendations module (rules engine cron, dismiss, markRead)
- [x] 3.3.18 Activity module (audit log, findAll with filters)
- [x] 3.3.19 Settings module (findAll, get, set, bulkUpdate)

---

## Фаза 4: apps/web — Frontend

### 4.1 Инфраструктура
- [x] 4.1.1 Создать apps/web/package.json (React 18 + Vite + все зависимости)
- [x] 4.1.2 Создать vite.config.ts (proxy /api и /t на :3001)
- [x] 4.1.3 Создать tsconfig.json + tsconfig.node.json
- [x] 4.1.4 Создать index.html
- [x] 4.1.5 Создать tailwind.config.js + postcss.config.js
- [x] 4.1.6 Создать src/index.css (CSS переменные Shadcn/ui)
- [x] 4.1.7 Создать src/main.tsx (QueryClientProvider)
- [x] 4.1.8 Создать src/App.tsx (RouterProvider + Toaster)
- [x] 4.1.9 Создать API клиент (axios + interceptors + refresh token логика)
- [x] 4.1.10 Создать все API функции (auth, contacts, lists, imports, senders, warmup, campaigns, templates, deliverability, analytics, notifications, recommendations, settings, activity, users)
- [x] 4.1.11 Создать Zustand auth store (persist)
- [x] 4.1.12 Создать utility функции (cn, format, STATUS_COLORS)
- [x] 4.1.13 Создать use-toast hook
- [x] 4.1.14 Создать router.tsx (все роуты + ProtectedRoute)

### 4.2 UI компоненты
- [x] 4.2.1 Button, Card, Badge, Input, Label
- [x] 4.2.2 Select, Dialog, Dropdown Menu
- [x] 4.2.3 Toast + Toaster
- [x] 4.2.4 Progress, Separator, Tabs, Textarea, Switch
- [x] 4.2.5 DataTable (с пагинацией, @tanstack/react-table)

### 4.3 Layout
- [x] 4.3.1 Sidebar (навигация 16 пунктов)
- [x] 4.3.2 Header (уведомления, user menu, logout)
- [x] 4.3.3 AppShell (Sidebar + Header + Outlet)
- [x] 4.3.4 ProtectedRoute

### 4.4 Страницы
- [x] 4.4.1 LoginPage (форма с валидацией)
- [x] 4.4.2 RegisterPage (форма с подтверждением пароля)
- [x] 4.4.3 DashboardPage (8 KPI карт, area chart, pie chart, bar chart, recommendations panel)
- [x] 4.4.4 ContactsPage (таблица с поиском, статусы, engagement/risk score)
- [x] 4.4.5 ContactDetailPage (профиль контакта, статистика)
- [x] 4.4.6 ListsPage (карточки списков, создание/удаление)
- [x] 4.4.7 ListDetailPage (участники списка)
- [x] 4.4.8 ImportsPage (drag&drop загрузка, прогресс импорта)
- [x] 4.4.9 ImportDetailPage (детали импорта, ошибки)
- [x] 4.4.10 CampaignsPage (таблица, dispatch/pause кнопки)
- [x] 4.4.11 CampaignDetailPage (воронка, статистика, funnel chart)
- [x] 4.4.12 CampaignBuilderPage (5-шаговый wizard)
- [x] 4.4.13 TemplatesPage (карточки шаблонов, создание)
- [x] 4.4.14 SendersPage (карточки с health score, тест соединения)
- [x] 4.4.15 SenderDetailPage (SMTP config, health score chart)
- [x] 4.4.16 WarmupPage (карточки, warmup progress chart, rule config)
- [x] 4.4.17 DeliverabilityPage (DNS checks per sender, run checks)
- [x] 4.4.18 SuppressionsPage (таблица, добавление)
- [x] 4.4.19 ReportsPage (90-day volume chart, open rate trend, sender comparison)
- [x] 4.4.20 RecommendationsPage (severity sorted, dismiss, mark read)
- [x] 4.4.21 NotificationsPage (mark read, mark all read)
- [x] 4.4.22 ActivityPage (audit log table)
- [x] 4.4.23 UsersPage (таблица пользователей, activate/deactivate)
- [x] 4.4.24 SettingsPage (grouped settings form, bulk save)

---

## Фаза 5: Docker

- [x] 5.1 docker/api/Dockerfile (multi-stage production build)
- [x] 5.2 docker/api/Dockerfile.dev
- [x] 5.3 docker/web/Dockerfile (multi-stage: build → nginx)
- [x] 5.4 docker/web/Dockerfile.dev
- [x] 5.5 docker/web/nginx.conf (SPA fallback, proxy /api и /t)

---

## Фаза 6: Документация и финал

- [x] 6.1 Создать README.md (полный: features, stack, quick start, env vars)
- [x] 6.2 Создать CONTRIBUTING.md
- [x] 6.3 Создать SECURITY.md
- [x] 6.4 Создать ROADMAP.md
- [x] 6.5 Финальный git commit и push

---

## Итоговый статус

Все 85 задач выполнены. Проект полностью реализован:
- ✅ Backend: 19 NestJS модулей + Prisma + BullMQ
- ✅ Frontend: 16 страниц + layout + UI компоненты
- ✅ Docker: Dockerfile для api и web (prod + dev)
- ✅ Документация: README, CONTRIBUTING, SECURITY, ROADMAP
