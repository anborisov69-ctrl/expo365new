'use client';

/**
 * MetricCard — карточка одного бизнес-показателя
 * ────────────────────────────────────────────────
 * Отображает: иконку, название, значение, дельту с трендом, описание.
 * 
 * Цветовой код дельты:
 *   up      → зелёный (#16A34A)
 *   down    → красный (#DC2626)
 *   neutral → серый (#6B7280)
 *
 * Принципы нейминга: ТОЛЬКО человекочитаемые метки.
 * Запрещено выводить: KPI, ROI, CTR, Conversion Rate, RFQ.
 */

import React from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetricCardData } from '@/types/exhibitor-analytics';

// ── Icon registry ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  TrendingUp,
  Newspaper,
  Trophy,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface MetricCardProps {
  data:      MetricCardData;
  /** Анимационная задержка для staggered-эффекта появления */
  animDelay?: number;
}

export default function MetricCard({ data, animDelay = 0 }: MetricCardProps) {
  const Icon = ICON_MAP[data.iconName] ?? TrendingUp;

  const trendConfig = {
    up: {
      textColor: 'text-green-600',
      bgColor:   'bg-green-50',
      Icon:      ArrowUpRight,
      label:     'рост',
    },
    down: {
      textColor: 'text-red-500',
      bgColor:   'bg-red-50',
      Icon:      ArrowDownRight,
      label:     'снижение',
    },
    neutral: {
      textColor: 'text-[#9CA3AF]',
      bgColor:   'bg-[#F3F4F6]',
      Icon:      Minus,
      label:     'без изменений',
    },
  } as const;

  const { textColor, bgColor, Icon: TrendIcon } = trendConfig[data.trend];

  return (
    <div
      style={{ animationDelay: `${animDelay}ms` }}
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl bg-white',
        'border p-5 sm:p-6',
        '[border-color:rgba(11,43,94,0.2)]',
        'animate-in fade-in slide-in-from-bottom-3 duration-300',
        // Left accent line — Deep Blue
        'before:absolute before:left-0 before:top-4 before:bottom-4',
        'before:w-[3px] before:rounded-full before:bg-[#0B2B5E]',
      )}
    >
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        {/* Icon badge */}
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
            'bg-[#0B2B5E]/8',
          )}
        >
          <Icon className="w-5 h-5 text-[#0B2B5E]" />
        </div>

        {/* Delta badge */}
        {data.delta !== '—' && (
          <span
            aria-label={`Изменение: ${data.delta}`}
            className={cn(
              'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold',
              textColor, bgColor,
            )}
          >
            <TrendIcon className="w-3 h-3 shrink-0" />
            {data.delta}
          </span>
        )}
      </div>

      {/* ── Value block ────────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide leading-none">
          {data.label}
        </p>
        <p
          className={cn(
            'text-2xl sm:text-3xl font-bold text-[#111827] leading-tight',
            // Orange highlight for "Процент побед" when performing well
            data.id === 'win-percent' && data.trend === 'up' && 'text-[#F26522]',
          )}
        >
          {data.value}
        </p>
        <p className="text-xs text-[#9CA3AF] pt-1">
          {data.description}
        </p>
      </div>
    </div>
  );
}
