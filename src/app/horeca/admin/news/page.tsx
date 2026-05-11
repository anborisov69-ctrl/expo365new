'use client';

/**
 * /horeca/admin/news — News & Promo Management Page
 * ──────────────────────────────────────────────────
 * Client Component: interactive list + modal creation form.
 *
 * Features:
 *   • Dense table view of all news items with status badges
 *   • Modal creation form with full field set
 *   • AI Assistant mock — generates marketing copy from title + category
 *   • Image uploader with 1:1 square preview
 *   • Publication date picker with auto "Запланировано" status logic
 *
 * Data layer: all data is local state (mock). Migration path:
 *   supabase.from('news').insert({...}) + RLS verified_exhibitor role
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Sparkles,
  X,
  Upload,
  Eye,
  Calendar,
  Tag,
  Megaphone,
  Clock,
  CheckCircle2,
  FileEdit,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IndustryTag, PromoType } from '@/constants/newsData';
import { INDUSTRY_TAG_LABELS } from '@/constants/newsData';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type NewsStatus = 'published' | 'draft' | 'scheduled';

interface AdminNewsItem {
  id: string;
  title: string;
  category: Exclude<IndustryTag, 'all'>;
  promoType: Exclude<PromoType, 'all'>;
  text: string;
  image: string | null;
  status: NewsStatus;
  publishDate: string; // YYYY-MM-DD
  views: number;
  createdAt: string;
}

// ── Form state mirror ─────────────────────────────────────────────────────────

interface NewsFormState {
  title: string;
  category: Exclude<IndustryTag, 'all'>;
  promoType: Exclude<PromoType, 'all'>;
  text: string;
  imagePreview: string | null;
  publishDate: string;
}

const EMPTY_FORM: NewsFormState = {
  title: '',
  category: 'coffee',
  promoType: 'new',
  text: '',
  imagePreview: null,
  publishDate: new Date().toISOString().slice(0, 10),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_NEWS: AdminNewsItem[] = [
  {
    id: 'n-001',
    title: 'Linea Micra 2025 — домашняя эспрессо-машина нового поколения',
    category: 'coffee',
    promoType: 'new',
    text: 'La Marzocco выводит на рынок компактную версию Linea с двойным бойлером и PID-контроллером. Специальные условия для B2B-партнёров.',
    image: null,
    status: 'published',
    publishDate: '2026-05-07',
    views: 1248,
    createdAt: '2026-05-06',
  },
  {
    id: 'n-002',
    title: 'Распродажа комбинированных печей iCombi Pro — скидки до 30%',
    category: 'equipment',
    promoType: 'sale',
    text: 'RATIONAL объявляет о распродаже остатков линейки iCombi Pro 2024 года. Ограниченное количество единиц со склада в Москве.',
    image: null,
    status: 'published',
    publishDate: '2026-05-05',
    views: 3127,
    createdAt: '2026-05-04',
  },
  {
    id: 'n-003',
    title: 'Julius Meinl Platinum Collection — новая линейка спешелти кофе',
    category: 'coffee',
    promoType: 'special',
    text: 'Эксклюзивная коллекция Single Origin из Эфиопии и Колумбии. Для отелей и ресторанов high-end сегмента.',
    image: null,
    status: 'scheduled',
    publishDate: '2026-05-15',
    views: 0,
    createdAt: '2026-05-08',
  },
  {
    id: 'n-004',
    title: 'Новая коллекция банкетного текстиля ВЕСНА-ЛЕТО 2026',
    category: 'textile',
    promoType: 'new',
    text: 'Свежая палитра скатертей и салфеток. 100% органический хлопок. Доступна для оптовых заказов от 50 единиц.',
    image: null,
    status: 'draft',
    publishDate: '2026-05-10',
    views: 0,
    createdAt: '2026-05-07',
  },
  {
    id: 'n-005',
    title: 'Скидка 25% на посудомоечные машины Winterhalter',
    category: 'equipment',
    promoType: 'sale',
    text: 'Акция действует до конца мая. Профессиональные посудомоечные машины для ресторанов и гостиниц. Включает установку и обучение персонала.',
    image: null,
    status: 'published',
    publishDate: '2026-05-01',
    views: 892,
    createdAt: '2026-04-30',
  },
  {
    id: 'n-006',
    title: 'Premium Cold Brew — летняя линейка прохладительных напитков',
    category: 'cold-beverages',
    promoType: 'new',
    text: 'Специальные концентраты для HoReCa: холодный кофе, матча, чайные купажи. Упаковка 5 л для баров и ресторанов.',
    image: null,
    status: 'draft',
    publishDate: '2026-05-12',
    views: 0,
    createdAt: '2026-05-08',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS & CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const PROMO_TYPE_CONFIG: Record<
  Exclude<PromoType, 'all'>,
  { label: string; className: string }
> = {
  new: {
    label: 'Новинка',
    className: 'bg-[#F26522]/10 text-[#F26522] border border-[#F26522]/20',
  },
  sale: {
    label: 'Распродажа',
    className: 'bg-red-50 text-red-600 border border-red-200',
  },
  special: {
    label: 'Спецпредложение',
    className: 'bg-blue-50 text-blue-600 border border-blue-200',
  },
};

const STATUS_CONFIG: Record<
  NewsStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  published: {
    label: 'Опубликовано',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  draft: {
    label: 'Черновик',
    icon: FileEdit,
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  scheduled: {
    label: 'Запланировано',
    icon: Clock,
    className: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
};

const CATEGORY_OPTIONS: Array<{
  value: Exclude<IndustryTag, 'all'>;
  label: string;
}> = [
  { value: 'coffee', label: 'Кофе / Горячие напитки' },
  { value: 'tea', label: 'Чай' },
  { value: 'equipment', label: 'Оборудование' },
  { value: 'textile', label: 'Текстиль' },
  { value: 'dishes', label: 'Посуда' },
  { value: 'food', label: 'Продукты питания' },
  { value: 'cold-beverages', label: 'Холодные напитки' },
];

/** Resolve status based on date and explicit draft flag */
function resolveStatus(publishDate: string, isDraft = false): NewsStatus {
  if (isDraft) return 'draft';
  const today = new Date().toISOString().slice(0, 10);
  return publishDate > today ? 'scheduled' : 'published';
}

