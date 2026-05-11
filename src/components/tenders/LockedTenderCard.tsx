'use client'

/**
 * LockedTenderCard.tsx — Карточка заблокированного тендера с системой разблокировки
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Компонент для отображения тендеров с ограниченным доступом для базовых пользователей.
 * Включает blur-эффект на чувствительные данные и оверлей с вариантами разблокировки.
 */

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Lock,
  Star,
  ArrowUpCircle,
  Timer,
  CreditCard,
  Eye,
  EyeOff,
  Clock,
  Building,
  Mail,
  Phone
} from 'lucide-react'
import { 
  LockedTenderCardProps,
  TenderLockOverlayConfig,
  UnlockPaymentType 
} from '@/types/tender-unlocks'

// ═══════════════════════════════════════════════════════════════════════════════
// CORE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LockedTenderCard({
  tender,
  exhibitorId,
  accessStatus,
  unlockPrice,
  premiumPrice = 1500,
  onPurchaseUnlock,
  onUpgradePremium,
  showPremiumPromo = true
}: LockedTenderCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Вычисляем количество тендеров до окупаемости Premium
  const breakEvenCount = Math.ceil(premiumPrice / unlockPrice)

  // Конфигурация блокировки
  const overlayConfig: TenderLockOverlayConfig = {
    showBlur: accessStatus.status === 'locked',
    blurFields: ['contactInfo', 'specifications', 'budget'],
    primaryMessage: 'Тендер доступен только для Premium участников или через 48 часов',
    secondaryMessage: accessStatus.lockReason,
    showPremiumButton: showPremiumPromo,
    showUnlockButton: true
  }

  // Обработка покупки разблокировки
  const handlePurchaseUnlock = useCallback(async () => {
    if (isProcessing) return

    setIsProcessing(true)
    try {
      await onPurchaseUnlock({
        exhibitorId,
        tenderId: tender.id,
        paymentType: 'one_time' as UnlockPaymentType,
        amount: unlockPrice,
        currency: 'RUB'
      })
    } catch (error) {
      console.error('Error purchasing unlock:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [exhibitorId, tender.id, unlockPrice, onPurchaseUnlock, isProcessing])

  // Обработка обновления до Premium
  const handleUpgradePremium = useCallback(async () => {
    if (isProcessing) return

    setIsProcessing(true)
    try {
      await onUpgradePremium()
    } catch (error) {
      console.error('Error upgrading to premium:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [onUpgradePremium, isProcessing])

  return (
    <Card className="relative overflow-hidden border [border-color:rgba(11,43,94,0.2)]">
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
            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
              <Lock className="w-3 h-3 mr-1" />
              Ограничен
            </Badge>
            {accessStatus.hoursToUnlock && accessStatus.hoursToUnlock > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {Math.ceil(accessStatus.hoursToUnlock)} ч до разблокировки
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
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

          {/* Бюджет (размытый если заблокирован) */}
          {tender.budget && (
            <div className={`transition-all duration-300 ${
              overlayConfig.showBlur && overlayConfig.blurFields.includes('budget') 
                ? 'blur-sm' 
                : ''
            }`}>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-green-600">
                  {tender.budget.toLocaleString('ru-RU')} {tender.currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Контактная информация (размытая если заблокирован) */}
        <div className={`space-y-3 mb-6 p-3 bg-gray-50 rounded-lg transition-all duration-300 ${
          overlayConfig.showBlur && overlayConfig.blurFields.includes('contactInfo') 
            ? 'blur-sm' 
            : ''
        }`}>
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

        {/* Спецификации (размытые если заблокирован) */}
        <div className={`p-3 bg-blue-50 rounded-lg mb-6 transition-all duration-300 ${
          overlayConfig.showBlur && overlayConfig.blurFields.includes('specifications') 
            ? 'blur-sm' 
            : ''
        }`}>
          <h4 className="font-medium text-gray-800 mb-2">Технические требования:</h4>
          <div className="text-sm text-gray-600">
            {typeof tender.specifications === 'object' 
              ? JSON.stringify(tender.specifications, null, 2)
              : tender.specifications
            }
          </div>
        </div>

        {/* Превью кнопка */}
        {overlayConfig.showBlur && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs"
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Скрыть превью
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Показать превью
                </>
              )}
            </Button>
          </div>
        )}

        {/* Оверлей с опциями разблокировки */}
        {overlayConfig.showBlur && !showPreview && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <Lock className="w-12 h-12 text-[#0B2B5E] mx-auto mb-4" />
              
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Ограниченный доступ
              </h3>
              
              <p className="text-sm text-gray-600 mb-2">
                {overlayConfig.primaryMessage}
              </p>
              
              {overlayConfig.secondaryMessage && (
                <p className="text-xs text-gray-500 mb-6">
                  {overlayConfig.secondaryMessage}
                </p>
              )}

              <div className="space-y-3">
                {/* Кнопка разовой покупки */}
                {overlayConfig.showUnlockButton && (
                  <Button
                    onClick={handlePurchaseUnlock}
                    disabled={isProcessing}
                    className="w-full bg-[#0B2B5E] hover:bg-[#0B2B5E]/90 text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Открыть этот тендер за {unlockPrice} ₽
                  </Button>
                )}

                {/* Кнопка Premium */}
                {overlayConfig.showPremiumButton && (
                  <Button
                    onClick={handleUpgradePremium}
                    disabled={isProcessing}
                    className="w-full bg-[#F26522] hover:bg-[#F26522]/90 text-white"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Купить Premium (Безлимит)
                  </Button>
                )}

                {/* Информация об экономии */}
                {showPremiumPromo && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-2">
                      <ArrowUpCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-orange-800">
                        <p className="font-medium mb-1">Совет: Premium окупится уже на {breakEvenCount}-м тендере!</p>
                        <p>Premium за {premiumPrice.toLocaleString()} ₽ vs {breakEvenCount}× по {unlockPrice} ₽ = {(breakEvenCount * unlockPrice).toLocaleString()} ₽</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Компонент размытого контента
 */
export function BlurredContent({ 
  children, 
  isBlurred = true, 
  className = '' 
}: {
  children: React.ReactNode
  isBlurred?: boolean
  className?: string
}) {
  return (
    <div className={`transition-all duration-300 ${
      isBlurred ? 'blur-sm' : ''
    } ${className}`}>
      {children}
    </div>
  )
}

/**
 * Хук для управления состоянием разблокировки
 */
export function useLockedTenderState(
  initialAccessStatus: any, 
  onUnlockSuccess?: () => void
) {
  const [accessStatus, setAccessStatus] = useState(initialAccessStatus)
  const [isProcessing, setIsProcessing] = useState(false)

  const updateAccessStatus = useCallback((newStatus: any) => {
    setAccessStatus(newStatus)
    if (newStatus.status === 'unlocked' && onUnlockSuccess) {
      onUnlockSuccess()
    }
  }, [onUnlockSuccess])

  return {
    accessStatus,
    isProcessing,
    setIsProcessing,
    updateAccessStatus
  }
}