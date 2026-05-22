import { Suspense } from 'react';
import type { Metadata } from 'next';
import DiscoveryClient, { type Exponent } from './DiscoveryClient';

export const metadata: Metadata = {
  title: 'Каталог отраслей | EXPO 365 HoReCa',
  description: 'Каталог отраслей и поставщиков выставки EXPO 365 HoReCa',
};

// ─── Mock-данные экспонентов ──────────────────────────────────────────────────
// TODO: заменить на Supabase-запрос с RLS после настройки схемы БД.
// Используются в правом сайдбаре (личный кабинет, аналитика площадки)
// и при переходе на страницу отрасли /horeca/discovery?industry={id}.

const EXPONENTS: Exponent[] = [
  // ── ООО «ТЕСТ» — Демонстрационный экспонент (синхронизирован с companiesData + ecosystemStore) ──
  // isB2BPartner: true — активно использует B2B-рефералы → показывает бейдж "Партнёр платформы" при hover
  {
    id:           'exp-ooo-test',
    name:         'ТЕСТ',
    slug:         'ooo-test',
    mainLogo:     null,
    brands: [
      { name: 'Dalla Corte', logoUrl: '/assets/brands/dalla-corte.svg', country: 'Италия'   },
      { name: 'Mahlkoenig',  logoUrl: '/assets/brands/mahlkoenig.svg',  country: 'Германия' },
      { name: 'Acaia',       logoUrl: '/assets/brands/acaia.svg',       country: 'Тайвань'  },
    ],
    isOnline:     true,
    category:     'distributor',
    industry:     'beverages',
    country:      'Россия',
    isB2BPartner: true,
  },

  {
    id:       'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name:     'Espresso Italia',
    slug:     'espresso-italia',
    mainLogo: '/assets/brands/la-marzocco.svg',
    brands: [
      { name: 'Rancilio',    logoUrl: '/assets/brands/rancilio.svg',    country: 'Италия' },
      { name: 'La Marzocco', logoUrl: '/assets/brands/la-marzocco.svg', country: 'Италия' },
      { name: 'Anfim',       logoUrl: '/assets/brands/anfim.svg',       country: 'Италия' },
    ],
    isOnline: true,
    category: 'distributor',
    industry: 'beverages',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    name: 'Юлиус Майнл',
    mainLogo: null,
    brands: [
      { name: 'Julius Meinl', logoUrl: '/assets/brands/julius-meinl.svg', country: 'Австрия' },
      { name: 'Tasty Coffee',  logoUrl: '/assets/brands/tasty-coffee.svg', country: 'Россия' },
      { name: 'Lebo',                                                       country: 'Россия' },
      { name: 'Gourmix',                                                    country: 'Россия' },
    ],
    isOnline: false,
    category: 'manufacturer',
    industry: 'beverages',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-ab3456789012',
    name: 'Франко',
    mainLogo: null,
    brands: [
      { name: 'Dalla Corte', logoUrl: '/assets/brands/dalla-corte.svg', country: 'Италия' },
      { name: 'Anfim',       logoUrl: '/assets/brands/anfim.svg',       country: 'Италия' },
    ],
    isOnline: true,
    category: 'manufacturer',
    industry: 'beverages',
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-bc4567890123',
    name: 'Алеф Трейд',
    mainLogo: null,
    brands: [
      { name: 'Nuova Simonelli', logoUrl: '/assets/brands/nuova-simonelli.svg', country: 'Италия' },
      { name: 'WBC',             logoUrl: '/assets/brands/wbc.svg',             country: 'Другие' },
    ],
    isOnline: true,
    category: 'distributor',
    industry: 'beverages',
  },
  {
    id: 'e5f6a7b8-c9d0-1234-efab-cd5678901234',
    name: 'Монтана Кофе',
    mainLogo: null,
    brands: [
      { name: 'Montana Coffee', logoUrl: '/assets/brands/montana-coffee.svg', country: 'Другие' },
      { name: 'Cimbali',        logoUrl: '/assets/brands/cimbali.svg',        country: 'Италия' },
    ],
    isOnline: false,
    category: 'manufacturer',
    industry: 'beverages',
  },
  {
    id: 'f6a7b8c9-d0e1-2345-fabc-de6789012345',
    name: 'Спешиалти Гарден',
    mainLogo: null,
    brands: [
      { name: 'Baratza',   logoUrl: '/assets/brands/baratza.svg',   country: 'США' },
      { name: 'AeroPress', logoUrl: '/assets/brands/aeropress.svg', country: 'США' },
      { name: 'Acaia',     logoUrl: '/assets/brands/acaia.svg',     country: 'Тайвань' },
    ],
    isOnline: true,
    category: 'distributor',
    industry: 'beverages',
  },
  {
    id: 'a7b8c9d0-e1f2-3456-abcd-ef7890123456',
    name: 'Кофе-Брейк',
    mainLogo: null,
    brands: [
      { name: 'Jura',  logoUrl: '/assets/brands/jura.svg',  country: 'Швейцария' },
      { name: 'Saeco', logoUrl: '/assets/brands/saeco.svg', country: 'Италия' },
      { name: 'Marco', logoUrl: '/assets/brands/marco.svg', country: 'Ирландия' },
    ],
    isOnline: false,
    category: 'distributor',
    industry: 'beverages',
  },
  {
    id: 'b8c9d0e1-f2a3-4567-bcde-fa8901234567',
    name: 'Бариста Про',
    mainLogo: null,
    brands: [
      { name: 'Victoria Arduino', logoUrl: '/assets/brands/victoria-arduino.svg', country: 'Италия' },
      { name: 'Mahlkoenig',       logoUrl: '/assets/brands/mahlkoenig.svg',       country: 'Германия' },
    ],
    isOnline: true,
    category: 'manufacturer',
    industry: 'beverages',
  },
  {
    id:       'c9d0e1f2-a3b4-5678-cdef-ab9012345678',
    name:     'RATIONAL Russia',
    slug:     'rational-russia',
    mainLogo: '/assets/brands/rational.svg',
    brands: [
      { name: 'Rational',    logoUrl: '/assets/brands/rational.svg',    country: 'Германия' },
      { name: 'Electrolux',  logoUrl: '/assets/brands/electrolux.svg',  country: 'Швеция' },
      { name: 'Meiko',       logoUrl: '/assets/brands/meiko.svg',       country: 'Германия' },
      { name: 'Convotherm',  logoUrl: '/assets/brands/convotherm.svg',  country: 'Германия' },
    ],
    isOnline: true,
    category: 'manufacturer',
    industry: 'equipment',
  },
  {
    id: 'd0e1f2a3-b4c5-6789-defa-bc0123456789',
    name: 'ПроКухня',
    mainLogo: null,
    brands: [
      { name: 'Alto-Shaam',  logoUrl: '/assets/brands/alto-shaam.svg',  country: 'США' },
      { name: 'Unox',        logoUrl: '/assets/brands/unox.svg',        country: 'Италия' },
      { name: 'Convotherm',  logoUrl: '/assets/brands/convotherm.svg',  country: 'Германия' },
    ],
    isOnline: false,
    category: 'manufacturer',
    industry: 'equipment',
  },

  // ── Финансовые партнёры (FINANCIAL_INSTITUTION) ───────────────────────────────
  // Отображаются при выборе фильтра «Финансы и лизинг» в Discovery Sidebar.
  // category: 'financial_institution' → зелёный бейдж «ФИН. ПАРТНЁР» на PavilionCard.
  {
    id:       'fin-vtb-0001-0000-0000-000000000001',
    name:     'ВТБ Банк',
    slug:     'fin-vtb',
    mainLogo: null,
    brands: [
      { name: 'Лизинг HoReCa', country: 'Россия' },
      { name: 'Кредитование',  country: 'Россия' },
      { name: 'РКО',           country: 'Россия' },
    ],
    isOnline:  true,
    category:  'financial_institution',
    industry:  'finance',
    country:   'Россия',
  },
  {
    id:       'fin-tochka-0001-0000-0000-000000000002',
    name:     'Точка Банк',
    slug:     'fin-tochka',
    mainLogo: null,
    brands: [
      { name: 'Лизинг МСБ',   country: 'Россия' },
      { name: 'Кредит 1 день', country: 'Россия' },
    ],
    isOnline:  true,
    category:  'financial_institution',
    industry:  'finance',
    country:   'Россия',
  },
  {
    id:       'fin-arenza-0001-0000-0000-000000000003',
    name:     'Аренза',
    slug:     'fin-arenza',
    mainLogo: null,
    brands: [
      { name: 'Лизинг оборудования', country: 'Россия' },
      { name: 'Рассрочка HoReCa',    country: 'Россия' },
    ],
    isOnline:  true,
    category:  'financial_institution',
    industry:  'finance',
    country:   'Россия',
  },
  {
    id:       'fin-alfa-0001-0000-0000-000000000004',
    name:     'Альфа-Банк',
    slug:     'fin-alfa',
    mainLogo: null,
    brands: [
      { name: 'Бизнес-лизинг', country: 'Россия' },
      { name: 'РКО Бизнес',    country: 'Россия' },
      { name: 'Факторинг',     country: 'Россия' },
    ],
    isOnline:  true,
    category:  'financial_institution',
    industry:  'finance',
    country:   'Россия',
  },
];

