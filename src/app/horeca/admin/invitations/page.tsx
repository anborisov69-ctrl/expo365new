'use client';

/**
 * /horeca/admin/invitations — Система трёхуровневых приглашений ООО "ТЕСТ"
 * ─────────────────────────────────────────────────────────────────────────
 * Три независимых канала привлечения с уникальной UTM-логикой:
 *
 *   [ПАРТНЕР]   #0B2B5E Deep Blue  — действующие клиенты → регистрация PENDING
 *               URL: /register?invite=partner&source=ooo-test
 *
 *   [ГОСТЬ]     #F26522 Orange     — новые посетители → Шоурум ООО ТЕСТ
 *               URL: /horeca/exhibitors/ooo-test?invite=visitor&source=ooo-test
 *
 *   [БИЗНЕС]    #374151 Graphite   — потенциальные экспоненты → лендинг выставки
 *               URL: /horeca?invite=b2b&ref=ooo-test
 *               + Счётчик "Привлечено партнёров" → revenue share
 *
 * QR-код: генерируется через api.qrserver.com (no external deps required).
 *
 * Данные: EcosystemStore (B2BReferral[]  + selectB2BPartnerCount)
 * TODO: Supabase migration:
 *   SELECT * FROM b2b_referrals WHERE referred_by = auth.uid()::text
 */

import React, { useState, useCallback } from 'react';
import {
  QrCode,
  Copy,
  CheckCheck,
  ExternalLink,
  Users,
  UserPlus,
  Briefcase,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Share2,
  Star,
  Clock,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEcosystem,
  selectB2BPartnerCount,
  selectActiveB2BPartners,
  type B2BReferral,
} from '@/store/ecosystemStore';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_URL    = 'https://expo365.com';
const SOURCE_SLUG = 'ooo-test';

/** Конфигурация трёх типов приглашений */
const INVITE_CONFIGS = {
  partner: {
    type:        'partner'   as const,
    badge:       'ПАРТНЕР',
    icon:        UserPlus,
    color:       '#0B2B5E',
    colorLight:  'rgba(11,43,94,0.08)',
    colorMedium: 'rgba(11,43,94,0.15)',
    gradient:    'linear-gradient(135deg, #0B2B5E 0%, #1a4080 100%)',
    title:       'Партнёрская ссылка',
    subtitle:    'Для действующих клиентов',
    description: 'Приглашает действующих байеров пройти регистрацию на платформе. После перехода аккаунт создаётся со статусом PENDING и привязывается к ООО «ТЕСТ» как к источнику.',
    url:         `${BASE_URL}/register?invite=partner&source=${SOURCE_SLUG}`,
    ctaLabel:    'Открыть ссылку',
    qrCaption:   null,
  },
  visitor: {
    type:        'visitor'   as const,
    badge:       'ГОСТЬ',
    icon:        Users,
    color:       '#F26522',
    colorLight:  'rgba(242,101,34,0.08)',
    colorMedium: 'rgba(242,101,34,0.15)',
    gradient:    'linear-gradient(135deg, #F26522 0%, #e05010 100%)',
    title:       'Гостевая ссылка',
    subtitle:    'Для новых посетителей',
    description: 'Направляет новых гостей напрямую в Шоурум ООО «ТЕСТ». Сессия помечается флагом visitor — аналитика фиксирует источник перехода.',
    url:         `${BASE_URL}/horeca/exhibitors/${SOURCE_SLUG}?invite=visitor&source=${SOURCE_SLUG}`,
    ctaLabel:    'Открыть Шоурум',
    qrCaption:   null,
  },
  b2b: {
    type:        'b2b'       as const,
    badge:       'БИЗНЕС',
    icon:        Briefcase,
    color:       '#374151',
    colorLight:  'rgba(55,65,81,0.07)',
    colorMedium: 'rgba(55,65,81,0.14)',
    gradient:    'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    title:       'Бизнес-ссылка',
    subtitle:    'Для партнёров-экспонентов',
    description: 'Приглашает другие компании стать экспонентами EXPO 365. Система автоматически фиксирует связь referredBy: «ooo-test». При оплате участия ООО «ТЕСТ» получает бонус.',
    url:         `${BASE_URL}/horeca?invite=b2b&ref=${SOURCE_SLUG}`,
    ctaLabel:    'Открыть лендинг',
    qrCaption:   'Станьте партнёром ООО ТЕСТ на EXPO 365',
  },
} as const;

