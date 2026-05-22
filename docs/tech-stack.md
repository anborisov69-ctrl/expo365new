# Технический стек EXPO 365

## 🏗️ Архитектурный обзор

EXPO 365 построен на современном стеке технологий с акцентом на производительность, безопасность и масштабируемость. Платформа использует модульную архитектуру с четким разделением ответственности.

## 🚀 Основные технологии

### Frontend
- **Next.js 16** - React фреймворк с App Router и Server Components
- **React 19** - Библиотека для создания пользовательских интерфейсов
- **TypeScript 5** - Строгая типизация для надежности кода
- **Tailwind CSS 4** - Утилитарный CSS фреймворк для стилизации
- **shadcn/ui** - Библиотека компонентов на основе Radix UI

### Backend & База данных
- **Supabase** - Полнофункциональная BaaS платформа
  - **PostgreSQL 15** - Реляционная база данных
  - **Row Level Security (RLS)** - Изоляция данных на уровне строк
  - **Auth** - Аутентификация и авторизация
  - **Storage** - Облачное хранилище файлов
  - **Realtime** - WebSocket соединения в реальном времени
  - **Edge Functions** - Серверные функции

### Инфраструктура
- **Vercel** - Платформа для деплоя Next.js приложений
- **GitHub Actions** - CI/CD пайплайны
- **ESLint** - Линтинг кода
- **PostCSS** - Обработка CSS

## 🎨 Дизайн-система

### Цветовая палитра (MANDATORY)
| Токен | HEX | Назначение | Использование |
|-------|-----|------------|---------------|
| `brand-blue` | `#0B2B5E` | Стабильность, навигация, доверие | Sidebar фон, заголовки, фоны иконок, границы неактивных элементов |
| `brand-orange` | `#F26522` | Энергия, конверсия, действие | CTA кнопки, активные границы карточек, состояния hover, иконки алертов |
| `brand-green` | `#27AE60` | Успех, подтверждение, рост | Состояния успеха, завершенные статусы, позитивные метрики, подтверждения сделок |

### Типографика
- **Основной шрифт**: Geist (оптимизирован Vercel)
- **Система размеров**: Используется масштабирование Tailwind
- **Иерархия**: Строгое соблюдение уровней заголовков (h1-h6)

### Компоненты shadcn/ui
Проект использует следующие компоненты:

#### Установленные компоненты
- **button** - Кнопки всех типов и размеров
- **card** - Карточки для контента
- **sidebar** - Навигационная панель
- **tabs** - Вкладки для организации контента
- **table** - Таблицы данных
- **badge** - Бейджи для статусов
- **toast** - Всплывающие уведомления

#### Конфигурация компонентов
Компоненты настраиваются через `components.json` и импортируются из `@/components/ui/`.

## 📁 Структура проекта

```
expo-365/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API маршруты
│   │   │   ├── image-processing/
│   │   │   ├── referral/
│   │   │   ├── search/
│   │   │   └── tender-*
│   │   └── horeca/            # Основной B2B портал
│   │       ├── admin/         # Административная панель
│   │       ├── buyer/         # Кабинет покупателя
│   │       ├── marketplace/   # Маркетплейс
│   │       ├── hr-hub/        # HR-технологии
│   │       ├── finance/       # Финансовые инструменты
│   │       └── discovery/     # Поиск и рекомендации
│   ├── components/            # React компоненты
│   │   ├── ui/               # Базовые UI компоненты
│   │   ├── admin/            # Административные компоненты
│   │   ├── chat/             # Компоненты чата
│   │   ├── finance/          # Финансовые компоненты
│   │   ├── marketplace/      # Компоненты маркетплейса
│   │   ├── tenders/          # Компоненты тендеров
│   │   └── showroom/         # Компоненты витрины
│   ├── modules/              # Бизнес-модули
│   │   ├── analytics/        # Аналитика и BI
│   │   ├── hr-tech/          # HR-технологии
│   │   ├── marketplace/      # Логика маркетплейса
│   │   └── tenders/          # Логика тендеров
│   ├── services/             # Сервисы бизнес-логики
│   │   ├── paymentService.ts
│   │   ├── supplierRecommendationService.ts
│   │   ├── tenderAccessService.ts
│   │   └── tenderUnlockService.ts
│   ├── hooks/                # Кастомные React хуки
│   │   ├── useAuth.ts
│   │   ├── useChatSession.ts
│   │   ├── useCrossRoleSync.ts
│   │   ├── useMessagesRealtime.ts
│   │   ├── usePartnerOffer.ts
│   │   └── useTenderUnlockRealtime.ts
│   ├── lib/                  # Утилиты и конфигурации
│   │   ├── brandSearch.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/                # TypeScript типы
│   │   ├── bi-signals.ts
│   │   ├── buyer-cabinet.ts
│   │   ├── chat.ts
│   │   ├── exhibitor-analytics.ts
│   │   ├── finance.ts
│   │   ├── hr.ts
│   │   ├── image-processing.ts
│   │   ├── partner-offer.ts
│   │   ├── search.ts
│   │   ├── subscription-tiers.ts
│   │   └── tender-unlocks.ts
│   ├── store/                # Состояние приложения
│   │   ├── ecosystemStore.tsx
│   │   └── smartContractStore.tsx
│   ├── database/             # Схемы базы данных
│   │   ├── schemas/
│   │   │   ├── brands.ts
│   │   │   ├── finance.ts
│   │   │   └── tenders.ts
│   │   └── README.md
│   ├── constants/            # Константы
│   │   └── newsData.ts
│   └── data/                 # Мок-данные для разработки
│       ├── analyticsData.ts
│       ├── banksData.ts
│       ├── brandsData.ts
│       ├── companiesData.ts
│       ├── dealsData.ts
│       └── productsData.ts
├── docs/                     # Документация
├── public/                   # Статические файлы
│   └── assets/brands/       # Логотипы брендов
├── supabase/                 # Supabase конфигурация
│   ├── migrations/          # Миграции базы данных
│   └── .temp/               # Временные файлы
└── .agents/                 # Конфигурация AI агентов
```

