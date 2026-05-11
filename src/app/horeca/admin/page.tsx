/**
 * /horeca/admin — Exhibitor Admin Dashboard
 * ──────────────────────────────────────────
 * Server Component. Renders the default landing page for the admin panel.
 * All data-fetching will happen here (Supabase server client)
 * once the real data layer is wired up.
 */

import type { Metadata } from 'next';
import {
  TrendingUp,
  Eye,
  ShoppingCart,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Панель управления',
};

// ── Mock KPI interface (replace with Supabase fetch) ──────────────────────────

interface KpiCard {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  description: string;
}

const KPI_CARDS: KpiCard[] = [
  {
    label: 'Просмотры профиля',
    value: '12 481',
    delta: '+18.4%',
    trend: 'up',
    icon: Eye,
    description: 'за последние 30 дней',
  },
  {
    label: 'Активные сделки',
    value: '34',
    delta: '+5',
    trend: 'up',
    icon: ShoppingCart,
    description: 'активных переговоров',
  },
  {
    label: 'Лидов получено',
    value: '218',
    delta: '-3.2%',
    trend: 'down',
    icon: Users,
    description: 'за последние 30 дней',
  },
  {
    label: 'Время ответа',
    value: '1.8 ч',
    delta: '-12 мин',
    trend: 'up',
    icon: Clock,
    description: 'на запросы покупателей',
  },
];

// ── Recent Activity mock ──────────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  {
    id: '1',
    type: 'lead',
    title: 'Новый лид: GrandHotel Москва',
    meta: 'Запрос: эспрессо-машины × 12',
    time: '3 мин назад',
    status: 'Новый',
    statusColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: '2',
    type: 'deal',
    title: 'Контракт №4521 ожидает подписи',
    meta: 'Покупатель: RestoCorp · Сумма: ₽840 000',
    time: '22 мин назад',
    status: 'Требует действия',
    statusColor: 'bg-[#F26522]/10 text-[#F26522]',
  },
  {
    id: '3',
    type: 'tender',
    title: 'Тендер: Поставка кофе-оборудования',
    meta: 'Срок: 15 мая 2026 · Бюджет: ₽2.1M',
    time: '1 ч назад',
    status: 'Совпадение',
    statusColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: '4',
    type: 'message',
    title: 'Сообщение: Алексей (Cafe Noir)',
    meta: '«Есть ли оптовые скидки на La Marzocco?»',
    time: '3 ч назад',
    status: 'Непрочитано',
    statusColor: 'bg-purple-100 text-purple-700',
  },
];

// ── AI Signal Alert ───────────────────────────────────────────────────────────
// Predictive analytics signal — rendered as a highlight card.

function AiSignalBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2B5E] to-[#1a4a9e] p-6 text-white">
      {/* Decorative bg glow */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -right-4 -bottom-10 w-56 h-56 rounded-full bg-white/[0.03]" />

      <div className="relative flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F26522] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F26522]">AI-сигнал</span>
              <span className="text-xs text-white/40">· Прогнозная аналитика</span>
          </div>
          <h3 className="text-base font-semibold text-white mb-0.5">
            3 ключевых покупателя снижают активность
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            GrandHotel Москва, RestoCorp и Cafe Noir посетили ваш профиль, но не проявляли
            активности 7+ дней. Отправьте им предложение с ограниченной скидкой.
          </p>
          <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#F26522] hover:text-orange-300 transition-colors">
            Просмотреть
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCardItem({ card }: { card: KpiCard }) {
  const Icon = card.icon;
  return (
    <div className="bg-white rounded-2xl border p-5 flex flex-col gap-3 [border-color:rgba(11,43,94,0.2)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {card.label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-[#0B2B5E]/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#0B2B5E]" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-black text-slate-800 leading-none tracking-tight">
          {card.value}
        </span>
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          card.trend === 'up' ? 'text-emerald-600' : card.trend === 'down' ? 'text-red-500' : 'text-slate-400'
        }`}>
          {card.trend === 'up'
            ? <ArrowUpRight className="w-4 h-4" />
            : card.trend === 'down'
            ? <ArrowDownRight className="w-4 h-4" />
            : null}
          {card.delta}
        </div>
      </div>

      <p className="text-xs text-slate-400">{card.description}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Панель управления
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Обзор показателей экспонента · Май 2026
          </p>
        </div>
        <button className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#F26522] hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <TrendingUp className="w-4 h-4" />
          Экспорт отчёта
        </button>
      </div>

      {/* ── AI Signal Banner ────────────────────────────────────────────────── */}
      <AiSignalBanner />

      {/* ── KPI Grid ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Ключевые показатели — последние 30 дней
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPI_CARDS.map((card) => (
            <KpiCardItem key={card.label} card={card} />
          ))}
        </div>
      </section>

      {/* ── Recent Activity ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Последние действия
          </h2>
          <button className="text-xs font-semibold text-[#0B2B5E] hover:underline">
            Все события
          </button>
        </div>

        <div className="bg-white rounded-2xl border divide-y divide-slate-100 overflow-hidden [border-color:rgba(11,43,94,0.2)]">
          {RECENT_ACTIVITY.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-[#0B2B5E] transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.meta}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.statusColor}`}>
                  {item.status}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">{item.time}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#F26522] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
