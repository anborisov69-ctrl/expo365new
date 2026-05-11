'use client';

/**
 * smartContractStore.tsx — Хранилище черновиков смарт-контрактов
 * ─────────────────────────────────────────────────────────────────
 * React Context + useReducer для управления процессом формирования договоров
 * между экспонентами и байерами с персональными условиями.
 *
 * Функциональные области:
 *   1. DRAFT CONTRACTS — черновики с условиями (скидки, рассрочки, сроки) 
 *   2. CONTRACT PREVIEW — данные для страницы предпросмотра
 *   3. PAYMENT TERMS   — параметры оплаты (отсрочка/рассрочка)
 *   4. LOADING STATES  — индикаторы процесса формирования
 *
 * Точки монтирования:
 *   - SmartContractProvider оборачивает /horeca layout
 *   - useSmartContract() доступен в любом Client Component
 *
 * Supabase интеграция (target):
 *   smart_contracts (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     exhibitor_id  uuid REFERENCES exhibitors(id),
 *     buyer_id      uuid REFERENCES companies(id),
 *     status        text CHECK (status IN ('draft','preview','sent','signed','cancelled')),
 *     terms         jsonb NOT NULL, -- финансовые условия & параметры
 *     created_at    timestamptz DEFAULT now(),
 *     updated_at    timestamptz DEFAULT now()
 *   );
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// ТИПЫ — DOMAIN OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Тип оплаты в договоре */
export type PaymentType = 'deferred' | 'installment';

/** Статус договора */
export type ContractStatus = 'draft' | 'preview' | 'sent' | 'signed' | 'cancelled';

/** Финансовые условия договора */
export interface ContractTerms {
  /** Базовая цена без скидки */
  basePrice: number;
  /** Процент скидки */
  discountPercent: number;
  /** Сумма скидки в рублях */
  discountAmount: number;
  /** Итоговая цена после скидки */
  finalPrice: number;
  /** Тип оплаты: отсрочка или рассрочка */
  paymentType: PaymentType;
  /** Первый взнос (для рассрочки) */
  initialPayment?: number;
  /** Процент первого взноса */
  initialPercent?: number;
  /** Количество платежей рассрочки */
  paymentsCount?: number;
  /** Интервал между платежами (дни) */
  paymentInterval?: number;
  /** Платёж за период рассрочки */
  paymentPerInstallment?: number;
  /** Срок отсрочки (дни, для deferred) */
  deferredDays?: number;
}

