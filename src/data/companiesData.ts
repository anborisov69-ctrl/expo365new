/**
 * companiesData.ts — Реестр компаний-экспонентов EXPO 365 HoReCa
 * ───────────────────────────────────────────────────────────────
 * Статические mock-данные для разработки.
 *
 * TODO: Заменить на Supabase-запрос с RLS:
 *   supabase.from('companies')
 *     .select('*')
 *     .eq('status', 'PUBLISHED')  ← только опубликованные видны всем
 *
 * Схема БД (target):
 *   companies (
 *     id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     company_name text NOT NULL,
 *     legal_form   text NOT NULL DEFAULT 'ООО',
 *     slug         text NOT NULL UNIQUE,
 *     logo_url     text,
 *     description  text,
 *     status       text CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')) DEFAULT 'DRAFT',
 *     industry     text,
 *     city         text,
 *     created_at   timestamptz NOT NULL DEFAULT now()
 *   );
 *   -- RLS: PUBLISHED — публичное чтение; DRAFT — только owner + admin
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Статус жизненного цикла компании-экспонента.
 *
 * DRAFT     — черновик, виден только в /admin и владельцу. Не появляется в
 *             глобальном поиске и на публичной витрине Discovery.
 * PUBLISHED — опубликован, виден всем посетителям, индексируется поиском.
 * ARCHIVED  — архивирован, скрыт из листинга, данные сохранены.
 */
export type CompanyStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * Профиль компании-экспонента.
 * Используется в глобальном поиске (Header Search Suggestions)
 * и на странице Discovery (/horeca/discovery).
 */
export interface Company {
  /** Внутренний ID — совпадает с exhibitorId в newsData/productsData */
  id: string;
  /**
   * Название без юридической формы.
   * Пример: 'ТЕСТ' (без ООО).
   * Глобальный поиск матчит по этому полю + legalForm + fullName.
   */
  companyName: string;
  /**
   * Юридическая форма организации.
   * Примеры: 'ООО', 'АО', 'ИП', 'ПАО'.
   */
  legalForm: string;
  /**
   * Уровень подписки экспонента.
   * base - стандартный доступ к тендерам через 48ч
   * premium - мгновенный доступ ко всем тендерам
   */
  subscriptionTier: 'base' | 'premium';
  /**
   * URL-slug страницы экспонента.
   * Соответствует маршруту /horeca/exhibitors/[slug].
   */
  slug: string;
  /**
   * URL логотипа из /public/assets/brands/ или Supabase Storage.
   * null — использовать avatar-заглушку с инициалами.
   */
  logoUrl: string | null;
  /** Краткое описание деятельности (1–2 строки для карточки в поиске) */
  description?: string;
  /**
   * Статус публикации.
   * Только PUBLISHED-компании отображаются в глобальном поиске.
   * @see CompanyStatus
   */
  status: CompanyStatus;
  /** Отраслевая принадлежность (для фильтров Discovery) */
  industry?: string;
  /** Город присутствия (для региональной фильтрации) */
  city?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// РЕЕСТР КОМПАНИЙ
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPANIES: Company[] = [
  // ── ООО "ТЕСТ" — Демонстрационный экспонент EXPO 365 ─────────────────────────
  // exhibitorId: 'exp-ooo-test' — синхронизируется с newsData.ts + ecosystemStore
  // slug: 'ooo-test' → /horeca/exhibitors/ooo-test
  // status: PUBLISHED → виден в глобальном поиске Header
  {
    id:          'exp-ooo-test',
    companyName: 'ТЕСТ',
    legalForm:   'ООО',
    slug:        'ooo-test',
    logoUrl:     null,
    description: 'Профессиональное кофейное оборудование, обучение и поставки HoReCa',
    status:      'PUBLISHED',
    industry:    'HoReCa · Кофейное оборудование',
    city:        'Москва',
    subscriptionTier: 'base' as const,
  },

  // ── Espresso Italia — официальный дистрибьютор La Marzocco ───────────────────
  {
    id:          'exhibitor-espresso-italia',
    companyName: 'Espresso Italia',
    legalForm:   'ООО',
    slug:        'espresso-italia',
    logoUrl:     '/assets/brands/la-marzocco.svg',
    description: 'Официальный дистрибьютор La Marzocco в России',
    status:      'PUBLISHED',
    industry:    'HoReCa · Кофейное оборудование',
    city:        'Москва',
    subscriptionTier: 'premium' as const,
  },

  // ── Rational Russia — официальный представитель ───────────────────────────────
  {
    id:          'exhibitor-rational-russia',
    companyName: 'Rational Russia',
    legalForm:   'ООО',
    slug:        'rational-russia',
    logoUrl:     '/assets/brands/rational.svg',
    description: 'Официальный представитель RATIONAL AG: пароконвектоматы iCombi',
    status:      'PUBLISHED',
    industry:    'HoReCa · Тепловое оборудование',
    city:        'Санкт-Петербург',
    subscriptionTier: 'premium' as const,
  },

  // ── Пример компании в статусе DRAFT (скрыта из поиска) ───────────────────────
  {
    id:          'exhibitor-draft-example',
    companyName: 'Новый участник',
    legalForm:   'ИП',
    slug:        'new-exhibitor',
    logoUrl:     null,
    description: 'Профиль в процессе заполнения',
    status:      'DRAFT',
    industry:    'HoReCa',
    city:        'Казань',
    subscriptionTier: 'base' as const,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Формирует полное официальное название компании.
 * Пример: legalForm='ООО', companyName='ТЕСТ' → 'ООО «ТЕСТ»'
 */
export function getFullCompanyName(company: Pick<Company, 'legalForm' | 'companyName'>): string {
  return `${company.legalForm} «${company.companyName}»`;
}

/**
 * Генерирует инициалы для avatar-заглушки (когда logoUrl === null).
 * Возвращает первые 2 символа companyName в верхнем регистре.
 * Пример: 'ТЕСТ' → 'ТЕ'
 */
export function getCompanyInitials(companyName: string): string {
  return companyName.trim().substring(0, 2).toUpperCase();
}

/**
 * Поиск компаний по частичному совпадению (case-insensitive).
 *
 * Алгоритм:
 *   1. Нормализует запрос (toLowerCase + trim)
 *   2. Фильтрует только PUBLISHED компании
 *   3. Проверяет includes() по: companyName, legalForm, fullName, description, city
 *
 * @param query  — поисковый запрос (например 'тест')
 * @param limit  — максимальное кол-во результатов (default: 5)
 * @returns      отфильтрованный массив Company
 *
 * @example
 *   searchCompanies('тест')
 *   // → [{ companyName: 'ТЕСТ', legalForm: 'ООО', status: 'PUBLISHED', ... }]
 */
export function searchCompanies(query: string, limit = 5): Company[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return COMPANIES
    .filter((c) => c.status === 'PUBLISHED')
    .filter((c) => {
      const fullName = `${c.legalForm} ${c.companyName}`.toLowerCase();
      const quotedName = `${c.legalForm} «${c.companyName}»`.toLowerCase();
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.legalForm.toLowerCase().includes(q)    ||
        fullName.includes(q)                       ||
        quotedName.includes(q)                     ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.city?.toLowerCase().includes(q) ?? false)
      );
    })
    .slice(0, limit);
}
