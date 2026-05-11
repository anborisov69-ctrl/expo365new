/**
 * supplierRecommendationService.ts — Рекомендательный движок для поставщиков
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Приоритизирует Premium поставщиков при создании RFQ байерами.
 * Анализирует соответствие категорий, рейтинги и историю партнерства.
 */

import { 
  SupplierRecommendation, 
  RecommendationContext,
  ExhibitorWithTier
} from '@/types/subscription-tiers'
import { Company } from '@/data/companiesData'

// ═══════════════════════════════════════════════════════════════════════════════
// CORE RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Генерирует рекомендации поставщиков для RFQ
 * Приоритет: Premium поставщики → соответствие категории → рейтинг → история
 */
export async function generateSupplierRecommendations(
  context: RecommendationContext,
  availableSuppliers: ExhibitorWithTier[]
): Promise<SupplierRecommendation[]> {
  const recommendations: SupplierRecommendation[] = []

  // 1. Фильтруем и оцениваем поставщиков
  const scoredSuppliers = availableSuppliers.map(supplier => ({
    supplier,
    score: calculateRecommendationScore(supplier, context),
    reason: determineRecommendationReason(supplier, context)
  }))

  // 2. Сортируем по приоритету: Premium first, затем по скору
  const sortedSuppliers = scoredSuppliers.sort((a, b) => {
    // Premium поставщики всегда в топе
    if (a.supplier.subscriptionTier === 'premium' && b.supplier.subscriptionTier === 'base') {
      return -1
    }
    if (a.supplier.subscriptionTier === 'base' && b.supplier.subscriptionTier === 'premium') {
      return 1
    }
    // Внутри одной группы сортируем по скору
    return b.score - a.score
  })

  // 3. Берем топ-10 для дальнейшей обработки
  const topSuppliers = sortedSuppliers.slice(0, 10)

  // 4. Формируем финальные рекомендации с дополнительными данными
  for (const { supplier, score, reason } of topSuppliers) {
    const recommendation: SupplierRecommendation = {
      exhibitor: supplier,
      relevanceScore: Math.min(1, score), // нормализуем 0-1
      recommendationReason: reason,
      specialOffers: await getSpecialOffersForBuyer(supplier.id, context.buyerId),
      categoryStats: await getCategoryStats(supplier.id, context.category)
    }

    recommendations.push(recommendation)
  }

  return recommendations
}

/**
 * Вычисляет скор релевантности поставщика
 */
function calculateRecommendationScore(
  supplier: ExhibitorWithTier,
  context: RecommendationContext
): number {
  let score = 0

  // Базовый скор от рейтинга (0-1)
  score += supplier.platformRating / 5

  // Бонус за Premium статус (+0.3)
  if (supplier.subscriptionTier === 'premium') {
    score += 0.3
  }

  // Бонус за опыт работы (+0.2 максимум)
  const experienceBonus = Math.min(0.2, supplier.completedDeals / 100)
  score += experienceBonus

  // Бонус за успешность (+0.2 максимум)
  const successBonus = Math.min(0.2, supplier.successRate / 100)
  score += successBonus

  // Бонус за историю с байером (+0.5 максимум)
  if (context.pastOrders && context.pastOrders.length > 0) {
    const pastWork = context.pastOrders.find(order => order.exhibitorId === supplier.id)
    if (pastWork) {
      const historyBonus = (pastWork.rating / 5) * 0.5
      score += historyBonus
    }
  }

  // Штраф за новые аккаунты
  if (supplier.completedDeals < 5) {
    score -= 0.1
  }

  return Math.max(0, score)
}

/**
 * Определяет причину рекомендации
 */
