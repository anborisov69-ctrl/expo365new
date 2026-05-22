'use client';

/**
 * /horeca/admin/analytics — Панель Аналитики Экспонента
 * ───────────────────────────────────────────────────────
 * Client Component — управляет состоянием временного фильтра.
 *
 * Архитектура:
 *   [TimePeriod state] → getAnalyticsSnapshot() → передаётся во все виджеты
 *
 * Принципы нейминга:
 *   ЗАПРЕЩЕНО: KPI, ROI, CTR, Conversion Rate, RFQ
 *   РАЗРЕШЕНО: Новые партнёры, Сумма сделок, Интерес к новостям, Процент побед
 *
 * TODO (production):
 *   1. Заменить на Server Component + async fetch из Supabase
 *   2. Передавать exhibitorId через auth session
 *   3. Добавить Suspense boundaries для skeleton-загрузки
 */

import React, { useState, useMemo } from 'react';
import { BarChart2, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimePeriod, DateRange } from '@/types/exhibitor-analytics';
import {
  getAnalyticsSnapshot,
  getDefaultDateRange,
} from '@/data/analyticsData';

import TimeFilterBar     from './components/TimeFilterBar';
import MetricCard        from './components/MetricCard';
import DealsLineChart    from './components/DealsLineChart';
import Top10Products     from './components/Top10Products';
import ResponseTimeWidget from './components/ResponseTimeWidget';
import WinRateWidget     from './components/WinRateWidget';

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
  className?: string;
  action?:   React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl bg-white border overflow-hidden',
        '[border-color:rgba(11,43,94,0.2)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F3F4F6]">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
          {subtitle && (
            <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  // Active period state
  const [period,    setPeriod]    = useState<TimePeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange>(
    () => getDefaultDateRange('month'),
  );

  function handlePeriodChange(newPeriod: TimePeriod, newRange: DateRange) {
    setPeriod(newPeriod);
    setDateRange(newRange);
  }

  // Snapshot (in production — async Supabase fetch)
  const snapshot = useMemo(
    () => getAnalyticsSnapshot(period, dateRange),
    [period, dateRange],
  );

  // Derived win-rate data from metrics
  const winMetric = snapshot.metrics.find((m) => m.id === 'win-percent');
  const winPercent = winMetric?.rawValue  ?? 0;
  const winDelta   = winMetric?.delta     ?? '—';
  const winTrend   = winMetric?.trend     ?? 'neutral';

  return (
    <div className="space-y-6">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
              'bg-[#0B2B5E]',
            )}
          >
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827] leading-tight">
              Аналитика
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Данные по вашему стенду на EXPO 365
            </p>
          </div>
        </div>

        {/* Export stub */}
        <button
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'border border-[#E5E7EB] text-[#6B7280]',
            'hover:border-[#0B2B5E]/30 hover:text-[#0B2B5E] transition-colors',
          )}
          title="Скачать отчёт (PDF / Excel)"
          aria-label="Скачать отчёт"
        >
          <Download className="w-3.5 h-3.5" />
          Скачать отчёт
        </button>
      </div>

      {/* ── Time Filter Bar ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3',
          'rounded-2xl bg-white border [border-color:rgba(11,43,94,0.2)] px-4 py-3',
        )}
      >
        <TimeFilterBar
          active={period}
          dateRange={dateRange}
          onPeriodChange={handlePeriodChange}
        />

        {/* Refresh data stub */}
        <button
          title="Обновить данные"
          aria-label="Обновить данные"
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[#9CA3AF]',
            'border border-[#E5E7EB] hover:text-[#0B2B5E] hover:border-[#0B2B5E]/30 transition-colors',
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {/* ── Metric Cards Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {snapshot.metrics.map((metric, i) => (
          <MetricCard
            key={metric.id}
            data={metric}
            animDelay={i * 60}
          />
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Deals Line Chart — 2/3 width */}
        <Section
          className="lg:col-span-2"
          title="Сумма сделок"
          subtitle={`Всего за период: ${new Intl.NumberFormat('ru-RU', {
            style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
          }).format(snapshot.dealsChart.periodTotal)}`}
        >
          <DealsLineChart data={snapshot.dealsChart} />
        </Section>

        {/* Win Rate Donut — 1/3 width */}
        <Section
          title="Процент побед"
          subtitle="Доля выигранных тендеров"
        >
          <WinRateWidget
            percent={winPercent}
            delta={winDelta}
            trend={winTrend}
          />
        </Section>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top-10 Products — 2/3 width */}
        <Section
          className="lg:col-span-2"
          title="Топ-10 товаров"
          subtitle="По количеству просмотров и запросов цены"
          action={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0E6] text-[#F26522] text-[10px] font-semibold">
              Горячие позиции
            </span>
          }
        >
          <Top10Products products={snapshot.topProducts} />
        </Section>

        {/* Response Time — 1/3 width */}
        <Section
          title="Скорость ответа"
          subtitle="Среднее время отправки предложения"
        >
          <ResponseTimeWidget data={snapshot.responseTime} />
        </Section>
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <p className="text-center text-[11px] text-[#C4C9D4] pb-2">
        Данные обновляются каждые 24 часа · EXPO 365 Analytics
      </p>
    </div>
  );
}
