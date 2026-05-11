'use client';

/**
 * ContractPreviewClient — Предпросмотр персонального договора
 * ────────────────────────────────────────────────────────────
 * Client Component для отображения черновика договора с возможностью:
 * - Просмотра всех условий сделки
 * - Редактирования параметров (будущая функция)
 * - Подписания и отправки договора экспоненту
 * - Сохранения как PDF (будущая функция)
 *
 * UI ТРЕБОВАНИЯ:
 *   - Цвета: #0B2B5E (основной) и #F26522 (акцент)
 *   - Профессиональный вид документа
 *   - Четкое разделение секций
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Calendar, CreditCard, CheckCircle, Download, Send } from 'lucide-react';
import { useSmartContract } from '@/store/smartContractStore';
import { useAuth } from '@/hooks/useAuth';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ КОМПОНЕНТА
// ═══════════════════════════════════════════════════════════════════════════════

interface ContractPreviewClientProps {
  /** ID черновика договора */
  draftId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ ФОРМАТИРОВАНИЯ
// ═══════════════════════════════════════════════════════════════════════════════

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОСНОВНОЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export default function ContractPreviewClient({ draftId }: ContractPreviewClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { state, dispatch } = useSmartContract();

  // Находим черновик по ID
  const draft = state.drafts.find(d => d.id === draftId);

  // Если черновик не найден
  if (!draft) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0B2B5E' }}>
              Договор не найден
            </h1>
            <p className="text-slate-600 mb-6">
              Черновик договора с ID <code className="bg-slate-100 px-2 py-1 rounded">{draftId}</code> не существует или был удален.
            </p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all hover:shadow-md"
              style={{ backgroundColor: '#F26522' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { terms } = draft;

  // Обработчики действий
  const handleGoBack = () => {
    router.back();
  };

  const handleSignContract = () => {
    // Обновляем статус договора
    dispatch({
      type: 'UPDATE_DRAFT',
      id: draft.id,
      changes: { status: 'sent' }
    });

    // TODO: Отправить договор экспоненту через API
    alert('Договор успешно подписан и отправлен экспоненту!');
    
    // Перенаправляем на главную страницу HoReCa
    router.push('/horeca');
  };

  const handleSavePDF = () => {
    // TODO: Генерация PDF
    alert('Функция сохранения в PDF будет доступна в ближайшее время');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к предложению
          </button>

          <div className="flex items-center gap-2">
            <div 
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: '#0B2B5E' }}
            >
              {draft.status === 'draft' ? 'ЧЕРНОВИК' : 'ОТПРАВЛЕН'}
            </div>
          </div>
        </div>

        {/* Contract Document */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Document Header */}
          <div 
            className="px-8 py-6 text-white"
            style={{ backgroundColor: '#0B2B5E' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Персональный договор поставки
                </h1>
                <p className="text-blue-100">
                  {draft.offerTitle} • Экспонент: {draft.exhibitorSlug}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-200">Договор №</div>
                <div className="font-mono font-bold">{draft.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Contract Body */}
          <div className="px-8 py-6">
            {/* Parties Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#0B2B5E' }}>
                Стороны договора
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-bold mb-2 text-slate-700">Поставщик</h3>
                  <div className="text-sm text-slate-600">
                    <div>ООО "ТЕСТ"</div>
                    <div>ИНН: 1234567890</div>
                    <div>КПП: 123456789</div>
                    <div>Адрес: г. Москва, ул. Тестовая, д. 1</div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-bold mb-2 text-slate-700">Покупатель</h3>
                  <div className="text-sm text-slate-600">
                    <div>{user?.displayName || 'Не указано'}</div>
                    <div>Статус: Приглашённый клиент</div>
                    <div>Email: {user?.email || 'Не указан'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Terms */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#0B2B5E' }}>
                Финансовые условия
              </h2>
              
              <div className="bg-slate-50 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-600">Базовая стоимость:</span>
                      <span className="font-bold">{formatCurrency(terms.basePrice)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-600">Скидка ({terms.discountPercent}%):</span>
                      <span className="font-bold text-green-600">− {formatCurrency(terms.discountAmount)}</span>
                    </div>
                    <div className="border-t border-slate-300 my-2"></div>
                    <div className="flex justify-between py-2">
                      <span className="font-bold" style={{ color: '#0B2B5E' }}>Итого к оплате:</span>
                      <span className="font-bold text-lg" style={{ color: '#F26522' }}>
                        {formatCurrency(terms.finalPrice)}
                      </span>
                    </div>
                  </div>

                  {terms.paymentType === 'installment' && (
                    <div>
                      <h4 className="font-bold mb-3" style={{ color: '#0B2B5E' }}>
                        Условия рассрочки:
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Первый взнос:</span>
                          <span className="font-bold">{formatCurrency(terms.initialPayment || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">{terms.paymentsCount} платежа по:</span>
                          <span className="font-bold">{formatCurrency(terms.paymentPerInstallment || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Периодичность:</span>
                          <span className="font-bold">каждые {terms.paymentInterval} дней</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Metadata */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#0B2B5E' }}>
                Дополнительная информация
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Создан</div>
                    <div>{formatDateTime(draft.createdAt)}</div>
                  </div>
                </div>

                {draft.validUntil && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Действует до</div>
                      <div>{formatDate(draft.validUntil)}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Последнее изменение</div>
                    <div>{formatDateTime(draft.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={handleSavePDF}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Скачать PDF
                </button>

                {draft.status === 'draft' && (
                  <button
                    onClick={handleSignContract}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: '#F26522' }}
                  >
                    <Send className="w-4 h-4" />
                    Подписать и отправить
                  </button>
                )}

                {draft.status === 'sent' && (
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-green-700 bg-green-100">
                    <CheckCircle className="w-4 h-4" />
                    Договор отправлен экспоненту
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}