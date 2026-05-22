'use client';

/**
 * DevAuthToggle — компонент для переключения ролей в режиме разработки
 * ──────────────────────────────────────────────────────────────────────
 * Позволяет тестировщикам входить как ЭКСПОНЕНТ или ПОСЕТИТЕЛЬ без
 * реальной авторизации для быстрого тестирования функционала.
 */

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface DevAuthToggleProps {
  className?: string;
}

export function DevAuthToggle({ className = '' }: DevAuthToggleProps) {
  const { setTestRole, logout, user } = useAuth();
  const router = useRouter();

  const handleExhibitorLogin = () => {
    setTestRole('EXHIBITOR');
    // Редирект на страницу экспонента
    router.push('/horeca/exhibitors/ooo-test');
  };

  const handleBuyerLogin = () => {
    setTestRole('BUYER');
    // Редирект в кабинет закупщика
    router.push('/horeca/buyer/dashboard');
  };

  const handlePrivatePersonLogin = () => {
    setTestRole('PRIVATE_PERSON');
    // Редирект в HR Hub (или на главную)
    router.push('/horeca/hr-hub');
  };

  /**
   * БАНК — финансовый партнёр платформы.
   * Перенаправляет в кабинет управления финансовыми плашками.
   * TODO: в production добавить setTestRole('BANK') после расширения useAuth.
   */
  const handleBankLogin = () => {
    router.push('/horeca/bank/dashboard');
  };

  const handleLogout = () => {
    logout();
    router.push('/horeca?action=login');
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {user ? (
        // Если пользователь авторизован - показываем кнопку выхода
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
        >
          Выйти
        </button>
      ) : (
        // Если не авторизован - показываем кнопки входа
        <>
          <button
            onClick={handleExhibitorLogin}
            className="px-4 py-2 text-sm bg-[#0B2B5E] hover:bg-[#0B2B5E]/90 text-white rounded-md transition-colors font-medium"
          >
            Войти как ЭКСПОНЕНТ
          </button>
          <button
            onClick={handleBuyerLogin}
            className="px-4 py-2 text-sm bg-[#F26522] hover:bg-[#F26522]/90 text-white rounded-md transition-colors font-medium"
          >
            Войти как ПОСЕТИТЕЛЬ
          </button>
          {/* 🟣 Вход как частное лицо (соискатель) */}
          <button
            onClick={handlePrivatePersonLogin}
            className="px-4 py-2 text-sm bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-md transition-colors font-medium"
          >
            Я частное лицо
          </button>
          {/*  Вход в кабинет банка-партнёра */}
          <button
            onClick={handleBankLogin}
            className="px-4 py-2 text-sm bg-[#27AE60] hover:bg-[#219150] text-white rounded-md transition-colors font-medium"
          >
            Войти как БАНК
          </button>
        </>
      )}
    </div>
  );
}