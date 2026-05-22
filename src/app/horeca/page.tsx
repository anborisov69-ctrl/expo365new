'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { BANKS } from '@/data/banksData';

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

const HORECA_CATEGORIES: HorecaCategory[] = [
  {
    id: '1a2b3c4d-0000-4a5b-8c9d-0e1f2a3b4c5d',
    title: 'Горячие напитки',
    icon: 'Coffee',
    exhibitors: 362,
    slug: 'goryachie-napitki',
    keywords: ['кофе', 'чай', 'какао', 'горячие напитки', 'кофемашины', 'оборудование'],
  },
  {
    id: '2b3c4d5e-0000-5b6c-9d0e-1f2a3b4c5d6e',
    title: 'Продукты',
    icon: 'ShoppingBasket',
    exhibitors: 218,
    slug: 'produkty',
    keywords: ['продукты', 'еда', 'мясо', 'молоко', 'хлеб', 'овощи'],
  },
  {
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
     * Правая панель «Новинки» удалена — полноширинный одноколоночный layout.
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-12">

        {/* ── Хедер страницы ── */}
        <div className="mb-8">
          <Breadcrumbs items={breadcrumbItems} />

          <h1
            className="mt-6 text-2xl font-bold"
            style={{ color: '#0B2B5E' }}
          >
            Отраслевой каталог: HoReCa
          </h1>

          {/* Поиск */}
          <div className="max-w-2xl mx-auto mb-0 mt-6 relative flex items-center">
            <LucideIcons.Search
              className="absolute left-4 z-10 pointer-events-none"
              size={20}
              strokeWidth={1.5}
              color="#0B2B5E"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Поиск по категориям..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={[
                'w-full h-12 pl-12 pr-4',
                'bg-white border-2 border-[#0B2B5E] rounded-lg',
                'focus:outline-none focus:border-[#F26522]',
                'transition-colors duration-150',
              ].join(' ')}
              style={{
                color: '#0B2B5E',
                fontWeight: 500,
              }}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ФИНАНСОВЫЕ ПАРТНЁРЫ — поднят наверх, до сетки отраслей
            Зелёная метка #27AE60 «Финансовый партнёр».
            ══════════════════════════════════════════════════════════════════ */}
        <section className="mb-10" aria-label="Финансовые партнёры выставки">

          {/* Заголовок секции */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Зелёная метка-пилюля */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: 'rgba(39,174,96,0.12)',
                  color: '#27AE60',
                  border: '1px solid rgba(39,174,96,0.25)',
                }}
              >
                {/* Иконка банка */}
                <svg
                  width="9" height="9" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 22V12M21 22V12M1 12l11-9 11 9H1zM9 22v-5h6v5" />
                </svg>
                Финансирование
              </span>
              <h2
                className="text-lg font-bold"
                style={{ color: '#0B2B5E' }}
              >
                Финансовые партнёры
              </h2>
            </div>
            <Link
              href="/horeca/finance"
              className="text-xs font-semibold hover:underline"
              style={{ color: '#27AE60' }}
            >
              Все предложения →
            </Link>
          </div>

          {/* 4 карточки — такая же сетка и aspect-square, как у обычных экспонентов */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-5">
            {BANKS.slice(0, 4).map((bank) => (
              <Link
                key={bank.id}
                href={`/horeca/finance/${bank.slug}`}
                className="col-span-1 no-underline group focus:outline-none"
                aria-label={`${bank.name} — финансовый партнёр EXPO 365`}
              >
                <div
                  className={[
                    'aspect-square flex flex-col items-center justify-center',
                    'px-3 py-4 text-center rounded-xl relative overflow-hidden',
                    'bg-white',
                    'border border-[#0B2B5E]/20',
                    'shadow-[0_2px_12px_rgba(11,43,94,0.06)]',
                    'transition-all duration-250 ease-out',
                    'group-hover:border-[#27AE60]',
                    'group-hover:shadow-[0_8px_32px_rgba(39,174,96,0.18)]',
                    'group-hover:-translate-y-1',
                    'group-focus-visible:ring-2 group-focus-visible:ring-[#27AE60]/50',
                  ].join(' ')}
                >
                  {/* Зелёная полоска сверху (hover) */}
                  <div
                    className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ backgroundColor: '#27AE60' }}
                    aria-hidden="true"
                  />

                  {/* Метка «Финансовый партнёр» — правый верхний угол */}
                  <span
                    className="absolute top-2 right-2 inline-flex items-center px-1 py-0.5 rounded text-[6px] font-black uppercase tracking-wider leading-none select-none"
                    style={{
                      backgroundColor: 'rgba(39,174,96,0.12)',
                      color: '#27AE60',
                      border: '1px solid rgba(39,174,96,0.25)',
                    }}
                  >
                    Фин. партнёр
                  </span>

                  {/* Логотип/Аватар банка */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 flex-shrink-0 transition-transform duration-250 group-hover:scale-110"
                    style={{ backgroundColor: bank.accentColor }}
                    aria-hidden="true"
                  >
                    <span className="text-base font-black text-white leading-none select-none">
                      {bank.shortName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Название банка */}
                  <h3
                    className="text-sm font-semibold leading-tight text-center line-clamp-2"
                    style={{ color: '#0B2B5E' }}
                  >
                    {bank.shortName}
                  </h3>

                  {/* Слоган — зелёный акцент */}
                  {bank.tagline && (
                    <p
                      className="mt-1.5 text-[9px] font-medium leading-tight text-center line-clamp-2"
                      style={{ color: '#27AE60' }}
                    >
                      {bank.tagline.length > 28 ? bank.tagline.slice(0, 28) + '…' : bank.tagline}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Разделитель ── */}
        <div
          className="mb-8 border-t"
          style={{ borderColor: 'rgba(11,43,94,0.08)' }}
          aria-hidden="true"
        />

        {/* ── Заголовок сетки отраслей ── */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#0B2B5E' }}
            aria-hidden="true"
          />
          <h2
            className="text-base font-bold"
            style={{ color: '#0B2B5E' }}
          >
            Отраслевые категории
          </h2>
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: 'rgba(11,43,94,0.5)' }}
          >
            {filteredCategories.length} из {HORECA_CATEGORIES.length}
          </span>
        </div>

        {/* ── 8-КОЛОНОЧНАЯ СЕТКА ОТРАСЛЕЙ ── */}
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
              <LucideIcons.Search
                size={28}
                strokeWidth={1.5}
                color="#0B2B5E"
                aria-hidden="true"
              />
            </div>
            <p
              className="text-base font-semibold"
              style={{ color: '#0B2B5E' }}
            >
              Категории не найдены
            </p>
            <p
              className="text-sm font-medium mt-1"
              style={{ color: 'rgba(11,43,94,0.55)' }}
            >
              Попробуйте другой поисковый запрос
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
