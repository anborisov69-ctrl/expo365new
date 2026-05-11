'use client';

/**
 * /horeca/admin/partners — Управление партнёрами и приглашенными клиентами
 * ─────────────────────────────────────────────────────────────────────────
 * Функциональность:
 *   1. Уникальная ссылка приглашения ООО "ТЕСТ" с кнопкой копирования
 *   2. Таблица приглашенных клиентов с интерактивным блоком "Состояние сделок"
 *   3. BI-сигналы: 🔴 Риск ухода (Competitor Risk) | 🟡 Рекомендация (Portfolio Expansion)
 *   4. Side Drawer с детальным описанием каждого сигнала
 *   5. Privacy Layer: конкретные названия конкурентов скрыты
 *
 * Данные: EcosystemStore (React Context) + biSignals.ts (движок вычисления)
 * TODO: Supabase migration:
 *   SELECT rc.*, cb.* FROM referral_clients rc
 *   LEFT JOIN client_behaviors cb ON cb.buyer_id = rc.buyer_id
 *   WHERE rc.exhibitor_id = auth.uid()
 *   ORDER BY rc.visited_at DESC
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Link2,
  Copy,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Clock,
  Star,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  X,
  ShieldAlert,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEcosystem,
  type ReferralClient,
} from '@/store/ecosystemStore';
import {
  computeAllBISignals,
  getGapInsight,
} from '@/modules/analytics/biSignals';
import type { BISignal, BISignalType } from '@/types/bi-signals';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const REF_BASE_URL   = 'https://expo365.com/ref';
const OOO_TEST_SLUG  = 'ooo-test';
const FULL_REF_URL   = `${REF_BASE_URL}/${OOO_TEST_SLUG}`;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type FilterStatus = 'all' | ReferralClient['status'];

const STATUS_LABELS: Record<ReferralClient['status'], string> = {
  visited:   'Первый визит',
  contacted: 'Запрос отправлен',
  client:    'Клиент',
};

const STATUS_STYLES: Record<ReferralClient['status'], { bg: string; text: string; dot: string }> = {
  visited:   { bg: 'bg-slate-50',   text: 'text-slate-600',  dot: 'bg-slate-400'  },
  contacted: { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
  client:    { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS — Stat Card
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon:    React.ElementType;
  label:   string;
  value:   number | string;
  sub?:    string;
  accent?: boolean;
}

function StatCard({ icon: Icon, label, value, sub, accent = false }: StatCardProps) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-start gap-4"
      style={{
        background: accent ? 'linear-gradient(135deg, #0B2B5E 0%, #1a4080 100%)' : '#ffffff',
        border:     accent ? 'none' : '1px solid rgba(11,43,94,0.20)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: accent ? 'rgba(255,255,255,0.12)' : 'rgba(11,43,94,0.06)' }}
      >
        <Icon size={18} style={{ color: accent ? '#F26522' : '#0B2B5E' }} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: accent ? 'rgba(255,255,255,0.60)' : 'rgba(11,43,94,0.50)' }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold leading-tight mt-0.5"
          style={{ color: accent ? '#FFFFFF' : '#0B2B5E' }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="text-[10px] mt-0.5"
            style={{ color: accent ? 'rgba(255,255,255,0.50)' : 'rgba(11,43,94,0.40)' }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS — Status Badge
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ReferralClient['status'] }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
        s.bg, s.text,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS — BI Signal Drawer
// ═══════════════════════════════════════════════════════════════════════════════

interface BISignalDrawerProps {
  /** null → drawer закрыт */
  signalType:   BISignalType | null;
  signals:      BISignal[];
  clientName:   string;
  onClose:      () => void;
}

/**
 * Side Drawer с детальным описанием BI-сигнала.
 *
 * Privacy Layer:
 *   Не называет slug конкурента. Формулировка:
 *   "Сторонний поставщик в категории [Название]"
 */
