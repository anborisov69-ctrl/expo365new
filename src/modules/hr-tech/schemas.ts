/**
 * modules/hr-tech/schemas.ts — Zod-схемы валидации форм HR Hub
 * ─────────────────────────────────────────────────────────────────
 * Используются в Server Actions и Client-формах для двойной валидации.
 * Все правила соответствуют CHECK-ограничениям в PostgreSQL.
 *
 * @module modules/hr-tech/schemas
 */

import { z } from 'zod'

// ── Общие констрейнты ───────────────────────────────────────────────────────

const CURRENCY_VALUES = ['RUB', 'USD', 'EUR'] as const
const EMPLOYER_TYPE_VALUES = ['exhibitor', 'visitor'] as const
const EMPLOYMENT_TYPE_VALUES = ['full_time', 'part_time', 'contract', 'internship'] as const
const VACANCY_STATUS_VALUES = ['active', 'draft', 'closed'] as const
const HR_CATEGORIES = [
  'barista', 'chef', 'manager', 'service', 'sales',
  'hr', 'logistics', 'marketing', 'finance', 'other',
] as const

// ── Вспомогательные схемы ───────────────────────────────────────────────────

/** Числовое поле зарплаты (строка → число, допускает пусто) */
const salaryAmountSchema = z
  .string()
  .transform((val) => (val === '' ? null : Number(val)))
  .pipe(z.number().min(0, 'Сумма не может быть отрицательной').nullable())
  .optional()
  .nullable()

// ══════════════════════════════════════════════════════════════════
// ВАКАНСИЯ
// ══════════════════════════════════════════════════════════════════

/**
 * Zod-схема для формы создания/редактирования вакансии.
 * Соответствует HrVacancyFormData.
 */
export const vacancyFormSchema = z.object({
  title: z
    .string()
    .min(3,   { message: 'Заголовок: минимум 3 символа' })
    .max(120, { message: 'Заголовок: максимум 120 символов' }),

  description: z
    .string()
    .max(5000, { message: 'Описание: максимум 5000 символов' })
    .optional()
    .default(''),

  requirements: z
    .string()
    .max(5000, { message: 'Требования: максимум 5000 символов' })
    .optional()
    .default(''),

  category: z
    .enum(HR_CATEGORIES, { message: 'Выберите категорию' }),

  location: z
    .string()
    .max(100, { message: 'Город: максимум 100 символов' })
    .optional()
    .default(''),

  employment_type: z
    .enum(EMPLOYMENT_TYPE_VALUES, { message: 'Выберите тип занятости' })
    .default('full_time'),

  salary_min: z
    .string()
    .optional()
    .default(''),

  salary_max: z
    .string()
    .optional()
    .default(''),

  salary_currency: z
    .enum(CURRENCY_VALUES)
    .default('RUB'),

  employer_type: z
    .enum(EMPLOYER_TYPE_VALUES, { message: 'Выберите тип работодателя' }),
})
// Кросс-валидация: min ≤ max
.refine(
  (data) => {
    const min = data.salary_min ? Number(data.salary_min) : null
    const max = data.salary_max ? Number(data.salary_max) : null
    if (min !== null && max !== null) return min <= max
    return true
  },
  {
    message: 'Минимальная зарплата не может превышать максимальную',
    path: ['salary_min'],
  }
)

export type VacancyFormSchema = z.infer<typeof vacancyFormSchema>

// ══════════════════════════════════════════════════════════════════
// РЕЗЮМЕ
// ══════════════════════════════════════════════════════════════════

/**
 * Zod-схема для формы создания/редактирования резюме.
 * Соответствует HrResumeFormData.
 */
export const resumeFormSchema = z.object({
  full_name: z
    .string()
    .min(2,   { message: 'Имя: минимум 2 символа' })
    .max(100, { message: 'Имя: максимум 100 символов' }),

  position: z
    .string()
    .min(2,   { message: 'Должность: минимум 2 символа' })
    .max(120, { message: 'Должность: максимум 120 символов' }),

  contact_email: z
    .string()
    .email({ message: 'Введите корректный email' })
    .optional()
    .or(z.literal('')),

  contact_phone: z
    .string()
    .max(30, { message: 'Телефон: максимум 30 символов' })
    .optional()
    .default(''),

  summary: z
    .string()
    .max(2000, { message: 'О себе: максимум 2000 символов' })
    .optional()
    .default(''),

  experience: z
    .string()
    .max(5000, { message: 'Опыт работы: максимум 5000 символов' })
    .optional()
    .default(''),

  skills: z
    .string()
    .max(2000, { message: 'Навыки: максимум 2000 символов' })
    .optional()
    .default(''),

  education: z
    .string()
    .max(2000, { message: 'Образование: максимум 2000 символов' })
    .optional()
    .default(''),

  category: z
    .enum(HR_CATEGORIES, { message: 'Выберите категорию' }),

  location: z
    .string()
    .max(100, { message: 'Город: максимум 100 символов' })
    .optional()
    .default(''),

  desired_amount: z
    .string()
    .optional()
    .default(''),

  desired_currency: z
    .enum(CURRENCY_VALUES)
    .default('RUB'),
})

export type ResumeFormSchema = z.infer<typeof resumeFormSchema>

// ══════════════════════════════════════════════════════════════════
// ОТКЛИК
// ══════════════════════════════════════════════════════════════════

/**
 * Zod-схема для формы отклика (Apply modal).
 */
export const applicationFormSchema = z.object({
  vacancy_id: z
    .string()
    .uuid({ message: 'Некорректный ID вакансии' }),

  resume_id: z
    .string()
    .uuid({ message: 'Некорректный ID резюме' })
    .nullable()
    .optional(),

  cover_letter: z
    .string()
    .max(3000, { message: 'Сопроводительное письмо: максимум 3000 символов' })
    .optional()
    .default(''),
})

export type ApplicationFormSchema = z.infer<typeof applicationFormSchema>

// ══════════════════════════════════════════════════════════════════
// ФИЛЬТРЫ
// ══════════════════════════════════════════════════════════════════

/** Схема URL-параметров для фильтрации вакансий */
export const vacancyFiltersSchema = z.object({
  category:      z.string().optional().default(''),
  employer_type: z.string().optional().default(''),
  search:        z.string().optional().default(''),
})

/** Схема URL-параметров для фильтрации резюме */
export const resumeFiltersSchema = z.object({
  category: z.string().optional().default(''),
  search:   z.string().optional().default(''),
  location: z.string().optional().default(''),
})

// ── Экспорт категорий для UI ────────────────────────────────────────────────
export { HR_CATEGORIES, EMPLOYMENT_TYPE_VALUES, EMPLOYER_TYPE_VALUES, CURRENCY_VALUES }