/** Format date to Russian locale */
function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format view count */
function fmtViews(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

// ── AI mock templates (keyed by category) ─────────────────────────────────────

const AI_TEMPLATES: Record<string, (title: string, cat: string) => string> = {
  coffee: (title, cat) =>
    `${title}\n\nАромат, качество и профессиональный стандарт в каждой чашке. Наша продукция из категории «${cat}» разработана специально для нужд HoReCa-сегмента: отелей, ресторанов и кофеен высокого класса.\n\nПочему выбирают нас:\n• Гарантированное качество премиум-класса\n• Оперативная доставка со склада в Москве\n• Персональный менеджер для B2B-партнёров\n• Гибкие условия оплаты и рассрочки\n\nЗаключайте контракт прямо сейчас — специальные условия действуют ограниченное время.`,
  equipment: (title, cat) =>
    `${title}\n\nПрофессиональное оборудование категории «${cat}» для бесперебойной работы вашего заведения. Все устройства сертифицированы для использования в коммерческих кухнях и отвечают требованиям HACCP.\n\nПреимущества:\n• Европейское качество и надёжность\n• Гарантийное и постгарантийное обслуживание\n• Обучение персонала в базовой комплектации\n• Монтаж под ключ в срок до 5 рабочих дней\n\nОставьте заявку сегодня и получите бесплатную демонстрацию оборудования на вашем объекте.`,
  default: (title, cat) =>
    `${title}\n\nПредставляем вашему вниманию эксклюзивное предложение в категории «${cat}» для профессионалов HoReCa-индустрии.\n\nПродукция прошла строгий отбор и соответствует высоким стандартам качества, принятым в сегменте luxury hospitality. Мы предлагаем гибкие условия сотрудничества, персональный подход и полное сопровождение сделки.\n\nСвяжитесь с нашим менеджером для получения коммерческого предложения и актуального прайс-листа.`,
};

function generateAiText(
  title: string,
  category: Exclude<IndustryTag, 'all'>
): string {
  const catLabel = INDUSTRY_TAG_LABELS[category] ?? category;
  const tpl = AI_TEMPLATES[category] ?? AI_TEMPLATES.default;
  return tpl(title || 'Новая позиция', catLabel);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NewsStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        cfg.className
      )}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Promo Type Badge ──────────────────────────────────────────────────────────

