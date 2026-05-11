'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Package, Users } from 'lucide-react'
import {
  ExtendedTenderRequest,
  ExtendedBidData,
  TenderWinnerSelection,
  PartnershipData,
  ExhibitorStats
} from '@/types/buyer-cabinet'
import { TenderView }            from '../../components/TenderView'
import { TenderNotificationService } from '../../services/tenderNotificationService'
import FinancingSolutionsSection from '@/components/tenders/FinancingSolutionsSection'
import { MOCK_TENDER_OFFERS }    from '@/data/banksData'

// Mock buyer id — в реальном проекте берётся из Supabase auth session
const MOCK_BUYER_ID = 'buyer_123'
const MOCK_BUYER_COMPANY = 'ООО «Кофе-Стрит»'

export default function TenderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenderId = params.tenderId as string
  
  const [tender, setTender] = useState<ExtendedTenderRequest | null>(null)
  const [bids, setBids] = useState<ExtendedBidData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Победитель тендера (для трёхстороннего договора) ──────────────────────
  const acceptedBid = useMemo(
    () => bids.find((b) => b.status === 'accepted') ?? null,
    [bids],
  )

  // ── Офферы банков для этого тендера ──────────────────────────────────────
  // В demo-режиме берём статические офферы, перебиндив tenderId на текущий
  const tenderFinancingOffers = useMemo(
    () => MOCK_TENDER_OFFERS.map((o) => ({ ...o, tenderId })),
    [tenderId],
  )

  useEffect(() => {
    loadTenderData()
  }, [tenderId])

  const loadTenderData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Загружаем данные тендера
      const tenderData = await fetchTenderById(tenderId)
      
      if (!tenderData) {
        setError('Тендер не найден')
        return
      }

      setTender(tenderData)

      // Загружаем отклики на тендер
      const bidsData = await fetchTenderBids(tenderId)
      setBids(bidsData)

    } catch (err) {
      console.error('Ошибка загрузки данных тендера:', err)
      setError('Не удалось загрузить данные тендера')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectWinner = async (winnerId: string, tenderId: string) => {
    try {
      const winnerSelection: TenderWinnerSelection = {
        tenderId,
        winnerId,
        winnerExhibitorName: bids.find(bid => bid.exhibitorId === winnerId)?.exhibitorName || 'Неизвестно',
        rejectedBidders: bids
          .filter(bid => bid.exhibitorId !== winnerId)
          .map(bid => ({
            exhibitorId: bid.exhibitorId,
            exhibitorName: bid.exhibitorName,
            exhibitorEmail: undefined
          })),
        selectionReason: undefined,
        selectedAt: new Date()
      }

      await updateTenderStatus(tenderId, 'completed', winnerId)
      await TenderNotificationService.sendWinnerSelectionNotifications(winnerSelection, bids)

      // Оптимистичный апдейт: статус → COMPLETED + победитель + дата закрытия
      if (tender) {
        setTender({
          ...tender,
          status:     'completed',
          winnerName: winnerSelection.winnerExhibitorName,
          closedAt:   new Date(),
          closedBy:   'buyer',
        })
      }

      setBids(prevBids =>
        prevBids.map(bid => ({
          ...bid,
          status: bid.exhibitorId === winnerId ? 'accepted' : 'rejected'
        }))
      )

      alert('Победитель выбран! Уведомления отправлены всем участникам.')

    } catch (error) {
      console.error('Ошибка при выборе победителя:', error)
      alert('Не удалось выбрать победителя. Попробуйте еще раз.')
    }
  }

  // ── Handler: buyer closes the tender ──────────────────────────────────────
  const handleCloseTender = async (currentTenderId: string) => {
    try {
      const res = await fetch('/api/tender-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId: currentTenderId,
          buyerId:  MOCK_BUYER_ID,  // TODO: replace with real auth.user.id
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Не удалось закрыть тендер')
      }

      // Optimistic local update — real-time блокировка остальных кнопок
      if (tender) {
        setTender({
          ...tender,
          status:   'closed',
          closedBy: 'buyer',
          closedAt: new Date(data.closedAt),
        })
      }

      // Блокируем все pending-отклики локально (instant feedback)
      setBids(prevBids =>
        prevBids.map(bid =>
          bid.status === 'pending' ? { ...bid, status: 'rejected' } : bid
        )
      )

    } catch (error: any) {
      console.error('[handleCloseTender]', error)
      alert(error.message ?? 'Произошла ошибка при закрытии тендера')
      throw error // пробрасываем, чтобы модальное окно оставалось открытым
    }
  }

  const handleNavigateToProfile = (exhibitorId: string) => {
    router.push(`/horeca/exhibitors/${exhibitorId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B2B5E] mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем данные тендера...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={() => router.back()}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tender) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Навигация */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-[#0B2B5E]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к списку тендеров
        </Button>

        <div className="flex items-center space-x-4">
          <Badge
            variant={tender.status === 'published' ? 'default' : 'secondary'}
            className={
              tender.status === 'published'
                ? 'bg-green-600'
                : tender.status === 'closed'
                ? 'bg-gray-400'
                : ''
            }
          >
            {tender.status === 'published'
              ? 'Активный'
              : tender.status === 'closed'
              ? 'Закрыт'
              : 'Завершен'}
          </Badge>

          {tender.status === 'published' && (
            <span className="text-sm text-gray-500">
              Создан: {tender.createdAt.toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>

      {/* Основное содержимое */}
      <TenderView
        tender={tender}
        bids={bids}
        onSelectWinner={handleSelectWinner}
        onCloseTender={handleCloseTender}
        onNavigateToProfile={handleNavigateToProfile}
      />

      {/* ── Финансовые решения ── */}
      {tender.status !== 'cancelled' && (
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, #fafbfd 0%, #f0f4fb 100%)',
            border:     '1px solid rgba(11,43,94,0.09)',
          }}
        >
          <FinancingSolutionsSection
            tenderId={tenderId}
            tenderTitle={tender.title}
            supplierId={acceptedBid?.exhibitorId}
            supplierName={acceptedBid?.exhibitorName}
            buyerId={MOCK_BUYER_ID}
            buyerCompany={MOCK_BUYER_COMPANY}
            dealAmount={
              acceptedBid?.discountedPrice
                ?? acceptedBid?.price
                ?? tender.averagePrice
                ?? tender.lowestPrice
                ?? 0
            }
            offers={tenderFinancingOffers}
          />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA FUNCTIONS - В реальном проекте заменить на API вызовы
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchTenderById(tenderId: string): Promise<ExtendedTenderRequest | null> {
  // TODO: Заменить на реальный API вызов к Supabase
  await new Promise(resolve => setTimeout(resolve, 800)) // Имитация загрузки

  const mockTender: ExtendedTenderRequest = {
    id: tenderId,
    buyerId: 'buyer_123',
    title: 'Поставка кофейного оборудования для сети кафе',
    category: 'Оборудование для кофе',
    volume: '15 единиц профессиональных кофемашин',
    desiredDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
    paymentType: 'installment',
    description: 'Требуется поставка профессиональных кофемашин для открытия новых точек сети кафе в Москве.',
    status: 'published',
    responses: [],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // -7 дней
    updatedAt: new Date(),
    totalBidsCount: 5,
    subscribedBidsCount: 2,
    averagePrice: 850000,
    lowestPrice: 720000,
    highestPrice: 950000
  }

  return mockTender
}

async function fetchTenderBids(tenderId: string): Promise<ExtendedBidData[]> {
  // TODO: Заменить на реальный API вызов к Supabase
  await new Promise(resolve => setTimeout(resolve, 600)) // Имитация загрузки

  const mockBids: ExtendedBidData[] = [
    {
      id: 'bid_1',
      tenderId,
      exhibitorId: 'exhibitor_1',
      exhibitorName: 'La Marzocco Russia',
      exhibitorLogo: '/assets/brands/la-marzocco.svg',
      price: 950000,
      discountedPrice: 850000,
      currency: 'RUB',
      deliveryTime: '21-28 рабочих дней',
      proposal: 'Предлагаем кофемашины La Marzocco серии Linea PB с полным пакетом технического обслуживания на 2 года.',
      paymentTerms: 'installment',
      attachments: ['catalog.pdf', 'warranty.pdf'],
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      exhibitorRating: 4.8,
      isPermanentPartner: true,
      isSubscribedToExhibitor: true,
      exhibitorSubscriptionTier: 'premium' as const,
      exhibitorStats: {
        exhibitorId: 'exhibitor_1',
        platformRating: 4.8,
        totalDeals: 127,
        successfulDealsPercent: 95,
        averageDeliveryTime: 25,
        responseRate: 88,
        joinedDate: new Date('2022-03-15')
      },
      partnershipData: {
        buyerId: 'buyer_123',
        exhibitorId: 'exhibitor_1',
        completedDeals: 8,
        totalVolume: 3200000,
        lastDealDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        averageRating: 4.9,
        isPermanentPartner: true
      },
      deliveryRegions: ['Москва и МО', 'Санкт-Петербург', 'Казань'],
      minimumOrderAmount: 500000
    },
    {
      id: 'bid_2',
      tenderId,
      exhibitorId: 'exhibitor_2',
      exhibitorName: 'Nuova Simonelli',
      exhibitorLogo: '/assets/brands/nuova-simonelli.svg',
      price: 720000,
      currency: 'RUB',
      deliveryTime: '14-21 рабочий день',
      proposal: 'Кофемашины Nuova Simonelli Aurelia Wave с современными технологиями контроля температуры.',
      paymentTerms: 'prepayment',
      status: 'pending',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      exhibitorRating: 4.6,
      isPermanentPartner: false,
      isSubscribedToExhibitor: true,
      exhibitorSubscriptionTier: 'premium' as const,
      exhibitorStats: {
        exhibitorId: 'exhibitor_2',
        platformRating: 4.6,
        totalDeals: 84,
        successfulDealsPercent: 92,
        averageDeliveryTime: 18,
        responseRate: 94,
        joinedDate: new Date('2023-01-20')
      },
      deliveryRegions: ['Москва и МО', 'Центральный ФО'],
      minimumOrderAmount: 300000
    },
    {
      id: 'bid_3',
      tenderId,
      exhibitorId: 'exhibitor_3',
      exhibitorName: 'Rancilio Group Russia',
      exhibitorLogo: '/assets/brands/rancilio.svg',
      price: 780000,
      discountedPrice: 740000,
      currency: 'RUB',
      deliveryTime: '28-35 рабочих дней',
      proposal: 'Профессиональные кофемашины Rancilio Classe series с расширенной гарантией.',
      paymentTerms: 'installment',
      status: 'pending',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      exhibitorRating: 4.4,
      isPermanentPartner: false,
      isSubscribedToExhibitor: false,
      exhibitorSubscriptionTier: 'base' as const,
      exhibitorStats: {
        exhibitorId: 'exhibitor_3',
        platformRating: 4.4,
        totalDeals: 56,
        successfulDealsPercent: 89,
        averageDeliveryTime: 32,
        responseRate: 76,
        joinedDate: new Date('2023-06-10')
      },
      deliveryRegions: ['Москва', 'Санкт-Петербург'],
      minimumOrderAmount: 400000
    }
  ]

  return mockBids
}

async function updateTenderStatus(
  tenderId: string,
  status: string,
  winnerId?: string
): Promise<void> {
  // TODO: Заменить на реальный API вызов к Supabase
  console.log(`Обновление статуса тендера ${tenderId} → ${status}${winnerId ? `, победитель: ${winnerId}` : ''}`)
  await new Promise(resolve => setTimeout(resolve, 500))
}