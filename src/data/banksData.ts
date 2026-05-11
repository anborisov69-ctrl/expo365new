/**
 * banksData.ts — Mock-данные банков-партнёров финансового модуля EXPO 365
 * Включает данные для тендерного финансирования:
 *   MOCK_TENDERS_FOR_BANK  — активные тендеры, доступные банку для офферов
 *   MOCK_TENDER_OFFERS     — офферы банков на тендеры (видны байеру)
 * ─────────────────────────────────────────────────────────────────────────────
 * Партнёры: ВТБ, Точка, Аренза, Альфа-Банк
 *
 * TODO: Заменить на Supabase-запрос:
 *   supabase.from('banks').select('*, bank_services(*)')
 *
 * Схема БД (target):
 *   CREATE TABLE banks (
 *     id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     slug           text UNIQUE NOT NULL,
 *     name           text NOT NULL,
 *     short_name     text NOT NULL,
 *     logo_url       text,
 *     accent_color   char(7) NOT NULL,
 *     tagline        text,
 *     description    text,
 *     horeca_focus   bool NOT NULL DEFAULT false,
 *     rating         numeric(2,1),
 *     approved_count int4 DEFAULT 0,
 *     avg_days_review int4 DEFAULT 5,
 *     contact_email  text,
 *     contact_phone  text,
 *     created_at     timestamptz DEFAULT now()
 *   );
 */

import type {
  Bank,
  LoanApplication,
  BankBIStats,
  HotBuyerSignal,
  TenderFinancingOffer,
  TenderSummaryForBank,
} from '@/types/finance';

// ═══════════════════════════════════════════════════════════════════════════════
// BANKS — Статические данные банков-партнёров
// ═══════════════════════════════════════════════════════════════════════════════