function PromoBadge({ type }: { type: Exclude<PromoType, 'all'> }) {
  const cfg = PROMO_TYPE_CONFIG[type];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

// ── Row Actions Dropdown ──────────────────────────────────────────────────────

function RowActions({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-slate-400 hover:text-[#0B2B5E] hover:bg-slate-100 transition-colors"
        aria-label="Действия"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Edit2 size={14} /> Редактировать
          </button>
          <button
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Copy size={14} /> Дублировать
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      )}
    </div>
  );
}

// ── Image Uploader ────────────────────────────────────────────────────────────

function ImageUploader({
  preview,
  onChange,
}: {
  preview: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => onChange(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative group"
    >
      {preview ? (
        <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden border-2 border-[#0B2B5E]/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Превью"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Удалить изображение"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-square w-full max-w-[200px] rounded-xl border-2 border-dashed border-slate-200 hover:border-[#F26522]/50 hover:bg-[#F26522]/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#F26522]"
        >
          <Upload size={24} />
          <span className="text-xs font-medium text-center px-2">
            Загрузить фото
            <br />
            <span className="text-slate-300 font-normal">1:1, JPG / PNG / WebP</span>
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── News Creation Modal ───────────────────────────────────────────────────────

interface NewsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: NewsFormState, isDraft: boolean) => void;
}

function NewsModal({ open, onClose, onSave }: NewsModalProps) {
  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);
  const [aiLoading, setAiLoading] = useState(false);

  const set = <K extends keyof NewsFormState>(key: K, value: NewsFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAiAssist = async () => {
    if (!form.title && form.category === 'coffee') return;
    setAiLoading(true);
    // Simulate async AI call (mock)
    await new Promise((r) => setTimeout(r, 900));
    set('text', generateAiText(form.title, form.category));
    setAiLoading(false);
  };

  const resolvedStatus = resolveStatus(form.publishDate);

  // Reset form when closing
  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setForm(EMPTY_FORM);
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Overlay — z-100, затемнение фона */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal panel — z-110 */}
      <div className="fixed inset-0 z-[110] overflow-y-auto">
      <div className="relative min-h-full flex items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200">

          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0B2B5E] flex items-center justify-center flex-shrink-0">
                <Megaphone size={14} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0B2B5E]">
                  Создать новость / акцию
                </h2>
                <p className="text-xs text-slate-400">
                  Статус после публикации:{' '}
                  <StatusBadge status={resolvedStatus} />
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Form Body ── */}
          <div className="px-6 py-5 space-y-5">

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Заголовок *
              </label>
              <input
                type="text"
                placeholder="Напр.: Распродажа кофемашин — скидки до 40%"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#0B2B5E] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/20 focus:border-[#0B2B5E] transition-all"
              />
            </div>

            {/* Category + Promo Type row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Категория продукции
                </label>
                <div className="relative">
                  <Tag
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <select
                    value={form.category}
                    onChange={(e) =>
                      set('category', e.target.value as Exclude<IndustryTag, 'all'>)
                    }
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#0B2B5E] focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/20 focus:border-[#0B2B5E] transition-all appearance-none"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Publish Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Дата публикации
                </label>
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    value={form.publishDate}
                    onChange={(e) => set('publishDate', e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#0B2B5E] focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/20 focus:border-[#0B2B5E] transition-all"
                  />
                </div>
                {resolvedStatus === 'scheduled' && (
                  <p className="mt-1 text-[11px] text-violet-600 flex items-center gap-1">
                    <Clock size={10} /> Публикация запланирована
                  </p>
                )}
              </div>
            </div>

            {/* Promo Type — Radio */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Тип предложения
              </label>
              <div className="flex gap-3 flex-wrap">
                {(
                  [
                    { value: 'new', label: 'Новинка', color: 'text-[#F26522] border-[#F26522]' },
                    { value: 'sale', label: 'Распродажа', color: 'text-red-600 border-red-400' },
                    {
                      value: 'special',
                      label: 'Спецпредложение',
                      color: 'text-blue-600 border-blue-400',
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium select-none',
                      form.promoType === opt.value
                        ? cn(opt.color, 'bg-white shadow-sm')
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="promoType"
                      value={opt.value}
                      checked={form.promoType === opt.value}
                      onChange={() =>
                        set('promoType', opt.value as Exclude<PromoType, 'all'>)
                      }
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Text + AI Assistant */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Текст новости
                </label>
                {/* AI Assistant Button */}
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={aiLoading}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    aiLoading
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                      : 'bg-gradient-to-r from-[#0B2B5E] to-[#1a4a8f] text-white border-transparent hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                  )}
                >
                  <Sparkles
                    size={12}
                    className={cn(aiLoading && 'animate-pulse')}
                  />
                  {aiLoading ? 'Генерирую...' : 'ИИ-ассистент'}
                </button>
              </div>
              <textarea
                placeholder="Напишите описание вашей акции или нажмите «ИИ-ассистент» для автогенерации..."
                value={form.text}
                onChange={(e) => set('text', e.target.value)}
                rows={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#0B2B5E] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/20 focus:border-[#0B2B5E] transition-all resize-none leading-relaxed"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                ИИ-ассистент генерирует профессиональный маркетинговый текст на основе заголовка и выбранной категории.
              </p>
            </div>

            {/* Image Uploader */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Изображение (превью 1:1)
              </label>
              <ImageUploader
                preview={form.imagePreview}
                onChange={(url) => set('imagePreview', url)}
              />
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Отмена
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onSave(form, true);
                  handleClose();
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Сохранить черновик
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(form, false);
                  handleClose();
                }}
                disabled={!form.title.trim()}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                  form.title.trim()
                    ? 'bg-[#F26522] hover:bg-[#d9551a] hover:shadow-md active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                {resolvedStatus === 'scheduled' ? 'Запланировать' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function NewsAdminPage() {
  const [items, setItems] = useState<AdminNewsItem[]>(MOCK_NEWS);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<NewsStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<Exclude<PromoType, 'all'> | 'all'>('all');

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    const matchSearch =
      !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchType = filterType === 'all' || item.promoType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total: items.length,
    published: items.filter((i) => i.status === 'published').length,
    draft: items.filter((i) => i.status === 'draft').length,
    scheduled: items.filter((i) => i.status === 'scheduled').length,
    totalViews: items.reduce((s, i) => s + i.views, 0),
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSave = (form: NewsFormState, isDraft: boolean) => {
    const newItem: AdminNewsItem = {
      id: `n-${Date.now()}`,
      title: form.title,
      category: form.category,
      promoType: form.promoType,
      text: form.text,
      image: form.imagePreview,
      status: resolveStatus(form.publishDate, isDraft),
      publishDate: form.publishDate,
      views: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleDelete = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const handleDuplicate = (id: string) => {
    const src = items.find((i) => i.id === id);
    if (!src) return;
    setItems((prev) => [
      { ...src, id: `n-${Date.now()}`, title: src.title + ' (копия)', status: 'draft', views: 0 },
      ...prev,
    ]);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <>
      <div className="space-y-6">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2B5E] tracking-tight">
              Новости и акции
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Управляйте публикациями и маркетинговыми предложениями
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26522] text-white text-sm font-semibold hover:bg-[#d9551a] hover:shadow-lg hover:shadow-[#F26522]/25 active:scale-[0.98] transition-all self-start sm:self-auto"
          >
            <Plus size={16} />
            Создать новость
          </button>
        </div>

        {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Всего записей',
              value: stats.total,
              icon: Megaphone,
              color: 'text-[#0B2B5E]',
              bg: 'bg-[#0B2B5E]/5',
            },
            {
              label: 'Опубликовано',
              value: stats.published,
              icon: CheckCircle2,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Запланировано',
              value: stats.scheduled,
              icon: Clock,
              color: 'text-violet-600',
              bg: 'bg-violet-50',
            },
            {
              label: 'Суммарно просмотров',
              value: fmtViews(stats.totalViews),
              icon: TrendingUp,
              color: 'text-[#F26522]',
              bg: 'bg-[#F26522]/5',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 [border-color:rgba(11,43,94,0.2)]"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', kpi.bg)}>
                  <Icon size={16} className={kpi.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 leading-none mb-0.5 truncate">{kpi.label}</p>
                  <p className={cn('text-xl font-bold leading-none', kpi.color)}>{kpi.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Toolbar: Search + Filters ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border px-4 py-3 flex flex-wrap gap-3 items-center [border-color:rgba(11,43,94,0.2)]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Поиск по заголовку..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-[#0B2B5E] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/15 focus:border-[#0B2B5E] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400 flex-shrink-0" />
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as NewsStatus | 'all')}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/15 focus:border-[#0B2B5E] transition-all"
            >
              <option value="all">Все статусы</option>
              <option value="published">Опубликовано</option>
              <option value="draft">Черновики</option>
              <option value="scheduled">Запланировано</option>
            </select>
            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as Exclude<PromoType, 'all'> | 'all')
              }
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0B2B5E]/15 focus:border-[#0B2B5E] transition-all"
            >
              <option value="all">Все типы</option>
              <option value="new">Новинка</option>
              <option value="sale">Распродажа</option>
              <option value="special">Спецпредложение</option>
            </select>
          </div>
        </div>

        {/* ── News Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border overflow-hidden [border-color:rgba(11,43,94,0.2)]">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 border-b border-slate-100 px-4 py-3">
            {['Новость', 'Тип', 'Статус', 'Просмотры / Дата', ''].map(
              (col) => (
                <div
                  key={col}
                  className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 px-2"
                >
                  {col}
                </div>
              )
            )}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">
                Новостей не найдено
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Попробуйте изменить фильтры или создайте первую новость
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 px-4 py-3.5 hover:bg-slate-50/60 transition-colors group items-center"
                >
                  {/* Title + category */}
                  <div className="px-2 min-w-0">
                    <p className="text-sm font-semibold text-[#0B2B5E] truncate group-hover:text-[#0B2B5E]">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {INDUSTRY_TAG_LABELS[item.category]}
                    </p>
                  </div>

                  {/* Promo type */}
                  <div className="px-2">
                    <PromoBadge type={item.promoType} />
                  </div>

                  {/* Status */}
                  <div className="px-2">
                    <StatusBadge status={item.status} />
                  </div>

                  {/* Views + Date */}
                  <div className="px-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Eye size={13} className="text-slate-400" />
                      <span className="font-semibold">{fmtViews(item.views)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Calendar size={10} />
                      {fmtDate(item.publishDate)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-2">
                    <RowActions
                      onEdit={() => {/* TODO: open pre-filled modal */}}
                      onDuplicate={() => handleDuplicate(item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Показано {filtered.length} из {items.length} записей
              </p>
              {stats.draft > 0 && (
                <p className="text-xs text-amber-600 font-medium">
                  {stats.draft} черновик{stats.draft > 1 ? 'а' : ''} не опубликовано
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Creation Modal ───────────────────────────────────────────────────── */}
      <NewsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
