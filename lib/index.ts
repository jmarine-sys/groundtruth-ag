import type { Flag, Report, Signal, Weather } from "./types";
import { climateStress } from "./weather";

/**
 * Índice de estrés 0-1 con fórmula fija y auditable (la IA no define el número):
 *   0.5 × estrés climático + 0.5 × proporción del panel que reporta "below".
 * Los reportes marcados como sospechosos no cuentan en el consenso.
 */
export function computeIndex(
  reports: Report[],
  flags: Flag[],
  weather: Weather,
): { index: number; panel_status: Signal } {
  const flagged = new Set(flags.map((f) => f.wallet));
  const valid = reports.filter((r) => !flagged.has(r.wallet));
  const below = valid.filter((r) => r.signal === "below").length;
  const consensus = valid.length ? below / valid.length : 0;

  const index = 0.5 * climateStress(weather) + 0.5 * consensus;
  return {
    index: Math.round(index * 100) / 100,
    panel_status: consensus > 0.5 ? "below" : "normal",
  };
}
