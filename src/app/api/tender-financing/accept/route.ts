import { NextRequest, NextResponse } from 'next/server';
import type {
  TenderFinancingOffer,
  TripartiteContractDraft,
} from '@/types/finance';
import { calcMonthlyPayment } from '@/types/finance';

/**
 * POST /api/tender-financing/accept
 * ─────────────────────────────────────────────────────────────────────────────
 * Байер принимает оффер банка на финансирование тендера.
 *
 * Бизнес-логика:
 *   1. Валидация параметров запроса
 *   2. Расчёт ежемесячного аннуитетного платежа
 *   3. Генерация черновика трёхстороннего договора
 *      (Поставщик — Покупатель — Банк)
 *   4. Возврат ID черновика для редиректа на страницу предпросмотра
 *
 * TODO (production):
 *   - Аутентификация через Supabase JWT: const { data: { user } } = await supabase.auth.getUser()
 *   - Проверка RLS: тендер принадлежит данному buyer_id
 *   - INSERT в tripartite_contracts с status='draft'
 *   - UPDATE tender_financing_offers SET status='accepted' WHERE id = offerId
 *   - Real-time уведомление поставщику и банку через Supabase Realtime
 *
 * Security:
 *   - В production: RLS на tabl tripartite_contracts гарантирует,
 *     что только участники сделки видят контракт.
 *   - offerId валидируется против tenderId — исключает cross-tender принятие.
 */

// ── Типы входного запроса ─────────────────────────────────────────────────────

interface AcceptFinancingBody {
  /** ID тендера */
  tenderId:         string;
  /** ID принятого оффера банка */
  offerId:          string;
  /** ID победившего поставщика */
  supplierId:       string;
  /** Название компании поставщика */
  supplierName:     string;
  /** ID байера (в production — из auth.user.id) */
  buyerId:          string;
  /** Название компании байера */
  buyerCompany:     string;
  /** Название тендера */
  tenderTitle:      string;
  /** Окончательная сумма сделки */
  dealAmount:       number;
  /** Данные оффера (для генерации контракта без повторного запроса к БД) */
  offer:            TenderFinancingOffer;
}

// ── Генератор UUID совместимый с Edge Runtime ─────────────────────────────────

function generateDraftId(): string {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `tripartite_${ts}_${rnd}`;
}

// ── Валидация ─────────────────────────────────────────────────────────────────

function validateBody(body: Partial<AcceptFinancingBody>): string | null {
  if (!body.tenderId)    return 'tenderId обязателен';
  if (!body.offerId)     return 'offerId обязателен';
  if (!body.supplierId)  return 'supplierId обязателен';
  if (!body.supplierName) return 'supplierName обязателен';
  if (!body.buyerId)     return 'buyerId обязателен';
  if (!body.buyerCompany) return 'buyerCompany обязателен';
  if (!body.tenderTitle) return 'tenderTitle обязателен';
  if (!body.dealAmount || body.dealAmount <= 0) return 'dealAmount должен быть положительным числом';
  if (!body.offer)       return 'offer обязателен';
  if (body.offer.tenderId !== body.tenderId) return 'offerId не соответствует tenderId';
  return null;
}

// ── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: Partial<AcceptFinancingBody> = await req.json();

    // ── Валидация ──────────────────────────────────────────────────────────
    const validationError = validateBody(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const {
      tenderId,
      offerId,
      supplierId,
      supplierName,
      buyerId,
      buyerCompany,
      tenderTitle,
      dealAmount,
      offer,
    } = body as AcceptFinancingBody;

    // ── Расчёт аннуитетного платежа ───────────────────────────────────────
    // Учитываем первоначальный взнос при наличии
    const downPaymentAmount = offer.downPaymentPercent
      ? Math.round(dealAmount * (offer.downPaymentPercent / 100))
      : 0;
    const principal = dealAmount - downPaymentAmount;

    const monthlyPayment = calcMonthlyPayment(
      principal,
      offer.ratePercent,
      offer.termMonths,
    );

    // ── Генерация черновика трёхстороннего договора ───────────────────────
    const draftId   = generateDraftId();
    const now       = new Date().toISOString();

    const contractDraft: TripartiteContractDraft = {
      id:           draftId,
      tenderId,
      tenderTitle,
      // Стороны
      supplierId,
      supplierName,
      buyerId,
      buyerCompany,
      bankId:       offer.bankId,
      bankName:     offer.bankName,
      // Финансовые параметры
      dealAmount,
      financingOffer:  offer,
      monthlyPayment,
      // Служебные поля
      status:     'draft',
      createdAt:  now,
    };

    // TODO (production):
    // const { error: insertError } = await supabase
    //   .from('tripartite_contracts')
    //   .insert({
    //     id:               draftId,
    //     tender_id:        tenderId,
    //     supplier_id:      supplierId,
    //     buyer_id:         buyerId,
    //     bank_id:          offer.bankId,
    //     deal_amount:      dealAmount,
    //     financing_offer_id: offerId,
    //     monthly_payment:  monthlyPayment,
    //     status:           'draft',
    //   });
    // if (insertError) throw insertError;
    //
    // await supabase
    //   .from('tender_financing_offers')
    //   .update({ status: 'accepted' })
    //   .eq('id', offerId);

    return NextResponse.json(
      {
        success:        true,
        draftId,
        contractDraft,
        monthlyPayment,
        downPaymentAmount,
        previewUrl: `/horeca/contracts/tripartite/${draftId}`,
      },
      { status: 201 },
    );

  } catch (err: unknown) {
    console.error('[POST /api/tender-financing/accept]', err);
    return NextResponse.json(
      {
        success: false,
        error:   'Внутренняя ошибка сервера при генерации контракта',
      },
      { status: 500 },
    );
  }
}
