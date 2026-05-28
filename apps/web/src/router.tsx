import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ContactsPage } from '@/pages/contacts/ContactsPage';
import { ContactDetailPage } from '@/pages/contacts/ContactDetailPage';
import { ListsPage } from '@/pages/lists/ListsPage';
import { ListDetailPage } from '@/pages/lists/ListDetailPage';
import { ImportsPage } from '@/pages/imports/ImportsPage';
import { ImportDetailPage } from '@/pages/imports/ImportDetailPage';
import { CampaignsPage } from '@/pages/campaigns/CampaignsPage';
import { CampaignDetailPage } from '@/pages/campaigns/CampaignDetailPage';
import { CampaignBuilderPage } from '@/pages/campaigns/CampaignBuilderPage';
import { TemplatesPage } from '@/pages/templates/TemplatesPage';
import { SendersPage } from '@/pages/senders/SendersPage';
import { SenderDetailPage } from '@/pages/senders/SenderDetailPage';
import { WarmupPage } from '@/pages/warmup/WarmupPage';
import { DeliverabilityPage } from '@/pages/deliverability/DeliverabilityPage';
import { SuppressionsPage } from '@/pages/suppressions/SuppressionsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { RecommendationsPage } from '@/pages/recommendations/RecommendationsPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ActivityPage } from '@/pages/activity/ActivityPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { InboxPage } from '@/pages/inbox/InboxPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'contacts/:id', element: <ContactDetailPage /> },
      { path: 'lists', element: <ListsPage /> },
      { path: 'lists/:id', element: <ListDetailPage /> },
      { path: 'imports', element: <ImportsPage /> },
      { path: 'imports/:id', element: <ImportDetailPage /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'campaigns/new', element: <CampaignBuilderPage /> },
      { path: 'campaigns/:id/edit', element: <CampaignBuilderPage /> },
      { path: 'campaigns/:id', element: <CampaignDetailPage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'senders', element: <SendersPage /> },
      { path: 'senders/:id', element: <SenderDetailPage /> },
      { path: 'warmup', element: <WarmupPage /> },
      { path: 'deliverability', element: <DeliverabilityPage /> },
      { path: 'suppressions', element: <SuppressionsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'recommendations', element: <RecommendationsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'inbox', element: <InboxPage /> },
    ],
  },
]);
