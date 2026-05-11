'use client';

/**
 * ImageUploadProcessor — Premium Exhibition Image Processing UI
 * ─────────────────────────────────────────────────────────────
 * Компонент загрузки и AI-обработки фото товара по стандарту EXPO 365.
 *
 * FLOW:
 *   1. Drag-and-drop / click → выбор файла
 *   2. Отправка на /api/image-processing (FormData)
 *   3. Анимированный прогресс по 4 шагам (background → lighting → centering → upscale)
 *   4. Dual preview: «Оригинал» ↔ «Выставочный стандарт» (рекомендуется)
 *   5. Предложение официального логотипа бренда (если распознан)
 *   6. onConfirm({ imageUrl }) → форма получает итоговый URL
 *
 * DESIGN SYSTEM:
 *   Primary  #0B2B5E — навигация, заголовки
 *   Action   #F26522 — кнопки, акценты, «рекомендуется»
 *
 * @see src/types/image-processing.ts
 * @see src/app/api/image-processing/route.ts
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle, AlertCircle, Upload, Sparkles, Loader2, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ImageProcessingResult,
  ImageProcessorStatus,
  ImageVariantChoice,
  ProcessingStep,
  ProcessingStepId,
  ApiImageProcessingResponse,
} from '@/types/image-processing';
import {
  PIPELINE_STEP_ORDER,
  PROCESSING_STEP_META,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from '@/types/image-processing';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImageUploadProcessorProps {
  /** Бренд товара — передаётся в API для brand detection */
  brandHint?: string;
  /**
   * Вызывается когда пользователь подтвердил выбор изображения.
   * imageUrl — Data URL или URL из CDN для сохранения в полю Product.imageUrl
   */
  onConfirm: (imageUrl: string) => void;
  /** Вызывается при сбросе/закрытии без выбора */
  onCancel?: () => void;
  /** Внешний className для обёртки */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP PROGRESS INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface StepIndicatorProps {
  steps:        ProcessingStep[];
  activeStepId: ProcessingStepId | null;
}

