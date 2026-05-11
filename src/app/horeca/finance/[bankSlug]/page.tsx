/**
 * /horeca/finance/[bankSlug] — Страница конкретного банка-партнёра
 * ──────────────────────────────────────────────────────────────────
 * Server Component. Показывает перечень услуг банка (кредит, лизинг, РКО)
 * и CTA для перехода в витрину ЭКСПО 365 с предустановленным банком.
 */

import type { Metadata } from 'next';
import { notFound }      from 'next/navigation';
import Link              from 'next/link';
import { BANKS, getBankBySlug } from '@/data/banksData';
import type { BankService }     from '@/types/finance';

// ── generateStaticParams для SSG ──────────────────────────────────────────────
export async function generateStaticParams() {
  return BANKS.map((b) => ({ bankSlug: b.slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ bankSlug: string }> }
): Promise<Metadata> {
  const { bankSlug } = await params;
  const bank = getBankBySlug(bankSlug);
  if (!bank) return { title: 'Банк не найден | EXPO 365' };
  return {
    title:       `${bank.name} — условия финансирования | EXPO 365`,
    description: bank.description,
  };
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<string, string> = {
  leasing:   'Лизинг',
  credit:    'Кредит',
  rko:       'РКО',
  overdraft: 'Овердрафт',
  factoring: 'Факторинг',
};

const SERVICE_TYPE_ICONS: Record<string, string> = {
  leasing:   '',
  credit:    '',
  rko:       '',
  overdraft: '',
  factoring: '',
};

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} млн ₽`;
  if (v >= 1_000)     return `${(v / 1_000).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} тыс. ₽`;
  return `${v.toLocaleString('ru-RU')} ₽`;
}

// ── Карточка услуги ───────────────────────────────────────────────────────────

function ServiceCard({ service, accent }: { service: BankService; accent: string }) {
  return (
    <div
      className="flex flex-col p-5 bg-white rounded-2xl border transition-all duration-200"
      style={{ borderColor: 'rgba(11,43,94,0.20)' }}
    >
      {/* Иконка + тип */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: `${accent}14` }}
          aria-hidden="true"
        >
          {SERVICE_TYPE_ICONS[service.type] ?? ''}
        </span>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          {SERVICE_TYPE_LABELS[service.type]}
        </span>
      </div>

      {/* Заголовок */}
      <h3 className="text-[13px] font-black leading-tight mb-2" style={{ color: '#0B2B5E' }}>
        {service.title}
      </h3>

      {/* Описание */}
      <p className="text-[11px] text-slate-500 leading-snug mb-4 flex-1">
        {service.description}
      </p>

      {/* Параметры */}
      {(service.rateFrom || service.maxAmount || service.termMonths) && (
        <div className="grid grid-cols-3 gap-2 mt-auto">
          {service.rateFrom !== undefined && (
            <div
              className="flex flex-col items-center p-2 rounded-xl"
              style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
            >
              <span className="text-[13px] font-black leading-none tabular-nums" style={{ color: accent }}>
                {service.rateFrom}%
              </span>
              <span className="text-[7px] text-slate-400 mt-0.5 text-center leading-tight">от годовых</span>
            </div>
          )}
          {service.maxAmount !== undefined && (
            <div
              className="flex flex-col items-center p-2 rounded-xl"
              style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
            >
              <span className="text-[11px] font-black leading-none tabular-nums" style={{ color: '#0B2B5E' }}>
                {formatMoney(service.maxAmount)}
              </span>
              <span className="text-[7px] text-slate-400 mt-0.5 text-center leading-tight">макс. сумма</span>
            </div>
          )}
          {service.termMonths !== undefined && (
            <div
              className="flex flex-col items-center p-2 rounded-xl"
              style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
            >
              <span className="text-[13px] font-black leading-none tabular-nums" style={{ color: '#0B2B5E' }}>
                {service.termMonths}
              </span>
              <span className="text-[7px] text-slate-400 mt-0.5 text-center leading-tight">мес. срок</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default async function BankPage(
  { params }: { params: Promise<{ bankSlug: string }> }
) {
  const { bankSlug } = await params;
  const bank = getBankBySlug(bankSlug);
  if (!bank) notFound();

  const initials = bank.shortName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${bank.accentColor} 0%, ${bank.accentColor}cc 100%)` }}
        aria-labelledby="bank-name-heading"
      >
        {/* Декоративный паттерн */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize:  '60px 60px',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-10">

          {/* Навигационная цепочка */}
          <nav className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/50 mb-8" aria-label="Хлебные крошки">
            <Link href="/horeca" className="hover:text-white/80 transition-colors">EXPO 365</Link>
            <span aria-hidden="true">/</span>
            <Link href="/horeca/finance" className="hover:text-white/80 transition-colors">Финансы и лизинг</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/80" aria-current="page">{bank.shortName}</span>
          </nav>

          {/* Шапка */}
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Лого */}
            <div
              className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-black text-white shadow-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)' }}
              aria-hidden="true"
            >
              {initials}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 id="bank-name-heading" className="text-2xl lg:text-3xl font-black text-white leading-tight">
                  {bank.name}
                </h1>
                {bank.horecaFocus && (
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    ★ HoReCa Focus
                  </span>
                )}
              </div>
              <p className="text-white/80 text-[13px] font-medium">{bank.tagline}</p>
            </div>

            {/* Метрики */}
            <div className="flex gap-4 flex-shrink-0">
              <div className="text-center">
                <p className="text-2xl font-black text-white leading-none">{bank.rating}</p>
                <p className="text-[8px] text-white/60 mt-0.5">Рейтинг</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white leading-none">{bank.avgDaysReview}</p>
                <p className="text-[8px] text-white/60 mt-0.5">Дней решение</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white leading-none">{(bank.approvedCount / 1000).toFixed(1)}к</p>
                <p className="text-[8px] text-white/60 mt-0.5">Одобрено</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Основной контент ── */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Левая колонка: услуги ── */}
          <div className="lg:col-span-2">
            <h2 className="text-[15px] font-black mb-5" style={{ color: '#0B2B5E' }}>
              Финансовые продукты
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bank.services.map((service, i) => (
                <ServiceCard key={i} service={service} accent={bank.accentColor} />
              ))}
            </div>

            {/* О банке */}
            <div
              className="mt-6 p-5 bg-white rounded-2xl border"
              style={{ borderColor: 'rgba(11,43,94,0.20)' }}
            >
              <h3 className="text-[12px] font-black mb-2" style={{ color: '#0B2B5E' }}>О банке</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">{bank.description}</p>
            </div>
          </div>

          {/* ── Правая колонка: CTA + контакты ── */}
          <div className="flex flex-col gap-4">

            {/* CTA: перейти в витрину ЭКСПО 365 */}
            <div
              className="p-6 rounded-2xl border flex flex-col gap-4"
              style={{
                background:   `linear-gradient(135deg, ${bank.accentColor}10 0%, ${bank.accentColor}05 100%)`,
                borderColor:  `${bank.accentColor}30`,
              }}
            >
              <div>
                <p className="text-[13px] font-black mb-1" style={{ color: '#0B2B5E' }}>
                  Подобрать оборудование
                </p>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Перейдите в каталог и нажмите «Нужна фин. поддержка» на карточке нужного товара.
                  Заявка попадёт напрямую в {bank.shortName}.
                </p>
              </div>
              <Link
                href="/horeca/marketplace"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-white w-full transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#F26522' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Открыть витрину ЭКСПО 365
              </Link>
            </div>

            {/* Контакты */}
            <div
              className="p-5 bg-white rounded-2xl border"
              style={{ borderColor: 'rgba(11,43,94,0.20)' }}
            >
              <p className="text-[11px] font-black mb-3" style={{ color: '#0B2B5E' }}>Контакты</p>
              <div className="flex flex-col gap-2">
                {bank.contactPhone && (
                  <a
                    href={`tel:${bank.contactPhone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 text-[11px] font-medium text-slate-600 hover:text-[#F26522] transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.67 9.78 19.79 19.79 0 0 1 1.56 1.18a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 6.57a16 16 0 0 0 6.29 6.29l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92z" />
                    </svg>
                    {bank.contactPhone}
                  </a>
                )}
                {bank.contactEmail && (
                  <a
                    href={`mailto:${bank.contactEmail}`}
                    className="flex items-center gap-2 text-[11px] font-medium text-slate-600 hover:text-[#F26522] transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {bank.contactEmail}
                  </a>
                )}
              </div>
            </div>

            {/* Все банки */}
            <Link
              href="/horeca/finance"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-bold text-slate-500 bg-white border transition-all duration-150 hover:border-[#F26522]/50 hover:text-[#F26522]"
              style={{ borderColor: 'rgba(11,43,94,0.12)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Все банки-партнёры
            </Link>

          </div>
        </div>
      </main>
    </div>
  );
}
