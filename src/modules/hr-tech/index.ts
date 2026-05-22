/**
 * modules/hr-tech/index.ts — Публичный API модуля HR Hub
 * ────────────────────────────────────────────────────────
 * Реэкспортирует все публичные сущности HR модуля.
 * Импортируйте из '@/modules/hr-tech', а не из подпутей.
 *
 * @module modules/hr-tech
 */

// ── Zod-схемы ────────────────────────────────────────────────────────────────
export {
  vacancyFormSchema,
  resumeFormSchema,
  applicationFormSchema,
  vacancyFiltersSchema,
  resumeFiltersSchema,
  HR_CATEGORIES,
  EMPLOYMENT_TYPE_VALUES,
  EMPLOYER_TYPE_VALUES,
  CURRENCY_VALUES,
} from './schemas'

export type {
  VacancyFormSchema,
  ResumeFormSchema,
  ApplicationFormSchema,
} from './schemas'

// ── TypeScript типы (реэкспорт из src/types/hr.ts) ──────────────────────────
export type {
  HrVacancy,
  HrVacancyFormData,
  HrVacancyStatus,
  HrEmployerType,
  HrEmploymentType,
  HrResume,
  HrResumeFormData,
  HrResumeStatus,
  HrApplication,
  HrApplicationFormData,
  HrApplicationStatus,
  HrCompanySubscription,
  HrVacancyFilters,
  HrResumeFilters,
  HrActionResult,
  SalaryRange,
  DesiredSalary,
  HrCategory,
} from '@/types/hr'

export {
  HR_CATEGORY_LABELS,
  HR_EMPLOYMENT_TYPE_LABELS,
  HR_APPLICATION_STATUS_LABELS,
} from '@/types/hr'
