'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Bell, ExternalLink, Calendar, Star } from 'lucide-react'
import { BuyerSubscription, SupplierNews } from '@/types/buyer-cabinet'
import Image from 'next/image'

export function SuppliersFeed() {
  const [subscriptions, setSubscriptions] = useState<BuyerSubscription[]>([])
  const [recentNews, setRecentNews] = useState<SupplierNews[]>([])
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'news'>('news')

  // Заглушка данных для демонстрации
  useEffect(() => {
    const mockSubscriptions: BuyerSubscription[] = [
      {
        id: '1',
        buyerId: 'buyer-1',
        exhibitorId: 'rancilio',
        exhibitorName: 'Rancilio Group',
        exhibitorLogo: '/assets/brands/rancilio.svg',
        subscriptionDate: new Date('2024-01-15'),
        isActive: true
      },
      {
        id: '2',
        buyerId: 'buyer-1',
        exhibitorId: 'la-marzocco',
        exhibitorName: 'La Marzocco',
        exhibitorLogo: '/assets/brands/la-marzocco.svg',
        subscriptionDate: new Date('2024-02-10'),
        isActive: true
      },
      {
        id: '3',
        buyerId: 'buyer-1',
        exhibitorId: 'julius-meinl',
        exhibitorName: 'Julius Meinl',
        exhibitorLogo: '/assets/brands/julius-meinl.svg',
        subscriptionDate: new Date('2024-02-20'),
        isActive: true
      },
      {
        id: '4',
        buyerId: 'buyer-1',
        exhibitorId: 'dalla-corte',
        exhibitorName: 'Dalla Corte',
        exhibitorLogo: '/assets/brands/dalla-corte.svg',
        subscriptionDate: new Date('2024-03-05'),
        isActive: true
      }
    ]

    const mockNews: SupplierNews[] = [
      {
        id: '1',
        exhibitorId: 'rancilio',
        exhibitorName: 'Rancilio Group',
        exhibitorLogo: '/assets/brands/rancilio.svg',
        title: 'Новые модели Rancilio Classe 20 уже в продаже',
        content: 'Представляем новую линейку профессиональных кофе-машин с улучшенной системой контроля температуры и давления.',
        publishedAt: new Date('2024-05-08'),
        isPromoted: true
      },
      {
        id: '2',
        exhibitorId: 'julius-meinl',
        exhibitorName: 'Julius Meinl',
        exhibitorLogo: '/assets/brands/julius-meinl.svg',
        title: 'Сезонная коллекция кофе "Весна 2024"',
        content: 'Эксклюзивные сорта кофе с плантаций Эфиопии и Коста-Рики. Ограниченная серия для наших партнеров.',
        publishedAt: new Date('2024-05-07'),
        isPromoted: false
      },
      {
        id: '3',
        exhibitorId: 'la-marzocco',
        exhibitorName: 'La Marzocco',
        exhibitorLogo: '/assets/brands/la-marzocco.svg',
        title: 'Обучающий семинар по настройке Linea PB',
        content: 'Бесплатный мастер-класс для владельцев кофе-машин La Marzocco. Регистрация до 15 мая.',
        publishedAt: new Date('2024-05-06'),
        isPromoted: false
      }
    ]

    setSubscriptions(mockSubscriptions)
    setRecentNews(mockNews)
  }, [])

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-[#0B2B5E] flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Мои поставщики
        </CardTitle>
        <CardDescription>
          Отслеживайте новости и обновления от ваших поставщиков
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Переключатель вкладок */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'news'
                ? 'bg-white text-[#0B2B5E] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Новости
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'bg-white text-[#0B2B5E] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Подписки ({subscriptions.length})
          </button>
        </div>

        {/* Содержимое вкладок */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {recentNews.map((news) => (
              <div key={news.id} className="border rounded-2xl p-4 transition-all duration-200" style={{ borderColor: 'rgba(11,43,94,0.2)' }}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
                    {news.exhibitorLogo && (
                      <Image
                        src={news.exhibitorLogo}
                        alt={news.exhibitorName}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {news.exhibitorName}
                      </h4>
                      {news.isPromoted && (
                        <Star className="w-4 h-4 text-[#F26522]" />
                      )}
                    </div>
                    <h5 className="font-medium text-[#0B2B5E] mb-2 line-clamp-2">
                      {news.title}
                    </h5>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {news.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {news.publishedAt.toLocaleDateString('ru-RU')}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-[#0B2B5E] hover:text-[#F26522] h-auto p-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full mt-4 border-[#0B2B5E] text-[#0B2B5E] hover:bg-[#0B2B5E] hover:text-white"
            >
              Показать все новости
            </Button>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            {/* Сетка логотипов поставщиков */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {subscriptions.map((subscription) => (
                <div 
                  key={subscription.id}
                  className="aspect-square bg-white rounded-lg border-2 hover:border-[#0B2B5E] transition-colors cursor-pointer p-3 flex items-center justify-center group"
                >
                  {subscription.exhibitorLogo && (
                    <Image
                      src={subscription.exhibitorLogo}
                      alt={subscription.exhibitorName}
                      width={40}
                      height={40}
                      className="object-contain group-hover:scale-110 transition-transform"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Список подписок */}
            <div className="space-y-3">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded border flex items-center justify-center">
                      {subscription.exhibitorLogo && (
                        <Image
                          src={subscription.exhibitorLogo}
                          alt={subscription.exhibitorName}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {subscription.exhibitorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Подписка с {subscription.subscriptionDate.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Активна
                  </Badge>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4 border-[#F26522] text-[#F26522] hover:bg-[#F26522] hover:text-white"
            >
              Найти новых поставщиков
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}