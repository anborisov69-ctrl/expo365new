/**
 * tender-unlocks.ts — Типы для системы разблокировки тендеров по оплате
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Описывает типы для функциональности "Pay-per-Tender" — возможности 
 * базовых участников покупать доступ к отдельным тендерам до истечения 48 часов.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Статус разблокировки тендера */
export type TenderUnlockStatus = 
  | 'locked'          // тендер заблокирован, требуется оплата
  | 'unlocked'        // тендер разблокирован (оплачен или Premium)
  | 'accessible'      // тендер доступен бесплатно (прошло 48 часов)
  | 'restricted'      // тендер недоступен (ошибка доступа)

/** Тип оплаты за разблокировку */
export type UnlockPaymentType = 'one_time' | 'subscription_upgrade'

/** Валюты для оплаты */
export type SupportedCurrency = 'RUB' | 'USD' | 'EUR'

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Запись о разблокировке тендера */
export interface TenderUnlock {
  /** Уникальный ID разблокировки */
  id: string
  /** ID экспонента, который купил доступ */
  exhibitorId: string
  /** ID тендера, к которому куплен доступ */
  tenderId: string
  /** Timestamp покупки доступа */
  purchasedAt: Date
  /** Сумма оплаты */
  paymentAmount: number
  /** Валюта оплаты */
  paymentCurrency: SupportedCurrency
  /** Timestamp создания записи */
  createdAt: Date
  /** Timestamp обновления записи */
  updatedAt: Date
}

/** Информация о цене разблокировки тендера */
export interface TenderUnlockPricing {
  /** ID тендера */
  tenderId: string
  /** Цена за разовую разблокировку */
  unlockPrice: number
  /** Валюта цены */
  currency: SupportedCurrency
  /** Цена Premium подписки для сравнения */
  premiumPrice?: number
  /** Количество тендеров, после которых Premium окупается */
  breakEvenCount?: number
}

/** Статус доступа к тендеру для конкретного экспонента */
export interface TenderAccessStatus {
  /** ID тендера */
  tenderId: string
  /** ID экспонента */
  exhibitorId: string
  /** Статус разблокировки */
  status: TenderUnlockStatus
  /** Причина блокировки (если заблокирован) */
  lockReason?: string
  /** Цена разблокировки (если заблокирован) */
  unlockPrice?: number
  /** Время до автоматической разблокировки (в часах) */
  hoursToUnlock?: number
  /** Есть ли оплаченная разблокировка */
  hasUnlock: boolean
  /** Timestamp создания тендера */
  tenderCreatedAt: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNLOCK ACTION INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Данные для инициации покупки доступа к тендеру */
export interface PurchaseTenderAccessRequest {
  /** ID экспонента */
  exhibitorId: string
  /** ID тендера */
  tenderId: string
  /** Тип оплаты */
  paymentType: UnlockPaymentType
  /** Сумма к оплате */
  amount: number
  /** Валюта оплаты */
  currency: SupportedCurrency
}

/** Результат покупки доступа к тендеру */
export interface PurchaseTenderAccessResponse {
  /** Успешность операции */
  success: boolean
  /** ID созданной разблокировки */
  unlockId?: string
  /** Сообщение об ошибке */
  error?: string
  /** Данные разблокировки */
  unlock?: TenderUnlock
}

/** Данные для проверки доступа к тендеру */
export interface CheckTenderAccessRequest {
  /** ID тендера */
  tenderId: string
  /** ID экспонента */
  exhibitorId: string
}

/** Результат проверки доступа к тендеру */
export interface CheckTenderAccessResponse {
  /** Есть ли доступ к тендеру */
  hasAccess: boolean
  /** Статус доступа */
  accessStatus: TenderAccessStatus
  /** Рекомендуемые действия */
  recommendedAction?: 'purchase_unlock' | 'upgrade_premium' | 'wait'
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Props для компонента заблокированного тендера */
export interface LockedTenderCardProps {
  /** Данные тендера */
  tender: {
    id: string
    title: string
    description: string
    buyerCompany: string
    contactEmail: string
    contactPhone: string
    specifications: object
    budget?: number
    currency: string
    createdAt: Date
    deadline: Date
  }
  /** ID текущего экспонента */
  exhibitorId: string
  /** Статус доступа */
  accessStatus: TenderAccessStatus
  /** Цена разблокировки */
  unlockPrice: number
  /** Цена Premium подписки */
  premiumPrice?: number
  /** Callback при покупке разблокировки */
  onPurchaseUnlock: (request: PurchaseTenderAccessRequest) => Promise<void>
  /** Callback при обновлении до Premium */
  onUpgradePremium: () => Promise<void>
  /** Показывать ли рекламу Premium */
  showPremiumPromo?: boolean
}

/** Конфигурация оверлея заблокированного тендера */
export interface TenderLockOverlayConfig {
  /** Показывать размытие */
  showBlur: boolean
  /** Поля для размытия */
  blurFields: Array<'contactInfo' | 'specifications' | 'budget' | 'description'>
  /** Текст основного сообщения */
  primaryMessage: string
  /** Текст дополнительного сообщения */
  secondaryMessage?: string
  /** Показывать кнопку Premium */
  showPremiumButton: boolean
  /** Показывать кнопку разовой покупки */
  showUnlockButton: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Уведомление о покупке доступа */
export interface TenderUnlockNotification {
  /** Тип уведомления */
  type: 'unlock_success' | 'premium_suggestion' | 'unlock_error'
  /** Заголовок уведомления */
  title: string
  /** Текст уведомления */
  message: string
  /** Дополнительные данные */
  data?: {
    tenderId?: string
    unlockId?: string
    savingsAmount?: number
    breakEvenCount?: number
  }
  /** Действия в уведомлении */
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'secondary'
  }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Сервис для работы с разблокировками тендеров */
export interface TenderUnlockService {
  /** Проверить доступ к тендеру */
  checkAccess(request: CheckTenderAccessRequest): Promise<CheckTenderAccessResponse>
  
  /** Получить цену разблокировки тендера */
  getUnlockPricing(tenderId: string): Promise<TenderUnlockPricing>
  
  /** Купить доступ к тендеру */
  purchaseAccess(request: PurchaseTenderAccessRequest): Promise<PurchaseTenderAccessResponse>
  
  /** Получить список разблокировок экспонента */
  getExhibitorUnlocks(exhibitorId: string): Promise<TenderUnlock[]>
  
  /** Проверить, разблокирован ли тендер */
  isUnlocked(exhibitorId: string, tenderId: string): Promise<boolean>
  
  /** Подписаться на изменения статуса разблокировки */
  subscribeToUnlockUpdates(
    exhibitorId: string, 
    callback: (unlock: TenderUnlock) => void
  ): () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Ошибки при работе с разблокировками */
export class TenderUnlockError extends Error {
  constructor(
    message: string,
    public code: 'ALREADY_UNLOCKED' | 'PAYMENT_FAILED' | 'INVALID_TENDER' | 'ACCESS_DENIED' | 'NETWORK_ERROR',
    public tenderId?: string,
    public exhibitorId?: string
  ) {
    super(message)
    this.name = 'TenderUnlockError'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Тип для фильтрации тендеров по статусу доступа */
export type TenderAccessFilter = {
  status?: TenderUnlockStatus[]
  hasUnlock?: boolean
  createdAfter?: Date
  createdBefore?: Date
}

/** Тип для сортировки разблокировок */
export type TenderUnlockSort = {
  field: 'purchasedAt' | 'paymentAmount' | 'createdAt'
  direction: 'asc' | 'desc'
}