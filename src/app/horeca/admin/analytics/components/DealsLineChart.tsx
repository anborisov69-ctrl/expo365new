'use client';

/**
 * DealsLineChart — SVG-линейный график «Сумма сделок»
 * ─────────────────────────────────────────────────────
 * Реализован на чистом SVG без сторонних библиотек.
 *
 * Цветовая схема (дизайн-система EXPO 365):
 *   #0B2B5E — основная линия и область-градиент (Deep Blue)
 *   #F26522 — точки с выигрышами тендеров (Orange = "успехи")
 *
 * Логика:
 *   - Линия проходит через все точки dealsAmount
 *   - Точки с wonTenders > 0 выделяются оранжевым кругом
 *   - Ось Y масштабируется по maxValue из ChartData
 *   - Tooltip появляется по hover/focus (через CSS + SVG <title>)
 */

import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { DealsChartData, ChartDataPoint } from '@/types/exhibitor-analytics';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHART_H      = 200;  // SVG внутренняя высота (px)
const PADDING_TOP  = 16;
const PADDING_BTM  = 32;   // место под подписи оси X
const PADDING_L    = 52;   // место под суммы оси Y
const PADDING_R    = 16;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000)    return `${(n / 1_000).toFixed(0)} тыс`;
  return `${n}`;
}

function buildPolyline(
  points: ChartDataPoint[],
  maxValue: number,
  width: number,
): { x: number; y: number; raw: ChartDataPoint }[] {
  if (points.length === 0) return [];
  const plotW = width - PADDING_L - PADDING_R;
  const plotH = CHART_H - PADDING_TOP - PADDING_BTM;
  const step  = plotW / Math.max(points.length - 1, 1);

  return points.map((pt, i) => ({
    x:   PADDING_L + i * step,
    y:   PADDING_TOP + plotH - (pt.dealsAmount / (maxValue || 1)) * plotH,
    raw: pt,
  }));
}

function pointsToSvgPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

function buildAreaPath(
  pts: { x: number; y: number }[],
  width: number,
): string {
  if (pts.length === 0) return '';
  const bottom = CHART_H - PADDING_BTM;
  const first  = pts[0];
  const last   = pts[pts.length - 1];
  return [
    pointsToSvgPath(pts),
    `L${last.x.toFixed(1)},${bottom}`,
    `L${first.x.toFixed(1)},${bottom}`,
    'Z',
  ].join(' ');
}

// ── Y-axis ticks ──────────────────────────────────────────────────────────────