function BISignalDrawer({ signalType, signals, clientName, onClose }: BISignalDrawerProps) {
  const isOpen = signalType !== null;

  /**
   * Portal guard — SSR-safe.
   * BISignalDrawer монтируется внутри <tr> (ClientRow), что нарушает
   * HTML-нестинг <tbody> → <div>. Используем createPortal для рендера
   * backdrop и panel прямо в document.body, избегая Hydration Error.
   */
  const [mounted, setMounted] = useState(false);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Блокируем скролл фона при открытом drawer
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Активируем portal только на клиенте (после гидрации)
  useEffect(() => { setMounted(true); }, []);

  const filtered = signals.filter(s => s.type === signalType);

  const isRisk = signalType === 'competitor_risk';

  const drawerConfig = isRisk
    ? {
        headerBg:    'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        iconBg:      'rgba(255,255,255,0.12)',
        iconColor:   '#fca5a5',
        accentColor: '#ef4444',
        accentBg:    'rgba(239,68,68,0.08)',
        accentBorder:'rgba(239,68,68,0.20)',
        Icon:        ShieldAlert,
        title:       'Риск ухода клиента',
        subtitle:    'Клиент отправил запрос стороннему поставщику в вашей категории',
        badgeText:   'Красный сигнал',
        badgeBg:     'rgba(239,68,68,0.15)',
        badgeColor:  '#ef4444',
      }
    : {
        headerBg:    'linear-gradient(135deg, #713f12 0%, #92400e 100%)',
        iconBg:      'rgba(255,255,255,0.12)',
        iconColor:   '#fcd34d',
        accentColor: '#f59e0b',
        accentBg:    'rgba(245,158,11,0.08)',
        accentBorder:'rgba(245,158,11,0.20)',
        Icon:        Sparkles,
        title:       'Возможность расширения',
        subtitle:    'Клиент ищет категорию, дополняющую ваш ассортимент',
        badgeText:   'Жёлтый сигнал',
        badgeBg:     'rgba(245,158,11,0.15)',
        badgeColor:  '#d97706',
      };

  // На сервере (SSR) не рендерим nothing — portal недоступен
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ backgroundColor: 'rgba(11,43,94,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full z-50 flex flex-col',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          width:      '420px',
          maxWidth:   '100vw',
          background: '#f8fafc',
          boxShadow:  '-8px 0 40px rgba(11,43,94,0.18)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={drawerConfig.title}
      >
        {/* ── HEADER ── */}
        <div
          className="relative flex-shrink-0 px-6 pt-6 pb-5"
          style={{ background: drawerConfig.headerBg }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.80)' }}
            aria-label="Закрыть панель"
          >
            <X size={15} aria-hidden="true" />
          </button>

          {/* Icon + badge */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: drawerConfig.iconBg }}
            >
              <drawerConfig.Icon size={20} style={{ color: drawerConfig.iconColor }} aria-hidden="true" />
            </div>
            <div>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-1.5"
                style={{ backgroundColor: drawerConfig.badgeBg, color: drawerConfig.badgeColor }}
              >
                {drawerConfig.badgeText}
              </span>
              <h2 className="text-[15px] font-bold text-white leading-tight">{drawerConfig.title}</h2>
            </div>
          </div>

          {/* Client name */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.20)' }}
              aria-hidden="true"
            >
              {clientName.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <span className="text-[12px] font-medium text-white/90">{clientName}</span>
          </div>

          <p className="text-[11px] text-white/60 mt-2 leading-relaxed">{drawerConfig.subtitle}</p>
        </div>

        {/* ── SIGNAL LIST ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-slate-400 text-center py-8">Нет активных сигналов</p>
          ) : (
            filtered.map((signal, idx) => (
              <SignalDetailCard key={idx} signal={signal} config={drawerConfig} />
            ))
          )}
        </div>

        {/* ── FOOTER ── */}
        <div
          className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(11,43,94,0.08)', backgroundColor: '#ffffff' }}
        >
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-[260px]">
            Данные формируются автоматически на основе активности байера на платформе.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ backgroundColor: 'rgba(11,43,94,0.06)', color: '#0B2B5E' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Signal Detail Card (внутри Drawer) ────────────────────────────────────────

interface SignalDetailCardProps {
  signal: BISignal;
  config: {
    accentColor:  string;
    accentBg:     string;
    accentBorder: string;
  };
}

function SignalDetailCard({ signal, config }: SignalDetailCardProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  if (signal.type === 'competitor_risk' && signal.competitorCategory) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: config.accentBg,
          border:          `1px solid ${config.accentBorder}`,
        }}
      >
        {/* What happened */}
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle
            size={14}
            className="flex-shrink-0 mt-0.5"
            style={{ color: config.accentColor }}
            aria-hidden="true"
          />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: '#1e293b' }}>
              Запрос отправлен конкуренту
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Клиент отправил запрос на коммерческое предложение стороннему поставщику,
              работающему в той же категории, что и ООО «ТЕСТ».
            </p>
          </div>
        </div>

        {/* Privacy-safe info block */}
        <div
          className="rounded-lg px-3 py-2.5 mb-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.70)', border: '1px solid rgba(11,43,94,0.07)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
            Категория конкурента
          </p>
          <p className="text-[12px] font-semibold" style={{ color: '#0B2B5E' }}>
            Сторонний поставщик в категории «{signal.competitorCategory}»
          </p>
        </div>

        {/* Recommendation */}
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.50)' }}
        >
          <ChevronRight size={12} className="flex-shrink-0 mt-0.5" style={{ color: config.accentColor }} aria-hidden="true" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <span className="font-semibold">Рекомендация:</span> свяжитесь с клиентом с персональным
            предложением или скидкой по позициям категории «{signal.competitorCategory}».
          </p>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-slate-400 mt-2.5 text-right">
          Сигнал: {formatDate(signal.detectedAt)}
        </p>
      </div>
    );
  }

  if (signal.type === 'portfolio_expansion' && signal.gapCategory) {
    const insight = getGapInsight(signal.gapCategory);
    return (
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: config.accentBg,
          border:          `1px solid ${config.accentBorder}`,
        }}
      >
        {/* What's the insight */}
        <div className="flex items-start gap-2 mb-3">
          <Lightbulb
            size={14}
            className="flex-shrink-0 mt-0.5"
            style={{ color: config.accentColor }}
            aria-hidden="true"
          />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: '#1e293b' }}>
              Поисковый запрос по смежной категории
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Клиент искал категорию, которой нет в вашем текущем ассортименте,
              но которая логически дополняет ваш портфель.
            </p>
          </div>
        </div>

        {/* Gap info */}
        <div
          className="rounded-lg px-3 py-2.5 mb-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.70)', border: '1px solid rgba(11,43,94,0.07)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
            Искомая категория
          </p>
          <p className="text-[12px] font-semibold" style={{ color: '#0B2B5E' }}>
            {signal.gapCategory}
          </p>
          {signal.complementaryTo && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              Дополняет: <span className="font-medium">{signal.complementaryTo}</span>
            </p>
          )}
        </div>

        {/* Market insight */}
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2 mb-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.50)' }}
        >
          <TrendingUp size={12} className="flex-shrink-0 mt-0.5" style={{ color: config.accentColor }} aria-hidden="true" />
          <p className="text-[11px] text-slate-600 leading-relaxed italic">
            {insight}
          </p>
        </div>

        {/* Recommendation */}
        <div
          className="rounded-lg px-3 py-2 flex items-start gap-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.50)' }}
        >
          <ChevronRight size={12} className="flex-shrink-0 mt-0.5" style={{ color: config.accentColor }} aria-hidden="true" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <span className="font-semibold">Рекомендация:</span> рассмотрите добавление
            категории «{signal.gapCategory}» в ваш ассортимент или предложите клиенту
            альтернативу из текущего каталога.
          </p>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-slate-400 mt-2.5 text-right">
          Сигнал: {formatDate(signal.detectedAt)}
        </p>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS — Deal State Block (новая колонка "Состояние сделок")