export const BANKS: Bank[] = [
  {
    id:           'bank-vtb',
    slug:         'vtb',
    name:         'ВТБ Банк',
    shortName:    'ВТБ',
    accentColor:  '#003E8A',
    tagline:      'Лизинг и кредитование для HoReCa — до 200 млн рублей',
    description:  'ВТБ — один из крупнейших банков России с развитой программой финансирования ресторанного и гостиничного бизнеса. Специализированные продукты для покупки профессионального оборудования с пониженной ставкой.',
    horecaFocus:  true,
    rating:       4.7,
    approvedCount: 1240,
    avgDaysReview: 3,
    contactEmail: 'horeca@vtb.ru',
    contactPhone: '+7 800 100-24-24',
    services: [
      {
        type:        'leasing',
        title:       'Лизинг оборудования HoReCa',
        description: 'Финансирование покупки профессионального кухонного оборудования, кофемашин, пароконвектоматов. Без первоначального взноса от 0%.',
        rateFrom:    6.5,
        maxAmount:   200_000_000,
        termMonths:  60,
      },
      {
        type:        'credit',
        title:       'Кредит на развитие бизнеса',
        description: 'Целевой кредит для ресторанов, кафе и отелей на оснащение и модернизацию. Упрощённый пакет документов.',
        rateFrom:    9.9,
        maxAmount:   50_000_000,
        termMonths:  36,
      },
      {
        type:        'rko',
        title:       'РКО для HoReCa',
        description: 'Расчётный счёт для бизнеса с бесплатным обслуживанием первые 6 месяцев, эквайрингом и интеграцией с 1С.',
        maxAmount:   undefined,
      },
    ],
  },

  {
    id:           'bank-tochka',
    slug:         'tochka',
    name:         'Точка Банк',
    shortName:    'Точка',
    accentColor:  '#FFD000',
    tagline:      'Быстрые решения для малого бизнеса — одобрение за 1 день',
    description:  'Точка — цифровой банк для предпринимателей. Лизинг и кредиты для малого бизнеса в сфере питания и гостеприимства. Онлайн-заявка за 5 минут, решение в течение рабочего дня.',
    horecaFocus:  true,
    rating:       4.8,
    approvedCount: 870,
    avgDaysReview: 1,
    contactEmail: 'business@tochka.com',
    contactPhone: '+7 800 2000-100',
    services: [
      {
        type:        'leasing',
        title:       'Лизинг для кафе и ресторанов',
        description: 'Оборудование в лизинг без первоначального взноса. Первый платёж через 3 месяца после получения.',
        rateFrom:    8.0,
        maxAmount:   15_000_000,
        termMonths:  36,
      },
      {
        type:        'overdraft',
        title:       'Овердрафт на кассовые разрывы',
        description: 'Регулярный овердрафт для покрытия кассовых разрывов при закупке продуктов и сезонных расходах.',
        rateFrom:    12.0,
        maxAmount:   5_000_000,
        termMonths:  12,
      },
      {
        type:        'rko',
        title:       'Онлайн-РКО',
        description: 'Расчётный счёт с мобильным приложением, постоянной поддержкой 24/7 и нулевой стоимостью открытия.',
      },
    ],
  },

  {
    id:           'bank-arenza',
    slug:         'arenza',
    name:         'Аренза',
    shortName:    'Аренза',
    accentColor:  '#1A9E5F',
    tagline:      'Специализированный лизинг оборудования для HoReCa',
    description:  'Аренза — лизинговая компания, специализирующаяся на профессиональном оборудовании для ресторанов, отелей и кафе. Работаем напрямую с поставщиками EXPO 365 — ускоренное согласование.',
    horecaFocus:  true,
    rating:       4.9,
    approvedCount: 3200,
    avgDaysReview: 2,
    contactEmail:  'horeca@arenza.ru',
    contactPhone:  '+7 499 110-12-00',
    services: [
      {
        type:        'leasing',
        title:       'Целевой лизинг HoReCa',
        description: 'Персональные условия для оборудования из каталога EXPO 365. Ускоренное одобрение — мы знаем ваших поставщиков.',
        rateFrom:    5.9,
        maxAmount:   30_000_000,
        termMonths:  48,
      },
      {
        type:        'leasing',
        title:       'Лизинг с выкупом за 1 рубль',
        description: 'Оборудование переходит в собственность по окончании договора. Подходит для кофемашин, конвектоматов и тепловых линий.',
        rateFrom:    7.5,
        maxAmount:   10_000_000,
        termMonths:  36,
      },
      {
        type:        'factoring',
        title:       'Факторинг для поставщиков',
        description: 'Финансирование поставок оборудования с отсрочкой оплаты. Для дилеров и дистрибьюторов.',
        rateFrom:    11.0,
        maxAmount:   50_000_000,
      },
    ],
  },

  {
    id:           'bank-alfa',
    slug:         'alfa',
    name:         'Альфа-Банк',
    shortName:    'Альфа',
    accentColor:  '#EF3124',
    tagline:      'Полный пакет банковских решений для ресторанного бизнеса',
    description:  'Альфа-Банк предлагает комплексное финансирование для предприятий HoReCa: лизинг, кредиты, РКО и зарплатный проект. Персональный менеджер для клиентов EXPO 365.',
    horecaFocus:  false,
    rating:       4.6,
    approvedCount: 2100,
    avgDaysReview: 4,
    contactEmail:  'sme@alfabank.ru',
    contactPhone:  '+7 800 200-00-00',
    services: [
      {
        type:        'leasing',
        title:       'Альфа-Лизинг',
        description: 'Лизинг коммерческой и производственной техники. Ускоренное рассмотрение для постоянных клиентов банка.',
        rateFrom:    7.0,
        maxAmount:   100_000_000,
        termMonths:  60,
      },
      {
        type:        'credit',
        title:       'Кредит «Бизнес-старт»',
        description: 'Для новых ресторанов и кафе — кредит на оснащение с льготным периодом 6 месяцев.',
        rateFrom:    10.5,
        maxAmount:   20_000_000,
        termMonths:  24,
      },
      {
        type:        'rko',
        title:       'Пакет «Ресторан»',
        description: 'Специализированный РКО с эквайрингом, доставкой выручки и интеграцией с iiko/R-Keeper.',
      },
      {
        type:        'overdraft',
        title:       'Овердрафт «Сезонный»',
        description: 'Гибкий овердрафт для покрытия сезонных закупок продуктов и расходников.',
        rateFrom:    13.5,
        maxAmount:   8_000_000,
        termMonths:  12,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getBankBySlug(slug: string): Bank | undefined {
  return BANKS.find((b) => b.slug === slug);
}

export function getBankById(id: string): Bank | undefined {
  return BANKS.find((b) => b.id === id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK LOAN APPLICATIONS — для разработки кабинета банка
// ═══════════════════════════════════════════════════════════════════════════════

export const MOCK_LOAN_APPLICATIONS: LoanApplication[] = [
  {
    id:           'app-001',
    buyerId:      'buyer-uuid-1',
    buyerName:    'Алексей Воронов',
    buyerCompany: 'ООО «Gastro Group»',
    bankId:       'bank-arenza',
    bankName:     'Аренза',
    productId:    'prod-rational-1',
    productName:  'Пароконвектомат Rational SCC WE 101',
    productBrand: 'Rational',
    amount:       320_000,
    serviceType:  'leasing',
    status:       'pre_approved',
    purposeTag:   'Целевой лизинг',
    comment:      'Оснащаю новую кухню ресторана, нужен пароконвектомат для 150 посадочных мест.',
    bankComment:  'Предварительно одобрено. Ожидаем документы по компании.',
    createdAt:    '2026-05-08T10:30:00Z',
    updatedAt:    '2026-05-09T14:20:00Z',
  },
  {
    id:           'app-002',
    buyerId:      'buyer-uuid-2',
    buyerName:    'Марина Ильина',
    buyerCompany: 'ИП Ильина М.С.',
    bankId:       'bank-arenza',
    bankName:     'Аренза',
    productId:    'prod-marzocco-1',
    productName:  'La Marzocco Linea PB 3 Groups',
    productBrand: 'La Marzocco',
    amount:       895_000,
    serviceType:  'leasing',
    status:       'under_review',
    purposeTag:   'Целевой лизинг',
    comment:      'Открываю специализированную кофейню. Нужно профессиональное оборудование.',
    createdAt:    '2026-05-09T08:15:00Z',
    updatedAt:    '2026-05-09T08:15:00Z',
  },
  {
    id:           'app-003',
    buyerId:      'buyer-uuid-3',
    buyerName:    'Дмитрий Костин',
    buyerCompany: 'ООО «Coffee Lab Moscow»',
    bankId:       'bank-arenza',
    bankName:     'Аренза',
    productId:    'prod-mahlkoenig-1',
    productName:  'Mahlkönig EK43 S',
    productBrand: 'Mahlkönig',
    amount:       185_000,
    serviceType:  'leasing',
    status:       'pending',
    purposeTag:   'Целевой лизинг',
    createdAt:    '2026-05-10T11:00:00Z',
    updatedAt:    '2026-05-10T11:00:00Z',
  },
  {
    id:           'app-004',
    buyerId:      'buyer-uuid-1',
    buyerName:    'Алексей Воронов',
    buyerCompany: 'ООО «Gastro Group»',
    bankId:       'bank-arenza',
    bankName:     'Аренза',
    productId:    'prod-electrolux-1',
    productName:  'Electrolux ECDE02HW Тепловая линия',
    productBrand: 'Electrolux',
    amount:       450_000,
    serviceType:  'leasing',
    status:       'pending',
    purposeTag:   'Целевой лизинг',
    comment:      'Также нужна тепловая линия для буфета.',
    createdAt:    '2026-05-10T11:05:00Z',
    updatedAt:    '2026-05-10T11:05:00Z',
  },
  {
    id:           'app-005',
    buyerId:      'buyer-uuid-4',
    buyerName:    'Светлана Орлова',
    buyerCompany: 'ООО «Hotel Plaza»',
    bankId:       'bank-arenza',
    bankName:     'Аренза',
    productId:    'prod-meiko-1',
    productName:  'Meiko M-iClean H Туннельная машина',
    productBrand: 'Meiko',
    amount:       1_200_000,
    serviceType:  'credit',
    status:       'approved',
    purposeTag:   'Целевой лизинг',
    bankComment:  'Одобрено. Договор направлен на подпись.',
    createdAt:    '2026-05-05T09:00:00Z',
    updatedAt:    '2026-05-07T16:30:00Z',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK BI STATS — для BI-панели кабинета банка
// ═══════════════════════════════════════════════════════════════════════════════

const HOT_BUYERS: HotBuyerSignal[] = [
  {
    buyerId:       'buyer-uuid-5',
    buyerName:     'Павел Никитин',
    buyerCompany:  'ООО «Chain Resto»',
    searchCategory: 'Пароконвектоматы',
    estimatedBudget: 1_600_000,
    activityScore: 94,
    lastActive:    '2026-05-10T15:20:00Z',
    hasExistingApplication: false,
  },
  {
    buyerId:       'buyer-uuid-6',
    buyerName:     'Ольга Зайцева',
    buyerCompany:  'ИП Зайцева О.В.',
    searchCategory: 'Кофемашины',
    estimatedBudget: 780_000,
    activityScore: 87,
    lastActive:    '2026-05-10T14:45:00Z',
    hasExistingApplication: false,
  },
  {
    buyerId:       'buyer-uuid-7',
    buyerName:     'Игорь Белов',
    buyerCompany:  'ООО «Grand Hotel F&B»',
    searchCategory: 'Моечное оборудование',
    estimatedBudget: 2_300_000,
    activityScore: 82,
    lastActive:    '2026-05-10T13:10:00Z',
    hasExistingApplication: true,
  },
  {
    buyerId:       'buyer-uuid-8',
    buyerName:     'Анна Козлова',
    buyerCompany:  'ООО «Brasserie 12»',
    searchCategory: 'Тепловое оборудование',
    estimatedBudget: 950_000,
    activityScore: 76,
    lastActive:    '2026-05-10T11:30:00Z',
    hasExistingApplication: false,
  },
  {
    buyerId:       'buyer-uuid-9',
    buyerName:     'Антон Рыбаков',
    buyerCompany:  'ООО «Café Network»',
    searchCategory: 'Кофемолки',
    estimatedBudget: 540_000,
    activityScore: 71,
    lastActive:    '2026-05-10T10:15:00Z',
    hasExistingApplication: false,
  },
];

export const MOCK_BI_STATS: BankBIStats = {
  totalApplications:    5,
  pendingCount:         2,
  preApprovedCount:     1,
  approvedCount:        1,
  rejectedCount:        0,
  totalAmountRequested: 3_050_000,
  avgAmountRequested:   610_000,
  topCategories: [
    { category: 'Пароконвектоматы',    count: 2 },
    { category: 'Кофемашины',          count: 1 },
    { category: 'Кофемолки',           count: 1 },
    { category: 'Моечное оборудование', count: 1 },
  ],
  hotBuyers: HOT_BUYERS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK ТЕНДЕРЫ — для кабинета банка (вкладка "Тендеры")
// ═══════════════════════════════════════════════════════════════════════════════

export const MOCK_TENDERS_FOR_BANK: TenderSummaryForBank[] = [
  {
    id:           'tender-uuid-1',
    title:        'Поставка кофейного оборудования для сети кафе',
    category:     'Оборудование для кофе',
    description:  'Требуется поставка 15 профессиональных кофемашин для открытия новых точек сети кафе в Москве.',
    budgetAmount: 850_000,
    buyerCompany: 'ООО «Кофе-Стрит»',
    buyerRegion:  'Москва и МО',
    paymentType:  'installment',
    bidsCount:    5,
    createdAt:    '2026-05-03T10:00:00Z',
    deadline:     '2026-06-03T23:59:59Z',
    hasOffer:     false,
  },
  {
    id:           'tender-uuid-2',
    title:        'Закупка пароконвектоматов для ресторанной сети',
    category:     'Тепловое оборудование',
    description:  'Закупка 8 пароконвектоматов Unox или Rational для центральной кухни.',
    budgetAmount: 2_400_000,
    buyerCompany: 'ООО «Gastro Group»',
    buyerRegion:  'Санкт-Петербург',
    paymentType:  'installment',
    bidsCount:    3,
    createdAt:    '2026-05-05T08:30:00Z',
    deadline:     '2026-06-15T23:59:59Z',
    hasOffer:     true,
  },
  {
    id:           'tender-uuid-3',
    title:        'Поставка профессионального посудомоечного оборудования',
    category:     'Моечное оборудование',
    description:  'Для нового отеля — 3 туннельных посудомоечных машины и 2 стаканомоечные станции.',
    budgetAmount: 1_800_000,
    buyerCompany: 'АО «Meridian Hotels»',
    buyerRegion:  'Москва',
    paymentType:  'prepayment',
    bidsCount:    7,
    createdAt:    '2026-05-07T14:00:00Z',
    deadline:     '2026-05-28T23:59:59Z',
    hasOffer:     false,
  },
  {
    id:           'tender-uuid-4',
    title:        'Холодильное оборудование для сети гастрономов',
    category:     'Холодильное оборудование',
    description:  'Мультитемпературные витрины и морозильные лари для 12 точек продаж.',
    budgetAmount: 3_600_000,
    buyerCompany: 'ООО «Фреш Маркет»',
    buyerRegion:  'Москва и МО',
    paymentType:  'installment',
    bidsCount:    4,
    createdAt:    '2026-05-08T09:45:00Z',
    deadline:     '2026-06-20T23:59:59Z',
    hasOffer:     false,
  },
  {
    id:           'tender-uuid-5',
    title:        'Комплектация барного оборудования для конференц-центра',
    category:     'Барное оборудование',
    description:  'Барные стойки, кофемашины, блендеры, миксеры, соковыжималки — полная комплектация 2 баров.',
    budgetAmount: 650_000,
    buyerCompany: 'ООО «СитиЧейн Конференс»',
    buyerRegion:  'Москва',
    paymentType:  'postpayment',
    bidsCount:    2,
    createdAt:    '2026-05-09T11:00:00Z',
    deadline:     '2026-06-09T23:59:59Z',
    hasOffer:     false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK ОФФЕРЫ БАНКОВ — отображаются байеру на странице тендера
// ═══════════════════════════════════════════════════════════════════════════════

export const MOCK_TENDER_OFFERS: TenderFinancingOffer[] = [
  {
    id:              'offer-uuid-1',
    tenderId:        'tender-uuid-1',
    tenderTitle:     'Поставка кофейного оборудования для сети кафе',
    bankId:          'bank-vtb',
    bankName:        'ВТБ Банк',
    bankShortName:   'ВТБ',
    bankAccentColor: '#003E8A',
    serviceType:     'leasing',
    ratePercent:     6.5,
    maxAmount:       1_500_000,
    termMonths:      36,
    downPaymentPercent: 10,
    comment:         'Лизинг профессионального оборудования HoReCa. Первый платёж через 3 месяца после получения. Страховка включена в лизинговые платежи.',
    status:          'active',
    createdAt:       '2026-05-05T10:00:00Z',
    validUntil:      '2026-06-03T23:59:59Z',
  },
  {
    id:              'offer-uuid-2',
    tenderId:        'tender-uuid-1',
    tenderTitle:     'Поставка кофейного оборудования для сети кафе',
    bankId:          'bank-tochka',
    bankName:        'Точка Банк',
    bankShortName:   'Точка',
    bankAccentColor: '#FFD000',
    serviceType:     'leasing',
    ratePercent:     8.0,
    maxAmount:       1_000_000,
    termMonths:      24,
    downPaymentPercent: 0,
    comment:         'Лизинг без первоначального взноса. Решение за 1 рабочий день. Онлайн-подписание договора.',
    status:          'active',
    createdAt:       '2026-05-06T14:30:00Z',
    validUntil:      '2026-06-03T23:59:59Z',
  },
  {
    id:              'offer-uuid-3',
    tenderId:        'tender-uuid-1',
    tenderTitle:     'Поставка кофейного оборудования для сети кафе',
    bankId:          'bank-arenza',
    bankName:        'Аренза',
    bankShortName:   'Аренза',
    bankAccentColor: '#2563EB',
    serviceType:     'leasing',
    ratePercent:     7.2,
    maxAmount:       2_000_000,
    termMonths:      48,
    downPaymentPercent: 5,
    comment:         'Специализированный лизинг HoReCa-оборудования. Ускоренная амортизация. Налоговая льгота для арендатора.',
    status:          'active',
    createdAt:       '2026-05-07T09:00:00Z',
    validUntil:      '2026-06-03T23:59:59Z',
  },
];
