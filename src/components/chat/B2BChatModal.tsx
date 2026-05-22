'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/components/chat/B2BChatModal.tsx
// B2B Chat Modal — модальное окно отправки сообщения экспоненту
//
// Дизайн-требования (Blueprint 3.0):
//   • border-radius: 16px (rounded-2xl) для всех пузырей, полей, контейнера
//   • Header: Deep Blue #0B2B5E
//   • CTA «Отправить»: Vibrant Orange #F26522
//   • Textarea: bg #F8FAFC, border rgba(11,43,94,0.18)
//   • Без эмодзи в интерфейсе
//   • Высокий контраст (text-[#0B2B5E], placeholder-slate-400)
//
// Логика:
//   INSERT → messages (sender_id, receiver_id, text, created_at)
//   • senderId передаётся из родителя (из Server Component page.tsx)
//   • Fallback: createClient().auth.getUser() — @supabase/ssr cookies-based
//     ВАЖНО: использовать createClient из utils/supabase/client, а НЕ
//     getSupabaseClient() из lib/supabase — старый клиент читает localStorage,
//     тогда как middleware SSR хранит сессию в cookies.
//   • Кнопка НЕ блокируется по senderId — ошибка показывается при отправке
//
// Доступность:
//   • role="dialog" aria-modal="true"
//   • Фокус помещается на textarea при открытии
//   • Закрытие: крестик, кнопка Отмена, клик по backdrop
//   • Escape → onClose
// ════════════════════════════════════════════════════════════════════════════

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
} from 'react';
// FIXED: используем createBrowserClient (@supabase/ssr) — сессия хранится в
// cookies (совместимо с SSR middleware), а не в localStorage (старый клиент).
import { createClient } from '@/utils/supabase/client';

// ── Inline SVG иконки (без зависимостей) ─────────────────────────────────

function IconClose() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconCheckDouble() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#27AE60"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
      <polyline points="16 6 13 9" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function IconAlertCircle() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="flex-shrink-0 mt-0.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Типы компонента ───────────────────────────────────────────────────────

export interface B2BChatModalProps {
  /** Управляет видимостью модального окна */
  isOpen: boolean;
  /** Закрыть модальное окно */
  onClose: () => void;
  /** UUID экспонента из exhibitors.id — станет receiver_id в messages */
  exhibitorId: string;
  /** Отображаемое название компании (для заголовка) */
  exhibitorName: string;
  /**
   * auth.uid() текущего пользователя — передаётся из Server Component.
   * Если null (анонимный / не авторизован) — будет выполнен fallback
   * через getSupabaseClient().auth.getUser() + useAuth() на клиенте.
   */
  senderId: string | null;
  /**
   * Роль текущего пользователя из Server Component (app_metadata).
   * 'visitor' | 'exhibitor' — разрешён чат.
   * 'private_person' — чат запрещён, показать специальное сообщение.
   * null — аноним.
   */
  userRole?: 'visitor' | 'exhibitor' | 'private_person' | null;
}

// ════════════════════════════════════════════════════════════════════════════
// B2BChatModal
// ════════════════════════════════════════════════════════════════════════════