// ─── Страница ─────────────────────────────────────────────────────────────────

interface DiscoveryPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    /** Отрасль каталога (industry slug) — новый параметр после рефактора */
    industry?: string;
  }>;
}

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const { category, search, industry } = await searchParams;

  /**
   * Формируем читаемый контекстный ярлык для подзаголовка страницы.
   * Приоритет: search > industry > category > дефолт.
   */
  const contextLabel = search
    ? `Поиск: «${search}»`
    : industry
    ? `Отрасль: ${decodeURIComponent(industry)}`
    : category
    ? decodeURIComponent(category)
    : 'Все отрасли';

  /**
   * SSR-фильтрация экспонентов по поисковому запросу из URL.
   * Результат передаётся в DiscoveryClient для:
   *   • аналитики на правом сайдбаре (online count, category split)
   *   • будущего листинга поставщиков при клике на отрасль
   */
  const baseExponents = EXPONENTS.filter((exp) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      exp.name.toLowerCase().includes(q) ||
      exp.brands.some((b) => b.name.toLowerCase().includes(q))
    );
  });

  return (
    /*
     * Blueprint-фон: белый лист с тонкой сеткой #0B2B5E при 8% прозрачности.
     * overflow-x-hidden намеренно убран — он создаёт новый scroll container
     * и ломает position:sticky у панели фильтров.
     */
    <main
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: `
          linear-gradient(rgba(11,43,94,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(11,43,94,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <Suspense fallback={
        <div className="mt-16 flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#0B2B5E]/20 border-t-[#0B2B5E] animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Загрузка витрины…</p>
          </div>
        </div>
      }>
        <DiscoveryClient exponents={baseExponents} contextLabel={contextLabel} />
      </Suspense>
    </main>
  );
}
