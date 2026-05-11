/**
 * brandsData.ts — Каталог брендов HoReCa с алиасами для кросс-язычного поиска
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Структура aliases[]:
 *   - Русская транскрипция (основная и альтернативные варианты произношения)
 *   - Фонетические искажения (мацер / мазер / маззер → Mazzer)
 *   - Разговорные сокращения (машина ла марзокко → la marzocco)
 *
 * TODO: Перенести в Supabase:
 *   brands (
 *     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name       text NOT NULL,
 *     slug       text NOT NULL UNIQUE,
 *     logo_url   text,
 *     aliases    text[] NOT NULL DEFAULT '{}',
 *     categories text[] NOT NULL DEFAULT '{}',
 *     description text,
 *     country    text
 *   )
 *   -- RLS: public SELECT, admin-only INSERT/UPDATE/DELETE
 */

import type { BrandRecord } from '@/types/search';

// ═══════════════════════════════════════════════════════════════════════════════
// КАТАЛОГ БРЕНДОВ
// ═══════════════════════════════════════════════════════════════════════════════

export const BRANDS: BrandRecord[] = [
  // ── Кофемашины и эспрессо-оборудование ────────────────────────────────────

  {
    id: 'brand-rancilio',
    name: 'Rancilio',
    slug: 'rancilio',
    logoUrl: '/assets/brands/rancilio.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Профессиональные эспрессо-машины',
    aliases: [
      // Русские транскрипции — основная и фонетические варианты
      'ранчилио',
      'рансилио',
      'ранкилио',
      'ранчелио',
      'ранциллио',
      // Латинские фонетические варианты
      'ranchilio',
      'ransilio',
      'rancillio',
    ],
  },

  {
    id: 'brand-la-marzocco',
    name: 'La Marzocco',
    slug: 'la-marzocco',
    logoUrl: '/assets/brands/la-marzocco.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Флагманские эспрессо-машины',
    aliases: [
      'ла марзокко',
      'ла-марзокко',
      'мarзокко',
      'ламарзокко',
      'la marzoco',
      'lamarzocco',
      'marzocco',
      'марзокко',
    ],
  },

  {
    id: 'brand-mazzer',
    name: 'Mazzer',
    slug: 'mazzer',
    // нет SVG — будет инициальная заглушка
    categories: ['grinder'],
    country: 'Италия',
    description: 'Профессиональные кофемолки',
    aliases: [
      // Фонетические искажения — ключевые QA-кейсы
      'мацер',
      'мазер',
      'маззер',
      'маззер',
      'мацер',
      'mazер',
      'mazer',
      'mazzер',
      'maser',
    ],
  },

  {
    id: 'brand-nuova-simonelli',
    name: 'Nuova Simonelli',
    slug: 'nuova-simonelli',
    logoUrl: '/assets/brands/nuova-simonelli.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Коммерческое кофейное оборудование',
    aliases: [
      'нуова симонелли',
      'симонелли',
      'simonelli',
      'nuova simoneli',
      'симонели',
      'нуова симонели',
      'nuovasimonelli',
    ],
  },

  {
    id: 'brand-dalla-corte',
    name: 'Dalla Corte',
    slug: 'dalla-corte',
    logoUrl: '/assets/brands/dalla-corte.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Инновационные эспрессо-машины',
    aliases: [
      'далла корте',
      'далла-корте',
      'дала корте',
      'dalla corte',
      'dallacorte',
      'corte',
    ],
  },

  {
    id: 'brand-victoria-arduino',
    name: 'Victoria Arduino',
    slug: 'victoria-arduino',
    logoUrl: '/assets/brands/victoria-arduino.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Дизайнерские эспрессо-машины',
    aliases: [
      'виктория ардуино',
      'виктория-ардуино',
      'victoria ardvino',
      'arduino',
      'ардуино',
    ],
  },

  {
    id: 'brand-cimbali',
    name: 'Cimbali',
    slug: 'cimbali',
    logoUrl: '/assets/brands/cimbali.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Коммерческие кофемашины La Cimbali',
    aliases: [
      'чимбали',
      'симбали',
      'чимбали',
      'la cimbali',
      'ла чимбали',
      'cimbaly',
      'симбалы',
    ],
  },

  {
    id: 'brand-jura',
    name: 'Jura',
    slug: 'jura',
    logoUrl: '/assets/brands/jura.svg',
    categories: ['coffee-machine'],
    country: 'Швейцария',
    description: 'Премиальные автоматические кофемашины',
    aliases: [
      'юра',
      'жюра',
      'yura',
      'жура',
    ],
  },

  {
    id: 'brand-saeco',
    name: 'Saeco',
    slug: 'saeco',
    logoUrl: '/assets/brands/saeco.svg',
    categories: ['coffee-machine'],
    country: 'Италия',
    description: 'Автоматические кофемашины',
    aliases: [
      'саеко',
      'сайко',
      'секо',
      'saeco',
      'sajko',
      'саэко',
    ],
  },

  // ── Кофемолки ──────────────────────────────────────────────────────────────

  {
    id: 'brand-mahlkoenig',
    name: 'Mahlkönig',
    slug: 'mahlkoenig',
    logoUrl: '/assets/brands/mahlkoenig.svg',
    categories: ['grinder'],
    country: 'Германия',
    description: 'Профессиональные кофемолки',
    aliases: [
      'малькениг',
      'малькоениг',
      'малькёниг',
      'мальконинг',
      'mahlkonig',
      'mahlkoenig',
      'malkonig',
      'малкениг',
    ],
  },

  {
    id: 'brand-anfim',
    name: 'Anfim',
    slug: 'anfim',
    logoUrl: '/assets/brands/anfim.svg',
    categories: ['grinder'],
    country: 'Италия',
    description: 'Профессиональные кофемолки',
    aliases: [
      'анфим',
      'анфим',
      'анфхим',
      'anfim',
    ],
  },

  {
    id: 'brand-baratza',
    name: 'Baratza',
    slug: 'baratza',
    logoUrl: '/assets/brands/baratza.svg',
    categories: ['grinder'],
    country: 'США',
    description: 'Кофемолки для специалистов',
    aliases: [
      'баратза',
      'баратса',
      'baratsa',
      'baratza',
      'баратза',
    ],
  },

  // ── Аксессуары ─────────────────────────────────────────────────────────────

  {
    id: 'brand-acaia',
    name: 'Acaia',
    slug: 'acaia',
    logoUrl: '/assets/brands/acaia.svg',
    categories: ['accessory'],
    country: 'Тайвань',
    description: 'Умные весы для бариста',
    aliases: [
      'акайя',
      'акаия',
      'акая',
      'acaya',
      'akaia',
      'акаиа',
    ],
  },

  {
    id: 'brand-aeropress',
    name: 'AeroPress',
    slug: 'aeropress',
    logoUrl: '/assets/brands/aeropress.svg',
    categories: ['accessory'],
    country: 'США',
    description: 'Аэропресс для заваривания кофе',
    aliases: [
      'aeropresse',
      'аэропресс',
      'аэро пресс',
      'аэро-пресс',
      'aero press',
    ],
  },

  // ── Пароконвектоматы ────────────────────────────────────────────────────────

  {
    id: 'brand-rational',
    name: 'Rational',
    slug: 'rational',
    logoUrl: '/assets/brands/rational.svg',
    categories: ['combi-oven'],
    country: 'Германия',
    description: 'Профессиональные пароконвектоматы',
    aliases: [
      'рационал',
      'рэшнл',
      'рещнл',
      'рациональ',
      'rational',
    ],
  },

  {
    id: 'brand-convotherm',
    name: 'Convotherm',
    slug: 'convotherm',
    logoUrl: '/assets/brands/convotherm.svg',
    categories: ['combi-oven'],
    country: 'Германия',
    description: 'Пароконвектоматы Convotherm',
    aliases: [
      'конвотерм',
      'конвотерм',
      'конвосерм',
      'convotherm',
      'конвотём',
    ],
  },

  {
    id: 'brand-unox',
    name: 'Unox',
    slug: 'unox',
    logoUrl: '/assets/brands/unox.svg',
    categories: ['combi-oven'],
    country: 'Италия',
    description: 'Пароконвектоматы и хлебопекарное оборудование',
    aliases: [
      'унокс',
      'юнокс',
      'унекс',
      'yunox',
      'унокс',
    ],
  },

  {
    id: 'brand-alto-shaam',
    name: 'Alto-Shaam',
    slug: 'alto-shaam',
    logoUrl: '/assets/brands/alto-shaam.svg',
    categories: ['combi-oven', 'cooking-suite'],
    country: 'США',
    description: 'Тепловое оборудование для кухни',
    aliases: [
      'альто шаам',
      'альто-шаам',
      'алто шаам',
      'alto sham',
      'altoshaam',
      'альтошаам',
    ],
  },

  // ── Моечное оборудование ────────────────────────────────────────────────────

  {
    id: 'brand-winterhalter',
    name: 'Winterhalter',
    slug: 'winterhalter',
    logoUrl: '/assets/brands/winterhalter.svg',
    categories: ['dishwasher'],
    country: 'Германия',
    description: 'Профессиональные посудомоечные машины',
    aliases: [
      'винтерхалтер',
      'зимнийхолдер',
      'вінтерхалтер',
      'vintergalter',
      'winterhalter',
    ],
  },

  {
    id: 'brand-meiko',
    name: 'Meiko',
    slug: 'meiko',
    logoUrl: '/assets/brands/meiko.svg',
    categories: ['dishwasher'],
    country: 'Германия',
    description: 'Промышленные моечные системы',
    aliases: [
      'мейко',
      'мэйко',
      'мейко',
      'майко',
      'meico',
    ],
  },

  // ── Профессиональная химия ──────────────────────────────────────────────────

  {
    id: 'brand-ecolab',
    name: 'Ecolab',
    slug: 'ecolab',
    logoUrl: '/assets/brands/ecolab.svg',
    categories: ['accessory'],
    country: 'США',
    description: 'Профессиональные моющие средства',
    aliases: [
      'экола',
      'эколаб',
      'экколаб',
      'ecolab',
      'еколаб',
    ],
  },

  // ── Крупная бытовая техника / тепловое ─────────────────────────────────────

  {
    id: 'brand-electrolux',
    name: 'Electrolux',
    slug: 'electrolux',
    logoUrl: '/assets/brands/electrolux.svg',
    categories: ['combi-oven', 'cooking-suite', 'dishwasher'],
    country: 'Швеция',
    description: 'Профессиональное кухонное оборудование',
    aliases: [
      'электролюкс',
      'электролукс',
      'электролакс',
      'elektroluks',
    ],
  },

  // ── Кофе (зёрна и молотый) ─────────────────────────────────────────────────

  {
    id: 'brand-julius-meinl',
    name: 'Julius Meinl',
    slug: 'julius-meinl',
    logoUrl: '/assets/brands/julius-meinl.svg',
    categories: ['coffee-beans'],
    country: 'Австрия',
    description: 'Австрийский кофейный дом',
    aliases: [
      'юлиус майнл',
      'юлиус мейнл',
      'юлиус мэйнл',
      'julius maynl',
      'julius meynl',
      'майнл',
      'meinl',
      'майнл',
    ],
  },

  {
    id: 'brand-montana-coffee',
    name: 'Montana Coffee',
    slug: 'montana-coffee',
    logoUrl: '/assets/brands/montana-coffee.svg',
    categories: ['coffee-beans'],
    country: 'Украина',
    description: 'Кофе Montana — свежеобжаренный',
    aliases: [
      'монтана',
      'монтана кофе',
      'montana',
      'montana coffe',
      'монтанакофе',
    ],
  },

  {
    id: 'brand-tasty-coffee',
    name: 'Tasty Coffee',
    slug: 'tasty-coffee',
    logoUrl: '/assets/brands/tasty-coffee.svg',
    categories: ['coffee-beans'],
    country: 'Россия',
    description: 'Specialty-кофе российской обжарки',
    aliases: [
      'тейсти',
      'тейсти кофе',
      'тасти кофе',
      'tasty coffe',
      'тасти',
      'tasti',
    ],
  },

  {
    id: 'brand-parmalat',
    name: 'Parmalat',
    slug: 'parmalat',
    logoUrl: '/assets/brands/parmalat.svg',
    categories: ['cacao'],
    country: 'Италия',
    description: 'Молочные продукты и напитки',
    aliases: [
      'пармалат',
      'парmalat',
      'пармалед',
      'parmalat',
      'parmalot',
    ],
  },

  {
    id: 'brand-marco',
    name: 'Marco',
    slug: 'marco',
    logoUrl: '/assets/brands/marco.svg',
    categories: ['accessory', 'coffee-machine'],
    country: 'Ирландия',
    description: 'Оборудование для заваривания кофе и чая',
    aliases: [
      'марко',
      'марко',
      'markо',
    ],
  },

  // ── Сервис-оборудование ─────────────────────────────────────────────────────

  {
    id: 'brand-wbc',
    name: 'WBC',
    slug: 'wbc',
    logoUrl: '/assets/brands/wbc.svg',
    categories: ['accessory'],
    country: 'Международный',
    description: 'World Barista Championship — ассоциация',
    aliases: [
      'вбч',
      'вбс',
      'wbc',
      'world barista',
      'барista',
      'bariста',
      'барiста чемпионат',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ИНДЕКС БРЕНДОВ
// ═══════════════════════════════════════════════════════════════════════════════

/** Индекс slug → BrandRecord для O(1) доступа */
export const BRANDS_BY_SLUG: Record<string, BrandRecord> = Object.fromEntries(
  BRANDS.map((b) => [b.slug, b]),
);

/** Индекс id → BrandRecord */
export const BRANDS_BY_ID: Record<string, BrandRecord> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
);

/**
 * Возвращает список брендов, связанных с категорией товара.
 *
 * @param category — ProductCategory из productsData.ts
 */
export function getBrandsByCategory(category: string): BrandRecord[] {
  return BRANDS.filter((b) => b.categories.includes(category));
}

/**
 * Возвращает все уникальные категории бренда в текстовом виде.
 * Используется в UI для отображения тегов под именем бренда.
 */
export function getBrandCategoryLabels(brand: BrandRecord): string[] {
  const labels: Record<string, string> = {
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
  return brand.categories.map((c) => labels[c] ?? c);
}
