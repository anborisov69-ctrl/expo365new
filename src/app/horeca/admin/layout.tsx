/**
 * Exhibitor Admin Layout — /horeca/admin/*
 * ─────────────────────────────────────────
 * Server Component: zero client JS for the layout boundary itself.
 * Delegates all interactive shell logic to AdminShell (Client Component),
 * which owns sidebar collapse state and wires together the full UI.
 *
 * Positioning: AdminShell uses `fixed inset-0 z-[60]` to overlay the
 * parent HoReCa layout's header (z-50) without modifying it, keeping
 * the route segment tree intact for shared loading states and metadata.
 */

import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: {
    template: '%s | Кабинет — EXPO 365',
    default: 'Панель управления | Кабинет — EXPO 365',
  },
  description: 'Кабинет экспонента на платформе EXPO 365 HoReCa.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
