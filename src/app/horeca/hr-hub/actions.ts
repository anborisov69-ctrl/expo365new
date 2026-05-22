'use server'

/**
 * app/horeca/hr-hub/actions.ts — Server Actions модуля HR Hub
 * ──────────────────────────────────────────────────────────────
 * Все мутации и запросы выполняются на сервере через Supabase SSR.
 * Каждый action использует createClient(cookieStore) для сессионного
 * контекста и проверяет аутентификацию перед операциями записи.
 *
 * @module app/horeca/hr-hub/actions
 */

import { cookies }    from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { vacancyFormSchema, resumeFormSchema, applicationFormSchema } from '@/modules/hr-tech'
import type {
  HrVacancy,
  HrResume,
  HrApplication,
  HrActionResult,
  HrVacancyFilters,
  HrResumeFilters,
} from '@/types/hr'

// ══════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ══════════════════════════════════════════════════════════════════

/** Возвращает ID аутентифицированного пользователя или выбрасывает */
async function requireAuth(): Promise<string> {
  const cookieStore = await cookies()
  const supabase    = createClient(cookieStore)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Необходима авторизация')
  }
  return user.id
}

/**
 * Получает роль пользователя из таблицы profiles.
 * Возвращает роль или null, если пользователь не аутентифицирован или профиль не найден.
 */
export async function getUserRole(): Promise<'buyer' | 'exhibitor' | 'admin' | 'partner' | 'private_person' | null> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Пытаемся получить роль из таблицы profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !profile.role) {
      return null
    }

    // Проверяем, что роль соответствует ожидаемым значениям
    const validRoles = ['buyer', 'exhibitor', 'admin', 'partner', 'private_person'] as const
    if (validRoles.includes(profile.role as any)) {
      return profile.role as 'buyer' | 'exhibitor' | 'admin' | 'partner' | 'private_person'
    }

    return null
  } catch (err) {
    console.error('Ошибка при получении роли пользователя:', err)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════
// READ: ВАКАНСИИ
// ══════════════════════════════════════════════════════════════════

/**
 * Получает список активных вакансий с фильтрами.
 * Публичный запрос — без авторизации.
 */
export async function getVacancies(
  filters: Partial<HrVacancyFilters> = {}
): Promise<HrActionResult<HrVacancy[]>> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    let query = supabase
      .from('hr_vacancies')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.employer_type) {
      query = query.eq('employer_type', filters.employer_type)
    }
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query.limit(50)

    if (error) throw error
    return { success: true, data: data as HrVacancy[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки вакансий'
    return { success: false, error: message }
  }
}

/**
 * Получает вакансии текущего работодателя (для Dashboard).
 */
export async function getMyVacancies(): Promise<HrActionResult<HrVacancy[]>> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: true, data: [] }

    const { data, error } = await supabase
      .from('hr_vacancies')
      .select('*')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data as HrVacancy[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки вакансий'
    return { success: false, error: message }
  }
}

// ══════════════════════════════════════════════════════════════════
// WRITE: ВАКАНСИИ
// ══════════════════════════════════════════════════════════════════

/**
 * Создаёт новую вакансию.
 * Перед отправкой в БД валидирует через Zod-схему.
 */
