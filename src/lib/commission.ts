import { COMMISSION_PER_TON_OMR, LITERS_PER_TON, SALE_COMMISSION_PER_TON_OMR, VAT_RATE } from "./mock-data";

export function round(n: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

export interface CommissionBreakdown {
  tons: number;
  commissionOMR: number;
  vatOMR: number;
  totalDueOMR: number;
}

export function calculateCommission(totalLiters: number): CommissionBreakdown {
  const tons = totalLiters / LITERS_PER_TON;
  const commissionOMR = tons * COMMISSION_PER_TON_OMR;
  const vatOMR = commissionOMR * VAT_RATE;
  return {
    tons: round(tons, 3),
    commissionOMR: round(commissionOMR, 3),
    vatOMR: round(vatOMR, 3),
    totalDueOMR: round(commissionOMR + vatOMR, 3),
  };
}

export interface SaleCommissionBreakdown extends CommissionBreakdown {
  // حصّة كل طرف (مجمّع) من عمولة إنفير: ريال/طن + ضريبته
  perSideCommissionOMR: number;
  perSideVatOMR: number;
  perSideTotalOMR: number;
}

// عمولة إنفير على معاملة بيع/شراء: ريال لكل طن من كل طرف.
// بين مجمّعين = طرفان (٢ ر.ع/طن إجمالًا)؛ للمصنع = طرف واحد (المجمّع البائع، ١ ر.ع/طن).
export function calculateSaleCommission(
  totalLiters: number,
  buyerType: "collector" | "factory"
): SaleCommissionBreakdown {
  const tons = totalLiters / LITERS_PER_TON;
  const perSideCommissionOMR = round(tons * SALE_COMMISSION_PER_TON_OMR, 3);
  const perSideVatOMR = round(perSideCommissionOMR * VAT_RATE, 3);
  const perSideTotalOMR = round(perSideCommissionOMR + perSideVatOMR, 3);
  const sides = buyerType === "collector" ? 2 : 1;
  const commissionOMR = round(perSideCommissionOMR * sides, 3);
  const vatOMR = round(perSideVatOMR * sides, 3);
  return {
    tons: round(tons, 3),
    perSideCommissionOMR,
    perSideVatOMR,
    perSideTotalOMR,
    commissionOMR,
    vatOMR,
    totalDueOMR: round(commissionOMR + vatOMR, 3),
  };
}
