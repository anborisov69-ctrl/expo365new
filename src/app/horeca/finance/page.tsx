/**
 * /horeca/finance — Витрина финансовых партнёров EXPO 365
 * ─────────────────────────────────────────────────────────
 * Server Component. Показывает плашки банков-партнёров (ВТБ, Точка, Аренза, Альфа-Банк)
 * и hero-секцию с призывом к действию.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BANKS } from '@/data/banksData';
import type { Bank, BankService } from '@/types/finance';

export const metadata: Metadata = {
  title:       'Финансы и лизинг | EXPO 365 HoReCa',
  description: 'Партнёрские банки и лизинговые компании для финансирования оборудования HoReCa. ВТБ, Точка, Аренза, Альфа-Банк.',
};

// ── Иконки услуг ──────────────────────────────────────────────────────────────

function ServiceIcon({ type }: { type: BankService['type'] }) {
  if (type === 'leasing') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
  if (type === 'credit') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
  if (type === 'rko') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
  if (type === 'overdraft') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

// ── Плашка банка ──────────────────────────────────────────────────────────────

function BankCard({ bank }: { bank: Bank }) {
  const initials = bank.shortName.slice(0, 2).toUpperCase();
  const serviceLabels: Record<string, string> = {
    leasing: 'Лизинг', credit: 'Кредит', rko: 'РКО', overdraft: 'Овердрафт', factoring: 'Факторинг',
  };
  const uniqueServiceTypes = [...new Set(bank.services.map((s) => s.type))];

  return (
    <Link
      href={`/horeca/finance/${bank.slug}`}
      className="group flex flex-col bg-white rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderColor: 'rgba(11,43,94,0.20)' }}
      aria-label={`${bank.name} — ${bank.tagline}`}
    >
      {/* Цветная полоска сверху (бренд-кит банка) */}
      <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: bank.accentColor }} aria-hidden="true" />

      {/* Тело карточки */}
      <div className="flex flex-col flex-1 p-5">

        {/* Шапка: лого + название + рейтинг */}
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Логотип / инициал */}
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm text-white shadow-sm"
            style={{ backgroundColor: bank.accentColor }}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black leading-tight truncate" style={{ color: '#0B2B5E' }}>
              {bank.name}
            </p>
            {bank.horecaFocus && (
              <span
                className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider leading-none"
                style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}
              >
                ★ HoReCa Focus
              </span>
            )}
          </div>

          {/* Рейтинг */}
          <div className="flex-shrink-0 text-right">
            <p className="text-[15px] font-black leading-none" style={{ color: '#0B2B5E' }}>{bank.rating}</p>
            <p className="text-[7px] text-slate-400 leading-none mt-0.5">/5.0</p>
          </div>
        </div>

        {/* Тэглайн */}
        <p className="text-[11px] font-medium leading-snug text-slate-600 mb-3 line-clamp-2">
          {bank.tagline}
        </p>

        {/* Сервисы-теги */}
        <div className="flex flex-wrap gap-1 mb-4">
          {uniqueServiceTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
              style={{ backgroundColor: `${bank.accentColor}14`, color: bank.accentColor }}
            >
              <ServiceIcon type={type} />
              {serviceLabels[type]}
            </span>
          ))}
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div
            className="flex flex-col p-2.5 rounded-xl"
            style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
          >
            <span className="text-[16px] font-black leading-none tabular-nums" style={{ color: '#0B2B5E' }}>
              {bank.approvedCount.toLocaleString('ru-RU')}
            </span>
            <span className="text-[8px] text-slate-400 mt-0.5">Одобрено заявок</span>
          </div>
          <div
            className="flex flex-col p-2.5 rounded-xl"
            style={{ backgroundColor: 'rgba(11,43,94,0.04)' }}
          >
            <span className="text-[16px] font-black leading-none tabular-nums" style={{ color: '#0B2B5E' }}>
              {bank.avgDaysReview} {bank.avgDaysReview === 1 ? 'день' : bank.avgDaysReview < 5 ? 'дня' : 'дней'}
            </span>
            <span className="text-[8px] text-slate-400 mt-0.5">Среднее решение</span>
          </div>
        </div>
      </div>

      {/* Футер карточки */}
      <div
        className="px-5 py-3 flex items-center justify-between border-t"
        style={{ borderColor: 'rgba(11,43,94,0.07)', backgroundColor: 'rgba(11,43,94,0.02)' }}
      >
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
          Узнать об условиях
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#F26522" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </Link>
  );
}

