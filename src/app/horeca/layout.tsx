import Header from '../../components/Header';
import { EcosystemProvider } from '@/store/ecosystemStore';
import { SmartContractProvider } from '@/store/smartContractStore';

/**
 * HoReCa Layout — /horeca/*
 * ─────────────────────────
 * Оборачивает весь /horeca-сегмент в провайдеры глобального состояния:
 * - EcosystemProvider — синхронизация данных ООО "ТЕСТ"
 * - SmartContractProvider — управление черновиками договоров
 *
 * Провайдеры должны быть ниже Header (Server Component)
 * и выше всех Client Components, использующих соответующие хуки.
 */
export default function HoReCaLayout({ children }: { children: React.ReactNode }) {
  return (
    <EcosystemProvider>
      <SmartContractProvider>
        {/*
         * ds-page применяет blueprint-grid фон на весь /horeca-сегмент.
         * Это визуально «связывает» публичный каталог и закрытые кабинеты.
         * Дочерние страницы могут переопределять фон локально при необходимости.
         */}
        <div className="min-h-screen ds-page flex flex-col">
          <Header />
          {children}
        </div>
      </SmartContractProvider>
    </EcosystemProvider>
  );
}
