'use client'

/**
 * components/VacancyCard.tsx — Карточка вакансии для HR Hub
 * ─────────────────────────────────────────────────────────
 * Дизайн: rounded-2xl, border-[#0B2B5E]/20, brand-blue/orange.
 * Без emoji. Высокотехнологичный B2B-минимализм.
 *
 * @module app/horeca/hr-hub/components/VacancyCard
 */

import { MapPin, Clock, Building2, Users, ChevronRight } from 'lucide-react'
import type { HrVacancy } from '@/types/hr'
import {
  HR_CATEGORY_LABELS,
  HR_EMPLOYMENT_TYPE_LABELS,
} from '@/types/hr'

// ── Форматирование зарплатной вилки ─────────────────────────────────────────

function formatSalary(salary: HrVacancy['salary_range']): string {
  const { min, max, currency } = salary

  const currencySymbol: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
  }
  const sym = currencySymbol[currency] ?? currency

  if (!min && !max) return 'Зарплата по договорённости'
  if (min && !max)  return `от ${min.toLocaleString('ru-RU')} ${sym}`
  if (!min && max)  return `до ${max.toLocaleString('ru-RU')} ${sym}`
  return `${min!.toLocaleString('ru-RU')} — ${max!.toLocaleString('ru-RU')} ${sym}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ── Бейдж типа работодателя ─────────────────────────────────────────────────

function EmployerTypeBadge({ type }: { type: HrVacancy['employer_type'] }) {
  const isExhibitor = type === 'exhibitor'
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
        isExhibitor
          ? 'bg-[#0B2B5E]/8 text-[#0B2B5E]'
          : 'bg-[#F26522]/10 text-[#F26522]',
      ].join(' ')}
    >
      {isExhibitor ? 'Поставщик' : 'Ресторан'}
    </span>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

interface VacancyCardProps {
  vacancy:     HrVacancy
  onApply?:    (vacancy: HrVacancy) => void
  isOwner?:    boolean
  onArchive?:  (id: string) => void
  className?:  string
}

// ══════════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ══════════════════════════════════════════════════════════════════

export function VacancyCard({
  vacancy,
  onApply,
  isOwner  = false,
  onArchive,
  className = '',
}: VacancyCardProps) {
  const categoryLabel    = HR_CATEGORY_LABELS[vacancy.category as keyof typeof HR_CATEGORY_LABELS] ?? vacancy.category
  const employmentLabel  = HR_EMPLOYMENT_TYPE_LABELS[vacancy.employment_type] ?? vacancy.employment_type
  const salaryText       = formatSalary(vacancy.salary_range)
  const dateText         = formatDate(vacancy.created_at)

  return (
    <article
      className={[
        'group relative bg-white rounded-2xl border border-[#0B2B5E]/20',
        'p-5 flex flex-col gap-4 hover:shadow-md hover:border-[#0B2B5E]/40',
        'transition-all duration-200',
        className,
      ].join(' ')}
    >
      {/* ── Шапка карточки ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <EmployerTypeBadge type={vacancy.employer_type} />
            <span className="text-[10px] text-slate-400 font-medium">
              {categoryLabel}
            </span>
          </div>
          <h3 className="text-base font-black text-[#0B2B5E] leading-tight line-clamp-2 group-hover:text-[#0B2B5E]">
            {vacancy.title}
          </h3>
          {vacancy.company_name && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-500 font-medium truncate">
                {vacancy.company_name}
              </span>
            </div>
          )}
        </div>

        {/* Счётчик откликов */}
        <div className="flex-shrink-0 flex items-center gap-1 text-slate-400">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{vacancy.applications_count}</span>
        </div>
      </div>

      {/* ── Зарплата ────────────────────────────────────────────────── */}
      <div className="text-lg font-black text-[#F26522] leading-none">
        {salaryText}
      </div>

      {/* ── Мета-теги ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {vacancy.location && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
            <MapPin className="w-3 h-3" />
            {vacancy.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
          <Clock className="w-3 h-3" />
          {employmentLabel}
        </span>
      </div>

      {/* ── Описание (превью) ───────────────────────────────────────── */}
      {vacancy.description && (
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
          {vacancy.description}
        </p>
      )}

      {/* ── Подвал ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-[#0B2B5E]/8">
        <span className="text-[11px] text-slate-400">
          {dateText}
        </span>

        <div className="flex items-center gap-2">
          {isOwner ? (
            /* Кнопка архивации для владельца */
            onArchive && (
              <button
                type="button"
                onClick={() => onArchive(vacancy.id)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Архивировать
              </button>
            )
          ) : (
            /* Кнопка отклика для кандидатов */
            onApply && (
              <button
                type="button"
                onClick={() => onApply(vacancy)}
                className="inline-flex items-center gap-1.5 bg-[#F26522] hover:bg-[#E55A1F] text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
              >
                Откликнуться
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </article>
  )
}
