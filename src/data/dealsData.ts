/**
 * dealsData.ts — Mock данные сделок и контрактов (HoReCa B2B CRM)
 * ─────────────────────────────────────────────────────────────────
 * Статические данные для разработки рабочего пространства «Сделки и контракты».
 *
 * TODO: Заменить на Supabase RLS-запрос:
 *   supabase
 *     .from('deals')
 *     .select(`
 *       *,
 *       deal_items ( *, products(*) ),
 *       change_history ( *, profiles(full_name) )
 *     `)
 *     .eq('exhibitor_id', session.user.id)
 *     .order('updated_at', { ascending: false })
 *
 * Схема БД (target):
 *   deals (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     exhibitor_id  uuid REFERENCES exhibitors(id),
 *     buyer_id      uuid REFERENCES companies(id),
 *     status        deal_status NOT NULL DEFAULT 'negotiation',
 *     total_amount  numeric(14,2) NOT NULL,
 *     currency      char(3) NOT NULL DEFAULT 'RUB',
 *     created_at    timestamptz NOT NULL DEFAULT now(),
 *     updated_at    timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS: exhibitor_id = auth.uid()  OR  buyer_id = auth.uid()
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DealStatus = 'negotiation' | 'awaiting_signature' | 'paid' | 'cancelled';

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  negotiation:       'Согласование',
  awaiting_signature:'Ожидает подписи',
  paid:              'Оплачено',
  cancelled:         'Отменена',
};

/** Компания-заказчик */
export interface BuyerCompany {
  id:       string;
  name:     string;
  /** ИНН — 10 или 12 цифр */
  inn:      string;
  logoUrl?: string;
  /** Город / страна */
  location: string;
}

/** Строка позиции в сделке */
export interface DealItem {
  id:         string;
  productId:  string;
  productName:string;
  sku:        string;
  brandLogoUrl?: string;
  /** Базовая цена из каталога */
  basePrice:  number;
  /** Индивидуальная скидка для этого байера (0–100%) */
  discount:   number;
  /** Итоговая цена с учётом скидки */
  finalPrice: number;
  quantity:   number;
  currency:   'RUB';
}

/** Запись в истории изменений сделки */
export interface ChangeHistoryEntry {
  id:        string;
  /** UUID сотрудника, внёсшего изменение */
  userId:    string;
  userName:  string;
  userRole:  'ADMIN_EXPONENT' | 'BUYER';
  /** Краткое описание действия */
  action:    string;
  /** Поле, которое было изменено */
  field?:    string;
  oldValue?: string;
  newValue?: string;
  timestamp: string; // ISO 8601
}

