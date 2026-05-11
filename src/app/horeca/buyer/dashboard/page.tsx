'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Users, Bell, Plus, Percent } from 'lucide-react'
import { TenderCreationForm } from './components/TenderCreationForm'
import { SuppliersFeed } from './components/SuppliersFeed'
import { SpecialOffersSection } from './components/SpecialOffersSection'
import { ActiveTendersSection } from './components/ActiveTendersSection'

/**
 * BuyerDashboard — Кабинет покупателя /horeca/buyer/dashboard
 * ─────────────────────────────────────────────────────────────
 * Структура:
 *   1. Hero-баннер с CTA «Создать тендер»
 *   2. Сетка метрик (4 карточки, сетка 8px)
 *   3. Z-образный контентный грид (Поставщики / Тендеры / Спецпредложения)
 *
 * Дизайн-код:
 *   - Карточки: ds-card (rounded-xl 12px, border #E2E8F0, shadow)
 *   - Цвета: строго brand-blue #0B2B5E и brand-orange #F26522
 *   - Отступы: кратны 8px (gap-6=24px, gap-8=32px, p-6=24px)
 */
export default function BuyerDashboard() {
  const [showTenderForm, setShowTenderForm] = useState(false)
  const [stats, setStats] = useState({
    activeTenders:         3,
    supplierSubscriptions: 12,
    specialOffers:         5,
    pendingResponses:      8,
  })

  return (
    <div className="space-y-8">

      {/* ── Hero-секция ──────────────────────────────────────────────────────── */}
      <div className="ds-card p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#0B2B5E] leading-tight">
            Кабинет покупателя EXPO 365
          </h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Управляйте тендерами, отслеживайте поставщиков и получайте персональные предложения
          </p>
        </div>
        <Button
          onClick={() => setShowTenderForm(true)}
          className="bg-[#F26522] hover:bg-[#E55A1F] text-white px-6 py-3 text-sm font-black rounded-xl min-h-[48px] flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать тендер
        </Button>
      </div>

      {/* ── Метрики ──────────────────────────────────────────────────────────── */}
      {/*
       * Четыре KPI-карточки. Каждая имеет:
       *   - цветную левую акцентную полосу (brand-blue или brand-orange + tints)
       *   - единый border-radius через --radius (12px)
       *   - border: 1px solid #E2E8F0
       * Сетка gap-6 = 24px (3×8px).
       */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Активные тендеры — brand-blue */}
        <Card className="border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-[#0B2B5E]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Активные тендеры
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#0B2B5E]/8 flex items-center justify-center">
              <Package className="h-4 w-4 text-[#0B2B5E]" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black text-[#0B2B5E]">{stats.activeTenders}</div>
            <p className="text-xs text-slate-400 mt-1.5">+2 за последнюю неделю</p>
          </CardContent>
        </Card>

        {/* Подписки на поставщиков — brand-orange */}
        <Card className="border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-[#F26522]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Подписки на поставщиков
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#F26522]/8 flex items-center justify-center">
              <Users className="h-4 w-4 text-[#F26522]" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black text-[#F26522]">{stats.supplierSubscriptions}</div>
            <p className="text-xs text-slate-400 mt-1.5">Новостей за неделю: 23</p>
          </CardContent>
        </Card>

        {/* Спецпредложения — brand-blue tint */}
        <Card className="border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-[#0B2B5E]/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Спецпредложения
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#0B2B5E]/6 flex items-center justify-center">
              <Percent className="h-4 w-4 text-[#0B2B5E]/70" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black text-[#0B2B5E]/70">{stats.specialOffers}</div>
            <p className="text-xs text-slate-400 mt-1.5">Средняя скидка: 15%</p>
          </CardContent>
        </Card>

        {/* Ответы на тендеры — brand-orange tint */}
        <Card className="border [border-color:rgba(11,43,94,0.2)] border-l-4 border-l-[#F26522]/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ответы на тендеры
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#F26522]/8 flex items-center justify-center">
              <Bell className="h-4 w-4 text-[#F26522]/70" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black text-[#F26522]/70">{stats.pendingResponses}</div>
            <p className="text-xs text-slate-400 mt-1.5">Требуют рассмотрения</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Z-образный контентный грид ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка — Мои поставщики */}
        <div className="lg:col-span-1">
          <SuppliersFeed />
        </div>

        {/* Центральная колонка — Активные тендеры */}
        <div className="lg:col-span-1">
          <ActiveTendersSection />
        </div>

        {/* Правая колонка — Персональные условия */}
        <div className="lg:col-span-1">
          <SpecialOffersSection />
        </div>
      </div>

      {/* ── Модальная форма создания тендера ──────────────────────────────── */}
      {showTenderForm && (
        <TenderCreationForm
          isOpen={showTenderForm}
          onClose={() => setShowTenderForm(false)}
          onSuccess={() => {
            setShowTenderForm(false)
            setStats((prev) => ({ ...prev, activeTenders: prev.activeTenders + 1 }))
          }}
        />
      )}
    </div>
  )
}
