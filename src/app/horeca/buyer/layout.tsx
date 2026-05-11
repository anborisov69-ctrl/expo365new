'use client'

import { redirect } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import Link from 'next/link'

interface BuyerLayoutProps {
  children: React.ReactNode
}

/**
 * BuyerLayout — обёртка кабинета покупателя /horeca/buyer/**
 * ─────────────────────────────────────────────────────────
 * Структура:
 *   - mt-16          : компенсация высоты фиксированного глобального Header (h-16)
 *   - ds-subheader   : белая sticky-шапка кабинета (единый дизайн-код)
 *   - main           : контентная область с padding по сетке 8px
 *
 * Фон страницы наследуется от HoReCaLayout (.ds-page / blueprint-grid).
 */
export default function BuyerLayout({ children }: BuyerLayoutProps) {
  const { user, isAuthorized, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && (!isAuthorized || !user)) {
      redirect('/horeca?action=login')
      return
    }

    if (!isLoading && user && user.role !== 'buyer' && user.role !== 'partner') {
      redirect('/horeca?action=unauthorized')
      return
    }
  }, [user, isAuthorized, isLoading])

  if (isLoading) {
    return (
      <div className="mt-16 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B2B5E] mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Загрузка кабинета покупателя…</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized || !user) {
    return null // Редирект уже произошёл
  }

  if (user.role !== 'buyer' && user.role !== 'partner') {
    return null // Редирект уже произошёл
  }

  return (
    /* mt-16 — сдвиг под фиксированный глобальный Header */
    <div className="mt-16 min-h-[calc(100vh-4rem)] flex flex-col">

      {/*
       * Подшапка кабинета покупателя.
       * ds-subheader = bg-white + border-bottom + shadow.
       * sticky top-16 z-40 — прилипает сразу под глобальным хедером (z-50).
       */}
      <div className="ds-subheader sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Левая зона: идентификатор кабинета */}
          <div className="flex items-center gap-3">
            {/* Пиктограмма-аватар кабинета */}
            <div className="w-8 h-8 rounded-lg bg-[#0B2B5E] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-[#0B2B5E] leading-tight">Кабинет покупателя</p>
              <p className="text-xs text-slate-400 leading-tight">EXPO 365 HoReCa</p>
            </div>
          </div>

          {/* Правая зона: навигация */}
          <nav className="flex items-center gap-1" aria-label="Навигация кабинета покупателя">
            {[
              { href: '/horeca/discovery',   label: 'Каталог'       },
              { href: '/horeca/marketplace', label: 'Маркетплейс'   },
              { href: '/horeca/finance',     label: 'Финансирование' },
              { href: '/horeca',             label: 'Главная'        },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-[#0B2B5E] hover:bg-[#0B2B5E]/5 transition-all duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Контентная область */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}
