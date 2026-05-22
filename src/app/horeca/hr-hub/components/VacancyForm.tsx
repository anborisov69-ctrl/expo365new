'use client'

/**
 * components/VacancyForm.tsx — Форма создания вакансии с Auto-fill
 * ─────────────────────────────────────────────────────────────────
 * FEATURE: Кнопка «Автозаполнение из профиля» вызывает Server Action
 * fetchCompanyProfileForAutoFill() и подставляет описание компании
 * в поле description, компанию — в company_name.
 *
 * @module app/horeca/hr-hub/components/VacancyForm
 */

import { useState, useTransition, useRef } from 'react'
import { Wand2, Loader2, X, AlertCircle } from 'lucide-react'
import { createVacancy, fetchCompanyProfileForAutoFill } from '../actions'
import {
  HR_CATEGORIES,
  HR_CATEGORY_LABELS,
  EMPLOYMENT_TYPE_VALUES,
  HR_EMPLOYMENT_TYPE_LABELS,
  EMPLOYER_TYPE_VALUES,
} from '@/modules/hr-tech'
import type { HrVacancy, HrEmployerType, HrEmploymentType } from '@/types/hr'

// ── Props ─────────────────────────────────────────────────────────────────────

interface VacancyFormProps {
  onSuccess: (vacancy: HrVacancy) => void
  onCancel:  () => void
  defaultEmployerType?: HrEmployerType
}

// ── Поле формы ────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
  hint,
}: {
  label:     string
  required?: boolean
  children:  React.ReactNode
  hint?:     string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#0B2B5E] uppercase tracking-wider">
        {label}
        {required && <span className="text-[#F26522] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Общие стили инпутов ───────────────────────────────────────────────────────

const inputCls =
  'w-full border border-[#0B2B5E]/20 rounded-xl px-3 py-2.5 text-sm text-slate-700 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30 ' +
  'focus:border-[#0B2B5E]/40 transition-colors bg-white'

const selectCls =
  'w-full border border-[#0B2B5E]/20 rounded-xl px-3 py-2.5 text-sm text-slate-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30 focus:border-[#0B2B5E]/40 ' +
  'transition-colors bg-white appearance-none'

const textareaCls =
  `${inputCls} resize-none leading-relaxed`

// ══════════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ══════════════════════════════════════════════════════════════════

export function VacancyForm({
  onSuccess,
  onCancel,
  defaultEmployerType = 'exhibitor',
}: VacancyFormProps) {
  const formRef                = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [autoFillHint, setAutoFillHint] = useState<string | null>(null)

  // Контролируемые поля (нужны для programmatic auto-fill)
  const [description, setDescription]  = useState('')
  const [companyName, setCompanyName]  = useState('')

  // ── Auto-fill из профиля компании ─────────────────────────────────
  async function handleAutoFill() {
    setIsAutoFilling(true)
    setAutoFillHint(null)
    setError(null)

    const result = await fetchCompanyProfileForAutoFill()

    if (result.success && result.data) {
      setDescription(result.data.description)
      setCompanyName(result.data.company_name)
      setAutoFillHint('Описание компании успешно подставлено из профиля.')
    } else {
      setError(result.error ?? 'Не удалось загрузить профиль')
    }
    setIsAutoFilling(false)
  }

  // ── Submit ─────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Подставляем контролируемые поля явно
    formData.set('description', description)
    formData.set('company_name', companyName)

    startTransition(async () => {
      const result = await createVacancy(formData)
      if (result.success && result.data) {
        onSuccess(result.data)
        formRef.current?.reset()
        setDescription('')
        setCompanyName('')
      } else {
        setError(result.error ?? 'Ошибка создания вакансии')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-[#0B2B5E]/20 overflow-hidden">
      {/* ── Заголовок ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#0B2B5E]/10 bg-[#0B2B5E]/[0.03]">
        <h2 className="text-base font-black text-[#0B2B5E]">
          Новая вакансия
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0B2B5E]/8 transition-colors"
          aria-label="Закрыть форму"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* ── Тело формы ────────────────────────────────────────────── */}
      <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Ошибка */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Строка 1: Тип работодателя ──────────────────────────── */}
        <Field label="Тип работодателя" required>
          <select name="employer_type" defaultValue={defaultEmployerType} className={selectCls}>
            {EMPLOYER_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {type === 'exhibitor' ? 'Поставщик / Экспонент' : 'Ресторан / Visitor'}
              </option>
            ))}
          </select>
        </Field>

        {/* ── Строка 2: Заголовок + Категория ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Должность" required>
            <input
              name="title"
              type="text"
              placeholder="Например: Старший бариста"
              className={inputCls}
              required
              minLength={3}
              maxLength={120}
            />
          </Field>
          <Field label="Категория" required>
            <select name="category" required className={selectCls}>
              <option value="">Выберите категорию</option>
              {HR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {HR_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Строка 3: Город + Тип занятости ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Город / Регион">
            <input
              name="location"
              type="text"
              placeholder="Москва"
              className={inputCls}
              maxLength={100}
            />
          </Field>
          <Field label="Тип занятости" required>
            <select name="employment_type" defaultValue="full_time" className={selectCls}>
              {EMPLOYMENT_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>
                  {HR_EMPLOYMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Строка 4: Зарплатная вилка ──────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Зарплата от">
            <input
              name="salary_min"
              type="number"
              placeholder="80000"
              className={inputCls}
              min={0}
            />
          </Field>
          <Field label="Зарплата до">
            <input
              name="salary_max"
              type="number"
              placeholder="120000"
              className={inputCls}
              min={0}
            />
          </Field>
          <Field label="Валюта">
            <select name="salary_currency" defaultValue="RUB" className={selectCls}>
              <option value="RUB">RUB ₽</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
            </select>
          </Field>
        </div>

        {/* ── Описание с Auto-fill ─────────────────────────────────── */}
        <Field
          label="Описание вакансии"
          hint={autoFillHint ?? undefined}
        >
          <div className="relative">
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите вакансию, условия работы, что предлагает компания..."
              className={`${textareaCls} min-h-[100px] pr-40`}
              maxLength={5000}
            />
            {/* Кнопка автозаполнения */}
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={isAutoFilling}
              className={[
                'absolute top-2 right-2 inline-flex items-center gap-1.5',
                'text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors',
                isAutoFilling
                  ? 'bg-slate-100 text-slate-400 cursor-wait'
                  : 'bg-[#0B2B5E]/8 text-[#0B2B5E] hover:bg-[#0B2B5E]/15',
              ].join(' ')}
              title="Подставить описание company из профиля"
            >
              {isAutoFilling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              {isAutoFilling ? 'Загрузка...' : 'Из профиля'}
            </button>
          </div>
        </Field>

        {/* ── Требования ───────────────────────────────────────────── */}
        <Field label="Требования к кандидату">
          <textarea
            name="requirements"
            placeholder="Опыт работы, навыки, образование, личные качества..."
            className={`${textareaCls} min-h-[80px]`}
            maxLength={5000}
          />
        </Field>

        {/* ── Скрытое поле company_name (из auto-fill) ─────────────── */}
        <input type="hidden" name="company_name" value={companyName} />

        {/* ── Подвал / Кнопки ──────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-[#0B2B5E] rounded-xl hover:bg-slate-100 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#E55A1F] disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-black px-6 py-2.5 rounded-xl transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Публикация...
              </>
            ) : (
              'Опубликовать вакансию'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
