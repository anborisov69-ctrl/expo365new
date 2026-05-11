'use client'

import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─────────────────────────────────────────────────────────────────────────────
// CloseTenderModal
//
// Модальное окно подтверждения закрытия тендера покупателем.
// Причина закрытия намеренно не запрашивается — статус меняется на «ЗАКРЫТ»
// без субъективной обратной связи. Экспоненты получают нейтральное системное
// уведомление без указания причины.
// ─────────────────────────────────────────────────────────────────────────────

interface CloseTenderModalProps {
  tenderTitle: string
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function CloseTenderModal({
  tenderTitle,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: CloseTenderModalProps) {
  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl border border-gray-200">

        {/* Close icon */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Закрыть диалог"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#0B2B5E] leading-tight">
                Закрыть тендер?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                «{tenderTitle}»
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Вы уверены, что хотите закрыть тендер?&nbsp;
            <span className="font-medium text-gray-800">
              После этого приём предложений будет прекращён навсегда.
            </span>
            &nbsp;Все участвующие поставщики получат системное уведомление.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            Отмена
          </Button>

          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[140px] border-gray-400 text-gray-700 hover:border-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Закрываю...
              </span>
            ) : (
              'Закрыть тендер'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
