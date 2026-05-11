'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/components/chat/ChatWidget.tsx
// ExpoChatSync — Чат-виджет на стороне посетителя
//
// Дизайн-требования:
//   • border-radius: 16px
//   • Background grid (Blueprint-паттерн) как в основном UI платформы
//   • Текст: Deep Blue #0B2B5E (ЗАПРЕЩЁН светло-серый)
//   • Timestamps: тёмные оттенки (#475569), высокий контраст
//   • Индикатор «отправлено»: Money Green #27AE60
//   • Статус менеджера: человекочитаемый («Сотрудник ООО «ТЕСТ» на связи»)
//   • Без эмодзи в интерфейсе и системных сообщениях
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage, ChatSession } from '@/types/chat';

// ── Иконки (inline SVG, без зависимостей) ────────────────────────────────────

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/** Иконка чата (для заголовка) */
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Галочка «отправлено» — Money Green #27AE60 */
function IconCheckSent({ double = false }: { double?: boolean }) {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      fill="none"
      stroke="#27AE60"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {double ? (
        <>
          <polyline points="1,5 4,8 9,2" />
          <polyline points="5,5 8,8 13,2" />
        </>
      ) : (
        <polyline points="2,5 5,8 12,2" />
      )}
    </svg>
  );
}

// ── Утилиты ───────────────────────────────────────────────────────────────────