// ── Статистическая плашка ─────────────────────────────────────────────────────

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-4">
      <span className="text-3xl font-black leading-none" style={{ color: '#F26522' }}>{value}</span>
      <span className="text-[10px] text-white/70 mt-1 text-center leading-tight">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinancePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>

      {/* ── Hero секция ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0B2B5E 0%, #1a4a8a 60%, #0d3570 100%)' }}
        aria-labelledby="finance-hero-heading"
      >
        {/* Декоративная сетка */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,1) 40px, rgba(255,255,255,1) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,1) 40px, rgba(255,255,255,1) 41px)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/50 mb-8" aria-label="Хлебные крошки">
            <Link href="/horeca" className="hover:text-white/80 transition-colors">EXPO 365</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/80" aria-current="page">Финансы и лизинг</span>
          </nav>

          {/* Заголовок */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-4"
                style={{ backgroundColor: 'rgba(242,101,34,0.2)', color: '#F26522' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Финансы и лизинг
              </div>
              <h1 id="finance-hero-heading" className="text-3xl lg:text-4xl font-black text-white leading-tight mb-3">
                Оборудование сегодня —<br />
                <span style={{ color: '#F26522' }}>оплата по графику</span>
              </h1>
              <p className="text-[13px] text-white/70 leading-relaxed">
                Партнёрские банки и лизинговые компании EXPO 365 одобряют финансирование прямо&nbsp;из&nbsp;карточки товара.
                Выберите банк, отправьте заявку — решение за 1–4 рабочих дня.
              </p>
            </div>

            {/* CTA */}
            <div className="flex-shrink-0">
              <Link
                href="/horeca/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#F26522' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                В витрину ЭКСПО 365
              </Link>
            </div>
          </div>

          {/* Статистика */}
          <div
            className="flex flex-wrap mt-10 rounded-2xl overflow-hidden divide-x divide-white/10"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          >
            <StatChip value="4" label="Банка-партнёра" />
            <StatChip value="7 410" label="Одобрено заявок" />
            <StatChip value="от 5,9%" label="Ставка лизинга" />
            <StatChip value="1 день" label="Минимальный срок рассмотрения" />
          </div>
        </div>
      </section>

      {/* ── Основной контент ── */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Секция: банки-партнёры */}
        <section aria-labelledby="banks-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="banks-heading" className="text-lg font-black" style={{ color: '#0B2B5E' }}>
                Банки-партнёры
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Нажмите на карточку, чтобы узнать об условиях и отправить заявку
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BANKS.map((bank) => (
              <BankCard key={bank.id} bank={bank} />
            ))}
          </div>
        </section>

        {/* Секция: Как это работает */}
        <section className="mt-14" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="text-lg font-black mb-6" style={{ color: '#0B2B5E' }}>
            Как получить финансирование
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: '1', title: 'Выберите товар', desc: 'Найдите нужное оборудование в каталоге EXPO 365 стоимостью от 50 000 ₽.' },
              { n: '2', title: 'Нажмите кнопку', desc: 'На карточке товара кликните «Нужна фин. поддержка» и выберите банк.' },
              { n: '3', title: 'Заявка ушла', desc: 'Данные о товаре и вашей компании автоматически попадают в кабинет банка.' },
              { n: '4', title: 'Получите ответ', desc: 'Банк ставит статус «Предварительно одобрено» и связывается с вами.' },
            ].map((step) => (
              <div
                key={step.n}
                className="relative flex flex-col p-5 bg-white rounded-2xl border"
                style={{ borderColor: 'rgba(11,43,94,0.20)' }}
              >
                {/* Номер шага */}
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white mb-3 flex-shrink-0"
                  style={{ backgroundColor: '#F26522' }}
                  aria-hidden="true"
                >
                  {step.n}
                </span>
                <p className="text-[12px] font-black mb-1" style={{ color: '#0B2B5E' }}>{step.title}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{step.desc}</p>

                {/* Стрелка между шагами (кроме последнего) */}
                {step.n !== '4' && (
                  <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Секция: FAQ */}
        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-black mb-6" style={{ color: '#0B2B5E' }}>
            Частые вопросы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                q: 'Для каких товаров доступно финансирование?',
                a: 'Для любого оборудования в каталоге EXPO 365 стоимостью от 50 000 рублей. Кнопка «Нужна фин. поддержка» активируется автоматически.',
              },
              {
                q: 'Можно ли получить лизинг без первоначального взноса?',
                a: 'Да — партнёры Аренза и Точка предлагают лизинг без первого взноса. Уточните условия на странице конкретного банка.',
              },
              {
                q: 'Сколько времени занимает одобрение?',
                a: 'Точка рассматривает заявки за 1 рабочий день, Аренза — за 2 дня, ВТБ и Альфа-Банк — за 3–4 дня.',
              },
              {
                q: 'Можно ли подать в несколько банков сразу?',
                a: 'Да. Вы можете отправить заявки в несколько банков независимо. Каждый банк видит только свои заявки.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 bg-white rounded-2xl border"
                style={{ borderColor: 'rgba(11,43,94,0.20)' }}
              >
                <p className="text-[12px] font-bold mb-2" style={{ color: '#0B2B5E' }}>{item.q}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