export async function createVacancy(
  formData: FormData
): Promise<HrActionResult<HrVacancy>> {
  try {
    const employerId = await requireAuth()

    // ── Zod-валидация ──────────────────────────────────────────────
    const raw = {
      title:           formData.get('title')           as string,
      description:     formData.get('description')     as string || '',
      requirements:    formData.get('requirements')    as string || '',
      category:        formData.get('category')        as string,
      location:        formData.get('location')        as string || '',
      employment_type: formData.get('employment_type') as string,
      salary_min:      formData.get('salary_min')      as string || '',
      salary_max:      formData.get('salary_max')      as string || '',
      salary_currency: formData.get('salary_currency') as string || 'RUB',
      employer_type:   formData.get('employer_type')   as string,
    }

    const parsed = vacancyFormSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Ошибка валидации'
      return { success: false, error: firstError }
    }

    const {
      title, description, requirements, category,
      location, employment_type, salary_min, salary_max,
      salary_currency, employer_type,
    } = parsed.data

    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    const { data, error } = await supabase
      .from('hr_vacancies')
      .insert({
        employer_id:    employerId,
        employer_type,
        title,
        description:    description || null,
        requirements:   requirements || null,
        category,
        location:       location || null,
        employment_type,
        salary_range: {
          min:      salary_min  ? Number(salary_min)  : null,
          max:      salary_max  ? Number(salary_max)  : null,
          currency: salary_currency,
        },
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/horeca/hr-hub')
    revalidatePath('/horeca/buyer/dashboard')
    return { success: true, data: data as HrVacancy }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания вакансии'
    return { success: false, error: message }
  }
}

/**
 * Обновляет статус вакансии (архивация, возобновление).
 */
export async function updateVacancyStatus(
  vacancyId: string,
  status: 'active' | 'draft' | 'closed'
): Promise<HrActionResult> {
  try {
    const employerId  = await requireAuth()
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    const { error } = await supabase
      .from('hr_vacancies')
      .update({ status })
      .eq('id', vacancyId)
      .eq('employer_id', employerId) // RLS guard на уровне приложения

    if (error) throw error

    revalidatePath('/horeca/hr-hub')
    revalidatePath('/horeca/buyer/dashboard')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обновления статуса'
    return { success: false, error: message }
  }
}

/**
 * Удаляет вакансию работодателя.
 */
export async function deleteVacancy(vacancyId: string): Promise<HrActionResult> {
  try {
    const employerId  = await requireAuth()
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    const { error } = await supabase
      .from('hr_vacancies')
      .delete()
      .eq('id', vacancyId)
      .eq('employer_id', employerId)

    if (error) throw error

    revalidatePath('/horeca/hr-hub')
    revalidatePath('/horeca/buyer/dashboard')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления вакансии'
    return { success: false, error: message }
  }
}

// ══════════════════════════════════════════════════════════════════
// AUTO-FILL FROM PROFILE
// ══════════════════════════════════════════════════════════════════

/**
 * Получает описание компании из профиля экспонента.
 * Используется для кнопки «Автозаполнение из профиля» в форме вакансии.
 *
 * Ищет компанию в таблице exhibitors по полю user_id = auth.uid().
 * Возвращает { description, company_name } для подстановки в форму.
 */
export async function fetchCompanyProfileForAutoFill(): Promise<
  HrActionResult<{ description: string; company_name: string }>
> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Необходима авторизация' }
    }

    // Поддержка как exhibitors, так и buyers через auth.uid()
    // Сначала ищем в exhibitors (первичный работодатель)
    const { data: exhibitor } = await supabase
      .from('exhibitors')
      .select('name, description')
      .eq('user_id', user.id)
      .maybeSingle()

    if (exhibitor) {
      return {
        success: true,
        data: {
          description:  exhibitor.description ?? '',
          company_name: exhibitor.name         ?? '',
        },
      }
    }

    // Fallback: попытка через таблицу profiles (если она существует)
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, company_description')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      return {
        success: true,
        data: {
          description:  profile.company_description ?? '',
          company_name: profile.company_name         ?? '',
        },
      }
    }

    return {
      success: false,
      error: 'Профиль компании не найден. Заполните профиль экспонента.',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки профиля'
    return { success: false, error: message }
  }
}

// ══════════════════════════════════════════════════════════════════
// READ: РЕЗЮМЕ
// ══════════════════════════════════════════════════════════════════

/**
 * Получает список активных резюме с фильтрами.
 */
export async function getResumes(
  filters: Partial<HrResumeFilters> = {}
): Promise<HrActionResult<HrResume[]>> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    let query = supabase
      .from('hr_resumes')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }
    if (filters.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,position.ilike.%${filters.search}%,skills.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query.limit(50)

    if (error) throw error
    return { success: true, data: data as HrResume[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки резюме'
    return { success: false, error: message }
  }
}

/**
 * Получает резюме текущего пользователя.
 */
export async function getMyResumes(): Promise<HrActionResult<HrResume[]>> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: true, data: [] }

    const { data, error } = await supabase
      .from('hr_resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data as HrResume[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки резюме'
    return { success: false, error: message }
  }
}

// ══════════════════════════════════════════════════════════════════
// WRITE: РЕЗЮМЕ
// ══════════════════════════════════════════════════════════════════

/**
 * Создаёт новое резюме кандидата.
 */
