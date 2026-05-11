'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Clock, 
  Users, 
  ArrowRight, 
  Package, 
  Calendar,
  Award,
  AlertCircle
} from 'lucide-react'
import { ExtendedTenderRequest } from '@/types/buyer-cabinet'

interface ActiveTendersSectionProps {
  className?: string
}

export function ActiveTendersSection({ className = '' }: ActiveTendersSectionProps) {
  const router = useRouter()
  const [tenders, setTenders] = useState<ExtendedTenderRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActiveTenders()
  }, [])

  const loadActiveTenders = async () => {
    try {
      setLoading(true)
      
      // TODO: Заменить на реальный API вызов
      const mockTenders: ExtendedTenderRequest[] = [
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
          highestPrice: 950000
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
          highestPrice: 200000
        },
        {
          id: 'tender_3',
          buyerId: 'buyer_123',
          title: 'Услуги клининга для ресторанов',
          category: 'Услуги',
          volume: '3 заведения, еженедельная уборка',
          desiredDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          paymentType: 'postpayment',
          description: 'Профессиональная уборка ресторанов',
          status: 'published',
          responses: [],
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          totalBidsCount: 3,
          subscribedBidsCount: 1,
          averagePrice: 45000,
          lowestPrice: 38000,
          highestPrice: 52000
        }
      ]
      
      setTenders(mockTenders)
      
    } catch (error) {
      console.error('Ошибка загрузки тендеров:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewTender = (tenderId: string) => {
    router.push(`/horeca/buyer/dashboard/tenders/${tenderId}`)
  }

  const getDaysUntilDeadline = (date: Date): number => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getUrgencyColor = (daysLeft: number): string => {
    if (daysLeft < 0) return 'text-gray-500'
    if (daysLeft <= 3) return 'text-red-600'
    if (daysLeft <= 7) return 'text-orange-600'
    return 'text-gray-600'
  }

  const formatTimeStatus = (daysLeft: number): { text: string; subtext: string } => {
    if (daysLeft < 0) return { text: 'ТЕНДЕР ЗАКРЫТ', subtext: '' }
    return { text: `${daysLeft} дн.`, subtext: 'до срока' }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-xl text-[#0B2B5E] flex items-center">
            <Package className="w-6 h-6 mr-2" />
            Активные тендеры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl text-[#0B2B5E] flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-6 h-6 mr-2" />
            Активные тендеры
          </div>
          <Badge variant="secondary">
            {tenders.length} активных
          </Badge>
        </CardTitle>
        <CardDescription>
          Управляйте откликами и выбирайте лучшие предложения
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {tenders.length > 0 ? (
          <div className="space-y-4">
            {tenders.map((tender) => {
              const daysLeft = getDaysUntilDeadline(tender.desiredDeliveryDate)
              const hasPartnerBids = tender.subscribedBidsCount > 0
              const timeStatus = formatTimeStatus(daysLeft)
              const isClosed = daysLeft < 0
              
              return (
                <Card key={tender.id} className="border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-[#0B2B5E]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#0B2B5E] mb-1 line-clamp-2">
                          {tender.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {tender.category} • {tender.volume}
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => handleViewTender(tender.id)}
                        size="sm"
                        className={`ml-4 ${
                          isClosed
                            ? "bg-gray-400 hover:bg-gray-500 text-white cursor-default"
                            : "bg-[#F26522] hover:bg-[#E55A1F] text-white"
                        }`}
                        disabled={false}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {isClosed ? 'Просмотр' : 'Смотреть'}
                      </Button>
                    </div>
                    
                    {/* Статистика откликов */}
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[#0B2B5E]" />
                        <div>
                          <div className="font-medium">{tender.totalBidsCount}</div>
                          <div className="text-gray-500">откликов</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-[#F26522]" />
                        <div>
                          <div className="font-medium">{tender.subscribedBidsCount}</div>
                          <div className="text-gray-500">от партнеров</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className={`w-4 h-4 ${getUrgencyColor(daysLeft)}`} />
                        <div>
                          <div className={`font-medium ${getUrgencyColor(daysLeft)} ${isClosed ? 'uppercase' : ''}`}>
                            {timeStatus.text}
                          </div>
                          {timeStatus.subtext && (
                            <div className="text-gray-500">{timeStatus.subtext}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Индикаторы и цены */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {hasPartnerBids && (
                          <Badge className="bg-[#F26522] text-white text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            Есть партнеры
                          </Badge>
                        )}
                        
                        {daysLeft <= 3 && !isClosed && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Срочно
                          </Badge>
                        )}
                        
                        {isClosed && (
                          <Badge variant="outline" className="text-xs border-gray-400 text-gray-600 bg-gray-50">
                            Read-only
                          </Badge>
                        )}
                      </div>
                      
                      {tender.lowestPrice && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Лучшая цена</div>
                          <div className="font-bold text-green-600">
                            {tender.lowestPrice.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {/* Ссылка на все тендеры */}
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => router.push('/horeca/buyer/dashboard/tenders')}
                className="w-full text-[#0B2B5E] border-[#0B2B5E] hover:bg-[#0B2B5E] hover:text-white"
              >
                Посмотреть все тендеры
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет активных тендеров
            </h3>
            <p className="text-gray-500 mb-4">
              Создайте свой первый тендер, чтобы получить предложения от поставщиков
            </p>
            <Button 
              onClick={() => router.push('/horeca/buyer/dashboard?newTender=true')}
              className="bg-[#F26522] hover:bg-[#E55A1F] text-white"
            >
              Создать тендер
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}