/**
 * productsData.ts — Каталог товаров HoReCa Marketplace
 * ──────────────────────────────────────────────────────
 * Статические mock-данные для разработки.
 *
 * TODO: Заменить на Supabase-запрос с RLS:
 *   supabase.from('products')
 *     .select('*')
 *     .eq('exhibitor_id', session.user.id)   ← RLS ensures multi-tenant isolation
 *
 * Схема БД (target):
 *   products (
 *     id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name         text NOT NULL,
 *     brand        text NOT NULL,
 *     brand_logo   text,
 *     category     product_category NOT NULL,
 *     sub_category product_sub_category,
 *     price        numeric(12,2) NOT NULL,
 *     currency     char(3) NOT NULL DEFAULT 'RUB',
 *     sku          text,
 *     in_stock     bool NOT NULL DEFAULT true,
 *     is_new       bool NOT NULL DEFAULT false,
 *     is_bulk      bool NOT NULL DEFAULT false,
 *     weight_kg    numeric(8,2),
 *     unit         text NOT NULL DEFAULT 'шт',
 *     exhibitor_id uuid REFERENCES exhibitors(id) ON DELETE CASCADE,
 *     created_at   timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS: exhibitor sees only own products; buyer sees all in_stock
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

export type ProductCategory =
  | 'coffee-machine'
  | 'grinder'
  | 'accessory'
  | 'combi-oven'
  | 'dishwasher'
  | 'cooking-suite'
  | 'coffee-beans'
  | 'tea'
  | 'cacao';

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  'coffee-machine': 'Кофемашины',
  'grinder':        'Кофемолки',
  'accessory':      'Аксессуары',
  'combi-oven':     'Пароконвектоматы',
  'dishwasher':     'Моечное',
  'cooking-suite':  'Тепловое',
  'coffee-beans':   'Кофе',
  'tea':            'Чай',
  'cacao':          'Какао',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — SUB-CATEGORY (утвержденный список)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Утвержденный список подкатегорий — slug-ключи в snake-case.
 * Используются для фильтрации в Sidebar и поля БД `sub_category`.
 */
export type ProductSubCategory =
  | 'кофе-жареный'
  | 'кофе-зеленый'
  | 'чай-листовой'
  | 'чай-пакетированный'
  | 'чай-балковый'
  | 'какао-шоколад'
  | 'машины-традиционные'
  | 'машины-авто'
  | 'кофемолки'
  | 'аксессуары'
  | 'запчасти';

/** Человекочитаемые метки для подкатегорий (sidebar labels, tags) */
export const SUBCATEGORY_LABELS: Record<ProductSubCategory, string> = {
  'кофе-жареный':       'Жареный',
  'кофе-зеленый':       'Зеленый',
  'чай-листовой':       'Листовой',
  'чай-пакетированный': 'Пакетированный',
  'чай-балковый':       'Балковый',
  'какао-шоколад':      'Какао / Шоколад',
  'машины-традиционные':'Традиционные',
  'машины-авто':        'Автоматические',
  'кофемолки':          'Кофемолки',
  'аксессуары':         'Аксессуары',
  'запчасти':           'Запчасти',
};

/**
 * Маппинг родительской категории → список доступных подкатегорий.
 * Используется в modal-форме для зависимых дропдаунов (Category → SubCategory).
 * Категории без подкатегорий отсутствуют в этом маппинге.
 *
 * Структура категорий:
 *   Кофе      → Жареный / Зеленый
 *   Чай       → Листовой / Пакетированный / Балковый
 *   Какао     → Какао / Шоколад
 *   Оборудование → Машины (Традиционные / Авто) / Кофемолки
 */