// ═══════════════════════════════════════════════════════════════════════════════

interface DealStateBlockProps {
  client:   ReferralClient;
  signals:  BISignal[];
  onSignalClick: (type: BISignalType) => void;
}

/**
 * Интерактивный блок «Состояние сделок» — заменяет статичный StatusBadge.
 * Показывает статус клиента + BI-индикаторы (🔴 риск, 🟡 рекомендация).
 */
function DealStateBlock({ client, signals, onSignalClick }: DealStateBlockProps) {
  const hasRisk      = signals.some(s => s.type === 'competitor_risk');
  const hasPortfolio = signals.some(s => s.type === 'portfolio_expansion');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status badge */}
      <StatusBadge status={client.status} />

      {/* BI Signal indicators */}
      {hasRisk && (
        <button
          type="button"
          onClick={() => onSignalClick('competitor_risk')}
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
            'transition-all duration-150 hover:scale-110 active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50',
          )}
          style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
          title="Риск ухода клиента — нажмите для подробностей"
          aria-label="Показать сигнал: Риск ухода"
        >
          <AlertTriangle size={11} style={{ color: '#ef4444' }} aria-hidden="true" />
        </button>
      )}

      {hasPortfolio && (
        <button
          type="button"
          onClick={() => onSignalClick('portfolio_expansion')}
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
            'transition-all duration-150 hover:scale-110 active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50',
          )}
          style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
          title="Рекомендация по расширению портфеля — нажмите для подробностей"
          aria-label="Показать сигнал: Возможность расширения"
        >
          <Lightbulb size={11} style={{ color: '#f59e0b' }} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS — Invitation Link Block
