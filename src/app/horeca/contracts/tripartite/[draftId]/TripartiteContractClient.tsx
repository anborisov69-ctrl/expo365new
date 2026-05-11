'use client';

import type { ReactNode } from 'react';

/**
 * TripartiteContractClient — Предпросмотр трёхстороннего договора финансирования
 * ─────────────────────────────────────────────────────────────────────────────
 * Стороны договора: Поставщик — Покупатель — Банк
 *
 * Данные читаются из sessionStorage (сохранены компонентом FinancingSolutionsSection
 * перед редиректом). Ключ: `tripartite_${draftId}`.
 *
 * UI tokens:
 *   Primary : #0B2B5E — шапка, заголовки, навигация
 *   Action  : #F26522 — акцент, платёж, подписание
 */

import { useState, useEffect } from 'react';
import { useRouter }            from 'next/navigation';
import type { TripartiteContractDraft } from '@/types/finance';

// ── Утилиты ───────────────────────────────────────────────────────────────────

function formatMoney(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style:                 'currency',
    currency:              'RUB',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
  });
}

function serviceLabel(t: string): string {
  const map: Record<string, string> = {
    leasing:   'Финансовый лизинг',
    credit:    'Кредитование',
    overdraft: 'Овердрафт',
    factoring: 'Факторинг',
    rko:       'РКО',
  };
  return map[t] ?? t;
}

// ── Компонент «Сторона договора» ──────────────────────────────────────────────

interface PartyCardProps {
  role:    string;
  name:    string;
  icon:    ReactNode;
  accent?: string;
  details?: string[];
}

