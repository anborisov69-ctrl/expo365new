'use client';

/**
 * ResponseTimeWidget — виджет «Среднее время ответа»
 * ────────────────────────────────────────────────────
 * Показывает среднее время ответа на тендер за выбранный период.
 *
 * Логика расчёта (определена в требованиях):
 *   responseTimeHours = (proposal_sent_at - tender_created_at) / 3600
 *   → среднее по всем tender_responses за период
 *
 * Визуал:
 *   - Большое число "X.X ч" в центре
 *   - Горизонтальный индикатор сравнения с бенчмарком отрасли (4 ч)
 *   - Мини-спарклайн (SVG) — история за период
 *   - Цвет: зелёный если лучше бенчмарка, оранжевый если хуже
 */

import React from 'react';
import { Clock, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResponseTimeStats } from '@/types/exhibitor-analytics';

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({
  history,
  maxHours,
  color,
}: {
  history: { label: string; hours: number }[];
  maxHours: number;
  color: string;
}) {
  if (history.length < 2) return null;

  const W = 120, H = 36;
  const step = W / (history.length - 1);
  const plotH = H - 4;

  const pts = history.map((p, i) => ({
    x: i * step,
    y: H - 2 - (p.hours / (maxHours || 1)) * plotH,
  }));

  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden
      className="overflow-visible"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

// ── Benchmark Bar ─────────────────────────────────────────────────────────────

function BenchmarkBar({
  value,
  benchmark,
  isBetter,
}: {
  value:     number;
  benchmark: number;
  isBetter:  boolean;
}) {
  // Scale: benchmark = 100%, value can exceed
  const maxScale   = Math.max(value, benchmark) * 1.15;
  const valuePct   = Math.min((value     / maxScale) * 100, 100);
  const benchPct   = (benchmark / maxScale) * 100;

  return (
    <div className="space-y-1.5">
      <div className="relative h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
        {/* Your performance bar */}
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-full transition-all duration-700',
            isBetter ? 'bg-green-500' : 'bg-[#F26522]',
          )}
          style={{ width: `${valuePct}%` }}
        />
        {/* Benchmark marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#6B7280]"
          style={{ left: `${benchPct}%` }}
          title={`Бенчмарк: ${benchmark} ч`}
        />
      </div>
      <div
        className="flex justify-between text-[10px] text-[#9CA3AF]"
        style={{ paddingRight: `${100 - benchPct}%` }}
      >
        <span>0</span>
        <span className="text-[#6B7280] font-medium">
          Отрасль: {benchmark} ч
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ResponseTimeWidgetProps {
  data: ResponseTimeStats;
}

export default function ResponseTimeWidget({ data }: ResponseTimeWidgetProps) {
  const isBetter     = data.averageHours > 0 && data.averageHours < data.benchmarkHours;
  const accentColor  = isBetter ? '#16A34A' : '#F26522';
  const maxSparkline = Math.max(...data.history.map((h) => h.hours), data.benchmarkHours);

  const improvement = data.benchmarkHours > 0
    ? Math.round(((data.benchmarkHours - data.averageHours) / data.benchmarkHours) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Top row: avg + best ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">

        {/* Average */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280] font-medium">
            <Clock className="w-3.5 h-3.5" />
            Среднее время ответа
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-3xl font-bold leading-none"
              style={{ color: data.averageHours > 0 ? accentColor : '#9CA3AF' }}
            >
              {data.averageHours > 0 ? data.averageHours.toFixed(1) : '—'}
            </span>
            {data.averageHours > 0 && (
              <span className="text-sm text-[#6B7280]">ч</span>
            )}
          </div>
          {isBetter && improvement > 0 && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              На {improvement}% быстрее отрасли
            </p>
          )}
          {!isBetter && data.averageHours > 0 && (
            <p className="text-xs text-[#F26522] font-medium flex items-center gap-1">
              <Target className="w-3 h-3" />
              Цель: быстрее {data.benchmarkHours} ч
            </p>
          )}
        </div>

        {/* Best result */}
        <div className="text-right space-y-0.5 shrink-0">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">
            Лучший результат
          </p>
          <p className="text-xl font-bold text-[#0B2B5E]">
            {data.bestHours > 0 ? `${data.bestHours.toFixed(1)} ч` : '—'}
          </p>
          <p className="text-[10px] text-[#9CA3AF]">за период</p>
        </div>
      </div>

      {/* ── Benchmark bar ────────────────────────────────────────────────── */}
      {data.averageHours > 0 && (
        <BenchmarkBar
          value={data.averageHours}
          benchmark={data.benchmarkHours}
          isBetter={isBetter}
        />
      )}

      {/* ── Sparkline history ────────────────────────────────────────────── */}
      {data.history.length >= 2 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">
            Динамика
          </p>
          <div className="flex items-end justify-between gap-2">
            <Sparkline
              history={data.history}
              maxHours={maxSparkline}
              color={accentColor}
            />
            <div className="flex flex-col items-end gap-1">
              {data.history.slice(-1).map((h, i) => (
                <span key={i} className="text-[10px] text-[#9CA3AF]">
                  {h.label}: <strong className="text-[#4B5563]">{h.hours} ч</strong>
                </span>
              ))}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-[9px] text-[#9CA3AF]" style={{ width: 120 }}>
            <span>{data.history[0].label}</span>
            <span>{data.history[data.history.length - 1].label}</span>
          </div>
        </div>
      )}

      {/* ── Formula note ─────────────────────────────────────────────────── */}
      <p className="text-[10px] text-[#C4C9D4] border-t border-[#F3F4F6] pt-3">
        Считается как разница между созданием тендера и нажатием «Отправить предложение»
      </p>
    </div>
  );
}
