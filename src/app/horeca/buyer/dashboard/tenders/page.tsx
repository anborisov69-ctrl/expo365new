'use client'

/**
 * TendersListPage — Страница списка тендеров покупателя
 * ═══════════════════════════════════════════════════════
 * Табированный интерфейс: «Активные» (OPEN) / «Завершённые» (ARCHIVE / READ-ONLY)
 *
 * Вкладка «Завершённые»:
 *  - Строгий Read-Only: никаких кнопок «Повторить», «Дублировать», «Создать на основе»
 *  - Сводка: дата открытия / закрытия, итоговый статус победителя, категория и объём
 *  - DateRangePicker — фильтрация по дате закрытия через React State (без перезагрузки)
 *  - Muted-стиль карточек: граница, прозрачность, приглушённые цвета
 *
 * TODO: Заменить mock-данные на Supabase запросы с RLS.
 * TODO: Заменить setInterval-симуляцию на supabase.channel().on('postgres_changes').
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Search,
  Package,
  Users,
  Clock,
  Award,
  Eye,
  CheckCircle2,
  XCircle,
  Flame,
  Zap,
  CalendarRange,
  X,
  Trophy,
  Circle,
  CalendarDays,
} from 'lucide-react'
import { ExtendedTenderRequest } from '@/types/buyer-cabinet'

// ─── Типы ────────────────────────────────────────────────────────────────────

type ActiveTab = 'active' | 'completed'

/** Маппинг вкладки на статусы тендеров */
const TAB_STATUSES: Record<ActiveTab, string[]> = {
  active:    ['published', 'in_progress'],
  completed: ['completed', 'closed', 'cancelled'],
}

// ─── Mock данные (замена на Supabase) ────────────────────────────────────────

const MOCK_TENDERS: ExtendedTenderRequest[] = [
  {
    id: 'tender_1',
    buyerId: 'buyer_123',
    title: 'Поставка кофейного оборудования для сети кафе',
    category: 'Оборудование для кофе',
    volume: '15 единиц профессиональных кофемашин',
    desiredDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentType: 'installment',
    description: 'Поставка оборудования для расширения сети',
    status: 'published',
    responses: [],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    totalBidsCount: 5,
    subscribedBidsCount: 2,
    averagePrice: 850000,
    lowestPrice: 720000,
    highestPrice: 950000,
  },
  {
    id: 'tender_2',
    buyerId: 'buyer_123',
    title: 'Закупка кофе и расходных материалов',
    category: 'Кофе и напитки',
    volume: '500 кг кофейных зерен + расходники',
    desiredDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    paymentType: 'prepayment',
    description: 'Ежемесячная поставка кофе и расходников',
    status: 'published',
    responses: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    totalBidsCount: 8,
    subscribedBidsCount: 4,
    averagePrice: 180000,
    lowestPrice: 165000,
    highestPrice: 200000,
  },
  {
    id: 'tender_5',
    buyerId: 'buyer_123',
    title: 'Оснащение банкетного зала — посуда и инвентарь',
    category: 'Посуда и сервировка',
    volume: '200 комплектов посуды, бокалы, столовые приборы',
    desiredDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    paymentType: 'postpayment',
    description: 'Полное оснащение нового банкетного зала',
    status: 'in_progress',
    responses: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    totalBidsCount: 11,
    subscribedBidsCount: 6,
    averagePrice: 320000,
    lowestPrice: 280000,
    highestPrice: 385000,
  },
  // ── Завершённые (АРХИВ) ────────────────────────────────────────────────────
  {
    id: 'tender_3',
    buyerId: 'buyer_123',
    title: 'Услуги клининга для ресторанов',
    category: 'Услуги',
    volume: '3 заведения, еженедельная уборка',
    desiredDeliveryDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    paymentType: 'postpayment',
    description: 'Профессиональная уборка ресторанов',
    status: 'completed',
    responses: [],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    closedBy: 'buyer',
    closedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    totalBidsCount: 7,
    subscribedBidsCount: 3,
    averagePrice: 45000,
    lowestPrice: 38000,
    highestPrice: 52000,
    winnerName: 'CleanPro Services',
  },
  {
    id: 'tender_4',
    buyerId: 'buyer_123',
    title: 'Поставка мебели для кафе',
    category: 'Мебель и интерьер',
    volume: 'Столы, стулья, барная стойка',
    desiredDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    paymentType: 'installment',
    description: 'Современная мебель для нового кафе',
    status: 'closed',
    responses: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    closedBy: 'buyer',
    closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    totalBidsCount: 4,
    subscribedBidsCount: 1,
    averagePrice: undefined,
    lowestPrice: undefined,
    highestPrice: undefined,
    // winnerName не задан → «Закрыто без выбора»
  },
  {
    id: 'tender_6',
    buyerId: 'buyer_123',
    title: 'Техническое обслуживание холодильного оборудования',
    category: 'Сервис и обслуживание',
    volume: '12 холодильных витрин и 3 морозильные камеры',
    desiredDeliveryDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    paymentType: 'postpayment',
    description: 'Годовой контракт на обслуживание холодильного оборудования',
    status: 'completed',
    responses: [],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    closedBy: 'buyer',
    closedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    totalBidsCount: 6,
    subscribedBidsCount: 2,
    averagePrice: 120000,
    lowestPrice: 95000,
    highestPrice: 145000,
    winnerName: 'АрктикТехСервис',
  },
]

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function getDaysUntilDeadline(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Преобразует Date в строку «YYYY-MM-DD» для <input type="date"> */
function toInputDate(date: Date | null): string {
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

// ─── Компонент счётчика заявок (real-time pulse) ──────────────────────────────

interface LiveCounterProps {
  count: number
}
function LiveCounter({ count }: LiveCounterProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F26522] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F26522]" />
      </span>
      <span className="font-bold text-[#F26522]">{count}</span>
    </span>
  )
}