/** Черновик смарт-контракта */
export interface SmartContractDraft {
  /** UUID черновика */
  id: string;
  /** Slug экспонента */
  exhibitorSlug: string;
  /** ID покупателя */
  buyerId?: string;
  /** Название предложения */
  offerTitle: string;
  /** Финансовые условия */
  terms: ContractTerms;
  /** Статус договора */
  status: ContractStatus;
  /** Дата создания */
  createdAt: string;
  /** Дата последнего обновления */
  updatedAt: string;
  /** Срок действия предложения */
  validUntil?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SmartContractState {
  /** Все черновики договоров */
  drafts: SmartContractDraft[];
  /** Текущий активный черновик */
  currentDraft: SmartContractDraft | null;
  /** Состояние загрузки при формировании договора */
  isFormingContract: boolean;
  /** Текст процесса формирования */
  formingText: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type SmartContractAction =
  | { type: 'START_FORMING_CONTRACT'; text?: string }
  | { type: 'FINISH_FORMING_CONTRACT' }
  | { type: 'CREATE_DRAFT'; draft: SmartContractDraft }
  | { type: 'UPDATE_DRAFT'; id: string; changes: Partial<SmartContractDraft> }
  | { type: 'SET_CURRENT_DRAFT'; draft: SmartContractDraft | null }
  | { type: 'REMOVE_DRAFT'; id: string }
  | { type: 'CLEAR_ALL_DRAFTS' };

// ═══════════════════════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════════════════════

const initialState: SmartContractState = {
  drafts: [],
  currentDraft: null,
  isFormingContract: false,
  formingText: 'Формируем контракт с вашими условиями...',
};

function smartContractReducer(
  state: SmartContractState,
  action: SmartContractAction
): SmartContractState {
  switch (action.type) {
    case 'START_FORMING_CONTRACT':
      return {
        ...state,
        isFormingContract: true,
        formingText: action.text || 'Формируем контракт с вашими условиями...',
      };

    case 'FINISH_FORMING_CONTRACT':
      return {
        ...state,
        isFormingContract: false,
      };

    case 'CREATE_DRAFT':
      return {
        ...state,
        drafts: [...state.drafts, action.draft],
        currentDraft: action.draft,
      };

    case 'UPDATE_DRAFT':
      return {
        ...state,
        drafts: state.drafts.map(draft =>
          draft.id === action.id
            ? { ...draft, ...action.changes, updatedAt: new Date().toISOString() }
            : draft
        ),
        currentDraft: 
          state.currentDraft?.id === action.id
            ? { ...state.currentDraft, ...action.changes, updatedAt: new Date().toISOString() }
            : state.currentDraft,
      };

    case 'SET_CURRENT_DRAFT':
      return {
        ...state,
        currentDraft: action.draft,
      };

    case 'REMOVE_DRAFT':
      return {
        ...state,
        drafts: state.drafts.filter(draft => draft.id !== action.id),
        currentDraft: 
          state.currentDraft?.id === action.id ? null : state.currentDraft,
      };

    case 'CLEAR_ALL_DRAFTS':
      return {
        ...state,
        drafts: [],
        currentDraft: null,
      };

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface SmartContractContextType {
  state: SmartContractState;
  dispatch: React.Dispatch<SmartContractAction>;
  
  // Высокоуровневые методы
  createContractDraft: (params: CreateDraftParams) => SmartContractDraft;
  startFormingContract: (text?: string) => void;
  finishFormingContract: () => void;
  getContractPreviewUrl: (draftId: string) => string;
}

const SmartContractContext = createContext<SmartContractContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface SmartContractProviderProps {
  children: ReactNode;
}

interface CreateDraftParams {
  exhibitorSlug: string;
  buyerId?: string;
  offerTitle: string;
  terms: ContractTerms;
  validUntil?: string;
}

export function SmartContractProvider({ children }: SmartContractProviderProps) {
  const [state, dispatch] = useReducer(smartContractReducer, initialState);

  // Создать новый черновик договора
  const createContractDraft = useCallback((params: CreateDraftParams): SmartContractDraft => {
    const now = new Date().toISOString();
    const draft: SmartContractDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      exhibitorSlug: params.exhibitorSlug,
      buyerId: params.buyerId,
      offerTitle: params.offerTitle,
      terms: params.terms,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      validUntil: params.validUntil,
    };

    dispatch({ type: 'CREATE_DRAFT', draft });
    return draft;
  }, []);

  // Начать процесс формирования договора
  const startFormingContract = useCallback((text?: string) => {
    dispatch({ type: 'START_FORMING_CONTRACT', text });
  }, []);

  // Завершить процесс формирования договора
  const finishFormingContract = useCallback(() => {
    dispatch({ type: 'FINISH_FORMING_CONTRACT' });
  }, []);

  // Получить URL страницы предпросмотра договора
  const getContractPreviewUrl = useCallback((draftId: string): string => {
    return `/horeca/contracts/preview/${draftId}`;
  }, []);

  const contextValue: SmartContractContextType = {
    state,
    dispatch,
    createContractDraft,
    startFormingContract,
    finishFormingContract,
    getContractPreviewUrl,
  };

  return (
    <SmartContractContext.Provider value={contextValue}>
      {children}
    </SmartContractContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useSmartContract() {
  const context = useContext(SmartContractContext);
  if (context === undefined) {
    throw new Error('useSmartContract must be used within a SmartContractProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

/** Создать условия договора из финансовых расчётов PartnerOffer */
export function createContractTermsFromPartnerOffer(
  basePrice: number,
  discountPercent: number,
  paymentType: PaymentType = 'installment',
  additionalParams?: {
    initialPercent?: number;
    paymentsCount?: number;
    paymentInterval?: number;
    deferredDays?: number;
  }
): ContractTerms {
  const discountAmount = Math.round(basePrice * discountPercent / 100);
  const finalPrice = basePrice - discountAmount;

  const terms: ContractTerms = {
    basePrice,
    discountPercent,
    discountAmount,
    finalPrice,
    paymentType,
  };

  if (paymentType === 'installment' && additionalParams?.initialPercent) {
    const initialPayment = Math.round(finalPrice * additionalParams.initialPercent / 100);
    const remainingAfterDown = finalPrice - initialPayment;
    const paymentsCount = additionalParams.paymentsCount || 3;
    const paymentPerInstallment = Math.round(remainingAfterDown / paymentsCount);

    terms.initialPayment = initialPayment;
    terms.initialPercent = additionalParams.initialPercent;
    terms.paymentsCount = paymentsCount;
    terms.paymentInterval = additionalParams.paymentInterval || 30;
    terms.paymentPerInstallment = paymentPerInstallment;
  }

  if (paymentType === 'deferred' && additionalParams?.deferredDays) {
    terms.deferredDays = additionalParams.deferredDays;
  }

  return terms;
}