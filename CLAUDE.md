@AGENTS.md
### THE COMPONENT MACHINE PROTOCOL (v1.0)
1. **Source Discovery**: Before building any UI component or logic, search for "Gold Standard" implementations in modern open-source repositories (Radix UI, Shadcn, Lucide).
2. **Atomic Construction**: Save reusable UI parts in `src/components/ui/`. Every component must be atomic, accessible, and strictly follow the EXPO 365 design system.
3. **Reference-First**: If a task is complex, ask the user for a GitHub URL or documentation link to analyze it first. Do not hallucinate logic; replicate and adapt proven patterns.
4. **Knowledge Base**: Maintain a `docs/tech-stack.md` file in the project. Log all major architectural decisions and used libraries there for cross-agent consistency.

---

## UI/UX GOLDEN STANDARD

> Эталон дизайна главной страницы зафиксирован в мае 2026. Любые новые модули и экраны **обязаны** наследовать нижеуказанные правила без исключений.

---

### 1. Логотип и брендинг

- **Единственный источник логотипа**: `public/logo-hero.png` — оригинальный файл бренда с башней кубов и подписью "EXPO 365 · B2B PLATFORM".
- Логотип используется **только** через `next/image` (`<Image src="/logo-hero.png" ... priority />`). SVG-интерпретации логотипа (`CubeTower.tsx` и подобные) — **запрещены** на продакшн-страницах.
- Размеры на главной: `width={340} height={230}`, класс `object-contain`. Масштаб на других экранах подбирается пропорционально.
- Компонент [`src/components/CubeTower.tsx`](src/components/CubeTower.tsx) сохраняется в репозитории как fallback/placeholder, но не используется в UI.

---

### 2. Цветовая палитра (строго)

| Токен | HEX | Применение |
|---|---|---|
| `brand-blue` | `#0B2B5E` | Фон сайдбара, заголовки, иконки-фоны, рамки inactive-элементов |
| `brand-orange` | `#F26522` | CTA-кнопки, рамки активных карточек, hover-состояния, alert-иконки |

- Оба цвета зарегистрированы в **двух** местах для Tailwind v4:
  1. `tailwind.config.ts` → `theme.extend.colors` (через `@config "../../tailwind.config.ts"`)
  2. `src/app/globals.css` → `@theme inline { --color-brand-blue / --color-brand-orange }` (нативный v4-fallback)
- **Запрещено** использовать произвольные синие/оранжевые hex-коды в компонентах — только `brand-blue` / `brand-orange` токены.

---

### 3. Стиль «Blueprint» — белый фон с инженерной сеткой

- **Класс**: `.blueprint-background` определён в [`src/app/globals.css:94`](src/app/globals.css:94).
- Технические характеристики:
  ```css
  background-color: #ffffff;
  background-image:
    linear-gradient(rgba(11, 43, 94, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 43, 94, 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
  ```
- Псевдоэлемент `::before` добавляет радиальный градиент-виньетку на `brand-blue/4%` сверху.
- **Применяется на**: лендинг (`/`), страницы-хабы отраслей. **Не применяется** на дашборд-страницах внутри модулей (там — `bg-gray-50`).

---

### 4. Типографика

- **Шрифт**: Geist Sans (Google Fonts, загружается через `next/font` в [`src/app/layout.tsx`](src/app/layout.tsx:5)).
- Иерархия для лендинга:
  - H1: `text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-blue tracking-tight`
  - Subtitle: `text-lg sm:text-xl text-brand-blue/65 font-light`
  - Footer: `text-sm text-brand-blue/45 tracking-wide`
- **Запрещены** панибратские формулировки: «Привет», «Добро пожаловать», «Пока» и подобные. Тон — нейтральный B2B.

---

### 5. Карточки отраслей — эталонный компонент

Эталон: карточка HoReCa в [`src/app/page.tsx:72`](src/app/page.tsx:72).

**Активная карточка (модуль доступен):**
```tsx
rounded-3xl border-2 border-brand-orange bg-white/95 backdrop-blur-sm p-6
shadow-lg transition-all duration-300
hover:shadow-[0_8px_40px_rgba(242,101,34,0.28)]
hover:bg-brand-orange/5
hover:scale-105
cursor-pointer
```
- Иконка-кружок: `bg-brand-blue` → `group-hover:bg-brand-orange` (transition 300ms).
- Кнопка CTA: `bg-brand-orange text-white hover:bg-brand-orange/90 rounded-2xl`.

**Неактивная карточка (модуль в разработке):**
```tsx
rounded-3xl border-2 border-slate-400 bg-white/40 backdrop-blur-sm p-6
shadow-md opacity-60
```
- Иконка-кружок: `bg-slate-300 text-slate-400`.
- Нет hover-эффектов, кнопка заменена на badge «Скоро» с иконкой `Lock`.

---

### 6. Новые модули — обязательные правила наследования

При добавлении новых отраслевых модулей (**Медтех**, **Бьюти**, **Строительство** и др.) — **обязательно**:

1. **Карточка на главной** — скопировать структуру неактивной карточки из `src/app/page.tsx`, сменить статус на `active` и указать правильный `href` при запуске.
2. **Маршрут модуля** — создать `src/app/{slug}/layout.tsx` с `AppSidebar` + `Header` (изолированный layout, без влияния на Root Layout).
3. **Blueprint-сетка** — `min-h-screen blueprint-background` на лендинге хаба.
4. **Сайдбар** — `w-64 shrink-0 bg-brand-blue text-white`, добавить пункт меню модуля.
5. **Цвета** — только `brand-blue` / `brand-orange`, никаких побочных акцентных цветов.
6. **Тон** — деловой, без приветствий. Подзаголовок страницы модуля: описание бизнес-функции (пример: «Управление поставками, тендерами и аналитикой»).