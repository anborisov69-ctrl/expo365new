/**
 * image-processing.ts — TypeScript интерфейсы для Premium Exhibition Image Pipeline
 * ─────────────────────────────────────────────────────────────────────────────────
 * Используется в:
 *   • /api/image-processing  (route handler)
 *   • ImageUploadProcessor   (React component)
 *   • AddProductModal        (integration layer)
 *
 * AI Provider Architecture:
 *   REMOVE.BG  → background removal
 *   Cloudinary → upscale 2x + studio lighting (Improvement API)
 *   Sharp/WASM → smart centering + padding (server-side, no vendor)
 *
 * @see docs/tech-stack.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSING STEP — атомарный шаг пайплайна
// ═══════════════════════════════════════════════════════════════════════════════

/** Идентификатор шага обработки изображения */
export type ProcessingStepId =
  | 'background-removal'
  | 'lighting-normalization'
  | 'smart-centering'
  | 'upscale-2x';

/** Статус выполнения шага */
export type ProcessingStepStatus = 'pending' | 'in-progress' | 'done' | 'error';

/** Один шаг пайплайна обработки */
export interface ProcessingStep {
  /** Уникальный идентификатор шага */
  id: ProcessingStepId;
  /** Название шага для отображения в UI (ru) */
  label: string;
  /** Краткое описание для tooltip */
  description: string;
  /** Текущий статус выполнения */
  status: ProcessingStepStatus;
  /** Сообщение об ошибке (если status === 'error') */
  errorMessage?: string;
  /** Время начала выполнения (ISO 8601) */
  startedAt?: string;
  /** Время завершения выполнения (ISO 8601) */
  completedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND LOGO SUGGESTION — предложение официального логотипа
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Когда AI распознаёт логотип бренда, система предлагает заменить
 * фото на официальное из базы /public/assets/brands/*.svg
 */
export interface BrandLogoSuggestion {
  /** Распознанное название бренда */
  detectedBrand: string;
  /** Название бренда из нашей базы (нормализованное) */
  matchedBrand: string;
  /** Путь к официальному SVG-логотипу */
  officialLogoUrl: string;
  /** Уверенность в совпадении (0.0 – 1.0) */
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE PROCESSING JOB — задание на обработку (input)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Параметры задания на AI-обработку изображения.
 * Отправляется как FormData на /api/image-processing.
 */
export interface ImageProcessingJobInput {
  /** Файл изображения (JPEG / PNG, max 10 MB) */
  file: File;
  /**
   * Название бренда товара (опционально).
   * Используется для улучшения точности brand detection.
   */
  brandHint?: string;
  /**
   * Включить 2x upscaling для фото < 800px по длинной стороне.
   * @default true
   */
  enableUpscale?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSED IMAGE — результат ( одна версия )
// ═══════════════════════════════════════════════════════════════════════════════

/** Метаданные одной версии обработанного изображения */
export interface ProcessedImageMeta {
  /** Ширина в пикселях */
  width: number;
  /** Высота в пикселях */
  height: number;
  /** Размер файла в байтах */
  sizeBytes: number;
  /** MIME-тип */
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE PROCESSING RESULT — полный результат задания
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ответ от /api/image-processing.
 * Содержит оба варианта — оригинал и обработанное изображение.
 */
export interface ImageProcessingResult {
  /** Уникальный идентификатор задания (UUID) */
  jobId: string;

  /**
   * Data URL оригинального изображения (base64 или blob URL).
   * Используется только в UI — не сохраняется в БД.
   */
  originalUrl: string;

  /**
   * URL обработанного изображения в стандарте EXPO 365.
   * После выбора пользователем → загружается в Supabase Storage.
   *
   * Production: URL из Cloudinary / remove.bg
   * Development/mock: base64 с CSS-фильтрами симуляции
   */
  processedUrl: string;

  /** Метаданные оригинала */
  originalMeta: ProcessedImageMeta;

  /** Метаданные обработанного изображения */
  processedMeta: ProcessedImageMeta;

  /** Пошаговый лог выполнения пайплайна */
  steps: ProcessingStep[];

  /**
   * Предложение официального логотипа бренда.
   * null — если логотип бренда не распознан или не найден в базе.
   */
  brandLogoSuggestion: BrandLogoSuggestion | null;

  /**
   * Расчётный прирост конверсии при использовании обработанного фото.
   * Отображается в UI как «+30% конверсия».
   * @format integer percentage (30 = 30%)
   */
  conversionBoostPct: number;

  /** Метка времени завершения обработки (ISO 8601) */
  processedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI STATE — состояние компонента ImageUploadProcessor
// ═══════════════════════════════════════════════════════════════════════════════

/** Статус компонента загрузки и обработки */
export type ImageProcessorStatus =
  | 'idle'         // Дропзона, ожидание файла
  | 'uploading'    // Загрузка файла на сервер
  | 'processing'   // Выполнение AI пайплайна (анимация шагов)
  | 'success'      // Dual preview готов
  | 'error';       // Ошибка на любом этапе

/** Выбор пользователя: какой вариант изображения использовать */
export type ImageVariantChoice = 'original' | 'exhibition';

/** Полное состояние компонента ImageUploadProcessor */
export interface ImageProcessorState {
  status: ImageProcessorStatus;
  /** Предварительный просмотр оригинала (Data URL для img src) */
  previewUrl: string | null;
  /** Результат AI обработки */
  result: ImageProcessingResult | null;
  /** Текущий активный шаг (для анимации прогресса) */
  activeStepId: ProcessingStepId | null;
  /** Прогресс 0–100 */
  progress: number;
  /** Выбранный пользователем вариант */
  chosenVariant: ImageVariantChoice;
  /** Сообщение об ошибке */
  errorMessage: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Успешный ответ API */
export interface ApiImageProcessingSuccess {
  ok: true;
  data: ImageProcessingResult;
}

/** Ошибочный ответ API */
export interface ApiImageProcessingError {
  ok: false;
  error: string;
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'AI_PROVIDER_ERROR' | 'INTERNAL_ERROR';
}

export type ApiImageProcessingResponse =
  | ApiImageProcessingSuccess
  | ApiImageProcessingError;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Максимальный размер загружаемого файла (10 MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Допустимые MIME-типы для загрузки */
export const ALLOWED_IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Метаданные шагов пайплайна (UI labels на русском) */
export const PROCESSING_STEP_META: Record<ProcessingStepId, Pick<ProcessingStep, 'label' | 'description'>> = {
  'background-removal': {
    label:       'Удаление фона',
    description: 'AI удаляет все фоновые элементы, заменяя на чистый белый (#FFFFFF)',
  },
  'lighting-normalization': {
    label:       'Нормализация освещения',
    description: 'Эффект «Studio Softbox» — устраняет резкие тени, жёлтое/синее смещение',
  },
  'smart-centering': {
    label:       'Умное центрирование',
    description: 'Определяет границы объекта и центрирует с отступом 10% от края',
  },
  'upscale-2x': {
    label:       'Улучшение качества 2×',
    description: 'ИИ-апскейл мобильных снимков для чёткого отображения в 8-колоночной сетке',
  },
};

/** Порядок выполнения шагов пайплайна */
export const PIPELINE_STEP_ORDER: ProcessingStepId[] = [
  'background-removal',
  'lighting-normalization',
  'smart-centering',
  'upscale-2x',
];
