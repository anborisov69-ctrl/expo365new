'use client'

/**
 * TenderUnlockNotification.tsx — Система уведомлений для разблокировки тендеров
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Отображает уведомления после покупки доступа к тендерам, включая предложения
 * по обновлению до Premium подписки для экономии средств.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle,
  Star,
  TrendingUp,
  X,
  AlertCircle,
  CreditCard,
  Calculator
} from 'lucide-react'
import { TenderUnlockNotification as NotificationData } from '@/types/tender-unlocks'

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TenderUnlockNotificationProps {
  /** Данные уведомления */
  notification: NotificationData
  /** Callback при закрытии уведомления */
  onClose: () => void
  /** Auto-dismiss время в миллисекундах */
  autoDismissMs?: number
  /** Показать анимацию появления */
  showEntryAnimation?: boolean
}

export function TenderUnlockNotificationComponent({
  notification,
  onClose,
  autoDismissMs = 0,
  showEntryAnimation = true
}: TenderUnlockNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Анимация появления
    if (showEntryAnimation) {
      setTimeout(() => setIsVisible(true), 100)
    } else {
      setIsVisible(true)
    }

    // Auto-dismiss
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, autoDismissMs)

      return () => clearTimeout(timer)
    }
  }, [autoDismissMs, showEntryAnimation])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300) // Время анимации закрытия
  }

  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'unlock_success':
        return {
          bgColor: 'bg-green-50 border-green-200',
          iconColor: 'text-green-600',
          icon: CheckCircle
        }
      case 'premium_suggestion':
        return {
          bgColor: 'bg-orange-50 border-orange-200',
          iconColor: 'text-orange-600',
          icon: TrendingUp
        }
      case 'unlock_error':
        return {
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          icon: AlertCircle
        }
      default:
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          icon: CheckCircle
        }
    }
  }

  const styles = getNotificationStyles()
  const IconComponent = styles.icon

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
        isVisible && !isClosing 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{ maxWidth: '400px' }}
    >
      <Card className={`${styles.bgColor} border shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Иконка */}
            <div className={`${styles.iconColor} flex-shrink-0 mt-0.5`}>
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Контент */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {notification.message}
              </p>

              {/* Дополнительные данные для предложения Premium */}
              {notification.type === 'premium_suggestion' && notification.data && (
                <div className="bg-white p-3 rounded-lg border border-orange-200 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-sm text-gray-800">
                      Экономический расчет:
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Premium окупится через:</span>
                      <span className="font-medium">
                        {notification.data.breakEvenCount} тендеров
                      </span>
                    </div>
                    {notification.data.savingsAmount && (
                      <div className="flex justify-between">
                        <span>Potential экономия:</span>
                        <span className="font-medium text-green-600">
                          +{notification.data.savingsAmount} ₽
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Действия */}
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant === 'primary' ? 'default' : 'outline'}
                      onClick={action.action}
                      className={
                        action.variant === 'primary' 
                          ? 'bg-[#F26522] hover:bg-[#F26522]/90 text-white text-xs'
                          : 'text-xs'
                      }
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationManagerState {
  notifications: (NotificationData & { id: string })[]
}

export function TenderUnlockNotificationManager() {
  const [state, setState] = useState<NotificationManagerState>({
    notifications: []
  })

  const addNotification = (notification: NotificationData) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    setState(prev => ({
      notifications: [
        ...prev.notifications,
        { ...notification, id }
      ]
    }))

    return id
  }

  const removeNotification = (id: string) => {
    setState(prev => ({
      notifications: prev.notifications.filter(n => n.id !== id)
    }))
  }

  const clearAll = () => {
    setState({ notifications: [] })
  }

  // Expose methods globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).tenderUnlockNotifications = {
        add: addNotification,
        remove: removeNotification,
        clear: clearAll
      }
    }
  }, [])

  return (
    <>
      {state.notifications.map((notification) => (
        <TenderUnlockNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          autoDismissMs={notification.type === 'unlock_success' ? 5000 : 0}
        />
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export class TenderUnlockNotifications {
  /**
   * Уведомление об успешной разблокировке
   */
  static success(tenderId: string, unlockId: string): NotificationData {
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
   * Предложение Premium подписки
   */
  static premiumSuggestion(
    unlockCount: number, 
    breakEvenCount: number, 
    potentialSavings: number,
    onUpgradeToPremium: () => void
  ): NotificationData {
    return {
      type: 'premium_suggestion',
      title: 'Вы часто покупаете доступы к тендерам?',
      message: `Premium-подписка окупится уже на ${breakEvenCount}-м тендере! Вы уже купили ${unlockCount} разблокировок.`,
      data: {
        breakEvenCount,
        savingsAmount: potentialSavings
      },
      actions: [
        {
          label: 'Получить Premium',
          action: onUpgradeToPremium,
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
   * Ошибка разблокировки
   */
  static error(message: string, tenderId?: string): NotificationData {
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
          },
          variant: 'primary'
        }
      ]
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Адаптер для показа уведомлений
 */
export function showTenderUnlockNotification(notification: NotificationData) {
  if (typeof window !== 'undefined' && (window as any).tenderUnlockNotifications) {
    return (window as any).tenderUnlockNotifications.add(notification)
  }
  console.warn('Notification manager not initialized')
  return null
}

/**
 * Хук для работы с уведомлениями о разблокировках
 */
export function useTenderUnlockNotifications() {
  return {
    showSuccess: (tenderId: string, unlockId: string) => {
      showTenderUnlockNotification(
        TenderUnlockNotifications.success(tenderId, unlockId)
      )
    },
    
    showPremiumSuggestion: (
      unlockCount: number,
      breakEvenCount: number,
      potentialSavings: number,
      onUpgrade: () => void
    ) => {
      showTenderUnlockNotification(
        TenderUnlockNotifications.premiumSuggestion(
          unlockCount, 
          breakEvenCount, 
          potentialSavings, 
          onUpgrade
        )
      )
    },
    
    showError: (message: string, tenderId?: string) => {
      showTenderUnlockNotification(
        TenderUnlockNotifications.error(message, tenderId)
      )
    }
  }
}