export default function B2BChatModal({
  isOpen,
  onClose,
  exhibitorId,
  exhibitorName,
  senderId,
  userRole,
}: B2BChatModalProps) {
  const [body,      setBody]      = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent,    setIsSent]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Резолвленный sender_id: приоритет:
   *   1. prop senderId (Server Component) — auth.uid(), всегда свежий
   *   2. createClient().auth.getUser() — cookies-based @supabase/ssr клиент
   *
   * ВАЖНО: `isResolvingSession` инициализируется `true` когда `senderId` ещё
   * не известен (null prop), чтобы NOT показывать "Войдите в систему" пока идёт
   * асинхронная проверка. Без этого был бы ложный флэш isAnonymous=true.
   */
  const [resolvedSenderId, setResolvedSenderId] = useState<string | null>(senderId);
  // Если senderId не передан из Server Component — начинаем в состоянии "resolving"
  // чтобы предотвратить ложный flash предупреждения "Войдите в систему".
  const [isResolvingSession, setIsResolvingSession] = useState(!senderId);

  // ── Session Resolution ────────────────────────────────────────────────────
  // При открытии модалки определяем sender_id.
  // Приоритет:
  //   1. senderId prop из Server Component (auth.uid() — всегда свежий)
  //   2. createClient().auth.getUser() — cookies-based @supabase/ssr клиент
  //      (ИСПРАВЛЕНИЕ: старый getSupabaseClient() из lib/supabase использовал
  //       localStorage и не видел сессию, созданную SSR-middleware в cookies)
  useEffect(() => {
    if (!isOpen) return;

    // Если senderId уже передан из Server Component — используем его напрямую
    if (senderId) {
      setResolvedSenderId(senderId);
      return;
    }

    // Иначе пытаемся определить на клиенте через cookies-based клиент
    let cancelled = false;
    setIsResolvingSession(true);

    async function resolveSession() {
      try {
        // createClient() из @/utils/supabase/client использует createBrowserClient
        // из @supabase/ssr — читает сессию из cookies, а не из localStorage.
        const supabase = createClient();
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (!cancelled && supabaseUser?.id) {
          setResolvedSenderId(supabaseUser.id);
          return;
        }
      } catch {
        // Supabase не настроен или env-переменные не заданы — не фатально
      }

      // Не удалось определить пользователя
      if (!cancelled) {
        setResolvedSenderId(null);
      }
    }

    resolveSession().finally(() => {
      if (!cancelled) setIsResolvingSession(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, senderId]);

  // Обновляем при смене prop (например, при логине без перезагрузки)
  useEffect(() => {
    if (senderId) {
      setResolvedSenderId(senderId);
    }
  }, [senderId]);

  // ── Сброс и фокус при открытии ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setBody('');
    setIsSent(false);
    setError(null);
    // Асинхронный фокус (после CSS-анимации появления)
    const timer = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // ── Escape → закрыть ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Авто-закрытие после успешной отправки ────────────────────────────────
  useEffect(() => {
    if (!isSent) return;
    const timer = setTimeout(() => {
      onClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [isSent, onClose]);

  // ── handleSend ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;

    // Проверка роли private_person
    if (userRole === 'private_person') {
      setError('Чат доступен только для бизнес-аккаунтов.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Финальная проверка sender_id перед отправкой
      let effectiveSenderId = resolvedSenderId;

      if (!effectiveSenderId) {
        // Последняя попытка через cookies-based Supabase клиент
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          effectiveSenderId = user?.id ?? null;
        } catch {
          // supabase не настроен или env-переменные не заданы
        }
      }

      if (!effectiveSenderId) {
        setError('Войдите в систему, чтобы отправить сообщение.');
        return;
      }

      // ── Supabase INSERT → messages ──────────────────────────────────────
      // Поле: text (не body) — соответствует схеме таблицы messages
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id:   effectiveSenderId,
          receiver_id: exhibitorId,
          text:        trimmed,
          created_at:  new Date().toISOString(),
        });

      if (insertError) {
        console.error('[B2BChatModal] insert error:', insertError);
        setError('Не удалось отправить сообщение. Попробуйте ещё раз.');
        return;
      }

      // Успех: показываем confirmation → авто-закрытие
      setIsSent(true);
      setBody('');
    } finally {
      setIsSending(false);
    }
  }, [body, exhibitorId, isSending, resolvedSenderId, userRole]);

  // ── Ctrl+Enter тоже отправляет ───────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!isOpen) return null;

  /**
   * Определяем, какое предупреждение показывать:
   *   • private_person → "Чат доступен только для бизнес-аккаунтов"
   *   • не авторизован   → "Войдите в систему, чтобы отправить сообщение"
   */
  const isPrivatePerson = userRole === 'private_person';
  const isAnonymous = !resolvedSenderId && !isResolvingSession && !isPrivatePerson;
  const loginWarning = isPrivatePerson
    ? 'Чат доступен только для бизнес-аккаунтов.'
    : 'Войдите в систему, чтобы отправить сообщение.';

  return (
    /*
     * Backdrop — #0B2B5E с opacity 55%.
     * Клик по backdrop (не по модалке) → onClose.
     */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Отправить сообщение — ${exhibitorName}`}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/*
       * Модальное окно — max-w-lg, rounded-2xl (16px), overflow-hidden.
       * Анимация появления: scale 0.96 → 1, opacity 0 → 1.
       */}
      <div
        className="w-full max-w-lg flex flex-col"
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(11,43,94,0.18)',
          overflow: 'hidden',
          maxHeight: '90vh',
          boxShadow: '0 24px 64px rgba(11,43,94,0.28)',
          animation: 'b2b-modal-in 160ms ease-out both',
        }}
      >

        {/* ── Заголовок (#0B2B5E) ────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-5 py-4"
          style={{ backgroundColor: '#0B2B5E' }}
        >
          {/* Иконка сообщения */}
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            <IconMessage />
          </span>

          {/* Заголовок + название компании */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-white leading-none">
              Деловое обращение
            </p>
            <p
              className="mt-0.5 text-xs font-medium truncate"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              {exhibitorName}
            </p>
          </div>

          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            aria-label="Закрыть"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.10)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* ── Тело модального окна ───────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto bg-white px-5 pt-5 pb-6 flex flex-col gap-4"
        >

          {/* ── Состояние «Отправлено» ──────────────────────────────────── */}
          {isSent ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(39,174,96,0.09)' }}
              >
                <IconCheckDouble />
              </span>
              <div>
                <p
                  className="text-base font-bold leading-snug"
                  style={{ color: '#0B2B5E' }}
                >
                  Сообщение отправлено
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 max-w-xs">
                  Менеджер компании получит ваш запрос и ответит в личном кабинете.
                </p>
              </div>

              {/* Закрыть */}
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-7 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.97]"
                style={{
                  backgroundColor: '#0B2B5E',
                  boxShadow: '0 4px 12px rgba(11,43,94,0.22)',
                }}
              >
                Закрыть
              </button>
            </div>

          ) : (
            /* ── Форма ввода ──────────────────────────────────────────────── */
            <>
              {/* Описание */}
              <p className="text-xs text-slate-500 leading-relaxed">
                Опишите ваш запрос. Менеджер ответит в разделе «Сообщения»
                вашего личного кабинета в ближайшее рабочее время.
              </p>

              {/* Textarea */}
              <div>
                <label
                  htmlFor="b2b-chat-body"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: '#0B2B5E' }}
                >
                  Текст обращения
                </label>
                <textarea
                  id="b2b-chat-body"
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Укажите интересующие товары, желаемый объём поставки, условия сотрудничества..."
                  rows={5}
                  maxLength={4000}
                  disabled={isPrivatePerson}
                  className="w-full resize-none text-sm leading-relaxed text-[#0B2B5E] placeholder-slate-400 outline-none p-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderRadius: '12px',
                    border: '1.5px solid rgba(11,43,94,0.16)',
                    backgroundColor: '#F8FAFC',
                    transition: 'border-color 150ms',
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(11,43,94,0.50)';
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(11,43,94,0.16)';
                  }}
                  aria-label="Текст делового обращения"
                />
                {/* Счётчик символов */}
                <div className="flex justify-end mt-1.5">
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: body.length > 3800 ? '#F26522' : '#94a3b8' }}
                  >
                    {body.length} / 4000
                  </span>
                </div>
              </div>

              {/* Блок ошибки */}
              {error && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    color: '#b91c1c',
                  }}
                  role="alert"
                >
                  <IconAlertCircle />
                  {error}
                </div>
              )}

              {/* Подсказка Ctrl+Enter */}
              {!isPrivatePerson && (
                <p className="text-[10px] text-slate-400 -mt-1">
                  Ctrl + Enter — быстрая отправка
                </p>
              )}

              {/* Кнопки действия */}
              <div className="flex gap-3 pt-1">
                {/* Отмена */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-2xl border text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors duration-150"
                  style={{ borderColor: 'rgba(11,43,94,0.15)' }}
                >
                  Отмена
                </button>

                {/* Отправить — #F26522 */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!body.trim() || isSending || isResolvingSession || isPrivatePerson}
                  className="flex-1 h-11 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#F26522',
                    boxShadow: '0 4px 14px rgba(242,101,34,0.38)',
                  }}
                >
                  {isSending ? (
                    <>
                      <IconSpinner />
                      <span>Отправка...</span>
                    </>
                  ) : isResolvingSession ? (
                    <>
                      <IconSpinner />
                      <span>Проверка...</span>
                    </>
                  ) : (
                    'Отправить'
                  )}
                </button>
              </div>

              {/* Предупреждение для незалогиненного или private_person */}
              {(isAnonymous || isPrivatePerson) && (
                <p
                  className="text-center text-xs"
                  style={{ color: '#F26522' }}
                >
                  {loginWarning}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Keyframe анимация (once, лёгкая) */}
      <style>{`
        @keyframes b2b-modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}