function buildYTicks(maxValue: number): { value: number; label: string }[] {
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const value = (maxValue / steps) * i;
    return { value, label: formatAmount(value) };
  });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState {
  x:     number;
  y:     number;
  point: ChartDataPoint;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DealsLineChartProps {
  data: DealsChartData;
}

export default function DealsLineChart({ data }: DealsLineChartProps) {
  const svgRef            = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [svgWidth, setSvgWidth] = useState(600);

  // Measure actual SVG width on mount & resize
  const measuredRef = useCallback((node: SVGSVGElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setSvgWidth(entry.contentRect.width || 600);
    });
    ro.observe(node);
    setSvgWidth(node.getBoundingClientRect().width || 600);
    // cleanup handled by component unmount
  }, []);

  const pts    = buildPolyline(data.points, data.maxValue, svgWidth);
  const linePath  = pointsToSvgPath(pts);
  const areaPath  = buildAreaPath(pts, svgWidth);
  const yTicks    = buildYTicks(data.maxValue);
  const plotH     = CHART_H - PADDING_TOP - PADDING_BTM;
  const gradId    = 'deals-area-grad';

  function handlePointHover(pt: { x: number; y: number; raw: ChartDataPoint }) {
    setTooltip({ x: pt.x, y: pt.y, point: pt.raw });
  }

  if (data.points.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-[#9CA3AF]">
        Нет данных за выбранный период
      </div>
    );
  }

  return (
    <div className="relative w-full select-none">
      <svg
        ref={(node) => {
          (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
          measuredRef(node);
        }}
        viewBox={`0 0 ${svgWidth} ${CHART_H}`}
        width="100%"
        height={CHART_H}
        aria-label="График суммы сделок"
        role="img"
        className="overflow-visible"
      >
        {/* ── Defs: gradient fill ──────────────────────────────────────────── */}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0B2B5E" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0B2B5E" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* ── Y-axis grid lines & labels ───────────────────────────────────── */}
        {yTicks.map(({ value, label }) => {
          const y = PADDING_TOP + plotH - (value / (data.maxValue || 1)) * plotH;
          return (
            <g key={value}>
              <line
                x1={PADDING_L}
                y1={y}
                x2={svgWidth - PADDING_R}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <text
                x={PADDING_L - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9CA3AF"
                fontFamily="inherit"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Area fill ───────────────────────────────────────────────────── */}
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          strokeWidth="0"
        />

        {/* ── Main line ───────────────────────────────────────────────────── */}
        <path
          d={linePath}
          fill="none"
          stroke="#0B2B5E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── Data points ─────────────────────────────────────────────────── */}
        {pts.map((pt, i) => {
          const isWin = pt.raw.wonTenders > 0;
          return (
            <g key={i}>
              {/* Outer ring for wins */}
              {isWin && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={8}
                  fill="#F26522"
                  fillOpacity="0.15"
                  stroke="none"
                />
              )}
              {/* Main dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isWin ? 5 : 4}
                fill={isWin ? '#F26522' : '#0B2B5E'}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
                onMouseEnter={() => handlePointHover(pt)}
                onMouseLeave={() => setTooltip(null)}
                onFocus={() => handlePointHover(pt)}
                onBlur={() => setTooltip(null)}
                tabIndex={0}
                role="button"
                aria-label={`${pt.raw.label}: ${formatAmount(pt.raw.dealsAmount)} ₽`}
              />
            </g>
          );
        })}

        {/* ── X-axis labels ───────────────────────────────────────────────── */}
        {pts.map((pt, i) => (
          <text
            key={i}
            x={pt.x}
            y={CHART_H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#9CA3AF"
            fontFamily="inherit"
          >
            {pt.raw.label}
          </text>
        ))}

        {/* ── Tooltip (SVG foreignObject) ──────────────────────────────────── */}
        {tooltip && (() => {
          const tipW  = 140;
          const tipH  = tooltip.point.wonTenders > 0 ? 72 : 52;
          const tipX  = Math.min(
            Math.max(tooltip.x - tipW / 2, PADDING_L),
            svgWidth - PADDING_R - tipW,
          );
          const tipY  = tooltip.y - tipH - 12;

          return (
            <foreignObject
              x={tipX}
              y={Math.max(tipY, 4)}
              width={tipW}
              height={tipH}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className={cn(
                  'rounded-xl border border-[#E5E7EB] bg-white shadow-lg',
                  'px-3 py-2 text-xs text-[#111827]',
                )}
              >
                <p className="font-semibold text-[#0B2B5E] truncate">
                  {tooltip.point.label}
                </p>
                <p className="text-[#6B7280] mt-0.5">
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
                  }).format(tooltip.point.dealsAmount)}
                </p>
                {tooltip.point.wonTenders > 0 && (
                  <p className="text-[#F26522] font-medium mt-0.5">
                    🏆 {tooltip.point.wonTenders} побед
                  </p>
                )}
              </div>
            </foreignObject>
          );
        })()}
      </svg>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 mt-3 px-[52px]">
        <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span className="inline-block w-5 h-0.5 rounded bg-[#0B2B5E]" />
          Сумма сделок
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span className="inline-block w-3 h-3 rounded-full bg-[#F26522]" />
          Выигранные тендеры
        </span>
      </div>
    </div>
  );
}
