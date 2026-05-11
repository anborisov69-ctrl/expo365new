'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Percent, Clock, Gift, Tag, ArrowRight } from 'lucide-react'
import { SpecialTerm } from '@/types/buyer-cabinet'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEcosystemStore } from '@/store/ecosystemStore'

export function SpecialOffersSection() {
  const [specialTerms, setSpecialTerms] = useState<SpecialTerm[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  // Функция принятия предложения от поставщика
  const handleAcceptOffer = async (term: SpecialTerm) => {
    try {
      // Формируем черновик умного контракта с данными о скидке
      const contractDraft = {
        buyerId: user?.id || 'anonymous-buyer',
        exhibitorId: term.exhibitorId,
        financials: {
          discountPercent: term.discountType === 'percentage' ? term.discountValue : 0,
          discountAmount: term.discountType === 'fixed' ? term.discountValue : 0,
          paymentType: 'deferred' as 'deferred' | 'installment',
          initialPayment: 0, // Для спецпредложений без рассрочки
          installmentsCount: 1 // Единовременный платеж по спецпредложению
        },
        status: 'DRAFT_PENDING_DOCS'
      }

      // Отправляем в глобальный стор
      await useEcosystemStore.getState().initializeSmartContract(contractDraft)

      // Перенаправляем в интерфейс умного контракта
      router.push(`/horeca/contracts/preview/${term.exhibitorId}`)

    } catch (error) {
      console.error("Ошибка при принятии предложения:", error)
    }
  }

  // Заглушка данных для демонстрации
  useEffect(() => {
    const mockSpecialTerms: SpecialTerm[] = [
      {
        id: '1',
        exhibitorId: 'rancilio',
        buyerId: 'buyer-1',
        exhibitorName: 'Rancilio Group',
        exhibitorLogo: '/assets/brands/rancilio.svg',
        discountType: 'percentage',
        discountValue: 15,
        description: 'Скидка 15% на все кофе-машины при заказе от 3 единиц',
        validUntil: new Date('2024-06-30'),
        minOrderAmount: 150000,
        currency: 'RUB',
        productCategories: ['Оборудование для кофе'],
        isActive: true,
        createdAt: new Date('2024-05-01')
      },
      {
        id: '2',
        exhibitorId: 'julius-meinl',
        buyerId: 'buyer-1',
        exhibitorName: 'Julius Meinl',
        exhibitorLogo: '/assets/brands/julius-meinl.svg',
        discountType: 'fixed',
        discountValue: 5000,
        currency: 'RUB',
        description: 'Фиксированная скидка 5000₽ на первый заказ кофе',
        validUntil: new Date('2024-07-15'),
        minOrderAmount: 25000,
        productCategories: ['Кофе и напитки'],
        isActive: true,
        createdAt: new Date('2024-04-28')
      },
      {
        id: '3',
        exhibitorId: 'dalla-corte',
        buyerId: 'buyer-1',
        exhibitorName: 'Dalla Corte',
        exhibitorLogo: '/assets/brands/dalla-corte.svg',
        discountType: 'percentage',
        discountValue: 20,
        description: 'Эксклюзивная скидка 20% на новую линейку Evo2',
        validUntil: new Date('2024-05-31'),
        minOrderAmount: 200000,
        currency: 'RUB',
        productCategories: ['Оборудование для кофе'],
        isActive: true,
        createdAt: new Date('2024-05-05')
      },
      {
        id: '4',
        exhibitorId: 'la-marzocco',
        buyerId: 'buyer-1',
        exhibitorName: 'La Marzocco',
        exhibitorLogo: '/assets/brands/la-marzocco.svg',
        discountType: 'percentage',
        discountValue: 12,
        description: 'Скидка 12% + бесплатное обучение персонала',
        validUntil: new Date('2024-08-01'),
        minOrderAmount: 300000,
        currency: 'RUB',
        productCategories: ['Оборудование для кофе', 'Услуги'],
        isActive: true,
        createdAt: new Date('2024-04-20')
      },
      {
        id: '5',
        exhibitorId: 'anfim',
        buyerId: 'buyer-1',
        exhibitorName: 'Anfim',
        exhibitorLogo: '/assets/brands/anfim.svg',
        discountType: 'fixed',
        discountValue: 8000,
        currency: 'RUB',
        description: 'Кешбэк 8000₽ при покупке кофемолки + аксессуары в подарок',
        validUntil: new Date('2024-06-15'),
        minOrderAmount: 50000,
        productCategories: ['Оборудование для кофе'],
        isActive: true,
        createdAt: new Date('2024-05-03')
      }
    ]

    setTimeout(() => {
      setSpecialTerms(mockSpecialTerms)
      setLoading(false)
    }, 1000)
  }, [])

  const formatDiscount = (term: SpecialTerm) => {
    if (term.discountType === 'percentage') {
      return `${term.discountValue}%`
    } else {
      return `${term.discountValue.toLocaleString()} ${term.currency}`
    }
  }

  const formatValidUntil = (date: Date) => {
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'ПРЕДЛОЖЕНИЕ ЗАКРЫТО'
    if (diffDays === 0) return 'Истекает сегодня'
    if (diffDays === 1) return 'Истекает завтра'
    if (diffDays < 7) return `${diffDays} дней`
    return date.toLocaleDateString('ru-RU')
  }

  const getUrgencyColor = (date: Date) => {
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'text-red-600'
    if (diffDays <= 3) return 'text-red-500'
    if (diffDays <= 7) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-[#0B2B5E] flex items-center">
          <Gift className="w-5 h-5 mr-2" />
          Ваши персональные условия
        </CardTitle>
        <CardDescription>
          Специальные предложения от ваших поставщиков
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {specialTerms.map((term) => (
              <div 
                key={term.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-orange-50/30"
              >
                <div className="flex items-start space-x-3">
                  {/* Логотип поставщика */}
                  <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
                    {term.exhibitorLogo && (
                      <Image
                        src={term.exhibitorLogo}
                        alt={term.exhibitorName}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    )}
                  </div>

                  {/* Основной контент */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {term.exhibitorName}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className="bg-[#F26522]/10 text-[#F26522] border-[#F26522]/20"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {formatDiscount(term)}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {term.description}
                    </p>

                    {/* Условия */}
                    <div className="space-y-2 mb-3">
                      {term.minOrderAmount && (
                        <div className="flex items-center text-xs text-gray-600">
                          <Percent className="w-3 h-3 mr-1" />
                          Минимальный заказ: {term.minOrderAmount.toLocaleString()} ₽
                        </div>
                      )}
                      
                      <div className="flex items-center text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        <span className={getUrgencyColor(term.validUntil)}>
                          Действует до: {formatValidUntil(term.validUntil)}
                        </span>
                      </div>

                      {term.productCategories && term.productCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {term.productCategories.map((category, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs text-gray-600 border-gray-300"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Кнопка действия */}
                    <Button
                      size="sm"
                      onClick={() => handleAcceptOffer(term)}
                      className="bg-[#F26522] hover:bg-[#E55A1F] text-white text-xs h-8"
                    >
                      Принять предложение
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Статистика предложений */}
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#0B2B5E]">
                    {specialTerms.length}
                  </div>
                  <div className="text-xs text-gray-600">Активных предложений</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#F26522]">
                    {Math.round(specialTerms.reduce((acc, term) => {
                      return acc + (term.discountType === 'percentage' ? term.discountValue : 0)
                    }, 0) / specialTerms.filter(t => t.discountType === 'percentage').length)}%
                  </div>
                  <div className="text-xs text-gray-600">Средняя скидка</div>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4 border-[#0B2B5E] text-[#0B2B5E] hover:bg-[#0B2B5E] hover:text-white"
            >
              Посмотреть архив предложений
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}