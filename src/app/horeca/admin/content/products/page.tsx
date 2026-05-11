'use client';

/**
 * /horeca/admin/content/products — Управление товарами экспонента
 * ───────────────────────────────────────────────────────────────
 * Client Component: интерактивная фильтрация, demo-переключатель авторизации,
 * вложенный sidebar-фильтр по подкатегориям, модальное окно добавления/редактирования.
 *
 * Архитектура данных:
 *   • Источник: src/data/productsData.ts (mock)
 *   • TODO: заменить на Supabase RLS-запрос:
 *     supabase.from('products').select('*').eq('exhibitor_id', user.id)
 *
 * Компоновка страницы:
 *   ┌────────────────────────────────────────────────────────┐
 *   │  PAGE HEADER — заголовок, счётчик, CTA добавить       │
 *   ├──────────────┬─────────────────────────────────────────┤
 *   │  LEFT PANEL  │  8-COLUMN PRODUCT GRID                  │
 *   │  (220px)     │                                         │
 *   │  • Поиск     │  ProductCard × N                        │
 *   │  • БРЕНДЫ    │  (квадратные карточки, мгновенный       │
 *   │  • КАТЕГОРИИ │   ре-рендер при выборе фильтра)         │
 *   │    └ subcat  │                                         │
 *   │  • Demo Auth │                                         │
 *   └──────────────┴─────────────────────────────────────────┘
 *
 * Синхронизация брендовых фильтров:
 *   AdminSidebar ──URL?brands=───▶ products page (читает при mount)
 *   products page ──URL?brands=──▶ AdminSidebar (читает при pathname change)
 *   Источник истины — URL search param ?brands=Brand1,Brand2
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, ImagePlus, Plus, RotateCcw, Search, Sparkles, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductCard from '@/components/marketplace/ProductCard';
import ImageUploadProcessor from '@/components/admin/ImageUploadProcessor';
import {
  PRODUCTS,
  UNIQUE_PRODUCT_BRANDS,
  PRODUCT_CATEGORY_LABELS,
  SUBCATEGORY_LABELS,
  CATEGORY_TO_SUBCATEGORIES,
  computeIsBulk,
  formatPrice,
  getCategoryAccentColor,
  getDefaultUnit,
  matchesSubCategoryAlias,
  type Product,
  type ProductCategory,
  type ProductSubCategory,
  type ProductUnit,
} from '@/data/productsData';
import { useAuth } from '@/hooks/useAuth';
import {
  useEcosystem,
  type EcoProduct,
  type EcoProductCategory,
} from '@/store/ecosystemStore';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Checkbox row ─────────────────────────────────────────────────────────────

interface CheckboxRowProps {
  label:    string;
  checked:  boolean;
  count?:   number;
  indent?:  boolean;
  onChange: () => void;
}

function CheckboxRow({ label, checked, count, indent = false, onChange }: CheckboxRowProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 py-1.5 rounded-lg cursor-pointer select-none',
        'transition-colors duration-100 hover:bg-[#0B2B5E]/[0.04] group',
        indent ? 'pl-6 pr-2' : 'px-2',
      )}
    >
      {/* Custom checkbox */}
      <span
        className={cn(
          'flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center',
          'transition-all duration-150',
          checked
            ? 'bg-[#0B2B5E] border-[#0B2B5E]'
            : 'border-slate-300 group-hover:border-[#0B2B5E]/50',
        )}
        aria-hidden="true"
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />

      <span
        className={cn(
          'flex-1 text-[10px] font-medium truncate leading-none',
          checked ? 'text-[#0B2B5E] font-semibold' : 'text-slate-500',
        )}
      >
        {label}
      </span>

      {count !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[8px] font-bold leading-none flex-shrink-0',
            checked ? 'bg-[#F26522] text-white' : 'bg-slate-100 text-slate-400',
          )}
        >
          {count}
        </span>
      )}
    </label>
  );
}

// ── Nested Category Filter ────────────────────────────────────────────────────

interface NestedCategoryFilterProps {
  category:              ProductCategory;
  subCategoryCounts:     Partial<Record<ProductSubCategory, number>>;
  selectedSubCategories: ProductSubCategory[];
  onToggleSubCategory:   (sub: ProductSubCategory) => void;
}

