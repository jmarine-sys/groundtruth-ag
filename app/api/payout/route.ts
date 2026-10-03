import { address, isAddress } from "@solana/kit";
import { indexMemo } from "@/lib/hash";
import { MIN_TRANSFER_SOL, ROUND_POOL_SOL } from "@/lib/payment";
import { payManyWithMemo } from "@/lib/solana-server";
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
    // Índice publicado y todos los pagos en una sola transacción (ver payManyWithMemo).
    const signature = await payManyWithMemo(
      payable.map((s) => ({ recipient: address(s.wallet), amount: s.reward })),
      memo,
    );
    const payments = payable.map((s) => ({ wallet: s.wallet, reward: s.reward, signature }));
    return Response.json({ index_sig: signature, memo, payments });
  } catch (error) {
    console.error(error);
    return Response.json({ error: `Falló el envío en devnet: ${(error as Error).message}` }, { status: 502 });
  }
}
