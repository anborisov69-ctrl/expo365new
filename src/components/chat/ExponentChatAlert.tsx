'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/components/chat/ExponentChatAlert.tsx
// ExpoChatSync — Компонент Vibrant Alert для кабинета экспонента
//
// Задача: сделать невозможным пропустить входящий чат-запрос посетителя.
//
// Поведение:
//   1. Слушает BroadcastChannel на SessionStart события
//   2. При получении: включает пульсирующую оранжевую анимацию (#F26522)
//   3. Анимация снимается при первом нажатии клавиши менеджера
//   4. Dropdown-панель: список входящих сессий + inline ответ
//
// Архитектура:
//   • useIncomingChats() — BroadcastChannel transport
//   • VibrantAlert.module.css — keyframe animations
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './VibrantAlert.module.css';
import { useIncomingChats, type IncomingChatSession } from '@/hooks/useChatSession';
import type { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

// ── Иконки ────────────────────────────────────────────────────────────────────

function IconChatBubble({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 1l10 10M11 1L1 11" />
    </svg>
  );
}

function IconSendSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

function formatTimeDiff(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  return `${Math.floor(mins / 60)} ч назад`;
}

function formatMsgTime(isoStr: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(new Date(isoStr));
  } catch {
    return '';
  }
}

// ── Подкомпонент: Панель одной сессии ─────────────────────────────────────────

interface SessionPanelProps {
  session: IncomingChatSession;
  onSendReply: (sessionId: string, content: string) => void;
  onDismissAlert: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
}

