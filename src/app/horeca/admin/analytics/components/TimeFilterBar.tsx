'use client';

/**
 * TimeFilterBar — панель временных фильтров аналитики
 * ─────────────────────────────────────────────────────
 * Кнопки: [Неделя] [Месяц] [Квартал] [Год] + иконка-календарь для кастомного выбора.
 *
 * Кастомный диапазон открывает два нативных <input type="date">
 * без дополнительных зависимостей.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimePeriod, DateRange } from '@/types/exhibitor-analytics';
import { TIME_PERIOD_LABELS } from '@/types/exhibitor-analytics';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TimeFilterBarProps {
  active:        TimePeriod;
  dateRange:     DateRange;
  onPeriodChange: (period: TimePeriod, range: DateRange) => void;
}

// ── Preset periods (excludes 'custom') ────────────────────────────────────────

const PRESET_PERIODS: Exclude<TimePeriod, 'custom'>[] = ['week', 'month', 'quarter', 'year'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPresetRange(period: Exclude<TimePeriod, 'custom'>): DateRange {
  const now  = new Date();
  const to   = now.toISOString().slice(0, 10);
  const from = new Date(now);

  switch (period) {
    case 'week':    from.setDate(now.getDate() - 7);        break;
    case 'month':   from.setMonth(now.getMonth() - 1);      break;
    case 'quarter': from.setMonth(now.getMonth() - 3);      break;
    case 'year':    from.setFullYear(now.getFullYear() - 1); break;
  }

  return { from: from.toISOString().slice(0, 10), to };
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimeFilterBar({
  active,
  dateRange,
  onPeriodChange,
}: TimeFilterBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customFrom,   setCustomFrom]   = useState(dateRange.from);
  const [customTo,     setCustomTo]     = useState(dateRange.to);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [calendarOpen]);

  function handlePreset(period: Exclude<TimePeriod, 'custom'>) {
    setCalendarOpen(false);
    onPeriodChange(period, getPresetRange(period));
  }

  function handleApplyCustom() {
    if (!customFrom || !customTo || customFrom > customTo) return;
    setCalendarOpen(false);
    onPeriodChange('custom', { from: customFrom, to: customTo });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* ── Preset Buttons ─────────────────────────────────────────────────── */}
      {PRESET_PERIODS.map((period) => (
        <button
          key={period}
          onClick={() => handlePreset(period)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
            'border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/60',
            active === period
              ? 'bg-[#0B2B5E] text-white border-[#0B2B5E] shadow-sm'
              : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#0B2B5E]/40 hover:text-[#0B2B5E]',
          )}
        >
          {TIME_PERIOD_LABELS[period]}
        </button>
      ))}

      {/* ── Calendar Picker ────────────────────────────────────────────────── */}
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          aria-label="Выбрать произвольный период"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
            'border transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/60',
            active === 'custom'
              ? 'bg-[#F26522] text-white border-[#F26522] shadow-sm'
              : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#F26522]/50 hover:text-[#F26522]',
          )}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          {active === 'custom' && (
            <span className="hidden sm:inline whitespace-nowrap">
              {formatDisplayDate(dateRange.from)} — {formatDisplayDate(dateRange.to)}
            </span>
          )}
          {active !== 'custom' && (
            <span className="hidden sm:inline">Период</span>
          )}
        </button>

        {/* Dropdown calendar popover */}
        {calendarOpen && (
          <div
            className={cn(
              'absolute left-0 top-full mt-2 z-50',
              'bg-white rounded-xl shadow-xl border border-[#E5E7EB]',
              'p-4 min-w-[280px]',
              'animate-in fade-in slide-in-from-top-2 duration-150',
            )}
          >
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Произвольный период
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#6B7280]">С</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm',
                    'text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30',
                    'focus:border-[#0B2B5E]',
                  )}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#6B7280]">По</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm',
                    'text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/30',
                    'focus:border-[#0B2B5E]',
                  )}
                />
              </label>
            </div>

            <button
              onClick={handleApplyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              className={cn(
                'w-full py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-[#0B2B5E] text-white hover:bg-[#0B2B5E]/90',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Применить
            </button>
          </div>
        )}
      </div>

      {/* ── Current range hint ─────────────────────────────────────────────── */}
      {active !== 'custom' && (
        <span className="hidden md:block text-xs text-[#9CA3AF] ml-1">
          {formatDisplayDate(dateRange.from)} — {formatDisplayDate(dateRange.to)}
        </span>
      )}
    </div>
  );
}
