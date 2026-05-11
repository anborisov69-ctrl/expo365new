'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  Award, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  CreditCard, 
  Truck, 
  MapPin,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { ExtendedBidData, PAYMENT_TYPES } from '@/types/buyer-cabinet'
import { SubscriptionBadge, getBadgeForContext } from '@/components/ui/subscription-badge'
import Image from 'next/image'

interface BidCardProps {
  bid: ExtendedBidData
  onSelectWinner: () => void
  onViewProfile: () => void
  isSelecting?: boolean
  disabled?: boolean
  className?: string
}

export function BidCard({ 
  bid, 
  onSelectWinner, 
  onViewProfile, 
  isSelecting = false, 
  disabled = false,
  className = '' 
}: BidCardProps) {
  const [imageError, setImageError] = useState(false)
  
  const finalPrice = bid.discountedPrice || bid.price
  const hasDiscount = bid.discountedPrice && bid.discountedPrice < bid.price
  const discountPercent = hasDiscount 
    ? Math.round(((bid.price - bid.discountedPrice!) / bid.price) * 100)
    : 0

  const getPaymentTypeLabel = (paymentType: string) => {
    return PAYMENT_TYPES.find(type => type.value === paymentType)?.label || paymentType
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : i < rating 
              ? 'fill-yellow-200 text-yellow-400' 
              : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      bid.isPermanentPartner ? 'border-l-4 border-l-[#F26522]' : ''
    } ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Логотип компании */}
            <div className="flex-shrink-0">
              {bid.exhibitorLogo && !imageError ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={bid.exhibitorLogo}
                    alt={`Логотип ${bid.exhibitorName}`}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">
                    {bid.exhibitorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Основная информация */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2 flex-wrap">
                <CardTitle className="text-lg text-[#0B2B5E] hover:text-[#0A2756] transition-colors">
                  {bid.exhibitorName}
                </CardTitle>
                
                {/* Бейдж уровня подписки экспонента */}
                {bid.exhibitorSubscriptionTier && (
                  <SubscriptionBadge
                    tier={bid.exhibitorSubscriptionTier}
                    size="sm"
                    variant={bid.exhibitorSubscriptionTier === 'premium' ? 'default' : 'outline'}
                  />
                )}
                
                {/* Бейдж постоянного партнера */}
                {bid.isPermanentPartner && (
                  <Badge className="bg-[#F26522] hover:bg-[#E55A1F] text-white">
                    <Award className="w-3 h-3 mr-1" />
                    Постоянный партнер
                  </Badge>
                )}
                
                {/* Бейдж подписки */}
                {bid.isSubscribedToExhibitor && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Подписка
                  </Badge>
                )}
              </div>

              {/* Рейтинг */}
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center space-x-1">
                  {renderStars(bid.exhibitorRating)}
                </div>
                <span className="text-sm text-gray-600">
                  {bid.exhibitorRating.toFixed(1)} ({bid.exhibitorStats.totalDeals} сделок)
                </span>
              </div>

              {/* Статистика экспонента */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Truck className="w-4 h-4" />
                  <span>Успешных: {bid.exhibitorStats.successfulDealsPercent}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Ср. доставка: {bid.exhibitorStats.averageDeliveryTime} дн.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewProfile}
              className="text-[#0B2B5E] border-[#0B2B5E] hover:bg-[#0B2B5E] hover:text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Перейти в профиль
            </Button>
            
            <Button
              onClick={onSelectWinner}
              disabled={disabled || isSelecting}
              className="bg-[#F26522] hover:bg-[#E55A1F] text-white"
            >
              {isSelecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Выбираем...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Принять предложение
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Финансовые условия */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* Цена */}
          <div className="space-y-1">
            <p className="text-sm text-gray-600 font-medium">Стоимость</p>
            <div className="flex items-baseline space-x-2">
              {hasDiscount ? (
                <>
                  <span className="text-lg font-bold text-green-600">
                    {finalPrice.toLocaleString('ru-RU')} ₽
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {bid.price.toLocaleString('ru-RU')} ₽
                  </span>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    -{discountPercent}%
                  </Badge>
                </>
              ) : (
                <span className="text-lg font-bold text-[#0B2B5E]">
                  {finalPrice.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
          </div>

          {/* Срок поставки */}
          <div className="space-y-1">
            <p className="text-sm text-gray-600 font-medium">Срок поставки</p>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">{bid.deliveryTime}</span>
            </div>
          </div>

          {/* Условия оплаты */}
          <div className="space-y-1">
            <p className="text-sm text-gray-600 font-medium">Условия оплаты</p>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {getPaymentTypeLabel(bid.paymentTerms)}
              </span>
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="space-y-3 bg-gray-50 rounded-lg p-4">
          {/* Предложение */}
          {bid.proposal && (
            <div>
              <p className="text-sm text-gray-600 font-medium mb-2">Предложение:</p>
              <p className="text-sm text-gray-800 leading-relaxed">
                {bid.proposal}
              </p>
            </div>
          )}

          {/* Регионы доставки */}
          {bid.deliveryRegions && bid.deliveryRegions.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 font-medium mb-2">Регионы доставки:</p>
              <div className="flex flex-wrap gap-1">
                {bid.deliveryRegions.slice(0, 3).map((region, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {region}
                  </Badge>
                ))}
                {bid.deliveryRegions.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{bid.deliveryRegions.length - 3} ещё
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Минимальная сумма заказа */}
          {bid.minimumOrderAmount && (
            <div>
              <p className="text-sm text-gray-600">
                Минимальная сумма заказа: 
                <span className="font-medium ml-1">
                  {bid.minimumOrderAmount.toLocaleString('ru-RU')} ₽
                </span>
              </p>
            </div>
          )}

          {/* Партнерская история */}
          {bid.partnershipData && (
            <div className="border-t pt-3 mt-3">
              <p className="text-sm text-gray-600 font-medium mb-2">История сотрудничества:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Сделок завершено:</span>
                  <span className="font-medium ml-2">{bid.partnershipData.completedDeals}</span>
                </div>
                <div>
                  <span className="text-gray-500">Общий объем:</span>
                  <span className="font-medium ml-2">
                    {bid.partnershipData.totalVolume.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
              {bid.partnershipData.lastDealDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Последняя сделка: {bid.partnershipData.lastDealDate.toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Вложения */}
        {bid.attachments && bid.attachments.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 font-medium mb-2">Прикрепленные файлы:</p>
            <div className="flex flex-wrap gap-2">
              {bid.attachments.map((attachment, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer hover:bg-gray-100">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Файл {index + 1}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}