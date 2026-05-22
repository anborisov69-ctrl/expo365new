'use client';

/**
 * Header.tsx — Глобальный хедер платформы EXPO 365
 * ──────────────────────────────────────────────────
 * Функциональные области:
 *   1. Хлебные крошки (Breadcrumbs) — навигация по маршруту
 *   2. Умный поиск (SmartSearchBar) — бренды + товары + компании
 *      ↳ Кросс-язычный: кириллица, транслитерация, раскладка, фонетика
 *      ↳ Бренды — приоритет; товары — фильтр по бренду; компании — текстовый
 *      ↳ @see src/components/search/SmartSearchBar.tsx
 *      ↳ @see src/lib/brandSearch.ts
 *   3. Мобильное меню (drawer)
 *   4. Аватар пользователя
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X, Home, ShoppingCart, FileText, Users, BarChart3, ChevronRight, ChevronDown, LayoutDashboard, User, LogOut, Settings, CreditCard } from 'lucide-react';

import Breadcrumbs from './Breadcrumbs';
import { SmartSearchBar } from '@/components/search/SmartSearchBar';

// ═══════════════════════════════════════════════════════════════════════════════
// КОНСТАНТЫ — ПРАВА ДОСТУПА (mock до Supabase Auth)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock-идентификатор владельца ООО «ТЕСТ».
 * В production — заменить на Supabase auth.uid() через useAuth() hook.
 *
 * @see src/hooks/useAuth.ts
 */
const OOO_TEST_EXHIBITOR_ID = 'exp-ooo-test';
const OOO_TEST_ADMIN_HREF   = '/horeca/admin/content/products';

/** Симулирует текущего авторизованного пользователя.
 *  Совпадение с OOO_TEST_EXHIBITOR_ID → показываем «Управление компанией». */
const MOCK_CURRENT_EXHIBITOR_ID = 'exp-ooo-test';

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — BREADCRUMBS С УЧЁТОМ ПОИСКОВОГО КОНТЕКСТА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `BreadcrumbTrail` — читает pathname + searchParams и строит хлебные крошки.
 * Требует Suspense-обёртки в родителе (Next.js App Router +  useSearchParams).
 *
 * Маппинг маршрутов:
 *   /horeca/discovery?search=кофе  → Витрина › «кофе»
 *   /horeca/exhibitors/[slug]       → Экспоненты › Профиль
 *   /horeca/marketplace?q=espresso → Витрина ЭКСПО 365 › «espresso»
 */
function BreadcrumbTrail() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const items: { label: string; href: string }[] = [
    { label: 'Главная', href: '/' },
  ];

  if (pathname.startsWith('/horeca')) {
    items.push({ label: 'HoReCa', href: '/horeca' });

    if (pathname.startsWith('/horeca/discovery')) {
      items.push({ label: 'Витрина', href: '/horeca/discovery' });
      const q = searchParams.get('search');
      if (q) items.push({ label: `«${q}»`, href: `${pathname}?search=${encodeURIComponent(q)}` });
    } else if (pathname.startsWith('/horeca/exhibitors/')) {
      items.push({ label: 'Экспоненты', href: '/horeca/discovery' });
      items.push({ label: 'Профиль', href: pathname });
    } else if (pathname.startsWith('/horeca/marketplace')) {
      items.push({ label: 'Витрина ЭКСПО 365', href: '/horeca/marketplace' });
      const q = searchParams.get('q');
      if (q) items.push({ label: `«${q}»`, href: `${pathname}?q=${encodeURIComponent(q)}` });
    } else if (pathname.startsWith('/horeca/finance')) {
      items.push({ label: 'Финансовая поддержка', href: '/horeca/finance' });
    } else if (pathname !== '/horeca') {
      items.push({ label: 'Обзор', href: pathname });
    }
  } else {
    items.push({ label: 'Личный кабинет', href: pathname });
  }

  return <Breadcrumbs items={items} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ ХЕДЕРА
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ — ПРОФИЛЬ С ДРОПДАУНОМ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `UserProfileMenu` — аватар пользователя + выпадающее меню.
 *
 * Логика "Управление компанией":
 *   - Видна только когда текущий пользователь является владельцем экспонента.
 *   - Ведёт прямо на `/horeca/admin/content/products` — товары ООО «ТЕСТ».
 *   - Акцент #F26522 (brand-orange) выделяет CTA среди служебных пунктов меню.
 */
function UserProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  const isOwner = MOCK_CURRENT_EXHIBITOR_ID === OOO_TEST_EXHIBITOR_ID;

  // Закрываем по клику вне компонента
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* ── Кнопка-аватар ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Профиль пользователя"
        className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center text-white text-xs font-semibold select-none">
          П
        </div>
        <span className="text-sm text-slate-500 hidden sm:inline font-medium tracking-wide">
          Личный кабинет
        </span>
        <ChevronDown
          className={[
            'hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {/* ── Дропдаун-меню ── */}
      {open && (
        <>
          {/* Backdrop для закрытия */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div
            role="menu"
            className="absolute right-0 top-11 z-20 w-60 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          >
            {/* Шапка: имя + email */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Пользователь</p>
              <p className="text-xs text-slate-400">user@expo365.ru</p>
            </div>

            {/* ── CTA: Управление компанией (только для владельца) ── */}
            {isOwner && (
              <div className="px-2 pt-2">
                <Link
                  href={OOO_TEST_ADMIN_HREF}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-[#F26522]/8 hover:bg-[#F26522]/15 border border-[#F26522]/20 hover:border-[#F26522]/40 transition-all group"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#F26522] flex-shrink-0" />
                  <span className="text-sm font-semibold text-[#F26522] leading-none">
                    Управление компанией
                  </span>
                </Link>
              </div>
            )}

            {/* ── Обычные пункты ── */}
            <ul className="py-2 px-2 space-y-0.5">
              <li>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-blue rounded-lg transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Мой профиль
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-blue rounded-lg transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  Настройки
                </Link>
              </li>
            </ul>

            {/* ── Выход ── */}
            <div className="border-t border-slate-100 px-2 pb-2">
              <button
                type="button"
                role="menuitem"
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Выйти
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ ХЕДЕРА
// ═══════════════════════════════════════════════════════════════════════════════

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { label: 'Обзор',             href: '/',                    icon: Home        },
    { label: 'Моя витрина',       href: '/marketplace',         icon: ShoppingCart },
    { label: 'Тендеры',           href: '/tenders',             icon: FileText    },
    { label: 'HR-модуль',         href: '/hr',                  icon: Users       },
    { label: 'Аналитика',         href: '/analytics',           icon: BarChart3   },
    { label: 'Финансы и лизинг',  href: '/horeca/finance',      icon: CreditCard  },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="flex items-center justify-between h-full px-4 lg:px-6 gap-4">

          {/* ── Левая зона: бургер (mobile) + хлебные крошки (desktop) ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block">
              <Suspense fallback={
                <nav className="flex items-center space-x-2 text-sm text-gray-600">
                  <a href="/" className="hover:text-gray-900">Главная</a>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-gray-400">…</span>
                </nav>
              }>
                <BreadcrumbTrail />
              </Suspense>
            </div>
          </div>

          {/* ── Центральная зона: умный поиск (бренды + товары + компании) ── */}
          <div className="flex-1 flex justify-center">
            <SmartSearchBar />
          </div>

          {/* ── Правая зона: профиль с дропдауном ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <UserProfileMenu />
          </div>
        </div>
      </header>

      {/* ── Мобильный drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-full max-w-xs bg-white p-5 shadow-2xl flex flex-col">
            {/* Шапка drawer */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-blue">Меню EXPO 365</p>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
                onClick={() => setMobileOpen(false)}
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Поиск в мобильном меню */}
            <div className="mb-4">
              <SmartSearchBar />
            </div>

            {/* Навигация */}
            <nav className="space-y-2 flex-1">
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
