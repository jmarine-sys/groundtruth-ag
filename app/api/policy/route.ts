import { address } from "@solana/kit";
import { payWithMemo } from "@/lib/solana-server";
import type { RoundResult } from "@/lib/types";

/** Póliza de demo (simulada, se declara a cámara): paga si el índice cruza el umbral. */
const THRESHOLD = 0.5;
const PAYOUT = Number(process.env.POLICY_PAYOUT ?? 500);

export async function POST(request: Request) {
  const { result } = (await request.json()) as { result: RoundResult };
  const insured = process.env.NEXT_PUBLIC_INSURED_WALLET;
  if (!insured) {
    return Response.json({ error: "Falta NEXT_PUBLIC_INSURED_WALLET: corré el setup de devnet" }, { status: 500 });
  }
  if (!(result?.index >= THRESHOLD)) {
    return Response.json({ triggered: false, reason: `El índice ${result?.index} no llega al umbral ${THRESHOLD}` });
  }

  try {
    const signature = await payWithMemo(
      address(insured),
      PAYOUT,
      `groundtruth:policy:${result.zone}:index=${result.index}:divergence=${result.divergence}`,
    );
    return Response.json({ triggered: true, insured, payout: PAYOUT, signature });
  } catch (error) {
    console.error(error);
    return Response.json({ error: `Falló el pago de la póliza: ${(error as Error).message}` }, { status: 502 });
  }
}
