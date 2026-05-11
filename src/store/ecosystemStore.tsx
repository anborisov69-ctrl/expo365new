'use client';

/**
 * ecosystemStore.tsx — Глобальное хранилище экосистемы EXPO 365
 * ──────────────────────────────────────────────────────────────
 * React Context + useReducer: клиентский state-менеджер для синхронизации
 * данных ООО "ТЕСТ" между Кабинетом Экспонента и публичной витриной.
 *
 * Функциональные области:
 *   1. PRODUCTS  — товары ООО "ТЕСТ" (admin → витрина мгновенный sync)
 *   2. NEWS      — новости ООО "ТЕСТ" (экспорт → GlobalNewsFeed)
 *   3. DEALS     — сделки, инициированные байерами ("Сформировать запрос")
 *   4. REFERRALS — реферальные клиенты (/ref/ooo-test → "Свои клиенты")
 *
 * Точки монтирования:
 *   - EcosystemProvider оборачивает /horeca layout (src/app/horeca/layout.tsx)
 *   - useEcosystem() доступен в любом Client Component внутри /horeca
 *
 * TODO (Supabase migration):
 *   Заменить useReducer на Supabase Realtime subscriptions:
 *   supabase.channel('eco-ooo-test')
 *     .on('postgres_changes', { table: 'products', filter: 'exhibitor_id=eq.ooo-test-uuid' }, cb)
 *     .subscribe()
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';

import type { ClientBehavior } from '@/types/bi-signals';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — DOMAIN OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Категория товара на публичной витрине экспонента */
export type EcoProductCategory =
  | 'coffee'
  | 'tea'
  | 'equipment'
  | 'service'
  | 'tableware'
  | 'training'
  | 'consumables';

/**
 * Товар ООО "ТЕСТ" в глобальном хранилище.
 * Совместим с ExhibitorProduct (ExhibitorPageClient.tsx) + расширен партнёрскими полями.
 *
 * RLS (target Supabase):
 *   SELECT:       публичное (is_active = true)
 *   INSERT/UPDATE: authenticated + exhibitor_id = auth.uid()
 */
export interface EcoProduct {
  /** UUID товара */
  id: string;
  /** Название товара */
  name: string;
  /** Категория витрины */
  category: EcoProductCategory;
  /**
   * Базовая цена — строка с валютой (напр. "₽ 12 500 / кг").
   * Отображается на карточке витрины.
   */
  basePrice: string;
  /** URL фото из Supabase Storage (null → показать imageGradient) */
  imageUrl: string | null;
  /** CSS-градиент-плейсхолдер (показывается пока нет реального фото) */
  imageGradient: string;
  /**
   * Флаг "Новинка":
   *   - Включает в блок "Новинки индустрии" на главной странице HoReCa
   *   - Показывает бейдж NEW на карточке витрины
   */
  isNew?: boolean;
  /** Краткое описание для модального окна (1-2 строки) */
  shortDescription?: string;
  /**
   * [Partner Logic] Переключатель "Для партнёров".
   * Если true — для покупателей по реферальной ссылке доступна partnerPrice.
   */
  forPartners?: boolean;
  /**
   * [Partner Logic] Партнёрская цена — строка с валютой.
   * Отображается ТОЛЬКО байерам, пришедшим по /ref/ooo-test.
   * В остальных случаях скрыта.
   */
  partnerPrice?: string;
}

/** Тег индустрии для новостей */
export type EcoIndustryTag =
  | 'coffee'
  | 'tea'
  | 'equipment'
  | 'textile'
  | 'dishes'
  | 'food'
  | 'cold-beverages';

/** Тип промо-предложения */
export type EcoPromoType = 'new' | 'sale' | 'special';

/**
 * Новость ООО "ТЕСТ" для глобальной ленты.
 * Совместима с NewsItem из newsData.ts.
 *
 * RLS (target):
 *   SELECT: публичное (is_published = true)
 *   INSERT: authenticated + role = 'exhibitor' + exhibitor_id = auth.uid()
 */
export interface EcoNewsItem {
  id: string;
  exhibitorId:   string;
  exhibitorName: string;
  exhibitorLogo: string | null;
  exhibitorSlug: string;
  title:         string;
  description:   string;
  content?:      string;
  industryTag:   EcoIndustryTag;
  promoType:     EcoPromoType;
  timerLabel:    string;
  image?:        string;
  date:          string;
}

