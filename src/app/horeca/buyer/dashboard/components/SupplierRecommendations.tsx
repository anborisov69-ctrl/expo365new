'use client'

/**
 * SupplierRecommendations.tsx — Блок рекомендованных поставщиков в RFQ
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Показывает топ-3 премиум поставщиков при создании запроса на покупку.
 * Использует акцентную рамку Orange (#F26522) для выделения Premium рекомендаций.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Star,
  Users,
  Clock,
  TrendingUp,
  ExternalLink,
  Sparkles,
  Crown,
  ChevronRight
} from 'lucide-react'
import { 
  generateSupplierRecommendations, 
  createRecommendationContext,
  convertCompanyToExhibitor,
  getTopPremiumSuppliers
} from '@/services/supplierRecommendationService'
import { SupplierRecommendation } from '@/types/subscription-tiers'
import { RecommendedBadge, SubscriptionBadge } from '@/components/ui/subscription-badge'
import { COMPANIES } from '@/data/companiesData' // Mock data

interface SupplierRecommendationsProps {
  /** ID байера */
  buyerId: string
  /** Выбранная категория тендера */
  category: string
  /** Объем заказа */
  volume?: string
  /** Обработчик выбора поставщика для приглашения */
  onInviteSupplier?: (supplierId: string) => void
  /** Обработчик перехода к профилю поставщика */
  onViewProfile?: (supplierId: string) => void
  /** CSS классы */
  className?: string
}

