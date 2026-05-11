/**
 * /api/image-processing — Premium Exhibition Image Pipeline
 * ──────────────────────────────────────────────────────────
 * POST FormData { file: File, brandHint?: string, enableUpscale?: 'true'|'false' }
 *
 * PRODUCTION flow (uncomment vendor blocks below):
 *   Step 1 → remove.bg API          (background removal)
 *   Step 2 → Cloudinary AI Improve  (studio lighting + white balance)
 *   Step 3 → Sharp WASM             (smart centering + 10% padding)
 *   Step 4 → Cloudinary Upscale     (2× AI upscale if < 800px)
 *
 * DEVELOPMENT/DEMO flow (active):
 *   • Читает загруженный файл → base64
 *   • Симулирует шаги с реалистичными задержками
 *   • Возвращает "обработанную" версию (CSS-фильтр brightness/contrast применяется на клиенте)
 *   • Brand detection: сверяет brandHint с каталогом /public/assets/brands/
 *
 * Security:
 *   • MAX_FILE_SIZE_BYTES = 10 MB
 *   • ALLOWED_IMAGE_TYPES = jpeg / png / webp
 *   • Нет сохранения на диск — только in-memory Buffer
 *
 * @see src/types/image-processing.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID }                from 'crypto';
import type {
  ApiImageProcessingResponse,
  ImageProcessingResult,
  ProcessingStep,
  ProcessingStepId,
  BrandLogoSuggestion,
} from '@/types/image-processing';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
  PIPELINE_STEP_ORDER,
  PROCESSING_STEP_META,
} from '@/types/image-processing';

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND CATALOG — всё, что лежит в /public/assets/brands/
// Должно совпадать с именами файлов: /assets/brands/{slug}.svg
// ═══════════════════════════════════════════════════════════════════════════════

interface BrandCatalogEntry {
  /** Канонические варианты написания бренда (case-insensitive match) */
  aliases: string[];
  /** Slug файла, напр. 'la-marzocco' → /assets/brands/la-marzocco.svg */
  slug: string;
}