// ═══════════════════════════════════════════════════════════════════════════════

function ReferralLinkBlock() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FULL_REF_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:  'linear-gradient(135deg, #0B2B5E 0%, #1a4080 60%, #0d3570 100%)',
        boxShadow:   '0 8px 40px rgba(11,43,94,0.25)',
      }}
    >
      {/* Blueprint Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 24px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 24px)',
        }}
        aria-hidden="true"
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: 'rgba(242,101,34,0.20)', color: '#F26522' }}
              >
                <Link2 size={9} aria-hidden="true" />
                Ссылка приглашения
              </span>
            </div>
            <h3 className="text-base font-bold text-white leading-tight">
              Ваша ссылка для приглашения партнёров
            </h3>
            <p className="text-[12px] text-white/60 mt-1 leading-relaxed">
              Байеры, перешедшие по этой ссылке, видят партнёрские цены
              и автоматически попадают в список «Свои клиенты».
            </p>
          </div>
        </div>

        {/* URL поле */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-mono"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border:     '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <Link2 size={13} style={{ color: 'rgba(255,255,255,0.40)' }} aria-hidden="true" />
            <span className="text-white/90 text-[12px] truncate select-all">
              {FULL_REF_URL}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold',
              'transition-all duration-150 active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            )}
            style={{
              backgroundColor: copied ? 'rgba(16,185,129,0.90)' : '#F26522',
              color:           '#FFFFFF',
              boxShadow:       copied
                ? '0 4px 16px rgba(16,185,129,0.40)'
                : '0 4px 16px rgba(242,101,34,0.40)',
              minWidth: '120px',
            }}
            aria-label="Скопировать ссылку"
          >
            {copied ? (
              <>
                <CheckCircle2 size={14} aria-hidden="true" />
                Скопировано
              </>
            ) : (
              <>
                <Copy size={14} aria-hidden="true" />
                Копировать
              </>
            )}
          </button>

          <a
            href={FULL_REF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0',
              'transition-all duration-150 hover:bg-white/15 active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            )}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            aria-label="Открыть ссылку"
          >
            <ExternalLink size={14} style={{ color: 'rgba(255,255,255,0.70)' }} aria-hidden="true" />
          </a>
        </div>

        {/* Подсказка */}
        <p className="mt-3 text-[10px] text-white/40 flex items-center gap-1.5">
          <AlertCircle size={10} aria-hidden="true" />
          Ссылка уникальна для ООО «ТЕСТ» — передайте её потенциальным байерам, партнёрам или разместите в рекламных материалах.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS — Client Row
// ═══════════════════════════════════════════════════════════════════════════════

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ClientRowProps {
  client:         ReferralClient;
  signals:        BISignal[];
  onStatusChange: (buyerId: string, status: ReferralClient['status']) => void;
}

function ClientRow({ client, signals, onStatusChange }: ClientRowProps) {
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [activeSignalType, setActiveSignalType] = useState<BISignalType | null>(null);

  const handleSignalClick = useCallback((type: BISignalType) => {
    setActiveSignalType(type);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setActiveSignalType(null);
  }, []);

  return (
    <>
      <tr className="group hover:bg-[#0B2B5E]/[0.02] transition-colors duration-100">
        {/* Байер */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white select-none"
              style={{ backgroundColor: '#0B2B5E' }}
              aria-hidden="true"
            >
              {client.buyerName.trim().split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#0B2B5E] leading-tight truncate">
                {client.buyerName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{client.buyerEmail}</p>
            </div>
          </div>
        </td>

        {/* Компания */}
        <td className="px-4 py-3 hidden md:table-cell">
          <p className="text-[12px] font-medium text-slate-600 truncate max-w-[180px]">
            {client.buyerCompany}
          </p>
        </td>

        {/* Дата визита */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-[11px] text-slate-500">{formatDate(client.visitedAt)}</p>
        </td>

        {/* Сделок */}
        <td className="px-4 py-3 text-center">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
            style={{
              backgroundColor: client.totalDeals > 0 ? 'rgba(11,43,94,0.08)' : 'rgba(11,43,94,0.04)',
              color: client.totalDeals > 0 ? '#0B2B5E' : 'rgba(11,43,94,0.35)',
            }}
          >
            {client.totalDeals}
          </span>
        </td>

        {/* Источник */}
        <td className="px-4 py-3">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
          >
            <Link2 size={8} aria-hidden="true" />
            /inv/{client.referralSlug}
          </span>
        </td>

        {/* ── СОСТОЯНИЕ СДЕЛОК (заменяет "Статус") ── */}
        <td className="px-4 py-3">
          <DealStateBlock
            client={client}
            signals={signals}
            onSignalClick={handleSignalClick}
          />
        </td>

        {/* Действия — смена статуса */}
        <td className="px-4 py-3 relative">
          <div className="flex items-center justify-end gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium',
                  'transition-colors duration-100 hover:bg-[#0B2B5E]/[0.06]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2B5E]/30',
                )}
                style={{ color: '#0B2B5E' }}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                Статус
                <ChevronDown size={11} className={cn('transition-transform duration-150', menuOpen && 'rotate-180')} aria-hidden="true" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 top-full mt-1 w-44 rounded-xl py-1.5 z-20"
                    style={{
                      background:  '#ffffff',
                      border:      '1px solid rgba(11,43,94,0.20)',
                    }}
                    role="menu"
                  >
                    {(['visited', 'contacted', 'client'] as ReferralClient['status'][]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { onStatusChange(client.buyerId, s); setMenuOpen(false); }}
                        className={cn(
                          'w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] font-medium',
                          'transition-colors duration-100 hover:bg-[#0B2B5E]/[0.04]',
                          client.status === s && 'text-[#0B2B5E] font-bold',
                        )}
                        style={{ color: client.status === s ? '#0B2B5E' : '#475569' }}
                        role="menuitem"
                      >
                        <span
                          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_STYLES[s].dot)}
                          aria-hidden="true"
                        />
                        {STATUS_LABELS[s]}
                        {client.status === s && (
                          <CheckCircle2 size={11} className="ml-auto text-[#0B2B5E]" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Side Drawer — монтируется внутри строки, но visually overlay */}
      <BISignalDrawer
        signalType={activeSignalType}
        signals={signals}
        clientName={client.buyerName}
        onClose={handleDrawerClose}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BI SIGNALS LEGEND — легенда индикаторов
// ═══════════════════════════════════════════════════════════════════════════════

function BISignalsLegend() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 rounded-xl"
      style={{
        backgroundColor: 'rgba(11,43,94,0.03)',
        border:          '1px solid rgba(11,43,94,0.07)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(11,43,94,0.40)' }}>
        BI-сигналы:
      </p>
      <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
          aria-hidden="true"
        >
          <AlertTriangle size={8} style={{ color: '#ef4444' }} />
        </span>
        Риск ухода
      </span>
      <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
          aria-hidden="true"
        >
          <Lightbulb size={8} style={{ color: '#f59e0b' }} />
        </span>
        Рекомендация
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function PartnersPage() {
  const { state, dispatch } = useEcosystem();
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // ── Вычисляем BI-сигналы для всех клиентов ───────────────────────────────
  // Map<buyerId, BISignal[]> — O(1) lookup в ClientRow
  const signalMap = useMemo(
    () => computeAllBISignals(state.clientBehaviors),
    [state.clientBehaviors],
  );

  // ── Статистика ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      state.referralClients.length,
    clients:    state.referralClients.filter(c => c.status === 'client').length,
    contacted:  state.referralClients.filter(c => c.status === 'contacted').length,
    totalDeals: state.referralClients.reduce((sum, c) => sum + c.totalDeals, 0),
    risks:      Array.from(signalMap.values()).filter(sigs =>
      sigs.some(s => s.type === 'competitor_risk')
    ).length,
  }), [state.referralClients, signalMap]);

  // ── Фильтрация ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = state.referralClients;
    if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.buyerName.toLowerCase().includes(q) ||
        c.buyerEmail.toLowerCase().includes(q) ||
        c.buyerCompany.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
  }, [state.referralClients, filterStatus, searchTerm]);

  // ── Изменить статус клиента ─────────────────────────────────────────────────
  const handleStatusChange = (buyerId: string, newStatus: ReferralClient['status']) => {
    if (newStatus === 'client') {
      dispatch({ type: 'MARK_CLIENT', buyerId });
    } else {
      dispatch({
        type: 'SYNC_PRODUCTS',
        products: state.oooTestProducts,
      });
    }
  };

  const FILTER_OPTIONS: { id: FilterStatus; label: string }[] = [
    { id: 'all',       label: 'Все' },
    { id: 'visited',   label: STATUS_LABELS.visited },
    { id: 'contacted', label: STATUS_LABELS.contacted },
    { id: 'client',    label: STATUS_LABELS.client },
  ];

  return (
    <div className="min-h-full p-6 space-y-6">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0B2B5E' }}>
            Партнёры и приглашенные клиенты
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Управляйте байерами, пришедшими по вашей ссылке приглашения
          </p>
        </div>

        <a
          href="/horeca/exhibitors/ooo-test"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 hover:brightness-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40"
          style={{ backgroundColor: '#F26522', color: '#ffffff', boxShadow: '0 4px 12px rgba(242,101,34,0.30)' }}
        >
          <ExternalLink size={13} aria-hidden="true" />
          Моя витрина
        </a>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Всего приглашенных"       value={stats.total}      accent />
        <StatCard icon={Star}       label="Стали клиентами"          value={stats.clients}    sub={`из ${stats.total} переходов`} />
        <StatCard icon={Clock}      label="Запросили КП"             value={stats.contacted}  />
        <StatCard icon={TrendingUp} label="Сделок по приглашению"    value={stats.totalDeals} />
      </div>

      {/* ── BI ALERT BANNER (если есть риски) ────────────────────────────────── */}
      {stats.risks > 0 && (
        <div
          className="rounded-xl px-5 py-3.5 flex items-center gap-3"
          style={{
            background:   'linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(239,68,68,0.03) 100%)',
            border:       '1px solid rgba(239,68,68,0.20)',
          }}
          role="alert"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
            aria-hidden="true"
          >
            <ShieldAlert size={15} style={{ color: '#ef4444' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold" style={{ color: '#991b1b' }}>
              {stats.risks} {stats.risks === 1 ? 'клиент обратился' : 'клиента обратились'} к стороннему поставщику
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Нажмите на красный индикатор <AlertTriangle size={9} className="inline" style={{ color: '#ef4444' }} /> в таблице, чтобы увидеть детали и рекомендации по удержанию.
            </p>
          </div>
        </div>
      )}

      {/* ── REFERRAL LINK BLOCK ──────────────────────────────────────────────── */}
      <div className="relative">
        <ReferralLinkBlock />
      </div>

      {/* ── CLIENTS TABLE ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(11,43,94,0.20)',
        }}
      >
        {/* Table header toolbar */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.07)', backgroundColor: '#ffffff' }}
        >
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-[13px] font-bold" style={{ color: '#0B2B5E' }}>
              Свои клиенты
            </h2>
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
            >
              {filtered.length}
            </span>
          </div>

          {/* BI Legend */}
          <div className="hidden lg:block">
            <BISignalsLegend />
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-[240px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'rgba(11,43,94,0.35)' }}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Поиск по имени, почте..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-[12px] rounded-lg border transition-colors focus:outline-none"
              style={{
                borderColor: 'rgba(11,43,94,0.14)',
                color:       '#0B2B5E',
              }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={12} style={{ color: 'rgba(11,43,94,0.40)' }} aria-hidden="true" />
            <div className="flex items-center gap-1">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilterStatus(opt.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors duration-100',
                    'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0B2B5E]/30',
                    filterStatus === opt.id
                      ? 'text-white'
                      : 'text-slate-500 hover:bg-[#0B2B5E]/[0.04]',
                  )}
                  style={filterStatus === opt.id ? { backgroundColor: '#0B2B5E' } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white">
          {filtered.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(11,43,94,0.07)', backgroundColor: '#f8fafc' }}>
                  {['Байер', 'Компания', 'Дата визита', 'Сделок', 'Источник', 'Состояние сделок', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: h === 'Состояние сделок' ? '#0B2B5E' : 'rgba(11,43,94,0.45)' }}
                    >
                      {h === 'Состояние сделок' ? (
                        <span className="flex items-center gap-1">
                          {h}
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                            style={{ backgroundColor: 'rgba(242,101,34,0.12)', color: '#F26522' }}
                          >
                            <Sparkles size={7} aria-hidden="true" />
                            BI
                          </span>
                        </span>
                      ) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                style={{ borderTop: '1px solid transparent' }}
                className="divide-y divide-[#0B2B5E]/[0.04]"
              >
                {filtered.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    signals={signalMap.get(client.buyerId) ?? []}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(11,43,94,0.05)' }}
              >
                <Users size={24} style={{ color: '#0B2B5E' }} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="text-[13px] font-semibold" style={{ color: '#0B2B5E' }}>
                {searchTerm || filterStatus !== 'all' ? 'Клиенты не найдены' : 'Ещё нет приглашенных клиентов'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                {searchTerm || filterStatus !== 'all'
                  ? 'Попробуйте изменить фильтры поиска'
                  : 'Поделитесь ссылкой приглашения — и байеры начнут появляться здесь'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between flex-wrap gap-2"
            style={{
              borderTop:       '1px solid rgba(11,43,94,0.07)',
              backgroundColor: '#f8fafc',
            }}
          >
            <p className="text-[11px] text-slate-400">
              Показано {filtered.length} из {state.referralClients.length}
            </p>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium"
                style={{ color: 'rgba(11,43,94,0.45)' }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Принятые приглашения
              </span>
              {/* Mobile BI legend */}
              <span className="lg:hidden flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <AlertTriangle size={9} style={{ color: '#ef4444' }} />
                  Риск
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Lightbulb size={9} style={{ color: '#f59e0b' }} />
                  Рекомендация
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
