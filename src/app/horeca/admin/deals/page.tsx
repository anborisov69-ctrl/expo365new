'use client';

/**
 * /horeca/admin/deals — Рабочее пространство «Сделки и контракты»
 * ──────────────────────────────────────────────────────────────────────────────
 * B2B CRM-интерфейс для экспонента: просмотр, согласование и управление сделками.
 *
 * Архитектура:
 *   • Auth: временный bypass — session.user.role === 'ADMIN_EXPONENT'
 *   • Данные: src/data/dealsData.ts (mock, TODO → Supabase RLS)
 *   • Вкладки: Активные запросы / Архив
 *   • Drawer: боковая панель с деталями сделки (состав, скидки, история)
 *
 * TODO (production):
 *   supabase.from('deals').select('*, deal_items(*, products(*)), change_history(*)')
 *     .eq('exhibitor_id', session.user.id)
 *
 * Цветовая система:
 *   #0B2B5E — основной синий (заголовки, линии статусов)
 *   #F26522 — оранжевый (кнопка «Подписать», интерактив)
 */

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  User,
  Package,
  History,
  Pen,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEALS,
  ACTIVE_DEALS,
  ARCHIVED_DEALS,
  AWAITING_SIGNATURE_COUNT,
  COMPLETED_COUNT,
  DEAL_STATUS_LABELS,
  type Deal,
  type DealStatus,
  type ChangeHistoryEntry,
  type DealItem,
} from '@/data/dealsData';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_STYLES: Record<DealStatus, { bg: string; text: string; dot: string }> = {
  negotiation: {
    bg:   'bg-amber-50',
    text: 'text-amber-700',
    dot:  'bg-amber-400',
  },
  awaiting_signature: {
    bg:   'bg-blue-50',
    text: 'text-[#0B2B5E]',
    dot:  'bg-[#0B2B5E]',
  },
  paid: {
    bg:   'bg-emerald-50',
    text: 'text-emerald-700',
    dot:  'bg-emerald-500',
  },
  cancelled: {
    bg:   'bg-slate-100',
    text: 'text-slate-500',
    dot:  'bg-slate-400',
  },
};

/** Форматирование суммы в рублях: 1 286 500 ₽ */
function formatRUB(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style:    'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Форматирование ISO-даты в короткий вид: 20 нояб. 2024, 14:32 */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Короткая дата без времени */
function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  }).format(new Date(iso));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Status Badge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: DealStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        s.bg,
        s.text,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
      {DEAL_STATUS_LABELS[status]}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon:    React.ElementType;
  label:   string;
  value:   string | number;
  accent?: boolean;
}

function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border px-5 py-4 bg-white',
        accent ? 'border-[#0B2B5E]/20' : '[border-color:rgba(11,43,94,0.2)]',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          accent ? 'bg-[#0B2B5E]' : 'bg-slate-100',
        )}
      >
        <Icon className={cn('w-5 h-5', accent ? 'text-white' : 'text-slate-500')} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#0B2B5E] leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Buyer Cell ────────────────────────────────────────────────────────────────

interface BuyerCellProps {
  name:     string;
  inn:      string;
  location: string;
}

function BuyerCell({ name, inn, location }: BuyerCellProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Avatar/Logo placeholder */}
      <div className="w-9 h-9 rounded-lg bg-[#0B2B5E]/8 border border-[#0B2B5E]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-[#0B2B5E] font-bold text-sm">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <p className="text-xs text-slate-400 truncate">ИНН {inn} · {location}</p>
      </div>
    </div>
  );
}

// ── Deals Table ───────────────────────────────────────────────────────────────

interface DealsTableProps {
  deals:          Deal[];
  onSelectDeal:   (deal: Deal) => void;
}

function DealsTable({ deals, onSelectDeal }: DealsTableProps) {
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Нет сделок в этом разделе</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[30%]">
              Заказчик
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[18%]">
              Сумма сделки
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[18%]">
              Статус
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[22%]">
              Последнее изменение
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[12%]">
              Действие
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal, idx) => (
            <tr
              key={deal.id}
              className={cn(
                'group border-b border-slate-100 transition-colors hover:bg-slate-50/80',
                idx % 2 === 0 ? '' : 'bg-slate-50/30',
              )}
            >
              {/* LEFT border accent by status */}
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {/* Status accent line */}
                  <div
                    className="w-0.5 h-8 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        deal.status === 'awaiting_signature' ? '#0B2B5E'
                        : deal.status === 'negotiation'      ? '#F59E0B'
                        : deal.status === 'paid'             ? '#10B981'
                        : '#94A3B8',
                    }}
                  />
                  <BuyerCell
                    name={deal.buyer.name}
                    inn={deal.buyer.inn}
                    location={deal.buyer.location}
                  />
                </div>
              </td>
              <td className="px-4 py-3.5 text-right">
                <span className="font-semibold text-[#0B2B5E] tabular-nums">
                  {formatRUB(deal.totalAmount)}
                </span>
                {deal.contractRef && (
                  <p className="text-xs text-slate-400 mt-0.5">{deal.contractRef}</p>
                )}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={deal.status} />
              </td>
              <td className="px-4 py-3.5 text-slate-500 text-xs">
                {formatDate(deal.updatedAt)}
              </td>
              <td className="px-4 py-3.5 text-center">
                <button
                  onClick={() => onSelectDeal(deal)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                    'text-[#0B2B5E] bg-[#0B2B5E]/6 border border-[#0B2B5E]/10',
                    'hover:bg-[#0B2B5E]/12 hover:border-[#0B2B5E]/20',
                    'transition-colors',
                  )}
                >
                  Открыть
                  <ChevronRight className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────