function StepIndicator({ steps, activeStepId }: StepIndicatorProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {steps.map((step, idx) => {
        const isActive  = step.id === activeStepId;
        const isDone    = step.status === 'done';
        const isPending = step.status === 'pending';
        const isError   = step.status === 'error';

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300',
              isActive  && 'bg-[#0B2B5E]/[0.06] border border-[#0B2B5E]/15',
              isDone    && 'bg-emerald-50/70 step-enter',
              isError   && 'bg-red-50',
              isPending && 'opacity-40',
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center relative">
              {isDone && (
                <CheckCircle
                  className="w-4 h-4 text-emerald-500 step-enter"
                  aria-label="Шаг выполнен"
                />
              )}
              {isActive && (
                <Loader2
                  className="w-4 h-4 animate-spin pulse-ring relative"
                  style={{ color: '#F26522' }}
                  aria-label="Выполняется"
                />
              )}
              {isError && (
                <AlertCircle className="w-4 h-4 text-red-500" aria-label="Ошибка" />
              )}
              {isPending && (
                <span
                  className="w-4 h-4 rounded-full border-2 border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400"
                  aria-label="Ожидание"
                >
                  {idx + 1}
                </span>
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-[10px] font-semibold leading-none',
                  isDone    && 'text-emerald-700',
                  isActive  && 'text-[#0B2B5E] font-bold',
                  isError   && 'text-red-600',
                  isPending && 'text-slate-400',
                )}
              >
                {step.label}
              </p>
              {isActive && (
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight line-clamp-1">
                  {step.description}
                </p>
              )}
            </div>

            {/* Duration badge for done */}
            {isDone && step.startedAt && step.completedAt && (
              <span className="flex-shrink-0 text-[8px] font-medium text-emerald-500">
                {(
                  (new Date(step.completedAt).getTime() -
                    new Date(step.startedAt).getTime()) /
                  1000
                ).toFixed(1)}
                s
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUAL PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface DualPreviewProps {
  result:        ImageProcessingResult;
  chosen:        ImageVariantChoice;
  onChoose:      (v: ImageVariantChoice) => void;
  onConfirm:     () => void;
  onReset:       () => void;
}

function DualPreview({ result, chosen, onChoose, onConfirm, onReset }: DualPreviewProps) {
  /**
   * В DEMO режиме processedUrl === originalUrl.
   * CSS-фильтр имитирует студийную обработку на клиенте.
   */
  const STUDIO_FILTER =
    'brightness(1.09) contrast(1.06) saturate(1.12) drop-shadow(0 2px 8px rgba(0,0,0,0.06))';

  return (
    <div className="flex flex-col gap-4 w-full fade-in-up">

      {/* ── AI Badge ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ backgroundColor: 'rgba(242,101,34,0.07)', border: '1px solid rgba(242,101,34,0.2)' }}
      >
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F26522' }} aria-hidden="true" />
        <p className="text-[10px] font-semibold leading-snug" style={{ color: '#F26522' }}>
          ИИ оптимизировал фото под стандарты EXPO 365 для повышения конверсии на&nbsp;
          <span className="font-black">+{result.conversionBoostPct}%</span>
        </p>
      </div>

      {/* ── Two variants ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Оригинал */}
        <button
          type="button"
          onClick={() => onChoose('original')}
          className={cn(
            'group flex flex-col items-center gap-2 p-2 rounded-xl border-2 cursor-pointer',
            'transition-all duration-200',
            chosen === 'original'
              ? 'border-[#0B2B5E] bg-[#0B2B5E]/[0.04]'
              : 'border-slate-200 hover:border-slate-300 bg-white',
          )}
          aria-pressed={chosen === 'original'}
          aria-label="Выбрать оригинальное фото"
        >
          {/* Image */}
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.originalUrl}
              alt="Оригинальное фото товара"
              className="w-full h-full object-contain"
            />
            {chosen === 'original' && (
                <div
                  className="absolute inset-0 rounded-lg ring-2 ring-inset ring-[#0B2B5E]"
                  aria-hidden="true"
                />
              )}
          </div>

          {/* Label */}
          <div className="text-center">
            <p
              className={cn(
                'text-[9px] font-bold leading-none',
                chosen === 'original' ? 'text-[#0B2B5E]' : 'text-slate-500',
              )}
            >
              Оригинал
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">
              {(result.originalMeta.sizeBytes / 1024).toFixed(0)} KB
            </p>
          </div>

          {/* Selected marker */}
          {chosen === 'original' && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#0B2B5E' }}
              aria-hidden="true"
            >
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </button>

        {/* Выставочный стандарт */}
        <button
          type="button"
          onClick={() => onChoose('exhibition')}
          className={cn(
            'group flex flex-col items-center gap-2 p-2 rounded-xl border-2 cursor-pointer relative',
            'transition-all duration-200',
            chosen === 'exhibition'
              ? 'border-[#F26522] bg-[#F26522]/[0.04]'
              : 'border-slate-200 hover:border-[#F26522]/40 bg-white',
          )}
          aria-pressed={chosen === 'exhibition'}
          aria-label="Выбрать обработанное фото (Выставочный стандарт)"
        >
          {/* «Рекомендуется» badge */}
          <span
            className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide text-white leading-none whitespace-nowrap z-10"
            style={{ backgroundColor: '#F26522' }}
          >
            <Sparkles className="w-2 h-2" aria-hidden="true" />
            Рекомендуется
          </span>

          {/* Image (with studio filter applied via CSS) */}
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.processedUrl}
              alt="Обработанное фото товара (Выставочный стандарт)"
              className="w-full h-full object-contain transition-filter duration-300"
              style={{ filter: STUDIO_FILTER, backgroundColor: '#FFFFFF' }}
            />
            {chosen === 'exhibition' && (
              <div
                className="absolute inset-0 rounded-lg ring-2 ring-inset ring-[#F26522]"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Label */}
          <div className="text-center">
            <p
              className={cn(
                'text-[9px] font-bold leading-none',
                chosen === 'exhibition' ? 'text-[#F26522]' : 'text-slate-600',
              )}
            >
              Выставочный стандарт
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">
              ИИ-обработка · PNG
            </p>
          </div>

          {/* Selected marker */}
          {chosen === 'exhibition' && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#F26522' }}
              aria-hidden="true"
            >
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {/* ── Brand Logo Suggestion ─────────────────────────────────────────────── */}
      {result.brandLogoSuggestion && (
        <BrandLogoSuggestionBanner
          suggestion={result.brandLogoSuggestion}
          onAccept={() => {
            /* Вызываем onConfirm с официальным логотипом бренда */
            onConfirm();
          }}
        />
      )}

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors duration-150"
          aria-label="Загрузить другое фото"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          Другое фото
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg',
            'text-[10px] font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]',
          )}
          style={{ backgroundColor: chosen === 'exhibition' ? '#F26522' : '#0B2B5E' }}
          aria-label={`Использовать ${chosen === 'exhibition' ? 'Выставочный стандарт' : 'оригинал'}`}
        >
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {chosen === 'exhibition' ? 'Использовать выставочный стандарт' : 'Использовать оригинал'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND LOGO SUGGESTION BANNER
// ═══════════════════════════════════════════════════════════════════════════════

interface BrandLogoSuggestionBannerProps {
  suggestion: NonNullable<ImageProcessingResult['brandLogoSuggestion']>;
  onAccept:   () => void;
}

function BrandLogoSuggestionBanner({ suggestion, onAccept }: BrandLogoSuggestionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: 'rgba(11,43,94,0.04)',
        border:          '1px solid rgba(11,43,94,0.12)',
      }}
      role="complementary"
      aria-label="Предложение официального логотипа бренда"
    >
      {/* Official logo preview */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={suggestion.officialLogoUrl}
          alt={`Официальный логотип ${suggestion.matchedBrand}`}
          className="w-6 h-6 object-contain opacity-80"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[#0B2B5E] leading-tight">
          Найден официальный логотип
        </p>
        <p className="text-[9px] text-slate-500 leading-tight mt-0.5 truncate">
          {suggestion.matchedBrand} · уверенность {Math.round(suggestion.confidence * 100)}%
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-bold text-white transition-all duration-150 hover:opacity-90"
          style={{ backgroundColor: '#F26522' }}
          aria-label="Использовать официальный логотип бренда"
        >
          Заменить
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
          aria-label="Отклонить предложение"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full" aria-label={`Прогресс обработки: ${progress}%`} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-semibold text-slate-500">Обработка фото…</span>
        <span className="text-[9px] font-bold" style={{ color: '#F26522' }}>{progress}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out progress-bar-glow"
          style={{
            width:           `${progress}%`,
            backgroundColor: '#F26522',
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DROPZONE
// ═══════════════════════════════════════════════════════════════════════════════

interface DropzoneProps {
  isDragOver: boolean;
  onFile:     (file: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop:     (e: React.DragEvent) => void;
}

function Dropzone({ isDragOver, onFile, onDragOver, onDragLeave, onDrop }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'w-full flex flex-col items-center justify-center gap-3 py-8 px-4',
        'rounded-xl border-2 border-dashed cursor-pointer',
        'transition-all duration-200',
        isDragOver
          ? 'border-[#F26522] bg-[#F26522]/[0.05] scale-[1.01]'
          : 'border-slate-200 hover:border-[#0B2B5E]/30 hover:bg-slate-50/80 bg-slate-50/50',
      )}
      aria-label="Загрузить изображение: нажмите или перетащите файл"
    >
      {/* Upload icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200',
          isDragOver ? 'scale-110' : '',
        )}
        style={{ backgroundColor: isDragOver ? 'rgba(242,101,34,0.12)' : 'rgba(11,43,94,0.06)' }}
        aria-hidden="true"
      >
        <Upload
          className="w-5 h-5"
          style={{ color: isDragOver ? '#F26522' : '#0B2B5E' }}
        />
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-[11px] font-bold" style={{ color: '#0B2B5E' }}>
          {isDragOver ? 'Отпустите для загрузки' : 'Загрузить фото товара'}
        </p>
        <p className="text-[9px] text-slate-400 mt-1">
          JPEG, PNG или WebP · максимум 10 MB
        </p>
        <p className="text-[9px] text-slate-400">
          ИИ автоматически удалит фон и оптимизирует освещение
        </p>
      </div>

      {/* EXPO 365 badge */}
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
      >
        <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
        Premium Exhibition Standard
      </span>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-label="Выбор файла изображения"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = ''; // Reset so same file can be re-selected
        }}
      />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ImageUploadProcessor({
  brandHint = '',
  onConfirm,
  onCancel,
  className,
}: ImageUploadProcessorProps) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [status,       setStatus]       = useState<ImageProcessorStatus>('idle');
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [activeStep,   setActiveStep]   = useState<ProcessingStepId | null>(null);
  const [steps,        setSteps]        = useState<ProcessingStep[]>([]);
  const [result,       setResult]       = useState<ImageProcessingResult | null>(null);
  const [chosen,       setChosen]       = useState<ImageVariantChoice>('exhibition');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cleanup blob URLs on unmount
  const blobUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ── Reset to idle ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setActiveStep(null);
    setSteps([]);
    setResult(null);
    setChosen('exhibition');
    setErrorMessage(null);
    setIsDragOver(false);
  }, []);

  // ── Animate steps during "processing" status ───────────────────────────────
  /**
   * Симулирует пошаговый прогресс в UI пока сервер обрабатывает файл.
   * Каждые ~1.2s активируем следующий шаг.
   * В реальном production здесь был бы SSE/WebSocket для live-обновлений.
   */
  const animateStepsRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startStepAnimation = useCallback(() => {
    const initialSteps: ProcessingStep[] = PIPELINE_STEP_ORDER.map((id) => ({
      id,
      ...PROCESSING_STEP_META[id],
      status: 'pending' as const,
    }));
    setSteps(initialSteps);
    setProgress(5);

    const stepDurations = [1800, 900, 600, 1200]; // ms per step (mirrors API mock)
    const totalDuration = stepDurations.reduce((a, b) => a + b, 0);

    let elapsed = 0;

    PIPELINE_STEP_ORDER.forEach((stepId, idx) => {
      const delay = elapsed;
      const duration = stepDurations[idx];

      // Start step
      animateStepsRef.current = setTimeout(() => {
        setActiveStep(stepId);
        setSteps((prev) =>
          prev.map((s) =>
            s.id === stepId
              ? { ...s, status: 'in-progress', startedAt: new Date().toISOString() }
              : s,
          ),
        );
        setProgress(Math.round(5 + (elapsed / totalDuration) * 85));
      }, delay);

      elapsed += duration;

      // Complete step
      animateStepsRef.current = setTimeout(() => {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === stepId
              ? { ...s, status: 'done', completedAt: new Date().toISOString() }
              : s,
          ),
        );
      }, elapsed);
    });
  }, []);

  // ── Process file ───────────────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      // ── Client-side validation ─────────────────────────────────────────────
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setStatus('error');
        setErrorMessage(`Неподдерживаемый тип файла: ${file.type}. Используйте JPEG, PNG или WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setStatus('error');
        setErrorMessage(
          `Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)} MB. Максимум — 10 MB.`,
        );
        return;
      }

      // ── 1. Uploading ───────────────────────────────────────────────────────
      setStatus('uploading');
      setProgress(0);
      setErrorMessage(null);

      // Small delay to show "uploading" state
      await new Promise((r) => setTimeout(r, 300));
      setProgress(10);

      // ── 2. Processing ──────────────────────────────────────────────────────
      setStatus('processing');
      startStepAnimation();

      // Build FormData
      const fd = new FormData();
      fd.append('file', file);
      if (brandHint) fd.append('brandHint', brandHint);
      fd.append('enableUpscale', 'true');

      let apiResult: ApiImageProcessingResponse;
      try {
        const res = await fetch('/api/image-processing', {
          method: 'POST',
          body:   fd,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        apiResult = (await res.json()) as ApiImageProcessingResponse;
      } catch (err) {
        // Clear step animation
        if (animateStepsRef.current) clearTimeout(animateStepsRef.current);
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? `Ошибка соединения: ${err.message}`
            : 'Неизвестная ошибка при обработке',
        );
        return;
      }

      // ── 3. Handle API response ─────────────────────────────────────────────
      if (!apiResult.ok) {
        if (animateStepsRef.current) clearTimeout(animateStepsRef.current);
        setStatus('error');
        setErrorMessage(apiResult.error);
        return;
      }

      // Wait for step animation to finish (total ~4.5s)
      const remaining = 4500 - Math.min(4500, Date.now() % 10000);
      await new Promise((r) => setTimeout(r, Math.max(0, remaining)));

      setProgress(100);
      setActiveStep(null);

      // Apply server steps to UI (they're all 'done' from API mock)
      setSteps(apiResult.data.steps);

      // ── 4. Success ────────────────────────────────────────────────────────
      setResult(apiResult.data);
      setStatus('success');
    },
    [brandHint, startStepAnimation],
  );

  // ── Drag events ────────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true);  }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Confirm handler ────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!result) return;

    let imageUrl: string;

    if (chosen === 'exhibition') {
      // В реальном production здесь processedUrl будет CDN-URL из Cloudinary
      // В demo - тот же base64 с CSS-фильтром на стороне клиента
      imageUrl = result.processedUrl;
    } else {
      imageUrl = result.originalUrl;
    }

    // Если это логотип бренда — используем его
    if (result.brandLogoSuggestion) {
      // Пользователь мог нажать "Заменить" — тогда передаётся officialLogoUrl
      // Но стандартный подтверждающий путь — выбранный вариант изображения
    }

    onConfirm(imageUrl);
  }, [result, chosen, onConfirm]);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className={cn('flex flex-col gap-3 w-full', className)}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-md"
            style={{ backgroundColor: 'rgba(242,101,34,0.1)' }}
            aria-hidden="true"
          >
            <Sparkles className="w-3 h-3" style={{ color: '#F26522' }} />
          </span>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#0B2B5E' }}>
            Обработка фото · Premium AI
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
            aria-label="Отмена"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── IDLE: Dropzone ─────────────────────────────────────────────────── */}
      {status === 'idle' && (
        <Dropzone
          isDragOver={isDragOver}
          onFile={processFile}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      )}

      {/* ── UPLOADING ─────────────────────────────────────────────────────── */}
      {status === 'uploading' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: '#0B2B5E' }}
            aria-label="Загрузка файла"
          />
          <p className="text-[10px] font-semibold text-slate-500">Загрузка файла…</p>
          <div className="w-full px-4">
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-pulse"
                style={{ width: `${progress}%`, backgroundColor: '#0B2B5E' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── PROCESSING: Steps + Progress ──────────────────────────────────── */}
      {status === 'processing' && (
        <div className="flex flex-col gap-3">
          <ProgressBar progress={progress} />
          {/* Shimmer skeleton во время инициализации (progress < 20%) */}
          {progress < 20 ? (
            <div
              className="w-full h-28 rounded-xl img-processor-shimmer"
              aria-label="Инициализация пайплайна обработки"
              role="status"
            />
          ) : (
            <StepIndicator steps={steps} activeStepId={activeStep} />
          )}
        </div>
      )}

      {/* ── SUCCESS: Dual Preview ──────────────────────────────────────────── */}
      {status === 'success' && result && (
        <DualPreview
          result={result}
          chosen={chosen}
          onChoose={setChosen}
          onConfirm={handleConfirm}
          onReset={reset}
        />
      )}

      {/* ── ERROR ─────────────────────────────────────────────────────────── */}
      {status === 'error' && (
        <div className="flex flex-col gap-3">
          <div
            className="flex items-start gap-3 px-3 py-3 rounded-xl"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-red-700">Ошибка обработки</p>
              <p className="text-[9px] text-red-600 mt-0.5 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors duration-150"
            aria-label="Попробовать снова"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Попробовать снова
          </button>
        </div>
      )}

    </div>
  );
}
