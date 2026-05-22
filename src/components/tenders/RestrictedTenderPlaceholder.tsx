'use client'

/**
 * RestrictedTenderPlaceholder.tsx — Заглушка для ограниченного доступа к тендерам
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Показывается базовым пользователям для тендеров, доступ к которым еще не открыт.
 * Включает обратный отсчет времени и предложение обновить подписку.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock,
  Lock,
  Star,
  ArrowUpCircle,
  Timer
} from 'lucide-react'
import { formatTimeRemaining } from '@/services/tenderAccessService'
import { RestrictedTenderPlaceholder as RestrictedTenderData } from '@/types/subscription-tiers'

interface RestrictedTenderPlaceholderProps {
  /** Данные ограниченного тендера */
  tenderData: RestrictedTenderData
  /** Обработчик перехода к апгрейду подписки */
  onUpgradeClick?: () => void
  /** Дополнительные CSS классы */
  className?: string
}

export function RestrictedTenderPlaceholder({
  tenderData,
  onUpgradeClick,
  className = ''
}: RestrictedTenderPlaceholderProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    formatTimeRemaining(tenderData.timeRemaining.hours + (tenderData.timeRemaining.minutes / 60))
  )
  const [totalHours, setTotalHours] = useState(tenderData.timeRemaining.hours + (tenderData.timeRemaining.minutes / 60))

  // Обновляем таймер каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      const newTotalHours = Math.max(0, totalHours - (1/60)) // уменьшаем на 1 минуту
      setTotalHours(newTotalHours)
      setTimeRemaining(formatTimeRemaining(newTotalHours))
    }, 60000) // каждые 60 секунд

    return () => clearInterval(interval)
  }, [totalHours])

  return (
    <Card className={`relative border-2 border-dashed border-gray-300 bg-gray-50/50 ${className}`}>
      {/* Оверлей с замком */}
      <div className="absolute inset-0 bg-gray-900/10 rounded-lg flex items-center justify-center z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
          <Lock className="h-6 w-6 text-gray-600" />
        </div>
      </div>

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {tenderData.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge variant="outline" className="text-gray-600">
                {tenderData.category}
              </Badge>
            </CardDescription>
          </div>

          {/* Индикатор времени */}
          <div className="flex-shrink-0 text-center">
            <div className="flex items-center gap-1 text-orange-600 font-medium">
              <Timer className="h-4 w-4" />
              <span className="text-sm">
                {timeRemaining.text}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">до открытия</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0">
        {/* Основное сообщение */}
        <div className="text-center py-6">
          <Clock className="h-10 w-10 text-orange-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">
            Доступ ограничен
          </h3>
          <p className="text-gray-600 mb-4 max-w-sm mx-auto">
            {tenderData.message}
          </p>
          
          {/* Прогресс-бар времени */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.max(5, Math.min(95, ((48 - totalHours) / 48) * 100))}%` 
              }}
            />
          </div>
        </div>

        {/* Предложение апгрейда */}
        {tenderData.canUpgrade && (
          <div className="border-t pt-4">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Star className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-orange-900 mb-1">
                    Получите мгновенный доступ
                  </h4>
                  <p className="text-sm text-orange-700 mb-3">
                    Premium подписка открывает доступ ко всем тендерам без задержки
                  </p>
                  <Button 
                    onClick={onUpgradeClick}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    size="sm"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Обновить подписку
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Дополнительная информация */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Тендер станет доступен автоматически через {timeRemaining.text}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВАРИАНТ ДЛЯ СПИСКА (КОМПАКТНЫЙ)
// ═══════════════════════════════════════════════════════════════════════════════

interface CompactRestrictedPlaceholderProps {
  tenderData: RestrictedTenderData
  onUpgradeClick?: () => void
  className?: string
}

export function CompactRestrictedPlaceholder({
  tenderData,
  onUpgradeClick,
  className = ''
}: CompactRestrictedPlaceholderProps) {
  return (
    <div className={`p-4 border border-dashed border-orange-300 rounded-lg bg-orange-50/30 relative ${className}`}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center">
        <Lock className="h-4 w-4 text-gray-500" />
      </div>

      <div className="relative opacity-60">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900 truncate">
            {tenderData.title}
          </h4>
          <Badge variant="outline">
            {tenderData.category}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Доступ через {tenderData.timeRemaining.hours}ч {tenderData.timeRemaining.minutes}м
          </span>
          {tenderData.canUpgrade && (
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                onUpgradeClick?.()
              }}
              variant="outline" 
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              Premium
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}