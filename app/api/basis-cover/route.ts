import { address } from "@solana/kit";
import { COVER_PAYOUT_USDC } from "@/lib/payment";
import { payWithMemo } from "@/lib/solana-server";
import type { RoundResult } from "@/lib/types";

// Cobertura de riesgo base (OD-20): paga sola cuando el índice de clima dice "normal"
// pero un panel válido de al menos MIN_VALID reportes confirma la sequía. Es el caso que
// el seguro satelital no cubre. Póliza y asegurado de demo, simulados (se declara a cámara).
const MIN_VALID = 3;
const PAYOUT = COVER_PAYOUT_USDC;

export async function POST(request: Request) {
  const { result } = (await request.json()) as { result: RoundResult };
  const insured = process.env.NEXT_PUBLIC_INSURED_WALLET;
  if (!insured) {
    return Response.json({ error: "Falta NEXT_PUBLIC_INSURED_WALLET: corré `npm run setup:devnet`" }, { status: 500 });
  }

  const valid = (result?.scores?.length ?? 0) - (result?.flags?.length ?? 0);
  if (result?.satellite_status !== "normal") {
    return Response.json({
      paid: false,
      valid,
      reason: "the weather index already shows drought, so the regular policy pays through its own trigger",
    });
  }
  if (result.panel_status !== "below") {
    return Response.json({ paid: false, valid, reason: "the field panel agrees with the weather index" });
  }
  if (valid < MIN_VALID) {
    return Response.json({
      paid: false,
      valid,
      reason: `only ${valid} valid reports; the cover needs at least ${MIN_VALID}`,
    });
  }

  try {
    const signature = await payWithMemo(
      address(insured),
      PAYOUT,
      `groundtruth:basis-cover:${result.zone}:index=${result.index}:valid=${valid}:flags=${result.flags.length}`,
    );
    return Response.json({ paid: true, valid, payout: PAYOUT, insured, signature });
  } catch (error) {
    console.error(error);
    return Response.json({ error: `Falló el pago en devnet: ${(error as Error).message}` }, { status: 502 });
  }
}
