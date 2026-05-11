'use client';

/**
 * WinRateWidget — виджет «Процент побед» (доля выигранных тендеров)
 * ──────────────────────────────────────────────────────────────────
 * Визуализирует долю выигранных тендеров через:
 *   - Круговую SVG-диаграмму (donut-chart)
 *   - Процент в центре большими символами
 *   - Легенду: Победы / Поражения / Всего
 *
 * Цветовая схема:
 *   Победы     → #F26522 (Orange)
 *   Поражения  → #E5E7EB (Light Gray)
 *   Deep Blue  → акцент на статистике
 *
 * ВАЖНО: «Процент побед» — НЕ «Win Rate» / «Conversion Rate».
 * Всегда используй человекочитаемые русские термины.
 */

import React from 'react';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Donut SVG ─────────────────────────────────────────────────────────────────

interface DonutProps {
  percent: number;    // 0–100
  size?:   number;    // px
  stroke?: number;    // ширина кольца
}

function DonutChart({ percent, size = 120, stroke = 14 }: DonutProps) {
  const radius      = (size - stroke) / 2;
  const circumf     = 2 * Math.PI * radius;
  const filled      = (percent / 100) * circumf;
  const center      = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Процент побед: ${percent}%`}
      role="img"
    >
      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={stroke}
      />

      {/* Progress arc — Orange #F26522 */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#F26522"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumf}`}
        strokeDashoffset={circumf * 0.25}  /* start from top */
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />

      {/* Center text — percent */}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="700"
        fill="#111827"
        fontFamily="inherit"
      >
        {percent > 0 ? `${percent}%` : '—'}
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fill="#9CA3AF"
        fontFamily="inherit"
      >
        побед
      </text>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WinRateWidgetProps {
  /** Процент побед 0–100 */
  percent: number;
  /** Дельта vs. предыдущий период, напр. "+5%" */
  delta:   string;
  trend:   'up' | 'down' | 'neutral';
}

export default function WinRateWidget({ percent, delta, trend }: WinRateWidgetProps) {
  // Derived stats (mock — in production from tender_responses aggregate)
  const total    = percent > 0 ? Math.round(100 / percent * 24) : 0;  // example total
  const won      = Math.round(total * percent / 100);
  const lost     = total - won;

  const isGood   = percent >= 60;
  const trendCol = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-[#9CA3AF]';

  return (
    <div className="flex flex-col gap-5">

      {/* ── Donut + delta ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6">
        <DonutChart percent={percent} />

        <div className="space-y-2">
          {/* Delta */}
          <div className={cn('flex items-center gap-1 text-sm font-semibold', trendCol)}>
            <TrendingUp className="w-4 h-4" />
            {delta}
            <span className="text-[#9CA3AF] text-xs font-normal">vs прошлый период</span>
          </div>

          {/* Status label */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
              isGood
                ? 'bg-[#FFF0E6] text-[#F26522]'
                : 'bg-[#F3F4F6] text-[#6B7280]',
            )}
          >
            {isGood ? (
              <>
                <Trophy className="w-3.5 h-3.5" />
                Отличный результат
              </>
            ) : (
              <>
                <Target className="w-3.5 h-3.5" />
                Есть куда расти
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Win / Loss / Total stats ─────────────────────────────────────── */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Победы',   value: won,   color: '#F26522', bg: '#FFF0E6' },
            { label: 'Прочее',   value: lost,  color: '#9CA3AF', bg: '#F3F4F6' },
            { label: 'Всего',    value: total, color: '#0B2B5E', bg: '#EFF2F8' },
          ].map(({ label, value, color, bg }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-0.5 rounded-xl py-2.5 px-1"
              style={{ backgroundColor: bg }}
            >
              <span
                className="text-xl font-bold leading-none"
                style={{ color }}
              >
                {value}
              </span>
              <span className="text-[10px] text-[#6B7280]">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Progress bar: won vs total ────────────────────────────────────── */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#9CA3AF]">
            <span>Победы</span>
            <span>Не выиграно</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[#E5E7EB]">
            <div
              className="h-full bg-[#F26522] transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
