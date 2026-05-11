'use client';

/**
 * TestModeIndicator — индикатор тестового режима
 * ──────────────────────────────────────────────
 * Показывает в углу экрана текущую роль пользователя,
 * чтобы тестировщики не запутались в каком режиме находятся.
 */

import { useAuth } from '@/hooks/useAuth';

export function TestModeIndicator() {
  const { user, isAuthorized } = useAuth();

  // Не показываем индикатор если пользователь не авторизован
  if (!isAuthorized || !user) {
    return null;
  }

  const roleLabel = user.role === 'exhibitor' ? 'ЭКСПОНЕНТ' : 'ПОСЕТИТЕЛЬ';
  const bgColor = user.role === 'exhibitor' ? 'bg-[#0B2B5E]' : 'bg-[#F26522]';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium`}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>ТЕСТОВЫЙ ВХОД: {roleLabel}</span>
      </div>
      <div className="text-xs opacity-80 mt-1">
        ID: {user.id}
      </div>
    </div>
  );
}