export async function createResume(
  formData: FormData
): Promise<HrActionResult<HrResume>> {
  try {
    const userId = await requireAuth()

    const raw = {
      full_name:        formData.get('full_name')        as string,
      position:         formData.get('position')         as string,
      contact_email:    formData.get('contact_email')    as string || '',
      contact_phone:    formData.get('contact_phone')    as string || '',
      summary:          formData.get('summary')          as string || '',
      experience:       formData.get('experience')       as string || '',
      skills:           formData.get('skills')           as string || '',
      education:        formData.get('education')        as string || '',
      category:         formData.get('category')         as string,
      location:         formData.get('location')         as string || '',
      desired_amount:   formData.get('desired_amount')   as string || '',
      desired_currency: formData.get('desired_currency') as string || 'RUB',
    }

    const parsed = resumeFormSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Ошибка валидации'
      return { success: false, error: firstError }
    }

    const {
      full_name, position, contact_email, contact_phone,
      summary, experience, skills, education,
      category, location, desired_amount, desired_currency,
    } = parsed.data

    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    const { data, error } = await supabase
      .from('hr_resumes')
      .insert({
        user_id:         userId,
        full_name,
        position,
        contact_email:   contact_email  || null,
        contact_phone:   contact_phone  || null,
        summary:         summary        || null,
        experience:      experience     || null,
        skills:          skills         || null,
        education:       education      || null,
        category,
        location:        location       || null,
        desired_salary: {
          amount:   desired_amount ? Number(desired_amount) : null,
          currency: desired_currency,
        },
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/horeca/hr-hub')
    return { success: true, data: data as HrResume }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания резюме'
    return { success: false, error: message }
  }
}

// ══════════════════════════════════════════════════════════════════
// WRITE: ОТКЛИКИ
// ══════════════════════════════════════════════════════════════════

/**
 * Создаёт отклик на вакансию.
 */
export async function applyToVacancy(
  formData: FormData
): Promise<HrActionResult<HrApplication>> {
  try {
    const applicantId = await requireAuth()

    const raw = {
      vacancy_id:   formData.get('vacancy_id')   as string,
      resume_id:    formData.get('resume_id')     as string | null || null,
      cover_letter: formData.get('cover_letter')  as string || '',
    }

    const parsed = applicationFormSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Ошибка валидации'
      return { success: false, error: firstError }
    }

    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)

    const { data, error } = await supabase
      .from('hr_applications')
      .insert({
        vacancy_id:   parsed.data.vacancy_id,
        resume_id:    parsed.data.resume_id ?? null,
        applicant_id: applicantId,
        cover_letter: parsed.data.cover_letter || null,
        status:       'pending',
      })
      .select()
      .single()

    if (error) {
      // Дублирующий отклик — уникальное ограничение
      if (error.code === '23505') {
        return { success: false, error: 'Вы уже откликались на эту вакансию' }
      }
      throw error
    }

    revalidatePath('/horeca/hr-hub')
    return { success: true, data: data as HrApplication }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка отправки отклика'
    return { success: false, error: message }
  }
}

// ══════════════════════════════════════════════════════════════════
// WRITE: ПОДПИСКИ НА КОМПАНИИ
// ══════════════════════════════════════════════════════════════════

/**
 * Подписывается на обновления вакансий от работодателя.
 */
export async function subscribeToCompany(
  employerId: string
): Promise<HrActionResult> {
  try {
    const subscriberId = await requireAuth()
    const cookieStore  = await cookies()
    const supabase     = createClient(cookieStore)

    const { error } = await supabase
      .from('hr_company_subscriptions')
      .insert({ subscriber_id: subscriberId, employer_id: employerId })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Вы уже подписаны на эту компанию' }
      }
      throw error
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка подписки'
    return { success: false, error: message }
  }
}

/**
 * Отписывается от обновлений компании.
 */
export async function unsubscribeFromCompany(
  employerId: string
): Promise<HrActionResult> {
  try {
    const subscriberId = await requireAuth()
    const cookieStore  = await cookies()
    const supabase     = createClient(cookieStore)

    const { error } = await supabase
      .from('hr_company_subscriptions')
      .delete()
      .eq('subscriber_id', subscriberId)
      .eq('employer_id', employerId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка отписки'
    return { success: false, error: message }
  }
}

/**
 * Проверяет, подписан ли текущий пользователь на компанию.
 */
export async function checkCompanySubscription(
  employerId: string
): Promise<HrActionResult<boolean>> {
  try {
    const cookieStore = await cookies()
    const supabase    = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: true, data: false }

    const { data } = await supabase
      .from('hr_company_subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('employer_id', employerId)
      .maybeSingle()

    return { success: true, data: !!data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка проверки подписки'
    return { success: false, error: message }
  }
}
