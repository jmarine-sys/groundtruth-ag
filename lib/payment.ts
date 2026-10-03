// Moneda de pago de la demo: USDC de devnet (Circle, programa SPL Token, 6 decimales).
// Verificado en developers.circle.com/stablecoins/usdc-contract-addresses y en la cadena.
// Es plata de prueba: se pide gratis en https://faucet.circle.com (red Solana Devnet).

export const PAYMENT = {
  symbol: "USDC",
  mint: process.env.NEXT_PUBLIC_PAYMENT_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  decimals: 6,
} as const;

/** Monto en USDC (por ejemplo 0.24) a unidades mínimas del token. */
export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** PAYMENT.decimals));
}

/** Fondo de recompensas por ronda, en USDC. Lo pone el cliente (simulado en la demo). */
export const ROUND_POOL_USDC = Number(process.env.ROUND_POOL_USDC ?? 1);

/** Pago de la cobertura de riesgo base de demo, en USDC. */
export const COVER_PAYOUT_USDC = Number(process.env.COVER_PAYOUT_USDC ?? 2);