/**
 * Сделка, инициированная байером через кнопку "Сформировать запрос".
 *
 * Схема БД (target):
 *   deal_requests (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     product_id    uuid REFERENCES products(id),
 *     exhibitor_id  uuid REFERENCES exhibitors(id),
 *     buyer_id      uuid REFERENCES companies(id),
 *     status        text CHECK (status IN ('new','processing','confirmed','rejected')) DEFAULT 'new',
 *     is_partner    bool DEFAULT false,
 *     partner_price numeric(14,2),
 *     quantity      int NOT NULL DEFAULT 1,
 *     message       text,
 *     created_at    timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS: exhibitor_id = auth.uid() OR buyer_id = auth.uid()
 */
export interface EcoDeal {
  id:            string;
  productId:     string;
  productName:   string;
  exhibitorId:   string;
  exhibitorName: string;
  exhibitorSlug: string;
  buyerId:       string;
  buyerName:     string;
  buyerEmail:    string;
  buyerCompany:  string;
  status:        'new' | 'processing' | 'confirmed' | 'rejected';
  /** Флаг: байер пришёл по реферальной ссылке → применяется partnerPrice */
  isPartnerDeal: boolean;
  partnerPrice?: string;
  basePrice:     string;
  quantity:      number;
  message?:      string;
  createdAt:     string;
}

/**
 * Реферальный клиент — байер, пришедший по ссылке /ref/ooo-test.
 * Отображается в Кабинете с маркером "Реферальный".
 *
 * Схема БД (target):
 *   referral_clients (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     exhibitor_id  uuid REFERENCES exhibitors(id),
 *     buyer_id      uuid REFERENCES companies(id),
 *     referral_slug text NOT NULL,
 *     visited_at    timestamptz DEFAULT now(),
 *     first_deal_at timestamptz,
 *     total_deals   int DEFAULT 0,
 *     status        text CHECK (status IN ('visited','contacted','client')) DEFAULT 'visited'
 *   );
 *   -- RLS: exhibitor_id = auth.uid()
 */
export interface ReferralClient {
  id:           string;
  buyerId:      string;
  buyerName:    string;
  buyerEmail:   string;
  buyerCompany: string;
  referralSlug: string;
  visitedAt:    string;
  firstDealAt?: string;
  totalDeals:   number;
  /** visited → первый визит, contacted → запросил КП/запрос, client → сделка оформлена */
  status: 'visited' | 'contacted' | 'client';
}

/**
 * B2B-реферал — новый экспонент, привлечённый через бизнес-ссылку /?invite=b2b&ref=ooo-test.
 *
 * Хранит связку: кто пригласил → кого пригласили.
 * Используется для revenue share / скидок участия.
 *
 * Схема БД (target):
 *   b2b_referrals (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     referred_by   text NOT NULL,        -- slug источника (e.g. 'ooo-test')
 *     referrer_id   uuid REFERENCES exhibitors(id),
 *     referred_slug text NOT NULL UNIQUE, -- slug нового экспонента
 *     company_name  text NOT NULL,
 *     contact_email text,
 *     joined_at     timestamptz DEFAULT now(),
 *     status        text CHECK (status IN ('pending','active','cancelled')) DEFAULT 'pending',
 *     revenue_share_pct numeric(5,2)      -- % вознаграждения (future)
 *   );
 *   -- RLS: referrer_id = auth.uid() OR referred_id = auth.uid()
 */
