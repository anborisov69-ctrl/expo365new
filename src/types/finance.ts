/**
 * finance.ts — TypeScript интерфейсы для финансового модуля (банки и лизинг)
 * ─────────────────────────────────────────────────────────────────────────────
 * Используется во всём модуле: витрина банков, заявки, кабинет банка, BI-панель.
 *
 * DB schema (target — Supabase PostgreSQL):
 *   banks (id, slug, name, logo_url, accent_color, ...)
 *   loan_applications (id, bank_id, buyer_id, product_id, amount, status, ...)
 *   -- RLS: bank sees only own applications; buyer sees own applications
 */

// ═══════════════════════════════════════════════════════════════════════════════
// БАНК
// ═══════════════════════════════════════════════════════════════════════════════

/** Тип финансовой услуги, предлагаемой банком */
export type BankServiceType =
  | 'leasing'       // Лизинг оборудования
  | 'credit'        // Кредитование бизнеса
  | 'rko'           // Расчётно-кассовое обслуживание
  | 'overdraft'     // Овердрафт
  | 'factoring';    // Факторинг

export interface BankService {
  type:        BankServiceType;
  title:       string;
  description: string;
  /** Минимальная ставка в % годовых (если применимо) */
  rateFrom?:   number;
  /** Максимальная сумма в рублях */
  maxAmount?:  number;
  /** Срок до N месяцев */
  termMonths?: number;
}