// ─── DateRangePicker — нативные date-инпуты, корпоративный стиль ─────────────

interface DateRangePickerProps {
  from: Date | null
  to: Date | null
  onChange: (from: Date | null, to: Date | null) => void
}

function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const hasFilter = from !== null || to !== null

  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val ? new Date(val + 'T00:00:00') : null, to)
  }
  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(from, val ? new Date(val + 'T23:59:59') : null)
  }
  const handleReset = () => onChange(null, null)

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 rounded-xl bg-[#F5F7FA] border border-[#D8E2EF]">
      {/* Иконка + подпись */}
      <div className="flex items-center gap-2 text-[#0B2B5E] shrink-0">
        <CalendarRange className="w-4 h-4" />
        <span className="text-sm font-semibold whitespace-nowrap">Период закрытия:</span>
      </div>

      {/* "От" */}
      <div className="flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <label className="text-xs text-gray-500 whitespace-nowrap">от</label>
        <input
          type="date"
          value={toInputDate(from)}
          max={to ? toInputDate(to) : undefined}
          onChange={handleFrom}
          className="
            px-2.5 py-1.5 text-sm border rounded-md outline-none bg-white
            border-[#CBD6E3] text-[#0B2B5E]
            focus:ring-2 focus:ring-[#0B2B5E] focus:border-[#0B2B5E]
            transition-colors
            [&::-webkit-calendar-picker-indicator]:opacity-50
            [&::-webkit-calendar-picker-indicator]:cursor-pointer
          "
        />
      </div>

      {/* Разделитель */}
      <span className="hidden sm:block text-gray-400 text-xs">—</span>

      {/* "До" */}
      <div className="flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <label className="text-xs text-gray-500 whitespace-nowrap">до</label>
        <input
          type="date"
          value={toInputDate(to)}
          min={from ? toInputDate(from) : undefined}
          onChange={handleTo}
          className="
            px-2.5 py-1.5 text-sm border rounded-md outline-none bg-white
            border-[#CBD6E3] text-[#0B2B5E]
            focus:ring-2 focus:ring-[#0B2B5E] focus:border-[#0B2B5E]
            transition-colors
            [&::-webkit-calendar-picker-indicator]:opacity-50
            [&::-webkit-calendar-picker-indicator]:cursor-pointer
          "
        />
      </div>

      {/* Сброс */}
      {hasFilter && (
        <button
          onClick={handleReset}
          title="Сбросить фильтр дат"
          className="
            ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md
            text-xs text-gray-500 border border-gray-300 bg-white
            hover:bg-gray-100 hover:text-[#0B2B5E] transition-colors
          "
        >
          <X className="w-3.5 h-3.5" />
          Сбросить
        </button>
      )}
    </div>
  )
}

// ─── Карточка активного тендера ───────────────────────────────────────────────

interface ActiveTenderCardProps {
  tender: ExtendedTenderRequest
  onView: (id: string) => void
}
function ActiveTenderCard({ tender, onView }: ActiveTenderCardProps) {
  const daysLeft = getDaysUntilDeadline(tender.desiredDeliveryDate)
  const isUrgent = daysLeft <= 3
  const hasPartners = tender.subscribedBidsCount > 0
  const isInProgress = tender.status === 'in_progress'

  return (
    <Card className="border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-[#0B2B5E]">
      <CardContent className="p-5">
        {/* Шапка карточки */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-[#0B2B5E] leading-tight">
                {tender.title}
              </h3>
              {isInProgress && (
                <Badge className="bg-blue-600 text-white text-xs shrink-0">
                  <Zap className="w-3 h-3 mr-1" />
                  В работе
                </Badge>
              )}
              {hasPartners && (
                <Badge className="bg-[#F26522] text-white text-xs shrink-0">
                  <Award className="w-3 h-3 mr-1" />
                  Есть партнёры
                </Badge>
              )}
              {isUrgent && !isInProgress && (
                <Badge variant="destructive" className="text-xs shrink-0">
                  <Flame className="w-3 h-3 mr-1" />
                  Срочно
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {tender.category} · {tender.volume}
            </p>
          </div>

          <Button
            onClick={() => onView(tender.id)}
            size="sm"
            className="bg-[#F26522] hover:bg-[#E55A1F] text-white shrink-0"
          >
            <Eye className="w-4 h-4 mr-1" />
            Смотреть
          </Button>
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t pt-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0B2B5E] shrink-0" />
            <div>
              <div className="font-semibold">{tender.totalBidsCount}</div>
              <div className="text-gray-400 text-xs">откликов</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F26522] shrink-0" />
            <div>
              <div className="font-semibold">{tender.subscribedBidsCount}</div>
              <div className="text-gray-400 text-xs">от партнёров</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 shrink-0 ${
                daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-orange-500' : 'text-gray-400'
              }`}
            />
            <div>
              <div
                className={`font-semibold ${
                  daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : ''
                }`}
              >
                {daysLeft} дн.
              </div>
              <div className="text-gray-400 text-xs">до срока</div>
            </div>
          </div>

          {tender.lowestPrice ? (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500 shrink-0" />
              <div>
                <div className="font-semibold text-green-600">
                  {tender.lowestPrice.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-gray-400 text-xs">лучшая цена</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Package className="w-4 h-4 shrink-0" />
              <div className="text-xs">Нет предложений</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Карточка завершённого тендера (READ-ONLY / ARCHIVE) ──────────────────────
//
//  ⚠️  ВАЖНО: В этом компоненте ЗАПРЕЩЕНО добавлять кнопки действий:
//             «Повторить», «Дублировать», «Создать на основе» и т.п.
//             Вкладка «Завершённые» работает ТОЛЬКО в режиме чтения (Archive Mode).

interface CompletedTenderCardProps {
  tender: ExtendedTenderRequest
  onView: (id: string) => void
}
function CompletedTenderCard({ tender, onView }: CompletedTenderCardProps) {
  const isCompleted = tender.status === 'completed'
  const hasWinner    = isCompleted && !!tender.winnerName
  const openedDate   = formatDate(new Date(tender.createdAt))
  const closedDate   = tender.closedAt ? formatDate(new Date(tender.closedAt)) : '—'

  return (
    <div className="transition-all opacity-80 hover:opacity-95">
      <Card
        className="
          border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-gray-300
          bg-gradient-to-r from-gray-50/80 to-white
        "
        style={{ filter: 'grayscale(20%)' }}
      >
        {/* ── Верхняя лента-статус ───────────────────────────────────────── */}
        <div
          className="
            flex items-center gap-2 px-4 py-1.5
            text-xs font-bold tracking-wider uppercase
            bg-gray-100 border-b border-gray-200 text-gray-500
            rounded-t-[inherit]
          "
        >
          {isCompleted ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span>Архив · Тендер закрыт</span>

          {/* Дата закрытия в правой части ленты */}
          <span className="ml-auto font-normal normal-case text-gray-400">
            Закрыт {closedDate}
          </span>
        </div>

        <CardContent className="p-5">
          {/* ── Шапка: заголовок + кнопка просмотра (Read-Only) ────────── */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-600 leading-tight mb-1">
                {tender.title}
              </h3>
              {/* Категория + объём — для быстрого визуального поиска */}
              <p className="text-sm text-gray-400">
                {tender.category}
                <span className="mx-1.5 text-gray-300">·</span>
                {tender.volume}
              </p>
            </div>

            {/* Единственная доступная кнопка — только просмотр */}
            <Button
              onClick={() => onView(tender.id)}
              size="sm"
              variant="outline"
              className="border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-[#0B2B5E] shrink-0"
            >
              <Eye className="w-4 h-4 mr-1" />
              Просмотр
            </Button>
          </div>

          {/* ── Информационная сводка ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm border-t border-gray-200 pt-4">

            {/* Блок 1: Дата открытия / закрытия */}
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Период тендера</div>
                <div className="font-medium text-gray-600 text-sm leading-tight">
                  {openedDate}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <span>→</span>
                  <span className="font-medium text-gray-500">{closedDate}</span>
                </div>
              </div>
            </div>

            {/* Блок 2: Итоговый статус победителя */}
            <div className="flex items-start gap-2">
              {hasWinner ? (
                <Trophy className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              )}
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Итог</div>
                {hasWinner ? (
                  <>
                    <div className="font-medium text-amber-700 text-sm leading-tight">
                      🏆 Победитель
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[180px]">
                      {tender.winnerName}
                    </div>
                  </>
                ) : (
                  <div className="font-medium text-gray-500 text-sm leading-tight">
                    ⚪ Закрыто без выбора
                  </div>
                )}
              </div>
            </div>

            {/* Блок 3: Откликов / Лучшая цена */}
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Участие</div>
                <div className="font-medium text-gray-600 text-sm leading-tight">
                  {tender.totalBidsCount} откликов
                </div>
                {tender.lowestPrice ? (
                  <div className="text-xs text-gray-500">
                    лучшая цена: {tender.lowestPrice.toLocaleString('ru-RU')} ₽
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">нет ценовых данных</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Главный компонент страницы ───────────────────────────────────────────────

export default function TendersListPage() {
  const router = useRouter()

  // ── Стейт ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<ActiveTab>('active')
  const [allTenders, setAllTenders]     = useState<ExtendedTenderRequest[]>([])
  const [loading, setLoading]           = useState(true)
  const [searchQuery, setSearchQuery]   = useState('')

  /** DateRange-фильтр для архивной вкладки (по полю closedAt) */
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo,   setDateTo]   = useState<Date | null>(null)

  /** Real-time счётчик новых заявок (обновляется через WebSocket / имитируется setInterval) */
  const [realtimeBidsCount, setRealtimeBidsCount] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Загрузка данных ───────────────────────────────────────────────────────
  useEffect(() => {
    loadTenders()
  }, [])

  const loadTenders = async () => {
    try {
      setLoading(true)
      // TODO: заменить на Supabase запрос с RLS:
      // const { data } = await supabase.from('tenders').select('*').eq('buyer_id', userId)
      setAllTenders(MOCK_TENDERS)

      const initialCount = MOCK_TENDERS
        .filter(t => TAB_STATUSES.active.includes(t.status))
        .reduce((acc, t) => acc + (t.totalBidsCount ?? 0), 0)
      setRealtimeBidsCount(initialCount)
    } catch (error) {
      console.error('Ошибка загрузки тендеров:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Real-time симуляция новых заявок ──────────────────────────────────────
  // TODO: Заменить на supabase.channel('bids').on('postgres_changes', ...)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (Math.random() > 0.6) {
        setRealtimeBidsCount(prev => prev + 1)
        setAllTenders(prev => {
          const activeTenders = prev.filter(t => TAB_STATUSES.active.includes(t.status))
          if (activeTenders.length === 0) return prev
          const randomIdx = Math.floor(Math.random() * activeTenders.length)
          const targetId = activeTenders[randomIdx].id
          return prev.map(t =>
            t.id === targetId
              ? { ...t, totalBidsCount: (t.totalBidsCount ?? 0) + 1 }
              : t
          )
        })
      }
    }, 8000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // ── Фильтрация ────────────────────────────────────────────────────────────

  /** Базовая выборка по вкладке */
  const tabTenders = allTenders.filter(t => TAB_STATUSES[activeTab].includes(t.status))

  /** Текстовый поиск */
  const searchedTenders = tabTenders.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  /**
   * DateRange-фильтр применяется только на вкладке «Завершённые».
   * Обновление мгновенное — через React State, без перезагрузки страницы.
   */
  const filteredTenders = activeTab === 'completed'
    ? searchedTenders.filter(t => {
        if (!t.closedAt) return true
        const closed = new Date(t.closedAt).getTime()
        if (dateFrom && closed < dateFrom.getTime()) return false
        if (dateTo   && closed > dateTo.getTime())   return false
        return true
      })
    : searchedTenders

  const activeTendersCount = allTenders.filter(t => TAB_STATUSES.active.includes(t.status)).length
  const completedTendersCount = allTenders.filter(t => TAB_STATUSES.completed.includes(t.status)).length

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleViewTender = useCallback((tenderId: string) => {
    router.push(`/horeca/buyer/dashboard/tenders/${tenderId}`)
  }, [router])

  const handleDateRange = useCallback((from: Date | null, to: Date | null) => {
    setDateFrom(from)
    setDateTo(to)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Заголовок ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-[#0B2B5E]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к dashboard
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-[#0B2B5E]">Мои тендеры</h1>
            <p className="text-sm text-gray-500">Управляйте вашими запросами на покупку</p>
          </div>
        </div>

        <Button
          onClick={() => router.push('/horeca/buyer/dashboard?newTender=true')}
          className="bg-[#F26522] hover:bg-[#E55A1F] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать тендер
        </Button>
      </div>

      {/* ── Вкладки + поиск ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-0">

        {/* Вкладки */}
        <div className="flex items-end gap-0">

          {/* Вкладка «Активные» */}
          <button
            onClick={() => setActiveTab('active')}
            className={`
              relative flex items-center gap-2 px-5 py-3 text-sm font-semibold
              transition-colors focus:outline-none
              ${activeTab === 'active'
                ? 'text-[#0B2B5E]'
                : 'text-gray-400 hover:text-[#0B2B5E]'
              }
            `}
          >
            <Package className="w-4 h-4 shrink-0" />
            Активные

            <span
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                ${activeTab === 'active'
                  ? 'bg-[#FEF3EC] text-[#F26522]'
                  : 'bg-gray-100 text-gray-500'
                }
              `}
            >
              {activeTab === 'active' ? (
                <LiveCounter count={realtimeBidsCount} />
              ) : (
                <span>{activeTendersCount}</span>
              )}
            </span>

            {activeTab === 'active' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F26522] rounded-t" />
            )}
          </button>

          {/* Вкладка «Завершённые» */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`
              relative flex items-center gap-2 px-5 py-3 text-sm font-semibold
              transition-colors focus:outline-none
              ${activeTab === 'completed'
                ? 'text-[#0B2B5E]'
                : 'text-gray-400 hover:text-[#0B2B5E]'
              }
            `}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Завершённые

            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-xs
                ${activeTab === 'completed'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-gray-100 text-gray-400'
                }
              `}
            >
              {completedTendersCount}
            </span>

            {activeTab === 'completed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F26522] rounded-t" />
            )}
          </button>
        </div>

        {/* Поиск */}
        <div className="sm:max-w-xs w-full pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === 'completed'
                  ? 'Поиск в архиве...'
                  : 'Поиск по названию или категории...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2 text-sm border rounded-md
                focus:ring-2 focus:ring-[#0B2B5E] focus:border-transparent
                outline-none bg-white
              "
            />
          </div>
        </div>
      </div>

      {/* ── DateRangePicker (только для вкладки «Завершённые») ─────────────── */}
      {activeTab === 'completed' && !loading && (
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={handleDateRange}
        />
      )}

      {/* ── Список тендеров ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTenders.length > 0 ? (
        <div className="space-y-4">
          {filteredTenders.map(tender =>
            activeTab === 'active' ? (
              <ActiveTenderCard
                key={tender.id}
                tender={tender}
                onView={handleViewTender}
              />
            ) : (
              <CompletedTenderCard
                key={tender.id}
                tender={tender}
                onView={handleViewTender}
              />
            )
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || (dateFrom || dateTo)
                ? 'Тендеры не найдены'
                : activeTab === 'active'
                  ? 'Нет активных тендеров'
                  : 'Нет завершённых тендеров'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Попробуйте изменить поисковый запрос'
                : (dateFrom || dateTo)
                  ? 'За выбранный период тендеры не найдены. Попробуйте изменить диапазон дат.'
                  : activeTab === 'active'
                    ? 'Создайте свой первый тендер, чтобы начать получать предложения от поставщиков'
                    : 'Завершённые и закрытые тендеры будут отображаться здесь'
              }
            </p>
            {activeTab === 'active' && (
              <Button
                onClick={() => router.push('/horeca/buyer/dashboard?newTender=true')}
                className="bg-[#F26522] hover:bg-[#E55A1F] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать тендер
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