## 🔐 Безопасность

### Row Level Security (RLS)
Каждая таблица в базе данных защищена политиками RLS:

```sql
-- Пример политики для изоляции данных клиентов
CREATE POLICY "Users can view their own data" ON profiles
FOR SELECT USING (auth.uid() = user_id);
```

### Мультитенантная архитектура
- UUID-based идентификаторы для всех сущностей
- Изоляция данных через tenant_id в политиках RLS
- Отдельные схемы для чувствительных данных

### Аутентификация
- JWT токены с коротким временем жизни
- Сессии через httpOnly cookies
- Проверка ролей на уровне middleware

## 🌐 Интернационализация (i18n)

Архитектура поддерживает мультиязычность:
- **Поддерживаемые языки**: Русский, Английский
- **Структура**: Готовность к добавлению новых языков
- **Форматы**: Локализованные даты, валюты, числа

## 📦 Зависимости

### Основные зависимости
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.10.3",      // SSR интеграция Supabase
    "@supabase/supabase-js": "^2.105.4", // Supabase клиент
    "next": "16.2.4",                // Next.js фреймворк
    "react": "19.2.4",               // React библиотека
    "react-dom": "19.2.4",           // React DOM рендерер
    "lucide-react": "^0.460.0",      // Иконки
    "class-variance-authority": "^0.7.1", // Утилиты для классов
    "clsx": "^2.1.1",                // Условные классы
    "tailwind-merge": "^2.6.1"       // Утилиты для Tailwind
  }
}
```

### Dev зависимости
```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4",    // PostCSS плагин Tailwind
    "tailwindcss": "^4",             // Tailwind CSS
    "typescript": "^5",              // TypeScript
    "eslint": "^9",                  // Линтер
    "eslint-config-next": "16.2.4"   // Конфиг ESLint для Next.js
  }
}
```

## 🚀 Производительность

### Оптимизации Next.js
- **Server Components** - Уменьшение размера бандла
- **Dynamic Imports** - Ленивая загрузка компонентов
- **Image Optimization** - Автоматическая оптимизация изображений
- **ISR (Incremental Static Regeneration)** - Гибридный рендеринг

### Кэширование
- Стратегии кэширования на уровне CDN
- Кэширование API ответов
- Оптимизированные запросы к базе данных

## 🔧 Конфигурация

### Tailwind Config
```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'brand-blue': '#0B2B5E',
        'brand-orange': '#F26522',
        'brand-green': '#27AE60',
      }
    }
  }
}
```

### Next.js Config
```typescript
// next.config.ts
export default {
  images: {
    domains: ['supabase.co'],
  },
  experimental: {
    serverActions: true,
  }
}
```

## 📊 Мониторинг и аналитика

### Встроенная аналитика
- Отслеживание пользовательских событий
- Аналитика производительности
- Мониторинг ошибок
- BI сигналы для бизнес-аналитики

### Логирование
- Структурированные логи на стороне сервера
- Логи клиентских ошибок
- Аудит действий пользователей

---

**Технический стек EXPO 365** спроектирован для масштабирования, безопасности и высокой производительности, обеспечивая надежную основу для глобальной B2B экосистемы HoReCa.