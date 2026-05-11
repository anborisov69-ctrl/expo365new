'use client';

/**
 * Top10Products — виджет «Топ-10 товаров»
 * ─────────────────────────────────────────
 * Список из 10 позиций с:
 *   - Порядковым номером (ранг 1–10)
 *   - SVG/PNG-изображением бренда
 *   - Названием товара и брендом
 *   - Количеством просмотров (иконка Eye)
 *   - Количеством запросов цены (иконка MessageSquare)
 *
 * Ранги 1–3 выделяются золотым/серебряным/бронзовым акцентом.
 * Первые места имеют Orange (#F26522) бейдж при высоких запросах.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { Eye, MessageSquare, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopProductEntry } from '@/types/exhibitor-analytics';

// ── Rank badge config ─────────────────────────────────────────────────────────

const RANK_STYLES: Record<number, { badge: string; row: string }> = {
  1: {
    badge: 'bg-amber-100   text-amber-700   border-amber-300',
    row:   'bg-amber-50/40',
  },
  2: {
    badge: 'bg-slate-100   text-slate-600   border-slate-300',
    row:   'bg-slate-50/40',
  },
  3: {
    badge: 'bg-orange-100  text-orange-700  border-orange-300',
    row:   'bg-orange-50/30',
  },
};

function getRankStyle(rank: number) {
  return RANK_STYLES[rank] ?? {
    badge: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
    row:   '',
  };
}

// ── Bar fill (relative to max views) ─────────────────────────────────────────

function RelativeBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / (max || 1)) * 100);
  return (
    <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-[#0B2B5E] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Top10ProductsProps {
  products: TopProductEntry[];
}

export default function Top10Products({ products }: Top10ProductsProps) {
  const [expanded, setExpanded] = useState(false);
  const maxViews = products[0]?.views ?? 1;
  const visible  = expanded ? products : products.slice(0, 5);

  return (
    <div className="flex flex-col">

      {/* ── Table header ──────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className={cn(
          'hidden sm:grid grid-cols-[32px_1fr_100px_100px]',
          'gap-3 px-4 pb-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide',
          'border-b border-[#F3F4F6]',
        )}
      >
        <span>#</span>
        <span>Товар</span>
        <span className="text-right">Просмотры</span>
        <span className="text-right">Запросы цены</span>
      </div>

      {/* ── Product rows ──────────────────────────────────────────────────── */}
      <ul className="divide-y divide-[#F3F4F6]">
        {visible.map((product) => {
          const { badge, row } = getRankStyle(product.rank);
          const isHot = product.priceRequests >= 60;

          return (
            <li
              key={product.id}
              className={cn(
                'grid grid-cols-[32px_1fr] sm:grid-cols-[32px_1fr_100px_100px]',
                'items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                'hover:bg-[#F8FAFC] cursor-default group',
                row,
              )}
            >
              {/* Rank badge */}
              <span
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-lg',
                  'text-xs font-bold border shrink-0',
                  badge,
                )}
              >
                {product.rank}
              </span>

              {/* Product info */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Brand logo */}
                <div
                  className={cn(
                    'relative flex-shrink-0 w-9 h-9 rounded-lg',
                    'bg-white border border-[#E5E7EB] p-1 overflow-hidden',
                  )}
                >
                  <Image
                    src={product.imageUrl}
                    alt={product.brand}
                    fill
                    className="object-contain p-0.5"
                    sizes="36px"
                    onError={(e) => {
                      // Fallback to initials on broken image
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Name & brand */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#111827] truncate">
                      {product.name}
                    </p>
                    {isHot && (
                      <span className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFF0E6] text-[#F26522] text-[10px] font-bold shrink-0">
                        <TrendingUp className="w-2.5 h-2.5" />
                        Горячий
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9CA3AF] truncate">{product.brand}</p>

                  {/* Mobile-only stats + bar */}
                  <div className="flex items-center gap-3 mt-1.5 sm:hidden">
                    <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                      <Eye className="w-3 h-3" />
                      {product.views.toLocaleString('ru-RU')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#F26522]">
                      <MessageSquare className="w-3 h-3" />
                      {product.priceRequests}
                    </span>
                  </div>

                  {/* Relative popularity bar */}
                  <div className="mt-1.5">
                    <RelativeBar value={product.views} max={maxViews} />
                  </div>
                </div>
              </div>

              {/* Desktop: views column */}
              <div className="hidden sm:flex items-center justify-end gap-1.5 text-sm text-[#4B5563]">
                <Eye className="w-3.5 h-3.5 text-[#9CA3AF]" />
                {product.views.toLocaleString('ru-RU')}
              </div>

              {/* Desktop: price requests column */}
              <div
                className={cn(
                  'hidden sm:flex items-center justify-end gap-1.5 text-sm font-medium',
                  isHot ? 'text-[#F26522]' : 'text-[#4B5563]',
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {product.priceRequests}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Show more / less ──────────────────────────────────────────────── */}
      {products.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl',
            'text-xs font-medium text-[#6B7280]',
            'border border-dashed border-[#E5E7EB] hover:border-[#0B2B5E]/30',
            'hover:text-[#0B2B5E] hover:bg-[#0B2B5E]/3 transition-colors',
          )}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Скрыть
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Показать все {products.length} позиций
            </>
          )}
        </button>
      )}
    </div>
  );
}