export interface B2BReferral {
  /** UUID записи */
  id:              string;
  /** Slug экспонента-источника, создавшего b2b-ссылку */
  referredBy:      string;
  /** Slug нового экспонента-партнёра */
  referredSlug:    string;
  /** Официальное название компании-партнёра */
  companyName:     string;
  /** E-mail контактного лица */
  contactEmail:    string;
  /** Дата регистрации нового партнёра */
  joinedAt:        string;
  /**
   * pending  — заявка подана, ещё не активирован аккаунт
   * active   — экспонент активен → засчитывается в revenue share
   * cancelled — отказался или удалён
   */
  status:          'pending' | 'active' | 'cancelled';
  /** Процент revenue share (зарезервировано для монетизации) */
  revenueSharePct?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface EcosystemState {
  /** Каталог ООО "ТЕСТ" — синхронизируется из admin products */
  oooTestProducts: EcoProduct[];
  /** Новости ООО "ТЕСТ" — публикуются из admin news, видны в GlobalNewsFeed */
  oooTestNews: EcoNewsItem[];
  /** Сделки, инициированные байерами через "Сформировать запрос" */
  deals: EcoDeal[];
  /** Реферальные клиенты ООО "ТЕСТ" (байеры, пришедшие по /ref/ooo-test) */
  referralClients: ReferralClient[];
  /** Байер в текущей сессии пришёл по реферальной ссылке */
  isReferralBuyer: boolean;
  /** Slug-источник реферала (напр. 'ooo-test') */
  referralSource: string | null;
  /**
   * B2B-рефералы — экспоненты-партнёры, привлечённые через бизнес-ссылку.
   * Счётчик `b2bReferrals.filter(r => r.status === 'active').length` используется
   * как основа для будущего revenue share / скидок на участие.
   */
  b2bReferrals: B2BReferral[];
  /**
   * Поведенческие данные реферальных клиентов — основа для BI-сигналов.
   * Индексируется по buyerId для быстрого O(1) lookup.
   *
   * Схема БД (target):
   *   client_behaviors (
   *     id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   *     buyer_id     uuid REFERENCES companies(id),
   *     exhibitor_id uuid REFERENCES exhibitors(id),
   *     event_type   text NOT NULL,
   *     payload      jsonb NOT NULL,
   *     created_at   timestamptz NOT NULL DEFAULT now()
   *   );
   *   -- RLS: exhibitor_id = auth.uid()
   */
  clientBehaviors: ClientBehavior[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type EcosystemAction =
  | { type: 'SYNC_PRODUCTS';              products: EcoProduct[] }
  | { type: 'UPDATE_PRODUCT';             product: EcoProduct }
  | { type: 'PUBLISH_NEWS';               item: EcoNewsItem }
  | { type: 'UNPUBLISH_NEWS';             id: string }
  | { type: 'CREATE_DEAL';                deal: EcoDeal }
  | { type: 'UPDATE_DEAL_STATUS';         id: string; status: EcoDeal['status'] }
  | { type: 'SET_REFERRAL';               slug: string }
  | { type: 'REGISTER_REFERRAL_VISITOR';  client: ReferralClient }
  | { type: 'MARK_CLIENT';               buyerId: string }
  /**
   * Регистрирует нового B2B-партнёра (экспонента), привлечённого через бизнес-ссылку.
   * Дедупликация: если referredSlug уже есть — игнорируется.
   */
  | { type: 'REGISTER_B2B_REFERRAL';     referral: B2BReferral }
  /** Обновляет статус B2B-партнёра (pending → active / cancelled) */
  | { type: 'UPDATE_B2B_REFERRAL_STATUS'; referredSlug: string; status: B2BReferral['status'] }
  /**
   * Записывает поведенческое событие реферального клиента.
   * Дедупликация по buyerId: если запись уже есть — мержит события,
   * если нет — создаёт новую запись поведения.
   */
  | { type: 'TRACK_CLIENT_BEHAVIOR'; behavior: ClientBehavior };

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL DATA — каталог ООО "ТЕСТ"
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Начальный каталог ООО "ТЕСТ".
 * В production — заменить на Supabase-запрос с RLS
 *   (exhibitor_id = auth.uid(), is_active = true).
 */
const OOO_TEST_INITIAL_PRODUCTS: EcoProduct[] = [
  {
    id:               'ooo-test-p001',
    name:             'Эспрессо-машина Barista Pro X3',
    category:         'equipment',
    basePrice:        '₽ 128 000',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #0d1b2a 0%, #1b2a4a 50%, #2d3f6e 100%)',
    isNew:            true,
    shortDescription: 'Профессиональная 2-групповая машина с двойным бойлером и PID-контроллером. Потоком 150+ чашек/день.',
    forPartners:      true,
    partnerPrice:     '₽ 108 000',
  },
  {
    id:               'ooo-test-p002',
    name:             'Кофемолка Grind Master 64',
    category:         'equipment',
    basePrice:        '₽ 42 500',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 50%, #4a7a4a 100%)',
    isNew:            true,
    shortDescription: 'Бесступенчатая регулировка помола. 64 мм плоские жернова. Прямой привод без редуктора.',
    forPartners:      true,
    partnerPrice:     '₽ 36 000',
  },
  {
    id:               'ooo-test-p003',
    name:             'Арабика Эфиопия Иргачеффе',
    category:         'coffee',
    basePrice:        '₽ 2 800 / кг',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #3b1e0a 0%, #7b3a12 50%, #c06020 100%)',
    isNew:            false,
    shortDescription: 'Floral-профиль. Ягоды, жасмин, цитрус. Обжарка: средняя. Моносорт. Прямая поставка с фермы.',
  },
  {
    id:               'ooo-test-p004',
    name:             'Смесь HoReCa Blend №7',
    category:         'coffee',
    basePrice:        '₽ 1 950 / кг',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #2a1a0a 0%, #5a3a1a 50%, #8a5a2a 100%)',
    isNew:            false,
    shortDescription: 'Купаж 70% арабика / 30% робуста. Разработан для высокопроизводительных кофемашин HoReCa.',
    forPartners:      true,
    partnerPrice:     '₽ 1 650 / кг',
  },
  {
    id:               'ooo-test-p005',
    name:             'Набор каппинговых чаш (12 шт)',
    category:         'tableware',
    basePrice:        '₽ 8 400',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #3a2a1a 0%, #6e5030 50%, #a07840 100%)',
    isNew:            false,
    shortDescription: 'Фарфор 240 мл. Стандарт SCA Cupping Protocol. В комплекте 12 чаш + блюдца.',
  },
  {
    id:               'ooo-test-p006',
    name:             'Тренинг "Латте-арт Мастер"',
    category:         'training',
    basePrice:        '₽ 12 000 / чел',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #1a1a4a 0%, #2d2d7a 50%, #5050c0 100%)',
    isNew:            true,
    shortDescription: '8-часовой интенсив. Группа до 8 человек. Материалы включены. Сертификат EXPO 365.',
    forPartners:      true,
    partnerPrice:     '₽ 9 000 / чел',
  },
  {
    id:               'ooo-test-p007',
    name:             'Фильтр-картридж BWT Bestmax XL',
    category:         'consumables',
    basePrice:        '₽ 3 200 / шт',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #2a1a2a 0%, #4a2d4a 50%, #7a4a7a 100%)',
    isNew:            false,
    shortDescription: 'Ресурс 10 000 л. Для кофемашин с потреблением воды до 100 л/день. Совместим с E61 группами.',
  },
  {
    id:               'ooo-test-p008',
    name:             'Зелёный чай Сенча Premium',
    category:         'tea',
    basePrice:        '₽ 1 400 / 500г',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #1a3a2a 0%, #2e6b4a 50%, #5cad7c 100%)',
    isNew:            true,
    shortDescription: 'Первый сбор, первый класс. Пониженное содержание кофеина. Поставка напрямую из Японии.',
    forPartners:      true,
    partnerPrice:     '₽ 1 150 / 500г',
  },
  {
    id:               'ooo-test-p009',
    name:             'Сервисный контракт Full-Service',
    category:         'service',
    basePrice:        '₽ 18 000 / мес',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 50%, #4a7a4a 100%)',
    isNew:            false,
    shortDescription: 'Ежемесячное ТО + экстренный выезд 4ч. Покрывает до 3 единиц оборудования.',
    forPartners:      true,
    partnerPrice:     '₽ 14 500 / мес',
  },
  {
    id:               'ooo-test-p010',
    name:             'Стакан термо Travel 350ml',
    category:         'tableware',
    basePrice:        '₽ 1 800 / шт',
    imageUrl:         null,
    imageGradient:    'linear-gradient(135deg, #3a2a1a 0%, #6e5030 50%, #a07840 100%)',
    isNew:            true,
    shortDescription: 'Двойные стенки нерж. сталь 304. Сохраняет температуру 8 ч. Брендинг под заказ.',
  },
];

/** Начальные mock-рефклиенты для демонстрации */
const OOO_TEST_INITIAL_REFERRAL_CLIENTS: ReferralClient[] = [
  {
    id:           'ref-client-001',
    buyerId:      'buyer-ref-001',
    buyerName:    'Алексей Сорокин',
    buyerEmail:   'a.sorokin@cafeprime.ru',
    buyerCompany: 'ООО «Кафе Прайм»',
    referralSlug: 'ooo-test',
    visitedAt:    '2026-04-28T10:15:00Z',
    firstDealAt:  '2026-04-30T14:22:00Z',
    totalDeals:   3,
    status:       'client',
  },
  {
    id:           'ref-client-002',
    buyerId:      'buyer-ref-002',
    buyerName:    'Мария Головина',
    buyerEmail:   'm.golovina@restgroup.ru',
    buyerCompany: 'ООО «РестГрупп»',
    referralSlug: 'ooo-test',
    visitedAt:    '2026-05-02T09:40:00Z',
    totalDeals:   0,
    status:       'visited',
  },
  {
    id:           'ref-client-003',
    buyerId:      'buyer-ref-003',
    buyerName:    'Дмитрий Фёдоров',
    buyerEmail:   'd.fedorov@horeca-supply.ru',
    buyerCompany: 'ИП Фёдоров Д.О.',
    referralSlug: 'ooo-test',
    visitedAt:    '2026-05-06T16:05:00Z',
    firstDealAt:  '2026-05-07T11:30:00Z',
    totalDeals:   1,
    status:       'contacted',
  },
];

/**
 * Начальные mock-поведения клиентов для демонстрации BI-сигналов.
 *
 * Покрывают три сценария:
 *   buyer-ref-001 (Алексей Сорокин)   → Competitor Risk (espresso-italia/equipment) + Portfolio Gap (syrups)
 *   buyer-ref-002 (Мария Головина)    → Portfolio Gap (cups + packaging)
 *   buyer-ref-003 (Дмитрий Фёдоров)  → Competitor Risk (espresso-italia/equipment)
 *
 * В production — заменить на Supabase:
 *   SELECT * FROM client_behaviors
 *   WHERE exhibitor_id = auth.uid()
 *   ORDER BY created_at DESC
 */
const OOO_TEST_INITIAL_CLIENT_BEHAVIORS: ClientBehavior[] = [
  {
    // Алексей Сорокин — запросил КП у конкурента + ищет сиропы
    buyerId:          'buyer-ref-001',
    categorySearches: ['syrups'],
    quoteRequests: [
      {
        exhibitorSlug:    'espresso-italia',
        exhibitorCategory: 'equipment',
        timestamp:        '2026-05-01T14:00:00Z',
      },
    ],
    productViews: [
      {
        exhibitorSlug:   'espresso-italia',
        productCategory: 'equipment',
        timestamp:       '2026-05-01T13:40:00Z',
      },
    ],
  },
  {
    // Мария Головина — ищет дополнительные категории (стаканы + упаковка)
    buyerId:          'buyer-ref-002',
    categorySearches: ['cups', 'packaging'],
    quoteRequests:    [],
    productViews:     [],
  },
  {
    // Дмитрий Фёдоров — обратился к конкуренту в сфере оборудования
    buyerId:          'buyer-ref-003',
    categorySearches: [],
    quoteRequests: [
      {
        exhibitorSlug:    'espresso-italia',
        exhibitorCategory: 'equipment',
        timestamp:        '2026-05-07T10:00:00Z',
      },
    ],
    productViews: [
      {
        exhibitorSlug:   'espresso-italia',
        productCategory: 'equipment',
        timestamp:       '2026-05-07T09:45:00Z',
      },
    ],
  },
];

/**
 * Начальные B2B-рефералы ООО "ТЕСТ".
 * Демонстрируют два случая: активный партнёр и партнёр в ожидании.
 * В production — заменить на Supabase: SELECT * FROM b2b_referrals WHERE referred_by = 'ooo-test'
 */
const OOO_TEST_INITIAL_B2B_REFERRALS: B2BReferral[] = [
  {
    id:             'b2b-ref-001',
    referredBy:     'ooo-test',
    referredSlug:   'kofemagazin-pro',
    companyName:    'КофеМагазин Про',
    contactEmail:   'partner@kofemagazin.ru',
    joinedAt:       '2026-04-15T09:00:00Z',
    status:         'active',
    revenueSharePct: 5,
  },
  {
    id:             'b2b-ref-002',
    referredBy:     'ooo-test',
    referredSlug:   'tea-hub-russia',
    companyName:    'ТиХаб Россия',
    contactEmail:   'info@teahub.ru',
    joinedAt:       '2026-05-01T14:30:00Z',
    status:         'pending',
  },
  {
    id:             'b2b-ref-003',
    referredBy:     'ooo-test',
    referredSlug:   'bakery-solutions',
    companyName:    'Bakery Solutions',
    contactEmail:   'expo@bakerysol.ru',
    joinedAt:       '2026-05-07T11:00:00Z',
    status:         'active',
    revenueSharePct: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════════════════════

const initialState: EcosystemState = {
  oooTestProducts:  OOO_TEST_INITIAL_PRODUCTS,
  oooTestNews:      [],
  deals:            [],
  referralClients:  OOO_TEST_INITIAL_REFERRAL_CLIENTS,
  isReferralBuyer:  false,
  referralSource:   null,
  b2bReferrals:     OOO_TEST_INITIAL_B2B_REFERRALS,
  clientBehaviors:  OOO_TEST_INITIAL_CLIENT_BEHAVIORS,
};

function ecosystemReducer(
  state: EcosystemState,
  action: EcosystemAction,
): EcosystemState {
  switch (action.type) {

    case 'SYNC_PRODUCTS':
      return { ...state, oooTestProducts: action.products };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        oooTestProducts: state.oooTestProducts.map((p) =>
          p.id === action.product.id ? action.product : p
        ),
      };

    case 'PUBLISH_NEWS':
      // Prepend — самые свежие новости первыми; дедупликация по id
      return {
        ...state,
        oooTestNews: [
          action.item,
          ...state.oooTestNews.filter((n) => n.id !== action.item.id),
        ],
      };

    case 'UNPUBLISH_NEWS':
      return { ...state, oooTestNews: state.oooTestNews.filter((n) => n.id !== action.id) };

    case 'CREATE_DEAL':
      return { ...state, deals: [action.deal, ...state.deals] };

    case 'UPDATE_DEAL_STATUS':
      return {
        ...state,
        deals: state.deals.map((d) =>
          d.id === action.id ? { ...d, status: action.status } : d
        ),
      };

    case 'SET_REFERRAL':
      return { ...state, isReferralBuyer: true, referralSource: action.slug };

    case 'REGISTER_REFERRAL_VISITOR':
      if (state.referralClients.some((c) => c.buyerId === action.client.buyerId)) {
        return state; // Не дублируем
      }
      return { ...state, referralClients: [action.client, ...state.referralClients] };

    case 'MARK_CLIENT':
      return {
        ...state,
        referralClients: state.referralClients.map((c) =>
          c.buyerId === action.buyerId
            ? {
                ...c,
                status:      'client',
                firstDealAt: c.firstDealAt ?? new Date().toISOString(),
                totalDeals:  c.totalDeals + 1,
              }
            : c
        ),
      };

    case 'REGISTER_B2B_REFERRAL':
      // Дедупликация по referredSlug — один экспонент не может быть привлечён дважды
      if (state.b2bReferrals.some((r) => r.referredSlug === action.referral.referredSlug)) {
        return state;
      }
      return {
        ...state,
        b2bReferrals: [action.referral, ...state.b2bReferrals],
      };

    case 'UPDATE_B2B_REFERRAL_STATUS':
      return {
        ...state,
        b2bReferrals: state.b2bReferrals.map((r) =>
          r.referredSlug === action.referredSlug
            ? { ...r, status: action.status }
            : r
        ),
      };

    case 'TRACK_CLIENT_BEHAVIOR': {
      const existing = state.clientBehaviors.find(b => b.buyerId === action.behavior.buyerId);
      if (!existing) {
        // Новый клиент — добавляем запись
        return {
          ...state,
          clientBehaviors: [action.behavior, ...state.clientBehaviors],
        };
      }
      // Мержим события (дедупликация по timestamp + exhibitorSlug)
      const mergedSearches = Array.from(
        new Set([...existing.categorySearches, ...action.behavior.categorySearches])
      );
      const existingQRKeys = new Set(
        existing.quoteRequests.map(qr => `${qr.exhibitorSlug}::${qr.timestamp}`)
      );
      const newQRs = action.behavior.quoteRequests.filter(
        qr => !existingQRKeys.has(`${qr.exhibitorSlug}::${qr.timestamp}`)
      );
      const existingPVKeys = new Set(
        existing.productViews.map(pv => `${pv.exhibitorSlug}::${pv.timestamp}`)
      );
      const newPVs = action.behavior.productViews.filter(
        pv => !existingPVKeys.has(`${pv.exhibitorSlug}::${pv.timestamp}`)
      );
      return {
        ...state,
        clientBehaviors: state.clientBehaviors.map(b =>
          b.buyerId === action.behavior.buyerId
            ? {
                ...b,
                categorySearches: mergedSearches,
                quoteRequests:    [...b.quoteRequests, ...newQRs],
                productViews:     [...b.productViews, ...newPVs],
              }
            : b
        ),
      };
    }

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface EcosystemContextValue {
  state:    EcosystemState;
  dispatch: React.Dispatch<EcosystemAction>;
}

const EcosystemContext = createContext<EcosystemContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * EcosystemProvider — оборачивает /horeca layout.
 * Монтируется в src/app/horeca/layout.tsx.
 */
export function EcosystemProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(ecosystemReducer, initialState);

  // Проверяем localStorage на реферальный флаг при монтировании
  useEffect(() => {
    try {
      const ref = localStorage.getItem('expo365_ref');
      if (ref) {
        dispatch({ type: 'SET_REFERRAL', slug: ref });
      }
    } catch {
      // localStorage недоступен (SSR safe-guard)
    }
  }, []);

  return (
    <EcosystemContext.Provider value={{ state, dispatch }}>
      {children}
    </EcosystemContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Хук доступа к глобальному хранилищу EXPO 365.
 *
 * @example
 *   const { state, dispatch } = useEcosystem();
 *   const newProducts = state.oooTestProducts.filter(p => p.isNew);
 *   dispatch({ type: 'CREATE_DEAL', deal: myDeal });
 *
 * @throws {Error} если используется вне EcosystemProvider
 */
export function useEcosystem(): EcosystemContextValue {
  const ctx = useContext(EcosystemContext);
  if (!ctx) {
    throw new Error('useEcosystem must be used within <EcosystemProvider>');
  }
  return ctx;
}

// ─── Selectors (pure functions) ──────────────────────────────────────────────

/** Возвращает только новые товары ООО "ТЕСТ" (isNew = true) */
export function selectNewArrivals(state: EcosystemState): EcoProduct[] {
  return state.oooTestProducts.filter((p) => p.isNew);
}

/** Возвращает новые сделки ожидающие ответа */
export function selectPendingDeals(state: EcosystemState): EcoDeal[] {
  return state.deals.filter((d) => d.status === 'new');
}

/** Возвращает реферальных клиентов со статусом 'client' */
export function selectConfirmedReferralClients(state: EcosystemState): ReferralClient[] {
  return state.referralClients.filter((c) => c.status === 'client');
}

/** Возвращает активных B2B-партнёров (экспоненты со статусом 'active') */
export function selectActiveB2BPartners(state: EcosystemState): B2BReferral[] {
  return state.b2bReferrals.filter((r) => r.status === 'active');
}

/**
 * Счётчик активных B2B-партнёров.
 * Используется в:
 *   - Badge "Привлечено партнёров" на странице Приглашений
 *   - Иконке "Партнёр платформы" в Discovery
 *   - Будущих расчётах revenue share
 */
export function selectB2BPartnerCount(state: EcosystemState): number {
  return state.b2bReferrals.filter((r) => r.status === 'active').length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// УМНЫЕ КОНТРАКТЫ — Интеграция с партнёрскими предложениями
// ═══════════════════════════════════════════════════════════════════════════════

/** Объект для эмуляции Zustand-подобного API */
export const useEcosystemStore = {
  getState: () => ({
    /**
     * Инициализация умного контракта с финансовыми условиями
     * @param contractDraft - черновик контракта с условиями партнёрского предложения
     */
    initializeSmartContract: async (contractDraft: {
      buyerId: string;
      exhibitorId: string;
      financials: {
        discountPercent: number;
        discountAmount: number;
        paymentType: 'deferred' | 'installment';
        initialPayment: number;
        installmentsCount: number;
      };
      status: string;
    }) => {
      // В продакшене здесь будет создание записи в Supabase
      console.log('🤝 Умный контракт инициализирован:', contractDraft);
      
      // Имитируем задержку сети
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Возвращаем успешный результат
      return {
        success: true,
        contractId: `contract_${Date.now()}`,
        draftUrl: `/horeca/contracts/draft/${contractDraft.exhibitorId}`
      };
    }
  })
};
