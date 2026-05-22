'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/app/horeca/admin/messages/page.tsx
// Exhibitor Admin — Входящие B2B-сообщения
//
// Архитектура:
//   • Client Component: Supabase клиент + Realtime-подписка
//   • Начальная загрузка: getUser() → exhibitor_id → messages (50 last)
//   • Live-обновления: supabase.channel('messages:{id}') → INSERT
//   • Mark-as-read: UPDATE is_read=true при клике на диалог
//
// UX:
//   • Deep Blue #0B2B5E для контейнеров/заголовков
//   • Vibrant Orange #F26522 для непрочитанных / первичных действий
//   • rounded-2xl (16px) для пузырей, карточек, полей
//   • Без эмодзи. Высокий контраст. Профессиональный B2B стиль.
// ════════════════════════════════════════════════════════════════════════════

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  useMessagesRealtime,
  type DirectMessage,
} from '@/hooks/useMessagesRealtime';

// ── Утилиты ───────────────────────────────────────────────────────────────

/** Форматирует ISO-дату в «ЧЧ:ММ» по МСК */
function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour:     '2-digit',
      minute:   '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

/** Форматирует дату для разделителя «Сегодня / Вчера / дд.мм.гггг» */
function formatDateSeparator(iso: string): string {
  try {
    const d     = new Date(iso);
    const today = new Date();
    const diff  = Math.floor(
      (today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000,
    );
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Вчера';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

/** Обрезает текст до maxLen символов */
function truncate(text: string, maxLen = 60): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// ── Иконки (inline SVG) ───────────────────────────────────────────────────

function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Типы ──────────────────────────────────────────────────────────────────

/**
 * Группировка сообщений по отправителю.
 * Ключ — sender_id, значение — список сообщений (хронологический).
 */
interface ThreadGroup {
  senderId:   string;
  messages:   DirectMessage[];
  /** Последнее сообщение (для preview в списке) */
  lastMsg:    DirectMessage;
  /** Количество непрочитанных в треде */
  unread:     number;
}

// ════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТ СТРАНИЦЫ
// ════════════════════════════════════════════════════════════════════════════

export default function AdminMessagesPage() {
  const [exhibitorId, setExhibitorId] = useState<string | null>(null);
  const [threads,     setThreads]     = useState<ThreadGroup[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  /** UUID отправителя открытого треда (null = список тредов) */
  const [openThread, setOpenThread]   = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Инициализация: загружаем exhibitorId + messages ──────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = getSupabaseClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: euRow } = await supabase
          .from('exhibitor_users')
          .select('exhibitor_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!euRow?.exhibitor_id || cancelled) {
          setError('Учётная запись не привязана к экспоненту.');
          return;
        }

        setExhibitorId(euRow.exhibitor_id);

        // Последние 50 входящих сообщений (новейшие сначала, затем реверс для UI)
        const { data: rows, error: fetchErr } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, body, is_read, created_at')
          .eq('receiver_id', euRow.exhibitor_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchErr) {
          setError('Не удалось загрузить сообщения.');
          return;
        }

        if (!cancelled) {
          setThreads(buildThreads((rows ?? []).reverse() as DirectMessage[]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Автопрокрутка при открытом треде ────────────────────────────────────
  useEffect(() => {
    if (openThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [openThread, threads]);

  // ── Realtime: добавляем новое сообщение в нужный тред ───────────────────
  const handleNewMessage = useCallback((msg: DirectMessage) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.senderId === msg.sender_id);
      if (existing) {
        const updated: ThreadGroup = {
          ...existing,
          messages: [...existing.messages, msg],
          lastMsg:  msg,
          unread:   openThread === msg.sender_id ? existing.unread : existing.unread + 1,
        };
        return prev.map((t) => (t.senderId === msg.sender_id ? updated : t));
      }
      // Новый собеседник
      const newThread: ThreadGroup = {
        senderId: msg.sender_id,
        messages: [msg],
        lastMsg:  msg,
        unread:   openThread === msg.sender_id ? 0 : 1,
      };
      return [...prev, newThread];
    });
  }, [openThread]);

  useMessagesRealtime(exhibitorId, handleNewMessage);

  // ── Пометить тред как прочитанный ────────────────────────────────────────
  const markThreadRead = useCallback(async (senderId: string) => {
    if (!exhibitorId) return;
    const supabase = getSupabaseClient();

    // Локально сбрасываем счётчик
    setThreads((prev) =>
      prev.map((t) =>
        t.senderId === senderId
          ? { ...t, unread: 0, messages: t.messages.map((m) => ({ ...m, is_read: true })) }
          : t,
      ),
    );

    // Обновляем в БД (UPDATE is_read = true для всех непрочитанных этого треда)
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', exhibitorId)
      .eq('sender_id', senderId)
      .eq('is_read', false);
  }, [exhibitorId]);

  // ── Открыть тред ─────────────────────────────────────────────────────────
  const openThreadHandler = useCallback((senderId: string) => {
    setOpenThread(senderId);
    markThreadRead(senderId);
  }, [markThreadRead]);

  // ── Вернуться к списку ───────────────────────────────────────────────────
  const backToList = useCallback(() => setOpenThread(null), []);

  // ── Определяем активный тред ─────────────────────────────────────────────
  const activeThread = threads.find((t) => t.senderId === openThread) ?? null;

  // ── Общее количество непрочитанных ───────────────────────────────────────
  const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0);

  // ── Состояние: загрузка ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
        <IconSpinner />
        <span className="text-sm font-medium">Загрузка сообщений...</span>
      </div>
    );
  }

  // ── Состояние: ошибка ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  // ── Blueprint grid-паттерн ────────────────────────────────────────────────
  const gridBg: React.CSSProperties = {
    backgroundImage: [
      'repeating-linear-gradient(0deg,rgba(11,43,94,0.03) 0px,rgba(11,43,94,0.03) 1px,transparent 1px,transparent 24px)',
      'repeating-linear-gradient(90deg,rgba(11,43,94,0.03) 0px,rgba(11,43,94,0.03) 1px,transparent 1px,transparent 24px)',
    ].join(', '),
    backgroundColor: '#F8FAFC',
  };

  // ════════════════════════════════════════════════════════════════════════════
  // РЕНДЕР
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">

      {/* ── Заголовок страницы ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Иконка + заголовок */}
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: '#0B2B5E' }}
          >
            <IconInbox />
          </span>
          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ color: '#0B2B5E' }}
            >
              Входящие сообщения
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Деловые обращения от посетителей и партнёров
            </p>
          </div>
        </div>

        {/* Счётчик непрочитанных */}
        {totalUnread > 0 && (
          <span
            className="sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold text-white"
            style={{ backgroundColor: '#F26522' }}
          >
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black"
              style={{ color: '#F26522' }}
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
            непрочитанных
          </span>
        )}
      </div>

      {/* ── Основной контент ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(11,43,94,0.10)',
          boxShadow: '0 1px 8px rgba(11,43,94,0.06)',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* ── ЗАГОЛОВОК ПАНЕЛИ ─────────────────────────────────────────────── */}
        <div
          className="flex flex-shrink-0 items-center gap-3 px-5 py-4"
          style={{ backgroundColor: '#0B2B5E' }}
        >
          {/* Кнопка «Назад» в режиме открытого треда */}
          {openThread && (
            <button
              type="button"
              onClick={backToList}
              className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-2.5 py-1.5 transition-colors"
              style={{
                color: 'rgba(255,255,255,0.75)',
                backgroundColor: 'rgba(255,255,255,0.09)',
              }}
              aria-label="Вернуться к списку"
            >
              <IconBack />
              Все диалоги
            </button>
          )}
          <p className="text-xs font-black uppercase tracking-widest text-white leading-none">
            {activeThread
              ? `Диалог с отправителем`
              : `Входящие • ${threads.length} диалогов`
            }
          </p>
          {/* Realtime-индикатор */}
          {exhibitorId && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: '#27AE60',
                  boxShadow: '0 0 0 3px rgba(39,174,96,0.28)',
                }}
              />
              Live
            </span>
          )}
        </div>

        {/* ── СПИСОК ТРЕДОВ ─────────────────────────────────────────────────── */}
        {!openThread && (
          <div className="flex-1 overflow-y-auto" style={gridBg}>
            {threads.length === 0 ? (
              /* Пустое состояние */
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-4">
                <span style={{ color: 'rgba(11,43,94,0.20)' }}>
                  <IconEmpty />
                </span>
                <div className="text-center">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: '#0B2B5E' }}
                  >
                    Входящих сообщений нет
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Сообщения от посетителей вашей витрины будут появляться здесь в режиме реального времени.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(11,43,94,0.06)' }}>
                {/* Сортируем: сначала непрочитанные, затем по дате последнего сообщения */}
                {[...threads]
                  .sort((a, b) => {
                    if (b.unread !== a.unread) return b.unread - a.unread;
                    return new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime();
                  })
                  .map((thread) => (
                    <button
                      key={thread.senderId}
                      type="button"
                      onClick={() => openThreadHandler(thread.senderId)}
                      className="w-full flex items-start gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#0B2B5E]/[0.03]"
                    >
                      {/* Аватар-инициалы */}
                      <span
                        className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl text-white text-xs font-bold"
                        style={{ backgroundColor: '#0B2B5E' }}
                        aria-hidden="true"
                      >
                        <IconUser />
                      </span>

                      <div className="flex-1 min-w-0">
                        {/* sender_id — до появления профилей показываем UUID (первые 8 символов) */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-sm font-semibold truncate"
                            style={{ color: '#0B2B5E' }}
                          >
                            {`Отправитель ${thread.senderId.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className="flex-shrink-0 text-[10px] text-slate-400 tabular-nums">
                            {formatTime(thread.lastMsg.created_at)}
                          </span>
                        </div>

                        {/* Preview последнего сообщения */}
                        <p
                          className="mt-0.5 text-xs leading-relaxed truncate"
                          style={{
                            color: thread.unread > 0 ? '#334155' : '#94a3b8',
                            fontWeight: thread.unread > 0 ? 500 : 400,
                          }}
                        >
                          {truncate(thread.lastMsg.body)}
                        </p>
                      </div>

                      {/* Счётчик непрочитанных */}
                      {thread.unread > 0 && (
                        <span
                          className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white"
                          style={{ backgroundColor: '#F26522' }}
                          aria-label={`Непрочитанных: ${thread.unread}`}
                        >
                          {thread.unread > 99 ? '99+' : thread.unread}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── ОТКРЫТЫЙ ТРЕД (детальный вид) ─────────────────────────────────── */}
        {openThread && activeThread && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Пузыри сообщений */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
              style={gridBg}
            >
              {groupMessagesByDate(activeThread.messages).map((group) => (
                <div key={group.date}>
                  {/* Разделитель даты */}
                  <div className="flex items-center justify-center my-3">
                    <span
                      className="px-3 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: 'rgba(11,43,94,0.07)',
                        color: '#334155',
                      }}
                    >
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>

                  {/* Сообщения группы */}
                  <div className="space-y-2">
                    {group.messages.map((msg) => (
                      <div key={msg.id} className="flex justify-start">
                        <div className="max-w-[80%]">
                          {/* Пузырь сообщения — посетитель всегда слева */}
                          <div
                            className="px-4 py-3 text-sm leading-relaxed"
                            style={{
                              backgroundColor: '#EEF2F8',
                              color: '#0B2B5E',
                              borderRadius: '4px 16px 16px 16px',
                            }}
                          >
                            {msg.body}
                          </div>
                          {/* Метка времени */}
                          <div className="flex items-center gap-1.5 mt-1 px-1">
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {formatTime(msg.created_at)}
                            </span>
                            {/* Значок прочитано */}
                            {msg.is_read && (
                              <svg
                                width="12"
                                height="8"
                                viewBox="0 0 14 10"
                                fill="none"
                                stroke="#27AE60"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-label="Прочитано"
                              >
                                <polyline points="1,5 4,8 9,2" />
                                <polyline points="5,5 8,8 13,2" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Якорь для автопрокрутки */}
              <div ref={messagesEndRef} />
            </div>

            {/* Информационная панель (reply coming soon) */}
            <div
              className="flex-shrink-0 px-5 py-3 border-t flex items-center gap-3"
              style={{ borderColor: 'rgba(11,43,94,0.08)', backgroundColor: '#FFFFFF' }}
            >
              <p className="flex-1 text-xs text-slate-400 leading-relaxed">
                Для ответа используйте корпоративный email или позвоните напрямую.
                Функция ответа прямо в чате будет доступна в следующем обновлении.
              </p>
              <span
                className="flex-shrink-0 px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: 'rgba(11,43,94,0.25)' }}
              >
                Скоро
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Вспомогательные функции ───────────────────────────────────────────────

/**
 * Группирует список DirectMessage[] в потоки по sender_id.
 * Результат отсортирован по времени последнего сообщения (новейший тред первый).
 */
function buildThreads(messages: DirectMessage[]): ThreadGroup[] {
  const map = new Map<string, DirectMessage[]>();

  for (const msg of messages) {
    const list = map.get(msg.sender_id) ?? [];
    list.push(msg);
    map.set(msg.sender_id, list);
  }

  const threads: ThreadGroup[] = [];
  map.forEach((msgs, senderId) => {
    const sorted  = [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const lastMsg = sorted[sorted.length - 1];
    const unread  = sorted.filter((m) => !m.is_read).length;
    threads.push({ senderId, messages: sorted, lastMsg, unread });
  });

  return threads.sort(
    (a, b) =>
      new Date(b.lastMsg.created_at).getTime() -
      new Date(a.lastMsg.created_at).getTime(),
  );
}

/** Группирует сообщения одного треда по дате (ISO-дата как ключ) */
function groupMessagesByDate(
  messages: DirectMessage[],
): Array<{ date: string; messages: DirectMessage[] }> {
  const map = new Map<string, DirectMessage[]>();

  for (const msg of messages) {
    const dateKey = msg.created_at.slice(0, 10); // YYYY-MM-DD
    const list    = map.get(dateKey) ?? [];
    list.push(msg);
    map.set(dateKey, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, msgs]) => ({ date, messages: msgs }));
}