type InviteType = keyof typeof INVITE_CONFIGS;

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Генерирует URL изображения QR-кода через api.qrserver.com */
function buildQrUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=svg&qzone=1&color=0B2B5E`;
}

/** Форматирует ISO-дату в читаемый вид */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day:   'numeric',
      month: 'short',
      year:  'numeric',
    });
  } catch {
    return '—';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── QR Modal ──────────────────────────────────────────────────────────────────

interface QrModalProps {
  url:       string;
  caption?:  string | null;
  color:     string;
  onClose:   () => void;
}

function QrModal({ url, caption, color, onClose }: QrModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="QR-код приглашения"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Закрыть */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Закрыть"
        >
          ✕
        </button>

        {/* QR */}
        <div
          className="p-3 rounded-xl border-2"
          style={{ borderColor: color }}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildQrUrl(url, 200)}
            alt="QR-код приглашения"
            width={200}
            height={200}
            className="block"
          />
        </div>

        {/* Caption */}
        {caption && (
          <p
            className="text-[11px] font-semibold text-center leading-snug px-2"
            style={{ color }}
          >
            {caption}
          </p>
        )}

        {/* URL */}
        <p className="text-[9px] text-slate-400 text-center break-all leading-tight px-2">
          {url}
        </p>
      </div>
    </div>
  );
}

// ── Copy Button ────────────────────────────────────────────────────────────────

interface CopyButtonProps {
  text:  string;
  color: string;
}

function CopyButton({ text, color }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — выделить текст
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold',
        'transition-all duration-200 select-none',
        copied ? 'opacity-100' : 'hover:brightness-90',
      )}
      style={{
        backgroundColor: copied ? '#16a34a' : color,
        color: '#ffffff',
      }}
      aria-label={copied ? 'Скопировано' : 'Скопировать ссылку'}
    >
      {copied ? (
        <>
          <CheckCheck size={13} strokeWidth={2.5} />
          Скопировано
        </>
      ) : (
        <>
          <Copy size={13} strokeWidth={2} />
          Копировать
        </>
      )}
    </button>
  );
}

// ── Invite Card ────────────────────────────────────────────────────────────────

interface InviteCardProps {
  config:       typeof INVITE_CONFIGS[InviteType];
  b2bCount?:    number;
}

function InviteCard({ config, b2bCount }: InviteCardProps) {
  const {
    badge, icon: Icon, color, colorLight, colorMedium,
    gradient, title, subtitle, description, url, ctaLabel, qrCaption,
    type,
  } = config;

  const [qrOpen,     setQrOpen]     = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  /** Трекинг клика + открытие ссылки */
  const handleCta = useCallback(async () => {
    setIsTracking(true);
    try {
      await fetch('/api/referral/track', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, source: SOURCE_SLUG }),
      });
    } catch {
      // не блокируем переход при сетевой ошибке
    } finally {
      setIsTracking(false);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [type, url]);

  return (
    <>
      {qrOpen && (
        <QrModal
          url={url}
          caption={qrCaption}
          color={color}
          onClose={() => setQrOpen(false)}
        />
      )}

      <article
        className="flex flex-col bg-white rounded-2xl overflow-hidden"
        style={{
          border:    `1px solid ${colorMedium}`,
          boxShadow: `0 4px 24px ${colorLight}`,
        }}
        aria-label={`Приглашение: ${badge}`}
      >
        {/* ── Шапка карточки ── */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: gradient }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Icon size={18} color="#ffffff" strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(255,255,255,0.20)', color: '#ffffff' }}
                >
                  {badge}
                </span>
                {/* B2B: счётчик активных партнёров */}
                {type === 'b2b' && b2bCount !== undefined && b2bCount > 0 && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                    style={{ backgroundColor: 'rgba(242,101,34,0.25)', color: '#fed7aa' }}
                  >
                    <TrendingUp size={9} strokeWidth={2.5} aria-hidden="true" />
                    {b2bCount} активных
                  </span>
                )}
              </div>
              <p className="text-white text-[13px] font-bold leading-tight mt-0.5">{title}</p>
            </div>
          </div>

          {/* QR-кнопка */}
          <button
            onClick={() => setQrOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            aria-label="Показать QR-код"
          >
            <QrCode size={17} color="#ffffff" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        {/* ── Тело карточки ── */}
        <div className="flex flex-col flex-1 px-5 py-4 gap-4">

          {/* Подзаголовок + описание */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color }}>
              {subtitle}
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed mt-1.5">
              {description}
            </p>
          </div>

          {/* Счётчик "Привлечено партнёров" для B2B */}
          {type === 'b2b' && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: colorLight, border: `1px solid ${colorMedium}` }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                <Building2 size={15} color="#ffffff" strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Привлечено партнёров
                </p>
                <p className="text-[20px] font-black leading-none" style={{ color }}>
                  {b2bCount ?? 0}
                  <span className="text-[11px] font-semibold text-slate-400 ml-1.5">
                    / будущий revenue share
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* QR-превью + caption */}
          <div className="flex items-start gap-4">
            {/* Миниатюра QR */}
            <button
              onClick={() => setQrOpen(true)}
              className="flex-shrink-0 p-1.5 rounded-xl border-2 transition-all hover:scale-105"
              style={{ borderColor: colorMedium }}
              aria-label="Увеличить QR-код"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildQrUrl(url, 80)}
                alt={`QR-код ${badge}`}
                width={80}
                height={80}
                className="block rounded-lg"
                loading="lazy"
              />
            </button>

            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {/* URL поле */}
              <div
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl overflow-hidden"
                style={{ backgroundColor: colorLight, border: `1px dashed ${colorMedium}` }}
              >
                <Share2
                  size={11}
                  style={{ color, flexShrink: 0 }}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <p
                  className="text-[10px] font-mono truncate flex-1 min-w-0 leading-none"
                  style={{ color }}
                  title={url}
                >
                  {url}
                </p>
              </div>

              {/* Caption для B2B */}
              {qrCaption && (
                <p
                  className="text-[10px] font-semibold italic leading-snug"
                  style={{ color: '#94a3b8' }}
                >
                  «{qrCaption}»
                </p>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            <CopyButton text={url} color={color} />

            <button
              onClick={handleCta}
              disabled={isTracking}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold',
                'border transition-all duration-200 select-none',
                isTracking ? 'opacity-60 cursor-wait' : 'hover:brightness-95',
              )}
              style={{ borderColor: colorMedium, color, backgroundColor: colorLight }}
              aria-label={ctaLabel}
            >
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
              {isTracking ? 'Загрузка...' : ctaLabel}
            </button>

            <button
              onClick={() => setQrOpen(true)}
              className="ml-auto flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Показать QR-код"
            >
              <QrCode size={11} strokeWidth={1.8} aria-hidden="true" />
              QR
            </button>
          </div>
        </div>
      </article>
    </>
  );
}

// ── B2B Partners Table ─────────────────────────────────────────────────────────

const B2B_STATUS_MAP: Record<B2BReferral['status'], { label: string; dot: string; text: string; bg: string }> = {
  pending:   { label: 'Ожидает',  dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  active:    { label: 'Активен',  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { label: 'Отменён', dot: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50'     },
};

interface B2BPartnerTableProps {
  referrals: B2BReferral[];
}

function B2BPartnerTable({ referrals }: B2BPartnerTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? referrals : referrals.slice(0, 5);

  if (referrals.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 text-[12px]">
        Пока нет привлечённых партнёров. Поделитесь Бизнес-ссылкой!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Строки таблицы */}
      <div className="divide-y divide-slate-100">
        {/* Заголовок */}
        <div className="grid grid-cols-[1fr_160px_120px_100px] gap-4 px-4 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Компания</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">E-mail</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Присоединился</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Статус</p>
        </div>

        {visible.map((r) => {
          const s = B2B_STATUS_MAP[r.status];
          return (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_160px_120px_100px] gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 truncate">{r.companyName}</p>
                <p className="text-[10px] text-slate-400 font-mono">ref: {r.referredSlug}</p>
              </div>
              <p className="text-[11px] text-slate-500 truncate self-center">{r.contactEmail}</p>
              <p className="text-[11px] text-slate-500 self-center">{formatDate(r.joinedAt)}</p>
              <div className="self-center">
                <span
                  className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold', s.bg, s.text)}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} aria-hidden="true" />
                  {s.label}
                  {r.revenueSharePct && r.status === 'active' && (
                    <span className="ml-0.5 text-emerald-500">({r.revenueSharePct}%)</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {referrals.length > 5 && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <><ChevronUp size={13} strokeWidth={2} />Свернуть</>
          ) : (
            <><ChevronDown size={13} strokeWidth={2} />Показать ещё {referrals.length - 5}</>
          )}
        </button>
      )}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

interface StatsBarProps {
  partnerCount: number;
  b2bActive:    number;
  b2bTotal:    number;
}

function StatsBar({ partnerCount, b2bActive, b2bTotal }: StatsBarProps) {
  const stats = [
    { icon: UserPlus,  label: 'Приглашенные клиенты', value: partnerCount, color: '#0B2B5E' },
    { icon: Building2, label: 'B2B активных',        value: b2bActive,   color: '#374151' },
    { icon: TrendingUp,label: 'B2B всего привлечено',value: b2bTotal,    color: '#374151' },
    { icon: Star,      label: 'Revenue share',       value: `${b2bActive * 5}%`, color: '#F26522' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl"
          style={{ border: '1px solid rgba(11,43,94,0.08)', boxShadow: '0 2px 8px rgba(11,43,94,0.05)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon size={15} style={{ color }} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 leading-none">{label}</p>
            <p className="text-[18px] font-black leading-tight" style={{ color }}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * InvitationsPage — страница управления тремя типами приглашений.
 *
 * Монтируется в AdminShell (/horeca/admin/layout.tsx).
 * Читает данные из EcosystemStore (b2bReferrals, referralClients).
 */
export default function InvitationsPage() {
  const { state } = useEcosystem();

  const b2bPartnerCount = selectB2BPartnerCount(state);
  const activePartners  = selectActiveB2BPartners(state);
  const totalB2B        = state.b2bReferrals.length;
  const refClientCount  = state.referralClients.length;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'rgba(11,43,94,0.02)',
        backgroundImage:
          'repeating-linear-gradient(0deg,rgba(11,43,94,0.025) 0px,rgba(11,43,94,0.025) 1px,transparent 1px,transparent 32px),' +
          'repeating-linear-gradient(90deg,rgba(11,43,94,0.025) 0px,rgba(11,43,94,0.025) 1px,transparent 1px,transparent 32px)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Заголовок страницы ── */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0B2B5E 0%, #1a4080 100%)' }}
            >
              <QrCode size={16} color="#ffffff" strokeWidth={2} aria-hidden="true" />
            </div>
            <h1 className="text-[20px] font-black tracking-tight" style={{ color: '#0B2B5E' }}>
              Система приглашений
            </h1>
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
              style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
            >
              ООО «ТЕСТ»
            </span>
          </div>
          <p className="text-[13px] text-slate-500 leading-relaxed ml-10">
            Три канала привлечения клиентов и партнёров с уникальными QR-кодами и UTM-трекингом
          </p>
        </header>

        {/* ── Stats Bar ── */}
        <StatsBar
          partnerCount={refClientCount}
          b2bActive={b2bPartnerCount}
          b2bTotal={totalB2B}
        />

        {/* ── Три карточки приглашений ── */}
        <section aria-label="Управление приглашениями">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
            Управление приглашениями — Генерация ссылок и QR-кодов
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <InviteCard config={INVITE_CONFIGS.partner} />
            <InviteCard config={INVITE_CONFIGS.visitor} />
            <InviteCard config={INVITE_CONFIGS.b2b} b2bCount={b2bPartnerCount} />
          </div>
        </section>

        {/* ── Таблица привлечённых B2B-партнёров ── */}
        <section
          className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(55,65,81,0.12)', boxShadow: '0 4px 20px rgba(55,65,81,0.06)' }}
          aria-label="Привлечённые B2B-партнёры"
        >
          {/* Шапка таблицы */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(55,65,81,0.10)', background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <Building2 size={15} color="#ffffff" strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <p className="text-white text-[14px] font-black leading-tight">
                  Привлечённые партнёры-экспоненты
                </p>
                <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  Компании, присоединившиеся по Бизнес-ссылке · referredBy: ooo-test
                </p>
              </div>
            </div>

            {/* Бейдж активных */}
            <div className="flex items-center gap-2">
              {activePartners.length > 0 && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ backgroundColor: 'rgba(34,197,94,0.20)', color: '#86efac' }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true" />
                  {activePartners.length} активных
                </span>
              )}
              <span
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
              >
                <Clock size={11} strokeWidth={2} aria-hidden="true" />
                Всего: {totalB2B}
              </span>
            </div>
          </div>

          {/* Тело таблицы */}
          <B2BPartnerTable referrals={state.b2bReferrals} />
        </section>

        {/* ── Подсказка монетизации ── */}
        <div
          className="flex items-start gap-4 px-5 py-4 rounded-2xl"
          style={{
            background:  'linear-gradient(135deg, rgba(242,101,34,0.06) 0%, rgba(11,43,94,0.04) 100%)',
            border:      '1px solid rgba(242,101,34,0.20)',
          }}
          role="note"
          aria-label="Информация о монетизации"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #F26522 0%, #e05010 100%)' }}
          >
            <TrendingUp size={17} color="#ffffff" strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[13px] font-black" style={{ color: '#0B2B5E' }}>
              Revenue Share · Будущая монетизация
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
              Система фиксирует каждого привлечённого вами экспонента с меткой&nbsp;
              <code
                className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#F26522' }}
              >
                referredBy: &apos;ooo-test&apos;
              </code>
              . Когда партнёр оплачивает участие в EXPO 365 — ООО «ТЕСТ» автоматически получает
              бонус или скидку на следующий период. Чем больше активных партнёров — тем выше вознаграждение.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
