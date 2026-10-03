// Moneda de pago de la demo: SOL de devnet (OD-21). Es plata de prueba.
// En producción los informantes y el asegurado cobrarían en USDC (valor estable);
// para la demo se usa SOL porque la wallet del servidor ya tiene fondos y no hay que
// crear cuentas de token para cada destinatario.

export const PAYMENT = {
  symbol: "SOL",
  decimals: 9,
} as const;

/** Monto en SOL (por ejemplo 0.0051) a lamports. */
export function toLamports(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** PAYMENT.decimals));
}

/** Fondo de recompensas por ronda, en SOL. Lo pone el cliente (simulado en la demo). */
export const ROUND_POOL_SOL = Number(process.env.ROUND_POOL_SOL ?? 0.02);

/** Pago de la cobertura de riesgo base de demo, en SOL. */
export const COVER_PAYOUT_SOL = Number(process.env.COVER_PAYOUT_SOL ?? 0.05);

/**
 * Una cuenta nueva necesita al menos ~0,00089 SOL para existir en Solana (renta).
 * Las recompensas por debajo de este mínimo no se envían.
 */
export const MIN_TRANSFER_SOL = 0.001;
