import { COMMISSION_PER_TON_OMR, LITERS_PER_TON, VAT_RATE } from "./mock-data";

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
