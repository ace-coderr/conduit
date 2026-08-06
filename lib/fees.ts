export const FEE_CONFIG = {
  percentage: 0.5, // 0.5%
  collectorAddress: "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c",
  minFee: 0.001,
};

function feeFor(base: number): number {
  if (!isFinite(base) || base <= 0) return FEE_CONFIG.minFee;
  return Math.max((base * FEE_CONFIG.percentage) / 100, FEE_CONFIG.minFee);
}

/**
 * Fee DEDUCTED from the amount — the payer sends `amount`, and the recipients
 * share `amount` minus the fee.
 *
 * Used by split links only. Do not mix with calculateFeeOnTop below: the two
 * models hand the recipient different numbers for the same input.
 */
export function calculateFee(amount: string): {
  fee: string;
  recipientAmount: string;
  feePercent: string;
} {
  const total = parseFloat(amount);
  const feeAmount = feeFor(total);
  const recipientAmount = total - feeAmount;

  return {
    fee: feeAmount.toFixed(4),
    recipientAmount: recipientAmount.toFixed(4),
    feePercent: `${FEE_CONFIG.percentage}%`,
  };
}

/**
 * Fee added ON TOP — the recipient receives the full `amount` and the payer
 * signs `total` (amount + fee).
 *
 * Used by payment links and escrow, where both the payer and the recipient are
 * quoted the headline amount. This is the single source of truth for those
 * flows: the pay UIs, the on-chain verification in the PATCH routes, and the
 * server-side fee legs all read it, so a payer can never be shown one total and
 * be asked to sign another.
 */
export function calculateFeeOnTop(amount: string): {
  fee: string;
  recipientAmount: string;
  total: string;
  feePercent: string;
} {
  const base = parseFloat(amount);
  const feeAmount = feeFor(base);
  const safeBase = isFinite(base) && base > 0 ? base : 0;

  return {
    fee: feeAmount.toFixed(4),
    recipientAmount: safeBase.toString(),
    total: (safeBase + feeAmount).toFixed(4),
    feePercent: `${FEE_CONFIG.percentage}%`,
  };
}
