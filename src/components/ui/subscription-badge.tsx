'use client'

/**
 * subscription-badge.tsx — Бейджи для отображения уровня подписки экспонентов
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Визуально выделяет Premium поставщиков в интерфейсе тендерной системы.
 * Использует акцентный цвет Orange (#F26522) для Premium индикаторов.
 */

import { Badge } from '@/components/ui/badge'
import { Star, Crown, Zap, Shield } from 'lucide-react'
import { SubscriptionTier, TIER_LABELS } from '@/types/subscription-tiers'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SubscriptionBadgeProps {
  /** Уровень подписки */
  tier: SubscriptionTier
  /** Размер бейджа */
  size?: 'sm' | 'md' | 'lg'
  /** Вариант отображения */
  variant?: 'default' | 'outline' | 'minimal'
  /** Показать иконку */
  showIcon?: boolean
  /** Кастомный текст */
  customLabel?: string
  /** Дополнительные CSS классы */
  className?: string
}

export function SubscriptionBadge({
  tier,
  size = 'md',
  variant = 'default',
  showIcon = true,
  customLabel,
  className
}: SubscriptionBadgeProps) {
  const isPremium = tier === 'premium'
  
  // Определяем стили на основе размера
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  // Определяем стили на основе варианта
  const getVariantClasses = (isPremium: boolean) => {
    if (isPremium) {
      switch (variant) {
        case 'outline':
          return 'border-2 border-[#F26522] text-[#F26522] bg-orange-50 hover:bg-orange-100'
        case 'minimal':
          return 'bg-transparent text-[#F26522] border-none'
        default:
          return 'bg-gradient-to-r from-[#F26522] to-orange-600 text-white border-none shadow-md hover:shadow-lg'
      }
    } else {
      switch (variant) {
        case 'outline':
          return 'border border-gray-300 text-gray-600 bg-gray-50'
        case 'minimal':
          return 'bg-transparent text-gray-500 border-none'
        default:
          return 'bg-gray-100 text-gray-700 border-gray-200'
      }
    }
  }

  // Выбираем иконку
  const IconComponent = isPremium ? Crown : Shield
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold transition-all duration-200',
        sizeClasses[size],
        getVariantClasses(isPremium),
        isPremium && variant === 'default' && 'animate-pulse-subtle',
        className
      )}
    >
      {showIcon && <IconComponent className={iconSize} />}
      {customLabel || TIER_LABELS[tier]}
    </Badge>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED BADGE VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustedPartnerBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Специальный бейдж "Проверенный партнер" для Premium поставщиков
 */
export function TrustedPartnerBadge({ className, size = 'md' }: TrustedPartnerBadgeProps) {
  return (
    <SubscriptionBadge
      tier="premium"
      size={size}
      variant="default"
      customLabel="ПРОВЕРЕННЫЙ"
      showIcon={true}
      className={cn('bg-gradient-to-r from-emerald-500 to-emerald-600', className)}
    />
  )
}

interface FastAccessBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Бейдж "Быстрый доступ" для Premium экспонентов в тендерах
 */
export function FastAccessBadge({ className, size = 'md' }: FastAccessBadgeProps) {
  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1 bg-blue-500 text-white font-medium',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1',
        size === 'lg' && 'text-base px-3 py-1.5',
        className
      )}
    >
      <Zap className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      МГНОВЕННЫЙ ДОСТУП
    </Badge>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION HIGHLIGHT BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface RecommendedBadgeProps {
  /** Причина рекомендации */
  reason: 'premium_tier' | 'category_match' | 'past_partnership' | 'high_rating'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Бейдж для рекомендованных поставщиков с акцентной рамкой
 */
export function RecommendedBadge({ reason, className, size = 'md' }: RecommendedBadgeProps) {
  const reasonLabels = {
    premium_tier: 'TOP ПОСТАВЩИК',
    category_match: 'ПОДХОДЯЩИЙ',
    past_partnership: 'ВАШ ПАРТНЕР',
    high_rating: 'ВЫСОКИЙ РЕЙТИНГ'
  }

  const reasonColors = {
    premium_tier: 'bg-gradient-to-r from-[#F26522] to-orange-600 text-white',
    category_match: 'bg-blue-500 text-white',
    past_partnership: 'bg-green-500 text-white',
    high_rating: 'bg-purple-500 text-white'
  }

  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1 font-semibold border-2 shadow-md',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1',
        size === 'lg' && 'text-base px-3 py-1.5',
        reasonColors[reason],
        reason === 'premium_tier' && 'border-[#F26522] animate-pulse-subtle',
        className
      )}
    >
      <Star className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      {reasonLabels[reason]}
    </Badge>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Определяет, нужно ли показать специальный бейдж для экспонента
 */
export function shouldShowSpecialBadge(
  tier: SubscriptionTier, 
  context: 'tender_list' | 'recommendation' | 'profile'
): boolean {
  if (tier !== 'premium') return false
  
  // В разных контекстах показываем разные бейджи
  switch (context) {
    case 'tender_list':
    case 'profile':
      return true
    case 'recommendation':
      return true
    default:
      return false
  }
}

/**
 * Возвращает подходящий компонент бейджа для контекста
 */
export function getBadgeForContext(
  tier: SubscriptionTier,
  context: 'tender_list' | 'recommendation' | 'profile',
  reason?: RecommendedBadgeProps['reason']
) {
  if (!shouldShowSpecialBadge(tier, context)) return null

  switch (context) {
    case 'tender_list':
      return <SubscriptionBadge tier={tier} size="sm" />
    case 'recommendation':
      return reason 
        ? <RecommendedBadge reason={reason} size="md" />
        : <SubscriptionBadge tier={tier} size="md" />
    case 'profile':
      return <TrustedPartnerBadge size="lg" />
    default:
      return <SubscriptionBadge tier={tier} />
  }
}