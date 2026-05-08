'use client';

/**
 * InfiniteMarquee — бесконечная горизонтальная карусель экспонентов.
 *
 * Принцип работы:
 *   • Массив карточек дублируется (`[...items, ...items]`), трек сдвигается
 *     на -50% (CSS keyframe `marquee-scroll`), создавая бесшовный цикл.
 *   • `.marquee-container:hover .marquee-track` → `animation-play-state: paused`
 *     — анимация останавливается при наведении, позволяя кликать на карточку.
 *   • `overflow-hidden` на обёртке скрывает края.
 *   • Fade-маски (left/right gradient) скрывают обрезание контента у краёв.
 *
 * Стиль карточки:
 *   • Квадратная форма сохранена через aspect-square, ширина w-44 (~176px).
 *   • Рамка #0B2B5E / hover #F26522 — единая с основной сеткой.
 *   • Логотип-аватар + название + категория + строка иконок брендов.
 *
 * CSS-классы `.marquee-container` и `.marquee-track` объявлены в globals.css.
 */

import type { Exponent, Brand } from '@/app/horeca/discovery/DiscoveryClient';

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// ─── Мини-компоненты карточки marquee ────────────────────────────────────────

/** Логотип 48×48 или аватар-инициалы */
function MiniLogo({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Логотип ${name}`}
        width={48}
        height={48}
        className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-100 shadow-sm"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm select-none"
      style={{ backgroundColor: '#0B2B5E' }}
    >
      <span
        className="text-lg font-bold leading-none tracking-tight text-white"
      >
        {getInitials(name)}
      </span>
    </div>
  );
}

/** Иконка бренда 24×24 */
function MiniBrandIcon({ brand }: { brand: Brand }) {
  const src = brand.logoUrl ?? null;

  const cls = [
    'relative inline-flex items-center justify-center w-6 h-6 rounded-sm flex-shrink-0',
    'border border-[#0B2B5E]/20 bg-white overflow-hidden',
    'transition-all duration-150',
    'hover:border-[#F26522] hover:scale-110 hover:z-10',
  ].join(' ');

  if (!src) {
    return (
      <span title={brand.name} className={cls}>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundColor: '#94a3b8',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
          }}
        >
          {brand.name.charAt(0).toUpperCase()}
        </span>
      </span>
    );
  }

  return (
    <span title={brand.name} className={cls}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={brand.name}
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain"
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = 'none';
          const fb = img.nextElementSibling as HTMLElement | null;
          if (fb) fb.removeAttribute('style');
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 items-center justify-center"
        style={{
          display: 'none',
          backgroundColor: '#94a3b8',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
        }}
      >
        {brand.name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

/** Индикатор онлайн-статуса */
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      aria-label={isOnline ? 'Онлайн' : 'Офлайн'}
      className="block w-2 h-2 rounded-full ring-2 ring-white flex-shrink-0"
      style={{ backgroundColor: isOnline ? '#22c55e' : '#94a3b8' }}
    />
  );
}

// ─── Карточка для marquee (квадратная, 176px) ─────────────────────────────────

function MarqueeCard({ exponent }: { exponent: Exponent }) {
  const VISIBLE = 4;
  const visibleBrands = exponent.brands.slice(0, VISIBLE);
  const overflow = exponent.brands.length - VISIBLE;

  return (
    <article
      className={[
        /**
         * aspect-square + w-44 = 176×176px.
         * flex-shrink-0 критичен: без него flex-контейнер сожмёт карточки.
         */
        'group relative flex-shrink-0 w-44 aspect-square bg-white rounded-xl',
        'border-2 border-[#0B2B5E]/60',
        'shadow-[0_4px_20px_rgba(11,43,94,0.08)]',
        'flex flex-col items-center justify-between p-3 overflow-hidden',
        'cursor-pointer transition-all duration-200',
        'hover:border-[#F26522] hover:shadow-[0_8px_32px_rgba(242,101,34,0.22)]',
        'hover:-translate-y-0.5',
      ].join(' ')}
    >
      {/* Blueprint-сетка при ховере */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 12px),' +
            'repeating-linear-gradient(90deg,rgba(11,43,94,0.04) 0px,rgba(11,43,94,0.04) 1px,transparent 1px,transparent 12px)',
        }}
        aria-hidden="true"
      />

      {/* Оранжевая accent-полоска сверху */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-[#F26522] opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-xl"
        aria-hidden="true"
      />

      {/* Онлайн-точка — верхний правый угол */}
      <div className="absolute top-2.5 right-2.5">
        <OnlineDot isOnline={exponent.isOnline} />
      </div>

      {/* Логотип */}
      <div className="w-full flex justify-center pt-1">
        <MiniLogo name={exponent.name} src={exponent.mainLogo} />
      </div>

      {/* Нижняя секция */}
      <div className="w-full space-y-1">
        <h3
          className="text-xs font-bold text-center leading-tight truncate"
          style={{ color: '#0B2B5E' }}
          title={exponent.name}
        >
          {exponent.name}
        </h3>

        <p className="text-[9px] text-center font-medium uppercase tracking-wide text-slate-400 leading-tight">
          {exponent.category === 'manufacturer' ? 'Производитель' : 'Дистрибьютор'}
        </p>

        {/* Строка иконок брендов */}
        <div className="flex items-center justify-center -space-x-1">
          {visibleBrands.map((brand) => (
            <MiniBrandIcon key={brand.name} brand={brand} />
          ))}
          {overflow > 0 && (
            <span
              className={[
                'inline-flex items-center justify-center w-5 h-5 rounded-full',
                'border border-slate-200 bg-slate-100',
                'text-[8px] font-semibold text-slate-500 leading-none select-none',
              ].join(' ')}
            >
              +{overflow}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────

interface InfiniteMarqueeProps {
  /** Полный массив экспонентов (без предварительной фильтрации) */
  exponents: Exponent[];
}

/**
 * Рендерит бесконечную ленту карточек экспонентов.
 *
 * Дублирование: мы передаём `[...exponents, ...exponents]` как единый трек
 * и анимируем translateX(-50%), чтобы при сбросе в начало не было разрыва.
 *
 * Fade-маски по краям реализованы через pseudo-element via `after:` / `before:`.
 */
export default function InfiniteMarquee({ exponents }: InfiniteMarqueeProps) {
  if (exponents.length === 0) return null;

  // Дублируем массив — гарантия бесшовного цикла
  const doubled = [...exponents, ...exponents];

  return (
    <div className="relative mb-8">
      {/* Заголовок секции */}
      <div className="flex items-center gap-3 mb-3 px-1">
        {/* Оранжевый акцент-маркер */}
        <span
          className="inline-block w-1 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: '#F26522' }}
          aria-hidden="true"
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Участники выставки · Featured
        </span>
        <div className="flex-1 h-px bg-slate-200" aria-hidden="true" />
        {/* Анимированная пульсирующая точка */}
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          LIVE
        </span>
      </div>

      {/*
       * Контейнер: overflow-hidden + fade по краям через CSS-маску.
       * .marquee-container — класс из globals.css, контролирует pause-on-hover.
       */}
      <div
        className="marquee-container relative overflow-hidden"
        style={{
          /**
           * Gradient-маска: левый и правый края плавно скрываются.
           * 80px зона fade даёт ощущение бесконечности без резкого обрезания.
           */
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0px, black 80px, black calc(100% - 80px), transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0px, black 80px, black calc(100% - 80px), transparent 100%)',
        }}
      >
        {/*
         * Трек: flex nowrap, gap между карточками.
         * .marquee-track — класс из globals.css с анимацией marquee-scroll.
         */}
        <div className="marquee-track flex gap-3 w-max">
          {doubled.map((exp, i) => (
            <MarqueeCard
              /**
               * Ключ = id + позиция в удвоенном массиве.
               * Это гарантирует уникальность при дублировании.
               */
              key={`${exp.id}-${i}`}
              exponent={exp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
