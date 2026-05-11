/**
 * tenderAccessService.ts — Сервис управления доступом к тендерам
 * ═══════════════════════════════════════════════════════════════
 * 
 * Реализует бизнес-логику уровневого доступа:
 * - Premium: мгновенный доступ ко всем тендерам
 * - Base: доступ через 48 часов после создания тендера
 */

import { 
  TenderAccessInfo, 
  TenderAccessStatus, 
  SubscriptionTier,
  TENDER_ACCESS_HOURS,
  ACCESS_MESSAGES
} from '@/types/subscription-tiers'

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ACCESS LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Проверяет доступ экспонента к тендеру на основе времени создания и подписки
 */
export function checkTenderAccess(
  tenderId: string,
  exhibitorId: string,
  tenderCreatedAt: Date,
  exhibitorTier: SubscriptionTier
): TenderAccessInfo {
  const now = new Date()
  const createdAt = new Date(tenderCreatedAt)
  
  // Вычисляем разницу в часах
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  
  // Premium пользователи имеют мгновенный доступ
  if (exhibitorTier === 'premium') {
    return {
      tenderId,
      exhibitorId,
      accessStatus: 'available',
      tenderCreatedAt: createdAt,
      accessOpensAt: createdAt, // мгновенно
      hoursUntilAccess: 0,
      canBid: true
    }
  }
  
  // Для базовых пользователей проверяем 48-часовую задержку
  const accessOpensAt = new Date(createdAt.getTime() + (TENDER_ACCESS_HOURS.BASE_ACCESS_DELAY * 60 * 60 * 1000))
  const hoursUntilAccess = Math.max(0, TENDER_ACCESS_HOURS.BASE_ACCESS_DELAY - hoursSinceCreation)
  
  if (hoursSinceCreation >= TENDER_ACCESS_HOURS.BASE_ACCESS_DELAY) {
    // Доступ открыт
    return {
      tenderId,
      exhibitorId,
      accessStatus: 'available',
      tenderCreatedAt: createdAt,
      accessOpensAt,
      hoursUntilAccess: 0,
      canBid: true
    }
  } else {
    // Доступ ограничен
    return {
      tenderId,
      exhibitorId,
      accessStatus: 'restricted',
      tenderCreatedAt: createdAt,
      accessOpensAt,
      hoursUntilAccess,
      canBid: false,
      restrictionReason: `Доступ откроется через ${Math.ceil(hoursUntilAccess)} часов`
    }
  }
}

/**
 * Фильтрует список тендеров на основе доступа экспонента
 */
export function filterTendersByAccess<T extends { id: string; createdAt: Date }>(
  tenders: T[],
  exhibitorId: string,
  exhibitorTier: SubscriptionTier,
  showRestrictedAsPlaceholders = false
): Array<T & { accessInfo: TenderAccessInfo }> {
  return tenders.map(tender => ({
    ...tender,
    accessInfo: checkTenderAccess(tender.id, exhibitorId, tender.createdAt, exhibitorTier)
  })).filter(tender => {
    // Если показываем заглушки, включаем все тендеры
    if (showRestrictedAsPlaceholders) return true
    
    // Иначе показываем только доступные
    return tender.accessInfo.accessStatus === 'available'
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Форматирует оставшееся время до открытия доступа
 */
export function formatTimeRemaining(hours: number): { hours: number; minutes: number; text: string } {
  const wholeHours = Math.floor(hours)
  const minutes = Math.floor((hours - wholeHours) * 60)
  
  let text = ''
  if (wholeHours > 0) {
    text += `${wholeHours} ч`
    if (minutes > 0) text += ` ${minutes} мин`
  } else {
    text = `${minutes} мин`
  }
  
  return { hours: wholeHours, minutes, text }
}

/**
 * Проверяет, является ли тендер "свежим" (создан менее 48 часов назад)
 */
export function isFreshTender(createdAt: Date): boolean {
  const now = new Date()
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  return hoursSinceCreation < TENDER_ACCESS_HOURS.BASE_ACCESS_DELAY
}

/**
 * Создает сообщение о ограниченном доступе
 */
export function createAccessMessage(hoursUntilAccess: number): string {
  const timeFormatted = formatTimeRemaining(hoursUntilAccess)
  return `${ACCESS_MESSAGES.RESTRICTED_ACCESS} ${timeFormatted.text}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Группирует тендеры по статусу доступа
 */
export function groupTendersByAccess<T extends { id: string; createdAt: Date }>(
  tenders: T[],
  exhibitorId: string,
  exhibitorTier: SubscriptionTier
): {
  available: Array<T & { accessInfo: TenderAccessInfo }>
  restricted: Array<T & { accessInfo: TenderAccessInfo }>
  pending: Array<T & { accessInfo: TenderAccessInfo }>
} {
  const tendersWithAccess = filterTendersByAccess(tenders, exhibitorId, exhibitorTier, true)
  
  return {
    available: tendersWithAccess.filter(t => t.accessInfo.accessStatus === 'available'),
    restricted: tendersWithAccess.filter(t => t.accessInfo.accessStatus === 'restricted'),
    pending: tendersWithAccess.filter(t => t.accessInfo.accessStatus === 'pending')
  }
}

/**
 * Подсчитывает статистику доступа к тендерам
 */
export function calculateAccessStats(
  tenders: Array<{ id: string; createdAt: Date }>,
  exhibitorId: string,
  exhibitorTier: SubscriptionTier
): {
  totalTenders: number
  availableTenders: number
  restrictedTenders: number
  averageWaitTime: number
} {
  const grouped = groupTendersByAccess(tenders, exhibitorId, exhibitorTier)
  
  const averageWaitTime = grouped.restricted.length > 0
    ? grouped.restricted.reduce((sum, t) => sum + t.accessInfo.hoursUntilAccess, 0) / grouped.restricted.length
    : 0
  
  return {
    totalTenders: tenders.length,
    availableTenders: grouped.available.length,
    restrictedTenders: grouped.restricted.length,
    averageWaitTime
  }
}