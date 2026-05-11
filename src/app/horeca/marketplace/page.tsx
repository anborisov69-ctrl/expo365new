import type { Metadata } from 'next';
import MarketplaceClient from './MarketplaceClient';

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title:       'Витрина ЭКСПО 365 | EXPO 365 HoReCa',
  description:
    'B2B-каталог товаров для ресторанного бизнеса: кофемашины, зелёное зерно, ' +
    'балковый чай, мешковой какао, оборудование и расходные материалы для HoReCa.',
  keywords: [
    'HoReCa витрина ЭКСПО 365', 'B2B каталог', 'зелёное зерно', 'балковый чай',
    'bulk coffee', 'сырьё для кофейни', 'кофемашины оптом',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER COMPONENT — ОБЁРТКА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * `MarketplacePage` — Server Component страницы Marketplace.
 *
 * Рендерит `MarketplaceClient` — Client Component, содержащий:
 *   • LEFT SIDEBAR:  ТИП ПОСТАВКИ (bulk/retail) → КАТЕГОРИИ → БРЕНДЫ
 *   • CENTER AREA:   Поисковая строка + 8-колоночной сетки Витрины ЭКСПО 365
 *
 * Маршрут: /horeca/marketplace
 *
 * При переходе на Supabase этот Server Component будет загружать данные:
 *   const products = await supabase.from('products')
 *     .select('*').eq('in_stock', true);   ← RLS: public read
 * И передавать их в MarketplaceClient через props.
 */
export default function MarketplacePage() {
  return <MarketplaceClient />;
}
