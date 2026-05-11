/**
 * subscription-tiers.ts — Типы для уровневого доступа к тендерам
 * ════════════════════════════════════════════════════════════════
 * 
 * Описывает систему подписок и премиум доступа для экспонентов
 * в тендерной системе EXPO 365.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Уровень подписки экспонента */
export type SubscriptionTier = 'base' | 'premium';

/** Статус доступа к тендеру */
export type TenderAccessStatus = 
  | 'available'        // полный доступ
  | 'restricted'       // ограниченный доступ (показать заглушку)
  | 'pending'          // доступ откроется позже

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Расширенные данные экспонента с подпиской */
export interface ExhibitorWithTier {
  id: string
  companyName: string
  legalForm: string
  logo?: string
  subscriptionTier: SubscriptionTier
  /** Дата начала премиум подписки (если есть) */
  premiumSince?: Date
  /** Рейтинг на платформе (0-5) */
  platformRating: number
  /** Количество завершенных сделок */
  completedDeals: number
  /** Процент успешных сделок */
  successRate: number
}

/** Информация о доступе к тендеру */
export interface TenderAccessInfo {
  /** ID тендера */
  tenderId: string
  /** ID экспонента */
  exhibitorId: string
  /** Текущий статус доступа */
  accessStatus: TenderAccessStatus
  /** Время создания тендера */
  tenderCreatedAt: Date
  /** Время, когда доступ откроется для base пользователей */
  accessOpensAt: Date
  /** Осталось часов до открытия доступа */
  hoursUntilAccess: number
  /** Может ли подавать заявки */
  canBid: boolean
  /** Причина ограничения (если есть) */
  restrictionReason?: string
}

/** Расширенный тендер с информацией о доступе */
export interface TenderWithAccess {
  /** Базовые данные тендера */
  id: string
  title: string
  category: string
  description?: string
  volume: string
  createdAt: Date
  desiredDeliveryDate: Date
  /** Информация о доступе для текущего экспонента */
  accessInfo: TenderAccessInfo
  /** Общая статистика откликов */
  totalBids: number
  premiumBids: number
  /** Средняя цена предложений (если доступно) */
  averagePrice?: number
}

/** Data для заглушки ограниченного доступа */
export interface RestrictedTenderPlaceholder {
  tenderId: string
  title: string
  category: string
  /** Оставшееся время до открытия */
  timeRemaining: {
    hours: number
    minutes: number
  }
  /** Текст сообщения для пользователя */
  message: string
  /** Можно ли получить премиум доступ */
  canUpgrade: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Рекомендация поставщика для байера */
export interface SupplierRecommendation {
  /** Данные экспонента */
  exhibitor: ExhibitorWithTier
  /** Оценка релевантности (0-1) */
  relevanceScore: number
  /** Причина рекомендации */
  recommendationReason: 'premium_tier' | 'category_match' | 'past_partnership' | 'high_rating'
  /** Специальные предложения для данного байера */
  specialOffers?: {
    discountPercent: number
    description: string
    validUntil: Date
  }
  /** Статистика работы с похожими заказами */
  categoryStats?: {
    ordersInCategory: number
    averageDeliveryTime: number
    customerSatisfaction: number
  }
}

/** Контекст для рекомендательного движка */
export interface RecommendationContext {
  /** ID байера */
  buyerId: string
  /** Категория товара в RFQ */
  category: string
  /** Объем заказа */
  volumeRange?: 'small' | 'medium' | 'large'
  /** История заказов байера в данной категории */
  pastOrders?: {
    exhibitorId: string
    rating: number
    orderDate: Date
  }[]
  /** Предпочтения байера */
  preferences?: {
    preferredRegions?: string[]
    maxDeliveryTime?: number
    preferredPaymentTerms?: string[]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Константы времени для доступа */
export const TENDER_ACCESS_HOURS = {
  /** Часов для премиум доступа (мгновенно) */
  PREMIUM_ACCESS: 0,
  /** Часов задержки для базовых пользователей */
  BASE_ACCESS_DELAY: 48
} as const;

/** Тексты для UI */
export const TIER_LABELS = {
  premium: 'PREMIUM',
  base: 'STANDARD'
} as const;

export const ACCESS_MESSAGES = {
  RESTRICTED_ACCESS: 'Доступ к тендеру откроется через',
  PREMIUM_REQUIRED: 'Для мгновенного доступа требуется Premium подписка',
  UPGRADE_SUGGESTION: 'Получите доступ ко всем тендерам без задержки'
} as const;