interface TabButtonProps {
  label:    string;
  count:    number;
  active:   boolean;
  onClick:  () => void;
}

function TabButton({ label, count, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors',
        'border-b-2',
        active
          ? 'text-[#0B2B5E] border-[#0B2B5E]'
          : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300',
      )}
    >
      {label}
      <span
        className={cn(
          'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
          active ? 'bg-[#0B2B5E] text-white' : 'bg-slate-200 text-slate-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ── Deal Items Panel ──────────────────────────────────────────────────────────

interface DealItemsProps {
  items: DealItem[];
}

function DealItemsPanel({ items }: DealItemsProps) {
  const subtotal = items.reduce((acc, it) => acc + it.finalPrice * it.quantity, 0);

  return (
    <div>
      <div className="space-y-2.5 mb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
          >
            {/* Brand logo or placeholder */}
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
              {item.brandLogoUrl ? (
                <Image
                  src={item.brandLogoUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="object-contain"
                />
              ) : (
                <Package className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-tight">{item.productName}</p>
              <p className="text-xs text-slate-400 mt-0.5">SKU: {item.sku}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">
                  {item.quantity} шт. × {formatRUB(item.finalPrice)}
                </span>
                {item.discount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                    −{item.discount}%
                    <span className="text-slate-400 line-through ml-1">{formatRUB(item.basePrice)}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-[#0B2B5E] tabular-nums">
                {formatRUB(item.finalPrice * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-[#0B2B5E]/4 border border-[#0B2B5E]/8">
        <span className="text-sm font-semibold text-[#0B2B5E]">Итого</span>
        <span className="text-base font-bold text-[#0B2B5E] tabular-nums">{formatRUB(subtotal)}</span>
      </div>
    </div>
  );
}

// ── Change History Panel ──────────────────────────────────────────────────────

interface ChangeHistoryProps {
  entries: ChangeHistoryEntry[];
}

function ChangeHistoryPanel({ entries }: ChangeHistoryProps) {
  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-0">
      {[...entries].reverse().map((entry, idx) => (
        <li key={entry.id} className="ml-5 pb-5 last:pb-0">
          {/* Timeline dot */}
          <span
            className={cn(
              'absolute -left-1.5 flex items-center justify-center w-3 h-3 rounded-full',
              'ring-2 ring-white',
              entry.userRole === 'ADMIN_EXPONENT'
                ? 'bg-[#0B2B5E]'
                : 'bg-[#F26522]',
            )}
          />
          <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-700 leading-tight">
                {entry.userName}
              </span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                {formatDate(entry.timestamp)}
              </span>
            </div>
            <p className="text-xs text-slate-600">{entry.action}</p>
            {entry.field && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500">
                  {entry.field}
                </span>
                {entry.oldValue && (
                  <span className="px-2 py-0.5 rounded bg-red-50 text-[10px] text-red-500 line-through">
                    {entry.oldValue}
                  </span>
                )}
                {entry.newValue && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] text-emerald-600 font-medium">
                    → {entry.newValue}
                  </span>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Deal Drawer ───────────────────────────────────────────────────────────────

interface DealDrawerProps {
  deal:     Deal | null;
  onClose:  () => void;
}

type DrawerTab = 'items' | 'history';

function DealDrawer({ deal, onClose }: DealDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('items');

  if (!deal) return null;

  const isAwaitingSignature = deal.status === 'awaiting_signature';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-[80] w-full max-w-[520px]',
          'bg-white shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-300',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Детали сделки ${deal.contractRef ?? deal.id}`}
      >
        {/* ── Drawer Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <FileText className="w-5 h-5 text-[#0B2B5E]" />
              <h2 className="text-base font-bold text-[#0B2B5E]">
                {deal.contractRef ?? deal.id}
              </h2>
              <StatusBadge status={deal.status} />
            </div>
            <p className="text-sm text-slate-500">
              {deal.buyer.name} · {deal.buyer.location}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              ИНН {deal.buyer.inn} · Создана {formatShortDate(deal.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Summary stripe ─────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 bg-[#0B2B5E]/3 border-b border-[#0B2B5E]/8 flex-shrink-0 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Общая сумма сделки</p>
            <p className="text-xl font-bold text-[#0B2B5E] tabular-nums">
              {formatRUB(deal.totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">Позиций</p>
            <p className="text-xl font-bold text-slate-700">{deal.items.length}</p>
          </div>
        </div>

        {/* ── Inner Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('items')}
            className={cn(
              'flex items-center gap-1.5 px-1 py-3 mr-6 text-xs font-semibold border-b-2 transition-colors',
              activeTab === 'items'
                ? 'text-[#0B2B5E] border-[#0B2B5E]'
                : 'text-slate-500 border-transparent hover:text-slate-700',
            )}
          >
            <Package className="w-3.5 h-3.5" />
            Состав заказа
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-1.5 px-1 py-3 text-xs font-semibold border-b-2 transition-colors',
              activeTab === 'history'
                ? 'text-[#0B2B5E] border-[#0B2B5E]'
                : 'text-slate-500 border-transparent hover:text-slate-700',
            )}
          >
            <History className="w-3.5 h-3.5" />
            История изменений
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold">
              {deal.history.length}
            </span>
          </button>
        </div>

        {/* ── Scrollable Content ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'items' ? (
            <DealItemsPanel items={deal.items} />
          ) : (
            <ChangeHistoryPanel entries={deal.history} />
          )}
        </div>

        {/* ── Action Footer ──────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
          {isAwaitingSignature ? (
            <div className="flex flex-col gap-3">
              {/* Alert */}
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <AlertCircle className="w-4 h-4 text-[#0B2B5E] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#0B2B5E] leading-relaxed">
                  Договор сформирован и ожидает вашей подписи. Проверьте состав и нажмите «Подписать».
                </p>
              </div>
              {/* CTA */}
              <div className="flex gap-2">
                <button
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2',
                    'px-4 py-2.5 rounded-xl text-sm font-semibold',
                    'bg-[#F26522] text-white hover:bg-[#D9571D]',
                    'transition-colors shadow-sm',
                  )}
                >
                  <Pen className="w-4 h-4" />
                  Подписать договор
                </button>
                <button
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-medium',
                    'text-slate-600 bg-white border border-slate-200',
                    'hover:bg-slate-50 transition-colors',
                  )}
                >
                  Запросить правки
                </button>
              </div>
            </div>
          ) : deal.status === 'negotiation' ? (
            <div className="flex gap-2">
              <button
                className={cn(
                  'flex-1 flex items-center justify-center gap-2',
                  'px-4 py-2.5 rounded-xl text-sm font-semibold',
                  'bg-[#0B2B5E] text-white hover:bg-[#0A2550]',
                  'transition-colors shadow-sm',
                )}
              >
                <FileText className="w-4 h-4" />
                Сформировать договор
              </button>
              <button
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium',
                  'text-slate-600 bg-white border border-slate-200',
                  'hover:bg-slate-50 transition-colors',
                )}
              >
                Предложить скидку
              </button>
            </div>
          ) : deal.status === 'paid' ? (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <BadgeCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-700">
                Сделка закрыта. Оплата получена.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200">
              <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-500">Сделка отменена.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

type PageTab = 'active' | 'archive';

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('active');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const displayedDeals = useMemo(
    () => (activeTab === 'active' ? ACTIVE_DEALS : ARCHIVED_DEALS),
    [activeTab],
  );

  return (
    <>
      {/* ── Page Content ────────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          {/* Breadcrumb */}
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Кабинет экспонента</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#0B2B5E] font-medium">Сделки и контракты</span>
          </p>
          <h1 className="text-2xl font-bold text-[#0B2B5E] tracking-tight">
            Сделки и контракты
          </h1>
          <p className="text-sm text-slate-500">
            Управление коммерческими соглашениями, согласование условий и подписание договоров.
          </p>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={FileText}
            label="Активные сделки"
            value={ACTIVE_DEALS.length}
            accent
          />
          <StatCard
            icon={Clock}
            label="На подписании"
            value={AWAITING_SIGNATURE_COUNT}
          />
          <StatCard
            icon={CheckCircle2}
            label="Завершено"
            value={COMPLETED_COUNT}
          />
        </div>

        {/* ── Tabs + Table ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border overflow-hidden [border-color:rgba(11,43,94,0.2)]">

          {/* Tab bar */}
          <div className="flex border-b border-slate-100 px-2">
            <TabButton
              label="Активные запросы"
              count={ACTIVE_DEALS.length}
              active={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
            />
            <TabButton
              label="Архив"
              count={ARCHIVED_DEALS.length}
              active={activeTab === 'archive'}
              onClick={() => setActiveTab('archive')}
            />
          </div>

          {/* Table */}
          <DealsTable
            deals={displayedDeals}
            onSelectDeal={setSelectedDeal}
          />
        </div>

      </div>

      {/* ── Drawer ──────────────────────────────────────────────────────────── */}
      <DealDrawer
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />
    </>
  );
}
