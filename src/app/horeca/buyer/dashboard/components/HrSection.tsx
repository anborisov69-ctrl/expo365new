'use client'

/**
 * components/HrSection.tsx — HR-секция в кабинете покупателя/экспонента
 * ────────────────────────────────────────────────────────────────────────
 * Отображает:
 *   • Мои активные вакансии (с кнопкой архивации)
 *   • CTA «Разместить вакансию» → inline VacancyForm
 *   • Ссылка на полный HR Hub
 *
 * Данные грузятся клиентски через getMyVacancies() при монтировании.
 * Это позволяет не блокировать SSR загрузку дашборда.
 *
 * @module app/horeca/buyer/dashboard/components/HrSection
 */

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink, Loader2, Users, MapPin, ChevronRight } from 'lucide-react'
import { getMyVacancies, updateVacancyStatus } from '@/app/horeca/hr-hub/actions'
import { VacancyForm } from '@/app/horeca/hr-hub/components/VacancyForm'
import {
  HR_CATEGORY_LABELS,
  HR_EMPLOYMENT_TYPE_LABELS,
} from '@/modules/hr-tech'
import type { HrVacancy } from '@/types/hr'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HrVacancy['status'] }) {
  const cfg = {
    active: { label: 'Активна',   cls: 'bg-green-50 text-green-600' },
    draft:  { label: 'Черновик',  cls: 'bg-slate-100 text-slate-500' },
    closed: { label: 'Закрыта',   cls: 'bg-red-50 text-red-500'   },
  }[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Компактная строка вакансии ────────────────────────────────────────────────

function VacancyRow({
  vacancy,
  onArchive,
  isArchiving,
}: {
  vacancy:     HrVacancy
  onArchive:   (id: string) => void
  isArchiving: boolean
}) {
  const categoryLabel   = HR_CATEGORY_LABELS[vacancy.category as keyof typeof HR_CATEGORY_LABELS] ?? vacancy.category
  const employmentLabel = HR_EMPLOYMENT_TYPE_LABELS[vacancy.employment_type] ?? vacancy.employment_type

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#0B2B5E]/8 last:border-0">
      {/* Левый акцент */}
      <div className="w-0.5 h-10 bg-[#F26522] rounded-full flex-shrink-0" />

      {/* Данные */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-[#0B2B5E] truncate">{vacancy.title}</span>
          <StatusBadge status={vacancy.status} />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>{categoryLabel}</span>
          <span>·</span>
          <span>{employmentLabel}</span>
          {vacancy.location && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {vacancy.location}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Отклики */}
      <div className="flex-shrink-0 flex items-center gap-1 text-slate-400">
        <Users className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{vacancy.applications_count}</span>
      </div>

      {/* Кнопка архивации */}
      {vacancy.status === 'active' && (
        <button
          type="button"
          onClick={() => onArchive(vacancy.id)}
          disabled={isArchiving}
          className="flex-shrink-0 text-[11px] text-slate-400 hover:text-red-500 transition-colors font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50"
        >
          {isArchiving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Закрыть'}
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ══════════════════════════════════════════════════════════════════

interface HrSectionProps {
  /** Тип работодателя для формы (предзаполнение) */
  defaultEmployerType?: 'exhibitor' | 'visitor'
}

export function HrSection({ defaultEmployerType = 'visitor' }: HrSectionProps) {
  const [vacancies, setVacancies]           = useState<HrVacancy[]>([])
  const [isLoading, setIsLoading]           = useState(true)
  const [showForm, setShowForm]             = useState(false)
  const [archivingId, setArchivingId]       = useState<string | null>(null)
  const [, startTransition]                 = useTransition()

  // ── Загрузка моих вакансий ─────────────────────────────────────────
  useEffect(() => {
    getMyVacancies().then((result) => {
      if (result.success && result.data) {
        setVacancies(result.data)
      }
      setIsLoading(false)
    })
  }, [])

  // ── Архивация ─────────────────────────────────────────────────────
  function handleArchive(vacancyId: string) {
    setArchivingId(vacancyId)
    startTransition(async () => {
      const result = await updateVacancyStatus(vacancyId, 'closed')
      if (result.success) {
        setVacancies((prev) =>
          prev.map((v) => v.id === vacancyId ? { ...v, status: 'closed' } : v)
        )
      }
      setArchivingId(null)
    })
  }

  // ── Вакансия создана ──────────────────────────────────────────────
  function handleVacancyCreated(vacancy: HrVacancy) {
    setVacancies((prev) => [vacancy, ...prev])
    setShowForm(false)
  }

  const activeCount = vacancies.filter((v) => v.status === 'active').length

  return (
    <div className="bg-white rounded-2xl border border-[#0B2B5E]/20 overflow-hidden">
      {/* ── Заголовок секции ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#0B2B5E]/10 bg-[#0B2B5E]/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0B2B5E]/8 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#0B2B5E]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#0B2B5E] leading-none">
              HR / Вакансии
            </h2>
            {!isLoading && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeCount > 0
                  ? `${activeCount} активных вакансий`
                  : 'Нет активных вакансий'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ссылка на HR Hub */}
          <Link
            href="/horeca/hr-hub"
            className="inline-flex items-center gap-1 text-xs text-[#0B2B5E] hover:text-[#F26522] transition-colors font-semibold"
          >
            HR Hub
            <ExternalLink className="w-3 h-3" />
          </Link>

          {/* Создать вакансию */}
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 bg-[#F26522] hover:bg-[#E55A1F] text-white text-xs font-black px-3.5 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Новая вакансия
          </button>
        </div>
      </div>

      {/* ── Инлайн-форма ─────────────────────────────────────────── */}
      {showForm && (
        <div className="px-5 py-4 border-b border-[#0B2B5E]/10">
          <VacancyForm
            onSuccess={handleVacancyCreated}
            onCancel={() => setShowForm(false)}
            defaultEmployerType={defaultEmployerType}
          />
        </div>
      )}

      {/* ── Список вакансий ──────────────────────────────────────── */}
      <div className="px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[#0B2B5E]/40" />
          </div>
        ) : vacancies.length === 0 && !showForm ? (
          /* Пустое состояние */
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400 mb-3">
              У вас нет размещённых вакансий
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 text-sm text-[#F26522] hover:text-[#E55A1F] font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Разместить первую вакансию
            </button>
          </div>
        ) : (
          /* Список */
          <div>
            {vacancies.slice(0, 5).map((v) => (
              <VacancyRow
                key={v.id}
                vacancy={v}
                onArchive={handleArchive}
                isArchiving={archivingId === v.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Подвал: ссылка «Все вакансии» ───────────────────────── */}
      {vacancies.length > 0 && (
        <div className="px-5 py-3 border-t border-[#0B2B5E]/8">
          <Link
            href="/horeca/hr-hub"
            className="inline-flex items-center gap-1 text-xs text-[#0B2B5E] hover:text-[#F26522] transition-colors font-bold"
          >
            Перейти в HR Hub
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