function PartyCard({ role, name, icon, accent = '#0B2B5E', details }: PartyCardProps) {
  return (
    <div
      className="flex-1 min-w-0 rounded-2xl p-5 border"
      style={{ borderColor: 'rgba(11,43,94,0.10)', backgroundColor: '#fafbfd' }}
    >
      {/* Иконка + роль */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}15` }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: accent }}
        >
          {role}
        </span>
      </div>
      <p className="text-[13px] font-black leading-snug" style={{ color: '#0B2B5E' }}>
        {name}
      </p>
      {details?.map((d, i) => (
        <p key={i} className="text-[9px] text-slate-400 mt-0.5">{d}</p>
      ))}
    </div>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────

interface TripartiteContractClientProps {
  draftId: string;
}

export default function TripartiteContractClient({ draftId }: TripartiteContractClientProps) {
  const router = useRouter();

  const [contract,   setContract]   = useState<TripartiteContractDraft | null>(null);
  const [notFound,   setNotFound]   = useState(false);
  const [status,     setStatus]     = useState<'draft' | 'sent_to_parties' | 'signed'>('draft');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = sessionStorage.getItem(`tripartite_${draftId}`);
    if (!raw) {
      setNotFound(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as TripartiteContractDraft;
      setContract(parsed);
    } catch {
      setNotFound(true);
    }
  }, [draftId]);

  // ── Отправка сторонам ──────────────────────────────────────────────────────
  async function handleSendToParties() {
    setSubmitting(true);
    // TODO (production): PATCH /api/tender-financing/contracts/${draftId} → status = 'sent_to_parties'
    await new Promise((r) => setTimeout(r, 800));
    setStatus('sent_to_parties');
    setSubmitting(false);
  }

  // ── Сохранение PDF ─────────────────────────────────────────────────────────
  function handleSavePDF() {
    // TODO: Вызов headless Chrome или внешнего PDF-сервиса
    alert('Функция сохранения PDF будет доступна в production-версии.');
  }

  // ── Состояния загрузки / ошибки ────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div
          className="max-w-md w-full bg-white rounded-2xl border p-8 text-center"
          style={{ borderColor: 'rgba(11,43,94,0.10)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h1 className="text-[18px] font-black mb-2" style={{ color: '#0B2B5E' }}>
            Договор не найден
          </h1>
          <p className="text-[11px] text-slate-400 mb-6">
            Черновик договора <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[9px]">{draftId}</code>{' '}
            не существует или срок его действия истёк. Вернитесь к тендеру и примите финансирование повторно.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#F26522' }}
          >
            ← Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl animate-pulse" style={{ backgroundColor: 'rgba(11,43,94,0.10)' }} />
          <p className="text-[11px] text-slate-400">Загружаем договор...</p>
        </div>
      </div>
    );
  }

  const { financingOffer: offer } = contract;
  const downAmt = offer.downPaymentPercent
    ? Math.round(contract.dealAmount * (offer.downPaymentPercent / 100))
    : 0;
  const principal = contract.dealAmount - downAmt;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>

      {/* ── Навигация ── */}
      <div
        className="sticky top-0 z-40 px-6 py-3 flex items-center justify-between border-b"
        style={{ backgroundColor: '#0B2B5E', borderColor: 'rgba(255,255,255,0.10)' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-[10px]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Вернуться к тендеру
        </button>

        <div className="flex items-center gap-2">
          {status === 'sent_to_parties' && (
            <span
              className="text-[8px] font-black px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}
            >
              ✓ Отправлено сторонам
            </span>
          )}
          <span
            className="text-[8px] font-black px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
          >
            {status === 'draft' ? 'ЧЕРНОВИК' : status === 'sent_to_parties' ? 'НА СОГЛАСОВАНИИ' : 'ПОДПИСАН'}
          </span>
        </div>
      </div>

      {/* ── Документ ── */}
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Шапка документа */}
        <div
          className="rounded-t-3xl px-8 py-6 text-white"
          style={{ backgroundColor: '#0B2B5E' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] text-white/50 uppercase tracking-widest font-bold mb-1">
                EXPO 365 · Трёхсторонний договор финансирования
              </p>
              <h1 className="text-[20px] font-black leading-snug max-w-[calc(100%-8rem)]">
                {contract.tenderTitle}
              </h1>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] text-white/50">Договор №</p>
              <p className="font-mono font-black text-[12px]">
                {contract.id.slice(-10).toUpperCase()}
              </p>
              <p className="text-[8px] text-white/50 mt-1">от {formatDate(contract.createdAt)}</p>
            </div>
          </div>

          {/* Стрип статусов финансирования */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F26522] flex-shrink-0" aria-hidden="true" />
              <span className="text-[9px] font-bold text-white/80">{serviceLabel(offer.serviceType)}</span>
            </div>
            <span className="text-white/20" aria-hidden="true">·</span>
            <span className="text-[9px] text-white/80">{offer.ratePercent}% годовых</span>
            <span className="text-white/20" aria-hidden="true">·</span>
            <span className="text-[9px] text-white/80">{offer.termMonths} месяцев</span>
            <span className="text-white/20" aria-hidden="true">·</span>
            <span className="text-[9px] font-black" style={{ color: '#F26522' }}>
              {formatMoney(contract.monthlyPayment)} / мес.
            </span>
          </div>
        </div>

        {/* Тело документа */}
        <div
          className="bg-white rounded-b-3xl px-8 py-6 border border-t-0 shadow-sm"
          style={{ borderColor: 'rgba(11,43,94,0.10)' }}
        >

          {/* ── 1. Стороны договора ── */}
          <section className="mb-8" aria-labelledby="parties-title">
            <h2 id="parties-title" className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: '#0B2B5E' }}>
              § 1. Стороны договора
            </h2>
            <div className="flex flex-col md:flex-row gap-3">
              {/* Поставщик */}
              <PartyCard
                role="Поставщик"
                name={contract.supplierName}
                accent="#0B2B5E"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B2B5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                }
                details={['Сторона 1 — Продавец оборудования']}
              />

              {/* Соединительная стрелка */}
              <div className="flex items-center justify-center text-slate-300 font-black text-xl flex-shrink-0 hidden md:flex" aria-hidden="true">
                ⇄
              </div>

              {/* Покупатель */}
              <PartyCard
                role="Покупатель"
                name={contract.buyerCompany}
                accent="#F26522"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                }
                details={['Сторона 2 — Получатель оборудования']}
              />

              <div className="flex items-center justify-center text-slate-300 font-black text-xl flex-shrink-0 hidden md:flex" aria-hidden="true">
                ⇄
              </div>

              {/* Банк */}
              <PartyCard
                role="Финансирующий банк"
                name={contract.bankName}
                accent={offer.bankAccentColor}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={offer.bankAccentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                }
                details={['Сторона 3 — Финансовый партнёр EXPO 365']}
              />
            </div>
          </section>

          <div className="h-px bg-slate-100 mb-8" aria-hidden="true" />

          {/* ── 2. Предмет договора ── */}
          <section className="mb-8" aria-labelledby="subject-title">
            <h2 id="subject-title" className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: '#0B2B5E' }}>
              § 2. Предмет договора
            </h2>
            <div
              className="p-4 rounded-2xl text-[11px] text-slate-600 leading-relaxed"
              style={{ backgroundColor: 'rgba(11,43,94,0.03)' }}
            >
              <p>
                В рамках тендерной процедуры EXPO 365 № <strong className="text-[#0B2B5E]">{contract.tenderId.slice(-8).toUpperCase()}</strong>,
                <strong className="text-[#0B2B5E]"> {contract.bankName}</strong> (Сторона 3) предоставляет финансирование
                <strong className="text-[#0B2B5E]"> {contract.buyerCompany}</strong> (Сторона 2) для оплаты поставки оборудования
                от <strong className="text-[#0B2B5E]"> {contract.supplierName}</strong> (Сторона 1).
              </p>
              <p className="mt-2">
                Тип финансирования: <strong className="text-[#0B2B5E]">{serviceLabel(offer.serviceType)}</strong>.
                Оборудование является предметом обеспечения обязательств по договору.
              </p>
            </div>
          </section>

          <div className="h-px bg-slate-100 mb-8" aria-hidden="true" />

          {/* ── 3. Финансовые условия ── */}
          <section className="mb-8" aria-labelledby="financial-title">
            <h2 id="financial-title" className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: '#0B2B5E' }}>
              § 3. Финансовые условия
            </h2>

            {/* Ежемесячный платёж — главный акцент */}
            <div
              className="flex items-center justify-between p-5 rounded-2xl mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(242,101,34,0.08) 0%, rgba(11,43,94,0.06) 100%)',
                border:     '1px solid rgba(242,101,34,0.20)',
              }}
            >
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                  Ежемесячный аннуитетный платёж
                </p>
                <p className="text-[30px] font-black leading-none tabular-nums" style={{ color: '#F26522' }}>
                  {formatMoney(contract.monthlyPayment)}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  на протяжении {offer.termMonths} месяцев
                </p>
              </div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(242,101,34,0.12)' }}
                aria-hidden="true"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
            </div>

            {/* Таблица параметров */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Сумма сделки',        value: formatMoney(contract.dealAmount),  accent: true },
                { label: 'Сумма финансирования', value: formatMoney(principal) },
                { label: 'Первоначальный взнос', value: downAmt > 0 ? formatMoney(downAmt) : 'Не предусмотрен' },
                { label: 'Процентная ставка',    value: `${offer.ratePercent}% годовых` },
                { label: 'Срок финансирования',  value: `${offer.termMonths} месяцев` },
                { label: 'Максимальная сумма',   value: formatMoney(offer.maxAmount) },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col p-3 rounded-xl"
                  style={{ backgroundColor: row.accent ? 'rgba(242,101,34,0.06)' : 'rgba(11,43,94,0.03)' }}
                >
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {row.label}
                  </span>
                  <span
                    className="text-[13px] font-black tabular-nums leading-tight"
                    style={{ color: row.accent ? '#F26522' : '#0B2B5E' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100 mb-8" aria-hidden="true" />

          {/* ── 4. Комментарий банка ── */}
          {offer.comment && (
            <section className="mb-8" aria-labelledby="bank-comment-title">
              <h2 id="bank-comment-title" className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: '#0B2B5E' }}>
                § 4. Условия банка
              </h2>
              <div
                className="p-4 rounded-2xl text-[11px] text-slate-600 leading-relaxed"
                style={{
                  backgroundColor: `${offer.bankAccentColor}0A`,
                  border:          `1px solid ${offer.bankAccentColor}25`,
                }}
              >
                <span className="font-black" style={{ color: offer.bankAccentColor }}>
                  {offer.bankName}:{' '}
                </span>
                {offer.comment}
              </div>
            </section>
          )}

          {/* ── 5. Подписи / Статус ── */}
          <section className="mb-6" aria-labelledby="signatures-title">
            <h2 id="signatures-title" className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: '#0B2B5E' }}>
              § {offer.comment ? 5 : 4}. Подписание
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { role: 'Поставщик', name: contract.supplierName,  signed: status === 'signed' },
                { role: 'Покупатель', name: contract.buyerCompany, signed: status !== 'draft' },
                { role: 'Банк',       name: contract.bankName,     signed: status === 'signed' },
              ].map(({ role, name, signed }, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border text-center"
                  style={{
                    borderColor:     signed ? '#6ee7b7' : 'rgba(11,43,94,0.10)',
                    backgroundColor: signed ? '#ecfdf5' : '#f8fafc',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-[13px]"
                    style={{ backgroundColor: signed ? '#10b981' : 'rgba(11,43,94,0.08)' }}
                    aria-hidden="true"
                  >
                    {signed ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#0B2B5E' }}>
                    {role}
                  </p>
                  <p className="text-[8px] text-slate-500 truncate">{name}</p>
                  <p className="text-[7px] mt-1" style={{ color: signed ? '#065f46' : '#94a3b8' }}>
                    {signed ? '✓ Подписано' : 'Ожидает подписи'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Дисклеймер ── */}
          <p className="text-[8px] text-slate-300 leading-relaxed text-center mt-4">
            Настоящий документ является предварительным черновиком трёхстороннего договора, 
            сформированным автоматически на платформе EXPO 365. Юридическую силу приобретает 
            после верификации и цифровой подписи всех сторон. EXPO 365 не является финансовым посредником.
          </p>

          {/* ── Действия ── */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={handleSavePDF}
              className="flex-1 py-3 px-4 rounded-xl text-[10px] font-black border transition-all hover:bg-slate-50 flex items-center justify-center gap-2"
              style={{ borderColor: 'rgba(11,43,94,0.15)', color: '#0B2B5E' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Скачать PDF
            </button>

            {status === 'draft' && (
              <button
                type="button"
                onClick={handleSendToParties}
                disabled={submitting}
                className="flex-[2] py-3 px-6 rounded-xl text-[11px] font-black text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#F26522' }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Отправляем сторонам...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Отправить всем сторонам
                  </>
                )}
              </button>
            )}

            {status === 'sent_to_parties' && (
              <div
                className="flex-[2] py-3 px-6 rounded-xl text-[11px] font-black text-center"
                style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}
              >
                ✓ Договор отправлен. Ожидаем подписи сторон.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
