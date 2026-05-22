'use server'

/**
 * app/horeca/admin/news/actions.ts — Server Actions модуля управления новостями
 * ──────────────────────────────────────────────────────────────────────────────
 * Все мутации и запросы выполняются на сервере через Supabase SSR.
 * Каждый action использует createClient(cookieStore) для сессионного
 * контекста и проверяет аутентификацию перед операциями записи.
 *
 * @module app/horeca/admin/news/actions
 */

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { IndustryTag, PromoType } from '@/constants/newsData'

// ══════════════════════════════════════════════════════════════════
// ТИПЫ
// ══════════════════════════════════════════════════════════════════

export type NewsStatus = 'published' | 'draft' | 'scheduled'

export interface NewsFormData {
  title: string
  category: Exclude<IndustryTag, 'all'>
  promoType: Exclude<PromoType, 'all'>
  text: string
  imageUrl: string | null
  publishDate: string // YYYY-MM-DD
  exhibitorId?: string
}

export interface NewsActionResult {
  success: boolean
  error?: string
  data?: any
}

// ══════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ══════════════════════════════════════════════════════════════════

/** Возвращает ID аутентифицированного пользователя или выбрасывает */
async function requireAuth(): Promise<string> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Необходима авторизация')
  }
  return user.id
}

/** Определяет статус новости на основе даты публикации и флага черновика */
function resolveStatus(publishDate: string, isDraft: boolean = false): NewsStatus {
  if (isDraft) return 'draft'
  
  const today = new Date().toISOString().slice(0, 10)
  if (publishDate > today) return 'scheduled'
  return 'published'
}

// ══════════════════════════════════════════════════════════════════
// ДЕЙСТВИЯ
// ══════════════════════════════════════════════════════════════════

/**
 * Создание новости (черновик или публикация)
 */
export async function createNews(
  formData: NewsFormData,
  isDraft: boolean = false
): Promise<NewsActionResult> {
  try {
    const userId = await requireAuth()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Получаем профиль пользователя для определения exhibitorId
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, exhibitor_id')
      .eq('id', userId)
      .single()

    if (!profile) {
      return { success: false, error: 'Профиль не найден' }
    }

    // Определяем статус
    const status = resolveStatus(formData.publishDate, isDraft)

    // Вставляем запись в таблицу news
    const { data, error } = await supabase
      .from('news')
      .insert({
        title: formData.title,
        category: formData.category,
        promo_type: formData.promoType,
        content: formData.text,
        image_url: formData.imageUrl,
        status: status,
        publish_date: formData.publishDate,
        exhibitor_id: formData.exhibitorId || profile.exhibitor_id,
        created_by: userId,
        views: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Ошибка создания новости:', error)
      return { success: false, error: error.message }
    }

    // Ревалидация путей для обновления кэша
    revalidatePath('/horeca/admin/news')
    revalidatePath('/horeca')
    revalidatePath('/horeca/news')
    revalidatePath('/')

    return { success: true, data }
  } catch (error: any) {
    console.error('Ошибка в createNews:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Обновление новости
 */
export async function updateNews(
  newsId: string,
  formData: Partial<NewsFormData>,
  isDraft: boolean = false
): Promise<NewsActionResult> {
  try {
    await requireAuth()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (formData.title !== undefined) updateData.title = formData.title
    if (formData.category !== undefined) updateData.category = formData.category
    if (formData.promoType !== undefined) updateData.promo_type = formData.promoType
    if (formData.text !== undefined) updateData.content = formData.text
    if (formData.imageUrl !== undefined) updateData.image_url = formData.imageUrl
    if (formData.publishDate !== undefined) {
      updateData.publish_date = formData.publishDate
      updateData.status = resolveStatus(formData.publishDate, isDraft)
    }

    const { data, error } = await supabase
      .from('news')
      .update(updateData)
      .eq('id', newsId)
      .select()
      .single()

    if (error) {
      console.error('Ошибка обновления новости:', error)
      return { success: false, error: error.message }
    }

    // Ревалидация путей для обновления кэша
    revalidatePath('/horeca/admin/news')
    revalidatePath('/horeca')
    revalidatePath('/horeca/news')
    revalidatePath('/')

    return { success: true, data }
  } catch (error: any) {
    console.error('Ошибка в updateNews:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Публикация новости (изменение статуса на published)
 */
export async function publishNews(newsId: string): Promise<NewsActionResult> {
  try {
    await requireAuth()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('news')
      .update({
        status: 'published',
        publish_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', newsId)
      .select()
      .single()

    if (error) {
      console.error('Ошибка публикации новости:', error)
      return { success: false, error: error.message }
    }

    // Ревалидация путей для обновления кэша
    revalidatePath('/horeca/admin/news')
    revalidatePath('/horeca')
    revalidatePath('/horeca/news')
    revalidatePath('/')

    return { success: true, data }
  } catch (error: any) {
    console.error('Ошибка в publishNews:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Удаление новости
 */
export async function deleteNews(newsId: string): Promise<NewsActionResult> {
  try {
    await requireAuth()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', newsId)

    if (error) {
      console.error('Ошибка удаления новости:', error)
      return { success: false, error: error.message }
    }

    // Ревалидация путей для обновления кэша
    revalidatePath('/horeca/admin/news')
    revalidatePath('/horeca')
    revalidatePath('/horeca/news')
    revalidatePath('/')

    return { success: true }
  } catch (error: any) {
    console.error('Ошибка в deleteNews:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Получение списка новостей для администратора
 */
export async function getAdminNews(
  filters?: {
    status?: NewsStatus | 'all'
    category?: IndustryTag | 'all'
    search?: string
  }
): Promise<NewsActionResult> {
  try {
    await requireAuth()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    let query = supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Ошибка получения новостей:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Ошибка в getAdminNews:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Получение публичных новостей для ленты
 */
export async function getPublicNews(limit: number = 20): Promise<NewsActionResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('status', 'published')
      .lte('publish_date', new Date().toISOString().slice(0, 10))
      .order('publish_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Ошибка получения публичных новостей:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Ошибка в getPublicNews:', error)
    return { success: false, error: error.message }
  }
}