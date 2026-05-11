'use client'

/**
 * SmartTenderCard.tsx — Интеллектуальная карточка тендера с системой разблокировки
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Обертка над существующими компонентами тендеров, которая автоматически определяет
 * нужно ли показать заблокированный или открытый тендер в зависимости от подписки
 * и статуса оплаты разблокировки.
 */

import React, { useState, useEffect } from 'react'
import { LockedTenderCard } from './LockedTenderCard'
import { TenderUnlockNotificationManager, useTenderUnlockNotifications } from './TenderUnlockNotification'
import { useTenderUnlock } from '@/services/paymentService'
import { tenderUnlockService } from '@/services/tenderUnlockService'
import { useTenderAccessWithRealtime } from '@/hooks/useTenderUnlockRealtime'
import { 
  TenderAccessStatus, 
  LockedTenderCardProps 
} from '@/types/tender-unlocks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building,
  Clock,
  CreditCard,
  Mail,
  Phone,
  Timer,
  CheckCircle
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SmartTenderCardProps {
  /** Данные тендера */
  tender: {
    id: string
    title: string
    description: string
    buyerCompany: string
    contactEmail: string
    contactPhone: string
    specifications: object | string
    budget?: number
    currency: string
    createdAt: Date | string
    deadline: Date | string
  }
  /** ID текущего экспонента */
  exhibitorId: string
  /** Уровень подписки экспонента */
  exhibitorTier: 'base' | 'premium'
  /** Цена разблокировки (опционально, будет получена из API) */
  unlockPrice?: number
  /** Callback при успешной разблокировке */
  onUnlockSuccess?: (tenderId: string) => void
  /** Callback для обновления до Premium */
  onUpgradePremium?: () => void
  /** Дополнительные CSS классы */
  className?: string
  /** Показывать ли детальную информацию (для открытых тендеров) */
  showDetails?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SmartTenderCard({
  tender,
  exhibitorId,
  exhibitorTier,
  unlockPrice: providedUnlockPrice,
  onUnlockSuccess,
  onUpgradePremium,
  className = '',
  showDetails = true
}: SmartTenderCardProps) {
  const [unlockPrice, setUnlockPrice] = useState<number>(providedUnlockPrice || 500)

  // Real-time хук для отслеживания статуса доступа
  const { accessStatus, isConnected, unlock } = useTenderAccessWithRealtime({
    tenderId: tender.id,
    exhibitorId,
    exhibitorTier,
    tenderCreatedAt: tender.createdAt
  })

  // Хук для разблокировки тендеров
  const notifications = useTenderUnlockNotifications()
  
  const { purchaseUnlock, isProcessing } = useTenderUnlock(
    exhibitorId,
    (notification) => {
      // Показать уведомление через глобальный менеджер
      if ((window as any).tenderUnlockNotifications?.add) {
        (window as any).tenderUnlockNotifications.add(notification)
      }
    },
    onUpgradePremium
  )

  // Получаем цену разблокировки при загрузке
  useEffect(() => {
    async function fetchUnlockPrice() {
      if (!providedUnlockPrice) {
        try {
          const pricing = await tenderUnlockService.getUnlockPricing(tender.id)
          setUnlockPrice(pricing.unlockPrice)
        } catch (error) {
          console.error('Error fetching unlock price:', error)
          // Используем fallback цену
          setUnlockPrice(500)
        }
      }
    }

    fetchUnlockPrice()
  }, [tender.id, providedUnlockPrice])

  // Обработчик разблокировки
  const handlePurchaseUnlock = async (request: any) => {
    try {
      const result = await purchaseUnlock(tender.id, request.amount, request.currency)
      
      if (result?.success) {
        // Real-time обновление произойдет автоматически через хук
        // Вызываем callback об успешной разблокировке
        if (onUnlockSuccess) {
          onUnlockSuccess(tender.id)
        }
      }
      
    } catch (error) {
      console.error('Error purchasing unlock:', error)
      notifications.showError('Ошибка при покупке доступа к тендеру', tender.id)
    }
  }

  // Компонент загрузки (пока Real-time данные недоступны)
  if (!accessStatus) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader className="pb-4">
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Если доступ ограничен - показываем заблокированную карточку
  if (accessStatus && (accessStatus.status === 'locked' || accessStatus.status === 'restricted')) {
    return (
      <LockedTenderCard
        tender={{
          ...tender,
          specifications: tender.specifications as object,
          createdAt: new Date(tender.createdAt),
          deadline: new Date(tender.deadline)
        }}
        exhibitorId={exhibitorId}
        accessStatus={accessStatus}
        unlockPrice={unlockPrice}
        onPurchaseUnlock={handlePurchaseUnlock}
        onUpgradePremium={onUpgradePremium ? async () => { await Promise.resolve(onUpgradePremium()) } : async () => {}}
        showPremiumPromo={exhibitorTier === 'base'}
      />
    )
  }

  // Если доступ есть - показываем открытую карточку тендера
  return <OpenTenderCard 
    tender={tender} 
    accessStatus={accessStatus} 
    showDetails={showDetails}
    className={className}
  />
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN TENDER CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OpenTenderCardProps {
  tender: SmartTenderCardProps['tender']
  accessStatus: TenderAccessStatus | null
  showDetails: boolean
  className: string
}

function OpenTenderCard({ 
  tender, 
  accessStatus, 
  showDetails = true, 
  className = '' 
}: OpenTenderCardProps) {
  return (
    <Card className={`border [border-color:rgba(11,43,94,0.2)] ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-gray-800 mb-2">
              {tender.title}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {tender.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50">
              <CheckCircle className="w-3 h-3 mr-1" />
              Доступен
            </Badge>
            {accessStatus?.hasUnlock && (
              <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50 text-xs">
                Куплен доступ
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {showDetails && (
          <>
            {/* Основная информация о тендере */}
            <div className="space-y-4 mb-6">
              {/* Компания покупателя */}
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700">{tender.buyerCompany}</span>
              </div>

              {/* Дедлайн */}
              <div className="flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Дедлайн: {new Date(tender.deadline).toLocaleDateString('ru-RU')}
                </span>
              </div>

              {/* Бюджет */}
              {tender.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-green-600">
                    {tender.budget.toLocaleString('ru-RU')} {tender.currency}
                  </span>
                </div>
              )}
            </div>

            {/* Контактная информация */}
            <div className="space-y-3 mb-6 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Контакты для связи:</h4>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{tender.contactEmail}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{tender.contactPhone}</span>
              </div>
            </div>

            {/* Спецификации */}
            <div className="p-3 bg-blue-50 rounded-lg mb-6">
              <h4 className="font-medium text-gray-800 mb-2">Технические требования:</h4>
              <div className="text-sm text-gray-600">
                {typeof tender.specifications === 'object' 
                  ? JSON.stringify(tender.specifications, null, 2)
                  : tender.specifications
                }
              </div>
            </div>

            {/* Кнопка действия */}
            <div className="pt-4 border-t">
              <Button className="w-full bg-[#0B2B5E] hover:bg-[#0B2B5E]/90 text-white">
                Подать заявку на участие
              </Button>
            </div>
          </>
        )}

        {/* Краткая версия */}
        {!showDetails && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{tender.buyerCompany}</span>
            </div>
            {tender.budget && (
              <div className="text-sm font-medium text-green-600">
                {tender.budget.toLocaleString('ru-RU')} {tender.currency}
              </div>
            )}
            <Button size="sm" className="w-full mt-3 bg-[#0B2B5E] hover:bg-[#0B2B5E]/90 text-white">
              Подробнее
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENDER LIST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SmartTenderListProps {
  tenders: Array<SmartTenderCardProps['tender']>
  exhibitorId: string
  exhibitorTier: 'base' | 'premium'
  onUnlockSuccess?: (tenderId: string) => void
  onUpgradePremium?: () => void
  className?: string
}

export function SmartTenderList({
  tenders,
  exhibitorId,
  exhibitorTier,
  onUnlockSuccess,
  onUpgradePremium,
  className = ''
}: SmartTenderListProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Менеджер уведомлений */}
      <TenderUnlockNotificationManager />
      
      {/* Список тендеров */}
      {tenders.map((tender) => (
        <SmartTenderCard
          key={tender.id}
          tender={tender}
          exhibitorId={exhibitorId}
          exhibitorTier={exhibitorTier}
          onUnlockSuccess={onUnlockSuccess}
          onUpgradePremium={onUpgradePremium}
          showDetails={true}
        />
      ))}
      
      {tenders.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500 mb-2">Нет доступных тендеров</div>
            <div className="text-sm text-gray-400">
              Тендеры появятся здесь когда их разместят покупатели
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}