function determineRecommendationReason(
  supplier: ExhibitorWithTier,
  context: RecommendationContext
): SupplierRecommendation['recommendationReason'] {
  // Проверяем историю партнерства
  if (context.pastOrders?.some(order => order.exhibitorId === supplier.id)) {
    return 'past_partnership'
  }

  // Premium статус
  if (supplier.subscriptionTier === 'premium') {
    return 'premium_tier'
  }

  // Высокий рейтинг
  if (supplier.platformRating >= 4.5) {
    return 'high_rating'
  }

  // По умолчанию - соответствие категории
  return 'category_match'
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIAL OFFERS & CATEGORY STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Получает специальные предложения поставщика для конкретного байера
 */
async function getSpecialOffersForBuyer(
  supplierId: string, 
  buyerId: string
): Promise<SupplierRecommendation['specialOffers']> {
  // TODO: Интегрировать с Supabase
  // Пока возвращаем mock данные для Premium поставщиков
  
  // Имитируем получение данных из БД
  const mockOffers = [
    {
      discountPercent: 15,
      description: 'Скидка 15% на первый заказ для новых партнеров',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    },
    {
      discountPercent: 10,
      description: 'Постоянная скидка 10% при заказе от 100,000 руб',
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 дней
    }
  ]

  // Возвращаем случайное предложение для демо
  if (Math.random() > 0.5) {
    return mockOffers[Math.floor(Math.random() * mockOffers.length)]
  }

  return undefined
}

/**
 * Получает статистику работы поставщика в конкретной категории
 */
async function getCategoryStats(
  supplierId: string,
  category: string
): Promise<SupplierRecommendation['categoryStats']> {
  // TODO: Интегрировать с Supabase
  // SELECT COUNT(*), AVG(delivery_time), AVG(buyer_rating) 
  // FROM orders WHERE supplier_id = ? AND category = ?

  // Mock данные для демо
  const mockStats = {
    ordersInCategory: Math.floor(Math.random() * 50) + 5,
    averageDeliveryTime: Math.floor(Math.random() * 10) + 3, // 3-13 дней
    customerSatisfaction: 0.8 + Math.random() * 0.2 // 80-100%
  }

  return mockStats
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM SUPPLIERS FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Фильтрует топ-3 Premium поставщиков для категории
 */
export function getTopPremiumSuppliers(
  suppliers: ExhibitorWithTier[],
  category: string,
  limit = 3
): ExhibitorWithTier[] {
  return suppliers
    .filter(supplier => supplier.subscriptionTier === 'premium')
    .sort((a, b) => {
      // Сортируем по рейтингу и количеству сделок
      const scoreA = a.platformRating + (a.completedDeals / 100)
      const scoreB = b.platformRating + (b.completedDeals / 100)
      return scoreB - scoreA
    })
    .slice(0, limit)
}

/**
 * Создает контекст рекомендации для RFQ
 */
export function createRecommendationContext(
  buyerId: string,
  category: string,
  volume?: string,
  pastOrders?: Array<{ exhibitorId: string; rating: number; orderDate: Date }>
): RecommendationContext {
  // Определяем размер заказа по объему
  let volumeRange: 'small' | 'medium' | 'large' = 'medium'
  if (volume) {
    const volumeLower = volume.toLowerCase()
    if (volumeLower.includes('до') || volumeLower.includes('мало') || volumeLower.includes('<')) {
      volumeRange = 'small'
    } else if (volumeLower.includes('от') || volumeLower.includes('много') || volumeLower.includes('>')) {
      volumeRange = 'large'
    }
  }

  return {
    buyerId,
    category,
    volumeRange,
    pastOrders: pastOrders || []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Конвертирует Company в ExhibitorWithTier (для тестирования)
 */
export function convertCompanyToExhibitor(company: Company): ExhibitorWithTier {
  return {
    id: company.id,
    companyName: company.companyName,
    legalForm: company.legalForm,
    logo: company.logoUrl || undefined,
    subscriptionTier: company.subscriptionTier,
    platformRating: 4.0 + Math.random() * 1.0, // Mock рейтинг 4.0-5.0
    completedDeals: Math.floor(Math.random() * 100) + 10,
    successRate: 85 + Math.random() * 15, // 85-100%
    premiumSince: company.subscriptionTier === 'premium'
      ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      : undefined
  }
}