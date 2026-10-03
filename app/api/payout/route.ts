import { address, isAddress } from "@solana/kit";
import { indexMemo } from "@/lib/hash";
import { MIN_TRANSFER_SOL, ROUND_POOL_SOL } from "@/lib/payment";
import { payWithMemo, writeMemo } from "@/lib/solana-server";
import type { RoundResult } from "@/lib/types";

// Paga la recompensa de cada informante en SOL de devnet y publica el índice
// en un memo. Solo devnet. Ojo: confía en el RoundResult que manda el cliente; el tope
// es el fondo de la ronda. Con el programa propio (OD-02) esta regla pasa a la cadena.
export async function POST(request: Request) {
  const { result } = (await request.json()) as { result: RoundResult };
  const payable = (result?.scores ?? []).filter((s) => s.reward >= MIN_TRANSFER_SOL);

  const total = payable.reduce((sum, s) => sum + s.reward, 0);
  if (total > ROUND_POOL_SOL + 1e-9 || payable.some((s) => !(s.reward > 0) || !isAddress(s.wallet))) {
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