/** Полная модель сделки */
export interface Deal {
  id:          string;
  buyer:       BuyerCompany;
  status:      DealStatus;
  totalAmount: number;
  currency:    'RUB';
  items:       DealItem[];
  history:     ChangeHistoryEntry[];
  createdAt:   string; // ISO 8601
  updatedAt:   string; // ISO 8601
  /** Договор подписан обеими сторонами */
  isSigned:    boolean;
  /** Номер счёта / договора */
  contractRef?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK BUYERS
// ═══════════════════════════════════════════════════════════════════════════════

const BUYERS: BuyerCompany[] = [
  {
    id:       'buyer-001',
    name:     'Московский ресторанный холдинг',
    inn:      '7704567890',
    location: 'Москва',
  },
  {
    id:       'buyer-002',
    name:     'Sashiko Coffee Group',
    inn:      '7801234567',
    location: 'Санкт-Петербург',
  },
  {
    id:       'buyer-003',
    name:     'Ufa Hospitality LLC',
    inn:      '0278901234',
    location: 'Уфа',
  },
  {
    id:       'buyer-004',
    name:     'Grand Hotel Invest (GHI)',
    inn:      '6311234567',
    location: 'Самара',
  },
  {
    id:       'buyer-005',
    name:     'KazFood Trading LLP',
    inn:      'KZ030140007695',
    location: 'Алматы, Казахстан',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DEALS
// ═══════════════════════════════════════════════════════════════════════════════

export const DEALS: Deal[] = [
  // ── Сделка 1: Согласование ────────────────────────────────────────────────
  {
    id:          'deal-2024-0041',
    buyer:       BUYERS[0],
    status:      'negotiation',
    totalAmount: 1_286_500,
    currency:    'RUB',
    isSigned:    false,
    contractRef: 'ДГ-2024/041',
    createdAt:   '2024-11-10T09:15:00Z',
    updatedAt:   '2024-11-20T14:32:00Z',
    items: [
      {
        id:          'di-0041-01',
        productId:   'prod-0001-lm-linea-pb',
        productName: 'La Marzocco Linea PB (1 гр.)',
        sku:         'LM-LINPB-AV1',
        brandLogoUrl:'/assets/brands/la-marzocco.svg',
        basePrice:   485_000,
        discount:    5,
        finalPrice:  460_750,
        quantity:    2,
        currency:    'RUB',
      },
      {
        id:          'di-0041-02',
        productId:   'prod-0009-anf-super-caimano',
        productName: 'Anfim Super Caimano On-Demand',
        sku:         'ANF-SCOD-STD',
        brandLogoUrl:'/assets/brands/anfim.svg',
        basePrice:   82_500,
        discount:    10,
        finalPrice:  74_250,
        quantity:    2,
        currency:    'RUB',
      },
      {
        id:          'di-0041-03',
        productId:   'prod-0035-acc-rhinowares',
        productName: 'Rhinowares Cold Brew Kit',
        sku:         'RHW-CBK-1L',
        brandLogoUrl:undefined,
        basePrice:   8_500,
        discount:    0,
        finalPrice:  8_500,
        quantity:    3,
        currency:    'RUB',
      },
    ],
    history: [
      {
        id:        'hist-0041-01',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Создание сделки',
        timestamp: '2024-11-10T09:15:00Z',
      },
      {
        id:        'hist-0041-02',
        userId:    'usr-buyer-buyer001',
        userName:  'Наталья Соколова (МРХ)',
        userRole:  'BUYER',
        action:    'Запрошена скидка',
        field:     'Скидка на La Marzocco Linea PB',
        oldValue:  '3%',
        newValue:  '5%',
        timestamp: '2024-11-15T11:00:00Z',
      },
      {
        id:        'hist-0041-03',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Скидка одобрена, позиция обновлена',
        field:     'Скидка на La Marzocco Linea PB',
        oldValue:  '3%',
        newValue:  '5%',
        timestamp: '2024-11-16T09:45:00Z',
      },
      {
        id:        'hist-0041-04',
        userId:    'usr-buyer-buyer001',
        userName:  'Наталья Соколова (МРХ)',
        userRole:  'BUYER',
        action:    'Увеличен объём заказа',
        field:     'Количество Anfim Super Caimano',
        oldValue:  '1 шт.',
        newValue:  '2 шт.',
        timestamp: '2024-11-20T14:32:00Z',
      },
    ],
  },

  // ── Сделка 2: Ожидает подписи ─────────────────────────────────────────────
  {
    id:          'deal-2024-0038',
    buyer:       BUYERS[1],
    status:      'awaiting_signature',
    totalAmount: 741_600,
    currency:    'RUB',
    isSigned:    false,
    contractRef: 'ДГ-2024/038',
    createdAt:   '2024-10-25T08:00:00Z',
    updatedAt:   '2024-11-18T16:55:00Z',
    items: [
      {
        id:          'di-0038-01',
        productId:   'prod-0002-ran-classe7',
        productName: 'Rancilio Classe 7 USB 2-гр.',
        sku:         'RAN-CL7-USB2',
        brandLogoUrl:'/assets/brands/rancilio.svg',
        basePrice:   320_000,
        discount:    8,
        finalPrice:  294_400,
        quantity:    2,
        currency:    'RUB',
      },
      {
        id:          'di-0038-02',
        productId:   'prod-0010-mlk-e65s',
        productName: 'Mahlkönig E65S GbW',
        sku:         'MLK-E65S-GBW',
        brandLogoUrl:'/assets/brands/mahlkoenig.svg',
        basePrice:   95_000,
        discount:    5,
        finalPrice:  90_250,
        quantity:    1,
        currency:    'RUB',
      },
      {
        id:          'di-0038-03',
        productId:   'prod-0006-jura-e8',
        productName: 'Jura E8 Piano Black (2026)',
        sku:         'JUR-E8-PB-26',
        basePrice:   79_900,
        discount:    0,
        finalPrice:  79_900,
        quantity:    1,
        currency:    'RUB',
      },
    ],
    history: [
      {
        id:        'hist-0038-01',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Создание сделки',
        timestamp: '2024-10-25T08:00:00Z',
      },
      {
        id:        'hist-0038-02',
        userId:    'usr-buyer-buyer002',
        userName:  'Дмитрий Ли (Sashiko Coffee Group)',
        userRole:  'BUYER',
        action:    'Подтверждён состав заказа',
        timestamp: '2024-11-05T10:20:00Z',
      },
      {
        id:        'hist-0038-03',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Сформирован договор, отправлен на подпись',
        timestamp: '2024-11-18T16:55:00Z',
      },
    ],
  },

  // ── Сделка 3: Оплачено ────────────────────────────────────────────────────
  {
    id:          'deal-2024-0031',
    buyer:       BUYERS[2],
    status:      'paid',
    totalAmount: 595_000,
    currency:    'RUB',
    isSigned:    true,
    contractRef: 'ДГ-2024/031',
    createdAt:   '2024-09-01T07:30:00Z',
    updatedAt:   '2024-10-12T13:10:00Z',
    items: [
      {
        id:          'di-0031-01',
        productId:   'prod-0005-cim-m200',
        productName: 'Cimbali M200 (2 гр. автомат)',
        sku:         'CIM-M200-2A',
        brandLogoUrl:'/assets/brands/cimbali.svg',
        basePrice:   395_000,
        discount:    12,
        finalPrice:  347_600,
        quantity:    1,
        currency:    'RUB',
      },
      {
        id:          'di-0031-02',
        productId:   'prod-0003-ns-aurelia-wave',
        productName: 'Nuova Simonelli Aurelia Wave T3',
        sku:         'NS-AWV-T3-2G',
        brandLogoUrl:'/assets/brands/nuova-simonelli.svg',
        basePrice:   420_000,
        discount:    20,
        finalPrice:  336_000,
        quantity:    1,
        currency:    'RUB',
      },
    ],
    history: [
      {
        id:        'hist-0031-01',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Создание сделки',
        timestamp: '2024-09-01T07:30:00Z',
      },
      {
        id:        'hist-0031-02',
        userId:    'usr-buyer-buyer003',
        userName:  'Регина Хасанова (Ufa Hospitality)',
        userRole:  'BUYER',
        action:    'Запрошена доп. скидка на Nuova Simonelli',
        field:     'Скидка на Nuova Simonelli Aurelia Wave T3',
        oldValue:  '15%',
        newValue:  '20%',
        timestamp: '2024-09-18T11:00:00Z',
      },
      {
        id:        'hist-0031-03',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Скидка согласована коммерческим директором',
        field:     'Скидка на Nuova Simonelli Aurelia Wave T3',
        oldValue:  '15%',
        newValue:  '20%',
        timestamp: '2024-09-20T09:00:00Z',
      },
      {
        id:        'hist-0031-04',
        userId:    'usr-buyer-buyer003',
        userName:  'Регина Хасанова (Ufa Hospitality)',
        userRole:  'BUYER',
        action:    'Договор подписан со стороны покупателя',
        timestamp: '2024-09-30T14:00:00Z',
      },
      {
        id:        'hist-0031-05',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Договор подписан и зарегистрирован',
        timestamp: '2024-10-02T10:30:00Z',
      },
      {
        id:        'hist-0031-06',
        userId:    'usr-system',
        userName:  'Система',
        userRole:  'ADMIN_EXPONENT',
        action:    'Оплата получена (100%). Сделка закрыта.',
        timestamp: '2024-10-12T13:10:00Z',
      },
    ],
  },

  // ── Сделка 4: Согласование (активная) ────────────────────────────────────
  {
    id:          'deal-2024-0044',
    buyer:       BUYERS[3],
    status:      'negotiation',
    totalAmount: 2_145_000,
    currency:    'RUB',
    isSigned:    false,
    contractRef: 'ДГ-2024/044',
    createdAt:   '2024-11-22T10:00:00Z',
    updatedAt:   '2024-11-22T10:00:00Z',
    items: [
      {
        id:          'di-0044-01',
        productId:   'prod-0004-va-black-eagle',
        productName: 'Victoria Arduino Black Eagle Mav.',
        sku:         'VA-BEA-MAV-2G',
        brandLogoUrl:'/assets/brands/victoria-arduino.svg',
        basePrice:   550_000,
        discount:    0,
        finalPrice:  550_000,
        quantity:    3,
        currency:    'RUB',
      },
      {
        id:          'di-0044-02',
        productId:   'prod-0008-dc-mina',
        productName: 'Dalla Corte Mina (полуавтомат)',
        sku:         'DC-MINA-SH-1G',
        brandLogoUrl:'/assets/brands/dalla-corte.svg',
        basePrice:   245_000,
        discount:    10,
        finalPrice:  220_500,
        quantity:    2,
        currency:    'RUB',
      },
    ],
    history: [
      {
        id:        'hist-0044-01',
        userId:    'usr-buyer-buyer004',
        userName:  'Евгений Волков (Grand Hotel Invest)',
        userRole:  'BUYER',
        action:    'Запрос коммерческого предложения',
        timestamp: '2024-11-22T10:00:00Z',
      },
    ],
  },

  // ── Сделка 5: Архив — Отменена ────────────────────────────────────────────
  {
    id:          'deal-2024-0019',
    buyer:       BUYERS[4],
    status:      'cancelled',
    totalAmount: 320_000,
    currency:    'RUB',
    isSigned:    false,
    contractRef: 'ДГ-2024/019',
    createdAt:   '2024-07-15T06:00:00Z',
    updatedAt:   '2024-08-01T12:00:00Z',
    items: [
      {
        id:          'di-0019-01',
        productId:   'prod-0002-ran-classe7',
        productName: 'Rancilio Classe 7 USB 2-гр.',
        sku:         'RAN-CL7-USB2',
        brandLogoUrl:'/assets/brands/rancilio.svg',
        basePrice:   320_000,
        discount:    0,
        finalPrice:  320_000,
        quantity:    1,
        currency:    'RUB',
      },
    ],
    history: [
      {
        id:        'hist-0019-01',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Создание сделки',
        timestamp: '2024-07-15T06:00:00Z',
      },
      {
        id:        'hist-0019-02',
        userId:    'usr-buyer-buyer005',
        userName:  'Aigerim Bekova (KazFood Trading)',
        userRole:  'BUYER',
        action:    'Покупатель отменил заявку (логистика)',
        timestamp: '2024-08-01T12:00:00Z',
      },
    ],
  },

  // ── Сделка 6: Архив — Оплачено ────────────────────────────────────────────
  {
    id:          'deal-2024-0022',
    buyer:       BUYERS[0],
    status:      'paid',
    totalAmount: 490_000,
    currency:    'RUB',
    isSigned:    true,
    contractRef: 'ДГ-2024/022',
    createdAt:   '2024-08-05T09:00:00Z',
    updatedAt:   '2024-09-15T10:30:00Z',
    items: [
      {
        id:          'di-0022-01',
        productId:   'prod-0006-jura-e8',
        productName: 'Jura E8 Piano Black (2026)',
        sku:         'JUR-E8-PB-26',
        brandLogoUrl:'/assets/brands/jura.svg',
        basePrice:   79_900,
        discount:    5,
        finalPrice:  75_905,
        quantity:    6,
        currency:    'RUB',
      },
    ],
    history: [
      {
        id:        'hist-0022-01',
        userId:    'usr-admin-01',
        userName:  'Алексей Громов (Экспонент)',
        userRole:  'ADMIN_EXPONENT',
        action:    'Создание сделки',
        timestamp: '2024-08-05T09:00:00Z',
      },
      {
        id:        'hist-0022-02',
        userId:    'usr-system',
        userName:  'Система',
        userRole:  'ADMIN_EXPONENT',
        action:    'Оплата получена (100%). Сделка закрыта.',
        timestamp: '2024-09-15T10:30:00Z',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Активные сделки — не отменены, не в архиве (отменена / оплачена в прошлом периоде) */
export const ACTIVE_DEALS: Deal[] = DEALS.filter(
  (d) => d.status === 'negotiation' || d.status === 'awaiting_signature',
);

/** Архивные сделки — завершённые или отменённые */
export const ARCHIVED_DEALS: Deal[] = DEALS.filter(
  (d) => d.status === 'paid' || d.status === 'cancelled',
);

/** Кол-во сделок в ожидании подписи */
export const AWAITING_SIGNATURE_COUNT: number = DEALS.filter(
  (d) => d.status === 'awaiting_signature',
).length;

/** Кол-во завершённых сделок */
export const COMPLETED_COUNT: number = DEALS.filter((d) => d.status === 'paid').length;
