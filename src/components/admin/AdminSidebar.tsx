'use client';

/**
 * AdminSidebar — навигационная боковая панель Кабинета Экспонента
 * ────────────────────────────────────────────────────────────────
 * Содержит:
 *   • Логотип EXPO 365 ADMIN
 *   • Основная навигация NAV_ITEMS с sub-меню для раздела «Контент»
 *   • Секция «БРЕНДЫ» — появляется только на маршруте /horeca/admin/content/products
 *     Мультичекбокс по брендам: обновляет URL-параметр ?brands=... и навигирует.
 *   • Кнопка свернуть/развернуть
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Layout,
  BarChart2,
  FileText,
  Mail,
  Package,
  Megaphone,
  Image,
  CalendarDays,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Users,
  Link2,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNIQUE_PRODUCT_BRANDS } from '@/data/productsData';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubMenuItem {
  label: string;
  href:  string;
  icon:  React.ElementType;
}

interface NavItem {
  label:    string;
  href:     string;
  icon:     React.ElementType;
  subItems?: SubMenuItem[];
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle:  () => void;
}

// ── Navigation config ──────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Панель управления',
    href:  '/horeca/admin',
    icon:  Home,
  },
  {
    label: 'Контент',
    href:  '/horeca/admin/content',
    icon:  Layout,
    subItems: [
      { label: 'Мои товары',     href: '/horeca/admin/content/products', icon: Package },
      { label: 'Новости и акции', href: '/horeca/admin/news',             icon: Megaphone },
      { label: 'Медиатека',      href: '/horeca/admin/content/media',    icon: Image },
      { label: 'Публикации',     href: '/horeca/admin/content/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Аналитика',
    href:  '/horeca/admin/analytics',
    icon:  BarChart2,
  },
  {
    label: 'Сделки',
    href:  '/horeca/admin/deals',
    icon:  FileText,
  },
  {
    label: 'Партнёры',
    href:  '/horeca/admin/partners',
    icon:  Users,
    subItems: [
      { label: 'Приглашенные клиенты', href: '/horeca/admin/partners',       icon: Users },
      { label: 'Созданные приглашения', href: '/horeca/admin/partners#links', icon: Link2 },
    ],
  },
  {
    label: 'Приглашения',
    href:  '/horeca/admin/invitations',
    icon:  QrCode,
    subItems: [
      { label: 'Партнёрская ссылка', href: '/horeca/admin/invitations#partner', icon: Users   },
      { label: 'Гостевая ссылка',    href: '/horeca/admin/invitations#visitor', icon: Link2   },
      { label: 'Бизнес-ссылка',      href: '/horeca/admin/invitations#b2b',     icon: QrCode  },
    ],
  },
  {
    label: 'Сообщения',
    href:  '/horeca/admin/messages',
    icon:  Mail,
  },
  {
    label: 'Настройки',
    href:  '/horeca/admin/settings',
    icon:  Settings,
  },
];

// ── Brands checkbox row ────────────────────────────────────────────────────────

interface BrandRowProps {
  brand:    string;
  checked:  boolean;
  onToggle: () => void;
}

function BrandRow({ brand, checked, onToggle }: BrandRowProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none',
        'transition-colors duration-100 group',
        'hover:bg-[#0B2B5E]/5',
      )}
    >
      {/* Custom checkbox */}
      <span
        className={cn(
          'flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center',
          'transition-all duration-150',
          checked
            ? 'border-[#0B2B5E]'
            : 'border-slate-300 group-hover:border-[#0B2B5E]/50',
        )}
        style={checked ? { backgroundColor: '#0B2B5E' } : {}}
        aria-hidden="true"
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path
              d="M1 3L3 5L7 1"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onToggle}
        aria-label={`Фильтр: ${brand}`}
      />

      <span
        className={cn(
          'flex-1 text-[10px] font-medium truncate leading-none',
          checked ? 'text-[#0B2B5E] font-semibold' : 'text-slate-500',
        )}
      >
        {brand}
      </span>
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  // ── Nav sub-menu state ────────────────────────────────────────────────────
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    '/horeca/admin/content': true,
  });

  // ── Brand filter state (только для маршрута /horeca/admin/content/products) ─
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  /**
   * Синхронизируем выбранные бренды с URL-параметром ?brands=...
   * при переходе на страницу товаров.
   */
  useEffect(() => {
    if (!pathname.startsWith('/horeca/admin/content/products')) {
      setSelectedBrands([]);
      return;
    }
    try {
      const params  = new URLSearchParams(window.location.search);
      const raw     = params.get('brands');
      setSelectedBrands(raw ? raw.split(',').filter(Boolean) : []);
    } catch { /* SSR fallback */ }
  }, [pathname]);

  // ── Brand toggle → обновляем URL ────────────────────────────────────────────
  const handleBrandToggle = useCallback(
    (brand: string) => {
      setSelectedBrands((prev) => {
        const next = prev.includes(brand)
          ? prev.filter((b) => b !== brand)
          : [...prev, brand];

        // Обновляем URL-параметр и переходим на страницу товаров
        const params = new URLSearchParams(window.location.search);
        if (next.length > 0) {
          params.set('brands', next.join(','));
        } else {
          params.delete('brands');
        }
        const query = params.toString();
        router.push(
          `/horeca/admin/content/products${query ? `?${query}` : ''}`,
        );

        return next;
      });
    },
    [router],
  );

  // ── Показывать ли секцию БРЕНДЫ ─────────────────────────────────────────────
  const showBrandsFilter =
    !collapsed && pathname.startsWith('/horeca/admin/content/products');

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggleSubMenu = (href: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const isActive       = (href: string) => pathname === href;
  const isParentActive = (item: NavItem) =>
    item.subItems?.some((sub) => pathname.startsWith(sub.href)) ||
    pathname.startsWith(item.href + '/');

  return (
    <aside
      className={cn(
        'relative flex-shrink-0 flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-16' : 'w-72',
      )}
    >
      {/* ── Logo Section ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-slate-200 flex-shrink-0',
          collapsed ? 'justify-center px-0' : 'px-5 gap-3',
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0B2B5E] flex items-center justify-center">
          <span className="text-white text-xs font-black tracking-tighter select-none">E</span>
        </div>

        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#0B2B5E] font-black text-sm tracking-widest uppercase select-none leading-none">
              EXPO 365
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#F26522] text-white uppercase leading-none">
              ADMIN
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation + Brands (scrollable) ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin' }}>

        {/* Main nav */}
        <nav className="py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon         = item.icon;
            const hasSubItems  = !!item.subItems?.length;
            const parentActive = isParentActive(item);
            const directActive = isActive(item.href);
            const active       = directActive && !hasSubItems;
            const subMenuOpen  = openSubMenus[item.href] ?? false;

            const sharedClassName = cn(
              'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative',
              'hover:bg-[#0B2B5E]/5 hover:text-[#0B2B5E]',
              (active || parentActive)
                ? [
                    'text-[#0B2B5E] bg-[#0B2B5E]/5',
                    'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                    'before:w-[3px] before:h-6 before:rounded-r-full before:bg-[#F26522]',
                  ]
                : 'text-slate-500',
              collapsed ? 'justify-center' : '',
            );

            const itemContent = (
              <>
                <Icon
                  className={cn(
                    'flex-shrink-0 w-5 h-5 transition-colors',
                    (active || parentActive)
                      ? 'text-[#0B2B5E]'
                      : 'text-slate-400 group-hover:text-[#0B2B5E]',
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left leading-none truncate">{item.label}</span>
                    {hasSubItems && (
                      <span className="flex-shrink-0">
                        {subMenuOpen
                          ? <ChevronDown className="w-4 h-4 text-slate-400" />
                          : <ChevronRight className="w-4 h-4 text-slate-400" />
                        }
                      </span>
                    )}
                  </>
                )}
              </>
            );

            return (
              <div key={item.href}>
                {hasSubItems ? (
                  <button
                    type="button"
                    onClick={() => { if (!collapsed) toggleSubMenu(item.href); }}
                    className={sharedClassName}
                    title={collapsed ? item.label : undefined}
                  >
                    {itemContent}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={sharedClassName}
                    title={collapsed ? item.label : undefined}
                  >
                    {itemContent}
                  </Link>
                )}

                {/* Sub-menu */}
                {hasSubItems && !collapsed && subMenuOpen && (
                  <div className="mt-0.5 ml-4 pl-4 border-l border-slate-100 space-y-0.5">
                    {item.subItems!.map((sub) => {
                      const SubIcon  = sub.icon;
                      const subActive = isActive(sub.href);

                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative',
                            'hover:bg-[#0B2B5E]/5 hover:text-[#0B2B5E]',
                            subActive
                              ? [
                                  'text-[#0B2B5E] font-medium bg-[#0B2B5E]/5',
                                  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                                  'before:w-[3px] before:h-5 before:rounded-r-full before:bg-[#F26522]',
                                ]
                              : 'text-slate-500 font-normal',
                          )}
                        >
                          <SubIcon
                            className={cn(
                              'flex-shrink-0 w-4 h-4',
                              subActive
                                ? 'text-[#0B2B5E]'
                                : 'text-slate-400 group-hover:text-[#0B2B5E]',
                            )}
                          />
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ══ БРЕНДЫ — отображается только на странице товаров ════════════════ */}
        {showBrandsFilter && (
          <div
            className="mx-2 mb-4 mt-1"
            style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
          >
            {/* Заголовок секции */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3 h-3" style={{ color: '#0B2B5E' }} aria-hidden="true" />
                <p
                  className="text-[8px] font-black uppercase tracking-widest leading-none"
                  style={{ color: '#0B2B5E' }}
                >
                  Бренды
                </p>
                {selectedBrands.length > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[16px] h-3.5 px-1 rounded-full text-[7px] font-bold leading-none text-white"
                    style={{ backgroundColor: '#F26522' }}
                    aria-label={`Выбрано брендов: ${selectedBrands.length}`}
                  >
                    {selectedBrands.length}
                  </span>
                )}
              </div>

              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrands([]);
                    router.push('/horeca/admin/content/products');
                  }}
                  className="text-[8px] font-semibold text-slate-400 hover:text-[#F26522] transition-colors duration-150"
                  aria-label="Сбросить фильтр брендов"
                >
                  Сброс
                </button>
              )}
            </div>

            {/* Список брендов с checkbox */}
            <div
              className="flex flex-col gap-0.5 px-1 pb-2 max-h-[240px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin' }}
              role="group"
              aria-label="Фильтр по брендам"
            >
              {UNIQUE_PRODUCT_BRANDS.map((brand) => (
                <BrandRow
                  key={brand}
                  brand={brand}
                  checked={selectedBrands.includes(brand)}
                  onToggle={() => handleBrandToggle(brand)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Collapsed: иконка-бейдж брендов (когда свёрнут и на странице товаров) */}
        {collapsed && pathname.startsWith('/horeca/admin/content/products') && (
          <div className="flex justify-center py-2">
            <div
              className="relative w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
              title={`Фильтр брендов${selectedBrands.length > 0 ? ` (${selectedBrands.length})` : ''}`}
            >
              <Tag className="w-4 h-4" style={{ color: '#0B2B5E' }} />
              {selectedBrands.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white leading-none"
                  style={{ backgroundColor: '#F26522' }}
                >
                  {selectedBrands.length}
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Collapse Toggle ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-200 p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-slate-400 hover:text-[#0B2B5E] hover:bg-[#0B2B5E]/5 transition-all duration-150',
            collapsed ? 'justify-center' : '',
          )}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed
            ? <PanelLeftOpen className="w-5 h-5" />
            : (
              <>
                <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs">Свернуть</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
}
