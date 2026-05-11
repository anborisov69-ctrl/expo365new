'use client';

/**
 * useAuth — хук авторизации EXPO 365
 * ────────────────────────────────────
 * Текущая реализация: mock на базе localStorage для разработки и демонстрации.
 *
 * TODO: Заменить на Supabase session после настройки Auth:
 * ┌─────────────────────────────────────────────────────────────────────────────
 * │  import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
 * │
 * │  export function useAuth(): UseAuthReturn {
 * │    const supabase = createClientComponentClient();
 * │    const [session, setSession] = useState<Session | null>(null);
 * │
 * │    useEffect(() => {
 * │      supabase.auth.getSession().then(({ data: { session } }) => {
 * │        setSession(session);
 * │        setIsLoading(false);
 * │      });
 * │      const { data: { subscription } } = supabase.auth.onAuthStateChange(
 * │        (_event, session) => setSession(session)
 * │      );
 * │      return () => subscription.unsubscribe();
 * │    }, []);
 * │
 * │    return {
 * │      isAuthorized: !!session,
 * │      user: session?.user ?? null,
 * │      ...
 * │    };
 * │  }
 * └─────────────────────────────────────────────────────────────────────────────
 *
 * RLS примечание:
 *   В Supabase цены товаров закрыты политикой:
 *   CREATE POLICY "prices_auth_only" ON products
 *     FOR SELECT USING (auth.uid() IS NOT NULL);
 *   Неавторизованный запрос вернёт строки без поля price (NULL).
 */

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:          string;
  email:       string;
  displayName: string;
  /** Роль пользователя в multi-tenant системе */
  role:        'buyer' | 'exhibitor' | 'admin' | 'partner';
  /**
   * Связка с партнёрской организацией для персональных предложений.
   * Если статус "Приглашённый клиент" - указывается организация (например: 'ooo-test')
   */
  isPartnerOf?: string;
}

export interface UseAuthReturn {
  isAuthorized:   boolean;
  user:           AuthUser | null;
  isLoading:      boolean;
  /**
   * Переключает mock-авторизацию между true/false.
   * Используется только в режиме разработки для демонстрации price visibility.
   * TODO: удалить в production — авторизация через Supabase Magic Link / OAuth.
   */
  toggleMockAuth: () => void;
  /**
   * Устанавливает конкретную роль для тестирования
   */
  setTestRole: (role: 'EXHIBITOR' | 'BUYER') => void;
  /**
   * Выход из тестового режима
   */
  logout: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** localStorage key для mock-сессии */
const MOCK_AUTH_KEY = 'expo365_mock_auth_v1';

/** Mock-пользователи для тестирования разных ролей */
const MOCK_USERS = {
  EXHIBITOR: {
    id:          'exhibitor_id_1',
    email:       'exhibitor@expo365.ru',
    displayName: 'Экспонент Тестовый',
    role:        'exhibitor' as const,
    company:     'ooo-test',
  },
  BUYER: {
    id:          'alexey_sorokin',
    email:       'buyer@expo365.ru',
    displayName: 'Алексей Сорокин',
    role:        'buyer' as const,
    isPartnerOf: 'ooo-test',
  },
} as const;

/** Дефолтный mock-пользователь для обратной совместимости */
const MOCK_USER: AuthUser = MOCK_USERS.BUYER;

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);

  useEffect(() => {
    // TODO: supabase.auth.getSession() здесь
    try {
      const stored = localStorage.getItem(MOCK_AUTH_KEY);
      if (stored === 'true') {
        const testRole = localStorage.getItem('expo365_test_role') as 'EXHIBITOR' | 'BUYER' | null;
        const mockUser = testRole ? MOCK_USERS[testRole] : MOCK_USER;
        setIsAuthorized(true);
        setUser(mockUser as AuthUser);
      }
    } catch {
      // SSR / localStorage недоступен — fallback anonymous
    }
    setIsLoading(false);
  }, []);

  /** Сохраняет состояние mock-авторизации в localStorage */
  const toggleMockAuth = useCallback(() => {
    setIsAuthorized((prev) => {
      const next = !prev;
      try {
        if (next) {
          localStorage.setItem(MOCK_AUTH_KEY, 'true');
          setUser(MOCK_USER);
        } else {
          localStorage.removeItem(MOCK_AUTH_KEY);
          setUser(null);
        }
      } catch { /* ignore write errors */ }
      return next;
    });
  }, []);

  /** Устанавливает тестовую роль пользователя */
  const setTestRole = useCallback((role: 'EXHIBITOR' | 'BUYER') => {
    try {
      const mockUser = MOCK_USERS[role];
      localStorage.setItem(MOCK_AUTH_KEY, 'true');
      localStorage.setItem('expo365_test_role', role);
      setIsAuthorized(true);
      setUser(mockUser as AuthUser);
    } catch { /* ignore write errors */ }
  }, []);

  /** Выход из системы и очистка локального хранилища */
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(MOCK_AUTH_KEY);
      localStorage.removeItem('expo365_test_role');
      setIsAuthorized(false);
      setUser(null);
    } catch { /* ignore write errors */ }
  }, []);

  return { isAuthorized, user, isLoading, toggleMockAuth, setTestRole, logout };
}
