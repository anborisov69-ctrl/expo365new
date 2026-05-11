'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Calendar, Package, DollarSign } from 'lucide-react'
import { CreateTenderRequest, TENDER_CATEGORIES, PAYMENT_TYPES } from '@/types/buyer-cabinet'
import { SupplierRecommendations } from './SupplierRecommendations'

interface TenderCreationFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TenderCreationForm({ isOpen, onClose, onSuccess }: TenderCreationFormProps) {
  const [formData, setFormData] = useState<CreateTenderRequest>({
    title: '',
    category: '',
    volume: '',
    desiredDeliveryDate: new Date(),
    paymentType: 'prepayment',
    description: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Интеграция с API для создания тендера
      console.log('Создание тендера:', formData)
      
      // Симуляция API запроса
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      onSuccess()
    } catch (error) {
      console.error('Ошибка создания тендера:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CreateTenderRequest, value: string | Date) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-[#0B2B5E] flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Создать запрос на покупку
                </CardTitle>
                <CardDescription>
                  Опишите что вам нужно, и поставщики пришлют свои предложения
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Что ищем */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Что ищем <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Например: Профессиональные кофе-машины Rancilio"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B2B5E] focus:border-transparent"
                />
              </div>

              {/* Категория */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B2B5E] focus:border-transparent"
                >
                  <option value="">Выберите категорию</option>
                  {TENDER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Объём */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Объём заказа <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.volume}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                  placeholder="Например: 5 кофе-машин, 100 кг кофе в месяц"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B2B5E] focus:border-transparent"
                />
              </div>

              {/* Желаемый срок поставки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Желаемый срок поставки <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={formData.desiredDeliveryDate.toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('desiredDeliveryDate', new Date(e.target.value))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B2B5E] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Тип оплаты */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип оплаты <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {PAYMENT_TYPES.map(({ value, label }) => (
                    <label key={value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="paymentType"
                        value={value}
                        checked={formData.paymentType === value}
                        onChange={(e) => handleInputChange('paymentType', e.target.value as any)}
                        className="w-4 h-4 text-[#0B2B5E] focus:ring-[#0B2B5E]"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дополнительные требования
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Опишите дополнительные требования, технические характеристики, условия доставки..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0B2B5E] focus:border-transparent resize-none"
                />
              </div>

              {/* Рекомендованные поставщики */}
              {formData.category && (
                <SupplierRecommendations
                  buyerId="current-buyer-id" // TODO: получить из контекста аутентификации
                  category={formData.category}
                  volume={formData.volume}
                  onInviteSupplier={(supplierId) => {
                    console.log('Пригласить поставщика:', supplierId)
                    // TODO: Добавить поставщика в список приглашенных к тендеру
                  }}
                  onViewProfile={(supplierId) => {
                    console.log('Перейти к профилю:', supplierId)
                    // TODO: Открыть профиль поставщика в новой вкладке
                  }}
                  className="mt-6"
                />
              )}

              {/* Кнопки */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="border-gray-300"
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#F26522] hover:bg-[#E55A1F] text-white min-w-[140px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Создание...
                    </div>
                  ) : (
                    'Опубликовать запрос'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}