/** Карточка банка-партнёра */
export interface Bank {
  id:           string;
  slug:         string;
  name:         string;
  shortName:    string;
  /** Логотип — путь в /public или data-URL */
  logoUrl?:     string;
  /** Hex-цвет акцента (бренд-кит банка) */
  accentColor:  string;
  tagline:      string;
  description:  string;
  services:     BankService[];
  /** Специализация: HoReCa-фокус */
  horecaFocus:  boolean;
  /** Звёздный рейтинг (1-5) */
  rating:       number;
  /** Количество одобренных заявок через платформу */
  approvedCount: number;
  /** Средний срок рассмотрения заявки в рабочих днях */
  avgDaysReview: number;
  contactEmail?: string;
  contactPhone?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЗАЯВКА НА ФИНАНСИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════════════════════

/** Статус заявки — строго типизированный enum */
export type LoanApplicationStatus =
  | 'pending'           // Ожидает рассмотрения
  | 'under_review'      // На рассмотрении у банка
  | 'pre_approved'      // ✅ Предварительно одобрено
  | 'approved'          // ✅ Одобрено
  | 'rejected'          // ❌ Отклонено
  | 'cancelled';        // Отменено байером

export const LOAN_STATUS_LABELS: Record<LoanApplicationStatus, string> = {
  pending:      'Ожидает рассмотрения',
  under_review: 'На рассмотрении',
  pre_approved: 'Предварительно одобрено',
  approved:     'Одобрено',
  rejected:     'Отклонено',
  cancelled:    'Отменено',
};

export const LOAN_STATUS_COLORS: Record<LoanApplicationStatus, { bg: string; text: string; border: string }> = {
  pending:      { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  under_review: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  pre_approved: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  approved:     { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
  rejected:     { bg: '#fff1f2', text: '#9f1239', border: '#fda4af' },
  cancelled:    { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0' },
};

/** Заявка байера на финансирование конкретного товара */
export interface LoanApplication {
  id:          string;
  /** UUID из Supabase auth */
  buyerId:     string;
  buyerName:   string;
  buyerCompany: string;
  bankId:      string;
  bankName:    string;
  /** ID товара из каталога */
  productId:   string;
  productName: string;
  productBrand: string;
  /** Запрошенная сумма финансирования (руб.) */
  amount:      number;
  /** Тип услуги: лизинг / кредит */
  serviceType: BankServiceType;
  status:      LoanApplicationStatus;
  /** Пометка "Целевой лизинг" / "Кредит на оборудование" */
  purposeTag:  string;
  comment?:    string;
  /** Ответ банка при pre_approved / rejected */
  bankComment?: string;
  createdAt:   string;   // ISO 8601
  updatedAt:   string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BI-СИГНАЛЫ БАНКА
// ═══════════════════════════════════════════════════════════════════════════════

/** «Горячий» клиент — байер, активно ищущий оборудование */
export interface HotBuyerSignal {
  buyerId:       string;
  buyerName:     string;
  buyerCompany:  string;
  /** Категория оборудования, которую ищет байер */
  searchCategory: string;
  /** Суммарный бюджет по просмотренным товарам > 50 000 руб */
  estimatedBudget: number;
  /** Количество просмотренных дорогостоящих товаров за последние 7 дней */
  activityScore:  number;
  /** Дата последней активности */
  lastActive:     string;
  /** Уже есть открытые заявки в этом банке? */
  hasExistingApplication: boolean;
}

/** Агрегированная BI-статистика для кабинета банка */
export interface BankBIStats {
  totalApplications:   number;
  pendingCount:        number;
  preApprovedCount:    number;
  approvedCount:       number;
  rejectedCount:       number;
  totalAmountRequested: number;
  avgAmountRequested:  number;
  /** Топ-категории оборудования в заявках */
  topCategories:       Array<{ category: string; count: number }>;
  /** «Горячие» байеры */
  hotBuyers:           HotBuyerSignal[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТЕНДЕРНОЕ ФИНАНСИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Оффер банка на финансирование конкретного тендера.
 * Банк видит активный тендер и предлагает кредит/лизинг байеру.
 *
 * DB target:
 *   tender_financing_offers (id, tender_id, bank_id, service_type, rate_percent,
 *     max_amount, term_months, down_payment_percent, comment, status, created_at)
 */
export interface TenderFinancingOffer {
  id:               string;
  tenderId:         string;
  tenderTitle:      string;
  bankId:           string;
  bankName:         string;
  bankShortName:    string;
  bankAccentColor:  string;
  /** Тип услуги: лизинг / кредит */
  serviceType:      BankServiceType;
  /** Процентная ставка: % годовых */
  ratePercent:      number;
  /** Максимальная сумма финансирования (руб.) */
  maxAmount:        number;
  /** Срок финансирования (месяцы) */
  termMonths:       number;
  /** Минимальный первоначальный взнос (% от суммы) */
  downPaymentPercent?: number;
  /** Комментарий банка для байера */
  comment?:         string;
  /** Статус оффера */
  status:           'active' | 'accepted' | 'expired' | 'withdrawn';
  createdAt:        string;  // ISO 8601
  /** Действует до */
  validUntil?:      string;
}

/**
 * Краткое представление тендера для кабинета банка.
 * Банк видит только «безопасные» поля: категория, бюджет, регион.
 * PII байера (контакты) скрыты — раскрываются только при принятии оффера.
 */
export interface TenderSummaryForBank {
  id:           string;
  title:        string;
  category:     string;
  description?: string;
  /** Средняя/ожидаемая сумма тендера (для расчёта платежей) */
  budgetAmount: number;
  /** Название компании байера (без персональных данных) */
  buyerCompany:  string;
  buyerRegion?:  string;
  paymentType:  'installment' | 'prepayment' | 'postpayment';
  bidsCount:    number;
  createdAt:    string;
  deadline?:    string;
  /** true — этот банк уже отправил оффер на данный тендер */
  hasOffer:     boolean;
}

/**
 * Трёхсторонний черновик договора: Поставщик — Покупатель — Банк.
 * Генерируется автоматически при принятии байером банковского оффера.
 *
 * DB target:
 *   tripartite_contracts (id, tender_id, supplier_id, buyer_id, bank_id,
 *     deal_amount, financing_offer_id, monthly_payment, status, created_at)
 */
export interface TripartiteContractDraft {
  id:            string;
  tenderId:      string;
  tenderTitle:   string;
  // ── Стороны договора ──────────────────────────────────────────────────────
  supplierId:    string;
  supplierName:  string;
  buyerId:       string;
  buyerCompany:  string;
  bankId:        string;
  bankName:      string;
  // ── Финансовые параметры ──────────────────────────────────────────────────
  /** Сумма сделки (finalPrice выигравшего участника тендера) */
  dealAmount:       number;
  /** Принятый оффер банка */
  financingOffer:   TenderFinancingOffer;
  /** Расчётный ежемесячный платёж (аннуитет) */
  monthlyPayment:   number;
  // ── Служебные поля ────────────────────────────────────────────────────────
  status:     'draft' | 'sent_to_parties' | 'signed' | 'cancelled';
  createdAt:  string;  // ISO 8601
}

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТА: расчёт аннуитетного платежа
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Рассчитывает ежемесячный аннуитетный платёж.
 *
 * @param principal   — сумма кредита/лизинга (руб.)
 * @param ratePercent — годовая ставка (%)
 * @param termMonths  — срок (месяцы)
 * @returns ежемесячный платёж (руб.), округлённый до целых
 */
export function calcMonthlyPayment(
  principal:   number,
  ratePercent: number,
  termMonths:  number,
): number {
  if (ratePercent === 0) return Math.round(principal / termMonths);
  const r = ratePercent / 100 / 12;
  const payment = principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return Math.round(payment);
}
