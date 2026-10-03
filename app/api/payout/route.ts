import { address, isAddress } from "@solana/kit";
import { indexMemo } from "@/lib/hash";
import { ROUND_POOL_USDC } from "@/lib/payment";
import { payWithMemo, writeMemo } from "@/lib/solana-server";
import type { RoundResult } from "@/lib/types";

// Paga la recompensa de cada informante en USDC de devnet y publica el índice
// en un memo. Solo devnet. Ojo: confía en el RoundResult que manda el cliente; el tope
// es el fondo de la ronda. Con el programa propio (OD-02) esta regla pasa a la cadena.
export async function POST(request: Request) {
  const { result } = (await request.json()) as { result: RoundResult };
  const payable = (result?.scores ?? []).filter((s) => s.reward > 0);

  const total = payable.reduce((sum, s) => sum + s.reward, 0);
  const isCents = (x: number) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-9;
  if (total > ROUND_POOL_USDC + 1e-9 || payable.some((s) => !isCents(s.reward) || !isAddress(s.wallet))) {
    return Response.json({ error: "Recompensas inválidas o por encima del fondo de la ronda" }, { status: 400 });
  }

  try {
    const memo = await indexMemo(result);
    const index_sig = await writeMemo(memo);
    const payments = [];
    // En serie: cada pago es una transacción visible en el explorador.
    for (const s of payable) {
      const signature = await payWithMemo(address(s.wallet), s.reward, `groundtruth:reward:${result.zone}`);
      payments.push({ wallet: s.wallet, reward: s.reward, signature });
    }
    return Response.json({ index_sig, memo, payments });
  } catch (error) {
    console.error(error);
    return Response.json({ error: `Falló el envío en devnet: ${(error as Error).message}` }, { status: 502 });
  }
}
