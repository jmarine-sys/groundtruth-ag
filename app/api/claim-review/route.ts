import { writeMemo } from "@/lib/solana-server";
import type { RoundResult } from "@/lib/types";

// Auditoría del riesgo base (OD-20): cuando el índice de clima no pagaría pero el panel
// válido reporta sequía, se registra en Solana la apertura de una revisión del siniestro.
// No paga nada: la aseguradora decide si manda un perito o paga por excepción.
export async function POST(request: Request) {
  const { result } = (await request.json()) as { result: RoundResult };
  const insured = process.env.NEXT_PUBLIC_INSURED_WALLET ?? "unknown";

  const basisRisk = result?.satellite_status === "normal" && result?.panel_status === "below";
  if (!basisRisk) {
    return Response.json({
      opened: false,
      reason:
        result?.satellite_status === "below"
          ? "the weather index already shows drought, so the policy pays through its normal trigger"
          : "the field panel agrees with the weather index",
    });
  }

  try {
    const signature = await writeMemo(
      `groundtruth:claim-review:${result.zone}:insured=${insured}:index=${result.index}:flags=${result.flags.length}`,
    );
    return Response.json({ opened: true, signature });
  } catch (error) {
    console.error(error);
    return Response.json({ error: `Falló el registro en devnet: ${(error as Error).message}` }, { status: 502 });
  }
}
