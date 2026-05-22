/**
 * app/horeca/hr-hub/page.tsx — HR Hub (Server Component)
 * ─────────────────────────────────────────────────────────
 * Маршрут: /horeca/hr-hub
 *
 * SSR-стратегия:
 *   1. Параллельная загрузка вакансий и резюме через getVacancies / getResumes
 *   2. Проверка сессии через getUser (не getSession!) — без доп. запроса
 *   3. Данные передаются в HrHubClient как initial props
 *
 * Безопасность:
 *   - Страница публичная (просмотр без авторизации)
 *   - currentUserId = null → отключает кнопки «Откликнуться» / «Архивировать»
 *
 * @module app/horeca/hr-hub/page
 */

import { cookies }           from 'next/headers'
import { Metadata }          from 'next'
import { createClient }      from '@/utils/supabase/server'
import { getVacancies, getResumes, getUserRole } from './actions'
import { HrHubClient }       from './HrHubClient'

// ── Метаданные страницы ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'HR Hub — EXPO 365',
  description: 'Вакансии и резюме HoReCa-специалистов. Бариста, шеф-повара, менеджеры, инженеры.',
  openGraph: {
    title:       'HR Hub | EXPO 365',
    description: 'Биржа труда для индустрии гостеприимства',
    siteName:    'EXPO 365',
  },
}

// ── Динамическая страница (авторизация зависит от куки) ──────────────────────
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// SERVER COMPONENT
// ══════════════════════════════════════════════════════════════════

export default async function HrHubPage() {
  const cookieStore = await cookies()
  const supabase    = createClient(cookieStore)

  // ── Параллельная загрузка данных ────────────────────────────────
  const [vacanciesResult, resumesResult, { data: { user } }, userRole] = await Promise.all([
    getVacancies(),
    getResumes(),
    supabase.auth.getUser(),
    getUserRole(),
  ])

  const vacancies = vacanciesResult.success ? (vacanciesResult.data ?? []) : []
  const resumes   = resumesResult.success   ? (resumesResult.data   ?? []) : []

  return (
    <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div
          className="relative overflow-hidden rounded-2xl border border-[#0B2B5E]/20 bg-gradient-to-br from-[#0B2B5E] to-[#193c7a] px-8 py-10"
          aria-label="HR Hub — биржа труда для HoReCa"
        >
          {/* Декоративная сетка */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 40px),' +
                'repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-[#F26522] mb-3">
              HR Hub · EXPO 365
            </span>
            <h1 className="text-3xl font-black text-white leading-tight mb-3">
              Биржа труда<br />для HoReCa-индустрии
            </h1>
            <p className="text-[#a8c4e8] text-sm leading-relaxed max-w-lg">
              Вакансии от поставщиков оборудования и ресторанов. Резюме опытных барист,
              шеф-поваров, сервисных инженеров и менеджеров. Найдите лучших специалистов
              отрасли или позицию своей мечты.
            </p>
          </div>

          {/* Статистика */}
          <div className="relative z-10 mt-6 flex gap-6 flex-wrap">
            <div>
              <div className="text-2xl font-black text-white">{vacancies.length}</div>
              <div className="text-[11px] text-[#a8c4e8] uppercase tracking-wider">Вакансий</div>
            </div>
            <div className="w-px bg-white/10" aria-hidden="true" />
            <div>
              <div className="text-2xl font-black text-white">{resumes.length}</div>
              <div className="text-[11px] text-[#a8c4e8] uppercase tracking-wider">Резюме</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Клиентский дашборд ─────────────────────────────────────── */}
      <HrHubClient
        initialVacancies={vacancies}
        initialResumes={resumes}
        currentUserId={user?.id ?? null}
        currentUserRole={userRole}
      />
    </main>
  )
}
