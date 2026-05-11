'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, Menu, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExponentChatAlert from '@/components/chat/ExponentChatAlert';

// ── Константа витрины экспонента ────────────────────────────────────────────
/** Публичная страница ООО «ТЕСТ» — переход «глазами клиента» */
const OOO_TEST_STOREFRONT_HREF = '/horeca/exhibitors/ooo-test';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Mock notifications — in production fetched from Supabase realtime
  const notifications = [
    { id: '1', text: 'Новый тендер-запрос от GrandHotel', time: '2 мин назад', unread: true },
    { id: '2', text: 'Контракт №4521 ожидает вашей подписи', time: '15 мин назад', unread: true },
    { id: '3', text: 'Ежемесячный аналитический отчёт готов', time: '1 ч назад', unread: false },
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="relative flex-shrink-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10">
      <div className="flex items-center justify-between h-full px-6">

        {/* ── Left: Mobile sidebar toggle + Page title ─────────────────────── */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger (hidden on sm+ since sidebar toggle handles it) */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-[#0B2B5E] hover:bg-slate-100 transition-colors"
            aria-label="Переключить меню"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / page context */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-medium text-slate-600">Кабинет экспонента</span>
            <span>/</span>
            <span>Панель управления</span>
          </div>

          {/* ── «На витрину» — быстрый просмотр публичного профиля ── */}
          <Link
            href={OOO_TEST_STOREFRONT_HREF}
            target="_blank"
            rel="noopener noreferrer"
            title="Посмотреть витрину глазами клиента"
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg',
              'text-xs font-semibold text-[#F26522] border border-[#F26522]/30',
              'bg-[#F26522]/5 hover:bg-[#F26522]/10 hover:border-[#F26522]/50',
              'transition-all duration-150 select-none'
            )}
          >
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            На витрину
          </Link>
        </div>

        {/* ── Right: Controls cluster ───────────────────────────────────────── */}
        <div className="flex items-center gap-2">

          {/* ── Online / Offline Status Toggle ─────────────────────────────── */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
            {/* Status dot */}
            <span
              className={cn(
                'flex-shrink-0 w-2 h-2 rounded-full transition-colors duration-300',
                isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-400'
              )}
            />
            {/* Toggle button */}
            <button
              type="button"
              onClick={() => setIsOnline((v) => !v)}
              role="switch"
              aria-checked={isOnline}
              className="relative inline-flex w-8 h-4 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]"
              style={{
                backgroundColor: isOnline ? '#10B981' : '#CBD5E1',
              }}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300',
                  isOnline ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <span className={cn(
              'text-xs font-medium transition-colors',
              isOnline ? 'text-emerald-600' : 'text-slate-400'
            )}>
              {isOnline ? 'В сети' : 'Не в сети'}
            </span>
          </div>

          {/* ── Notification Bell ────────────────────────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-[#0B2B5E] hover:bg-slate-100 transition-colors"
              aria-label="Уведомления"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Уведомления</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-[#F26522] font-medium">{unreadCount} новых</span>
                    )}
                  </div>
                  <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 text-sm hover:bg-slate-50 transition-colors cursor-pointer',
                          n.unread && 'bg-[#0B2B5E]/[0.02]'
                        )}
                      >
                        {n.unread && (
                          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F26522]" />
                        )}
                        {!n.unread && <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5" />}
                        <div className="flex-1 min-w-0">
                          <p className={cn('leading-snug', n.unread ? 'text-slate-700 font-medium' : 'text-slate-500')}>
                            {n.text}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="px-4 py-2 border-t border-slate-100">
                    <button className="text-xs text-[#0B2B5E] font-medium hover:underline w-full text-center">
                      Все уведомления
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Chat Alert — входящие чаты от посетителей витрины ────────────── */}
          {/*
           * Слушает BroadcastChannel('expo-chat-ooo-test').
           * При SessionStart → пульсирующая оранжевая рамка (#F26522).
           * Снимается при первом нажатии клавиши менеджера.
           */}
          <ExponentChatAlert
            exhibitorSlug="ooo-test"
            managerLabel="Сотрудник ООО «ТЕСТ» на связи"
          />

          {/* ── User Profile ─────────────────────────────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0B2B5E] to-[#1a4a9e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none uppercase">
                АК
              </div>
              {/* Name + Role */}
              <div className="hidden md:flex flex-col items-start leading-none gap-0.5">
                <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Алексей К.</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">Экспонент</span>
              </div>
              <ChevronDown
                className={cn(
                  'hidden md:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                  profileOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700">Алексей Козлов</p>
                    <p className="text-xs text-slate-400">a.kozlov@example.com</p>
                  </div>
                  <ul className="py-1">
                    {[
                       { label: 'Мой профиль', href: '/horeca/admin/profile' },
                       { label: 'Настройки', href: '/horeca/admin/settings' },
                       { label: 'Оплата', href: '/horeca/admin/billing' },
                    ].map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#0B2B5E] transition-colors"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-slate-100 py-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
