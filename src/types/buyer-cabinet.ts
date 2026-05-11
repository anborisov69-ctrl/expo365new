export interface TenderRequest {
  id: string
  buyerId: string
  title: string
  category: string
  volume: string
  desiredDeliveryDate: Date
  paymentType: 'installment' | 'prepayment' | 'postpayment'
  description?: string
  /** 'closed' — покупатель вручную закрыл тендер до выбора победителя */
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled' | 'closed'
  responses: TenderResponse[]
  createdAt: Date
  updatedAt: Date
  // ── Поля закрытия (заполняются при status = 'closed') ────────────────────
  closedBy?:  'buyer' | 'admin' | 'system'
  closedAt?:  Date
}

export interface TenderResponse {
  id: string
  tenderId: string
  exhibitorId: string
  exhibitorName: string
  exhibitorLogo?: string
  price: number
  discountedPrice?: number
  currency: 'RUB' | 'USD' | 'EUR'
  deliveryTime: string
  proposal: string
  paymentTerms: 'prepayment' | 'installment' | 'postpayment'
  attachments?: string[]
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  // Расширенные данные для UI
  exhibitorRating: number // 0-5 звезд
  isPermanentPartner: boolean // есть ли завершенные сделки
  isSubscribedToExhibitor: boolean // подписан ли байер
  // Tier-based access
  exhibitorSubscriptionTier: 'base' | 'premium' // уровень подписки экспонента
}

export interface SpecialTerm {
  id: string
  exhibitorId: string
  buyerId: string
  exhibitorName: string
  exhibitorLogo?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  currency?: 'RUB' | 'USD' | 'EUR'
  description: string
  validUntil: Date
  minOrderAmount?: number
  maxOrderAmount?: number
  productCategories?: string[]
  isActive: boolean
  createdAt: Date
}

export interface BuyerSubscription {
  id: string
  buyerId: string
  exhibitorId: string
  exhibitorName: string
  exhibitorLogo?: string
  subscriptionDate: Date
  isActive: boolean
}

export interface SupplierNews {
  id: string
  exhibitorId: string
  exhibitorName: string
  exhibitorLogo?: string
  title: string
  content: string
  images?: string[]
  publishedAt: Date
  isPromoted: boolean
}

export interface BuyerProfile {
  id: string
  userId: string
  companyName: string
  companyLogo?: string
  contactPerson: string
  email: string
  phone: string
  address: string
  businessType: 'restaurant' | 'hotel' | 'cafe' | 'catering' | 'chain' | 'distributor'
  employeeCount?: string
  preferredCategories: string[]
  role: 'buyer' | 'partner'
}

export interface CreateTenderRequest {
  title: string
  category: string
  volume: string
  desiredDeliveryDate: Date
  paymentType: 'installment' | 'prepayment' | 'postpayment'
  description?: string
}

// Категории для тендеров
export const TENDER_CATEGORIES = [
  'Кофе и напитки',
  'Оборудование для кофе',
  'Кухонное оборудование',
  'Посуда и инвентарь',
  'Продукты питания',
  'Моющие средства',
  'Упаковка и тара',
  'Мебель и интерьер',
  'IT-решения',
  'Услуги'
] as const

export type TenderCategory = typeof TENDER_CATEGORIES[number]

// Типы оплаты
export const PAYMENT_TYPES = [
  { value: 'prepayment', label: 'Предоплата 100%' },
  { value: 'installment', label: 'Рассрочка' },
  { value: 'postpayment', label: 'Оплата после поставки' }
] as const

// ═══════════════════════════════════════════════════════════════════════════════
// РАСШИРЕННЫЕ ТИПЫ ДЛЯ TENDER UI
// ═══════════════════════════════════════════════════════════════════════════════

/** Тип уведомления для системы тендеров */
export interface TenderNotification {
  id: string
  tenderId: string
  recipientId: string // buyerId или exhibitorId
  recipientType: 'buyer' | 'exhibitor'
  type: 'tender_closed' | 'bid_accepted' | 'bid_rejected' | 'new_bid'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

/** Расширенный тендер с данными для UI */
export interface ExtendedTenderRequest extends TenderRequest {
  totalBidsCount: number
  subscribedBidsCount: number // откликов от компаний на подписке
  averagePrice?: number
  lowestPrice?: number
  highestPrice?: number
  /** Название компании-победителя (заполняется при status = 'completed') */
  winnerName?: string
}

/** Настройки фильтрации откликов */
export interface BidFilters {
  showOnlySubscribed: boolean
  sortBy: 'price' | 'rating' | 'partnership' | 'deliveryTime'
  sortOrder: 'asc' | 'desc'
  minRating?: number
  maxPrice?: number
}

/** Данные о партнерстве между байером и экспонентом */
export interface PartnershipData {
  buyerId: string
  exhibitorId: string
  completedDeals: number
  totalVolume: number // общий объем сделок
  lastDealDate?: Date
  averageRating: number // средняя оценка байера экспоненту
  isPermanentPartner: boolean // >= 3 завершенных сделки
}

/** Статистика экспонента на платформе */
export interface ExhibitorStats {
  exhibitorId: string
  platformRating: number // 0-5 звезд
  totalDeals: number
  successfulDealsPercent: number
  averageDeliveryTime: number // в днях
  responseRate: number // процент ответов на тендеры
  joinedDate: Date
}

/** Расширенные данные для BidCard */
export interface ExtendedBidData extends TenderResponse {
  exhibitorStats: ExhibitorStats
  partnershipData?: PartnershipData
  discountPercent?: number // процент скидки от стандартной цены
  deliveryRegions: string[] // регионы доставки
  minimumOrderAmount?: number
}

/** Контекст выбора победителя тендера */
export interface TenderWinnerSelection {
  tenderId: string
  winnerId: string
  winnerExhibitorName: string
  rejectedBidders: {
    exhibitorId: string
    exhibitorName: string
    exhibitorEmail?: string
  }[]
  selectionReason?: string
  selectedAt: Date
}

// Константы для уведомлений
export const NOTIFICATION_MESSAGES = {
  TENDER_CLOSED: 'Тендер закрыт. Спасибо за участие!',
  BID_ACCEPTED: 'Поздравляем! Ваше предложение принято. Перейдите к оформлению Умного контракта.',
  BID_REJECTED: 'К сожалению, ваше предложение не было выбрано. Благодарим за участие!',
  NEW_BID: 'На ваш тендер поступил новый отклик.'
} as const