export const CATEGORY_TO_SUBCATEGORIES: Partial<Record<ProductCategory, ProductSubCategory[]>> = {
  'coffee-machine': ['машины-традиционные', 'машины-авто'],
  'grinder':        ['кофемолки'],
  'accessory':      ['аксессуары', 'запчасти'],
  'coffee-beans':   ['кофе-жареный', 'кофе-зеленый'],
  'tea':            ['чай-листовой', 'чай-пакетированный', 'чай-балковый'],
  'cacao':          ['какао-шоколад'],
};

/**
 * Поисковые алиасы для каждой подкатегории.
 * Позволяет находить товары по синонимам, не входящим в название модели.
 *
 * Пример: запрос "автоматическая" → hits sub-category 'машины-авто'
 */
export const SUBCATEGORY_SEARCH_ALIASES: Record<ProductSubCategory, string[]> = {
  'машины-традиционные': ['традиционная', 'рожковая', 'полуавтомат', 'espresso', 'профессиональная', 'commercial'],
  'машины-авто':         ['автоматическая', 'автомат', 'суперавтомат', 'superauto', 'superautomatica', 'авто'],
  'кофемолки':           ['молотый', 'помол', 'grinder', 'жернова', 'grinding'],
  'аксессуары':          ['аксессуар', 'accessory', 'весы', 'scale', 'портативная'],
  'запчасти':            ['запчасть', 'деталь', 'part', 'ремонт', 'spare'],
  'кофе-жареный':        ['жареный', 'обжарка', 'roasted', 'roast', 'купаж', 'blend', 'эспрессо'],
  'кофе-зеленый':        ['зеленый', 'green', 'необжаренный', 'сырой', 'raw', 'unroasted', 'сырье', 'сырьё', 'балк', 'сырьевой'],
  'чай-листовой':        ['листовой', 'leaf', 'рассыпной', 'loose'],
  'чай-пакетированный':  ['пакетированный', 'пакетик', 'teabag', 'sachet'],
  'чай-балковый':        ['балковый', 'bulk', 'насыпной', 'в пакетах', 'опт', 'сырье', 'сырьё', 'балк', 'сырьевой'],
  'какао-шоколад':       ['какао', 'шоколад', 'cocoa', 'chocolate', 'горячий шоколад', 'cacao', 'сырье', 'балк'],
};

/**
 * Ключевые слова, сигнализирующие о поиске оптовых / сырьевых товаров.
 *
 * При обнаружении любого из этих токенов в поисковом запросе
 * результаты автоматически ограничиваются позициями `computeIsBulk() === true`.
 *
 * ПРИМЕРЫ триггеров:
 *   «сырье»      → все bulk-товары
 *   «чай балк»   → только балковый чай (isBulk + subCategory:tea)
 *   «bulk»       → все bulk-товары
 *
 * @see computeIsBulk
 * @see ProductCard — бейдж «ОПТ / СЫРЬЁ» подсвечивается на всех результатах
 */
export const BULK_SEARCH_KEYWORDS: readonly string[] = [
  'сырье', 'сырьё', 'балк', 'bulk', 'сырьевой', 'сырьевые', 'raw material',
];

// ═══════════════════════════════════════════════════════════════════════════════
// BULK / RAW MATERIAL — ЕДИНИЦЫ ИЗМЕРЕНИЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Допустимые единицы измерения.
 * Bulk-товары по умолчанию используют кг/мешок/тонна вместо шт/упаковка.
 */
export type ProductUnit = 'шт' | 'упаковка' | 'кг' | 'мешок' | 'тонна';

