'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import NewsFeedPanel from '@/components/NewsFeedPanel';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface HorecaCategory {
  id: string;
  title: string;
  icon: keyof typeof LucideIcons;
  exhibitors: number;
  slug: string;
  keywords: string[];
}

// ─── Каталог отраслей ────────────────────────────────────────────────────────
//
// Консолидация по ТЗ:
//   • Удалены: «Кофе», «Чай», «Оборудование для горячих напитков».
//   • Создана единая плашка «ГОРЯЧИЕ НАПИТКИ» (агрегирует все три категории).
//
//   • Удалена: «Продукты и напитки».
//   • Созданы ДВЕ плашки: «ПРОДУКТЫ» + «ХОЛОДНЫЕ НАПИТКИ».

const HORECA_CATEGORIES: HorecaCategory[] = [
  {
    // Объединение: Кофе (124) + Чай (86) + Оборудование для горячих напитков (152)
    id: '1a2b3c4d-0000-4a5b-8c9d-0e1f2a3b4c5d',
    title: 'Горячие напитки',
    icon: 'Coffee',
    exhibitors: 362,
    slug: 'goryachie-napitki',
    keywords: ['кофе', 'чай', 'какао', 'горячие напитки', 'кофемашины', 'оборудование'],
  },
  {
    // Выделено из бывшей плашки «Продукты и напитки»
    id: '2b3c4d5e-0000-5b6c-9d0e-1f2a3b4c5d6e',
    title: 'Продукты',
    icon: 'ShoppingBasket',
    exhibitors: 218,
    slug: 'produkty',
    keywords: ['продукты', 'еда', 'мясо', 'молоко', 'хлеб', 'овощи'],
  },
  {
    // Выделено из бывшей плашки «Продукты и напитки»
    id: '3c4d5e6f-0000-6c7d-0e1f-2a3b4c5d6e7f',
    title: 'Холодные напитки',
    icon: 'GlassWater',
    exhibitors: 94,
    slug: 'holodnye-napitki',
    keywords: ['холодные напитки', 'соки', 'вода', 'лимонад', 'пиво', 'коктейли'],
  },
  {
    id: 'a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d',
    title: 'Кухонное оборудование',
    icon: 'UtensilsCrossed',
    exhibitors: 210,
    slug: 'oborudovanie-dlya-kuhni',
    keywords: ['кухня', 'оборудование', 'плиты', 'духовки', 'комби-печи'],
  },
  {
    id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
    title: 'Посуда и инвентарь',
    icon: 'CookingPot',
    exhibitors: 184,
    slug: 'posuda-i-inventar',
    keywords: ['посуда', 'инвентарь', 'столовые приборы', 'тарелки'],
  },
  {
    id: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f',
    title: 'Мебель',
    icon: 'Armchair',
    exhibitors: 95,
    slug: 'mebel',
    keywords: ['мебель', 'столы', 'стулья', 'кресла', 'интерьер'],
  },
  {
    id: 'd3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a',
    title: 'Автоматизация и ПО',
    icon: 'MonitorSmartphone',
    exhibitors: 67,
    slug: 'avtomatizaciya-i-po',
    keywords: ['автоматизация', 'по', 'программы', 'pos', 'crm'],
  },
  {
    id: 'f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c',
    title: 'Текстиль',
    icon: 'Shirt',
    exhibitors: 48,
    slug: 'tekstil',
    keywords: ['текстиль', 'форма', 'полотенца', 'скатерти', 'фартуки'],
  },
  {
    id: '06a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1d',
    title: 'Заморозка',
    icon: 'Snowflake',
    exhibitors: 92,
    slug: 'zamorozka',
    keywords: ['заморозка', 'мороженое', 'полуфабрикаты', 'iqf'],
  },
];

// ─── Компонент страницы ───────────────────────────────────────────────────────

