'use client';

import React, { useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, ShoppingCart, FileText, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const Header = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Breadcrumb-builder ──────────────────────────────────────────────────────
  // Правило: каждый сегмент пути → отдельный элемент в цепочке.
  // Специальные случаи для известных роутов; fallback — «Страница».
  const breadcrumbItems: { label: string; href: string }[] = [
    { label: 'Главная', href: '/' },
  ];

  if (pathname.startsWith('/horeca')) {
    breadcrumbItems.push({ label: 'HoReCa', href: '/horeca' });

    if (pathname.startsWith('/horeca/discovery')) {
      breadcrumbItems.push({ label: 'Витрина', href: '/horeca/discovery' });
    } else if (pathname.startsWith('/horeca/exhibitors/')) {
      breadcrumbItems.push({ label: 'Экспоненты', href: '/horeca/discovery' });
      breadcrumbItems.push({ label: 'Профиль', href: pathname });
    } else if (pathname.startsWith('/horeca/finance')) {
      breadcrumbItems.push({ label: 'Финансовая поддержка', href: '/horeca/finance' });
    } else if (pathname !== '/horeca') {
      breadcrumbItems.push({ label: 'Обзор', href: pathname });
    }
  } else {
    breadcrumbItems.push({ label: 'Личный кабинет', href: pathname });
  }

  const menuItems = [
    { label: 'Обзор', href: '/', icon: Home },
    { label: 'Моя витрина', href: '/marketplace', icon: ShoppingCart },
    { label: 'Тендеры', href: '/tenders', icon: FileText },
    { label: 'HR-модуль', href: '/hr', icon: Users },
    { label: 'Аналитика', href: '/analytics', icon: BarChart3 },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block">
              <Breadcrumbs items={breadcrumbItems} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline font-medium tracking-wide">Личный кабинет</span>
            <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center text-white text-xs font-semibold select-none">
              П
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-full max-w-xs bg-white p-5 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-blue">Меню EXPO 365</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
                onClick={() => setMobileOpen(false)}
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-3">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon className="h-5 w-5 text-brand-blue" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;