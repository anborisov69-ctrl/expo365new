/**
 * types/hr.ts — TypeScript-интерфейсы модуля HR Hub
 * ─────────────────────────────────────────────────
 * Отражает схему Supabase: hr_vacancies, hr_resumes,
 * hr_applications, hr_company_subscriptions.
 *
 * @module types/hr
 */

// ═══════════════════════════════════════════════════════════════════
// ENUMS (union types для строгой типизации, зеркало Postgres enums)
// ═══════════════════════════════════════════════════════════════════

/** Статус вакансии */
export type HrVacancyStatus = 'active' | 'draft' | 'closed'

/** Тип работодателя: экспозиционер или посетитель */
export type HrEmployerType = 'exhibitor' | 'visitor'

/** Статус отклика */
export type HrApplicationStatus = 'pending' | 'reviewed' | 'rejected' | 'interview'

/** Статус резюме */
export type HrResumeStatus = 'active' | 'hidden' | 'archived'

/** Тип занятости */
export type HrEmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship'

// ── Категории должностей ─────────────────────────────────────────────────────

/** Категории вакансий/резюме в HoReCa */
export type HrCategory =
  | 'barista'          // Бариста
  | 'chef'             // Шеф-повар / Повар
  | 'manager'          // Менеджер / РОМ
  | 'service'          // Сервисный инженер
  | 'sales'            // Менеджер по продажам
  | 'hr'               // HR / Рекрутинг
  | 'logistics'        // Логистика / Склад
  | 'marketing'        // Маркетинг
  | 'finance'          // Финансы / Бухгалтерия
  | 'other'            // Другое

/** Маппинг категорий на отображаемые русские метки */
export const HR_CATEGORY_LABELS: Record<HrCategory, string> = {
  barista:    'Бариста',
  chef:       'Шеф-повар',
  manager:    'Менеджер',
  service:    'Сервисный инженер',
  sales:      'Менеджер по продажам',
  hr:         'HR / Рекрутинг',
  logistics:  'Логистика',
  marketing:  'Маркетинг',
  finance:    'Финансы',
  other:      'Другое',
}

/** Маппинг типов занятости на русские метки */
export const HR_EMPLOYMENT_TYPE_LABELS: Record<HrEmploymentType, string> = {
  full_time:   'Полная занятость',
  part_time:   'Частичная занятость',
  contract:    'Контракт',
  internship:  'Стажировка',
}

/** Статусные метки для откликов */
export const HR_APPLICATION_STATUS_LABELS: Record<HrApplicationStatus, string> = {
  pending:   'На рассмотрении',
  reviewed:  'Рассмотрено',
  rejected:  'Отказ',
  interview: 'Приглашение на интервью',
}

// ═══════════════════════════════════════════════════════════════════
// ЗАРПЛАТНАЯ ВИЛКА
// ═══════════════════════════════════════════════════════════════════

/** Salary range JSONB структура */
export interface SalaryRange {
  min:      number | null
  max:      number | null
  currency: 'RUB' | 'USD' | 'EUR'
}

/** Желаемая зарплата (резюме) */
export interface DesiredSalary {
  amount:   number | null
  currency: 'RUB' | 'USD' | 'EUR'
}

// ═══════════════════════════════════════════════════════════════════
// ВАКАНСИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Вакансия — row из hr_vacancies.
 * Денормализованное поле company_name добавлено для
 * быстрого отображения без JOIN.
 */
export interface HrVacancy {
  id:                 string
  created_at:         string
  updated_at:         string
  employer_id:        string
  employer_type:      HrEmployerType
  company_name:       string | null
  title:              string
  description:        string | null
  requirements:       string | null
  salary_range:       SalaryRange
  category:           string
  location:           string | null
  employment_type:    HrEmploymentType
  status:             HrVacancyStatus
  applications_count: number
}

/**
 * Форм-данные для создания/редактирования вакансии.
 * Использует строки для salary range (до Zod-парсинга).
 */
export interface HrVacancyFormData {
  title:           string
  description:     string
  requirements:    string
  category:        string
  location:        string
  employment_type: HrEmploymentType
  salary_min:      string
  salary_max:      string
  salary_currency: 'RUB' | 'USD' | 'EUR'
  employer_type:   HrEmployerType
}

// ═══════════════════════════════════════════════════════════════════
// РЕЗЮМЕ
// ═══════════════════════════════════════════════════════════════════

/**
 * Резюме кандидата — row из hr_resumes.
 */
export interface HrResume {
  id:              string
  created_at:      string
  updated_at:      string
  user_id:         string
  full_name:       string
  position:        string
  contact_email:   string | null
  contact_phone:   string | null
  summary:         string | null
  experience:      string | null
  skills:          string | null
  education:       string | null
  desired_salary:  DesiredSalary
  category:        string
  location:        string | null
  status:          HrResumeStatus
}

/**
 * Форм-данные для создания/редактирования резюме.
 */
export interface HrResumeFormData {
  full_name:        string
  position:         string
  contact_email:    string
  contact_phone:    string
  summary:          string
  experience:       string
  skills:           string
  education:        string
  category:         string
  location:         string
  desired_amount:   string
  desired_currency: 'RUB' | 'USD' | 'EUR'
}

// ═══════════════════════════════════════════════════════════════════
// ОТКЛИКИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Отклик на вакансию — row из hr_applications.
 */
export interface HrApplication {
  id:           string
  created_at:   string
  updated_at:   string
  vacancy_id:   string
  resume_id:    string | null
  applicant_id: string
  cover_letter: string | null
  status:       HrApplicationStatus
}

/**
 * Форм-данные отклика (модальное окно Apply).
 */
export interface HrApplicationFormData {
  vacancy_id:   string
  resume_id:    string | null
  cover_letter: string
}

// ═══════════════════════════════════════════════════════════════════
// ПОДПИСКИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Подписка кандидата на компанию — hr_company_subscriptions.
 */
export interface HrCompanySubscription {
  id:            string
  created_at:    string
  subscriber_id: string
  employer_id:   string
}

// ═══════════════════════════════════════════════════════════════════
// UI-ФИЛЬТРЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Состояние фильтров для списка вакансий.
 */
export interface HrVacancyFilters {
  category:      string     // '' = все категории
  employer_type: string     // '' = все типы
  search:        string     // полнотекстовый поиск
}

/**
 * Состояние фильтров для списка резюме.
 */
export interface HrResumeFilters {
  category:  string
  search:    string
  location:  string
}

// ═══════════════════════════════════════════════════════════════════
// SERVER ACTION RESULTS
// ═══════════════════════════════════════════════════════════════════

/** Унифицированный результат Server Action */
export interface HrActionResult<T = void> {
  success:  boolean
  data?:    T
  error?:   string
}
