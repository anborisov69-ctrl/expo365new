'use client'

/**
 * HrHubClient.tsx — Клиентский дашборд HR Hub
 * ─────────────────────────────────────────────
 * Управляет:
 *   • Табами: Вакансии / Резюме
 *   • Фильтрами: Категория, Тип работодателя
 *   • Модальными окнами: ApplyModal, VacancyForm, ResumeForm
 *   • Локальным оптимистичным обновлением списков
 *
 * Данные получает от Server Component (page.tsx) через props.
 *
 * @module app/horeca/hr-hub/HrHubClient
 */

import { useState, useMemo, useTransition } from 'react'
import { Search, SlidersHorizontal, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { VacancyCard }  from './components/VacancyCard'
import { ResumeCard }   from './components/ResumeCard'
import { VacancyForm }  from './components/VacancyForm'
import { ResumeForm }   from './components/ResumeForm'
import { ApplyModal }   from './components/ApplyModal'
import { updateVacancyStatus } from './actions'
import {
  HR_CATEGORIES,
  HR_CATEGORY_LABELS,
} from '@/modules/hr-tech'
import type { HrVacancy, HrResume } from '@/types/hr'

// ── Типы вкладок ─────────────────────────────────────────────────────────────

type ActiveTab = 'vacancies' | 'resumes'

// ── Кнопка создания резюме ───────────────────────────────────────────────────

interface CreateResumeButtonProps {
  currentUserId: string | null
  currentUserRole?: 'buyer' | 'exhibitor' | 'admin' | 'partner' | 'private_person' | null
}

function CreateResumeButton({ currentUserId, currentUserRole }: CreateResumeButtonProps) {
  const router = useRouter()
  
  const handleCreateResume = () => {
    if (!currentUserId) {
      // Если пользователь не авторизован, перенаправить на страницу входа
      router.push('/auth/login?redirect=/dashboard/resume/edit')
      return
    }
    
    // Проверить тип пользователя "Private Individual"
    const isPrivateIndividual = currentUserRole === 'private_person'
    
    if (!isPrivateIndividual) {
      alert('Создание резюме доступно только для частных лиц (соискателей)')
      return
    }
    
    router.push('/dashboard/resume/edit')
  }
  
  return (
    <button
      type="button"
      onClick={handleCreateResume}
      className="inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#E55A1F] text-white text-sm font-black px-5 py-2.5 rounded-xl transition-colors"
    >
      <Plus className="w-4 h-4" />
      Создать резюме
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HrHubClientProps {
  initialVacancies: HrVacancy[]
  initialResumes:   HrResume[]
  currentUserId:    string | null
  currentUserRole?: 'buyer' | 'exhibitor' | 'admin' | 'partner' | 'private_person' | null
}

// ── Компонент фильтров ────────────────────────────────────────────────────────

function FilterBar({
  tab,
  categoryFilter,
  employerTypeFilter,
  searchQuery,
  onCategoryChange,
  onEmployerTypeChange,
  onSearchChange,
  onReset,
}: {
  tab:                 ActiveTab
  categoryFilter:      string
  employerTypeFilter:  string
  searchQuery:         string
  onCategoryChange:    (v: string) => void
  onEmployerTypeChange:(v: string) => void
  onSearchChange:      (v: string) => void
  onReset:             () => void
}) {
  const hasFilters = categoryFilter || employerTypeFilter || searchQuery

  const selectCls =
    'border border-[#0B2B5E]/20 rounded-xl px-3 py-2 text-sm text-slate-600 ' +
    'focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30 bg-white appearance-none ' +
    'min-w-[160px]'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Поиск */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={tab === 'vacancies' ? 'Поиск по вакансиям...' : 'Поиск по резюме...'}
          className="w-full border border-[#0B2B5E]/20 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30 bg-white"
        />
      </div>

      {/* Фильтр: Категория */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={selectCls}
        aria-label="Фильтр по категории"
      >
        <option value="">Все категории</option>
        {HR_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {HR_CATEGORY_LABELS[cat]}
          </option>
        ))}
      </select>

      {/* Фильтр: Тип работодателя (только для вакансий) */}
      {tab === 'vacancies' && (
        <select
          value={employerTypeFilter}
          onChange={(e) => onEmployerTypeChange(e.target.value)}
          className={selectCls}
          aria-label="Фильтр по типу работодателя"
        >
          <option value="">Все типы</option>
          <option value="exhibitor">Поставщики</option>
          <option value="visitor">Рестораны</option>
        </select>
      )}

      {/* Сброс фильтров */}
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0B2B5E] px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Сбросить
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ══════════════════════════════════════════════════════════════════

export function HrHubClient({
  initialVacancies,
  initialResumes,
  currentUserId,
  currentUserRole,
}: HrHubClientProps) {
  // ── Состояние ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<ActiveTab>('vacancies')
  const [vacancies, setVacancies]       = useState<HrVacancy[]>(initialVacancies)
  const [resumes, setResumes]           = useState<HrResume[]>(initialResumes)

  // Фильтры
  const [categoryFilter, setCategoryFilter]           = useState('')
  const [employerTypeFilter, setEmployerTypeFilter]   = useState('')
  const [searchQuery, setSearchQuery]                 = useState('')

  // Modal state
  const [applyTarget, setApplyTarget]     = useState<HrVacancy | null>(null)

  const [, startTransition] = useTransition()

  // ── Фильтрация вакансий (клиентская, мгновенная) ──────────────────
  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (categoryFilter     && v.category      !== categoryFilter)     return false
      if (employerTypeFilter && v.employer_type !== employerTypeFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matched =
          v.title.toLowerCase().includes(q)       ||
          (v.description ?? '').toLowerCase().includes(q) ||
          (v.company_name ?? '').toLowerCase().includes(q)
        if (!matched) return false
      }
      return true
    })
  }, [vacancies, categoryFilter, employerTypeFilter, searchQuery])

  // ── Фильтрация резюме ─────────────────────────────────────────────
  const filteredResumes = useMemo(() => {
    return resumes.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matched =
          r.full_name.toLowerCase().includes(q)    ||
          r.position.toLowerCase().includes(q)     ||
          (r.skills ?? '').toLowerCase().includes(q)
        if (!matched) return false
      }
      return true
    })
  }, [resumes, categoryFilter, searchQuery])

  // ── Архивация вакансии ────────────────────────────────────────────
  function handleArchiveVacancy(vacancyId: string) {
    startTransition(async () => {
      const result = await updateVacancyStatus(vacancyId, 'closed')
      if (result.success) {
        setVacancies((prev) => prev.filter((v) => v.id !== vacancyId))
      }
    })
  }

  // ── Сброс фильтров ────────────────────────────────────────────────
  function resetFilters() {
    setCategoryFilter('')
    setEmployerTypeFilter('')
    setSearchQuery('')
  }

  // Смена вкладки сбрасывает employer_type фильтр
  function switchTab(tab: ActiveTab) {
    setActiveTab(tab)
    setEmployerTypeFilter('')
  }

  // ── Рендер ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Табы + CTA ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Табы */}
        <div className="flex bg-white border border-[#0B2B5E]/20 rounded-2xl p-1 gap-1">
          {(
            [
              { id: 'vacancies', label: 'Вакансии',  count: vacancies.length },
              { id: 'resumes',   label: 'Резюме',    count: resumes.length   },
            ] as const
          ).map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={[
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all',
                activeTab === id
                  ? 'bg-[#0B2B5E] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#0B2B5E] hover:bg-[#0B2B5E]/6',
              ].join(' ')}
            >
              {label}
              <span
                className={[
                  'text-[11px] font-black px-1.5 py-0.5 rounded-md',
                  activeTab === id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* CTA кнопки */}
        <div className="flex gap-3">
          <CreateResumeButton
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </div>
      </div>


      {/* ── Фильтры ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#0B2B5E]/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-[#0B2B5E]" />
          <span className="text-xs font-bold text-[#0B2B5E] uppercase tracking-wider">
            Фильтры
          </span>
        </div>
        <FilterBar
          tab={activeTab}
          categoryFilter={categoryFilter}
          employerTypeFilter={employerTypeFilter}
          searchQuery={searchQuery}
          onCategoryChange={setCategoryFilter}
          onEmployerTypeChange={setEmployerTypeFilter}
          onSearchChange={setSearchQuery}
          onReset={resetFilters}
        />
      </div>

      {/* ── Счётчик результатов ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">
          {activeTab === 'vacancies'
            ? `${filteredVacancies.length} вакансий`
            : `${filteredResumes.length} резюме`}
          {(categoryFilter || employerTypeFilter || searchQuery) && (
            <span className="ml-1 text-[#F26522] font-bold">по фильтрам</span>
          )}
        </p>
      </div>

      {/* ── Список вакансий ────────────────────────────────────────────── */}
      {activeTab === 'vacancies' && (
        <>
          {filteredVacancies.length === 0 ? (
            <EmptyState
              title="Вакансий не найдено"
              description={
                categoryFilter || employerTypeFilter || searchQuery
                  ? 'Попробуйте изменить или сбросить фильтры.'
                  : 'Будьте первым — разместите вакансию для HoReCa-специалистов.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredVacancies.map((vacancy) => (
                <VacancyCard
                  key={vacancy.id}
                  vacancy={vacancy}
                  isOwner={vacancy.employer_id === currentUserId}
                  onApply={setApplyTarget}
                  onArchive={handleArchiveVacancy}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Список резюме ─────────────────────────────────────────────── */}
      {activeTab === 'resumes' && (
        <>
          {filteredResumes.length === 0 ? (
            <EmptyState
              title="Резюме не найдено"
              description={
                categoryFilter || searchQuery
                  ? 'Попробуйте изменить или сбросить фильтры.'
                  : 'Здесь появятся резюме HoReCa-специалистов.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  isOwner={resume.user_id === currentUserId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Модальное окно отклика ─────────────────────────────────────── */}
      {applyTarget && (
        <ApplyModal
          vacancy={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSuccess={() => {
            // Инкремент счётчика откликов оптимистично
            setVacancies((prev) =>
              prev.map((v) =>
                v.id === applyTarget.id
                  ? { ...v, applications_count: v.applications_count + 1 }
                  : v
              )
            )
          }}
        />
      )}
    </div>
  )
}

// ── Пустой статус ─────────────────────────────────────────────────────────────

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#0B2B5E]/20 text-center px-8">
      <div className="w-12 h-12 rounded-2xl bg-[#0B2B5E]/8 flex items-center justify-center mb-4">
        <Search className="w-6 h-6 text-[#0B2B5E]/40" />
      </div>
      <h3 className="text-sm font-black text-[#0B2B5E] mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
    </div>
  )
}