function NestedCategoryFilter({
  category,
  subCategoryCounts,
  selectedSubCategories,
  onToggleSubCategory,
}: NestedCategoryFilterProps) {
  const subCategories = CATEGORY_TO_SUBCATEGORIES[category] ?? [];
  const [isOpen, setIsOpen] = useState(false);

  // Авторасширяем, если хоть одна подкатегория выбрана
  const hasActiveChild = subCategories.some((s) => selectedSubCategories.includes(s));

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  // Суммарное количество товаров в этой категории
  const totalCount = subCategories.reduce(
    (acc, s) => acc + (subCategoryCounts[s] ?? 0),
    0,
  );

  return (
    <div>
      {/* Заголовок-аккордеон */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg',
          'transition-colors duration-100 cursor-pointer select-none',
          isOpen || hasActiveChild
            ? 'bg-[#0B2B5E]/[0.06]'
            : 'hover:bg-[#0B2B5E]/[0.04]',
        )}
        aria-expanded={isOpen}
        aria-label={`Категория: ${PRODUCT_CATEGORY_LABELS[category]}`}
      >
        {/* Chevron */}
        <span className="flex-shrink-0 text-slate-400" aria-hidden="true">
          {isOpen
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />
          }
        </span>

        <span
          className={cn(
            'flex-1 text-[10px] font-semibold truncate leading-none text-left',
            hasActiveChild ? 'text-[#0B2B5E]' : 'text-slate-600',
          )}
        >
          {PRODUCT_CATEGORY_LABELS[category]}
        </span>

        {/* Активные подкатегории badge */}
        {hasActiveChild && (
          <span
            className="inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[7px] font-bold text-white leading-none flex-shrink-0"
            style={{ backgroundColor: '#F26522' }}
          >
            {subCategories.filter((s) => selectedSubCategories.includes(s)).length}
          </span>
        )}

        {!hasActiveChild && totalCount > 0 && (
          <span className="text-[8px] text-slate-400 font-medium flex-shrink-0">
            {totalCount}
          </span>
        )}
      </button>

      {/* Подкатегории — анимированный список */}
      {isOpen && (
        <div className="mt-0.5 flex flex-col gap-0">
          {subCategories.map((sub) => {
            const cnt = subCategoryCounts[sub] ?? 0;
            return (
              <CheckboxRow
                key={sub}
                label={SUBCATEGORY_LABELS[sub]}
                checked={selectedSubCategories.includes(sub)}
                count={cnt > 0 ? cnt : undefined}
                indent
                onChange={() => onToggleSubCategory(sub)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  product:   Product;
  onCancel:  () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ product, onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.50)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Подтверждение удаления товара"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Красная полоска-акцент сверху */}
        <div className="h-1 w-full bg-red-500 rounded-t-2xl" aria-hidden="true" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            {/* Иконка предупреждения */}
            <span
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 1.5L12.5 11H1.5L7 1.5Z" />
                <path d="M7 5.5V7.5" />
                <circle cx="7" cy="9.5" r="0.5" fill="#ef4444" stroke="none" />
              </svg>
            </span>
            <h2 className="text-sm font-black" style={{ color: '#0B2B5E' }}>
              Удалить товар?
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
            aria-label="Отмена"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Вы уверены, что хотите удалить{' '}
            <span className="font-bold" style={{ color: '#0B2B5E' }}>
              «{product.name}»
            </span>
            ? Это действие нельзя будет отменить.
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2.5 px-5 py-3"
          style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors duration-150"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#ef4444' }}
          >
            {/* Trash icon */}
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M4 3.5l.7 7.1a.5.5 0 0 0 .5.4h3.6a.5.5 0 0 0 .5-.4L10 3.5" />
            </svg>
            Да, удалить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Product Modal ──────────────────────────────────────────────────

interface ProductFormState {
  name:        string;
  brand:       string;
  brandLogoUrl:string;
  /**
   * URL фото товара (Data URL или CDN URL).
   * Устанавливается через ImageUploadProcessor при выборе пользователем.
   */
  imageUrl:    string;
  category:    ProductCategory | '';
  subCategory: ProductSubCategory | '';
  price:       string;
  sku:         string;
  inStock:     boolean;
  isNew:       boolean;
  /**
   * Ручной флаг «Опт / Сырьё».
   * Итоговое значение isBulk = isBulk || computeIsBulk(subCategory, category, weightKg).
   */
  isBulk:      boolean;
  /** Вес в кг — используется для auto-bulk в категории Какао (порог > 5 кг) */
  weightKg:    string;
  unit:        ProductUnit;
  description: string;
  /**
   * [Partner Logic] Флаг «Для партнёров».
   * Если true — партнёрская цена видна байерам, пришедшим по /ref/ooo-test.
   */
  forPartners:  boolean;
  /**
   * [Partner Logic] Цена для партнёров — числовая строка (напр. "108000").
   * Преобразуется в "₽ 108 000" при синхронизации в EcosystemStore.
   */
  partnerPrice: string;
}

const EMPTY_FORM: ProductFormState = {
  name:         '',
  brand:        '',
  brandLogoUrl: '',
  imageUrl:     '',
  category:     '',
  subCategory:  '',
  price:        '',
  sku:          '',
  inStock:      true,
  isNew:        false,
  isBulk:       false,
  weightKg:     '',
  unit:         'шт',
  description:  '',
  forPartners:  false,
  partnerPrice: '',
};

// ── Маппинг admin-категорий → EcoProductCategory ──────────────────────────────
const ADMIN_TO_ECO_CATEGORY: Record<ProductCategory, EcoProductCategory> = {
  'coffee-machine': 'equipment',
  'grinder':        'equipment',
  'accessory':      'service',
  'combi-oven':     'equipment',
  'dishwasher':     'equipment',
  'cooking-suite':  'equipment',
  'coffee-beans':   'coffee',
  'tea':            'tea',
  'cacao':          'coffee',
};

// ── Градиенты для категорий витрины (fallback для EcoProduct) ─────────────────
const ADMIN_CATEGORY_GRADIENT: Record<ProductCategory, string> = {
  'coffee-machine': 'linear-gradient(135deg, #0d1b2a 0%, #1b2a4a 50%, #2d3f6e 100%)',
  'grinder':        'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 50%, #4a7a4a 100%)',
  'accessory':      'linear-gradient(135deg, #2a1a2a 0%, #4a2d4a 50%, #7a4a7a 100%)',
  'combi-oven':     'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 50%, #4a7a4a 100%)',
  'dishwasher':     'linear-gradient(135deg, #0d1b2a 0%, #1b3a5a 50%, #1a5080 100%)',
  'cooking-suite':  'linear-gradient(135deg, #2a1a0a 0%, #5a3a1a 50%, #8a5a2a 100%)',
  'coffee-beans':   'linear-gradient(135deg, #3b1e0a 0%, #7b3a12 50%, #c06020 100%)',
  'tea':            'linear-gradient(135deg, #1a3a2a 0%, #2e6b4a 50%, #5cad7c 100%)',
  'cacao':          'linear-gradient(135deg, #2a1a0a 0%, #5a3a1a 50%, #8a5a2a 100%)',
};

/**
 * Конвертирует данные формы admin → EcoProduct для EcosystemStore.
 * Используется при сохранении товара в handleSaveProduct.
 */
function formToEcoProduct(form: ProductFormState, id: string): EcoProduct {
  const adminCat    = (form.category || 'coffee-beans') as ProductCategory;
  const ecoCategory = ADMIN_TO_ECO_CATEGORY[adminCat] ?? 'service';
  const priceNum    = parseFloat(form.price) || 0;
  const unitSuffix  = form.unit !== 'шт' ? ` / ${form.unit}` : '';
  const basePrice   = priceNum > 0 ? `₽ ${priceNum.toLocaleString('ru-RU')}${unitSuffix}` : '—';

  const partnerPriceNum = parseFloat(form.partnerPrice) || 0;
  const partnerPriceStr = (form.forPartners && partnerPriceNum > 0)
    ? `₽ ${partnerPriceNum.toLocaleString('ru-RU')}${unitSuffix}`
    : undefined;

  return {
    id,
    name:             form.name || '—',
    category:         ecoCategory,
    basePrice,
    imageUrl:         form.imageUrl || null,
    imageGradient:    ADMIN_CATEGORY_GRADIENT[adminCat] ?? 'linear-gradient(135deg, #0B2B5E 0%, #1a4080 100%)',
    isNew:            form.isNew,
    shortDescription: form.description || undefined,
    forPartners:      form.forPartners || undefined,
    partnerPrice:     partnerPriceStr,
  };
}

interface AddProductModalProps {
  editProduct: Product | null;
  onClose:     () => void;
  onSave:      (form: ProductFormState) => void;
}

function AddProductModal({ editProduct, onClose, onSave }: AddProductModalProps) {
  const [form, setForm] = useState<ProductFormState>(() => {
    if (!editProduct) return EMPTY_FORM;
    const ep = editProduct as Product & { forPartners?: boolean; partnerPrice?: string | number };
    return {
      name:         editProduct.name,
      brand:        editProduct.brand,
      brandLogoUrl: editProduct.brandLogoUrl ?? '',
      imageUrl:     editProduct.imageUrl ?? '',
      category:     editProduct.category,
      subCategory:  editProduct.subCategory ?? '',
      price:        String(editProduct.price),
      sku:          editProduct.sku,
      inStock:      editProduct.inStock,
      isNew:        editProduct.isNew ?? false,
      isBulk:       editProduct.isBulk ?? false,
      weightKg:     editProduct.weightKg !== undefined ? String(editProduct.weightKg) : '',
      unit:         editProduct.unit ?? 'шт',
      description:  editProduct.description ?? '',
      forPartners:  ep.forPartners ?? false,
      partnerPrice: ep.partnerPrice !== undefined ? String(ep.partnerPrice) : '',
    };
  });

  /** Показывает/скрывает панель AI-обработки фото внутри формы */
  const [showImageProcessor, setShowImageProcessor] = useState(false);

  /** Доступные подкатегории для текущей выбранной категории */
  const availableSubCategories = useMemo<ProductSubCategory[]>(
    () => (form.category ? CATEGORY_TO_SUBCATEGORIES[form.category as ProductCategory] ?? [] : []),
    [form.category],
  );

  /** При смене категории — сбрасываем подкатегорию */
  const handleCategoryChange = useCallback((cat: ProductCategory | '') => {
    setForm((prev) => ({ ...prev, category: cat, subCategory: '' }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSave(form);
    },
    [form, onSave],
  );

  // ── Общие стили инпутов ─────────────────────────────────────────────────
  const inputCls = [
    'w-full h-8 px-2.5 rounded-lg border text-[11px] text-[#0B2B5E]',
    'bg-slate-50 border-slate-200 placeholder:text-slate-400',
    'focus:outline-none focus:border-[#F26522]/70 focus:bg-white',
    'transition-colors duration-150',
  ].join(' ');

  const labelCls = 'block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.45)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={editProduct ? 'Редактировать товар' : 'Добавить товар'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#F26522]" aria-hidden="true" />
            <h2 className="text-sm font-black" style={{ color: '#0B2B5E' }}>
              {editProduct ? 'Редактировать товар' : 'Добавить товар'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#F26522] hover:bg-slate-100 transition-colors duration-150"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-4">
  
              {/* Название */}
              <div className="col-span-2">
                <label className={labelCls}>Название товара *</label>
                <input
                  required
                  type="text"
                  placeholder="Например: La Marzocco Linea PB"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
  
              {/* Бренд */}
              <div>
                <label className={labelCls}>Бренд *</label>
                <input
                  required
                  type="text"
                  placeholder="La Marzocco"
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  className={inputCls}
                />
              </div>
  
              {/* Логотип */}
              <div>
                <label className={labelCls}>Путь к логотипу</label>
                <input
                  type="text"
                  placeholder="/assets/brands/la-marzocco.svg"
                  value={form.brandLogoUrl}
                  onChange={(e) => setForm((p) => ({ ...p, brandLogoUrl: e.target.value }))}
                  className={inputCls}
                />
              </div>
  
              {/* ── ФОТО ТОВАРА: Premium Exhibition AI ──────────────────────── */}
              <div className="col-span-2">
                <label className={labelCls}>Фото товара</label>
  
                {/* Показываем превью если фото уже выбрано */}
                {form.imageUrl && !showImageProcessor ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.imageUrl}
                        alt="Фото товара"
                        className="w-full h-full object-contain"
                        style={{
                          filter: 'brightness(1.09) contrast(1.06) saturate(1.12)',
                        }}
                      />
                    </div>
  
                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide text-white leading-none"
                          style={{ backgroundColor: '#F26522' }}
                        >
                          <Sparkles className="w-2 h-2" aria-hidden="true" />
                          EXPO 365 AI
                        </span>
                      </div>
                      <p className="text-[9px] font-semibold text-[#0B2B5E] truncate leading-tight">
                        Фото обработано
                      </p>
                      <p className="text-[8px] text-slate-400 leading-tight mt-0.5">
                        Удалён фон · Studio Softbox · Центрирование · 2× Upscale
                      </p>
                    </div>
  
                    {/* Replace button */}
                    <button
                      type="button"
                      onClick={() => { setShowImageProcessor(true); }}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[9px] font-semibold text-slate-500 hover:bg-white hover:border-slate-300 transition-colors duration-150"
                      aria-label="Заменить фото товара"
                    >
                      <ImagePlus className="w-3 h-3" aria-hidden="true" />
                      Заменить
                    </button>
                  </div>
                ) : !showImageProcessor ? (
                  /* Кнопка-триггер для открытия процессора */
                  <button
                    type="button"
                    onClick={() => setShowImageProcessor(true)}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 h-10 px-3',
                      'rounded-xl border-2 border-dashed border-slate-200',
                      'text-[10px] font-semibold text-slate-400',
                      'hover:border-[#F26522]/50 hover:text-[#F26522] hover:bg-[#F26522]/[0.03]',
                      'transition-all duration-200 cursor-pointer group',
                    )}
                    aria-label="Загрузить и обработать фото товара с помощью ИИ"
                  >
                    <span
                      className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 group-hover:bg-[#F26522]/10"
                      style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
                      aria-hidden="true"
                    >
                      <Sparkles className="w-3 h-3 group-hover:text-[#F26522]" style={{ color: '#0B2B5E' }} />
                    </span>
                    Загрузить фото с ИИ-обработкой
                    <span
                      className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide text-white leading-none"
                      style={{ backgroundColor: 'rgba(242,101,34,0.8)' }}
                    >
                      +30% конверсии
                    </span>
                  </button>
                ) : null}
  
                {/* ── AI Processor Panel (раскрывается по клику) ──────────────── */}
                {showImageProcessor && (
                  <div
                    className="mt-2 p-3 rounded-xl border"
                    style={{
                      backgroundColor: 'rgba(11,43,94,0.02)',
                      borderColor:     'rgba(11,43,94,0.1)',
                    }}
                  >
                    <ImageUploadProcessor
                      brandHint={form.brand}
                      onConfirm={(imageUrl) => {
                        setForm((p) => ({ ...p, imageUrl }));
                        setShowImageProcessor(false);
                      }}
                      onCancel={() => setShowImageProcessor(false)}
                    />
                  </div>
                )}
              </div>

            {/* ── Зависимые дропдауны: Категория → Подкатегория ────────────── */}

            {/* Категория */}
            <div>
              <label className={labelCls}>Категория *</label>
              <select
                required
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value as ProductCategory | '')}
                className={cn(inputCls, 'cursor-pointer')}
              >
                <option value="" disabled>— выберите —</option>
                {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {PRODUCT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Подкатегория — зависит от выбранной категории */}
            <div>
              <label className={labelCls}>
                Подкатегория
                {availableSubCategories.length === 0 && form.category && (
                  <span className="ml-1 text-slate-400 normal-case tracking-normal font-normal">
                    (нет вариантов)
                  </span>
                )}
              </label>
              <select
                value={form.subCategory}
                disabled={availableSubCategories.length === 0}
                onChange={(e) => setForm((p) => ({ ...p, subCategory: e.target.value as ProductSubCategory | '' }))}
                className={cn(
                  inputCls,
                  'cursor-pointer',
                  availableSubCategories.length === 0 && 'opacity-40 cursor-not-allowed',
                )}
              >
                <option value="">— без подкатегории —</option>
                {availableSubCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {SUBCATEGORY_LABELS[sub]}
                  </option>
                ))}
              </select>
            </div>

            {/* Визуальная подсказка при выборе подкатегории */}
            {form.category && availableSubCategories.length > 0 && (
              <div className="col-span-2 -mt-2">
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Доступно подкатегорий для «{PRODUCT_CATEGORY_LABELS[form.category as ProductCategory]}»:{' '}
                  <span className="font-semibold text-[#0B2B5E]">
                    {availableSubCategories.map((s) => SUBCATEGORY_LABELS[s]).join(' · ')}
                  </span>
                </p>
              </div>
            )}

            {/* Цена */}
            <div>
              <label className={labelCls}>Цена (₽) *</label>
              <input
                required
                type="number"
                min="0"
                step="100"
                placeholder="485000"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* SKU */}
            <div>
              <label className={labelCls}>SKU *</label>
              <input
                required
                type="text"
                placeholder="LM-LINPB-AV1"
                value={form.sku}
                onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Описание */}
            <div className="col-span-2">
              <label className={labelCls}>Описание</label>
              <textarea
                rows={2}
                placeholder="Краткое описание товара..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className={cn(inputCls, 'h-auto resize-none py-2')}
              />
            </div>

            {/* Цена + Единица измерения */}
            <div>
              <label className={labelCls}>Единица *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as ProductUnit }))}
                className={cn(inputCls, 'cursor-pointer')}
              >
                <option value="шт">шт</option>
                <option value="упаковка">упаковка</option>
                <option value="кг">кг</option>
                <option value="мешок">мешок</option>
                <option value="тонна">тонна</option>
              </select>
            </div>

            {/* Вес (кг) */}
            <div>
              <label className={labelCls}>Вес, кг</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="1.0"
                value={form.weightKg}
                onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Флаги */}
            <div className="col-span-2 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(e) => setForm((p) => ({ ...p, inStock: e.target.checked }))}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'w-8 h-4 rounded-full transition-colors duration-200 relative flex-shrink-0',
                    form.inStock ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
                      form.inStock ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </span>
                <span className="text-[10px] font-semibold text-slate-600">В наличии</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isNew}
                  onChange={(e) => setForm((p) => ({ ...p, isNew: e.target.checked }))}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'w-8 h-4 rounded-full transition-colors duration-200 relative flex-shrink-0',
                    form.isNew ? 'bg-[#F26522]' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
                      form.isNew ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </span>
                <span className="text-[10px] font-semibold text-slate-600">Новинка (NEW)</span>
              </label>

              {/* ── [Partner Logic] Для партнёров ── */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.forPartners}
                  onChange={(e) => setForm((p) => ({ ...p, forPartners: e.target.checked, partnerPrice: e.target.checked ? p.partnerPrice : '' }))}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'w-8 h-4 rounded-full transition-colors duration-200 relative flex-shrink-0',
                    form.forPartners ? 'bg-[#0B2B5E]' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
                      form.forPartners ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </span>
                <span className="text-[10px] font-semibold text-slate-600">Для партнёров</span>
              </label>

              {/* Партнёрская цена — показывается только если forPartners активен */}
              {form.forPartners && (
                <div className="w-full mt-2 flex items-center gap-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                    Партнёрская цена ₽
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="напр. 108000"
                    value={form.partnerPrice}
                    onChange={(e) => setForm((p) => ({ ...p, partnerPrice: e.target.value }))}
                    className={[
                      'flex-1 h-8 px-2.5 rounded-lg border text-[11px] text-[#0B2B5E]',
                      'bg-white border-[#0B2B5E]/20 placeholder:text-slate-400',
                      'focus:outline-none focus:border-[#F26522]/70',
                      'transition-colors duration-150',
                    ].join(' ')}
                    aria-label="Партнёрская цена в рублях"
                  />
                </div>
              )}

              {/* Bulk / Опт — ручной флаг */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    form.isBulk ||
                    computeIsBulk({
                      isBulk:      form.isBulk,
                      subCategory: form.subCategory || undefined,
                      category:    form.category as ProductCategory || 'accessory',
                      weightKg:    form.weightKg ? parseFloat(form.weightKg) : undefined,
                    })
                  }
                  onChange={(e) => setForm((p) => ({ ...p, isBulk: e.target.checked }))}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'w-8 h-4 rounded-full transition-colors duration-200 relative flex-shrink-0',
                    (form.isBulk || computeIsBulk({
                      isBulk:      form.isBulk,
                      subCategory: form.subCategory || undefined,
                      category:    form.category as ProductCategory || 'accessory',
                      weightKg:    form.weightKg ? parseFloat(form.weightKg) : undefined,
                    })) ? 'bg-slate-600' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
                      (form.isBulk || computeIsBulk({
                        isBulk:      form.isBulk,
                        subCategory: form.subCategory || undefined,
                        category:    form.category as ProductCategory || 'accessory',
                        weightKg:    form.weightKg ? parseFloat(form.weightKg) : undefined,
                      })) ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </span>
                <span className="text-[10px] font-semibold text-slate-600">Опт / Сырьё</span>
              </label>
            </div>

          </div>

          {/* Footer actions */}
          <div
            className="flex-shrink-0 flex items-center justify-end gap-2.5 px-5 py-3"
            style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors duration-150"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold text-white transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: '#F26522' }}
            >
              <Plus className="w-3 h-3" />
              {editProduct ? 'Сохранить' : 'Добавить товар'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Restore From Archive Modal ────────────────────────────────────────────────

interface RestoreFromArchiveModalProps {
  /** Все товары (включая archived) — фильтруем внутри по status */
  allProducts:    Product[];
  onClose:        () => void;
  onRestore:      (productId: string) => void;
}

function RestoreFromArchiveModal({ allProducts, onClose, onRestore }: RestoreFromArchiveModalProps) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  /** Только архивированные товары */
  const archivedProducts = useMemo(
    () => allProducts.filter((p) => p.status === 'archived'),
    [allProducts],
  );

  /** Результат поиска по названию, бренду, категории */
  const filteredArchived = useMemo<Product[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivedProducts;
    return archivedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        PRODUCT_CATEGORY_LABELS[p.category].toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [archivedProducts, query]);

  // Автофокус на поле поиска при открытии
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,43,94,0.50)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Восстановить товар из архива"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
      >
        {/* Верхняя акцент-полоска */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{
            background: 'linear-gradient(90deg, #0B2B5E 0%, #F26522 100%)',
          }}
          aria-hidden="true"
        />

        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(11,43,94,0.07)' }}
              aria-hidden="true"
            >
              <RotateCcw className="w-3.5 h-3.5" style={{ color: '#0B2B5E' }} />
            </span>
            <div>
              <h2 className="text-sm font-black leading-none" style={{ color: '#0B2B5E' }}>
                Восстановить из архива
              </h2>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                {archivedProducts.length === 0
                  ? 'Архив пуст'
                  : `${archivedProducts.length} ${archivedProducts.length === 1 ? 'товар' : archivedProducts.length < 5 ? 'товара' : 'товаров'} в архиве`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#F26522] hover:bg-slate-100 transition-colors duration-150"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Поиск */}
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.06)' }}
        >
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              size={11}
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              placeholder="Поиск по названию, бренду, категории..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                'w-full h-8 pl-7',
                query ? 'pr-7' : 'pr-3',
                'bg-slate-50 border border-slate-200 rounded-lg',
                'text-[11px] text-[#0B2B5E] placeholder:text-slate-400',
                'focus:outline-none focus:border-[#F26522]/60 focus:bg-white',
                'transition-colors duration-150',
              ].join(' ')}
              aria-label="Поиск в архиве"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:text-[#F26522] hover:bg-[#F26522]/10 transition-colors duration-150"
                aria-label="Очистить поиск"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {archivedProducts.length === 0 ? (
            /* Нет архивированных товаров */
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(11,43,94,0.05)' }}
              >
                <RotateCcw size={20} style={{ color: '#0B2B5E' }} strokeWidth={1.4} />
              </div>
              <p className="text-sm font-bold" style={{ color: '#0B2B5E' }}>Архив пуст</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Товары, отправленные в архив, появятся здесь
              </p>
            </div>
          ) : filteredArchived.length === 0 ? (
            /* Поиск ничего не нашёл */
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <p className="text-sm font-bold" style={{ color: '#0B2B5E' }}>Ничего не найдено</p>
              <p className="text-[11px] text-slate-400 mt-1">
                По запросу «{query}» нет архивных товаров
              </p>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'rgba(11,43,94,0.06)' }}>
              {filteredArchived.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors duration-100 group"
                >
                  {/* Мини-фото / инициал бренда */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center border"
                    style={{
                      backgroundColor: 'rgba(11,43,94,0.04)',
                      borderColor: 'rgba(11,43,94,0.10)',
                    }}
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain opacity-70 group-hover:opacity-90 transition-opacity duration-150"
                      />
                    ) : product.brandLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.brandLogoUrl}
                        alt={`Логотип ${product.brand}`}
                        className="w-6 h-6 object-contain opacity-60 group-hover:opacity-80 transition-opacity duration-150"
                      />
                    ) : (
                      <span
                        className="text-sm font-black"
                        style={{ color: '#0B2B5E', opacity: 0.35 }}
                      >
                        {product.brand.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Мета-информация */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-bold leading-tight truncate"
                      style={{ color: '#0B2B5E' }}
                    >
                      {product.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-500 truncate">{product.brand}</span>
                      <span className="text-slate-300 text-[8px]">·</span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-black tracking-wide uppercase leading-none flex-shrink-0"
                        style={{
                          backgroundColor: 'rgba(11,43,94,0.08)',
                          color: '#0B2B5E',
                        }}
                      >
                        {PRODUCT_CATEGORY_LABELS[product.category]}
                      </span>
                    </div>
                  </div>

                  {/* Кнопка восстановления */}
                  <button
                    type="button"
                    onClick={() => onRestore(product.id)}
                    className={[
                      'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                      'text-[10px] font-bold text-white',
                      'transition-all duration-150 hover:opacity-90 active:scale-95',
                    ].join(' ')}
                    style={{ backgroundColor: '#F26522' }}
                    aria-label={`Вернуть «${product.name}» на витрину`}
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    Вернуть на витрину
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {archivedProducts.length > 0 && (
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
          >
            <p className="text-[9px] text-slate-400">
              {query
                ? `${filteredArchived.length} из ${archivedProducts.length} позиций`
                : `${archivedProducts.length} archived SKU`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors duration-150"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Product Dropdown ──────────────────────────────────────────────────────

interface AddProductDropdownProps {
  onNewProduct:   () => void;
  onRestoreFromArchive: () => void;
  archivedCount: number;
}

function AddProductDropdown({ onNewProduct, onRestoreFromArchive, archivedCount }: AddProductDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Закрываем при клике вне компонента */
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
        style={{ backgroundColor: '#F26522' }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню добавления товара"
      >
        <Plus className="w-3 h-3" aria-hidden="true" />
        Добавить товар
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border overflow-hidden z-50"
          style={{ borderColor: 'rgba(11,43,94,0.12)' }}
          role="menu"
        >
          {/* Новый товар */}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onNewProduct(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F26522]/[0.06] transition-colors duration-100 group"
          >
            <span
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-100 group-hover:bg-[#F26522]/15"
              style={{ backgroundColor: 'rgba(242,101,34,0.08)' }}
              aria-hidden="true"
            >
              <Plus className="w-3.5 h-3.5" style={{ color: '#F26522' }} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold leading-none" style={{ color: '#0B2B5E' }}>
                Новый товар
              </p>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                Создать с нуля
              </p>
            </div>
          </button>

          {/* Разделитель */}
          <div className="mx-3 border-t" style={{ borderColor: 'rgba(11,43,94,0.07)' }} aria-hidden="true" />

          {/* Восстановить из архива */}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onRestoreFromArchive(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#0B2B5E]/[0.04] transition-colors duration-100 group"
          >
            <span
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-100 group-hover:bg-[#0B2B5E]/10"
              style={{ backgroundColor: 'rgba(11,43,94,0.06)' }}
              aria-hidden="true"
            >
              <RotateCcw className="w-3.5 h-3.5" style={{ color: '#0B2B5E' }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold leading-none" style={{ color: '#0B2B5E' }}>
                  Восстановить из архива
                </p>
                {archivedCount > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[8px] font-bold text-white leading-none flex-shrink-0"
                    style={{ backgroundColor: '#0B2B5E' }}
                    aria-label={`${archivedCount} товаров в архиве`}
                  >
                    {archivedCount}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                {archivedCount === 0 ? 'Архив пуст' : `${archivedCount} SKU в архиве`}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminProductsPage() {
  const { isAuthorized, toggleMockAuth } = useAuth();
  const router = useRouter();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [selectedBrands,        setSelectedBrands]        = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<ProductSubCategory[]>([]);
  const [searchQuery,           setSearchQuery]           = useState('');
  /** Фильтр «Только сырьё / Опт» — показывает только товары с isBulk */
  const [onlyBulk,              setOnlyBulk]              = useState(false);

  /** Реф на поисковый input — нужен для возврата фокуса после сброса крестиком */
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Ecosystem Store — глобальное хранилище ООО "ТЕСТ" ─────────────────────
  const { state: ecoState, dispatch: ecoDispatch } = useEcosystem();

  // ── Local products state (мутируется при удалении) ─────────────────────────
  const [localProducts,    setLocalProducts]    = useState<Product[]>(() => [...PRODUCTS]);

  // ── Delete confirm state ───────────────────────────────────────────────────
  const [productToDelete,  setProductToDelete]  = useState<Product | null>(null);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [isModalOpen,        setIsModalOpen]        = useState(false);
  const [editProduct,        setEditProduct]         = useState<Product | null>(null);

  // ── Archive modal state ────────────────────────────────────────────────────
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // ── Product Detail Drawer state ───────────────────────────────────────────
  /** ID выбранной карточки; null = drawer закрыт */
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  /**
   * Читаем ?brands= из URL при монтировании.
   * Это позволяет AdminSidebar (который обновляет URL) синхронизировать
   * состояние с данной страницей.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw    = params.get('brands');
      if (raw) setSelectedBrands(raw.split(',').filter(Boolean));
    } catch { /* SSR fallback */ }
  }, []);

  /**
   * При изменении selectedBrands на этой странице — обновляем URL,
   * чтобы AdminSidebar мог отразить текущее состояние.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (selectedBrands.length > 0) {
        params.set('brands', selectedBrands.join(','));
      } else {
        params.delete('brands');
      }
      const query = params.toString();
      const next  = `/horeca/admin/content/products${query ? `?${query}` : ''}`;
      router.replace(next, { scroll: false });
    } catch { /* SSR fallback */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrands]);

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleBrand = useCallback((brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  }, []);

  const toggleSubCategory = useCallback((sub: ProductSubCategory) => {
    setSelectedSubCategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedBrands([]);
    setSelectedSubCategories([]);
    setSearchQuery('');
    setOnlyBulk(false);
  }, []);

  // ── Filtered products ─────────────────────────────────────────────────────
  /**
   * Логика поиска расширена: запрос "автоматическая" сопоставляется
   * с алиасами подкатегории 'машины-авто' через matchesSubCategoryAlias().
   *
   * Порядок проверок:
   *  1. Бренд (selectedBrands)
   *  2. Подкатегория (selectedSubCategories)
   *  3. Поиск по тексту:
   *     a. name, brand, sku — прямое вхождение
   *     b. SUBCATEGORY_LABELS — метка подкатегории
   *     c. SUBCATEGORY_SEARCH_ALIASES — синонимы подкатегории
   */
  const filteredProducts = useMemo<Product[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return localProducts.filter((p) => {
      // −1. Скрываем архивированные из основной сетки
      if (p.status === 'archived') return false;

      // 0. Фильтр «Только сырьё / Опт»
      const matchesBulk = !onlyBulk || computeIsBulk(p);

      // 1. Фильтр по бренду
      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(p.brand);

      // 2. Фильтр по подкатегории
      const matchesSub =
        selectedSubCategories.length === 0 ||
        (p.subCategory !== undefined && selectedSubCategories.includes(p.subCategory));

      // 3. Сквозной поиск:
      //    name · brand · sku
      //    → category label  (e.g. «Кофемашины», «Чай», «Какао»)
      //    → subCategory slug (e.g. «кофе-жареный», «кофемолки» → матч по «кофе»)
      //    → subCategory label (e.g. «Жареный», «Листовой», «Балковый»)
      //    → subCategory aliases (e.g. «автоматическая» → 'машины-авто')
      //    → description (полнотекстовый fallback)
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        PRODUCT_CATEGORY_LABELS[p.category].toLowerCase().includes(q) ||
        (p.subCategory !== undefined && p.subCategory.toLowerCase().includes(q)) ||
        (p.subCategory !== undefined &&
          SUBCATEGORY_LABELS[p.subCategory].toLowerCase().includes(q)) ||
        matchesSubCategoryAlias(p.subCategory, q) ||
        (p.description !== undefined && p.description.toLowerCase().includes(q));

      return matchesBulk && matchesBrand && matchesSub && matchesSearch;
    });
  }, [onlyBulk, selectedBrands, selectedSubCategories, searchQuery, localProducts]);

  // ── Per-brand product counts ───────────────────────────────────────────────
  const brandCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    localProducts.forEach((p) => {
      counts[p.brand] = (counts[p.brand] ?? 0) + 1;
    });
    return counts;
  }, [localProducts]);

  // ── Per-subCategory product counts ────────────────────────────────────────
  const subCategoryCounts = useMemo<Partial<Record<ProductSubCategory, number>>>(() => {
    const counts: Partial<Record<ProductSubCategory, number>> = {};
    localProducts.forEach((p) => {
      if (p.subCategory) {
        counts[p.subCategory] = (counts[p.subCategory] ?? 0) + 1;
      }
    });
    return counts;
  }, [localProducts]);

  /**
   * Уникальные категории с хотя бы одной подкатегорией — для nested filter.
   * Категории без подкатегорий (combi-oven, dishwasher, cooking-suite) не отображаются.
   */
  const categoriesWithSubcats = useMemo<ProductCategory[]>(
    () =>
      Array.from(new Set(localProducts.map((p) => p.category)))
        .filter((cat) => (CATEGORY_TO_SUBCATEGORIES[cat] ?? []).length > 0)
        .sort() as ProductCategory[],
    [localProducts],
  );

  const hasActiveFilters =
    onlyBulk ||
    selectedBrands.length > 0 ||
    selectedSubCategories.length > 0 ||
    searchQuery.trim().length > 0;

  // ── Delete handlers ───────────────────────────────────────────────────────
  /** Шаг 1: показываем confirm-модал */
  const handleRequestDelete = useCallback((product: Product) => {
    setProductToDelete(product);
  }, []);

  /** Шаг 2: пользователь подтвердил — убираем из localProducts */
  const handleConfirmDelete = useCallback(() => {
    if (!productToDelete) return;
    setLocalProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
    // Закрываем drawer, если удаляемый товар был открыт
    setSelectedProductId((prev) => (prev === productToDelete.id ? null : prev));
    setProductToDelete(null);
  }, [productToDelete]);

  /** Шаг 2а: пользователь отменил */
  const handleCancelDelete = useCallback(() => {
    setProductToDelete(null);
  }, []);

  // ── Archive handler ───────────────────────────────────────────────────────
  /**
   * Переводит товар в статус 'archived'.
   * Товар исчезает из основной сетки (filteredProducts исключает archived),
   * но остаётся в localProducts для потенциальной Un-Archive операции.
   *
   * TODO: Supabase → .update({ status: 'archived' }).eq('id', product.id)
   */
  const handleArchive = useCallback((product: Product) => {
    setLocalProducts((prev) =>
      prev.map((p) => p.id === product.id ? { ...p, status: 'archived' as const } : p),
    );
    // Закрываем drawer, если архивируемый товар был открыт
    setSelectedProductId((prev) => (prev === product.id ? null : prev));
  }, []);

  // ── Restore handler ───────────────────────────────────────────────────────
  /**
   * Переводит товар из 'archived' обратно в 'active'.
   * filteredProducts автоматически включит его в сетку,
   * счётчик SKU пересчитается реактивно.
   *
   * TODO: Supabase → .update({ status: 'active' }).eq('id', productId)
   */
  const handleRestore = useCallback((productId: string) => {
    setLocalProducts((prev) =>
      prev.map((p) => p.id === productId ? { ...p, status: 'active' as const } : p),
    );
  }, []);

  // ── Cart handler (mock) ───────────────────────────────────────────────────
  const handleAddToCart = useCallback((product: Product) => {
    // TODO: dispatch to cart store / Supabase cart table
    console.info('[Cart] Добавлен товар:', product.sku, product.name);
  }, []);

  // ── Drawer handler ────────────────────────────────────────────────────────
  /** Открывает боковую панель детали; повторный клик — закрывает */
  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProductId((prev) => (prev === productId ? null : productId));
  }, []);

  // ── Modal handlers ────────────────────────────────────────────────────────
  const openAddModal          = useCallback(() => { setEditProduct(null); setIsModalOpen(true); }, []);
  const closeModal            = useCallback(() => { setIsModalOpen(false); setEditProduct(null); }, []);
  const openArchiveModal      = useCallback(() => setIsArchiveModalOpen(true), []);
  const closeArchiveModal     = useCallback(() => setIsArchiveModalOpen(false), []);

  const handleSaveProduct = useCallback((form: ProductFormState) => {
    let newOrUpdatedId: string;

    if (editProduct) {
      // ── Редактирование существующего товара ─────────────────────────────
      // TODO: Supabase → .update({...}).eq('id', editProduct.id) (с RLS проверкой)
      newOrUpdatedId = editProduct.id;
      setLocalProducts((prev) =>
        prev.map((p) => {
          if (p.id !== editProduct.id) return p;
          return {
            ...p,
            name:         form.name,
            brand:        form.brand,
            brandLogoUrl: form.brandLogoUrl || undefined,
            imageUrl:     form.imageUrl     || undefined,
            category:     form.category     as ProductCategory,
            subCategory:  (form.subCategory || undefined) as ProductSubCategory | undefined,
            price:        parseFloat(form.price) || p.price,
            sku:          form.sku,
            inStock:      form.inStock,
            isNew:        form.isNew,
            isBulk:       form.isBulk,
            weightKg:     form.weightKg ? parseFloat(form.weightKg) : undefined,
            unit:         form.unit,
            description:  form.description || undefined,
          };
        }),
      );
    } else {
      // ── Добавление нового товара ─────────────────────────────────────────
      // TODO: Supabase → .insert({...}) с exhibitor_id из сессии (RLS auto-assigns)
      newOrUpdatedId = `prod-local-${Date.now()}`;
      const newProduct: Product = {
        id:           newOrUpdatedId,
        name:         form.name,
        brand:        form.brand,
        brandLogoUrl: form.brandLogoUrl || undefined,
        imageUrl:     form.imageUrl     || undefined,
        category:     form.category     as ProductCategory,
        subCategory:  (form.subCategory || undefined) as ProductSubCategory | undefined,
        price:        parseFloat(form.price) || 0,
        currency:     'RUB',
        sku:          form.sku,
        inStock:      form.inStock,
        isNew:        form.isNew,
        isBulk:       form.isBulk,
        weightKg:     form.weightKg ? parseFloat(form.weightKg) : undefined,
        unit:         form.unit,
        description:  form.description || undefined,
        exhibitorId:  'current-user-id', // TODO: заменить на auth.user.id
        status:       'active',
      };
      setLocalProducts((prev) => [newProduct, ...prev]);
    }

    // ── [Ecosystem Sync] Мгновенная синхронизация с витриной ООО "ТЕСТ" ──────
    // Конвертируем admin-форму → EcoProduct и обновляем Global State.
    // Витрина (/horeca/exhibitors/ooo-test) читает ecoState.oooTestProducts
    // и мгновенно отражает изменения (без перезагрузки страницы).
    //
    // TODO (Supabase): заменить на INSERT/UPDATE + Realtime subscription
    //   supabase.channel('eco-ooo-test').on('postgres_changes', ...).subscribe()
    const ecoProduct = formToEcoProduct(form, newOrUpdatedId);
    if (editProduct) {
      ecoDispatch({ type: 'UPDATE_PRODUCT', product: ecoProduct });
    } else {
      // Добавляем в начало — SYNC_PRODUCTS обновляет весь массив
      const existingIds = new Set(ecoState.oooTestProducts.map(p => p.id));
      if (!existingIds.has(newOrUpdatedId)) {
        ecoDispatch({
          type: 'SYNC_PRODUCTS',
          products: [ecoProduct, ...ecoState.oooTestProducts],
        });
      }
    }

    closeModal();
  }, [editProduct, closeModal, ecoDispatch, ecoState.oooTestProducts]);

  /** Количество архивированных товаров — для бейджа в dropdown */
  const archivedCount = useMemo(
    () => localProducts.filter((p) => p.status === 'archived').length,
    [localProducts],
  );

  // ── Blueprint bg ─────────────────────────────────────────────────────────
  const blueprintBg: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    backgroundImage:
      'repeating-linear-gradient(0deg,rgba(11,43,94,0.03) 0,rgba(11,43,94,0.03) 1px,transparent 1px,transparent 24px),' +
      'repeating-linear-gradient(90deg,rgba(11,43,94,0.03) 0,rgba(11,43,94,0.03) 1px,transparent 1px,transparent 24px)',
  };

  // ── ProductFormState type needs to be importable by modal ─────────────────
  // (defined above — co-located for this page)

  return (
    <>
      <div className="flex flex-col h-full min-h-0 -m-4 sm:-m-6 lg:-m-8">

        {/* ══ PAGE HEADER ══════════════════════════════════════════════════════ */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-white"
          style={{ borderBottom: '1px solid rgba(11,43,94,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#0B2B5E]" aria-hidden="true" />
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                Контент / Товары
              </p>
              <h1 className="text-sm font-black leading-none" style={{ color: '#0B2B5E' }}>
                Мои товары
              </h1>
            </div>
            <span
              className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ backgroundColor: 'rgba(11,43,94,0.08)', color: '#0B2B5E' }}
            >
              {filteredProducts.length} / {localProducts.filter((p) => p.status !== 'archived').length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* ── Demo: переключатель авторизации ──────────────────────────── */}
            <button
              type="button"
              onClick={toggleMockAuth}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold',
                'transition-all duration-150',
                isAuthorized
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
              )}
              title={isAuthorized ? 'Нажмите: выйти из аккаунта' : 'Нажмите: войти в аккаунт'}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isAuthorized ? '#22c55e' : '#94a3b8' }}
                aria-hidden="true"
              />
              {isAuthorized ? 'Авторизован' : 'Цены скрыты'}
            </button>

            {/* Добавить товар — Dropdown: Новый / Восстановить из архива */}
            <AddProductDropdown
              onNewProduct={openAddModal}
              onRestoreFromArchive={openArchiveModal}
              archivedCount={archivedCount}
            />
          </div>
        </div>

        {/* ══ MAIN CONTENT: LEFT PANEL + GRID ══════════════════════════════════ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT FILTER PANEL ─────────────────────────────────────────────── */}
          <aside
            className="hidden lg:flex flex-col w-[220px] flex-shrink-0 bg-white overflow-hidden"
            style={{ borderRight: '1px solid rgba(11,43,94,0.08)' }}
            aria-label="Фильтры товаров"
          >
            {/* Шапка панели */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-3 pt-3 pb-2"
              style={{ borderBottom: '1px solid rgba(11,43,94,0.06)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B2B5E]" aria-hidden="true" />
                <p className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: '#0B2B5E' }}>
                  Фильтры
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[8px] font-semibold text-slate-400 hover:text-[#F26522] transition-colors duration-150"
                  aria-label="Сбросить все фильтры"
                >
                  <X className="w-2.5 h-2.5" />
                  Сбросить
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3" style={{ scrollbarWidth: 'thin' }}>

              {/* ══ ТОЛЬКО СЫРЬЁ / ОПТ — приоритетный чекбокс ══════════════ */}
              <label
                className={cn(
                  'flex items-center gap-2.5 mb-4 px-2.5 py-2 rounded-xl cursor-pointer select-none',
                  'border transition-all duration-150',
                  onlyBulk
                    ? 'bg-slate-800/[0.06] border-slate-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
                aria-label="Показать только оптовые и сырьевые позиции"
              >
                {/* Cube icon */}
                <span
                  className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-150',
                    onlyBulk ? 'bg-slate-700' : 'bg-slate-100',
                  )}
                  aria-hidden="true"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z"
                      stroke={onlyBulk ? '#fff' : '#475569'}
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 1V11M1 3.5L6 6L11 3.5"
                      stroke={onlyBulk ? '#fff' : '#475569'}
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <input
                  type="checkbox"
                  className="sr-only"
                  checked={onlyBulk}
                  onChange={(e) => setOnlyBulk(e.target.checked)}
                  aria-label="Только сырьё / Опт"
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[10px] font-bold leading-none',
                      onlyBulk ? 'text-slate-800' : 'text-slate-600',
                    )}
                  >
                    Только сырьё / Опт
                  </p>
                  <p className="text-[8px] text-slate-400 leading-none mt-0.5">
                    Балк, зелёный кофе, какао &gt;5 кг
                  </p>
                </div>

                {/* Кастомный чекбокс */}
                <span
                  className={cn(
                    'flex-shrink-0 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all duration-150',
                    onlyBulk
                      ? 'bg-slate-700 border-slate-700'
                      : 'border-slate-300',
                  )}
                  aria-hidden="true"
                >
                  {onlyBulk && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </label>

              {/* ── Поиск ──────────────────────────────────────────────────── */}
              <div className="relative mb-4">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  size={10}
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Поиск по товару..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={[
                    'w-full h-7 pl-7',
                    searchQuery ? 'pr-6' : 'pr-2',
                    'bg-slate-50 border border-slate-200 rounded-lg',
                    'text-[10px] text-[#0B2B5E] placeholder:text-slate-400',
                    'focus:outline-none focus:border-[#F26522]/60',
                    'transition-colors duration-150',
                  ].join(' ')}
                  aria-label="Поиск по каталогу"
                />

                {/* ── Кнопка X — появляется только при наличии текста ─────── */}
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    onClick={() => {
                      setSearchQuery('');
                      requestAnimationFrame(() => searchInputRef.current?.focus());
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-[#F26522] hover:bg-[#F26522]/10 transition-colors duration-150"
                  >
                    <X className="w-2.5 h-2.5" aria-hidden="true" />
                  </button>
                )}

                {/* Подсказка алиасов */}
                {searchQuery && filteredProducts.length === 0 && (
                  <p className="mt-1 text-[8px] text-slate-400 px-1 leading-relaxed">
                    Попробуйте: «автоматическая», «жареный», «запчасти»…
                  </p>
                )}
              </div>

              {/* ══ БРЕНДЫ ══════════════════════════════════════════════════ */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Tag size={8} className="text-[#0B2B5E]" aria-hidden="true" />
                  <p className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: '#0B2B5E' }}>
                    Бренды
                  </p>
                  {selectedBrands.length > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[7px] font-bold text-white leading-none"
                      style={{ backgroundColor: '#F26522' }}
                      aria-label={`Выбрано брендов: ${selectedBrands.length}`}
                    >
                      {selectedBrands.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  {UNIQUE_PRODUCT_BRANDS.map((brand) => (
                    <CheckboxRow
                      key={brand}
                      label={brand}
                      checked={selectedBrands.includes(brand)}
                      count={brandCounts[brand]}
                      onChange={() => toggleBrand(brand)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Разделитель ────────────────────────────────────────────── */}
              <div
                className="mx-1 mb-4 border-t"
                style={{ borderColor: 'rgba(11,43,94,0.07)' }}
                aria-hidden="true"
              />

              {/* ══ КАТЕГОРИИ (вложенные) ════════════════════════════════════ */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <p className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: '#0B2B5E' }}>
                    Категории
                  </p>
                  {selectedSubCategories.length > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[7px] font-bold text-white leading-none"
                      style={{ backgroundColor: '#F26522' }}
                      aria-label={`Выбрано подкатегорий: ${selectedSubCategories.length}`}
                    >
                      {selectedSubCategories.length}
                    </span>
                  )}
                </div>

                {/* Вложенный список с аккордеоном по категориям */}
                <div className="flex flex-col gap-0.5">
                  {categoriesWithSubcats.map((cat) => (
                    <NestedCategoryFilter
                      key={cat}
                      category={cat}
                      subCategoryCounts={subCategoryCounts}
                      selectedSubCategories={selectedSubCategories}
                      onToggleSubCategory={toggleSubCategory}
                    />
                  ))}
                </div>
              </div>

            </div>
          </aside>

          {/* ── 8-COLUMN PRODUCT GRID ──────────────────────────────────────────── */}
          <section
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
            style={blueprintBg}
            aria-label="Сетка товаров"
          >
            {filteredProducts.length > 0 ? (
              <div
                className="flex-1 overflow-y-auto p-4"
                style={{ scrollbarWidth: 'thin' }}
              >
                {/*
                 * 8-КОЛОНОЧНАЯ СЕТКА:
                 *   grid-cols-4    — мобильный fallback
                 *   sm:grid-cols-8 — строго 8 колонок на десктопе
                 * ProductCard: col-span-1 → 8 карточек в строке
                 */}
                <div
                  className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 auto-rows-fr"
                  aria-label="Список товаров"
                >
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isAuthorized={isAuthorized}
                      isAdmin
                      onAddToCart={handleAddToCart}
                      onDelete={handleRequestDelete}
                      onArchive={handleArchive}
                      onSelect={handleSelectProduct}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* ── Пустое состояние ────────────────────────── */
              <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(11,43,94,0.05)' }}
                >
                  <Search
                    size={22}
                    style={{ color: '#0B2B5E' }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <p className="font-bold text-sm" style={{ color: '#0B2B5E' }}>
                  Товары не найдены
                </p>
                <p className="text-slate-400 text-xs mt-1 mb-4">
                  Измените фильтры или поисковый запрос
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-150 hover:opacity-90"
                  style={{ backgroundColor: '#F26522' }}
                >
                  Сбросить фильтры
                </button>
              </div>
            )}
          </section>

        </div>
      </div>

      {/* ══ PRODUCT DETAIL DRAWER ════════════════════════════════════════════
       * Рендерится внутри AdminShell (fixed inset-0 z-[60]).
       * z-[100] перекрывает AdminSidebar и все элементы шелла.
       * ════════════════════════════════════════════════════════════════════ */}
      {selectedProductId && (() => {
        const p = localProducts.find((x) => x.id === selectedProductId);
        if (!p) return null;
        const accent = getCategoryAccentColor(p.category);
        const isBulkProduct = computeIsBulk(p);
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-[2px]"
              onClick={() => setSelectedProductId(null)}
              aria-hidden="true"
            />

            {/* Drawer panel — fixed inset-y-0 right-0, z выше сайдбара */}
            <div
              className="fixed inset-y-0 right-0 z-[100] w-80 bg-white flex flex-col"
              style={{ boxShadow: '-8px 0 32px rgba(11,43,94,0.18)' }}
              role="dialog"
              aria-modal="true"
              aria-label={`Детали товара: ${p.name}`}
            >
              {/* ── Drawer Header ─────────────────────────────────────────── */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#0B2B5E]">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-widest text-white/60 leading-none mb-1">
                    Детали товара
                  </p>
                  <p className="text-xs font-black text-white leading-tight line-clamp-1">
                    {p.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductId(null)}
                  className="flex-shrink-0 ml-2 w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
                  aria-label="Закрыть панель"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Drawer Body ───────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>

                {/* Brand logo / initial */}
                <div
                  className="flex items-center justify-center h-24 rounded-xl"
                  style={{ backgroundColor: `${accent}12` }}
                >
                  {p.brandLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.brandLogoUrl}
                      alt={`Логотип ${p.brand}`}
                      className="w-14 h-14 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: accent }}
                    >
                      <span className="text-xl font-black text-white">{p.brand.charAt(0)}</span>
                    </div>
                  )}
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black tracking-wide uppercase"
                    style={{ backgroundColor: `${accent}18`, color: accent }}
                  >
                    {PRODUCT_CATEGORY_LABELS[p.category]}
                  </span>
                  {isBulkProduct && (
                    <span
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase"
                      style={{ backgroundColor: '#0B2B5E', color: '#FFFFFF' }}
                    >
                      ОПТ / СЫРЬЁ
                    </span>
                  )}
                  {p.isNew && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black tracking-wide uppercase"
                      style={{ backgroundColor: '#F26522', color: '#fff' }}
                    >
                      NEW
                    </span>
                  )}
                </div>

                {/* Name / brand / description */}
                <div className="space-y-1">
                  <p className="text-sm font-bold leading-snug" style={{ color: '#0B2B5E' }}>
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500">{p.brand}</p>
                  {p.description && (
                    <p className="text-[10px] text-slate-400 leading-relaxed pt-1">{p.description}</p>
                  )}
                </div>

                {/* Price */}
                <div
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(11,43,94,0.04)', border: '1px solid rgba(11,43,94,0.08)' }}
                >
                  <span className="text-[10px] font-semibold text-slate-500">Цена</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: '#0B2B5E' }}>
                    {formatPrice(p.price)}
                    <span className="ml-1 text-[9px] font-medium text-slate-400">/ {getDefaultUnit(p)}</span>
                  </span>
                </div>

                {/* SKU & Stock */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="p-2.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(11,43,94,0.03)', border: '1px solid rgba(11,43,94,0.07)' }}
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400 mb-1">SKU</p>
                    <p className="text-[10px] font-bold text-slate-600 font-mono">{p.sku}</p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg"
                    style={{
                      backgroundColor: p.inStock ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${p.inStock ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Наличие</p>
                    <p
                      className="text-[10px] font-bold"
                      style={{ color: p.inStock ? '#16a34a' : '#dc2626' }}
                    >
                      {p.inStock ? 'В наличии' : 'Нет'}
                    </p>
                  </div>
                </div>

              </div>

              {/* ── Drawer Footer ─────────────────────────────────────────── */}
              <div
                className="flex-shrink-0 flex gap-2 px-4 py-3"
                style={{ borderTop: '1px solid rgba(11,43,94,0.08)' }}
              >
                {/* Редактировать → открывает форму AddProductModal */}
                <button
                  type="button"
                  onClick={() => {
                    setEditProduct(p);
                    setIsModalOpen(true);
                    setSelectedProductId(null);
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all duration-150 hover:bg-[#0B2B5E] hover:text-white hover:border-[#0B2B5E]"
                  style={{ borderColor: 'rgba(11,43,94,0.25)', color: '#0B2B5E' }}
                >
                  Редактировать
                </button>

                {/* В архив → status = 'archived', drawer закрывается */}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all duration-150 hover:bg-slate-100 active:scale-[0.97]"
                  style={{ borderColor: 'rgba(11,43,94,0.15)', color: '#64748b' }}
                  onClick={() => {
                    handleArchive(p);
                    // drawer закрывается внутри handleArchive
                  }}
                  aria-label="Отправить товар в архив"
                >
                  {/* Archive icon */}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                  Архив
                </button>

                {/* Удалить → confirm modal */}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold border border-red-200 text-red-500 transition-all duration-150 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-[0.97]"
                  onClick={() => {
                    setSelectedProductId(null);
                    handleRequestDelete(p);
                  }}
                  aria-label="Удалить товар"
                >
                  {/* Trash icon */}
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M4 3.5l.7 7.1a.5.5 0 0 0 .5.4h3.6a.5.5 0 0 0 .5-.4L10 3.5" />
                  </svg>
                  Удалить
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ══ RESTORE FROM ARCHIVE MODAL ══════════════════════════════════════════
       * z-[120] — выше всех остальных слоёв (Drawer z-100, Delete z-110).
       * ════════════════════════════════════════════════════════════════════════ */}
      {isArchiveModalOpen && (
        <RestoreFromArchiveModal
          allProducts={localProducts}
          onClose={closeArchiveModal}
          onRestore={(productId) => {
            handleRestore(productId);
            // Оставляем модал открытым — экспонент может восстановить несколько товаров
          }}
        />
      )}

      {/* ══ MODAL ════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <AddProductModal
          editProduct={editProduct}
          onClose={closeModal}
          onSave={handleSaveProduct}
        />
      )}

      {/* ══ DELETE CONFIRM MODAL ═════════════════════════════════════════════════
       * z-[110] — выше Drawer (z-100) и Backdrop (z-99), ниже только toast.
       * ════════════════════════════════════════════════════════════════════════ */}
      {productToDelete && (
        <DeleteConfirmModal
          product={productToDelete}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

// Export type for potential re-use (e.g. Supabase mutation adapter)
export type { ProductFormState };
