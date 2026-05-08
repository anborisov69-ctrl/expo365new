import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExhibitorPageClient, {
  type ExhibitorProfile,
  type ExhibitorNewsItem,
} from './ExhibitorPageClient';
import {
  getNewsByExhibitorSlug,
  INDUSTRY_TAG_LABELS,
  type NewsItem,
} from '@/constants/newsData';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK-ДАННЫЕ ЭКСПОНЕНТОВ
// TODO: заменить на Supabase-запрос:
//   const { data } = await supabase
//     .from('exhibitor_profiles')
//     .select('*, products(*)')
//     .eq('slug', slug)
//     .single();
// + Добавить RLS-политику: публичное чтение верифицированных профилей.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Тестовые пути к изображениям (цикличный паттерн 1-2-3-1-2-3…) ────────────
const IMG = [
  '/assets/products/temp_product_1.jpg',
  '/assets/products/temp_product_2.jpg',
  '/assets/products/temp_product_3.jpg',
] as const;

// Соответствующие CSS-градиенты-плейсхолдеры для каждого слота
const GRAD = [
  'linear-gradient(135deg, #3b1e0a 0%, #7b3a12 50%, #c06020 100%)', // 1 — кофейный
  'linear-gradient(135deg, #1a4a2e 0%, #2d7a4a 50%, #4caf70 100%)', // 2 — зелёный
  'linear-gradient(135deg, #0d1b2a 0%, #1b2a4a 50%, #2d3f6e 100%)', // 3 — синий
] as const;

/**
 * Градиенты для специальных категорий, не совпадающие с цикличным IMG-паттерном.
 * Используются для визуальной дифференциации чая, обучения и посуды.
 */
const GRAD_TEA        = 'linear-gradient(135deg, #1a3a2a 0%, #2e6b4a 50%, #5cad7c 100%)'; // зелёный чай
const GRAD_TRAINING   = 'linear-gradient(135deg, #1a1a4a 0%, #2d2d7a 50%, #5050c0 100%)'; // тёмно-синий
const GRAD_TABLEWARE  = 'linear-gradient(135deg, #3a2a1a 0%, #6e5030 50%, #a07840 100%)'; // тёплый бежевый
const GRAD_SERVICE    = 'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 50%, #4a7a4a 100%)'; // технический зелёный
const GRAD_CONSUMABLE = 'linear-gradient(135deg, #2a1a2a 0%, #4a2d4a 50%, #7a4a7a 100%)'; // пурпурный

/** Сокращённая фабрика тестовой позиции каталога */
function tp(
  idx: number,              // 0-based order → определяет img/grad цикл
  id: string,
  name: string,
  category: 'coffee' | 'tea' | 'equipment' | 'service' | 'tableware' | 'training' | 'consumables',
  basePrice: string,
  isNew: boolean = false,
  shortDescription: string = 'Тестовая позиция каталога. B2B поставки от 1 упаковки.',
  overrideGrad?: string,
) {
  const slot = idx % 3;
  return {
    id,
    name,
    category,
    basePrice,
    imageUrl:      IMG[slot],
    imageGradient: overrideGrad ?? GRAD[slot],
    isNew,
    shortDescription,
  };
}

