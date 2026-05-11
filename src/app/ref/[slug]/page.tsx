'use client';

/**
 * /ref/[slug] — Реферальный лендинг EXPO 365
 * ────────────────────────────────────────────
 * При переходе по ссылке expo365.com/ref/ooo-test:
 *   1. Записывает slug в localStorage ('expo365_ref')
 *   2. Перенаправляет на витрину экспонента /horeca/exhibitors/[slug]
 *
 * После редиректа EcosystemProvider (в /horeca layout) читает localStorage
 * и диспатчит SET_REFERRAL — байер видит партнёрские цены.
 *
 * АРХИТЕКТУРНАЯ ЗАМЕТКА:
 *   Этот маршрут (/ref/*) находится ВНЕ /horeca, поэтому EcosystemProvider
 *   здесь недоступен. Вместо useEcosystem() используем localStorage напрямую.
 *   EcosystemProvider читает флаг при монтировании через:
 *     useEffect(() => { const ref = localStorage.getItem('expo365_ref'); ... }, []);
 *
 * TODO (Supabase):
 *   INSERT INTO referral_visits (exhibitor_slug, buyer_id, visited_at)
 *   VALUES (:slug, auth.uid(), now())
 *   ON CONFLICT DO NOTHING;
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Карта slug → exhibitor-страница ────────────────────────────────────────
// TODO: заменить на Supabase-запрос: SELECT exhibitor_page_slug FROM ref_links WHERE slug = :slug
const REFERRAL_EXHIBITOR_MAP: Record<string, string> = {
  'ooo-test': 'ooo-test',
  // другие экспоненты добавляются здесь
};

// ─── Карта slug → отображаемое имя компании ────────────────────────────────
const REFERRAL_COMPANY_NAMES: Record<string, string> = {
  'ooo-test': 'ООО «ТЕСТ»',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ReferralPage({ params }: PageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'invalid'>('loading');
  const [slug,   setSlug]   = useState<string>('');

  useEffect(() => {
    params.then(({ slug: paramSlug }) => {
      setSlug(paramSlug);

      const exhibitorSlug = REFERRAL_EXHIBITOR_MAP[paramSlug];
      if (!exhibitorSlug) {
        setStatus('invalid');
        return;
      }

      // 1. Сохраняем referral в localStorage.
      //    EcosystemProvider читает его при монтировании в /horeca layout И
      //    диспатчит SET_REFERRAL автоматически — без явного вызова dispatch здесь.
      try {
        localStorage.setItem('expo365_ref', paramSlug);
      } catch {
        // localStorage может быть недоступен
      }

      // 2. Небольшая задержка для визуального feedback
      setStatus('redirecting');
      const timer = setTimeout(() => {
        router.replace(`/horeca/exhibitors/${exhibitorSlug}`);
      }, 1800);

      return () => clearTimeout(timer);
    });
  }, [params, router]);

  const companyName = REFERRAL_COMPANY_NAMES[slug] ?? slug;

  // ── ERROR STATE ─────────────────────────────────────────────────────────────
  if (status === 'invalid') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0B2B5E 0%, #1a4080 60%, #0d3570 100%)',
        }}
      >
        {/* Blueprint grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 28px),' +
              'repeating-linear-gradient(90deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 28px)',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 text-center px-6 max-w-md">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(242,101,34,0.15)', border: '1px solid rgba(242,101,34,0.3)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Ссылка недействительна</h1>
          <p className="text-white/60 text-sm mb-6">
            Реферальная ссылка «/ref/{slug}» не найдена в системе EXPO 365.
          </p>
          <a
            href="/horeca"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:brightness-110"
            style={{ backgroundColor: '#F26522', boxShadow: '0 4px 16px rgba(242,101,34,0.40)' }}
          >
            На главную HoReCa
          </a>
        </div>
      </div>
    );
  }

  // ── LOADING / REDIRECTING STATE ──────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B2B5E 0%, #1a4080 60%, #0d3570 100%)',
      }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 28px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 28px)',
        }}
        aria-hidden="true"
      />

      {/* Декоративный оранжевый луч */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 opacity-30"
        style={{ background: 'linear-gradient(to bottom, #F26522, transparent)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 text-center px-6 max-w-sm w-full">

        {/* Логотип / иконка */}
        <div className="flex items-center justify-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
        </div>

        {/* Статус */}
        <div className="mb-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: 'rgba(242,101,34,0.20)', color: '#F26522' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#F26522' }}
              aria-hidden="true"
            />
            Реферальная ссылка
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
          Добро пожаловать!
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8">
          Вы переходите на витрину партнёра{' '}
          <span className="text-white font-semibold">{companyName}</span>.{' '}
          {status === 'redirecting' && 'Для вас активированы партнёрские цены.'}
        </p>

        {/* Прогресс-индикатор */}
        {status === 'redirecting' && (
          <div className="space-y-4">
            {/* Анимированная линия */}
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
            >
              <div
                className="h-full rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(90deg, #0B2B5E 0%, #F26522 100%)',
                  width: '100%',
                  animationDuration: '1.5s',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Партнёрский badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="text-white/80 text-[12px] font-medium">
                Партнёрские цены активированы
              </span>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {status === 'loading' && (
          <div className="flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#F26522' }}
              aria-label="Загрузка..."
            />
          </div>
        )}

        {/* Подпись */}
        <p className="mt-8 text-[11px] text-white/30 font-medium uppercase tracking-widest">
          EXPO 365 · B2B Ecosystem
        </p>
      </div>
    </div>
  );
}
