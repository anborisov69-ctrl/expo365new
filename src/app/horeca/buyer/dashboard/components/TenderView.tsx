'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  Filter,
  SortAsc,
  SortDesc,
  Users,
  CheckCircle,
  ExternalLink,
  Award,
  Clock,
  DollarSign,
  XCircle,
  Trophy,
  Lock,
} from 'lucide-react'
import { 
  ExtendedTenderRequest, 
  ExtendedBidData, 
  BidFilters, 
  TenderWinnerSelection,
  PAYMENT_TYPES 
} from '@/types/buyer-cabinet'
import { BidCard } from './BidCard'
import { CloseTenderModal } from '@/components/tenders/CloseTenderModal'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface TenderViewProps {
  tender: ExtendedTenderRequest
  bids: ExtendedBidData[]
  onSelectWinner: (winnerId: string, tenderId: string) => Promise<void>
  onCloseTender: (tenderId: string) => Promise<void>
  onNavigateToProfile: (exhibitorId: string) => void
  className?: string
}

export function TenderView({ 
  tender, 
  bids, 
  onSelectWinner,
  onCloseTender,
  onNavigateToProfile,
  className = '' 
}: TenderViewProps) {

  // ── Filter / sort state ────────────────────────────────────────────────────
  const [filters, setFilters] = useState<BidFilters>({
    showOnlySubscribed: false,
    sortBy: 'price',
    sortOrder: 'asc',
    minRating: undefined,
    maxPrice: undefined
  })

  const [filteredBids, setFilteredBids] = useState<ExtendedBidData[]>(bids)
  const [isSelecting, setIsSelecting]   = useState(false)
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)

  // ── Close-tender modal state ───────────────────────────────────────────────
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [isClosing, setIsClosing]           = useState(false)

  // ── Derived status ─────────────────────────────────────────────────────────
  const getTenderStatus = () => {
    const now      = new Date()
    const deadline = new Date(tender.desiredDeliveryDate)
    const isExpired = deadline.getTime() < now.getTime()

    const isClosed =
      isExpired ||
      tender.status === 'completed' ||
      tender.status === 'cancelled' ||
      tender.status === 'closed'

    return { isClosed, isExpired, status: tender.status }
  }

  const tenderStatus = getTenderStatus()

  /** Кнопку "Закрыть тендер" показываем только для активных тендеров */
  const canClose = tender.status === 'published' && !tenderStatus.isClosed

  /**
   * Режим «только чтение» — тендер завершён (выбран победитель),
   * закрыт покупателем (без выбора) или просрочен.
   * В этом режиме все фильтры и кнопки действий блокируются.
   */
  const isReadOnly = tenderStatus.isClosed

  // ── Filter / sort effect ───────────────────────────────────────────────────
  useEffect(() => {
    let result = [...bids]

    if (filters.showOnlySubscribed) {
      result = result.filter(bid => bid.isSubscribedToExhibitor)
    }
    if (filters.minRating) {
      result = result.filter(bid => bid.exhibitorRating >= filters.minRating!)
    }
    if (filters.maxPrice) {
      result = result.filter(bid =>
        (bid.discountedPrice || bid.price) <= filters.maxPrice!
      )
    }

    result.sort((a, b) => {
      const m = filters.sortOrder === 'asc' ? 1 : -1
      switch (filters.sortBy) {
        case 'price': {
          const pA = a.discountedPrice || a.price
          const pB = b.discountedPrice || b.price
          return (pA - pB) * m
        }
        case 'rating':
          return (a.exhibitorRating - b.exhibitorRating) * m
        case 'partnership': {
          const pA = a.isPermanentPartner ? 1 : 0
          const pB = b.isPermanentPartner ? 1 : 0
          return (pA - pB) * m
        }
        case 'deliveryTime':
          return a.deliveryTime.localeCompare(b.deliveryTime) * m
        default:
          return 0
      }
    })

    setFilteredBids(result)
  }, [bids, filters])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleWinnerSelection = async (exhibitorId: string) => {
    if (isSelecting) return
    setIsSelecting(true)
    setSelectedWinner(exhibitorId)
    try {
      await onSelectWinner(exhibitorId, tender.id)
    } catch (error) {
      console.error('Ошибка при выборе победителя:', error)
    } finally {
      setIsSelecting(false)
    }
  }

  const handleCloseTenderConfirm = async () => {
    setIsClosing(true)
    try {
      await onCloseTender(tender.id)
      setCloseModalOpen(false)
    } catch (error) {
      console.error('Ошибка закрытия тендера:', error)
    } finally {
      setIsClosing(false)
    }
  }

  const toggleFilter = (key: keyof BidFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleSort = () => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getPaymentTypeLabel = (paymentType: string) =>
    PAYMENT_TYPES.find(type => type.value === paymentType)?.label || paymentType

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Close-tender confirmation modal ─────────────────────────────── */}
      <CloseTenderModal
        tenderTitle={tender.title}
        isOpen={closeModalOpen}
        isLoading={isClosing}
        onConfirm={handleCloseTenderConfirm}
        onCancel={() => setCloseModalOpen(false)}
      />

      <div className={`space-y-6 ${className}`}>

        {/* ── Tender header card ─────────────────────────────────────────── */}
        <Card className="border-l-4 border-l-[#0B2B5E]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl text-[#0B2B5E] mb-2">
                  {tender.title}
                </CardTitle>
                <CardDescription className="text-base">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <span className="text-gray-500">Категория:</span>
                      <div className="font-medium">{tender.category}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Объем:</span>
                      <div className="font-medium">{tender.volume}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Срок поставки:</span>
                      <div className="font-medium">
                        {tender.desiredDeliveryDate.toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Оплата:</span>
                      <div className="font-medium">
                        {getPaymentTypeLabel(tender.paymentType)}
                      </div>
                    </div>
                  </div>
                </CardDescription>
              </div>

              {/* ── Status + Close button ──────────────────────────────── */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* Status badge */}
                {tender.status === 'closed' ? (
                  <Badge
                    variant="outline"
                    className="border-gray-400 text-gray-600 bg-gray-50 uppercase font-medium"
                  >
                    ТЕНДЕР ЗАКРЫТ
                  </Badge>
                ) : tenderStatus.isClosed ? (
                  <Badge
                    variant="outline"
                    className="border-gray-400 text-gray-600 bg-gray-50 uppercase font-medium"
                  >
                    ТЕНДЕР ЗАКРЫТ
                  </Badge>
                ) : (
                  <Badge variant="secondary">Активный</Badge>
                )}

                {tender.status === 'closed' && tender.closedAt && (
                  <p className="text-xs text-gray-400">
                    {tender.closedAt.toLocaleDateString('ru-RU', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}

                {/* Bids count */}
                <div className="text-sm text-gray-500">
                  Откликов: {tender.totalBidsCount}
                </div>
                {tender.subscribedBidsCount > 0 && (
                  <div className="text-sm text-[#F26522]">
                    От подписок: {tender.subscribedBidsCount}
                  </div>
                )}
                {tenderStatus.isExpired && tender.status !== 'closed' && (
                  <div className="text-xs text-gray-500">Read-only режим</div>
                )}

                {/* ── "Закрыть тендер" button — outline/neutral ─────────── */}
                {canClose && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCloseModalOpen(true)}
                    className="mt-1 border-gray-400 text-gray-600 hover:border-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Закрыть тендер
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* ── Filter panel ──────────────────────────────────────────────── */}
        <Card className={isReadOnly ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="text-lg text-[#0B2B5E] flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Фильтры и сортировка
              {/* Lock-иконка в заголовке панели когда режим read-only */}
              {isReadOnly && (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  Режим просмотра
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Subscribed only */}
              <Button
                variant={filters.showOnlySubscribed ? 'default' : 'outline'}
                size="sm"
                disabled={isReadOnly}
                onClick={() => toggleFilter('showOnlySubscribed', !filters.showOnlySubscribed)}
                className={`${filters.showOnlySubscribed ? 'bg-[#F26522] hover:bg-[#E55A1F]' : ''} ${isReadOnly ? 'cursor-not-allowed' : ''}`}
              >
                <Users className="w-4 h-4 mr-2" />
                Только подписки
                {tender.subscribedBidsCount > 0 && (
                  <span className="ml-2 bg-white text-[#F26522] rounded-full px-2 py-1 text-xs">
                    {tender.subscribedBidsCount}
                  </span>
                )}
              </Button>

              {/* Sort select */}
              <div className="flex items-center gap-2">
                <select
                  value={filters.sortBy}
                  disabled={isReadOnly}
                  onChange={e => toggleFilter('sortBy', e.target.value as any)}
                  className={`border rounded px-3 py-1 text-sm ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                >
                  <option value="price">По цене</option>
                  <option value="rating">По рейтингу</option>
                  <option value="partnership">По партнерству</option>
                  <option value="deliveryTime">По сроку доставки</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={toggleSort}
                >
                  {filters.sortOrder === 'asc'
                    ? <SortAsc className="w-4 h-4" />
                    : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>

              {/* Min rating */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Мин. рейтинг:</span>
                <select
                  value={filters.minRating || ''}
                  disabled={isReadOnly}
                  onChange={e =>
                    toggleFilter('minRating', e.target.value ? Number(e.target.value) : undefined)
                  }
                  className={`border rounded px-2 py-1 text-sm ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                >
                  <option value="">Любой</option>
                  <option value="3">3+ звезд</option>
                  <option value="4">4+ звезд</option>
                  <option value="4.5">4.5+ звезд</option>
                </select>
              </div>

              {/* Reset filters — скрываем в read-only режиме */}
              {!isReadOnly && (filters.showOnlySubscribed || filters.minRating || filters.maxPrice) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      showOnlySubscribed: false,
                      sortBy: 'price',
                      sortOrder: 'asc',
                      minRating: undefined,
                      maxPrice: undefined
                    })
                  }
                >
                  Сбросить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        {filteredBids.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Средняя цена</p>
                    <p className="text-lg font-bold text-[#0B2B5E]">
                      {tender.averagePrice?.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-[#0B2B5E] opacity-60" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Лучшая цена</p>
                    <p className="text-lg font-bold text-green-600">
                      {tender.lowestPrice?.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600 opacity-60" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Партнеры</p>
                    <p className="text-lg font-bold text-[#F26522]">
                      {filteredBids.filter(bid => bid.isPermanentPartner).length}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-[#F26522] opacity-60" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Completed banner (победитель выбран) ──────────────────────── */}
        {tender.status === 'completed' && (
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">
                  Тендер завершён — предложение принято
                </p>
                {tender.winnerName ? (
                  <p className="text-sm text-green-700 mt-0.5">
                    🏆 Победитель: <span className="font-medium">{tender.winnerName}</span>
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-0.5">
                    Информация о победителе не указана.
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {tender.closedAt
                  ? tender.closedAt.toLocaleDateString('ru-RU', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })
                  : ''
                }
              </span>
            </CardContent>
          </Card>
        )}

        {/* ── Closed banner (закрыт без победителя) ────────────────────── */}
        {tender.status === 'closed' && (
          <Card className="border [border-color:rgba(11,43,94,0.2)] bg-gray-50">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Тендер закрыт без выбора победителя. Кнопки отклика для поставщиков заблокированы.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Bids list ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {filteredBids.length > 0 ? (
            filteredBids.map(bid => (
              <BidCard
                key={bid.id}
                bid={bid}
                onSelectWinner={() => handleWinnerSelection(bid.exhibitorId)}
                onViewProfile={() => onNavigateToProfile(bid.exhibitorId)}
                isSelecting={isSelecting && selectedWinner === bid.exhibitorId}
                // Блокируем отклик если тендер закрыт, завершён или экспонент уже выбран
                disabled={
                  isSelecting ||
                  tender.status !== 'published' ||
                  tenderStatus.isClosed
                }
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">
                  {bids.length === 0
                    ? 'На этот тендер пока нет откликов'
                    : 'Нет откликов, соответствующих выбранным фильтрам'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