/** Форматирует ISO timestamp в читаемое время «чч:мм» по МСК */
function formatTime(isoStr: string): string {
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

// ── Типы компонента ───────────────────────────────────────────────────────────

export interface ChatWidgetProps {
  /** Данные активной сессии */
  session: ChatSession | null;
  /** Сообщения в хронологическом порядке */
  messages: ChatMessage[];
  /** true когда менеджер подключился */
  isConnected: boolean;
  /** Человекочитаемый статус из ManagerJoined-события */
  managerStatusLabel: string;
  /** Название экспонента (для заголовка виджета) */
  exhibitorName: string;
  /** Callback при отправке сообщения */
  onSendMessage: (content: string) => void;
  /** Закрыть виджет (НЕ завершает сессию, просто сворачивает) */
  onClose: () => void;
  /** Завершить сессию полностью */
  onEndSession: () => void;
}

// ── ChatWidget ────────────────────────────────────────────────────────────────

export default function ChatWidget({
  session,
  messages,
  isConnected,
  managerStatusLabel,
  exhibitorName,
  onSendMessage,
  onClose,
  onEndSession,
}: ChatWidgetProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Автоматический скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Фокус на поле ввода при открытии
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Grid-паттерн фона (Blueprint) ─────────────────────────────────────────
  const gridBg: React.CSSProperties = {
    backgroundImage: [
      'linear-gradient(rgba(11,43,94,0.04) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(11,43,94,0.04) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '20px 20px',
    backgroundColor: '#ffffff',
  };

  const isSessionClosed = session?.status === 'closed';

  return (
    /*
     * Floating container — fixed bottom-right, поверх всего контента.
     * z-[200] выше AdminShell (z-[60]) и Header (z-50).
     */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Чат с ${exhibitorName}`}
      className="fixed bottom-6 right-6 z-[200] flex flex-col"
      style={{
        width: '380px',
        maxHeight: '540px',
        borderRadius: '16px',
        border: '1px solid rgba(11,43,94,0.20)',
        overflow: 'hidden',
      }}
    >

      {/* ── Заголовок виджета ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: '#0B2B5E' }}
      >
        {/* Иконка чата */}
        <span
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
        >
          <IconChat />
        </span>

        {/* Название и статус */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-white leading-none">
            {exhibitorName}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {/* Статусная точка */}
            <span
              className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isConnected ? '#27AE60' : 'rgba(255,255,255,0.4)',
                boxShadow: isConnected ? '0 0 0 3px rgba(39,174,96,0.30)' : 'none',
              }}
            />
            <span
              className="text-xs font-medium leading-none truncate"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              {isSessionClosed
                ? 'Сессия завершена'
                : isConnected
                  ? managerStatusLabel
                  : 'Ожидание менеджера...'}
            </span>
          </div>
        </div>

        {/* Кнопка закрытия */}
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.60)' }}
          aria-label="Свернуть чат"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)'; }}
        >
          <IconClose />
        </button>
      </div>

      {/* ── Системный статус-баннер (если сессия не начата) ──────────────── */}
      {!session && (
        <div
          className="flex-shrink-0 px-4 py-3 text-center text-xs font-medium"
          style={{
            backgroundColor: 'rgba(11,43,94,0.04)',
            borderBottom: '1px solid rgba(11,43,94,0.07)',
            color: '#0B2B5E',
          }}
        >
          Соединение устанавливается. Введите первое сообщение.
        </div>
      )}

      {/* ── Область сообщений ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
        style={gridBg}
      >
        {/* Приветственное системное сообщение */}
        <div className="flex justify-center">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(11,43,94,0.07)',
              color: '#334155',   /* тёмный — не светло-серый */
            }}
          >
            Начало диалога с {exhibitorName}
          </span>
        </div>

        {/* Отрисовка сообщений */}
        {messages.map((msg, idx) => {
          const isVisitor = msg.role === 'visitor';
          const isLastVisitor =
            isVisitor &&
            idx === messages.map((m) => m.role).lastIndexOf('visitor');

          return (
            <div
              key={msg.id}
              className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}
            >
              {/* Аватар менеджера */}
              {!isVisitor && (
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 self-end"
                  style={{ backgroundColor: '#0B2B5E', fontSize: '10px' }}
                >
                  МГ
                </span>
              )}

              <div className="flex flex-col max-w-[75%]" style={{ alignItems: isVisitor ? 'flex-end' : 'flex-start' }}>
                {/* Пузырь сообщения */}
                <div
                  className="px-3.5 py-2.5"
                  style={{
                    backgroundColor: isVisitor ? '#0B2B5E' : '#F1F5F9',
                    color: isVisitor ? '#ffffff' : '#0B2B5E',
                    borderRadius: isVisitor
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>

                {/* Timestamp + статус отправки */}
                <div className="flex items-center gap-1 mt-0.5 px-0.5">
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: '#475569' }}  /* тёмный slate — не светло-серый */
                  >
                    {formatTime(msg.sentAt)}
                  </span>
                  {/* Индикатор отправки — только для сообщений посетителя */}
                  {isVisitor && (
                    <IconCheckSent double={isLastVisitor && isConnected} />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Индикатор «менеджер печатает» показывается только при connected */}
        {isConnected && !isSessionClosed && messages[messages.length - 1]?.role === 'visitor' && (
          <div className="flex items-end gap-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#0B2B5E', fontSize: '10px' }}
            >
              МГ
            </span>
            <div
              className="flex items-center gap-1 px-4 py-2.5 rounded-[14px] rounded-bl-[4px]"
              style={{ backgroundColor: '#F1F5F9' }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: '#94A3B8',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sentinel для авто-скролла */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Поле ввода ────────────────────────────────────────────────────── */}
      {!isSessionClosed ? (
        <div
          className="flex-shrink-0 flex items-end gap-2 px-3 py-3"
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid rgba(11,43,94,0.08)',
          }}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Авторесайз до 4 строк
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed py-2 px-3 rounded-xl"
            style={{
              backgroundColor: 'rgba(11,43,94,0.04)',
              border: '1px solid rgba(11,43,94,0.10)',
              color: '#0B2B5E',
              maxHeight: '96px',
              minHeight: '38px',
              caretColor: '#0B2B5E',
            }}
            aria-label="Поле ввода сообщения"
          />

          {/* Кнопка отправки */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={{
              backgroundColor: inputValue.trim() ? '#F26522' : 'rgba(11,43,94,0.08)',
              color: inputValue.trim() ? '#ffffff' : '#94A3B8',
              transform: inputValue.trim() ? 'scale(1)' : 'scale(0.95)',
            }}
            aria-label="Отправить сообщение"
          >
            <IconSend />
          </button>
        </div>
      ) : (
        /* Баннер завершённой сессии */
        <div
          className="flex-shrink-0 px-4 py-3 text-center"
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid rgba(11,43,94,0.08)',
          }}
        >
          <p className="text-xs font-medium" style={{ color: '#0B2B5E' }}>
            Сессия завершена.
          </p>
          <button
            type="button"
            onClick={onEndSession}
            className="mt-1 text-xs font-semibold underline hover:opacity-70 transition-opacity"
            style={{ color: '#F26522' }}
          >
            Начать новый диалог
          </button>
        </div>
      )}

      {/* Ссылка «Завершить диалог» под полем ввода */}
      {!isSessionClosed && session && (
        <div
          className="flex-shrink-0 flex justify-center pb-2"
          style={{ backgroundColor: '#ffffff' }}
        >
          <button
            type="button"
            onClick={onEndSession}
            className="text-[10px] font-medium hover:opacity-70 transition-opacity"
            style={{ color: '#94A3B8' }}
          >
            Завершить диалог
          </button>
        </div>
      )}

      {/* Inline keyframes для bounce-индикатора печати */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