export default function HorecaCatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = HORECA_CATEGORIES.filter(
    (category) =>
      category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.keywords.some((kw) => kw.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'HoReCa', href: '/horeca' },
  ];

  return (
    /*
     * Blueprint-фон: белый лист с тонкой сеткой #0B2B5E при 6% прозрачности.
     * min-h-screen обеспечивает полный экран (sticky панель работает корректно).
     */
    <main
      className="flex-1 min-h-screen bg-white"
      style={{
        backgroundImage: `
          linear-gradient(rgba(11,43,94,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(11,43,94,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      {/*
       * Flex-обертка: CENTER (flex-1) + RIGHT (w-[380px] sticky).
       * pt-32/pt-28 — отступ под фиксированный Header (h-16 = 64px).
       * items-start необходим для корректной работы sticky на RIGHT-панели.
       */}
      <div className="flex items-start pt-20">

        {/* ══════════════════════════════════════════════════════════════════
            CENTER — ОТРАСЛЕВЫЕ ПЛАШКИ (flex-1, 8 колонок)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 pt-0">

          {/* ── Хедер страницы ── */}
          <div className="mb-8">
            <Breadcrumbs items={breadcrumbItems} />

            <h1 className="mt-6 text-2xl font-bold" style={{ color: '#0B2B5E' }}>
              Отраслевой каталог: HoReCa
            </h1>

            {/* Поиск */}
            <div className="max-w-2xl mx-auto mb-10 mt-6 relative flex items-center">
              <LucideIcons.Search
                className="absolute left-4 z-10 pointer-events-none"
                size={20}
                strokeWidth={1.5}
                color="#0B2B5E"
              />
              <input
                type="text"
                placeholder="Поиск по категориям..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={[
                  'w-full h-12 pl-12 pr-4',
                  'bg-white border-2 border-[#0B2B5E] rounded-lg',
                  'text-[#0B2B5E] placeholder:text-slate-400',
                  'focus:outline-none focus:border-[#F26522]',
                  'transition-colors duration-150',
                ].join(' ')}
              />
            </div>
          </div>

          {/* ── 8-КОЛОНОЧНАЯ СЕТКА ОТРАСЛЕЙ ── */}
          {/*
           * Структура колонок:
           *   grid-cols-2          — мобильные (< sm): по 2 тайла в ряду
           *   sm:grid-cols-4       — планшеты         : по 4 тайла в ряду
           *   lg:grid-cols-8       — десктоп (СТРОГО 8 колонок)
           *
           * Каждый тайл: col-span-1 | sm:col-span-1 | lg:col-span-2
           *   → на lg+: 4 тайла в ряду (8 колонок / 2 = 4)
           */}
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 lg:gap-5">
              {filteredCategories.map((category) => {
                const IconComponent = LucideIcons[category.icon] as LucideIcon;

                return (
                  <Link
                    key={category.id}
                    href={`/horeca/discovery?category=${encodeURIComponent(category.slug)}`}
                    className="col-span-1 lg:col-span-2 no-underline group focus:outline-none"
                    aria-label={`${category.title} — ${category.exhibitors} экспонентов`}
                  >
                    {/*
                     * Плашка отрасли — aspect-square (строгий квадрат).
                     * Рамка: border border-[#0B2B5E]/20 rounded-xl.
                     * Hover: рамка → #F26522, лёгкий подъём, тень.
                     */}
                    <div
                      className={[
                        'aspect-square flex flex-col items-center justify-center',
                        'px-3 py-4 text-center rounded-xl',
                        'bg-white',
                        'border border-[#0B2B5E]/20',
                        'shadow-[0_2px_12px_rgba(11,43,94,0.06)]',
                        'transition-all duration-250 ease-out',
                        'group-hover:border-[#F26522]',
                        'group-hover:shadow-[0_8px_32px_rgba(242,101,34,0.18)]',
                        'group-hover:-translate-y-1',
                        'group-focus-visible:ring-2 group-focus-visible:ring-[#F26522]/50',
                      ].join(' ')}
                    >
                      {/* Иконка */}
                      <div
                        className="flex-shrink-0 transition-transform duration-250 group-hover:scale-110"
                        style={{ color: '#0B2B5E' }}
                        aria-hidden="true"
                      >
                        <IconComponent size={44} strokeWidth={1.5} />
                      </div>

                      {/* Название */}
                      <h2
                        className="mt-3 text-sm font-semibold leading-tight text-center line-clamp-2"
                        style={{ color: '#0B2B5E' }}
                      >
                        {category.title}
                      </h2>

                      {/* Счётчик экспонентов — оранжевый */}
                      <p
                        className="mt-1.5 text-xs font-bold leading-none"
                        style={{ color: '#F26522' }}
                      >
                        Экспонентов: {category.exhibitors}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Пустое состояние */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
              >
                <LucideIcons.Search size={28} strokeWidth={1.5} color="#0B2B5E" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold" style={{ color: '#0B2B5E' }}>
                Категории не найдены
              </p>
              <p className="text-sm text-slate-400 mt-1">Попробуйте другой поисковый запрос</p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT — НОВИНКИ И СОБЫТИЯ (w-[380px], sticky)
            Видна на lg+ (desktop). Дублирует ленту с Discovery-дашборда.
            Тёмный фон #0B2B5E, отраслевые фильтры (ТЗ п.4 + п.5).
            sticky top-20: прилипает на 80px от верха (под h-16 header).
            ══════════════════════════════════════════════════════════════════ */}
        <aside
          className="hidden lg:block w-[380px] flex-shrink-0 sticky top-6 self-start mr-4 rounded-xl overflow-hidden"
          style={{
            maxHeight: 'calc(100vh - 30px)',
            boxShadow: '0 4px 32px rgba(11,43,94,0.12)',
          }}
          aria-label="Новинки и события HoReCa"
        >
          <NewsFeedPanel variant="sticky" />
        </aside>

      </div>
    </main>
  );
}
