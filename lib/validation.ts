import { isAddress } from "@solana/kit";
import { z } from "zod";
import { ZONES } from "./weather";

// Revisa lo que manda el navegador antes de cerrar la ronda: casilleros completos, tipos
// correctos y un solo reporte por wallet, para que nadie cobre dos veces en la misma ronda.
// No transforma los datos: el reporte tiene que seguir dando el mismo hash que se firmó onchain.

const MAX_REPORTS = 50;
const MAX_NOTE = 500;

const notBlank = (s: string) => s.trim().length > 0;

const ReportSchema = z.object({
  zone: z.string(),
  crop: z.string().max(40).refine(notBlank, "crop is empty"),
  wallet: z.string().refine((w) => isAddress(w), "wallet is not a valid Solana address"),
  signal: z.enum(["below", "normal"]),
  predicted_pct: z.number().int().min(0).max(100),
  note: z.string().max(MAX_NOTE).refine(notBlank, "note is empty"),
  ts: z.iso.datetime(),
  memo_sig: z.string().min(1).optional(),
  synthetic: z.boolean().optional(),
});

const CloseBodySchema = z
  .object({
    zone: z.string().refine((zone) => Object.hasOwn(ZONES, zone), "unknown zone"),
    reports: z.array(ReportSchema).min(1, "the round has no reports").max(MAX_REPORTS),
    /** Solo para la demo: fija el clima. Se declara a cámara. */
    weather_override: z
      .object({
        soil_moisture: z.number().min(0).max(1).nullable(),
        precip_30d_mm: z.number().min(0),
        baseline_30d_mm: z.number().min(0),
      })
      .optional(),
  })
  .superRefine((body, ctx) => {
    const seen = new Set<string>();
    body.reports.forEach((r, i) => {
      if (r.zone !== body.zone) {
        ctx.addIssue({ code: "custom", path: ["reports", i, "zone"], message: `report zone is not ${body.zone}` });
      }
      if (seen.has(r.wallet)) {
        ctx.addIssue({
          code: "custom",
          path: ["reports", i, "wallet"],
          message: "this wallet already sent a report in this round (one report per wallet)",
        });
      }
      seen.add(r.wallet);
    });
  });

export type CloseBody = z.infer<typeof CloseBodySchema>;

export function parseCloseBody(
  input: unknown,
): { ok: true; body: CloseBody } | { ok: false; error: string } {
  const parsed = CloseBodySchema.safeParse(input);
  if (parsed.success) return { ok: true, body: parsed.data };
  const error = parsed.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
  return { ok: false, error };
}