/** Единицы по умолчанию для bulk-товаров в зависимости от подкатегории */
export const BULK_DEFAULT_UNITS: Partial<Record<ProductSubCategory, ProductUnit>> = {
  'кофе-зеленый':  'мешок',
  'чай-балковый':  'кг',
  'какао-шоколад': 'кг',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface Product {
  /** UUID товара (соответствует products.id в Supabase) */
  id: string;
  name: string;
  /** Название бренда — используется для фильтрации */
  brand: string;
  /** Путь к SVG-логотипу бренда в /public/assets/brands/ */
  brandLogoUrl?: string;
  category: ProductCategory;
  /**
   * Подкатегория из утвержденного списка ProductSubCategory.
   * Опциональна для категорий без подкатегорий (комби-печи, моечное, тепловое).
   */
  subCategory?: ProductSubCategory;
  /** Цена в рублях */
  price: number;
  currency: 'RUB';
  /** Фото товара (null — используется логотип бренда) */
  imageUrl?: string;
  sku: string;
  inStock: boolean;
  isNew?: boolean;
  /**
   * Флаг оптовой / сырьевой позиции.
   * Устанавливается вручную или вычисляется через computeIsBulk():
   *   - subCategory === 'кофе-зеленый'
   *   - subCategory === 'чай-балковый'
   *   - category === 'cacao' && weightKg > 5
   */
  isBulk?: boolean;
  /**
   * Вес единицы товара в кг.
   * Используется для автоматического определения isBulk в категории «Какао»
   * (порог: weightKg > 5).
   */
  weightKg?: number;
  /**
   * Единица измерения для данного товара.
   * Bulk-товары: 'кг' | 'мешок' | 'тонна'.
   * Обычные товары: 'шт' | 'упаковка'.
   */
  unit?: ProductUnit;
  /** UUID экспонента-владельца */
  exhibitorId: string;
  description?: string;
  /**
   * Поисковые теги / ключевые слова.
   * Используются в FTS-поиске для синонимов, не входящих в name/description.
   * Особенно важны для bulk-товаров: 'зеленое зерно', 'мешковой какао'.
   *
   * @example ['зеленое зерно', 'green bean', 'сырье', 'балк']
   */
  keywords?: string[];
  /**
   * Статус жизненного цикла товара.
   * 'active'   — (по умолчанию) отображается в сетке «Мои товары».
   * 'archived' — скрыт из сетки, сохраняется в БД.
   *
   * TODO: Supabase: .update({ status: 'archived' }).eq('id', product.id)
   */
  status?: 'active' | 'archived';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK DETECTION UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Вычисляет флаг isBulk на основе свойств товара.
 * Используется при создании/редактировании товара и в качестве fallback
 * для старых записей без явного isBulk.
 *
 * Правила (приоритет по порядку):
 *  1. Явный флаг isBulk === true → bulk
 *  2. subCategory === 'кофе-зеленый' → bulk (сырьё)
 *  3. subCategory === 'чай-балковый' → bulk (оптовая фасовка)
 *  4. category === 'cacao' && weightKg > 5 → bulk (промышленная фасовка)
 */
export function computeIsBulk(
  product: Pick<Product, 'isBulk' | 'subCategory' | 'category' | 'weightKg'>,
): boolean {
  if (product.isBulk === true) return true;
  if (product.subCategory === 'кофе-зеленый') return true;
  if (product.subCategory === 'чай-балковый') return true;
  if (product.category === 'cacao' && (product.weightKg ?? 0) > 5) return true;
  return false;
}

/**
 * Возвращает единицу измерения по умолчанию для товара.
 * Bulk-товары получают специализированную единицу вместо 'шт'.
 */
export function getDefaultUnit(product: Pick<Product, 'unit' | 'subCategory' | 'isBulk'>): ProductUnit {
  if (product.unit) return product.unit;
  if (product.subCategory && BULK_DEFAULT_UNITS[product.subCategory]) {
    return BULK_DEFAULT_UNITS[product.subCategory]!;
  }
  if (product.isBulk) return 'кг';
  return 'шт';
}

// ═══════════════════════════════════════════════════════════════════════════════
// КАТАЛОГ ТОВАРОВ
// ═══════════════════════════════════════════════════════════════════════════════

export const PRODUCTS: Product[] = [
  // ── Кофемашины — Традиционные ───────────────────────────────────────────────
  {
    id:           'prod-0001-lm-linea-pb',
    name:         'La Marzocco Linea PB (1 гр.)',
    brand:        'La Marzocco',
    brandLogoUrl: '/assets/brands/la-marzocco.svg',
    category:     'coffee-machine',
    subCategory:  'машины-традиционные',
    price:        485000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'LM-LINPB-AV1',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description:  'Профессиональная рожковая машина с двойным бойлером PID',
  },
  {
    id:           'prod-0002-ran-classe7',
    name:         'Rancilio Classe 7 USB 2-гр.',
    brand:        'Rancilio',
    brandLogoUrl: '/assets/brands/rancilio.svg',
    category:     'coffee-machine',
    subCategory:  'машины-традиционные',
    price:        320000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'RAN-CL7-USB2',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description:  'Коммерческая эспрессо-машина с USB управлением дозатором',
  },
  {
    id:           'prod-0003-ns-aurelia-wave',
    name:         'Nuova Simonelli Aurelia Wave T3',
    brand:        'Nuova Simonelli',
    brandLogoUrl: '/assets/brands/nuova-simonelli.svg',
    category:     'coffee-machine',
    subCategory:  'машины-традиционные',
    price:        420000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'NS-AWV-T3-2G',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'd4e5f6a7-b8c9-0123-defa-bc4567890123',
    description:  'Температурный контроль T3, автоматическая молочная система',
  },
  {
    id:           'prod-0004-va-black-eagle',
    name:         'Victoria Arduino Black Eagle Mav.',
    brand:        'Victoria Arduino',
    brandLogoUrl: '/assets/brands/victoria-arduino.svg',
    category:     'coffee-machine',
    subCategory:  'машины-традиционные',
    price:        550000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'VA-BEA-MAV-2G',
    inStock:      false,
    isNew:        false,
    exhibitorId:  'b8c9d0e1-f2a3-4567-bcde-fa8901234567',
    description:  'Флагманская модель для чемпионатов World Barista Championship',
  },
  {
    id:           'prod-0008-dc-mina',
    name:         'Dalla Corte Mina (полуавтомат)',
    brand:        'Dalla Corte',
    brandLogoUrl: '/assets/brands/dalla-corte.svg',
    category:     'coffee-machine',
    subCategory:  'машины-традиционные',
    price:        245000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'DC-MINA-SH-1G',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'c3d4e5f6-a7b8-9012-cdef-ab3456789012',
    description:  'Мультибойлерная система, эксклюзивный итальянский дизайн',
  },

  // ── Кофемашины — Автоматические ─────────────────────────────────────────────
  {
    id:           'prod-0005-cim-m200',
    name:         'Cimbali M200 (2 гр. автомат)',
    brand:        'Cimbali',
    brandLogoUrl: '/assets/brands/cimbali.svg',
    category:     'coffee-machine',
    subCategory:  'машины-авто',
    price:        395000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'CIM-M200-2A',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    description:  'Автоматическая 2-группная машина с молочной системой TurboSteam',
  },
  {
    id:           'prod-0006-jura-e8',
    name:         'Jura E8 Piano Black (2026)',
    brand:        'Jura',
    brandLogoUrl: '/assets/brands/jura.svg',
    category:     'coffee-machine',
    subCategory:  'машины-авто',
    price:        79900,
    currency:     'RUB',
    unit:         'шт',
    sku:          'JUR-E8-PB-26',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'a7b8c9d0-e1f2-3456-abcd-ef7890123456',
    description:  'Суперавтоматическая машина, 17 напитков, технология P.E.P.',
  },
  {
    id:           'prod-0007-saeco-picobar',
    name:         'Saeco PicoBaristo Deluxe',
    brand:        'Saeco',
    brandLogoUrl: '/assets/brands/saeco.svg',
    category:     'coffee-machine',
    subCategory:  'машины-авто',
    price:        52000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'SAE-PBD-SM7684',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'a7b8c9d0-e1f2-3456-abcd-ef7890123456',
    description:  'Компактная суперавтоматическая машина, 8 напитков',
  },

  // ── Кофемолки ──────────────────────────────────────────────────────────────
  {
    id:           'prod-0009-anf-super-caimano',
    name:         'Anfim Super Caimano On-Demand',
    brand:        'Anfim',
    brandLogoUrl: '/assets/brands/anfim.svg',
    category:     'grinder',
    subCategory:  'кофемолки',
    price:        68000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'ANF-SCA-OD-75',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description:  'Профессиональная кофемолка on-demand, 75мм плоские жернова',
  },
  {
    id:           'prod-0010-mahl-ek43s',
    name:         'Mahlkoenig EK43 S',
    brand:        'Mahlkoenig',
    brandLogoUrl: '/assets/brands/mahlkoenig.svg',
    category:     'grinder',
    subCategory:  'кофемолки',
    price:        112000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'MK-EK43S-98',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'b8c9d0e1-f2a3-4567-bcde-fa8901234567',
    description:  'Эталонная фильтр-кофемолка, 98мм плоские жернова, 1400г/мин',
  },
  {
    id:           'prod-0011-bar-encore-esp',
    name:         'Baratza Encore ESP',
    brand:        'Baratza',
    brandLogoUrl: '/assets/brands/baratza.svg',
    category:     'grinder',
    subCategory:  'кофемолки',
    price:        18500,
    currency:     'RUB',
    unit:         'шт',
    sku:          'BAR-ENCORE-E',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'f6a7b8c9-d0e1-2345-fabc-de6789012345',
    description:  'Точная регулировка помола для эспрессо, конические жернова 40мм',
  },
  {
    id:           'prod-0024-anf-caimano-titan',
    name:         'Anfim Caimano OD Titan',
    brand:        'Anfim',
    brandLogoUrl: '/assets/brands/anfim.svg',
    category:     'grinder',
    subCategory:  'кофемолки',
    price:        84000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'ANF-CAM-TIT-83',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'c3d4e5f6-a7b8-9012-cdef-ab3456789012',
    description:  'Бесшумная серия Titan, 83мм жернова, таймерный режим',
  },

  // ── Аксессуары ─────────────────────────────────────────────────────────────
  {
    id:           'prod-0012-acaia-pearl',
    name:         'Acaia Pearl 2021 Coffee Scale',
    brand:        'Acaia',
    brandLogoUrl: '/assets/brands/acaia.svg',
    category:     'accessory',
    subCategory:  'аксессуары',
    price:        15900,
    currency:     'RUB',
    unit:         'шт',
    sku:          'ACA-PEARL-21-W',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'f6a7b8c9-d0e1-2345-fabc-de6789012345',
    description:  'Умные весы с Bluetooth, встроенным таймером и Acaia App',
  },
  {
    id:           'prod-0013-aeropress-orig',
    name:         'AeroPress Original',
    brand:        'AeroPress',
    brandLogoUrl: '/assets/brands/aeropress.svg',
    category:     'accessory',
    subCategory:  'аксессуары',
    price:        3200,
    currency:     'RUB',
    unit:         'шт',
    sku:          'AER-ORIG-350ML',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'f6a7b8c9-d0e1-2345-fabc-de6789012345',
    description:  'Портативная система заваривания, 350 фильтров в комплекте',
  },

  // ── Пароконвектоматы ───────────────────────────────────────────────────────
  {
    id:           'prod-0014-rat-scc-we61',
    name:         'Rational iCombi Pro 6×1/1 GN',
    brand:        'Rational',
    brandLogoUrl: '/assets/brands/rational.svg',
    category:     'combi-oven',
    price:        1250000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'RAT-ICP-61-E',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'c9d0e1f2-a3b4-5678-cdef-ab9012345678',
    description:  'iCombi Pro 6×1/1, WiFi, автоматика iCooking Suite, HiDensityControl',
  },
  {
    id:           'prod-0015-alto-combitherm',
    name:         'Alto-Shaam Combitherm CTP6-10E',
    brand:        'Alto-Shaam',
    brandLogoUrl: '/assets/brands/alto-shaam.svg',
    category:     'combi-oven',
    price:        820000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'AS-CTP6-10E',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'd0e1f2a3-b4c5-6789-defa-bc0123456789',
    description:  'Комби-режим + режим Proofing, 6 полок 1/1 GN, дельта-температура',
  },
  {
    id:           'prod-0016-unox-speed-x',
    name:         'Unox SPEED-X XAVC (4×1/1 GN)',
    brand:        'Unox',
    brandLogoUrl: '/assets/brands/unox.svg',
    category:     'combi-oven',
    price:        380000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'UNX-XAVC-04',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'd0e1f2a3-b4c5-6789-defa-bc0123456789',
    description:  'Высокоскоростной пароконвектомат — приготовление в 8× быстрее',
  },
  {
    id:           'prod-0017-conv-mini-et',
    name:         'Convotherm mini easyTouch 6.06',
    brand:        'Convotherm',
    brandLogoUrl: '/assets/brands/convotherm.svg',
    category:     'combi-oven',
    price:        290000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'CNV-MINI-ET606',
    inStock:      false,
    isNew:        false,
    exhibitorId:  'c9d0e1f2-a3b4-5678-cdef-ab9012345678',
    description:  'Компактный пароконвектомат, сенсорный дисплей, 6 уровней',
  },

  // ── Моечное и тепловое оборудование ───────────────────────────────────────
  {
    id:           'prod-0018-meiko-miq',
    name:         'Meiko M-iQ Hood-Type Dishwasher',
    brand:        'Meiko',
    brandLogoUrl: '/assets/brands/meiko.svg',
    category:     'dishwasher',
    price:        680000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'MEI-MIQ-H60',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'c9d0e1f2-a3b4-5678-cdef-ab9012345678',
    description:  'Купольная посудомоечная машина с рекуперацией тепла EcoPassion',
  },
  {
    id:           'prod-0019-elx-thermaline',
    name:         'Electrolux Thermaline S2000',
    brand:        'Electrolux',
    brandLogoUrl: '/assets/brands/electrolux.svg',
    category:     'cooking-suite',
    price:        950000,
    currency:     'RUB',
    unit:         'шт',
    sku:          'ELX-TML-S2000',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'c9d0e1f2-a3b4-5678-cdef-ab9012345678',
    description:  'Модульный готовочный блок Thermaline, индукция + газ, IP44',
  },

  // ── Кофе — Жареный ────────────────────────────────────────────────────────
  {
    id:           'prod-0020-montana-ethiopia',
    name:         'Montana Coffee Ethiopia Yirgacheffe',
    brand:        'Montana Coffee',
    brandLogoUrl: '/assets/brands/montana-coffee.svg',
    category:     'coffee-beans',
    subCategory:  'кофе-жареный',
    price:        2800,
    currency:     'RUB',
    unit:         'кг',
    weightKg:     1,
    sku:          'MC-ETH-YRG-1KG',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    description:  'Натуральная обработка, профиль: жасмин, персик, чёрный чай',
  },
  {
    id:           'prod-0021-jm-espresso-classico',
    name:         'Julius Meinl Espresso Classico 1кг',
    brand:        'Julius Meinl',
    brandLogoUrl: '/assets/brands/julius-meinl.svg',
    category:     'coffee-beans',
    subCategory:  'кофе-жареный',
    price:        1450,
    currency:     'RUB',
    unit:         'кг',
    weightKg:     1,
    sku:          'JM-EC-1KG-GR',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    description:  'Классический венский купаж для эспрессо, средняя обжарка',
  },
  {
    id:           'prod-0022-tasty-kenya-ab',
    name:         'Tasty Coffee Kenya AB Washed',
    brand:        'Tasty Coffee',
    brandLogoUrl: '/assets/brands/tasty-coffee.svg',
    category:     'coffee-beans',
    subCategory:  'кофе-жареный',
    price:        3100,
    currency:     'RUB',
    unit:         'кг',
    weightKg:     1,
    sku:          'TC-KEN-AB-1KG',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    description:  'Мытая обработка, профиль: яблоко, смородина, цитрус',
  },
  {
    id:           'prod-0023-wbc-competition-blend',
    name:         'WBC Competition Espresso Blend',
    brand:        'WBC',
    brandLogoUrl: '/assets/brands/wbc.svg',
    category:     'coffee-beans',
    subCategory:  'кофе-жареный',
    price:        2650,
    currency:     'RUB',
    unit:         'кг',
    weightKg:     1,
    sku:          'WBC-COMP-BL-1K',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'd4e5f6a7-b8c9-0123-defa-bc4567890123',
    description:  'Соревновательный купаж, профиль победителей World Barista Championship',
  },

  // ── ЧАЙ — Листовой ─────────────────────────────────────────────────────────
  // Категория переименована: beverages → tea
  {
    id:           'prod-0025-newby-english-breakfast',
    name:         'Newby English Breakfast Листовой 100г',
    brand:        'Newby',
    category:     'tea',
    subCategory:  'чай-листовой',
    price:        1850,
    currency:     'RUB',
    unit:         'упаковка',
    weightKg:     0.1,
    sku:          'NBY-EB-LEAF-100G',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    description:  'Высокогорный цейлонский чай крупного листа, насыщенный настой, HoReCa-упаковка',
  },

  // ── ЧАЙ — Пакетированный ───────────────────────────────────────────────────
  {
    id:           'prod-0026-dilmah-teabag-box',
    name:         'Dilmah Premium Ceylon Tea 100 пак.',
    brand:        'Dilmah',
    category:     'tea',
    subCategory:  'чай-пакетированный',
    price:        890,
    currency:     'RUB',
    unit:         'упаковка',
    sku:          'DLM-PREM-TB-100',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    description:  'Одиночные пакетики без нитки, конверт без клея, HoReCa-коробка 100 шт.',
  },

  // ── ЧАЙ — Балковый (ОПТ / СЫРЬЁ) ─────────────────────────────────────────
  // isBulk: true — автоматически через computeIsBulk() (subCategory === 'чай-балковый')
  {
    id:           'prod-0027-ahmad-earl-grey-bulk',
    name:         'Ahmad Tea Earl Grey Балк 1кг',
    brand:        'Ahmad Tea',
    category:     'tea',
    subCategory:  'чай-балковый',
    price:        2100,
    currency:     'RUB',
    isBulk:       true,
    unit:         'кг',
    weightKg:     1,
    sku:          'AHM-EG-BULK-1KG',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    description:  'Чай Эрл Грей с бергамотом, рассыпной, гастрономическая упаковка 1 кг. Балковая поставка для HoReCa.',
    keywords:     ['балковый чай', 'чай балк', 'earl grey bulk', 'сырье', 'балк', 'bulk tea', 'оптовый чай'],
  },

  // ── КАКАО ──────────────────────────────────────────────────────────────────
  // Категория переименована: beverages → cacao
  // weightKg: 1 — не превышает порог >5кг, isBulk: false
  {
    id:           'prod-0028-callebaut-hot-choc',
    name:         'Barry Callebaut горячий шоколад 823 1кг',
    brand:        'Barry Callebaut',
    category:     'cacao',
    subCategory:  'какао-шоколад',
    price:        3400,
    currency:     'RUB',
    isBulk:       false,
    unit:         'кг',
    weightKg:     1,
    sku:          'BC-HC-823-1KG',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    description:  'Премиальный горячий шоколад на какао-порошке Barry 823, 1 кг, HoReCa',
  },

  // ── КОФЕ — Зелёное зерно (ОПТ / СЫРЬЁ) ───────────────────────────────────
  // isBulk: true — через computeIsBulk() (subCategory === 'кофе-зеленый')
  {
    id:           'prod-0029-green-coffee-bulk',
    name:         'Зелёное Зерно Ethiopia Natural 60кг Мешок',
    brand:        'Montana Coffee',
    brandLogoUrl: '/assets/brands/montana-coffee.svg',
    category:     'coffee-beans',
    subCategory:  'кофе-зеленый',
    price:        45000,
    currency:     'RUB',
    isBulk:       true,
    unit:         'мешок',
    weightKg:     60,
    sku:          'MC-ETH-GRN-60KG',
    inStock:      true,
    isNew:        true,
    exhibitorId:  'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    description:  'Зелёное необжаренное зерно Ethiopia Yirgacheffe, натуральная обработка, джутовый мешок 60кг. Сырьё для обжарщиков и HoReCa-кухни.',
    keywords:     ['зеленое зерно', 'зелёное зерно', 'green bean', 'green coffee', 'сырье', 'сырьё', 'балк', 'bulk', 'необжаренный', 'raw coffee', 'мешок зерно'],
  },

  // ── КАКАО — Мешковая поставка (ОПТ / СЫРЬЁ) ──────────────────────────────
  // isBulk: true — через computeIsBulk() (category=cacao && weightKg=25 > 5)
  {
    id:           'prod-0030-callebaut-cocoa-bulk',
    name:         'Barry Callebaut Какао-порошок 820 мешок 25кг',
    brand:        'Barry Callebaut',
    category:     'cacao',
    subCategory:  'какао-шоколад',
    price:        58500,
    currency:     'RUB',
    isBulk:       true,
    unit:         'мешок',
    weightKg:     25,
    sku:          'BC-820-BULK-25KG',
    inStock:      true,
    isNew:        false,
    exhibitorId:  'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    description:  'Промышленный какао-порошок Barry Callebaut 820, мешок 25кг. Сырьевая поставка для кондитерских цехов и HoReCa-производства.',
    keywords:     ['мешковой какао', 'какао сырье', 'cacаo bulk', 'балк', 'bulk', 'сырье', 'сырьё', 'промышленный', 'cacao bag', 'мешок какао'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Уникальные бренды из каталога, отсортированные A→Z.
 * Используются в фильтрах сайдбаров (AdminSidebar, DiscoveryClient).
 */
export const UNIQUE_PRODUCT_BRANDS: string[] = Array.from(
  new Set(PRODUCTS.map((p) => p.brand)),
).sort();

/**
 * Форматирует числовую цену в строку вида «₽ 485 000».
 * Использует Intl.NumberFormat для локализованного разделителя тысяч.
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style:                 'currency',
    currency:              'RUB',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Цвет акцента для категории товара.
 * Используется в ProductCard для фона верхней зоны и бейджа.
 */
export function getCategoryAccentColor(category: ProductCategory): string {
  const map: Record<ProductCategory, string> = {
    'coffee-machine': '#0B2B5E',
    'grinder':        '#7c3aed',
    'accessory':      '#0891b2',
    'combi-oven':     '#b45309',
    'dishwasher':     '#059669',
    'cooking-suite':  '#dc2626',
    'coffee-beans':   '#92400e',
    'tea':            '#0f766e',
    'cacao':          '#7c2d12',
  };
  return map[category] ?? '#0B2B5E';
}

/**
 * Проверяет, совпадает ли поисковый запрос с подкатегорией через алиасы.
 * Используется для расширенного поиска: "автоматическая" → 'машины-авто'.
 */
export function matchesSubCategoryAlias(
  subCategory: ProductSubCategory | undefined,
  query: string,
): boolean {
  if (!subCategory || !query) return false;
  const aliases = SUBCATEGORY_SEARCH_ALIASES[subCategory] ?? [];
  return aliases.some((alias) => alias.includes(query) || query.includes(alias));
}
