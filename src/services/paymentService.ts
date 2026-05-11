/**
 * paymentService.ts — Клиентский сервис для работы с платежами
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Обрабатывает платежи за разблокировку тендеров на клиентской стороне
 * и интеграцию с уведомлениями.
 */

import { 
  PurchaseTenderAccessRequest,
  PurchaseTenderAccessResponse,
  CheckTenderAccessRequest,
  CheckTenderAccessResponse,
  TenderUnlockError
} from '@/types/tender-unlocks'

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT SERVICE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

class PaymentServiceImpl {
  private readonly baseUrl = '/api/tender-unlock'

  /**
   * Покупка доступа к тендеру
   */
  async purchaseTenderAccess(request: PurchaseTenderAccessRequest): Promise<PurchaseTenderAccessResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new TenderUnlockError(
          data.error || 'Payment failed',
          'PAYMENT_FAILED',
          request.tenderId,
          request.exhibitorId
        )
      }

      return {
        success: true,
        unlockId: data.unlockId,
        unlock: data.unlock
      }

    } catch (error) {
      console.error('[PaymentService] Purchase error:', error)
      
      if (error instanceof TenderUnlockError) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  /**
   * Проверка доступа к тендеру
   */
  async checkTenderAccess(request: CheckTenderAccessRequest): Promise<CheckTenderAccessResponse> {
    try {
      const params = new URLSearchParams({
        exhibitorId: request.exhibitorId,
        tenderId: request.tenderId
      })

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Access check failed')
      }

      return data

    } catch (error) {
      console.error('[PaymentService] Access check error:', error)
      
      throw new TenderUnlockError(
        'Failed to check tender access',
        'NETWORK_ERROR',
        request.tenderId,
        request.exhibitorId
      )
    }
  }

  /**
   * Получение цены разблокировки тендера
   */
  async getUnlockPrice(tenderId: string): Promise<number> {
    try {
      // В реальном приложении это может быть отдельный API endpoint
      // Пока возвращаем фиксированную цену
      return 500
    } catch (error) {
      console.error('[PaymentService] Price fetch error:', error)
      return 500 // fallback price
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATED SERVICE WITH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Интегрированный сервис с уведомлениями
 */
class IntegratedTenderUnlockService {
  private paymentService = new PaymentServiceImpl()
  private unlockCounts = new Map<string, number>() // Track unlock counts per exhibitor

  /**
   * Проверка доступа к тендеру
   */
  async checkAccess(request: CheckTenderAccessRequest): Promise<CheckTenderAccessResponse> {
    return await this.paymentService.checkTenderAccess(request)
  }

  /**
   * Покупка доступа с уведомлениями и проверкой на Premium предложения
   */
  async purchaseWithNotifications(
    request: PurchaseTenderAccessRequest,
    onShowNotification?: (notification: any) => void,
    onUpgradeToPremium?: () => void
  ): Promise<PurchaseTenderAccessResponse> {
    try {
      // Выполняем покупку
      const result = await this.paymentService.purchaseTenderAccess(request)

      if (result.success && result.unlockId) {
        // Увеличиваем счетчик разблокировок для экспонента
        const currentCount = this.unlockCounts.get(request.exhibitorId) || 0
        const newCount = currentCount + 1
        this.unlockCounts.set(request.exhibitorId, newCount)

        // Показываем уведомление об успехе
        if (onShowNotification) {
          const successNotification = this.createSuccessNotification(
            request.tenderId,
            result.unlockId
          )
          onShowNotification(successNotification)
        }

        // Проверяем, нужно ли предложить Premium
        if (this.shouldSuggestPremium(newCount) && onShowNotification && onUpgradeToPremium) {
          setTimeout(() => {
            const premiumSuggestion = this.createPremiumSuggestion(
              newCount,
              onUpgradeToPremium
            )
            onShowNotification(premiumSuggestion)
          }, 3000) // Показываем через 3 секунды после успешной покупки
        }

        return result
      } else {
        // Показываем уведомление об ошибке
        if (onShowNotification) {
          const errorNotification = this.createErrorNotification(
            result.error || 'Unknown error',
            request.tenderId
          )
          onShowNotification(errorNotification)
        }

        return result
      }

    } catch (error) {
      console.error('[IntegratedService] Purchase error:', error)
      
      // Показываем уведомление об ошибке
      if (onShowNotification) {
        const errorNotification = this.createErrorNotification(
          error instanceof Error ? error.message : 'Network error',
          request.tenderId
        )
        onShowNotification(errorNotification)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Определяет, нужно ли предложить Premium подписку
   */
  private shouldSuggestPremium(unlockCount: number): boolean {
    // Предлагаем Premium на 3-й покупке и каждой 5-й после этого
    return unlockCount === 3 || (unlockCount > 3 && unlockCount % 5 === 0)
  }

  /**
   * Создает уведомление об успешной разблокировке
   */
  private createSuccessNotification(tenderId: string, unlockId: string) {
    return {
      type: 'unlock_success',
      title: 'Тендер успешно разблокирован!',
      message: 'Теперь у вас есть полный доступ ко всей информации по этому тендеру.',
      data: {
        tenderId,
        unlockId
      }
    }
  }

  /**
   * Создает предложение Premium подписки
   */
  private createPremiumSuggestion(unlockCount: number, onUpgrade: () => void) {
    const unlockPrice = 500
    const premiumPrice = 1500
    const breakEvenCount = Math.ceil(premiumPrice / unlockPrice)
    const potentialSavings = (unlockCount - breakEvenCount) * unlockPrice

    return {
      type: 'premium_suggestion',
      title: 'Вы часто покупаете доступы к тендерам?',
      message: `Premium-подписка окупится уже на ${breakEvenCount}-м тендере! Вы уже купили ${unlockCount} разблокировок.`,
      data: {
        breakEvenCount,
        savingsAmount: Math.max(0, potentialSavings)
      },
      actions: [
        {
          label: 'Получить Premium',
          action: onUpgrade,
          variant: 'primary'
        },
        {
          label: 'Не сейчас',
          action: () => {
            // Закрыть уведомление
          },
          variant: 'secondary'
        }
      ]
    }
  }

  /**
   * Создает уведомление об ошибке
   */
  private createErrorNotification(message: string, tenderId?: string) {
    return {
      type: 'unlock_error',
      title: 'Ошибка при разблокировке тендера',
      message: message || 'Произошла ошибка при обработке платежа. Пожалуйста, попробуйте снова.',
      data: {
        tenderId
      },
      actions: [
        {
          label: 'Попробовать снова',
          action: () => {
            // Логика повторной попытки
            window.location.reload()
          },
          variant: 'primary'
        }
      ]
    }
  }

  /**
   * Получить количество разблокировок для экспонента
   */
  getUnlockCount(exhibitorId: string): number {
    return this.unlockCounts.get(exhibitorId) || 0
  }

  /**
   * Сбросить счетчик разблокировок (например, при обновлении до Premium)
   */
  resetUnlockCount(exhibitorId: string): void {
    this.unlockCounts.delete(exhibitorId)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK FOR UNLOCK FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react'

/**
 * Хук для работы с разблокировкой тендеров
 */
export function useTenderUnlock(
  exhibitorId: string,
  onShowNotification?: (notification: any) => void,
  onUpgradeToPremium?: () => void
) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [service] = useState(() => new IntegratedTenderUnlockService())

  const purchaseUnlock = useCallback(async (
    tenderId: string,
    amount: number,
    currency: 'RUB' | 'USD' | 'EUR' = 'RUB'
  ) => {
    if (isProcessing) return

    setIsProcessing(true)
    try {
      const result = await service.purchaseWithNotifications(
        {
          exhibitorId,
          tenderId,
          paymentType: 'one_time',
          amount,
          currency
        },
        onShowNotification,
        onUpgradeToPremium
      )

      return result
    } finally {
      setIsProcessing(false)
    }
  }, [exhibitorId, isProcessing, service, onShowNotification, onUpgradeToPremium])

  const checkAccess = useCallback(async (tenderId: string) => {
    try {
      return await service.checkAccess({
        exhibitorId,
        tenderId
      })
    } catch (error) {
      console.error('Error checking access:', error)
      throw error
    }
  }, [exhibitorId, service])

  const getUnlockCount = useCallback(() => {
    return service.getUnlockCount(exhibitorId)
  }, [exhibitorId, service])

  return {
    purchaseUnlock,
    checkAccess,
    getUnlockCount,
    isProcessing
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const paymentService = new PaymentServiceImpl()
export const integratedTenderUnlockService = new IntegratedTenderUnlockService()

// Re-export key types
export type {
  PurchaseTenderAccessRequest,
  PurchaseTenderAccessResponse,
  CheckTenderAccessRequest,
  CheckTenderAccessResponse
} from '@/types/tender-unlocks'