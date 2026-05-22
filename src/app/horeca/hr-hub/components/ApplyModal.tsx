'use client'

/**
 * components/ApplyModal.tsx — Модальное окно отклика + подписки на компанию
 * ──────────────────────────────────────────────────────────────────────────
 * Функционал:
 *   1. Форма отклика на вакансию с сопроводительным письмом
 *   2. Кнопка «Подписаться на компанию» — вызывает subscribeToCompany()
 *
 * @module app/horeca/hr-hub/components/ApplyModal
 */

import { useState, useTransition, useEffect } from 'react'
import { X, Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  applyToVacancy,
  subscribeToCompany,
  unsubscribeFromCompany,
  checkCompanySubscription,
} from '../actions'
import type { HrVacancy, HrResume } from '@/types/hr'
import { HR_CATEGORY_LABELS } from '@/types/hr'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ApplyModalProps {
  vacancy:    HrVacancy
  myResumes?: HrResume[]          // уже загруженные резюме пользователя
  onClose:    () => void
  onSuccess?: () => void
}

// ── Оверлей ───────────────────────────────────────────────────────────────────

function Overlay({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-[#0B2B5E]/30 backdrop-blur-sm z-40"
      onClick={onClick}
      aria-hidden="true"
    />
  )
}

// ══════════════════════════════════════════════════════════════════
// КОМПОНЕНТ
// ══════════════════════════════════════════════════════════════════

export function ApplyModal({
  vacancy,
  myResumes = [],
  onClose,
  onSuccess,
}: ApplyModalProps) {
  const [isPendingApply, startApplyTransition]       = useTransition()
  const [isPendingSubscribe, startSubscribeTransition] = useTransition()

  const [applyError,   setApplyError]   = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
  const [subMessage,   setSubMessage]   = useState<string | null>(null)

  // ── Отслеживаем состояние подписки при монтировании ───────────────
  useEffect(() => {
    if (!vacancy.employer_id) return
    checkCompanySubscription(vacancy.employer_id).then((result) => {
      if (result.success) setIsSubscribed(result.data ?? false)
    })
  }, [vacancy.employer_id])

  // Закрывать по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Отправка отклика ──────────────────────────────────────────────

  function handleApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setApplyError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('vacancy_id', vacancy.id)

    startApplyTransition(async () => {
      const result = await applyToVacancy(formData)
      if (result.success) {
        setApplySuccess(true)
        onSuccess?.()
      } else {
        setApplyError(result.error ?? 'Ошибка отправки отклика')
      }
    })
  }

  // ── Toggle подписки ───────────────────────────────────────────────

  function handleSubscribeToggle() {
    if (!vacancy.employer_id) return
    setSubMessage(null)

    startSubscribeTransition(async () => {
      if (isSubscribed) {
        const result = await unsubscribeFromCompany(vacancy.employer_id!)
        if (result.success) {
          setIsSubscribed(false)
          setSubMessage('Вы отписались от обновлений компании.')
        }
      } else {
        const result = await subscribeToCompany(vacancy.employer_id!)
        if (result.success) {
          setIsSubscribed(true)
          setSubMessage('Вы подписаны на новые вакансии от этой компании.')
        } else {
          setSubMessage(result.error ?? 'Ошибка подписки')
        }
      }
    })
  }

  const categoryLabel =
    HR_CATEGORY_LABELS[vacancy.category as keyof typeof HR_CATEGORY_LABELS] ?? vacancy.category

  return (
    <>
      <Overlay onClick={onClose} />

      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
      >
        <div className="bg-white rounded-2xl border border-[#0B2B5E]/20 shadow-2xl overflow-hidden mx-4">

          {/* ── Заголовок ──────────────────────────────────────────── */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-[#0B2B5E]/10 bg-[#0B2B5E]/[0.03]">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#F26522] mb-0.5">
                {categoryLabel}
              </p>
              <h2
                id="apply-modal-title"
                className="text-base font-black text-[#0B2B5E] line-clamp-2 leading-tight"
              >
                {vacancy.title}
              </h2>
              {vacancy.company_name && (
                <p className="text-sm text-slate-400 mt-0.5">{vacancy.company_name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0B2B5E]/8 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="p-6 space-y-5">

            {/* ── Успешный отклик ──────────────────────────────────── */}
            {applySuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="font-black text-[#0B2B5E] text-base">Отклик отправлен</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Работодатель получит уведомление и свяжется с вами.
                  </p>
                </div>

                {/* Подписка после успешного отклика */}
                <div className="w-full border-t border-[#0B2B5E]/10 pt-4 mt-2">
                  <p className="text-xs text-slate-500 mb-3">
                    Хотите первыми узнавать о новых вакансиях от этой компании?
                  </p>
                  <button
                    type="button"
                    onClick={handleSubscribeToggle}
                    disabled={isPendingSubscribe || isSubscribed === null}
                    className={[
                      'w-full inline-flex items-center justify-center gap-2',
                      'text-sm font-bold px-4 py-2.5 rounded-xl transition-colors',
                      isSubscribed
                        ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500'
                        : 'bg-[#0B2B5E] text-white hover:bg-[#0d3270]',
                    ].join(' ')}
                  >
                    {isPendingSubscribe ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSubscribed ? (
                      <>
                        <BellOff className="w-4 h-4" />
                        Отписаться от компании
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        Подписаться на компанию
                      </>
                    )}
                  </button>
                  {subMessage && (
                    <p className="text-xs text-slate-400 text-center mt-2">{subMessage}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-slate-400 hover:text-[#0B2B5E] transition-colors"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              /* ── Форма отклика ────────────────────────────────────── */
              <form onSubmit={handleApply} className="space-y-4">

                {/* Ошибка */}
                {applyError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {applyError}
                  </div>
                )}

                {/* Выбор резюме (если есть) */}
                {myResumes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#0B2B5E] uppercase tracking-wider">
                      Прикрепить резюме
                    </label>
                    <select
                      name="resume_id"
                      className="w-full border border-[#0B2B5E]/20 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30 bg-white appearance-none"
                    >
                      <option value="">Без резюме</option>
                      {myResumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.position} — {r.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Сопроводительное письмо */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#0B2B5E] uppercase tracking-wider">
                    Сопроводительное письмо
                  </label>
                  <textarea
                    name="cover_letter"
                    placeholder="Расскажите работодателю, почему вы подходите для этой позиции..."
                    className="w-full border border-[#0B2B5E]/20 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30 resize-none bg-white leading-relaxed min-h-[100px]"
                    maxLength={3000}
                  />
                </div>

                {/* Подписка на компанию */}
                {vacancy.employer_id && isSubscribed !== null && (
                  <div className="bg-[#0B2B5E]/[0.03] rounded-xl p-3 border border-[#0B2B5E]/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#0B2B5E]">
                          {isSubscribed ? 'Вы подписаны на компанию' : 'Подписаться на компанию'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Получайте уведомления о новых вакансиях
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSubscribeToggle}
                        disabled={isPendingSubscribe}
                        className={[
                          'flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors',
                          isSubscribed
                            ? 'bg-[#0B2B5E]/8 text-[#0B2B5E] hover:bg-red-50 hover:text-red-500'
                            : 'bg-[#0B2B5E] text-white hover:bg-[#0d3270]',
                        ].join(' ')}
                      >
                        {isPendingSubscribe ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isSubscribed ? (
                          <BellOff className="w-3 h-3" />
                        ) : (
                          <Bell className="w-3 h-3" />
                        )}
                        {isSubscribed ? 'Отписаться' : 'Подписаться'}
                      </button>
                    </div>
                    {subMessage && (
                      <p className="text-[11px] text-slate-400 mt-2">{subMessage}</p>
                    )}
                  </div>
                )}

                {/* Кнопки */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-[#0B2B5E] rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isPendingApply}
                    className="inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#E55A1F] disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-black px-6 py-2.5 rounded-xl transition-colors"
                  >
                    {isPendingApply ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      'Откликнуться'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