const MOCK_EXHIBITORS: ExhibitorProfile[] = [
  // ─── ESPRESSO ITALIA — итальянский дистрибьютор кофе и оборудования ─────────
  {
    id:          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    slug:        'espresso-italia',
    name:        'Espresso Italia',
    logoUrl:     '/assets/brands/la-marzocco.svg',
    isVerified:  true,
    category:    'distributor',
    country:     'Италия / Россия',
    foundedYear: '2009',
    bio:
      'Официальный дистрибьютор La Marzocco, Rancilio и Anfim в России и странах СНГ. ' +
      'Компания специализируется на поставках профессионального эспрессо-оборудования, ' +
      'фирменных зерновых смесей и сервисном обслуживании полного цикла для сегментов ' +
      'specialty-кофеен, ресторанных баров и корпоративного питания.',
    regions: ['Москва', 'СПб', 'Краснодар', 'Казань', 'Екатеринбург', 'Новосибирск'],
    stats: {
      products:  38,
      equipment: 26,
      news:      20,
    },
    // ── ТЕСТОВЫЙ КАТАЛОГ — 73 позиции (64 рекатегоризированы + 9 новых)
    // Категории: coffee · tea · equipment · service · tableware · training · consumables
    products: [
      // ── ОБОРУДОВАНИЕ (equipment) ───────────────────────────────────────────────
      //  Pos 01
      tp(0,  'tp-001', 'Кофемашина Profi X-200',             'equipment', '₽ 185 000', true,  'Профессиональная 2-групповая эспрессо-машина с двойным бойлером и PID.'),
      //  Pos 04
      tp(3,  'tp-004', 'Пароконвектомат iCombi Mock 6-1/1',  'equipment', '₽ 1 200 000', true, 'Интеллектуальный пароконвектомат. 6 уровней GN 1/1, iCleaning.'),
      //  Pos 05
      tp(4,  'tp-005', 'Дрип-кофеварка Batch Brew Pro',      'equipment', '₽ 95 000',  false, 'Высокопроизводительная кофеварка для HoReCa. 3 л/цикл.'),
      //  Pos 07
      tp(6,  'tp-007', 'Кофемолка Anfim Mock OD',            'equipment', '₽ 165 000', true,  'On-Demand, жернова ⌀83 мм, 15 кг/день.'),
      //  Pos 09
      tp(8,  'tp-009', 'Дистрибьютор Mock 58mm',             'equipment', '₽ 3 200',   true,  'Стальной дистрибьютор кофе 58 мм. Глубина насечки 0.5 мм.'),
      //  Pos 10
      tp(9,  'tp-010', 'Миксер Vitamix B2B Pro',             'equipment', '₽ 85 000',  false, 'Коммерческий блендер 2.2 кВт, 10 скоростей.'),
      //  Pos 13
      tp(12, 'tp-013', 'Холодильник Liebherr Mock',          'equipment', '₽ 145 000', false, 'Вертикальный шкаф 400 л, −2…+8 °C, энерго-класс A++.'),
      //  Pos 15
      tp(14, 'tp-015', 'Гриндер EK43 Mock',                  'equipment', '₽ 280 000', true,  'Плоские жернова ⌀98 мм, 1 600 вариантов помола.'),
      //  Pos 17
      tp(16, 'tp-017', 'Пресс AeroPress Mock Original',      'equipment', '₽ 3 200',   false, 'Оригинальный AeroPress. Поставка от 12 шт.'),
      //  Pos 18
      tp(17, 'tp-018', 'Шкаф тепловой Unox Mock',            'equipment', '₽ 95 000',  false, 'Тепловой шкаф для расстойки, 16 уровней GN 1/1.'),
      //  Pos 20
      tp(19, 'tp-020', 'Весы Acaia Pearl Mock',              'equipment', '₽ 18 000',  false, 'Bluetooth-весы 0.1 г, диаметр 140 мм, USB-C.'),
      //  Pos 21
      tp(20, 'tp-021', 'Кофемашина Jura Mock E8',            'equipment', '₽ 220 000', false, 'Суперавтомат JURA E8, 15 напитков, CLARIS Smart.'),
      //  Pos 24
      tp(23, 'tp-024', 'Посудомойка Winterhalter Mock UC',   'equipment', '₽ 385 000', true,  'Купольная посудомоечная машина до 660 корзин/ч.'),
      //  Pos 25
      tp(24, 'tp-025', 'Чайник Brewista Smart Pouring',      'equipment', '₽ 8 900',   false, 'Электрочайник 0.6 л, точность ±0.5 °C.'),
      //  Pos 26
      tp(25, 'tp-026', 'Сушилка Maidaid Mock D515',          'equipment', '₽ 68 000',  false, 'Посудосушительный шкаф 350 °C, 15 пар противней.'),
      //  Pos 29
      tp(28, 'tp-029', 'Турка Copper Classic 200ml',         'equipment', '₽ 3 500',   false, 'Медная турка 200 мл с рукоятью из нержавейки.'),
      //  Pos 30
      tp(29, 'tp-030', 'Печь UNOX Mock Speed-X',             'equipment', '₽ 185 000', true,  'Скоростная конвекционная печь 3+1 кВт, Touch-UI.'),
      //  Pos 31
      tp(30, 'tp-031', 'Кулер Zip Hydrotap Mock',            'equipment', '₽ 145 000', false, 'Система мгновенной подачи кипятка/газ. воды под стойку.'),
      //  Pos 33
      tp(32, 'tp-033', 'Пуровер Hario V60 Mock Clear',       'equipment', '₽ 2 800',   true,  'Воронка для пуровера Hario V60 02 прозрачная.'),
      //  Pos 34
      tp(33, 'tp-034', 'Конвейерная печь Middleby Mock',     'equipment', '₽ 850 000', false, 'Ленточная туннельная печь 600×800 мм, 3 зоны.'),
      //  Pos 36
      tp(35, 'tp-036', 'Рожковая Saeco Mock Via Veneto',     'equipment', '₽ 95 000',  false, 'Полуавтомат Saeco, 1 группа, бойлер 1.8 л.'),
      //  Pos 39
      tp(38, 'tp-039', 'Пастеризатор Tetra Pak Mock',        'equipment', '₽ 980 000', true,  'Пастеризатор молока 500 л/ч, HTST-технология.'),
      //  Pos 40
      tp(39, 'tp-040', 'Весы Brewista Smart Scale II',       'equipment', '₽ 6 800',   false, 'Весы с встроенным таймером. 0.1 г, макс 2 кг.'),
      //  Pos 41
      tp(40, 'tp-041', 'Кофемашина Rocket Mock R9 ONE',      'equipment', '₽ 365 000', true,  'E61 1-группа. Двойной бойлер, PID, Flow Control.'),
      //  Pos 44
      tp(43, 'tp-044', 'Барная стойка Modular 2m',           'equipment', '₽ 85 000',  false, 'Сборная стойка 2 м, нерж. поверхность, слив.'),
      //  Pos 47
      tp(46, 'tp-047', 'Холодильная витрина 1.2m',           'equipment', '₽ 285 000', false, 'Горизонтальная витрина 1.2 м, LED, 0…+5 °C.'),
      //  Pos 49
      tp(48, 'tp-049', 'Соковыжималка Zumex Mock Versatile', 'equipment', '₽ 145 000', true,  'Цитрус-пресс Zumex 1 кВт, 35 кг/ч. Автоподача.'),
      //  Pos 51
      tp(50, 'tp-051', 'Puq Press Magnetic Tamper',          'equipment', '₽ 48 000',  true,  'Автоматический темпер. Усилие 10-30 кг, регулируемый.'),
      //  Pos 53
      tp(52, 'tp-053', 'Мармит Hatco Mock FCSB',             'equipment', '₽ 65 000',  false, 'Электрический мармит 2 GN 1/3. Dry-heat.'),
      //  Pos 54
      tp(53, 'tp-054', 'Диспенсер Bunn Mock TF',             'equipment', '₽ 45 000',  false, 'Дозатор кофе на 2 термоса 1.9 л. Поддержание 85 °C.'),
      //  Pos 58
      tp(57, 'tp-058', 'Парогенератор Steam Pro 6L',         'equipment', '₽ 95 000',  false, 'Выносной парогенератор 6 л. Давление 4 бар. Нерж.'),
      //  Pos 61
      tp(60, 'tp-061', 'Тестомес KitchenAid Mock 6.9L',      'equipment', '₽ 148 000', true,  'Планетарный миксер 6.9 л, 575 Вт, 10 скоростей.'),
      //  Pos 63
      tp(62, 'tp-063', 'Дозатор молока Vito Mock Fridge',    'equipment', '₽ 65 000',  false, 'Охлаждаемый дозатор молока 1.8 л, встроенный в стойку.'),

      // ── КОФЕ (coffee) ──────────────────────────────────────────────────────────
      //  Pos 02
      tp(1,  'tp-002', 'Зерно Lavazza Mock 1kg',             'coffee',    '₽ 1 900',   false, 'Арабика 100%, medium roast. Купаж Бразилия + Колумбия.'),
      //  Pos 03
      tp(2,  'tp-003', 'Темпер WBC Pro 58.5mm',              'coffee',    '₽ 8 900',   true,  'Плоское основание 58.5 мм, нержавеющая сталь, рукоять клён.'),
      //  Pos 08
      tp(7,  'tp-008', 'Смесь Colombia Huila 250g',          'coffee',    '₽ 780',     false, 'Сорт Colombia Huila, washed. Ноты: персик, яблоко, мёд.'),
      //  Pos 14
      tp(13, 'tp-014', 'Зерно Ethiopia Natural 500g',        'coffee',    '₽ 1 450',   false, 'Yirgacheffe Natural. Ноты: клубника, тёмный шоколад.'),
      //  Pos 23
      tp(22, 'tp-023', 'Смесь Brazil Santos Dark 1kg',       'coffee',    '₽ 1 650',   false, 'Тёмная обжарка. Ноты: тёмный шоколад, карамель, орех.'),
      //  Pos 27
      tp(26, 'tp-027', 'Капсулы Nespresso Pro 50шт',         'coffee',    '₽ 1 200',   true,  'Капсулы для профессиональных машин Nespresso. HoReCa.'),
      //  Pos 32
      tp(31, 'tp-032', 'Зерно Kenya AA Peaberry 250g',       'coffee',    '₽ 950',     false, 'Сорт Kenya AA Peaberry. Ноты: смородина, грейпфрут.'),
      //  Pos 37
      tp(36, 'tp-037', 'Кофе Robusta Vietnam 1kg',           'coffee',    '₽ 1 100',   false, 'Молотый Робуста Вьетнам. Средняя обжарка.'),
      //  Pos 43
      tp(42, 'tp-043', 'Смесь Decaf Colombia 500g',          'coffee',    '₽ 1 650',   false, 'Без кофеина. Метод Swiss Water. Ноты: карамель, орех.'),
      //  Pos 50
      tp(49, 'tp-050', 'Смесь House Blend Mock 1kg',         'coffee',    '₽ 2 100',   false, 'Фирменный купаж. 60% Арабика + 40% Робуста. Средняя.'),
      //  Pos 55
      tp(54, 'tp-055', 'Зерно Panama Geisha Mock 100g',      'coffee',    '₽ 2 800',   true,  'Specialty Geisha. Аукционный лот. Ноты: жасмин, персик.'),
      //  Pos 59
      tp(58, 'tp-059', 'Купаж Blend №7 Dark Roast 1kg',      'coffee',    '₽ 1 800',   false, 'Тёмная обжарка. Ноты: горький шоколад, табак, специи.'),
      //  Pos 64
      tp(63, 'tp-064', 'Зерно Guatemala SHB Mock 500g',      'coffee',    '₽ 1 250',   true,  'Strictly Hard Bean. Ноты: тёмный шоколад, коричн. сахар.'),

      // ── ПОСУДА (tableware) ─────────────────────────────────────────────────────
      //  Pos 06
      tp(5,  'tp-006', 'Молочник Profi 600ml',               'tableware', '₽ 2 400',   false, 'Питчер из нержавеющей стали 18/10. Носик latte-art.', GRAD_TABLEWARE),
      //  Pos 19
      tp(18, 'tp-019', 'Бокалы Luigi Bormioli Pack 6',       'tableware', '₽ 4 800',   true,  'Набор 6 стаканов Americano 320 мл. Боросиликат.', GRAD_TABLEWARE),
      //  Pos 45
      tp(44, 'tp-045', 'Ланч-бокс Cambro Mock 2/3 GN',       'tableware', '₽ 2 400',   false, 'Гастроёмкость Cambro GN 2/3, 65 мм, поликарбонат.', GRAD_TABLEWARE),
      //  Pos 48
      tp(47, 'tp-048', 'Термос Thermos Mock Business 1L',    'tableware', '₽ 3 200',   false, 'Вакуумный термос 1 л, кнопочный клапан, 12 ч тепла.', GRAD_TABLEWARE),
      //  Pos 52
      tp(51, 'tp-052', 'Тарелка P.L. Proff Cuisine 27cm',    'tableware', '₽ 890',     false, 'Плоская тарелка 27 см. Белый фарфор. Стопка 12 шт.', GRAD_TABLEWARE),
      //  Pos 56
      tp(55, 'tp-056', 'Контейнер GN 1/1 65mm Mock',         'tableware', '₽ 1 200',   false, 'Нерж. гастроёмкость 1/1, 65 мм, крышка в комплекте.', GRAD_TABLEWARE),
      //  Pos 60
      tp(59, 'tp-060', 'Лопатка Mercer Culinary Flex 30cm',  'tableware', '₽ 680',     false, 'Гибкая лопатка, нержавеющая сталь, рукоять Santoprene.', GRAD_TABLEWARE),
      //  Pos 62
      tp(61, 'tp-062', 'Шейкер Boston Mock 2pc',             'tableware', '₽ 1 400',   false, 'Барный бостон-шейкер 700+500 мл. Нерж. + стекло.', GRAD_TABLEWARE),

      // ── РАСХОДНЫЕ МАТЕРИАЛЫ (consumables) ─────────────────────────────────────
      //  Pos 11
      tp(10, 'tp-011', 'Фильтр воды BWT Mock',               'consumables', '₽ 4 500', false, 'Картридж умягчения воды Mg²⁺, 3 000 л ресурс.', GRAD_CONSUMABLE),
      //  Pos 16
      tp(15, 'tp-016', 'Сироп Monin Mock Hazelnut 1L',       'consumables', '₽ 890',   false, 'Натуральный сироп «Лесной орех» без сахара.', GRAD_CONSUMABLE),
      //  Pos 28
      tp(27, 'tp-028', 'Ловилка Milk Catch Mat',             'consumables', '₽ 1 800', false, 'Силиконовый коврик-ловилка 130×130 мм.', GRAD_CONSUMABLE),
      //  Pos 35
      tp(34, 'tp-035', 'Bar Cleaning Kit Pro',               'consumables', '₽ 4 200', false, 'Набор щёток и растворов для барной стойки. 8 пред.', GRAD_CONSUMABLE),
      //  Pos 38
      tp(37, 'tp-038', 'Таблетки очистки Cafesso 45шт',      'consumables', '₽ 1 400', false, 'Таблетки для декальцинации и чистки группы.', GRAD_CONSUMABLE),
      //  Pos 42
      tp(41, 'tp-042', 'Ополоскиватель Meiko Mock LQ',       'consumables', '₽ 3 800', false, 'Жидкость ополаскивания для посудомоечных машин 5 л.', GRAD_CONSUMABLE),

      // ── СЕРВИС И ЗАПЧАСТИ (service) ────────────────────────────────────────────
      //  Pos 12
      tp(11, 'tp-012', 'Бойлер Rancilio Mock 2L',            'service',   '₽ 12 000',  true,  'Нержавеющий бойлер 2 л для Rancilio Classe 7 / 9.', GRAD_SERVICE),
      //  Pos 22
      tp(21, 'tp-022', 'Portafilter Basket 58mm 18g',        'service',   '₽ 2 100',   false, 'Стальная корзина 18 г для 58 мм группы. Precision.', GRAD_SERVICE),
      //  Pos 46
      tp(45, 'tp-046', 'Шланг подачи воды 2m 3/8"',         'service',   '₽ 890',     true,  'Шланг из нержавеющей оплётки, 3/8", длина 2 м.', GRAD_SERVICE),
      //  Pos 57
      tp(56, 'tp-057', 'Термосифон Rancilio Mock Kit',       'service',   '₽ 28 000',  false, 'Термосифонный комплект для поддержания t° группы 92 °C.', GRAD_SERVICE),

      // ── ЧАЙ (tea) — NEW CATEGORY ───────────────────────────────────────────────
      //  Pos 65
      {
        id: 'tp-065', name: 'Чай Dammann Earl Grey 25пак',
        category:      'tea',
        basePrice:     '₽ 890',
        imageUrl:      IMG[1],
        imageGradient: GRAD_TEA,
        isNew:         false,
        shortDescription: 'Классический Earl Grey в пирамидках. Поставка от 12 упаковок.',
      },
      //  Pos 66
      {
        id: 'tp-066', name: 'Чай Ahmad Gold Selection 100пак',
        category:      'tea',
        basePrice:     '₽ 1 400',
        imageUrl:      IMG[2],
        imageGradient: GRAD_TEA,
        isNew:         true,
        shortDescription: 'Премиальный ассортимент 4 видов чёрного чая. HoReCa-упаковка.',
      },
      //  Pos 67
      {
        id: 'tp-067', name: 'Чай Newby Chai Royale 50пак',
        category:      'tea',
        basePrice:     '₽ 2 100',
        imageUrl:      IMG[0],
        imageGradient: GRAD_TEA,
        isNew:         false,
        shortDescription: 'Пряный масала-чай в шёлковых пирамидках. Для ресторанов.',
      },
      //  Pos 68
      {
        id: 'tp-068', name: 'Чай Dammann Yunnan 25пак',
        category:      'tea',
        basePrice:     '₽ 980',
        imageUrl:      IMG[1],
        imageGradient: GRAD_TEA,
        isNew:         false,
        shortDescription: 'Китайский Юньнань, насыщенный вкус, низкая горечь.',
      },
      //  Pos 69
      {
        id: 'tp-069', name: 'Чай Ahmad Camomile 100пак',
        category:      'tea',
        basePrice:     '₽ 1 200',
        imageUrl:      IMG[2],
        imageGradient: GRAD_TEA,
        isNew:         true,
        shortDescription: 'Ромашковый травяной чай. Без кофеина. HoReCa-блок.',
      },

      // ── ОБУЧЕНИЕ (training) — NEW CATEGORY ─────────────────────────────────────
      //  Pos 70
      {
        id: 'tp-070', name: 'Мастер-класс Latte Art Basic',
        category:      'training',
        basePrice:     'от ₽ 4 500 / чел',
        imageUrl:      IMG[0],
        imageGradient: GRAD_TRAINING,
        isNew:         true,
        shortDescription: 'Базовый курс по латте-арту: ружи, розетта, тюльпан. 4 часа.',
      },
      //  Pos 71
      {
        id: 'tp-071', name: 'Курс «Specialty Barista Pro»',
        category:      'training',
        basePrice:     'от ₽ 12 000 / чел',
        imageUrl:      IMG[1],
        imageGradient: GRAD_TRAINING,
        isNew:         false,
        shortDescription: 'Профессиональный курс бариста: 3 дня, SCA-программа, диплом.',
      },
      //  Pos 72
      {
        id: 'tp-072', name: 'Мастер-класс «Сервис Espresso»',
        category:      'training',
        basePrice:     'от ₽ 8 500 / чел',
        imageUrl:      IMG[2],
        imageGradient: GRAD_TRAINING,
        isNew:         false,
        shortDescription: 'Техническое обслуживание кофемашин: диагностика, замена ТЭН, помпы.',
      },
      //  Pos 73
      {
        id: 'tp-073', name: 'Вебинар «HoReCa Procurement 2025»',
        category:      'training',
        basePrice:     'от ₽ 1 500 / чел',
        imageUrl:      IMG[0],
        imageGradient: GRAD_TRAINING,
        isNew:         true,
        shortDescription: 'Онлайн-вебинар по закупкам для HoReCa. 2 часа, запись включена.',
      },
    ],
    // ── НОВОСТИ ЭКСПОНЕНТА — Espresso Italia ──────────────────────────────────
    news: [
      {
        id:          'ei-news-001',
        type:        'news' as const,
        title:       'Поступление La Marzocco Linea Classic S — партия апрель 2025',
        description:
          'На склад официального дистрибьютора поступила новая партия рожковых эспрессо-машин ' +
          'La Marzocco Linea Classic S. Доступны конфигурации 2-group и 3-group в нержавеющей стали и RAL-окраске.',
        content: [
          'Мы рады сообщить о поступлении новой партии La Marzocco Linea Classic S на склад官方 официального дистрибьютора.',
          '',
          'Доступные конфигурации:',
          '• Linea Classic S 2-group — машина для boutique-кофеен, оборот до 150 порций/день',
          '• Linea Classic S 3-group — для высоконагруженных ресторанных баров',
          '',
          'Технические характеристики:',
          '• Двойной бойлер: основной 7 л + паровой 1.5 л',
          '• PID-контроль температуры группы ±0.1 °C',
          '• Электропитание: 380V / 3-фаза',
          '',
          'Условия поставки: от 1 единицы. Срок со склада — 3-5 рабочих дней.',
          'Установка и дооснащение фильтром воды включены.',
          '',
          'Спецпредложение: при заказе от 3 единиц до 31 мая — скидка 8% + гарантия 36 мес.',
        ].join('\n'),
        category:    'Оборудование',
        badge:       'new' as const,
        mediaUrl:    '/assets/brands/la-marzocco.svg',
        publishedAt: '2025-04-28T10:00:00Z',
        span:        2 as const,
      },
      {
        id:          'ei-news-002',
        type:        'news' as const,
        title:       'Ликвидация склада сиропов — скидки до 40%',
        description:
          'Распродажа остатков складских позиций сиропов Monin, Routin и DaVinci. ' +
          'Топ-20 наименований со скидкой до 40 % до конца мая. Минимальный заказ: 6 бутылок.',
        content: [
          'Проводим плановую ликвидацию излишков по позициям сиропов и топпингов для баров и кофеен.',
          '',
          'Что в распродаже:',
          'Более 60 наименований от Monin (Франция), Routin 1883 (Франция), DaVinci Gourmet (США).',
          '',
          'Топ-позиции:',
          '• Monin Карамель 0.7 л — −40%, остаток 48 шт.',
          '• Monin Ваниль 0.7 л — −35%, остаток 36 шт.',
          '• Routin Малина 1.0 л — −30%, остаток 24 шт.',
          '• DaVinci Орео 0.75 л — −38%, остаток 15 шт.',
          '',
          'Условия акции:',
          '• Период: до 31 мая 2025 г. или до исчерпания остатков',
          '• Минимальный заказ: 6 бутылок одного наименования',
          '• Бесплатная доставка при заказе от 20 000 ₽',
          '',
          'Позиции резервируются только при 100% предоплате.',
        ].join('\n'),
        category:    'Расходные материалы',
        badge:       'sale' as const,
        publishedAt: '2025-05-01T12:00:00Z',
        span:        1 as const,
      },
      {
        id:          'ei-news-003',
        type:        'news' as const,
        title:       'Новинка: Anfim Caimano ON-DEMAND 2025',
        description:
          'Anfim Caimano ON-DEMAND — кофемолка для высоконагруженных заведений. ' +
          'Бесступенчатая регулировка помола, плоские жернова ⌀83 мм, до 15 кг/день.',
        content: [
          'Официальный дистрибьютор рад представить новую серию Anfim Caimano ON-DEMAND 2025.',
          '',
          'Характеристики:',
          '• Бесступенчатая регулировка помола (Stepless)',
          '• Плоские жернова ⌀83 мм с покрытием TiN',
          '• Производительность: до 15 кг/день',
          '• Режим ON-DEMAND: помол строго по запросу, без остатков',
          '• Дисплей: OLED, таймер дозирования 0.01 с',
          '',
          'Применение: высоконагруженные ресторанные бары с интенсивным потоком в rush hour.',
          '',
          'Первая партия: май 2025. Предзаказ уже открыт — свяжитесь с менеджером.',
        ].join('\n'),
        category:    'Оборудование',
        badge:       'new' as const,
        publishedAt: '2025-05-05T09:00:00Z',
        span:        1 as const,
      },
    ] satisfies ExhibitorNewsItem[],
    // ── «Экспонент рекомендует» — горизонтальный Stories-бар ──────────────────
    // 6 записей → показывает кнопку «Все партнёры» (порог = 5)
    recommendations: [
      {
        partnerId:  'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
        slug:       'rational-russia',
        logoUrl:    '/assets/brands/rational.svg',
        name:       'RATIONAL Russia',
        reason:     'Умная кухня',
        isReferral: false,
      },
      {
        partnerId:  'rec-cimbali-001',
        slug:       'gruppo-cimbali',
        logoUrl:    '/assets/brands/cimbali.svg',
        name:       'Gruppo Cimbali',
        reason:     'Мировой лидер',
        isReferral: true,
      },
      {
        partnerId:  'rec-mahlkoenig-001',
        slug:       'mahlkoenig-russia',
        logoUrl:    '/assets/brands/mahlkoenig.svg',
        name:       'Mahlkönig Russia',
        reason:     'Точный помол',
        isReferral: false,
      },
      {
        partnerId:  'rec-acaia-001',
        slug:       'acaia-scales',
        logoUrl:    '/assets/brands/acaia.svg',
        name:       'Acaia Scales',
        reason:     'Умные весы',
        isReferral: true,
      },
      {
        partnerId:  'rec-montana-001',
        slug:       'montana-coffee',
        logoUrl:    '/assets/brands/montana-coffee.svg',
        name:       'Montana Coffee',
        reason:     'Specialty-обжарка',
        isReferral: false,
      },
      {
        partnerId:  'rec-marco-001',
        slug:       'marco-beverages',
        logoUrl:    '/assets/brands/marco.svg',
        name:       'Marco Beverages',
        reason:     'Точный налив воды',
        isReferral: false,
      },
    ],
  },

  // ─── RATIONAL RUSSIA — нем. производитель кухонного оборудования ────────────
  {
    id:          'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    slug:        'rational-russia',
    name:        'RATIONAL Russia',
    logoUrl:     '/assets/brands/rational.svg',
    isVerified:  true,
    category:    'manufacturer',
    country:     'Германия',
    foundedYear: '1973',
    bio:
      'Мировой лидер в производстве интеллектуальных пароконвектоматов и систем управления кухней. ' +
      'Продукция RATIONAL установлена в более чем 1 000 000 профессиональных кухнях по всему миру. ' +
      'Официальное представительство в России осуществляет полный цикл: поставку, инсталляцию, ' +
      'обучение персонала и сервисное обслуживание.',
    regions: ['Россия (все федеральные округа)', 'Беларусь', 'Казахстан', 'Армения'],
    stats: {
      products:  2,
      equipment: 6,
      news:      3,
    },
    products: [
      {
        id:               'rat-prod-001',
        name:             'RATIONAL ConnectedCooking Лицензия',
        category:         'consumables',
        basePrice:        '₽ 28 000 / год',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #1a2a4a 0%, #2d4a8a 50%, #4a70c0 100%)',
        isNew:            false,
        shortDescription:
          'Облачная платформа управления парком пароконвектоматов. ' +
          'Мониторинг, обновление программ, статистика HACCP, удалённый диагностический доступ.',
      },
      {
        id:               'rat-prod-002',
        name:             'RATIONAL Cleaning Tablets Pack',
        category:         'consumables',
        basePrice:        '₽ 4 800',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #e0f0ff 0%, #b0d4f0 50%, #80b8e0 100%)',
        isNew:            false,
        shortDescription:
          'Фирменные таблетки для автоматической мойки пароконвектоматов RATIONAL. ' +
          'Уровни мойки 1–5, 150 таблеток на упаковку.',
      },
      {
        id:               'rat-equip-001',
        name:             'iCombi Pro 10-2/3 E',
        category:         'equipment',
        basePrice:        '₽ 1 850 000',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #f0f0f0 0%, #d0d0d0 50%, #b0b0b0 100%)',
        isNew:            false,
        shortDescription:
          'Пароконвектомат iCombi Pro, 10 уровней GN 2/3. Ёмкость: 100 порций/час. ' +
          'iDensityControl, интеллектуальный контроль влажности, режим ночной зарядки.',
      },
      {
        id:               'rat-equip-002',
        name:             'iCombi Pro 6-2/3 E',
        category:         'equipment',
        basePrice:        '₽ 1 420 000',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 50%, #a0a0a0 100%)',
        isNew:            false,
        shortDescription:
          'Пароконвектомат iCombi Pro, 6 уровней GN 2/3. Оптимален для ресторанов 30-80 блюд/сервис. ' +
          'Встроенный iCleaning, 250+ готовых программ.',
      },
      {
        id:               'rat-equip-003',
        name:             'iCombi Classic 10-2/3 E',
        category:         'equipment',
        basePrice:        '₽ 1 250 000',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #d0d0d0 0%, #b0b0b0 50%, #909090 100%)',
        isNew:            false,
        shortDescription:
          'Базовая серия iCombi Classic. 10 уровней GN 2/3, ручное и автоматическое управление, ' +
          'iCooking Suite, 7" сенсорный дисплей.',
      },
      {
        id:               'rat-equip-004',
        name:             'iVario Pro 2-XS',
        category:         'equipment',
        basePrice:        '₽ 2 100 000',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #2a4a2a 0%, #3d7a3d 50%, #5aaa5a 100%)',
        isNew:            true,
        shortDescription:
          'Мультифункциональная варочная система iVario Pro. ' +
          'Скорость нагрева в 4 раза быстрее традиционных плит. ' +
          'Встроенный контроль давления, температуры и помешивания.',
      },
      {
        id:               'rat-equip-005',
        name:             'iCombi Pro 20-1/1 E + подставка',
        category:         'equipment',
        basePrice:        '₽ 2 650 000',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #4a4a4a 100%)',
        isNew:            true,
        shortDescription:
          'Флагманский пароконвектомат 20 уровней GN 1/1 с роллшасси-подставкой. ' +
          'Производительность: 300+ порций в смену. Для ЦРП и фабрик-кухонь.',
      },
      {
        id:               'rat-equip-006',
        name:             'iHexagon — система хранения тепла',
        category:         'equipment',
        basePrice:        '₽ 480 000',
        imageUrl:         null,
        imageGradient:    'linear-gradient(135deg, #4a3a00 0%, #7a6010 50%, #c0a030 100%)',
        isNew:            true,
        shortDescription:
          'Термотара iHexagon для хранения и транспортировки горячих блюд. ' +
          'Поддерживает температуру до 4 часов без подключения к сети. ' +
          'Совместима с Gastronorm GN 1/1 и 2/3.',
      },
      {
        id:               'rat-service-001',
        name:             'Сервисный контракт Gold 1 год',
        category:         'service',
        basePrice:        '₽ 85 000 / год',
        imageUrl:         null,
        imageGradient:    GRAD_SERVICE,
        isNew:            false,
        shortDescription:
          'Полный сервисный контракт: 2 плановых ТО, приоритетный выезд 4 ч, ' +
          'замена расходных деталей включена.',
      },
      {
        id:               'rat-training-001',
        name:             'Обучение «iCombi Operator»',
        category:         'training',
        basePrice:        'от ₽ 6 500 / чел',
        imageUrl:         null,
        imageGradient:    GRAD_TRAINING,
        isNew:            false,
        shortDescription:
          'Однодневный тренинг для поваров: работа с iCooking Suite, ' +
          'загрузка программ, чистка iCleaning.',
      },
    ],
    // ── НОВОСТИ ЭКСПОНЕНТА — RATIONAL Russia ──────────────────────────────────
    news: [
      {
        id:          'rat-news-001',
        type:        'news' as const,
        title:       'iVario Pro 2-XS — старт продаж в России',
        description:
          'RATIONAL выводит в российский рынок флагманскую варочную систему iVario Pro 2-XS. ' +
          'Скорость нагрева в 4 раза выше традиционных плит. Демонстрация на складе — по записи.',
        content: [
          'RATIONAL официально объявляет о начале продаж iVario Pro 2-XS в России.',
          '',
          'Ключевые преимущества над традиционными котлами:',
          '• Нагрев в 4 раза быстрее классических тилт-котлов',
          '• Интеллектуальный датчик температуры на дне (±0.5 °C)',
          '• Встроенный пресс-датчик для sous-vide и варки под давлением',
          '• Автоматическая мойка за 12 минут',
          '',
          'Технические параметры [конфигурация 2-XS]:',
          '• Полезный объём: 2 × 65 л',
          '• Мощность: 2 × 14 кВт (400V, 3Ph)',
          '• Площадь дна: 2 × 740 × 740 мм',
          '',
          'Программа тест-драйва: запишитесь на демонстрацию в шоу-руме Москвы или СПб.',
          'Первые поставки — июнь 2025.',
        ].join('\n'),
        category:    'Оборудование',
        badge:       'new' as const,
        mediaUrl:    '/assets/brands/rational.svg',
        publishedAt: '2025-05-03T08:00:00Z',
        span:        2 as const,
      },
      {
        id:          'rat-news-002',
        type:        'news' as const,
        title:       'Акция: сервисный контракт Gold на 2025 год — скидка 20%',
        description:
          'Скидка 20% на сервисный контракт Gold (2 ТО + приоритетный выезд 4 ч) ' +
          'при оформлении до 30 июня. Действует для действующих клиентов RATIONAL.',
        content: [
          'RATIONAL объявляет сезонную акцию на сервисный контракт Gold 2025.',
          '',
          'Что входит в контракт Gold:',
          '• 2 плановых технических обслуживания в год',
          '• Приоритетный выезд инженера — в течение 4 рабочих часов',
          '• Замена всех расходных деталей включена в стоимость',
          '• Удалённая диагностика через ConnectedCooking',
          '',
          'Условия акции:',
          '• Скидка 20% от стандартной цены ₽ 85 000 → ₽ 68 000',
          '• Только для действующих клиентов с оборудованием iCombi/iVario',
          '• Период действия: до 30 июня 2025',
          '',
          'Подать заявку через форму сайта или напрямую менеджеру.',
        ].join('\n'),
        category:    'Сервис',
        badge:       'sale' as const,
        publishedAt: '2025-04-20T14:00:00Z',
        span:        1 as const,
      },
      {
        id:          'rat-news-003',
        type:        'news' as const,
        title:       'Обновление ConnectedCooking 4.0 — новые функции 2025',
        description:
          'Платформа ConnectedCooking получила крупное обновление: HACCP-отчёты в реальном времени, ' +
          'интеграция с ЕГАИС и новый AI-модуль оптимизации загрузки камер.',
        content: [
          'RATIONAL выпускает ConnectedCooking 4.0 — крупнейшее обновление платформы за 3 года.',
          '',
          'Новые функции в версии 4.0:',
          '• HACCP-отчёты в реальном времени с автоматической отправкой в контролирующие органы',
          '• Интеграция с российской системой ЕГАИС для учёта выхода блюд',
          '• AI-модуль: анализирует загрузку камер и предлагает оптимальную расстановку',
          '• Push-уведомления об окончании цикла на мобильное приложение',
          '• Новый дашборд потребления: электроэнергия, вода, химия — с графиками',
          '',
          'Обновление применяется автоматически для всех устройств с активной лицензией.',
          'Новым клиентам: первые 30 дней бесплатно.',
        ].join('\n'),
        category:    'Сервис',
        badge:       'new' as const,
        publishedAt: '2025-05-06T11:00:00Z',
        span:        1 as const,
      },
    ] satisfies ExhibitorNewsItem[],
    recommendations: [
      {
        partnerId:  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        slug:       'espresso-italia',
        logoUrl:    '/assets/brands/la-marzocco.svg',
        name:       'Espresso Italia',
        reason:     'Кофе-партнёр',
        isReferral: true,
      },
      {
        partnerId:  'rat-rec-ecolab-001',
        slug:       'ecolab-russia',
        logoUrl:    '/assets/brands/ecolab.svg',
        name:       'Ecolab Russia',
        reason:     'Гигиена кухни',
        isReferral: false,
      },
      {
        partnerId:  'rat-rec-meiko-001',
        slug:       'meiko-russia',
        logoUrl:    '/assets/brands/meiko.svg',
        name:       'Meiko Russia',
        reason:     'Посудомоечное',
        isReferral: false,
      },
      {
        partnerId:  'rat-rec-unox-001',
        slug:       'unox-russia',
        logoUrl:    '/assets/brands/unox.svg',
        name:       'Unox Russia',
        reason:     'Шоковая заморозка',
        isReferral: false,
      },
      {
        partnerId:  'rat-rec-electrolux-001',
        slug:       'electrolux-professional',
        logoUrl:    '/assets/brands/electrolux.svg',
        name:       'Electrolux Pro',
        reason:     'Полный цикл',
        isReferral: false,
      },
      {
        partnerId:  'rat-rec-winterhalter-001',
        slug:       'winterhalter-russia',
        logoUrl:    '/assets/brands/winterhalter.svg',
        name:       'Winterhalter',
        reason:     'Мойка и стерилизация',
        isReferral: true,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// СЕРВЕРНЫЕ УТИЛИТЫ ДАННЫХ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Имитация server-side fetch экспонента по slug.
 * При интеграции с Supabase:
 *   1. Вынести в `src/lib/api/exhibitors.ts`
 *   2. Использовать `createServerClient` с service-role ключом
 *   3. Добавить реалтайм-кэш через `next: { revalidate: 60 }`
 */
/**
 * Конвертирует `NewsItem` (глобальная лента) → `ExhibitorNewsItem` (формат витрины).
 *
 * Маппинг полей:
 *   industryTag  → category  (читаемая метка через INDUSTRY_TAG_LABELS)
 *   promoType    → badge     ('sale' → 'sale', остальные → 'new')
 *   image/logo   → mediaUrl
 *   date         → publishedAt
 *   content      → content   (полный текст, если есть; иначе description)
 */
function mapFeedNewsToExhibitorNews(items: NewsItem[]): ExhibitorNewsItem[] {
  return items.map((item): ExhibitorNewsItem => ({
    id:          item.id,
    type:        'news',
    title:       item.title,
    description: item.description,
    content:     item.content ?? item.description,
    category:    INDUSTRY_TAG_LABELS[item.industryTag] ?? item.industryTag,
    badge:       item.promoType === 'sale' ? 'sale' : 'new',
    mediaUrl:    item.image ?? item.exhibitorLogo ?? undefined,
    publishedAt: item.date,
    span:        2,
  }));
}

/**
 * Возвращает профиль экспонента с автоматически синхронизированными новостями.
 *
 * Логика мержа:
 *   1. Фильтруем `NEWS_ITEMS` по `exhibitorSlug === slug` (глобальная лента).
 *   2. Конвертируем в формат `ExhibitorNewsItem`.
 *   3. Объединяем: feed-новости первыми (свежие), затем локальные уникальные.
 *
 * При переходе на Supabase:
 *   Заменить на серверный fetch с JOIN таблиц `exhibitor_profiles` + `news`.
 */
function getExhibitorBySlug(slug: string): ExhibitorProfile | undefined {
  const profile = MOCK_EXHIBITORS.find((e) => e.slug === slug);
  if (!profile) return undefined;

  // 1. Получаем новости из глобальной ленты, привязанные к данному экспоненту
  const feedNews   = getNewsByExhibitorSlug(slug);
  const mappedFeed = mapFeedNewsToExhibitorNews(feedNews);

  // 2. Дедупликация: если в локальных и глобальных одинаковый id — берём глобальный
  const feedIds       = new Set(mappedFeed.map((n) => n.id));
  const localUnique   = (profile.news ?? []).filter((n) => !feedIds.has(n.id));

  // 3. Мерж: feed первыми (приоритет новизны), затем не дублирующиеся локальные
  const mergedNews = [...mappedFeed, ...localUnique];

  return { ...profile, news: mergedNews };
}

/**
 * Возвращает все доступные слаги для статической генерации страниц.
 * При подключении к Supabase: `await supabase.from('exhibitor_profiles').select('slug').eq('is_verified', true)`
 */
export function generateStaticParams() {
  return MOCK_EXHIBITORS.map((e) => ({ slug: e.slug }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// МЕТАДАННЫЕ (SEO)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const profile   = getExhibitorBySlug(slug);

  if (!profile) {
    return { title: 'Экспонент не найден | EXPO 365' };
  }

  return {
    title:       `${profile.name} — витрина экспонента | EXPO 365`,
    description: profile.bio.slice(0, 160),
    openGraph: {
      title:       `${profile.name} | EXPO 365 HoReCa`,
      description: profile.bio.slice(0, 160),
      type:        'profile',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// СЕРВЕРНЫЙ КОМПОНЕНТ СТРАНИЦЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Динамический роут `/horeca/exhibitors/[slug]`.
 *
 * Server Component — получает данные, передаёт в Client Component.
 * При отсутствии экспонента — 404 через `notFound()`.
 */
export default async function ExhibitorPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile   = getExhibitorBySlug(slug);

  if (!profile) {
    notFound();
  }

  return <ExhibitorPageClient profile={profile} />;
}