const BRAND_CATALOG: BrandCatalogEntry[] = [
  { aliases: ['la marzocco', 'la-marzocco', 'marzocco'],         slug: 'la-marzocco'      },
  { aliases: ['rancilio'],                                         slug: 'rancilio'         },
  { aliases: ['nuova simonelli', 'nuova-simonelli', 'simonelli'], slug: 'nuova-simonelli'  },
  { aliases: ['victoria arduino', 'va black eagle'],              slug: 'victoria-arduino' },
  { aliases: ['dalla corte', 'dalla-corte'],                      slug: 'dalla-corte'      },
  { aliases: ['cimbali', 'la cimbali'],                           slug: 'cimbali'          },
  { aliases: ['jura'],                                             slug: 'jura'             },
  { aliases: ['saeco'],                                            slug: 'saeco'            },
  { aliases: ['anfim'],                                            slug: 'anfim'            },
  { aliases: ['mahlkoenig', 'mahlkönig'],                         slug: 'mahlkoenig'       },
  { aliases: ['baratza'],                                          slug: 'baratza'          },
  { aliases: ['acaia'],                                            slug: 'acaia'            },
  { aliases: ['aeropress'],                                        slug: 'aeropress'        },
  { aliases: ['julius meinl', 'julius-meinl', 'meinl'],          slug: 'julius-meinl'     },
  { aliases: ['montana coffee', 'montana'],                        slug: 'montana-coffee'   },
  { aliases: ['wbc'],                                              slug: 'wbc'              },
  { aliases: ['tasty coffee', 'tasty'],                            slug: 'tasty-coffee'     },
  { aliases: ['rational'],                                         slug: 'rational'         },
  { aliases: ['unox'],                                             slug: 'unox'             },
  { aliases: ['convotherm'],                                       slug: 'convotherm'       },
  { aliases: ['alto-shaam', 'alto shaam'],                         slug: 'alto-shaam'       },
  { aliases: ['meiko'],                                            slug: 'meiko'            },
  { aliases: ['electrolux'],                                       slug: 'electrolux'       },
  { aliases: ['ecolab'],                                           slug: 'ecolab'           },
  { aliases: ['winterhalter'],                                     slug: 'winterhalter'     },
  { aliases: ['parmalat'],                                         slug: 'parmalat'         },
  { aliases: ['marco'],                                            slug: 'marco'            },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND DETECTION — сверяет brandHint с каталогом
// ═══════════════════════════════════════════════════════════════════════════════

function detectBrandLogo(brandHint: string): BrandLogoSuggestion | null {
  if (!brandHint.trim()) return null;

  const needle = brandHint.trim().toLowerCase();

  for (const entry of BRAND_CATALOG) {
    const match = entry.aliases.find((alias) =>
      alias.toLowerCase().includes(needle) || needle.includes(alias.toLowerCase()),
    );
    if (match) {
      // Уверенность: точное совпадение → 0.98, частичное → 0.78
      const isExact = entry.aliases.some((a) => a.toLowerCase() === needle);
      return {
        detectedBrand:   brandHint,
        matchedBrand:    entry.aliases[0]
          .split(/[\s-]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        officialLogoUrl: `/assets/brands/${entry.slug}.svg`,
        confidence:      isExact ? 0.98 : 0.78,
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK AI PIPELINE — симуляция обработки (development/demo)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Строит массив ProcessingStep со статусом 'done' для всех шагов.
 * В реальном production каждый шаг выполняется последовательно
 * с вызовом vendor API и реальными timestamp'ами.
 */
function buildCompletedSteps(startTime: Date): ProcessingStep[] {
  // Симулированные задержки (ms) для каждого шага
  const stepDurations: Record<ProcessingStepId, number> = {
    'background-removal':    1800,
    'lighting-normalization': 900,
    'smart-centering':        600,
    'upscale-2x':             1200,
  };

  let cursor = startTime.getTime();

  return PIPELINE_STEP_ORDER.map((stepId) => {
    const meta      = PROCESSING_STEP_META[stepId];
    const duration  = stepDurations[stepId];
    const startedAt = new Date(cursor).toISOString();
    cursor += duration;
    const completedAt = new Date(cursor).toISOString();

    return {
      id:          stepId,
      label:       meta.label,
      description: meta.description,
      status:      'done' as const,
      startedAt,
      completedAt,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest): Promise<NextResponse<ApiImageProcessingResponse>> {

  // ── 1. Парсим FormData ───────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<ApiImageProcessingResponse>(
      { ok: false, error: 'Не удалось прочитать FormData', code: 'INTERNAL_ERROR' },
      { status: 400 },
    );
  }

  const file          = formData.get('file');
  const brandHint     = (formData.get('brandHint') as string | null) ?? '';
  const enableUpscale = (formData.get('enableUpscale') as string | null) !== 'false';

  // ── 2. Валидация файла ───────────────────────────────────────────────────────
  if (!(file instanceof File)) {
    return NextResponse.json<ApiImageProcessingResponse>(
      { ok: false, error: 'Поле "file" обязательно и должно быть файлом', code: 'INTERNAL_ERROR' },
      { status: 400 },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json<ApiImageProcessingResponse>(
      {
        ok:    false,
        error: `Неподдерживаемый тип файла: ${file.type}. Используйте JPEG, PNG или WebP.`,
        code:  'INVALID_TYPE',
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json<ApiImageProcessingResponse>(
      {
        ok:    false,
        error: `Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)} MB. Максимум — 10 MB.`,
        code:  'FILE_TOO_LARGE',
      },
      { status: 413 },
    );
  }

  // ── 3. Читаем файл в Buffer → base64 ────────────────────────────────────────
  const arrayBuffer  = await file.arrayBuffer();
  const buffer       = Buffer.from(arrayBuffer);
  const base64       = buffer.toString('base64');
  const dataUrl      = `data:${file.type};base64,${base64}`;

  // ── 4. PRODUCTION HOOK: remove.bg ───────────────────────────────────────────
  /**
   * Раскомментируйте для реального удаления фона через remove.bg:
   *
   * const rbFormData = new FormData();
   * rbFormData.append('image_file', new Blob([buffer], { type: file.type }), file.name);
   * rbFormData.append('size', 'auto');
   *
   * const rbRes = await fetch('https://api.remove.bg/v1.0/removebg', {
   *   method: 'POST',
   *   headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY! },
   *   body: rbFormData,
   * });
   * if (!rbRes.ok) throw new Error('remove.bg failed: ' + rbRes.statusText);
   * const rbBuffer = Buffer.from(await rbRes.arrayBuffer());
   * const processedBase64 = rbBuffer.toString('base64');
   * const processedDataUrl = `data:image/png;base64,${processedBase64}`;
   */

  // ── 5. PRODUCTION HOOK: Cloudinary AI Improve (studio lighting + upscale) ───
  /**
   * const cloudinary = require('cloudinary').v2;
   * cloudinary.config({ cloud_name: ..., api_key: ..., api_secret: ... });
   *
   * const uploadResult = await cloudinary.uploader.upload(processedDataUrl, {
   *   transformation: [
   *     { effect: 'improve:outdoor:40' },           // studio lighting
   *     { effect: 'upscale' },                       // 2× AI upscale
   *     { gravity: 'auto', crop: 'pad',             // smart centering
   *       background: 'white', width: 1200, height: 1200,
   *       aspect_ratio: '1:1' },
   *   ],
   * });
   * const processedDataUrl = uploadResult.secure_url;
   */

  // ── 6. MOCK: в demo возвращаем оригинал как "обработанный" (CSS на клиенте) ──
  //    Клиент применяет filter: brightness(1.08) contrast(1.05) saturate(1.1)
  //    чтобы визуально имитировать эффект студийной обработки.
  const processedDataUrl = dataUrl; // В production → URL из Cloudinary / remove.bg

  // ── 7. Brand detection ───────────────────────────────────────────────────────
  const brandLogoSuggestion = detectBrandLogo(brandHint);

  // ── 8. Метаданные изображения (приблизительные для mock) ────────────────────
  const processedAt = new Date();

  const originalMeta = {
    width:     800,  // В production → получаем из Sharp / Cloudinary metadata
    height:    800,
    sizeBytes: file.size,
    mimeType:  file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  };

  const processedMeta = {
    width:     enableUpscale ? 1600 : 800,  // 2× upscale
    height:    enableUpscale ? 1600 : 800,
    sizeBytes: Math.round(file.size * 0.85), // PNG с белым фоном обычно меньше
    mimeType:  'image/png' as const,          // remove.bg всегда возвращает PNG
  };

  // ── 9. Строим результат ──────────────────────────────────────────────────────
  const result: ImageProcessingResult = {
    jobId:               randomUUID(),
    originalUrl:         dataUrl,
    processedUrl:        processedDataUrl,
    originalMeta,
    processedMeta,
    steps:               buildCompletedSteps(new Date(processedAt.getTime() - 4500)),
    brandLogoSuggestion,
    conversionBoostPct:  30,
    processedAt:         processedAt.toISOString(),
  };

  return NextResponse.json<ApiImageProcessingResponse>(
    { ok: true, data: result },
    { status: 200 },
  );
}

// ── OPTIONS — CORS preflight для внешних интеграций ──────────────────────────
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Allow':                       'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
