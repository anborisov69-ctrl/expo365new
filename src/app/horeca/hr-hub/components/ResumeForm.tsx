'use client'

/**
 * components/ResumeForm.tsx — Форма создания резюме кандидата
 * ──────────────────────────────────────────────────────────────
 * Дизайн: rounded-2xl, border-[#0B2B5E]/20, brand-blue/orange.
 * Без emoji. Высокотехнологичный B2B-минимализм.
 *
 * @module app/horeca/hr-hub/components/ResumeForm
 */

import { useState, useTransition, useRef } from 'react'
import { Loader2, X, AlertCircle } from 'lucide-react'
import { createResume } from '../actions'
import {
  HR_CATEGORIES,
  HR_CATEGORY_LABELS,
} from '@/modules/hr-tech'
import type { HrResume } from '@/types/hr'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResumeFormProps {
  onSuccess: (resume: HrResume) => void
  onCancel:  () => void
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label:     string
  required?: boolean
  children:  React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#0B2B5E] uppercase tracking-wider">
        {label}
        {required && <span className="text-[#F26522] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Общие стили ───────────────────────────────────────────────────────────────

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

export function ResumeForm({ onSuccess, onCancel }: ResumeFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createResume(formData)
      if (result.success && result.data) {
        onSuccess(result.data)
        formRef.current?.reset()
      } else {
        setError(result.error ?? 'Ошибка создания резюме')
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-[#0B2B5E]/20 overflow-hidden">
      {/* ── Заголовок ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#0B2B5E]/10 bg-[#0B2B5E]/[0.03]">
        <h2 className="text-base font-black text-[#0B2B5E]">
          Создать резюме
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

        {/* ── Строка 1: ФИО + Должность ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ФИО" required>
            <input
              name="full_name"
              type="text"
              placeholder="Иванов Иван Иванович"
              className={inputCls}
              required
              minLength={2}
              maxLength={100}
            />
          </Field>
          <Field label="Желаемая должность" required>
            <input
              name="position"
              type="text"
              placeholder="Старший бариста"
              className={inputCls}
              required
              minLength={2}
              maxLength={120}
            />
          </Field>
        </div>

        {/* ── Строка 2: Категория + Город ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Field label="Город / Регион">
            <input
              name="location"
              type="text"
              placeholder="Москва"
              className={inputCls}
              maxLength={100}
            />
          </Field>
        </div>

        {/* ── Строка 3: Email + Телефон ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Email для связи">
            <input
              name="contact_email"
              type="email"
              placeholder="ivan@example.com"
              className={inputCls}
            />
          </Field>
          <Field label="Телефон">
            <input
              name="contact_phone"
              type="tel"
              placeholder="+7 999 000-00-00"
              className={inputCls}
              maxLength={30}
            />
          </Field>
        </div>

        {/* ── Строка 4: Желаемая зарплата ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Желаемая зарплата">
            <input
              name="desired_amount"
              type="number"
              placeholder="100000"
              className={inputCls}
              min={0}
            />
          </Field>
          <Field label="Валюта">
            <select name="desired_currency" defaultValue="RUB" className={selectCls}>
              <option value="RUB">RUB ₽</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
            </select>
          </Field>
        </div>

        {/* ── О себе ────────────────────────────────────────────────── */}
        <Field label="О себе">
          <textarea
            name="summary"
            placeholder="Краткое описание вашего профессионального опыта и целей..."
            className={`${textareaCls} min-h-[80px]`}
            maxLength={2000}
          />
        </Field>

        {/* ── Опыт работы ──────────────────────────────────────────── */}
        <Field label="Опыт работы">
          <textarea
            name="experience"
            placeholder={"2021–2024 — Бариста, Coffeemania Moscow\n2019–2021 — Менеджер, Coffee House..."}
            className={`${textareaCls} min-h-[100px]`}
            maxLength={5000}
          />
        </Field>

        {/* ── Навыки ────────────────────────────────────────────────── */}
        <Field label="Навыки" >
          <textarea
            name="skills"
            placeholder="Latte Art, Эспрессо, Управление командой, SCA Barista Level 2..."
            className={`${textareaCls} min-h-[60px]`}
            maxLength={2000}
          />
        </Field>

        {/* ── Образование ──────────────────────────────────────────── */}
        <Field label="Образование">
          <textarea
            name="education"
            placeholder="2018 — Московский государственный университет, Менеджмент..."
            className={`${textareaCls} min-h-[60px]`}
            maxLength={2000}
          />
        </Field>

        {/* ── Подвал ────────────────────────────────────────────────── */}
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
                Сохранение...
              </>
            ) : (
              'Разместить резюме'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