export function SupplierRecommendations({
  buyerId,
  category,
  volume,
  onInviteSupplier,
  onViewProfile,
  className = ''
}: SupplierRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<SupplierRecommendation[]>([])
  const [loading, setLoading] = useState(false)

  // Загружаем рекомендации при изменении категории
  useEffect(() => {
    if (!category) {
      setRecommendations([])
      return
    }

    loadRecommendations()
  }, [buyerId, category, volume])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      // Конвертируем mock данные компаний в экспонентов с подписками
      const mockExhibitors = COMPANIES.map(convertCompanyToExhibitor)
      
      // Создаем контекст для рекомендаций
      const context = createRecommendationContext(buyerId, category, volume)
      
      // Получаем рекомендации (топ-3 Premium + лучшие по категории)
      const allRecommendations = await generateSupplierRecommendations(context, mockExhibitors)
      
      // Берем топ-5 для показа
      setRecommendations(allRecommendations.slice(0, 5))
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций:', error)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  if (!category) {
    return null
  }

  if (loading) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F26522] mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Подбираем лучших поставщиков...</p>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  // Выделяем топ-3 премиум поставщиков
  const premiumRecommendations = recommendations.filter(r => r.exhibitor.subscriptionTier === 'premium').slice(0, 3)
  const otherRecommendations = recommendations.filter(r => r.exhibitor.subscriptionTier === 'base')

  return (
    <Card className={`bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-[#F26522] ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#F26522] to-orange-600 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-[#0B2B5E] flex items-center gap-2">
              Рекомендуемые поставщики
              <Badge className="bg-[#F26522] text-white text-xs">
                ИИ-подбор
              </Badge>
            </CardTitle>
            <CardDescription>
              Проверенные партнеры для категории "{category}"
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* PREMIUM ПОСТАВЩИКИ (топ-3) */}
        {premiumRecommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#F26522]">
              <Crown className="h-4 w-4" />
              Премиум партнеры
            </div>
            
            {premiumRecommendations.map((recommendation) => (
              <PremiumSupplierCard
                key={recommendation.exhibitor.id}
                recommendation={recommendation}
                onInvite={() => onInviteSupplier?.(recommendation.exhibitor.id)}
                onViewProfile={() => onViewProfile?.(recommendation.exhibitor.id)}
              />
            ))}
          </div>
        )}

        {/* РАЗДЕЛИТЕЛЬ */}
        {premiumRecommendations.length > 0 && otherRecommendations.length > 0 && (
          <div className="border-t border-orange-200 pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
              <Users className="h-4 w-4" />
              Другие проверенные поставщики
            </div>
          </div>
        )}

        {/* ОБЫЧНЫЕ ПОСТАВЩИКИ */}
        {otherRecommendations.slice(0, 2).map((recommendation) => (
          <StandardSupplierCard
            key={recommendation.exhibitor.id}
            recommendation={recommendation}
            onInvite={() => onInviteSupplier?.(recommendation.exhibitor.id)}
            onViewProfile={() => onViewProfile?.(recommendation.exhibitor.id)}
          />
        ))}

        {/* ПРИЗЫВ К ДЕЙСТВИЮ */}
        <div className="pt-2 border-t border-orange-200">
          <p className="text-xs text-gray-500 text-center">
            Премиум поставщики получают мгновенный доступ к вашим тендерам
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface PremiumSupplierCardProps {
  recommendation: SupplierRecommendation
  onInvite: () => void
  onViewProfile: () => void
}

function PremiumSupplierCard({ recommendation, onInvite, onViewProfile }: PremiumSupplierCardProps) {
  const { exhibitor, relevanceScore, recommendationReason, specialOffers, categoryStats } = recommendation

  return (
    <div className="relative p-4 bg-white border-2 border-[#F26522] rounded-2xl transition-all duration-200">
      {/* Акцентная рамка Premium */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#F26522]/10 to-orange-600/10 rounded-lg pointer-events-none" />
      
      <div className="relative space-y-3">
        {/* Хедер с названием и бейджом */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 truncate">
                {exhibitor.companyName}
              </h4>
              <RecommendedBadge reason={recommendationReason} size="sm" />
            </div>
            <p className="text-sm text-gray-600">{exhibitor.legalForm}</p>
          </div>
          
          {/* Рейтинг */}
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">{exhibitor.platformRating.toFixed(1)}</span>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-900">{exhibitor.completedDeals}</div>
            <div className="text-gray-500">Сделок</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-900">{Math.round(exhibitor.successRate)}%</div>
            <div className="text-gray-500">Успех</div>
          </div>
          {categoryStats && (
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">{categoryStats.averageDeliveryTime}д</div>
              <div className="text-gray-500">Доставка</div>
            </div>
          )}
        </div>

        {/* Специальное предложение */}
        {specialOffers && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
            <div className="font-medium text-green-800">Спецпредложение</div>
            <div className="text-green-700">{specialOffers.description}</div>
          </div>
        )}

        {/* Действия */}
        <div className="flex gap-2">
          <Button
            onClick={onInvite}
            className="flex-1 bg-[#F26522] hover:bg-orange-600 text-white text-sm h-8"
          >
            Пригласить
          </Button>
          <Button
            onClick={onViewProfile}
            variant="outline"
            className="border-[#F26522] text-[#F26522] hover:bg-orange-50 text-sm h-8 px-2"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface StandardSupplierCardProps {
  recommendation: SupplierRecommendation
  onInvite: () => void
  onViewProfile: () => void
}

function StandardSupplierCard({ recommendation, onInvite, onViewProfile }: StandardSupplierCardProps) {
  const { exhibitor, relevanceScore } = recommendation

  return (
    <div className="flex items-center justify-between p-3 bg-white border rounded-2xl transition-colors" style={{ borderColor: 'rgba(11,43,94,0.2)' }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate text-sm">
              {exhibitor.companyName}
            </h4>
            <SubscriptionBadge tier={exhibitor.subscriptionTier} size="sm" variant="outline" />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{exhibitor.completedDeals} сделок</span>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              {exhibitor.platformRating.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 ml-3">
        <Button 
          onClick={onInvite}
          variant="outline" 
          size="sm"
          className="text-xs"
        >
          Пригласить
        </Button>
        <Button
          onClick={onViewProfile}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-gray-600 px-2"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}