'use client'

/**
 * components/ResumeCard.tsx — Карточка резюме для HR Hub
 * ────────────────────────────────────────────────────────
 * Дизайн: rounded-2xl, border-[#0B2B5E]/20, brand-blue/orange.
 * Без emoji. Высокотехнологичный B2B-минимализм.
 *
 * @module app/horeca/hr-hub/components/ResumeCard
 */

import { MapPin, Briefcase, GraduationCap } from 'lucide-react'
import type { HrResume } from '@/types/hr'
import { HR_CATEGORY_LABELS } from '@/types/hr'

// ── Форматирование желаемой зарплаты ─────────────────────────────────────────

function formatDesiredSalary(salary: HrResume['desired_salary']): string | null {
  if (!salary?.amount) return null
  const sym: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' }
  return `${salary.amount.toLocaleString('ru-RU')} ${sym[salary.currency] ?? salary.currency}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ── Навыки: конвертируем строку в теги ──────────────────────────────────────

function SkillTags({ skills }: { skills: string }) {
  const tags = skills
    .split(/[,;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)

  if (!tags.length) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-[11px] bg-[#0B2B5E]/6 text-[#0B2B5E] px-2 py-0.5 rounded-md font-medium"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResumeCardProps {
  resume:     HrResume
  onContact?: (resume: HrResume) => void
  isOwner?:   boolean
  className?: string
}

// ══════════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ══════════════════════════════════════════════════════════════════

export function ResumeCard({
  resume,
  onContact,
  isOwner   = false,
  className = '',
}: ResumeCardProps) {
  const categoryLabel = HR_CATEGORY_LABELS[resume.category as keyof typeof HR_CATEGORY_LABELS] ?? resume.category
  const salary        = formatDesiredSalary(resume.desired_salary)
  const dateText      = formatDate(resume.created_at)

  return (
    <article
      className={[
        'group relative bg-white rounded-2xl border border-[#0B2B5E]/20',
        'p-5 flex flex-col gap-4 hover:shadow-md hover:border-[#0B2B5E]/40',
        'transition-all duration-200',
        className,
      ].join(' ')}
    >
      {/* ── Шапка ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Категория */}
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#0B2B5E] bg-[#0B2B5E]/8 px-2 py-0.5 rounded-md mb-2">
            {categoryLabel}
          </span>

          {/* ФИО */}
          <h3 className="text-base font-black text-[#0B2B5E] leading-tight">
            {resume.full_name}
          </h3>

          {/* Желаемая должность */}
          <p className="text-sm text-slate-500 font-semibold mt-0.5 line-clamp-1">
            {resume.position}
          </p>
        </div>

        {/* Желаемая зарплата */}
        {salary && (
          <div className="flex-shrink-0 text-right">
            <div className="text-base font-black text-[#F26522] leading-none">
              {salary}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">желаемая</div>
          </div>
        )}
      </div>

      {/* ── Мета ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {resume.location && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
            <MapPin className="w-3 h-3" />
            {resume.location}
          </span>
        )}
        {resume.experience && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
            <Briefcase className="w-3 h-3" />
            Опыт указан
          </span>
        )}
        {resume.education && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-100">
            <GraduationCap className="w-3 h-3" />
            Образование
          </span>
        )}
      </div>

      {/* ── О себе (превью) ──────────────────────────────────────────── */}
      {resume.summary && (
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
          {resume.summary}
        </p>
      )}

      {/* ── Навыки ───────────────────────────────────────────────────── */}
      {resume.skills && <SkillTags skills={resume.skills} />}

      {/* ── Подвал ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-[#0B2B5E]/8">
        <span className="text-[11px] text-slate-400">{dateText}</span>

        {!isOwner && onContact && (
          <button
            type="button"
            onClick={() => onContact(resume)}
            className="inline-flex items-center gap-1.5 bg-[#0B2B5E] hover:bg-[#0d3270] text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
          >
            Связаться
          </button>
        )}
      </div>
    </article>
  )
}
