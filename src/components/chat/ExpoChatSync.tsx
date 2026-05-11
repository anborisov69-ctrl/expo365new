'use client';

// ════════════════════════════════════════════════════════════════════════════
// src/components/chat/ExpoChatSync.tsx
// ExpoChatSync — Главный оркестратор чат-системы (сторона посетителя)
//
// Ответственность:
//   1. Инициализирует useChatSession при монтировании
//   2. При isOpen=true → автоматически вызывает startSession()
//      и эмитит SessionStart → ExponentChatAlert получает Vibrant Alert
//   3. Рендерит ChatWidget с актуальным состоянием сессии
//   4. Управляет анимированным появлением / скрытием виджета
//
// Props:
//   isOpen          — контролируется родителем (ExhibitorPageClient)
//   onClose         — свернуть без завершения сессии
//   exhibitorId     — UUID экспонента (FK для Supabase)
//   exhibitorSlug   — slug для BroadcastChannel
//   exhibitorName   — отображаемое имя (заголовок ChatWidget)
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import ChatWidget from './ChatWidget';
import { useChatSession } from '@/hooks/useChatSession';

// ── Типы ─────────────────────────────────────────────────────────────────────

export interface ExpoChatSyncProps {
  /** Управляет видимостью виджета */
  isOpen: boolean;
  /** Свернуть виджет (сессия остаётся активной) */
  onClose: () => void;
  /** UUID экспонента — FK для Supabase `chat_sessions.exhibitor_id` */
  exhibitorId: string;
  /** Slug витрины — имя канала BroadcastChannel */
  exhibitorSlug: string;
  /** Название компании — отображается в заголовке ChatWidget */
  exhibitorName: string;
}

// ── ExpoChatSync ──────────────────────────────────────────────────────────────

export default function ExpoChatSync({
  isOpen,
  onClose,
  exhibitorId,
  exhibitorSlug,
  exhibitorName,
}: ExpoChatSyncProps) {
  // Инициализация хука заранее (до открытия) чтобы BroadcastChannel был готов
  const { session, messages, isConnected, managerStatusLabel, startSession, sendMessage, closeSession } =
    useChatSession({ exhibitorId, exhibitorSlug, exhibitorName });

  // Флаг — сессия уже была запущена в рамках этого монтирования
  const sessionStarted = useRef(false);

  /**
   * Когда пользователь кликает «ЧАТ С ЭКСПОНЕНТОМ» (isOpen становится true):
   *   — запускаем сессию (один раз)
   *   — SessionStart эмитируется в BroadcastChannel
   *   — ExponentChatAlert на стороне менеджера получает сигнал и активирует
   *     Vibrant Alert (#F26522 пульсирующую рамку)
   */
  useEffect(() => {
    if (isOpen && !sessionStarted.current && !session) {
      sessionStarted.current = true;
      // startSession() → внутри эмитит ChatEvent<SessionStartPayload>
      startSession();
    }
  }, [isOpen, session, startSession]);

  // Закрыть + завершить сессию
  const handleEndSession = () => {
    closeSession();
    sessionStarted.current = false;
    onClose();
  };

  // Не рендерим ничего если виджет закрыт и нет активной сессии
  if (!isOpen && !session) return null;

  return (
    <>
      {/*
       * Animated backdrop — полупрозрачный overlay при мобиле,
       * на десктопе не мешает основному контенту (pointer-events: none).
       */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[199] pointer-events-none"
          style={{
            // На мобиле (< 640px) показываем тонировку,
            // на десктопе виджет floating без backdrop
            background: 'transparent',
          }}
          aria-hidden="true"
        />
      )}

      {/*
       * ChatWidget — floating panel bottom-right.
       * Рендерится только когда isOpen=true ИЛИ есть активная сессия
       * (чтобы не потерять сессию при случайном закрытии).
       */}
      {isOpen && (
        <ChatWidget
          session={session}
          messages={messages}
          isConnected={isConnected}
          managerStatusLabel={managerStatusLabel}
          exhibitorName={exhibitorName}
          onSendMessage={sendMessage}
          onClose={onClose}
          onEndSession={handleEndSession}
        />
      )}

      {/*
       * Collapsed indicator — показывается когда виджет свёрнут (isOpen=false),
       * но сессия ещё активна (пользователь не завершил диалог).
       * Позволяет быстро вернуться к незавершённому диалогу.
       */}
      {!isOpen && session && session.status !== 'closed' && (
        <CollapsedChatBubble
          exhibitorName={exhibitorName}
          hasUnread={messages.some((m) => m.role === 'manager' && !m.read)}
          onExpand={onClose} // onClose здесь — toggle (открыть обратно)
          onEnd={handleEndSession}
        />
      )}
    </>
  );
}

// ── CollapsedChatBubble ───────────────────────────────────────────────────────

/**
 * Кнопка-пузырь для восстановления свёрнутого чата.
 * Показывает оранжевую точку если есть непрочитанные сообщения от менеджера.
 */
interface CollapsedChatBubbleProps {
  exhibitorName: string;
  hasUnread: boolean;
  onExpand: () => void;
  onEnd: () => void;
}

function CollapsedChatBubble({ exhibitorName, hasUnread, onExpand, onEnd }: CollapsedChatBubbleProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-2">
      {/* Тултип с именем экспонента */}
      <div
        className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-md"
        style={{
          backgroundColor: '#0B2B5E',
          color: '#ffffff',
          maxWidth: '200px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {exhibitorName}
      </div>

      {/* Круглая кнопка восстановления */}
      <button
        type="button"
        onClick={onExpand}
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-transform duration-150 hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#0B2B5E' }}
        aria-label={`Открыть чат с ${exhibitorName}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* Оранжевый бейдж непрочитанных */}
        {hasUnread && (
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: '#F26522' }}
          />
        )}
      </button>

      {/* Ссылка «Завершить» */}
      <button
        type="button"
        onClick={onEnd}
        className="text-[10px] font-medium hover:opacity-70 transition-opacity"
        style={{ color: '#94A3B8' }}
      >
        Завершить диалог
      </button>
    </div>
  );
}