function SessionPanel({ session, onSendReply, onDismissAlert, onCloseSession }: SessionPanelProps) {
  const [replyText, setReplyText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Авто-скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Первый keystroke снимает Vibrant Alert (требование задачи)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (session.isAlertActive) {
        onDismissAlert(session.id);
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.id, session.isAlertActive, replyText],
  );

  const handleSend = useCallback(() => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onSendReply(session.id, trimmed);
    setReplyText('');
    inputRef.current?.focus();
  }, [replyText, onSendReply, session.id]);

  const isClosed = session.status === 'closed';

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        session.isAlertActive && styles.sessionItemAlert,
      )}
      style={{
        border: session.isAlertActive
          ? '1px solid rgba(242,101,34,0.35)'
          : '1px solid rgba(11,43,94,0.10)',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Заголовок сессии */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{
          backgroundColor: session.isAlertActive
            ? 'rgba(242,101,34,0.06)'
            : 'rgba(11,43,94,0.03)',
          borderBottom: '1px solid rgba(11,43,94,0.07)',
        }}
      >
        {/* Статус-точка */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: isClosed
              ? '#CBD5E1'
              : session.isAlertActive
                ? '#F26522'
                : '#27AE60',
            boxShadow: session.isAlertActive
              ? '0 0 0 3px rgba(242,101,34,0.25)'
              : 'none',
          }}
        />

        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold leading-none truncate"
            style={{ color: '#0B2B5E' }}
          >
            {session.isAlertActive
              ? 'Новый запрос — ожидает ответа'
              : isClosed
                ? 'Диалог завершён'
                : 'Диалог активен'}
          </p>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: '#64748B' }}>
            {formatTimeDiff(session.createdAt)}
            {session.firstManagerReplyAt && (
              <span>
                {' · '}Ответ через{' '}
                {Math.round(
                  (new Date(session.firstManagerReplyAt).getTime() -
                    new Date(session.createdAt).getTime()) /
                    1000,
                )}{' '}
                сек
              </span>
            )}
          </p>
        </div>

        {/* Закрыть сессию */}
        {!isClosed && (
          <button
            type="button"
            onClick={() => onCloseSession(session.id)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#94A3B8' }}
            title="Завершить диалог"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(11,43,94,0.06)'; (e.currentTarget as HTMLElement).style.color = '#0B2B5E'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
          >
            <IconX size={10} />
          </button>
        )}
      </div>

      {/* Протокол сообщений */}
      {session.messages.length > 0 && (
        <div
          className="max-h-40 overflow-y-auto px-3 py-2 space-y-1.5"
          style={{ backgroundColor: '#FAFBFC' }}
        >
          {session.messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'manager' ? 'items-end' : 'items-start'}`}
            >
              <div
                className="px-2.5 py-1.5 max-w-[85%] text-xs leading-relaxed"
                style={{
                  backgroundColor:
                    msg.role === 'manager' ? '#0B2B5E' : '#F1F5F9',
                  color: msg.role === 'manager' ? '#ffffff' : '#0B2B5E',
                  borderRadius:
                    msg.role === 'manager'
                      ? '10px 10px 3px 10px'
                      : '10px 10px 10px 3px',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
              <span
                className="text-[9px] font-medium mt-0.5 px-0.5"
                style={{ color: '#64748B' }}
              >
                {msg.role === 'manager' ? 'Вы' : 'Посетитель'} · {formatMsgTime(msg.sentAt)}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Поле ответа менеджера */}
      {!isClosed && (
        <div
          className="flex items-end gap-2 px-3 py-2"
          style={{ borderTop: session.messages.length > 0 ? '1px solid rgba(11,43,94,0.07)' : 'none' }}
        >
          <textarea
            ref={inputRef}
            value={replyText}
            onChange={(e) => {
              setReplyText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 72) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              session.isAlertActive
                ? 'Ответьте посетителю...'
                : 'Продолжить диалог...'
            }
            rows={1}
            className="flex-1 resize-none outline-none text-xs leading-relaxed py-1.5 px-2.5 rounded-lg"
            style={{
              backgroundColor: 'rgba(11,43,94,0.04)',
              border: session.isAlertActive
                ? '1px solid rgba(242,101,34,0.40)'
                : '1px solid rgba(11,43,94,0.10)',
              color: '#0B2B5E',
              maxHeight: '72px',
              minHeight: '34px',
              caretColor: '#0B2B5E',
            }}
            aria-label="Ответ менеджера"
            // Любой input в поле снимает alert (требование: «первое нажатие клавиши»)
            onFocus={() => {
              if (session.isAlertActive) onDismissAlert(session.id);
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{
              backgroundColor: replyText.trim() ? '#F26522' : 'rgba(11,43,94,0.06)',
              color: replyText.trim() ? '#ffffff' : '#94A3B8',
            }}
            aria-label="Отправить ответ"
          >
            <IconSendSmall />
          </button>
        </div>
      )}
    </div>
  );
}

// ── ExponentChatAlert (главный компонент) ─────────────────────────────────────

export interface ExponentChatAlertProps {
  /**
   * Slug экспонента для изоляции BroadcastChannel.
   * Совпадает с `exhibitorSlug` в ChatSession.
   */
  exhibitorSlug: string;
  /**
   * Человекочитаемый статус менеджера, транслируемый посетителю.
   * По умолчанию: «Сотрудник ООО «ТЕСТ» на связи»
   */
  managerLabel?: string;
}

export default function ExponentChatAlert({
  exhibitorSlug,
  managerLabel,
}: ExponentChatAlertProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { sessions, totalPending, sendReply, dismissAlert, closeSession } =
    useIncomingChats(exhibitorSlug, managerLabel);

  // Автоматически открыть панель при новой сессии
  useEffect(() => {
    if (totalPending > 0) {
      setPanelOpen(true);
    }
  }, [totalPending]);

  // Закрытие при клике вне панели
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Есть ли хотя бы одна активная Vibrant Alert
  const hasActiveAlert = sessions.some((s) => s.isAlertActive);

  // Все сессии (pending + active) для отображения
  const visibleSessions = sessions.filter((s) => s.status !== 'closed');

  return (
    <div className="relative">

      {/* ── Кнопка-иконка чата с Vibrant Alert ────────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className={cn(
          styles.alertWrapper,
          hasActiveAlert && styles.alertActive,
          'inline-flex items-center justify-center w-9 h-9 text-slate-500 hover:text-[#0B2B5E] hover:bg-slate-100 transition-colors',
        )}
        aria-label={
          totalPending > 0
            ? `Входящие чаты — ${totalPending} ожидает ответа`
            : 'Входящие чаты'
        }
        title={
          hasActiveAlert
            ? 'Новый запрос от посетителя — требует ответа'
            : 'Чаты с посетителями'
        }
      >
        {/* Три ping-кольца (рендерятся всегда, анимируются только при alertActive) */}
        <span className={styles.pingRing} aria-hidden="true" />
        <span className={styles.pingRing} aria-hidden="true" />
        <span className={styles.pingRing} aria-hidden="true" />

        <IconChatBubble />

        {/* Badge с количеством ожидающих */}
        {totalPending > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}
      </button>

      {/* ── Выпадающая панель входящих чатов ──────────────────────────────── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setPanelOpen(false)}
          />

          <div
            ref={panelRef}
            className={cn(styles.panel, 'absolute right-0 top-11 z-20 w-80')}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(11,43,94,0.20)',
              overflow: 'hidden',
            }}
          >
            {/* Заголовок панели */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: '1px solid rgba(11,43,94,0.08)',
                backgroundColor: hasActiveAlert
                  ? 'rgba(242,101,34,0.04)'
                  : '#ffffff',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: hasActiveAlert ? '#F26522' : '#27AE60',
                    boxShadow: hasActiveAlert
                      ? '0 0 0 3px rgba(242,101,34,0.25)'
                      : 'none',
                  }}
                />
                <span
                  className="text-sm font-bold"
                  style={{ color: '#0B2B5E' }}
                >
                  Входящие диалоги
                </span>
              </div>
              {totalPending > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(242,101,34,0.12)',
                    color: '#F26522',
                  }}
                >
                  {totalPending} ожидает
                </span>
              )}
            </div>

            {/* Список сессий */}
            <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
              {visibleSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium" style={{ color: '#0B2B5E' }}>
                    Нет активных диалогов
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                    Когда посетитель откроет чат — вы увидите запрос здесь
                  </p>
                </div>
              ) : (
                visibleSessions.map((session: IncomingChatSession) => (
                  <SessionPanel
                    key={session.id}
                    session={session}
                    onSendReply={sendReply}
                    onDismissAlert={dismissAlert}
                    onCloseSession={closeSession}
                  />
                ))
              )}
            </div>

            {/* Подсказка про BroadcastChannel (dev-режим) */}
            <div
              className="px-4 py-2 text-center"
              style={{
                borderTop: '1px solid rgba(11,43,94,0.07)',
                backgroundColor: 'rgba(11,43,94,0.02)',
              }}
            >
              <p className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>
                Сообщения обновляются в реальном времени
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
